import { Storage } from "./storage.js";

const DEFAULTS = {
    theme: "dark",
    accent: "#7864ff",
    wallpaper: "nebula",
    system: {},
    user: {}
};

class SettingsService extends EventTarget {
    constructor() {
        super();
        this.data = null;
    }

    initialize() {
        if (this.data) return this;
        const saved = Storage.get("settings", {});
        this.data = {
            ...DEFAULTS,
            ...saved,
            system: { ...DEFAULTS.system, ...(saved.system || {}) },
            user: { ...DEFAULTS.user, ...(saved.user || {}) }
        };
        Storage.set("settings", this.data);
        return this;
    }

    get(key, fallback = null) {
        const parts = String(key).split(".");
        let value = this.data;
        for (const part of parts) {
            if (value === null || typeof value !== "object" || !(part in value)) return fallback;
            value = value[part];
        }
        return value;
    }

    set(key, value) {
        const parts = String(key).split(".");
        let target = this.data;
        while (parts.length > 1) {
            const part = parts.shift();
            if (!target[part] || typeof target[part] !== "object") target[part] = {};
            target = target[part];
        }
        target[parts[0]] = value;
        Storage.set("settings", this.data);
        this.apply();
        this.dispatchEvent(new CustomEvent("change", { detail: { key, value } }));
        return value;
    }

    apply() {
        const accent = this.get("accent", DEFAULTS.accent);
        const requestedTheme = this.get("theme", DEFAULTS.theme);
        const systemDark = globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches;
        const resolvedTheme = requestedTheme === "system" ? (systemDark ? "dark" : "light") : requestedTheme;
        document.documentElement.style.setProperty("--accent", accent);
        document.documentElement.dataset.theme = resolvedTheme;

        const wallpaper = document.querySelector(".wallpaper");
        if (wallpaper) wallpaper.className = "wallpaper" + (this.get("wallpaper") === "nebula" ? "" : " " + this.get("wallpaper"));
    }
}

export const Settings = new SettingsService();
