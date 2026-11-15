// 页面一致性自检：主题、导航、脚本引用
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
let fail = 0;

function ok(cond, msg) {
  if (!cond) { fail += 1; console.error('  ✗ ' + msg); }
}

ok(pages.length >= 5, '页面数 ≥ 5，实际 ' + pages.length);

pages.forEach((p) => {
  if (p.startsWith('_')) return;
  const s = fs.readFileSync(path.join(root, p), 'utf8');
  ok(s.includes('rwc-theme'), p + ' 有防闪的主题初始化');
  ok(s.includes('theme.js'), p + ' 引入 theme.js');
  ok(s.includes('data-theme-toggle'), p + ' 有主题切换按钮');
  ok(s.includes('href="wrong.html"'), p + ' 导航有错题本');
  ok(s.includes('href="index.html"'), p + ' 导航有首页');
  ok(s.includes('href="study.html"'), p + ' 导航有背诵');
  ok(!/<script src="data\/forms\.js"><\/script>\s*<script src="data\/forms\.js">/.test(s), p + ' 没有重复引用');
});

// 错题本页
const wrong = fs.readFileSync(path.join(root, 'wrong.html'), 'utf8');
ok(wrong.includes('wrong.js'), '错题本引入 wrong.js');
ok(wrong.includes('study.html?wrong=1'), '错题本有复习入口');

// 主题脚本默认浅色
const theme = fs.readFileSync(path.join(root, 'theme.js'), 'utf8');
ok(theme.includes("'light'"), 'theme.js 默认浅色');
ok(theme.includes('prefers-color-scheme'), 'theme.js 支持跟随系统');

console.log('检查 %d 个页面', pages.filter((p) => !p.startsWith('_')).length);
if (fail) { console.error('%d 项未通过', fail); process.exit(1); }
console.log('全部通过');
