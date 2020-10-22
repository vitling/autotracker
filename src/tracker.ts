import PatternDisplay from './display.js'
import {choose, fill, rndInt} from './utils.js'

import Audio from "./audio.js";
import * as music from './theory.js'
import * as Generators from './generators.js'

const PatternSize = 64;



const progressions = [
    [1,1,1,1,6,6,6,6,4,4,4,4,3,3,5,5],
    [1,1,1,1,6,6,6,6,1,1,1,1,6,6,6,6],
    [4,4,4,4,5,5,5,5,1,1,1,1,1,1,3,3],
    [1,1,6,6,4,4,5,5,1,1,6,6,3,3,5,5],
    [5,5,4,4,1,1,1,1,5,5,6,6,1,1,1,1],
    [6,6,6,6,5,5,5,5,4,4,4,4,5,5,5,5],
    [1,1,1,1,3,3,3,3,4,4,4,4,5,5,5,5],
    [6,6,6,6,4,4,4,4,1,1,1,1,1,1,5,5],
    [1,1,1,1,1,1,1,1,4,4,4,4,4,4,4,4]
];

interface State {
    key: Key,
    scale: Scale,
    progression: Progression,
    patterns: Pattern[],
    bpm: number
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
        progression: progressions[0],
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
            [state.key, state.scale] = music.modulate(state.key, state.scale);
        }
        if (f % 256 === 0) {
            state.progression = choose(progressions);
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