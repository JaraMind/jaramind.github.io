export class SystemBootManager extends EventTarget {
    constructor(screen, status) {
        super();
        this.screen = screen;
        this.status = status;
    }

    async run(steps) {
        try {
            for (const step of steps) {
                this.setStatus(step.label);
                await step.run();
            }
            this.setStatus("JaraOS готова");
            await new Promise(resolve => requestAnimationFrame(resolve));
            this.screen?.classList.add("complete");
            this.dispatchEvent(new Event("ready"));
        } catch (error) {
            this.setStatus("Ошибка загрузки: " + error.message);
            this.screen?.classList.add("failed");
            throw error;
        }
    }

    setStatus(message) {
        if (this.status) this.status.textContent = message;
    }
}
