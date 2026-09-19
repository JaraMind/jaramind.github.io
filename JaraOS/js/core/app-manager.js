export class AppManager extends EventTarget {
    constructor(windowManager) {
        super();
        this.windowManager = windowManager;
        this.apps = new Map();
        this.windowManager.addEventListener("change", event => {
            this.dispatchEvent(new CustomEvent("instanceschange", { detail: event.detail }));
        });
    }

    registerApp(definition) {
        if (!definition?.id || !definition?.name || typeof definition.launch !== "function") {
            throw new Error("Приложению нужны id, name и launch()");
        }
        if (this.apps.has(definition.id)) throw new Error("Приложение уже зарегистрировано: " + definition.id);
        const app = {
            icon: "▣",
            singleton: true,
            showInStart: true,
            showOnDesktop: true,
            ...definition
        };
        this.apps.set(app.id, app);
        this.dispatchEvent(new CustomEvent("change", { detail: { action: "register", app } }));
        return app;
    }

    launch(appId, options = {}) {
        const app = this.getApp(appId);
        const running = this.windowManager.getRunning(appId);
        if (app.singleton && running.length) {
            app.activate?.({ app, options, manager: this, instanceId: running[0].instanceId });
            this.windowManager.restore(running[0].instanceId);
            return running[0].instanceId;
        }

        const result = app.launch({ app, options, manager: this }) || {};
        const element = result instanceof HTMLElement ? result : result.element;
        if (!element) throw new Error("launch() приложения " + appId + " не вернул окно");
        const instanceId = this.windowManager.registerWindow(appId, element, {
            instanceId: result.instanceId,
            title: app.name,
            icon: app.icon,
            persistent: result.persistent !== false
        });
        this.windowManager.open(instanceId);
        this.dispatchEvent(new CustomEvent("launch", { detail: { app, instanceId } }));
        return instanceId;
    }

    close(instanceId) {
        this.windowManager.close(instanceId);
    }

    getRunningInstances(appId = null) {
        return this.windowManager.getRunning(appId);
    }

    isRunning(appId) {
        return this.getRunningInstances(appId).length > 0;
    }

    getApp(appId) {
        const app = this.apps.get(appId);
        if (!app) throw new Error("Приложение не зарегистрировано: " + appId);
        return app;
    }

    getApps() {
        return [...this.apps.values()];
    }
}
