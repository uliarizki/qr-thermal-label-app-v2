
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionData = {
    timestamp: Date.now(),
    date: new Date().toISOString(),
};

const publicDir = path.resolve(__dirname, '../public');
const versionFile = path.join(publicDir, 'version.json');

// Ensure public dir exists
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));

console.log(`✅ Version file generated at ${versionFile}`);
console.log(versionData);
