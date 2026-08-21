class SegmentTreeModule extends BaseModule {
    constructor(appManager) {
        super(appManager);
        this.arrayRenderer = null;
        this.stepExecutor = null;
        this.animationController = null;
        this.tree = null;
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
            nodesContainer.classList.add('segment-mode');
        }

        this.arrayRenderer = new ArrayRenderer('nodesContainer');
        this._renderTreeSnapshot({
            capacity: 31,
            baseAddress: 0x6000,
            elementSize: 4,
            size: 0,
            data: [],
            relationLabels: [],
        });
        if (this.arrayRenderer.container) {
            const vizCard = this.arrayRenderer.container.closest('.viz-card');
            if (vizCard) {
                vizCard.classList.remove('stack-viz-card', 'queue-viz-card', 'heap-viz-card');
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
        this.tree = new SegmentTree();
        this.operationPanel = new SegmentTreeOperationPanel(this);
        this._bindPlaybackControls();

        globals.codeHighlighter.setFileName('SegmentTree.java');
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', '-');
        globals.statePanel.updateProp('size', 0);
        globals.consolePanel.log('Arvore de Segmentos inicializada. Cada no guarda a soma de um intervalo.');
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();

        this._syncRendererLabels();
    }

    _syncRendererLabels() {
        if (!this.tree) return;
        this._renderTreeSnapshot(this.tree._snapshot());
    }

    destroy() {
        if (this.animationController) {
            this.animationController.pause();
            this.animationController = null;
        }
        this._clearScenarioQueue();

        const nodesContainer = document.getElementById('nodesContainer');
        if (nodesContainer) nodesContainer.classList.remove('segment-mode');
        if (this.arrayRenderer?.container) this.arrayRenderer.container.classList.remove('segment-mode');

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
        if (title && !silent) title.textContent = `${methodName}(${args.map((arg) => Array.isArray(arg) ? `[${arg.join(', ')}]` : arg).join(', ')})`;

        globals.callStackPanel.reset();
        globals.callStackPanel.push(`${methodName}(${args.map((arg) => Array.isArray(arg) ? `[${arg.join(', ')}]` : arg).join(', ')})`);
        globals.timelinePanel.setSteps(steps);

        this.animationController.onStep = (currentIndex, total) => {
            const counter = document.getElementById('stepCounter');
            if (counter) counter.textContent = `${currentIndex}/${total}`;
            globals.timelinePanel.setCurrentIndex(currentIndex - 1);
            this._renderTreeSnapshot(this.tree._snapshot());
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
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.segmentTree)
            ? window.DemoScenarios.segmentTree
            : [];
        const scenario = scenarios.find((entry) => entry.id === scenarioId);
        if (!scenario) return;

        this.resetSystem();
        if (Array.isArray(scenario.operations) && scenario.operations.length) {
            this.scenarioQueue = scenario.operations
                .filter((op) => op && typeof op.method === 'string')
                .map((op) => ({ method: op.method, args: Array.isArray(op.args) ? op.args : [] }));
        } else if (Array.isArray(scenario.values) && scenario.values.length) {
            this.scenarioQueue = [{ method: 'build', args: [scenario.values] }];
        } else {
            return;
        }

        this.isScenarioRunning = true;
        this.scenarioManualMode = false;
        this.pendingScenarioLabel = scenario.label || 'Cenario Segment Tree';
        this.pendingScenarioDescription = scenario.description || 'Cenario carregado.';
        this._runNextScenarioOperation();
    }

    resetSystem() {
        this._clearScenarioQueue();
        this.animationController.pause();
        this.animationController.setResetHandler(null);
        this.animationController.setSteps([]);
        this.tree = new SegmentTree();
        this._renderTreeSnapshot(this.tree._snapshot());
        this.stepExecutor.clear();

        const globals = this.appManager.getGlobals();
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', '-');
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

    _clearScenarioQueue() {
        this.scenarioQueue = [];
        this.isScenarioRunning = false;
        this.scenarioManualMode = false;
        this.pendingScenarioLabel = '';
        this.pendingScenarioDescription = '';
    }

    _captureSnapshot() {
        return this.tree ? this.tree._snapshot() : {
            capacity: 31,
            baseAddress: 0x6000,
            elementSize: 4,
            size: 0,
            data: [],
            relationLabels: [],
        };
    }

    _renderTreeSnapshot(snapshot = null) {
        const container = document.getElementById('nodesContainer');
        if (!container) return;

        const capacity = Number.isFinite(snapshot?.capacity) ? snapshot.capacity : (this.tree?.capacity ?? 31);
        const baseAddress = snapshot?.baseAddress ?? this.tree?.baseAddress ?? 0x6000;
        const elementSize = snapshot?.elementSize ?? this.tree?.elementSize ?? 4;
        const data = Array.isArray(snapshot?.data) ? snapshot.data : [];
        const relationLabels = Array.isArray(snapshot?.relationLabels) ? snapshot.relationLabels : [];

        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'segment-tree-wrapper';

        const cells = [];
        const maxLevel = Math.floor(Math.log2(capacity + 1)) || 0;
        wrapper.style.minHeight = `${Math.max(640, (maxLevel + 1) * 130)}px`;

        for (let i = 0; i < capacity; i++) {
            const cellContainer = document.createElement('div');
            cellContainer.className = 'array-cell-container';
            cellContainer.dataset.index = String(i);
            cellContainer.style.width = '160px';
            cellContainer.style.transition = 'transform 0.18s ease, filter 0.18s ease, z-index 0.18s ease';

            const level = Math.floor(Math.log2(i + 1));
            const levelStart = (2 ** level) - 1;
            const indexOnLevel = i - levelStart;
            const nodesOnLevel = 2 ** level;
            const x = ((indexOnLevel + 1) / (nodesOnLevel + 1)) * 100;
            const y = 31 + (level * 15);
            cellContainer.style.position = 'absolute';
            cellContainer.style.left = `${x}%`;
            cellContainer.style.top = `${y}%`;
            cellContainer.style.transform = 'translateX(-50%)';

            const expandNode = () => {
                cellContainer.style.zIndex = '12';
                cellContainer.style.transform = 'translateX(-50%) translateY(-10px) scale(1.08)';
                cellContainer.style.filter = 'drop-shadow(0 20px 26px rgba(2, 6, 23, 0.32))';
            };

            const collapseNode = () => {
                cellContainer.style.zIndex = '';
                cellContainer.style.transform = 'translateX(-50%)';
                cellContainer.style.filter = '';
            };

            cellContainer.addEventListener('mouseenter', expandNode);
            cellContainer.addEventListener('mouseleave', collapseNode);

            const idxLabel = document.createElement('div');
            idxLabel.className = 'array-index';
            idxLabel.textContent = i;

            const relationLabel = document.createElement('div');
            relationLabel.className = 'array-relation';
            relationLabel.textContent = relationLabels[i] || '';

            const box = document.createElement('div');
            box.className = `array-box ${data[i] !== undefined && data[i] !== null ? 'filled' : 'empty'}`.trim();
            box.id = `array-box-${i}`;

            const valSpan = document.createElement('span');
            valSpan.className = 'array-value';
            valSpan.textContent = data[i] !== undefined && data[i] !== null ? String(data[i]) : '';
            box.appendChild(valSpan);

            const memLabel = document.createElement('div');
            memLabel.className = 'array-memory';
            memLabel.textContent = `0x${(baseAddress + (i * elementSize)).toString(16).toUpperCase()}`;

            const nodeValue = data[i] !== undefined && data[i] !== null ? String(data[i]) : 'vazio';
            const intervalValue = relationLabels[i] || `no ${i}`;
            cellContainer.title = `${intervalValue} | valor: ${nodeValue} | endereco: ${memLabel.textContent}`;

            idxLabel.textContent = `${i}`;
            relationLabel.textContent = relationLabels[i] || '';
            valSpan.textContent = data[i] !== undefined && data[i] !== null ? String(data[i]) : '';
            memLabel.textContent = `0x${(baseAddress + (i * elementSize)).toString(16).toUpperCase()}`;

            cellContainer.appendChild(idxLabel);
            cellContainer.appendChild(relationLabel);
            cellContainer.appendChild(box);
            cellContainer.appendChild(memLabel);
            wrapper.appendChild(cellContainer);

            cells.push({ box, valSpan, cellContainer, idxLabel, relationLabel });
        }

        container.appendChild(wrapper);
        if (this.arrayRenderer) {
            this.arrayRenderer.container = container;
            this.arrayRenderer.arrayWrapper = wrapper;
            this.arrayRenderer.cells = cells;
            this.arrayRenderer.baseAddress = baseAddress;
            this.arrayRenderer.elementSize = elementSize;
        }

        const filledIndices = new Set(data.map((value, index) => (value !== undefined && value !== null ? index : -1)).filter((index) => index >= 0));
        const relationSet = new Set(relationLabels.map((label, index) => (label ? index : -1)).filter((index) => index >= 0));

        cells.forEach((cell, index) => {
            const hasVisibleValue = filledIndices.has(index);
            const hasLabel = relationSet.has(index);
            const shouldShow = hasVisibleValue || hasLabel;
            cell.cellContainer.style.display = shouldShow ? 'flex' : 'none';
            cell.cellContainer.classList.toggle('is-segment-node', shouldShow);
            if (hasVisibleValue) {
                cell.box.classList.remove('empty');
                cell.box.classList.add('filled');
            }
        });
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
        this.executeOperation(nextOperation.method, nextOperation.args, false, !this.scenarioManualMode, { tempSpeed: 1.05 });
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
            this.animationController.pause();
            this.animationController.setResetHandler(null);
            this.animationController.setSteps([]);
            this.tree = new SegmentTree();
            this._renderTreeSnapshot(this.tree._snapshot());
            this.stepExecutor.clear();
            const globals = this.appManager.getGlobals();
            globals.statePanel.updateProp('head', '-');
            globals.statePanel.updateProp('tail', '-');
            globals.statePanel.updateProp('size', 0);
            globals.callStackPanel.reset();
            globals.localVarsPanel.clear();
            globals.timelinePanel.clear();
            globals.consolePanel.log('Arvore de Segmentos reinicializada.');
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
