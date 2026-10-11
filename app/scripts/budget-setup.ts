import { BudgetLedger } from '../server/budget.ts';

try {
  const ledger = BudgetLedger.fromEnv();
  const action = process.argv[2];
  if (action === 'init') { await ledger.initialize(); console.log('预算账本已创建：2000分/100次保守预留，公开窗口尚未激活。'); }
  else if (action === 'activate') { console.log(`PUBLIC_DEMO_END_AT=${await ledger.activate()}`); }
  else throw new Error('仅支持init或activate；activate只能在上线时执行一次。');
} catch { console.error('预算操作被拒绝。检查配置或已有账本；不得重置额度或换ID绕过限制。'); process.exitCode = 1; }
