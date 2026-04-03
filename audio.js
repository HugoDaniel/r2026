/**
 * Synthesized audio for the Revision 2026 demo.
 * Returns a live 32-bin FFT buffer for the renderer.
 */
function s() {
  const audioContext = new AudioContext();
  const secondsPerBeat = 60 / 170;
  const baseTime = audioContext.currentTime + 0.03;
  const lookahead = 1;

  const masterBus = new GainNode(audioContext, { gain: 0.8 });
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;
  analyser.smoothingTimeConstant = 0.7;
  masterBus.connect(analyser);
  analyser.connect(audioContext.destination);

  const fft = new Float32Array(analyser.frequencyBinCount);

  const midiNoteToFrequency = (midiNote) => 440 * 2 ** ((midiNote - 69) / 12);

  const playNote = (
    startTime,
    duration,
    frequency,
    waveType,
    volume,
    lowpassCutoff,
    pitchSlideTarget,
  ) => {
    startTime = Math.max(startTime, audioContext.currentTime + 0.01);

    const oscillator = new OscillatorNode(audioContext, {
      type: waveType,
      frequency,
    });
    const gainNode = new GainNode(audioContext);

    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    if (pitchSlideTarget) {
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        pitchSlideTarget,
        startTime + 0.08,
      );
    }

    if (lowpassCutoff) {
      const lowpassFilter = new BiquadFilterNode(audioContext, {
        type: 'lowpass',
        frequency: lowpassCutoff,
      });
      oscillator.connect(lowpassFilter).connect(gainNode);
    } else {
      oscillator.connect(gainNode);
    }

    gainNode.connect(masterBus);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.01);
  };

  const noiseBuffer = audioContext.createBuffer(1, 16e3, 44e3);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let noiseSampleIndex = noiseData.length; noiseSampleIndex--; ) {
    noiseData[noiseSampleIndex] = Math.random() - 0.5;
  }

  const playNoise = (startTime, duration, volume, cutoff) => {
    startTime = Math.max(startTime, audioContext.currentTime + 0.01);

    const noise = new AudioBufferSourceNode(audioContext, {
      buffer: noiseBuffer,
    });
    const filter = new BiquadFilterNode(audioContext, {
      type: 'highpass',
      frequency: cutoff,
    });
    const gainNode = new GainNode(audioContext);

    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter).connect(gainNode);
    gainNode.connect(masterBus);
    noise.start(startTime);
    noise.stop(startTime + duration + 0.01);
  };

  const events = [];
  const scheduleNote = (
    frequency,
    startTime,
    duration,
    waveType,
    volume,
    lowpassCutoff,
    pitchSlideTarget,
  ) => {
    events.push([
      0,
      baseTime + startTime,
      duration,
      frequency,
      waveType,
      volume,
      lowpassCutoff,
      pitchSlideTarget,
    ]);
  };
  const scheduleNoise = (startTime, duration, volume, cutoff) => {
    events.push([1, baseTime + startTime, duration, volume, cutoff]);
  };

  const sine = 'sine';
  const triangle = 'triangle';
  const sawtooth = 'sawtooth';
  const halfBeat = secondsPerBeat / 2;
  const quarterBeat = secondsPerBeat / 4;
  const arpNotes = [76, 79, 83, 79, 74, 79, 83, 79];
  const bassMidiNotes = [40, 43, 45, 47];
  const accentMidiNotes = [83, 86, 88, 91];
  const melodyPhrases = [
    [64, 67, 69, 67],
    [71, 69, 67, 64],
    [69, 71, 76, 71],
    [67, 64, 67, 69],
  ];

  const scheduleTransitionFill = (beatIndex, volume = 0.05) => {
    const startTime = beatIndex * secondsPerBeat;
    scheduleNote(180, startTime, 3 * secondsPerBeat, sawtooth, volume, 900, 960);
    for (let noiseIndex = 0; noiseIndex < 6; noiseIndex += 1) {
      scheduleNoise(
        startTime + noiseIndex * halfBeat,
        0.08,
        0.02 + noiseIndex / 200,
        2200 + noiseIndex * 900,
      );
    }
  };

  const scheduleAccentRun = (beatIndex, volume, cutoff) => {
    const startTime = beatIndex * secondsPerBeat;
    for (let noteIndex = 0; noteIndex < 4; noteIndex += 1) {
      scheduleNote(
        midiNoteToFrequency(accentMidiNotes[noteIndex]),
        startTime + noteIndex * halfBeat,
        0.06,
        sine,
        volume,
        cutoff,
      );
    }
  };

  const scheduleKickSection = (
    startBeat,
    endBeat,
    step,
    volume,
    downbeatVolume,
  ) => {
    for (let beatIndex = startBeat; beatIndex < endBeat; beatIndex += step) {
      const startTime = beatIndex * secondsPerBeat;
      scheduleNote(
        beatIndex & 3 ? 150 : 170,
        startTime,
        0.2,
        sine,
        beatIndex & 3 ? volume : downbeatVolume,
        0,
        beatIndex & 3 ? 55 : 35,
      );
    }
  };

  const scheduleGrooveSection = (
    startBeat,
    endBeat,
    offbeatVolume,
    bodyVolume,
    toneVolume,
    accentDuration,
    accentVolume,
  ) => {
    for (let beatIndex = startBeat; beatIndex < endBeat; beatIndex += 1) {
      const startTime = beatIndex * secondsPerBeat;
      scheduleNoise(startTime + halfBeat, 0.04, offbeatVolume, 9000);
      if (beatIndex & 1) {
        scheduleNoise(startTime, 0.18, bodyVolume, beatIndex & 2 ? 2400 : 1800);
        scheduleNote(
          beatIndex & 2 ? 260 : 220,
          startTime,
          0.12,
          sine,
          toneVolume,
          1000,
          beatIndex & 2 ? 90 : 120,
        );
      }
      if (!(beatIndex & 31)) {
        scheduleNoise(startTime, accentDuration, accentVolume, 7000);
      }
    }
  };

  const scheduleTickSection = (startTick, endTick, oddVolume, evenVolume) => {
    for (let tickIndex = startTick; tickIndex < endTick; tickIndex += 1) {
      scheduleNoise(
        tickIndex * quarterBeat,
        0.02,
        evenVolume ? (tickIndex & 1 ? oddVolume : evenVolume) : oddVolume,
        tickIndex & 7 ? 7000 : 9000,
      );
    }
  };

  const scheduleArpSection = (
    startTick,
    endTick,
    step,
    volume,
    cutoff,
    skipSyncopation,
  ) => {
    for (let tickIndex = startTick; tickIndex < endTick; tickIndex += step) {
      if (skipSyncopation && (tickIndex & 7) === 6) {
        continue;
      }
      scheduleNote(
        midiNoteToFrequency(arpNotes[((tickIndex >> 1) + (tickIndex >> 5)) & 7]),
        tickIndex * quarterBeat,
        0.08,
        triangle,
        volume,
        cutoff,
      );
    }
  };

  const scheduleBassSection = (
    startBeat,
    sequence,
    volume,
    cutoff,
    maxBeat = Infinity,
    step = 2,
  ) => {
    for (let stepIndex = 0; stepIndex < sequence.length; stepIndex += 1) {
      const bassFrequency = midiNoteToFrequency(
        bassMidiNotes[sequence[stepIndex]],
      );
      for (let subBeat = 0; subBeat < 4; subBeat += step) {
        const beatIndex = startBeat + stepIndex * 4 + subBeat;
        if (beatIndex >= maxBeat) {
          continue;
        }
        scheduleNote(
          bassFrequency,
          beatIndex * secondsPerBeat,
          step < 2 ? 0.25 : 0.5,
          sawtooth,
          volume,
          cutoff,
        );
      }
      if (step > 1) {
        const pickupBeat = startBeat + stepIndex * 4 + 4 - step;
        if (pickupBeat >= maxBeat) {
          continue;
        }
        scheduleNote(
          bassFrequency * 2,
          (pickupBeat + 0.5) * secondsPerBeat,
          0.15,
          sawtooth,
          volume * 0.4,
          cutoff * 0.7,
        );
      }
    }
  };

  const scheduleMelodySection = (startBeat, sequence, waveType, volume) => {
    for (let stepIndex = 0; stepIndex < sequence.length; stepIndex += 1) {
      const melodyPhrase = melodyPhrases[sequence[stepIndex]];
      for (let phraseNoteIndex = 0; phraseNoteIndex < 4; phraseNoteIndex += 1) {
        scheduleNote(
          midiNoteToFrequency(melodyPhrase[phraseNoteIndex]),
          (startBeat + stepIndex * 4 + phraseNoteIndex) * secondsPerBeat,
          phraseNoteIndex < 3 ? 0.2 : 0.35,
          waveType,
          volume,
        );
      }
    }
  };

  scheduleKickSection(0, 16, 2, 0.62, 0.74);
  scheduleKickSection(16, 186, 1, 0.65, 0.78);
  scheduleKickSection(188, 224, 2, 0.58, 0.58);
  scheduleKickSection(224, 248, 1, 0.62, 0.74);
  scheduleKickSection(248, 256, 2, 0.54, 0.54);

  scheduleTransitionFill(28);
  scheduleTransitionFill(76);
  scheduleTransitionFill(132);
  scheduleTransitionFill(184);
  scheduleTransitionFill(240, 0.045);

  scheduleGrooveSection(32, 72, 0.08, 0.24, 0.18, 0.35, 0.18);
  scheduleGrooveSection(80, 132, 0.09, 0.26, 0.2, 0.35, 0.18);
  scheduleGrooveSection(140, 186, 0.09, 0.26, 0.2, 0.35, 0.18);
  scheduleGrooveSection(224, 248, 0.075, 0.2, 0.15, 0.28, 0.14);

  for (let beatIndex = 44; beatIndex < 256; beatIndex += 16) {
    scheduleAccentRun(
      beatIndex,
      beatIndex < 132 ? 0.04 : beatIndex < 188 ? 0.05 : beatIndex < 224 ? 0.032 : 0.04,
      beatIndex < 188 ? 2600 : 2200,
    );
  }

  scheduleTickSection(64, 96, 0.005);
  scheduleTickSection(96, 128, 0.01);
  scheduleTickSection(128, 288, 0.018, 0.009);
  scheduleTickSection(320, 528, 0.03, 0.015);
  scheduleTickSection(560, 744, 0.034, 0.017);
  scheduleTickSection(752, 896, 0.012, 0.006);
  scheduleTickSection(896, 960, 0.022, 0.011);
  scheduleTickSection(960, 1024, 0.014, 0.007);

  scheduleArpSection(320, 432, 2, 0.05, 1600);
  scheduleArpSection(432, 448, 2, 0.055, 1600);
  scheduleArpSection(448, 528, 2, 0.055, 1800);
  scheduleArpSection(560, 640, 2, 0.058, 2000);
  scheduleArpSection(640, 752, 2, 0.07, 2400, true);
  scheduleArpSection(752, 896, 4, 0.04, 1300);
  scheduleArpSection(896, 960, 2, 0.055, 1800);
  scheduleArpSection(960, 992, 4, 0.042, 1200);
  scheduleArpSection(992, 1024, 4, 0.036, 1200);

  scheduleBassSection(32, '000011', 0.4, 600, Infinity, 4);
  scheduleBassSection(56, '1100', 0.4, 750);
  scheduleBassSection(80, '1122', 0.36, 900);
  scheduleBassSection(96, '00331122', 0.36, 1050, Infinity, 1);
  scheduleBassSection(140, '1122', 0.38, 1150);
  scheduleBassSection(156, '00331122', 0.38, 1350, 186, 1);
  scheduleBassSection(224, '0123', 0.32, 950);

  scheduleMelodySection(64, '01', sine, 0.25);
  scheduleMelodySection(80, '0101', sine, 0.25);
  scheduleMelodySection(96, '01012323', triangle, 0.2);
  scheduleMelodySection(152, '23232301', triangle, 0.21);
  scheduleMelodySection(188, '01010101', triangle, 0.19);
  scheduleMelodySection(240, '23', triangle, 0.18);
  scheduleMelodySection(248, '01', sine, 0.2);

  // intro atmosphere: filtered arps build anticipation
  scheduleArpSection(0, 64, 8, 0.04, 900);
  scheduleArpSection(64, 128, 4, 0.05, 1200);

  // bass fills bridge transition gaps
  scheduleBassSection(72, '10', 0.34, 600);
  scheduleBassSection(128, '32', 0.34, 900);

  // melody fills bridge transitional gaps
  scheduleMelodySection(72, '23', triangle, 0.18);
  scheduleMelodySection(132, '01', sine, 0.18);

  // accent sparkle at zoom transition (grid→tangram, beats 133-137)
  scheduleAccentRun(136, 0.05, 2400);

  // bass grounds the breakdown — step=2 feeds consistent FFT for dissolution
  scheduleBassSection(188, '012301230', 0.28, 750, Infinity, 2);

  events.sort((left, right) => left[1] - right[1]);

  let eventIndex = 0;
  const queueAhead = () => {
    const horizon = audioContext.currentTime + lookahead;
    for (; eventIndex < events.length && events[eventIndex][1] < horizon; eventIndex += 1) {
      const event = events[eventIndex];
      if (event[0]) {
        playNoise(event[1], event[2], event[3], event[4]);
      } else {
        playNote(
          event[1],
          event[2],
          event[3],
          event[4],
          event[5],
          event[6],
          event[7],
        );
      }
    }
  };

  queueAhead();
  setInterval(queueAhead, 100);

  (function poll() {
    analyser.getFloatFrequencyData(fft);
    for (let index = 0; index < fft.length; index += 1) {
      fft[index] = Math.max(0, (fft[index] + 100) / 100);
    }
    requestAnimationFrame(poll);
  })();

  return fft;
}

function _sa() {
  return s();
}
