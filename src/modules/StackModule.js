class StackModule extends BaseModule {
    constructor(appManager) {
        super(appManager);
        this.arrayRenderer = null;
        this.stepExecutor = null;
        this.animationController = null;
        this.stack = null;
        this.operationPanel = null;

        this._handlePlayPause = null;
        this._handleFastForward = null;
        this._handleNextStep = null;
        this._handleRestart = null;
        this._handleSpeedSelect = null;
    }

    init() {
        const globals = this.appManager.getGlobals();

        this.arrayRenderer = new ArrayRenderer('nodesContainer');
        this.arrayRenderer.init(8, 0x2000, 4);
        if (this.arrayRenderer.container) {
            this.arrayRenderer.container.classList.add('stack-mode');
            this.arrayRenderer.container.classList.remove('queue-mode', 'array-mode');
            const vizCard = this.arrayRenderer.container.closest('.viz-card');
            if (vizCard) {
                vizCard.classList.add('stack-viz-card');
                vizCard.classList.remove('queue-viz-card');
            }
        }

        this.stepExecutor = new ArrayStepExecutor(
            this.arrayRenderer,
            globals.statePanel,
            globals.codeHighlighter,
            globals.consolePanel,
            globals.complexityPanel
        );
        this.animationController = new AnimationController(this.stepExecutor);

        this.stack = new ManualStack(8);
        this.operationPanel = new StackOperationPanel(this);

        this._bindPlaybackControls();

        globals.codeHighlighter.setFileName('ManualStack.java');
        globals.statePanel.updateProp('size', 0);
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', '-');
        globals.consolePanel.log('Pilha LIFO inicializada. Capacidade: 8.');
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
            this.arrayRenderer.container.classList.remove('stack-mode');
            const vizCard = this.arrayRenderer.container.closest('.viz-card');
            if (vizCard) vizCard.classList.remove('stack-viz-card');
        }
        this.stepExecutor = null;
        this.stack = null;

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
        if (this.animationController.isPlaying || this.animationController.hasPendingSteps()) {
            this.animationController.fastForward();
        }

        const baseline = this._captureSnapshot();

        this.stack[methodName](...args);

        const steps = this.stack.getSteps();

        const globals = this.appManager.getGlobals();
        const title = document.getElementById('currentOperationTitle');
        if (title && !silent) title.textContent = methodName + '(' + args.join(', ') + ')';

        if (!silent) {
            globals.callStackPanel.reset();
            globals.callStackPanel.push(methodName + '(' + args.join(', ') + ')');
            globals.timelinePanel.setSteps(steps);

            this.animationController.onStep = (currentIndex, total) => {
                const counter = document.getElementById('stepCounter');
                if (counter) counter.textContent = currentIndex + '/' + total;
                globals.timelinePanel.setCurrentIndex(currentIndex - 1);
            };
        }

        this.animationController.setResetHandler(() => {
            this.stepExecutor.restoreSnapshot(baseline);
            this._restoreStateFromSnapshot(baseline);
        });

        this.animationController.setSteps(steps);
        const playBtn = document.getElementById('btnPlayPause');
        if (autoPlay) {
            this.animationController.play();
            if (playBtn) playBtn.textContent = String.fromCodePoint(0x23F8);
        } else {
            this.animationController.pause();
            if (steps.length > 0) {
                this._primePausedOperation(methodName);
            }
            if (playBtn) playBtn.textContent = String.fromCodePoint(0x25B6);
        }
    }

    _primePausedOperation(methodName) {
        const targetByOperation = {
            push: 'ARRAY_INSERT',
            pop: 'ARRAY_REMOVE_END',
            peek: 'ARRAY_DIRECT_ACCESS',
            clear: 'ARRAY_CLEAR',
        };

        const targetType = targetByOperation[methodName];

        // Fallback for unmapped operations: expose one contextual step.
        if (!targetType) {
            this.animationController.stepForward();
            return;
        }

        while (this.animationController.currentIndex < this.animationController.steps.length) {
            const nextStep = this.animationController.steps[this.animationController.currentIndex];
            this.animationController.stepForward();
            if (nextStep && nextStep.type === targetType) {
                break;
            }
        }
    }

    _captureSnapshot() {
        return {
            capacity: this.stack?.capacity ?? 8,
            baseAddress: this.stack?.baseAddress ?? 0x2000,
            elementSize: this.stack?.elementSize ?? 4,
            size: this.stack?.size ?? 0,
            data: Array.isArray(this.stack?.data) ? [...this.stack.data] : [],
        };
    }

    _restoreStateFromSnapshot(snapshot) {
        const globals = this.appManager.getGlobals();
        const size = snapshot?.size ?? 0;
        globals.statePanel.updateProp('size', size);
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', size > 0 ? `top@${size - 1}` : '-');
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

    runScenario(scenarioId) {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.stack)
            ? window.DemoScenarios.stack
            : [];
        const scenario = scenarios.find((entry) => entry.id === scenarioId);
        if (!scenario || !Array.isArray(scenario.operations) || !scenario.operations.length) return;

        this.resetSystem();
        this.scenarioQueue = scenario.operations.map((operation) => ({
            method: operation.method,
            args: Array.isArray(operation.args) ? [...operation.args] : [],
        }));
        this.isScenarioRunning = true;
        this.scenarioManualMode = false;
        this._runNextScenarioOperation();
    }

    resetSystem() {
        this.animationController.pause();
        this.animationController.setResetHandler(null);
        this.animationController.setSteps([]);
        this.stack = new ManualStack(8);
        this.arrayRenderer.init(8, 0x2000, 4);
        this.stepExecutor.clear();
        const globals = this.appManager.getGlobals();
        globals.statePanel.updateProp('size', 0);
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', '-');
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();
        globals.consolePanel.log('Pilha LIFO reinicializada.');
        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = '-';
        const counter = document.getElementById('stepCounter');
        if (counter) counter.textContent = '0/0';
        const action = document.getElementById('currentStepAction');
        if (action) action.textContent = 'Aguardando operacao...';
        document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
    }

    _clearScenarioQueue() {
        this.scenarioQueue = [];
        this.isScenarioRunning = false;
        this.scenarioManualMode = false;
        const ctr = this.animationController;
        if (ctr) {
            ctr.onComplete = null;
        }
    }

    _runNextScenarioOperation() {
        if (!this.scenarioQueue || this.scenarioQueue.length === 0) {
            this.isScenarioRunning = false;
            return;
        }
        
        const nextOp = this.scenarioQueue.shift();
        
        this.animationController.onComplete = () => {
            if (this.scenarioManualMode) {
                setTimeout(() => this._runNextScenarioOperation(), 500);
            } else {
                setTimeout(() => this._runNextScenarioOperation(), 100);
            }
        };

        this.executeOperation(nextOp.method, nextOp.args, false, !this.scenarioManualMode);
    }
}
