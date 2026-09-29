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

  function escapeHtml(str) {
    if (!str) return '';
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
        desc: 'Suyun Elektrolizi vakasını hatasız çöz',
        earned: Boolean(state.records[7] && state.records[7].isSolved),
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

  // Akıllı Değerlendirme Algoritması (Gözlem, Karar ve Gerekçe Odaklı)
  function evaluateAnswer(cItem, obsText, decType, decReason) {
    var obsLower = (obsText || '').toLowerCase().trim();
    var reaLower = (decReason || '').toLowerCase().trim();
    var fullText = obsLower + ' ' + reaLower;
    var hasObs = obsLower.length >= 4;
    var hasRea = reaLower.length >= 4;

    // Gözlem Denetimi (Kabul edilebilir gözlemler, anahtar kelimeler ve içerik kontrolü)
    var matchedAcceptedObs = false;
    if (cItem.acceptedObservations && cItem.acceptedObservations.length > 0) {
      matchedAcceptedObs = cItem.acceptedObservations.some(function (p) {
        var cleanP = p.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
        var words = cleanP.split(/\s+/).filter(function (w) { return w.length > 3; });
        return words.some(function (w) { return obsLower.indexOf(w) !== -1; });
      });
    }
    var matchedObsKey = (cItem.observationKeywords || []).filter(function (k) {
      return obsLower.indexOf(k.toLowerCase()) !== -1;
    });
    var isObsValid = (obsLower.length >= 6 && (matchedAcceptedObs || matchedObsKey.length > 0)) || obsLower.length >= 15;

    var obsStatus = 'empty';
    if (obsLower.length === 0) {
      obsStatus = 'empty';
    } else if (isObsValid) {
      obsStatus = 'correct';
    } else {
      obsStatus = 'incomplete';
    }

    if (!decType) {
      return {
        status: 'incomplete',
        title: 'Kararını Belirtmelisin',
        message: 'Lütfen olayın "Fiziksel Değişim" mi yoksa "Kimyasal Değişim" mi olduğuna karar verip gerekçeni yaz.',
        score: 0,
        isTypeCorrect: false,
        hasObs: isObsValid,
        hasRea: false,
        obsStatus: obsStatus,
        reaStatus: 'empty',
        typeStatus: 'empty',
        isContradiction: false,
        isShallowOrTrap: false
      };
    }

    // Madde 6: Seçilen buton ile yazılan açıklama arasındaki çelişki kontrolü
    var contradiction = null;
    if (decType === 'physical') {
      var claimsChemical = /(kimyasal\s+değişim|kimyasal\s+bir\s+değişim|kimyasal\s+tepkime|kimyasal\s+reaksiyon|olay\s+kimyasal|bence\s+kimyasal|kimyasaldır)/i.test(fullText);
      var negChemical = /(kimyasal[^\.\,\;\!\?]{0,30}(değil|olmad|sayılmaz|yok))/i.test(fullText);
      if (claimsChemical && !negChemical) {
        contradiction = {
          status: 'incorrect',
          title: 'Seçim ve Gerekçe Çelişkisi',
          message: 'Üstte "Fiziksel Değişim" butonunu seçtiniz ancak yazılı açıklamanızda "kimyasal değişim" ifadesini kullandınız. Buton seçiminiz ile açıklamanız birbiriyle çeliştiği için ifadeniz hatalı kabul edilmiştir. Lütfen seçiminizi ve açıklamanızı uyumlu hale getiriniz.',
          score: 20,
          isTypeCorrect: false,
          hasObs: isObsValid,
          hasRea: false,
          obsStatus: obsStatus,
          reaStatus: 'contradiction',
          typeStatus: decType === cItem.correctType ? 'correct' : 'incorrect',
          isContradiction: true,
          isShallowOrTrap: false
        };
      }
    } else if (decType === 'chemical') {
      var claimsPhysical = /(fiziksel\s+değişim|fiziksel\s+bir\s+değişim|olay\s+fiziksel|bence\s+fiziksel|sadece\s+fiziksel|fizikseldir)/i.test(fullText);
      var negPhysical = /(fiziksel[^\.\,\;\!\?]{0,30}(değil|olmad|sayılmaz|yok))/i.test(fullText);
      if (claimsPhysical && !negPhysical) {
        contradiction = {
          status: 'incorrect',
          title: 'Seçim ve Gerekçe Çelişkisi',
          message: 'Üstte "Kimyasal Değişim" butonunu seçtiniz ancak yazılı açıklamanızda "fiziksel değişim" ifadesini kullandınız. Buton seçiminiz ile açıklamanız birbiriyle çeliştiği için ifadeniz hatalı kabul edilmiştir. Lütfen seçiminizi ve açıklamanızı uyumlu hale getiriniz.',
          score: 20,
          isTypeCorrect: false,
          hasObs: isObsValid,
          hasRea: false,
          obsStatus: obsStatus,
          reaStatus: 'contradiction',
          typeStatus: decType === cItem.correctType ? 'correct' : 'incorrect',
          isContradiction: true,
          isShallowOrTrap: false
        };
      }
    }

    if (contradiction) {
      return contradiction;
    }

    var isTypeCorrect = decType === cItem.correctType;

    if (!isTypeCorrect) {
      return {
        status: 'incorrect',
        title: 'Değişim Türü Hatalı',
        message: cItem.feedbacks.incorrect,
        score: 25,
        isTypeCorrect: false,
        hasObs: isObsValid,
        hasRea: false,
        obsStatus: obsStatus,
        reaStatus: reaLower.length === 0 ? 'empty' : 'incorrect',
        typeStatus: 'incorrect',
        isContradiction: false,
        isShallowOrTrap: false
      };
    }

    // 4. Doğru seçim yapıldı; Gerekçe ve Bilimsel Açıklama Denetimi
    var matchedAcceptedDec = false;
    if (cItem.acceptedDecisions && cItem.acceptedDecisions.length > 0) {
      matchedAcceptedDec = cItem.acceptedDecisions.some(function (p) {
        var cleanP = p.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
        var words = cleanP.split(/\s+/).filter(function (w) { return w.length > 3; });
        return words.filter(function (w) { return reaLower.indexOf(w) !== -1; }).length >= 1;
      });
    }

    // 12 Olayın Her Biri İçin Pedagojik Bilimsel Gerekçe & Yanılgı Denetimi:
    var hasCoreReason = false;
    var isShallowOrTrap = false;

    switch (cItem.id) {
      case 1: // Demirin Paslanması
        // Yalnızca renk değişti demek yetersizdir; pas / yeni madde / tabaka belirtilmelidir.
        var hasRustOrNew = /(pas|yeni\s*madde|tabaka|oksit|bileşik|bilesik|farklı\s*madde)/i.test(fullText);
        if (hasRustOrNew) {
          hasCoreReason = true;
        } else {
          isShallowOrTrap = true;
        }
        break;

      case 2: // Kağıdın Yanması
        // Alev/ısı yanında kül, duman, gaz veya yeni madde ürünleri belirtilmelidir.
        var hasAshOrGas = /(kül|kul|duman|gaz|yeni\s*madde|farklı\s*madde|ürün|urun)/i.test(fullText);
        if (hasAshOrGas) {
          hasCoreReason = true;
        } else {
          isShallowOrTrap = true;
        }
        break;

      case 3: // Elmanın Çürümesi
        // Çürümede yalnızca görünüm/renk değil, kimyasal yapı değişimi / yeni madde belirtilmelidir.
        var hasStructureChange = /(kimyasal\s*yapı|kimyasal\s*özellik|yapısı\s*değiş|yapisi\s*degis|yeni\s*madde|biyokimyasal|kalıcı\s*değiş|kalici|özelliği\s*değiş)/i.test(fullText);
        if (hasStructureChange) {
          hasCoreReason = true;
        } else {
          isShallowOrTrap = true;
        }
        break;

      case 4: // Buzun Erimesi
        // Erime sırasında yeni madde oluşmadığı, yalnızca hâl değişimi olduğu veya su kaldığı belirtilmelidir.
        var hasPhaseOnly = /(hâl\s*değiş|hal\s*değiş|yeni\s*madde\s*oluşma|yeni\s*madde\s*yok|aynı\s*madde|yine\s*su|su\s*kal|kimliği\s*değişme|kimlik\s*korun|erime)/i.test(fullText);
        if (hasPhaseOnly) {
          hasCoreReason = true;
        } else {
          isShallowOrTrap = true;
        }
        break;

      case 5: // Bakır Telin Dövülmesi
        // Yeni madde oluşmadığı, bakırın aynı kaldığı veya kimyasal yapısının değişmediği belirtilmelidir.
        var hasShapeOnly = /(yeni\s*madde\s*oluşma|yeni\s*madde\s*yok|madde\s*aynı|bakır\s*aynı|bakir\s*ayni|kimyasal\s*yapı|kimliği\s*değişme|kimlik\s*korun)/i.test(reaLower || fullText);
        if (hasShapeOnly) {
          hasCoreReason = true;
        } else {
          isShallowOrTrap = true;
        }
        break;

      case 6: // Suyun Donması
        // Yeni madde oluşmadığı, yalnızca hâl değişimi olduğu ve buzun da su olduğu belirtilmelidir.
        var hasFreezingPhase = /(hâl\s*değiş|hal\s*değiş|yeni\s*madde\s*oluşma|yeni\s*madde\s*yok|aynı\s*madde|su\s*aynı|buz\s*da\s*su|yine\s*su|kimliği\s*değişme|kimlik\s*korun)/i.test(fullText);
        if (hasFreezingPhase) {
          hasCoreReason = true;
        } else {
          isShallowOrTrap = true;
        }
        break;

      case 7: // Betonun Sertleşmesi ("Donması")
        // Basit donma/katılaşma değil; çimento ile su arasında kimyasal tepkime/reaksiyon olduğu belirtilmelidir.
        var hasReaction = /(tepkime|reaksiyon|çimento|cimento|yeni\s*yapı|yeni\s*madde|hidrat|bağ\s*oluş)/i.test(fullText);
        var isOnlySimpleDonma = /(sadece\s*don|basit\s*don|sadece\s*katılaş|yalnızca\s*katılaş)/i.test(fullText);
        if (hasReaction && !isOnlySimpleDonma) {
          hasCoreReason = true;
        } else {
          isShallowOrTrap = true;
        }
        break;

      case 8: // Ekmeğin Küflenmesi
        // Yalnızca yüzey lekeleri değil; ekmeğin yapısında kimyasal/biyokimyasal değişim olduğu belirtilmelidir.
        var hasMoldChem = /(yapısı\s*değiş|yapisi\s*degis|kimyasal\s*yapı|yeni\s*madde|biyokimyasal|ayrış|ayris|kalıcı|kalici)/i.test(fullText);
        if (hasMoldChem) {
          hasCoreReason = true;
        } else {
          isShallowOrTrap = true;
        }
        break;

      case 9: // Suyun Elektrolizi
        // Yalnızca kabarcık/hareket değil; suyun kimyasal olarak ayrışıp yeni/farklı maddeler (gazlar) oluşturduğu belirtilmelidir.
        var hasElectrolysisChem = /(yeni\s*madde|farklı\s*madde|farkli\s*madde|ayrış|ayris|hidrojen|oksijen|ayrıl)/i.test(fullText);
        if (hasElectrolysisChem) {
          hasCoreReason = true;
        } else {
          isShallowOrTrap = true;
        }
        break;

      case 10: // Mumun Yanması
        // Yalnızca erime değil; alev, yanma tepkimesi, enerji açığa çıkması ve yeni maddelerin oluşumu belirtilmelidir.
        var hasCombustion = /(yanma|yanar|yeni\s*madde|ürün|urun|enerji|alev|gaz|duman)/i.test(reaLower);
        if (hasCombustion) {
          hasCoreReason = true;
        } else {
          isShallowOrTrap = true;
        }
        break;

      case 11: // Şekerin Suda Çözünmesi
        // Şekerin yok olmadığı, çözündüğü, yeni madde oluşmadığı ve kimliğini koruduğu belirtilmelidir.
        var hasDissolve = /(çözün|cozun|yeni\s*madde\s*oluşma|yeni\s*madde\s*yok|şeker\s*aynı|kimliğini\s*korur|tanecik|dağıl)/i.test(fullText);
        var hasYokOlduMisconception = fullText.indexOf('yok oldu') !== -1 && fullText.indexOf('çözün') === -1;
        if (hasDissolve && !hasYokOlduMisconception) {
          hasCoreReason = true;
        } else {
          isShallowOrTrap = true;
        }
        break;

      case 12: // Sütün Ekşimesi (Kesilmesi)
        // Yalnızca biçim/hâl değil; sütün yapısında kimyasal değişimler, yeni madde ve asitlik oluşumu belirtilmelidir.
        var hasSourChem = /(kimyasal|yapısı\s*değiş|yapisi\s*degis|yeni\s*madde|asit|bozul|pıhtılaşma)/i.test(fullText);
        if (hasSourChem) {
          hasCoreReason = true;
        } else {
          isShallowOrTrap = true;
        }
        break;

      default:
        hasCoreReason = reaLower.length >= 8;
        break;
    }

    var isReaValid = (reaLower.length >= 4 && hasCoreReason) || matchedAcceptedDec;

    var isWellFormed = isObsValid && isReaValid && !isShallowOrTrap;

    if (!isWellFormed) {
      var reaSt = reaLower.length === 0 ? 'empty' : (isReaValid && !isShallowOrTrap ? 'correct' : 'incomplete');
      return {
        status: 'incomplete',
        title: 'Kararın Doğru, Gerekçeni Tamamla',
        message: cItem.feedbacks.incomplete,
        score: 65,
        isTypeCorrect: true,
        hasObs: isObsValid,
        hasRea: isReaValid && !isShallowOrTrap,
        obsStatus: obsStatus,
        reaStatus: reaSt,
        typeStatus: 'correct',
        isContradiction: false,
        isShallowOrTrap: isShallowOrTrap
      };
    }

    return {
      status: 'correct',
      title: 'Doğru Karar ve Eksiksiz Gözlem',
      message: cItem.feedbacks.correct,
      score: 100,
      isTypeCorrect: true,
      hasObs: true,
      hasRea: true,
      obsStatus: 'correct',
      reaStatus: 'correct',
      typeStatus: 'correct',
      isContradiction: false,
      isShallowOrTrap: false
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
    html += '      <button class="btn-guide-header" id="btnOpenGuide" title="Laboratuvar Görev Rehberi">';
    html += '        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
    html += '        <span>Rehber</span>';
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

    // Confetti Canvas
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
    var curType = state.selectedType || null;
    var paneThemeClass = curType === 'physical' ? ' selected-physical' : (curType === 'chemical' ? ' selected-chemical' : '');
    h += '<div class="detail-right-pane' + paneThemeClass + '">';

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
    var ev = rec ? rec.evaluation : null;
    var obsBorderClass = '';
    var reaBorderClass = '';
    var obsBadgeHtml = '';
    var reaBadgeHtml = '';

    if (ev) {
      var oStatus = ev.obsStatus || (ev.hasObs ? 'correct' : (curObs ? 'incomplete' : 'empty'));
      if (oStatus === 'correct') {
        obsBorderClass = ' input-eval-success';
        obsBadgeHtml = '<span class="field-eval-badge badge-eval-success">✓ Doğru</span>';
      } else if (oStatus === 'incomplete') {
        obsBorderClass = ' input-eval-warning';
        obsBadgeHtml = '<span class="field-eval-badge badge-eval-warning">⚠️ Eksik</span>';
      } else {
        obsBorderClass = ' input-eval-danger';
        obsBadgeHtml = '<span class="field-eval-badge badge-eval-danger">✕ Hatalı / Boş</span>';
      }

      var rStatus = ev.reaStatus || (ev.isContradiction ? 'contradiction' : (!ev.isTypeCorrect ? 'incorrect' : (!curRea ? 'empty' : (ev.hasRea ? 'correct' : 'incomplete'))));
      if (rStatus === 'correct') {
        reaBorderClass = ' input-eval-success';
        reaBadgeHtml = '<span class="field-eval-badge badge-eval-success">✓ Doğru</span>';
      } else if (rStatus === 'incomplete') {
        reaBorderClass = ' input-eval-warning';
        reaBadgeHtml = '<span class="field-eval-badge badge-eval-warning">⚠️ Eksik</span>';
      } else {
        reaBorderClass = ' input-eval-danger';
        reaBadgeHtml = '<span class="field-eval-badge badge-eval-danger">✕ ' + (rStatus === 'contradiction' ? 'Çelişkili' : 'Hatalı') + '</span>';
      }
    }

    h += '  <div class="form-box">';
    h += '    <div class="form-box-header">';
    h += '      <span class="step-num-pill">1</span>';
    h += '      <div>';
    h += '        <h3 class="form-box-title">Gözlemini Yaz' + obsBadgeHtml + '</h3>';
    h += '        <p class="form-box-desc">Olayda doğrudan gözlemlediğin somut değişimleri kendi cümlelerinle yaz.</p>';
    h += '      </div>';
    h += '    </div>';
    h += '    <textarea id="obsInput" class="form-textarea' + obsBorderClass + '" rows="4" maxlength="500" placeholder="Gözlemlerini buraya yaz... (Örn: Olayı izlerken videoda doğrudan gözlemlediğin tüm değişiklikleri açıkla...)">' + curObs + '</textarea>';
    h += '    <div class="char-counter" id="obsCharCounter">' + curObs.length + ' / 500 karakter</div>';
    h += '  </div>';

    // 2. Kararını Ver (Öneri G: Fiziksel vs Kimyasal Yönlendirici Kartlar, Öneri D: Karakter Sayacı)
    h += '  <div class="form-box">';
    h += '    <div class="form-box-header">';
    h += '      <span class="step-num-pill">2</span>';
    h += '      <div>';
    h += '        <h3 class="form-box-title">Kararını Ver' + reaBadgeHtml + '</h3>';
    h += '        <p class="form-box-desc">Bu değişim fiziksel mi yoksa kimyasal mı? Kararını seçip gerekçeni yaz.</p>';
    h += '      </div>';
    h += '    </div>';
    
    var phyEvalClass = '';
    var phyTag = '';
    var chmEvalClass = '';
    var chmTag = '';

    if (ev && curType) {
      if (curType === 'physical') {
        if (ev.isTypeCorrect) {
          phyEvalClass = ' btn-eval-correct';
          phyTag = '<span class="btn-eval-pill pill-correct">✓ Doğru Karar</span>';
        } else {
          phyEvalClass = ' btn-eval-wrong';
          phyTag = '<span class="btn-eval-pill pill-wrong">✕ Hatalı Karar</span>';
        }
      } else if (curType === 'chemical') {
        if (ev.isTypeCorrect) {
          chmEvalClass = ' btn-eval-correct';
          chmTag = '<span class="btn-eval-pill pill-correct">✓ Doğru Karar</span>';
        } else {
          chmEvalClass = ' btn-eval-wrong';
          chmTag = '<span class="btn-eval-pill pill-wrong">✕ Hatalı Karar</span>';
        }
      }
    }

    h += '    <div>';
    h += '      <div class="type-buttons-row">';
    h += '        <button type="button" class="type-card-mock tcm-physical btn-type-phy' + (curType === 'physical' ? ' active-phy' : '') + phyEvalClass + '" id="btnPickPhysical">';
    h += '          ' + phyTag;
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
    h += '          ' + chmTag;
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
    h += '      <textarea id="reaInput" class="form-textarea' + reaBorderClass + '" rows="3" maxlength="500" placeholder="Kararının gerekçesini buraya yaz... (Örn: Maddenin iç yapısında ve kimliğinde bir değişiklik olup olmadığını belirterek açıkla...)">' + curRea + '</textarea>';
    h += '      <div class="char-counter" id="reaCharCounter">' + curRea.length + ' / 500 karakter</div>';
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
    var hasGoodObs = ev.hasObs !== undefined ? ev.hasObs : (obsText.length >= 4);
    var hasGoodRea = ev.hasRea !== undefined ? ev.hasRea : (reaText.length >= 4 && !ev.isShallowOrTrap);

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
    var typeTitleClass = isTypeCorrect ? 'verdict-row-success' : 'verdict-row-danger';
    var typeIcon = isTypeCorrect ? '✓' : '✕';
    var typeTag = isTypeCorrect
      ? '<span class="verdict-tag tag-success">✓ DOĞRU</span>'
      : '<span class="verdict-tag tag-danger">✕ HATALI</span>';
    var selName = rec.decisionType === 'chemical' ? 'Kimyasal Değişim' : (rec.decisionType === 'physical' ? 'Fiziksel Değişim' : 'Belirtilmedi');
    var corName = c.correctType === 'chemical' ? 'Kimyasal Değişim' : 'Fiziksel Değişim';

    h += '      <div class="verdict-banner-row ' + typeTitleClass + '">';
    h += '        <div class="verdict-row-icon">' + typeIcon + '</div>';
    h += '        <div class="verdict-row-info">';
    h += '          <div class="verdict-row-title"><span>1. DEĞİŞİM TÜRÜ TESPİTİ</span> ' + typeTag + '</div>';
    if (isTypeCorrect) {
      h += '          <div class="verdict-row-text">Bu olay bir <strong style="color:var(--md-sys-color-primary);">' + corName + '</strong> örneğidir. Kararın tam isabetli!</div>';
    } else {
      h += '          <div class="verdict-row-text">Senin Kararın: <strong style="text-decoration:line-through; opacity:0.85;">' + selName + '</strong> ➔ Doğru Tespit: <strong style="color:var(--md-sys-color-primary);">' + corName + '</strong>.</div>';
    }
    h += '        </div>';
    h += '      </div>';

    // Tespit 2: Gözlem Kaydı
    var obsStatus = ev.obsStatus || (obsText.length >= 4 && ev.hasObs ? 'correct' : (obsText.length > 0 ? 'incomplete' : 'empty'));
    var obsRowClass = obsStatus === 'correct' ? 'verdict-row-success' : (obsStatus === 'incomplete' ? 'verdict-row-warning' : 'verdict-row-danger');
    var obsIcon = obsStatus === 'correct' ? '✓' : (obsStatus === 'incomplete' ? '⚠️' : '✕');
    var obsTag = '';
    var obsDesc = '';

    if (obsStatus === 'empty') {
      obsTag = '<span class="verdict-tag tag-danger">Gözlem Raporu Yazılmadı</span>';
      obsDesc = 'Gözlem kutusu boş bırakıldı. Lütfen deneyde gözlemlediğin somut değişimleri kendi cümlelerinle not et.';
    } else if (obsStatus === 'incomplete') {
      obsTag = '<span class="verdict-tag tag-warning">⚠️ Eksik Gözlem</span>';
      obsDesc = 'Olayda fark ettiğin somut değişimleri (renk, duman, gaz kabarcığı, çökelti, sıcaklık veya hâl değişimi) daha detaylı yazmalısın.';
    } else if (obsStatus === 'incorrect') {
      obsTag = '<span class="verdict-tag tag-danger">✕ Hatalı Gözlem</span>';
      obsDesc = 'Yazdığın gözlem olayın somut gerçekleriyle uyuşmuyor veya çelişkili ifadeler içeriyor.';
    } else {
      obsTag = '<span class="verdict-tag tag-success">✓ Doğru Gözlem</span>';
      obsDesc = 'Olaydaki belirgin somut değişimleri ve kanıtları başarıyla gözlemledin.';
    }

    h += '      <div class="verdict-banner-row ' + obsRowClass + '">';
    h += '        <div class="verdict-row-icon">' + obsIcon + '</div>';
    h += '        <div class="verdict-row-info">';
    h += '          <div class="verdict-row-title"><span>2. GÖZLEM RAPORU</span> ' + obsTag + '</div>';
    h += '          <div class="verdict-row-text">' + obsDesc + '</div>';
    h += '        </div>';
    h += '      </div>';

    // Tespit 3: Bilimsel Gerekçe & Mantık
    var reaStatus = ev.reaStatus || (ev.isContradiction ? 'contradiction' : (!isTypeCorrect ? 'incorrect' : (!reaText ? 'empty' : (ev.hasRea ? 'correct' : 'incomplete'))));
    var reaRowClass = reaStatus === 'correct' ? 'verdict-row-success' : (reaStatus === 'incomplete' ? 'verdict-row-warning' : 'verdict-row-danger');
    var reaIcon = reaStatus === 'correct' ? '✓' : (reaStatus === 'incomplete' ? '⚠️' : '✕');
    var reaTag = '';
    var reaDesc = '';

    if (reaStatus === 'empty') {
      reaTag = '<span class="verdict-tag tag-danger">Bilimsel Gerekçe Yazılmadı</span>';
      reaDesc = 'Bilimsel gerekçe kutusu boş bırakıldı. Kararının nedenini ve maddenin iç yapısındaki durumu belirtmelisin.';
    } else if (reaStatus === 'contradiction') {
      reaTag = '<span class="verdict-tag tag-danger">✕ Çelişkili Gerekçe</span>';
      reaDesc = 'Seçtiğin buton ile yazdığın açıklama çelişiyor. Lütfen buton seçiminle gerekçeni uyumlu hale getir.';
    } else if (reaStatus === 'incomplete') {
      reaTag = '<span class="verdict-tag tag-warning">⚠️ Eksik Gerekçe</span>';
      reaDesc = 'Kararın doğru ancak gerekçen yetersiz. Maddenin kimliğinin değişip değişmediğini veya yeni madde oluşumunu belirtmelisin.';
    } else if (reaStatus === 'incorrect') {
      reaTag = '<span class="verdict-tag tag-danger">✕ Hatalı Gerekçe</span>';
      reaDesc = 'Temel değişim türü hatalı belirlendiği için bu gerekçe bilimsel olarak geçerli sayılmaz.';
    } else {
      reaTag = '<span class="verdict-tag tag-success">✓ Geçerli Gerekçe</span>';
      reaDesc = 'Maddenin iç yapısındaki kimliği ve bilimsel nedeni tam olarak gerekçelendirdin.';
    }

    h += '      <div class="verdict-banner-row ' + reaRowClass + '">';
    h += '        <div class="verdict-row-icon">' + reaIcon + '</div>';
    h += '        <div class="verdict-row-info">';
    h += '          <div class="verdict-row-title"><span>3. BİLİMSEL GEREKÇE</span> ' + reaTag + '</div>';
    h += '          <div class="verdict-row-text">' + reaDesc + '</div>';
    h += '        </div>';
    h += '      </div>';

    // Öğretmen Bilimsel Vaka Raporu / Detaylı Dönüt
    h += '      <div class="eval-feedback-card" style="margin-top:0.25rem;">';
    h += '        <div class="eval-feedback-title-row">';
    h += '          <span class="eval-icon-dot"></span>';
    h += '          <span class="eval-feedback-heading">🔬 Öğretmen Değerlendirmesi</span>';
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
      if (isSolved) {
        h += '    <span class="nb-status-pill nb-status-solved">✓ Çözüldü (%' + rec.score + ')</span>';
      } else if (rec && rec.status === 'incomplete') {
        h += '    <span class="nb-status-pill nb-status-partial">⚠️ Eksik</span>';
      } else if (rec && rec.status === 'incorrect') {
        h += '    <span class="nb-status-pill nb-status-wrong">✕ Hatalı</span>';
      } else {
        h += '    <span class="nb-status-pill nb-status-empty">İncelenmedi</span>';
      }
      h += '  </div>';

      if (rec) {
        h += '  <div class="notebook-card-entry-compact">';
        h += '    <div class="nb-entry-line"><strong style="color:var(--md-sys-color-primary);">Gözlem:</strong> ' + (rec.observation || '—') + '</div>';
        h += '    <div class="nb-entry-line"><strong style="color:var(--md-sys-color-tertiary);">Karar:</strong> ' + (rec.decisionType === 'chemical' ? '🧪 Kimyasal Değişim' : '🧊 Fiziksel Değişim') + (rec.reasoning ? ' — ' + rec.reasoning : '') + '</div>';
        h += '  </div>';
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
    h += '            <tr><th>#</th><th>Olay Adı</th><th>Doğru Tür</th><th>Öğrenci Kararı</th><th>Durum</th><th style="text-align:right;">Puan</th></tr>';
    h += '          </thead>';
    h += '          <tbody>';
    state.cases.forEach(function (c) {
      var rec = state.records[c.id];
      var isSolved = rec && rec.isSolved;
      h += '        <tr>';
      h += '          <td style="font-family:\'Roboto Mono\', monospace; font-weight:700;">#' + c.id + '</td>';
      h += '          <td><button type="button" class="report-case-link" data-report-case-id="' + c.id + '" title="Vaka #' + c.id + ' kaydını aç ve incele"><span>' + c.title + '</span><span class="report-link-icon">↗</span></button></td>';
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
    if (rec) {
      // Açılan olaylar eğer daha önceden yapılmış ise (doğru, eksik veya hatalı) içeriğindeki bilgiler silinmesin, olduğu gibi yüklensin
      state.draftObservations[target.id] = rec.observation !== undefined ? rec.observation : '';
      state.draftReasonings[target.id] = rec.reasoning !== undefined ? rec.reasoning : '';
      state.selectedType = rec.decisionType !== undefined ? rec.decisionType : null;
    } else {
      // Henüz incelenmemiş yeni bir vaka ise boş başlasın
      if (state.draftObservations[target.id] === undefined) state.draftObservations[target.id] = '';
      if (state.draftReasonings[target.id] === undefined) state.draftReasonings[target.id] = '';
      state.selectedType = null;
    }

    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
      card.onclick = function () {
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
        if (state.activeCase) state.draftObservations[state.activeCase.id] = obsInputElem.value;
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
        if (state.activeCase) state.draftReasonings[state.activeCase.id] = reaInputElem.value;
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

        // Mevcut yazılan metinleri kaydet
        var obsEl = document.getElementById('obsInput');
        var reaEl = document.getElementById('reaInput');
        if (obsEl && state.activeCase) state.draftObservations[state.activeCase.id] = obsEl.value;
        if (reaEl && state.activeCase) state.draftReasonings[state.activeCase.id] = reaEl.value;

        // Sayfayı yeniden render etmeden görsel sınıfları güncelle (Metin ve video kaybolmaz)
        btnPickPhy.classList.add('active-phy', 'phy-clicked');
        var btnPickChm = document.getElementById('btnPickChemical');
        if (btnPickChm) btnPickChm.classList.remove('active-chm', 'chm-clicked');

        // Öneri G: Sağ panele fiziksel ambiyans teması uygula
        var rightPane = document.querySelector('.detail-right-pane');
        if (rightPane) {
          rightPane.classList.add('selected-physical');
          rightPane.classList.remove('selected-chemical');
        }

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

        // Öneri G: Sağ panele kimyasal ambiyans teması uygula
        var rightPane = document.querySelector('.detail-right-pane');
        if (rightPane) {
          rightPane.classList.add('selected-chemical');
          rightPane.classList.remove('selected-physical');
        }

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
          openCase(nextItem);
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
