class ArrayOperationPanel {
    constructor(arrayModule) {
        this.module = arrayModule;
        
        // Inputs
        this.inputValue = document.getElementById('arrayInputValue');
        this.inputIndex = document.getElementById('arrayInputIndex');
        this.inputRemoveIndex = document.getElementById('arrayRemoveIndex');
        this.inputGetIndex = document.getElementById('arrayGetIndex');
        
        // Buttons
        document.getElementById('btnArrayAdd').addEventListener('click', () => this._handleAdd());
        document.getElementById('btnArrayAddLast').addEventListener('click', () => this._handleAddLast());
        document.getElementById('btnArrayRemove').addEventListener('click', () => this._handleRemove());
        document.getElementById('btnArrayGet').addEventListener('click', () => this._handleGet());
        
        const btnSearch = document.getElementById('btnArraySearchValue');
        if (btnSearch) {
            btnSearch.addEventListener('click', () => this._handleSearchValue());
        }

        document.getElementById('btnArrayClear').addEventListener('click', () => this._handleClear());
    }

    _handleAdd() {
        const val = this.inputValue.value;
        const idx = parseInt(this.inputIndex.value);
        if (!val || isNaN(idx)) {
            this.module.appManager.getGlobals().consolePanel.log('Insira um valor e um indice valido para insercao.', 'system');
            return;
        }
        this.module.executeOperation('add', [idx, val]);
        this.inputValue.value = '';
        this.inputIndex.value = '';
    }

    _handleAddLast() {
        const val = this.inputValue.value || Math.floor(Math.random() * 100);
        this.module.executeOperation('addLast', [val]);
        this.inputValue.value = '';
    }

    _handleRemove() {
        const idx = parseInt(this.inputRemoveIndex.value);
        if (isNaN(idx)) return;
        this.module.executeOperation('remove', [idx]);
        this.inputRemoveIndex.value = '';
    }

    _handleGet() {
        const idx = parseInt(this.inputGetIndex.value);
        if (isNaN(idx)) return;
        this.module.executeOperation('get', [idx]);
        this.inputGetIndex.value = '';
    }

    _handleSearchValue() {
        const inputSearchValue = document.getElementById('arraySearchValue');
        if (!inputSearchValue) return;
        const val = inputSearchValue.value.trim();
        if (val === '') {
            this.module.appManager.getGlobals().consolePanel.log('Informe um valor para buscar.', 'system');
            return;
        }
        this.module.executeOperation('indexOf', [val]);
        inputSearchValue.value = '';
    }

    _handleClear() {
        this.module.executeOperation('clear', []);
    }
}
