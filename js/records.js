// Vaka geçmişi ve taslaklar; v1 kayıtları silinmeden okunur.
(function () {
  'use strict';
  var RECORDS_KEY = 'kimyasal_olay_yeri_records_v2';
  var LEGACY_KEY = 'kimyasal_olay_yeri_records_v1';
  var DRAFTS_KEY = 'kimyasal_olay_yeri_drafts_v1';
  var STATUSES = ['correct', 'incorrect', 'incomplete', 'review'];

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function object(value) { return value && typeof value === 'object' && !Array.isArray(value); }
  function text(value) { return typeof value === 'string' ? value : ''; }
  function type(value) { return value === 'physical' || value === 'chemical' ? value : null; }
  function snapshot(value, id) {
    return {
      caseId: id, observation: text(value.observation), reasoning: text(value.reasoning),
      decisionType: type(value.decisionType), status: STATUSES.indexOf(value.status) >= 0 ? value.status : 'incomplete',
      score: value.status === 'review' ? null : (typeof value.score === 'number' && isFinite(value.score) ? Math.max(0, Math.min(100, value.score)) : 0),
      evaluation: object(value.evaluation) ? copy(value.evaluation) : null,
      submittedAt: text(value.submittedAt) || text(value.solvedAt) || null,
      solvedAt: value.status === 'correct' ? (text(value.solvedAt) || text(value.submittedAt) || null) : null,
      hintCount: typeof value.hintCount === 'number' && value.hintCount >= 0 ? value.hintCount : null,
      attemptNumber: Number.isInteger(value.attemptNumber) && value.attemptNumber > 0 ? value.attemptNumber : null
    };
  }

  function create(storage, cases) {
    var records = {};
    var drafts = {};
    var lastError = '';
    var recordsPersisted = true;
    var draftsPersisted = true;
    var ids = cases.map(function (c) { return c.id; });

    function read(key) {
      try {
        var raw = storage.getItem(key);
        return raw === null ? null : JSON.parse(raw);
      } catch (err) {
        lastError = 'Kaydedilmiş veri okunamadı. Bu oturumdaki değişiklikler kaybolabilir.';
        return null;
      }
    }
    var v2 = read(RECORDS_KEY);
    var legacy = !object(v2) || v2.schemaVersion !== 2 ? read(LEGACY_KEY) : null;
    var source = object(v2) && v2.schemaVersion === 2 && object(v2.records) ? v2.records : (object(legacy) ? legacy : {});
    ids.forEach(function (id) {
      if (!object(source[id])) return;
      var old = source[id];
      var latest = snapshot(old, id);
      if (!old.status && old.isSolved) latest.status = 'correct';
      var history = Array.isArray(old.attempts) ? old.attempts.filter(object).map(function (a) { return snapshot(a, id); }) : [];
      var importedLegacy = !Array.isArray(old.attempts) || old.historyKnown === false;
      if (!history.length) history.push(copy(latest));
      var best = object(old.bestResult) && old.bestResult.status !== 'review' ? snapshot(old.bestResult, id) : null;
      history.forEach(function (a) { if (a.status !== 'review' && (!best || a.score > best.score)) best = copy(a); });
      records[id] = Object.assign(latest, {
        isSolved: old.isSolved === true || history.some(function (a) { return a.status === 'correct'; }),
        bestScore: best ? best.score : null, bestResult: best, attempts: history,
        historyKnown: !importedLegacy,
        firstAttemptCorrect: !importedLegacy && history[0].status === 'correct' && history[0].hintCount === 0,
        firstSolvedAt: text(old.firstSolvedAt) || (old.isSolved ? text(old.solvedAt) || null : null)
      });
    });
    var savedDrafts = read(DRAFTS_KEY);
    if (object(savedDrafts) && savedDrafts.schemaVersion === 1 && object(savedDrafts.drafts)) {
      ids.forEach(function (id) {
        if (!object(savedDrafts.drafts[id])) return;
        var draft = savedDrafts.drafts[id];
        drafts[id] = { observation: text(draft.observation), reasoning: text(draft.reasoning),
          decisionType: type(draft.decisionType), updatedAt: text(draft.updatedAt), persisted: true };
      });
    }
    // Başlangıç dönüşümü yeni anahtara yazılır; özgün v1 yedeği korunur.
    if (legacy && Object.keys(records).length) persistRecords();

    function write(key, value) {
      try { storage.setItem(key, JSON.stringify(value)); return true; }
      catch (err) { return false; }
    }
    function persistRecords() {
      recordsPersisted = write(RECORDS_KEY, { schemaVersion: 2, records: records });
      lastError = recordsPersisted ? '' : 'Sonuç kaydedilemedi. Bu sayfayı kapatırsan son deneme kaybolabilir.';
      return recordsPersisted;
    }
    function persistDrafts() {
      draftsPersisted = write(DRAFTS_KEY, { schemaVersion: 1, drafts: drafts });
      lastError = draftsPersisted ? '' : 'Taslak kaydedilemedi. Bu sayfayı kapatırsan yazdıkların kaybolabilir.';
      Object.keys(drafts).forEach(function (id) { drafts[id].persisted = draftsPersisted; });
      return draftsPersisted;
    }
    function saveDraft(id, draft) {
      if (ids.indexOf(Number(id)) < 0) return false;
      drafts[id] = { observation: text(draft.observation), reasoning: text(draft.reasoning),
        decisionType: type(draft.decisionType), updatedAt: new Date().toISOString(), persisted: false };
      return persistDrafts();
    }
    function saveAttempt(value) {
      var id = Number(value.caseId);
      if (ids.indexOf(id) < 0) throw new Error('Bilinmeyen vaka');
      var previous = records[id];
      var history = previous ? previous.attempts.slice() : [];
      var attempt = snapshot(value, id);
      attempt.submittedAt = attempt.submittedAt || new Date().toISOString();
      attempt.solvedAt = attempt.status === 'correct' ? attempt.submittedAt : null;
      attempt.attemptNumber = history.length + 1;
      history.push(copy(attempt));
      var best = previous ? previous.bestResult : null;
      if (attempt.status !== 'review' && (!best || attempt.score >= best.score)) best = attempt;
      var known = previous ? previous.historyKnown : true;
      records[id] = Object.assign(copy(attempt), {
        attempts: history, bestScore: best ? best.score : null, bestResult: best ? copy(best) : null, historyKnown: known,
        isSolved: Boolean(previous && previous.isSolved) || attempt.status === 'correct',
        firstAttemptCorrect: known && history[0].status === 'correct' && history[0].hintCount === 0,
        firstSolvedAt: previous && previous.firstSolvedAt || attempt.solvedAt
      });
      return { record: records[id], persisted: persistRecords() };
    }
    function clear() {
      try {
        // Boş v2 belgesi v1'e geri dönülmesini önler.
        storage.setItem(RECORDS_KEY, JSON.stringify({ schemaVersion: 2, records: {} }));
        storage.setItem(DRAFTS_KEY, JSON.stringify({ schemaVersion: 1, drafts: {} }));
        storage.removeItem(LEGACY_KEY);
      } catch (err) {
        lastError = 'Kayıtlar tamamen sıfırlanamadı. Depolama erişimini kontrol et.';
        return false;
      }
      Object.keys(records).forEach(function (id) { delete records[id]; });
      Object.keys(drafts).forEach(function (id) { delete drafts[id]; });
      recordsPersisted = draftsPersisted = true;
      lastError = '';
      return true;
    }
    return { records: records, drafts: drafts, saveAttempt: saveAttempt, saveDraft: saveDraft, clear: clear,
      persistence: function () { return { records: recordsPersisted, drafts: draftsPersisted, error: lastError }; } };
  }

  window.CaseRecordStore = { create: create };
})();
