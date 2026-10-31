import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { markup } from '../src/legacy/markup';

// Run with bun. Build Android separately from the hosted TanStack application.
const destination = process.argv[2];
if (!destination) throw new Error('Usage: bun scripts/prepare-android.ts /tmp/android-project');
const root = resolve(destination);
await mkdir(`${root}/www`, { recursive: true });
await copyFile('src/legacy/don-cangrejo.js', `${root}/www/don-cangrejo.js`);
await copyFile('src/legacy/don-cangrejo.css', `${root}/www/don-cangrejo.css`);
await writeFile(`${root}/www/index.html`, `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Don Cangrejo Pro</title>
<meta name="description" content="Calculadora y control de producción de longaniza.">
<link rel="stylesheet" href="don-cangrejo.css"></head>
<body>${markup}<script type="module">import { initDonCangrejo } from './don-cangrejo.js'; initDonCangrejo();</script></body></html>`);
await writeFile(`${root}/package.json`, JSON.stringify({
  name: 'don-cangrejo-android', version: '1.0.0', private: true,
  dependencies: { '@capacitor/core': '7.4.3', '@capacitor/android': '7.4.3' },
  devDependencies: { '@capacitor/cli': '7.4.3' },
}, null, 2));
await writeFile(`${root}/capacitor.config.json`, JSON.stringify({
  appId: 'mx.doncangrejo.pro', appName: 'Don Cangrejo Pro', webDir: 'www',
  server: { androidScheme: 'https' },
}, null, 2));
console.log(`Android web assets prepared in ${root}`);