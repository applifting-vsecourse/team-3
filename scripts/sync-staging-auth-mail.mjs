import { pathToFileURL } from 'node:url';

class ConfigurationError extends Error {}
const fail = (message) => {
  throw new ConfigurationError(message);
};
const validUuid = (value) =>
  typeof value === 'string' && /^[a-zA-Z0-9-]+$/.test(value);

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
    if (!response.ok)
      fail(`Coolify ${method} returned HTTP ${response.status}`);
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
  await call('GET', endpoint);
  const values = {
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    // Real mail does not establish who owned an address verified by simulation.
    GOOGLE_ACCOUNT_LINKING: 'false',
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '465',
    SMTP_SECURE: 'true',
    SMTP_USERNAME: env.SMTP_USERNAME,
    SMTP_PASSWORD: env.SMTP_PASSWORD,
    EMAIL_FROM: env.EMAIL_FROM,
    RESEND_API_KEY: '',
    SIMULATED_INBOX: 'false',
  };
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
    if (!entry || entry.value !== value)
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
