
type Note = {
    note: number | "---" | 'cont',
    fx?: {
        pulseWidth?: number,
        glide?: number
    },
    vel?: number
}
type Drum = {
    drum: "---" | 'KCK' | 'NSS' | 'SNR'
    vel?: number
}

type Slot = Note | Drum

const A0 = -12;
const A0F = 55;

const PatternSize = 64;

function textRepr(slot: Slot) {
    function hex(v: number) { return Math.floor(v * 255).toString(16).toUpperCase().padStart(2,'0'); }
    function noteName(v: number | "---" | "cont") {
        switch (v) {
            case "---":
                return "---";
            case "cont":
                return "&nbsp;&nbsp;&nbsp;";
            default:
                return ['A-', 'A#', 'B-', 'C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#'][(v - A0) % 12] + Math.floor((v - A0) / 12)
        }
    }
    if ("drum" in slot) {
        let string = slot.drum;
        if (slot.vel) string +=" v" + hex(slot.vel);
        return string;
    } else {
        let string = noteName(slot.note);
        if (slot.fx && slot.fx.pulseWidth) string += " w" +hex(slot.fx.pulseWidth);
        if (slot.fx && slot.fx.glide) string +=" g" + hex(slot.fx.glide);
        if (slot.vel) string += " v" + hex(slot.vel);
        return string;
    }
}

function fill<T>(count: number, fn: (x: number) => T): T[] {
    return new Array(count).fill(undefined).map((x,i) => fn(i));
}

function choose<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
}

function rndInt(max: number): number {
    return Math.floor(Math.random() * max);
}

type Pattern = Slot[];

const music = {
    scales: {
        major:[0,2,3,5,7,8,10],
        minor:[0,2,4,5,7,9,11]
    },
    progressions: [
        [1,1,1,1,6,6,6,6,4,4,4,4,3,3,5,5],
        [1,1,1,1,6,6,6,6,1,1,1,1,6,6,6,6],
        [4,4,4,4,5,5,5,5,1,1,1,1,1,1,3,3],
        [1,1,6,6,4,4,5,5,1,1,6,6,3,3,5,5],
        [5,5,4,4,1,1,1,1,5,5,6,6,1,1,1,1],
        [6,6,6,6,5,5,5,5,4,4,4,4,5,5,5,5],
        [1,1,1,1,3,3,3,3,4,4,4,4,5,5,5,5],
        [6,6,6,6,4,4,4,4,1,1,1,1,1,1,5,5],
        [1,1,1,1,1,1,1,1,4,4,4,4,4,4,4,4]
    ],
    chordTypes: {
        triad: [0,2,4],
        single: [0]
    }
};

type Key = number & {"keyType": true}



type Progression = number[];
type Scale = number[];

