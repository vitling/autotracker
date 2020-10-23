/*
  Copyright 2020 David Whiting
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/
import {fill} from './utils.js'

type Synth<T> = { play: (note: T) => void}

const A3Frequency = 440;
const A0Frequency = A3Frequency / 8;


function Audio(ctx: AudioContext) {
    function oscillatorNode(type: OscillatorType, freq: number = 440): OscillatorNode {
        const node = ctx.createOscillator();
        node.type = type;
        node.frequency.value = freq;
        return node;
    }
    function waveShaperNode(curve: Float32Array | number[]): WaveShaperNode {
        const node = ctx.createWaveShaper();
        node.curve = new Float32Array(curve);
        return node;
    }
    function gainNode(gainAmount: number = 0): GainNode {
        const node = ctx.createGain();
        node.gain.value = gainAmount;
        return node;
    }
    function stereoPannerNode(pan: number): StereoPannerNode {
        if (ctx.createStereoPanner) {
            const node = ctx.createStereoPanner();
            node.pan.value = pan;
            return node;
        } else {
            const node = ctx.createPanner();
            node.panningModel = "equalpower";
            node.setPosition(pan, 0, 0.5);
            // @ts-ignore
            node.pan = node.positionX;
            return node as AudioNode as StereoPannerNode
        }
    }

    function SquareSynth(pan: number = 0): Synth<Note> {
        const set = (a: AudioParam, v: number) => {a.cancelScheduledValues(ctx.currentTime); a.setValueAtTime(v, ctx.currentTime); };
        const towards = (a: AudioParam, v: number, t: number) => {a.setTargetAtTime(t, ctx.currentTime, t)};
        const slide = (a: AudioParam, v: number, t: number) => {a.cancelScheduledValues(ctx.currentTime); a.setTargetAtTime(v,ctx.currentTime, t)};

        const wavetableTrigger = oscillatorNode("sawtooth"),
            pulseWavetable = waveShaperNode(new Float32Array(256).fill(-1,0,128).fill(1,128,256)),
            alwaysOneWavetable = waveShaperNode(new Float32Array(2).fill(1,0,2)),
            wavetableOffsetGain = gainNode(),
            pulseOutputGain = gainNode(),
            outputPanner = stereoPannerNode(pan);
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
            slide(freq, A0Frequency * 2 ** (note / 12), glideTime);
            set(gain, level);
            towards(gain, level * sustain, decay);
        }
        function noteOff() {
            slide(gain, 0, release);
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

    function DrumSynth(): Synth<Drum> {
        const toneOscillator = oscillatorNode("square", 55),
            toneGain = gainNode(),
            noiseWavetableTrigger = oscillatorNode("sawtooth", 20),
            noiseWavetable = waveShaperNode(fill(1024,x => Math.random() * 2 -1)),
            noiseGain = gainNode(),
            noisePan = stereoPannerNode(0);

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
                toneGain.gain.setValueCurveAtTime(new Float32Array([0.3 * vel, 0.3 * vel, 0.2 * vel, 0.1 * vel, 0.0]), ctx.currentTime, 0.10);
            } else if (slot.drum === 'NSS') {
                noiseGain.gain.cancelScheduledValues(ctx.currentTime);
                noiseGain.gain.setValueAtTime(0.1 * vel,ctx.currentTime);
                noiseGain.gain.setValueCurveAtTime(new Float32Array([0.1 * vel,0.04 * vel,0.0]), ctx.currentTime, 0.08);

                // Ugly workaround for safari being a bitch
                if ("pan" in noisePan) {
                    noisePan.pan.cancelScheduledValues(ctx.currentTime);
                    noisePan.pan.setValueAtTime(Math.random() * 0.4 - 0.2, ctx.currentTime);
                }
            } else if (slot.drum === 'SNR') {
                toneOscillator.detune.cancelScheduledValues(ctx.currentTime);
                toneOscillator.detune.setValueAtTime(2400, ctx.currentTime);
                toneOscillator.detune.setTargetAtTime(600, ctx.currentTime, 0.04);
                toneGain.gain.cancelScheduledValues(ctx.currentTime);
                toneGain.gain.setValueAtTime(0.2 * vel, ctx.currentTime);
                toneGain.gain.setValueCurveAtTime(new Float32Array([0.2 * vel, 0.06 * vel, 0.02 * vel, 0]), ctx.currentTime, 0.10);
                noiseGain.gain.cancelScheduledValues(ctx.currentTime);
                noiseGain.gain.setValueAtTime(0.2 * vel,ctx.currentTime);
                noiseGain.gain.setValueCurveAtTime(new Float32Array([0.2 * vel,0.15 * vel,0.0]), ctx.currentTime, 0.15);
            }
        }
        return {
            play,
        }
    }
    return {
        SquareSynth,
        DrumSynth
    }
}

export default Audio