import { cpSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const assets = join(root, 'assets');

if (existsSync(assets)) rmSync(assets, { recursive: true });

cpSync(join(dist, 'index.html'), join(root, 'index.html'));
cpSync(join(dist, 'assets'), assets, { recursive: true });
