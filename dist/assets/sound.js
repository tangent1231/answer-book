(function () {
  'use strict';
  // Original ambient score: slow Dmaj9 / Bm7 / Gmaj9 / Asus2, with sparse bell notes.
  // Synthesized locally; no external media, downloads or audio permissions required.
  var context, musicBus, effectsBus, paperBuffer, scheduler;
  var musicEnabled = true, effectsEnabled = true, unlocked = false, hidden = false;
  var step = 0, nextTime = 0, musicNodes = [], effectNodes = [], running = false;
  var onStatus = function () {};
  var chords = [[50,57,61,66],[47,54,57,62],[43,50,57,59],[45,52,57,59]];
  var melody = [74,null,78,81,74,null,73,69,71,null,74,78,76,null,71,69];
  function frequency(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
  function stopNodes(nodes) {
    nodes.forEach(function (node) { try { node.stop(); } catch (e) {} });
    nodes.length = 0;
  }
  function track(node, list) {
    list.push(node);
    node.onended = function () {
      var at = list.indexOf(node); if (at >= 0) list.splice(at, 1);
      node.disconnect();
    };
  }
  function report() { onStatus(running && !!context && context.state === 'running'); }
  function ensureContext() {
    if (context) return true;
    var AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return false;
    try {
      context = new AudioEngine();
      musicBus = context.createGain(); musicBus.gain.value = 0;
      effectsBus = context.createGain(); effectsBus.gain.value = .28;
      var tone = context.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2600;
      musicBus.connect(tone); tone.connect(context.destination);
      effectsBus.connect(context.destination);
      // A quiet stereo-free echo gives the bells space without a heavy reverb asset.
      var echo = context.createDelay(1); echo.delayTime.value = .42;
      var echoGain = context.createGain(); echoGain.gain.value = .16;
      tone.connect(echo); echo.connect(echoGain); echoGain.connect(context.destination);
      paperBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .52), context.sampleRate);
      var samples = paperBuffer.getChannelData(0), last = 0;
      for (var i = 0; i < samples.length; i++) {
        var time = i / context.sampleRate;
        var white = Math.random() * 2 - 1;
        last = .6 * last + .4 * white;
        var grain = .45 + .25 * Math.sin(time * 163) + .16 * Math.sin(time * 479);
        samples[i] = (white - last) * grain;
      }
      context.onstatechange = function () {
        if (context.state !== 'running') { stopMusic(); stopNodes(effectNodes); }
        report();
      };
      return true;
    } catch (e) { context = null; return false; }
  }
  function note(midi, time, length, volume, bell) {
    var oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency(midi);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + (bell ? .025 : 1.2));
    gain.gain.exponentialRampToValueAtTime(.0001, time + length);
    oscillator.connect(gain); gain.connect(musicBus);
    track(oscillator, musicNodes);
    var cleanup = oscillator.onended;
    oscillator.onended = function () { cleanup(); gain.disconnect(); };
    oscillator.start(time); oscillator.stop(time + length + .05);
    if (bell) {
      var overtone = context.createOscillator(), shimmer = context.createGain();
      overtone.frequency.value = frequency(midi) * 2.002;
      shimmer.gain.setValueAtTime(volume * .14, time);
      shimmer.gain.exponentialRampToValueAtTime(.0001, time + 1.8);
      overtone.connect(shimmer); shimmer.connect(musicBus); track(overtone, musicNodes);
      var finish = overtone.onended;
      overtone.onended = function () { finish(); shimmer.disconnect(); };
      overtone.start(time); overtone.stop(time + 1.85);
    }
  }
  function schedule() {
    if (!running || hidden || !musicEnabled || context.state !== 'running') return;
    while (nextTime < context.currentTime + 1.5) {
      if (step % 4 === 0) chords[Math.floor(step / 4) % 4].forEach(function (midi) { note(midi, nextTime, 8.7, .035, false); });
      var pitch = melody[step % melody.length];
      if (pitch !== null) note(pitch, nextTime + .15, 4.8, .09, true);
      step++; nextTime += 2;
    }
    scheduler = setTimeout(schedule, 700);
  }
  function startMusic() {
    if (running || !unlocked || hidden || !musicEnabled || !context || context.state !== 'running') return;
    running = true; nextTime = context.currentTime + .05;
    musicBus.gain.cancelScheduledValues(context.currentTime);
    musicBus.gain.setValueAtTime(0, context.currentTime);
    musicBus.gain.linearRampToValueAtTime(.22, context.currentTime + 2);
    schedule(); report();
  }
  function stopMusic() {
    clearTimeout(scheduler); running = false;
    if (musicBus) { musicBus.gain.cancelScheduledValues(context.currentTime); musicBus.gain.setValueAtTime(0, context.currentTime); }
    stopNodes(musicNodes); report();
  }
  function activate(afterResume) {
    if (hidden || (!musicEnabled && !effectsEnabled) || !ensureContext()) return;
    unlocked = true;
    try {
      // resume is called directly from the initiating click for mobile autoplay policies.
      Promise.resolve(context.resume()).then(function () {
        if (hidden) return;
        startMusic(); if (afterResume) afterResume(); report();
      }).catch(function () { report(); });
    } catch (e) { report(); }
  }
  function rustle(at, strength, rate) {
    var source = context.createBufferSource(), envelope = context.createGain();
    var high = context.createBiquadFilter(), low = context.createBiquadFilter();
    source.buffer = paperBuffer; source.playbackRate.value = rate;
    high.type = 'highpass'; high.frequency.value = 650;
    low.type = 'lowpass'; low.frequency.value = 5100;
    var length = .52 / rate;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(strength, at + .065);
    envelope.gain.linearRampToValueAtTime(strength * .4, at + length * .5);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + length);
    source.connect(high); high.connect(low); low.connect(envelope); envelope.connect(effectsBus);
    track(source, effectNodes);
    var cleanup = source.onended;
    source.onended = function () { cleanup(); high.disconnect(); low.disconnect(); envelope.disconnect(); };
    source.start(at); source.stop(at + length + .02);
  }
  window.OracleSound = {
    configure: function (music, effects, callback) {
      musicEnabled = music; effectsEnabled = effects;
      if (callback) onStatus = callback;
      if (!musicEnabled) stopMusic();
      if (!effectsEnabled) stopNodes(effectNodes);
    },
    activate: function () { activate(); },
    turn: function (gentle) {
      // Capture the click timestamp so a delayed audio resume cannot play stale page turns.
      var clicked = Date.now();
      activate(function () {
        if (!effectsEnabled || context.state !== 'running') return;
        stopNodes(effectNodes);
        var offsets = gentle ? [.04] : [.04, .42, .57, .72];
        var elapsed = (Date.now() - clicked) / 1000;
        offsets.forEach(function (offset, i) {
          if (offset + .12 >= elapsed) rustle(context.currentTime + Math.max(0, offset - elapsed), i === 0 ? .32 : .55, 1 + i * .07);
        });
      });
    },
    visibility: function (isHidden) {
      hidden = isHidden;
      if (hidden) {
        stopMusic(); stopNodes(effectNodes);
        if (context) { try { Promise.resolve(context.suspend()).catch(function () {}); } catch (e) {} }
      } else if (unlocked) activate();
    }
  };
}());
