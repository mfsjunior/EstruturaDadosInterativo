class DequeModule extends BaseModule {
    constructor(appManager) {
        super(appManager);
        this.arrayRenderer = null;
        this.stepExecutor = null;
        this.animationController = null;
        this.deque = null;
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
        this.arrayRenderer.init(8, 0xA000, 4);
        if (this.arrayRenderer.container) {
            this.arrayRenderer.container.classList.add('queue-mode', 'deque-mode');
            this.arrayRenderer.container.classList.remove('stack-mode', 'array-mode', 'graph-mode');
            const vizCard = this.arrayRenderer.container.closest('.viz-card');
            if (vizCard) {
                vizCard.classList.add('queue-viz-card');
                vizCard.classList.remove('stack-viz-card');
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

        this.initDebugEngine('deque');

        this.deque = new Deque(8);
        this.operationPanel = new DequeOperationPanel(this);
        this._bindPlaybackControls();

        globals.codeHighlighter.setFileName('Deque.java');
        globals.statePanel.updateProp('size', 0);
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', '-');
        globals.consolePanel.log('Deque inicializado. Insercao/remocao em ambas as extremidades.');
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();
    }

    destroy() {
        if (this.animationController) {
            this.animationController.pause();
            this.animationController = null;
        }
        if (this.debugEngine) {
            this.debugEngine.pause();
            this.debugEngine = null;
        }

        if (this.arrayRenderer?.container) {
            this.arrayRenderer.container.classList.remove('queue-mode', 'deque-mode');
            const vizCard = this.arrayRenderer.container.closest('.viz-card');
            if (vizCard) vizCard.classList.remove('queue-viz-card');
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
        if (this.appManager.activeViewTab === 'debug') {
            const steps = this.runDebugSession(
                methodName, 
                args, 
                'deque', 
                () => this.deque[methodName](...args), 
                () => this.deque.getSteps()
            );
            
            const globals = this.appManager.getGlobals();
            globals.callStackPanel.reset();
            globals.callStackPanel.push(methodName + '(' + args.join(', ') + ')');
            globals.timelinePanel.setSteps(steps);
            return;
        }

        autoPlay = false;
        if (this.animationController.isPlaying || this.animationController.hasPendingSteps()) {
            this.animationController.fastForward();
        }

        const baseline = this._captureSnapshot();
        this.deque[methodName](...args);
        const steps = this.deque.getSteps();

        const globals = this.appManager.getGlobals();
        const title = document.getElementById('currentOperationTitle');
        if (title && !silent) title.textContent = `${methodName}(${args.join(', ')})`;

        if (!silent) {
            globals.callStackPanel.reset();
            globals.callStackPanel.push(`${methodName}(${args.join(', ')})`);
            globals.timelinePanel.setSteps(steps);

            this.animationController.onStep = (currentIndex, total) => {
                const counter = document.getElementById('stepCounter');
                if (counter) counter.textContent = `${currentIndex}/${total}`;
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
            if (steps.length > 0) this._primePausedOperation(methodName);
            if (playBtn) playBtn.textContent = String.fromCodePoint(0x25B6);
        }
    }

    runScenario(scenarioId) {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.deque)
            ? window.DemoScenarios.deque
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
            this.deque[op.method](...(Array.isArray(op.args) ? op.args : []));
            mergedSteps.push(...this.deque.getSteps());
        });

        const globals = this.appManager.getGlobals();
        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = scenario.label || 'Cenario Deque';

        globals.callStackPanel.reset();
        globals.callStackPanel.push(`scenario(${scenario.id})`);
        globals.timelinePanel.setSteps(mergedSteps);

        this.animationController.onStep = (currentIndex, total) => {
            const counter = document.getElementById('stepCounter');
            if (counter) counter.textContent = `${currentIndex}/${total}`;
            globals.timelinePanel.setCurrentIndex(currentIndex - 1);
        };

        this.animationController.setResetHandler(() => {
            this.stepExecutor.restoreSnapshot(baseline);
            this._restoreStateFromSnapshot(baseline);
        });
        this.animationController.setSteps(mergedSteps);
        this.animationController.pause();
        const playBtn = document.getElementById('btnPlayPause');
        if (playBtn) playBtn.textContent = String.fromCodePoint(0x25B6);
        globals.consolePanel.log(`Cenario carregado: ${scenario.label}. Use Play ou Passo para acompanhar.`);
    }

    resetSystem() {
        this.animationController.pause();
        if (this.debugEngine) this.debugEngine.pause();
        this.animationController.setResetHandler(null);
        this.animationController.setSteps([]);

        this.deque = new Deque(8);
        this.arrayRenderer.init(8, 0xA000, 4);
        this.stepExecutor.clear();

        const globals = this.appManager.getGlobals();
        globals.statePanel.updateProp('size', 0);
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', '-');
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();
        globals.consolePanel.log('Deque reinicializado.');

        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = '-';
        const counter = document.getElementById('stepCounter');
        if (counter) counter.textContent = '0/0';
        const action = document.getElementById('currentStepAction');
        if (action) action.textContent = 'Aguardando operacao...';
        const playBtn = document.getElementById('btnPlayPause');
        if (playBtn) playBtn.textContent = String.fromCodePoint(0x25B6);
    }

    _captureSnapshot() {
        return {
            capacity: this.deque?.capacity ?? 8,
            baseAddress: this.deque?.baseAddress ?? 0xA000,
            elementSize: this.deque?.elementSize ?? 4,
            size: this.deque?.size ?? 0,
            front: this.deque?.front ?? 0,
            rear: this.deque?.rear ?? 0,
            data: Array.isArray(this.deque?.data) ? [...this.deque.data] : [],
        };
    }

    _restoreStateFromSnapshot(snapshot) {
        const globals = this.appManager.getGlobals();
        const size = snapshot?.size ?? 0;
        const front = snapshot?.front ?? 0;
        const rear = snapshot?.rear ?? 0;
        const capacity = snapshot?.capacity ?? 8;
        const rearIndex = size > 0 ? (rear - 1 + capacity) % capacity : -1;
        globals.statePanel.updateProp('size', size);
        globals.statePanel.updateProp('head', size > 0 ? `front@${front}` : '-');
        globals.statePanel.updateProp('tail', rearIndex >= 0 ? `rear@${rearIndex}` : '-');
    }

    _primePausedOperation(methodName) {
        const targetByOperation = {
            pushFront: 'ARRAY_INSERT',
            pushBack: 'ARRAY_INSERT',
            popFront: 'ARRAY_REMOVE_END',
            popBack: 'ARRAY_REMOVE_END',
            peekFront: 'ARRAY_DIRECT_ACCESS',
            peekBack: 'ARRAY_DIRECT_ACCESS',
            clear: 'ARRAY_CLEAR',
        };

        const targetType = targetByOperation[methodName];
        if (!targetType) {
            this.animationController.stepForward();
            return;
        }

        while (this.animationController.currentIndex < this.animationController.steps.length) {
            const nextStep = this.animationController.steps[this.animationController.currentIndex];
            this.animationController.stepForward();
            if (nextStep && nextStep.type === targetType) break;
        }
    }

    _bindPlaybackControls() {
        this._handlePlayPause = () => {
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine && this.debugEngine.events.length) {
                if (this.debugEngine.isPlaying) {
                    this.debugEngine.pause();
                    document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
                } else {
                    this.debugEngine.play();
                    document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x23F8);
                }
                return;
            }
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
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine && this.debugEngine.events.length) {
                this.debugEngine.finish();
                document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
                return;
            }
            this.animationController.fastForward();
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
        document.getElementById('btnFastForward').addEventListener('click', this._handleFastForward);

        this._handleNextStep = () => {
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine && this.debugEngine.events.length) {
                this.debugEngine.pause();
                this.debugEngine.next();
                document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
                return;
            }
            this.animationController.pause();
            this.animationController.stepForward();
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
        document.getElementById('btnNextStep').addEventListener('click', this._handleNextStep);

        this._handlePrevStep = () => {
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine && this.debugEngine.events.length) {
                this.debugEngine.pause();
                this.debugEngine.previous();
                document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
                return;
            }
            this.animationController.pause();
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
        const btnPrevStep = document.getElementById('btnPrevStep');
        if (btnPrevStep) {
            btnPrevStep.addEventListener('click', this._handlePrevStep);
        }

        this._handleRestart = () => {
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine && this.debugEngine.events.length) {
                this.debugEngine.pause();
                this.debugEngine.reset();
                document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
                return;
            }
            this.resetSystem();
        };
        document.getElementById('btnRestartAnim').addEventListener('click', this._handleRestart);

        this._handleSpeedSelect = (event) => {
            const val = parseFloat(event.target.value);
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine) {
                this.debugEngine.setSpeed(val);
            }
            this.animationController.setSpeed(val);
        };
        document.getElementById('speedSelect').addEventListener('change', this._handleSpeedSelect);

        this.animationController.onComplete = () => {
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
    }
}
