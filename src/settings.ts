"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsModel = formattingSettings.Model;

class LayoutCard extends FormattingSettingsCard {
    name = "layout";
    displayName = "Layout";

    minCardWidth = new formattingSettings.NumUpDown({
        name: "minCardWidth",
        displayName: "Minimum card width (px)",
        description: "Cards will not shrink below this width; scrollbars appear instead.",
        value: 220
    });

    slices = [this.minCardWidth];
}

class OrderingCard extends FormattingSettingsCard {
    name = "ordering";
    displayName = "Ordering";

    wingSideAssignment = new formattingSettings.ItemDropdown({
        name: "wingSideAssignment",
        displayName: "Wing side assignment",
        description: "Controls how wing shroud order values map to left/right sides.",
        value: { value: "OddLeftEvenRight", displayName: "Odd Left / Even Right" },
        items: [
            { value: "OddLeftEvenRight", displayName: "Odd Left / Even Right" },
            { value: "OddRightEvenLeft", displayName: "Odd Right / Even Left" },
            { value: "FirstHalfLeftSecondHalfRight", displayName: "First Half Left / Second Half Right" },
            { value: "FirstHalfRightSecondHalfLeft", displayName: "First Half Right / Second Half Left" }
        ]
    });

    slices = [this.wingSideAssignment];
}

class AlarmCard extends FormattingSettingsCard {
    name = "alarm";
    displayName = "Alarm";

    audioEnabled = new formattingSettings.ToggleSwitch({
        name: "audioEnabled",
        displayName: "Enable audio alarm",
        description: "Play a two-tone alert when a component transitions into alarm status.",
        value: true
    });

    reducedMotion = new formattingSettings.ToggleSwitch({
        name: "reducedMotion",
        displayName: "Reduced motion",
        description: "Disable flashing animation on alarm components.",
        value: false
    });

    slices = [this.audioEnabled, this.reducedMotion];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    layout = new LayoutCard();
    ordering = new OrderingCard();
    alarm = new AlarmCard();
    cards = [this.layout, this.ordering, this.alarm];
}
