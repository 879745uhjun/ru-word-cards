#!/usr/bin/env node
// 用带重音的课文语料交叉核对词条的重音标注。
// 用法: node tools/check-stress.js [data/course.js] [课文目录]
// 课文目录缺省时跳过（语料不在仓库里）。
const fs = require('fs');
const path = require('path');

const BOOK = process.argv[2] || path.join(__dirname, '..', 'data', 'course.js');
const SRC = process.argv[3] || process.env.TEXTBOOK_DIR || '';
const VOW = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ';
const ACUTE = /[\u0300\u0301]/;

function plain(s) {
  return String(s).normalize('NFC').replace(/[[\]]/g, '').replace(ACUTE, '')
    .toLowerCase().replace(/ё/g, 'е');
}

// 重音符落在第几个元音（0 起）
function stressedIndex(form) {
  const t = String(form).normalize('NFC');
  let n = -1;
  for (let i = 0; i < t.length; i++) {
    if (ACUTE.test(t[i])) return n;
    if (VOW.includes(t[i])) n += 1;
  }
  return -1;
}

function bracketIndex(s) {
  const t = String(s);
  const i = t.indexOf('[');
  if (i < 0) return -1;
  return [...t.slice(0, i)].filter((c) => VOW.includes(c)).length;
}

if (!SRC || !fs.existsSync(SRC)) {
  console.log('跳过：没有提供课文目录（语料只在本地）');
  process.exit(0);
}

const index = new Map();
for (const d of fs.readdirSync(SRC)) {
  if (!/^第.+课$/.test(d)) continue;
  const f = path.join(SRC, d, d + '全课原文_带重音.md');
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    for (const tok of line.match(/[А-Яа-яЁё\u0300\u0301-]+/g) || []) {
      const p = plain(tok);
      if (!p) continue;
      if (!index.has(p)) index.set(p, new Map());
      const bag = index.get(p);
      bag.set(tok, (bag.get(tok) || 0) + 1);
    }
  }
}

// data/course.js 是浏览器脚本，用 vm 取 window
const vm = require('vm');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(BOOK, 'utf8'), ctx);
const items = ctx.window.RU_WORDS_BOOK.items;

let checked = 0, agree = 0, bad = [];
for (const it of items) {
  if (!it.ru.includes('[')) continue;
  const bag = index.get(plain(it.ru));
  if (!bag) continue;
  let best = null, cnt = 0;
  for (const [form, c] of bag) {
    if (stressedIndex(form) >= 0 && c > cnt) { best = form; cnt = c; }
  }
  if (!best) continue;
  checked++;
  if (bracketIndex(it.ru) === stressedIndex(best)) agree++;
  else bad.push(it.ru + '  语料作 ' + best);
}

console.log('可核对 %d 条：一致 %d，不一致 %d', checked, agree, bad.length);
bad.slice(0, 20).forEach((s) => console.log('   ', s));
if (bad.length) {
  console.error('重音与语料不一致');
  process.exit(1);
}
