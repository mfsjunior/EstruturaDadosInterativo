class AVLTree {
    constructor() {
        this.root = null;
        this.size = 0;
        this.steps = [];
        this.nodeCounter = 1;
        this.baseAddress = 0x7000;
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
        if (text.includes('rotacao')) return 'rotacoes mantem a arvore baixa e preservam operacoes em O(log n).';
        if (text.includes('fator') || text.includes('altura')) return 'controlar altura evita que a arvore degenere para comportamento linear.';
        if (text.includes('nao insere duplicatas')) return 'evita ambiguidades e mantem regras de ordenacao da arvore.';
        if (text.includes('encontramos')) return 'a busca para quando o valor correto e localizado no caminho.';
        return 'na AVL, toda insercao/remocao verifica balanceamento para manter desempenho logaritmico.';
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
        const id = `avl_${this.nodeCounter++}`;
        return {
            id,
            value,
            height: 1,
            memoryAddress: `0x${(this.baseAddress + ((this.nodeCounter - 2) * this.addressStride)).toString(16).toUpperCase()}`,
            left: null,
            right: null,
        };
    }

    _height(node) {
        return node ? node.height : 0;
    }

    _updateHeight(node) {
        if (!node) return;
        node.height = 1 + Math.max(this._height(node.left), this._height(node.right));
    }

    _balanceFactor(node) {
        return node ? this._height(node.left) - this._height(node.right) : 0;
    }

    _snapshot() {
        const nodes = [];
        const walk = (node) => {
            if (!node) return;
            nodes.push({
                id: node.id,
                value: `${node.value} (h:${node.height})`,
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
            algorithm: 'AVL',
        };
        Object.assign(payload, this._withCloud(extraData, description));
        this._addStep('BST_RENDER', payload, code, description);
    }

    _minValueNode(node) {
        let current = node;
        while (current && current.left) current = current.left;
        return current;
    }

    _rotateRight(y, code) {
        const x = y.left;
        const t2 = x ? x.right : null;

        this._renderStep(code, `Rotacao a direita em ${y.value} para restaurar balanceamento.`, y.id, x ? [y.id, x.id] : null);

        x.right = y;
        y.left = t2;

        this._updateHeight(y);
        this._updateHeight(x);

        this._renderStep(code, `Nova raiz local apos rotacao: ${x.value}.`, x.id, [x.id, y.id]);
        return x;
    }

    _rotateLeft(x, code) {
        const y = x.right;
        const t2 = y ? y.left : null;

        this._renderStep(code, `Rotacao a esquerda em ${x.value} para restaurar balanceamento.`, x.id, y ? [x.id, y.id] : null);

        y.left = x;
        x.right = t2;

        this._updateHeight(x);
        this._updateHeight(y);

        this._renderStep(code, `Nova raiz local apos rotacao: ${y.value}.`, y.id, [y.id, x.id]);
        return y;
    }

    getSteps() {
        const copy = [...this.steps];
        this.steps = [];
        return copy;
    }

    insert(value) {
        this._startOperation(`insert(${value})`);
        const code = `public void insert(int value) {\n    root = insertRec(root, value);\n}\n\nprivate Node insertRec(Node node, int value) {\n    if (node == null) return new Node(value);\n    if (value < node.value) node.left = insertRec(node.left, value);\n    else if (value > node.value) node.right = insertRec(node.right, value);\n    else return node;\n\n    updateHeight(node);\n    int balance = balanceFactor(node);\n\n    // Rotacoes AVL\n    if (balance > 1 && value < node.left.value) return rotateRight(node);\n    if (balance < -1 && value > node.right.value) return rotateLeft(node);\n    if (balance > 1 && value > node.left.value) { node.left = rotateLeft(node.left); return rotateRight(node); }\n    if (balance < -1 && value < node.right.value) { node.right = rotateRight(node.right); return rotateLeft(node); }\n\n    return node;\n}`;

        let inserted = false;

        const insertRec = (node, parent = null) => {
            if (!node) {
                inserted = true;
                const newNode = this._createNode(value);
                this._renderStep(code, `Posicao encontrada. Inserimos ${value} e iniciamos reequilibrio AVL (diferente da BST comum, que pode permanecer torta).`, newNode.id, parent ? [parent.id, newNode.id] : null);
                return newNode;
            }

            this._renderStep(code, `Comparando ${value} com ${node.value}.`, node.id, parent ? [parent.id, node.id] : null);

            if (value < node.value) {
                this._renderStep(code, `${value} < ${node.value}. Descemos para a esquerda.`, node.id, node.left ? [node.id, node.left.id] : null);
                node.left = insertRec(node.left, node);
            } else if (value > node.value) {
                this._renderStep(code, `${value} > ${node.value}. Descemos para a direita.`, node.id, node.right ? [node.id, node.right.id] : null);
                node.right = insertRec(node.right, node);
            } else {
                this._renderStep(code, `Valor ${value} ja existe. AVL nao insere duplicatas.`, node.id, parent ? [parent.id, node.id] : null);
                return node;
            }

            this._updateHeight(node);
            const balance = this._balanceFactor(node);
            this._renderStep(code, `Atualizando altura de ${node.value} e fator = ${balance}. Objetivo AVL: manter altura baixa para busca O(log n).`, node.id, null);

            if (balance > 1 && value < node.left.value) {
                return this._rotateRight(node, code);
            }

            if (balance < -1 && value > node.right.value) {
                return this._rotateLeft(node, code);
            }

            if (balance > 1 && value > node.left.value) {
                this._renderStep(code, `Caso LR em ${node.value}: rotacao esquerda no filho e direita no avo.`, node.id, [node.id, node.left.id]);
                node.left = this._rotateLeft(node.left, code);
                return this._rotateRight(node, code);
            }

            if (balance < -1 && value < node.right.value) {
                this._renderStep(code, `Caso RL em ${node.value}: rotacao direita no filho e esquerda no avo.`, node.id, [node.id, node.right.id]);
                node.right = this._rotateRight(node.right, code);
                return this._rotateLeft(node, code);
            }

            return node;
        };

        this.root = insertRec(this.root, null);
        if (inserted) {
            this.size += 1;
            this._renderStep(code, `Insercao concluida. Comparacao didatica: BST e AVL seguem comparacoes iguais, mas a AVL aplica rotacoes para evitar degeneracao.`, this.root ? this.root.id : null, null);
        }
    }

    contains(value) {
        this._startOperation(`contains(${value})`);
        const code = `public boolean contains(int value) {\n    Node current = root;\n    while (current != null) {\n        if (value == current.value) return true;\n        current = value < current.value ? current.left : current.right;\n    }\n    return false;\n}`;

        let current = this.root;
        let parent = null;
        let visited = 0;
        const bstWorst = this.size;
        const avlHeight = this._height(this.root);
        if (!current) {
            this._renderStep(code, 'AVL vazia. Busca encerrada.', null, null, {
                avlComparison: {
                    visited,
                    bstWorst,
                    avlHeight,
                    result: false,
                },
            });
            return false;
        }

        while (current) {
            visited += 1;
            this._renderStep(code, `Visitando ${current.value}. A decisao de lado e igual a BST, mas na AVL a altura e controlada por rotacoes.`, current.id, parent ? [parent.id, current.id] : null, {
                avlComparison: {
                    visited,
                    bstWorst,
                    avlHeight,
                    result: null,
                },
            });
            if (value === current.value) {
                this._renderStep(code, `Encontramos ${value}. Comparacao: a regra de busca e a mesma da BST, mas com AVL mais balanceada o caminho tende a ser menor.`, current.id, parent ? [parent.id, current.id] : null, {
                    avlComparison: {
                        visited,
                        bstWorst,
                        avlHeight,
                        result: true,
                    },
                });
                return true;
            }
            if (value < current.value) {
                this._renderStep(code, `${value} < ${current.value}. Seguimos para esquerda (mesma regra da BST).`, current.id, current.left ? [current.id, current.left.id] : null, {
                    avlComparison: {
                        visited,
                        bstWorst,
                        avlHeight,
                        result: null,
                    },
                });
                parent = current;
                current = current.left;
            } else {
                this._renderStep(code, `${value} > ${current.value}. Seguimos para direita (mesma regra da BST).`, current.id, current.right ? [current.id, current.right.id] : null, {
                    avlComparison: {
                        visited,
                        bstWorst,
                        avlHeight,
                        result: null,
                    },
                });
                parent = current;
                current = current.right;
            }
        }

        this._renderStep(code, `Valor ${value} nao encontrado. Em AVL, o caminho maximo fica controlado pela altura balanceada.`, null, null, {
            avlComparison: {
                visited,
                bstWorst,
                avlHeight,
                result: false,
            },
        });
        return false;
    }

    remove(value) {
        this._startOperation(`remove(${value})`);
        const code = `public void remove(int value) {\n    root = removeRec(root, value);\n}\n\nprivate Node removeRec(Node node, int value) {\n    if (node == null) return null;\n    if (value < node.value) node.left = removeRec(node.left, value);\n    else if (value > node.value) node.right = removeRec(node.right, value);\n    else {\n        if (node.left == null || node.right == null) node = (node.left != null) ? node.left : node.right;\n        else {\n            Node successor = minValue(node.right);\n            node.value = successor.value;\n            node.right = removeRec(node.right, successor.value);\n        }\n    }\n\n    if (node == null) return null;\n    updateHeight(node);\n    int balance = balanceFactor(node);\n\n    if (balance > 1 && balanceFactor(node.left) >= 0) return rotateRight(node);\n    if (balance > 1 && balanceFactor(node.left) < 0) { node.left = rotateLeft(node.left); return rotateRight(node); }\n    if (balance < -1 && balanceFactor(node.right) <= 0) return rotateLeft(node);\n    if (balance < -1 && balanceFactor(node.right) > 0) { node.right = rotateRight(node.right); return rotateLeft(node); }\n\n    return node;\n}`;

        let removedPrimary = false;

        const removeRec = (node, parent = null, target = value, isSuccessorPhase = false) => {
            if (!node) {
                if (!isSuccessorPhase) {
                    this._renderStep(code, `Valor ${target} nao encontrado para remocao.`, null, null);
                }
                return null;
            }

            this._renderStep(code, `Comparando ${target} com ${node.value} para remocao.`, node.id, parent ? [parent.id, node.id] : null);

            if (target < node.value) {
                this._renderStep(code, `${target} < ${node.value}. Descendo para esquerda.`, node.id, node.left ? [node.id, node.left.id] : null);
                node.left = removeRec(node.left, node, target, isSuccessorPhase);
            } else if (target > node.value) {
                this._renderStep(code, `${target} > ${node.value}. Descendo para direita.`, node.id, node.right ? [node.id, node.right.id] : null);
                node.right = removeRec(node.right, node, target, isSuccessorPhase);
            } else {
                this._renderStep(code, `Encontramos ${target} para remover.`, node.id, parent ? [parent.id, node.id] : null);
                if (!isSuccessorPhase) removedPrimary = true;

                if (!node.left || !node.right) {
                    const child = node.left || node.right;
                    this._renderStep(code, child
                        ? `No com um filho: promovemos ${child.value}.`
                        : 'No folha: remocao direta.', child ? child.id : node.id, null);
                    return child;
                }

                const successor = this._minValueNode(node.right);
                this._renderStep(code, `No com dois filhos: sucessor em ordem = ${successor.value}.`, node.id, [node.id, node.right.id]);
                node.value = successor.value;
                node.right = removeRec(node.right, node, successor.value, true);
            }

            if (!node) return null;

            this._updateHeight(node);
            const balance = this._balanceFactor(node);
            this._renderStep(code, `Recalculando altura/balance de ${node.value}: fator ${balance}.`, node.id, null);

            if (balance > 1 && this._balanceFactor(node.left) >= 0) {
                return this._rotateRight(node, code);
            }

            if (balance > 1 && this._balanceFactor(node.left) < 0) {
                this._renderStep(code, `Caso LR apos remocao em ${node.value}.`, node.id, [node.id, node.left.id]);
                node.left = this._rotateLeft(node.left, code);
                return this._rotateRight(node, code);
            }

            if (balance < -1 && this._balanceFactor(node.right) <= 0) {
                return this._rotateLeft(node, code);
            }

            if (balance < -1 && this._balanceFactor(node.right) > 0) {
                this._renderStep(code, `Caso RL apos remocao em ${node.value}.`, node.id, [node.id, node.right.id]);
                node.right = this._rotateRight(node.right, code);
                return this._rotateLeft(node, code);
            }

            return node;
        };

        this.root = removeRec(this.root, null, value, false);
        if (removedPrimary) {
            this.size = Math.max(0, this.size - 1);
            this._renderStep(code, 'Remocao concluida com rebalanceamento AVL quando necessario.', this.root ? this.root.id : null, null);
            return true;
        }
        return false;
    }

    clear() {
        this._startOperation('clear()');
        this.root = null;
        this.size = 0;
        this._renderStep('', 'AVL reinicializada.', null, null);
    }
}
