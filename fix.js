const fs = require('fs');
const path = require('path');

const files = [
  'src/app/alerts/page.tsx',
  'src/app/what-if/page.tsx',
  'src/app/history/page.tsx'
];

files.forEach(file => {
  const p = path.join(__dirname, file);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/\\\$/g, '$');
    content = content.replace(/\\`/g, '`');
    fs.writeFileSync(p, content);
    console.log('Fixed', file);
  }
});
