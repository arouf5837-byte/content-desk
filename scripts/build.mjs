import { execSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';

console.log('Building with vinext...');
try {
  execSync('npx vinext build --prerender-all', { stdio: 'inherit' });
} catch (e) {
  if (!existsSync('dist/server/prerendered-routes/index.html')) {
    console.error('Prerendering failed to create index.html:', e);
    process.exit(1);
  }
}

console.log('Preparing production static distribution in dist...');

if (existsSync('dist/client')) {
  cpSync('dist/client', 'dist', { recursive: true, force: true });
}

if (existsSync('dist/server/prerendered-routes/index.html')) {
  copyFileSync('dist/server/prerendered-routes/index.html', 'dist/index.html');
  if (existsSync('dist/client')) {
    copyFileSync('dist/server/prerendered-routes/index.html', 'dist/client/index.html');
  }
}

if (existsSync('dist/server/prerendered-routes/404.html')) {
  copyFileSync('dist/server/prerendered-routes/404.html', 'dist/404.html');
  if (existsSync('dist/client')) {
    copyFileSync('dist/server/prerendered-routes/404.html', 'dist/client/404.html');
  }
}

console.log('Build & static preparation completed successfully! dist/index.html is ready.');
