class GraphModule extends BaseModule {
    constructor(appManager) {
        super(appManager);
        this.graphRenderer = null;
        this.stepExecutor = null;
        this.animationController = null;
        this.graph = null;
        this.operationPanel = null;
        this._handlePlayPause = null;
        this._handleFastForward = null;
        this._handleNextStep = null;
        this._handleRestart = null;
        this._handleSpeedSelect = null;
    }

    init() {
        const globals = this.appManager.getGlobals();
        const nodesContainer = document.getElementById('nodesContainer');
        if (nodesContainer) {
            nodesContainer.classList.add('graph-mode');
            nodesContainer.classList.remove('array-mode', 'stack-mode', 'queue-mode', 'segment-mode', 'fenwick-mode', 'union-find-mode');
        }

        this.graphRenderer = new GraphRenderer('nodesContainer', 'arrowsCanvas');

        this.stepExecutor = new GraphStepExecutor(
            this.graphRenderer,
            globals.statePanel,
            globals.codeHighlighter,
            globals.consolePanel,
            globals.complexityPanel
        );
        this.animationController = new AnimationController(this.stepExecutor);
        this.graph = new GraphAdjacencyList(7);
        this.operationPanel = new GraphOperationPanel(this);
        this._bindPlaybackControls();

        this.graphRenderer.initFromSnapshot(this.graph._snapshot());
        globals.codeHighlighter.setFileName('GraphAdjacencyList.java');
        globals.statePanel.updateProp('head', `vertices ${this.graph.size}`);
        globals.statePanel.updateProp('tail', `arestas ${this.graph.edgeCount()}`);
        globals.statePanel.updateProp('size', this.graph.size);
        globals.consolePanel.log('Grafo (lista de adjacencia) inicializado com 7 vertices.');
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();
    }

    destroy() {
        if (this.animationController) {
            this.animationController.pause();
            this.animationController = null;
        }
        const nodesContainer = document.getElementById('nodesContainer');
        if (nodesContainer) {
            nodesContainer.classList.remove('graph-mode');
        }

        const btnPlayPause = document.getElementById('btnPlayPause');
        if (btnPlayPause && this._handlePlayPause) btnPlayPause.removeEventListener('click', this._handlePlayPause);
        const btnNextStep = document.getElementById('btnNextStep');
        if (btnNextStep && this._handleNextStep) btnNextStep.removeEventListener('click', this._handleNextStep);
        const btnFastForward = document.getElementById('btnFastForward');
        if (btnFastForward && this._handleFastForward) btnFastForward.removeEventListener('click', this._handleFastForward);
        const btnRestartAnim = document.getElementById('btnRestartAnim');
        if (btnRestartAnim && this._handleRestart) btnRestartAnim.removeEventListener('click', this._handleRestart);
        const speedSelect = document.getElementById('speedSelect');
        if (speedSelect && this._handleSpeedSelect) speedSelect.removeEventListener('change', this._handleSpeedSelect);
    }

