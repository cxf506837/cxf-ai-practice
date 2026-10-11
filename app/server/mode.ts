export function loadMode(env: NodeJS.ProcessEnv) {
  const mode = env.APP_MODE ?? 'local';
  if (mode !== 'local' && mode !== 'demo') throw new Error('APP_MODE必须是local或demo。');
  const port = Number(env.PORT ?? 4317);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT必须为1024到65535的整数。');
  if (mode === 'local') return { mode, port, host: '127.0.0.1' } as const;
  let origin: URL;
  try { origin = new URL(env.PUBLIC_ORIGIN ?? ''); } catch { throw new Error('demo需要固定HTTPS PUBLIC_ORIGIN。'); }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.origin !== env.PUBLIC_ORIGIN || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('PUBLIC_ORIGIN必须是无路径的固定HTTPS来源。');
  if (!env.DEMO_ACCESS_CODE || env.DEMO_ACCESS_CODE.length < 12 || env.DEMO_ACCESS_CODE.length > 128) throw new Error('demo需要12–128字符访问码。');
  return { mode, port, host: '0.0.0.0', origin: origin.origin, accessCode: env.DEMO_ACCESS_CODE } as const;
}
