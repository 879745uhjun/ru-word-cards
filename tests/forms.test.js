// 变格/变位数据自检：node tests/forms.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'course.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'forms.js'), 'utf8'), ctx);

const book = ctx.window.RU_WORDS_BOOK;
const forms = ctx.window.RU_WORDS_FORMS;
let fail = 0;

function ok(cond, msg) {
  if (!cond) { fail += 1; console.error('  ✗ ' + msg); }
}

ok(!!forms, '表格数据已生成');
const ids = new Set(book.items.map((i) => i.id));
const keys = Object.keys(forms);
ok(keys.length > 600, '表格数 > 600，实际 ' + keys.length);

let cells = 0, stressed = 0;
const kinds = { n: 0, v: 0, a: 0 };
keys.forEach((id) => {
  const f = forms[id];
  ok(ids.has(id), id + ' 属于本书词条');
  ok(f && ['n', 'v', 'a'].includes(f.k), id + ' 表格类型合法');
  kinds[f.k] += 1;
  ok(Array.isArray(f.h) && f.h.length >= 2, id + ' 有表头');
  ok(Array.isArray(f.r) && f.r.length > 0, id + ' 有行');
  f.r.forEach((row, i) => {
    ok(Array.isArray(row) && row.length === f.h.length, id + ' 第 ' + i + ' 行列数与表头一致');
    row.slice(1).forEach((cell) => {
      cells += 1;
      if (cell.includes('\u0301')) stressed += 1;
      ok(!/[\u0300]/.test(cell), id + ' 表格不用重音符（grave）');
      ok(!/[[\]]/.test(cell), id + ' 格子不用方括号写法');
    });
  });
  if (f.p) {
    ok(Array.isArray(f.p.r) && f.p.r.length > 0, id + ' 过去时表有行');
    f.p.r.forEach((row) => ok(row.length === f.p.h.length, id + ' 过去时行列数一致'));
  }
});

ok(stressed / cells > 0.7, '带重音的格子 > 70%，实际 ' + Math.round((stressed / cells) * 100) + '%');
console.log('表格 %d：名词 %d · 动词 %d · 形容词 %d', keys.length, kinds.n, kinds.v, kinds.a);
console.log('格子 %d，带重音 %d（%d%%）', cells, stressed, Math.round((stressed / cells) * 100));

if (fail) { console.error('\n%d 项未通过', fail); process.exit(1); }
console.log('全部检查通过');
