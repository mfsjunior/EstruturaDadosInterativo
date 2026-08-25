class ArrayStepExecutor {
    constructor(arrayRenderer, statePanel, codeHighlighter, consolePanel, complexityPanel) {
        this.arrayRenderer = arrayRenderer;
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
        this._resetPanels();
        if (this.arrayRenderer?.cells?.length) {
            this.arrayRenderer.cells.forEach((_, index) => this.arrayRenderer.clearValue(index));
        }
    }

    restoreSnapshot(snapshot) {
        this._resetPanels();
        if (!snapshot) return;

        this.arrayRenderer.init(snapshot.capacity, snapshot.baseAddress, snapshot.elementSize);
        snapshot.data.forEach((value, index) => {
            if (value !== undefined && value !== null) {
                this.arrayRenderer.updateValue(index, value);
            }
        });
        if (Array.isArray(snapshot.relationLabels)) {
            snapshot.relationLabels.forEach((label, index) => {
                const cell = this.arrayRenderer.cells?.[index];
                if (cell?.relationLabel) {
                    cell.relationLabel.textContent = label || '';
                }
            });
        }
        this.statePanel.updateProp('size', snapshot.size ?? 0);
        this.statePanel.updateProp('head', '-');
        this.statePanel.updateProp('tail', '-');
        if (this._isStackMode()) {
            const size = snapshot.size ?? 0;
            this.arrayRenderer.setStackTop(size > 0 ? size - 1 : -1);
        }
        if (this._isQueueMode()) {
            const size = snapshot.size ?? 0;
            const capacity = snapshot.capacity ?? this.arrayRenderer.cells.length;
            const rearIndex = size > 0 ? ((snapshot.rear ?? 0) - 1 + capacity) % capacity : -1;
            const frontIndex = size > 0 ? (snapshot.front ?? 0) : -1;
            this.arrayRenderer.setQueuePointers(frontIndex, rearIndex, size);
        }
    }

    _resetPanels() {
        this.statePanel.reset();
        this.consolePanel.clear();
        this.codeHighlighter.clear();
        this.complexityPanel.reset();
        if (this._isStackMode()) {
            this.arrayRenderer.setStackTop(-1);
        }
        if (this._isQueueMode()) {
            this.arrayRenderer.setQueuePointers(-1, -1, 0);
        }
        if (this.arrayRenderer?.clearFenwickHighlights) {
            this.arrayRenderer.clearFenwickHighlights();
        }
    }

    _isStackMode() {
        return Boolean(this.arrayRenderer?.container?.classList?.contains('stack-mode'));
    }

    _isQueueMode() {
        return Boolean(this.arrayRenderer?.container?.classList?.contains('queue-mode'));
    }

    _isFenwickStep(step) {
        return Boolean(step?.type && String(step.type).startsWith('FENWICK_'));
    }

    _isUnionFindStep(step) {
        return Boolean(step?.type && String(step.type).startsWith('UF_'));
    }

    _setFenwickFocus(step) {
        if (!step?.data || !Number.isInteger(step.data.index)) return;
        const idx = step.data.index;
        const baseAddress = this.arrayRenderer.baseAddress ?? 0x7000;
        const elementSize = this.arrayRenderer.elementSize ?? 4;
        const address = `0x${(baseAddress + (idx * elementSize)).toString(16).toUpperCase()}`;
        const coverage = step.data.coverage || '-';
        const nextIndex = Number.isInteger(step.data.nextIndex)
            ? (step.data.nextIndex > 0 ? `idx ${step.data.nextIndex}` : 'fim')
            : '-';

        this.statePanel.updateNodeDetails({
            id: `idx ${idx}`,
            memoryAddress: address,
            value: Object.prototype.hasOwnProperty.call(step.data, 'value') ? step.data.value : '-',
            previous: { memoryAddress: coverage },
            next: { memoryAddress: nextIndex },
        });
    }

    _syncStackTop(step) {
        if (!this._isStackMode()) return;
        if (!step) return;

        if (step.type === 'ARRAY_CLEAR') {
            this.arrayRenderer.setStackTop(-1);
            return;
        }

        if (step.type === 'ARRAY_INSERT' && step.data && Object.prototype.hasOwnProperty.call(step.data, 'size')) {
            const size = Number(step.data.size) || 0;
            this.arrayRenderer.setStackTop(size > 0 ? size - 1 : -1);
            return;
        }

        if (step.type === 'ARRAY_REMOVE_END' && step.data && Object.prototype.hasOwnProperty.call(step.data, 'size')) {
            const size = Number(step.data.size) || 0;
            this.arrayRenderer.setStackTop(size > 0 ? size - 1 : -1);
            return;
        }

        if (step.type === 'UPDATE_STATE' && step.data && typeof step.data.tail === 'string') {
            const match = step.data.tail.match(/top@(\d+)/);
            this.arrayRenderer.setStackTop(match ? Number(match[1]) : -1);
        }
    }

    _syncQueuePointers(step) {
        if (!this._isQueueMode()) return;
        if (!step) return;

        if (step.type === 'ARRAY_CLEAR') {
            this.arrayRenderer.setQueuePointers(-1, -1, 0);
            return;
        }

        if (step.type === 'UPDATE_STATE' && step.data) {
            const size = Number(step.data.size) || 0;
            const headMatch = typeof step.data.head === 'string' ? step.data.head.match(/front@(\d+)/) : null;
            const tailMatch = typeof step.data.tail === 'string' ? step.data.tail.match(/rear@(\d+)/) : null;
            const frontIndex = size > 0 && headMatch ? Number(headMatch[1]) : -1;
            const rearIndex = size > 0 && tailMatch ? Number(tailMatch[1]) : -1;
            this.arrayRenderer.setQueuePointers(frontIndex, rearIndex, size);
            return;
        }

        if (step.type === 'ARRAY_INSERT' && step.data && Object.prototype.hasOwnProperty.call(step.data, 'size')) {
            const size = Number(step.data.size) || 0;
            const insertedIndex = Number(step.data.index);
            const nextFront = size === 1 ? insertedIndex : this.arrayRenderer.activeFrontIndex;
            this.arrayRenderer.setQueuePointers(nextFront, insertedIndex, size);
            return;
        }

        if (step.type === 'ARRAY_REMOVE_END' && step.data && Object.prototype.hasOwnProperty.call(step.data, 'size')) {
            const size = Number(step.data.size) || 0;
            if (size <= 0) {
                this.arrayRenderer.setQueuePointers(-1, -1, 0);
                return;
            }
            const capacity = this.arrayRenderer.cells.length || 1;
            const baseFront = this.arrayRenderer.activeFrontIndex >= 0 ? this.arrayRenderer.activeFrontIndex : 0;
            const nextFront = (baseFront + 1) % capacity;
            this.arrayRenderer.setQueuePointers(nextFront, this.arrayRenderer.activeRearIndex, size);
        }
    }

    _codeForStep(step) {
        const raw = String(step?.codeLine || '');
        if (!raw.trim()) return '';
        if (raw.includes('<---')) return raw;

        const matcherByType = {
            ARRAY_DIRECT_ACCESS: /(return\s+array\[|T\s+value\s*=\s*array\[front\])/,
            ARRAY_INSERT: /array\[[^\]]+\]\s*=\s*[^;]+;/,
            ARRAY_SHIFT_RIGHT: /array\[i\]\s*=\s*array\[i\s*-\s*1\]/,
            ARRAY_SHIFT_LEFT: /array\[i\]\s*=\s*array\[i\s*\+\s*1\]/,
            ARRAY_REMOVE_START: /(removed\s*=\s*array\[|T\s+removed\s*=\s*array\[size\s*-\s*1\])/, 
            ARRAY_REMOVE_END: /(size--|array\[size\s*-\s*1\]\s*=\s*null|array\[front\]\s*=\s*null)/,
            ARRAY_RESIZE_START: /new\s+Object\[capacity\s*\*\s*2\]/,
            ARRAY_RESIZE_COPY: /newArray\[i\]\s*=\s*array\[i\]/,
            ARRAY_RESIZE_END: /array\s*=\s*newArray/,
            ARRAY_CLEAR: /clear\(\)/,
            FENWICK_CLEAR: /clear|build/,
            FENWICK_SET: /bit\[i\]\s*\+=|bit\[/,
            FENWICK_VISIT: /for\s*\(int\s+i\s*=\s*idx/,
            FENWICK_RESULT: /(return\s+sum|prefix\()/,
            UF_INIT: /parent\[i\]\s*=\s*i/,
            UF_VISIT: /while\s*\(x\s*!=\s*parent\[x\]\)/,
            UF_COMPRESS: /parent\[v\]\s*=\s*root/,
            UF_UNION: /parent\[ry\]\s*=\s*rx/,
            UF_RESULT: /return\s+find\(a\)\s*==\s*find\(b\)|return\s+root/,
            GRAPH_INIT: /adj\s*=\s*new\s+ArrayList\[n\]/,
            GRAPH_ADD_EDGE: /adj\[u\]\.add\(v\)/,
            GRAPH_VISIT: /visit\(node\)/,
            GRAPH_ENQUEUE: /queue\.add\(start\)|stack\.push\(start\)|queue\.add\(next\)|stack\.push\(next\)/,
            GRAPH_DEQUEUE: /queue\.poll\(\)|stack\.pop\(\)/,
            GRAPH_RESULT: /return\s+order/,
            UPDATE_STATE: /(size\+\+|size--|rear\s*=|front\s*=)/,
        };

        const matcher = matcherByType[step?.type];
        if (!matcher) return raw;

        const targetIndex = lines.findIndex((line) => matcher.test(line));
        if (targetIndex < 0) return raw;

        lines[targetIndex] = `${lines[targetIndex]} // <---`;
        return lines.join('\n');
    }

    _dispatch(step, isFast) {
        if (!step) return;

        const codeToHighlight = this._codeForStep(step);
        if (codeToHighlight && !isFast) {
            this.codeHighlighter.highlight(codeToHighlight);
        }

        if (step.description && !isFast) {
            this.consolePanel.log(step.description);
        }

        const action = document.getElementById('currentStepAction');
        const timelineAction = document.getElementById('timelineActionText');
        
        if (!isFast) {
            const baseText = this.codeHighlighter.lastActiveLineText || (step.description || '').replace(/<[^>]+>/g, '');
            
            if (action) {
                const cloudNote = typeof step.data?.cloud === 'string' && step.data.cloud.trim()
                    ? ` Nuvem: ${step.data.cloud.trim()}`
                    : '';
                action.textContent = `${baseText}${cloudNote}`.trim();
            }
            
            if (timelineAction) {
                timelineAction.textContent = baseText;
                if (step.data?.isSuccess || String(baseText).match(/(encontrado no (indice|índice)|peek no topo|pop removeu)/i)) {
                    timelineAction.classList.add('highlight-success');
                } else {
                    timelineAction.classList.remove('highlight-success');
                }
            }
        }

        if (this._isFenwickStep(step)) {
            const nextIndex = Number.isInteger(step.data?.nextIndex) && step.data.nextIndex > 0
                ? step.data.nextIndex
                : -1;
            this.arrayRenderer.setFenwickHighlights({
                activeIndex: Number.isInteger(step.data?.index) ? step.data.index : -1,
                nextIndex,
            });
            this._setFenwickFocus(step);
        } else if (this._isUnionFindStep(step)) {
            const activeIndex = Number.isInteger(step.data?.index)
                ? step.data.index
                : (Number.isInteger(step.data?.childRoot) ? step.data.childRoot : -1);
            const nextIndex = Number.isInteger(step.data?.parent)
                ? step.data.parent
                : (Number.isInteger(step.data?.parentRoot) ? step.data.parentRoot : -1);
            this.arrayRenderer.setFenwickHighlights({ activeIndex, nextIndex });
        } else {
            this.arrayRenderer.clearFenwickHighlights();
        }

        switch (step.type) {
            case 'INFO':
                break;
            case 'ERROR':
                this.consolePanel.log('ERRO: ' + step.description);
                break;
            case 'ARRAY_DIRECT_ACCESS':
                this.arrayRenderer.highlight(step.data.index, step.data.isSuccess ? 'highlight-warning' : 'highlight-blue');
                this.complexityPanel.show('O(1)', 'Acesso direto por \u00edndice \u2014 tempo constante.');
                break;
            case 'ARRAY_INSERT':
                this.arrayRenderer.updateValue(step.data.index, step.data.value);
                this.statePanel.updateProp('size', step.data.size);
                break;
            case 'ARRAY_SHIFT_RIGHT':
                this.arrayRenderer.shiftValue(step.data.from, step.data.to, step.data.value);
                this.complexityPanel.show('O(n)', 'Deslocamento de elementos \u2014 tempo linear.');
                break;
            case 'ARRAY_REMOVE_START':
                this.arrayRenderer.clearValue(step.data.index);
                break;
            case 'ARRAY_SHIFT_LEFT':
                this.arrayRenderer.shiftValue(step.data.from, step.data.to, step.data.value);
                this.complexityPanel.show('O(n)', 'Deslocamento de elementos \u2014 tempo linear.');
                break;
            case 'ARRAY_REMOVE_END':
                this.arrayRenderer.clearValue(step.data.index);
                this.statePanel.updateProp('size', step.data.size);
                break;
            case 'ARRAY_RESIZE_START':
                this.arrayRenderer.init(step.data.newCapacity, step.data.newBaseAddress, 4);
                this.complexityPanel.show('O(n)', 'C\u00f3pia para novo array \u2014 tempo linear.');
                break;
            case 'ARRAY_RESIZE_COPY':
                this.arrayRenderer.updateValue(step.data.index, step.data.value);
                break;
            case 'ARRAY_RESIZE_END':
                break;
            case 'ARRAY_CLEAR':
                this.arrayRenderer.init(
                    step.data.capacity,
                    step.data.baseAddress ?? this.arrayRenderer.baseAddress ?? 0x1000,
                    step.data.elementSize ?? this.arrayRenderer.elementSize ?? 4
                );
                this.statePanel.updateProp('size', 0);
                break;
            case 'SEGMENT_CLEAR':
                this.arrayRenderer.init(
                    step.data.capacity,
                    step.data.baseAddress ?? this.arrayRenderer.baseAddress ?? 0x1000,
                    step.data.elementSize ?? this.arrayRenderer.elementSize ?? 4
                );
                this.statePanel.updateProp('size', step.data.size ?? 0);
                break;
            case 'SEGMENT_SET':
                this.arrayRenderer.updateValue(step.data.index, step.data.value);
                if (this.arrayRenderer.cells?.[step.data.index]?.relationLabel) {
                    this.arrayRenderer.cells[step.data.index].relationLabel.textContent = step.data.intervalLabel || '';
                }
                if (Object.prototype.hasOwnProperty.call(step.data, 'size')) {
                    this.statePanel.updateProp('size', step.data.size);
                }
                break;
            case 'SEGMENT_VISIT':
                if (Number.isInteger(step.data.index)) {
                    this.arrayRenderer.highlight(step.data.index, step.data.isMatch ? 'flash-green' : 'highlight-blue');
                }
                break;
            case 'FENWICK_CLEAR':
                this.arrayRenderer.init(
                    step.data.capacity,
                    step.data.baseAddress ?? this.arrayRenderer.baseAddress ?? 0x7000,
                    step.data.elementSize ?? this.arrayRenderer.elementSize ?? 4
                );
                if (Array.isArray(step.data.data)) {
                    step.data.data.forEach((value, index) => {
                        this.arrayRenderer.updateValue(index, value);
                    });
                }
                if (Array.isArray(step.data.relationLabels)) {
                    step.data.relationLabels.forEach((label, index) => {
                        const cell = this.arrayRenderer.cells?.[index];
                        if (cell?.relationLabel) cell.relationLabel.textContent = label || '';
                    });
                }
                this.statePanel.updateProp('size', step.data.size ?? 0);
                break;
            case 'FENWICK_VISIT':
                if (Number.isInteger(step.data.index)) {
                    this.arrayRenderer.highlight(step.data.index, 'highlight-blue');
                }
                break;
            case 'FENWICK_SET':
                if (Number.isInteger(step.data.index)) {
                    this.arrayRenderer.updateValue(step.data.index, step.data.value);
                    this.arrayRenderer.highlight(step.data.index, 'flash-green');
                }
                if (Object.prototype.hasOwnProperty.call(step.data, 'size')) {
                    this.statePanel.updateProp('size', step.data.size);
                }
                break;
            case 'FENWICK_RESULT':
                if (Number.isInteger(step.data.index)) {
                    this.arrayRenderer.highlight(step.data.index, 'flash-green');
                }
                break;
            case 'UF_INIT':
                this.arrayRenderer.init(
                    step.data.capacity,
                    step.data.baseAddress ?? this.arrayRenderer.baseAddress ?? 0x8000,
                    step.data.elementSize ?? this.arrayRenderer.elementSize ?? 4
                );
                if (Array.isArray(step.data.data)) {
                    step.data.data.forEach((value, index) => {
                        this.arrayRenderer.updateValue(index, value);
                    });
                }
                if (Array.isArray(step.data.relationLabels)) {
                    step.data.relationLabels.forEach((label, index) => {
                        const cell = this.arrayRenderer.cells?.[index];
                        if (cell?.relationLabel) cell.relationLabel.textContent = label || '';
                    });
                }
                this.statePanel.updateProp('size', step.data.size ?? 0);
                break;
            case 'UF_VISIT':
                if (Number.isInteger(step.data.index)) {
                    this.arrayRenderer.highlight(step.data.index, step.data.isRoot ? 'flash-green' : 'highlight-blue');
                    this.statePanel.updateNodeDetails({
                        id: `no ${step.data.index}`,
                        memoryAddress: `0x${((this.arrayRenderer.baseAddress ?? 0x8000) + (step.data.index * (this.arrayRenderer.elementSize ?? 4))).toString(16).toUpperCase()}`,
                        value: step.data.parent,
                        previous: { memoryAddress: 'pai atual' },
                        next: { memoryAddress: step.data.isRoot ? 'raiz' : `pai ${step.data.parent}` },
                    });
                }
                break;
            case 'UF_COMPRESS':
                if (Number.isInteger(step.data.index)) {
                    if (step.data.snapshot && Array.isArray(step.data.snapshot.data)) {
                        step.data.snapshot.data.forEach((value, index) => this.arrayRenderer.updateValue(index, value));
                    }
                    if (step.data.snapshot && Array.isArray(step.data.snapshot.relationLabels)) {
                        step.data.snapshot.relationLabels.forEach((label, index) => {
                            const cell = this.arrayRenderer.cells?.[index];
                            if (cell?.relationLabel) cell.relationLabel.textContent = label || '';
                        });
                    }
                    this.arrayRenderer.highlight(step.data.index, 'flash-yellow');
                }
                break;
            case 'UF_UNION':
                if (step.data.snapshot && Array.isArray(step.data.snapshot.data)) {
                    step.data.snapshot.data.forEach((value, index) => this.arrayRenderer.updateValue(index, value));
                }
                if (step.data.snapshot && Array.isArray(step.data.snapshot.relationLabels)) {
                    step.data.snapshot.relationLabels.forEach((label, index) => {
                        const cell = this.arrayRenderer.cells?.[index];
                        if (cell?.relationLabel) cell.relationLabel.textContent = label || '';
                    });
                }
                if (Number.isInteger(step.data.parentRoot)) this.arrayRenderer.highlight(step.data.parentRoot, 'flash-green');
                if (Number.isInteger(step.data.childRoot)) this.arrayRenderer.highlight(step.data.childRoot, 'highlight-blue');
                break;
            case 'UF_RESULT':
                if (Number.isInteger(step.data.rootX)) this.arrayRenderer.highlight(step.data.rootX, 'flash-green');
                if (Number.isInteger(step.data.rootY)) this.arrayRenderer.highlight(step.data.rootY, 'highlight-blue');
                if (Number.isInteger(step.data.root) && !Number.isInteger(step.data.rootX)) this.arrayRenderer.highlight(step.data.root, 'flash-green');
                break;
            case 'GRAPH_INIT':
                this.arrayRenderer.init(
                    step.data.capacity,
                    step.data.baseAddress ?? this.arrayRenderer.baseAddress ?? 0x9000,
                    step.data.elementSize ?? this.arrayRenderer.elementSize ?? 4
                );
                if (Array.isArray(step.data.data)) {
                    step.data.data.forEach((value, index) => this.arrayRenderer.updateValue(index, value));
                }
                if (Array.isArray(step.data.relationLabels)) {
                    step.data.relationLabels.forEach((label, index) => {
                        const cell = this.arrayRenderer.cells?.[index];
                        if (cell?.relationLabel) cell.relationLabel.textContent = label || '';
                    });
                }
                this.statePanel.updateProp('size', step.data.size ?? 0);
                break;
            case 'GRAPH_ADD_EDGE':
                if (step.data.snapshot && Array.isArray(step.data.snapshot.relationLabels)) {
                    step.data.snapshot.relationLabels.forEach((label, index) => {
                        const cell = this.arrayRenderer.cells?.[index];
                        if (cell?.relationLabel) cell.relationLabel.textContent = label || '';
                    });
                }
                if (Number.isInteger(step.data.u)) this.arrayRenderer.highlight(step.data.u, 'highlight-blue');
                if (Number.isInteger(step.data.v)) this.arrayRenderer.highlight(step.data.v, 'flash-green');
                break;
            case 'GRAPH_VISIT':
                if (Number.isInteger(step.data.node)) {
                    this.arrayRenderer.highlight(step.data.node, 'flash-green');
                    this.statePanel.updateNodeDetails({
                        id: `v${step.data.node}`,
                        memoryAddress: `0x${((this.arrayRenderer.baseAddress ?? 0x9000) + (step.data.node * (this.arrayRenderer.elementSize ?? 4))).toString(16).toUpperCase()}`,
                        value: step.data.node,
                        previous: { memoryAddress: 'visitado' },
                        next: { memoryAddress: Array.isArray(step.data.order) ? `ordem: ${step.data.order.join('->')}` : '-' },
                    });
                }
                break;
            case 'GRAPH_ENQUEUE':
                if (Number.isInteger(step.data.node)) {
                    this.arrayRenderer.highlight(step.data.node, 'highlight-blue');
                }
                break;
            case 'GRAPH_DEQUEUE':
                if (Number.isInteger(step.data.node)) {
                    this.arrayRenderer.highlight(step.data.node, 'flash-yellow');
                }
                break;
            case 'GRAPH_RESULT':
                if (Array.isArray(step.data.order)) {
                    const orderText = step.data.order.join(' -> ');
                    this.consolePanel.log(`Ordem final: ${orderText}`);
                }
                break;
            case 'UPDATE_STATE':
                if (step.data && Object.prototype.hasOwnProperty.call(step.data, 'head')) {
                    this.statePanel.updateProp('head', step.data.head);
                }
                if (step.data && Object.prototype.hasOwnProperty.call(step.data, 'tail')) {
                    this.statePanel.updateProp('tail', step.data.tail);
                }
                if (step.data && Object.prototype.hasOwnProperty.call(step.data, 'size')) {
                    this.statePanel.updateProp('size', step.data.size);
                }
                break;
        }

        this._syncStackTop(step);
        this._syncQueuePointers(step);
    }
}

