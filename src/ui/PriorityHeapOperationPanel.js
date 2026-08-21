class PriorityHeapOperationPanel {
    constructor(module) {
        this.module = module;
        this.inputValue = document.getElementById('heapInputValue');

        document.getElementById('btnHeapInsert').addEventListener('click', () => this._handleInsert());
        document.getElementById('btnHeapExtractMin').addEventListener('click', () => this._handleExtractMin());
        document.getElementById('btnHeapPeek').addEventListener('click', () => this._handlePeek());
        document.getElementById('btnHeapClear').addEventListener('click', () => this._handleClear());
    }

    _handleInsert() {
        const normalized = String(this.inputValue.value || '').replace(/\s+/g, '').trim();
        if (!normalized || !/^-?\d+$/.test(normalized)) {
            this.module.appManager.getGlobals().consolePanel.log('Informe um numero inteiro para Insert.');
            return;
        }

        this.module.executeOperation('insert', [Number(normalized)], false, false);
        this.module.animationController.fastForward();
        this.inputValue.value = '';
    }

    _handleExtractMin() {
        this.module.executeOperation('extractMin', [], false, true, { tempSpeed: 0.45 });
    }

    _handlePeek() {
        this.module.executeOperation('peek', [], false, true);
    }

    _handleClear() {
        this.module.executeOperation('clear', [], false, false);
    }
}
