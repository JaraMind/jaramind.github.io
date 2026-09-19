export class StartMenuController {
    constructor({ menu, button, appsContainer, search, appManager, onLock }) {
        this.menu = menu;
        this.button = button;
        this.appsContainer = appsContainer;
        this.search = search;
        this.appManager = appManager;
        this.onLock = onLock;
    }

    initialize() {
        this.render();
        this.button?.addEventListener("click", event => {
            event.stopPropagation();
            this.menu.classList.toggle("open");
        });
        this.search?.addEventListener("input", () => this.filter(this.search.value));
        document.addEventListener("click", event => {
            if (!this.menu.contains(event.target) && !this.button.contains(event.target)) this.close();
        });
        document.getElementById("lockFromMenu")?.addEventListener("click", () => {
            this.close();
            this.onLock();
        });
        this.appManager.addEventListener("change", () => this.render());
        return this;
    }

    render() {
        this.appsContainer.replaceChildren();
        this.appManager.getApps().filter(app => app.showInStart).forEach(app => {
            const button = document.createElement("button");
            button.dataset.app = app.id;
            const icon = document.createElement("span");
            icon.className = "app-tile-icon";
            icon.textContent = app.icon;
            const label = document.createElement("span");
            label.textContent = app.name;
            button.append(icon, label);
            button.addEventListener("click", () => {
                this.appManager.launch(app.id);
                this.close();
            });
            this.appsContainer.appendChild(button);
        });
    }

    filter(query) {
        const value = String(query || "").toLocaleLowerCase();
        this.appsContainer.querySelectorAll("button").forEach(button => {
            button.hidden = !button.textContent.toLocaleLowerCase().includes(value);
        });
    }

    close() {
        this.menu.classList.remove("open");
    }
}
