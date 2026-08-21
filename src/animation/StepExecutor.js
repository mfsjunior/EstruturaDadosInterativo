class StepExecutor {
    constructor(nodeRenderer, pointerRenderers, statePanel, codeHighlighter, consolePanel, complexityPanel, callStackPanel, localVarsPanel, timelinePanel) {
        this.nodeRenderer = nodeRenderer;
        this.pointerRenderers = Array.isArray(pointerRenderers) ? pointerRenderers : [pointerRenderers];
        this.statePanel = statePanel;
        this.codeHighlighter = codeHighlighter;
        this.consolePanel = consolePanel;
        this.complexityPanel = complexityPanel;
        this.callStackPanel = callStackPanel;
        this.localVarsPanel = localVarsPanel;
        this.timelinePanel = timelinePanel;
    }

    execute(step) {
        this._dispatch(step, false);
    }

    executeFast(step) {
        this._dispatch(step, true);
    }

    clear() {
        this._resetPanels();
        this.nodeRenderer.clear();
        this.pointerRenderers.forEach((p) => p.clear());
    }

    restoreSnapshot(snapshot) {
        this._resetPanels();
        this.nodeRenderer.clear();
        this.pointerRenderers.forEach((p) => p.clear());

        if (!snapshot) return;

        const clonedNodes = new Map();
        snapshot.nodes.forEach((node) => {
            clonedNodes.set(node.id, {
                id: node.id,
                value: node.value,
                memoryAddress: node.memoryAddress,
                next: null,
                previous: null,
            });
        });

        snapshot.nodes.forEach((node) => {
            const current = clonedNodes.get(node.id);
            current.next = node.nextId ? clonedNodes.get(node.nextId) || null : null;
            current.previous = node.previousId ? clonedNodes.get(node.previousId) || null : null;
        });

        snapshot.nodes.forEach((node) => {
            this.nodeRenderer.addNode(clonedNodes.get(node.id));
        });

        snapshot.nodes.forEach((node) => {
            const current = clonedNodes.get(node.id);
            this.nodeRenderer.updatePointers(
                current.id,
                current.previous ? current.previous.memoryAddress : null,
                current.next ? current.next.memoryAddress : null
            );
            if (current.next) {
                this.pointerRenderers.forEach((p) => p.updatePointer(current.id, 'next', current.next.id));
            }
            if (current.previous) {
                this.pointerRenderers.forEach((p) => p.updatePointer(current.id, 'previous', current.previous.id));
            }
        });

        this.nodeRenderer.setHead(snapshot.headId);
        this.nodeRenderer.setTail(snapshot.tailId);
        this.statePanel.updateProp('head', snapshot.headId || 'null');
        this.statePanel.updateProp('tail', snapshot.tailId || 'null');
        this.statePanel.updateProp('size', snapshot.size || 0);
        this.pointerRenderers.forEach((p) => p.redraw());
    }

    _resetPanels() {
        this.statePanel.reset();
        this.consolePanel.clear();
        this.codeHighlighter.clear();
        this.complexityPanel.reset();
        if (this.localVarsPanel) this.localVarsPanel.clear();
    }

    _shouldHighlightCode(codeLine) {
        const trimmed = String(codeLine || '').trim();
        if (!trimmed) return false;
        return !['start', 'end', 'Isolado'].includes(trimmed);
    }

    _codeForStep(step) {
        const raw = String(step?.codeLine || '');
        if (!raw.trim()) return '';
        if (raw.includes('<---')) return raw;

        const matcherByType = {
            CREATE_NODE: /new\s+Node/,
            SET_PREV: /\.previous\s*=/,
            SET_NEXT: /\.next\s*=/,
            SET_HEAD: /\bhead\s*=/,
            SET_TAIL: /\btail\s*=/,
            UPDATE_SIZE: /\bsize\s*(\+\+|--|=)/,
            REMOVE_PREV: /previous\s*=\s*null/,
            TRAVERSE_START: /node\s*=\s*head/,
            TRAVERSE_STEP: /node\s*=\s*node\.next/,
            TRAVERSE_COMPARE: /(equals\(value\)|==\s*value)/,
            TRAVERSE_END: /(return\s+node\.value|return\s+array\[index\])/, 
            UNLINK_START: /unlink\(node\)/,
            ARRAY_DIRECT_ACCESS: /return\s+array\[index\]/,
            ARRAY_INSERT: /array\[index\]\s*=/,
            ARRAY_SHIFT_RIGHT: /array\[i\]\s*=\s*array\[i\s*-\s*1\]/,
            ARRAY_SHIFT_LEFT: /array\[i\]\s*=\s*array\[i\s*\+\s*1\]/,
            ARRAY_REMOVE_START: /(removed\s*=\s*array\[index\]|remove\(int\s+index\))/, 
            ARRAY_REMOVE_END: /size--/,
            ARRAY_RESIZE_START: /newArray\s*=\s*\(T\[\]\)\s*new\s+Object\[capacity\s*\*\s*2\]/,
            ARRAY_RESIZE_COPY: /newArray\[i\]\s*=\s*array\[i\]/,
            ARRAY_RESIZE_END: /array\s*=\s*newArray/,
            ARRAY_CLEAR: /clear\(\)/,
        };

        const matcher = matcherByType[step?.type];
        if (!matcher) return raw;

        const lines = raw.split('\n');
        const targetIndex = lines.findIndex((line) => matcher.test(line));
        if (targetIndex < 0) return raw;

        lines[targetIndex] = `${lines[targetIndex]} // <---`;
        return lines.join('\n');
    }

    _syncNodePointers(sourceId, previousId, nextId) {
        const sourceEntry = this.nodeRenderer.nodes.get(sourceId);
        if (!sourceEntry) return;

        sourceEntry.data.previous = previousId ? this.nodeRenderer.nodes.get(previousId)?.data || null : null;
        sourceEntry.data.next = nextId ? this.nodeRenderer.nodes.get(nextId)?.data || null : null;

        this.nodeRenderer.updatePointers(
            sourceId,
            sourceEntry.data.previous ? sourceEntry.data.previous.memoryAddress : null,
            sourceEntry.data.next ? sourceEntry.data.next.memoryAddress : null
        );
    }

    _updateFocusNode(step) {
        const data = step.data || {};
        const focusId = data.target || data.source || (data.node ? data.node.id : null);
        if (!focusId) return;
        const entry = this.nodeRenderer.nodes.get(focusId);
        if (entry) this.statePanel.updateNodeDetails(entry.data);
    }

    _resolveNodeLabel(nodeId) {
        if (!nodeId) return 'null';
        const entry = this.nodeRenderer.nodes.get(nodeId);
        if (!entry || !entry.data) return `${nodeId} (id interno do no)`;
        const rawIndex = Number(String(nodeId).split('_')[1]);
        const order = Number.isFinite(rawIndex) ? rawIndex + 1 : null;
        const ordinal = order ? `${order}o no` : 'no';
        return `${nodeId} (${ordinal}, valor=${entry.data.value}, end=${entry.data.memoryAddress})`;
    }

    _actionTextForStep(step) {
        const data = step?.data || {};
        switch (step?.type) {
            case 'CREATE_NODE':
                if (!data.node) return '';
                return `Criacao: ${data.node.id} (1 no visual: valor=${data.node.value}, end=${data.node.memoryAddress}). Dica: node_x e um id interno do visualizador.`;
            case 'SET_NEXT':
                return `Atribuicao: ${this._resolveNodeLabel(data.source)}.next <- ${this._resolveNodeLabel(data.target)}`;
            case 'SET_PREV':
                return `Atribuicao: ${this._resolveNodeLabel(data.source)}.previous <- ${this._resolveNodeLabel(data.target)}`;
            case 'REMOVE_PREV':
                return `Atribuicao: ${this._resolveNodeLabel(data.source)}.previous <- null`;
            case 'SET_HEAD':
                return `Atribuicao: head <- ${this._resolveNodeLabel(data.target)}`;
            case 'SET_TAIL':
                return `Atribuicao: tail <- ${this._resolveNodeLabel(data.target)}`;
            case 'UPDATE_SIZE':
                return `Atribuicao: size <- ${data.size}`;
            default:
                return '';
        }
    }

    _dispatch(step, isFast) {
        if (step.description && !isFast) {
            this.consolePanel.log(step.description);
        }

        const codeToHighlight = this._codeForStep(step);
        if (!isFast && this._shouldHighlightCode(codeToHighlight)) {
            this.codeHighlighter.highlight(codeToHighlight);
        }

        const action = document.getElementById('currentStepAction');
        if (action && !isFast) {
            const explicitAction = this._actionTextForStep(step);
            let baseText = explicitAction;
            if (!baseText) {
                if (step.type === 'INFO' && step.description) {
                    baseText = step.description.replace(/<[^>]+>/g, '');
                } else {
                    baseText = this.codeHighlighter.lastActiveLineText || (step.description || '').replace(/<[^>]+>/g, '');
                }
            }
            const cloudNote = typeof step.data?.cloud === 'string' && step.data.cloud.trim()
                ? ` Nuvem: ${step.data.cloud.trim()}`
                : '';
            action.textContent = `${baseText}${cloudNote}`.trim();
        }

        if (!isFast) {
            this._updateFocusNode(step);
            if (this.localVarsPanel) this.localVarsPanel.update(step, this.statePanel.getState());
        }

        // Handle visual state
        switch (step.type) {
            case 'INFO':
                // Just log (already done)
                break;
            case 'ERROR':
                this.consolePanel.log(step.data.msg);
                break;
            case 'CREATE_NODE':
                this.nodeRenderer.addNode(step.data.node);
                if (!isFast) {
                    const el = this.nodeRenderer.getNodeElement(step.data.node.id);
                    const memEl = this.nodeRenderer.getMemoryNodeElement(step.data.node.id);
                    if (el) {
                        el.classList.remove('flash-green');
                        void el.offsetWidth; // trigger reflow
                        el.classList.add('flash-green');
                    }
                    if (memEl) {
                        memEl.classList.remove('flash-green');
                        void memEl.offsetWidth; // trigger reflow
                        memEl.classList.add('flash-green');
                    }
                }
                break;
            case 'SET_NEXT':
                this._syncNodePointers(
                    step.data.source,
                    this.nodeRenderer.nodes.get(step.data.source)?.data?.previous?.id || null,
                    step.data.target
                );
                this.pointerRenderers.forEach((p) => p.updatePointer(step.data.source, 'next', step.data.target));
                if (!isFast) this.nodeRenderer.highlightNode(step.data.source, true);
                break;
            case 'SET_PREV':
                this._syncNodePointers(
                    step.data.source,
                    step.data.target,
                    this.nodeRenderer.nodes.get(step.data.source)?.data?.next?.id || null
                );
                this.pointerRenderers.forEach((p) => p.updatePointer(step.data.source, 'previous', step.data.target));
                if (!isFast) this.nodeRenderer.highlightNode(step.data.source, true);
                break;
            case 'SET_HEAD':
                this.nodeRenderer.setHead(step.data.target);
                this.statePanel.updateProp('head', step.data.target);
                if (!isFast) this.nodeRenderer.highlightNode(step.data.target);
                break;
            case 'SET_TAIL':
                this.nodeRenderer.setTail(step.data.target);
                this.statePanel.updateProp('tail', step.data.target);
                if (!isFast) this.nodeRenderer.highlightNode(step.data.target);
                break;
            case 'UPDATE_SIZE':
                this.statePanel.updateProp('size', step.data.size);
                break;
            case 'COMPLEXITY':
                this.complexityPanel.show(step.data.value, step.data.desc);
                break;
            case 'ISOLATE_NODE':
                if (!isFast) {
                    const el = this.nodeRenderer.getNodeElement(step.data.target);
                    if (el) {
                        el.classList.remove('flash-red');
                        void el.offsetWidth;
                        el.classList.add('flash-red');
                    }
                }
                this.nodeRenderer.isolateNode(step.data.target);
                this.pointerRenderers.forEach((p) => p.removePointersFrom(step.data.target));
                break;
            case 'ISOLATE_ALL':
                this.nodeRenderer.isolateAll();
                this.pointerRenderers.forEach((p) => p.clear());
                break;
            case 'TRAVERSE_START':
                this.nodeRenderer.highlightNode(step.data.target);
                break;
            case 'TRAVERSE_STEP':
                this.nodeRenderer.highlightNode(step.data.target);
                break;
            case 'TRAVERSE_COMPARE':
                this.nodeRenderer.highlightNode(step.data.target, true); // true = emphasis
                break;
            case 'TRAVERSE_END':
                this.nodeRenderer.highlightNode(step.data.target, true);
                break;
            case 'REMOVE_PREV':
                // A logic step specifically for removing prev pointer without a specific target (target is null)
                this._syncNodePointers(
                    step.data.source,
                    null,
                    this.nodeRenderer.nodes.get(step.data.source)?.data?.next?.id || null
                );
                this.pointerRenderers.forEach((p) => p.updatePointer(step.data.source, 'previous', null));
                break;
            case 'UNLINK_START':
                this.nodeRenderer.highlightNode(step.data.target, true);
                break;
        }
        
        if (!isFast) {
            this.pointerRenderers.forEach((p) => p.redraw()); // ensure arrows are updated
        }
    }
}

