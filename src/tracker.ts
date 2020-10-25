/*
  Copyright 2020 David Whiting
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/

import PatternDisplay from './display.js'
import {choose, fill, rndInt, rnd, seedRNG} from './utils.js'

import Audio from "./audio.js";
import * as music from './theory.js'
import * as Generators from './generators.js'
import {scales} from "./theory.js";

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

type Synth<T> = { play: (note: T) => void}
type FourChannelsPlusDrums = [Note, Note, Note, Note, Drum]
type PatternsType<T> = { [K in keyof T]: Pattern<T[K]> };
type SynthsType<T> = { [K in keyof T]: Synth<T[K]> }



interface State {
    key: Key,
    scale: Scale,
    progression: Progression,
    bpm: number,
    songIndex: number,
    seedCode: string
}

type SaveCode = string & {typeTag: "__SaveCode"}

function hex(v: number) { return Math.floor(v).toString(16).toUpperCase().padStart(2,'0'); }
function unhex(v: string): number {
    return parseInt(v, 16)
}

function save(state: State): SaveCode {
    const nonRandomElements = [state.key, state.scale == music.scales.major ? 0 : 1, progressions.indexOf(state.progression), state.bpm, state.songIndex % 256];
    const saveCode = "0x" + nonRandomElements.map(hex).join("") + state.seedCode;
    return saveCode as SaveCode;
}

function restore(code: SaveCode): State {
    const codeString = code.slice(2);
    const key = unhex(codeString.slice(0,2)) as Key;
    const scale = unhex(codeString.slice(2,4)) === 0 ? music.scales.major : music.scales.minor;
    const progression = progressions[unhex(codeString.slice(4,6))];
    const bpm = unhex(codeString.slice(6,8));
    const songIndex = unhex(codeString.slice(8,10));
    const seedCode = codeString.slice(10);
    return {
        bpm,
        key,
        progression,
        scale,
        seedCode,
        songIndex
    }
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

function createInitialState(seedOrSave: string): State {
    if (seedOrSave.startsWith("0x")) {
        return restore(seedOrSave as SaveCode);
    } else {
        seedRNG(seedOrSave && seedOrSave.length > 0 ? seedOrSave : "" + Math.random());
        return {
            key: rndInt(12) as Key,
            scale: music.scales.minor,
            progression: progressions[0],
            bpm: 112,
            seedCode: createSeedCode(),
            songIndex: 0
        };
    }
}

function createSeedCode() {
    return hex(rndInt(255)) +hex(rndInt(255)) + hex(rndInt(255)) + hex(rndInt(255));
}

function mutateState(state: State): void {
    state.songIndex++;
    if (state.songIndex % 8 === 0) {
        state.bpm = Math.floor(rnd() * 80) + 100;
        //clock.set(state.bpm, frame);
    }
    if (state.songIndex % 4 === 0) {
        [state.key, state.scale] = music.modulate(state.key, state.scale);
    }
    if (state.songIndex % 2 === 0) {
        state.progression = choose(progressions);
    }
    state.seedCode = hex(rndInt(255)) +hex(rndInt(255)) + hex(rndInt(255)) + hex(rndInt(255));
    seedRNG(state.seedCode);

    //display.setPatterns(patterns, stateString);
}


function start() {
    const seedOrSave = (document.getElementById("seed-text") as HTMLInputElement).value;
    const state: State = createInitialState(seedOrSave);

    let patterns = [[],[],[],[],[]] as PatternsType<FourChannelsPlusDrums>;

    const display = PatternDisplay(document.getElementById("display") as HTMLElement);
    const clock = bpmClock();

    // @ts-ignore
    const ctx: AudioContext = new (window.AudioContext || window.webkitAudioContext)() as AudioContext;
    const au = Audio(ctx);

    const synths: SynthsType<FourChannelsPlusDrums> = [
        au.SquareSynth(),
        au.SquareSynth(-0.5),
        au.SquareSynth(),
        au.SquareSynth(0.5),
        au.DrumSynth()
    ];


    function newPatterns() {
        seedRNG(state.seedCode);
        patterns =[
            choose([Generators.bass, Generators.bass2, Generators.emptyNote])(state),
            rnd() < 0.7 ? Generators.arp(state) : Generators.emptyNote(),
            rnd() < 0.7 ? Generators.melody1(state) : Generators.emptyNote(),
            choose([Generators.emptyNote, Generators.arp, Generators.melody1])(state),
            rnd() < 0.8 ? Generators.drum() : Generators.emptyDrum(),
        ];
    }

    // create initial patterns
    newPatterns();
    display.setPatterns(patterns, save(state));


    function frame(f: number) {
        const positionInPattern = f % PatternSize;
        if (f % 128 === 0 && f!== 0) {
            mutateState(state);
            newPatterns();
            clock.set(state.bpm, frame);
            display.setPatterns(patterns, save(state));
        }

        display.highlightRow(positionInPattern);

        // Not a loop because these tuple parts have different types depending on melody vs drum
        synths[0].play(patterns[0][positionInPattern]);
        synths[1].play(patterns[1][positionInPattern]);
        synths[2].play(patterns[2][positionInPattern]);
        synths[3].play(patterns[3][positionInPattern]);
        synths[4].play(patterns[4][positionInPattern]);

    }

    clock.set(state.bpm, frame);
}

window.onload = function() {

    if (window.location.search.startsWith("?")) {
        (document.getElementById("seed-text") as HTMLInputElement).value = window.location.search.slice(1);
    }

    let started = false;
    document.getElementById("start")?.addEventListener("click", e => {
        if (!started) {
            start();
        }
        started = true;
    });

    document.getElementById("seed-entry")?.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            if (!started) {
                start();
            }
            started = true;
        }
    });
}