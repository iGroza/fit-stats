/**
 * Копирует self-hosted Font Awesome (Free) из node_modules в public/vendor,
 * чтобы иконки попадали в dist при сборке и не зависели от CDN.
 *
 * Vite автоматически копирует public/ -> dist/, поэтому после этого скрипта
 * иконки окажутся в dist/vendor/fontawesome/{css,webfonts}.
 *
 * all.min.css ссылается на шрифты относительным путём ../webfonts/*, поэтому
 * структура css/ + webfonts/ сохраняется один-в-один.
 *
 * Запуск: node scripts/copy-fontawesome.mjs (вызывается из npm run build).
 */
import { mkdir, copyFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../node_modules/@fortawesome/fontawesome-free');
const DEST = path.resolve(__dirname, '../public/vendor/fontawesome');

async function copyDirFiles(fromDir, toDir) {
  await mkdir(toDir, { recursive: true });
  const entries = await readdir(fromDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      await copyFile(path.join(fromDir, entry.name), path.join(toDir, entry.name));
    }
  }
}

async function main() {
  await rm(DEST, { recursive: true, force: true });

  // Только минифицированный all.min.css (solid + regular + brands) и шрифты.
  await mkdir(path.join(DEST, 'css'), { recursive: true });
  await copyFile(
    path.join(SRC, 'css/all.min.css'),
    path.join(DEST, 'css/all.min.css')
  );
  await copyDirFiles(path.join(SRC, 'webfonts'), path.join(DEST, 'webfonts'));

  console.log('✔ Font Awesome скопирован в public/vendor/fontawesome');
}

main().catch((err) => {
  console.error('copy-fontawesome failed:', err);
  process.exit(1);
});
