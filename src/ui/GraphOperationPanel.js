class GraphOperationPanel {
    constructor(module) {
        this.module = module;
        this.sizeInput = document.getElementById('graphSizeInput');
        this.inputU = document.getElementById('graphInputU');
        this.inputV = document.getElementById('graphInputV');
        this.inputStart = document.getElementById('graphStartInput');
        this.inputTarget = document.getElementById('graphTargetInput');

        document.getElementById('btnGraphReset').addEventListener('click', () => this._handleReset());
        document.getElementById('btnGraphAddEdge').addEventListener('click', () => this._handleAddEdge());
        document.getElementById('btnGraphBfs').addEventListener('click', () => this._handleBfs());
        document.getElementById('btnGraphDfs').addEventListener('click', () => this._handleDfs());
        document.getElementById('btnGraphShortestPath').addEventListener('click', () => this._handleShortestPath());

        this._renderScenarioButtons();
    }

    _toInt(value) {
        const n = Number(String(value || '').trim());
        return Number.isInteger(n) ? n : null;
    }

    _renderScenarioButtons() {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.graph)
            ? window.DemoScenarios.graph
            : [];
        if (!scenarios.length) return;

        this._renderScenarioButtonsInto('GraphControls', scenarios, 'controls-group');
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
        this.module.executeOperation('reset', [size || 7]);
    }

    _handleAddEdge() {
        const u = this._toInt(this.inputU.value);
        const v = this._toInt(this.inputV.value);
        if (u === null || v === null) {
            this.module.appManager.getGlobals().consolePanel.log('Informe vertices inteiros para addEdge.');
            return;
        }
        this.module.executeOperation('addEdge', [u, v]);
    }

    _handleBfs() {
        const start = this._toInt(this.inputStart.value);
        if (start === null) {
            this.module.appManager.getGlobals().consolePanel.log('Informe um vertice inicial para BFS.');
            return;
        }
        this.module.executeOperation('bfs', [start]);
    }

    _handleDfs() {
        const start = this._toInt(this.inputStart.value);
        if (start === null) {
            this.module.appManager.getGlobals().consolePanel.log('Informe um vertice inicial para DFS.');
            return;
        }
        this.module.executeOperation('dfs', [start]);
    }

    _handleShortestPath() {
        const start = this._toInt(this.inputStart.value);
        const target = this._toInt(this.inputTarget.value);
        if (start === null || target === null) {
            this.module.appManager.getGlobals().consolePanel.log('Informe vertice inicial e destino para Menor Caminho.');
            return;
        }
        this.module.executeOperation('shortestPath', [start, target]);
    }
}