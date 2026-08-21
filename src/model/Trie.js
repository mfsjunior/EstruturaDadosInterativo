class Trie {
    constructor() {
        this.nodeCounter = 1;
        this.baseAddress = 0x9000;
        this.addressStride = 0x20;
        this.root = this._createNode('^');
        this.size = 0;
        this.steps = [];
    }

    _createNode(char) {
        const id = `trie_${this.nodeCounter++}`;
        return {
            id,
            char,
            isTerminal: false,
            memoryAddress: `0x${(this.baseAddress + ((this.nodeCounter - 2) * this.addressStride)).toString(16).toUpperCase()}`,
            children: new Map(),
        };
    }

    _normalize(word) {
        return String(word || '').trim().toLowerCase();
    }

    _addStep(type, payload, codeSnippet = '', description = '') {
        this.steps.push(new Step(type, payload, codeSnippet, description));
    }

    _cloudText(description) {
        const cleaned = String(description || '')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!cleaned) return '';
        const happened = cleaned.endsWith('.') ? cleaned.slice(0, -1) : cleaned;
        const importance = this._importanceForCloud(happened);
        const full = `O que aconteceu: ${happened}. Por que isso importa: ${importance}`;
        return full.length > 220 ? `${full.slice(0, 217)}...` : full;
    }

    _importanceForCloud(happened) {
        const text = String(happened || '').toLowerCase();
        if (text.includes('prefixo')) return 'prefixos compartilhados economizam memoria e aceleram consultas por palavra.';
        if (text.includes('fim de palavra') || text.includes('terminal')) return 'a marca terminal diferencia prefixo de palavra completa.';
        if (text.includes('nao encontrada') || text.includes('falha')) return 'um unico caractere ausente encerra a busca imediatamente.';
        if (text.includes('nivel')) return 'cada nivel representa um caractere, por isso o custo depende do tamanho da palavra.';
        return 'na Trie, avancamos caractere por caractere para encontrar ou inserir palavras.';
    }

    _withCloud(extraData, description) {
        const payload = extraData && typeof extraData === 'object' ? { ...extraData } : {};
        if (!payload.cloud) {
            payload.cloud = this._cloudText(description);
        }
        return payload;
    }

    _startOperation(name) {
        this.steps = [];
        const description = `Operacao iniciada: ${name}. Total de palavras: ${this.size}.`;
        this._addStep('INFO', { cloud: this._cloudText(description) }, `// Iniciando ${name}`, description);
    }

    _statePayload() {
        return {
            head: 'root@^',
            tail: `words@${this.size}`,
            size: this.size,
        };
    }

    _snapshot() {
        const nodes = [];
        const queue = [this.root];

        while (queue.length) {
            const node = queue.shift();
            if (!node) continue;

            const orderedChildren = Array.from(node.children.values()).sort((a, b) => a.char.localeCompare(b.char));
            orderedChildren.forEach((child) => queue.push(child));

            nodes.push({
                id: node.id,
                value: node.char === '^'
                    ? 'ROOT'
                    : (node.isTerminal ? `${node.char}*` : node.char),
                memoryAddress: node.memoryAddress,
                leftId: orderedChildren[0] ? orderedChildren[0].id : null,
                rightId: null,
                trieChildren: orderedChildren.map((child) => child.id),
            });
        }

        const byId = new Map(nodes.map((n) => [n.id, n]));
        nodes.forEach((node) => {
            const sibs = node.trieChildren || [];
            for (let i = 0; i < sibs.length - 1; i += 1) {
                const current = byId.get(sibs[i]);
                if (current) current.rightId = sibs[i + 1];
            }
            delete node.trieChildren;
        });

        return {
            rootId: this.root.id,
            size: this.size,
            nodes,
        };
    }

    _renderStep(code, description, focusNodeId = null, focusEdge = null, extraData = null) {
        const payload = {
            tree: this._snapshot(),
            focusNodeId,
            focusEdge,
            state: this._statePayload(),
            algorithm: 'TRIE',
        };
        Object.assign(payload, this._withCloud(extraData, description));
        this._addStep('BST_RENDER', payload, code, description);
    }

    getSteps() {
        const copy = [...this.steps];
        this.steps = [];
        return copy;
    }

    insert(word) {
        const normalized = this._normalize(word);
        this._startOperation(`insert(${normalized})`);
        const code = `public void insert(String word) {\n    TrieNode node = root;\n    for (char ch : word.toCharArray()) {\n        node = node.children.computeIfAbsent(ch, k -> new TrieNode());\n    }\n    node.isTerminal = true;\n}`;

        if (!normalized) {
            this._renderStep(code, 'Palavra vazia ignorada.', this.root.id, null);
            return;
        }

        let current = this.root;
        let depth = 0;

        for (const ch of normalized) {
            depth += 1;
            const existing = current.children.get(ch);
            if (!existing) {
                const newNode = this._createNode(ch);
                current.children.set(ch, newNode);
                this._renderStep(
                    code,
                    `Nivel ${depth}: criamos no '${ch}'. Trie compartilha prefixos, entao so cria o que ainda nao existe.`,
                    newNode.id,
                    [current.id, newNode.id],
                    { trieComparison: { depth, wordLength: normalized.length } }
                );
                current = newNode;
            } else {
                this._renderStep(
                    code,
                    `Nivel ${depth}: prefixo '${ch}' ja existia; seguimos sem criar novo no.`,
                    existing.id,
                    [current.id, existing.id],
                    { trieComparison: { depth, wordLength: normalized.length } }
                );
                current = existing;
            }
        }

        if (current.isTerminal) {
            this._renderStep(code, `A palavra '${normalized}' ja estava registrada na Trie.`, current.id, null, {
                trieComparison: { depth: normalized.length, wordLength: normalized.length },
            });
            return;
        }

        current.isTerminal = true;
        this.size += 1;
        this._renderStep(code, `Marcamos fim de palavra em '${normalized}'. Total de palavras agora: ${this.size}.`, current.id, null, {
            trieComparison: { depth: normalized.length, wordLength: normalized.length },
        });
    }

    contains(word) {
        const normalized = this._normalize(word);
        this._startOperation(`contains(${normalized})`);
        const code = `public boolean contains(String word) {\n    TrieNode node = root;\n    for (char ch : word.toCharArray()) {\n        node = node.children.get(ch);\n        if (node == null) return false;\n    }\n    return node.isTerminal;\n}`;

        if (!normalized) {
            this._renderStep(code, 'Palavra vazia nao e consulta valida.', this.root.id, null, {
                trieComparison: { depth: 0, wordLength: 0, result: false },
            });
            return false;
        }

        let current = this.root;
        let depth = 0;

        for (const ch of normalized) {
            depth += 1;
            const next = current.children.get(ch);
            if (!next) {
                this._renderStep(code, `Falha no nivel ${depth}: nao existe aresta para '${ch}'. Palavra nao encontrada.`, current.id, null, {
                    trieComparison: { depth, wordLength: normalized.length, result: false },
                });
                return false;
            }

            this._renderStep(code, `Nivel ${depth}: seguimos para '${ch}'.`, next.id, [current.id, next.id], {
                trieComparison: { depth, wordLength: normalized.length, result: null },
            });
            current = next;
        }

        const found = !!current.isTerminal;
        this._renderStep(code, found
            ? `Encontramos '${normalized}' (no terminal marcado).`
            : `Prefixo '${normalized}' existe, mas sem marca terminal (palavra completa nao encontrada).`, current.id, null, {
            trieComparison: { depth: normalized.length, wordLength: normalized.length, result: found },
        });
        return found;
    }

    clear() {
        this._startOperation('clear()');
        this.root = this._createNode('^');
        this.size = 0;
        this._renderStep('', 'Trie reinicializada.', this.root.id, null);
    }
}
