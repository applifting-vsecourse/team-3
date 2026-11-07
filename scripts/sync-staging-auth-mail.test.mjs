import assert from 'node:assert/strict';
import { test } from 'node:test';
import { syncStagingAuthMail } from './sync-staging-auth-mail.mjs';

const env = {
  COOLIFY_WEBHOOK: 'https://coolify.example/api/v1/deploy?uuid=frontend',
  COOLIFY_TOKEN: 'test-token',
  EXPECTED_BACKEND_IMAGE: 'registry.example/team-3-backend',
  GOOGLE_CLIENT_ID: 'test-client',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  SMTP_USERNAME: 'sender@example.com',
  SMTP_PASSWORD: 'test-app-password',
  EMAIL_FROM: 'HobbyHub <sender@example.com>',
};
const backend = {
  uuid: 'backend',
  environment_id: 7,
  build_pack: 'dockerimage',
  docker_registry_image_name: env.EXPECTED_BACKEND_IMAGE,
  docker_registry_image_tag: 'latest',
};
const frontend = {
  ...backend,
  uuid: 'frontend',
  docker_registry_image_name: 'registry.example/team-3-frontend',
};

function server(options = {}) {
  const calls = [];
  let saved = [];
  const request = async (url, init) => {
    const parsed = new URL(url);
    const path = parsed.pathname.split('/api/v1')[1];
    calls.push({ url, path, ...init });
    if (options.error) throw new Error(env.COOLIFY_TOKEN);
    if (options.status)
      return new Response(env.SMTP_PASSWORD, { status: options.status });
    if (init.method === 'PATCH') {
      if (options.patchDenied)
        return new Response(env.SMTP_PASSWORD, { status: 403 });
      saved = JSON.parse(init.body).data;
      return new Response('{}');
    }
    if (init.method === 'POST') return new Response('{}');
    if (path === '/applications/frontend') return Response.json(frontend);
    if (path === '/applications/backend') return Response.json(backend);
    if (path === '/applications/stack')
      return new Response('', { status: 404 });
    if (path === '/services/stack')
      return Response.json({ uuid: 'stack', environment_id: 7 });
    if (path === '/applications')
      return Response.json(options.apps ?? [backend]);
    if (path === '/applications/backend/envs') {
      return Response.json(
        saved.length
          ? options.readBack
            ? options.readBack(saved)
            : saved
          : (options.initialEnvs ?? []),
      );
    }
    assert.fail(`Unexpected mock API path ${path}`);
  };
  return {
    request,
    calls,
    get saved() {
      return saved;
    },
  };
}
const mutations = (api) => api.calls.filter((call) => call.method !== 'GET');

test('finds the backend by exact image and environment when the webhook targets the frontend', async () => {
  const api = server();
  const result = await syncStagingAuthMail(env, api.request);
  assert.deepEqual(result, {
    configurationUpdated: true,
    backendDeploymentQueued: true,
  });
  assert.ok(api.calls.some((call) => call.path === '/applications'));
  assert.deepEqual(
    mutations(api).map((call) => [call.method, call.path]),
    [
      ['PATCH', '/applications/backend/envs/bulk'],
      ['POST', '/deploy'],
    ],
  );
  assert.equal(
    new URL(api.calls.at(-1).url).searchParams.get('uuid'),
    'backend',
  );
  assert.ok(
    api.saved.every(
      (item) =>
        item.is_runtime &&
        !item.is_buildtime &&
        !item.is_preview &&
        item.is_literal,
    ),
  );
  assert.equal(
    api.saved.find((item) => item.key === 'GOOGLE_ACCOUNT_LINKING').value,
    'false',
  );
  assert.equal(
    api.saved.find((item) => item.key === 'RESEND_API_KEY').value,
    '',
  );
  assert.ok(
    !api.saved.some((item) => /DATABASE|SUPERADMIN|SEED/.test(item.key)),
  );
  assert.ok(api.calls.every((call) => call.redirect === 'error'));
});

