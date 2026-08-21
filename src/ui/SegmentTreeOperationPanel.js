class SegmentTreeOperationPanel {
    constructor(module) {
        this.module = module;
        this.inputValues = document.getElementById('segmentInputValues');
        this.inputQueryLeft = document.getElementById('segmentQueryLeft');
        this.inputQueryRight = document.getElementById('segmentQueryRight');
        this.inputUpdateIndex = document.getElementById('segmentUpdateIndex');
        this.inputUpdateValue = document.getElementById('segmentUpdateValue');

        document.getElementById('btnSegmentBuild').addEventListener('click', () => this._handleBuild());
        document.getElementById('btnSegmentQuery').addEventListener('click', () => this._handleQuery());
        document.getElementById('btnSegmentUpdate').addEventListener('click', () => this._handleUpdate());
        document.getElementById('btnSegmentClear').addEventListener('click', () => this._handleClear());

        this._renderScenarioButtons();
    }

    _parseValues() {
        return String(this.inputValues.value || '')
            .split(',')
            .map((item) => Number(String(item || '').trim()))
            .filter((value) => Number.isFinite(value));
    }

    _renderScenarioButtons() {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.segmentTree)
            ? window.DemoScenarios.segmentTree
            : [];
        if (!scenarios.length) return;

        this._renderScenarioButtonsInto('SegmentTreeControls', scenarios, 'controls-group');
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
            this.module.appManager.getGlobals().consolePanel.log('Informe uma lista de numeros separados por virgula para construir a Segment Tree.');
            return;
        }

        this.module.executeOperation('build', [values], false, true, { tempSpeed: 1.1 });
        this.inputValues.value = '';
    }

    _handleQuery() {
        const left = Number(String(this.inputQueryLeft.value || '').trim());
        const right = Number(String(this.inputQueryRight.value || '').trim());
        if (!Number.isInteger(left) || !Number.isInteger(right)) {
            this.module.appManager.getGlobals().consolePanel.log('Informe intervalo inteiro para Query.');
            return;
        }

        this.module.executeOperation('query', [left, right], false, true, { tempSpeed: 1.05 });
    }

    _handleUpdate() {
        const index = Number(String(this.inputUpdateIndex.value || '').trim());
        const value = Number(String(this.inputUpdateValue.value || '').trim());
        if (!Number.isInteger(index) || !Number.isFinite(value)) {
            this.module.appManager.getGlobals().consolePanel.log('Informe indice e valor validos para Update.');
            return;
        }

        this.module.executeOperation('update', [index, value], false, true, { tempSpeed: 1.05 });
    }

    _handleClear() {
        this.module.executeOperation('clear', [], false, false);
    }
}
