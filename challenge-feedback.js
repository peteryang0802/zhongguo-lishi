const muteKey = 'challenge-feedback:muted';
const toggleSelector = '[data-challenge-sound-toggle]';
const cues = {
  correct: { text: '耶！', notes: [523.25, 659.25], step: 0.105 },
  flower: { text: '做得真棒！送你一朵花。', notes: [523.25, 659.25, 783.99, 1046.5], step: 0.15 },
};

function savedMute() {
  try { return localStorage.getItem(muteKey) === 'true'; } catch { return false; }
}

export function createChallengeFeedback(root) {
  const controller = new AbortController();
  const { signal } = controller;
  const synth = globalThis.speechSynthesis;
  const AudioEngine = globalThis.AudioContext || globalThis.webkitAudioContext;
  let context;
  let active;
  let muted = savedMute();

  // Start loading the browser's voice list before the child submits an answer.
  synth?.getVoices();

  function stop() {
    const sound = active;
    if (!sound) return;
    active = null;
    clearTimeout(sound.timer);
    sound.gain?.disconnect();
    if (sound.utterance) synth.cancel();
  }

  function prepareAudio() {
    if (!AudioEngine) return Promise.resolve(false);
    try {
      context ??= new AudioEngine();
      if (context.state === 'running') return Promise.resolve(true);
      return context.resume().then(() => true, () => false);
    } catch {
      return Promise.resolve(false);
    }
  }

  function play(cue) {
    if (muted || document.hidden || signal.aborted) return;
    stop();
    const sound = active = {};
    const ready = prepareAudio();
    function fallback() {
      if (active !== sound || sound.fallback) return;
      sound.fallback = true;
      clearTimeout(sound.timer);
      if (sound.utterance) {
        sound.utterance = null;
        synth.cancel();
      }
      ready.then(open => {
        if (!open || active !== sound || context.state !== 'running') return;
        const bus = sound.gain = context.createGain();
        bus.gain.value = 0.17;
        bus.connect(context.destination);
        const start = context.currentTime + 0.01;
        cue.notes.forEach((frequency, index) => {
          const time = start + index * cue.step;
          const oscillator = context.createOscillator();
          const envelope = context.createGain();
          oscillator.frequency.value = frequency;
          envelope.gain.setValueAtTime(0.001, time);
          envelope.gain.exponentialRampToValueAtTime(0.65, time + 0.018);
          envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.19);
          oscillator.connect(envelope).connect(bus);
          oscillator.start(time);
          oscillator.stop(time + 0.20);
        });
      }).catch(() => {});
    }

    const localVoices = synth?.getVoices().filter(candidate => candidate.localService) ?? [];
    const voice = localVoices.find(candidate => /^zh[-_]cn$/i.test(candidate.lang))
      ?? localVoices.find(candidate => /^zh(?:[-_]hans|[-_]tw)?$/i.test(candidate.lang));
    if (!voice || !globalThis.SpeechSynthesisUtterance) {
      fallback();
      return;
    }
    const utterance = sound.utterance = new SpeechSynthesisUtterance(cue.text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.volume = 0.62;
    utterance.rate = cue === cues.correct ? 1.12 : 1;
    utterance.onstart = () => clearTimeout(sound.timer);
    utterance.onend = () => { sound.utterance = null; };
    utterance.onerror = fallback;
    sound.timer = setTimeout(fallback, 480);
    try { synth.speak(utterance); } catch { fallback(); }
  }

  function paintToggle(button) {
    button.setAttribute('aria-pressed', String(!muted));
    button.textContent = muted ? '声音关' : '声音开';
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest(toggleSelector);
    if (!button) return;
    muted = !muted;
    try { localStorage.setItem(muteKey, String(muted)); } catch {}
    if (muted) stop();
    root.querySelectorAll(toggleSelector).forEach(paintToggle);
  }, { signal });

  window.addEventListener('storage', (event) => {
    if (event.key !== muteKey && event.key !== null) return;
    muted = savedMute();
    if (muted) stop();
    root.querySelectorAll(toggleSelector).forEach(paintToggle);
  }, { signal });

  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, { signal });

  return {
    soundButton: () => `<button type="button" class="challenge-sound-toggle" data-challenge-sound-toggle aria-label="闯关声音" aria-pressed="${!muted}">${muted ? '声音关' : '声音开'}</button>`,
    correct: () => play(cues.correct),
    flower: () => `<div class="challenge-flower" data-challenge-flower><span class="challenge-flower-bloom" aria-hidden="true">🌸</span><strong>${cues.flower.text}</strong></div>`,
    celebrate() {
      const award = root.querySelector('[data-challenge-flower]');
      if (!award || award.hasAttribute('data-blooming')) return;
      award.setAttribute('data-blooming', '');
      play(cues.flower);
    },
    destroy() {
      controller.abort();
      stop();
      context?.close().catch(() => {});
    },
  };
}
