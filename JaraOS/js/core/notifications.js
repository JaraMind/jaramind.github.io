export class NotificationService {
    constructor(container) {
        this.container = container;
    }

    show({ title = "JaraOS", message = "", icon = "J", timeout = 3500 } = {}) {
        if (!this.container) return null;
        const toast = document.createElement("div");
        toast.className = "notification-toast";

        const badge = document.createElement("div");
        badge.className = "notification-icon";
        badge.textContent = icon;

        const content = document.createElement("div");
        const heading = document.createElement("strong");
        const body = document.createElement("span");
        heading.textContent = title;
        body.textContent = message;
        content.append(heading, body);
        toast.append(badge, content);
        this.container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add("visible"));
        const close = () => {
            toast.classList.remove("visible");
            toast.addEventListener("transitionend", () => toast.remove(), { once: true });
            setTimeout(() => toast.remove(), 250);
        };
        toast.addEventListener("click", close);
        if (timeout > 0) setTimeout(close, timeout);
        return { element: toast, close };
    }
}
