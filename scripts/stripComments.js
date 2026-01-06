const fs = require('fs').promises;
const path = require('path');
const strip = require('strip-comments');

const ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, 'backup_comments');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules, .git, backup dir
    if (entry.name === 'node_modules' || entry.name === '.git' || fullPath === BACKUP_DIR) continue;

    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.js')) {
      await processFile(fullPath);
    }
  }
}

async function processFile(filePath) {
  try {
    const original = await fs.readFile(filePath, 'utf8');
    if (!original.includes('//') && !original.includes('/*')) {
      // No comment-like patterns — skip
      return;
    }

    // Preserve shebang
    let shebang = '';
    let content = original;
    if (content.startsWith('#!')) {
      const firstNewline = content.indexOf('\n');
      shebang = content.slice(0, firstNewline + 1);
      content = content.slice(firstNewline + 1);
    }

    const stripped = shebang + strip(content);

    // Write backup
    const rel = path.relative(ROOT, filePath);
    const backupPath = path.join(BACKUP_DIR, rel);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, original, 'utf8');

    // Overwrite file without comments
    await fs.writeFile(filePath, stripped, 'utf8');
    console.log('[OK] Stripped comments:', rel);
  } catch (err) {
    console.error('[ERR] Failed processing', filePath, err.message);
  }
}

(async () => {
  try {
    console.log('Backing up originals to:', BACKUP_DIR);
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await walk(ROOT);
    console.log('Done. Originals are kept in', BACKUP_DIR);
  } catch (err) {
    console.error('Fatal:', err);
    process.exit(1);
  }
})();
