const fs = require('fs');
let c = fs.readFileSync('App.tsx', 'utf8');
// File has 2 backslashes before apostrophe in "Client\\'s" - need only 1
// Replace the broken 2-backslash+apostrophe with 1-backslash+apostrophe
const twoBS = 'Client' + '\\' + '\\' + "'s Pavilion";
const oneBS = 'Client' + '\\' + "'s Pavilion";
c = c.replace(twoBS, oneBS);
fs.writeFileSync('App.tsx', c, 'utf8');
const idx = c.indexOf('Bespoke assets created for the Client');
console.log('Fixed:', JSON.stringify(c.substring(idx, idx + 60)));