const Generators = {
    arp: (progression: Progression, key: Key, scale: Scale) => {

        const octave = choose([0,12,24]);
        const offset = choose([0,1,2]);
        const pwOffset = Math.floor(Math.random() * 8) * 2;
        const pwCycle = choose([4,5,6,8,12,16]);
        return fill(PatternSize, i => {
            const progIndex = Math.floor(i / 4);
            const chordNumber = progression[progIndex];
            const chord = music.chordTypes.triad.map(noteIndex => key + scale[(chordNumber - 1 + noteIndex) % scale.length]);
            return {
                note: chord[(i + offset + choose([0, 0, 0, 1, 2])) % chord.length] + octave + choose([0,12]),
                fx: {
                    pulseWidth: ((pwOffset + i) % pwCycle) / (pwCycle + 1)
                }
            } as Slot;
        })
    },
    bass: (progression: Progression, key: Key, scale: Scale) => fill(PatternSize, i => {
        const progIndex = Math.floor(i / 4);
        const chordNumber = progression[progIndex];
        const chord = music.chordTypes.single.map(noteIndex => key + scale[(chordNumber - 1 + noteIndex) % scale.length]);
        return {note: i % 2 === 1 ? 'cont' : chord[0] + (Math.floor(i / 2) % 2) * 12 - 12, fx: {pulseWidth: 0}} as Slot;
    }),
    bass2: (progression: Progression, key: Key, scale: Scale) => fill(PatternSize, i => {
        const progIndex = Math.floor(i / 4);
        const chordNumber = progression[progIndex];
        const chord = music.chordTypes.single.map(noteIndex => key + scale[(chordNumber - 1 + noteIndex) % scale.length]);
        return {note: i % 8 === 0 ? chord[0] - 12: 'cont', vel: 2, fx: {pulseWidth: Math.random()}} as Slot;
        //return {note: i % 2 === 1 ? 'cont' : chord[0] + (Math.floor(i / 2) % 2) * 12 - 12} as Slot;
    }),
    melody1: (progression: Progression, key: Key, scale: Scale) => {
        const slow = Math.random() < 0.5;
        const pwmMod = Math.random() < 0.5;
        let pwmAmount = Math.random() * 0.5;

        const pattern: Slot[] = [];
        let current = (choose(music.chordTypes.triad) - 1) + scale.length * choose([2, 3, 4]);
        for (let i = 0; i < PatternSize; i++) {
            if (Math.random() < 0.5) {
                pwmAmount +=0.05;
            } else {
                pwmAmount -=0.05;
            }

            if (pwmAmount > 0.7) {
                pwmAmount -=0.05;
            } else if (pwmAmount < 0.1) {
                pwmAmount +=0.05;
            }

            if (slow && i % 2 === 1) {
                pattern.push({note: "cont", fx: {pulseWidth: pwmMod ? pwmAmount : 0}});
                continue;
            }
            if (Math.random() < (0.1 + 0.4 * (1 - i % 2))) {
                pattern.push({note: "cont", fx: {pulseWidth: pwmMod ? pwmAmount : 0}});
                continue;
            }

            if (current > 10 && Math.random() < 0.5) {
                current--;
            } else if (current < 32 && Math.random() < 0.5) {
                current++;
            } else if (current > 15 && Math.random() < 0.2) {
                current -= choose([2,4,7]);
            } else if (current < 25 && Math.random() < 0.2) {
                current += choose([2,4,7]);
            }
            const progIndex = Math.floor(i / 4);
            const chordNumber = progression[progIndex];
            const chord = music.chordTypes.triad.map(noteIndex => (chordNumber - 1 + noteIndex) % scale.length);

            if (Math.random() < 0.5 && !chord.includes(current % scale.length)) {
                if (Math.random() < 0.5) current--; else current++;
            }


            pattern.push({
                note: key + scale[current % scale.length] + Math.floor(current / scale.length) * 12,
                fx: {
                    glide: Math.random() < 0.2 ? choose([0.1,0.2,0.5,0.7]) : 0,
                    pulseWidth: pwmMod ? pwmAmount : 0
                }});

        }
        return pattern;
    },
    empty: () => fill(PatternSize, _ => ({note: '---'} as Slot)),
    drum: () => fill(PatternSize, i => ({note: 0, drum: i % 8 === 0 ? 'KCK' : i % 8 === 4 ? 'SNR' : (i % 2 === 0 && Math.random() < 0.2) ? 'KCK' : (Math.random() < 0.05) ? choose(['KCK', 'SNR']) : 'NSS', vel: 0.6 + 0.2 * (1-(i % 2)) } as Slot))
};


function createPatternDisplay(display: HTMLElement) {

    function setPatterns(newPats: Pattern[]) {
        display.innerHTML = "";
        function add(pattern: Pattern, index: number) {
            const pDisplay = document.createElement("code");
            pDisplay.innerHTML =
                "<h3>" + (index === 4 ? "*" : "⎍") + (index + 1) + "</h3>" +
                pattern.map((x, i) => "<div class='note' data-index='" + i + "'>" + textRepr(x) + "</div>").join("");

            display.append(pDisplay);
        }
        newPats.forEach((p, i) => add(p, i))
    }

    const patternDisplayStyles = document.createElement("style");
    patternDisplayStyles.setAttribute("type", "text/css");
    document.body.append(patternDisplayStyles);
    const css = patternDisplayStyles.sheet as CSSStyleSheet;

    function highlightRow(index: number) {
        if (css.rules.length > 0) {
            css.deleteRule(0);
        }
        css.insertRule(`.note[data-index='${index}'] { background-color: #339933; color: white; font-weight: bold }`)
    }

    return {
        setPatterns,
        highlightRow
    };
}

type Synth<T> = { play: (note: T) => void}

function stereoPanner(ctx: AudioContext, pan: number): PannerNode {
    return new PannerNode(ctx, {panningModel: "equalpower", positionX: pan, positionY: 0, positionZ: 0.5});
}

