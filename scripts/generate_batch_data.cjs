
const fs = require('fs');
const path = require('path');

const count = 500;
let content = 'Name\tCity\tID\n';

for (let i = 1; i <= count; i++) {
    const id = `ID${String(i).padStart(3, '0')}`;
    content += `Test User ${i}\tJakarta\t${id}\n`;
}

const outputPath = path.join(__dirname, '../test_data_large.txt');
fs.writeFileSync(outputPath, content);
console.log(`Generated ${count} records to ${outputPath}`);
