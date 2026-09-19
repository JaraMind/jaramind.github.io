export class ContextMenuController {
    constructor(element) {
        this.element = element;
    }

    initialize() {
        document.addEventListener("pointerdown", event => {
            if (!this.element.contains(event.target)) this.hide();
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") this.hide();
        });
        window.addEventListener("blur", () => this.hide());
        return this;
    }

    show(x, y, items) {
        this.element.replaceChildren();
        items.forEach(item => {
            if (item.separator) {
                this.element.appendChild(document.createElement("hr"));
                return;
            }
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = item.label;
            button.disabled = Boolean(item.disabled);
            button.addEventListener("click", () => {
                this.hide();
                item.action?.();
            });
            this.element.appendChild(button);
        });
        this.element.classList.add("open");
        const rect = this.element.getBoundingClientRect();
        this.element.style.left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)) + "px";
        this.element.style.top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 56)) + "px";
    }

    hide() {
        this.element.classList.remove("open");
    }
}