function SquareSynth(ctx: AudioContext, pan: number = 0): Synth<Note> {
    const set = (a: AudioParam, v: number) => {a.cancelScheduledValues(ctx.currentTime); a.setValueAtTime(v, ctx.currentTime); };
    const towards = (a: AudioParam, v: number, t: number) => {a.setTargetAtTime(t, ctx.currentTime, t)};
    const slide = (a: AudioParam, v: number, t: number) => {a.cancelScheduledValues(ctx.currentTime); a.setTargetAtTime(v,ctx.currentTime, t)};

    const wavetableTrigger = new OscillatorNode(ctx, {type: "sawtooth"}),
          pulseWavetable = new WaveShaperNode(ctx, {curve:new Float32Array(256).fill(-1,0,128).fill(1,128,256)}),
          alwaysOneWavetable = new WaveShaperNode(ctx, {curve: new Float32Array(2).fill(1,0,2)}),
          wavetableOffsetGain = new GainNode(ctx, {gain: 0.0}),
          pulseOutputGain = new GainNode(ctx, {gain:0.0}),
          outputPanner = stereoPanner(ctx, pan);
    wavetableTrigger.start();
    wavetableTrigger.connect(pulseWavetable);
    wavetableTrigger.connect(alwaysOneWavetable);
    alwaysOneWavetable.connect(wavetableOffsetGain);
    wavetableOffsetGain.connect(pulseWavetable);
    pulseWavetable.connect(pulseOutputGain);
    pulseOutputGain.connect(outputPanner);
    outputPanner.connect(ctx.destination);

    const freq = wavetableTrigger.frequency,
        width = wavetableOffsetGain.gain,
        gain = pulseOutputGain.gain;

    const decay = 0.04, sustain = 0.7, release = 0.01, level = 0.1;

    function noteOn(note: number, glide: number = 0) {
        const glideTime = glide/10;
        slide(freq, A0F * 2 ** (note / 12), glideTime);
        set(gain, level);
        towards(gain, level * sustain, decay);
    }
    function noteOff() {
        set(gain, 0);
    }
    function play(note: Note) {
        if (note.note === "---") {
            noteOff();
        }  else if (note.note === 'cont') {
            // do nothing
        } else {
            noteOn(note.note, note.fx?.glide);
        }
        set(width, note.fx?.pulseWidth ?? 0.0);
    }

    return {play}
}

function DrumSynth(ctx: AudioContext): Synth<Drum> {
    const toneOscillator = new OscillatorNode(ctx, {type: "square", frequency: 55}),
        toneGain = new GainNode(ctx, {gain: 0.0}),
        noiseWavetableTrigger = new OscillatorNode(ctx, {type: "sawtooth", frequency: 20}),
        noiseWavetable = new WaveShaperNode(ctx, {curve: fill(1024,x => Math.random() * 2 -1)}),
        noiseGain = new GainNode(ctx, {gain: 0.0}),
        noisePan = stereoPanner(ctx, 0.0);

    toneOscillator.start();
    noiseWavetableTrigger.start();

    toneOscillator.connect(toneGain);
    toneGain.connect(ctx.destination);

    noiseWavetableTrigger.connect(noiseWavetable);
    noiseWavetable.connect(noiseGain);
    noiseGain.connect(noisePan);
    noisePan.connect(ctx.destination);


    function play(slot: Drum) {
        const vel = slot.vel ? slot.vel : 1;
        if (slot.drum === 'KCK') {
            toneOscillator.detune.cancelScheduledValues(ctx.currentTime);
            toneOscillator.detune.setValueAtTime(3000, ctx.currentTime);
            toneOscillator.detune.setTargetAtTime(0, ctx.currentTime, 0.07);
            toneGain.gain.cancelScheduledValues(ctx.currentTime);
            toneGain.gain.setValueAtTime(0.3 * vel, ctx.currentTime);
            toneGain.gain.setValueCurveAtTime([0.3 * vel, 0.3 * vel, 0.2 * vel, 0.1 * vel, 0.0], ctx.currentTime, 0.10);
        } else if (slot.drum === 'NSS') {
            noiseGain.gain.cancelScheduledValues(ctx.currentTime);
            noiseGain.gain.setValueAtTime(0.1 * vel,ctx.currentTime);
            noiseGain.gain.setValueCurveAtTime([0.1 * vel,0.04 * vel,0.0], ctx.currentTime, 0.08);
            noisePan.positionX.cancelScheduledValues(ctx.currentTime);
            noisePan.positionX.setValueAtTime(Math.random() * 0.4-0.2, ctx.currentTime);
        } else if (slot.drum === 'SNR') {
            toneOscillator.detune.cancelScheduledValues(ctx.currentTime);
            toneOscillator.detune.setValueAtTime(2400, ctx.currentTime);
            toneOscillator.detune.setTargetAtTime(600, ctx.currentTime, 0.04);
            toneGain.gain.cancelScheduledValues(ctx.currentTime);
            toneGain.gain.setValueAtTime(0.2 * vel, ctx.currentTime);
            toneGain.gain.setValueCurveAtTime([0.2 * vel, 0.06 * vel, 0.02 * vel, 0], ctx.currentTime, 0.10);
            noiseGain.gain.cancelScheduledValues(ctx.currentTime);
            noiseGain.gain.setValueAtTime(0.2 * vel,ctx.currentTime);
            noiseGain.gain.setValueCurveAtTime([0.2 * vel,0.15 * vel,0.0], ctx.currentTime, 0.15);
        }
    }
    return {
        play,
    }
}

