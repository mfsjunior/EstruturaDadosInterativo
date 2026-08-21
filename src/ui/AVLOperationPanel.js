class AVLOperationPanel {
    constructor(module) {
        this.module = module;
        this.inputValue = document.getElementById('avlInputValue');

        document.getElementById('btnAVLInsert').addEventListener('click', () => this._handleInsert());
        document.getElementById('btnAVLContains').addEventListener('click', () => this._handleContains());
        document.getElementById('btnAVLRemove').addEventListener('click', () => this._handleRemove());
        document.getElementById('btnAVLClear').addEventListener('click', () => this._handleClear());

        this._renderScenarioButtons();
    }

    _renderScenarioButtons() {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.avl)
            ? window.DemoScenarios.avl
            : [];

        if (!scenarios.length) return;

        this._renderScenarioButtonsInto('AVLControls', scenarios, 'controls-group');
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
            button.title = scenario.description || scenario.label;
            button.addEventListener('click', () => {
                this.module.runScenario(scenario.id);
            });
            bar.appendChild(button);
        });

        container.appendChild(bar);
    }

    _parseValue() {
        const normalized = String(this.inputValue.value || '').trim();
        if (!/^-?\d+$/.test(normalized)) return null;
        return Number(normalized);
    }

    _handleInsert() {
        const value = this._parseValue();
        if (value === null) {
            this.module.appManager.getGlobals().consolePanel.log('Informe um inteiro para Insert na AVL.');
            return;
        }
        this.module.executeOperation('insert', [value], false, true, { tempSpeed: 0.75 });
        this.inputValue.value = '';
    }

    _handleContains() {
        const value = this._parseValue();
        if (value === null) {
            this.module.appManager.getGlobals().consolePanel.log('Informe um inteiro para Contains na AVL.');
            return;
        }
        this.module.executeOperation('contains', [value], false, true, { tempSpeed: 0.5 });
    }

    _handleRemove() {
        const value = this._parseValue();
        if (value === null) {
            this.module.appManager.getGlobals().consolePanel.log('Informe um inteiro para Remove na AVL.');
            return;
        }
        this.module.executeOperation('remove', [value], false, true, { tempSpeed: 0.55 });
    }

    _handleClear() {
        this.module.executeOperation('clear', [], false, false);
    }
}
