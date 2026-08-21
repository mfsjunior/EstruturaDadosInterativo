class RedBlackModule extends BaseModule {
    constructor(appManager) {
        super(appManager);
        this.tree = null;
        this.renderer = null;
        this.stepExecutor = null;
        this.animationController = null;
        this.operationPanel = null;
        this._restorePlaybackSpeed = null;
        this._handlePlayPause = null;
        this._handleFastForward = null;
        this._handleNextStep = null;
        this._handleRestart = null;
        this._handleSpeedSelect = null;
        this.scenarioQueue = [];
        this.isScenarioRunning = false;
        this.scenarioManualMode = false;
        this.pendingScenarioLabel = '';
        this.pendingScenarioDescription = '';
    }

    init() {
        const globals = this.appManager.getGlobals();
        const nodesContainer = document.getElementById('nodesContainer');
        if (nodesContainer) {
            nodesContainer.classList.remove('array-mode', 'stack-mode', 'queue-mode', 'heap-mode', 'hash-mode');
            nodesContainer.classList.add('bst-mode');
        }

        this.renderer = new BSTRenderer('heapTreePreview');
        this.stepExecutor = new BSTStepExecutor(
            this.renderer,
            globals.statePanel,
            globals.codeHighlighter,
            globals.consolePanel,
            globals.complexityPanel
        );
        this.animationController = new AnimationController(this.stepExecutor);
        this.tree = new RedBlackTree();
        this.operationPanel = new RedBlackOperationPanel(this);
        this._bindPlaybackControls();

        globals.codeHighlighter.setFileName('RedBlackTree.java');
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', 'size@0');
        globals.statePanel.updateProp('size', 0);
        globals.consolePanel.log('Red-Black inicializada. Insercoes aplicam recoloracao e rotacoes para manter balanceamento.');
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();

        if (this.operationPanel && typeof this.operationPanel._renderScenarioButtons === 'function') {
            this.operationPanel._renderScenarioButtons();
        }
    }

    destroy() {
        if (this.animationController) {
            this.animationController.pause();
            this.animationController = null;
        }

        this._clearScenarioQueue();

        const nodesContainer = document.getElementById('nodesContainer');
        if (nodesContainer) nodesContainer.classList.remove('bst-mode');
        if (this.renderer) this.renderer.clear();

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

    executeOperation(methodName, args = [], silent = false, autoPlay = true, options = {}) {
        autoPlay = false;
        if (this.animationController.isPlaying || this.animationController.hasPendingSteps()) {
            this.animationController.fastForward();
        }

        const baseline = this._captureSnapshot();
        this.tree[methodName](...args);
        const steps = this.tree.getSteps();
        const globals = this.appManager.getGlobals();

        const title = document.getElementById('currentOperationTitle');
        if (title && !silent) title.textContent = methodName + '(' + args.join(', ') + ')';

        globals.callStackPanel.reset();
        globals.callStackPanel.push(methodName + '(' + args.join(', ') + ')');
        globals.timelinePanel.setSteps(steps);

        this.animationController.onStep = (currentIndex, total) => {
            const counter = document.getElementById('stepCounter');
            if (counter) counter.textContent = currentIndex + '/' + total;
            globals.timelinePanel.setCurrentIndex(currentIndex - 1);
        };

        this.animationController.setResetHandler(() => this.stepExecutor.restoreSnapshot(baseline));
        this.animationController.setSteps(steps);

        const playBtn = document.getElementById('btnPlayPause');
        if (this._restorePlaybackSpeed) {
            this._restorePlaybackSpeed();
            this._restorePlaybackSpeed = null;
        }

        if (autoPlay) {
            if (Number.isFinite(options?.tempSpeed)) {
                const previousSpeed = this.animationController.speed;
                this.animationController.setSpeed(Number(options.tempSpeed));
                this._restorePlaybackSpeed = () => this.animationController.setSpeed(previousSpeed);
            }
            this.animationController.play();
            if (playBtn) playBtn.textContent = String.fromCodePoint(0x23F8);
        } else {
            this.animationController.pause();
            if (playBtn) playBtn.textContent = String.fromCodePoint(0x25B6);
        }
    }

    runScenario(scenarioId) {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.rbt)
            ? window.DemoScenarios.rbt
            : [];
        const scenario = scenarios.find((entry) => entry.id === scenarioId);
        if (!scenario || !Array.isArray(scenario.values) || !scenario.values.length) return;

        this.resetSystem();
        this.scenarioQueue = scenario.values.map((value) => ({ method: 'insert', args: [value] }));
        this.isScenarioRunning = true;
        this.scenarioManualMode = false;
        this.pendingScenarioLabel = scenario.label || 'Cenario Red-Black';
        this.pendingScenarioDescription = scenario.description || 'Cenario carregado.';

        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = this.pendingScenarioLabel;
        const action = document.getElementById('currentStepAction');
        if (action) action.textContent = this.pendingScenarioDescription;

        this._runNextScenarioOperation();
    }

    resetSystem() {
        this._clearScenarioQueue();
        this.animationController.pause();
        this.animationController.setResetHandler(null);
        this.animationController.setSteps([]);
        this.tree = new RedBlackTree();
        this.stepExecutor.clear();

        const globals = this.appManager.getGlobals();
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', 'size@0');
        globals.statePanel.updateProp('size', 0);
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();

        const counter = document.getElementById('stepCounter');
        if (counter) counter.textContent = '0/0';
        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = '-';
        const action = document.getElementById('currentStepAction');
        if (action) action.textContent = 'Aguardando operacao...';
    }

    _runNextScenarioOperation() {
        if (!this.scenarioQueue.length) {
            const action = document.getElementById('currentStepAction');
            if (action && this.pendingScenarioDescription) action.textContent = this.pendingScenarioDescription;
            const title = document.getElementById('currentOperationTitle');
            if (title && this.pendingScenarioLabel) title.textContent = this.pendingScenarioLabel;
            this._clearScenarioQueue();
            return;
        }

        const nextOperation = this.scenarioQueue.shift();
        this.executeOperation(
            nextOperation.method,
            nextOperation.args,
            false,
            !this.scenarioManualMode,
            this.scenarioManualMode ? {} : { tempSpeed: 1.25 }
        );
    }

    _clearScenarioQueue() {
        this.scenarioQueue = [];
        this.isScenarioRunning = false;
        this.scenarioManualMode = false;
        this.pendingScenarioLabel = '';
        this.pendingScenarioDescription = '';
    }

    _captureSnapshot() {
        const snap = this.tree._snapshot();
        const rootNode = snap.rootId ? snap.nodes.find((node) => node.id === snap.rootId) : null;
        return {
            ...snap,
            rootValue: rootNode ? rootNode.value : null,
        };
    }

    refreshVisualization() {
        if (this.stepExecutor && typeof this.stepExecutor.refreshLayout === 'function') {
            this.stepExecutor.refreshLayout();
        }
    }

    _bindPlaybackControls() {
        this._handlePlayPause = () => {
            if (this.animationController.isPlaying) {
                this.animationController.pause();
                document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
            } else {
                if (this.isScenarioRunning) this.scenarioManualMode = false;
                this.animationController.play();
                document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x23F8);
            }
        };
        document.getElementById('btnPlayPause').addEventListener('click', this._handlePlayPause);

        this._handleFastForward = () => {
            if (this.isScenarioRunning) this.scenarioManualMode = false;
            this.animationController.fastForward();
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
        document.getElementById('btnFastForward').addEventListener('click', this._handleFastForward);

        this._handleNextStep = () => {
            if (this.isScenarioRunning) this.scenarioManualMode = true;
            this.animationController.pause();
            this.animationController.stepForward();
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
        document.getElementById('btnNextStep').addEventListener('click', this._handleNextStep);

        this._handleRestart = () => {
            this.resetSystem();
            const globals = this.appManager.getGlobals();
            globals.consolePanel.log('Red-Black reinicializada.');
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
        document.getElementById('btnRestartAnim').addEventListener('click', this._handleRestart);

        this._handleSpeedSelect = (e) => {
            this.animationController.setSpeed(parseFloat(e.target.value));
        };
        document.getElementById('speedSelect').addEventListener('change', this._handleSpeedSelect);

        this.animationController.onComplete = () => {
            if (this._restorePlaybackSpeed) {
                this._restorePlaybackSpeed();
                this._restorePlaybackSpeed = null;
            }
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
            if (this.isScenarioRunning) {
                this._runNextScenarioOperation();
            }
        };
    }
}
