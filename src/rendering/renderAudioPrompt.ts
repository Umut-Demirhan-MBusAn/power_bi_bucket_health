import { VisualTheme } from "../domain/statusMeta";

export type AudioPromptState = "locked" | "unlocked";

export const AUDIO_PROMPT_CLASS = "bh-audio-prompt";

const TEXT: Record<AudioPromptState, { icon: string; label: string }> = {
    locked: { icon: "\u{1F507}", label: "Click to turn on alarm sound" },
    unlocked: { icon: "\u{1F50A}", label: "Alarm sound on" }
};

export function createAudioPrompt(): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = AUDIO_PROMPT_CLASS;
    // Announces the switch to "Alarm sound on" for screen-reader users who pressed it.
    button.setAttribute("aria-live", "polite");
    return button;
}

export function setAudioPromptState(button: HTMLElement, state: AudioPromptState): void {
    if (button.getAttribute("data-state") === state) {
        return;
    }
    const icon = document.createElement("span");
    icon.className = `${AUDIO_PROMPT_CLASS}__icon`;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = TEXT[state].icon;
    const label = document.createElement("span");
    label.textContent = TEXT[state].label;
    button.replaceChildren(icon, label);
    button.setAttribute("data-state", state);
    button.classList.toggle(`${AUDIO_PROMPT_CLASS}--unlocked`, state === "unlocked");
}

// Power BI's high-contrast themes arrive through the host palette, not the CSS forced-colors
// query, so the pill takes the palette's colours inline like the cards do.
export function applyAudioPromptTheme(button: HTMLElement, theme: VisualTheme): void {
    button.style.color = theme.isHighContrast ? theme.foreground : "";
    button.style.background = theme.isHighContrast ? theme.background : "";
    button.style.borderColor = theme.isHighContrast ? theme.foregroundSelected : "";
}
