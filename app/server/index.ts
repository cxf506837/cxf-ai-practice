import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Store } from './store.ts';
import { createApp } from './http.ts';
import { loadMode } from './mode.ts';
import { DemoSessions } from './demo.ts';
import { BudgetLedger } from './budget.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
let config: ReturnType<typeof loadMode>;
try { config = loadMode(process.env); } catch (error) { console.error(error instanceof Error ? error.message : '启动配置无效。'); process.exit(1); }
let store: Store | undefined;
let sessions: DemoSessions | undefined;
let ledger: BudgetLedger | undefined;
if (config.mode === 'local') {
  mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
  store = new Store(fileURLToPath(new URL('../data/tasks.sqlite', import.meta.url)));
} else {
  sessions = new DemoSessions();
  try { ledger = BudgetLedger.fromEnv(); } catch { console.warn('持久预算未配置或无效：页面可运行，付费分析关闭。'); }
}
const demo = config.mode === 'demo' ? { origin: config.origin, accessCode: config.accessCode, sessions: sessions!, ledger } : undefined;
const server = createApp({ store, key: process.env.DEEPSEEK_API_KEY ?? '', dist: root + 'dist', demo });
const cleanup = setInterval(() => sessions?.sweep(), 60_000); cleanup.unref();
const closeStores = () => { clearInterval(cleanup); store?.close(); sessions?.close(); };
server.on('error', () => { console.error('启动失败：端口可能已被占用，请检查PORT；未停止其他服务。'); closeStores(); process.exitCode = 1; });
server.listen(config.port, config.host, () => console.log(`群聊待办助手已启动（${config.mode}）`));
const shutdown = () => server.close(() => { closeStores(); process.exit(0); });
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
