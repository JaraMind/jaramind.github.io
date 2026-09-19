export class DialogService {
    constructor() {
        this.resolve = null;
        this.element = document.createElement("div");
        this.element.className = "system-dialog hidden";
        this.element.innerHTML = '<form class="system-dialog-card">' +
            '<h2></h2><p></p><input autocomplete="off">' +
            '<div class="system-dialog-actions"><button type="button" data-dialog="cancel">Отмена</button>' +
            '<button type="submit" class="primary" data-dialog="confirm">ОК</button></div></form>';
        document.body.appendChild(this.element);
        this.form = this.element.querySelector("form");
        this.title = this.element.querySelector("h2");
        this.message = this.element.querySelector("p");
        this.input = this.element.querySelector("input");
        this.confirmButton = this.element.querySelector('[data-dialog="confirm"]');
        this.form.addEventListener("submit", event => {
            event.preventDefault();
            this.finish(this.input.hidden ? true : this.input.value);
        });
        this.element.querySelector('[data-dialog="cancel"]').addEventListener("click", () => this.finish(null));
        this.element.addEventListener("pointerdown", event => {
            if (event.target === this.element) this.finish(null);
        });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !this.element.classList.contains("hidden")) this.finish(null);
        });
    }

    prompt({ title = "JaraOS", message = "", value = "", placeholder = "", confirmText = "ОК" } = {}) {
        return this.open({ title, message, value, placeholder, confirmText, input: true });
    }

    confirm({ title = "Подтверждение", message = "", confirmText = "Продолжить", danger = false } = {}) {
        return this.open({ title, message, confirmText, input: false, danger });
    }

    open({ title, message, value = "", placeholder = "", confirmText, input, danger = false }) {
        if (this.resolve) this.finish(null);
        this.title.textContent = title;
        this.message.textContent = message;
        this.message.hidden = !message;
        this.input.hidden = !input;
        this.input.value = value;
        this.input.placeholder = placeholder;
        this.confirmButton.textContent = confirmText;
        this.confirmButton.classList.toggle("danger", danger);
        this.element.classList.remove("hidden");
        setTimeout(() => (input ? this.input : this.confirmButton).focus(), 0);
        if (input) setTimeout(() => this.input.select(), 0);
        return new Promise(resolve => { this.resolve = resolve; });
    }

    finish(value) {
        if (!this.resolve) return;
        const resolve = this.resolve;
        this.resolve = null;
        this.element.classList.add("hidden");
        resolve(value);
    }
}
