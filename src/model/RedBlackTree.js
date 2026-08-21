class RedBlackTree {
    constructor() {
        this.root = null;
        this.size = 0;
        this.steps = [];
        this.nodeCounter = 1;
        this.baseAddress = 0x8000;
        this.addressStride = 0x20;
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
        if (text.includes('recolor')) return 'regras de cor controlam caminhos e ajudam a manter altura proxima do logaritmo.';
        if (text.includes('rotacao')) return 'rotacao corrige estrutura local sem quebrar a ordenacao da BST.';
        if (text.includes('raiz')) return 'garantir raiz preta e uma regra central da Red-Black Tree.';
        if (text.includes('nao inserimos duplicatas')) return 'mantem consistencia das comparacoes e da ordenacao.';
        return 'a Red-Black combina comparacao BST com ajustes de cor/rotacao para manter busca eficiente.';
    }

    _withCloud(extraData, description) {
        const payload = extraData && typeof extraData === 'object' ? { ...extraData } : {};
        if (!payload.cloud) payload.cloud = this._cloudText(description);
        return payload;
    }

    _startOperation(name) {
        this.steps = [];
        const description = `Operacao iniciada: ${name}. Tamanho atual: ${this.size}.`;
        this._addStep('INFO', { cloud: this._cloudText(description) }, `// Iniciando ${name}`, description);
    }

    _createNode(value) {
        const id = `rbt_${this.nodeCounter++}`;
        return {
            id,
            value,
            color: 'RED',
            memoryAddress: `0x${(this.baseAddress + ((this.nodeCounter - 2) * this.addressStride)).toString(16).toUpperCase()}`,
            left: null,
            right: null,
            parent: null,
        };
    }

    _snapshot() {
        const nodes = [];
        const walk = (node) => {
            if (!node) return;
            nodes.push({
                id: node.id,
                value: node.value,
                nodeColor: node.color,
                memoryAddress: node.memoryAddress,
                leftId: node.left ? node.left.id : null,
                rightId: node.right ? node.right.id : null,
            });
            walk(node.left);
            walk(node.right);
        };
        walk(this.root);
        return {
            rootId: this.root ? this.root.id : null,
            size: this.size,
            nodes,
        };
    }

    _statePayload() {
        return {
            head: this.root ? `root@${this.root.value}` : '-',
            tail: `size@${this.size}`,
            size: this.size,
        };
    }

    _renderStep(code, description, focusNodeId = null, focusEdge = null, extraData = null) {
        const payload = {
            tree: this._snapshot(),
            focusNodeId,
            focusEdge,
            state: this._statePayload(),
            algorithm: 'RBT',
        };
        Object.assign(payload, this._withCloud(extraData, description));
        this._addStep('BST_RENDER', payload, code, description);
    }

    _depth(node) {
        if (!node) return 0;
        return 1 + Math.max(this._depth(node.left), this._depth(node.right));
    }

    _rotateLeft(x, code) {
        const y = x.right;
        if (!y) return;

        this._renderStep(code, `Rotacao esquerda em ${x.value}.`, x.id, [x.id, y.id]);

        x.right = y.left;
        if (y.left) y.left.parent = x;

        y.parent = x.parent;
        if (!x.parent) {
            this.root = y;
        } else if (x === x.parent.left) {
            x.parent.left = y;
        } else {
            x.parent.right = y;
        }

        y.left = x;
        x.parent = y;

        this._renderStep(code, `Apos rotacao esquerda, ${y.value} sobe e ${x.value} desce para esquerda.`, y.id, [y.id, x.id]);
    }

    _rotateRight(y, code) {
        const x = y.left;
        if (!x) return;

        this._renderStep(code, `Rotacao direita em ${y.value}.`, y.id, [y.id, x.id]);

        y.left = x.right;
        if (x.right) x.right.parent = y;

        x.parent = y.parent;
        if (!y.parent) {
            this.root = x;
        } else if (y === y.parent.right) {
            y.parent.right = x;
        } else {
            y.parent.left = x;
        }

        x.right = y;
        y.parent = x;

        this._renderStep(code, `Apos rotacao direita, ${x.value} sobe e ${y.value} desce para direita.`, x.id, [x.id, y.id]);
    }

    _fixInsert(z, code) {
        while (z.parent && z.parent.color === 'RED') {
            const grand = z.parent.parent;
            if (!grand) break;

            if (z.parent === grand.left) {
                const uncle = grand.right;
                if (uncle && uncle.color === 'RED') {
                    this._renderStep(code, `Caso 1 (pai e tio vermelhos): recolorimos ${z.parent.value}, ${uncle.value} e ${grand.value}.`, grand.id, null);
                    z.parent.color = 'BLACK';
                    uncle.color = 'BLACK';
                    grand.color = 'RED';
                    z = grand;
                } else {
                    if (z === z.parent.right) {
                        this._renderStep(code, `Caso 2 (triangulo): rotacao esquerda em ${z.parent.value}.`, z.parent.id, [z.parent.id, z.id]);
                        z = z.parent;
                        this._rotateLeft(z, code);
                    }
                    this._renderStep(code, `Caso 3 (linha): recolorimos e aplicamos rotacao direita em ${grand.value}.`, grand.id, null);
                    z.parent.color = 'BLACK';
                    grand.color = 'RED';
                    this._rotateRight(grand, code);
                }
            } else {
                const uncle = grand.left;
                if (uncle && uncle.color === 'RED') {
                    this._renderStep(code, `Caso 1 espelhado (pai e tio vermelhos): recolorimos ${z.parent.value}, ${uncle.value} e ${grand.value}.`, grand.id, null);
                    z.parent.color = 'BLACK';
                    uncle.color = 'BLACK';
                    grand.color = 'RED';
                    z = grand;
                } else {
                    if (z === z.parent.left) {
                        this._renderStep(code, `Caso 2 espelhado (triangulo): rotacao direita em ${z.parent.value}.`, z.parent.id, [z.parent.id, z.id]);
                        z = z.parent;
                        this._rotateRight(z, code);
                    }
                    this._renderStep(code, `Caso 3 espelhado (linha): recolorimos e aplicamos rotacao esquerda em ${grand.value}.`, grand.id, null);
                    z.parent.color = 'BLACK';
                    grand.color = 'RED';
                    this._rotateLeft(grand, code);
                }
            }
        }

        if (this.root) {
            this.root.color = 'BLACK';
            this._renderStep(code, `Regra da raiz: a raiz sempre termina preta (${this.root.value}).`, this.root.id, null);
        }
    }

    getSteps() {
        const copy = [...this.steps];
        this.steps = [];
        return copy;
    }

    insert(value) {
        this._startOperation(`insert(${value})`);
        const code = `public void insert(int value) {\n    Node z = new Node(value, RED);\n    bstInsert(z);\n    fixInsert(z);\n}`;

        let parent = null;
        let current = this.root;

        while (current) {
            parent = current;
            this._renderStep(code, `Comparando ${value} com ${current.value}.`, current.id, parent ? [parent.id, current.id] : null);
            if (value < current.value) {
                this._renderStep(code, `${value} < ${current.value}. Descemos para esquerda.`, current.id, current.left ? [current.id, current.left.id] : null);
                current = current.left;
            } else if (value > current.value) {
                this._renderStep(code, `${value} > ${current.value}. Descemos para direita.`, current.id, current.right ? [current.id, current.right.id] : null);
                current = current.right;
            } else {
                this._renderStep(code, `Valor ${value} ja existe. Nao inserimos duplicatas.`, parent ? parent.id : null, null);
                return;
            }
        }

        const node = this._createNode(value);
        node.parent = parent;
        if (!parent) {
            this.root = node;
        } else if (value < parent.value) {
            parent.left = node;
        } else {
            parent.right = node;
        }

        this.size += 1;
        this._renderStep(code, `Inserimos ${value} como vermelho e iniciamos correcoes da Red-Black.`, node.id, parent ? [parent.id, node.id] : null);
        this._fixInsert(node, code);
    }

    contains(value) {
        this._startOperation(`contains(${value})`);
        const code = `public boolean contains(int value) {\n    Node current = root;\n    while (current != null) {\n        if (value == current.value) return true;\n        current = value < current.value ? current.left : current.right;\n    }\n    return false;\n}`;

        let current = this.root;
        let parent = null;
        let visited = 0;
        const bstWorst = this.size;
        const rbtDepth = this._depth(this.root);

        if (!current) {
            this._renderStep(code, 'Arvore vazia. Busca encerrada.', null, null, {
                rbtComparison: { visited, bstWorst, rbtDepth, result: false },
            });
            return false;
        }

        while (current) {
            visited += 1;
            this._renderStep(code, `Visitando ${current.value}. A busca usa a mesma regra BST, mas a Red-Black controla altura por cores e rotacoes.`, current.id, parent ? [parent.id, current.id] : null, {
                rbtComparison: { visited, bstWorst, rbtDepth, result: null },
            });

            if (value === current.value) {
                this._renderStep(code, `Encontramos ${value}.`, current.id, parent ? [parent.id, current.id] : null, {
                    rbtComparison: { visited, bstWorst, rbtDepth, result: true },
                });
                return true;
            }

            if (value < current.value) {
                this._renderStep(code, `${value} < ${current.value}. Seguimos para esquerda.`, current.id, current.left ? [current.id, current.left.id] : null, {
                    rbtComparison: { visited, bstWorst, rbtDepth, result: null },
                });
                parent = current;
                current = current.left;
            } else {
                this._renderStep(code, `${value} > ${current.value}. Seguimos para direita.`, current.id, current.right ? [current.id, current.right.id] : null, {
                    rbtComparison: { visited, bstWorst, rbtDepth, result: null },
                });
                parent = current;
                current = current.right;
            }
        }

        this._renderStep(code, `Valor ${value} nao encontrado.`, null, null, {
            rbtComparison: { visited, bstWorst, rbtDepth, result: false },
        });
        return false;
    }

    clear() {
        this._startOperation('clear()');
        this.root = null;
        this.size = 0;
        this._renderStep('', 'Red-Black reinicializada.', null, null);
    }
}
