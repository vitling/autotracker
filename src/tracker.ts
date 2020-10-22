
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
type DrumPattern = Drum[];
type SynthPattern = Note[];

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

let state = {
    key: rndInt(12) as Key,
    scale: music.scales.minor,
    progression: music.progressions[0],
    patterns: [] as Pattern[]
};

// let key = Math.floor(Math.random()*12);
// let scale = minor;


const gen = {
    arp: () => {
        const [progression, key, scale] = [state.progression, state.key, state.scale];

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
    bass: () => fill(PatternSize, i => {
        const [progression, key, scale] = [state.progression, state.key, state.scale];
        const progIndex = Math.floor(i / 4);
        const chordNumber = progression[progIndex];
        const chord = music.chordTypes.single.map(noteIndex => key + scale[(chordNumber - 1 + noteIndex) % scale.length]);
        return {note: i % 2 === 1 ? 'cont' : chord[0] + (Math.floor(i / 2) % 2) * 12 - 12, fx: {pulseWidth: 0}} as Slot;
    }),
    bass2: () => fill(PatternSize, i => {
        const [progression, key, scale] = [state.progression, state.key, state.scale];
        const progIndex = Math.floor(i / 4);
        const chordNumber = progression[progIndex];
        const chord = music.chordTypes.single.map(noteIndex => key + scale[(chordNumber - 1 + noteIndex) % scale.length]);
        return {note: i % 8 === 0 ? chord[0] - 12: 'cont', vel: 2, fx: {pulseWidth: Math.random()}} as Slot;
        //return {note: i % 2 === 1 ? 'cont' : chord[0] + (Math.floor(i / 2) % 2) * 12 - 12} as Slot;
    }),
    melody1: () => {
        const [progression, triad, key, scale] = [state.progression, music.chordTypes.triad, state.key, state.scale];
        const slow = Math.random() < 0.5;
        const pwmMod = Math.random() < 0.5;
        let pwmAmount = Math.random() * 0.5;

        const pattern: Slot[] = [];
        let current = (choose(triad) - 1) + scale.length * choose([2, 3, 4]);
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
            const chord = triad.map(noteIndex => (chordNumber - 1 + noteIndex) % scale.length);

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
// const display = document.getElementById("display") as HTMLDivElement;

    function replacePatterns(newPats: Pattern[]) {

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

    const customStyle = document.createElement("style");
    customStyle.setAttribute("type", "text/css");
    document.body.append(customStyle);
    const css = customStyle.sheet as CSSStyleSheet;

    function highlightRow(index: number) {
        if (css.rules.length > 0) {
            css.deleteRule(0);
        }
        css.insertRule(`.note[data-index='${index}'] { background-color: #339933; color: white; font-weight: bold }`)
    }

    return {
        replacePatterns,
        highlightRow
    };
}



function SquareSynth(ctx: AudioContext, pan: number = 0) {
    const osc = new OscillatorNode(ctx, {type: "sawtooth"});
    osc.start();
    const ws = new WaveShaperNode(ctx, {curve:new Float32Array(256).fill(-1,0,128).fill(1,128,256)});
    const one = new WaveShaperNode(ctx, {curve: new Float32Array(2).fill(1,0,2)});
    const shapegain =  new GainNode(ctx, {gain: 0.0});

    const gain = new GainNode(ctx, {gain:0.0});

    const panner = new StereoPannerNode(ctx, {pan: pan});

    osc.connect(one);
    one.connect(shapegain);
    const width = shapegain.gain;
    osc.connect(ws);
    shapegain.connect(ws);

    ws.connect(gain);
    gain.connect(panner);
    // const analyser = new AnalyserNode(ctx, {fftSize: 256});
    // gain.connect(analyser);

    panner.connect(ctx.destination);
    function noteOn(note: number, glide: number = 0) {
        const glideTime = glide/10;
        osc.frequency.cancelScheduledValues(ctx.currentTime);

        if (glide === 0) {
            osc.frequency.setValueAtTime(A0F * 2 ** (note/12), ctx.currentTime);
        } else {
            osc.frequency.setTargetAtTime(A0F * 2 ** (note/12), ctx.currentTime, glideTime);
        }

        //width.setValueAtTime(Math.random()*0.6, ctx.currentTime);

        // osc.detune.cancelScheduledValues(ctx.currentTime);
        // osc.detune.setValueAtTime(Math.random() * 20 - 10, ctx.currentTime);
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0.1,ctx.currentTime);
        gain.gain.setTargetAtTime(0.07, ctx.currentTime, 0.04);
    }
    function noteOff() {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
    }
    function play(slot: Note) {
        if (slot.note === "---") {
            noteOff();
        }  else if (slot.note === 'cont') {
            // do nothing
        } else {
            noteOn(slot.note, slot.fx?.glide);
        }
        if (slot.fx && slot.fx.pulseWidth) {
            width.cancelScheduledValues(ctx.currentTime);
            width.setValueAtTime(slot.fx.pulseWidth, ctx.currentTime);
        } else {
            width.cancelScheduledValues(ctx.currentTime);
            width.setValueAtTime(0.0, ctx.currentTime);
        }
    }

    return {
        // osc,
        // gain,
        // noteOn,
        // noteOff,
        play,
        //analyser
    }
}

function DrumSynth(ctx: AudioContext) {
    const osc = new OscillatorNode(ctx, {type: "square", frequency: 55});
    osc.start();
    const gain = new GainNode(ctx, {gain: 0.0});
    osc.connect(gain);
    gain.connect(ctx.destination);

    const noise = new OscillatorNode(ctx, {type: "sawtooth", frequency: 20});
    noise.start();
    const noiseShape = new WaveShaperNode(ctx, {curve: fill(1024,x => Math.random() * 2 -1)});
    noise.connect(noiseShape);
    const noiseGain = new GainNode(ctx, {gain: 0.0});
    noiseShape.connect(noiseGain);
    const noisePan = new StereoPannerNode(ctx, {pan: 0.0});
    noiseGain.connect(noisePan);
    noisePan.connect(ctx.destination);

    // const analyser = new AnalyserNode(ctx, {fftSize: 256});
    // gain.connect(analyser);
    // noiseGain.connect(analyser);

    function play(slot: Drum) {
        const vel = slot.vel ? slot.vel : 1;
        if (slot.drum === 'KCK') {
            osc.detune.cancelScheduledValues(ctx.currentTime);
            osc.detune.setValueAtTime(3000, ctx.currentTime);
            osc.detune.setTargetAtTime(0, ctx.currentTime, 0.07);
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(0.3 * vel, ctx.currentTime);
            gain.gain.setValueCurveAtTime([0.3 * vel, 0.3 * vel, 0.2 * vel, 0.1 * vel, 0.0], ctx.currentTime, 0.10);
        } else if (slot.drum === 'NSS') {
            noiseGain.gain.cancelScheduledValues(ctx.currentTime);
            noiseGain.gain.setValueAtTime(0.1 * vel,ctx.currentTime);
            noiseGain.gain.setValueCurveAtTime([0.1 * vel,0.04 * vel,0.0], ctx.currentTime, 0.08);
            noisePan.pan.cancelScheduledValues(ctx.currentTime);
            noisePan.pan.setValueAtTime(Math.random() * 0.4-0.2, ctx.currentTime);
        } else if (slot.drum === 'SNR') {
            osc.detune.cancelScheduledValues(ctx.currentTime);
            osc.detune.setValueAtTime(2400, ctx.currentTime);
            osc.detune.setTargetAtTime(600, ctx.currentTime, 0.04);
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(0.2 * vel, ctx.currentTime);
            gain.gain.setValueCurveAtTime([0.2 * vel, 0.06 * vel, 0.02 * vel, 0], ctx.currentTime, 0.10);
            noiseGain.gain.cancelScheduledValues(ctx.currentTime);
            noiseGain.gain.setValueAtTime(0.2 * vel,ctx.currentTime);
            noiseGain.gain.setValueCurveAtTime([0.2 * vel,0.15 * vel,0.0], ctx.currentTime, 0.15);
        }
    }
    return {
        play,
    }
}


function modulate() {
    choose([
        () => {
            // Move to relative major or minor
            if (state.scale === music.scales.minor) {
                state.scale = music.scales.major;
                state.key = (state.key + 3) % 12 as Key;
            } else if (state.scale === music.scales.major) {
                state.scale = music.scales.minor;
                state.key = (state.key + 9) % 12 as Key;
            }
        },
        () => {
            // Move around the cycle of fifths
            if (Math.random() < 0.5) {
                state.key = (state.key + 7) % 12 as Key;
            } else {
                state.key = (state.key + 5) % 12 as Key;
            }
        }
    ])();
}

function start() {
    let fN = 0;
    const display = createPatternDisplay(document.getElementById("display") as HTMLElement);

    let bpm = 112;
    let intervalHandle = {timer: 0};

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
            bpm = Math.floor(Math.random() * 80) + 100;
            window.clearInterval(intervalHandle.timer);
            intervalHandle.timer = window.setInterval(doFrame, (60000/bpm)/4);
        }
        if (f % 512 === 0) {
            modulate();
        }
        if (f % 256 === 0) {
            state.progression = choose(music.progressions);
        }
        if (f % 128 === 0) {
            state.patterns =[
                choose([gen.bass, gen.bass2, gen.empty])(),
                Math.random() < 0.7 ? gen.arp() : gen.empty(),
                Math.random() < 0.7 ? gen.melody1() : gen.empty(),
                choose([gen.empty, gen.arp, gen.melody1])(),
                Math.random() < 0.8 ? gen.drum() : gen.empty(),
            ];
            display.replacePatterns(state.patterns);
        }
        display.highlightRow(positionInPattern);

        state.patterns.forEach((pat, i) => {
            const note = pat[positionInPattern];
            synths[i].play(note as any);
        });
    }

    function doFrame() {
        frame(fN++);
    }
    intervalHandle.timer = window.setInterval(doFrame, (60000 / bpm) / 4);
}

let started = false;
document.addEventListener("click", function() {
    if (!started) {
        start();
    }
    started = true;
});