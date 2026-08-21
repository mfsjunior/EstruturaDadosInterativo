class CircularQueueOperationPanel {
    constructor(module) {
        this.module = module;

        this.inputValue = document.getElementById('queueInputValue');

        document.getElementById('btnQueueEnqueue').addEventListener('click', () => this._handleEnqueue());
        document.getElementById('btnQueueDequeue').addEventListener('click', () => this._handleDequeue());
        document.getElementById('btnQueuePeek').addEventListener('click', () => this._handlePeek());
        document.getElementById('btnQueueClear').addEventListener('click', () => this._handleClear());
    }

    _handleEnqueue() {
        const normalized = String(this.inputValue.value || '').replace(/\s+/g, '').trim();
        if (!normalized) {
            const globals = this.module.appManager.getGlobals();
            globals.consolePanel.log('Informe um valor para Enqueue.');
            return;
        }
        const val = /^-?\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : normalized;
        this.module.executeOperation('enqueue', [val], false, false);
        // Failsafe: if the operation remains at 0/N, advance one step to show immediate context.
        setTimeout(() => {
            const ctrl = this.module.animationController;
            if (!ctrl) return;
            if (ctrl.currentIndex === 0 && ctrl.steps.length > 0) {
                ctrl.stepForward();
            }
        }, 0);
        this.inputValue.value = '';
    }

    _handleDequeue() {
        this.module.executeOperation('dequeue', [], false, false);
    }

    _handlePeek() {
        this.module.executeOperation('peek', [], false, false);
    }

    _handleClear() {
        this.module.executeOperation('clear', [], false, false);
    }
}
