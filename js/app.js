// ========================================================
// KİMYASAL OLAY YERİ UZMANI - STANDALONE UYGULAMA MOTORU
// ========================================================

(function () {
  'use strict';

  var SOUND_KEY = 'kimyasal_olay_yeri_sound_v1';
  var THEME_KEY = 'kimyasal_olay_yeri_theme_v1';
  var GUIDE_AUTO_OPEN_KEY = 'olay_yeri_guide_dont_show_auto_v2';

  var storage;
  try { storage = window.localStorage; } catch (err) {
    storage = { getItem: function () { throw err; }, setItem: function () { throw err; }, removeItem: function () { throw err; } };
  }
  var recordStore = window.CaseRecordStore.create(storage, window.CASES_DATA || []);

  function loadDraftField(field) {
    var values = {};
    Object.keys(recordStore.drafts).forEach(function (id) { values[id] = recordStore.drafts[id][field]; });
    return values;
  }

  var state = {
    cases: window.CASES_DATA || [],
    records: recordStore.records,
    draftObservations: loadDraftField('observation'),
    draftReasonings: loadDraftField('reasoning'),
    activeCase: null,
    selectedClueIds: [],
    selectedType: null,
    viewMode: 'macro', // 'macro' (video) or 'micro' (canlı moleküler simülasyon)
    soundEnabled: loadSoundSetting(),
    theme: loadThemeSetting(),
    showNotebook: false,
    showReport: false,
    showMolecular: false,
    showVideoModal: false,
    showFeedbackModal: false,
    showResetModal: false,
    resetError: '',
    completionPending: false,
    completionCelebrated: false,
    completionStage: null, // 'fireworks' veya 'message'
    showGuideModal: (function () {
      try {
        return localStorage.getItem(GUIDE_AUTO_OPEN_KEY) !== 'true';
      } catch (e) {
        return true;
      }
    })(),
    studentName: 'Öğrenci Dedektif',
    studentClass: 'Lise Kimya'
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function loadThemeSetting() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      return t === 'light' ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  function saveThemeSetting(t) {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch (e) {}
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
  }

  function triggerFullscreenAndRotate() {
    var doc = document.documentElement;
    var reqFs = doc.requestFullscreen ||
                doc.webkitRequestFullscreen ||
                doc.webkitRequestFullScreen ||
                doc.mozRequestFullScreen ||
                doc.msRequestFullscreen;

    function manualRotation() {
      var hint = document.querySelector('.orientation-subhint');
      if (hint) hint.textContent = 'Cihazını elle yatay çevir. Gerekirse telefonunun otomatik döndürme ayarını aç.';
    }
    function lockLandscape() {
      var display = window.screen;
      if (display && display.orientation && display.orientation.lock) {
        return display.orientation.lock('landscape').catch(manualRotation);
      }
      manualRotation();
    }
    try {
      if (reqFs && !document.fullscreenElement && !document.webkitFullscreenElement) {
        // Yön kilidi tam ekran isteği tamamlandıktan sonra denenir.
        Promise.resolve(reqFs.call(doc)).then(lockLandscape).catch(manualRotation);
      } else {
        Promise.resolve().then(lockLandscape).catch(manualRotation);
      }
    } catch (err) { manualRotation(); }
  }

  function saveRecord(rec) {
    return recordStore.saveAttempt(rec).persisted;
  }

  function clearAllData() {
    if (!recordStore.clear()) {
      state.resetError = recordStore.persistence().error || 'İlerleme sıfırlanamadı. Yeniden deneyebilirsin.';
      render(); return;
    }
    stopCelebration();
    state.showResetModal = false;
    state.resetError = '';
    state.completionStage = null;
    state.completionPending = state.completionCelebrated = false;
    state.showFeedbackModal = state.showNotebook = state.showReport = state.showVideoModal = state.showGuideModal = false;
    state.draftObservations = {};
    state.draftReasonings = {};
    state.activeCase = null;
    state.selectedType = null;
    render();
  }

  function allCasesSolved() {
    return state.cases.length > 0 && state.cases.every(function (c) { return state.records[c.id] && state.records[c.id].isSolved; });
  }

  function goHome() {
    saveCurrentDraft();
    state.activeCase = null;
    state.showFeedbackModal = state.showNotebook = state.showReport = state.showVideoModal = false;
    render();
  }

  // Değerlendirme kartının tüm çıkışları aynı tamamlanma akışını kullanır.
  function dismissFeedback(destination) {
    state.showFeedbackModal = false;
    if (state.completionPending && allCasesSolved()) {
      state.completionPending = false;
      state.completionCelebrated = true;
      state.showNotebook = state.showReport = state.showVideoModal = false;
      state.completionStage = 'fireworks';
      render();
      return;
    }
    if (destination === 'home') { goHome(); return; }
    if (destination === 'notebook') state.showNotebook = true;
    if (destination === 'report') state.showReport = true;
    if (destination === 'next') {
      var nextId = (state.activeCase.id % state.cases.length) + 1;
      var next = state.cases.find(function (c) { return c.id === nextId; });
      if (next) { openCase(next); return; }
    }
    render();
    if (destination === 'edit' && state.activeCase) {
      var ev = state.records[state.activeCase.id] && state.records[state.activeCase.id].evaluation;
      var field = ev && ev.reviewReasons && ev.reviewReasons[0];
      var input = document.getElementById(field && field.field === 'reasoning' ? 'reaInput' : 'obsInput');
      if (input) input.focus();
    }
  }

  var celebrationFrame = null, celebrationTimer = null;
  function stopCelebration() {
    if (celebrationFrame !== null) cancelAnimationFrame(celebrationFrame);
    if (celebrationTimer !== null) clearTimeout(celebrationTimer);
    celebrationFrame = celebrationTimer = null;
  }

  function startFireworks() {
    stopCelebration();
    function finish() {
      stopCelebration();
      if (state.completionStage !== 'fireworks') return;
      state.completionStage = 'message'; render();
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    var canvas = document.getElementById('fireworksCanvas');
    var ctx = canvas && canvas.getContext('2d');
    if (!ctx) { finish(); return; }
    var width = window.innerWidth, height = window.innerHeight;
    var scale = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    var colors = ['#38bdf8', '#fbbf24', '#34d399', '#f472b6'];
    var bursts = [{ x: .25, y: .34, start: 300 }, { x: .72, y: .3, start: 800 }, { x: .5, y: .43, start: 1300 }];
    var started = null;
    function frame(now) {
      if (state.completionStage !== 'fireworks') return;
      if (started === null) started = now;
      var elapsed = now - started;
      ctx.clearRect(0, 0, width, height);
      bursts.forEach(function (burst, index) {
        var age = elapsed - burst.start;
        if (age < -300 || age > 950) return;
        var x = width * burst.x, y = height * burst.y;
        ctx.fillStyle = colors[index];
        if (age < 0) {
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(x, height - (height - y) * (age + 300) / 300, 2.5, 0, Math.PI * 2); ctx.fill();
          return;
        }
        var progress = age / 950;
        ctx.globalAlpha = 1 - progress;
        for (var i = 0; i < 48; i++) {
          var angle = i * Math.PI * 2 / 48;
          var radius = Math.min(width, height) * (.2 + (i % 3) * .04) * progress;
          ctx.beginPath(); ctx.arc(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius + progress * progress * 35, 2, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      if (elapsed >= 2400) { finish(); return; }
      celebrationFrame = requestAnimationFrame(frame);
    }
    celebrationFrame = requestAnimationFrame(frame);
    celebrationTimer = setTimeout(finish, 2600); // Arka plan sekmesinde de akış tamamlanır.
  }

  function renderResetModal() {
    return '<div class="modal-backdrop action-modal-backdrop" id="resetBackdrop">' +
      '<section class="modal-window action-dialog" role="dialog" aria-modal="true" aria-labelledby="resetTitle" aria-describedby="resetDescription" tabindex="-1">' +
      '<div class="action-dialog-symbol reset-symbol" aria-hidden="true">↺</div><h2 id="resetTitle">İlerlemeyi sıfırla</h2>' +
      '<p id="resetDescription">Tüm vaka sonuçların, deneme geçmişin ve taslak notların silinecek. Yeniden başlamak istiyor musun?</p>' +
      (state.resetError ? '<p class="save-status-error" role="alert">' + escapeHtml(state.resetError) + '</p>' : '') +
      '<div class="action-dialog-buttons"><button class="eval-oval-btn btn-secondary-oval" id="btnCancelReset">Vazgeç</button>' +
      '<button class="eval-oval-btn btn-danger-oval" id="btnConfirmReset">Evet, sıfırla</button></div></section></div>';
  }

  function renderCompletion() {
    if (state.completionStage === 'fireworks') {
      return '<div class="completion-fireworks" role="status" aria-live="polite"><canvas id="fireworksCanvas" aria-hidden="true"></canvas><p>Tüm olaylar tamamlandı!</p></div>';
    }
    return '<div class="modal-backdrop action-modal-backdrop" id="completionBackdrop">' +
      '<section class="modal-window action-dialog completion-dialog" role="dialog" aria-modal="true" aria-labelledby="completionTitle" aria-describedby="completionDescription" tabindex="-1">' +
      '<button class="btn-icon action-dialog-close" id="btnCloseCompletion" aria-label="Tebrik kartını kapat ve ana ekrana dön">✕</button>' +
      '<div class="action-dialog-symbol completion-symbol" aria-hidden="true">🏆</div><h2 id="completionTitle">Tebrikler, tüm olayları çözdün!</h2>' +
      '<p id="completionDescription">' + state.cases.length + ' olayın tamamını başarıyla inceledin. Gözlemlerin, kararların ve bilimsel gerekçelerin deney defterinde seni bekliyor.</p>' +
      '<button class="eval-oval-btn btn-primary-oval" id="btnCompletionHome">Ana Ekrana Dön</button></section></div>';
  }

  function draftStatusText() {
    var status = recordStore.persistence();
    if (!status.records) return 'Sonuç kaydedilemedi — sayfayı kapatma';
    if (!status.drafts) return 'Taslak kaydedilemedi — sayfayı kapatma';
    var draft = state.activeCase && recordStore.drafts[state.activeCase.id];
    if (draft) return 'Taslak kaydedildi ✓';
    return state.activeCase && state.records[state.activeCase.id] ? 'Son deneme kayıtlı ✓' : 'Yazdıkların otomatik kaydedilir';
  }

  function clearCurrentEvaluation() {
    document.querySelectorAll('.field-eval-badge, .btn-eval-pill').forEach(function (el) { el.remove(); });
    document.querySelectorAll('.form-textarea').forEach(function (el) {
      el.classList.remove('input-eval-success', 'input-eval-warning', 'input-eval-danger');
    });
    document.querySelectorAll('.type-card-mock').forEach(function (el) {
      el.classList.remove('btn-eval-correct', 'btn-eval-wrong');
    });
    document.querySelectorAll('.answer-card').forEach(function (el) {
      el.classList.remove('card-eval-success', 'card-eval-warning', 'card-eval-danger');
    });
  }

  // Aynı durum adı ve simgesi giriş kartlarında ve dönütlerde kullanılır.
  function fieldPresentation(status) {
    if (!status) return { card: '', border: '', badge: '' };
    var tone = status === 'correct' ? 'success' : ((status === 'incomplete' || status === 'review') ? 'warning' : 'danger');
    var label = status === 'correct' ? 'Doğru' : (status === 'incomplete' ? 'Eksik' :
      (status === 'review' ? 'İnceleme gerekli' : (status === 'irrelevant' ? 'Konu dışı' : (status === 'empty' ? 'Boş' : (status === 'contradiction' ? 'Çelişkili' : 'Hatalı')))));
    var icon = tone === 'success' ? '✓' : (tone === 'warning' ? '!' : '✕');
    return {
      card: ' card-eval-' + tone,
      border: ' input-eval-' + tone,
      badge: '<span class="field-eval-badge badge-eval-' + tone + '"><span class="field-status-icon" aria-hidden="true">' + icon + '</span>' + label + '</span>'
    };
  }

  function saveCurrentDraft() {
    if (!state.activeCase) return;
    var obs = document.getElementById('obsInput');
    var rea = document.getElementById('reaInput');
    if (!obs || !rea) return;
    var id = state.activeCase.id;
    state.draftObservations[id] = obs.value;
    state.draftReasonings[id] = rea.value;
    recordStore.saveDraft(id, { observation: obs.value, reasoning: rea.value, decisionType: state.selectedType });
    var label = document.getElementById('draftSaveStatus');
    if (label) {
      var saveFailed = !recordStore.persistence().drafts || !recordStore.persistence().records;
      label.hidden = !saveFailed;
      label.textContent = saveFailed ? draftStatusText() : '';
    }
    clearCurrentEvaluation();
  }

  function decisionLabel(value) {
    return value === 'chemical' ? '🧪 Kimyasal Değişim' : (value === 'physical' ? '🧊 Fiziksel Değişim' : 'Belirtilmedi');
  }

  function statusLabel(value) {
    return value === 'correct' ? '✓ Doğru' : (value === 'incorrect' ? '✕ Hatalı' : (value === 'incomplete' ? '⚠️ Eksik' : (value === 'review' ? '⚠ İnceleme gerekli' : 'Belirtilmedi')));
  }

  function scoreLabel(value) {
    return typeof value === 'number' ? '%' + value : 'Değerlendirme bekliyor';
  }

  function reviewSummary(ev, c, rec) {
    var presentation = c && rec ? window.AnswerFeedback.messages(c, ev, rec.observation, rec.decisionType, rec.reasoning) : ev;
    return (presentation && Array.isArray(presentation.reviewReasons) ? presentation.reviewReasons : []).map(function (item) { return (item.field === 'observation' ? 'Gözlemim: ' : 'Gerekçem: ') + item.question; }).join(' ');
  }

  function loadSoundSetting() {
    try {
      var s = localStorage.getItem(SOUND_KEY);
      return s === null ? true : s === 'true';
    } catch (e) {
      return true;
    }
  }

  function saveSoundSetting(val) {
    try {
      localStorage.setItem(SOUND_KEY, val ? 'true' : 'false');
    } catch (e) {}
  }

  function getRank(solvedCount) {
    if (solvedCount >= 12) return { title: 'Kimyasal Olay Yeri Başmüfettişi', level: 5 };
    if (solvedCount >= 9) return { title: 'Kıdemli Olay Yeri Uzmanı', level: 4 };
    if (solvedCount >= 6) return { title: 'Adli Kimya Dedektifi', level: 3 };
    if (solvedCount >= 3) return { title: 'Olay Yeri Araştırmacısı', level: 2 };
    return { title: 'Stajyer Gözlemci', level: 1 };
  }

  function getNextRankInfo(solvedCount) {
    if (solvedCount < 3) return (3 - solvedCount) + ' vaka çözünce → Olay Yeri Araştırmacısı!';
    if (solvedCount < 6) return (6 - solvedCount) + ' vaka çözünce → Adli Kimya Dedektifi!';
    if (solvedCount < 9) return (9 - solvedCount) + ' vaka çözünce → Kıdemli Olay Yeri Uzmanı!';
    if (solvedCount < 12) return (12 - solvedCount) + ' vaka çözünce → Kimyasal Olay Yeri Başmüfettişi!';
    return 'Tebrikler! En yüksek rütbeye ulaştın! 🌟';
  }

  // Öneri C: 6 Tematik Başarı Rozeti
  function getAchievements(solvedCount) {
    var chemCount = 0;
    var phyCount = 0;
    state.cases.forEach(function (c) {
      var r = state.records[c.id];
      if (r && r.isSolved) {
        if (c.correctType === 'chemical') chemCount++;
        if (c.correctType === 'physical') phyCount++;
      }
    });

    return [
      {
        id: 'first_solve',
        icon: '🔥',
        name: 'İlk Keşif',
        desc: 'İlk olay yeri vakasını çöz',
        earned: solvedCount >= 1,
        colorClass: 'ach-badge-1'
      },
      {
        id: 'chem_expert',
        icon: '🧪',
        name: 'Kimya Uzmanı',
        desc: 'En az 3 kimyasal değişim çöz',
        earned: chemCount >= 3,
        colorClass: 'ach-badge-2'
      },
      {
        id: 'ice_detective',
        icon: '❄️',
        name: 'Buz Dedektifi',
        desc: 'En az 3 fiziksel değişim çöz',
        earned: phyCount >= 3,
        colorClass: 'ach-badge-3'
      },
      {
        id: 'electrolysis_pro',
        icon: '⚡',
        name: 'Elektroliz Pro',
        desc: 'Suyun Elektrolizi vakasını ilk denemede, ipucu almadan doğru çöz',
        earned: Boolean(state.records[9] && state.records[9].firstAttemptCorrect),
        colorClass: 'ach-badge-4'
      },
      {
        id: 'master_inspector',
        icon: '🏅',
        name: 'Başmüfettiş',
        desc: '12 vakanın tamamını çöz',
        earned: solvedCount >= 12,
        colorClass: 'ach-badge-5'
      },
      {
        id: 'notebook_full',
        icon: '📓',
        name: 'Dolu Defter',
        desc: 'En az 6 vakayı defterine kaydet',
        earned: solvedCount >= 6,
        colorClass: 'ach-badge-6'
      }
    ];
  }

  var evaluateAnswer = window.evaluateAnswer;

  // ========================================================
  // RENDER FONKSİYONLARI
  // ========================================================

  function render() {
    var app = document.getElementById('app');
    if (!app) return;

    var solvedCount = Object.keys(state.records).filter(function (id) {
      return state.records[id].isSolved;
    }).length;

    var rank = getRank(solvedCount);

    var html = '';

    // Crime Tape
    html += '<div class="crime-tape"></div>';

    // Header
    var blocking = state.showResetModal || state.completionStage || state.showFeedbackModal || state.showNotebook || state.showReport || state.showVideoModal || state.showGuideModal;
    html += '<header class="app-header"' + (blocking ? ' inert' : '') + '>';
    html += '  <div class="header-inner">';
    html += '    <div class="brand-container" id="btnGoHome" role="button" tabindex="0" aria-label="Ana ekrana dön">';
    html += '      <div class="brand-logo-icon">';
    html += '        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2a10 10 0 0 0-8 16.5"/><path d="M12 6a6 6 0 0 0-4.8 9.6"/><path d="M12 10a2 2 0 0 0-1.6 3.2"/><path d="M12 14v4"/><path d="M16 12v6"/><path d="M8 12v6"/></svg>';
    html += '      </div>';
    html += '      <div>';
    html += '        <div class="brand-title">Kimyasal Olay Yeri Uzmanı</div>';
    html += '        <div class="brand-motto">Gözlemle<span>•</span>Kanıtları Topla<span>•</span>Karar Ver</div>';
    html += '      </div>';
    html += '    </div>';
    html += '';
    html += '    <div class="rank-badge-box">';
    html += '      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--md-sys-color-tertiary)" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>';
    html += '      <span style="color:var(--md-sys-color-on-surface-variant)">Rütbe:</span>';
    html += '      <span class="rank-title">' + rank.title + '</span>';
    html += '      <span class="rank-counter">' + solvedCount + '/' + state.cases.length + ' Vaka</span>';
    html += '    </div>';

    html += '    <div class="header-actions">';
    html += '      <button class="btn-icon" id="btnToggleTheme" title="' + (state.theme === 'dark' ? 'Aydınlık Temaya Geç' : 'Karanlık Temaya Geç') + '">';
    html += state.theme === 'dark'
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
    html += '      </button>';
    html += '';
    html += '      <button class="btn-icon" id="btnToggleSound" title="Sesi Aç/Kapat">';
    html += state.soundEnabled
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--md-sys-color-primary)" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--md-sys-color-outline)" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    html += '      </button>';
    html += '      <button class="btn-guide-header" id="btnOpenGuide" title="Laboratuvar Görev Rehberi">';
    html += '        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
    html += '        <span>Rehber</span>';
    html += '      </button>';
    html += '';
    html += '      <button class="btn-notebook" id="btnOpenNotebook" aria-label="Dijital Deney Defteri" title="Dijital Deney Defteri">';
    html += '        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
    html += '        <span>Dijital Deney Defteri</span>';
    if (solvedCount > 0) {
      html += '        <span class="badge-count">' + solvedCount + '</span>';
    }
    html += '      </button>';
    html += '';
    html += '      <button class="btn-report" id="btnOpenReport" aria-label="Vaka Raporu" title="Vaka Raporu">';
    html += '        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    html += '        <span>Vaka Raporu</span>';
    html += '      </button>';
    html += '';
    html += '      <button class="btn-icon" id="btnResetData" title="Tüm İlerlemeyi Sıfırla">';
    html += '        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
    html += '      </button>';
    html += '    </div>';
    html += '  </div>';
    html += '</header>';

    // Main Content
    html += '<main class="main-content' + (state.activeCase ? ' main-case-detail' : ' main-case-grid') + '"' + (blocking ? ' inert' : '') + '>';
    var persistence = recordStore.persistence();
    if (persistence.error || !persistence.records || !persistence.drafts) {
      html += '<p class="save-status-error storage-notice" role="alert">' + escapeHtml(persistence.error || draftStatusText()) + '</p>';
    }
    if (state.activeCase) {
      html += renderCaseDetail(state.activeCase, solvedCount);
    } else {
      html += renderCaseGrid(solvedCount);
    }
    html += '</main>';

    // Modals
    if (state.showGuideModal) {
      html += renderGuideModal();
    }
    if (state.showNotebook) {
      html += renderNotebookModal(solvedCount);
    }
    if (state.showReport) {
      html += renderReportModal(solvedCount, rank);
    }
    if (state.showVideoModal && state.activeCase) {
      html += renderVideoModal(state.activeCase);
    }
    if (state.showFeedbackModal && !state.showResetModal && state.activeCase && state.records[state.activeCase.id]) {
      html += renderFeedbackModal(state.activeCase, state.records[state.activeCase.id]);
    }

    if (state.showResetModal) html += renderResetModal();
    if (state.completionStage) html += renderCompletion();

    // Mobil Dikey Ekran Uyarısı (Yatay Ekran Zorunlu)
    html += '<div class="orientation-overlay" id="orientationOverlay">';
    html += '  <div class="orientation-card">';
    html += '    <div class="phone-rotate-icon">';
    html += '      <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="var(--md-sys-color-primary)" stroke-width="1.8"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>';
    html += '    </div>';
    html += '    <div class="orientation-badge">Yatay Ekran Gerekli</div>';
    html += '    <h3 class="orientation-title">Cihazınızı Yatay Çevirin</h3>';
    html += '    <p class="orientation-desc">Laboratuvar simülasyonunu mobil cihazınızda en iyi deneyimle kullanmak için lütfen telefonunuzu yatay konuma getirin.</p>';
    html += '    <button type="button" class="btn-rotate-fullscreen" id="btnRotateFullscreen">';
    html += '      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">';
    html += '        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
    html += '      </svg>';
    html += '      <span>Tam Ekrana Geç ve Çevir</span>';
    html += '    </button>';
    html += '    <p class="orientation-subhint">Cihazınızı yatay çevirdiğinizde laboratuvar otomatik olarak açılacaktır.</p>';
    html += '  </div>';
    html += '</div>';

    if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
    app.innerHTML = html;
    bindEvents();
    if (document.body) document.body.classList.toggle('dialog-open', Boolean(blocking));
    if (state.showResetModal) document.getElementById('btnCancelReset').focus();
    else if (state.completionStage === 'message') document.getElementById('btnCompletionHome').focus();
    else if (state.showFeedbackModal) document.getElementById('btnCloseEvalModal').focus();
    if (state.completionStage === 'fireworks') startFireworks();

    function formatTimer(sec) {
      var s = Math.floor(sec || 0);
      var m = Math.floor(s / 60);
      s = s % 60;
      return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    // 3D Simülasyon Yönetimi
    // 1. Video Modalı içinde Mikro Moleküller 3D açıksa:
    if (state.showVideoModal && state.videoModalTab === 'micro' && state.activeCase) {
      var vModalThreeEl = document.getElementById('videoModalThreeStage');
      if (vModalThreeEl && window.ThreeMolecularSimulator) {
        window.ThreeMolecularSimulator.init(vModalThreeEl, state.activeCase);
      }
    }
    // 2. Vaka detayında Mikro Moleküller modu açıksa:
    else if (state.activeCase && state.viewMode === 'micro' && !state.showFeedbackModal && !state.showVideoModal && !state.showResetModal && !state.completionStage) {
      var molEl = document.getElementById('molecularStage');
      if (molEl && window.ThreeMolecularSimulator) {
        window.ThreeMolecularSimulator.init(molEl, state.activeCase, {
          onTimeUpdate: function (info) {
            var lbl = document.getElementById('lblPlayMicro');
            var btn = document.getElementById('btnPlayMicro');
            var bar = document.getElementById('microTimelineBar');
            var thumb = document.getElementById('microTimelineThumb');
            var badge = document.getElementById('microTimerBadge');

            if (btn && lbl) {
              if (info.isEnded) {
                lbl.textContent = 'Yenile';
                btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> <span id="lblPlayMicro">Yenile</span>';
              } else if (info.isPlaying) {
                lbl.textContent = 'Duraklat';
                btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> <span id="lblPlayMicro">Duraklat</span>';
              } else {
                lbl.textContent = 'Başlat';
                btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span id="lblPlayMicro">Başlat</span>';
              }
            }
            if (bar) bar.style.width = (info.progress * 100) + '%';
            if (thumb) thumb.style.left = (info.progress * 100) + '%';
            if (badge) badge.textContent = formatTimer(info.currentTime) + ' / ' + formatTimer(info.duration);
          }
        });
      }
    } else {
      if (window.ThreeMolecularSimulator && (!state.showVideoModal || state.videoModalTab !== 'micro')) {
        window.ThreeMolecularSimulator.stop();
      }
    }
  }

  // 12 Vaka Grid Görünümü (Öneri A: Dairesel İlerleme & Vaka Nokta Izgarası, Öneri C: Başarı Rozetleri)
  function renderCaseGrid(solvedCount) {
    var progressPercent = Math.round((solvedCount / state.cases.length) * 100);
    var circumference = 2 * Math.PI * 34; // 213.63
    var dashoffset = Math.round(circumference * (1 - (solvedCount / state.cases.length)));
    var rank = getRank(solvedCount);
    var nextRankSub = getNextRankInfo(solvedCount);
    var achievements = getAchievements(solvedCount);
    var earnedCount = achievements.filter(function (a) { return a.earned; }).length;
    var h = '';

    // Hero Banner (Öneri A: Dairesel Progress Ring + Rütbe Ekranı + 12 Vaka Noktaları)
    h += '<div class="hero-banner">';
    h += '  <div>';
    h += '    <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; margin-bottom:0.35rem;">';
    h += '      <div class="hero-pill">';
    h += '        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>';
    h += '        <span>CSI Olay Yeri</span>';
    h += '      </div>';
    h += '      <button type="button" class="btn-hero-guide-pill" id="btnHeroOpenGuide" title="Rehber">';
    h += '        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
    h += '        <span>Rehber</span>';
    h += '      </button>';
    h += '    </div>';
    h += '    <h1 class="hero-title">İncelenecek Olayı Seç</h1>';
    h += '    <p class="hero-desc">';
    h += '      Olayı izle, kanıtları topla ve <strong class="text-phy">fiziksel</strong> ya da <strong class="text-chm">kimyasal</strong> değişimi belirle.';
    h += '    </p>';
    h += '  </div>';

    // Öneri A: Dairesel Progress Ring + Rütbe + Vaka Durum Noktaları
    h += '  <div class="prop-a-card">';
    h += '    <div class="progress-ring-row">';
    h += '      <div class="ring-wrap">';
    h += '        <svg width="84" height="84" viewBox="0 0 84 84">';
    h += '          <circle cx="42" cy="42" r="34" fill="none" stroke="rgba(56,189,248,0.12)" stroke-width="7"></circle>';
    h += '          <circle cx="42" cy="42" r="34" fill="none" stroke="var(--md-sys-color-primary)" stroke-width="7" stroke-dasharray="' + Math.round(circumference) + '" stroke-dashoffset="' + dashoffset + '" stroke-linecap="round" class="progress-ring-svg-circle"></circle>';
    h += '        </svg>';
    h += '        <div class="ring-center">';
    h += '          <span class="ring-num">' + solvedCount + '</span>';
    h += '          <span class="ring-label">/ ' + state.cases.length + ' Vaka</span>';
    h += '        </div>';
    h += '      </div>';
    h += '      <div class="rank-info">';
    h += '        <div class="rank-title-big">🏅 ' + rank.title + '</div>';
    h += '        <div class="rank-sub">' + nextRankSub + '</div>';
    h += '        <div class="case-dots-label">Vaka Durumları:</div>';
    h += '        <div class="case-dot-grid">';
    state.cases.forEach(function (c) {
      var rec = state.records[c.id];
      var dotClass = 'dot-empty';
      var dotStatusText = 'Henüz İncelenmedi';
      if (rec && rec.isSolved) {
        dotClass = 'dot-solved';
        dotStatusText = 'Çözüldü ✓';
      } else if (rec && rec.status === 'incomplete') {
        dotClass = 'dot-partial';
        dotStatusText = 'Eksik Bilgi ⚠️';
      } else if (rec && rec.status === 'review') {
        dotClass = 'dot-partial';
        dotStatusText = 'İnceleme gerekli';
      } else if (rec && rec.status === 'incorrect') {
        dotClass = 'dot-wrong';
        dotStatusText = 'Düzeltilmeli ✕';
      }
      h += '          <div class="case-dot ' + dotClass + '" data-case-dot-id="' + c.id + '" title="Vaka #' + c.id + ': ' + c.title + ' (' + dotStatusText + ')">' + c.id + '</div>';
    });
    h += '        </div>';
    h += '      </div>';
    h += '    </div>';
    h += '  </div>';
    h += '</div>';

    // Öneri C: Başarı Rozet Sistemi (Oyunlaştırma Katmanı)
    h += '<div class="achievements-banner">';
    h += '  <div class="achievements-header">';
    h += '    <div class="achievements-title">';
    h += '      <span>🏆 Başarı Rozetleri</span>';
    h += '      <span class="achievements-count-badge">' + earnedCount + ' / ' + achievements.length + ' Kazanıldı</span>';
    h += '    </div>';
    h += '    <div style="font-size:0.72rem; color:var(--md-sys-color-on-surface-variant);">Tüm olayları incele ve dedektif rozetlerini aç!</div>';
    h += '  </div>';
    h += '  <div class="badge-showcase">';
    achievements.forEach(function (ach) {
      var stateClass = ach.earned ? 'earned' : 'locked';
      h += '    <div class="ach-badge ' + ach.colorClass + ' ' + stateClass + '" title="' + ach.name + ': ' + ach.desc + (ach.earned ? ' (Kazanıldı ✓)' : ' (Kilitli 🔒)') + '">';
      h += '      <span class="ach-icon">' + ach.icon + '</span>';
      h += '      <span class="ach-name">' + ach.name + '</span>';
      h += '    </div>';
    });
    h += '  </div>';
    h += '</div>';

    // 12 Vaka Kartı (3 Sütunlu Grid, Tam Metin Görünümü)
    h += '<div class="cases-compact-grid">';
    state.cases.forEach(function (c) {
      var rec = state.records[c.id];
      var isSolved = rec && rec.isSolved;
      var cardStatusClass = isSolved
        ? ' solved'
        : (rec && rec.status === 'incomplete'
          ? ' case-incomplete'
          : (rec && rec.status === 'incorrect' ? ' case-incorrect' : ''));

      h += '<div class="case-card-compact anim-case-' + c.id + cardStatusClass + '" data-case-id="' + c.id + '">';
      h += '  <div class="compact-left-group">';
      h += '    <span class="compact-case-num">#' + c.id + '</span>';
      h += '    <div class="compact-icon-box">' + c.iconSvg + '</div>';
      h += '    <div class="compact-info-col">';
      h += '      <div class="compact-title">' + c.title + '</div>';
      h += '      <div class="compact-subdesc">' + c.shortDesc + '</div>';
      h += '    </div>';
      h += '  </div>';
      h += '  <div class="compact-right-group">';
      if (isSolved) {
        h += '    <span class="compact-status-badge status-solved">';
        h += '      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" style="display:inline;vertical-align:-1px;margin-right:3px"><polyline points="20 6 9 17 4 12"/></svg>Çözüldü';
        h += '    </span>';
      } else if (rec && rec.status === 'incomplete') {
        h += '    <span class="compact-status-badge status-incomplete">';
        h += '      ⚠️ Eksik Bilgi';
        h += '    </span>';
      } else if (rec && rec.status === 'review') {
        h += '    <span class="nb-status-pill nb-status-partial">⚠ İnceleme gerekli</span>';
      } else if (rec && rec.status === 'incorrect') {
        h += '    <span class="compact-status-badge status-incorrect">';
        h += '      ✕ Düzeltilmeli';
        h += '    </span>';
      } else {
        h += '    <span class="compact-status-badge status-waiting">İncele →</span>';
      }
      h += '  </div>';
      h += '</div>';
    });
    h += '</div>';

    return h;
  }

  // Laboratuvar Görev Rehberi Bilgi Kartı Modalı (Yatay Oval Dikdörtgen Format)
  function renderGuideModal() {
    var isDontShowChecked = false;
    try {
      isDontShowChecked = localStorage.getItem(GUIDE_AUTO_OPEN_KEY) === 'true';
    } catch (e) {}

    var h = '';
    h += '<div class="modal-backdrop" id="guideModalBackdrop">';
    h += '  <div class="modal-window modal-window-wide modal-guide-window">';
    h += '    <div class="modal-header">';
    h += '      <div style="display:flex; align-items:center; gap:0.75rem;">';
    h += '        <div class="lab-guide-icon-badge" style="width:36px; height:36px;">';
    h += '          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
    h += '        </div>';
    h += '        <div>';
    h += '          <h2 class="modal-title">Laboratuvar Görev Rehberi</h2>';
    h += '          <p class="modal-subtitle">Kimyasal Olay Yeri İnceleme Metodolojisi & Adli Araştırma Süreci</p>';
    h += '        </div>';
    h += '      </div>';
    h += '      <button class="btn-icon" id="btnCloseGuideModal" title="Kapat">✕</button>';
    h += '    </div>';
    h += '';
    h += '    <div class="modal-content" style="gap: 1.1rem; padding: 1.25rem 1.5rem;">';
    h += '      <div class="guide-modal-intro" style="font-size:0.86rem; color:var(--md-sys-color-on-surface); line-height:1.55; background:var(--md-sys-color-surface-container); padding:0.85rem 1.1rem; border-radius:14px; border:1px solid var(--md-sys-color-outline-variant);">';
    h += '        Hoş geldin Genç Dedektif! Adli Kimya Laboratuvarı\'nda 12 farklı olay incelemeni bekliyor. Her olayda makro gözlemlerini yap, kanıtları değerlendirerek fiziksel ya da kimyasal değişimi belirle ve 3D atom-molekül modelleriyle mikroskobik düzeyde keşfet.';
    h += '      </div>';
    h += '';
    h += '      <div class="lab-guide-steps-row">';
    h += '        <div class="lab-guide-step-card">';
    h += '          <span class="guide-step-num">1</span>';
    h += '          <div class="guide-step-content">';
    h += '            <div class="guide-step-title">Olayı Gözlemle</div>';
    h += '            <div class="guide-step-desc">Renk, gaz kabarcığı, çökelti, ısı veya hâl değişimlerini videoda dikkatlice incele.</div>';
    h += '          </div>';
    h += '        </div>';
    h += '';
    h += '        <div class="lab-guide-step-card">';
    h += '          <span class="guide-step-num">2</span>';
    h += '          <div class="guide-step-content">';
    h += '            <div class="guide-step-title">Değişimi Belirle</div>';
    h += '            <div class="guide-step-desc">Olayın Fiziksel Değişim mi yoksa Kimyasal Değişim mi olduğuna karar ver.</div>';
    h += '          </div>';
    h += '        </div>';
    h += '';
    h += '        <div class="lab-guide-step-card">';
    h += '          <span class="guide-step-num">3</span>';
    h += '          <div class="guide-step-content">';
    h += '            <div class="guide-step-title">Gerekçeni Açıkla</div>';
    h += '            <div class="guide-step-desc">Maddenin kimliği korundu mu yoksa yeni özellikte madde mi oluştu? Kendi cümlelerinle gerekçelendir.</div>';
    h += '          </div>';
    h += '        </div>';
    h += '';
    h += '        <div class="lab-guide-step-card">';
    h += '          <span class="guide-step-num">4</span>';
    h += '          <div class="guide-step-content">';
    h += '            <div class="guide-step-title">3D Moleküler Doğrula</div>';
    h += '            <div class="guide-step-desc">Atom ve molekül modellerini 3 boyutlu olarak döndürerek incele.</div>';
    h += '          </div>';
    h += '        </div>';
    h += '      </div>';
    h += '    </div>';
    h += '';
    h += '    <div class="modal-footer eval-modal-footer guide-modal-footer">';
    h += '      <label class="guide-auto-show-toggle" for="chkDontShowGuide">';
    h += '        <input type="checkbox" id="chkDontShowGuide"' + (isDontShowChecked ? ' checked' : '') + '>';
    h += '        <span>Bir sonraki açılışta bu kartı otomatik gösterme</span>';
    h += '      </label>';
    h += '      <button class="eval-oval-btn btn-primary-oval" id="btnCloseGuideModalBottom">Laboratuvara Başla →</button>';
    h += '    </div>';
    h += '  </div>';
    h += '</div>';
    return h;
  }

  // Vaka İnceleme Sahnesi (Madde 1: Kanıt picker kaldırıldı, Madde 2: Öğretmen ipucu kaldırıldı, Madde 3 & 5: Kontrol Et altında kart yok)
  function renderCaseDetail(c, solvedCount) {
    var rec = state.records[c.id];
    var h = '';

    h += '<div class="case-detail-wrap detail-landscape-grid">';

    // SOL SÜTUN (Sol Panel: Başlık, Video ve Medya Kontrolleri)
    h += '<div class="detail-left-pane">';

    // Heading (Madde 4: Kompakt Başlık ile videoyu belirgin şekilde yukarı alma)
    h += '<div class="detail-title-section-compact">';
    h += '  <h1 class="detail-heading-compact">' + c.title + '</h1>';
    h += '  <p class="detail-summary-compact">' + c.shortDesc + '</p>';
    h += '</div>';

    // Breadcrumb Row (Madde 4: Vaka # üst butonlarla aynı hizada)
    h += '<div class="detail-nav-row">';
    h += '  <div class="nav-left-group">';
    h += '    <button class="btn-back" id="btnBackToGrid"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg> <span>Olaylara Dön</span></button>';
    h += '    <span class="detail-case-tag-nav">VAKA #' + c.id + '</span>';
    h += '  </div>';
    h += '  <div class="nav-right-group">';
    h += '    <span class="detail-solved-badge">' + solvedCount + '/' + state.cases.length + ' çözüldü</span>';
    h += '    <button type="button" class="btn-detail-nb-pill" id="linkOpenNotebookFromDetail"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> <span>Defter</span></button>';
    h += '  </div>';
    h += '</div>';

    // Her iki görünümde sahnenin altındaki ortak seçim barı.
    var viewToggleHtml = '';
    viewToggleHtml += '<div class="dual-view-toggle-bar">';
    viewToggleHtml += '  <button type="button" class="btn-dual-toggle' + (state.viewMode === 'macro' ? ' active-macro' : '') + '" id="btnDualMacro">';
    viewToggleHtml += '    <span class="dual-icon">📹</span>';
    viewToggleHtml += '    <span class="dual-label">Makro Olay (Video)</span>';
    viewToggleHtml += '  </button>';
    viewToggleHtml += '  <button type="button" class="btn-dual-toggle' + (state.viewMode === 'micro' ? ' active-micro' : '') + '" id="btnDualMicro">';
    viewToggleHtml += '    <span class="dual-icon">⚛</span>';
    viewToggleHtml += '    <span class="dual-label">Mikro Moleküller</span>';
    viewToggleHtml += '    <span class="dual-pulse">3D</span>';
    viewToggleHtml += '  </button>';
    viewToggleHtml += '</div>';

    // Sahne Alanı (Makro Video veya Mikro Moleküler Canvas)
    if (state.viewMode === 'micro') {
      h += '<div id="molecularStage" class="molecular-stage"></div>';

      h += viewToggleHtml;

      // 3D Moleküler Simülasyon Video Kontrolleri (Laboratuvar Videosu ile Birebir Eşzamanlı)
      var cDur = (c.id === 9 ? 6 : 8);
      var durStr = (cDur < 10 ? '0' : '') + cDur;
      h += '<div class="video-controls-row micro-controls-row">';
      h += '  <button class="btn-media-action btn-primary-action" id="btnPlayMicro"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span id="lblPlayMicro">Başlat</span></button>';
      h += '  <button class="btn-media-action btn-secondary-action" id="btnRefreshMicro"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Yenile</button>';
      h += '  <div class="micro-timeline-container" id="microTimelineContainer" title="Zamanı İleri/Geri Sar">';
      h += '    <div class="micro-timeline-bar" id="microTimelineBar"></div>';
      h += '    <div class="micro-timeline-thumb" id="microTimelineThumb"></div>';
      h += '  </div>';
      h += '  <span class="micro-timer-badge" id="microTimerBadge">00:00 / 00:' + durStr + '</span>';
      h += '  <button class="btn-media-action btn-expand-action" id="btnOpenLargeMicro" title="Moleküler Simülasyonu Büyük Ekranda İncele"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg> Büyüt</button>';
      h += '</div>';
    } else {
      // Video Player
      h += '<div class="video-stage">';
      h += '  <video id="caseVideo" class="video-elem" poster="' + c.thumbnailUrl + '" playsinline src="' + c.videoUrl + '"></video>';
      h += '  <div class="video-watermark">● LABORATUVAR KAYDI</div>';
      h += '  <button type="button" class="btn-expand-video" id="btnExpandVideo" title="Videoyu Daha Büyük Kartta Aç">';
      h += '    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
      h += '    <span>Büyüt</span>';
      h += '  </button>';
      h += '  <div class="video-overlay-start" id="videoOverlay">';
      h += '    <div class="video-overlay-text">Gözleme başlamak için oynat düğmesine bas.</div>';
      h += '    <button class="btn-big-play" id="btnStartBig">';
      h += '      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      h += '      Gözlemi Başlat';
      h += '    </button>';
      h += '  </div>';
      h += '</div>';

      h += viewToggleHtml;

      // Video Controls
      h += '<div class="video-controls-row">';
      h += '  <button class="btn-media-action btn-primary-action" id="btnPlayVideo"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Başlat</button>';
      h += '  <button class="btn-media-action btn-secondary-action" id="btnRefreshVideo"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Yenile</button>';
      h += '  <button class="btn-media-action btn-expand-action" id="btnOpenLargeVideo" title="Videoyu Büyük Ekranda İncele"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg> Büyüt</button>';
      h += '</div>';
    }

    h += '</div>'; // End detail-left-pane

    // SAĞ SÜTUN (Sağ Panel: Gözlem Metin Alanı, Karar Butonları, Kontrol Et Butonu)
    var curType = state.selectedType || null;
    h += '<div class="detail-right-pane">';

    // Form Alanı
    h += '<div class="interactive-form-grid">';
    
    // 1. Gözlemim (Öneri D: Adım 1, Büyük Textarea, Karakter Sayacı)
    var curObs = (state.draftObservations && state.draftObservations[c.id] !== undefined)
      ? state.draftObservations[c.id]
      : '';
    var curRea = (state.draftReasonings && state.draftReasonings[c.id] !== undefined)
      ? state.draftReasonings[c.id]
      : '';

    var rec = state.records[c.id];
    var ev = rec && rec.observation === curObs && rec.reasoning === curRea && rec.decisionType === curType ? rec.evaluation : null;
    var obsUI = fieldPresentation(ev && (ev.obsStatus || (ev.hasObs ? 'correct' : (curObs ? 'incomplete' : 'empty'))));
    var typeUI = fieldPresentation(ev && (!curType ? 'empty' : (ev.isTypeCorrect ? 'correct' : 'incorrect')));
    var reaUI = fieldPresentation(ev && (ev.reaStatus || (ev.isContradiction ? 'contradiction' :
      (!curRea ? 'empty' : (ev.hasRea ? 'correct' : 'incomplete')))));

    var saveFailed = !recordStore.persistence().drafts || !recordStore.persistence().records;
    h += '  <p class="draft-save-status save-status-error" id="draftSaveStatus" role="alert"' + (saveFailed ? '' : ' hidden') + '>' + (saveFailed ? escapeHtml(draftStatusText()) : '') + '</p>';
    h += '  <section class="form-box answer-card observation-card' + obsUI.card + '" aria-labelledby="obsHeading">';
    h += '    <div class="form-box-header">';
    h += '      <span class="step-num-pill">1</span>';
    h += '      <div class="form-heading-copy">';
    h += '        <h3 class="form-box-title" id="obsHeading">Gözlemim</h3>';
    h += '        <p class="form-box-desc">Gözlemini yaz: Olayda gördüğün somut değişimleri belirt.</p>';
    h += '      </div>';
    h += obsUI.badge;
    h += '    </div>';
    h += '    <textarea id="obsInput" aria-labelledby="obsHeading" class="form-textarea' + obsUI.border + '" rows="3" maxlength="500" placeholder="Olayda gördüğün değişimleri kendi cümlelerinle yaz...">' + escapeHtml(curObs) + '</textarea>';
    h += '    <div class="char-counter" id="obsCharCounter">' + curObs.length + ' / 500 karakter</div>';
    h += '  </section>';

    // 2. Kararını Ver (Öneri G: Fiziksel vs Kimyasal Yönlendirici Kartlar, Öneri D: Karakter Sayacı)
    h += '  <section class="form-box answer-card decision-card' + typeUI.card + '" aria-labelledby="typeHeading">';
    h += '    <div class="form-box-header">';
    h += '      <span class="step-num-pill">2</span>';
    h += '      <div class="form-heading-copy">';
    h += '        <h3 class="form-box-title" id="typeHeading">Kararım</h3>';
    h += '        <p class="form-box-desc">Kararını ver: Fiziksel mi, kimyasal mı?</p>';
    h += '      </div>';
    h += typeUI.badge;
    h += '    </div>';
    
    var phyEvalClass = '';
    var chmEvalClass = '';

    if (ev && curType) {
      if (curType === 'physical') {
        if (ev.isTypeCorrect) {
          phyEvalClass = ' btn-eval-correct';
        } else {
          phyEvalClass = ' btn-eval-wrong';
        }
      } else if (curType === 'chemical') {
        if (ev.isTypeCorrect) {
          chmEvalClass = ' btn-eval-correct';
        } else {
          chmEvalClass = ' btn-eval-wrong';
        }
      }
    }

    h += '    <div>';
    h += '      <div class="type-buttons-row">';
    h += '        <button type="button" class="type-card-mock tcm-physical btn-type-phy' + (curType === 'physical' ? ' active-phy' : '') + phyEvalClass + '" id="btnPickPhysical">';
    h += '          <div class="tcm-watermark">PHY</div>';
    h += '          <div class="phy-phase-layer" aria-hidden="true">';
    h += '            <span class="phase-wave"></span>';
    h += '            <span class="frost-glaze"></span>';
    h += '            <span class="phase-node pn-1"></span>';
    h += '            <span class="phase-node pn-2"></span>';
    h += '            <span class="phase-node pn-3"></span>';
    h += '            <span class="phase-node pn-4"></span>';
    h += '            <span class="phase-spark psp-1"></span>';
    h += '            <span class="phase-spark psp-2"></span>';
    h += '          </div>';
    h += '          <div class="tcm-header-row">';
    h += '            <span class="tcm-icon">🧊</span>';
    h += '            <span class="tcm-title">Fiziksel Değişim</span>';
    h += '          </div>';
    h += '          <div class="tcm-desc">Maddenin kimliği değişmez</div>';
    h += '        </button>';
    h += '        <button type="button" class="type-card-mock tcm-chemical btn-type-chm' + (curType === 'chemical' ? ' active-chm' : '') + chmEvalClass + '" id="btnPickChemical">';
    h += '          <div class="tcm-watermark">CHM</div>';
    h += '          <div class="chm-bubble-layer" aria-hidden="true">';
    h += '            <span class="chm-bubble cb-1"></span>';
    h += '            <span class="chm-bubble cb-2"></span>';
    h += '            <span class="chm-bubble cb-3"></span>';
    h += '            <span class="chm-bubble cb-4"></span>';
    h += '            <span class="chm-bubble cb-5"></span>';
    h += '            <span class="chm-bubble cb-6"></span>';
    h += '            <span class="chm-bubble cb-7"></span>';
    h += '            <span class="chm-spark cs-1"></span>';
    h += '            <span class="chm-spark cs-2"></span>';
    h += '          </div>';
    h += '          <div class="tcm-header-row">';
    h += '            <span class="tcm-icon">🧪</span>';
    h += '            <span class="tcm-title">Kimyasal Değişim</span>';
    h += '          </div>';
    h += '          <div class="tcm-desc">Yeni özellikte madde oluşur</div>';
    h += '        </button>';
    h += '      </div>';
    h += '    </div>';
    h += '  </section>';

    // 3. Gerekçem: Karardan bağımsız kart ve değerlendirme.
    h += '  <section class="form-box answer-card reasoning-card' + reaUI.card + '" aria-labelledby="reaHeading">';
    h += '    <div class="form-box-header">';
    h += '      <span class="step-num-pill">3</span>';
    h += '      <div class="form-heading-copy">';
    h += '        <h3 class="form-box-title" id="reaHeading">Gerekçem</h3>';
    h += '        <p class="form-box-desc">Gerekçeni yaz: Maddenin kimliği korundu mu, yeni madde oluştu mu?</p>';
    h += '      </div>';
    h += reaUI.badge;
    h += '    </div>';
    h += '    <textarea id="reaInput" aria-labelledby="reaHeading" class="form-textarea' + reaUI.border + '" rows="3" maxlength="500" placeholder="Kararını bilimsel bir nedenle açıkla...">' + escapeHtml(curRea) + '</textarea>';
    h += '    <div class="char-counter" id="reaCharCounter">' + curRea.length + ' / 500 karakter</div>';
    h += '  </section>';

    h += '</div>';

    // Submit Button (Madde 3 & 5: Kontrol Et altında ekstra bilgi veya geri bildirim kartı görünmez)
    h += '<div class="submit-btn-row">';
    h += '  <button class="btn-check-answer" id="btnCheckAnswer">';
    h += '    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    h += '    <span>Kontrol Et</span>';
    h += '  </button>';
    h += '</div>';

    h += '</div>'; // End detail-right-pane
    h += '</div>'; // End case-detail-wrap detail-landscape-grid
    return h;
  }

  // Büyük Video İnceleme Modalı (Lightbox / Sinema Kartı & 3D Mikro Moleküler Sekmeli)
  function renderVideoModal(c) {
    var activeTab = state.videoModalTab || 'macro';
    var h = '';
    h += '<div class="modal-backdrop video-modal-backdrop" id="videoModalBackdrop">';
    h += '  <div class="video-modal-card">';
    h += '    <div class="video-modal-header">';
    h += '      <div style="display:flex; align-items:center; gap:0.5rem;">';
    h += '        <span class="card-id-tag" style="position:static;">VAKA #' + c.id + '</span>';
    h += '        <h3 class="video-modal-title">' + c.title + ' — Detaylı Laboratuvar Gözlemi</h3>';
    h += '      </div>';
    h += '      <button class="btn-icon" id="btnCloseVideoModal" title="Kapat">✕</button>';
    h += '    </div>';
    h += '    <div class="eval-tabs-nav video-modal-tabs-nav">';
    h += '      <button type="button" class="eval-tab-pill' + (activeTab === 'macro' ? ' active' : '') + '" id="btnVideoModalTabMacro">';
    h += '        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
    h += '        <span>📹 Makro Video</span>';
    h += '      </button>';
    h += '      <button type="button" class="eval-tab-pill' + (activeTab === 'micro' ? ' active' : '') + '" id="btnVideoModalTabMicro">';
    h += '        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    h += '        <span>⚛ Mikro Moleküller 3D</span>';
    h += '        <span class="tab-3d-tag">3D</span>';
    h += '      </button>';
    h += '    </div>';
    h += '    <div class="video-modal-stage" id="videoModalMacroStage"' + (activeTab !== 'macro' ? ' style="display:none;"' : '') + '>';
    h += '      <video id="modalVideoElem" class="video-modal-elem" poster="' + c.thumbnailUrl + '" controls ' + (activeTab === 'macro' ? 'autoplay' : '') + ' playsinline src="' + c.videoUrl + '"></video>';
    h += '    </div>';
    h += '    <div class="video-modal-stage three-modal-stage" id="videoModalThreeStage"' + (activeTab !== 'micro' ? ' style="display:none;"' : '') + '></div>';
    h += '    <div class="video-modal-footer">';
    h += '      <div class="video-modal-hint"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" style="display:inline;vertical-align:-2px;margin-right:4px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>Olayı yakından inceleyin: Makro video veya CPK standartlı 3D atom-molekül simülasyonunu tam ekranda döndürerek inceleyin.</div>';
    h += '      <button class="eval-oval-btn btn-primary-oval" id="btnCloseVideoModalBottom">Gözlem Formuna Dön</button>';
    h += '    </div>';
    h += '  </div>';
    h += '</div>';
    return h;
  }

  // Madde 3: Kontrol Et Modalı (Daha Belirgin Doğru/Yanlış Tespitler, 3D Sekmesi Kaldırılmış, Net Dönüt Kartları)
  function renderFeedbackModal(c, rec) {
    if (!rec || !rec.evaluation) return '';
    var ev = rec.evaluation;
    var hints = window.AnswerFeedback.messages(c, ev, rec.observation, rec.decisionType, rec.reasoning);
    var statusClass = ev.status === 'correct' ? 'feedback-correct' : ((ev.status === 'incomplete' || ev.status === 'review') ? 'feedback-incomplete' : 'feedback-incorrect');
    var isTypeCorrect = rec.decisionType === c.correctType;
    var obsText = (rec.observation || '').trim();
    var reaText = (rec.reasoning || '').trim();

    var iconSvg = ev.status === 'correct'
      ? '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
      : ((ev.status === 'incomplete' || ev.status === 'review')
        ? '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        : '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>');

    var badgeText = ev.status === 'correct' ? 'TAM BAŞARILI TEŞHİS' : (ev.status === 'review' ? 'İNCELEME GEREKLİ' : (ev.status === 'incomplete' ? 'EKSİK YANIT' : 'HATALI TEŞHİS'));

    var h = '';
    h += '<div class="modal-backdrop eval-modal-backdrop" id="evalModalBackdrop">';
    h += '  <div class="modal-window modal-window-wide eval-modal-card ' + statusClass + '" role="dialog" aria-modal="true" aria-labelledby="evalModalTitle" tabindex="-1">';
    
    // Header
    h += '    <div class="eval-modal-header">';
    h += '      <div class="eval-header-lead">';
    h += '        <div class="eval-status-icon">' + iconSvg + '</div>';
    h += '        <div>';
    h += '          <div class="eval-status-badge">' + badgeText + ' • VAKA #' + c.id + '</div>';
    h += '          <h2 class="eval-title" id="evalModalTitle">' + c.title + '</h2>';
    h += '        </div>';
    h += '      </div>';
    h += '      <div style="display:flex; align-items:center; gap:0.65rem;">';
    h += '        <span class="eval-score-chip">' + escapeHtml(ev.status === 'review' ? 'Değerlendirme bekliyor' : 'Puan: ' + scoreLabel(ev.score)) + '</span>';
    h += '        <button class="btn-icon" id="btnCloseEvalModal" title="Kapat">✕</button>';
    h += '      </div>';
    h += '    </div>';

    // Body (Tek, Odaklanmış ve Belirgin Tespit Kartları Listesi - 3D Sekmesi Kaldırıldı)
    h += '    <div class="eval-modal-body">';

    // Tespit 1: Gözlemim
    var obsStatus = ev.obsStatus || (obsText.length >= 4 && ev.hasObs ? 'correct' : (obsText.length > 0 ? 'incomplete' : 'empty'));
    var obsRowClass = obsStatus === 'correct' ? 'verdict-row-success' : ((obsStatus === 'incomplete' || obsStatus === 'review') ? 'verdict-row-warning' : 'verdict-row-danger');
    var obsIcon = obsStatus === 'correct' ? '✓' : ((obsStatus === 'incomplete' || obsStatus === 'review') ? '⚠️' : '✕');
    var obsTag = '';
    var obsDesc = hints.obsMessage;
    obsTag = fieldPresentation(obsStatus).badge;
    h += '      <div class="verdict-banner-row ' + obsRowClass + '">';
    h += '        <div class="verdict-row-icon">' + obsIcon + '</div>';
    h += '        <div class="verdict-row-info">';
    h += '          <div class="verdict-row-title"><span>1. Gözlemim</span> ' + obsTag + '</div>';
    h += '          <div class="verdict-answer"><strong>Yazdığın:</strong> ' + escapeHtml(obsText || 'Boş bırakıldı.') + '</div>';
    h += '          <div class="verdict-row-text"><strong>Dönüt:</strong> ' + escapeHtml(obsDesc) + '</div>';
    h += '        </div>';
    h += '      </div>';

    // Tespit 2: Kararım
    var typeTitleClass = isTypeCorrect ? 'verdict-row-success' : 'verdict-row-danger';
    var typeIcon = isTypeCorrect ? '✓' : '✕';
    var typeTag = fieldPresentation(!rec.decisionType ? 'empty' : (isTypeCorrect ? 'correct' : 'incorrect')).badge;
    var selName = rec.decisionType === 'chemical' ? 'Kimyasal Değişim' : (rec.decisionType === 'physical' ? 'Fiziksel Değişim' : 'Belirtilmedi');

    h += '      <div class="verdict-banner-row ' + typeTitleClass + '">';
    h += '        <div class="verdict-row-icon">' + typeIcon + '</div>';
    h += '        <div class="verdict-row-info">';
    h += '          <div class="verdict-row-title"><span>2. Kararım</span> ' + typeTag + '</div>';
    h += '          <div class="verdict-answer"><strong>Seçtiğin:</strong> ' + selName + '</div>';
    h += '          <div class="verdict-row-text"><strong>Dönüt:</strong> ' + escapeHtml(hints.typeMessage) + '</div>';
    h += '        </div>';
    h += '      </div>';

    // Tespit 3: Bilimsel Gerekçe & Mantık
    var reaStatus = ev.reaStatus || (ev.isContradiction ? 'contradiction' : (!isTypeCorrect ? 'incorrect' : (!reaText ? 'empty' : (ev.hasRea ? 'correct' : 'incomplete'))));
    var reaRowClass = reaStatus === 'correct' ? 'verdict-row-success' : ((reaStatus === 'incomplete' || reaStatus === 'review') ? 'verdict-row-warning' : 'verdict-row-danger');
    var reaIcon = reaStatus === 'correct' ? '✓' : ((reaStatus === 'incomplete' || reaStatus === 'review') ? '⚠️' : '✕');
    var reaTag = '';
    var reaDesc = hints.reaMessage;
    reaTag = fieldPresentation(reaStatus).badge;
    h += '      <div class="verdict-banner-row ' + reaRowClass + '">';
    h += '        <div class="verdict-row-icon">' + reaIcon + '</div>';
    h += '        <div class="verdict-row-info">';
    h += '          <div class="verdict-row-title"><span>3. Gerekçem</span> ' + reaTag + '</div>';
    h += '          <div class="verdict-answer"><strong>Yazdığın:</strong> ' + escapeHtml(reaText || 'Boş bırakıldı.') + '</div>';
    h += '          <div class="verdict-row-text"><strong>Dönüt:</strong> ' + escapeHtml(reaDesc) + '</div>';
    h += '        </div>';
    h += '      </div>';

    // Öğretmen Bilimsel Vaka Raporu / Detaylı Dönüt
    h += '      <div class="eval-feedback-card">';
    h += '        <div class="eval-feedback-title-row">';
    h += '          <span class="eval-icon-dot"></span>';
    h += '          <span class="eval-feedback-heading">🔬 Değerlendirme Dönütü</span>';
    h += '        </div>';
    h += '        <p class="eval-feedback-desc">' + escapeHtml(ev.status === 'correct' ? ev.message : 'Dönütlere göre ilgili yanıtı düzenle ve yeniden kontrol et. Önceki denemelerin defterde korunur.') + '</p>';
    h += '      </div>';

    if (ev.needsReview) {
      h += '<div class="eval-clarification"><strong>Açıklamanı netleştir:</strong> ' + escapeHtml(reviewSummary(ev, c, rec)) + '<p>Cevabımı Düzenle ile ilgili kutuya açıklamanı ekle ve yeniden kontrol et. Toplam puanın bu açıklamadan sonra hesaplanır.</p></div>';
    }

    // Hızlı Bağlantı Butonları
    h += '      <div class="eval-quick-links-row">';
    h += '        <button type="button" class="eval-oval-pill" id="btnModalGoHome"><span class="oval-pill-icon" aria-hidden="true">⌂</span><span>Ana Ekrana Dön</span></button>';
    h += '        <button type="button" class="eval-oval-pill" id="btnModalGoNotebook">';
    h += '          <div class="oval-pill-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>';
    h += '          <span>Dijital Deney Defteri</span>';
    h += '        </button>';
    h += '        <button type="button" class="eval-oval-pill" id="btnModalGoReport">';
    h += '          <div class="oval-pill-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>';
    h += '          <span>Resmi Vaka Raporu</span>';
    h += '        </button>';
    h += '      </div>';

    h += '    </div>'; // End eval-modal-body

    // Footer
    h += '    <div class="eval-modal-footer">';
    if (ev.status === 'correct') {
      h += '      <button class="eval-oval-btn btn-secondary-oval" id="btnCloseEvalModalReview">Notları İncele</button>';
      h += '      <button class="eval-oval-btn btn-primary-oval" id="btnEvalNextCase">' + (state.completionPending ? 'Tamamla ve Kutla' : 'Sonraki Olay →') + '</button>';
    } else {
      h += '      <button class="eval-oval-btn btn-primary-oval" id="btnCloseEvalModalEdit">Cevabımı Düzenle</button>';
    }
    h += '    </div>';

    h += '  </div>';
    h += '</div>';
    return h;
  }

  // Dijital Deney Defteri Modalı (Teması orijinal haline getirildi, kartlar yatay dikdörtgen)
  function renderNotebookModal(solvedCount) {
    var h = '';
    h += '<div class="modal-backdrop" id="notebookBackdrop">';
    h += '  <div class="modal-window modal-window-wide modal-notebook-window">';
    h += '    <div class="modal-header">';
    h += '      <div>';
    h += '        <h2 class="modal-title">Dijital Deney Defteri</h2>';
    h += '        <p class="modal-subtitle">Laboratuvarda incelenen vakalar, gözlem kayıtları ve bilimsel gerekçeler</p>';
    h += '      </div>';
    h += '      <div style="display:flex; align-items:center; gap:0.6rem;">';
    h += '        <span class="detail-solved-badge">' + solvedCount + ' / ' + state.cases.length + ' Çözüldü</span>';
    h += '        <button class="btn-icon" id="btnCloseNotebook" title="Kapat">✕</button>';
    h += '      </div>';
    h += '    </div>';

    h += '    <div class="modal-content notebook-grid-layout">';
    state.cases.forEach(function (c) {
      var rec = state.records[c.id];
      var isSolved = rec && rec.isSolved;

      h += '<div class="notebook-case-card" data-notebook-case-id="' + c.id + '" role="button" tabindex="0" title="Vaka #' + c.id + ' kaydını aç ve incele">';
      h += '  <div class="notebook-card-top-row">';
      h += '    <div class="notebook-card-case-id">VAKA #' + c.id + ': ' + c.title + (isSolved ? ' <span class="nb-type-tag">(' + (c.correctType === 'chemical' ? 'Kimyasal' : 'Fiziksel') + ')</span>' : '') + '</div>';
      if (rec && rec.status === 'correct') {
        h += '    <span class="nb-status-pill nb-status-solved">✓ Çözüldü (%' + rec.score + ')</span>';
      } else if (rec && rec.status === 'incomplete') {
        h += '    <span class="nb-status-pill nb-status-partial">⚠️ Eksik</span>';
      } else if (rec && rec.status === 'review') {
        h += '    <span class="nb-status-pill nb-status-partial">⚠ İnceleme gerekli</span>';
      } else if (rec && rec.status === 'incorrect') {
        h += '    <span class="nb-status-pill nb-status-wrong">✕ Hatalı</span>';
      } else {
        h += '    <span class="nb-status-pill nb-status-empty">İncelenmedi</span>';
      }
      h += '  </div>';

      if (rec) {
        h += '  <div class="notebook-card-entry-compact">';
        h += '    <div class="nb-entry-line"><strong style="color:var(--md-sys-color-primary);">Gözlem:</strong> ' + escapeHtml(rec.observation || '—') + '</div>';
        h += '    <div class="nb-entry-line"><strong style="color:var(--md-sys-color-tertiary);">Karar:</strong> ' + decisionLabel(rec.decisionType) + (rec.reasoning ? ' — ' + escapeHtml(rec.reasoning) : '') + '</div>';
        h += '  </div>';
        h += '  <div class="record-summary">En iyi puan: ' + scoreLabel(rec.bestScore) + ' · Deneme: ' + rec.attempts.length + (rec.historyKnown ? '' : ' (önceki geçmiş bilinmiyor)') + (rec.isSolved && rec.status !== 'correct' ? ' · Önceki başarı korundu ✓' : '') + '</div>';
        h += '<details class="record-history"><summary>Deneme geçmişini göster</summary>';
        rec.attempts.forEach(function (attempt, index) {
          h += '<div class="record-history-entry"><strong>Deneme ' + (index + 1) + ': ' + statusLabel(attempt.status) + ' (' + scoreLabel(attempt.score) + ')</strong>';
          h += '<div>Karar: ' + decisionLabel(attempt.decisionType) + ' · İpucu: ' + (attempt.hintCount === null ? 'Bilinmiyor' : attempt.hintCount) + '</div>';
          h += '<div>Gözlem: ' + escapeHtml(attempt.observation || '—') + '</div><div>Gerekçe: ' + escapeHtml(attempt.reasoning || '—') + '</div>';
          if (attempt.evaluation && attempt.evaluation.needsReview) h += '<div><strong>Açıklama bekleyen alan:</strong> ' + escapeHtml(reviewSummary(attempt.evaluation, c, attempt)) + '</div>';
          h += '<div>Ölçüt sürümü: ' + escapeHtml(attempt.evaluation && attempt.evaluation.criteriaVersion || 'Önceki sürüm') + '</div></div>';
        });
        h += '</details>';
      } else {
        h += '  <div class="notebook-card-empty-compact">Bu olay henüz incelenmedi. İncelemek için tıkla ↗</div>';
      }
      h += '</div>';
    });
    h += '    </div>';

    h += '    <div class="modal-footer eval-modal-footer">';
    h += '      <button class="eval-oval-btn btn-primary-oval" id="btnCloseNotebookBottom">Defteri Kapat</button>';
    h += '    </div>';
    h += '  </div>';
    h += '</div>';
    return h;
  }

  // Vaka ve Başarı Raporu Modalı (Öğrenci / Rütbe / Seviye / Çözülen bilgileri kaldırıldı)
  function renderReportModal(solvedCount, rank) {
    var h = '';
    h += '<div class="modal-backdrop" id="reportBackdrop">';
    h += '  <div class="modal-window modal-window-wide modal-report-window">';
    h += '    <div class="modal-header">';
    h += '      <div>';
    h += '        <h2 class="modal-title">Vaka ve Başarı Raporu</h2>';
    h += '        <p class="modal-subtitle">Fiziksel ve Kimyasal Değişimler Teşhis ve İlerleme Belgesi</p>';
    h += '      </div>';
    h += '      <button class="btn-icon" id="btnCloseReport" title="Kapat">✕</button>';
    h += '    </div>';

    h += '    <div class="modal-content print-area report-content-compact">';

    // Öneri C: Kompakt Başarı Rozetleri Satırı (Yan Yana 6 Rozet)
    var reportAchievements = getAchievements(solvedCount);
    var earnedAchCount = reportAchievements.filter(function (a) { return a.earned; }).length;
    h += '      <div class="report-badges-section">';
    h += '        <div class="report-badges-header">';
    h += '          <span class="report-badges-title">🏆 Dedektif Başarı Rozetleri</span>';
    h += '          <span class="report-badges-count">' + earnedAchCount + ' / ' + reportAchievements.length + ' Kazanıldı</span>';
    h += '        </div>';
    h += '        <div class="badge-showcase-compact" title="Dedektif Başarı Rozetleri">';
    reportAchievements.forEach(function (ach) {
      var stateClass = ach.earned ? 'earned' : 'locked';
      h += '          <div class="ach-badge ' + ach.colorClass + ' ' + stateClass + '" title="' + ach.name + ': ' + ach.desc + (ach.earned ? ' (Kazanıldı ✓)' : ' (Kilitli 🔒)') + '">';
      h += '            <span class="ach-icon">' + ach.icon + '</span>';
      h += '            <span class="ach-name">' + ach.name + '</span>';
      h += '          </div>';
    });
    h += '        </div>';
    h += '      </div>';

    h += '      <div class="report-table-wrap">';
    h += '        <table class="report-table">';
    h += '          <thead>';
    h += '            <tr><th>#</th><th>Olay Adı</th><th>Doğru Tür</th><th>Son Karar</th><th>Son Deneme</th><th style="text-align:right;">Son Puan</th><th>En İyi</th><th>Deneme</th></tr>';
    h += '          </thead>';
    h += '          <tbody>';
    state.cases.forEach(function (c) {
      var rec = state.records[c.id];
      var isSolved = rec && rec.isSolved;
      h += '        <tr>';
      h += '          <td style="font-family:\'Roboto Mono\', monospace; font-weight:700;">#' + c.id + '</td>';
      h += '          <td><button type="button" class="report-case-link" data-report-case-id="' + c.id + '" title="Vaka #' + c.id + ' kaydını aç ve incele"><span>' + c.title + '</span><span class="report-link-icon">↗</span></button></td>';
      h += '          <td>' + (isSolved ? (c.correctType === 'chemical' ? '🧪 Kimyasal' : '🧊 Fiziksel') : '<span style="color:var(--md-sys-color-outline); font-style:italic;">🔒 Keşfedilmedi</span>') + '</td>';
      h += '          <td>' + (rec ? decisionLabel(rec.decisionType) : '—') + '</td>';
      h += '          <td>' + (rec ? statusLabel(rec.status) + (rec.evaluation && rec.evaluation.needsReview ? '<br><small>' + escapeHtml(reviewSummary(rec.evaluation, c, rec)) + '</small>' : '') + (rec.isSolved && rec.status !== 'correct' ? '<br><small>Önceki başarı korundu</small>' : '') : '—') + '</td>';
      h += '          <td style="text-align:right;">' + (rec ? scoreLabel(rec.score) : '—') + '</td>';
      h += '          <td>' + (rec ? scoreLabel(rec.bestScore) : '—') + '</td>';
      h += '          <td>' + (rec ? rec.attempts.length + (rec.historyKnown ? '' : '+ geçmiş bilinmiyor') : '—') + '</td>';
      h += '        </tr>';
    });
    h += '          </tbody>';
    h += '        </table>';
    h += '      </div>';
    h += '    </div>';

    h += '    <div class="modal-footer eval-modal-footer">';
    h += '      <button class="eval-oval-btn btn-primary-oval" id="btnCloseReportBottom">Raporu Kapat</button>';
    h += '    </div>';
    h += '  </div>';
    h += '</div>';
    return h;
  }

  // Olay Açma ve Veri Yükleme Motoru (Bilgilerin Korunması ve Belirtilmesi)
  function openCase(target) {
    if (!target) return;
    if (state.soundEnabled) window.SoundManager.playClick();
    state.showNotebook = false;
    state.showReport = false;
    state.showVideoModal = false;
    state.showFeedbackModal = false;
    state.showMolecular = false;
    state.modalActiveTab = 'feedback';
    state.activeCase = target;

    var rec = state.records[target.id];
    var draft = recordStore.drafts[target.id];
    var initial = draft || rec;
    state.draftObservations[target.id] = initial ? initial.observation : '';
    state.draftReasonings[target.id] = initial ? initial.reasoning : '';
    state.selectedType = initial ? initial.decisionType : null;

    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function bindEvents() {
    // Brand / Home
    var btnHome = document.getElementById('btnGoHome');
    if (btnHome) {
      btnHome.onkeydown = function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); btnHome.onclick(); }
      };
      btnHome.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        if (state.showFeedbackModal) dismissFeedback('home');
        else goHome();
      };
    }

    // Toggle Theme (M3 Light / Dark)
    var btnTheme = document.getElementById('btnToggleTheme');
    if (btnTheme) {
      btnTheme.onclick = function () {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme(state.theme);
        saveThemeSetting(state.theme);
        if (state.soundEnabled) window.SoundManager.playClick();
        render();
      };
    }

    // Tam Ekrana Geç ve Çevir Buton Dinleyicisi
    var btnRotateFs = document.getElementById('btnRotateFullscreen');
    if (btnRotateFs) {
      btnRotateFs.onclick = function () {
        if (state.soundEnabled && window.SoundManager) {
          window.SoundManager.playClick();
        }
        triggerFullscreenAndRotate();
      };
    }

    // Toggle Sound
    var btnSound = document.getElementById('btnToggleSound');
    if (btnSound) {
      btnSound.onclick = function () {
        state.soundEnabled = !state.soundEnabled;
        window.SoundManager.enabled = state.soundEnabled;
        saveSoundSetting(state.soundEnabled);
        if (state.soundEnabled) window.SoundManager.playClick();
        render();
      };
    }

    // Open Notebook
    var btnNb = document.getElementById('btnOpenNotebook');
    if (btnNb) {
      btnNb.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.showNotebook = true;
        render();
      };
    }
    var linkNb = document.getElementById('linkOpenNotebookFromDetail');
    if (linkNb) {
      linkNb.onclick = function (e) {
        e.preventDefault();
        if (state.soundEnabled) window.SoundManager.playClick();
        state.showNotebook = true;
        render();
      };
    }

    // Guide Modal Handlers
    function closeGuideModal() {
      var chk = document.getElementById('chkDontShowGuide');
      if (chk) {
        try {
          localStorage.setItem(GUIDE_AUTO_OPEN_KEY, chk.checked ? 'true' : 'false');
        } catch (e) {}
      }
      state.showGuideModal = false;
      if (state.soundEnabled && window.SoundManager) {
        window.SoundManager.playClick();
      }
      render();
    }

    var chkDontShow = document.getElementById('chkDontShowGuide');
    if (chkDontShow) {
      chkDontShow.onchange = function () {
        try {
          localStorage.setItem(GUIDE_AUTO_OPEN_KEY, chkDontShow.checked ? 'true' : 'false');
        } catch (e) {}
      };
    }

    var btnCloseGuide = document.getElementById('btnCloseGuideModal');
    if (btnCloseGuide) {
      btnCloseGuide.onclick = closeGuideModal;
    }
    var btnCloseGuideBot = document.getElementById('btnCloseGuideModalBottom');
    if (btnCloseGuideBot) {
      btnCloseGuideBot.onclick = closeGuideModal;
    }
    var guideBackdrop = document.getElementById('guideModalBackdrop');
    if (guideBackdrop) {
      guideBackdrop.onclick = function (e) {
        if (e.target === guideBackdrop) closeGuideModal();
      };
    }
    var btnOpenGuide = document.getElementById('btnOpenGuide');
    if (btnOpenGuide) {
      btnOpenGuide.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.showGuideModal = true;
        render();
      };
    }
    var btnHeroOpenGuide = document.getElementById('btnHeroOpenGuide');
    if (btnHeroOpenGuide) {
      btnHeroOpenGuide.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.showGuideModal = true;
        render();
      };
    }

    // Close Notebook
    var btnCloseNb = document.getElementById('btnCloseNotebook');
    if (btnCloseNb) {
      btnCloseNb.onclick = function () {
        state.showNotebook = false;
        render();
      };
    }
    var btnCloseNbBot = document.getElementById('btnCloseNotebookBottom');
    if (btnCloseNbBot) {
      btnCloseNbBot.onclick = function () {
        state.showNotebook = false;
        render();
      };
    }
    var nbBackdrop = document.getElementById('notebookBackdrop');
    if (nbBackdrop) {
      nbBackdrop.onclick = function (e) {
        if (e.target === nbBackdrop) {
          state.showNotebook = false;
          render();
        }
      };
    }

    // Open Report
    var btnRep = document.getElementById('btnOpenReport');
    if (btnRep) {
      btnRep.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.showReport = true;
        render();
      };
    }

    // Close Report
    var btnCloseRep = document.getElementById('btnCloseReport');
    if (btnCloseRep) {
      btnCloseRep.onclick = function () {
        state.showReport = false;
        render();
      };
    }
    var btnCloseRepBot = document.getElementById('btnCloseReportBottom');
    if (btnCloseRepBot) {
      btnCloseRepBot.onclick = function () {
        state.showReport = false;
        render();
      };
    }
    var repBackdrop = document.getElementById('reportBackdrop');
    if (repBackdrop) {
      repBackdrop.onclick = function (e) {
        if (e.target === repBackdrop) {
          state.showReport = false;
          render();
        }
      };
    }

    // Report Student Inputs
    var inpRepName = document.getElementById('reportStudentName');
    if (inpRepName) {
      inpRepName.oninput = function () {
        state.studentName = inpRepName.value;
      };
    }
    var inpRepClass = document.getElementById('reportStudentClass');
    if (inpRepClass) {
      inpRepClass.oninput = function () {
        state.studentClass = inpRepClass.value;
      };
    }



    // Reset Data
    var btnReset = document.getElementById('btnResetData');
    if (btnReset) {
      btnReset.onclick = function () {
        saveCurrentDraft();
        state.resetError = '';
        state.showResetModal = true;
        render();
      };
    }

    var cancelReset = document.getElementById('btnCancelReset');
    if (cancelReset) cancelReset.onclick = closeReset;
    var confirmReset = document.getElementById('btnConfirmReset');
    if (confirmReset) confirmReset.onclick = clearAllData;
    var resetBackdrop = document.getElementById('resetBackdrop');
    if (resetBackdrop) resetBackdrop.onclick = function (e) { if (e.target === resetBackdrop) closeReset(); };
    ['btnCompletionHome', 'btnCloseCompletion'].forEach(function (id) {
      var button = document.getElementById(id); if (button) button.onclick = closeCompletion;
    });
    var completionBackdrop = document.getElementById('completionBackdrop');
    if (completionBackdrop) completionBackdrop.onclick = function (e) { if (e.target === completionBackdrop) closeCompletion(); };

    // Grid Case Cards (Olay Kartı Tıklamaları - Önceden Çözülmüş veya Yapılmış Bilgiler Korunur)
    var compactCards = document.querySelectorAll('.case-card-compact, .case-card');
    compactCards.forEach(function (card) {
      card.onclick = function () {
        var cid = parseInt(card.getAttribute('data-case-id'), 10);
        var target = state.cases.find(function (x) { return x.id === cid; });
        if (target) {
          openCase(target);
        }
      };
    });

    // Öneri A: Hero Banner Vaka Durum Noktalarına Tıklayınca Doğrudan Vakayı Açma
    var caseDots = document.querySelectorAll('.case-dot[data-case-dot-id]');
    caseDots.forEach(function (dot) {
      dot.onclick = function () {
        var cid = parseInt(dot.getAttribute('data-case-dot-id'), 10);
        var target = state.cases.find(function (x) { return x.id === cid; });
        if (target) {
          openCase(target);
        }
      };
    });

    // Dijital Deney Defteri Kartları (Önceden Kaydedilen Bilgiler Korunarak Açılır)
    var notebookCards = document.querySelectorAll('.notebook-case-card[data-notebook-case-id]');
    notebookCards.forEach(function (card) {
      card.onclick = function (event) {
        if (event && event.target.closest('.record-history')) return;
        var cid = parseInt(card.getAttribute('data-notebook-case-id'), 10);
        var target = state.cases.find(function (x) { return x.id === cid; });
        if (target) {
          openCase(target);
        }
      };
    });

    // Vaka Raporu Olay Adı Tıklamaları (Önceden Kaydedilen Bilgiler Korunarak Açılır)
    var repLinks = document.querySelectorAll('.report-case-link[data-report-case-id]');
    repLinks.forEach(function (btn) {
      btn.onclick = function () {
        var cid = parseInt(btn.getAttribute('data-report-case-id'), 10);
        var target = state.cases.find(function (x) { return x.id === cid; });
        if (target) {
          openCase(target);
        }
      };
    });

    // Detail Back
    var btnBack = document.getElementById('btnBackToGrid');
    if (btnBack) {
      btnBack.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.activeCase = null;
        if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
        render();
      };
    }

    // Çift-Bakış (Dual-View) Seçici Butonları
    var btnDualM = document.getElementById('btnDualMacro');
    if (btnDualM) {
      btnDualM.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.viewMode = 'macro';
        if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
        render();
      };
    }

    var btnDualMic = document.getElementById('btnDualMicro');
    if (btnDualMic) {
      btnDualMic.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.viewMode = 'micro';
        render();
      };
    }

    // Video Playback buttons
    var video = document.getElementById('caseVideo');
    var overlay = document.getElementById('videoOverlay');

    function playVideo() {
      if (video) {
        if (overlay) overlay.style.display = 'none';
        video.currentTime = 0;
        video.play();
      }
    }

    var btnStartBig = document.getElementById('btnStartBig');
    if (btnStartBig) {
      btnStartBig.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        playVideo();
      };
    }

    var btnPlay = document.getElementById('btnPlayVideo');
    if (btnPlay) {
      btnPlay.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        playVideo();
      };
    }

    var btnRefresh = document.getElementById('btnRefreshVideo');
    if (btnRefresh) {
      btnRefresh.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        playVideo();
      };
    }

    // Video Expand / Enlarge
    var btnExpVid = document.getElementById('btnExpandVideo');
    if (btnExpVid) {
      btnExpVid.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.showVideoModal = true;
        state.videoModalTab = 'macro';
        render();
      };
    }
    var btnOpenLarge = document.getElementById('btnOpenLargeVideo');
    if (btnOpenLarge) {
      btnOpenLarge.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.showVideoModal = true;
        state.videoModalTab = 'macro';
        render();
      };
    }

    // 3D Mikro Moleküler Simülasyon Oynatma Butonları
    var btnPlayMicro = document.getElementById('btnPlayMicro');
    if (btnPlayMicro) {
      btnPlayMicro.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        if (window.ThreeMolecularSimulator) {
          window.ThreeMolecularSimulator.togglePlay();
        }
      };
    }
    var btnRefreshMicro = document.getElementById('btnRefreshMicro');
    if (btnRefreshMicro) {
      btnRefreshMicro.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        if (window.ThreeMolecularSimulator) {
          window.ThreeMolecularSimulator.restart();
        }
      };
    }
    var microTimeline = document.getElementById('microTimelineContainer');
    if (microTimeline) {
      microTimeline.onclick = function (e) {
        if (!window.ThreeMolecularSimulator) return;
        var rect = microTimeline.getBoundingClientRect();
        var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        var dur = window.ThreeMolecularSimulator.getDuration();
        window.ThreeMolecularSimulator.seek(ratio * dur);
      };
    }
    var btnOpenLargeMicro = document.getElementById('btnOpenLargeMicro');
    if (btnOpenLargeMicro) {
      btnOpenLargeMicro.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.showVideoModal = true;
        state.videoModalTab = 'micro';
        render();
      };
    }

    function closeVideoModal() {
      var modalVid = document.getElementById('modalVideoElem');
      if (modalVid) modalVid.pause();
      if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
      state.showVideoModal = false;
      state.videoModalTab = 'macro';
      render();
    }

    var btnCloseVid = document.getElementById('btnCloseVideoModal');
    if (btnCloseVid) {
      btnCloseVid.onclick = closeVideoModal;
    }
    var btnCloseVidBot = document.getElementById('btnCloseVideoModalBottom');
    if (btnCloseVidBot) {
      btnCloseVidBot.onclick = closeVideoModal;
    }
    var vidBackdrop = document.getElementById('videoModalBackdrop');
    if (vidBackdrop) {
      vidBackdrop.onclick = function (e) {
        if (e.target === vidBackdrop) closeVideoModal();
      };
    }

    // Video Modal Sekmeleri (Makro Video vs 3D Mikro Moleküller)
    var btnVidTabMacro = document.getElementById('btnVideoModalTabMacro');
    var btnVidTabMicro = document.getElementById('btnVideoModalTabMicro');
    var macroStage = document.getElementById('videoModalMacroStage');
    var microStage = document.getElementById('videoModalThreeStage');
    var modalVidElem = document.getElementById('modalVideoElem');

    if (btnVidTabMacro && btnVidTabMicro) {
      btnVidTabMacro.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.videoModalTab = 'macro';
        btnVidTabMacro.classList.add('active');
        btnVidTabMicro.classList.remove('active');
        if (macroStage) macroStage.style.display = 'flex';
        if (microStage) microStage.style.display = 'none';
        if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
        if (modalVidElem) modalVidElem.play().catch(function () {});
      };

      btnVidTabMicro.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.videoModalTab = 'micro';
        btnVidTabMicro.classList.add('active');
        btnVidTabMacro.classList.remove('active');
        if (modalVidElem) modalVidElem.pause();
        if (macroStage) macroStage.style.display = 'none';
        if (microStage) {
          microStage.style.display = 'block';
          if (window.ThreeMolecularSimulator) {
            window.ThreeMolecularSimulator.init(microStage, state.activeCase);
          }
        }
      };
    }

    // Öneri D: Gözlem ve Karar Girişi Taslak Metin Koruması ve Canlı Karakter Sayacı
    var obsInputElem = document.getElementById('obsInput');
    var obsCounter = document.getElementById('obsCharCounter');
    if (obsInputElem) {
      obsInputElem.oninput = function () {
        var len = obsInputElem.value.length;
        saveCurrentDraft();
        if (obsCounter) {
          obsCounter.textContent = len + ' / 500 karakter';
          if (len > 450) {
            obsCounter.classList.add('char-limit-near');
          } else {
            obsCounter.classList.remove('char-limit-near');
          }
        }
      };
    }
    var reaInputElem = document.getElementById('reaInput');
    var reaCounter = document.getElementById('reaCharCounter');
    if (reaInputElem) {
      reaInputElem.oninput = function () {
        var len = reaInputElem.value.length;
        saveCurrentDraft();
        if (reaCounter) {
          reaCounter.textContent = len + ' / 500 karakter';
          if (len > 450) {
            reaCounter.classList.add('char-limit-near');
          } else {
            reaCounter.classList.remove('char-limit-near');
          }
        }
      };
    }

    // Öneri G & Madde 1 & 2: Fiziksel / Kimyasal Seçim ve Panel Ambiyans Parıltısı
    var btnPickPhy = document.getElementById('btnPickPhysical');
    if (btnPickPhy) {
      btnPickPhy.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.selectedType = 'physical';
        saveCurrentDraft();

        // Mevcut yazılan metinleri kaydet
        var obsEl = document.getElementById('obsInput');
        var reaEl = document.getElementById('reaInput');
        if (obsEl && state.activeCase) state.draftObservations[state.activeCase.id] = obsEl.value;
        if (reaEl && state.activeCase) state.draftReasonings[state.activeCase.id] = reaEl.value;

        // Sayfayı yeniden render etmeden görsel sınıfları güncelle (Metin ve video kaybolmaz)
        btnPickPhy.classList.add('active-phy', 'phy-clicked');
        var btnPickChm = document.getElementById('btnPickChemical');
        if (btnPickChm) btnPickChm.classList.remove('active-chm', 'chm-clicked');

        setTimeout(function () {
          btnPickPhy.classList.remove('phy-clicked');
        }, 600);
      };
    }

    var btnPickChm = document.getElementById('btnPickChemical');
    if (btnPickChm) {
      btnPickChm.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.selectedType = 'chemical';
        saveCurrentDraft();

        // Mevcut yazılan metinleri kaydet
        var obsEl = document.getElementById('obsInput');
        var reaEl = document.getElementById('reaInput');
        if (obsEl && state.activeCase) state.draftObservations[state.activeCase.id] = obsEl.value;
        if (reaEl && state.activeCase) state.draftReasonings[state.activeCase.id] = reaEl.value;

        // Sayfayı yeniden render etmeden görsel sınıfları güncelle (Metin ve video kaybolmaz)
        btnPickChm.classList.add('active-chm', 'chm-clicked');
        var btnPickPhy = document.getElementById('btnPickPhysical');
        if (btnPickPhy) btnPickPhy.classList.remove('active-phy', 'phy-clicked');

        setTimeout(function () {
          btnPickChm.classList.remove('chm-clicked');
        }, 600);
      };
    }

    // Check Answer (Kontrol Et)
    var btnCheck = document.getElementById('btnCheckAnswer');
    if (btnCheck) {
      btnCheck.onclick = function () {
        var obs = (document.getElementById('obsInput') || {}).value || '';
        var rea = (document.getElementById('reaInput') || {}).value || '';

        if (state.activeCase) {
          state.draftObservations[state.activeCase.id] = obs;
          state.draftReasonings[state.activeCase.id] = rea;
        }

        var ev = evaluateAnswer(state.activeCase, obs, state.selectedType, rea);

        var rec = {
          caseId: state.activeCase.id,
          isSolved: ev.status === 'correct',
          status: ev.status,
          observation: obs,
          decisionType: state.selectedType,
          reasoning: rea,
          score: ev.score,
          evaluation: ev,
          submittedAt: new Date().toISOString(),
          hintCount: 0 // Ayrı bir ipucu isteme düğmesi yok; kontrol dönütleri bu sayacı artırmaz.
        };

        saveRecord(rec);
        saveCurrentDraft();

        // Ekran üzerinde açılan belirgin bilgi kartı gösterimi (Madde 3)
        state.completionPending = ev.status === 'correct' && allCasesSolved() && !state.completionCelebrated;
        state.showFeedbackModal = true;

        if (state.soundEnabled) {
          if (ev.status === 'correct') {
            window.SoundManager.playSuccess();
          } else if (ev.status === 'incomplete' || ev.status === 'review') {
            window.SoundManager.playIncomplete();
          } else {
            window.SoundManager.playIncorrect();
          }
        }

        render();
      };
    }

    // Bütün kapatma ve gezinme düğmeleri ortak çıkış yolundan geçer.
    var exits = { btnModalGoHome: 'home', btnModalGoNotebook: 'notebook', btnModalGoReport: 'report',
      btnCloseEvalModal: 'close', btnCloseEvalModalReview: 'close', btnCloseEvalModalEdit: 'edit', btnEvalNextCase: 'next' };
    Object.keys(exits).forEach(function (id) {
      var button = document.getElementById(id);
      if (button) button.onclick = function () { dismissFeedback(exits[id]); };
    });
    var evalBackdrop = document.getElementById('evalModalBackdrop');
    if (evalBackdrop) evalBackdrop.onclick = function (e) { if (e.target === evalBackdrop) dismissFeedback('close'); };

  }

  function closeReset() {
    state.showResetModal = false; state.resetError = ''; render();
    var button = document.getElementById('btnResetData'); if (button) button.focus();
  }
  function closeCompletion() {
    stopCelebration(); state.completionStage = null; goHome();
    var button = document.getElementById('btnOpenNotebook'); if (button) button.focus();
  }

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (state.showResetModal) closeReset();
      else if (state.completionStage === 'message') closeCompletion();
      else if (state.showFeedbackModal) dismissFeedback('close');
      else return;
      event.preventDefault();
    }
    if (event.key === 'Tab') {
      var dialogs = document.querySelectorAll('[aria-modal="true"]');
      var dialog = dialogs[dialogs.length - 1];
      if (!dialog) return;
      var buttons = Array.from(dialog.querySelectorAll('button, input, textarea, a[href], [tabindex="0"]')).filter(function (el) { return !el.disabled && el.getClientRects().length; });
      if (!buttons.length) return;
      var first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
      else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
    }
  });

  window.addEventListener('pagehide', function () {
    stopCelebration();
    saveCurrentDraft();
    if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
  });
  window.addEventListener('pageshow', function (event) { if (event.persisted) render(); });

  // Başlat
  window.addEventListener('DOMContentLoaded', function () {
    updateViewport();
    applyTheme(state.theme);
    render();
  });

  window.addEventListener('resize', function () {
    updateViewport();
    if (window.ThreeMolecularSimulator) {
      window.ThreeMolecularSimulator.resize();
    }
  });

  window.addEventListener('orientationchange', function () {
    setTimeout(function () {
      updateViewport();
      if (window.ThreeMolecularSimulator) {
        window.ThreeMolecularSimulator.resize();
      }
    }, 200);
  });

  function updateViewport() {
    var style = document.documentElement.style;
    if (!style || typeof style.setProperty !== 'function') return;
    var viewport = window.visualViewport;
    style.setProperty('--app-height', (viewport ? viewport.height : window.innerHeight) + 'px');
    style.setProperty('--app-top', (viewport ? viewport.offsetTop : 0) + 'px');
    if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.resize();
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewport);
    window.visualViewport.addEventListener('scroll', updateViewport);
  }

})();
