// 静态站点自检：引用的文件是否存在、页面链接是否有效
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname);
const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
let fail = 0;

function exists(p) {
  const clean = p.split('?')[0].split('#')[0];
  if (!clean || clean.startsWith('http') || clean.startsWith('mailto:')) return true;
  return fs.existsSync(path.join(root, clean));
}

htmlFiles.forEach((file) => {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const refs = [];
  html.replace(/(?:href|src)="([^"]+)"/g, (_, u) => { refs.push(u); return _; });
  refs.forEach((u) => {
    if (!exists(u)) {
      fail += 1;
      console.error('  ✗ ' + file + ' 引用了不存在的 ' + u);
    }
  });
});

// sw.js 预缓存清单
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const listed = [];
sw.replace(/'\.\/([^']*)'/g, (_, f) => { listed.push(f); return _; });
listed.forEach((f) => {
  if (!f) return;
  if (!fs.existsSync(path.join(root, f))) {
    fail += 1;
    console.error('  ✗ sw.js 预缓存了不存在的 ' + f);
  }
});

// manifest 图标
const man = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
man.icons.forEach((i) => {
  if (!fs.existsSync(path.join(root, i.src))) {
    fail += 1;
    console.error('  ✗ manifest 图标缺失 ' + i.src);
  }
});

console.log('检查 %d 个页面、%d 个预缓存文件', htmlFiles.length, listed.length);
if (fail) { console.error('%d 项未通过', fail); process.exit(1); }
console.log('全部通过');
