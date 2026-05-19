const fs = require('fs');
const app = fs.readFileSync('App.tsx', 'utf8');
const snip = fs.readFileSync('scripts/archive-detail-snip.txt', 'utf8');
const start = app.indexOf('                                              {/* Items snapshot */}');
const end = app.indexOf('                                              {/* Payments */}', start);
if (start < 0 || end < 0) {
  console.error('markers not found', start, end);
  process.exit(1);
}
const out = app.slice(0, start) + snip + app.slice(end);
fs.writeFileSync('App.tsx', out, 'utf8');
console.log('ok', out.includes('محاسبه صادرات'), (out.match(/\?\?\?\?/g) || []).length);
