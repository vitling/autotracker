/*
  Copyright 2020 David Whiting
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/
import { settings, synths } from "./tracker.js";

const A0 = -12;

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

function PatternDisplay(display: HTMLElement) {
    const regenerateCheckbox = document.createElement("input");

    function setPatterns(newPats: Pattern<Slot>[], saveString: string) {
        display.innerHTML =
            `<div class='header'>
                Pattern ID: <a href='?${saveString}' class='save-string'>${saveString}</a>
                <input type="checkbox" ${settings.regenerateEnabled ? 'checked' : ''} id="regenerateEnabled"/>
                <label for="regenerateEnabled"></label><button type="button" id="forceGenerate"></button> 
            </div>`;
        document.getElementById("regenerateEnabled")?.addEventListener("input", e =>
            settings.regenerateEnabled = (e.target as HTMLInputElement).checked
        );
        document.getElementById("forceGenerate")?.addEventListener("click", e =>
            settings.forceGenerate = true
        );
        const container = document.createElement("div");
        container.classList.add("columns");
        display.append(container);
        function add(pattern: Pattern<Slot>, index: number) {
            const pDisplay = document.createElement("code");
            pDisplay.innerHTML =
                `<h3 id="patternHeader${index}" class="${settings.muted[index] ? 'muted': ''}">
                    ${index === 4 ? "*" : "&#x238D;"} ${index + 1}
                </h3>` +
                pattern.map((x, i) => "<div class='note' data-index='" + i + "'>" + textRepr(x) + "</div>").join("");

            container.append(pDisplay);

            document.getElementById(`patternHeader${index}`)?.addEventListener("click", e => {
                settings.muted[index] = !settings.muted[index];
                synths[index].mute(settings.muted[index]);
                (e.target as HTMLElement).classList.toggle("muted", settings.muted[index]);
            });
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

export default PatternDisplay;