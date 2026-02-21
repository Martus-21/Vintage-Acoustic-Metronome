// script.js
// Assumes: gsap & Howler are loaded in page
document.addEventListener('DOMContentLoaded', () => {

  // ===== Constants =====
  const MIN_BPM = 40;
  const MAX_BPM = 320;
  const WEIGHT_MIN_BOTTOM = 12;   // px (closest to pivot)
  const WEIGHT_MAX_BOTTOM = 160;  // px (farthest from pivot)

  // ===== State =====
  let bpm = 100;
  let isPlaying = false;
  let beatsPerMeasure = 4;
  let beatCount = 0;
  let tickTimer = null;
  let volumeLevel = 0.8;
  let currentSound = 'click';

  // ===== Elements =====
  const tempoSlider = document.getElementById('tempo');
  const tempoValueEl = document.getElementById('tempoValue');
  const keySelect = document.getElementById('keySignature');
  const volumeSlider = document.getElementById('volume');
  const soundSelect = document.getElementById('soundSelect');
  const themeSelect = document.getElementById('themeSelect');
  const startStopBtn = document.getElementById('startStopBtn');
  const metronomeClick = document.getElementById('metronomeClick');
  const pendulumEl = document.getElementById('pendulum');
  const weightEl = document.getElementById('weight');
  const beatDotsContainer = document.getElementById('beatDots');
  const tempoScale = document.querySelector('.tempo-scale');
  const tempoPointer = document.querySelector('.tempo-pointer');

  // ===== Sounds (Howler) =====
  const sounds = {
    click: new Howl({ src: ['https://actions.google.com/sounds/v1/alarms/beep_short.ogg'] }),
    wood: new Howl({ src: ['https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3'] }),
    beep: new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/instrument_strum.ogg'] }),
    start: new Howl({ src: ['https://actions.google.com/sounds/v1/alarms/winding_alarm_clock.ogg'] })
  };

  document.addEventListener('keydown', (e) => {
  // Prevent default spacebar scrolling
  if (e.code === 'Space') {
    e.preventDefault();
    toggleMetronome();
  }
});  
  // Accent tick: make first beat slightly louder (if you like)
  function playTick(isAccent = false) {
    const s = sounds[currentSound];
    if (!s) return;
    s.volume(Math.min(1, volumeLevel * (isAccent ? 1 : 0.9)));
    s.play();
  }

  // ===== Beat dot helpers =====
  function createDots(count) {
    beatDotsContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div');
      d.className = 'dot';
      beatDotsContainer.appendChild(d);
    }
  }

  function updateDots() {
    const dots = beatDotsContainer.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === (beatCount - 1));
    });
  }

  // ===== Weight mapping & tempo pointer =====
  function moveWeightToBpm(animate = true) {
    // weight bottom is interpolated so that:
    // bpm = MAX_BPM -> bottom = WEIGHT_MIN_BOTTOM (closest to pivot)
    // bpm = MIN_BPM -> bottom = WEIGHT_MAX_BOTTOM (farthest)
    const norm = (bpm - MIN_BPM) / (MAX_BPM - MIN_BPM); // 0..1
    const bottomPx = WEIGHT_MAX_BOTTOM - norm * (WEIGHT_MAX_BOTTOM - WEIGHT_MIN_BOTTOM);

    if (animate) {
      gsap.to(weightEl, { bottom: bottomPx, duration: 0.35, ease: 'power2.out' });
    } else {
      weightEl.style.bottom = `${bottomPx}px`;
    }

    // tempo-pointer (vertical inside .tempo-scale)
    if (tempoPointer && tempoScale) {
      const percent = (bpm - MIN_BPM) / (MAX_BPM - MIN_BPM);
      // pointer top uses CSS percent from top: 0 = top=MAX_BPM, we want top to be inverse
      const topPercent = 100 - (percent * 100);
      gsap.to(tempoPointer, { top: `${topPercent}%`, duration: 0.25, ease: 'power2.out' });
    }
  }

  // ===== Swing animation =====
  function swingOnce() {
    // small two-step swing; alternate left/right by beat parity
    const angle = (beatCount % 2 === 0) ? 16 : -16;
    const halfPeriod = (60 / bpm) / 2; // seconds for half swing
    gsap.to(pendulumEl, { rotation: angle, duration: halfPeriod, ease: 'sine.inOut' });
  }

  // ===== Metronome timing =====
  function startMetronome() {
  // Play start sound once
  if (sounds.start) {
    sounds.start.volume(volumeLevel);
    sounds.start.play();
  }

  stopMetronome(); // clear any previous timer
  const intervalMs = (60 / bpm) * 1000;
  beatCount = 0;
  tickTimer = setInterval(() => {
    beatCount = (beatCount % beatsPerMeasure) + 1;
    playTick(beatCount === 1); // accent on first beat
    updateDots();
    swingOnce();
  }, intervalMs);
}
  function stopMetronome() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    // bring pendulum to center
    gsap.to(pendulumEl, { rotation: 0, duration: 0.18, ease: 'power2.out' });
  }

  function toggleMetronome() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      startStopBtn.textContent = 'Stop';
      metronomeClick.setAttribute('aria-pressed', 'true');
      startMetronome();
    } else {
      startStopBtn.textContent = 'Start';
      metronomeClick.setAttribute('aria-pressed', 'false');
      stopMetronome();
    }
  }

  // ===== UI wiring =====
  tempoSlider.addEventListener('input', (e) => {
    bpm = parseInt(e.target.value, 10);
    tempoValueEl.textContent = bpm;
    moveWeightToBpm(true);
    if (isPlaying) {
      startMetronome(); // restart interval with new speed
      
    }
  });

  keySelect.addEventListener('change', (e) => {
    beatsPerMeasure = parseInt(e.target.value, 10);
    createDots(beatsPerMeasure);
  });

  volumeSlider.addEventListener('input', (e) => {
    volumeLevel = parseFloat(e.target.value);
  });

  soundSelect.addEventListener('change', (e) => {
    currentSound = e.target.value;
  });

  themeSelect.addEventListener('change', (e) => {
    document.body.className = e.target.value;
  });

  startStopBtn.addEventListener('click', toggleMetronome);

  // clicking the metronome body toggles too
  metronomeClick.addEventListener('click', (ev) => {
    // Avoid starting/stopping if the user clicked any interactive control inside (if any)
    toggleMetronome();
  });

  // tempo buttons (Italian terms) — set BPM and UI
  document.querySelectorAll('.tempo-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
      const newBpm = parseInt(btn.dataset.bpm, 10);
      if (!isNaN(newBpm)) {
        bpm = newBpm;
        tempoSlider.value = bpm;
        tempoValueEl.textContent = bpm;
        moveWeightToBpm(true);
        if (isPlaying) startMetronome();
      }
    });
  });

  // ===== Initialization =====
  function init() {
    // default state
    bpm = parseInt(tempoSlider.value, 10) || 100;
    tempoValueEl.textContent = bpm;
    beatsPerMeasure = parseInt(keySelect.value, 10) || 4;
    volumeLevel = parseFloat(volumeSlider.value) || 0.8;
    currentSound = soundSelect.value || 'click';
    createDots(beatsPerMeasure);
    moveWeightToBpm(false);
   

    // position tempo pointer initial (set tempo-scale to relative top% first)
    // Ensure tempo-pointer has absolute top calculated in percent
    tempoPointer.style.top = `${100 - ((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM) * 100)}%`;
  }

  init();
});
   