interface State {
    key: Key,
    scale: Scale,
    progression: Progression,
    patterns: Pattern[],
    bpm: number
}

function modulate(key: Key, scale: Scale): [Key, Scale] {
    choose([
        () => {
            // Move to relative major or minor
            if (scale === music.scales.minor) {
                scale = music.scales.major;
                key = (key + 3) % 12 as Key;
            } else if (scale === music.scales.major) {
                scale = music.scales.minor;
                key = (key + 9) % 12 as Key;
            }
        },
        () => {
            // Move around the cycle of fifths
            if (Math.random() < 0.5) {
                key = (key + 7) % 12 as Key;
            } else {
                key = (key + 5) % 12 as Key;
            }
        }
    ])();
    return [key, scale]
}

function bpmClock() {
    let intervalHandle = {
        bpmClock: 0
    };
    let fN = 0;

    function set(bpm: number, frameFunction: (f: number) => void) {
        window.clearInterval(intervalHandle.bpmClock);
        intervalHandle.bpmClock = window.setInterval(() => frameFunction(fN++), (60000 / bpm) / 4);
    }
    return {
        set
    }
}



function start() {
    let state: State = {
        key: rndInt(12) as Key,
        scale: music.scales.minor,
        progression: music.progressions[0],
        patterns: [] as Pattern[],
        bpm: 112
    };

    const display = createPatternDisplay(document.getElementById("display") as HTMLElement);
    const clock = bpmClock();

    // @ts-ignore
    const ctx: AudioContext = new (window.AudioContext || window.webkitAudioContext)() as AudioContext;

    const synths = [
        SquareSynth(ctx),
        SquareSynth(ctx, -0.5),
        SquareSynth(ctx),
        SquareSynth(ctx,0.5),
        DrumSynth(ctx)
    ];

    function frame(f: number) {
        const positionInPattern = f % PatternSize;

        if (f % 1024 === 0) {
            state.bpm = Math.floor(Math.random() * 80) + 100;
            clock.set(state.bpm, frame);
        }
        if (f % 512 === 0) {
            [state.key, state.scale] = modulate(state.key, state.scale);
        }
        if (f % 256 === 0) {
            state.progression = choose(music.progressions);
        }
        if (f % 128 === 0) {
            state.patterns =[
                choose([Generators.bass, Generators.bass2, Generators.empty])(state.progression, state.key, state.scale),
                Math.random() < 0.7 ? Generators.arp(state.progression, state.key, state.scale) : Generators.empty(),
                Math.random() < 0.7 ? Generators.melody1(state.progression, state.key, state.scale) : Generators.empty(),
                choose([Generators.empty, Generators.arp, Generators.melody1])(state.progression, state.key, state.scale),
                Math.random() < 0.8 ? Generators.drum() : Generators.empty(),
            ];
            display.setPatterns(state.patterns);
        }
        display.highlightRow(positionInPattern);

        state.patterns.forEach((pat, i) => {
            const note = pat[positionInPattern];
            synths[i].play(note as any);
        });
    }

    clock.set(state.bpm, frame);
}

let started = false;
document.addEventListener("click", function() {
    if (!started) {
        start();
    }
    started = true;
});