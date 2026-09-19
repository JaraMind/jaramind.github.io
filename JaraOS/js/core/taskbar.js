export class TaskbarController {
    constructor(container, appManager, windowManager) {
        this.container = container;
        this.appManager = appManager;
        this.windowManager = windowManager;
    }

    initialize() {
        this.appManager.addEventListener("instanceschange", () => this.render());
        this.render();
        return this;
    }

    render() {
        if (!this.container) return;
        this.container.replaceChildren();
        this.windowManager.getRunning().forEach(state => {
            const app = this.appManager.getApp(state.appId);
            const button = document.createElement("button");
            button.className = "task-app";
            button.classList.toggle("active", state.focused && !state.minimized);
            button.classList.toggle("minimized", state.minimized);
            button.textContent = app.icon;
            button.title = app.name;
            button.dataset.instanceId = state.instanceId;
            button.addEventListener("click", () => {
                if (state.focused && !state.minimized) this.windowManager.minimize(state.instanceId);
                else this.windowManager.restore(state.instanceId);
            });
            this.container.appendChild(button);
        });
    }
}
