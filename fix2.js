const fs = require('fs');
const files = [
  'src/app/page.tsx', 
  'src/app/alerts/page.tsx', 
  'src/app/history/page.tsx', 
  'src/app/what-if/page.tsx',
  'src/app/dashboard/page.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\\\$/g, '$');
    content = content.replace(/\\`/g, '`');
    fs.writeFileSync(file, content);
  }
});
console.log('Fixed syntax bugs across components');
