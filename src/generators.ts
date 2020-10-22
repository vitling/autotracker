import {choose, fill} from './utils.js';
import * as music from './theory.js';
const PatternSize = 64;

function arp(progression: Progression, key: Key, scale: Scale): Pattern {
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
}
function bass(progression: Progression, key: Key, scale: Scale): Pattern {
    return fill(PatternSize, i => {
        const progIndex = Math.floor(i / 4);
        const chordNumber = progression[progIndex];
        const chord = music.chordTypes.single.map(noteIndex => key + scale[(chordNumber - 1 + noteIndex) % scale.length]);
        return {note: i % 2 === 1 ? 'cont' : chord[0] + (Math.floor(i / 2) % 2) * 12 - 12, fx: {pulseWidth: 0}} as Slot;
    })
}
function bass2(progression: Progression, key: Key, scale: Scale): Pattern { return fill(PatternSize, i => {
    const progIndex = Math.floor(i / 4);
    const chordNumber = progression[progIndex];
    const chord = music.chordTypes.single.map(noteIndex => key + scale[(chordNumber - 1 + noteIndex) % scale.length]);
    return {note: i % 8 === 0 ? chord[0] - 12: 'cont', vel: 2, fx: {pulseWidth: Math.random()}} as Slot;
})}
function melody1(progression: Progression, key: Key, scale: Scale): Pattern {
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
}
function empty(): Pattern { return fill(PatternSize, _ => ({note: '---'} as Slot))}
function drum(): Pattern { return fill(PatternSize, i => ({note: 0, drum: i % 8 === 0 ? 'KCK' : i % 8 === 4 ? 'SNR' : (i % 2 === 0 && Math.random() < 0.2) ? 'KCK' : (Math.random() < 0.05) ? choose(['KCK', 'SNR']) : 'NSS', vel: 0.6 + 0.2 * (1-(i % 2)) } as Slot))}

export {arp, bass, bass2, melody1, drum, empty}