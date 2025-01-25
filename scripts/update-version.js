import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read version
const versionFile = join(__dirname, '../public/version.json');
const version = JSON.parse(readFileSync(versionFile));
const [major, minor, patch] = version.version.split('.');
version.version = `${major}.${minor}.${parseInt(patch) + 1}`;

// Update files
writeFileSync(versionFile, JSON.stringify(version, null, 2));

const htmlPath = join(__dirname, '../public/index.html');
let html = readFileSync(htmlPath, 'utf8');
html = html.replace(
  /window\.__APP_VERSION__\s*=\s*['"].*?['"]/,
  `window.__APP_VERSION__ = '${version.version}'`
);
writeFileSync(htmlPath, html);

console.log(`Version updated to ${version.version}`);