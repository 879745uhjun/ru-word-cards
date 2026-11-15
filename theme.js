/* 主题：跟随系统 / 浅色 / 深色，存在 localStorage */
(function () {
  var KEY = 'rwc-theme';
  var MODES = ['auto', 'light', 'dark'];
  var LABEL = { auto: '跟随系统', light: '浅色', dark: '深色' };
  var cur = 'light';

  try { cur = localStorage.getItem(KEY) || 'light'; } catch (e) {}
  if (MODES.indexOf(cur) < 0) cur = 'light';

  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function apply(mode) {
    cur = mode;
    var dark = mode === 'dark' || (mode === 'auto' && mq && mq.matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].textContent = LABEL[mode];
      btns[i].setAttribute('title', '主题：' + LABEL[mode] + '（点击切换）');
    }
    try { localStorage.setItem(KEY, mode); } catch (e) {}
  }

  window.RWCTheme = { apply: apply, mode: function () { return cur; } };

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-theme-toggle]') : null;
    if (!b) return;
    apply(MODES[(MODES.indexOf(cur) + 1) % MODES.length]);
  });

  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () { if (cur === 'auto') apply('auto'); });
  }

  apply(cur);
})();
