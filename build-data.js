// 从 拾词 的 dxey.pack.json 生成 data/course.js
// 用法: node build-data.js <dxey.pack.json 路径>
const fs = require('fs');
const path = require('path');

const src = process.argv[2] || process.env.DXEY_PACK || '../tango-repo/internal/pack/packs/dxey.pack.json';
const out = path.join(__dirname, 'data', 'course.js');
const ACUTE = '\u0301';

// "вне́шность" -> "вн[е]шность"（与 ru-zh-cards 的重音写法一致）
function bracketStress(word) {
  const i = word.indexOf(ACUTE);
  if (i < 1) return word;
  const vowel = word[i - 1];
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

// 括号：支配关系进 gov，变体说明（单/复…）进 note
function splitParen(word) {
  const m = /[（(]([^()（）]*)[）)]/.exec(word);
  if (!m) return { word: word, gov: '', note: '' };
  const inner = m[1].trim();
  const rest = (word.slice(0, m.index) + word.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim();
  const plain = inner.replace(/\u0301/g, '');
  if (/^(单|复|常用|复数|变格)/.test(inner)) return { word: rest, gov: '', note: plain };
  return { word: rest, gov: plain, note: '' };
}

// 分号后是标注 "чудо; 复 чудеса"
function splitSemi(word) {
  const i = word.indexOf(';');
  if (i < 0) return { word: word, note: '' };
  return { word: word.slice(0, i).trim(), note: word.slice(i + 1).trim() };
}

const ADJ_END = ['ый', 'ий', 'ой', 'ая', 'яя', 'ое', 'ые', 'ие'];

// 没有 [阴]/[阳]/[中] 标注时按词尾推断；复数词尾返回空
function inferGender(w) {
  const lw = w.toLowerCase();
  if (lw.endsWith('ы') || lw.endsWith('и')) return '';
  if (lw.endsWith('ость') || lw.endsWith('есть')) return '阴';
  if (lw.endsWith('а') || lw.endsWith('я')) return '阴';
  if (lw.endsWith('о') || lw.endsWith('е') || lw.endsWith('ё')) return '中';
  return '阳';
}

function tables(mdPath) {
  const lines = fs.readFileSync(mdPath, 'utf8').split(/\r?\n/);
  let inSec = false;
  const rows = [];
  for (const line of lines) {
    const s = line.trim();
    if (s.startsWith('## ')) {
      inSec = s.toLowerCase().includes('слова');
      continue;
    }
    if (!inSec || !s.startsWith('|')) continue;
    const cells = s.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.length < 3) continue;
    if (cells[0] === '词' || /^[-: ]+$/.test(cells[0])) continue;
    rows.push(cells);
  }
  return rows;
}

const pack = JSON.parse(fs.readFileSync(src, 'utf8'));

const lessons = pack.lessons
  .slice()
  .sort((a, b) => a.lesson - b.lesson)
  .map((l) => ({ n: l.lesson, title: l.title || '' }));

const byLesson = new Map();
const items = pack.items.map((it) => {
  byLesson.set(it.lesson, (byLesson.get(it.lesson) || 0) + 1);

  // 逐层拆：读音提示 → 括号（支配/变体）→ 分号标注
  function clean(s) {
    const hint = splitHint(s);
    const paren = splitParen(hint.word);
    const semi = splitSemi(paren.word);
    return {
      word: semi.word,
      hint: hint.hint,
      parenGov: paren.gov,
      notes: [paren.note, semi.note].filter(Boolean),
    };
  }

  const head0 = clean(it.ru);
  let raw = head0.word;
  let forms = [raw];
  const alts = (it.alt || []).map((a) => clean(a));
  if (alts.length) forms = [raw].concat(alts.map((a) => a.word));
  else if (raw.includes('//')) forms = raw.split('//').map((t) => t.trim()).filter(Boolean);
  else if (/\s\/\s/.test(raw)) forms = raw.split(/\s\/\s/).map((t) => t.trim()).filter(Boolean);

  const kind = forms.length > 1 ? 'pair' : (forms[0].includes(' ') ? 'phrase' : 'word');
  const head = forms[0];
  const bare = head.replace(/\[|\]/g, '').toLowerCase();
  const gov = head0.parenGov || it.gov || '';

  let pos = it.pos || '';
  if (kind === 'pair') pos = '动';
  else if (kind === 'phrase') pos = '';                                     // 词组不标词性
  else if (pos === '名' && ADJ_END.some((e) => bare.endsWith(e))) pos = '形'; // 去掉括号后能认出形容词

  const notes = [];
  if (it.note) notes.push(it.note);
  if (head0.hint) notes.push(head0.hint);
  head0.notes.forEach((n) => notes.push(n));
  alts.forEach((a) => { if (a.hint) notes.push(a.hint); });

  const row = {
    id: it.id,
    l: it.lesson,
    ru: bracketStress(head),
    zh: it.zh,
    pos,
    kind,
  };
  if (kind === 'pair') row.alt = forms.slice(1).map(bracketStress);
  if (pos === '名') {
    const g = it.genderExplicit ? it.gender : inferGender(bare);
    if (g) row.gender = g;
  }
  if (gov) row.gov = gov;
  if (it.aspect && kind !== 'pair') row.aspect = it.aspect;
  if (notes.length) row.note = [...new Set(notes)].join('；');
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
const body = 'window.RU_WORDS_BOOK = ' + JSON.stringify(data) + ';\n';
fs.writeFileSync(out, body, 'utf8');

const stressed = items.filter((i) => i.ru.includes('[')).length;
const pairs = items.filter((i) => i.kind === 'pair').length;
const phrases = items.filter((i) => i.kind === 'phrase').length;
console.log('课数 %d，词条 %d，带重音 %d，体对 %d，词组 %d',
  data.lessons.length, items.length, stressed, pairs, phrases);
console.log('写出', out, (Buffer.byteLength(body) / 1024).toFixed(0) + ' KB');
