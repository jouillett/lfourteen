const fs = require('fs'); 
const text = fs.readFileSync('app/mypage/inquiry/page.tsx', 'utf8'); 
text.split('\n').forEach(line => { 
  if(line.includes('href=\"#\"')) console.log(line.trim()); 
});
