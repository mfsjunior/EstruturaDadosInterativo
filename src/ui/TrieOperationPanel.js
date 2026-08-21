class TrieOperationPanel {
    constructor(module) {
        this.module = module;
        this.inputWord = document.getElementById('trieInputWord');

        document.getElementById('btnTrieInsert').addEventListener('click', () => this._handleInsert());
        document.getElementById('btnTrieContains').addEventListener('click', () => this._handleContains());
        document.getElementById('btnTrieClear').addEventListener('click', () => this._handleClear());

        this._renderScenarioButtons();
    }

    _normalizeWord() {
        return String(this.inputWord.value || '').trim().toLowerCase();
    }

    _renderScenarioButtons() {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.trie)
            ? window.DemoScenarios.trie
            : [];

        if (!scenarios.length) return;

        this._renderScenarioButtonsInto('TrieControls', scenarios, 'controls-group');
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
            button.addEventListener('click', () => this.module.runScenario(scenario.id));
            bar.appendChild(button);
        });

        container.appendChild(bar);
    }

    _handleInsert() {
        const word = this._normalizeWord();
        if (!word) {
            this.module.appManager.getGlobals().consolePanel.log('Informe uma palavra para Insert na Trie.');
            return;
        }
        this.module.executeOperation('insert', [word], false, true, { tempSpeed: 0.72 });
        this.inputWord.value = '';
    }

    _handleContains() {
        const word = this._normalizeWord();
        if (!word) {
            this.module.appManager.getGlobals().consolePanel.log('Informe uma palavra para Contains na Trie.');
            return;
        }
        this.module.executeOperation('contains', [word], false, true, { tempSpeed: 0.55 });
    }

    _handleClear() {
        this.module.executeOperation('clear', [], false, false);
    }
}
