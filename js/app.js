// ========================================================
// KİMYASAL OLAY YERİ UZMANI - STANDALONE UYGULAMA MOTORU
// ========================================================

(function () {
  'use strict';

  var STORAGE_KEY = 'kimyasal_olay_yeri_records_v1';
  var SOUND_KEY = 'kimyasal_olay_yeri_sound_v1';
  var THEME_KEY = 'kimyasal_olay_yeri_theme_v1';

  var state = {
    cases: window.CASES_DATA || [],
    records: loadRecords(),
    draftObservations: {},
    draftReasonings: {},
    activeCase: null,
    selectedClueIds: [],
    selectedType: null,
    viewMode: 'macro', // 'macro' (video) or 'micro' (canlı moleküler simülasyon)
    soundEnabled: loadSoundSetting(),
    theme: loadThemeSetting(),
    isOrientationDismissed: false,
    showNotebook: false,
    showReport: false,
    showMolecular: false,
    showVideoModal: false,
    showFeedbackModal: false,
    showGuideModal: (function () {
      try {
        return localStorage.getItem('olay_yeri_guide_seen_v1') !== 'true';
      } catch (e) {
        return true;
      }
    })(),
    studentName: 'Öğrenci Dedektif',
    studentClass: 'Lise Kimya'
  };

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

  function loadRecords() {
    try {
      var d = localStorage.getItem(STORAGE_KEY);
      return d ? JSON.parse(d) : {};
    } catch (e) {
      return {};
    }
  }

  function saveRecord(rec) {
    try {
      state.records[rec.caseId] = rec;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
    } catch (e) {
      console.error(e);
    }
  }

  function clearAllData() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      state.records = {};
      state.draftObservations = {};
      state.draftReasonings = {};
      state.activeCase = null;
      render();
    } catch (e) {
      console.error(e);
    }
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

  // Akıllı Değerlendirme Algoritması (Gözlem, Karar ve Gerekçe Odaklı)
  function evaluateAnswer(cItem, obsText, decType, decReason) {
    if (!decType) {
      return {
        status: 'incomplete',
        title: 'Kararını Belirtmelisin',
        message: 'Lütfen olayın "Fiziksel Değişim" mi yoksa "Kimyasal Değişim" mi olduğuna karar verip gerekçeni yaz.',
        score: 0
      };
    }

    var isTypeCorrect = decType === cItem.correctType;
    var obsLower = (obsText || '').toLowerCase().trim();
    var reaLower = (decReason || '').toLowerCase().trim();
    var fullText = obsLower + ' ' + reaLower;

    if (!isTypeCorrect) {
      return {
        status: 'incorrect',
        title: 'Değişim Türü Hatalı',
        message: cItem.feedbacks.incorrect,
        score: 25,
        isTypeCorrect: false,
        hasObs: hasObs,
        hasRea: hasRea,
        isShallowOrTrap: false
      };
    }

    // Doğru seçim yapıldı; gerekçe ve gözlemin yeterliliği denetleniyor
    var hasObs = obsLower.length >= 4;
    var hasRea = reaLower.length >= 4;

    // Kabul edilebilir yanıt listesiyle esnek eşleşme kontrolü
    var matchedAcceptedObs = false;
    if (cItem.acceptedObservations && cItem.acceptedObservations.length > 0) {
      matchedAcceptedObs = cItem.acceptedObservations.some(function (p) {
        var cleanP = p.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
        var words = cleanP.split(/\s+/).filter(function (w) { return w.length > 3; });
        return words.some(function (w) { return fullText.indexOf(w) !== -1; });
      });
    }

    var matchedAcceptedDec = false;
    if (cItem.acceptedDecisions && cItem.acceptedDecisions.length > 0) {
      matchedAcceptedDec = cItem.acceptedDecisions.some(function (p) {
        var cleanP = p.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
        var words = cleanP.split(/\s+/).filter(function (w) { return w.length > 3; });
        return words.filter(function (w) { return reaLower.indexOf(w) !== -1 || fullText.indexOf(w) !== -1; }).length >= 1;
      });
    }

    var matchedObsKey = cItem.observationKeywords.filter(function (k) {
      return fullText.indexOf(k.toLowerCase()) !== -1;
    });
    var matchedDecKey = cItem.decisionKeywords.filter(function (k) {
      return reaLower.indexOf(k.toLowerCase()) !== -1;
    });

    // Kavram tuzakları ve eksik gerekçe pedagojik tespiti:
    var isShallowOrTrap = false;
    // 1. Vaka (Demir): Yalnızca renk değişti deyip pas veya yeni maddeyi belirtmeme
    if (cItem.id === 1) {
      var mentionsNewSubstance = fullText.indexOf('pas') !== -1 || fullText.indexOf('yeni madde') !== -1 || fullText.indexOf('tabaka') !== -1 || fullText.indexOf('bileşik') !== -1 || fullText.indexOf('oksit') !== -1;
      if (!mentionsNewSubstance && (fullText.indexOf('renk') !== -1 || reaLower.length < 15)) {
        isShallowOrTrap = true;
      }
    }
    // 7. Vaka (Beton): Yalnızca dondu veya katılaştı deyip kimyasal tepkimeyi belirtmeme
    if (cItem.id === 7) {
      var mentionsReaction = fullText.indexOf('tepkime') !== -1 || fullText.indexOf('reaksiyon') !== -1 || fullText.indexOf('çimento') !== -1 || fullText.indexOf('yeni') !== -1 || fullText.indexOf('hidrat') !== -1;
      if (!mentionsReaction) {
        isShallowOrTrap = true;
      }
    }
    // 10. Vaka (Mum): Yalnızca eridi deyip yanma veya alev/yeni maddeyi belirtmeme
    if (cItem.id === 10) {
      var mentionsCombustion = fullText.indexOf('yan') !== -1 || fullText.indexOf('alev') !== -1 || fullText.indexOf('ışık') !== -1 || fullText.indexOf('ısı') !== -1 || fullText.indexOf('gaz') !== -1 || fullText.indexOf('duman') !== -1 || fullText.indexOf('fitil') !== -1;
      if (!mentionsCombustion && (fullText.indexOf('eri') !== -1 || reaLower.length < 15)) {
        isShallowOrTrap = true;
      }
    }
    // 11. Vaka (Şeker): "Yok oldu" yanılgısı
    if (cItem.id === 11) {
      if (fullText.indexOf('yok oldu') !== -1 && fullText.indexOf('çözün') === -1) {
        isShallowOrTrap = true;
      }
    }

    var isWellFormed = (hasObs || matchedAcceptedObs || matchedObsKey.length > 0) &&
                       (hasRea || matchedAcceptedDec || matchedDecKey.length > 0) &&
                       !isShallowOrTrap;

    if (!isWellFormed) {
      return {
        status: 'incomplete',
        title: 'Kararın Doğru, Gerekçeni Tamamla',
        message: cItem.feedbacks.incomplete,
        score: 65,
        isTypeCorrect: true,
        hasObs: hasObs,
        hasRea: hasRea,
        isShallowOrTrap: isShallowOrTrap
      };
    }

    return {
      status: 'correct',
      title: 'Doğru Karar ve Eksiksiz Gözlem',
      message: cItem.feedbacks.correct,
      score: 100,
      isTypeCorrect: true,
      hasObs: hasObs,
      hasRea: hasRea,
      isShallowOrTrap: isShallowOrTrap
    };
  }

  window.evaluateAnswer = evaluateAnswer;

  // Basit Parçacık / Konfeti Efekti
  function launchConfetti() {
    var canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    var pieces = [];
    var colors = ['#38bdf8', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#ffffff'];
    for (var i = 0; i < 90; i++) {
      pieces.push({
        x: canvas.width * 0.5 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.6,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 5,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10
      });
    }

    var frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      if (frame < 80) {
        requestAnimationFrame(animate);
      } else {
        canvas.style.display = 'none';
      }
    }
    requestAnimationFrame(animate);
  }

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
    html += '<header class="app-header">';
    html += '  <div class="header-inner">';
    html += '    <div class="brand-container" id="btnGoHome">';
    html += '      <div class="brand-logo-icon">';
    html += '        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2a10 10 0 0 0-8 16.5"/><path d="M12 6a6 6 0 0 0-4.8 9.6"/><path d="M12 10a2 2 0 0 0-1.6 3.2"/><path d="M12 14v4"/><path d="M16 12v6"/><path d="M8 12v6"/></svg>';
    html += '      </div>';
    html += '      <div>';
    html += '        <div class="brand-title">Kimyasal Olay Yeri Uzmanı <span class="csi-pill">CSI LAB</span></div>';
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
    html += '';
    html += '      <button class="btn-icon" id="btnOpenGuide" title="Laboratuvar Görev Rehberi">';
    html += '        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
    html += '      </button>';
    html += '';
    html += '      <button class="btn-notebook" id="btnOpenNotebook">';
    html += '        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
    html += '        <span>Dijital Deney Defteri</span>';
    if (solvedCount > 0) {
      html += '        <span class="badge-count">' + solvedCount + '</span>';
    }
    html += '      </button>';
    html += '';
    html += '      <button class="btn-report" id="btnOpenReport">';
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
    html += '<main class="main-content">';
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
    if (state.showFeedbackModal && state.activeCase && state.records[state.activeCase.id]) {
      html += renderFeedbackModal(state.activeCase, state.records[state.activeCase.id]);
    }

    // Mobil Dikey Ekran Uyarısı (Orientation Overlay)
    if (!state.isOrientationDismissed) {
      html += '<div class="orientation-overlay" id="orientationOverlay">';
      html += '  <div class="orientation-card">';
      html += '    <div class="phone-rotate-icon">';
      html += '      <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="var(--md-sys-color-primary)" stroke-width="1.8"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>';
      html += '    </div>';
      html += '    <div class="orientation-badge">Yatay Ekran Gerekli</div>';
      html += '    <h3 class="orientation-title">Cihazınızı Yatay Çevirin</h3>';
      html += '    <p class="orientation-desc">Laboratuvar simülasyonunu mobil ekranda tam ekran deneyimiyle kullanmak için lütfen telefonunuzu yatay konuma getirin.</p>';
      html += '    <button type="button" class="btn-dismiss-orientation" id="btnDismissOrientation">Dikeyde Devam Et</button>';
      html += '  </div>';
      html += '</div>';
    }

    // Confetti Canvas
    html += '<canvas id="confettiCanvas" style="position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99;display:none;"></canvas>';

    app.innerHTML = html;
    bindEvents();

    // 3D Simülasyon Yönetimi
    // 1. Video Modalı içinde Mikro Moleküller 3D açıksa:
    if (state.showVideoModal && state.videoModalTab === 'micro' && state.activeCase) {
      var vModalThreeEl = document.getElementById('videoModalThreeStage');
      if (vModalThreeEl && window.ThreeMolecularSimulator) {
        window.ThreeMolecularSimulator.init(vModalThreeEl, state.activeCase);
      }
    }
    // 2. Vaka detayında Mikro Moleküller modu açıksa:
    else if (state.activeCase && state.viewMode === 'micro' && !state.showFeedbackModal && !state.showVideoModal) {
      var molEl = document.getElementById('molecularStage');
      if (molEl && window.ThreeMolecularSimulator) {
        window.ThreeMolecularSimulator.init(molEl, state.activeCase);
      }
    } else {
      if (window.ThreeMolecularSimulator && (!state.showVideoModal || state.videoModalTab !== 'micro')) {
        window.ThreeMolecularSimulator.stop();
      }
    }
  }

  // 12 Vaka Grid Görünümü (Madde 9: Resimsiz, İkonlu, Kompakt & Hover Animasyonlu) + (Madde 4: Yatay Rehber Kartı)
  function renderCaseGrid(solvedCount) {
    var progressPercent = Math.round((solvedCount / state.cases.length) * 100);
    var h = '';

    // Hero Banner (Kompakt ve Sadeleştirilmiş)
    h += '<div class="hero-banner">';
    h += '  <div>';
    h += '    <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; margin-bottom:0.35rem;">';
    h += '      <div class="hero-pill">';
    h += '        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>';
    h += '        <span>CSI Olay Yeri</span>';
    h += '      </div>';
    h += '      <button type="button" class="btn-hero-guide-pill" id="btnHeroOpenGuide" title="Rehberi Aç">';
    h += '        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
    h += '        <span>Laboratuvar Görev Rehberi</span>';
    h += '      </button>';
    h += '    </div>';
    h += '    <h1 class="hero-title">İncelenecek Olayı Seç</h1>';
    h += '    <p class="hero-desc">';
    h += '      Olayı izle, kanıtları topla ve <strong class="text-phy">fiziksel</strong> ya da <strong class="text-chm">kimyasal</strong> değişimi belirle.';
    h += '    </p>';
    h += '  </div>';

    h += '  <div class="hero-progress-box">';
    h += '    <div class="progress-header">';
    h += '      <span>İlerleme</span>';
    h += '      <span>' + solvedCount + ' / ' + state.cases.length + ' (%' + progressPercent + ')</span>';
    h += '    </div>';
    h += '    <div class="progress-track">';
    h += '      <div class="progress-fill" style="width: ' + progressPercent + '%;"></div>';
    h += '    </div>';
    h += '    <div class="progress-footer">';
    h += '      <span>✓ ' + solvedCount + ' Çözüldü</span>';
    h += '      <span>' + (state.cases.length - solvedCount) + ' Kalan</span>';
    h += '    </div>';
    h += '  </div>';
    h += '</div>';

    // 12 Vaka Kartı (3 Sütunlu Grid, Tam Metin Görünümü)
    h += '<div class="cases-compact-grid">';
    state.cases.forEach(function (c) {
      var rec = state.records[c.id];
      var isSolved = rec && rec.isSolved;
      h += '<div class="case-card-compact anim-case-' + c.id + (isSolved ? ' solved' : '') + '" data-case-id="' + c.id + '">';
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
    h += '        Hoş geldin Genç Dedektif! Adli Kimya Laboratuvarı\'nda 12 farklı olay incelemeni bekliyor. Her olayda makro gözlemlerini yap, kanıtları değerlendirerek fiziksel ya da kimyasal değişimi belirle ve CPK renk standartlı 3D atom-molekül modelleriyle mikroskobik düzeyde keşfet.';
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
    h += '            <div class="guide-step-desc">CPK renk standardındaki atom ve molekül modellerini 3 boyutlu fareyle çevirerek incele.</div>';
    h += '          </div>';
    h += '        </div>';
    h += '      </div>';
    h += '    </div>';
    h += '';
    h += '    <div class="modal-footer eval-modal-footer">';
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

    // Heading (Madde 4: Kompakt Başlık ile videoyu belirgin şekilde yukarı alma)
    h += '<div class="detail-title-section-compact">';
    h += '  <h1 class="detail-heading-compact">' + c.title + '</h1>';
    h += '  <p class="detail-summary-compact">' + c.shortDesc + '</p>';
    h += '</div>';

    // Çift-Bakış (Dual-View) Seçici Barı
    h += '<div class="dual-view-toggle-bar">';
    h += '  <button type="button" class="btn-dual-toggle' + (state.viewMode === 'macro' ? ' active-macro' : '') + '" id="btnDualMacro">';
    h += '    <span class="dual-icon">📹</span>';
    h += '    <span class="dual-label">Makro Olay (Video)</span>';
    h += '  </button>';
    h += '  <button type="button" class="btn-dual-toggle' + (state.viewMode === 'micro' ? ' active-micro' : '') + '" id="btnDualMicro">';
    h += '    <span class="dual-icon">⚛</span>';
    h += '    <span class="dual-label">Mikro Moleküller</span>';
    h += '    <span class="dual-pulse">3D</span>';
    h += '  </button>';
    h += '</div>';

    // Sahne Alanı (Makro Video veya Mikro Moleküler Canvas)
    if (state.viewMode === 'micro') {
      h += '<div id="molecularStage" class="molecular-stage"></div>';
    } else {
      // Video Player
      h += '<div class="video-stage">';
      h += '  <video id="caseVideo" class="video-elem" poster="' + c.thumbnailUrl + '" playsinline src="' + c.videoUrl + '"></video>';
      h += '  <div class="video-watermark">● CSI LABORATUVAR KAYDI</div>';
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

      // Video Controls
      h += '<div class="video-controls-row">';
      h += '  <button class="btn-media-action btn-primary-action" id="btnPlayVideo"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Başlat</button>';
      h += '  <button class="btn-media-action btn-secondary-action" id="btnRefreshVideo"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Yenile</button>';
      h += '  <button class="btn-media-action btn-expand-action" id="btnOpenLargeVideo" title="Videoyu Büyük Ekranda İncele"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg> Büyüt</button>';
      h += '</div>';
    }

    h += '</div>'; // End detail-left-pane

    // SAĞ SÜTUN (Sağ Panel: Gözlem Metin Alanı, Karar Butonları, Kontrol Et Butonu)
    // Madde 1 ve 2 gereği "Kanıtları İşaretle" ve "Öğretmen İpucu" burada tamamen kaldırılmıştır.
    h += '<div class="detail-right-pane">';

    // Form Alanı
    h += '<div class="interactive-form-grid">';
    
    // 1. Gözlemim (Madde 1: Taslak Metin Koruması & Madde 4: Genel Pedagojik İpucu)
    var curObs = (state.draftObservations && state.draftObservations[c.id] !== undefined)
      ? state.draftObservations[c.id]
      : (rec ? rec.observation : '');
    var curRea = (state.draftReasonings && state.draftReasonings[c.id] !== undefined)
      ? state.draftReasonings[c.id]
      : (rec ? rec.reasoning : '');

    h += '  <div class="form-box">';
    h += '    <div class="form-box-header">';
    h += '      <span class="step-num-pill">1</span>';
    h += '      <div>';
    h += '        <h3 class="form-box-title">Gözlemini Yaz</h3>';
    h += '        <p class="form-box-desc">Olayda doğrudan gözlemlediğin somut değişimleri kendi cümlelerinle yaz.</p>';
    h += '      </div>';
    h += '    </div>';
    h += '    <textarea id="obsInput" class="form-textarea" rows="3" placeholder="Gözlemlerini buraya yaz... (Örn: Olayı izlerken videoda doğrudan gözlemlediğin tüm değişiklikleri açıkla...)">' + curObs + '</textarea>';
    h += '    <div class="pedagogical-hint-box">';
    h += '      <span class="hint-bullet">💡</span>';
    h += '      <span class="hint-text"><strong>Gözlem İpucu:</strong> Olayı incelerken duyularınla doğrudan fark edebildiğin değişikliklere odaklan: Renk değişimi, duman, alev, gaz kabarcığı çıkışı, çökelti oluşumu var mı? Yoksa yalnızca maddenin biçimi veya fiziksel hâli mi (erime, donma, buharlaşma vb.) değişti?</span>';
    h += '    </div>';
    h += '  </div>';

    // 2. Kararını Ver (Madde 5: Başlık "Kararını Ver" yapıldı, Madde 2: Faz Değişimi & Kristal Katman)
    h += '  <div class="form-box">';
    h += '    <div class="form-box-header">';
    h += '      <span class="step-num-pill">2</span>';
    h += '      <div>';
    h += '        <h3 class="form-box-title">Kararını Ver</h3>';
    h += '        <p class="form-box-desc">Bu değişim fiziksel mi yoksa kimyasal mı? Kararını seçip gerekçeni yaz.</p>';
    h += '      </div>';
    h += '    </div>';
    
    var curType = state.selectedType || (rec ? rec.decisionType : null);

    h += '    <div>';
    h += '      <div class="type-buttons-row">';
    h += '        <button type="button" class="btn-type-toggle btn-type-phy' + (curType === 'physical' ? ' active-phy' : '') + '" id="btnPickPhysical">';
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
    h += '          <div class="type-btn-top">';
    h += '            <span class="type-emoji phy-emoji">🧊</span>';
    h += '            <span class="type-title-text">Fiziksel Değişim</span>';
    h += '          </div>';
    h += '          <span class="type-sub-desc">Maddenin kimliği değişmez</span>';
    h += '        </button>';
    h += '        <button type="button" class="btn-type-toggle btn-type-chm' + (curType === 'chemical' ? ' active-chm' : '') + '" id="btnPickChemical">';
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
    h += '          <div class="type-btn-top">';
    h += '            <span class="type-emoji chm-emoji">🧪</span>';
    h += '            <span class="type-title-text">Kimyasal Değişim</span>';
    h += '          </div>';
    h += '          <span class="type-sub-desc">Yeni özellikte madde oluşur</span>';
    h += '        </button>';
    h += '      </div>';
    h += '      <textarea id="reaInput" class="form-textarea" rows="2" placeholder="Kararının gerekçesini buraya yaz... (Örn: Maddenin iç yapısında ve kimliğinde bir değişiklik olup olmadığını belirterek açıkla...)">' + curRea + '</textarea>';
    h += '      <div class="pedagogical-hint-box">';
    h += '        <span class="hint-bullet">💡</span>';
    h += '        <span class="hint-text"><strong>Gerekçe İpucu:</strong> Kararını açıklarken şu temel kimya sorusuna cevap ver: Maddenin yalnızca dış görünüşü veya hâli mi değişti (kimliği korundu mu), yoksa başlangıçtakinden farklı kimyasal özelliklere sahip yeni bir madde mi meydana geldi?</span>';
    h += '      </div>';
    h += '    </div>';
    h += '  </div>';

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
    var statusClass = ev.status === 'correct' ? 'feedback-correct' : (ev.status === 'incomplete' ? 'feedback-incomplete' : 'feedback-incorrect');
    var isTypeCorrect = rec.decisionType === c.correctType;
    var obsText = (rec.observation || '').trim();
    var reaText = (rec.reasoning || '').trim();
    var hasGoodObs = obsText.length >= 4;
    var hasGoodRea = reaText.length >= 4 && !ev.isShallowOrTrap;

    var iconSvg = ev.status === 'correct'
      ? '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
      : (ev.status === 'incomplete'
        ? '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        : '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>');

    var badgeText = ev.status === 'correct' ? 'TAM BAŞARILI TEŞHİS' : (ev.status === 'incomplete' ? 'EKSİK GÖZLEM / GEREKÇE' : 'HATALI TEŞHİS');

    var h = '';
    h += '<div class="modal-backdrop eval-modal-backdrop" id="evalModalBackdrop">';
    h += '  <div class="modal-window modal-window-wide eval-modal-card ' + statusClass + '">';
    
    // Header
    h += '    <div class="eval-modal-header">';
    h += '      <div class="eval-header-lead">';
    h += '        <div class="eval-status-icon">' + iconSvg + '</div>';
    h += '        <div>';
    h += '          <div class="eval-status-badge">' + badgeText + ' • VAKA #' + c.id + '</div>';
    h += '          <h2 class="eval-title">' + c.title + '</h2>';
    h += '        </div>';
    h += '      </div>';
    h += '      <div style="display:flex; align-items:center; gap:0.65rem;">';
    h += '        <span class="eval-score-chip">Puan: %' + ev.score + '</span>';
    h += '        <button class="btn-icon" id="btnCloseEvalModal" title="Kapat">✕</button>';
    h += '      </div>';
    h += '    </div>';

    // Body (Tek, Odaklanmış ve Belirgin Tespit Kartları Listesi - 3D Sekmesi Kaldırıldı)
    h += '    <div class="eval-modal-body" style="padding: 1.25rem 1.5rem; display:flex; flex-direction:column; gap:0.9rem;">';

    // Tespit 1: Değişim Türü
    h += '      <div class="verdict-banner-row ' + (isTypeCorrect ? 'verdict-row-success' : 'verdict-row-danger') + '">';
    h += '        <div class="verdict-row-icon">' + (isTypeCorrect ? '✓' : '✕') + '</div>';
    h += '        <div class="verdict-row-info">';
    h += '          <div class="verdict-row-title">1. DEĞİŞİM TÜRÜ TESPİTİ: ' + (isTypeCorrect ? 'DOĞRU' : 'HATALI') + '</div>';
    if (isTypeCorrect) {
      h += '          <div class="verdict-row-text">Bu olay bir <strong style="color:var(--md-sys-color-primary);">' + (c.correctType === 'chemical' ? 'Kimyasal Değişim' : 'Fiziksel Değişim') + '</strong> örneğidir. Kararın tam isabetli!</div>';
    } else {
      var selName = rec.decisionType === 'chemical' ? 'Kimyasal Değişim' : (rec.decisionType === 'physical' ? 'Fiziksel Değişim' : 'Belirtilmedi');
      var corName = c.correctType === 'chemical' ? 'Kimyasal Değişim' : 'Fiziksel Değişim';
      h += '          <div class="verdict-row-text">Senin Kararın: <strong style="text-decoration:line-through; opacity:0.85;">' + selName + '</strong> ➔ Doğru Tespit: <strong style="color:var(--md-sys-color-primary);">' + corName + '</strong>.</div>';
    }
    h += '        </div>';
    h += '      </div>';

    // Tespit 2: Gözlem Kaydı
    h += '      <div class="verdict-banner-row ' + (hasGoodObs ? 'verdict-row-success' : 'verdict-row-warning') + '">';
    h += '        <div class="verdict-row-icon">' + (hasGoodObs ? '✓' : '⚠️') + '</div>';
    h += '        <div class="verdict-row-info">';
    h += '          <div class="verdict-row-title">2. GÖZLEM RAPORU: ' + (hasGoodObs ? 'KAYDEDİLDİ' : 'EKSİK / GELİŞTİRİLMELİ') + '</div>';
    if (hasGoodObs) {
      h += '          <div class="verdict-row-text">Gözlem Notun: <em>"' + obsText + '"</em></div>';
    } else {
      h += '          <div class="verdict-row-text">Olayda fark ettiğin somut değişimleri (renk, duman, gaz kabarcığı, çökelti, sıcaklık veya hâl değişimi) gözlem kutusuna daha detaylı yazmalısın.</div>';
    }
    h += '        </div>';
    h += '      </div>';

    // Tespit 3: Bilimsel Gerekçe & Mantık
    h += '      <div class="verdict-banner-row ' + (hasGoodRea && isTypeCorrect ? 'verdict-row-success' : (isTypeCorrect ? 'verdict-row-warning' : 'verdict-row-danger')) + '">';
    h += '        <div class="verdict-row-icon">' + (hasGoodRea && isTypeCorrect ? '✓' : '⚠️') + '</div>';
    h += '        <div class="verdict-row-info">';
    h += '          <div class="verdict-row-title">3. BİLİMSEL GEREKÇE: ' + (hasGoodRea && isTypeCorrect ? 'GÜÇLÜ VE GEÇERLİ' : (isTypeCorrect ? 'TAMAMLANMALI' : 'YENİDEN DEĞERLENDİRİLMELİ')) + '</div>';
    if (reaText) {
      h += '          <div class="verdict-row-text">Gerekçen: <em>"' + reaText + '"</em></div>';
    } else {
      h += '          <div class="verdict-row-text">Kararını verirken maddenin kimliğinin değişip değişmediğini veya yeni özellikte madde oluşup oluşmadığını belirtmelisin.</div>';
    }
    h += '        </div>';
    h += '      </div>';

    // Öğretmen Bilimsel Vaka Raporu / Detaylı Dönüt
    h += '      <div class="eval-feedback-card" style="margin-top:0.25rem;">';
    h += '        <div class="eval-feedback-title-row">';
    h += '          <span class="eval-icon-dot"></span>';
    h += '          <span class="eval-feedback-heading">🔬 Kimya Öğretmeni Değerlendirmesi</span>';
    h += '        </div>';
    h += '        <p class="eval-feedback-desc" style="font-size:0.86rem; line-height:1.55; margin-top:0.4rem;">' + ev.message + '</p>';
    h += '      </div>';

    // Hızlı Bağlantı Butonları
    h += '      <div class="eval-quick-links-row" style="margin-top:0.35rem;">';
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
      h += '      <button class="eval-oval-btn btn-primary-oval" id="btnEvalNextCase">Sonraki Olay →</button>';
    } else {
      h += '      <button class="eval-oval-btn btn-primary-oval" id="btnCloseEvalModalEdit">Cevabımı Düzenle</button>';
    }
    h += '    </div>';

    h += '  </div>';
    h += '</div>';
    return h;
  }

  // Dijital Deney Defteri Modalı (Madde 2: Yatay Genişletilmiş Format & Oval Köşeli Dikdörtgen Butonlar)
  function renderNotebookModal(solvedCount) {
    var h = '';
    h += '<div class="modal-backdrop" id="notebookBackdrop">';
    h += '  <div class="modal-window modal-window-wide modal-notebook-window">';
    h += '    <div class="modal-header">';
    h += '      <div>';
    h += '        <h2 class="modal-title">Dijital Deney Defteri</h2>';
    h += '        <p class="modal-subtitle">Laboratuvarda incelenen vakalar, gözlemler ve sonuç kayıtları</p>';
    h += '      </div>';
    h += '      <button class="btn-icon" id="btnCloseNotebook" title="Kapat">✕</button>';
    h += '    </div>';

    h += '    <div class="modal-content notebook-grid-layout">';
    state.cases.forEach(function (c) {
      var rec = state.records[c.id];
      var isSolved = rec && rec.isSolved;

      h += '<div class="notebook-case-card">';
      h += '  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.4rem;">';
      h += '    <div style="font-weight:700; color:var(--text-title); font-size:0.85rem;">VAKA #' + c.id + ': ' + c.title + (isSolved ? ' <span style="font-size:0.75rem; color:var(--md-sys-color-on-surface-variant); font-weight:normal;">(' + (c.correctType === 'chemical' ? 'Kimyasal' : 'Fiziksel') + ')</span>' : '') + '</div>';
      if (isSolved) {
        h += '    <span style="color:var(--md-sys-color-success); font-weight:700; font-size:0.75rem; white-space:nowrap;">✓ Çözüldü (%' + rec.score + ')</span>';
      } else {
        h += '    <span style="color:var(--md-sys-color-on-surface-variant); font-size:0.75rem; white-space:nowrap;">İncelenmedi</span>';
      }
      h += '  </div>';

      if (rec) {
        h += '  <div style="font-size:0.78rem; color:var(--md-sys-color-on-surface); line-height:1.5;">';
        h += '    <div><strong style="color:var(--md-sys-color-primary);">Gözlem:</strong> ' + (rec.observation || '—') + '</div>';
        h += '    <div><strong style="color:var(--md-sys-color-tertiary);">Karar:</strong> ' + (rec.decisionType === 'chemical' ? 'Kimyasal Değişim' : 'Fiziksel Değişim') + ' (' + (rec.reasoning || 'Gerekçe belirtilmedi') + ')</div>';
        h += '  </div>';
      } else {
        h += '  <p style="font-size:0.75rem; color:var(--md-sys-color-outline); font-style:italic; margin:0;">Bu olay henüz incelenmedi.</p>';
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

  // Vaka ve Başarı Raporu Modalı (Sadeleştirilmiş Başlık & Dijital Deney Defteri ile Birebir Aynı Boyut)
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
    h += '      <div class="report-meta-grid">';
    h += '        <div class="report-meta-item"><strong>Öğrenci:</strong> <input type="text" id="reportStudentName" value="' + state.studentName + '" class="report-input-field" /></div>';
    h += '        <div class="report-meta-item"><strong>Rütbe:</strong> <span style="color:var(--md-sys-color-tertiary); font-weight:700;">' + rank.title + '</span></div>';
    h += '        <div class="report-meta-item"><strong>Seviye:</strong> <input type="text" id="reportStudentClass" value="' + state.studentClass + '" class="report-input-field" /></div>';
    h += '        <div class="report-meta-item"><strong>Çözülen:</strong> <span style="color:var(--md-sys-color-primary); font-weight:700;">' + solvedCount + ' / ' + state.cases.length + ' Vaka</span></div>';
    h += '      </div>';

    h += '      <div class="report-table-wrap">';
    h += '        <table class="report-table">';
    h += '          <thead>';
    h += '            <tr><th>#</th><th>Olay Adı</th><th>Doğru Tür</th><th>Öğrenci Kararı</th><th>Durum</th><th style="text-align:right;">Puan</th></tr>';
    h += '          </thead>';
    h += '          <tbody>';
    state.cases.forEach(function (c) {
      var rec = state.records[c.id];
      var isSolved = rec && rec.isSolved;
      h += '        <tr>';
      h += '          <td style="font-family:\'Roboto Mono\', monospace; font-weight:700;">#' + c.id + '</td>';
      h += '          <td><strong>' + c.title + '</strong></td>';
      h += '          <td>' + (isSolved ? (c.correctType === 'chemical' ? '🧪 Kimyasal' : '🧊 Fiziksel') : '<span style="color:var(--md-sys-color-outline); font-style:italic;">🔒 Keşfedilmedi</span>') + '</td>';
      h += '          <td>' + (rec ? (rec.decisionType === 'chemical' ? '🧪 Kimyasal' : '🧊 Fiziksel') : '—') + '</td>';
      h += '          <td>' + (isSolved ? '<span style="color:var(--md-sys-color-success); font-weight:700;">✓ Doğru</span>' : (rec ? '<span style="color:var(--md-sys-color-warning); font-weight:700;">⚠️ Eksik</span>' : '<span style="color:var(--md-sys-color-outline);">—</span>')) + '</td>';
      h += '          <td style="text-align:right; font-family:\'Roboto Mono\', monospace; font-weight:700;">' + (rec ? '%' + rec.score : '0') + '</td>';
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

  // ========================================================
  // OLAY VE ETKİLEŞİM YÖNETİMİ
  // ========================================================

  function bindEvents() {
    // Brand / Home
    var btnHome = document.getElementById('btnGoHome');
    if (btnHome) {
      btnHome.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.activeCase = null;
        if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
        render();
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

    // Dismiss Orientation Overlay (Dikeyde Devam Et)
    var btnDismissOri = document.getElementById('btnDismissOrientation');
    if (btnDismissOri) {
      btnDismissOri.onclick = function () {
        state.isOrientationDismissed = true;
        document.body.classList.add('orientation-dismissed');
        if (state.soundEnabled) window.SoundManager.playClick();
        render();
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
      state.showGuideModal = false;
      try {
        localStorage.setItem('olay_yeri_guide_seen_v1', 'true');
      } catch (e) {}
      render();
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
        if (confirm('Tüm vaka ilerlemesini ve notlarınızı sıfırlamak istediğinize emin misiniz?')) {
          clearAllData();
        }
      };
    }

    // Grid Case Cards (Madde 9: Compact Cards)
    var compactCards = document.querySelectorAll('.case-card-compact, .case-card');
    compactCards.forEach(function (card) {
      card.onclick = function () {
        var cid = parseInt(card.getAttribute('data-case-id'), 10);
        var target = state.cases.find(function (x) { return x.id === cid; });
        if (target) {
          if (state.soundEnabled) window.SoundManager.playClick();
          state.activeCase = target;
          var rec = state.records[target.id];
          state.selectedType = rec ? rec.decisionType : null;
          state.showMolecular = false;
          state.modalActiveTab = 'feedback';
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Gözlem ve Karar Girişi Taslak Metin Koruması (Madde 1)
    var obsInputElem = document.getElementById('obsInput');
    if (obsInputElem) {
      obsInputElem.oninput = function () {
        if (state.activeCase) state.draftObservations[state.activeCase.id] = obsInputElem.value;
      };
    }
    var reaInputElem = document.getElementById('reaInput');
    if (reaInputElem) {
      reaInputElem.oninput = function () {
        if (state.activeCase) state.draftReasonings[state.activeCase.id] = reaInputElem.value;
      };
    }

    // Type toggles (Madde 1: Yazılar kaybolmadan anında seçim & Madde 2: Canlı Animasyon)
    var btnPickPhy = document.getElementById('btnPickPhysical');
    if (btnPickPhy) {
      btnPickPhy.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.selectedType = 'physical';

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
          solvedAt: new Date().toISOString()
        };

        saveRecord(rec);

        // Ekran üzerinde açılan belirgin bilgi kartı gösterimi (Madde 3)
        state.showFeedbackModal = true;

        if (state.soundEnabled) {
          if (ev.status === 'correct') {
            window.SoundManager.playSuccess();
            launchConfetti();
          } else if (ev.status === 'incomplete') {
            window.SoundManager.playIncomplete();
          } else {
            window.SoundManager.playIncorrect();
          }
        }

        render();
      };
    }

    // Madde 8: Bilgi Kartı İçindeki Oval Köşeli Dikdörtgen Bağlantılar
    var btnGoNb = document.getElementById('btnModalGoNotebook');
    if (btnGoNb) {
      btnGoNb.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.showFeedbackModal = false;
        state.showNotebook = true;
        if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
        render();
      };
    }

    var btnGoRep = document.getElementById('btnModalGoReport');
    if (btnGoRep) {
      btnGoRep.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.showFeedbackModal = false;
        state.showReport = true;
        if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
        render();
      };
    }

    // Close Evaluation Modal
    var btnCloseEval = document.getElementById('btnCloseEvalModal');
    if (btnCloseEval) {
      btnCloseEval.onclick = function () {
        state.showFeedbackModal = false;
        if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
        render();
      };
    }
    var btnCloseEvalRev = document.getElementById('btnCloseEvalModalReview');
    if (btnCloseEvalRev) {
      btnCloseEvalRev.onclick = function () {
        state.showFeedbackModal = false;
        if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
        render();
      };
    }
    var btnCloseEvalEdit = document.getElementById('btnCloseEvalModalEdit');
    if (btnCloseEvalEdit) {
      btnCloseEvalEdit.onclick = function () {
        state.showFeedbackModal = false;
        if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
        render();
        var obsElem = document.getElementById('obsInput');
        if (obsElem) obsElem.focus();
      };
    }
    var evalBackdrop = document.getElementById('evalModalBackdrop');
    if (evalBackdrop) {
      evalBackdrop.onclick = function (e) {
        if (e.target === evalBackdrop) {
          state.showFeedbackModal = false;
          if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
          render();
        }
      };
    }

    // Next Case from Evaluation Modal
    var btnEvalNext = document.getElementById('btnEvalNextCase');
    if (btnEvalNext) {
      btnEvalNext.onclick = function () {
        if (state.soundEnabled) window.SoundManager.playClick();
        state.showFeedbackModal = false;
        if (window.ThreeMolecularSimulator) window.ThreeMolecularSimulator.stop();
        var nextId = (state.activeCase.id % state.cases.length) + 1;
        var nextItem = state.cases.find(function (x) { return x.id === nextId; });
        if (nextItem) {
          state.activeCase = nextItem;
          var rec = state.records[nextItem.id];
          state.selectedType = rec ? rec.decisionType : null;
          state.showMolecular = false;
          state.modalActiveTab = 'feedback';
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      };
    }
  }

  // Başlat
  window.addEventListener('DOMContentLoaded', function () {
    applyTheme(state.theme);
    render();
  });

  window.addEventListener('resize', function () {
    if (window.ThreeMolecularSimulator) {
      window.ThreeMolecularSimulator.resize();
    }
  });

  window.addEventListener('orientationchange', function () {
    setTimeout(function () {
      if (window.ThreeMolecularSimulator) {
        window.ThreeMolecularSimulator.resize();
      }
    }, 200);
  });

})();
