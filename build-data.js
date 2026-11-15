// 从 拾词 的 dxey.pack.json 生成 data/course.js
// 用法: node build-data.js <dxey.pack.json> [课文目录]
//      课文目录用于抽取例句；不给则只生成词条。
const fs = require('fs');
const path = require('path');

const src = process.argv[2] || process.env.DXEY_PACK || '../tango-repo/internal/pack/packs/dxey.pack.json';
const bookDir = process.argv[3] || process.env.TEXTBOOK_DIR || '';
const out = path.join(__dirname, 'data', 'course.js');
const ACUTE = '\u0301';

// ── 词形清洗 ────────────────────────────────────────────────

function bracketStress(word) {
  const i = word.indexOf(ACUTE);
  if (i < 1) return word;
  const vowel = word[i - 1];
  return word.slice(0, i - 1) + '[' + vowel + ']' + word.slice(i + 1).replace(/\u0301/g, '');
}

function splitHint(word) {
  const m = /\[([^\]]{2,})\]/.exec(word);
  if (!m) return { word: word, hint: '' };
  return {
    word: (word.slice(0, m.index) + word.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim(),
    hint: '读音 ' + m[0],
  };
}

function splitParen(word) {
  const m = /[（(]([^()（）]*)[）)]/.exec(word);
  if (!m) return { word: word, gov: '', note: '' };
  const inner = m[1].trim();
  const rest = (word.slice(0, m.index) + word.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim();
  const plainInner = inner.replace(/\u0301/g, '');
  if (/^(单|复|常用|复数|变格)/.test(inner)) return { word: rest, gov: '', note: plainInner };
  return { word: rest, gov: plainInner, note: '' };
}

function splitSemi(word) {
  const i = word.indexOf(';');
  if (i < 0) return { word: word, note: '' };
  return { word: word.slice(0, i).trim(), note: word.slice(i + 1).trim() };
}

const ADJ_END = ['ый', 'ий', 'ой', 'ая', 'яя', 'ое', 'ые', 'ие'];

function inferGender(w) {
  const lw = w.toLowerCase();
  if (lw.endsWith('ы') || lw.endsWith('и')) return '';
  if (lw.endsWith('ость') || lw.endsWith('есть')) return '阴';
  if (lw.endsWith('а') || lw.endsWith('я')) return '阴';
  if (lw.endsWith('о') || lw.endsWith('е') || lw.endsWith('ё')) return '中';
  return '阳';
}

// 去掉重音，用于匹配
function plain(s) {
  return String(s).normalize('NFC').replace(/[\u0300\u0301]/g, '').toLowerCase();
}

// ── 例句抽取 ────────────────────────────────────────────────

const CYR = /[А-Яа-яЁё]/;

function cyrRatio(s) {
  const letters = s.replace(/[^A-Za-zА-Яа-яЁё]/g, '');
  if (!letters) return 0;
  return (letters.match(/[А-Яа-яЁё]/g) || []).length / letters.length;
}

function cleanLine(s) {
  return s
    .replace(/[\u0300\u0301]/g, '')                 // 抽句时去重音，页面显示时不需要
    .replace(/\*\*|\*|__/g, '')
    .replace(/¹⁾|²⁾|³⁾|⁴⁾|⁵⁾/g, '')
    .replace(/^[-–—]\s*/, '')
    .replace(/^\d+[.．)]\s*/, '')
    .replace(/^[а-я]\)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentencesFrom(line) {
  return (line.match(/[^.!?…]+[.!?…]+[»"]?|[^.!?…]+$/g) || []).map((p) => p.trim()).filter(Boolean);
}

// 练习题干/指令，不算例句
const INSTRUCTION = new RegExp('^(' + [
  'Задание', 'Задания', 'Образуйте', 'Прочитайте', 'Прочтите', 'Переведите', 'Ответьте',
  'Составьте', 'Найдите', 'Выберите', 'Определите', 'Объясните', 'Расскажите', 'Напишите',
  'Вставьте', 'Раскройте', 'Запомните', 'Обратите', 'Сравните', 'Дополните', 'Преобразуйте',
  'Поставьте', 'Замените', 'Скажите', 'Повторите', 'Прослушайте', 'Опишите', 'Выучите',
  'Просклоняйте', 'Проспрягайте', 'Подберите', 'Закончите', 'Прочитайте', 'Рассмотрите',
  'Посмотрите', 'Вспомните', 'Укажите', 'Отметьте', 'Проверьте', 'Сгруппируйте'
].join('|') + ')(?=\\s|$|[,.!?…:;])');

function harvestLesson(file, lessonNo) {
  const out = [];
  let inComment = false;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const s = raw.trim();
    if (!s) continue;
    if (s.startsWith('<!--')) { inComment = !s.includes('-->'); continue; }
    if (inComment) { if (s.includes('-->')) inComment = false; continue; }
    if (s.startsWith('|') || s.startsWith('#') || s.startsWith('>')) continue;
    if (/^\*\*.*\*\*$/.test(s)) continue;                    // 加粗小标题
    if (/^（续表）|^Для замены|^Образец|^Комментарий/i.test(cleanLine(s))) continue;
    if (!CYR.test(s)) continue;
    const line = cleanLine(s);
    if (line.length < 10) continue;
    for (const sent of sentencesFrom(line)) {
      const t = sent.replace(/[«»"]/g, '').trim();
      if (t.length < 10 || t.length > 150) continue;
      const words = t.split(/\s+/).length;
      if (words < 4) continue;                                // 太短的碎片
      if (cyrRatio(t) < 0.6) continue;
      if (/_{2,}|…\s*$/.test(t)) continue;
      if (INSTRUCTION.test(t.replace(/^\d+[.．)]\s*/, ''))) continue;
      out.push({ ru: sent.trim(), l: lessonNo });
    }
  }
  return out;
}

function loadBank(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const bank = [];
  const seen = new Set();
  for (const d of fs.readdirSync(dir)) {
    const m = /^第(.+)课$/.exec(d);
    if (!m) continue;
    const no = cnNumber(m[1]);
    const f = path.join(dir, d, d + '全课原文_带重音.md');
    if (!no || !fs.existsSync(f)) continue;
    for (const s of harvestLesson(f, no)) {
      const key = plain(s.ru);
      if (seen.has(key)) continue;
      seen.add(key);
      bank.push({ id: 'ex' + String(bank.length + 1).padStart(4, '0'), ru: s.ru, l: s.l });
    }
  }
  return bank;
}

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function cnNumber(s) {
  if (s === '十一') return 11;
  if (s === '十二') return 12;
  return CN[s] || 0;
}

// 词干：去掉常见词尾，留出能覆盖变格变位的公共前缀
const ENDINGS = [
  'ться', 'ться', 'аться', 'яться', 'овать', 'евать',
  'ый', 'ий', 'ой', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ого', 'ому', 'ыми', 'ими',
  'ами', 'ями', 'ах', 'ях', 'ов', 'ев', 'ей', 'ом', 'ем',
  'ать', 'ять', 'ить', 'еть', 'уть', 'ыть', 'ять',
  'а', 'я', 'о', 'е', 'ё', 'ы', 'и', 'ь', 'й', 'у', 'ю'
];

function stemOf(word) {
  let w = plain(word).replace(/[[\]]/g, '').replace(/ё/g, 'е').trim();
  if (w.includes(' ')) w = w.split(' ')[0];
  for (const e of ENDINGS) {
    if (w.length - e.length >= 3 && w.endsWith(e)) return w.slice(0, -e.length);
  }
  return w;
}

function tokensOf(sentence) {
  return plain(sentence).replace(/ё/g, 'е').replace(/[^а-я\- ]/g, ' ').split(/\s+/).filter(Boolean);
}

function matchScore(item, ex, lessonOf) {
  const tok = tokensOf(ex.ru);
  if (!tok.length) return -1;
  const stems = item.stems;
  let hit = -1;
  for (let i = 0; i < tok.length; i++) {
    const t = tok[i];
    for (const st of stems) {
      if (st.length < 3) { if (t === st) { hit = i; break; } continue; }
      if (t.startsWith(st) && t.length <= st.length + 6) { hit = i; break; }
    }
    if (hit >= 0) break;
  }
  if (hit < 0) return -1;
  let score = 100;
  if (ex.l !== lessonOf) score -= 25;              // 优先本课
  const words = ex.ru.split(/\s+/).length;
  if (words >= 5 && words <= 22) score += 10;      // 长度适中
  if (/[.!?…]$/.test(ex.ru.trim())) score += 5;    // 完整句
  score -= Math.abs(words - 10);

  // 命中词与词干的接近程度：完全同形最好，多出的字母越多越可疑（худо́й vs худо́жник）
  const token = tok[hit];
  const stem = item.stems.find((st) => token.startsWith(st)) || '';
  const extra = token.length - stem.length;
  if (item.head === token) score += 60;
  if (extra <= 3) score += 15;
  else if (extra >= 6) score -= 35;
  else score -= 10;
  return score;
}

// ── 生成 ────────────────────────────────────────────────────

const pack = JSON.parse(fs.readFileSync(src, 'utf8'));
const bank = loadBank(bookDir);
console.log('候选句子:', bank.length);

const lessons = pack.lessons
  .slice()
  .sort((a, b) => a.lesson - b.lesson)
  .map((l) => ({ n: l.lesson, title: l.title || '' }));

const byLesson = new Map();
const items = pack.items.map((it) => {
  byLesson.set(it.lesson, (byLesson.get(it.lesson) || 0) + 1);

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
  const raw = head0.word;
  const alts = (it.alt || []).map((a) => clean(a));
  let forms = [raw];
  if (alts.length) forms = [raw].concat(alts.map((a) => a.word));
  else if (raw.includes('//')) forms = raw.split('//').map((t) => t.trim()).filter(Boolean);
  else if (/\s\/\s/.test(raw)) forms = raw.split(/\s\/\s/).map((t) => t.trim()).filter(Boolean);

  const kind = forms.length > 1 ? 'pair' : (forms[0].includes(' ') ? 'phrase' : 'word');
  const head = forms[0];
  const bare = plain(head.replace(/[[\]]/g, ''));
  const gov = head0.parenGov || it.gov || '';

  let pos = it.pos || '';
  if (kind === 'pair') pos = '动';
  else if (kind === 'phrase') pos = '';
  else if (pos === '名' && ADJ_END.some((e) => bare.endsWith(e))) pos = '形';

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

  // 例句匹配（最多 2 条，优先本课、长度适中）
  if (bank.length) {
    const multi = forms.some((f) => f.includes(' '));
    const stems = multi ? [] : [...new Set(forms.map((f) => stemOf(f)))];
    if (stems.length) {
      const cands = [];
      const self = { stems, head: bare };
      for (const ex of bank) {
        const sc = matchScore(self, ex, it.lesson);
        if (sc >= 0) cands.push({ ex, sc });
      }
      cands.sort((a, b) => b.sc - a.sc);
      if (cands.length) {
        const top = cands.filter((c) => c.sc >= 60).slice(0, 2);
        if (top.length) row.ex = top.map((c) => c.ex.id);
      }
    }
  }
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

// 只保留被引用的句子
const used = new Set();
items.forEach((i) => (i.ex || []).forEach((id) => used.add(id)));
if (used.size) {
  data.bank = bank.filter((e) => used.has(e.id)).map((e) => ({ id: e.id, ru: e.ru, l: e.l }));
}
const withEx = items.filter((i) => i.ex && i.ex.length).length;

fs.mkdirSync(path.dirname(out), { recursive: true });
const body = 'window.RU_WORDS_BOOK = ' + JSON.stringify(data) + ';\n';
fs.writeFileSync(out, body, 'utf8');

const stressed = items.filter((i) => i.ru.includes('[')).length;
const pairs = items.filter((i) => i.kind === 'pair').length;
const phrases = items.filter((i) => i.kind === 'phrase').length;
console.log('课数 %d，词条 %d，带重音 %d，体对 %d，词组 %d',
  data.lessons.length, items.length, stressed, pairs, phrases);
console.log('例句 ' + (data.bank ? data.bank.length : 0) + ' 条，覆盖 ' + withEx +
  ' 个词条（' + Math.round((withEx / items.length) * 100) + '%）');
console.log('写出', out, (Buffer.byteLength(body) / 1024).toFixed(0) + ' KB');
