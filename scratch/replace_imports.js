const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./app');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("'mysql2'") || content.includes('"mysql2"')) {
    content = content.replace(/from\s+['"]mysql2['"]/g, "from '@/lib/db'");
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
