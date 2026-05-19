const fs = require('fs');
const appPath = 'App.tsx';

function extractFunction(src, name) {
  const needle = `const ${name}`;
  const start = src.indexOf(needle);
  if (start < 0) throw new Error(`not found: ${name}`);
  let i = start;
  let depth = 0;
  let started = false;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '{') {
      depth++;
      started = true;
    } else if (ch === '}') {
      depth--;
      if (started && depth === 0) {
        i++;
        if (src[i] === ';') i++;
        return { start, end: i, text: src.slice(start, i) };
      }
    }
    i++;
  }
  throw new Error(`unclosed: ${name}`);
}

let app = fs.readFileSync(appPath, 'utf8');
for (const [name, file] of [
  ['recallArchivedInvoiceForEditing', 'scripts/recall-archived-fn.txt'],
  ['handleUpdateArchivedInvoiceFromEditor', 'scripts/update-archived-fn.txt'],
]) {
  const replacement = fs.readFileSync(file, 'utf8').trimEnd();
  const old = extractFunction(app, name);
  app = app.slice(0, old.start) + replacement + app.slice(old.end);
  console.log('replaced', name);
}
fs.writeFileSync(appPath, app, 'utf8');
const s = fs.readFileSync(appPath, 'utf8');
console.log('محاسبه', s.includes('محاسبه صادرات'), '????', (s.match(/\?\?\?\?/g) || []).length);
