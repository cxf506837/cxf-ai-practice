import { cp, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, 'dist');
await mkdir(dist, { recursive: true });
await cp(resolve(root, 'public/landing-pages'), dist, { recursive: true });
await cp(resolve(root, 'public/landing-pages/kage.html'), resolve(dist, 'index.html'));
for (const path of ['index.html', 'portfolio.css', 'portfolio.js', 'works/chat-task-assistant.html', 'works/context-experiment.html', 'secret-pathways-assets/three.min.js']) await access(resolve(dist, path), constants.R_OK);
console.log('静态站已构建：dist/index.html为真实首页，保留相对素材路径。');
