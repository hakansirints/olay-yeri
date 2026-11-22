// Event dots ("Olay noktaları") beside the homepage card list (22 Nov 2026).
// One dot per event, shaped by the student's progress (completed ✓, in progress half, not started hollow).
// Shown only when the card list really scrolls (phones); same look and timing as the experiment page's section
// dots (src/app/SectionDots.jsx). Idle: faint. Scrolling: the current event is named. Touch, hover or keyboard
// focus: every event is named; a tap scrolls to that event's card.
(function(window, document) {
  'use strict';
  var IDLE_AFTER = 1600, MIN_OVERFLOW = 120, MIN_RATIO = 0.25, AIR = 8;
  var nav = null, state = 'idle', holding = false, timer = 0, frame = 0, signature = '', stops = [], scroller = null, resize = null;
  var keyboard = false, pinned = -1; // pinned: the event chosen with a tap, named while the list rests there
  var statusText = { completed: 'Tamamlandı', 'in-progress': 'Devam ediyor', 'not-started': 'Henüz başlanmadı' };

  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function shouldShow(overflow, viewport) { return overflow >= Math.max(MIN_OVERFLOW, viewport * MIN_RATIO); }
  function find() { return document.querySelector('.main-case-grid'); }

  function setState(next) {
    if (state === 'open' && next === 'scroll') next = 'open';
    state = next;
    if (nav) nav.setAttribute('data-state', state);
    clearTimeout(timer);
    if (next !== 'idle') timer = setTimeout(function() { if (!holding) { state = 'idle'; if (nav) nav.setAttribute('data-state', 'idle'); } }, IDLE_AFTER);
  }

  function hide() {
    if (nav) nav.hidden = true;
    if (scroller) scroller.classList.remove('home-dots-active');
  }

  function build(items) {
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'home-event-dots';
      nav.setAttribute('aria-label', 'Olaylar');
      nav.setAttribute('data-state', state);
      nav.addEventListener('pointerenter', function(e) { if (e.pointerType === 'mouse') { holding = true; setState('open'); } });
      nav.addEventListener('pointerleave', function(e) { if (e.pointerType === 'mouse') { holding = false; setState('open'); } });
      nav.addEventListener('pointerdown', function() { setState('open'); });
      // Keyboard focus keeps the names open; a tap's focus does not, so the dots still fade after touch.
      nav.addEventListener('focusin', function() { if (keyboard) { holding = true; setState('open'); } });
      nav.addEventListener('focusout', function() { holding = false; setState('open'); });
      document.body.appendChild(nav);
    }
    nav.innerHTML = '';
    items.forEach(function(item, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'home-event-dot';
      b.setAttribute('data-status', item.status);
      if (item.disabled) b.setAttribute('data-disabled', '');
      b.setAttribute('aria-label', item.label + ' · ' + (item.disabled ? 'Yakında' : statusText[item.status] || ''));
      if (scroller && scroller.id) b.setAttribute('aria-controls', scroller.id);
      var name = document.createElement('span'); name.className = 'home-event-dot-name'; name.textContent = item.label;
      var mark = document.createElement('span'); mark.className = 'home-event-dot-mark'; mark.setAttribute('aria-hidden', 'true');
      b.appendChild(name); b.appendChild(mark);
      b.addEventListener('click', function() { choose(i); });
      nav.appendChild(b);
    });
  }

  function choose(i) {
    setState('open');
    var stop = stops[i];
    pinned = stop ? i : -1;
    if (stop && scroller) scroller.scrollTo({ top: stop.y, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  // The current event is the first card whose row has reached the top of the list (the last one at the end).
  function current(sc, max) {
    if (!stops.length) return -1;
    if (pinned >= 0 && stops[pinned] && Math.abs(sc.scrollTop - stops[pinned].y) < 4) return pinned;
    if (sc.scrollTop >= max - 2) return stops.length - 1;
    var line = sc.scrollTop + AIR + 24, rowY = stops[0].y;
    stops.forEach(function(s) { if (s.y <= line) rowY = s.y; });
    // Cards side by side share a row: name the first event in that row.
    for (var i = 0; i < stops.length; i++) if (Math.abs(stops[i].y - rowY) < 4) return i;
    return 0;
  }

  function watch(sc) {
    if (sc === scroller) return;
    if (resize) resize.disconnect();
    scroller = sc;
    if (sc && window.ResizeObserver) {
      resize = new window.ResizeObserver(schedule);
      resize.observe(sc);
      Array.prototype.forEach.call(sc.children, function(child) { resize.observe(child); });
    }
  }

  function measure() {
    frame = 0;
    var sc = find();
    watch(sc);
    if (!sc || !sc.getClientRects().length || !/^(auto|scroll)$/.test(getComputedStyle(sc).overflowY)) { hide(); return; }
    var max = sc.scrollHeight - sc.clientHeight;
    if (!shouldShow(max, sc.clientHeight)) { hide(); return; }
    var cards = Array.prototype.slice.call(sc.querySelectorAll('.case-card-compact'));
    if (cards.length < 2) { hide(); return; }
    sc.classList.add('home-dots-active');
    var rect = sc.getBoundingClientRect();
    var items = cards.map(function(card) {
      var title = (card.querySelector('.compact-title') || {}).textContent || '';
      return {
        label: card.getAttribute('data-case-id') + ' · ' + title.trim(),
        status: card.getAttribute('data-status') || 'not-started',
        disabled: card.getAttribute('aria-disabled') === 'true',
        y: Math.max(0, Math.min(max, card.getBoundingClientRect().top - rect.top + sc.scrollTop - AIR))
      };
    });
    stops = items;
    var sig = items.map(function(it) { return it.label + it.status + it.disabled; }).join('|');
    if (sig !== signature || !nav) { signature = sig; build(items); }
    var row = Math.max(18, Math.min(28, Math.floor((rect.height - 12) / items.length)));
    nav.style.setProperty('--home-dot-row', row + 'px');
    nav.style.top = (rect.top + rect.height / 2) + 'px';
    nav.style.right = Math.max(0, window.innerWidth - rect.right) + 'px';
    var cur = current(sc, max);
    Array.prototype.forEach.call(nav.children, function(b, i) {
      if (i === cur) b.setAttribute('aria-current', 'location'); else b.removeAttribute('aria-current');
    });
    nav.hidden = false;
  }

  function schedule() { if (!frame) frame = window.requestAnimationFrame(measure); }

  function init() {
    document.addEventListener('keydown', function() { keyboard = true; }, true);
    document.addEventListener('pointerdown', function() { keyboard = false; }, true);
    document.addEventListener('scroll', function(e) {
      if (e.target && e.target.classList && e.target.classList.contains('main-case-grid')) { schedule(); setState('scroll'); }
    }, true);
    window.addEventListener('resize', schedule);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', schedule);
    var app = document.getElementById('app');
    // The homepage re-renders its cards (progress, theme): follow the new list and statuses.
    if (app && window.MutationObserver) new window.MutationObserver(schedule).observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-status'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    window.addEventListener('load', schedule);
    schedule();
  }

  window.KoyHomeEventDots = { refresh: schedule, shouldShow: shouldShow };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window, document);
