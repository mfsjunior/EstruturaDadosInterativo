class UnionFindOperationPanel {
    constructor(module) {
        this.module = module;
        this.sizeInput = document.getElementById('ufSizeInput');
        this.aInput = document.getElementById('ufInputA');
        this.bInput = document.getElementById('ufInputB');
        this.findInput = document.getElementById('ufFindInput');

        document.getElementById('btnUfReset').addEventListener('click', () => this._handleReset());
        document.getElementById('btnUfUnion').addEventListener('click', () => this._handleUnion());
        document.getElementById('btnUfFind').addEventListener('click', () => this._handleFind());
        document.getElementById('btnUfConnected').addEventListener('click', () => this._handleConnected());

        this._renderScenarioButtons();
    }

    _toInt(value) {
        const n = Number(String(value || '').trim());
        return Number.isInteger(n) ? n : null;
    }

    _renderScenarioButtons() {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.unionFind)
            ? window.DemoScenarios.unionFind
            : [];
        if (!scenarios.length) return;

        this._renderScenarioButtonsInto('UnionFindControls', scenarios, 'controls-group');
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
            button.className = 'scenario-btn';
            button.textContent = scenario.label;
            button.title = scenario.description || scenario.label;
            button.addEventListener('click', () => this.module.runScenario(scenario.id));
            bar.appendChild(button);
        });

        container.appendChild(bar);
    }

    _handleReset() {
        const size = this._toInt(this.sizeInput.value);
        this.module.executeOperation('reset', [size || 8]);
    }

    _handleUnion() {
        const a = this._toInt(this.aInput.value);
        const b = this._toInt(this.bInput.value);
        if (a === null || b === null) {
            this.module.appManager.getGlobals().consolePanel.log('Informe dois indices inteiros para union.');
            return;
        }
        this.module.executeOperation('union', [a, b]);
    }

    _handleFind() {
        const value = this._toInt(this.findInput.value);
        if (value === null) {
            this.module.appManager.getGlobals().consolePanel.log('Informe um indice inteiro para find.');
            return;
        }
        this.module.executeOperation('find', [value]);
    }

    _handleConnected() {
        const a = this._toInt(this.aInput.value);
        const b = this._toInt(this.bInput.value);
        if (a === null || b === null) {
            this.module.appManager.getGlobals().consolePanel.log('Informe dois indices inteiros para connected.');
            return;
        }
        this.module.executeOperation('connected', [a, b]);
    }
}