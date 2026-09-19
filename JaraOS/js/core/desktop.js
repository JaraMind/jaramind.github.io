export class DesktopController {
    constructor({ container, desktop, fs, appManager, contextMenu, dialogs, notifications, openItem }) {
        this.container = container;
        this.desktop = desktop;
        this.fs = fs;
        this.appManager = appManager;
        this.contextMenu = contextMenu;
        this.dialogs = dialogs;
        this.notifications = notifications;
        this.openItem = openItem;
        this.selectedId = null;
    }

    initialize() {
        this.fs.addEventListener("change", () => this.render());
        this.appManager.addEventListener("change", () => this.render());
        this.desktop.addEventListener("pointerdown", event => {
            if (!event.target.closest(".desktop-icon")) {
                this.selectedId = null;
                this.renderSelection();
            }
        });
        this.desktop.addEventListener("contextmenu", event => this.handleContextMenu(event));
        this.render();
        return this;
    }

    render() {
        this.container.replaceChildren();
        this.appManager.getApps().filter(app => app.showOnDesktop).forEach(app => {
            this.container.appendChild(this.makeIcon(app.icon, app.name, "app:" + app.id, () => this.appManager.launch(app.id)));
        });
        this.fs.getChildren("desktop").forEach(item => {
            const icon = item.type === "folder" ? "📁" : (item.extension === "txt" ? "📄" : "📃");
            this.container.appendChild(this.makeIcon(icon, item.name, item.id, () => this.openItem(item)));
        });
        this.renderSelection();
    }

    makeIcon(iconText, labelText, id, open) {
        const icon = document.createElement("div");
        icon.className = "desktop-icon";
        icon.dataset.itemId = id;
        icon.tabIndex = 0;
        const glyph = document.createElement("div");
        glyph.className = "icon";
        glyph.textContent = iconText;
        const label = document.createElement("span");
        label.textContent = labelText;
        icon.append(glyph, label);
        icon.addEventListener("click", event => {
            event.stopPropagation();
            this.selectedId = id;
            this.renderSelection();
        });
        icon.addEventListener("dblclick", event => {
            event.stopPropagation();
            open();
        });
        icon.addEventListener("keydown", event => {
            if (event.key === "Enter") open();
        });
        return icon;
    }

    renderSelection() {
        this.container.querySelectorAll(".desktop-icon").forEach(icon => {
            icon.classList.toggle("selected", icon.dataset.itemId === this.selectedId);
        });
    }

    handleContextMenu(event) {
        if (event.target.closest(".window, .taskbar, .start-menu")) return;
        event.preventDefault();
        const icon = event.target.closest(".desktop-icon");
        const itemId = icon?.dataset.itemId;

        if (itemId && !itemId.startsWith("app:")) {
            this.selectedId = itemId;
            this.renderSelection();
            const item = this.fs.getItem(itemId);
            this.contextMenu.show(event.clientX, event.clientY, [
                { label: "Открыть", action: () => this.openItem(item) },
                { separator: true },
                { label: "Переименовать", action: () => this.rename(item) },
                { label: "Удалить", action: () => this.remove(item) }
            ]);
            return;
        }

        this.contextMenu.show(event.clientX, event.clientY, [
            { label: "📁 Новая папка", action: () => this.createFolder() },
            { label: "📄 Новый текстовый файл", action: () => this.createFile() },
            { label: "🔄 Обновить", action: () => this.render() },
            { separator: true },
            { label: "⚙ Параметры", action: () => this.appManager.launch("settings") },
            { label: "🎨 Персонализация", action: () => {
                this.appManager.launch("settings");
                document.dispatchEvent(new CustomEvent("jaraos:settings-tab", { detail: "personalization" }));
            } }
        ]);
    }

    async createFolder() {
        const name = await this.dialogs.prompt({ title: "Новая папка", message: "Введите название папки", value: "Новая папка" });
        if (!name) return;
        this.run(() => this.fs.createFolder("desktop", name), "Папка создана");
    }

    async createFile() {
        const name = await this.dialogs.prompt({ title: "Новый файл", message: "Введите имя текстового файла", value: "Новый файл.txt" });
        if (!name) return;
        this.run(() => this.fs.createFile("desktop", name, ""), "Файл создан");
    }

    async rename(item) {
        const name = await this.dialogs.prompt({ title: "Переименование", message: "Введите новое имя", value: item.name });
        if (!name || name === item.name) return;
        this.run(() => this.fs.renameItem(item.id, name), "Объект переименован");
    }

    async remove(item) {
        const accepted = await this.dialogs.confirm({ title: "Удаление", message: "Удалить «" + item.name + "»?", confirmText: "Удалить", danger: true });
        if (!accepted) return;
        this.run(() => this.fs.deleteItem(item.id), "Объект удалён");
    }

    run(action, successMessage) {
        try {
            action();
            this.notifications.show({ title: "JaraFS", message: successMessage, icon: "📁" });
        } catch (error) {
            this.notifications.show({ title: "Ошибка JaraFS", message: error.message, icon: "!" });
        }
    }
}
