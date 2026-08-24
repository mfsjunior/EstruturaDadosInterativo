class StackOperationPanel {
    constructor(module) {
        this.module = module;

        this.inputValue = document.getElementById('stackInputValue');

        document.getElementById('btnStackPush').addEventListener('click', () => this._handlePush());
        document.getElementById('btnStackPop').addEventListener('click', () => this._handlePop());
        document.getElementById('btnStackPeek').addEventListener('click', () => this._handlePeek());
        document.getElementById('btnStackClear').addEventListener('click', () => this._handleClear());

        this._renderScenarioButtons();
    }

    _renderScenarioButtons() {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.stack)
            ? window.DemoScenarios.stack
            : [];

        if (!scenarios.length) return;

        this._renderScenarioButtonsInto('StackControls', scenarios, 'controls-group');
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
                this.module.runScenario(scenario.id);
            });
            bar.appendChild(button);
        });

        container.appendChild(bar);
    }

    _handlePush() {
        const normalized = String(this.inputValue.value || '').replace(/\s+/g, '').trim();
        if (!normalized) {
            const globals = this.module.appManager.getGlobals();
            globals.consolePanel.log('Informe um valor para Push.');
            return;
        }
        const val = /^-?\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : normalized;
        this.module.executeOperation('push', [val], false, false);
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

    _handlePop() {
        this.module.executeOperation('pop', [], false, false);
    }

    _handlePeek() {
        this.module.executeOperation('peek', [], false, false);
    }

    _handleClear() {
        this.module.executeOperation('clear', [], false, false);
    }
}
