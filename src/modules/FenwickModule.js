class FenwickModule extends BaseModule {
    constructor(appManager) {
        super(appManager);
        this.arrayRenderer = null;
        this.stepExecutor = null;
        this.animationController = null;
        this.tree = null;
        this.operationPanel = null;
        this._handlePlayPause = null;
        this._handleFastForward = null;
        this._handleNextStep = null;
        this._handleRestart = null;
        this._handleSpeedSelect = null;
        this.autoDemoEnabled = false;
    }

    init() {
        const globals = this.appManager.getGlobals();
        this.arrayRenderer = new ArrayRenderer('nodesContainer');
        this.arrayRenderer.init(9, 0x7000, 4);
        if (this.arrayRenderer.container) {
            this.arrayRenderer.container.classList.add('array-mode');
            this.arrayRenderer.container.classList.add('fenwick-mode');
            this.arrayRenderer.container.classList.remove('stack-mode', 'queue-mode', 'segment-mode');
        }

        this.stepExecutor = new ArrayStepExecutor(
            this.arrayRenderer,
            globals.statePanel,
            globals.codeHighlighter,
            globals.consolePanel,
            globals.complexityPanel
        );
        this.animationController = new AnimationController(this.stepExecutor);
        this.tree = new FenwickTree(8);
        this.operationPanel = new FenwickOperationPanel(this);
        this._bindPlaybackControls();

        this.stepExecutor.restoreSnapshot(this.tree._snapshot());
        globals.codeHighlighter.setFileName('FenwickTree.java');
        globals.statePanel.updateProp('head', 'idx 1');
        globals.statePanel.updateProp('tail', 'idx 8');
        globals.statePanel.updateProp('size', 8);
        globals.consolePanel.log('Fenwick Tree (BIT) inicializada.');
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();
    }

    destroy() {
        if (this.animationController) {
            this.animationController.pause();
            this.animationController = null;
        }
        if (this.arrayRenderer?.container) {
            this.arrayRenderer.container.classList.remove('array-mode', 'fenwick-mode');
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
        this.tree[methodName](...args);
        const steps = this.tree.getSteps();
        const globals = this.appManager.getGlobals();

        const title = document.getElementById('currentOperationTitle');
        if (title && !silent) title.textContent = `${methodName}(${args.map((arg) => Array.isArray(arg) ? `[${arg.join(', ')}]` : arg).join(', ')})`;

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
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.fenwickTree)
            ? window.DemoScenarios.fenwickTree
            : [];
        const scenario = scenarios.find((entry) => entry.id === scenarioId);
        if (!scenario) return;

        this.resetSystem();
        const operations = Array.isArray(scenario.operations)
            ? scenario.operations
                .filter((op) => op && typeof op.method === 'string')
                .map((op) => ({ method: op.method, args: Array.isArray(op.args) ? op.args : [] }))
            : [];
        if (!operations.length) {
            return;
        }

        const baseline = this._captureSnapshot();
        const mergedSteps = [];
        operations.forEach((op) => {
            this.tree[op.method](...op.args);
            mergedSteps.push(...this.tree.getSteps());
        });

        const globals = this.appManager.getGlobals();
        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = scenario.label || 'Cenario Fenwick';

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
        if (this.autoDemoEnabled) {
            this.animationController.play();
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x23F8);
            globals.consolePanel.log(`Cenario carregado: ${scenario.label}. Auto-demo em execucao.`);
        } else {
            this.animationController.pause();
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
            globals.consolePanel.log(`Cenario carregado: ${scenario.label}. Use Play ou Passo para ver a animacao.`);
        }
    }

    setAutoDemoEnabled(enabled) {
        this.autoDemoEnabled = Boolean(enabled);
        const globals = this.appManager.getGlobals();
        globals.consolePanel.log(this.autoDemoEnabled
            ? 'Auto-demo ativado para cenarios Fenwick.'
            : 'Auto-demo desativado: cenarios voltam a iniciar pausados.');
    }

    resetSystem() {
        this.animationController.pause();
        this.animationController.setResetHandler(null);
        this.animationController.setSteps([]);
        this.tree = new FenwickTree(8);
        this.stepExecutor.restoreSnapshot(this.tree._snapshot());
        this.stepExecutor.clear();
        this.stepExecutor.restoreSnapshot(this.tree._snapshot());

        const globals = this.appManager.getGlobals();
        globals.statePanel.updateProp('head', 'idx 1');
        globals.statePanel.updateProp('tail', 'idx 8');
        globals.statePanel.updateProp('size', 8);
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();
        globals.consolePanel.log('Fenwick Tree reinicializada.');

        const counter = document.getElementById('stepCounter');
        if (counter) counter.textContent = '0/0';
        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = '-';
        const action = document.getElementById('currentStepAction');
        if (action) action.textContent = 'Aguardando operacao...';
    }

    _captureSnapshot() {
        return this.tree ? this.tree._snapshot() : {
            capacity: 9,
            baseAddress: 0x7000,
            elementSize: 4,
            size: 8,
            data: new Array(9).fill(0),
            relationLabels: new Array(9).fill(''),
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