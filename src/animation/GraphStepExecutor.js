class GraphStepExecutor {
    constructor(graphRenderer, statePanel, codeHighlighter, consolePanel, complexityPanel) {
        this.graphRenderer = graphRenderer;
        this.statePanel = statePanel;
        this.codeHighlighter = codeHighlighter;
        this.consolePanel = consolePanel;
        this.complexityPanel = complexityPanel;
    }

    execute(step) {
        this._dispatch(step, false);
    }

    executeFast(step) {
        this._dispatch(step, true);
    }

    clear() {
        this.statePanel.reset();
        this.consolePanel.clear();
        this.codeHighlighter.clear();
        this.complexityPanel.reset();
        this.graphRenderer.clear();
    }

    restoreSnapshot(snapshot) {
        this.statePanel.reset();
        this.consolePanel.clear();
        this.codeHighlighter.clear();
        this.complexityPanel.reset();
        this.graphRenderer.initFromSnapshot(snapshot);
        this.statePanel.updateProp('size', snapshot?.size ?? 0);
        this.statePanel.updateProp('head', `vertices ${snapshot?.size ?? 0}`);
        this.statePanel.updateProp('tail', '-');
    }

    _matchByType(type) {
        return {
            GRAPH_INIT: /adj\s*=\s*new\s+ArrayList\[n\]/,
            GRAPH_ADD_EDGE: /adj\[u\]\.add\(v\)/,
            GRAPH_VISIT: /visit\(node\)/,
            GRAPH_ENQUEUE: /queue\.add\(start\)|stack\.push\(start\)|queue\.add\(next\)|stack\.push\(next\)/,
            GRAPH_DEQUEUE: /queue\.poll\(\)|stack\.pop\(\)/,
            GRAPH_BACKTRACK: /return;/,
            GRAPH_PATH: /parent\[cur\]|return\s+path/,
            GRAPH_RESULT: /return\s+order|return\s+path|return\s+empty/,
        }[type] || null;
    }

    _highlightCode(step) {
        const raw = String(step?.codeLine || '');
        if (!raw.trim()) return;
        const matcher = this._matchByType(step?.type);
        if (!matcher) {
            this.codeHighlighter.highlight(raw);
            return;
        }

        const lines = raw.split('\n');
        const idx = lines.findIndex((line) => matcher.test(line));
        if (idx >= 0) lines[idx] = `${lines[idx]} // <---`;
        this.codeHighlighter.highlight(lines.join('\n'));
    }

    _dispatch(step, isFast) {
        if (!step) return;

        if (!isFast) {
            if (step.description) this.consolePanel.log(step.description);
            this._highlightCode(step);

            const action = document.getElementById('currentStepAction');
            if (action) {
                const text = this.codeHighlighter.lastActiveLineText || (step.description || '').replace(/<[^>]+>/g, '');
                const cloud = typeof step.data?.cloud === 'string' && step.data.cloud.trim()
                    ? ` Nuvem: ${step.data.cloud.trim()}`
                    : '';
                action.textContent = `${text}${cloud}`.trim();
            }
        }

        switch (step.type) {
            case 'GRAPH_INIT':
                this.graphRenderer.initFromSnapshot(step.data);
                this.statePanel.updateProp('size', step.data.size ?? 0);
                break;
            case 'GRAPH_ADD_EDGE':
                if (step.data.snapshot) this.graphRenderer.updateFromSnapshot(step.data.snapshot);
                this.graphRenderer.clearHighlights();
                this.graphRenderer.highlightNode(step.data.u, 'queued');
                this.graphRenderer.highlightNode(step.data.v, 'queued');
                this.graphRenderer.highlightEdge(step.data.u, step.data.v);
                break;
            case 'GRAPH_ENQUEUE':
                if (Number.isInteger(step.data.level)) {
                    this.graphRenderer.setNodeLevel(step.data.node, step.data.level);
                }
                this.graphRenderer.highlightNode(step.data.node, 'queued');
                if (Number.isInteger(step.data.from)) this.graphRenderer.highlightEdge(step.data.from, step.data.node);
                break;
            case 'GRAPH_DEQUEUE':
                this.graphRenderer.clearHighlights();
                if (Number.isInteger(step.data.level)) {
                    this.graphRenderer.setNodeLevel(step.data.node, step.data.level);
                }
                this.graphRenderer.highlightNode(step.data.node, 'active');
                break;
            case 'GRAPH_VISIT':
                this.graphRenderer.markVisited(step.data.node);
                if (step.data.traversal === 'BFS' || step.data.traversal === 'SP') {
                    this.graphRenderer.setNodeLevel(step.data.node, step.data.level || 0);
                    this.graphRenderer.highlightNode(step.data.node, 'wave');
                }
                this.graphRenderer.highlightNode(step.data.node, 'active');
                if (Number.isInteger(step.data.parent)) {
                    this.graphRenderer.highlightEdge(step.data.parent, step.data.node);
                }
                this.statePanel.updateNodeDetails({
                    id: `v${step.data.node}`,
                    memoryAddress: '-',
                    value: step.data.node,
                    previous: { memoryAddress: 'visitado' },
                    next: { memoryAddress: Array.isArray(step.data.order) ? step.data.order.join('->') : '-' },
                });
                break;
            case 'GRAPH_PATH':
                this.graphRenderer.clearHighlights();
                this.graphRenderer.highlightNode(step.data.from, 'path');
                this.graphRenderer.highlightNode(step.data.to, 'path');
                this.graphRenderer.highlightEdge(step.data.from, step.data.to, 'path');
                this.consolePanel.log(`Trecho do caminho: ${step.data.from} -> ${step.data.to}`);
                break;
            case 'GRAPH_BACKTRACK':
                this.graphRenderer.clearHighlights();
                this.graphRenderer.highlightNode(step.data.node, 'backtrack');
                if (Number.isInteger(step.data.parent)) {
                    this.graphRenderer.highlightEdge(step.data.node, step.data.parent, 'backtrack');
                }
                break;
            case 'GRAPH_RESULT':
                if (Array.isArray(step.data.path)) {
                    if (step.data.path.length) {
                        this.consolePanel.log(`Menor caminho: ${step.data.path.join(' -> ')} | distancia = ${step.data.distance}`);
                    } else {
                        this.consolePanel.log(`Sem caminho entre ${step.data.start} e ${step.data.target}.`);
                    }
                }
                if (Array.isArray(step.data.order)) {
                    this.consolePanel.log(`Ordem final: ${step.data.order.join(' -> ')}`);
                }
                break;
            case 'UPDATE_STATE':
                if (Object.prototype.hasOwnProperty.call(step.data || {}, 'head')) this.statePanel.updateProp('head', step.data.head);
                if (Object.prototype.hasOwnProperty.call(step.data || {}, 'tail')) this.statePanel.updateProp('tail', step.data.tail);
                if (Object.prototype.hasOwnProperty.call(step.data || {}, 'size')) this.statePanel.updateProp('size', step.data.size);
                break;
            case 'COMPLEXITY':
                this.complexityPanel.show(step.data?.value || 'O(?)', step.data?.desc || step.description || 'Complexidade atualizada.');
                break;
            case 'ERROR':
                this.consolePanel.log(`ERRO: ${step.description || ''}`);
                break;
            default:
                break;
        }
    }
}