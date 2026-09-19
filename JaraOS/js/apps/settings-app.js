export class SettingsApp {
    constructor({ settings, accounts, license, updater, notifications, lock }) {
        this.settings = settings;
        this.accounts = accounts;
        this.license = license;
        this.updater = updater;
        this.notifications = notifications;
        this.lock = lock;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return this;
        this.initialized = true;

        document.querySelectorAll(".setting-tab").forEach(button => {
            button.addEventListener("click", () => this.switchTab(button.dataset.tab));
        });
        document.addEventListener("jaraos:settings-tab", event => this.switchTab(event.detail));

        const accent = document.getElementById("accentPicker");
        const wallpaper = document.getElementById("wallpaperSelect");
        const theme = document.getElementById("themeSelect");
        accent.value = this.settings.get("accent");
        wallpaper.value = this.settings.get("wallpaper");
        theme.value = this.settings.get("theme");

        accent.addEventListener("input", event => this.changeSetting("accent", event.target.value));
        wallpaper.addEventListener("change", event => this.changeSetting("wallpaper", event.target.value));
        theme.addEventListener("change", event => this.changeSetting("theme", event.target.value));

        document.getElementById("lockNow")?.addEventListener("click", () => this.lock());
        document.getElementById("checkUpdates")?.addEventListener("click", () => this.checkUpdates());
        document.getElementById("activateLicense")?.addEventListener("click", () => this.activateLicense());
        document.getElementById("licenseInput")?.addEventListener("keydown", event => {
            if (event.key === "Enter") this.activateLicense();
        });
        document.getElementById("closeAccountModal")?.addEventListener("click", () => this.closeAccounts());
        document.getElementById("createAccount")?.addEventListener("click", () => this.createAccount());
        this.accounts.addEventListener("change", () => this.render());
        this.license.addEventListener("change", () => this.renderLicense());
        this.render();
        return this;
    }

    launch(options = {}) {
        if (options.tab) this.switchTab(options.tab);
        this.render();
        return { element: document.getElementById("settings"), persistent: true };
    }

    switchTab(tab) {
        document.querySelectorAll(".setting-tab").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
        document.querySelectorAll(".setting-page").forEach(page => page.classList.toggle("active", page.id === "tab-" + tab));
    }

    changeSetting(key, value) {
        this.settings.set(key, value);
        this.settings.apply();
    }

    render() {
        const user = this.accounts.getCurrentUser();
        document.getElementById("systemUser").textContent = "JaraID: " + user.name;
        this.renderJaraID();
        this.renderLicense();
    }

    renderJaraID() {
        const user = this.accounts.getCurrentUser();
        const panel = document.getElementById("jaraIdPanel");
        panel.replaceChildren();
        const card = document.createElement("div");
        card.className = "info-card";
        const name = document.createElement("b");
        name.textContent = "👤 " + user.name;
        const id = document.createElement("span");
        id.textContent = "JaraID: " + user.id;
        const status = document.createElement("span");
        status.textContent = "Статус: LOCAL PROFILE";
        card.append(name, id, status);
        const manage = document.createElement("button");
        manage.className = "secondary";
        manage.textContent = "Управление аккаунтами";
        manage.addEventListener("click", () => this.openAccounts());
        panel.append(card, manage);
    }

    openAccounts() {
        document.getElementById("accountModal").classList.remove("hidden");
        this.renderAccounts();
    }

    closeAccounts() {
        document.getElementById("accountModal").classList.add("hidden");
    }

    renderAccounts() {
        const list = document.getElementById("accountList");
        list.replaceChildren();
        const title = document.createElement("h3");
        title.textContent = "Аккаунты";
        list.appendChild(title);
        this.accounts.getUsers().forEach(user => {
            const item = document.createElement("div");
            item.className = "account-item";
            const label = document.createElement("span");
            label.textContent = "👤 " + user.name;
            const login = document.createElement("button");
            login.textContent = user.id === this.accounts.getCurrentUser().id ? "Текущий" : "Выбрать";
            login.disabled = user.id === this.accounts.getCurrentUser().id;
            login.addEventListener("click", () => {
                this.accounts.selectUser(user.id);
                this.closeAccounts();
                this.lock();
            });
            item.append(label, login);
            list.appendChild(item);
        });
    }

    createAccount() {
        const nameInput = document.getElementById("accountName");
        const passwordInput = document.getElementById("accountPass");
        try {
            this.accounts.createUser(nameInput.value, passwordInput.value);
            nameInput.value = "";
            passwordInput.value = "";
            this.renderAccounts();
            this.notifications.show({ title: "JaraID", message: "Локальный профиль создан", icon: "👤" });
        } catch (error) {
            this.notifications.show({ title: "JaraID", message: error.message, icon: "!" });
        }
    }

    renderLicense() {
        const active = this.license.isActive();
        document.getElementById("licenseStatus").textContent = active ? "✓ JaraOS АКТИВИРОВАНА" : "○ JaraOS работает в DEMO-режиме";
        document.getElementById("systemLicense").textContent = "Лицензия: " + (active ? "АКТИВИРОВАНА" : "НЕ АКТИВИРОВАНА");
    }

    activateLicense() {
        const input = document.getElementById("licenseInput");
        if (this.license.activate(input.value)) {
            input.value = "";
            this.notifications.show({ title: "JaraOS", message: "Лицензия успешно активирована", icon: "✓" });
        } else {
            this.notifications.show({ title: "JaraOS", message: "Неверный лицензионный ключ", icon: "!" });
        }
    }

    async checkUpdates() {
        const status = document.getElementById("updateStatus");
        status.textContent = "Проверка версии…";
        try {
            const result = await this.updater.check();
            status.textContent = result.updateAvailable ? "Доступна версия " + result.latestVersion : "Установлена последняя версия " + result.currentVersion;
        } catch (error) {
            status.textContent = "Не удалось проверить обновления";
        }
    }
}
