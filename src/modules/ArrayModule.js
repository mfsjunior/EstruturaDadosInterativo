class ArrayModule extends BaseModule {
    constructor(appManager) {
        super(appManager);
        this.arrayRenderer = null;
        this.stepExecutor = null;
        this.animationController = null;
        this.array = null;
        this.operationPanel = null;
        this.debugEngine = null;
        this.debugBaseline = null;
        this.debugStats = { visited: 0, moves: 0, comparisons: 0 };

        // Listeners controllers
        this._handlePlayPause = null;
        this._handleFastForward = null;
        this._handleNextStep = null;
        this._handleRestart = null;
        this._handleSpeedSelect = null;
    }

    init() {
        const globals = this.appManager.getGlobals();

        // 1. Setup Viz
        this.arrayRenderer = new ArrayRenderer('nodesContainer');
        // Initial array setup (capacity 5, base address 0x1000, 4 bytes per element)
        this.arrayRenderer.init(5, 0x1000, 4);
        if (this.arrayRenderer.container) {
            this.arrayRenderer.container.classList.add('array-mode');
            this.arrayRenderer.container.classList.remove('stack-mode', 'queue-mode');
            const vizCard = this.arrayRenderer.container.closest('.viz-card');
            if (vizCard) {
                vizCard.classList.remove('stack-viz-card');
                vizCard.classList.remove('queue-viz-card');
            }
        }

        // 2. Setup Animation
        this.stepExecutor = new ArrayStepExecutor(
            this.arrayRenderer,
            globals.statePanel,
            globals.codeHighlighter,
            globals.consolePanel,
            globals.complexityPanel
        );
        this.animationController = new AnimationController(this.stepExecutor);
        this.debugEngine = new AlgorithmExecutionEngine({
            onApply: (event, isFast) => {
                const step = event.rawStep;
                if (!step) return;
                step.__algorithmEvent = event;
                if (isFast) this.stepExecutor.executeFast(step);
                else this.stepExecutor.execute(step);

                this._updateDebugStats(event);
                const globalsInner = this.appManager.getGlobals();
                if (globalsInner.algorithmDebugPanel) {
                    const index = Number.isInteger(event.variables?.index)
                        ? event.variables.index
                        : (Number.isInteger(event.variables?.to) ? event.variables.to : null);
                    globalsInner.algorithmDebugPanel.renderEvent(event, {
                        structureType: 'array',
                        arrayState: event.afterState || event.variables?.arrayState || null,
                        focusIndex: index,
                        metrics: {
                            visitedNodes: this.debugStats.visited,
                            queueOps: this.debugStats.moves,
                            comparisons: this.debugStats.comparisons,
                        },
                    });
                }
            },
            onReset: () => {
                this.stepExecutor.restoreSnapshot(this.debugBaseline || this._captureSnapshot());
                this.debugStats = { visited: 0, moves: 0, comparisons: 0 };
            },
            onProgress: (currentIndex, total, lastEvent) => {
                const counter = document.getElementById('stepCounter');
                if (counter) counter.textContent = `${currentIndex}/${total}`;
                const globalsInner = this.appManager.getGlobals();
                if (globalsInner.algorithmDebugPanel) {
                    globalsInner.algorithmDebugPanel.onProgress(currentIndex, total, lastEvent);
                }
            },
        });

        // 3. Init Core Model
        this.array = new SequentialArray(5);

        // 4. Bind UI specific to this module
        this.operationPanel = new ArrayOperationPanel(this);

        this._bindPlaybackControls();

        // Update Initial State
        globals.codeHighlighter.setFileName('SequentialArray.java');
        globals.statePanel.updateProp('size', 0);
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', '-');
        globals.consolePanel.log('Array Sequencial inicializado. Capacidade: 5.');
        globals.callStackPanel.reset();
        globals.localVarsPanel.clear();
        globals.timelinePanel.clear();
    }

    destroy() {
        if (this.animationController) {
            this.animationController.pause();
            this.animationController = null;
        }
        if (this.debugEngine) this.debugEngine.pause();
        if (this.arrayRenderer?.container) {
            this.arrayRenderer.container.classList.remove('array-mode');
        }
        this.stepExecutor = null;
        this.array = null;

        const btnPlayPause = document.getElementById('btnPlayPause');
        if (btnPlayPause && this._handlePlayPause) {
            btnPlayPause.removeEventListener('click', this._handlePlayPause);
        }

        const btnPrevStep = document.getElementById('btnPrevStep');
        if (btnPrevStep && this._handlePrevStep) {
            btnPrevStep.removeEventListener('click', this._handlePrevStep);
        }

        const btnNextStep = document.getElementById('btnNextStep');
        if (btnNextStep && this._handleNextStep) {
            btnNextStep.removeEventListener('click', this._handleNextStep);
        }

        const btnFastForward = document.getElementById('btnFastForward');
        if (btnFastForward && this._handleFastForward) {
            btnFastForward.removeEventListener('click', this._handleFastForward);
        }

        const btnRestartAnim = document.getElementById('btnRestartAnim');
        if (btnRestartAnim && this._handleRestart) {
            btnRestartAnim.removeEventListener('click', this._handleRestart);
        }

        const speedSelect = document.getElementById('speedSelect');
        if (speedSelect && this._handleSpeedSelect) {
            speedSelect.removeEventListener('change', this._handleSpeedSelect);
        }
    }

    executeOperation(methodName, args = [], silent = false, autoPlay = true) {
        const isDebugMode = this.appManager.activeViewTab === 'debug';
        const supportsDebug = methodName === 'get' || methodName === 'add' || methodName === 'addLast' || methodName === 'remove' || methodName === 'indexOf';
        if (isDebugMode && supportsDebug) {
            this._executeOperationInDebugMode(methodName, args, silent);
            return;
        }

        autoPlay = false;
        if (this.animationController.isPlaying) {
            this.animationController.fastForward();
        }

        const baseline = this._captureSnapshot();

        // Execute logic on the model
        this.array[methodName](...args);

        const steps = this.array.getSteps();

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

        this.animationController.setResetHandler(() => this.stepExecutor.restoreSnapshot(baseline));

        if (silent) {
            this.animationController.setSteps(steps);
            this.animationController.fastForward();
        } else {
            this.animationController.setSteps(steps);
            if (autoPlay) {
                this.animationController.play();
                document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x23F8);
            } else {
                this.animationController.pause();
                document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
            }
        }
    }

    _executeOperationInDebugMode(methodName, args = [], silent = false) {
        if (this.animationController.isPlaying || this.animationController.hasPendingSteps()) {
            this.animationController.fastForward();
        }
        if (this.debugEngine) this.debugEngine.pause();

        this.debugBaseline = this._captureSnapshot();
        this.debugStats = { visited: 0, moves: 0, comparisons: 0 };

        this.array[methodName](...args);
        const steps = this.array.getSteps();
        const events = this._buildAlgorithmEvents(methodName, args, steps, this.debugBaseline);
        const globals = this.appManager.getGlobals();

        const title = document.getElementById('currentOperationTitle');
        if (title && !silent) title.textContent = `${methodName}(${args.join(', ')})`;

        globals.callStackPanel.reset();
        globals.callStackPanel.push(`${methodName}(${args.join(', ')})`);
        globals.timelinePanel.setSteps(steps);

        if (globals.algorithmDebugPanel) {
            const codeCandidate = steps.find((step) => String(step?.codeLine || '').includes('public '));
            const codeText = codeCandidate ? String(codeCandidate.codeLine || '').trim() : '';
            globals.algorithmDebugPanel.startSession({
                modeLabel: 'ALGORITHM DEBUGGER | ARRAY',
                operationText: `${methodName}(${args.join(', ')})`,
                codeText: codeText || '// Sem codigo para este passo',
                events,
            });
            globals.algorithmDebugPanel.bindEngine(this.debugEngine);
        }

        this.debugEngine.setEvents(events);
        const autoPauseInput = document.getElementById('debugAutoPause');
        this.debugEngine.setAutoPauseEachEvent(!!autoPauseInput?.checked);
        this.debugEngine.reset();
    }

    _buildAlgorithmEvents(methodName, args, steps, baseline) {
        const events = [];
        const targetIndex = methodName === 'addLast'
            ? (baseline?.size ?? null)
            : (Number.isInteger(Number(args?.[0])) ? Number(args[0]) : null);
        const targetValue = methodName === 'add'
            ? args?.[1]
            : (methodName === 'addLast' ? args?.[0] : null);

        let state = baseline ? {
            capacity: baseline.capacity,
            baseAddress: baseline.baseAddress,
            elementSize: baseline.elementSize,
            size: baseline.size,
            data: Array.isArray(baseline.data) ? [...baseline.data] : [],
        } : this._captureSnapshot();

        const debugSteps = Array.isArray(steps)
            ? steps.filter((step) => step && step.type !== 'INFO')
            : [];

        debugSteps.forEach((step, index) => {
            state = this._applyStepToArrayState(state, step);

            const type = this._eventTypeFromStep(step);
            const variables = {
                operation: methodName,
                targetIndex,
                targetValue,
                index: Number.isInteger(step?.data?.index) ? step.data.index : targetIndex,
                value: Object.prototype.hasOwnProperty.call(step?.data || {}, 'value') ? step.data.value : null,
                size: state.size,
                capacity: state.capacity,
                found: false,
            };

            if (step.data?.debugVars && typeof step.data.debugVars === 'object') {
                Object.assign(variables, step.data.debugVars);
            }

            variables.arrayState = {
                capacity: state.capacity,
                baseAddress: state.baseAddress,
                elementSize: state.elementSize,
                size: state.size,
                data: [...state.data],
            };

            if (methodName === 'get' && type === 'INDEX_COMPARED') {
                variables.found = true;
                variables.result = [variables.value];
            }
            if (type === 'SEARCH_NOT_FOUND') {
                variables.found = false;
                variables.result = [];
            }

            events.push(new AlgorithmEvent({
                id: `array_evt_${index + 1}`,
                type,
                step: index + 1,
                lineNumber: Number.isInteger(step?.data?.activeLine) ? step.data.activeLine : null,
                description: String(step.description || type),
                why: this._whyFromStep(step),
                nodeId: null,
                affectedNodes: [],
                variables,
                beforeState: baseline,
                afterState: variables.arrayState,
                animation: type === 'SEARCH_FOUND' ? 'found' : 'highlight',
                rawStep: step,
            }));
        });

        return events;
    }

    _applyStepToArrayState(currentState, step) {
        const next = {
            capacity: currentState?.capacity ?? 0,
            baseAddress: currentState?.baseAddress ?? 0x1000,
            elementSize: currentState?.elementSize ?? 4,
            size: currentState?.size ?? 0,
            data: Array.isArray(currentState?.data) ? [...currentState.data] : [],
        };

        if (!step || !step.data) return next;

        if (step.type === 'ARRAY_RESIZE_START') {
            next.capacity = Number(step.data.newCapacity) || next.capacity;
            next.baseAddress = Number(step.data.newBaseAddress) || next.baseAddress;
            next.data = new Array(next.capacity).fill(undefined).map((_, idx) => next.data[idx]);
        } else if (step.type === 'ARRAY_RESIZE_COPY') {
            next.data[step.data.index] = step.data.value;
        } else if (step.type === 'ARRAY_INSERT') {
            next.data[step.data.index] = step.data.value;
            next.size = Number(step.data.size) || next.size;
        } else if (step.type === 'ARRAY_SHIFT_RIGHT' || step.type === 'ARRAY_SHIFT_LEFT') {
            next.data[step.data.to] = step.data.value;
            next.data[step.data.from] = undefined;
        } else if (step.type === 'ARRAY_REMOVE_START') {
            next.data[step.data.index] = undefined;
        } else if (step.type === 'ARRAY_REMOVE_END') {
            next.data[step.data.index] = undefined;
            if (Object.prototype.hasOwnProperty.call(step.data, 'size')) next.size = Number(step.data.size) || 0;
        } else if (step.type === 'UPDATE_STATE') {
            if (Object.prototype.hasOwnProperty.call(step.data, 'size')) next.size = Number(step.data.size) || 0;
        } else if (step.type === 'ARRAY_CLEAR') {
            next.capacity = Number(step.data.capacity) || 5;
            next.baseAddress = Number(step.data.baseAddress) || 0x1000;
            next.elementSize = Number(step.data.elementSize) || 4;
            next.size = 0;
            next.data = new Array(next.capacity);
        }

        if (next.data.length < next.capacity) {
            next.data.length = next.capacity;
        }
        return next;
    }

    _eventTypeFromStep(step) {
        const type = String(step?.type || '');
        const text = String(step?.description || '').toLowerCase();

        if (type === 'ERROR') return 'CONDITION_FAILED';
        if (type === 'ARRAY_DIRECT_ACCESS') return 'INDEX_COMPARED';
        if (type === 'ARRAY_INSERT_CHECK' || type === 'ARRAY_REMOVE_CHECK' || type === 'ARRAY_CAPACITY_CHECK') return 'CONDITION_CHECKED';
        if (type === 'ARRAY_SHIFT_RIGHT' || type === 'ARRAY_SHIFT_LEFT') return 'VALUE_SHIFTED';
        if (type === 'ARRAY_INSERT') return 'VALUE_WRITTEN';
        if (type === 'ARRAY_REMOVE_START' || type === 'ARRAY_REMOVE_END') return 'VALUE_REMOVED';
        if (type === 'ARRAY_RESIZE_START' || type === 'ARRAY_RESIZE_COPY' || type === 'ARRAY_RESIZE_END') return 'ARRAY_RESIZED';
        if (type === 'UPDATE_STATE') return 'STATE_UPDATED';
        if (text.includes('fora dos limites')) return 'SEARCH_NOT_FOUND';
        if (text.includes('valor encontrado')) return 'SEARCH_FOUND';
        return 'STEP_APPLIED';
    }

    _whyFromStep(step) {
        if (typeof step?.data?.cloud === 'string' && step.data.cloud.trim()) {
            return step.data.cloud.trim();
        }
        return String(step?.description || 'Passo executado para manter a consistencia do array.');
    }

    _updateDebugStats(event) {
        if (!event) return;
        const type = String(event.type || '');
        if (type === 'INDEX_COMPARED' || type === 'CONDITION_CHECKED') this.debugStats.comparisons += 1;
        if (type === 'VALUE_SHIFTED') this.debugStats.moves += 1;
        if (type === 'INDEX_COMPARED' || type === 'VALUE_WRITTEN' || type === 'VALUE_REMOVED') this.debugStats.visited += 1;
    }

    _captureSnapshot() {
        return {
            capacity: this.array?.capacity ?? 0,
            baseAddress: this.array?.baseAddress ?? 0x1000,
            elementSize: this.array?.elementSize ?? 4,
            size: this.array?.size ?? 0,
            data: Array.isArray(this.array?.data) ? [...this.array.data] : [],
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
            // Optional: this.animationController.stepBackward() if implemented
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
        document.getElementById('btnPrevStep').addEventListener('click', this._handlePrevStep);

        this._handleRestart = () => {
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine && this.debugEngine.events.length) {
                this.debugEngine.pause();
                this.debugEngine.reset();
                document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
                return;
            }
            this.animationController.pause();
            if (this.debugEngine) this.debugEngine.pause();
            this.animationController.setResetHandler(null);
            this.animationController.setSteps([]);
            this.array = new SequentialArray(5);
            this.arrayRenderer.init(5, 0x1000, 4);
            this.stepExecutor.clear();
            const globals = this.appManager.getGlobals();
            globals.statePanel.updateProp('size', 0);
            globals.statePanel.updateProp('head', '-');
            globals.statePanel.updateProp('tail', '-');
            globals.callStackPanel.reset();
            globals.localVarsPanel.clear();
            globals.timelinePanel.clear();
            globals.consolePanel.log('Array Sequencial reinicializado.');
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
            const val = e.target.value;
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine) {
                this.debugEngine.setSpeed(parseFloat(val));
            }
            this.animationController.setSpeed(parseFloat(val));
        };
        document.getElementById('speedSelect').addEventListener('change', this._handleSpeedSelect);

        this.animationController.onComplete = () => {
            document.getElementById('btnPlayPause').textContent = String.fromCodePoint(0x25B6);
        };
    }
}