    executeOperation(methodName, args = [], silent = false, autoPlay = true) {
        autoPlay = false;
        if (this.animationController.isPlaying || this.animationController.hasPendingSteps()) {
            this.animationController.fastForward();
        }

        const baseline = this._captureSnapshot();
        this.graph[methodName](...args);
        const steps = this.graph.getSteps();
        const globals = this.appManager.getGlobals();

        const title = document.getElementById('currentOperationTitle');
        if (title && !silent) title.textContent = `${methodName}(${args.join(', ')})`;

        globals.callStackPanel.reset();
        globals.callStackPanel.push(`${methodName}(${args.join(', ')})`);
        globals.timelinePanel.setSteps(steps);

        this.animationController.onStep = (currentIndex, total) => {
            const counter = document.getElementById('stepCounter');
            if (counter) counter.textContent = `${currentIndex}/${total}`;
            globals.timelinePanel.setCurrentIndex(currentIndex - 1);
        };

        this.animationController.setResetHandler(() => this.stepExecutor.restoreSnapshot(baseline));
        this.animationController.setSteps(steps);
        if (autoPlay) {
            this.animationController.play();
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x23F8);
        } else {
            this.animationController.pause();
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        }
    }

    runScenario(scenarioId) {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.graph)
            ? window.DemoScenarios.graph
            : [];
        const scenario = scenarios.find((entry) => entry.id === scenarioId);
        if (!scenario) return;

        this.resetSystem();
        const operations = Array.isArray(scenario.operations)
            ? scenario.operations.filter((op) => op && typeof op.method === 'string')
            : [];
        if (!operations.length) return;

        const baseline = this._captureSnapshot();
        const mergedSteps = [];
        operations.forEach((op) => {
            this.graph[op.method](...(Array.isArray(op.args) ? op.args : []));
            mergedSteps.push(...this.graph.getSteps());
        });

        const globals = this.appManager.getGlobals();
        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = scenario.label || 'Cenario de Grafo';

        globals.callStackPanel.reset();
        globals.callStackPanel.push(`scenario(${scenario.id})`);
        globals.timelinePanel.setSteps(mergedSteps);

        this.animationController.onStep = (currentIndex, total) => {
            const counter = document.getElementById('stepCounter');
            if (counter) counter.textContent = `${currentIndex}/${total}`;
            globals.timelinePanel.setCurrentIndex(currentIndex - 1);
        };

        this.animationController.setResetHandler(() => this.stepExecutor.restoreSnapshot(baseline));
        this.animationController.setSteps(mergedSteps);
        this.animationController.pause();
        document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        globals.consolePanel.log(`Cenario carregado: ${scenario.label}. Use Play ou Passo para acompanhar.`);
    }

    resetSystem() {
        this.animationController.pause();
        this.animationController.setResetHandler(null);
        this.animationController.setSteps([]);
        this.graph = new GraphAdjacencyList(7);
        this.graphRenderer.initFromSnapshot(this.graph._snapshot());
        this.stepExecutor.clear();
        this.graphRenderer.initFromSnapshot(this.graph._snapshot());

        const globals = this.appManager.getGlobals();
        globals.statePanel.updateProp('head', `vertices ${this.graph.size}`);
        globals.statePanel.updateProp('tail', `arestas ${this.graph.edgeCount()}`);
        globals.statePanel.updateProp('size', this.graph.size);
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();
        globals.consolePanel.log('Grafo reinicializado.');

        const counter = document.getElementById('stepCounter');
        if (counter) counter.textContent = '0/0';
        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = '-';
        const action = document.getElementById('currentStepAction');
        if (action) action.textContent = 'Aguardando operacao...';
    }

    _captureSnapshot() {
        return this.graph ? this.graph._snapshot() : {
            capacity: 7,
            baseAddress: 0x9000,
            elementSize: 4,
            size: 7,
            data: [0, 1, 2, 3, 4, 5, 6],
            relationLabels: ['adj: -', 'adj: -', 'adj: -', 'adj: -', 'adj: -', 'adj: -', 'adj: -'],
        };
    }

    _bindPlaybackControls() {
        this._handlePlayPause = () => {
            if (this.animationController.isPlaying) {
                this.animationController.pause();
                document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
            } else {
                this.animationController.play();
                document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x23F8);
            }
        };
        document.getElementById('btnPlayPause').addEventListener('click', this._handlePlayPause);

        this._handleFastForward = () => {
            this.animationController.fastForward();
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
        document.getElementById('btnFastForward').addEventListener('click', this._handleFastForward);

        this._handleNextStep = () => {
            this.animationController.pause();
            this.animationController.stepForward();
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
        document.getElementById('btnNextStep').addEventListener('click', this._handleNextStep);

        this._handleRestart = () => {
            this.resetSystem();
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
        document.getElementById('btnRestartAnim').addEventListener('click', this._handleRestart);

        this._handleSpeedSelect = (e) => {
            this.animationController.setSpeed(parseFloat(e.target.value));
        };
        document.getElementById('speedSelect').addEventListener('change', this._handleSpeedSelect);

        this.animationController.onComplete = () => {
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
    }
}