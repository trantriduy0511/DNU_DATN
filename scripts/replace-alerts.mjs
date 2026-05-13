/**
 * Replace window.alert / alert with notify(...) and add import from lib/notify.
 * Run from repo root: node scripts/replace-alerts.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'frontend', 'src');

const SKIP = new Set(['lib/notify.js', 'components/UiFeedbackHost.jsx', 'store/uiFeedbackStore.js']);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (/\.(jsx|js|tsx|ts)$/.test(ent.name)) out.push(full);
  }
  return out;
}

function posixRel(fromDir, toFile) {
  let r = path.relative(fromDir, toFile);
  if (!r.startsWith('.')) r = './' + r;
  return r.split(path.sep).join('/').replace(/\.jsx?$/, '');
}

function ensureNotifyImport(s, filePath) {
  const importPath = posixRel(path.dirname(filePath), path.join(root, 'lib', 'notify.js'));
  const importLine = `import { notify } from '${importPath}';`;
  if (s.includes(`from '${importPath}'`) || s.includes(`from "${importPath}"`)) {
    const re = new RegExp(
      `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
      'm'
    );
    const m = s.match(re);
    if (m && !/\bnotify\b/.test(m[1])) {
      const parts = m[1]
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      parts.push('notify');
      const uniq = [...new Set(parts)];
      return s.replace(re, `import { ${uniq.join(', ')} } from '${importPath}'`);
    }
    return s;
  }
  const lines = s.split('\n');
  let insertAt = 0;
  let i = 0;
  while (i < lines.length && /^\s*(\/\/|\/\*|\*)/.test(lines[i])) {
    i++;
    insertAt = i;
  }
  while (i < lines.length && /^\s*import\s/.test(lines[i])) {
    insertAt = i + 1;
    i++;
  }
  lines.splice(insertAt, 0, importLine);
  return lines.join('\n');
}

function processFile(filePath) {
  const rel = path.relative(root, filePath).split(path.sep).join('/');
  if (SKIP.has(rel)) return false;

  let s = fs.readFileSync(filePath, 'utf8');
  if (!/\balert\s*\(/.test(s) && !/\bwindow\.alert\s*\(/.test(s)) return false;

  const orig = s;
  s = s.replace(/\bwindow\.alert\s*\(/g, 'notify(');
  s = s.replace(/\balert\s*\(/g, 'notify(');
  s = ensureNotifyImport(s, filePath);

  if (s !== orig) {
    fs.writeFileSync(filePath, s, 'utf8');
    return true;
  }
  return false;
}

const files = walk(root);
let n = 0;
for (const f of files) {
  if (processFile(f)) {
    n++;
    console.log(path.relative(root, f));
  }
}
console.log('files changed:', n);
