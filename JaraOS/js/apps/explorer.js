export class ExplorerApp {
    constructor({ fs, dialogs, notifications, openFile }) {
        this.fs = fs;
        this.notifications = notifications;
        this.dialogs = dialogs;
        this.openFile = openFile;
        this.currentFolderId = "desktop";
        this.history = [];
        this.selectedId = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return this;
        this.initialized = true;
        document.getElementById("backFolder")?.addEventListener("click", () => this.back());
        document.getElementById("newFolderExplorer")?.addEventListener("click", () => this.createFolder());
        document.getElementById("newTextFileExplorer")?.addEventListener("click", () => this.createFile());
        document.getElementById("renameExplorerItem")?.addEventListener("click", () => this.renameSelected());
        document.getElementById("deleteExplorerItem")?.addEventListener("click", () => this.deleteSelected());
        this.fs.addEventListener("change", () => this.render());
        this.render();
        return this;
    }

    launch(options = {}) {
        if (options.folderId && this.fs.getItem(options.folderId)?.type === "folder") this.openFolder(options.folderId, false);
        this.render();
        return { element: document.getElementById("files"), persistent: true };
    }

    openFolder(folderId, remember = true) {
        const folder = this.fs.getItem(folderId);
        if (!folder || folder.type !== "folder") return;
        if (remember && folderId !== this.currentFolderId) this.history.push(this.currentFolderId);
        this.currentFolderId = folderId;
        this.selectedId = null;
        this.render();
    }

    back() {
        if (this.history.length) {
            this.currentFolderId = this.history.pop();
        } else {
            const current = this.fs.getItem(this.currentFolderId);
            this.currentFolderId = current?.parentId || "desktop";
        }
        this.selectedId = null;
        this.render();
    }

    render() {
        const grid = document.getElementById("fileGrid");
        if (!grid) return;
        if (!this.fs.getItem(this.currentFolderId)) this.currentFolderId = "desktop";
        grid.replaceChildren();
        const items = this.fs.getChildren(this.currentFolderId).sort((a, b) => {
            if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
            return a.name.localeCompare(b.name, "ru");
        });

        items.forEach(item => {
            const element = document.createElement("div");
            element.className = "file";
            element.dataset.itemId = item.id;
            element.tabIndex = 0;
            const glyph = document.createElement("div");
            glyph.textContent = item.type === "folder" ? "📁" : (item.extension === "txt" ? "📄" : "📃");
            const label = document.createElement("span");
            label.textContent = item.name;
            element.append(glyph, label);
            element.addEventListener("click", () => this.select(item.id));
            element.addEventListener("dblclick", () => {
                if (item.type === "folder") this.openFolder(item.id);
                else this.openFile(item);
            });
            element.addEventListener("keydown", event => {
                if (event.key === "Enter") {
                    if (item.type === "folder") this.openFolder(item.id);
                    else this.openFile(item);
                }
            });
            grid.appendChild(element);
        });

        document.getElementById("currentPath").textContent = this.fs.getPath(this.currentFolderId);
        this.updateSelection();
    }

    select(id) {
        this.selectedId = id;
        this.updateSelection();
    }

    updateSelection() {
        document.querySelectorAll("#fileGrid .file").forEach(element => {
            element.classList.toggle("selected", element.dataset.itemId === this.selectedId);
        });
        const disabled = !this.selectedId;
        document.getElementById("renameExplorerItem").disabled = disabled;
        document.getElementById("deleteExplorerItem").disabled = disabled;
    }

    async createFolder() {
        const name = await this.dialogs.prompt({ title: "Новая папка", message: "Введите название папки", value: "Новая папка" });
        if (name) this.run(() => this.fs.createFolder(this.currentFolderId, name), "Папка создана");
    }

    async createFile() {
        const name = await this.dialogs.prompt({ title: "Новый файл", message: "Введите имя текстового файла", value: "Новый файл.txt" });
        if (name) this.run(() => this.fs.createFile(this.currentFolderId, name, ""), "Файл создан");
    }

    async renameSelected() {
        const item = this.fs.getItem(this.selectedId);
        if (!item) return;
        const name = await this.dialogs.prompt({ title: "Переименование", message: "Введите новое имя", value: item.name });
        if (name && name !== item.name) this.run(() => this.fs.renameItem(item.id, name), "Объект переименован");
    }

    async deleteSelected() {
        const item = this.fs.getItem(this.selectedId);
        if (!item) return;
        const accepted = await this.dialogs.confirm({ title: "Удаление", message: "Удалить «" + item.name + "»?", confirmText: "Удалить", danger: true });
        if (!accepted) return;
        this.run(() => this.fs.deleteItem(item.id), "Объект удалён");
        this.selectedId = null;
    }

    run(action, message) {
        try {
            action();
            this.notifications.show({ title: "Проводник", message, icon: "📁" });
        } catch (error) {
            this.notifications.show({ title: "Ошибка", message: error.message, icon: "!" });
        }
    }
}
