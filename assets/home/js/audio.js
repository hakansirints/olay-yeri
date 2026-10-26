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
    }
  };
})();
