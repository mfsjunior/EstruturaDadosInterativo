class BaseModule {
    constructor(appManager) {
        this.appManager = appManager;
        this.debugEngine = null;
        this.debugBaseline = null;
        this.debugStats = { visited: 0, moves: 0, comparisons: 0 };
    }

    initDebugEngine(structureType) {
        if (typeof AlgorithmExecutionEngine === 'undefined') return;
        
        this.debugEngine = new AlgorithmExecutionEngine({
            onApply: (event, isFast) => {
                const step = event.rawStep;
                if (!step) return;
                step.__algorithmEvent = event;
                
                if (this.stepExecutor) {
                    if (isFast) this.stepExecutor.executeFast(step);
                    else this.stepExecutor.execute(step);
                }

                const globalsInner = this.appManager.getGlobals();
                if (globalsInner.algorithmDebugPanel) {
                    const index = Number.isInteger(event.variables?.index)
                        ? event.variables.index
                        : (Number.isInteger(event.variables?.to) ? event.variables.to : null);
                        
                    globalsInner.algorithmDebugPanel.renderEvent(event, {
                        structureType: structureType,
                        arrayState: event.afterState || event.variables?.arrayState || null,
                        focusIndex: index,
                        metrics: {
                            visitedNodes: this.debugStats.visited || 0,
                            queueOps: this.debugStats.moves || 0,
                            comparisons: this.debugStats.comparisons || 0,
                        },
                    });
                }
            },
            onReset: () => {
                if (this.stepExecutor && this.debugBaseline) {
                    this.stepExecutor.restoreSnapshot(this.debugBaseline);
                }
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
    }

    runDebugSession(methodName, args, structureType, executeFn, getStepsFn) {
        if (this.animationController) {
            if (this.animationController.isPlaying || this.animationController.hasPendingSteps()) {
                this.animationController.fastForward();
            }
        }
        
        if (this.debugEngine) this.debugEngine.pause();

        this.debugBaseline = typeof this._captureSnapshot === 'function' ? this._captureSnapshot() : null;
        this.debugStats = { visited: 0, moves: 0, comparisons: 0 };

        // Execute the operation
        if (typeof executeFn === 'function') executeFn();

        // Get the steps
        const steps = typeof getStepsFn === 'function' ? getStepsFn() : [];
        
        // Map steps to AlgorithmEvents generically
        const events = this._mapStepsToEvents(methodName, args, steps);

        const globals = this.appManager.getGlobals();
        
        if (globals.algorithmDebugPanel) {
            const codeCandidate = steps.find((step) => String(step?.codeLine || '').includes('public '));
            const codeText = codeCandidate ? String(codeCandidate.codeLine || '').trim() : '';
            
            globals.algorithmDebugPanel.startSession({
                modeLabel: `ALGORITHM DEBUGGER | ${String(structureType).toUpperCase()}`,
                operationText: `${methodName}(${args.join(', ')})`,
                codeText: codeText || '// Sem codigo detalhado para este passo',
                events,
            });
            
            globals.algorithmDebugPanel.bindEngine(this.debugEngine);
        }

        if (this.debugEngine) {
            this.debugEngine.setEvents(events);
            const autoPauseInput = document.getElementById('debugAutoPause');
            this.debugEngine.setAutoPauseEachEvent(!!autoPauseInput?.checked);
            this.debugEngine.reset();
        }
        
        return steps;
    }

    _mapStepsToEvents(methodName, args, steps) {
        if (!steps || !steps.length) return [];
        if (typeof AlgorithmEvent === 'undefined') return [];
        
        return steps
            .filter(step => step && step.type !== 'INFO')
            .map((step, index) => {
                const variables = {
                    operation: methodName,
                    ...step.data
                };
                
                return new AlgorithmEvent({
                    id: `${methodName}_evt_${index + 1}`,
                    type: step.type,
                    step: index + 1,
                    description: step.description || '',
                    why: step.data?.cloud || '',
                    variables: variables,
                    rawStep: step,
                });
            });
    }

    /**
     * Called when the module is activated.
     * Should set up the specific data structure, UI, and animation.
     */
    init() {
        throw new Error("Method 'init()' must be implemented.");
    }

    /**
     * Called when the module is deactivated.
     * Should clean up the DOM, stop animations, and remove listeners.
     */
    destroy() {
        throw new Error("Method 'destroy()' must be implemented.");
    }
}
