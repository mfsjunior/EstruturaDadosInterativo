class AlgorithmDebugPanel {
    constructor(appManager) {
        this.appManager = appManager;
        this.root = document.getElementById('algorithmDebugCard');
        this.treeHostId = 'debugTreePreview';
        this.treeRenderer = new BSTRenderer(this.treeHostId);
        this.arrayRenderer = new ArrayRenderer(this.treeHostId);
        this.previewMode = 'tree';
        this.engine = null;
        this.events = [];
        this.lastEvent = null;

        this.el = {
            modeLabel: document.getElementById('debugModeLabel'),
            operation: document.getElementById('debugOperationText'),
            step: document.getElementById('debugStepText'),
            currentNode: document.getElementById('debugCurrentNodeBody'),
            variables: document.getElementById('debugVarsBody'),
            aux: document.getElementById('debugAuxBody'),
            result: document.getElementById('debugResultBody'),
            why: document.getElementById('debugWhyText'),
            event: document.getElementById('debugEventText'),
            code: document.getElementById('debugCodeView'),
            timeline: document.getElementById('debugTimelineTrack'),
            leftPaneToggle: document.getElementById('debugToggleLeftPane'),
            professorToggle: document.getElementById('debugProfessorToggle'),
            metrics: document.getElementById('debugMetricsText'),
            btnPrev: document.getElementById('btnDebugPrev'),
            btnPlay: document.getElementById('btnDebugPlay'),
            btnNext: document.getElementById('btnDebugNext'),
            btnFinish: document.getElementById('btnDebugFinish'),
            btnReset: document.getElementById('btnDebugReset'),
            autoPause: document.getElementById('debugAutoPause'),
            speed: document.getElementById('debugSpeedSelect'),
            btnToggleArrayDetails: document.getElementById('btnDebugToggleArrayDetails'),
            quickOps: document.getElementById('debugQuickOps'),
            quickArrayValue: document.getElementById('debugArrayValue'),
            quickArrayIndex: document.getElementById('debugArrayIndex'),
            btnQuickInsert: document.getElementById('btnDebugArrayInsert'),
            btnQuickAppend: document.getElementById('btnDebugArrayAppend'),
            btnQuickGet: document.getElementById('btnDebugArrayGet'),
            btnQuickRemove: document.getElementById('btnDebugArrayRemove'),
        };

        this._bindStaticControls();
    }

    _bindStaticControls() {
        if (!this.root) return;
        if (this.el.professorToggle) {
            this.el.professorToggle.addEventListener('change', (event) => {
                this.root.classList.toggle('professor-off', !event.target.checked);
            });
        }

        if (this.el.leftPaneToggle) {
            this.el.leftPaneToggle.addEventListener('change', (event) => {
                this.root.classList.toggle('hide-left-pane', !event.target.checked);
            });
        }

        if (this.el.btnQuickInsert) this.el.btnQuickInsert.addEventListener('click', () => this._runQuickArrayOp('insert'));
        if (this.el.btnQuickAppend) this.el.btnQuickAppend.addEventListener('click', () => this._runQuickArrayOp('append'));
        if (this.el.btnQuickGet) this.el.btnQuickGet.addEventListener('click', () => this._runQuickArrayOp('get'));
        if (this.el.btnQuickRemove) this.el.btnQuickRemove.addEventListener('click', () => this._runQuickArrayOp('remove'));
        if (this.el.btnToggleArrayDetails) this.el.btnToggleArrayDetails.addEventListener('click', () => this._toggleArrayDetails());
    }

    setVisible(visible) {
        if (!this.root) return;
        this.root.classList.toggle('hidden', !visible);
    }

    _runQuickArrayOp(action) {
        if (this.appManager.activeModuleId !== 'Array') return;
        const module = this.appManager.activeModule;
        if (!module || typeof module.executeOperation !== 'function') return;

        const valueRaw = this.el.quickArrayValue ? this.el.quickArrayValue.value.trim() : '';
        const indexRaw = this.el.quickArrayIndex ? this.el.quickArrayIndex.value.trim() : '';
        const index = indexRaw === '' ? NaN : Number(indexRaw);
        const globals = this.appManager.getGlobals();

        if (action === 'insert') {
            if (valueRaw === '' || Number.isNaN(index)) {
                globals.consolePanel.log('Informe valor e indice para Insert no debug.', 'system');
                return;
            }
            module.executeOperation('add', [index, valueRaw]);
            return;
        }

        if (action === 'append') {
            if (valueRaw === '') {
                globals.consolePanel.log('Informe valor para Append no debug.', 'system');
                return;
            }
            module.executeOperation('addLast', [valueRaw]);
            return;
        }

        if (action === 'get') {
            if (Number.isNaN(index)) {
                globals.consolePanel.log('Informe indice para Get no debug.', 'system');
                return;
            }
            module.executeOperation('get', [index]);
            return;
        }

        if (action === 'remove') {
            if (Number.isNaN(index)) {
                globals.consolePanel.log('Informe indice para Remove no debug.', 'system');
                return;
            }
            module.executeOperation('remove', [index]);
        }
    }

    _syncQuickOpsVisibility(isArrayMode) {
        if (!this.el.quickOps) return;
        this.el.quickOps.classList.toggle('hidden', !isArrayMode);
        if (this.el.btnToggleArrayDetails) this.el.btnToggleArrayDetails.classList.toggle('hidden', !isArrayMode);
        if (this.root) {
            this.root.classList.toggle('array-debug-mode', !!isArrayMode);
            if (isArrayMode) {
                this.root.classList.add('array-debug-details-expanded');
            } else {
                this.root.classList.remove('array-debug-details-expanded');
            }
        }
        this._syncArrayDetailsToggleLabel();
    }

    _toggleArrayDetails() {
        if (!this.root || !this.root.classList.contains('array-debug-mode')) return;
        this.root.classList.toggle('array-debug-details-expanded');
        this._syncArrayDetailsToggleLabel();
    }

    _syncArrayDetailsToggleLabel() {
        if (!this.el.btnToggleArrayDetails || !this.root) return;
        const expanded = this.root.classList.contains('array-debug-details-expanded');
        this.el.btnToggleArrayDetails.textContent = expanded ? 'Ocultar detalhes' : 'Mostrar detalhes';
    }

    showIdleHint(moduleId) {
        if (!this.root) return;
        const mod = String(moduleId || '').toUpperCase();
        const arrayHint = mod === 'ARRAY';
        this._syncQuickOpsVisibility(arrayHint);

        if (this.el.modeLabel) {
            this.el.modeLabel.textContent = arrayHint ? 'ALGORITHM DEBUGGER | ARRAY' : 'ALGORITHM DEBUGGER';
        }
        if (this.el.operation) this.el.operation.textContent = '-';
        if (this.el.step) this.el.step.textContent = 'Step 0 / 0';
        if (this.el.event) {
            this.el.event.textContent = arrayHint
                ? 'Nenhum evento ainda. Use OPERACOES RAPIDAS (ARRAY) neste painel: Insert, Append, Remove ou Get.'
                : 'Nenhum evento ainda. Execute uma operacao no painel lateral para iniciar o debug.';
        }
        if (this.el.why) {
            this.el.why.textContent = arrayHint
                ? 'Aguardando eventos... Inicie com Insert/Append para popular o array e depois use Get/Remove.'
                : 'Aguardando eventos...';
        }
        if (this.el.code) {
            this.el.code.innerHTML = `<div class="code-line"><span class="code-line-marker"> </span><span class="code-line-number">-</span><span class="code-line-text">${arrayHint ? 'Use as operacoes rapidas deste painel para iniciar.' : 'Execute uma operacao no painel lateral para iniciar.'}</span></div>`;
        }
        if (this.el.currentNode) this.el.currentNode.innerHTML = '<div>-</div>';
        if (this.el.variables) this.el.variables.innerHTML = '<div>-</div>';
        if (this.el.aux) this.el.aux.innerHTML = '<div>-</div>';
        if (this.el.result) this.el.result.innerHTML = '<div>[]</div>';
        this._renderTimeline(0, 0);
    }

    bindEngine(engine) {
        this.engine = engine;
        if (!engine) return;

        engine.setAutoPauseEachEvent(!!this.el.autoPause?.checked);

        if (this.el.btnPrev) this.el.btnPrev.onclick = () => engine.previous();
        if (this.el.btnPlay) {
            this.el.btnPlay.onclick = () => {
                if (engine.isPlaying) {
                    engine.pause();
                    this.el.btnPlay.textContent = '? Play';
                } else {
                    engine.play();
                    this.el.btnPlay.textContent = '? Pause';
                }
            };
        }
        if (this.el.btnNext) this.el.btnNext.onclick = () => engine.next();
        if (this.el.btnFinish) this.el.btnFinish.onclick = () => engine.finish();
        if (this.el.btnReset) {
            this.el.btnReset.onclick = () => {
                engine.reset();
                if (this.el.btnPlay) this.el.btnPlay.textContent = '? Play';
            };
        }
        if (this.el.autoPause) {
            this.el.autoPause.onchange = (event) => {
                engine.setAutoPauseEachEvent(event.target.checked);
            };
        }
        if (this.el.speed) {
            this.el.speed.onchange = (event) => {
                engine.setSpeed(parseFloat(event.target.value));
            };
            engine.setSpeed(parseFloat(this.el.speed.value || '1'));
        }
    }

    startSession({ modeLabel, operationText, codeText, events } = {}) {
        this.events = Array.isArray(events) ? events : [];
        this.lastEvent = null;
        this.previewMode = String(modeLabel || '').includes('ARRAY') ? 'array' : (String(modeLabel || '').includes('LINKED') ? 'linked_list' : 'tree');
        this._syncQuickOpsVisibility(this.previewMode === 'array');

        if (this.previewMode === 'array') {
            const host = document.getElementById(this.treeHostId);
            if (host) {
                host.classList.add('array-mode');
                host.classList.remove('bst-mode', 'heap-mode', 'hash-mode', 'queue-mode', 'stack-mode');
            }
        }

        if (this.el.modeLabel) this.el.modeLabel.textContent = modeLabel || 'ALGORITHM DEBUGGER';
        if (this.el.operation) this.el.operation.textContent = operationText || '-';
        if (this.el.step) this.el.step.textContent = 'Step 0 / 0';
        if (this.el.code) this.el.code.textContent = codeText || '// Sem codigo';
        if (this.el.why) this.el.why.textContent = 'Sessao pronta. Clique em Proximo Passo ou Play para iniciar.';
        if (this.el.event) this.el.event.textContent = 'Sessao carregada. Nenhum evento aplicado ainda.';
        if (this.el.metrics) this.el.metrics.textContent = 'Nodes visited: 0 | Queue/Stack ops: 0 | Comparisons: 0';
        if (this.el.currentNode) this.el.currentNode.innerHTML = '<div>-</div>';
        if (this.el.variables) this.el.variables.innerHTML = '<div>-</div>';
        if (this.el.aux) this.el.aux.innerHTML = '<div>-</div>';
        if (this.el.result) this.el.result.innerHTML = '<div>[]</div>';

        this._renderTimeline(0, this.events.length);
        if (this.el.btnPlay) this.el.btnPlay.textContent = '? Play';
    }

    onProgress(currentIndex, total, lastEvent) {
        if (this.el.step) this.el.step.textContent = `Step ${currentIndex} / ${total}`;
        this.lastEvent = lastEvent || this.lastEvent;
        this._renderTimeline(currentIndex, total);
        if (currentIndex >= total && this.el.btnPlay) this.el.btnPlay.textContent = '? Play';
    }

    renderEvent(event, context = {}) {
        if (!event) return;
        this.lastEvent = event;

        const structureType = context.structureType || (this.previewMode === 'array' ? 'array' : (this.previewMode === 'linked_list' ? 'linked_list' : 'tree'));
        const tree = context.tree || null;
        // The visual components (nodesContainer, etc) are now securely moved by AppManager
        // into the debug preview, so we don't need to manually render trees or arrays here.

        if (this.el.event) this.el.event.textContent = `${event.type} | Linha ${event.lineNumber || '-'} | ${event.description || '-'}`;
        if (this.el.why) this.el.why.textContent = event.why || event.description || 'Sem explicacao.';

        this._renderCurrentNode(event, { ...context, structureType });
        this._renderVariables(event);
        this._renderAux(event);
        this._renderResult(event);
        this._renderCodeFromEvent(event);
        this._renderMetrics(context.metrics || {});
    }

    _renderArrayPreview(arrayState, focusIndex) {
        if (!arrayState || !this.arrayRenderer) return;

        const capacity = Number(arrayState.capacity || 0);
        const baseAddress = Number(arrayState.baseAddress || 0x1000);
        const elementSize = Number(arrayState.elementSize || 4);
        const data = Array.isArray(arrayState.data) ? arrayState.data : [];

        if (!capacity) return;

        this.arrayRenderer.init(capacity, baseAddress, elementSize);
        data.forEach((value, idx) => {
            if (value !== undefined && value !== null) {
                this.arrayRenderer.updateValue(idx, value);
            }
        });

        if (Number.isInteger(focusIndex)) {
            this.arrayRenderer.highlight(focusIndex, 'highlight-blue');
        }
    }

    _renderCurrentNode(event, context) {
        if (!this.el.currentNode) return;
        if (context.structureType === 'array') {
            const vars = event?.variables || {};
            const state = context.arrayState || vars.arrayState || {};
            const idx = Number.isInteger(vars.index)
                ? vars.index
                : (Number.isInteger(context.focusIndex) ? context.focusIndex : null);
            const value = Number.isInteger(idx) && Array.isArray(state.data) ? state.data[idx] : vars.value;

            this.el.currentNode.innerHTML = [
                `<div>Indice: ${Number.isInteger(idx) ? idx : '-'}</div>`,
                `<div>Valor: ${value ?? '-'}</div>`,
                `<div>Anterior: ${Number.isInteger(idx) && idx > 0 ? idx - 1 : 'null'}</div>`,
                `<div>Proximo: ${Number.isInteger(idx) ? idx + 1 : '-'}</div>`,
                `<div>Size/Capacity: ${Number(state.size || vars.size || 0)} / ${Number(state.capacity || vars.capacity || 0)}</div>`,
                `<div>Status: ${event.type}</div>`,
            ].join('');
            return;
        }

        const tree = context.tree;
        const focusId = context.focusNodeId || event.nodeId;
        let node = null;
        if (tree && Array.isArray(tree.nodes) && focusId) {
            node = tree.nodes.find((n) => n.id === focusId) || null;
        }

        if (!node) {
            this.el.currentNode.innerHTML = '<div>Node: -</div><div>Status: -</div>';
            return;
        }

        const parent = tree.nodes.find((n) => n.leftId === node.id || n.rightId === node.id);
        this.el.currentNode.innerHTML = [
            `<div>Node: ${node.id}</div>`,
            `<div>Value: ${node.value}</div>`,
            `<div>Parent: ${parent ? parent.value : 'null'}</div>`,
            `<div>Left: ${node.leftId || 'null'}</div>`,
            `<div>Right: ${node.rightId || 'null'}</div>`,
            `<div>Path: ${(Array.isArray(event.variables?.path) && event.variables.path.length) ? event.variables.path.join(' -> ') : '-'}</div>`,
            `<div>Status: ${event.type}</div>`,
        ].join('');
    }

    _renderVariables(event) {
        if (!this.el.variables) return;
        const vars = event.variables || {};
        const keys = Object.keys(vars);
        if (!keys.length) {
            this.el.variables.innerHTML = '<div>-</div>';
            return;
        }
        this.el.variables.innerHTML = keys.map((key) => `<div>${key} = ${Array.isArray(vars[key]) ? '[' + vars[key].join(', ') + ']' : vars[key]}</div>`).join('');
    }

    _renderAux(event) {
        if (!this.el.aux) return;
        const vars = event.variables || {};
        if (Array.isArray(vars.queue)) {
            this.el.aux.innerHTML = `<div>QUEUE: [${vars.queue.join(', ')}]</div>`;
            return;
        }
        if (Array.isArray(vars.stack)) {
            this.el.aux.innerHTML = `<div>STACK: [${vars.stack.join(', ')}]</div>`;
            return;
        }
        this.el.aux.innerHTML = '<div>Sem estrutura auxiliar neste passo.</div>';
    }

    _renderResult(event) {
        if (!this.el.result) return;
        const vars = event.variables || {};
        if (Array.isArray(vars.result)) {
            this.el.result.innerHTML = `<div>[${vars.result.join(', ')}]</div>`;
            return;
        }
        if (typeof vars.found !== 'undefined') {
            this.el.result.innerHTML = `<div>${vars.found ? 'FOUND' : 'NOT FOUND'}</div>`;
            return;
        }
        this.el.result.innerHTML = '<div>[]</div>';
    }

    _renderCodeFromEvent(event) {
        if (!this.el.code) return;

        const raw = String(event?.rawStep?.codeLine || '');
        let activeLine = Number.isInteger(event?.lineNumber)
            ? event.lineNumber
            : (Number.isInteger(event?.rawStep?.data?.activeLine) ? event.rawStep.data.activeLine : null);
        const validationProbe = this._buildValidationProbe(event);

        if (!raw.trim()) {
            const source = document.getElementById('codeDisplay');
            if (source) this.el.code.innerHTML = source.innerHTML;
            return;
        }

        const escapeHtml = (text) => String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const tokenize = (text) => {
            return escapeHtml(text)
                .replace(/\b(public|private|protected|class|if|else|for|while|return|new|null|true|false|throw|break|continue)\b/g, '<span class="token-keyword">$1</span>')
                .replace(/\b(Node|T|int|void|boolean)\b/g, '<span class="token-type">$1</span>')
                .replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="token-string">$1</span>');
        };

        const lines = raw.replace(/\r\n/g, '\n').split('\n');
        
        if (activeLine === null) {
            let activeIndex = lines.findIndex((line) => line.includes('<---'));
            if (activeIndex === -1) {
                for (let i = lines.length - 1; i >= 0; i--) {
                    if (lines[i].trim() && !lines[i].trim().startsWith('//') && lines[i].trim() !== '}' && lines[i].trim() !== '{') {
                        activeIndex = i;
                        break;
                    }
                }
            }
            if (activeIndex >= 0) {
                activeLine = activeIndex + 1;
            }
        }

        this.el.code.innerHTML = lines.map((line, idx) => {
            const lineNo = idx + 1;
            const isActive = activeLine === lineNo;
            const cleanLine = line.replace(/\/\/\s*<---.*$/, '').replace(/<---.*$/, '');
            const probeInline = isActive && validationProbe
                ? `<span class="code-line-probe"> // ${escapeHtml(validationProbe)}</span>`
                : '';
            return `<div class="code-line${isActive ? ' active-line' : ''}">`
            + `<span class="code-line-marker">${isActive ? '\u25B6' : ''}</span>`
                + `<span class="code-line-number">${lineNo}</span>`
                + `<span class="code-line-text">${tokenize(cleanLine)}${probeInline}</span>`
                + `</div>`;
        }).join('');

        const active = this.el.code.querySelector('.active-line');
        if (active && typeof active.scrollIntoView === 'function') {
            active.scrollIntoView({ block: 'nearest' });
        }
    }

    _buildValidationProbe(event) {
        const description = String(event?.description || '');
        const normalized = description.replace(',', '.').replace(/\s+/g, ' ').trim();
        const numericCmp = normalized.match(/(-?\d+)\s*(==|<=|>=|<|>)\s*(-?\d+)/);
        if (numericCmp) {
            const left = Number(numericCmp[1]);
            const op = numericCmp[2];
            const right = Number(numericCmp[3]);
            let result = false;
            if (op === '==') result = left === right;
            if (op === '<') result = left < right;
            if (op === '>') result = left > right;
            if (op === '<=') result = left <= right;
            if (op === '>=') result = left >= right;
            return `teste ${left} ${op} ${right} => ${result ? 'true' : 'false'}`;
        }

        const compareWith = normalized.match(/comparar\s+(-?\d+)\s+com\s+(-?\d+)/i);
        if (compareWith) {
            const left = Number(compareWith[1]);
            const right = Number(compareWith[2]);
            return `teste ${left} == ${right} => ${left === right ? 'true' : 'false'}`;
        }

        const vars = event?.variables || {};
        const target = Number(vars.target);
        const current = Number(vars.current);

        if (/arvore vazia/i.test(normalized)) {
            const insertMatch = normalized.match(/inserimos\s+(-?\d+)/i);
            const rootValue = insertMatch ? Number(insertMatch[1]) : (Number.isFinite(target) ? target : null);
            if (Number.isFinite(rootValue)) {
                return `teste root (raiz da BST) == null => true; root = ${rootValue}`;
            }
            return 'teste root (raiz da BST) == null => true';
        }

        if (event.type === 'NODE_INSERTED' && Number.isFinite(target) && Number.isFinite(current)) {
            return `teste insercao value=${target}, node=${current} => ${target === current ? 'true' : 'ok'}`;
        }

        if (Number.isFinite(target) && Number.isFinite(current)) {
            if (event.type === 'NODE_FOUND') {
                return `teste ${target} == ${current} => true (encontrado)`;
            }
            if (event.type === 'NODE_VISITED' || event.type === 'NODE_SELECTED') {
                return `teste atual value=${target}, current=${current}`;
            }
        }

        if (/nao encontrado/i.test(normalized)) {
            if (Number.isFinite(target) && Number.isFinite(current)) {
                return `teste final ${target} == ${current} => false (nao encontrado)`;
            }
            if (Number.isFinite(target)) {
                return `teste final value=${target} => false (nao encontrado)`;
            }
            return 'teste final => false (nao encontrado)';
        }

        if (Number.isFinite(Number(vars.index)) && Number.isFinite(Number(vars.size))) {
            const index = Number(vars.index);
            const size = Number(vars.size);
            if (event.type === 'INDEX_COMPARED' || event.type === 'CONDITION_CHECKED' || event.type === 'CONDITION_FAILED') {
                if (typeof vars.canInsert === 'boolean') {
                    const validInsert = index >= 0 && index <= size;
                    return `teste 0 <= ${index} <= ${size} => ${validInsert ? 'true' : 'false'}`;
                }
                if (typeof vars.inBounds === 'boolean') {
                    const inBounds = index >= 0 && index < size;
                    return `teste 0 <= ${index} < ${size} => ${inBounds ? 'true' : 'false'}`;
                }
            }
        }

        if (event.type === 'CONDITION_CHECKED' && typeof vars.needsResize === 'boolean') {
            return `teste ${vars.size} == ${vars.capacity} => ${vars.needsResize ? 'true' : 'false'}`;
        }

        if (event.type === 'VALUE_WRITTEN') {
            const idx = Number(vars.index);
            return `teste escrita array[${Number.isFinite(idx) ? idx : '?'}] = ${vars.value ?? vars.targetValue ?? '-'} => aplicada`;
        }

        if (event.type === 'VALUE_REMOVED') {
            const idx = Number(vars.index);
            return `teste remocao no indice ${Number.isFinite(idx) ? idx : '?'} => aplicada`;
        }

        if (event.type === 'VALUE_SHIFTED' && Number.isFinite(Number(vars.from)) && Number.isFinite(Number(vars.to))) {
            return `teste deslocamento ${vars.from} -> ${vars.to} => aplicado`;
        }

        if (event.type === 'STATE_UPDATED' && Number.isFinite(Number(vars.sizeBefore)) && Number.isFinite(Number(vars.sizeAfter))) {
            return `teste size ${vars.sizeBefore} -> ${vars.sizeAfter} => atualizado`;
        }

        return '';
    }

    _renderMetrics(metrics) {
        if (!this.el.metrics) return;
        const visited = Number(metrics.visitedNodes || 0);
        const queueOps = Number(metrics.queueOps || 0);
        const comparisons = Number(metrics.comparisons || 0);
        this.el.metrics.textContent = `Nodes visited: ${visited} | Queue/Stack ops: ${queueOps} | Comparisons: ${comparisons}`;
    }

    _renderTimeline(currentIndex, total) {
        if (!this.el.timeline) return;
        if (!total) {
            this.el.timeline.innerHTML = '';
            return;
        }

        this.el.timeline.innerHTML = this.events
            .map((event, idx) => {
                const state = idx < currentIndex ? 'done' : (idx === currentIndex ? 'current' : 'pending');
                const symbol = idx < currentIndex ? '[x]' : (idx === currentIndex ? '[>]' : '[ ]');
                const short = event.description ? event.description.slice(0, 26) : event.type;
                return `<button class="debug-timeline-step ${state}" data-index="${idx}" title="${short}">${symbol} ${idx + 1}</button>`;
            })
            .join('');

        Array.from(this.el.timeline.querySelectorAll('.debug-timeline-step')).forEach((btn) => {
            btn.addEventListener('click', () => {
                if (!this.engine) return;
                const target = Number(btn.getAttribute('data-index'));
                this.engine.jumpTo(target + 1);
            });
        });
    }
}
