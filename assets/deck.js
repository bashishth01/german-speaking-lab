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
    else if (k === 'p' || k === 'P') { paused = !paused; paint(); }
    else if (k === 'n' || k === 'N') notesEl.classList.toggle('on');
    else if (k === 'f' || k === 'F') {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen();
    }
  });
  stage.addEventListener('click', function (e) {
    if (e.target.closest('.timer')) { startTimer(); return; }
    next();
  });
  document.getElementById('bPrev').onclick = function (e) { e.stopPropagation(); prev(); };
  document.getElementById('bNext').onclick = function (e) { e.stopPropagation(); next(); };
  document.getElementById('bFull').onclick = function (e) {
    e.stopPropagation();
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen();
  };
  addEventListener('resize', fit);
  fit();
  var start = parseInt((location.hash || '').slice(1), 10);
  show(isNaN(start) ? 0 : start - 1);
})();
