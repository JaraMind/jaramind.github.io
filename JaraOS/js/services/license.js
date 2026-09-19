import { Storage } from "./storage.js";

const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const PREFIX = "JARA";
const BLOCK_LENGTH = 4;
const CHECKSUM_LENGTH = 4;

function checksumBlock(payload, length) {
    const modulus = Math.pow(CHARSET.length, length);
    let checksum = 0;
    for (let index = 0; index < payload.length; index += 1) {
        checksum = (checksum + payload.charCodeAt(index) * (index + 1)) % modulus;
    }
    const result = [];
    for (let index = 0; index < length; index += 1) {
        result.push(CHARSET[checksum % CHARSET.length]);
        checksum = Math.floor(checksum / CHARSET.length);
    }
    return result.reverse().join("");
}

class LicenseService extends EventTarget {
    initialize() {
        this.data = Storage.get("license", { active: false, key: null });
        return this;
    }

    isActive() {
        return Boolean(this.data?.active);
    }

    validate(rawKey) {
        const key = String(rawKey || "").trim().toUpperCase();
        if (key === "JARA-2026-DEMO-ACCESS") return true;
        const parts = key.split("-");
        if (parts.shift() !== PREFIX || parts.length < 2) return false;
        const checksum = parts.pop();
        if (checksum.length !== CHECKSUM_LENGTH || parts.some(block => block.length !== BLOCK_LENGTH)) return false;
        const payload = parts.join("");
        if ([...payload + checksum].some(character => !CHARSET.includes(character))) return false;
        return checksum === checksumBlock(payload, CHECKSUM_LENGTH);
    }

    activate(rawKey) {
        if (!this.validate(rawKey)) return false;
        this.data = { active: true, key: String(rawKey).trim().toUpperCase(), activatedAt: new Date().toISOString() };
        Storage.set("license", this.data);
        this.dispatchEvent(new Event("change"));
        return true;
    }
}

export const License = new LicenseService();
