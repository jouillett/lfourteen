const fs = require('fs');
const transcriptPath = 'C:/Users/yrhan/.gemini/antigravity/brain/f5c5265f-3070-458a-a63d-8e87b96d8ae5/.system_generated/logs/transcript_full.jsonl';
if (fs.existsSync(transcriptPath)) {
    const transcript = fs.readFileSync(transcriptPath, 'utf8');
    const lines = transcript.split('\n');
    let found = false;
    for (const line of lines) {
        if (!line.trim()) continue;
        const obj = JSON.parse(line);
        if (obj.type === 'TOOL_RESPONSE' && obj.content && obj.content.includes('File Path: ile:///c:/Users/yrhan/antigravity/Lfourteen/app/mypage/order/page.tsx')) {
            let content = obj.content;
            let fileLines = content.split('\n').filter(l => /^\d+: /.test(l)).map(l => l.replace(/^\d+: /, ''));
            fs.writeFileSync('app/mypage/order/page.tsx.recovered', fileLines.join('\n'), 'utf8');
            console.log('Recovered order page!');
            found = true;
            break;
        }
    }
    if (!found) console.log('Could not find in transcript');
} else {
    console.log('Transcript file not found');
}
