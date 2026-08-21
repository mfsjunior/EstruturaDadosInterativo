class BSTModule extends BaseModule {
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
        this.debugEngine = null;
        this.debugBaseline = null;
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
            globals.complexityPanel,
            globals.algorithmDebugPanel || null
        );
        this.animationController = new AnimationController(this.stepExecutor);
        this.debugEngine = new AlgorithmExecutionEngine({
            onApply: (event, isFast) => {
                const step = event.rawStep;
                if (!step) return;
                step.__algorithmEvent = event;
                if (isFast) this.stepExecutor.executeFast(step);
                else this.stepExecutor.execute(step);
            },
            onReset: () => {
                this.stepExecutor.restoreSnapshot(this.debugBaseline || this._captureSnapshot());
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
        this.tree = new BinarySearchTree();
        this.operationPanel = new BSTOperationPanel(this);
        this._bindPlaybackControls();

        globals.codeHighlighter.setFileName('BinarySearchTree.java');
        globals.statePanel.updateProp('head', '-');
        globals.statePanel.updateProp('tail', 'size@0');
        globals.statePanel.updateProp('size', 0);
        globals.consolePanel.log('BST inicializada. A busca contains nao visita todos os nos: ela compara e segue por um unico caminho, esquerda ou direita.');
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
        if (this.debugEngine) this.debugEngine.pause();
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
        const isDebugMode = this.appManager.activeViewTab === 'debug';
        const supportsEventDebug = methodName === 'contains' || methodName === 'insert' || methodName === 'bfs' || methodName === 'dfs';
        if (isDebugMode && supportsEventDebug && !this.isScenarioRunning) {
            this._executeOperationInDebugMode(methodName, args, silent);
            return;
        }

        if (this.animationController.isPlaying || this.animationController.hasPendingSteps()) {
            this.animationController.fastForward();
        }

        const baseline = this._captureSnapshot();
        this.debugBaseline = baseline;
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

    _executeOperationInDebugMode(methodName, args = [], silent = false) {
        if (this.animationController.isPlaying || this.animationController.hasPendingSteps()) {
            this.animationController.fastForward();
        }

        const baseline = this._captureSnapshot();
        this.tree[methodName](...args);
        const steps = this.tree.getSteps();
        const events = this._buildAlgorithmEvents(methodName, args, steps, baseline);
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
                modeLabel: 'ALGORITHM DEBUGGER | BST',
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
        const target = Array.isArray(args) && args.length ? args[0] : null;
        let result = [];
        let visited = [];
        const events = [];

        const debugSteps = Array.isArray(steps)
            ? steps.filter((step) => step && step.type !== 'INFO')
            : [];

        debugSteps.forEach((step, index) => {
            const focusNodeId = step?.data?.focusNodeId || null;
            const tree = step?.data?.tree || null;
            const focusNode = tree && Array.isArray(tree.nodes) && focusNodeId
                ? tree.nodes.find((node) => node.id === focusNodeId)
                : null;

            if (focusNode && !visited.includes(focusNode.value)) {
                visited = [...visited, focusNode.value];
            }

            if (methodName === 'contains') {
                if (String(step.description || '').toLowerCase().includes('encontramos')) {
                    result = [target];
                }
            }

            if (methodName === 'insert' && focusNode && Number(focusNode.value) === Number(target)) {
                result = [target];
            }

            const type = this._eventTypeFromStep(step);
            const why = this._whyFromStep(step);
            const variables = {
                target,
                current: focusNode ? focusNode.value : '-',
                path: [...visited],
                result: [...result],
                found: result.length > 0,
            };
            if (step.data?.debugVars && typeof step.data.debugVars === 'object') {
                Object.assign(variables, step.data.debugVars);
                if (Array.isArray(step.data.debugVars.result)) {
                    variables.result = [...step.data.debugVars.result];
                }
            }

            events.push(new AlgorithmEvent({
                id: `bst_evt_${index + 1}`,
                type,
                step: index + 1,
                lineNumber: Number.isInteger(step?.data?.activeLine) ? step.data.activeLine : null,
                description: String(step.description || type),
                why,
                nodeId: focusNodeId,
                affectedNodes: focusNodeId ? [focusNodeId] : [],
                variables,
                beforeState: baseline,
                afterState: step.data?.state || null,
                animation: type === 'NODE_FOUND' ? 'found' : 'highlight',
                rawStep: step,
            }));
        });

        return events;
    }

    _eventTypeFromStep(step) {
        const text = String(step?.description || '').toLowerCase();
        if (text.includes('desempilh')) return 'NODE_POPPED';
        if (text.includes('enfileir')) return 'NODE_ENQUEUED';
        if (text.includes('removendo') && text.includes('fila')) return 'NODE_DEQUEUED';
        if (text.includes('empilh')) return 'NODE_PUSHED';
        if (text.includes('encontramos')) return 'NODE_FOUND';
        if (text.includes('esquerda') || text.includes('direita')) return 'NODE_COMPARED';
        if (text.includes('inser')) return 'NODE_INSERTED';
        if (text.includes('visit')) return 'NODE_VISITED';
        return 'NODE_SELECTED';
    }

    _whyFromStep(step) {
        if (typeof step?.data?.cloud === 'string' && step.data.cloud.trim()) {
            return step.data.cloud.trim();
        }
        return String(step?.description || 'Passo executado para manter as propriedades da BST.');
    }

    runScenario(scenarioId) {
        const scenarios = window.DemoScenarios && Array.isArray(window.DemoScenarios.bst)
            ? window.DemoScenarios.bst
            : [];
        const scenario = scenarios.find((entry) => entry.id === scenarioId);
        if (!scenario || !Array.isArray(scenario.values) || !scenario.values.length) return;

        if (this.appManager.activeViewTab === 'debug') {
            this._runScenarioInDebugMode(scenario);
            return;
        }

        this.resetSystem();
        this.scenarioQueue = scenario.values.map((value) => ({
            method: 'insert',
            args: [value],
        }));
        this.isScenarioRunning = true;
        this.scenarioManualMode = false;
        this.pendingScenarioLabel = scenario.label || 'Cenario BST';
        this.pendingScenarioDescription = scenario.description || 'Cenario carregado.';

        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = this.pendingScenarioLabel;
        const action = document.getElementById('currentStepAction');
        if (action) action.textContent = this.pendingScenarioDescription;

        this._runNextScenarioOperation();
    }

    _runScenarioInDebugMode(scenario) {
        if (this.animationController.isPlaying || this.animationController.hasPendingSteps()) {
            this.animationController.fastForward();
        }
        if (this.debugEngine) this.debugEngine.pause();

        this.resetSystem();

        const baseline = this._captureSnapshot();
        const allSteps = [];
        scenario.values.forEach((value) => {
            this.tree.insert(value);
            allSteps.push(...this.tree.getSteps());
        });

        const events = this._buildAlgorithmEvents('scenario', [], allSteps, baseline);
        const globals = this.appManager.getGlobals();

        const title = document.getElementById('currentOperationTitle');
        if (title) title.textContent = scenario.label || 'BST Scenario';
        const action = document.getElementById('currentStepAction');
        if (action) action.textContent = scenario.description || 'Cenario em modo debug.';

        globals.callStackPanel.reset();
        globals.callStackPanel.push(`scenario(${scenario.id})`);
        globals.timelinePanel.setSteps(allSteps);

        if (globals.algorithmDebugPanel) {
            const codeCandidate = allSteps.find((step) => String(step?.codeLine || '').includes('public '));
            const codeText = codeCandidate ? String(codeCandidate.codeLine || '').trim() : '';
            globals.algorithmDebugPanel.startSession({
                modeLabel: 'ALGORITHM DEBUGGER | BST',
                operationText: scenario.label || `scenario(${scenario.id})`,
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

    resetSystem() {
        this._clearScenarioQueue();
        this.animationController.pause();
        if (this.debugEngine) this.debugEngine.pause();
        this.animationController.setResetHandler(null);
        this.animationController.setSteps([]);
        this.tree = new BinarySearchTree();
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
            this.scenarioManualMode ? {} : { tempSpeed: 1.35 }
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
            globals.consolePanel.log('BST reinicializada.');
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