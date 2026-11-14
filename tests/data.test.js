// 数据自检：node tests/data.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'data', 'course.js'), 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

const book = sandbox.window.RU_WORDS_BOOK;
let fail = 0;

function ok(cond, msg) {
  if (!cond) {
    fail += 1;
    console.error('  ✗ ' + msg);
  }
}

ok(!!book, '课程数据已生成');
ok(book.lessons.length === 12, '课数为 12，实际 ' + book.lessons.length);
ok(book.items.length > 900, '词条数 > 900，实际 ' + book.items.length);

const ids = new Set();
const re = /^вн\[е\]|\[[А-Яа-яЁё]\]$/;
book.items.forEach((it, i) => {
  const tag = '#' + i + ' ' + (it.ru || '');
  ok(it.id && !ids.has(it.id), tag + ' id 唯一');
  ids.add(it.id);
  ok(typeof it.ru === 'string' && it.ru.length > 0, tag + ' 有俄语词形');
  ok(typeof it.zh === 'string' && it.zh.length > 0, tag + ' 有中文释义');
  ok(typeof it.l === 'number' && it.l >= 1 && it.l <= 12, tag + ' 课次合法');
  const open = (it.ru.match(/\[/g) || []).length;
  const close = (it.ru.match(/\]/g) || []).length;
  ok(open === close && open <= 1, tag + ' 重音标记成对且至多一个');
  ok(!/\u0301/.test(it.ru), tag + ' 已转换为方括号写法');
  if (it.alt) it.alt.forEach((a) => ok(!/\[.*\[/.test(a), tag + ' alt 重音标记合法'));
});

book.lessons.forEach((l) => {
  const n = book.items.filter((it) => it.l === l.n).length;
  ok(n === l.count, '第 ' + l.n + ' 课计数一致（声明 ' + l.count + '，实际 ' + n + '）');
});

const stressed = book.items.filter((i) => i.ru.includes('[')).length;
console.log('课数 %d · 词条 %d · 带重音 %d', book.lessons.length, book.items.length, stressed);

if (fail) {
  console.error('\n%d 项检查未通过', fail);
  process.exit(1);
}
console.log('全部检查通过');
