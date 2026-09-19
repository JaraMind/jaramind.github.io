import { Storage } from "../services/storage.js";

export class NotesApp {
    constructor({ fs, notifications }) {
        this.fs = fs;
        this.notifications = notifications;
        this.textarea = null;
        this.fileId = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return this;
        this.initialized = true;
        this.textarea = document.getElementById("notesArea");
        this.textarea.value = Storage.get("notes", "");
        this.textarea.addEventListener("input", () => {
            if (this.fileId) {
                try {
                    this.fs.writeFile(this.fileId, this.textarea.value);
                } catch (error) {
                    this.fileId = null;
                    this.notifications.show({ title: "Заметки", message: "Файл больше недоступен", icon: "!" });
                }
            } else {
                Storage.set("notes", this.textarea.value);
            }
        });
        return this;
    }

    launch() {
        if (!this.fileId) this.textarea.value = Storage.get("notes", "");
        setTimeout(() => this.textarea?.focus(), 0);
        return { element: document.getElementById("notes"), persistent: true };
    }

    openFile(item) {
        if (item.type !== "file") return;
        this.fileId = item.id;
        this.textarea.value = this.fs.readFile(item.id);
        const title = document.querySelector("#notes .window-header > span");
        if (title) title.textContent = "📝 " + item.name;
    }

    openScratchpad() {
        this.fileId = null;
        this.textarea.value = Storage.get("notes", "");
        const title = document.querySelector("#notes .window-header > span");
        if (title) title.textContent = "📝 Заметки";
    }
}
