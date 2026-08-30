import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u2764\uFE0F]/gu;
const SCAN_DIRS = ['app', 'components', 'lib'];
const SKIP_DIRS = new Set(['node_modules', '.expo', '.git']);

function walk(dir: string, results: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, results);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      results.push(fullPath);
    }
  }
  return results;
}

let foundAny = false;

for (const dir of SCAN_DIRS) {
  const files = walk(dir);
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      const matches = line.match(EMOJI_REGEX);
      if (matches) {
        foundAny = true;
        console.log(`${file}:${i + 1}  →  ${line.trim()}`);
      }
    });
  }
}

if (!foundAny) {
  console.log('No emoji found in app/, components/, or lib/. All clean!');
}