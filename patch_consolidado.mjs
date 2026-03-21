import fs from 'fs';
import path from 'path';

const dirs = [
  './src/pages',
  './src/components'
];

function patch(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Replace direct filters: .filter(x => x.clinicaId === clinica.id)
  content = content.replace(/\.filter\(\s*([a-zA-Z0-9_]+)\s*=>\s*\1\.clinicaId\s*===\s*clinica\.id\s*\)/g, 
    ".filter($1 => clinica.id === 'consolidado' || $1.clinicaId === clinica.id)");
    
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Patched:', filePath);
  }
}

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
      if (f.endsWith('.tsx') || f.endsWith('.ts')) {
        patch(path.join(dir, f));
      }
    });
  }
});
