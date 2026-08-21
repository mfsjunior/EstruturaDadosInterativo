class LinkedListOperationPanel {
    constructor(app) {
        this.app = app; // Reference to main app to trigger operations
        
        // Inputs
        this.inputValue = document.getElementById('inputValue');
        this.inputRemoveValue = document.getElementById('inputRemoveValue');
        this.inputIndex = document.getElementById('inputIndex');
        
        // Buttons
        document.getElementById('btnAddFirst').addEventListener('click', () => this._handleAddFirst());
        document.getElementById('btnAddLast').addEventListener('click', () => this._handleAddLast());
        document.getElementById('btnRemoveFirst').addEventListener('click', () => this._handleRemoveFirst());
        document.getElementById('btnRemoveValue').addEventListener('click', () => this._handleRemoveValue());
        document.getElementById('btnGet').addEventListener('click', () => this._handleGet());
        document.getElementById('btnClear').addEventListener('click', () => this._handleClear());
        document.getElementById('btnReset').addEventListener('click', () => this._handleReset());

        this._renderScenarioButtons();
    }

    _renderScenarioButtons() {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.linkedList)
            ? window.DemoScenarios.linkedList
            : [];

        if (!scenarios.length) return;

        this._renderScenarioButtonsInto('LinkedListControls', scenarios, 'controls-group');
        this._renderScenarioButtonsInto('expandedScenarioBar', scenarios, 'expanded-scenarios');
    }

    _renderScenarioButtonsInto(containerId, scenarios, extraClass = '') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const existing = container.querySelector('.scenarios-bar');
        if (existing) existing.remove();

        const bar = document.createElement('div');
        bar.className = `scenarios-bar ${extraClass}`.trim();

        scenarios.forEach((scenario) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'scenario-btn';
            button.textContent = scenario.label;
            button.addEventListener('click', () => {
                this.app.runScenario(scenario.id);
            });
            bar.appendChild(button);
        });

        container.appendChild(bar);
    }

    _handleAddFirst() {
        const val = this.inputValue.value || Math.floor(Math.random() * 100);
        this.app.executeOperation('addFirst', val);
        this.inputValue.value = '';
    }

    _handleAddLast() {
        const val = this.inputValue.value || Math.floor(Math.random() * 100);
        this.app.executeOperation('addLast', val);
        this.inputValue.value = '';
    }

    _handleRemoveFirst() {
        this.app.executeOperation('removeFirst');
    }

    _handleRemoveValue() {
        const val = this.inputRemoveValue.value;
        if (!val) return;
        this.app.executeOperation('removeValue', val);
        this.inputRemoveValue.value = '';
    }

    _handleGet() {
        const idx = parseInt(this.inputIndex.value);
        if (isNaN(idx)) return;
        this.app.executeOperation('get', idx);
        this.inputIndex.value = '';
    }

    _handleClear() {
        this.app.executeOperation('clear');
    }

    _handleReset() {
        this.app.resetSystem();
    }
}
