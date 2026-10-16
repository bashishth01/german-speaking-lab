/* Click-through presentation engine.
   Space / Enter / click / ArrowRight : next reveal step, then next slide
   ArrowLeft                          : previous step / slide
   T = restart timer, P = pause timer, N = mentor notes, F = fullscreen, Home/End = first/last */
(function () {
  var stage = document.getElementById('stage');
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var cur = 0, step = 0, tick = null, left = 0, total = 0, paused = false, timerEl = null;
  var notesEl = document.getElementById('notes');
  var countEl = document.getElementById('count');
  var progEl = document.getElementById('progress');

  function fit() {
    var s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }
  function steps(sl) {
    var m = 0;
    sl.querySelectorAll('[data-step]').forEach(function (e) { m = Math.max(m, +e.dataset.step || 0); });
    return m;
  }
  function applyStep() {
    slides[cur].querySelectorAll('[data-step]').forEach(function (e) {
      e.classList.toggle('shown', (+e.dataset.step || 0) <= step);
    });
  }
  function fmt(s) { var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  function paint() {
    if (!timerEl) return;
    var t = timerEl.querySelector('.t'), u = timerEl.querySelector('.u'), b = timerEl.querySelector('.bar');
    timerEl.classList.toggle('warn', left > 0 && left <= 10);
    timerEl.classList.toggle('done', left <= 0);
    timerEl.classList.toggle('paused', paused && left > 0);
    t.textContent = left > 0 ? fmt(left) : 'Zeit!';
    u.textContent = left > 0 ? (paused ? 'Pause' : '') : 'Lösung';
    b.style.width = (total ? 100 * left / total : 0) + '%';
  }
  function stopTimer() { if (tick) { clearInterval(tick); tick = null; } }
  function startTimer() {
    stopTimer(); paused = false;
    var pb = document.getElementById('bPause'); if (pb) pb.textContent = '⏸ Pause';
    timerEl = slides[cur].querySelector('.timer');
    if (!timerEl) return;
    total = left = +timerEl.dataset.seconds || 60;
    paint();
    tick = setInterval(function () {
      if (paused) return;
      left--;
      if (left <= 0) {
        left = 0; stopTimer();
        step = steps(slides[cur]); applyStep(); // timer over: show the solution
      }
      paint();
    }, 1000);
  }
  function show(i, atEnd) {
    if (typeof stopSound === 'function') stopSound();
    cur = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach(function (s, k) { s.classList.toggle('active', k === cur); });
    step = atEnd ? steps(slides[cur]) : 0;
    applyStep();
    if (atEnd) { stopTimer(); timerEl = slides[cur].querySelector('.timer'); if (timerEl) { left = 0; total = +timerEl.dataset.seconds || 60; paint(); } }
    else startTimer();
    countEl.textContent = (cur + 1) + ' / ' + slides.length;
    progEl.style.width = (100 * (cur + 1) / slides.length) + '%';
    var a = slides[cur].querySelector('.notes');
    notesEl.textContent = a ? a.textContent : '';
    try { history.replaceState(null, '', '#' + (cur + 1)); } catch (e) {}
  }
  function next() {
    if (step < steps(slides[cur])) { step++; applyStep(); }
    else if (cur < slides.length - 1) show(cur + 1);
  }
  function prev() {
    if (step > 0) { step--; applyStep(); }
    else if (cur > 0) show(cur - 1, true);
  }
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowRight' || k === ' ' || k === 'Enter' || k === 'PageDown') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(slides.length - 1);
    else if (k === 't' || k === 'T') startTimer();
    else if (k === 'p' || k === 'P') togglePause();
    else if (k === 'n' || k === 'N') notesEl.classList.toggle('on');
    else if (k === 'f' || k === 'F') toggleFull();
    else if (k === 'h' || k === 'H') goList();
    else if (k === 'l' || k === 'L') { var lb = slides[cur].querySelector('.listen'); if (lb) play(lb); }
  });
  function togglePause() {
    if (!timerEl) return;
    if (left <= 0) { startTimer(); return; }   // finished: tapping starts it again
    paused = !paused; paint();
    var pb = document.getElementById('bPause');
    if (pb) pb.textContent = paused ? '▶ Weiter' : '⏸ Pause';
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div'); t.id = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toast._h); toast._h = setTimeout(function () { t.classList.remove('on'); }, 3500);
  }
  function toggleFull() {
    var d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        (d.exitFullscreen || d.webkitExitFullscreen).call(d);
        return;
      }
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!req) { toast('Vollbild nicht möglich hier. Bitte F11 drücken.'); return; }
      var p = req.call(el);
      if (p && p.catch) p.catch(function () { toast('Vollbild blockiert. Bitte F11 drücken.'); });
    } catch (err) { toast('Vollbild blockiert. Bitte F11 drücken.'); }
  }
  document.addEventListener('fullscreenchange', fit);
  document.addEventListener('webkitfullscreenchange', fit);
  /* listening: play a recorded file (data-audio) or read the German text aloud (data-say) */
  var voices = [], audioEl = null;
  function loadVoices() { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; }
  if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function stopSound() {
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (audioEl) { audioEl.pause(); audioEl = null; }
  }
  function play(btn) {
    stopSound();
    if (btn.dataset.audio) {
      audioEl = new Audio(btn.dataset.audio);
      audioEl.play().catch(function () { toast('Audio konnte nicht gestartet werden.'); });
      return;
    }
    if (!window.speechSynthesis) { toast('Vorlesen geht in diesem Browser nicht. Bitte Edge oder Chrome benutzen.'); return; }
    var u = new SpeechSynthesisUtterance(btn.dataset.say);
    u.lang = 'de-DE'; u.rate = parseFloat(btn.dataset.rate) || 0.9;
    var v = voices.filter(function (x) { return /^de/i.test(x.lang); })[0];
    if (v) u.voice = v; else toast('Keine deutsche Stimme gefunden. Bitte Edge oder Chrome benutzen.');
    speechSynthesis.speak(u);
  }
  stage.addEventListener('click', function (e) {
    var lb = e.target.closest('.listen');
    if (lb) { play(lb); return; }                                // listening buttons never advance the slide
    if (e.target.closest('.timer')) { togglePause(); return; }   // click timer = pause / resume
    next();
  });
  stage.addEventListener('dblclick', function (e) {
    if (e.target.closest('.timer')) { e.preventDefault(); startTimer(); }  // double-click timer = restart
  });
  // build the control buttons (so every day page gets them without HTML changes)
  var nav = document.getElementById('nav');
  function mk(id, label, title, fn) {
    var b = document.getElementById(id) || document.createElement('button');
    b.id = id; b.textContent = label; b.title = title; b.tabIndex = -1;
    b.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep keyboard focus off buttons
    b.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
    if (!b.parentNode) nav.insertBefore(b, document.getElementById('count'));
    return b;
  }
  function goList() { location.href = '../'; }
  var bh = mk('bHome', '☰ Liste', 'Zurück zur Tagesliste (H)', goList);
  nav.insertBefore(bh, nav.firstChild);
  mk('bPrev', '◀', 'Zurück', prev);
  var cnt = document.getElementById('count');
  mk('bPause', '⏸ Pause', 'Timer pausieren / fortsetzen (P)', togglePause);
  mk('bRestart', '↺ Neu', 'Timer neu starten (T)', startTimer);
  var bn = document.getElementById('bNext'); bn.tabIndex = -1;
  bn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  bn.addEventListener('click', function (e) { e.stopPropagation(); next(); });
  var bf = document.getElementById('bFull'); bf.tabIndex = -1; bf.title = 'Vollbild (F)';
  bf.addEventListener('mousedown', function (e) { e.preventDefault(); });
  bf.addEventListener('click', function (e) { e.stopPropagation(); toggleFull(); });
  addEventListener('resize', fit);
  fit();
  var start = parseInt((location.hash || '').slice(1), 10);
  show(isNaN(start) ? 0 : start - 1);
})();