test('uses the webhook API prefix and avoids a duplicate backend deployment', async () => {
  const api = server();
  const result = await syncStagingAuthMail(
    {
      ...env,
      COOLIFY_WEBHOOK:
        'https://coolify.example/prefix/api/v1/deploy?uuid=backend,frontend',
    },
    api.request,
  );
  assert.equal(result.backendDeploymentQueued, false);
  assert.ok(
    api.calls.every((call) =>
      call.url.startsWith('https://coolify.example/prefix/api/v1/'),
    ),
  );
  assert.deepEqual(
    mutations(api).map((call) => call.method),
    ['PATCH'],
  );
});

test('can discover a Docker Image backend in the environment of a service webhook', async () => {
  const api = server();
  await syncStagingAuthMail(
    {
      ...env,
      COOLIFY_WEBHOOK: 'https://coolify.example/api/v1/deploy?uuid=stack',
    },
    api.request,
  );
  assert.ok(api.calls.some((call) => call.path === '/services/stack'));
  assert.equal(mutations(api)[0].path, '/applications/backend/envs/bulk');
});

test('refuses incomplete or unsafe input before making any API request', async () => {
  for (const override of [
    { SMTP_PASSWORD: '' },
    { EXPECTED_BACKEND_IMAGE: '' },
    { COOLIFY_WEBHOOK: 'http://coolify.example/api/v1/deploy?uuid=backend' },
    { COOLIFY_WEBHOOK: 'https://coolify.example/api/v1/deploy' },
    { COOLIFY_WEBHOOK: 'https://coolify.example/api/v1/deploy?uuid=../other' },
    {
      COOLIFY_WEBHOOK:
        'https://user:password@coolify.example/api/v1/deploy?uuid=backend',
    },
  ]) {
    await assert.rejects(
      syncStagingAuthMail({ ...env, ...override }, () =>
        assert.fail('must not make a request'),
      ),
    );
  }
});

test('makes no changes for ambiguous, foreign or unsupported backend resources', async () => {
  for (const apps of [
    [],
    [frontend],
    [{ ...backend, environment_id: 8 }],
    [backend, { ...backend, uuid: 'other-backend' }],
    [{ ...backend, build_pack: 'dockercompose' }],
    [{ ...backend, docker_registry_image_tag: 'old-release' }],
  ]) {
    const api = server({ apps });
    await assert.rejects(
      syncStagingAuthMail(env, api.request),
      /No unique HobbyHub/,
    );
    assert.equal(mutations(api).length, 0);
  }
});

test('suppresses API error bodies and network details containing credentials', async () => {
  for (const options of [
    { error: true },
    { status: 403 },
    { patchDenied: true },
  ]) {
    const api = server(options);
    await assert.rejects(syncStagingAuthMail(env, api.request), (error) => {
      assert.ok(!error.message.includes(env.COOLIFY_TOKEN));
      assert.ok(!error.message.includes(env.SMTP_PASSWORD));
      return /Coolify (GET|PATCH)/.test(error.message);
    });
    assert.ok(!api.calls.some((call) => call.method === 'POST'));
  }
});

test('does not queue a deployment when read-back values or runtime flags differ', async () => {
  for (const readBack of [
    () => [],
    (saved) => saved.map((item) => ({ ...item, is_runtime: false })),
    (saved) => saved.map((item) => ({ ...item, is_literal: false })),
  ]) {
    const api = server({ readBack });
    await assert.rejects(
      syncStagingAuthMail(env, api.request),
      /read-back failed|runtime scope/,
    );
    assert.ok(!api.calls.some((call) => call.method === 'POST'));
  }
});

test('read-only inspection needs no Google/SMTP credentials and makes GET requests only', async () => {
  const api = server();
  const result = await syncStagingAuthMail(
    {
      COOLIFY_WEBHOOK: env.COOLIFY_WEBHOOK,
      COOLIFY_TOKEN: env.COOLIFY_TOKEN,
      EXPECTED_BACKEND_IMAGE: env.EXPECTED_BACKEND_IMAGE,
    },
    api.request,
    { inspectOnly: true },
  );
  assert.deepEqual(result, { backendIdentified: true });
  assert.equal(mutations(api).length, 0);
  assert.ok(!api.calls.some((call) => call.path.endsWith('/envs')));
});

