import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const version = {
  version: Date.now().toString(),
  date: new Date().toISOString()
};

const versionPath = path.join(__dirname, 'public', 'version.json');

fs.writeFileSync(versionPath, JSON.stringify(version, null, 2));

console.log(`✅ version.json generated: ${version.version}`);
