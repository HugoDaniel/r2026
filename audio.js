/**
 * Synthesized audio for the Revision 2026 demo.
 *
 * TEMPO: 170 BPM
 *
 * STRUCTURE (in beats):
 *   0–31     Intro — kick (half-time) + filtered arps fading in
 *   32–79    Build-up — groove, bass, melody enter
 *   80–131   Main section — full groove, denser bass & melody
 *   132–187  Peak — loudest accents, busiest bass lines
 *   188–223  Breakdown — kick drops to half-time, bass holds it together
 *   224–255  Outro — groove returns softer, melody winds down
 *
 * INSTRUMENTS:
 *   Kick        — sine wave that pitch-slides down (like a TR-808 kick)
 *   Groove      — hi-hat (noise) + snare body (noise) + snare tone (sine)
 *   Tick        — very short noise bursts, like a shaker or closed hi-hat
 *   Arp         — triangle wave cycling through a note pattern
 *   Bass        — sawtooth wave with a lowpass filter
 *   Melody      — sine or triangle wave playing 4-note phrases
 *   Accents     — short sine bleeps in the high register
 *   Fills       — sawtooth sweep + rising noise hits at transitions
 *
 * WAVE TYPES (the "timbre" or tone color of each sound):
 *   sine      — pure, smooth tone (kick, snare tone, accents)
 *   triangle  — softer, slightly hollow (arp, some melodies)
 *   sawtooth  — bright, buzzy (bass, transition fills)
 *
 * MUSICAL SCALES:
 *   Arp pattern:   E5 G5 B5 G5 D5 G5 B5 G5  (cycles through these 8 notes)
 *   Bass notes:    E2 G2 A2 B2              (indexed as 0 1 2 3)
 *   Accent notes:  B5 D6 E6 G6
 *   Melody phrases (indexed as 0 1 2 3):
 *     0: E4 G4 A4 G4
 *     1: B4 A4 G4 E4
 *     2: A4 B4 E5 B4
 *     3: G4 E4 G4 A4
 *
 * HOW TO EDIT:
 *   - Volume values range from 0.0 (silent) to ~1.0 (max).
 *   - Cutoff values (in Hz) control the filter brightness — lower = duller.
 *   - Beat numbers are the main timeline unit. 4 beats = 1 bar at 170 BPM.
 *   - Ticks are quarter-beats (4 ticks = 1 beat).
 *   - Bass/melody "sequence" strings index into the note arrays above.
 *     e.g. '0123' plays bass notes E2, G2, A2, B2 — each held for 4 beats.
 *
 * Returns a 32-element array to the visuals. Only element [0] is active
 * (low frequencies, ~0–750 Hz — mostly kick and bass energy).
 */
