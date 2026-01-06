const fs = require('fs').promises;
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, 'backup_comments');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }
    // Only restore .js files and package files
    if (entry.isFile()) {
      const rel = path.relative(BACKUP_DIR, fullPath);
      const target = path.join(ROOT, rel);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(fullPath, target);
      console.log('[RESTORED]', rel);
    }
  }
}

(async () => {
  try {
    await walk(BACKUP_DIR);
    console.log('Restoration complete.');
  } catch (err) {
    console.error('Restore failed:', err);
    process.exit(1);
  }
})();
