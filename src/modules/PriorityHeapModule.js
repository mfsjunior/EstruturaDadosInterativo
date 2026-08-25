class PriorityHeapModule extends BaseModule {
    constructor(appManager) {
        super(appManager);
        this.arrayRenderer = null;
        this.stepExecutor = null;
        this.animationController = null;
        this.heap = null;
        this.operationPanel = null;

        this._handlePlayPause = null;
        this._handleFastForward = null;
        this._handleNextStep = null;
        this._handleRestart = null;
        this._handleSpeedSelect = null;
        this._handleTreeMetaToggle = null;
        this.showTreeIndexes = true;
        this._restorePlaybackSpeed = null;
    }

    init() {
        const globals = this.appManager.getGlobals();

        this.arrayRenderer = new ArrayRenderer('nodesContainer');
        if (this.arrayRenderer.container) {
            this.arrayRenderer.container.classList.add('heap-mode');
            this.arrayRenderer.container.classList.remove('stack-mode', 'queue-mode', 'array-mode');
        }
        this.arrayRenderer.init(15, 0x4000, 4);
        if (this.arrayRenderer.container) {
            const vizCard = this.arrayRenderer.container.closest('.viz-card');
            if (vizCard) {
                vizCard.classList.remove('stack-viz-card');
                vizCard.classList.remove('queue-viz-card');
                vizCard.classList.add('heap-viz-card');
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

        this.initDebugEngine('heap');

        this.heap = new PriorityHeap(15);
        this.operationPanel = new PriorityHeapOperationPanel(this);

        this._bindPlaybackControls();
        this._bindTreeToggle();

        globals.codeHighlighter.setFileName('PriorityHeap.java');
        globals.statePanel.updateProp('size', 0);
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', '-');
        globals.consolePanel.log('Heap de Prioridade inicializado. Capacidade: 15.');
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();
        this._updateHeapFocusPanel();
        this._renderTreePreview();
        this._syncTreeToggleUi();
    }

    resetSystem() {
        if (this.animationController) {
            this.animationController.pause();
            this.animationController.setResetHandler(null);
            this.animationController.setSteps([]);
        }
        if (this.debugEngine) this.debugEngine.pause();
        this.heap = new PriorityHeap(15);
        this.arrayRenderer.init(15, 0x4000, 4);
        this.stepExecutor.clear();
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
            this.arrayRenderer.container.classList.remove('heap-mode');
            const vizCard = this.arrayRenderer.container.closest('.viz-card');
            if (vizCard) vizCard.classList.remove('heap-viz-card');
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

        const btnHeapTreeToggleMeta = document.getElementById('btnHeapTreeToggleMeta');
        if (btnHeapTreeToggleMeta && this._handleTreeMetaToggle) {
            btnHeapTreeToggleMeta.removeEventListener('click', this._handleTreeMetaToggle);
        }
    }

    executeOperation(methodName, args = [], silent = false, autoPlay = true, options = {}) {
        if (this.appManager.activeViewTab === 'debug') {
            const steps = this.runDebugSession(
                methodName, 
                args, 
                'heap', 
                () => this.heap[methodName](...args), 
                () => this.heap.getSteps()
            );
            
            const globals = this.appManager.getGlobals();
            globals.callStackPanel.reset();
            globals.callStackPanel.push(methodName + '(' + args.join(', ') + ')');
            globals.timelinePanel.setSteps(steps);
            
            const baseline = this._captureSnapshot();
            this._updateHeapFocusPanel(baseline);
            this._renderTreePreview(baseline);
            return;
        }

        autoPlay = false;
        if (this.animationController.isPlaying || this.animationController.hasPendingSteps()) {
            this.animationController.fastForward();
        }

        const baseline = this._captureSnapshot();

        this.heap[methodName](...args);
        const steps = this.heap.getSteps();
        this._updateHeapFocusPanel(baseline);
        this._renderTreePreview(baseline);

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
                const renderedSnapshot = this._captureRenderedHeapSnapshot();
                const highlightState = this._getHighlightState(activeStep, renderedSnapshot.size);
                this._renderTreePreview(renderedSnapshot, highlightState);
                this._updateHeapFocusPanel(renderedSnapshot);
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
                const nextSpeed = Number(options.tempSpeed);
                this.animationController.setSpeed(nextSpeed);
                this._restorePlaybackSpeed = () => {
                    this.animationController.setSpeed(previousSpeed);
                };
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
            capacity: this.heap?.capacity ?? 15,
            baseAddress: this.heap?.baseAddress ?? 0x4000,
            elementSize: this.heap?.elementSize ?? 4,
            size: this.heap?.size ?? 0,
            data: Array.isArray(this.heap?.data) ? [...this.heap.data] : [],
        };
    }

    _restoreStateFromSnapshot(snapshot) {
        const globals = this.appManager.getGlobals();
        const size = snapshot?.size ?? 0;
        const minValue = size > 0 ? snapshot.data[0] : '-';
        globals.statePanel.updateProp('size', size);
        globals.statePanel.updateProp('head', size > 0 ? `min@${minValue}` : '-');
        globals.statePanel.updateProp('tail', size > 0 ? `idx@${size - 1}` : '-');
        this._updateHeapFocusPanel(snapshot);
        this._renderTreePreview(snapshot);
    }

    _formatAddress(index) {
        return `0x${(0x4000 + (index * 4)).toString(16).toUpperCase()}`;
    }

    _updateHeapFocusPanel(snapshot = null) {
        const data = Array.isArray(snapshot?.data) ? snapshot.data : this.heap?.data;
        const size = Number.isFinite(snapshot?.size) ? snapshot.size : (this.heap?.size ?? 0);

        const nodeId = document.getElementById('stateNodeId');
        const nodeAddress = document.getElementById('stateNodeAddress');
        const nodeValue = document.getElementById('stateNodeValue');
        const nodePrev = document.getElementById('stateNodePrev');
        const nodeNext = document.getElementById('stateNodeNext');

        if (!nodeId || !nodeAddress || !nodeValue || !nodePrev || !nodeNext) return;

        if (!size || !data) {
            nodeId.textContent = '-';
            nodeAddress.textContent = '-';
            nodeValue.textContent = '-';
            nodePrev.textContent = '-';
            nodeNext.textContent = '-';
            return;
        }

        const leftIndex = 1;
        const rightIndex = 2;

        nodeId.textContent = 'idx@0';
        nodeAddress.textContent = this._formatAddress(0);
        nodeValue.textContent = String(data[0]);
        nodePrev.textContent = leftIndex < size && data[leftIndex] !== undefined
            ? `idx@${leftIndex} = ${data[leftIndex]}`
            : '-';
        nodeNext.textContent = rightIndex < size && data[rightIndex] !== undefined
            ? `idx@${rightIndex} = ${data[rightIndex]}`
            : '-';
    }

    _captureRenderedHeapSnapshot() {
        const cells = Array.isArray(this.arrayRenderer?.cells) ? this.arrayRenderer.cells : [];
        const data = cells.map((cell) => {
            const raw = String(cell?.valSpan?.textContent || '').trim();
            if (!raw) return undefined;
            return /^-?\d+$/.test(raw) ? Number(raw) : raw;
        });

        const sizeText = String(document.getElementById('stateSize')?.textContent || '').trim();
        const parsedSize = Number.parseInt(sizeText, 10);
        const fallbackSize = data.reduce((count, value) => (value === undefined ? count : count + 1), 0);

        return {
            capacity: this.heap?.capacity ?? 15,
            baseAddress: this.heap?.baseAddress ?? 0x4000,
            elementSize: this.heap?.elementSize ?? 4,
            size: Number.isFinite(parsedSize) ? parsedSize : fallbackSize,
            data,
        };
    }

    _getHighlightState(step, size = 0) {
        if (!step) return { highlightedIndices: [], highlightedEdges: [] };
        const payload = step.data || {};

        if (Array.isArray(payload.highlightIndices) || Array.isArray(payload.highlightEdges)) {
            return {
                highlightedIndices: Array.isArray(payload.highlightIndices) ? payload.highlightIndices : [],
                highlightedEdges: Array.isArray(payload.highlightEdges) ? payload.highlightEdges : [],
            };
        }

        if (!step.data) return { highlightedIndices: [], highlightedEdges: [] };

        if (step.type === 'INFO') {
            return { highlightedIndices: size > 0 ? [0] : [], highlightedEdges: [] };
        }

        if (step.type === 'ARRAY_DIRECT_ACCESS') {
            const idx = Number(step.data.index);
            return { highlightedIndices: Number.isInteger(idx) && idx >= 0 ? [idx] : [], highlightedEdges: [] };
        }

        if (step.type === 'ARRAY_INSERT') {
            const idx = Number(step.data.index);
            return { highlightedIndices: Number.isInteger(idx) && idx >= 0 ? [idx] : [], highlightedEdges: [] };
        }

        if (step.type === 'ARRAY_REMOVE_END') {
            const idx = Number(step.data.index);
            const result = [];
            if (Number.isInteger(idx) && idx >= 0) result.push(idx);
            if (size > 0) result.push(0);
            return { highlightedIndices: result, highlightedEdges: [] };
        }

        if (step.type === 'UPDATE_STATE') {
            return { highlightedIndices: size > 0 ? [0] : [], highlightedEdges: [] };
        }

        return { highlightedIndices: [], highlightedEdges: [] };
    }

    _renderTreePreview(snapshot = null, options = {}) {
        const container = document.getElementById('heapTreePreview');
        if (!container) return;
        const highlightedSet = new Set(Array.isArray(options.highlightedIndices) ? options.highlightedIndices : []);
        const highlightedEdges = Array.isArray(options.highlightedEdges) ? options.highlightedEdges : [];
        const highlightedEdgeSet = new Set(highlightedEdges.map((pair) => `${pair[0]}-${pair[1]}`));

        const data = Array.isArray(snapshot?.data) ? snapshot.data : this.heap?.data;
        const size = Number.isFinite(snapshot?.size) ? snapshot.size : (this.heap?.size ?? 0);
        if (!data) {
            container.innerHTML = '';
            return;
        }

        const positions = [
            { x: 50, y: 9 },
            { x: 28, y: 28 }, { x: 72, y: 28 },
            { x: 16, y: 47 }, { x: 38, y: 47 }, { x: 62, y: 47 }, { x: 84, y: 47 },
            { x: 10, y: 68 }, { x: 22, y: 68 }, { x: 34, y: 68 }, { x: 46, y: 68 }, { x: 58, y: 68 }, { x: 70, y: 68 }, { x: 82, y: 68 }, { x: 94, y: 68 },
        ];

        const lineParts = [];
        for (let i = 0; i < 7; i++) {
            if (i >= size || data[i] === undefined || data[i] === null) continue;
            const left = 2 * i + 1;
            const right = 2 * i + 2;

            if (left < size && data[left] !== undefined && data[left] !== null) {
                const edgeClass = highlightedEdgeSet.has(`${i}-${left}`) ? 'active-edge' : '';
                lineParts.push(`<line class="${edgeClass}" data-from="${i}" data-to="${left}" x1="${positions[i].x}%" y1="${positions[i].y}%" x2="${positions[left].x}%" y2="${positions[left].y}%" />`);
            }
            if (right < size && data[right] !== undefined && data[right] !== null) {
                const edgeClass = highlightedEdgeSet.has(`${i}-${right}`) ? 'active-edge' : '';
                lineParts.push(`<line class="${edgeClass}" data-from="${i}" data-to="${right}" x1="${positions[i].x}%" y1="${positions[i].y}%" x2="${positions[right].x}%" y2="${positions[right].y}%" />`);
            }
        }

        const nodeParts = [];
        for (let i = 0; i < 15; i++) {
            const hasValue = i < size && data[i] !== undefined && data[i] !== null;
            const value = hasValue ? String(data[i]) : '-';
            nodeParts.push(
                `<div class="heap-tree-node ${hasValue ? 'filled' : 'empty'} ${i === 0 && hasValue ? 'root' : ''} ${highlightedSet.has(i) ? 'active' : ''}" style="left:${positions[i].x}%; top:${positions[i].y}%">` +
                    `<span class="heap-tree-node-idx">${i}</span>` +
                    `<span class="heap-tree-node-value">${value}</span>` +
                `</div>`
            );
        }

        container.innerHTML =
            `<svg class="heap-tree-edges" viewBox="0 0 100 100" preserveAspectRatio="none">${lineParts.join('')}</svg>` +
            nodeParts.join('');
        container.classList.toggle('values-only', !this.showTreeIndexes);
    }

    _bindTreeToggle() {
        const btn = document.getElementById('btnHeapTreeToggleMeta');
        if (!btn) return;

        this._handleTreeMetaToggle = () => {
            this.showTreeIndexes = !this.showTreeIndexes;
            this._syncTreeToggleUi();
            this._renderTreePreview();
        };
        btn.addEventListener('click', this._handleTreeMetaToggle);
    }

    _syncTreeToggleUi() {
        const btn = document.getElementById('btnHeapTreeToggleMeta');
        if (!btn) return;
        btn.textContent = this.showTreeIndexes ? 'Somente valores' : 'Mostrar indices';
        btn.classList.toggle('is-active', !this.showTreeIndexes);
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
            const globals = this.appManager.getGlobals();
            globals.statePanel.updateProp('size', 0);
            globals.statePanel.updateProp('head', '-');
            globals.statePanel.updateProp('tail', '-');
            this._updateHeapFocusPanel();
            this._renderTreePreview();
            globals.callStackPanel.reset();
            globals.localVarsPanel.clear();
            globals.timelinePanel.clear();
            globals.consolePanel.log('Heap de Prioridade reinicializado.');
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
            this._updateHeapFocusPanel();
            this._renderTreePreview();
            if (this._restorePlaybackSpeed) {
                this._restorePlaybackSpeed();
                this._restorePlaybackSpeed = null;
            }
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
    }
}
