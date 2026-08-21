class ConsolePanel {
    constructor() {
        this.container = document.getElementById('executionLog');
    }

    log(message) {
        if (!this.container) return;
        this.container.innerHTML = message;
    }

    clear() {
        if (this.container) this.container.textContent = 'Aguardando opera\u00e7\u00e3o...';
    }
}

