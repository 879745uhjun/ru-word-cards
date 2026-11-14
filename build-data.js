// 从 拾词 的 dxey.pack.json 生成 data/course.js
// 用法: node build-data.js <dxey.pack.json 路径>
const fs = require('fs');
const path = require('path');

const src = process.argv[2] || process.env.DXEY_PACK || '../tango-repo/internal/pack/packs/dxey.pack.json';
const out = path.join(__dirname, 'data', 'course.js');

const ACUTE = '\u0301';

// "вне́шность" -> "вн[е]шность"（与 ru-zh-cards 的重音写法一致）
function bracketStress(word) {
  let i = word.indexOf(ACUTE);
  if (i < 1) return word;
  const vowel = word[i - 1];
  const clean = word.slice(0, i - 1) + vowel + word.slice(i + 1);
  return word.slice(0, i - 1) + '[' + vowel + ']' + word.slice(i + 1).replace(/\u0301/g, '');
}

// 教材里的读音提示，如 интервью [тэ]：拆出来放进 note，不参与重音渲染
function splitHint(word) {
  const m = /\[([^\]]{2,})\]/.exec(word);
  if (!m) return { word: word, hint: '' };
  return {
    word: (word.slice(0, m.index) + word.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim(),
    hint: '读音 ' + m[0],
  };
}

const pack = JSON.parse(fs.readFileSync(src, 'utf8'));

const lessons = pack.lessons
  .slice()
  .sort((a, b) => a.lesson - b.lesson)
  .map((l) => ({ n: l.lesson, title: l.title || '' }));

const byLesson = new Map();
const items = pack.items.map((it) => {
  byLesson.set(it.lesson, (byLesson.get(it.lesson) || 0) + 1);
  const split = splitHint(it.ru);
  const row = {
    id: it.id,
    l: it.lesson,
    ru: bracketStress(split.word),
    zh: it.zh,
    pos: it.pos || '',
    kind: it.kind || 'word',
  };
  if (it.gender) row.gender = it.gender;
  if (it.gov) row.gov = it.gov;
  if (it.aspect) row.aspect = it.aspect;
  if (it.note) row.note = it.note;
  if (split.hint) row.note = row.note ? (row.note + '；' + split.hint) : split.hint;
  if (it.alt && it.alt.length) row.alt = it.alt.map(bracketStress);
  return row;
});

const data = {
  id: pack.id,
  title: pack.title || '大学俄语 3',
  series: pack.series || '',
  credit: pack.credit || '',
  lessons: lessons.map((l) => ({ n: l.n, title: l.title, count: byLesson.get(l.n) || 0 })),
  items,
};

fs.mkdirSync(path.dirname(out), { recursive: true });
const body = 'window.RU_WORDS_BOOK = ' + JSON.stringify(data, null, 0) + ';\n';
fs.writeFileSync(out, body, 'utf8');

const stressed = items.filter((i) => i.ru.includes('[')).length;
console.log('课数 %d，词条 %d，带重音 %d', data.lessons.length, items.length, stressed);
console.log('写出', out, (Buffer.byteLength(body) / 1024).toFixed(0) + ' KB');
