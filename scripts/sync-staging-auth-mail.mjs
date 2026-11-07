import { pathToFileURL } from 'node:url';

class ConfigurationError extends Error {}
const fail = (message) => {
  throw new ConfigurationError(message);
};
const validUuid = (value) =>
  typeof value === 'string' && /^[a-zA-Z0-9-]+$/.test(value);

// Only fixed categories reach logs. Never echo a response message, header or URL.
const denialReasons = new Map([
  ['API is disabled.', 'api-disabled'],
  ['You are not allowed to access the API.', 'ip-not-allowed'],
  ['Missing required permissions: read', 'missing-read-permission'],
  [
    'Missing required permissions: read:sensitive',
    'missing-sensitive-read-permission',
  ],
  ['Missing required permissions: write', 'missing-write-permission'],
  ['Missing required permissions: deploy', 'missing-deploy-permission'],
  [
    'This API token is limited to selected projects, environments, or resources, so it cannot use this endpoint.',
    'resource-scope-denied',
  ],
  ['This action is unauthorized.', 'resource-forbidden'],
  ['Unauthenticated.', 'unauthenticated'],
]);
const denialReason = async (response) => {
  const contentType = response.headers
    .get('content-type')
    ?.split(';')[0]
    .trim()
    .toLowerCase();
  if (contentType === 'text/html') return 'html-response';
  if (contentType !== 'application/json' && !contentType?.endsWith('+json'))
    return 'other-response';
  try {
    const body = await response.json();
    return denialReasons.get(body?.message) ?? 'json-response';
  } catch {
    return 'unreadable-json-response';
  }
};

