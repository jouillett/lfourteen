const fs = require('fs');
const transcriptPath = 'C:/Users/yrhan/.gemini/antigravity/brain/f5c5265f-3070-458a-a63d-8e87b96d8ae5/.system_generated/logs/transcript_full.jsonl';
const transcript = fs.readFileSync(transcriptPath, 'utf8');
const lines = transcript.split('\n');
let orderContent = null;
for (const line of lines) {
    if (!line.trim()) continue;
    const obj = JSON.parse(line);
    if (obj.content && obj.content.includes('app/mypage/order/page.tsx') && obj.content.includes('Total Lines:')) {
        let fileLines = obj.content.split('\n').filter(l => /^\d+: /.test(l)).map(l => l.replace(/^\d+: /, ''));
        if (fileLines.length > 100) {
            orderContent = fileLines.join('\n');
            break;
        }
    }
}
if (orderContent) {
    fs.writeFileSync('app/mypage/order/page.tsx.recovered', orderContent, 'utf8');
    console.log('Recovered!');
} else {
    console.log('Not found');
}
