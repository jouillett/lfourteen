const fs = require('fs');
['inquiry', 'review', 'shipping', 'profile'].forEach(d => {
    const text = fs.readFileSync('app/mypage/'+d+'/page.tsx', 'utf8');
    text.split('\n').forEach((line, i) => {
        let count = 0;
        for (let c of line) if (c === "'") count++;
        if (count % 2 !== 0 && !line.includes('//')) console.log(d + ' ' + (i+1) + ': ' + line.trim());
    });
});
