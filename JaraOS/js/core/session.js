export class SessionController {
    constructor({ accounts, openAccounts }) {
        this.accounts = accounts;
        this.openAccounts = openAccounts;
        this.lockScreen = document.getElementById("lockScreen");
        this.password = document.getElementById("lockPassword");
        this.error = document.getElementById("lockError");
    }

    initialize() {
        document.getElementById("unlockBtn")?.addEventListener("click", () => this.unlock());
        this.password?.addEventListener("keydown", event => {
            if (event.key === "Enter") this.unlock();
        });
        document.getElementById("switchAccountBtn")?.addEventListener("click", () => this.openAccounts());
        document.addEventListener("keydown", event => {
            if (event.ctrlKey && event.altKey && event.key.toLocaleLowerCase() === "l") this.lock();
        });
        this.accounts.addEventListener("change", () => this.renderUser());
        this.renderUser();
        this.updateClock();
        this.clockTimer = setInterval(() => this.updateClock(), 1000);
        return this;
    }

    lock() {
        this.accounts.logout();
        this.password.value = "";
        this.error.textContent = "";
        this.renderUser();
        this.lockScreen.style.display = "flex";
        setTimeout(() => this.password.focus(), 0);
    }

    unlock() {
        const user = this.accounts.getCurrentUser();
        if (this.accounts.login(user.id, this.password.value)) {
            this.lockScreen.style.display = "none";
            this.password.value = "";
            this.error.textContent = "";
        } else {
            this.error.textContent = "Неверный пароль JaraOS";
            this.password.select();
        }
    }

    renderUser() {
        const user = this.accounts.getCurrentUser();
        if (!user) return;
        document.getElementById("lockTitle").textContent = "Добро пожаловать, " + user.name;
        document.getElementById("lockAccount").textContent = "JaraID · " + user.name;
        const startUser = document.getElementById("startUser");
        if (startUser) startUser.textContent = "JaraID · " + user.name;
    }

    updateClock() {
        const current = new Date();
        const time = current.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
        document.getElementById("clock").textContent = time;
        document.getElementById("lockClock").textContent = time;
        document.getElementById("trayDate").textContent = current.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
        document.getElementById("lockDate").textContent = current.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
    }
}
