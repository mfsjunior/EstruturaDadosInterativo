class BSTOperationPanel {
    constructor(module) {
        this.module = module;
        this.inputValue = document.getElementById('bstInputValue');

        document.getElementById('btnBSTInsert').addEventListener('click', () => this._handleInsert());
        document.getElementById('btnBSTContains').addEventListener('click', () => this._handleContains());
        document.getElementById('btnBSTBfs').addEventListener('click', () => this._handleBfs());
        document.getElementById('btnBSTDfs').addEventListener('click', () => this._handleDfs());
        document.getElementById('btnBSTRemove').addEventListener('click', () => this._handleRemove());
        document.getElementById('btnBSTClear').addEventListener('click', () => this._handleClear());

        this._renderScenarioButtons();
    }

    _renderScenarioButtons() {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.bst)
            ? window.DemoScenarios.bst
            : [];

        if (!scenarios.length) return;

        this._renderScenarioButtonsInto('BSTControls', scenarios, 'controls-group');
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
            this.module.appManager.getGlobals().consolePanel.log('Informe um inteiro para Insert na BST.');
            return;
        }
        this.module.executeOperation('insert', [value], false, true, { tempSpeed: 0.7 });
        this.inputValue.value = '';
    }

    _handleContains() {
        const value = this._parseValue();
        if (value === null) {
            this.module.appManager.getGlobals().consolePanel.log('Informe um inteiro para Contains na BST.');
            return;
        }
        this.module.executeOperation('contains', [value], false, true, { tempSpeed: 0.4 });
    }

    _handleRemove() {
        const value = this._parseValue();
        if (value === null) {
            this.module.appManager.getGlobals().consolePanel.log('Informe um inteiro para Remove na BST.');
            return;
        }
        this.module.executeOperation('remove', [value], false, true, { tempSpeed: 0.45 });
    }

    _handleBfs() {
        this.module.executeOperation('bfs', [], false, true, { tempSpeed: 0.75 });
    }

    _handleDfs() {
        this.module.executeOperation('dfs', [], false, true, { tempSpeed: 0.75 });
    }

    _handleClear() {
        this.module.executeOperation('clear', [], false, false);
    }
}