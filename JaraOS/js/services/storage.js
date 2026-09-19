const PREFIX = "jaraos.";
const VERSION_KEY = "jaraos.storage.version";
const CURRENT_VERSION = 3;
const memoryFallback = new Map();

function clone(value) {
    if (value === undefined) return undefined;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function readRaw(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        return memoryFallback.has(key) ? memoryFallback.get(key) : null;
    }
}

function writeRaw(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        memoryFallback.set(key, value);
    }
}

function removeRaw(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        memoryFallback.delete(key);
    }
}

function parse(raw, fallback) {
    if (raw === null || raw === undefined) return clone(fallback);
    try {
        return JSON.parse(raw);
    } catch (error) {
        return clone(fallback);
    }
}

class StorageService extends EventTarget {
    constructor() {
        super();
        this.version = CURRENT_VERSION;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return this;

        const storedVersion = Number(readRaw(VERSION_KEY) || 0);
        if (storedVersion < CURRENT_VERSION) this.migrate(storedVersion);

        writeRaw(VERSION_KEY, String(CURRENT_VERSION));
        this.initialized = true;
        return this;
    }

    key(name) {
        return PREFIX + name;
    }

    has(name) {
        return readRaw(this.key(name)) !== null;
    }

    get(name, fallback = null) {
        return parse(readRaw(this.key(name)), fallback);
    }

    set(name, value) {
        writeRaw(this.key(name), JSON.stringify(value));
        this.dispatchEvent(new CustomEvent("change", {
            detail: { key: name, value: clone(value) }
        }));
        return value;
    }

    remove(name) {
        removeRaw(this.key(name));
        this.dispatchEvent(new CustomEvent("change", {
            detail: { key: name, value: undefined }
        }));
    }

    migrate(fromVersion) {
        const legacy = parse(readRaw("JARAOS_DATA"), null);

        if (legacy && typeof legacy === "object") {
            if (!this.has("accounts") && Array.isArray(legacy.users)) {
                this.set("accounts", {
                    users: legacy.users,
                    currentUser: legacy.currentUser || legacy.users[0]?.id || "local"
                });
            }

            if (!this.has("settings")) {
                this.set("settings", {
                    theme: legacy.theme || "dark",
                    accent: legacy.accent || "#7864ff",
                    wallpaper: legacy.wallpaper || "nebula",
                    system: legacy.systemSettings || {},
                    user: legacy.userSettings || {}
                });
            }

            if (!this.has("notes") && typeof legacy.notes === "string") {
                this.set("notes", legacy.notes);
            }

            if (!this.has("license")) {
                this.set("license", { active: Boolean(legacy.license) });
            }

            if (!this.has("migration.legacyFolders") && Array.isArray(legacy.folders)) {
                this.set("migration.legacyFolders", legacy.folders);
            }
        }

        const oldStoreHistory = parse(readRaw("JARAOS_STORE_KEYS"), null);
        if (!this.has("store.history") && Array.isArray(oldStoreHistory)) {
            this.set("store.history", oldStoreHistory);
        }

        this.set("migration", {
            fromVersion,
            completedAt: new Date().toISOString(),
            legacyKeyPreserved: true
        });
    }
}

export const Storage = new StorageService();
export { CURRENT_VERSION };
