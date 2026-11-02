import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Run with bun. The Android shell loads the hosted app (it needs the online login and shared data).
const destination = process.argv[2];
if (!destination) throw new Error('Usage: bun scripts/prepare-android.ts /tmp/android-project [appUrl]');
const appUrl = process.argv[3] ?? process.env.APP_URL ?? 'https://revived-project-journey.lovable.app';
const root = resolve(destination);
await mkdir(`${root}/www`, { recursive: true });
await writeFile(`${root}/www/index.html`, `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Don Cangrejo Pro</title></head><body>Sin conexión. Abre de nuevo con internet.</body></html>`);
await writeFile(`${root}/package.json`, JSON.stringify({
  name: 'don-cangrejo-android', version: '2.0.0', private: true,
  dependencies: { '@capacitor/core': '7.4.3', '@capacitor/android': '7.4.3' },
  devDependencies: { '@capacitor/cli': '7.4.3' },
}, null, 2));
await writeFile(`${root}/capacitor.config.json`, JSON.stringify({
  appId: 'mx.doncangrejo.pro', appName: 'Don Cangrejo Pro', webDir: 'www',
  server: { url: appUrl, androidScheme: 'https', allowNavigation: ['*.lovable.app', 'oauth.lovable.app', 'accounts.google.com'] },
}, null, 2));
console.log(`Android shell prepared in ${root} -> ${appUrl}`);
