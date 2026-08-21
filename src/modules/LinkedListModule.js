class LinkedListModule extends BaseModule {
    constructor(appManager) {
        super(appManager);
        this.list = new DoublyLinkedList();
        this.nodeRenderer = null;
        this.pointerRenderer = null;
        this.memoryPointerRenderer = null;
        this.stepExecutor = null;
        this.animationController = null;
        this.operationPanel = null;

        this._handlePlayPause = null;
        this._handleFastForward = null;
        this._handleNextStep = null;
        this._handleRestart = null;
        this._handleSpeedSelect = null;
        this.scenarioQueue = [];
        this.isScenarioRunning = false;
        this.scenarioManualMode = false;

        this.debugEngine = null;
        this.debugBaseline = null;
        this.debugStats = { visited: 0, ops: 0, comparisons: 0 };
    }

    init() {
        const globals = this.appManager.getGlobals();

        this.nodeRenderer = new NodeRenderer('nodesContainer', 'memoryNodesContainer');
        this.nodeRenderer.setMemoryView(true);
        this.pointerRenderer = new PointerRenderer('arrowsCanvas', this.nodeRenderer, 'logical');
        this.memoryPointerRenderer = new PointerRenderer('memoryArrowsCanvas', this.nodeRenderer, 'memory');
        this.stepExecutor = new StepExecutor(
            this.nodeRenderer,
            [this.pointerRenderer, this.memoryPointerRenderer],
            globals.statePanel,
            globals.codeHighlighter,
            globals.consolePanel,
            globals.complexityPanel,
            globals.callStackPanel,
            globals.localVarsPanel,
            globals.timelinePanel
        );
        this.animationController = new AnimationController(this.stepExecutor);

        this.debugEngine = new AlgorithmExecutionEngine({
            onApply: (event, isFast) => {
                const step = event.rawStep;
                if (isFast) this.stepExecutor.executeFast(step);
                else this.stepExecutor.execute(step);

                this._updateDebugStats(event);
                const globalsInner = this.appManager.getGlobals();
                if (globalsInner.algorithmDebugPanel) {
                    globalsInner.algorithmDebugPanel.renderEvent(event, {
                        structureType: 'linked_list',
                        metrics: {
                            visitedNodes: this.debugStats.visited,
                            queueOps: this.debugStats.ops,
                            comparisons: this.debugStats.comparisons,
                        },
                    });
                }
            },
            onReset: () => {
                this.stepExecutor.restoreSnapshot(this.debugBaseline || this._captureSnapshot());
                this.debugStats = { visited: 0, ops: 0, comparisons: 0 };
            },
            onProgress: (currentIndex, total, lastEvent) => {
                const counter = document.getElementById('stepCounter');
                if (counter) counter.textContent = `${currentIndex}/${total}`;
                const globalsInner = this.appManager.getGlobals();
                if (globalsInner.algorithmDebugPanel) {
                    globalsInner.algorithmDebugPanel.onProgress(currentIndex, total, lastEvent);
                }
            },
            onComplete: () => {
                const btn = document.getElementById('btnPlayPause');
                if (btn) btn.textContent = '\u25B6';
                if (this.isScenarioRunning) {
                    this._runNextScenarioOperation();
                }
            },
        });
        this.list = new DoublyLinkedList();
        this.operationPanel = new LinkedListOperationPanel(this);
        this._bindPlaybackControls();

        globals.codeHighlighter.setFileName('LinkedList.java');
        globals.statePanel.updateProp('head', 'null');
        globals.statePanel.updateProp('tail', 'null');
        globals.statePanel.updateProp('size', 0);
        globals.consolePanel.log('Lista encadeada inicializada.');
    }

    destroy() {
        if (this.animationController) {
            this.animationController.pause();
            this.animationController = null;
        }
        if (this.debugEngine) {
            this.debugEngine.pause();
        }

        const playBtn = document.getElementById('btnPlayPause');
        const prevBtn = document.getElementById('btnPrevStep');
        const nextBtn = document.getElementById('btnNextStep');
        const fastBtn = document.getElementById('btnFastForward');
        const restartBtn = document.getElementById('btnRestartAnim');
        const speedSelect = document.getElementById('speedSelect');

        if (playBtn && this._handlePlayPause) playBtn.removeEventListener('click', this._handlePlayPause);
        if (prevBtn && this._handlePrevStep) prevBtn.removeEventListener('click', this._handlePrevStep);
        if (nextBtn && this._handleNextStep) nextBtn.removeEventListener('click', this._handleNextStep);
        if (fastBtn && this._handleFastForward) fastBtn.removeEventListener('click', this._handleFastForward);
        if (restartBtn && this._handleRestart) restartBtn.removeEventListener('click', this._handleRestart);
        if (speedSelect && this._handleSpeedSelect) speedSelect.removeEventListener('change', this._handleSpeedSelect);

        this._clearScenarioQueue();
        this.list = new DoublyLinkedList();
        this.operationPanel = null;
    }

    executeOperation(methodName, value, options = {}) {
        if (!this.list || typeof this.list[methodName] !== 'function') return;

        const isDebugMode = this.appManager.activeViewTab === 'debug';
        const supportsDebug = ['addFirst', 'addLast', 'removeFirst', 'removeLast', 'removeValue', 'get', 'insert', 'clear', 'indexOf'].includes(methodName);
        if (isDebugMode && supportsDebug) {
            this._executeOperationInDebugMode(methodName, value, options);
            return;
        }

        const preserveScenario = Boolean(options.preserveScenario);
        const autoPlay = false;
        if (!preserveScenario) {
            this._clearScenarioQueue();
        }

        if (this.animationController && this.animationController.isPlaying) {
            this.animationController.fastForward();
        }

        const args = Array.isArray(value) ? value : (value === undefined ? [] : [value]);
        const baseline = this._captureSnapshot();
        this.list[methodName](...args);
        const steps = this.list.steps;

        const globals = this.appManager.getGlobals();
        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = `${methodName}(${args.join(', ')})`;

        globals.callStackPanel.reset();
        globals.callStackPanel.push(`${methodName}(${args.join(', ')})`);
        globals.localVarsPanel.setContext(methodName, args);
        globals.timelinePanel.setSteps(steps);

        this.animationController.onStep = (currentIndex, total) => {
            const counter = document.getElementById('stepCounter');
            if (counter) counter.textContent = `${currentIndex}/${total}`;
            globals.timelinePanel.setCurrentIndex(currentIndex - 1);
        };

        this.animationController.setResetHandler(() => this.stepExecutor.restoreSnapshot(baseline));
        this.animationController.setSteps(steps);
        const btnPlayPause = document.getElementById('btnPlayPause');
        if (autoPlay) {
            this.animationController.play();
            if (btnPlayPause) btnPlayPause.textContent = '\u23F8';
        } else {
            this.animationController.pause();
            if (btnPlayPause) btnPlayPause.textContent = '\u25B6';
        }
    }

    _executeOperationInDebugMode(methodName, value, options = {}) {
        if (this.animationController.isPlaying || this.animationController.hasPendingSteps()) {
            this.animationController.fastForward();
        }
        if (this.debugEngine) this.debugEngine.pause();

        this.debugBaseline = this._captureSnapshot();
        this.debugStats = { visited: 0, ops: 0, comparisons: 0 };

        const args = Array.isArray(value) ? value : (value === undefined ? [] : [value]);
        this.list[methodName](...args);
        const steps = this.list.steps;
        const events = this._buildAlgorithmEvents(methodName, args, steps, this.debugBaseline);
        const globals = this.appManager.getGlobals();

        globals.timelinePanel.setSteps(steps);

        if (globals.algorithmDebugPanel) {
            const codeCandidate = steps.find((step) => String(step?.codeLine || '').includes('public '));
            const codeText = codeCandidate ? String(codeCandidate.codeLine || '').trim() : '';
            globals.algorithmDebugPanel.startSession({
                modeLabel: 'ALGORITHM DEBUGGER | LINKED LIST',
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

        // Auto-play if part of a running scenario (not manual mode)
        const shouldAutoPlay = Boolean(options.autoPlay) || (this.isScenarioRunning && !this.scenarioManualMode);
        if (shouldAutoPlay) {
            const btn = document.getElementById('btnPlayPause');
            if (btn) btn.textContent = '\u23F8';
            this.debugEngine.play();
        }
    }

    _buildAlgorithmEvents(methodName, args, steps, baseline) {
        const events = [];
        const debugSteps = Array.isArray(steps) ? steps.filter((step) => step && step.type !== 'INFO') : [];

        debugSteps.forEach((step, index) => {
            const type = this._eventTypeFromStep(step);
            const variables = { operation: methodName };

            if (step.data?.debugVars && typeof step.data.debugVars === 'object') {
                Object.assign(variables, step.data.debugVars);
            } else if (step.data) {
                Object.assign(variables, step.data);
            }

            events.push(new AlgorithmEvent({
                id: `ll_evt_${index + 1}`,
                type,
                step: index + 1,
                lineNumber: Number.isInteger(step?.data?.activeLine) ? step.data.activeLine : null,
                description: String(step.description || type),
                why: step.why || step.description,
                nodeId: step.data?.target || step.data?.source || null,
                variables,
                beforeState: baseline,
                afterState: null,
                animation: type === 'SEARCH_FOUND' ? 'found' : 'highlight',
                rawStep: step,
            }));
        });

        return events;
    }

    _eventTypeFromStep(step) {
        if (!step) return 'UNKNOWN';
        const type = String(step.type);
        if (type === 'TRAVERSE_COMPARE') return 'CONDITION_CHECKED';
        if (type.includes('TRAVERSE')) return 'NODE_VISITED';
        if (type.includes('SET_') || type.includes('REMOVE_') || type.includes('UNLINK') || type.includes('CREATE') || type.includes('ISOLATE') || type.includes('UPDATE_SIZE')) return 'STATE_UPDATED';
        if (type === 'ERROR') return 'CONDITION_FAILED';
        return type;
    }

    _updateDebugStats(event) {
        if (!event) return;
        const type = String(event.type || '');
        if (type === 'CONDITION_CHECKED') this.debugStats.comparisons += 1;
        if (type === 'NODE_VISITED') this.debugStats.visited += 1;
        if (type === 'STATE_UPDATED') this.debugStats.ops += 1;
    }

    runScenario(scenarioId) {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.linkedList)
            ? window.DemoScenarios.linkedList
            : [];
        const scenario = scenarios.find((entry) => entry.id === scenarioId);
        if (!scenario || !Array.isArray(scenario.operations) || !scenario.operations.length) return;

        this.resetSystem();
        this.scenarioQueue = scenario.operations.map((operation) => ({
            method: operation.method,
            args: Array.isArray(operation.args) ? [...operation.args] : [],
        }));
        this.isScenarioRunning = true;
        this.scenarioManualMode = true;
        this._runNextScenarioOperation();
    }

    resetSystem() {
        this._clearScenarioQueue();
        this.list = new DoublyLinkedList();
        this.animationController.pause();
        if (this.debugEngine) this.debugEngine.pause();
        this.animationController.setResetHandler(null);
        this.animationController.setSteps([]);
        this.stepExecutor.clear();
        const globals = this.appManager.getGlobals();
        globals.statePanel.reset();
        globals.consolePanel.log('Sistema reinicializado.');
        globals.callStackPanel.reset();
        globals.timelinePanel.clear();

        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = '-';
        const counter = document.getElementById('stepCounter');
        if (counter) counter.textContent = '0/0';
        const action = document.getElementById('currentStepAction');
        if (action) action.textContent = 'Aguardando operacao...';
    }

    _captureSnapshot() {
        const snapshot = {
            headId: null,
            tailId: null,
            size: 0,
            nodes: [],
        };

        if (!this.list || typeof this.list.getState !== 'function') {
            return snapshot;
        }

        const state = this.list.getState();
        snapshot.headId = state.head ? state.head.id : null;
        snapshot.tailId = state.tail ? state.tail.id : null;
        snapshot.size = state.size || 0;

        const visited = new Set();
        let current = state.head || null;
        while (current && !visited.has(current.id)) {
            visited.add(current.id);
            snapshot.nodes.push({
                id: current.id,
                value: current.value,
                memoryAddress: current.memoryAddress,
                nextId: current.next ? current.next.id : null,
                previousId: current.previous ? current.previous.id : null,
            });
            current = current.next;
        }

        return snapshot;
    }

    _runNextScenarioOperation() {
        if (!this.scenarioQueue.length) {
            this._clearScenarioQueue();
            return;
        }

        const nextOperation = this.scenarioQueue.shift();

        // All scenario operations are animated - no silent setup phase.
        // animationController.onComplete triggers the next one.
        this.executeOperation(nextOperation.method, nextOperation.args, {
            preserveScenario: true,
            autoPlay: !this.scenarioManualMode,
        });
    }


    _clearScenarioQueue() {
        this.scenarioQueue = [];
        this.isScenarioRunning = false;
        this.scenarioManualMode = false;
    }

    _bindPlaybackControls() {
        this._handlePlayPause = () => {
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine && this.debugEngine.events.length) {
                if (this.debugEngine.isPlaying) {
                    this.debugEngine.pause();
                    const btn = document.getElementById('btnPlayPause');
                    if (btn) btn.textContent = '\u25B6';
                } else {
                    this.debugEngine.play();
                    const btn = document.getElementById('btnPlayPause');
                    if (btn) btn.textContent = '\u23F8';
                }
                return;
            }
            if (!this.animationController) return;
            if (this.animationController.isPlaying) {
                this.animationController.pause();
                const btn = document.getElementById('btnPlayPause');
                if (btn) btn.textContent = '\u25B6';
            } else {
                if (this.isScenarioRunning) this.scenarioManualMode = false;
                this.animationController.play();
                const btn = document.getElementById('btnPlayPause');
                if (btn) btn.textContent = '\u23F8';
            }
        };

        this._handleNextStep = () => {
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine && this.debugEngine.events.length) {
                this.debugEngine.pause();
                this.debugEngine.next();
                const btn = document.getElementById('btnPlayPause');
                if (btn) btn.textContent = '\u25B6';
                return;
            }
            if (!this.animationController) return;
            if (this.isScenarioRunning) this.scenarioManualMode = true;
            this.animationController.pause();
            this.animationController.stepForward();
            const btn = document.getElementById('btnPlayPause');
            if (btn) btn.textContent = '\u25B6';
        };

        this._handlePrevStep = () => {
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine && this.debugEngine.events.length) {
                this.debugEngine.pause();
                this.debugEngine.previous();
                const btn = document.getElementById('btnPlayPause');
                if (btn) btn.textContent = '\u25B6';
                return;
            }
            if (!this.animationController) return;
            this.animationController.pause();
            const btn = document.getElementById('btnPlayPause');
            if (btn) btn.textContent = '\u25B6';
        };

        this._handleFastForward = () => {
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine && this.debugEngine.events.length) {
                this.debugEngine.finish();
                const btn = document.getElementById('btnPlayPause');
                if (btn) btn.textContent = '\u25B6';
                return;
            }
            if (!this.animationController) return;
            if (this.isScenarioRunning) this.scenarioManualMode = false;
            this.animationController.fastForward();
            const btn = document.getElementById('btnPlayPause');
            if (btn) btn.textContent = '\u25B6';
        };

        this._handleRestart = () => {
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine && this.debugEngine.events.length) {
                this.debugEngine.pause();
                this.debugEngine.reset();
                const btn = document.getElementById('btnPlayPause');
                if (btn) btn.textContent = '\u25B6';
                return;
            }
            if (!this.animationController) return;
            if (this.isScenarioRunning) this._clearScenarioQueue();
            this.resetSystem();
            const btn = document.getElementById('btnPlayPause');
            if (btn) btn.textContent = '\u25B6';
        };

        this._handleSpeedSelect = (event) => {
            const value = parseFloat(event.target.value || '1');
            if (this.appManager.activeViewTab === 'debug' && this.debugEngine) {
                this.debugEngine.setSpeed(value);
            }
            if (this.animationController) this.animationController.setSpeed(value);
        };

        document.getElementById('btnPlayPause').addEventListener('click', this._handlePlayPause);
        document.getElementById('btnPrevStep').addEventListener('click', this._handlePrevStep);
        document.getElementById('btnNextStep').addEventListener('click', this._handleNextStep);
        document.getElementById('btnFastForward').addEventListener('click', this._handleFastForward);
        document.getElementById('btnRestartAnim').addEventListener('click', this._handleRestart);
        document.getElementById('speedSelect').addEventListener('change', this._handleSpeedSelect);

        this.animationController.onComplete = () => {
            const btn = document.getElementById('btnPlayPause');
            if (btn) btn.textContent = '\u25B6';

            if (this.isScenarioRunning) {
                this._runNextScenarioOperation();
            }
        };
    }
}

