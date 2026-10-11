import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Store } from './store.ts';
import { AppError } from './validation.ts';
import type { ImportRecord } from '../shared/types.ts';

export const PRESETS = [
  { id: 'complete', label: '完整通知', text: '【合成演示】请二年级家长于2026年10月12日17:00前，将填写好的秋游报名表和缴费凭证交给班主任。', referenceDate: null, role: '二年级家长' },
  { id: 'correction', label: '同来源更正', text: '【合成演示·更正】二年级秋游报名材料改为2026年10月13日17:00前交给班主任。报名表需家长签字，缴费凭证要求不变。请核对上条通知。', referenceDate: null, role: '二年级家长' },
  { id: 'uncertain', label: '模糊截止与闲聊', text: '【合成演示】请二年级家长这几天交秋游意向表，具体截止时间老师稍后通知。小明：今天的天气真好。小红：周末一起去公园吧。', referenceDate: null, role: '二年级家长' },
] as const;
export type DemoSession = { id: string; store: Store; createdAt: number; lastSeen: number; inFlight: { fingerprint: string; promise: Promise<ImportRecord> } | null; closed: boolean };
const IDLE_MS = 30 * 60_000;
const MAX_AGE_MS = 2 * 60 * 60_000;
const MAX_SESSIONS = 20;
export class DemoSessions {
  sessions = new Map<string, DemoSession>();
  now: () => number;
  constructor(now = Date.now) { this.now = now; }
  expired(session: DemoSession) { return this.now() - session.lastSeen >= IDLE_MS || this.now() - session.createdAt >= MAX_AGE_MS; }
  sweep() {
    for (const [id, session] of this.sessions) {
      if (this.expired(session) && !session.inFlight) { session.store.close(); session.closed = true; this.sessions.delete(id); }
    }
  }
  create() {
    this.sweep();
    if (this.sessions.size >= MAX_SESSIONS) throw new AppError('演示会话已满，请稍后再试。', 503);
    const id = randomBytes(32).toString('hex');
    const session: DemoSession = { id, store: new Store(':memory:'), createdAt: this.now(), lastSeen: this.now(), inFlight: null, closed: false };
    session.store.createSource('合成秋游通知'); this.sessions.set(id, session); return session;
  }
  get(id: string) {
    this.sweep(); const session = this.sessions.get(id);
    if (!session || this.expired(session)) return undefined;
    session.lastSeen = this.now(); return session;
  }
  close() { for (const session of this.sessions.values()) { if (!session.inFlight && !session.closed) { session.store.close(); session.closed = true; } } this.sessions.clear(); }
}
export function accessMatches(actual: unknown, expected: string) {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return typeof actual === 'string' && actual.length <= 128 && timingSafeEqual(digest(actual), digest(expected));
}
export function sessionCookie(id: string) { return `cxf_demo=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=7200`; }
export function readSessionCookie(cookie = '') { return /(?:^|;\s*)cxf_demo=([a-f0-9]{64})(?:;|$)/.exec(cookie)?.[1] ?? ''; }
