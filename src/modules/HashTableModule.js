class HashTableModule extends BaseModule {
    constructor(appManager) {
        super(appManager);
        this.arrayRenderer = null;
        this.stepExecutor = null;
        this.animationController = null;
        this.hashTable = null;
        this.operationPanel = null;

        this._handlePlayPause = null;
        this._handleFastForward = null;
        this._handleNextStep = null;
        this._handleRestart = null;
        this._handleSpeedSelect = null;
        this._restorePlaybackSpeed = null;
        this.currentFocusIndex = null;
        this.currentFocusMeta = null;
    }

    init() {
        const globals = this.appManager.getGlobals();

        this.arrayRenderer = new ArrayRenderer('nodesContainer');
        this.arrayRenderer.init(11, 0x5000, 4);
        if (this.arrayRenderer.container) {
            this.arrayRenderer.container.classList.add('array-mode', 'hash-mode');
            this.arrayRenderer.container.classList.remove('stack-mode', 'queue-mode', 'heap-mode');
            const vizCard = this.arrayRenderer.container.closest('.viz-card');
            if (vizCard) {
                vizCard.classList.remove('stack-viz-card');
                vizCard.classList.remove('queue-viz-card', 'heap-viz-card');
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

        this.initDebugEngine('hash');

        this.hashTable = new HashTable(11);
        this.operationPanel = new HashTableOperationPanel(this);
        this._bindPlaybackControls();

        globals.codeHighlighter.setFileName('HashTable.java');
        globals.statePanel.updateProp('size', 0);
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', 'col@0');
        globals.consolePanel.log('Tabela Hash inicializada. Capacidade: 11. Colisoes tratadas por probing linear.');
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();
        this.currentFocusIndex = null;
        this.currentFocusMeta = null;
        this._updateFocusPanel(null);
        this.arrayRenderer.clearCustomHighlights();
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
            this.arrayRenderer.container.classList.remove('array-mode', 'hash-mode');
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

    executeOperation(methodName, args = [], silent = false, autoPlay = true, options = {}) {
        if (this.appManager.activeViewTab === 'debug') {
            const steps = this.runDebugSession(
                methodName, 
                args, 
                'hash', 
                () => this.hashTable[methodName](...args), 
                () => this.hashTable.getSteps()
            );
            
            const globals = this.appManager.getGlobals();
            globals.callStackPanel.reset();
            globals.callStackPanel.push(methodName + '(' + args.join(', ') + ')');
            globals.timelinePanel.setSteps(steps);
            
            const baseline = this._captureSnapshot();
            this._applyProbeHighlights(steps[steps.length - 1]);
            return;
        }

        autoPlay = false;
        if (this.animationController.isPlaying || this.animationController.hasPendingSteps()) {
            this.animationController.fastForward();
        }

        const baseline = this._captureSnapshot();
        this.hashTable[methodName](...args);
        const steps = this.hashTable.getSteps();

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
                const activeStep = this.animationController.steps?.[currentIndex - 1] || null;
                this._applyProbeHighlights(activeStep);
                this._updateFocusPanel(activeStep?.data?.index ?? this.currentFocusIndex, activeStep?.data || this.currentFocusMeta);
            };
        }

        this.animationController.setResetHandler(() => {
            this.stepExecutor.restoreSnapshot(baseline);
            this._restoreStateFromSnapshot(baseline);
        });

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

    _captureSnapshot() {
        return {
            capacity: this.hashTable?.capacity ?? 11,
            baseAddress: this.hashTable?.baseAddress ?? 0x5000,
            elementSize: this.hashTable?.elementSize ?? 4,
            size: this.hashTable?.size ?? 0,
            data: Array.isArray(this.hashTable?.slots) ? this.hashTable.slots.map((entry) => this.hashTable._stringifyValue(entry)) : [],
        };
    }

    _restoreStateFromSnapshot(snapshot) {
        const globals = this.appManager.getGlobals();
        globals.statePanel.updateProp('size', snapshot?.size ?? 0);
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', 'col@0');
        this.currentFocusIndex = null;
        this.currentFocusMeta = null;
        this.arrayRenderer.clearCustomHighlights();
        this._updateFocusPanel(null);
    }

    _applyProbeHighlights(step) {
        if (!this.arrayRenderer) return;
        const data = step?.data || {};
        const originIndex = Number.isInteger(data.hashIndex) ? data.hashIndex : null;
        const activeIndex = Number.isInteger(data.activeIndex) ? data.activeIndex : (Number.isInteger(data.index) ? data.index : null);
        const hitIndex = Number.isInteger(data.hitIndex) ? data.hitIndex : null;
        this.arrayRenderer.setCustomHighlights({
            originIndex,
            pathIndices: Array.isArray(data.probePath) ? data.probePath : [],
            collisionIndices: Array.isArray(data.collisionIndices) ? data.collisionIndices : [],
            activeIndex,
            hitIndex,
        });
    }

    _updateFocusPanel(activeIndex = null, meta = null) {
        const nodeId = document.getElementById('stateNodeId');
        const nodeAddress = document.getElementById('stateNodeAddress');
        const nodeValue = document.getElementById('stateNodeValue');
        const nodePrev = document.getElementById('stateNodePrev');
        const nodeNext = document.getElementById('stateNodeNext');
        if (!nodeId || !nodeAddress || !nodeValue || !nodePrev || !nodeNext) return;

        if (!Number.isInteger(activeIndex) || activeIndex < 0) {
            if (!Number.isInteger(this.currentFocusIndex) || this.currentFocusIndex < 0) {
                nodeId.textContent = '-';
                nodeAddress.textContent = '-';
                nodeValue.textContent = '-';
                nodePrev.textContent = '-';
                nodeNext.textContent = '-';
                return;
            }

            activeIndex = this.currentFocusIndex;
        } else {
            this.currentFocusIndex = activeIndex;
        }

        if (meta && typeof meta === 'object') {
            this.currentFocusMeta = meta;
        }

        if (!Number.isInteger(activeIndex) || activeIndex < 0) {
            nodeId.textContent = '-';
            nodeAddress.textContent = '-';
            nodeValue.textContent = '-';
            nodePrev.textContent = '-';
            nodeNext.textContent = '-';
            return;
        }

        const rawValue = this.arrayRenderer?.cells?.[activeIndex]?.valSpan?.textContent || '-';
    const hashIndex = Number.isInteger(this.currentFocusMeta?.hashIndex) ? this.currentFocusMeta.hashIndex : '-';
    const probePath = Array.isArray(this.currentFocusMeta?.probePath) ? this.currentFocusMeta.probePath : [];
    const probeStep = probePath.indexOf(activeIndex);
        nodeId.textContent = `slot@${activeIndex}`;
        nodeAddress.textContent = `0x${(0x5000 + (activeIndex * 4)).toString(16).toUpperCase()}`;
        nodeValue.textContent = String(rawValue || '-');
    nodePrev.textContent = hashIndex === '-' ? '-' : `hash@${hashIndex}`;
    nodeNext.textContent = probeStep >= 0 ? `probe +${probeStep}` : '-';
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
            if (this.animationController) {
                this.animationController.pause();
                this.animationController.setResetHandler(null);
                this.animationController.setSteps([]);
            }
            if (this.debugEngine) this.debugEngine.pause();
            
            this.hashTable = new HashTable(11);
            this.arrayRenderer.init(11, 0x5000, 4);
            this.arrayRenderer.clearCustomHighlights();
            this.stepExecutor.clear();
            const globals = this.appManager.getGlobals();
            globals.statePanel.updateProp('size', 0);
            globals.statePanel.updateProp('head', '-');
            globals.statePanel.updateProp('tail', 'col@0');
            globals.callStackPanel.reset();
            globals.localVarsPanel.clear();
            globals.timelinePanel.clear();
            globals.consolePanel.log('Tabela Hash reinicializada.');
            this.currentFocusIndex = null;
            this.currentFocusMeta = null;
            this.arrayRenderer.clearCustomHighlights();
            this._updateFocusPanel(null);
            const title = document.getElementById('currentOperationTitle');
            if (title) title.textContent = '-';
            const counter = document.getElementById('stepCounter');
            if (counter) counter.textContent = '0/0';
            const action = document.getElementById('currentStepAction');
            if (action) action.textContent = 'Aguardando operacao...';
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
            if (this._restorePlaybackSpeed) {
                this._restorePlaybackSpeed();
                this._restorePlaybackSpeed = null;
            }
            const lastStep = this.animationController.steps?.[this.animationController.steps.length - 1] || null;
            this._applyProbeHighlights(lastStep);
            this._updateFocusPanel(this.currentFocusIndex, lastStep?.data || this.currentFocusMeta);
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
    }
}