test('classifies known authorization failures without logging response bodies or request addresses', async () => {
  const cases = [
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
    [`API is disabled. ${env.COOLIFY_TOKEN}`, 'json-response'],
  ];
  for (const [message, reason] of cases) {
    const calls = [];
    await assert.rejects(
      syncStagingAuthMail(
        env,
        async (_url, init) => {
          calls.push(init.method);
          return Response.json(
            { message, extra: env.SMTP_PASSWORD },
            { status: 403 },
          );
        },
        { inspectOnly: true },
      ),
      (error) => {
        assert.equal(
          error.message,
          `Coolify GET returned HTTP 403 (${reason})`,
        );
        assert.ok(!error.message.includes(env.COOLIFY_TOKEN));
        assert.ok(!error.message.includes(env.SMTP_PASSWORD));
        assert.ok(!error.message.includes('coolify.example'));
        return true;
      },
    );
    assert.deepEqual(calls, ['GET']);
  }
});

test('suppresses non-JSON and invalid error payloads', async () => {
  for (const [contentType, payload, reason] of [
    ['text/html', `<html>${env.COOLIFY_TOKEN}</html>`, 'html-response'],
    ['text/plain', env.SMTP_PASSWORD, 'other-response'],
    ['application/json', env.COOLIFY_TOKEN, 'unreadable-json-response'],
  ]) {
    await assert.rejects(
      syncStagingAuthMail(
        env,
        async () =>
          new Response(payload, {
            status: 403,
            headers: { 'content-type': contentType },
          }),
        { inspectOnly: true },
      ),
      (error) => {
        assert.equal(
          error.message,
          `Coolify GET returned HTTP 403 (${reason})`,
        );
        return true;
      },
    );
  }
});

test('refuses hidden or locked target values before any update', async () => {
  for (const initialEnvs of [
    [{ key: 'DATABASE_URL', is_preview: false }],
    [{ key: 'SMTP_PASSWORD', is_preview: false, is_shown_once: true }],
    [
      { key: 'SMTP_PASSWORD', is_preview: false },
      { key: 'OTHER', value: 'example', is_preview: false },
    ],
  ]) {
    const api = server({ initialEnvs });
    await assert.rejects(
      syncStagingAuthMail(env, api.request),
      /nothing updated/,
    );
    assert.equal(mutations(api).length, 0);
  }
});

test('updates visible runtime values without altering preview-only or unrelated locked entries', async () => {
  const api = server({
    initialEnvs: [
      { key: 'SMTP_PASSWORD', value: 'old-test-password', is_preview: false },
      { key: 'GOOGLE_CLIENT_SECRET', is_preview: true, is_shown_once: true },
      { key: 'DATABASE_URL', is_preview: false, is_shown_once: true },
    ],
  });
  await syncStagingAuthMail(env, api.request);
  assert.equal(
    api.saved.find((item) => item.key === 'SMTP_PASSWORD').value,
    env.SMTP_PASSWORD,
  );
  assert.ok(api.saved.every((item) => item.is_preview === false));
  assert.ok(!api.saved.some((item) => item.key === 'DATABASE_URL'));
});

test('accepts an explicit null when Coolify normalizes the intentionally cleared Resend value', async () => {
  const api = server({
    readBack: (saved) =>
      saved.map((item) =>
        item.key === 'RESEND_API_KEY' ? { ...item, value: null } : item,
      ),
  });
  const result = await syncStagingAuthMail(env, api.request);
  assert.equal(result.configurationUpdated, true);
  assert.equal(mutations(api).at(-1).method, 'POST');
});

test('never treats a missing value or a null credential as a successful read-back', async () => {
  for (const readBack of [
    (saved) =>
      saved.map((item) =>
        item.key === 'RESEND_API_KEY' ? { ...item, value: undefined } : item,
      ),
    (saved) =>
      saved.map((item) =>
        item.key === 'GOOGLE_CLIENT_SECRET' ? { ...item, value: null } : item,
      ),
  ]) {
    const api = server({ readBack });
    await assert.rejects(
      syncStagingAuthMail(env, api.request),
      /read-back failed/,
    );
    assert.ok(!api.calls.some((call) => call.method === 'POST'));
  }
});
