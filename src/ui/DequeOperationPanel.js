class DequeOperationPanel {
    constructor(module) {
        this.module = module;
        this.inputValue = document.getElementById('dequeInputValue');
        this._bindButtons();
        this._renderScenarioButtons();
    }

    _bindButtons() {
        document.getElementById('btnDequePushFront').addEventListener('click', () => this._handlePushFront());
        document.getElementById('btnDequePushBack').addEventListener('click', () => this._handlePushBack());
        document.getElementById('btnDequePopFront').addEventListener('click', () => this._handlePopFront());
        document.getElementById('btnDequePopBack').addEventListener('click', () => this._handlePopBack());
        document.getElementById('btnDequePeekFront').addEventListener('click', () => this._handlePeekFront());
        document.getElementById('btnDequePeekBack').addEventListener('click', () => this._handlePeekBack());
        document.getElementById('btnDequeClear').addEventListener('click', () => this._handleClear());
    }

    _normalizedInput() {
        return String(this.inputValue.value || '').replace(/\s+/g, '').trim();
    }

    _parseValue(raw) {
        return /^-?\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : raw;
    }

    _renderScenarioButtons() {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.deque)
            ? window.DemoScenarios.deque
            : [];
        if (!scenarios.length) return;

        this._renderScenarioButtonsInto('DequeControls', scenarios, 'controls-group');
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

    _handlePushFront() {
        const raw = this._normalizedInput();
        if (!raw) {
            this.module.appManager.getGlobals().consolePanel.log('Informe um valor para PushFront.');
            return;
        }
        this.module.executeOperation('pushFront', [this._parseValue(raw)], false, false);
        this.inputValue.value = '';
    }

    _handlePushBack() {
        const raw = this._normalizedInput();
        if (!raw) {
            this.module.appManager.getGlobals().consolePanel.log('Informe um valor para PushBack.');
            return;
        }
        this.module.executeOperation('pushBack', [this._parseValue(raw)], false, false);
        this.inputValue.value = '';
    }

    _handlePopFront() {
        this.module.executeOperation('popFront', [], false, false);
    }

    _handlePopBack() {
        this.module.executeOperation('popBack', [], false, false);
    }

    _handlePeekFront() {
        this.module.executeOperation('peekFront', [], false, false);
    }

    _handlePeekBack() {
        this.module.executeOperation('peekBack', [], false, false);
    }

    _handleClear() {
        this.module.executeOperation('clear', [], false, false);
    }
}
