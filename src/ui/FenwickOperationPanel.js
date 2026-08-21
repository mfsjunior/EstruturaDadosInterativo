class FenwickOperationPanel {
    constructor(module) {
        this.module = module;
        this.inputValues = document.getElementById('fenwickInputValues');
        this.inputUpdateIndex = document.getElementById('fenwickUpdateIndex');
        this.inputUpdateValue = document.getElementById('fenwickUpdateValue');
        this.inputPrefixIndex = document.getElementById('fenwickPrefixIndex');
        this.inputRangeLeft = document.getElementById('fenwickRangeLeft');
        this.inputRangeRight = document.getElementById('fenwickRangeRight');
        this.inputAutoDemo = document.getElementById('fenwickAutoDemo');

        document.getElementById('btnFenwickBuild').addEventListener('click', () => this._handleBuild());
        document.getElementById('btnFenwickUpdate').addEventListener('click', () => this._handleUpdate());
        document.getElementById('btnFenwickPrefix').addEventListener('click', () => this._handlePrefix());
        document.getElementById('btnFenwickRange').addEventListener('click', () => this._handleRange());
        document.getElementById('btnFenwickClear').addEventListener('click', () => this._handleClear());
        if (this.inputAutoDemo) {
            this.inputAutoDemo.checked = false;
            this.inputAutoDemo.addEventListener('change', () => {
                this.module.setAutoDemoEnabled(Boolean(this.inputAutoDemo.checked));
            });
        }

        this._renderScenarioButtons();
    }

    _parseValues() {
        return String(this.inputValues.value || '')
            .split(',')
            .map((item) => Number(String(item || '').trim()))
            .filter((value) => Number.isFinite(value));
    }

    _renderScenarioButtons() {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.fenwickTree)
            ? window.DemoScenarios.fenwickTree
            : [];
        if (!scenarios.length) return;

        this._renderScenarioButtonsInto('FenwickTreeControls', scenarios, 'controls-group');
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

    _handleBuild() {
        const values = this._parseValues();
        if (!values.length) {
            this.module.appManager.getGlobals().consolePanel.log('Informe valores numericos separados por virgula para o build do Fenwick.');
            return;
        }
        this.module.executeOperation('build', [values]);
        this.inputValues.value = '';
    }

    _handleUpdate() {
        const index = Number(String(this.inputUpdateIndex.value || '').trim());
        const value = Number(String(this.inputUpdateValue.value || '').trim());
        if (!Number.isInteger(index) || !Number.isFinite(value)) {
            this.module.appManager.getGlobals().consolePanel.log('Informe indice inteiro e novo valor para update.');
            return;
        }
        this.module.executeOperation('update', [index, value]);
    }

    _handlePrefix() {
        const index = Number(String(this.inputPrefixIndex.value || '').trim());
        if (!Number.isInteger(index)) {
            this.module.appManager.getGlobals().consolePanel.log('Informe indice inteiro para prefix sum.');
            return;
        }
        this.module.executeOperation('prefixSum', [index]);
    }

    _handleRange() {
        const left = Number(String(this.inputRangeLeft.value || '').trim());
        const right = Number(String(this.inputRangeRight.value || '').trim());
        if (!Number.isInteger(left) || !Number.isInteger(right)) {
            this.module.appManager.getGlobals().consolePanel.log('Informe limites inteiros para range sum.');
            return;
        }
        this.module.executeOperation('rangeSum', [left, right]);
    }

    _handleClear() {
        this.module.executeOperation('clear', []);
    }
}