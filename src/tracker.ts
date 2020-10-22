import PatternDisplay from './display'
import {choose, fill, rndInt} from './utils'
import Audio from "./audio";


const PatternSize = 64;

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

    const display = PatternDisplay(document.getElementById("display") as HTMLElement);
    const clock = bpmClock();

    // @ts-ignore
    const ctx: AudioContext = new (window.AudioContext || window.webkitAudioContext)() as AudioContext;
    const au = Audio(ctx);

    const synths = [
        au.SquareSynth(),
        au.SquareSynth(-0.5),
        au.SquareSynth(),
        au.SquareSynth(0.5),
        au.DrumSynth()
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