// Secrets and API response bodies stay in memory; never print their values.
export async function syncStagingAuthMail(
  env,
  request = fetch,
  { inspectOnly = false } = {},
) {
  for (const key of [
    'COOLIFY_WEBHOOK',
    'COOLIFY_TOKEN',
    'EXPECTED_BACKEND_IMAGE',
    ...(!inspectOnly
      ? [
          'GOOGLE_CLIENT_ID',
          'GOOGLE_CLIENT_SECRET',
          'SMTP_USERNAME',
          'SMTP_PASSWORD',
          'EMAIL_FROM',
        ]
      : []),
  ]) {
    if (typeof env[key] !== 'string' || !env[key].trim())
      fail(`Missing ${key}`);
  }
  let webhook;
  try {
    webhook = new URL(env.COOLIFY_WEBHOOK);
  } catch {
    fail('Invalid COOLIFY_WEBHOOK URL');
  }
  if (
    webhook.protocol !== 'https:' ||
    webhook.username ||
    webhook.password ||
    !/\/api\/v1\/deploy\/?$/.test(webhook.pathname)
  ) {
    fail(
      'Expected an HTTPS Coolify API deploy webhook without embedded credentials',
    );
  }
  const webhookUuids = webhook.searchParams
    .get('uuid')
    ?.split(',')
    .map((uuid) => uuid.trim());
  if (!webhookUuids?.length || !webhookUuids.every(validUuid)) {
    fail('Coolify deploy webhook must contain valid resource UUIDs');
  }
  const api = `${webhook.origin}${webhook.pathname.replace(/\/deploy\/?$/, '')}`;
  const call = async (method, path, body, allowNotFound = false) => {
    let response;
    try {
      response = await request(api + path, {
        method,
        headers: {
          Authorization: `Bearer ${env.COOLIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      fail(`Coolify ${method} failed; details suppressed`);
    }
    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      const reason = await denialReason(response);
      fail(`Coolify ${method} returned HTTP ${response.status} (${reason})`);
    }
    return response;
  };
  const json = async (response) => {
    try {
      return await response.json();
    } catch {
      fail('Cannot read Coolify response; details suppressed');
    }
  };
  const isBackend = (app) =>
    app?.build_pack === 'dockerimage' &&
    validUuid(app.uuid) &&
    [
      env.EXPECTED_BACKEND_IMAGE,
      `${env.EXPECTED_BACKEND_IMAGE}:latest`,
    ].includes(app.docker_registry_image_name) &&
    (!app.docker_registry_image_tag ||
      app.docker_registry_image_tag === 'latest');

  // A webhook may deploy the frontend. Its UUID is never assumed to be the backend.
  const resources = [];
  for (const uuid of new Set(webhookUuids)) {
    let response = await call('GET', `/applications/${uuid}`, undefined, true);
    if (!response)
      response = await call('GET', `/services/${uuid}`, undefined, true);
    if (!response)
      fail(
        'A deploy webhook resource could not be identified; nothing updated',
      );
    const resource = await json(response);
    if (resource?.uuid !== uuid || resource.environment_id == null) {
      fail('Incomplete deploy resource metadata; nothing updated');
    }
    resources.push(resource);
  }
  let candidates = resources.filter(isBackend);
  if (!candidates.length) {
    const apps = await json(await call('GET', '/applications'));
    if (!Array.isArray(apps))
      fail('Unexpected Coolify application list; nothing updated');
    const environments = new Set(
      resources.map((resource) => String(resource.environment_id)),
    );
    candidates = apps.filter(
      (app) => isBackend(app) && environments.has(String(app.environment_id)),
    );
  }
  candidates = [...new Map(candidates.map((app) => [app.uuid, app])).values()];
  if (candidates.length !== 1) {
    fail(
      'No unique HobbyHub Docker Image backend found in the webhook environment; nothing updated',
    );
  }
  const backend = candidates[0];
  if (inspectOnly) return { backendIdentified: true };
  const endpoint = `/applications/${backend.uuid}/envs`;
  const existing = await json(await call('GET', endpoint));
  if (!Array.isArray(existing))
    fail('Unexpected Coolify env response; nothing updated');
  const values = {
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '465',
    SMTP_SECURE: 'true',
    SMTP_USERNAME: env.SMTP_USERNAME,
    SMTP_PASSWORD: env.SMTP_PASSWORD,
    EMAIL_FROM: env.EMAIL_FROM,
    RESEND_API_KEY: '',
    SIMULATED_INBOX: 'false',
  };
  const productionEnvs = existing.filter((item) => item?.is_preview === false);
  const unlocked = productionEnvs.filter((item) => item.is_shown_once !== true);
  if (
    unlocked.length &&
    unlocked.every((item) => !Object.hasOwn(item, 'value'))
  ) {
    fail(
      'Coolify env values are hidden; read:sensitive permission and an authorized role are required; nothing updated',
    );
  }
  for (const key of Object.keys(values)) {
    const entry = productionEnvs.find((item) => item.key === key);
    if (
      entry &&
      (entry.is_shown_once === true || !Object.hasOwn(entry, 'value'))
    ) {
      fail(
        `Cannot verify Coolify value for ${key} before update; nothing updated`,
      );
    }
  }
  await call('PATCH', `${endpoint}/bulk`, {
    data: Object.entries(values).map(([key, value]) => ({
      key,
      value,
      is_preview: false,
      is_buildtime: false,
      is_runtime: true,
      is_literal: true,
    })),
  });
  const saved = await json(await call('GET', endpoint));
  if (!Array.isArray(saved)) fail('Unexpected Coolify env response');
  for (const [key, value] of Object.entries(values)) {
    const entry = saved.find(
      (item) => item?.key === key && item.is_preview === false,
    );
    if (
      !entry ||
      !Object.hasOwn(entry, 'value') ||
      (entry.value !== value && !(value === '' && entry.value === null))
    )
      fail(`Coolify read-back failed for ${key}`);
    if (
      entry.is_runtime !== true ||
      entry.is_buildtime !== false ||
      entry.is_literal !== true
    ) {
      fail(`Coolify runtime scope is incorrect for ${key}`);
    }
  }
  // The existing workflow triggers the original webhook next. When that only
  // deploys the frontend, explicitly queue this backend too, after verification.
  const backendDeploymentQueued = !webhookUuids.includes(backend.uuid);
  if (backendDeploymentQueued) {
    await call('POST', `/deploy?uuid=${encodeURIComponent(backend.uuid)}`);
  }
  return { configurationUpdated: true, backendDeploymentQueued };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    if (process.argv.slice(2).some((arg) => arg !== '--inspect'))
      fail('Unknown argument');
    const inspectOnly = process.argv.includes('--inspect');
    await syncStagingAuthMail(process.env, fetch, { inspectOnly });
    console.log(
      inspectOnly
        ? 'Staging backend identified; read-only inspection complete.'
        : 'Staging auth/mail runtime configuration saved and verified.',
    );
  } catch (error) {
    console.error(
      error instanceof ConfigurationError
        ? error.message
        : 'Configuration failed; details suppressed',
    );
    process.exitCode = 1;
  }
}
