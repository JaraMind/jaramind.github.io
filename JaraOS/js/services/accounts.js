import { Storage } from "./storage.js";

const DEFAULT_ACCOUNT = { id: "local", name: "Jara", password: "1234" };

class AccountsService extends EventTarget {
    constructor() {
        super();
        this.data = null;
    }

    initialize() {
        if (this.data) return this;
        this.data = Storage.get("accounts", null);
        if (!this.data || !Array.isArray(this.data.users) || this.data.users.length === 0) {
            this.data = { users: [{ ...DEFAULT_ACCOUNT }], currentUser: DEFAULT_ACCOUNT.id };
            this.persist("initialize");
        }
        if (!this.getCurrentUser()) {
            this.data.currentUser = this.data.users[0].id;
            this.persist("repair-current-user");
        }
        return this;
    }

    persist(action) {
        Storage.set("accounts", this.data);
        this.dispatchEvent(new CustomEvent("change", { detail: { action, user: this.getCurrentUser() } }));
    }

    getUsers() {
        return this.data.users.map(user => ({ ...user }));
    }

    getCurrentUser() {
        if (!this.data) return null;
        return this.data.users.find(user => user.id === this.data.currentUser) || null;
    }

    login(userId, password) {
        const user = this.data.users.find(candidate => candidate.id === userId);
        if (!user || user.password !== password) return false;
        this.data.currentUser = user.id;
        this.persist("login");
        return true;
    }

    selectUser(userId) {
        const user = this.data.users.find(candidate => candidate.id === userId);
        if (!user) throw new Error("JaraID не найден");
        this.data.currentUser = user.id;
        this.persist("select-user");
        return { ...user };
    }

    logout() {
        this.dispatchEvent(new CustomEvent("logout", { detail: { user: this.getCurrentUser() } }));
    }

    createUser(name, password) {
        const cleanName = String(name || "").trim();
        if (!cleanName || !String(password || "")) throw new Error("Введите имя и пароль");
        const id = "jaraid_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
        const user = { id, name: cleanName, password: String(password) };
        this.data.users.push(user);
        this.data.currentUser = id;
        this.persist("create-user");
        return { ...user };
    }
}

export const Accounts = new AccountsService();
