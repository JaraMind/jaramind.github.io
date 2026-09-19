import { Storage } from "../services/storage.js";

const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const PREFIX = "JARA";
const BLOCKS = 4;
const BLOCK_LENGTH = 4;
const CHECKSUM_LENGTH = 4;

Storage.initialize();

function randomChar() {
    const values = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) {
        crypto.getRandomValues(values);
        return CHARSET[values[0] % CHARSET.length];
    }
    return CHARSET[Math.floor(Math.random() * CHARSET.length)];
}

function checksumBlock(payload) {
    const modulus = Math.pow(CHARSET.length, CHECKSUM_LENGTH);
    let checksum = 0;
    for (let index = 0; index < payload.length; index += 1) {
        checksum = (checksum + payload.charCodeAt(index) * (index + 1)) % modulus;
    }
    const result = [];
    for (let index = 0; index < CHECKSUM_LENGTH; index += 1) {
        result.push(CHARSET[checksum % CHARSET.length]);
        checksum = Math.floor(checksum / CHARSET.length);
    }
    return result.reverse().join("");
}

function generateKey() {
    const blocks = [];
    for (let block = 0; block < BLOCKS; block += 1) {
        let value = "";
        for (let character = 0; character < BLOCK_LENGTH; character += 1) value += randomChar();
        blocks.push(value);
    }
    return [PREFIX, ...blocks, checksumBlock(blocks.join(""))].join("-");
}

function renderHistory() {
    const history = Storage.get("store.history", []);
    const container = document.getElementById("historyList");
    container.replaceChildren();
    if (!history.length) {
        const empty = document.createElement("div");
        empty.className = "history-empty";
        empty.textContent = "Ключей пока не выдавалось.";
        container.appendChild(empty);
        return;
    }
    history.slice().reverse().forEach(entry => {
        const item = document.createElement("div");
        item.className = "history-item";
        const code = document.createElement("code");
        code.textContent = entry.key;
        const date = document.createElement("span");
        date.textContent = entry.date;
        item.append(code, date);
        container.appendChild(item);
    });
}

document.getElementById("getKeyBtn").addEventListener("click", () => {
    const key = generateKey();
    const history = Storage.get("store.history", []);
    history.push({ key, date: new Date().toLocaleString("ru-RU") });
    Storage.set("store.history", history);
    document.getElementById("keyOutput").textContent = key;
    document.getElementById("resultPanel").classList.add("open");
    renderHistory();
});

document.getElementById("copyBtn").addEventListener("click", async () => {
    const button = document.getElementById("copyBtn");
    try {
        await navigator.clipboard.writeText(document.getElementById("keyOutput").textContent);
        const original = button.textContent;
        button.textContent = "Скопировано!";
        setTimeout(() => { button.textContent = original; }, 1500);
    } catch (error) {
        button.textContent = "Выделите ключ вручную";
    }
});

renderHistory();
