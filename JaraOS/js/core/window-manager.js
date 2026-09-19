const LAYOUT_CLASSES = ["maximized", "snap-left", "snap-right"];

function makeInstanceId(appId) {
    return appId + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

export class WindowManager extends EventTarget {
    constructor() {
        super();
        this.windows = new Map();
        this.zIndex = 20;
        this.snapPopup = null;
        this.snapTargetId = null;
        this.snapTimer = null;
    }

    initialize() {
        this.createSnapPopup();
        return this;
    }

    registerWindow(appId, element, options = {}) {
        if (!element) throw new Error("Окно приложения " + appId + " не найдено");
        const existing = [...this.windows.values()].find(state => state.element === element);
        if (existing) return existing.instanceId;

        const instanceId = options.instanceId || element.id || makeInstanceId(appId);
        const state = {
            instanceId,
            appId,
            element,
            title: options.title || appId,
            icon: options.icon || "▣",
            persistent: options.persistent !== false,
            closed: true,
            minimized: false,
            focused: false,
            layout: "normal",
            normalRect: null,
            initialStyle: element.getAttribute("style") || ""
        };

        element.dataset.instanceId = instanceId;
        element.dataset.appId = appId;
        this.windows.set(instanceId, state);
        this.bindWindow(state);
        this.emit("register", state);
        return instanceId;
    }

    bindWindow(state) {
        const element = state.element;
        if (element.dataset.windowBound === "true") return;
        element.dataset.windowBound = "true";

        element.addEventListener("pointerdown", () => this.focus(state.instanceId));

        element.querySelectorAll(".window-buttons button").forEach(button => {
            button.addEventListener("click", event => {
                event.stopPropagation();
                const action = button.dataset.action;
                if (action === "close") this.close(state.instanceId);
                if (action === "min") this.minimize(state.instanceId);
                if (action === "max") this.toggleMaximize(state.instanceId);
            });
        });

        const header = element.querySelector(".window-header");
        if (header) {
            header.addEventListener("dblclick", event => {
                if (!event.target.closest(".window-buttons")) this.toggleMaximize(state.instanceId);
            });
            header.addEventListener("pointerdown", event => this.beginDrag(event, state));
        }

        const handle = document.createElement("div");
        handle.className = "resize-handle";
        handle.setAttribute("aria-hidden", "true");
        handle.addEventListener("pointerdown", event => this.beginResize(event, state));
        element.appendChild(handle);

        const maximizeButton = element.querySelector('[data-action="max"]');
        if (maximizeButton) {
            maximizeButton.addEventListener("mouseenter", () => this.showSnapPopup(state.instanceId, maximizeButton));
            maximizeButton.addEventListener("mouseleave", () => this.hideSnapPopupSoon());
        }
    }

    open(instanceId) {
        const state = this.require(instanceId);
        state.closed = false;
        state.minimized = false;
        state.element.classList.add("active");
        this.focus(instanceId);
        this.emit("open", state);
        return state;
    }

    close(instanceId) {
        const state = this.require(instanceId);
        state.closed = true;
        state.minimized = false;
        state.focused = false;
        state.layout = "normal";
        state.normalRect = null;
        state.element.classList.remove("active", "focused", ...LAYOUT_CLASSES);
        state.element.setAttribute("style", state.initialStyle);
        state.element.removeAttribute("data-window-state");
        if (!state.persistent) {
            state.element.remove();
            this.windows.delete(instanceId);
        }
        this.focusTopWindow();
        this.emit("close", state);
    }

    minimize(instanceId) {
        const state = this.require(instanceId);
        state.minimized = true;
        state.focused = false;
        state.element.classList.remove("active", "focused");
        state.element.dataset.windowState = "minimized";
        this.focusTopWindow();
        this.emit("minimize", state);
    }

    restore(instanceId) {
        const state = this.require(instanceId);
        state.closed = false;
        state.minimized = false;
        state.element.classList.add("active");
        if (state.layout !== "normal") this.restoreLayout(state);
        this.focus(instanceId);
        this.emit("restore", state);
    }

    focus(instanceId) {
        const state = this.windows.get(instanceId);
        if (!state || state.closed) return;
        this.windows.forEach(item => {
            item.focused = false;
            item.element.classList.remove("focused");
        });
        state.minimized = false;
        state.focused = true;
        state.element.classList.add("active", "focused");
        state.element.style.zIndex = String(++this.zIndex);
        state.element.dataset.windowState = state.layout;
        this.emit("focus", state);
    }

    toggleMaximize(instanceId) {
        const state = this.require(instanceId);
        if (state.layout === "maximized") {
            this.restoreLayout(state);
        } else {
            this.captureNormalRect(state);
            this.applyLayout(state, "maximized");
        }
        this.focus(instanceId);
    }

    snap(instanceId, side) {
        const state = this.require(instanceId);
        if (!state.closed) {
            this.captureNormalRect(state);
            this.applyLayout(state, side === "left" ? "snap-left" : "snap-right");
            this.focus(instanceId);
        }
    }

    applyLayout(state, layout) {
        state.element.classList.remove(...LAYOUT_CLASSES);
        state.element.style.removeProperty("left");
        state.element.style.removeProperty("right");
        state.element.style.removeProperty("top");
        state.element.style.removeProperty("bottom");
        state.element.style.removeProperty("width");
        state.element.style.removeProperty("height");
        state.element.style.removeProperty("transform");
        state.element.classList.add(layout);
        state.layout = layout;
        state.element.dataset.windowState = layout;
        this.emit("layout", state);
    }

    restoreLayout(state) {
        state.element.classList.remove(...LAYOUT_CLASSES);
        const rect = state.normalRect;
        if (rect) {
            state.element.style.left = rect.left + "px";
            state.element.style.top = rect.top + "px";
            state.element.style.width = rect.width + "px";
            state.element.style.height = rect.height + "px";
            state.element.style.transform = "none";
            state.element.style.removeProperty("right");
            state.element.style.removeProperty("bottom");
        }
        state.layout = "normal";
        state.element.dataset.windowState = "normal";
        this.emit("layout", state);
    }

    captureNormalRect(state) {
        if (state.layout !== "normal" || state.minimized) return;
        const rect = state.element.getBoundingClientRect();
        if (rect.width && rect.height) {
            state.normalRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        }
    }

    beginDrag(event, state) {
        if (event.button !== 0 || event.target.closest(".window-buttons")) return;
        event.preventDefault();
        this.focus(state.instanceId);
        if (state.layout !== "normal") this.restoreLayout(state);
        const rect = state.element.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;

        const move = moveEvent => {
            const maxLeft = Math.max(0, window.innerWidth - state.element.offsetWidth);
            const maxTop = Math.max(0, window.innerHeight - 48 - state.element.offsetHeight);
            state.element.style.left = Math.min(maxLeft, Math.max(0, moveEvent.clientX - offsetX)) + "px";
            state.element.style.top = Math.min(maxTop, Math.max(0, moveEvent.clientY - offsetY)) + "px";
            state.element.style.transform = "none";
        };
        const end = () => {
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", end);
            this.captureNormalRect(state);
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", end, { once: true });
    }

    beginResize(event, state) {
        if (event.button !== 0 || state.layout !== "normal") return;
        event.preventDefault();
        event.stopPropagation();
        this.focus(state.instanceId);
        const rect = state.element.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;
        state.element.style.left = rect.left + "px";
        state.element.style.top = rect.top + "px";
        state.element.style.transform = "none";

        const move = moveEvent => {
            state.element.style.width = Math.max(360, Math.min(window.innerWidth - rect.left, rect.width + moveEvent.clientX - startX)) + "px";
            state.element.style.height = Math.max(240, Math.min(window.innerHeight - 48 - rect.top, rect.height + moveEvent.clientY - startY)) + "px";
        };
        const end = () => {
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", end);
            this.captureNormalRect(state);
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", end, { once: true });
    }

    createSnapPopup() {
        if (this.snapPopup) return;
        this.snapPopup = document.createElement("div");
        this.snapPopup.className = "snap-popup";
        this.snapPopup.innerHTML = '<button class="snap-option snap-left-opt" data-layout="left" title="Слева"><i></i></button>' +
            '<button class="snap-option snap-full-opt" data-layout="max" title="Во весь экран"><i></i></button>' +
            '<button class="snap-option snap-right-opt" data-layout="right" title="Справа"><i></i></button>';
        this.snapPopup.addEventListener("mouseenter", () => clearTimeout(this.snapTimer));
        this.snapPopup.addEventListener("mouseleave", () => this.hideSnapPopupSoon());
        this.snapPopup.addEventListener("click", event => {
            const button = event.target.closest("button[data-layout]");
            if (!button || !this.snapTargetId) return;
            if (button.dataset.layout === "max") this.toggleMaximize(this.snapTargetId);
            else this.snap(this.snapTargetId, button.dataset.layout);
            this.snapPopup.classList.remove("open");
        });
        document.body.appendChild(this.snapPopup);
    }

    showSnapPopup(instanceId, button) {
        clearTimeout(this.snapTimer);
        this.snapTargetId = instanceId;
        const rect = button.getBoundingClientRect();
        this.snapPopup.style.left = Math.max(8, rect.left - 50) + "px";
        this.snapPopup.style.top = rect.bottom + 6 + "px";
        this.snapPopup.classList.add("open");
    }

    hideSnapPopupSoon() {
        clearTimeout(this.snapTimer);
        this.snapTimer = setTimeout(() => this.snapPopup?.classList.remove("open"), 180);
    }

    focusTopWindow() {
        const candidates = [...this.windows.values()].filter(state => !state.closed && !state.minimized);
        const top = candidates.sort((a, b) => Number(b.element.style.zIndex || 0) - Number(a.element.style.zIndex || 0))[0];
        if (top) this.focus(top.instanceId);
    }

    getRunning(appId = null) {
        return [...this.windows.values()].filter(state => !state.closed && (!appId || state.appId === appId));
    }

    getState(instanceId) {
        return this.windows.get(instanceId) || null;
    }

    require(instanceId) {
        const state = this.windows.get(instanceId);
        if (!state) throw new Error("Окно не зарегистрировано: " + instanceId);
        return state;
    }

    emit(action, state) {
        this.dispatchEvent(new CustomEvent("change", { detail: { action, state } }));
    }
}
