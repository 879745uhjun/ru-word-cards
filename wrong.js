/* 错题本：评级「忘了」记一次 lapse */
(function () {
  var book = window.RU_WORDS_BOOK;
  var R = window.RWC;
  var state = R.load();

  var list = document.getElementById('list');
  var summary = document.getElementById('summary');
  var reviewBtn = document.getElementById('reviewBtn');
  var clearBtn = document.getElementById('clearBtn');

  function missed() {
    var out = [];
    book.items.forEach(function (it) {
      var c = state.cards[it.id];
      if (c && c.l > 0) out.push({ it: it, c: c });
    });
    out.sort(function (a, b) { return (b.c.l - a.c.l) || (a.c.t - b.c.t); });
    return out;
  }

  function when(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function render() {
    var rows = missed();
    summary.textContent = rows.length ? (rows.length + ' 个词出过错') : '还没有错题';
    reviewBtn.style.display = rows.length ? '' : 'none';
    clearBtn.style.display = rows.length ? '' : 'none';

    if (!rows.length) {
      list.innerHTML = '<div class="empty">在背诵时对某个词评「忘了」，它就会出现在这里。</div>';
      return;
    }

    var html = '';
    rows.forEach(function (row) {
      var it = row.it, c = row.c;
      var meta = [it.pos, it.gender ? it.gender + '性' : ''].filter(Boolean).join(' · ');
      html += '<div class="row wrong-row">' +
        '<span class="dot learn"></span>' +
        '<span class="ru">' + R.ruHTML(it.ru) + '</span>' +
        '<span class="zh">' + R.esc(it.zh) + '</span>' +
        '<span class="meta">错 ' + c.l + ' 次 · ' + when(c.t) + (meta ? ' · ' + R.esc(meta) : '') + '</span>' +
        '</div>';
    });
    list.innerHTML = html;
  }

  clearBtn.addEventListener('click', function () {
    var rows = missed();
    if (!rows.length) return;
    if (!confirm('清除全部 ' + rows.length + ' 个词的错题标记？只清错题计数，复习进度不受影响。')) return;
    rows.forEach(function (row) { row.c.l = 0; });
    R.save(state);
    render();
  });

  render();
})();
