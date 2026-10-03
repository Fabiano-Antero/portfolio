const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive:true });
for (const file of ['index.html','projetos.html','ordiny.html','cash-advance.html']) fs.copyFileSync(path.join(root,file), path.join(output,file));
fs.cpSync(path.join(root,'assets'), path.join(output,'assets'), { recursive:true });
console.log('Site estático pronto em dist/');
