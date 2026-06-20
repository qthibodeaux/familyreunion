const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Users\\qtiph\\OneDrive\\Desktop\\Deploy\\FamilyReunion\\familyreunion';
const srcDir = path.join(projectRoot, 'src');
const entryPoint = path.join(srcDir, 'index.js');

const visited = new Set();

// Resolve import path to actual file on disk
function resolveImport(importingFile, importSource) {
  if (!importSource.startsWith('.')) {
    // Third-party module (npm package)
    return null;
  }

  const baseDir = path.dirname(importingFile);
  const targetPath = path.resolve(baseDir, importSource);

  // Candidate file extensions
  const extensions = ['.js', '.jsx', '.css', '.less', '.json', '.svg', '.png', '.jpg', '.jpeg'];

  // 1. Check if the path directly exists
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    return targetPath;
  }

  // 2. Check path + extensions
  for (const ext of extensions) {
    const p = targetPath + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }

  // 3. Check if it's a directory containing an index file
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    for (const ext of extensions) {
      const p = path.join(targetPath, 'index' + ext);
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return p;
      }
    }
  }

  return null;
}

// Find all imports in a file's content
function extractImports(content) {
  const imports = [];

  // Match: import x from 'y';
  const importFromRegex = /import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importFromRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Match: import 'y';
  const sideEffectImportRegex = /import\s+['"]([^'"]+)['"]/g;
  while ((match = sideEffectImportRegex.exec(content)) !== null) {
    // Avoid double matching things with 'from'
    if (!match[0].includes('from')) {
      imports.push(match[1]);
    }
  }

  // Match: require('y')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

// Recursively trace the dependency graph
function traceDependencies(filePath) {
  const normalizedPath = path.normalize(filePath);
  if (visited.has(normalizedPath)) {
    return;
  }
  visited.add(normalizedPath);

  if (!fs.existsSync(normalizedPath)) {
    return;
  }

  // Only read text files (js, jsx, css, less, json)
  const ext = path.extname(normalizedPath).toLowerCase();
  if (!['.js', '.jsx', '.css', '.less', '.json'].includes(ext)) {
    return;
  }

  const content = fs.readFileSync(normalizedPath, 'utf8');
  const importSources = extractImports(content);

  importSources.forEach(source => {
    const resolved = resolveImport(normalizedPath, source);
    if (resolved) {
      traceDependencies(resolved);
    }
  });
}

// Recursively find all files in src/
function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

console.log('Tracing dependency graph starting from index.js...');
traceDependencies(entryPoint);

console.log(`Visited ${visited.size} active files in the tree.`);

console.log('Scanning all files in src/ directory...');
const allSrcFiles = getAllFiles(srcDir).map(p => path.normalize(p));

const unusedFiles = [];
const usedFiles = [];

allSrcFiles.forEach(filePath => {
  const ext = path.extname(filePath).toLowerCase();
  // We care about source files: js, jsx, css, less
  if (!['.js', '.jsx', '.css', '.less'].includes(ext)) {
    return;
  }

  if (visited.has(filePath)) {
    usedFiles.push(filePath);
  } else {
    unusedFiles.push(filePath);
  }
});

console.log('\n--- Active Files (Subset) ---');
usedFiles.slice(0, 10).forEach(f => console.log(`[ACTIVE] src/${path.relative(srcDir, f)}`));
if (usedFiles.length > 10) console.log(`... and ${usedFiles.length - 10} more active files.`);

console.log('\n--- Unused (Orphaned) Code Files ---');
unusedFiles.forEach(f => {
  console.log(`[UNUSED] src/${path.relative(srcDir, f)}`);
});

console.log(`\nSummary:`);
console.log(`Total active code files: ${usedFiles.length}`);
console.log(`Total unused code files: ${unusedFiles.length}`);

// Write outputs
fs.writeFileSync(
  path.join(__dirname, 'unused_code.json'),
  JSON.stringify({
    unused: unusedFiles.map(f => ({
      fullPath: f,
      relPath: path.relative(srcDir, f)
    })),
    used: usedFiles.map(f => path.relative(srcDir, f))
  }, null, 2)
);
