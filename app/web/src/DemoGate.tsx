import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { App } from './App.tsx';

export function DemoGate() {
  const [mode, setMode] = useState<'local' | 'demo' | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    async function connect() {
      try {
        const response = await fetch('/api/config', { signal: controller.signal });
        if (!response.ok) throw new Error('演示服务暂不可用，请稍后刷新。');
        const config = await response.json() as { mode: 'local' | 'demo' };
        setMode(config.mode);
        if (config.mode === 'demo') setAuthenticated((await fetch('/api/state', { signal: controller.signal })).ok);
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '连接失败。'); }
    }
    void connect();
    const expired = () => { setAuthenticated(false); setError('会话已到期或服务已重启。重新登录可开始一组新的合成演示。'); };
    window.addEventListener('demo-expired', expired);
    return () => { controller.abort(); window.removeEventListener('demo-expired', expired); };
  }, []);
  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/demo/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }), signal: AbortSignal.timeout(10_000) });
      const value = await response.json() as { error?: string };
      if (!response.ok) throw new Error(value.error ?? '登录失败。');
      setCode(''); setAuthenticated(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '登录失败，请手动重试。'); } finally { setBusy(false); }
  }
  if (mode === 'local' || authenticated) return <App/>;
  return <main className="shell"><section className="card"><p className="eyebrow">cxf · 合成样例演示</p><h1>群聊待办助手</h1><p>只使用三组固定通知。每位访客的临时任务相互隔离；闲置30分钟、最长2小时或服务重启后会清空。需要保留时请下载 JSON。</p>{error && <p className="error" role="alert">{error}</p>}{mode === 'demo' ? <form onSubmit={login}><label htmlFor="access-code">演示访问码</label><input id="access-code" type="password" autoComplete="off" value={code} onChange={e => setCode(e.target.value)} maxLength={128} required/><button className="primary" disabled={busy}>{busy ? '正在连接…' : '进入合成演示'}</button></form> : <p role="status">正在连接服务…</p>}<p className="muted">实时分析受全站额度限制，失败不会自动重试；同一会话重复样例复用缓存。页面不是私人群聊上传入口。</p></section></main>;
}
