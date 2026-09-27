// Web Audio API Ses Sentezleyici - Dış bağımlılık olmadan adli tıp ses efektleri
window.SoundManager = (function() {
  var ctx = null;
  var enabled = true;

  function getContext() {
    if (!enabled) return null;
    if (!ctx) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  return {
    get enabled() { return enabled; },
    set enabled(val) { enabled = !!val; },

    playClick: function() {
      var c = getContext();
      if (!c) return;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, c.currentTime + 0.05);
      gain.gain.setValueAtTime(0.12, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.05);
    },

    playSuccess: function() {
      var c = getContext();
      if (!c) return;
      var notes = [440, 554.37, 659.25, 880];
      notes.forEach(function(freq, i) {
        var osc = c.createOscillator();
        var gain = c.createGain();
        var startTime = c.currentTime + i * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    },

    playIncomplete: function() {
      var c = getContext();
      if (!c) return;
      var notes = [440, 440];
      notes.forEach(function(freq, i) {
        var osc = c.createOscillator();
        var gain = c.createGain();
        var startTime = c.currentTime + i * 0.12;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.12);
      });
    },

    playIncorrect: function() {
      var c = getContext();
      if (!c) return;
      var notes = [320, 240];
      notes.forEach(function(freq, i) {
        var osc = c.createOscillator();
        var gain = c.createGain();
        var startTime = c.currentTime + i * 0.14;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.22);
      });
    },

    playStamp: function() {
      var c = getContext();
      if (!c) return;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.12);
    }
  };
})();
