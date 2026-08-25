class UnionFindModule extends BaseModule {
    constructor(appManager) {
        super(appManager);
        this.arrayRenderer = null;
        this.stepExecutor = null;
        this.animationController = null;
        this.uf = null;
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
        this.arrayRenderer.init(8, 0x8000, 4);
        if (this.arrayRenderer.container) {
            this.arrayRenderer.container.classList.add('array-mode', 'union-find-mode');
            this.arrayRenderer.container.classList.remove('stack-mode', 'queue-mode', 'segment-mode', 'fenwick-mode');
        }

        this.stepExecutor = new ArrayStepExecutor(
            this.arrayRenderer,
            globals.statePanel,
            globals.codeHighlighter,
            globals.consolePanel,
            globals.complexityPanel
        );
        this.animationController = new AnimationController(this.stepExecutor);
        
        this.initDebugEngine('uf');
        
        this.uf = new UnionFind(8);
        this.operationPanel = new UnionFindOperationPanel(this);
        this._bindPlaybackControls();

        this.stepExecutor.restoreSnapshot(this.uf._snapshot());
        globals.codeHighlighter.setFileName('UnionFind.java');
        globals.statePanel.updateProp('head', `componentes ${this.uf.components}`);
        globals.statePanel.updateProp('tail', `nos ${this.uf.size}`);
        globals.statePanel.updateProp('size', this.uf.size);
        globals.consolePanel.log('Union-Find inicializado com 8 elementos.');
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
            this.arrayRenderer.container.classList.remove('array-mode', 'union-find-mode');
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
                'uf', 
                () => this.uf[methodName](...args), 
                () => this.uf.getSteps()
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
        this.uf[methodName](...args);
        const steps = this.uf.getSteps();
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
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.unionFind)
            ? window.DemoScenarios.unionFind
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
            this.uf[op.method](...(Array.isArray(op.args) ? op.args : []));
            mergedSteps.push(...this.uf.getSteps());
        });

        const globals = this.appManager.getGlobals();
        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = scenario.label || 'Cenario Union-Find';

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
        if (this.animationController) {
            this.animationController.pause();
            this.animationController.setResetHandler(null);
            this.animationController.setSteps([]);
        }
        if (this.debugEngine) this.debugEngine.pause();
        this.uf = new UnionFind(8);
        this.stepExecutor.restoreSnapshot(this.uf._snapshot());
        this.stepExecutor.clear();
        this.stepExecutor.restoreSnapshot(this.uf._snapshot());

        const globals = this.appManager.getGlobals();
        globals.statePanel.updateProp('head', `componentes ${this.uf.components}`);
        globals.statePanel.updateProp('tail', `nos ${this.uf.size}`);
        globals.statePanel.updateProp('size', this.uf.size);
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();
        globals.consolePanel.log('Union-Find reinicializado.');

        const counter = document.getElementById('stepCounter');
        if (counter) counter.textContent = '0/0';
        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = '-';
        const action = document.getElementById('currentStepAction');
        if (action) action.textContent = 'Aguardando operacao...';
    }

    _captureSnapshot() {
        return this.uf ? this.uf._snapshot() : {
            capacity: 8,
            baseAddress: 0x8000,
            elementSize: 4,
            size: 8,
            data: [0, 1, 2, 3, 4, 5, 6, 7],
            relationLabels: ['rank=0', 'rank=0', 'rank=0', 'rank=0', 'rank=0', 'rank=0', 'rank=0', 'rank=0'],
        };
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
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
        document.getElementById('btnRestartAnim').addEventListener('click', this._handleRestart);

        this._handleSpeedSelect = (e) => {
            const val = parseFloat(e.target.value);
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