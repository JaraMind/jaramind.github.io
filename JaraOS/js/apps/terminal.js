export class TerminalApp {
    constructor({ fs, accounts, license, lock }) {
        this.fs = fs;
        this.accounts = accounts;
        this.license = license;
        this.lock = lock;
        this.cwdId = "desktop";
        this.output = null;
        this.input = null;
        this.prompt = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return this;
        this.initialized = true;
        this.output = document.getElementById("terminalOutput");
        this.input = document.getElementById("terminalInput");
        this.prompt = document.getElementById("terminalPrompt");
        this.input.addEventListener("keydown", event => {
            if (event.key !== "Enter") return;
            const command = this.input.value.trim();
            this.input.value = "";
            if (!command) return;
            this.print(this.prompt.textContent + " " + command, "terminal-command");
            this.execute(command);
        });
        this.updatePrompt();
        return this;
    }

    launch() {
        setTimeout(() => this.input?.focus(), 0);
        return { element: document.getElementById("terminal"), persistent: true };
    }

    print(text, className = "") {
        const line = document.createElement("div");
        line.className = "terminal-entry" + (className ? " " + className : "");
        line.textContent = String(text);
        this.output.insertBefore(line, this.output.querySelector(".terminal-line"));
        this.output.scrollTop = this.output.scrollHeight;
    }

    tokenize(command) {
        const tokens = [];
        const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
        let match;
        while ((match = pattern.exec(command))) tokens.push(match[1] ?? match[2] ?? match[3]);
        return tokens;
    }

    execute(command) {
        const parts = this.tokenize(command);
        const name = String(parts.shift() || "").toLocaleLowerCase();
        try {
            switch (name) {
                case "help":
                    [
                        "help — список команд", "clear — очистить терминал", "pwd — текущий путь",
                        "ls [путь] — содержимое папки", "cd <путь> — перейти в папку",
                        "mkdir <имя> — создать папку", "touch <имя> — создать файл",
                        "cat <файл> — прочитать файл", "echo <текст> [> файл] — вывести или записать текст",
                        "rm <путь> — удалить файл или папку", "whoami, neofetch, time, lock, license"
                    ].forEach(line => this.print(line));
                    break;
                case "clear":
                    this.output.querySelectorAll(".terminal-entry").forEach(element => element.remove());
                    break;
                case "pwd":
                    this.print(this.fs.getPath(this.cwdId));
                    break;
                case "ls":
                    this.list(parts[0]);
                    break;
                case "cd":
                    this.changeDirectory(parts[0] || "/Desktop");
                    break;
                case "mkdir":
                    this.createAtPath(parts.join(" "), "folder");
                    break;
                case "touch":
                    this.touch(parts.join(" "));
                    break;
                case "cat":
                    this.cat(parts.join(" "));
                    break;
                case "echo":
                    this.echo(parts);
                    break;
                case "rm":
                    this.remove(parts.join(" "));
                    break;
                case "time":
                    this.print(new Date().toLocaleTimeString("ru-RU"));
                    break;
                case "whoami":
                    this.print("JaraID: " + this.accounts.getCurrentUser().name);
                    break;
                case "lock":
                    this.lock();
                    break;
                case "license":
                    this.print(this.license.isActive() ? "LICENSE: VALID" : "LICENSE: DEMO");
                    break;
                case "neofetch":
                    this.print("JaraOS 3.0 | JaraCore Web Kernel");
                    this.print("JaraID: " + this.accounts.getCurrentUser().name);
                    this.print("License: " + (this.license.isActive() ? "ACTIVE" : "DEMO"));
                    break;
                default:
                    this.print("Команда не найдена. Введите help.", "terminal-error");
            }
        } catch (error) {
            this.print("Ошибка: " + error.message, "terminal-error");
        }
    }

    list(path) {
        const target = path ? this.fs.resolvePath(path, this.cwdId) : this.fs.getItem(this.cwdId);
        if (!target) throw new Error("Путь не найден");
        if (target.type === "file") {
            this.print(target.name);
            return;
        }
        const children = this.fs.getChildren(target.id);
        this.print(children.length ? children.map(item => item.name + (item.type === "folder" ? "/" : "")).join("  ") : "(пусто)");
    }

    changeDirectory(path) {
        const target = this.fs.resolvePath(path, this.cwdId);
        if (!target) throw new Error("Путь не найден");
        if (target.type !== "folder") throw new Error("Это не папка");
        this.cwdId = target.id;
        this.updatePrompt();
    }

    splitTarget(path) {
        const value = String(path || "").trim();
        if (!value) throw new Error("Укажите имя");
        const slash = value.lastIndexOf("/");
        const name = value.slice(slash + 1);
        const parentPath = slash < 0 ? "." : (value.slice(0, slash) || "/");
        const parent = this.fs.resolvePath(parentPath, this.cwdId);
        if (!parent || parent.type !== "folder") throw new Error("Родительская папка не найдена");
        return { parent, name };
    }

    createAtPath(path, type) {
        const { parent, name } = this.splitTarget(path);
        if (type === "folder") this.fs.createFolder(parent.id, name);
        else this.fs.createFile(parent.id, name, "");
    }

    touch(path) {
        const existing = this.fs.resolvePath(path, this.cwdId);
        if (existing) {
            if (existing.type !== "file") throw new Error("Это не файл");
            this.fs.writeFile(existing.id, this.fs.readFile(existing.id));
            return;
        }
        this.createAtPath(path, "file");
    }

    cat(path) {
        const file = this.fs.resolvePath(path, this.cwdId);
        if (!file) throw new Error("Файл не найден");
        this.print(this.fs.readFile(file.id));
    }

    echo(parts) {
        const redirectIndex = parts.indexOf(">");
        if (redirectIndex < 0) {
            this.print(parts.join(" "));
            return;
        }
        const content = parts.slice(0, redirectIndex).join(" ");
        const path = parts.slice(redirectIndex + 1).join(" ");
        if (!path) throw new Error("После > укажите файл");
        const existing = this.fs.resolvePath(path, this.cwdId);
        if (existing) this.fs.writeFile(existing.id, content);
        else {
            const target = this.splitTarget(path);
            this.fs.createFile(target.parent.id, target.name, content);
        }
    }

    remove(path) {
        if (!String(path || "").trim()) throw new Error("Укажите путь для удаления");
        const item = this.fs.resolvePath(path, this.cwdId);
        if (!item) throw new Error("Путь не найден");
        if (item.id === this.cwdId) throw new Error("Нельзя удалить текущую папку");
        this.fs.deleteItem(item.id);
    }

    updatePrompt() {
        if (!this.prompt) return;
        const user = this.accounts.getCurrentUser()?.name || "jara";
        this.prompt.textContent = user.toLocaleLowerCase().replace(/\s+/g, "-") + "@JaraOS:" + this.fs.getPath(this.cwdId) + "$";
    }
}
