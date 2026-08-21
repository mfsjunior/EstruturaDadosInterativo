class HashTableOperationPanel {
    constructor(module) {
        this.module = module;
        this.inputKey = document.getElementById('hashInputKey');
        this.inputValue = document.getElementById('hashInputValue');

        document.getElementById('btnHashPut').addEventListener('click', () => this._handlePut());
        document.getElementById('btnHashGet').addEventListener('click', () => this._handleGet());
        document.getElementById('btnHashRemove').addEventListener('click', () => this._handleRemove());
        document.getElementById('btnHashClear').addEventListener('click', () => this._handleClear());
    }

    _normalizedKey() {
        return String(this.inputKey.value || '').trim();
    }

    _handlePut() {
        const key = this._normalizedKey();
        const value = String(this.inputValue.value || '').trim();
        if (!key || !value) {
            this.module.appManager.getGlobals().consolePanel.log('Informe chave e valor para Put.');
            return;
        }

        this.module.executeOperation('put', [key, value], false, true);
        this.inputKey.value = '';
        this.inputValue.value = '';
    }

    _handleGet() {
        const key = this._normalizedKey();
        if (!key) {
            this.module.appManager.getGlobals().consolePanel.log('Informe a chave para Get.');
            return;
        }

        this.module.executeOperation('get', [key], false, true, { tempSpeed: 0.65 });
    }

    _handleRemove() {
        const key = this._normalizedKey();
        if (!key) {
            this.module.appManager.getGlobals().consolePanel.log('Informe a chave para Remove.');
            return;
        }

        this.module.executeOperation('remove', [key], false, true, { tempSpeed: 0.55 });
    }

    _handleClear() {
        this.module.executeOperation('clear', [], false, false);
    }
}