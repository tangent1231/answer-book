(function () {
  'use strict';
  var answers = window.ORACLE_ANSWERS || [];
  var app = document.getElementById('app');
  var byId = function (id) { return document.getElementById(id); };
  var key = 'midnight-answer-book-v1';
  var state = 'closed', language = 'zh', answerLanguage = 'zh', current = null;
  var bag = [], previous = -1, revealTimer = null, closeTimer = null;
  var gentle = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var music = true, effects = true;
  var sound = window.OracleSound;
  var haptic = true, ready = false, version = 0, writeChain = Promise.resolve();
  var mini = window.xhs && window.xhs.miniTool;
  var words = {
  "zh": {
    "brand": "答案之书",
    "again": "再问一次",
    "settings": "设置",
    "music": "背景音乐",
    "effects": "翻页音效",
    "gentle": "轻柔动效",
    "haptic": "轻触反馈",
    "instruction": "闭上眼睛，在心里想个问题，\n然后轻触封面。",
    "opening": "正在翻页…",
    "closing": "正在合上…",
    "openLabel": "打开答案之书",
    "closeLabel": "关闭设置"
  },
  "en": {
    "brand": "The Book of Answers",
    "again": "Ask again",
    "settings": "Settings",
    "music": "Background music",
    "effects": "Page sounds",
    "gentle": "Reduced motion",
    "haptic": "Haptics",
    "instruction": "Close your eyes and think of a question.\nThen tap the cover.",
    "opening": "Turning pages…",
    "closing": "Closing…",
    "openLabel": "Open the book",
    "closeLabel": "Close settings"
  }
};
  function setInstruction(text) {
    var node = byId('instruction');
    node.textContent = '';
    text.split('\n').forEach(function (line, i) {
      if (i) node.appendChild(document.createElement('br'));
      node.appendChild(document.createTextNode(line));
    });
  }
  function renderAnswer() {
    if (!current) return;
    var text = current[answerLanguage];
    byId('answerText').textContent = text;
    byId('answerText').lang = answerLanguage === 'zh' ? 'zh-CN' : 'en';
    byId('answerText').className = 'answer-text' + (answerLanguage === 'en' ? ' english' : '') + ((answerLanguage === 'zh' ? text.length > 18 : text.length > 65) ? ' long' : '');
    byId('answerPage').setAttribute('data-answer-id', String(current.id));
    byId('answerPage').setAttribute('aria-label', text);
    window.OracleTypography.fit(byId('answerText'), byId('answerPage'));
  }
  function render() {
    var w = words[language];
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = w.brand;
    byId('zhButton').textContent = 'ZH';
    byId('zhButton').setAttribute('aria-label', language === 'zh' ? '中文' : 'Chinese');
    byId('enButton').textContent = 'EN';
    byId('enButton').setAttribute('aria-label', language === 'zh' ? '英文' : 'English');
    byId('zhButton').lang = byId('enButton').lang = document.documentElement.lang;
    byId('languageSwitch').setAttribute('aria-label', language === 'zh' ? '语言' : 'Language');
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) { el.textContent = w[el.getAttribute('data-i18n')]; });
    byId('zhButton').className = language === 'zh' ? 'selected' : '';
    byId('enButton').className = language === 'en' ? 'selected' : '';
    byId('zhButton').setAttribute('aria-pressed', String(language === 'zh'));
    byId('enButton').setAttribute('aria-pressed', String(language === 'en'));
    byId('coverTitle').innerHTML = language === 'zh' ? '答案<br>之书' : 'The Book<br>of Answers';
    byId('coverButton').setAttribute('aria-label', w.openLabel);
    byId('stage').setAttribute('aria-label', w.brand);
    byId('closeSettings').setAttribute('aria-label', w.closeLabel);
    byId('settingsButton').setAttribute('aria-label', w.settings);
    byId('settingsButton').setAttribute('title', w.settings);
    setInstruction(state === 'opening' ? w.opening : state === 'revealed' ? '' : state === 'closing' ? w.closing : w.instruction);
    byId('instruction').hidden = state === 'revealed';
    app.classList.toggle('gentle', gentle);
    document.body.classList.toggle('reduced', gentle);
    byId('gentleToggle').checked = gentle;
    byId('hapticToggle').checked = haptic;
    byId('musicToggle').checked = music;
    byId('effectsToggle').checked = effects;
    byId('resultControls').hidden = state !== 'revealed';
    byId('coverButton').disabled = !ready || state !== 'closed';
    byId('settingsButton').disabled = state === 'opening' || state === 'closing';
    byId('answerPage').setAttribute('aria-hidden', String(state !== 'revealed'));
    byId('cover').setAttribute('aria-hidden', String(state !== 'closed'));
    renderAnswer();
  }
  function setState(next) { state = next; app.setAttribute('data-state', next); render(); }
  function nativeAvailable(name, min) { return !!(mini && version >= min && typeof mini[name] === 'function'); }
  function bounded(promise, ms) {
    return new Promise(function (resolve) {
      var settled = false;
      var t = setTimeout(function () { if (!settled) { settled = true; resolve(null); } }, ms);
      Promise.resolve(promise).then(function (v) { if (!settled) { settled = true; clearTimeout(t); resolve(v); } }, function () { if (!settled) { settled = true; clearTimeout(t); resolve(null); } });
    });
  }
  function persist() {
    var payload = JSON.stringify({schema:1,language:language,gentle:gentle,haptic:haptic,music:music,effects:effects,bag:bag,previous:previous});
    writeChain = writeChain.then(async function () {
      if (nativeAvailable('setStorage', 9460)) {
        await bounded(mini.setStorage({key:key,data:payload}), 1500);
      } else {
        try { localStorage.setItem(key, payload); } catch (e) { /* Session remains usable without persistence. */ }
      }
    }).catch(function () {});
  }
  function shuffle() {
    bag = answers.map(function (_, i) { return i; });
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = bag[i]; bag[i] = bag[j]; bag[j] = x;
    }
    if (bag.length > 1 && bag[bag.length - 1] === previous) {
      var swap = bag[0]; bag[0] = bag[bag.length - 1]; bag[bag.length - 1] = swap;
    }
  }
  function pick() {
    if (!bag.length) shuffle();
    previous = bag.pop(); current = answers[previous]; answerLanguage = language;
    persist();
  }
  function vibrate() {
    if (haptic && nativeAvailable('vibrateShort', 9500)) {
      try { Promise.resolve(mini.vibrateShort({type:'light'})).catch(function () {}); } catch (e) {}
    }
  }
  function reveal() {
    if (state !== 'opening') return;
    clearTimeout(revealTimer);
    // Set the final transform before removing fill-mode animations.
    setState('revealed'); app.classList.remove('flipping');
    byId('announcement').textContent = current[answerLanguage];
    vibrate();
  }
  function configureSound() {
    if (sound) sound.configure(music, effects);
  }
  function openBook() {
    if (!ready || state !== 'closed' || !answers.length) return;
    if (sound) sound.turn(gentle);
    pick(); byId('announcement').textContent = '';
    setState('opening'); app.classList.add('flipping');
    revealTimer = setTimeout(reveal, gentle ? 250 : 1150);
  }
  function finishClose() {
    clearTimeout(closeTimer); app.classList.remove('flipping'); current = null;
    byId('answerText').textContent = ''; setState('closed');
  }
  function closeBook() {
    if (state !== 'revealed') return;
    setState('closing'); byId('announcement').textContent = '';
    closeTimer = setTimeout(finishClose, gentle ? 200 : 350);
  }
  function changeLanguage(lang) {
    language = lang; answerLanguage = lang; render();
    byId('announcement').textContent = state === 'revealed' && current ? current[language] : '';
    if (ready) persist();
  }
  function closeSettings() { byId('settingsOverlay').hidden = true; byId('settingsButton').focus(); }
  function sizeViewport() {
    document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
    if (current) renderAnswer();
  }
  async function platformLayout() {
    if (!nativeAvailable('getWindowInfo', 9490)) return;
    try {
      var info = await bounded(mini.getWindowInfo(), 1200);
      if (!info) return;
      var safe = info.safeArea || {}, top = safe.top || 0;
      Object.keys(info.menuButtons || {}).forEach(function (k) {
        var r = info.menuButtons[k]; if (r && Number.isFinite(r.bottom)) top = Math.max(top, r.bottom + 8);
      });
      document.documentElement.style.setProperty('--safe-top', top + 'px');
      if (Number.isFinite(info.windowHeight) && Number.isFinite(safe.bottom)) {
        document.documentElement.style.setProperty('--safe-bottom', Math.max(0, info.windowHeight - safe.bottom) + 'px');
      }
    } catch (e) {}
  }
  byId('coverButton').addEventListener('click', openBook);
  byId('againButton').addEventListener('click', closeBook);
  byId('zhButton').addEventListener('click', function () { changeLanguage('zh'); });
  byId('enButton').addEventListener('click', function () { changeLanguage('en'); });
  byId('settingsButton').addEventListener('click', function () { byId('settingsOverlay').hidden = false; byId('closeSettings').focus(); });
  byId('closeSettings').addEventListener('click', closeSettings);
  byId('settingsOverlay').addEventListener('click', function (e) { if (e.target === byId('settingsOverlay')) closeSettings(); });
  byId('gentleToggle').addEventListener('change', function () { gentle = this.checked; render(); persist(); });
  byId('hapticToggle').addEventListener('change', function () { haptic = this.checked; persist(); });
  byId('musicToggle').addEventListener('change', function () { music = this.checked; configureSound(); if (music && sound) sound.activate(); render(); persist(); });
  byId('effectsToggle').addEventListener('change', function () { effects = this.checked; configureSound(); persist(); });
  document.addEventListener('keydown', function (e) {
    if (byId('settingsOverlay').hidden) return;
    if (e.key === 'Escape') closeSettings();
    if (e.key === 'Tab') {
      var first = byId('closeSettings'), last = byId('hapticToggle');
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('visibilitychange', function () {
    document.body.classList.toggle('paused', document.hidden);
    if (sound) sound.visibility(document.hidden);
    if (document.hidden) {
      if (state === 'opening') reveal();
      if (state === 'closing') finishClose();
    }
  });
  window.addEventListener('resize', function () { sizeViewport(); platformLayout(); });
  async function init() {
    sizeViewport(); render();
    try {
      var options = window.xhs && window.xhs.launchOptions;
      if ((!options || !options.miniToolEnv || !options.miniToolEnv.buildVersion) && mini && typeof mini.getLaunchOptions === 'function') options = await bounded(mini.getLaunchOptions(), 1000);
      version = Math.floor(Number(options && options.miniToolEnv && options.miniToolEnv.buildVersion || 0) / 1000);
      var raw;
      if (nativeAvailable('getStorage', 9460)) { var result = await bounded(mini.getStorage({key:key}), 1200); raw = result && result.data; }
      else { try { raw = localStorage.getItem(key); } catch (e) {} }
      var saved = raw ? JSON.parse(raw) : null;
      if (saved && saved.schema === 1) {
        if (saved.language === 'en' || saved.language === 'zh') language = saved.language;
        if (typeof saved.gentle === 'boolean') gentle = saved.gentle;
        if (typeof saved.haptic === 'boolean') haptic = saved.haptic;
        if (typeof saved.music === 'boolean') music = saved.music;
        if (typeof saved.effects === 'boolean') effects = saved.effects;
        var seen = {};
        if (Array.isArray(saved.bag) && saved.bag.length <= answers.length && saved.bag.every(function (i) {
          if (!Number.isInteger(i) || i < 0 || i >= answers.length || seen[i]) return false;
          seen[i] = true; return true;
        })) bag = saved.bag;
        if (Number.isInteger(saved.previous) && saved.previous >= 0 && saved.previous < answers.length) previous = saved.previous;
      }
    } catch (e) { /* Invalid or inaccessible storage starts a fresh session. */ }
    configureSound();
    ready = answers.length > 0; render(); platformLayout();
    if (!ready) setInstruction(language === 'zh' ? '答案暂未加载，请重新打开页面。' : 'The answers could not load. Please reopen this page.');
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (current) renderAnswer(); });
  }
  init();
}());
