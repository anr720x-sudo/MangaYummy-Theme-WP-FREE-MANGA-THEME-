const fs = require('fs');
const path = 'c:/Users/user1/Desktop/mangayummy/functions.php';
const data = fs.readFileSync(path,'utf8');
const lines = data.split(/\r?\n/);
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth < 0) {
      process.exit(0);
    }
  }
}