function s() {
  const audioContext = new AudioContext();
  // ── Tempo ──
  const secondsPerBeat = 60 / 170; // 170 BPM
  const baseTime = audioContext.currentTime + 0.03;
  const lookahead = 1; // schedule notes 1 second ahead for smooth playback

  // ── Master volume & frequency analyser (feeds visuals) ──
  const masterBus = new GainNode(audioContext, { gain: 0.8 }); // overall volume
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;
  analyser.smoothingTimeConstant = 0.7; // 0 = jumpy, 1 = very smooth
  masterBus.connect(analyser);
  analyser.connect(audioContext.destination);

  const fft = new Float32Array(analyser.frequencyBinCount); // 32 slots for visuals

  // Convert MIDI note number to frequency (e.g. 69 = A4 = 440 Hz)
  const midiNoteToFrequency = (midiNote) => 440 * 2 ** ((midiNote - 69) / 12);

  // ════════════════════════════════════════════════════════════
  // SOUND ENGINES — how each note or noise burst is produced
  // ════════════════════════════════════════════════════════════

  /**
   * Play a pitched note.
   *   startTime       — when to start (in seconds)
   *   duration        — how long the note rings (in seconds)
   *   frequency       — pitch in Hz
   *   waveType        — 'sine', 'triangle', or 'sawtooth'
   *   volume          — loudness (0.0–1.0)
   *   lowpassCutoff   — filter: only let frequencies below this through (Hz). 0 = no filter.
   *   pitchSlideTarget — if set, the pitch slides down to this Hz (used for kicks)
   */
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

    // Volume envelope: start at full volume, fade to silence
    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    // Pitch slide (used for kick drums — starts high, drops fast)
    if (pitchSlideTarget) {
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        pitchSlideTarget,
        startTime + 0.08,
      );
    }

    // Lowpass filter — removes harsh high frequencies
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

  // Pre-generated white noise (used for hi-hats, snares, shakers)
  const noiseBuffer = audioContext.createBuffer(1, 16e3, 44e3);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let noiseSampleIndex = noiseData.length; noiseSampleIndex--; ) {
    noiseData[noiseSampleIndex] = Math.random() - 0.5;
  }

  /**
   * Play a noise burst (hi-hats, snares, shakers).
   *   startTime — when to start (seconds)
   *   duration  — how long the noise rings (seconds)
   *   volume    — loudness (0.0–1.0)
   *   cutoff    — highpass filter: only let frequencies ABOVE this through (Hz)
   *               Higher cutoff = thinner/brighter sound (hi-hat).
   *               Lower cutoff = fuller/fatter sound (snare body).
   */
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

  // ════════════════════════════════════════════════════════════
  // SCHEDULER — collects all notes/noises, sorts them by time,
  // and feeds them to the sound engines just before they're due
  // ════════════════════════════════════════════════════════════

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
      0, // type 0 = pitched note
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
    events.push([1, baseTime + startTime, duration, volume, cutoff]); // type 1 = noise
  };

  // ════════════════════════════════════════════════════════════
  // MUSICAL DATA — scales, patterns, and wave type shortcuts
  // ════════════════════════════════════════════════════════════

  const sine = 'sine';
  const triangle = 'triangle';
  const sawtooth = 'sawtooth';
  const halfBeat = secondsPerBeat / 2;
  const quarterBeat = secondsPerBeat / 4;

  // Arp pattern: E5 G5 B5 G5 D5 G5 B5 G5
  const arpNotes = [76, 79, 83, 79, 74, 79, 83, 79];
  // Bass notes: E2=0, G2=1, A2=2, B2=3
  const bassMidiNotes = [28, 31, 33, 35];
  // Accent notes: B5, D6, E6, G6
  const accentMidiNotes = [83, 86, 88, 91];
  // Melody phrases (4 notes each, one per beat):
  //   0: E4 G4 A4 G4     1: B4 A4 G4 E4
  //   2: A4 B4 E5 B4     3: G4 E4 G4 A4
  const melodyPhrases = [
    [64, 67, 69, 67],
    [71, 69, 67, 64],
    [69, 71, 76, 71],
    [67, 64, 67, 69],
  ];

  // ════════════════════════════════════════════════════════════
  // PATTERN BUILDERS — reusable functions for each instrument
  // ════════════════════════════════════════════════════════════

  /**
   * Transition fill: a buzzy sawtooth sweep + 6 rising noise hits.
   * Placed at section boundaries to glue parts together.
   *   beatIndex — which beat to start on
   *   volume    — loudness of the sweep (default 0.05)
   */
  const scheduleTransitionFill = (beatIndex, volume = 0.05) => {
    const startTime = beatIndex * secondsPerBeat;
    // Low sawtooth sweep that slides up slightly (180 Hz → 960 Hz pitch target)
    scheduleNote(180, startTime, 3 * secondsPerBeat, sawtooth, volume, 900, 960);
    // 6 noise hits, each brighter than the last (building tension)
    for (let noiseIndex = 0; noiseIndex < 6; noiseIndex += 1) {
      scheduleNoise(
        startTime + noiseIndex * halfBeat,
        0.08,
        0.02 + noiseIndex / 200, // slightly louder each time
        2200 + noiseIndex * 900,  // brighter each time
      );
    }
  };

  /**
   * Accent run: 4 quick high-pitched bleeps (B5 D6 E6 G6), one every half-beat.
   *   beatIndex — which beat to start on
   *   volume    — loudness
   *   cutoff    — lowpass filter brightness (Hz)
   */
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

  /**
   * Kick drum section: sine wave that pitch-slides down (like a 808 kick).
   * On the downbeat (beat 1 of every 4) the pitch starts higher and the
   * volume is louder, giving the "four-on-the-floor" pulse.
   *   startBeat      — first beat
   *   endBeat        — last beat (exclusive)
   *   step           — 1 = every beat, 2 = half-time (every other beat)
   *   volume         — off-beat kick volume
   *   downbeatVolume — beat-1 kick volume (usually louder)
   */
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
        beatIndex & 3 ? 150 : 170,       // downbeat starts higher (170 Hz vs 150 Hz)
        startTime,
        0.2,
        sine,
        beatIndex & 3 ? volume : downbeatVolume,
        0,
        beatIndex & 3 ? 55 : 35,         // downbeat slides lower (deeper thump)
      );
    }
  };

  /**
   * Groove section: the hi-hat + snare pattern that gives the track its rhythm.
   *   startBeat      — first beat
   *   endBeat        — last beat (exclusive)
   *   offbeatVolume  — hi-hat volume (plays on the "and" of every beat)
   *   bodyVolume     — snare body volume (noise, plays on beats 2 and 4)
   *   toneVolume     — snare tone volume (pitched sine, plays with body)
   *   accentDuration — crash/accent length (plays every 32 beats)
   *   accentVolume   — crash/accent volume
   */
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
      // Off-beat hi-hat (the "and")
      scheduleNoise(startTime + halfBeat, 0.04, offbeatVolume, 9000);
      // Snare on odd beats (beats 2, 4, 6, 8...)
      if (beatIndex & 1) {
        scheduleNoise(startTime, 0.18, bodyVolume, beatIndex & 2 ? 2400 : 1800);
        scheduleNote(
          beatIndex & 2 ? 260 : 220, // alternating snare pitch
          startTime,
          0.12,
          sine,
          toneVolume,
          1000,
          beatIndex & 2 ? 90 : 120,
        );
      }
      // Accent crash every 32 beats
      if (!(beatIndex & 31)) {
        scheduleNoise(startTime, accentDuration, accentVolume, 7000);
      }
    }
  };

  /**
   * Tick section: very short noise bursts, like a shaker or closed hi-hat.
   * Runs at quarter-beat resolution (16th notes).
   *   startTick  — first quarter-beat
   *   endTick    — last quarter-beat (exclusive)
   *   oddVolume  — volume on odd ticks
   *   evenVolume — volume on even ticks (if omitted, all ticks use oddVolume)
   */
  const scheduleTickSection = (startTick, endTick, oddVolume, evenVolume) => {
    for (let tickIndex = startTick; tickIndex < endTick; tickIndex += 1) {
      scheduleNoise(
        tickIndex * quarterBeat,
        0.02,
        evenVolume ? (tickIndex & 1 ? oddVolume : evenVolume) : oddVolume,
        tickIndex & 7 ? 7000 : 9000, // every 8th tick is brighter
      );
    }
  };

  /**
   * Arp section: triangle wave cycling through the arp note pattern.
   * The pattern shifts every 32 ticks to keep it evolving.
   *   startTick       — first quarter-beat
   *   endTick         — last quarter-beat (exclusive)
   *   step            — 2 = 8th notes, 4 = quarter notes
   *   volume          — loudness
   *   cutoff          — lowpass filter (Hz) — lower = more muffled
   *   skipSyncopation — if true, skips the 7th note in each group of 8
   *                     (creates a rhythmic gap / swing feel)
   */
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

  /**
   * Bass section: sawtooth wave playing from the bass note palette.
   *   startBeat — first beat
   *   sequence  — string of digits: '0'=E2, '1'=G2, '2'=A2, '3'=B2
   *               Each digit holds for 4 beats (1 bar).
   *               e.g. '0123' = E2 for 4 beats, G2 for 4, A2 for 4, B2 for 4.
   *   volume    — loudness
   *   cutoff    — lowpass filter (Hz) — controls how bright/buzzy the bass is
   *   maxBeat   — stop scheduling past this beat (default: no limit)
   *   step      — how often the note re-triggers within each bar:
   *               1 = every beat (16th-note feel), 2 = every 2 beats,
   *               4 = once per bar (sustained). Also adds a pickup note
   *               (octave up, quieter) near the end of each bar if step > 1.
   */
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
      // Pickup note: an octave-up ghost note before the next bar
      if (step > 1) {
        const pickupBeat = startBeat + stepIndex * 4 + 4 - step;
        if (pickupBeat >= maxBeat) {
          continue;
        }
        scheduleNote(
          bassFrequency * 2,         // one octave up
          (pickupBeat + 0.5) * secondsPerBeat,
          0.15,
          sawtooth,
          volume * 0.4,              // quieter
          cutoff * 0.7,              // darker
        );
      }
    }
  };

  /**
   * Melody section: plays 4-note phrases from the melody palette.
   *   startBeat — first beat
   *   sequence  — string of phrase indices, e.g. '0123'
   *               Each phrase plays over 4 beats (1 note per beat).
   *               The last note of each phrase rings slightly longer.
   *   waveType  — 'sine' (warm) or 'triangle' (hollow)
   *   volume    — loudness
   */
  const scheduleMelodySection = (startBeat, sequence, waveType, volume) => {
    for (let stepIndex = 0; stepIndex < sequence.length; stepIndex += 1) {
      const melodyPhrase = melodyPhrases[sequence[stepIndex]];
      for (let phraseNoteIndex = 0; phraseNoteIndex < 4; phraseNoteIndex += 1) {
        scheduleNote(
          midiNoteToFrequency(melodyPhrase[phraseNoteIndex]),
          (startBeat + stepIndex * 4 + phraseNoteIndex) * secondsPerBeat,
          phraseNoteIndex < 3 ? 0.2 : 0.35, // last note rings longer
          waveType,
          volume,
        );
      }
    }
  };

  // ════════════════════════════════════════════════════════════
  // ARRANGEMENT — the timeline of the track
  // Beat numbers: 4 beats = 1 bar. At 170 BPM, 1 beat ≈ 0.35s.
  // ════════════════════════════════════════════════════════════

  // ── Kick drum ──
  scheduleKickSection(0, 16, 2, 0.62, 0.74);      // intro: half-time kick
  scheduleKickSection(16, 186, 1, 0.65, 0.78);     // main: full four-on-the-floor
  scheduleKickSection(188, 224, 2, 0.58, 0.58);    // breakdown: half-time, quieter
  scheduleKickSection(224, 248, 1, 0.62, 0.74);    // outro: full kick returns
  scheduleKickSection(248, 256, 2, 0.54, 0.54);    // ending: fade to half-time

  // ── Transition fills (at section boundaries) ──
  scheduleTransitionFill(28);                       // intro → build-up
  scheduleTransitionFill(76);                       // build-up midpoint
  scheduleTransitionFill(132);                      // main → peak
  scheduleTransitionFill(184);                      // peak → breakdown
  scheduleTransitionFill(240, 0.045);               // outro (slightly quieter)

  // ── Groove (hi-hat + snare) ──
  scheduleGrooveSection(32, 72, 0.08, 0.24, 0.18, 0.35, 0.18);   // build-up
  scheduleGrooveSection(80, 132, 0.09, 0.26, 0.2, 0.35, 0.18);   // main
  scheduleGrooveSection(140, 186, 0.09, 0.26, 0.2, 0.35, 0.18);  // peak
  scheduleGrooveSection(224, 248, 0.075, 0.2, 0.15, 0.28, 0.14); // outro (softer)

  // ── Accent bleeps (every 16 beats from beat 44 onward) ──
  for (let beatIndex = 44; beatIndex < 256; beatIndex += 16) {
    scheduleAccentRun(
      beatIndex,
      beatIndex < 132 ? 0.04 : beatIndex < 188 ? 0.05 : beatIndex < 224 ? 0.032 : 0.04,
      beatIndex < 188 ? 2600 : 2200, // brighter during main, darker in breakdown
    );
  }

  // ── Ticks / shaker (quarter-beat resolution) ──
  scheduleTickSection(64, 96, 0.005);               // barely audible at first
  scheduleTickSection(96, 128, 0.01);               // getting louder
  scheduleTickSection(128, 288, 0.018, 0.009);      // main level
  scheduleTickSection(320, 528, 0.03, 0.015);       // peak level
  scheduleTickSection(560, 744, 0.034, 0.017);      // loudest
  scheduleTickSection(752, 896, 0.012, 0.006);      // pulled back
  scheduleTickSection(896, 960, 0.022, 0.011);      // returns
  scheduleTickSection(960, 1024, 0.014, 0.007);     // fading out

  // ── Arp (quarter-beat resolution) ──
  scheduleArpSection(320, 432, 2, 0.05, 1600);      // enters muffled
  scheduleArpSection(432, 448, 2, 0.055, 1600);     // slightly louder
  scheduleArpSection(448, 528, 2, 0.055, 1800);     // brighter
  scheduleArpSection(560, 640, 2, 0.058, 2000);     // opening up
  scheduleArpSection(640, 752, 2, 0.07, 2400, true); // brightest, with swing gaps
  scheduleArpSection(752, 896, 4, 0.04, 1300);      // thins out to quarter notes
  scheduleArpSection(896, 960, 2, 0.055, 1800);     // picks back up
  scheduleArpSection(960, 992, 4, 0.042, 1200);     // slowing down
  scheduleArpSection(992, 1024, 4, 0.036, 1200);    // fading out

  // ── Bass ──
  //   Sequence digits: 0=E2, 1=G2, 2=A2, 3=B2. Each digit = 4 beats (1 bar).
  //   step: 4=whole notes, 2=half notes, 1=quarter notes (busier).
  scheduleBassSection(32, '000011', 0.4, 600, Infinity, 4);       // intro: sparse E2, then G2
  scheduleBassSection(56, '1100', 0.4, 750);                      // build-up: G2 → E2
  scheduleBassSection(80, '1122', 0.36, 900);                     // main: G2 → A2
  scheduleBassSection(96, '00331122', 0.36, 1050, Infinity, 1);   // busy: quarter-note pulse
  scheduleBassSection(140, '1122', 0.38, 1150);                   // peak: G2 → A2
  scheduleBassSection(156, '00331122', 0.38, 1350, 186, 1);       // peak: busiest, brightest
  scheduleBassSection(224, '0123', 0.32, 950);                    // outro: walks through all 4

  // ── Melody ──
  //   Sequence digits index the 4 phrases: 0 1 2 3. Each phrase = 4 beats.
  scheduleMelodySection(64, '01', sine, 0.25);                    // enters with phrases 0+1
  scheduleMelodySection(80, '0101', sine, 0.25);                  // repeats 0+1
  scheduleMelodySection(96, '01012323', triangle, 0.2);           // full cycle, triangle tone
  scheduleMelodySection(152, '23232301', triangle, 0.21);         // reversed order
  scheduleMelodySection(188, '01010101', triangle, 0.19);         // breakdown: steady 0+1
  scheduleMelodySection(240, '23', triangle, 0.18);               // outro: just phrases 2+3
  scheduleMelodySection(248, '01', sine, 0.2);                    // closing: back to sine

  // ── Extra fills & bridges ──

  // Intro atmosphere: filtered arps build anticipation
  scheduleArpSection(0, 64, 8, 0.04, 900);          // very sparse, very muffled
  scheduleArpSection(64, 128, 4, 0.05, 1200);       // slightly denser

  // Bass fills bridge transition gaps
  scheduleBassSection(72, '10', 0.34, 600);          // G2 → E2 bridge
  scheduleBassSection(128, '32', 0.34, 900);         // B2 → A2 bridge

  // Melody fills bridge transitional gaps
  scheduleMelodySection(72, '23', triangle, 0.18);   // phrases 2+3
  scheduleMelodySection(132, '01', sine, 0.18);      // phrases 0+1

  // Accent sparkle at zoom transition (beats 133–137)
  scheduleAccentRun(136, 0.05, 2400);

  // Bass grounds the breakdown — steady pulse for the visuals
  scheduleBassSection(188, '012301230', 0.28, 750, Infinity, 2);

  // ════════════════════════════════════════════════════════════
  // PLAYBACK ENGINE — sorts events and plays them on time
  // ════════════════════════════════════════════════════════════

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
  setInterval(queueAhead, 100); // check for new notes to play every 100ms

  // ════════════════════════════════════════════════════════════
  // FFT OUTPUT — feeds frequency data to the visuals every frame.
  // Only bin [0] is kept (low frequencies: kick + bass energy).
  // ════════════════════════════════════════════════════════════
  (function poll() {
    analyser.getFloatFrequencyData(fft);
    fft[0] = Math.max(0, (fft[0] + 100) / 100); // normalize to 0.0–1.0
    for (let index = 1; index < fft.length; index += 1) {
      fft[index] = 0;
    }
    requestAnimationFrame(poll);
  })();

  return fft;
}

function _sa() {
  return s();
}
