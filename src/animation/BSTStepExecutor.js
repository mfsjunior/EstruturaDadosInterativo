class BSTStepExecutor {
    constructor(renderer, statePanel, codeHighlighter, consolePanel, complexityPanel, algorithmDebugPanel = null) {
        this.renderer = renderer;
        this.statePanel = statePanel;
        this.codeHighlighter = codeHighlighter;
        this.consolePanel = consolePanel;
        this.complexityPanel = complexityPanel;
        this.algorithmDebugPanel = algorithmDebugPanel;
        this.lastTree = null;
        this.lastFocusNodeId = null;
        this.lastFocusEdge = null;
        this.debugStats = {
            visitedNodes: 0,
            comparisons: 0,
            queueOps: 0,
        };
    }

    execute(step) {
        this._dispatch(step, false);
    }

    executeFast(step) {
        this._dispatch(step, true);
    }

    clear() {
        this.renderer.clear();
        this.statePanel.reset();
        this.consolePanel.clear();
        this.codeHighlighter.clear();
        this.complexityPanel.reset();
        this.lastTree = null;
        this.lastFocusNodeId = null;
        this.lastFocusEdge = null;
        this.debugStats = {
            visitedNodes: 0,
            comparisons: 0,
            queueOps: 0,
        };
    }

    restoreSnapshot(snapshot) {
        this.clear();
        if (!snapshot) return;
        this.lastTree = snapshot;
        this.lastFocusNodeId = null;
        this.lastFocusEdge = null;
        this.debugStats = {
            visitedNodes: 0,
            comparisons: 0,
            queueOps: 0,
        };
        this.renderer.render(snapshot, this.lastFocusNodeId, this.lastFocusEdge);
        this.statePanel.updateProp('head', snapshot.rootId ? `root@${snapshot.rootValue}` : '-');
        this.statePanel.updateProp('tail', `size@${snapshot.size || 0}`);
        this.statePanel.updateProp('size', snapshot.size || 0);
    }

    refreshLayout() {
        if (!this.lastTree) return;
        this.renderer.render(this.lastTree, this.lastFocusNodeId, this.lastFocusEdge);
    }

    _dispatch(step, isFast) {
        if (!step) return;
        if (step.description && !isFast) this.consolePanel.log(step.description);
        if (step.codeLine && !isFast) this.codeHighlighter.highlight(this._codeForStep(step));
        const containsComparison = step.data?.containsComparison || null;
        const avlComparison = step.data?.avlComparison || null;
        const rbtComparison = step.data?.rbtComparison || null;
        const trieComparison = step.data?.trieComparison || null;
        const cloudNote = typeof step.data?.cloud === 'string' && step.data.cloud.trim()
            ? ` Nuvem: ${step.data.cloud.trim()}`
            : '';

        const action = document.getElementById('currentStepAction');
        if (action && !isFast) {
            let actionText = '';
            if (containsComparison) {
                const linearWorst = Number(containsComparison.linearWorst || 0);
                const visited = Number(containsComparison.visited || 0);
                const comparison = `Comparacao didatica -> Linear: ate ${linearWorst} nos | BST: ${visited} no(s) visitado(s).`;
                actionText = `${step.description || ''} ${comparison}`.trim();
            } else if (avlComparison) {
                const visited = Number(avlComparison.visited || 0);
                const bstWorst = Number(avlComparison.bstWorst || 0);
                const avlHeight = Number(avlComparison.avlHeight || 0);
                const comparison = `Comparacao BST vs AVL -> BST pode chegar a ${bstWorst} visitas no pior caso; AVL controla altura (h~${avlHeight}) e visitou ${visited}.`;
                actionText = `${step.description || ''} ${comparison}`.trim();
            } else if (rbtComparison) {
                const visited = Number(rbtComparison.visited || 0);
                const bstWorst = Number(rbtComparison.bstWorst || 0);
                const rbtDepth = Number(rbtComparison.rbtDepth || 0);
                const comparison = `Comparacao BST vs Red-Black -> BST pode chegar a ${bstWorst} visitas no pior caso; Red-Black controla altura (h~${rbtDepth}) e visitou ${visited}.`;
                actionText = `${step.description || ''} ${comparison}`.trim();
            } else if (trieComparison) {
                const depth = Number(trieComparison.depth || 0);
                const wordLength = Number(trieComparison.wordLength || 0);
                const comparison = `Comparacao didatica -> Trie depende do tamanho da palavra: caminho atual ${depth}/${wordLength} caracteres.`;
                actionText = `${step.description || ''} ${comparison}`.trim();
            } else {
                actionText = step.description || this.codeHighlighter.lastActiveLineText || '';
            }
            action.textContent = `${actionText}${cloudNote}`.trim();
        }

        if (step.type === 'BST_RENDER') {
            const tree = step.data?.tree || { rootId: null, size: 0, nodes: [] };
            const isAvl = step.data?.algorithm === 'AVL';
            const isRbt = step.data?.algorithm === 'RBT';
            const isTrie = step.data?.algorithm === 'TRIE';
            this.lastTree = tree;
            this.lastFocusNodeId = step.data?.focusNodeId || null;
            this.lastFocusEdge = step.data?.focusEdge || null;
            this.renderer.render(tree, this.lastFocusNodeId, this.lastFocusEdge);
            if (step.data?.state) {
                this.statePanel.updateProp('head', step.data.state.head);
                this.statePanel.updateProp('tail', step.data.state.tail);
                this.statePanel.updateProp('size', step.data.state.size);
            }
            const focusNode = Array.isArray(tree.nodes) ? tree.nodes.find((node) => node.id === step.data?.focusNodeId) : null;
            if (focusNode) {
                this.statePanel.updateNodeDetails({
                    id: focusNode.id,
                    value: focusNode.value,
                    memoryAddress: focusNode.memoryAddress,
                    previous: focusNode.leftId ? { memoryAddress: focusNode.leftId } : null,
                    next: focusNode.rightId ? { memoryAddress: focusNode.rightId } : null,
                });
            }
            if (containsComparison) {
                const linearWorst = Number(containsComparison.linearWorst || 0);
                const visited = Number(containsComparison.visited || 0);
                const pruned = Math.max(0, Number(containsComparison.pruned || 0));
                const resultLabel = containsComparison.result === true ? 'encontrado' : containsComparison.result === false ? 'nao encontrado' : 'em andamento';
                this.complexityPanel.show(
                    'BST: O(h) | Linear: O(n)',
                    `Busca ${resultLabel}. Comparacao em tempo real: linear pode exigir ate ${linearWorst} visitas; neste passo, a BST visitou ${visited} e evitou ${pruned} no(s).`
                );
            } else if (isAvl) {
                if (avlComparison) {
                    const visited = Number(avlComparison.visited || 0);
                    const bstWorst = Number(avlComparison.bstWorst || 0);
                    const avlHeight = Number(avlComparison.avlHeight || 0);
                    this.complexityPanel.show(
                        'AVL: O(log n) | BST: O(h)',
                        `Comparacao didatica: AVL com altura ~${avlHeight} visitou ${visited} no(s). Uma BST desbalanceada pode chegar a ${bstWorst} visitas no pior caso.`
                    );
                } else {
                    this.complexityPanel.show('O(log n)', 'AVL mantem a altura balanceada com rotacoes locais, preservando busca/insercao em custo logaritmico.');
                }
            } else if (isRbt) {
                if (rbtComparison) {
                    const visited = Number(rbtComparison.visited || 0);
                    const bstWorst = Number(rbtComparison.bstWorst || 0);
                    const rbtDepth = Number(rbtComparison.rbtDepth || 0);
                    this.complexityPanel.show(
                        'RB: O(log n) | BST: O(h)',
                        `Comparacao didatica: Red-Black com altura ~${rbtDepth} visitou ${visited} no(s). Uma BST desbalanceada pode chegar a ${bstWorst} visitas no pior caso.`
                    );
                } else {
                    this.complexityPanel.show('O(log n)', 'Red-Black usa regras de cor e rotacoes para manter altura logaritmica.');
                }
            } else if (isTrie) {
                if (trieComparison) {
                    const depth = Number(trieComparison.depth || 0);
                    const wordLength = Number(trieComparison.wordLength || 0);
                    this.complexityPanel.show(
                        'Trie: O(L)',
                        `Busca/insercao na Trie depende do comprimento da palavra. Passo atual: ${depth} de ${wordLength} caractere(s).`
                    );
                } else {
                    this.complexityPanel.show('Trie: O(L)', 'A Trie avanca um nivel por caractere, compartilhando prefixos entre palavras.');
                }
            } else {
                this.complexityPanel.show('O(h)', 'A BST percorre um caminho da raiz ate o no alvo. Em media, o custo depende da altura da arvore.');
            }
        }

        this._syncAlgorithmDebug(step, isFast);
    }

    _codeForStep(step) {
        const code = String(step?.codeLine || '');
        if (!code.trim()) return code;
        const activeLine = Number(step?.data?.activeLine);
        if (!Number.isInteger(activeLine) || activeLine < 1) return code;
        const lines = code.split('\n');
        const idx = activeLine - 1;
        if (idx >= 0 && idx < lines.length) {
            lines[idx] = `${lines[idx]} // <---`;
        }
        return lines.join('\n');
    }

    _syncAlgorithmDebug(step, isFast) {
        if (!this.algorithmDebugPanel) return;
        const event = step.__algorithmEvent;
        if (!event) return;

        const desc = String(step.description || '').toLowerCase();
        if (step.type === 'BST_RENDER' && step.data?.focusNodeId) {
            this.debugStats.visitedNodes += 1;
        }
        if (desc.includes('compar')) {
            this.debugStats.comparisons += 1;
        }
        if (desc.includes('fila') || desc.includes('queue') || desc.includes('pilha') || desc.includes('stack')) {
            this.debugStats.queueOps += 1;
        }

        if (!Number.isInteger(event.lineNumber)) {
            const lineNumberEl = document.querySelector('#codeDisplay .active-line .code-line-number');
            if (lineNumberEl) {
                const parsed = Number(lineNumberEl.textContent);
                if (Number.isInteger(parsed)) event.lineNumber = parsed;
            }
        }

        this.algorithmDebugPanel.renderEvent(event, {
            tree: this.lastTree,
            focusNodeId: this.lastFocusNodeId,
            focusEdge: this.lastFocusEdge,
            metrics: { ...this.debugStats },
        });
    }
}