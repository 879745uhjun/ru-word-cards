"""用 pymorphy3 生成俄语变格/变位表。

输入: data/course.js 里的词条 id/词形（或 dxey.pack.json）
输出: data/forms.js —— window.RU_WORDS_FORMS = { id: {k, h, r} }
     k = 表格类型 (n 名词 / v 动词 / a 形容词)
     h = 表头
     r = 行

重音：pymorphy3 不提供。用课文语料里的带重音词形回填，回填不到的就不标。
"""
import json
import os
import re
import sys
import unicodedata

import pymorphy3

sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(ROOT), "tango-repo", "internal", "pack", "packs", "dxey.pack.json")
SRC = sys.argv[2] if len(sys.argv) > 2 else r"D:\Files\Учёба\大学俄语3"
OUT = os.path.join(ROOT, "data", "forms.js")

ACUTE = "\u0301"
VOW = set("аеёиоуыэюяАЕЁИОУЫЭЮЯ")

morph = pymorphy3.MorphAnalyzer()

CASES = {"nomn": "一格", "gent": "二格", "datv": "三格", "accs": "四格", "ablt": "五格", "loct": "六格"}
CASE_ORDER = ["nomn", "gent", "datv", "accs", "ablt", "loct"]


def plain(s):
    s = unicodedata.normalize("NFC", str(s)).replace("\u0300", "").replace(ACUTE, "")
    return s.lower().replace("ё", "е")


# ── 语料重音索引 ────────────────────────────────────────────
stress = {}
for d in os.listdir(SRC) if os.path.isdir(SRC) else []:
    if not re.match(r"^第.+课$", d):
        continue
    f = os.path.join(SRC, d, d + "全课原文_带重音.md")
    if not os.path.exists(f):
        continue
    for tok in re.findall(r"[А-Яа-яЁё\u0300\u0301-]+", open(f, encoding="utf-8").read()):
        if ACUTE not in tok and "\u0300" not in tok:
            continue
        stress.setdefault(plain(tok), {}).setdefault(tok, 0)
        stress[plain(tok)][tok] += 1
print("语料重音词形:", len(stress))


def with_stress(form):
    """给一个无重音词形补重音；找不到返回 None。"""
    bag = stress.get(plain(form))
    if not bag:
        return None
    best, n = None, 0
    for k, c in bag.items():
        if c > n:
            best, n = k, c
    return unicodedata.normalize("NFC", best)


def mark(form):
    """返回显示用词形：能补重音就补。"""
    s = with_stress(form)
    return s if s else form


# ── 生成 ────────────────────────────────────────────────────
def noun_table(parse):
    rows = {}
    for f in parse.lexeme:
        t = f.tag
        if "NOUN" not in t:
            continue
        case = t.case
        num = "plur" if "plur" in t else "sing"
        if case not in CASE_ORDER:
            continue
        key = (case, num)
        if key in rows:            # 同格同数只留第一个
            continue
        rows[key] = f.word
    if not rows:
        return None
    heads = ["", "单数", "复数"]
    body = []
    for c in CASE_ORDER:
        sing = rows.get((c, "sing"), "—")
        plur = rows.get((c, "plur"), "—")
        if sing == "—" and plur == "—":
            continue
        body.append([CASES[c], mark(sing), mark(plur)])
    if len(body) < 2:
        return None
    return {"k": "n", "h": heads, "r": body}


def verb_table(parse):
    inf = parse.inflect({"INFN"})
    rows_present, rows_past = {}, {}
    for f in parse.lexeme:
        t = f.tag
        if "VERB" not in t:
            continue
        person, num, tense = t.person, ("plur" if "plur" in t else "sing"), t.tense
        if tense in ("pres", "futr") and person:
            key = ("futr" if tense == "futr" else "pres", person, num)
            rows_present.setdefault(key, f.word)
        if tense == "past":
            key = ("masc" if "masc" in t else "femn" if "femn" in t else "neut" if "neut" in t else "plur")
            rows_past.setdefault(key, f.word)
    tense = "futr" if any(k[0] == "futr" for k in rows_present) else "pres"
    label = "将来时" if tense == "futr" else "现在时"
    body = []
    for i, person in enumerate(["1per", "2per", "3per"], start=1):
        rows = []
        for num, col in (("sing", "单"), ("plur", "复")):
            w = rows_present.get((tense, person, num), "—")
            rows.append(mark(w))
        if rows != ["—", "—"]:
            body.append(["%d 人称" % i, rows[0], rows[1]])
    if not body:
        return None
    out = {"k": "v", "h": ["", "单数", "复数"], "r": body}
    if rows_past:
        past = [
            ["阳性", mark(rows_past.get("masc", "—"))],
            ["阴性", mark(rows_past.get("femn", "—"))],
            ["中性", mark(rows_past.get("neut", "—"))],
            ["复数", mark(rows_past.get("plur", "—"))],
        ]
        out["p"] = {"h": ["过去时", ""], "r": [p for p in past if p[1] != "—"]}
    if inf:
        out["i"] = mark(inf.word)
    return out


def adj_table(parse):
    rows = {}
    for f in parse.lexeme:
        t = f.tag
        if "ADJF" not in t and "ADJS" not in t:
            continue
        if t.case != "nomn":
            continue
        gender = "masc" if "masc" in t else "femn" if "femn" in t else "neut" if "neut" in t else "plur"
        rows.setdefault(gender, f.word)
    if len(rows) < 2:
        return None
    heads = ["", "阳性", "阴性", "中性", "复数"]
    line = ["一格",
            mark(rows.get("masc", "—")), mark(rows.get("femn", "—")),
            mark(rows.get("neut", "—")), mark(rows.get("plur", "—"))]
    return {"k": "a", "h": heads, "r": [line]}


pack = json.load(open(PACK, encoding="utf-8"))
forms = {}
stat = {"n": 0, "v": 0, "a": 0, "skip": 0}
stressed_cells = 0
total_cells = 0

for it in pack["items"]:
    word = it["ru"].replace("[", "").replace("]", "")
    word = re.sub(r"\s*[（(].*?[)）]", "", word).strip()
    if " " in word:
        stat["skip"] += 1
        continue
    base = word.split("//")[0].strip()
    parses = morph.parse(base)
    if not parses:
        stat["skip"] += 1
        continue
    p = parses[0]
    pos = p.tag.POS
    table = None
    if pos == "NOUN":
        table = noun_table(p)
        key = "n"
    elif pos in ("INFN", "VERB"):
        table = verb_table(p)
        key = "v"
    elif pos in ("ADJF", "ADJS"):
        table = adj_table(p)
        key = "a"
    if not table:
        stat["skip"] += 1
        continue
    forms[it["id"]] = table
    stat[key] += 1
    for row in table["r"]:
        for cell in row[1:]:
            total_cells += 1
            if ACUTE in cell:
                stressed_cells += 1

body = "window.RU_WORDS_FORMS = " + json.dumps(forms, ensure_ascii=False, separators=(",", ":")) + ";\n"
open(OUT, "w", encoding="utf-8").write(body)
print("生成 %d 张表：名词 %d · 动词 %d · 形容词 %d · 跳过 %d" %
      (len(forms), stat["n"], stat["v"], stat["a"], stat["skip"]))
print("格子 %d，其中带重音 %d（%.0f%%）" % (total_cells, stressed_cells, 100.0 * stressed_cells / max(1, total_cells)))
print("写出 %s %.0f KB" % (OUT, os.path.getsize(OUT) / 1024))
