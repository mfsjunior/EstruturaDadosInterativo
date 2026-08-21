class BinarySearchTree {
    constructor() {
        this.root = null;
        this.size = 0;
        this.steps = [];
        this.nodeCounter = 1;
        this.baseAddress = 0x6000;
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
        if (text.includes('nao encontrado')) return 'o caminho possivel terminou; isso prova a resposta sem varrer toda a arvore.';
        if (text.includes('encontramos')) return 'a comparacao bateu e a busca encerra rapidamente.';
        if (text.includes('esquerda') || text.includes('direita')) return 'cada comparacao elimina metade da decisao local e acelera a busca.';
        if (text.includes('raiz')) return 'a raiz e o ponto de partida de todas as operacoes da BST.';
        return 'na BST, comparar e escolher lado reduz o caminho de busca em relacao a uma varredura linear.';
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
        const id = `bst_${this.nodeCounter++}`;
        return {
            id,
            value,
            memoryAddress: `0x${(this.baseAddress + ((this.nodeCounter - 2) * this.addressStride)).toString(16).toUpperCase()}`,
            left: null,
            right: null,
        };
    }

    _snapshot() {
        const nodes = [];
        const walk = (node) => {
            if (!node) return;
            nodes.push({
                id: node.id,
                value: node.value,
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
        };
        Object.assign(payload, this._withCloud(extraData, description));
        this._addStep('BST_RENDER', payload, code, description);
    }

    getSteps() {
        const copy = [...this.steps];
        this.steps = [];
        return copy;
    }

    insert(value) {
        this._startOperation(`insert(${value})`);
        const code = `public void insert(int value) {\n    if (root == null) { root = new Node(value); return; }\n    Node current = root;\n    while (true) {\n        if (value == current.value) return;\n        if (value < current.value) {\n            if (current.left == null) { current.left = new Node(value); return; }\n            current = current.left;\n        } else {\n            if (current.right == null) { current.right = new Node(value); return; }\n            current = current.right;\n        }\n    }\n}`;
        let visited = 0;

        if (this.root === null) {
            const node = this._createNode(value);
            this.root = node;
            this.size++;
            this._renderStep(code, `Arvore vazia. Inserimos ${value} como raiz (primeiro no da BST).`, node.id, null, { activeLine: 2 });
            return;
        }

        let current = this.root;
        let parent = null;
        while (current) {
            visited += 1;
            this._renderStep(code, `Passo ${visited}: comparar ${value} com ${current.value}. Regra BST: menores ficam a esquerda, maiores a direita.`, current.id, parent ? [parent.id, current.id] : null, { activeLine: 5 });

            if (value === current.value) {
                this._renderStep(code, `Parada: ${value} ja existe na BST. Nao inserimos duplicatas para manter busca consistente.`, current.id, parent ? [parent.id, current.id] : null, { activeLine: 5 });
                return;
            }

            if (value < current.value) {
                this._renderStep(code, `${value} < ${current.value}. Seguimos para a esquerda e descartamos toda a subarvore direita deste no.`, current.id, current.left ? [current.id, current.left.id] : null, { activeLine: 6 });
                if (!current.left) {
                    current.left = this._createNode(value);
                    this.size++;
                    this._renderStep(code, `Posicao encontrada: filho esquerdo vazio de ${current.value}. Inserimos ${value} aqui.`, current.left.id, [current.id, current.left.id], { activeLine: 7 });
                    return;
                }
                parent = current;
                current = current.left;
            } else {
                this._renderStep(code, `${value} > ${current.value}. Seguimos para a direita e descartamos toda a subarvore esquerda deste no.`, current.id, current.right ? [current.id, current.right.id] : null, { activeLine: 10 });
                if (!current.right) {
                    current.right = this._createNode(value);
                    this.size++;
                    this._renderStep(code, `Posicao encontrada: filho direito vazio de ${current.value}. Inserimos ${value} aqui.`, current.right.id, [current.id, current.right.id], { activeLine: 10 });
                    return;
                }
                parent = current;
                current = current.right;
            }
        }
    }

    contains(value) {
        this._startOperation(`contains(${value})`);
        const code = `public boolean contains(int value) {\n    Node current = root;\n    while (current != null) {\n        if (value == current.value) return true;\n        current = value < current.value ? current.left : current.right;\n    }\n    return false;\n}`;

        let current = this.root;
        let parent = null;
        let visited = 0;
        const linearWorst = this.size;
        if (!current) {
            this._renderStep(code, 'Arvore vazia. Busca encerrada.', null, null, {
                activeLine: 2,
                containsComparison: {
                    value,
                    visited,
                    linearWorst,
                    pruned: Math.max(0, linearWorst - visited),
                    result: false,
                    decision: 'arvore-vazia',
                },
            });
            return false;
        }

        while (current) {
            visited += 1;
            this._renderStep(code, `Visitando no ${current.value}. Em BST, a busca nao varre todos os nos: ela segue um unico caminho decidido pela comparacao atual.`, current.id, parent ? [parent.id, current.id] : null, {
                activeLine: 3,
                containsComparison: {
                    value,
                    visited,
                    linearWorst,
                    pruned: Math.max(0, linearWorst - visited),
                    result: null,
                    decision: 'comparando',
                },
            });

            if (value === current.value) {
                this._renderStep(code, `Encontramos ${value}. Como a comparacao bateu, nao precisamos explorar o resto da arvore.`, current.id, parent ? [parent.id, current.id] : null, {
                    activeLine: 4,
                    containsComparison: {
                        value,
                        visited,
                        linearWorst,
                        pruned: Math.max(0, linearWorst - visited),
                        result: true,
                        decision: 'encontrado',
                    },
                });
                return true;
            }

            if (value < current.value) {
                this._renderStep(code, `${value} < ${current.value}. So a subarvore esquerda pode conter esse valor; a direita e descartada.`, current.id, current.left ? [current.id, current.left.id] : null, {
                    activeLine: 5,
                    containsComparison: {
                        value,
                        visited,
                        linearWorst,
                        pruned: Math.max(0, linearWorst - visited),
                        result: null,
                        decision: 'esquerda',
                    },
                });
                parent = current;
                current = current.left;
            } else {
                this._renderStep(code, `${value} > ${current.value}. So a subarvore direita pode conter esse valor; a esquerda e descartada.`, current.id, current.right ? [current.id, current.right.id] : null, {
                    activeLine: 5,
                    containsComparison: {
                        value,
                        visited,
                        linearWorst,
                        pruned: Math.max(0, linearWorst - visited),
                        result: null,
                        decision: 'direita',
                    },
                });
                parent = current;
                current = current.right;
            }
        }

        this._renderStep(code, `Valor ${value} nao encontrado no unico caminho possivel da BST.`, null, null, {
            activeLine: 7,
            containsComparison: {
                value,
                visited,
                linearWorst,
                pruned: Math.max(0, linearWorst - visited),
                result: false,
                decision: 'fim-do-caminho',
            },
        });
        return false;
    }

    bfs() {
        this._startOperation('bfs()');
        const code = `public List<Integer> bfs() {\n    Queue<Node> queue = new LinkedList<>();\n    List<Integer> result = new ArrayList<>();\n    if (root != null) queue.offer(root);\n    while (!queue.isEmpty()) {\n        Node node = queue.poll();\n        result.add(node.value);\n        if (node.left != null) queue.offer(node.left);\n        if (node.right != null) queue.offer(node.right);\n    }\n    return result;\n}`;

        if (!this.root) {
            this._renderStep(code, 'Arvore vazia. BFS encerrada.', null, null, {
                activeLine: 4,
                debugVars: { queue: [], result: [] },
            });
            return [];
        }

        const queue = [{ node: this.root, level: 0 }];
        const result = [];
        this._renderStep(code, `Inicializamos a fila com a raiz ${this.root.value}.`, this.root.id, null, {
            activeLine: 4,
            debugVars: { queue: queue.map((entry) => entry.node.value), result: [...result], level: 0 },
        });

        while (queue.length) {
            const current = queue.shift();
            const node = current.node;
            this._renderStep(code, `Removendo ${node.value} da fila para processar.`, node.id, null, {
                activeLine: 6,
                debugVars: { queue: queue.map((entry) => entry.node.value), result: [...result], current: node.value, level: current.level },
            });

            result.push(node.value);
            this._renderStep(code, `Visitando ${node.value} e adicionando ao resultado parcial.`, node.id, null, {
                activeLine: 7,
                debugVars: { queue: queue.map((entry) => entry.node.value), result: [...result], current: node.value, level: current.level },
            });

            if (node.left) {
                queue.push({ node: node.left, level: current.level + 1 });
                this._renderStep(code, `Enfileirando filho esquerdo ${node.left.value}.`, node.left.id, [node.id, node.left.id], {
                    activeLine: 8,
                    debugVars: { queue: queue.map((entry) => entry.node.value), result: [...result], current: node.value, level: current.level + 1 },
                });
            }

            if (node.right) {
                queue.push({ node: node.right, level: current.level + 1 });
                this._renderStep(code, `Enfileirando filho direito ${node.right.value}.`, node.right.id, [node.id, node.right.id], {
                    activeLine: 9,
                    debugVars: { queue: queue.map((entry) => entry.node.value), result: [...result], current: node.value, level: current.level + 1 },
                });
            }
        }

        this._renderStep(code, `BFS concluida. Ordem: ${result.join(' -> ')}.`, this.root.id, null, {
            activeLine: 11,
            debugVars: { queue: [], result: [...result], found: true },
        });
        return result;
    }

    dfs() {
        this._startOperation('dfs()');
        const code = `public List<Integer> dfs() {\n    Stack<Node> stack = new Stack<>();\n    List<Integer> result = new ArrayList<>();\n    if (root != null) stack.push(root);\n    while (!stack.isEmpty()) {\n        Node node = stack.pop();\n        result.add(node.value);\n        if (node.right != null) stack.push(node.right);\n        if (node.left != null) stack.push(node.left);\n    }\n    return result;\n}`;

        if (!this.root) {
            this._renderStep(code, 'Arvore vazia. DFS encerrada.', null, null, {
                activeLine: 4,
                debugVars: { stack: [], result: [] },
            });
            return [];
        }

        const stack = [this.root];
        const result = [];
        this._renderStep(code, `Inicializamos a pilha com a raiz ${this.root.value}.`, this.root.id, null, {
            activeLine: 4,
            debugVars: { stack: stack.map((node) => node.value), result: [...result] },
        });

        while (stack.length) {
            const node = stack.pop();
            this._renderStep(code, `Desempilhando ${node.value} para processar.`, node.id, null, {
                activeLine: 6,
                debugVars: { stack: stack.map((entry) => entry.value), result: [...result], current: node.value },
            });

            result.push(node.value);
            this._renderStep(code, `Visitando ${node.value} e adicionando ao resultado.`, node.id, null, {
                activeLine: 7,
                debugVars: { stack: stack.map((entry) => entry.value), result: [...result], current: node.value },
            });

            if (node.right) {
                stack.push(node.right);
                this._renderStep(code, `Empilhando filho direito ${node.right.value}.`, node.right.id, [node.id, node.right.id], {
                    activeLine: 8,
                    debugVars: { stack: stack.map((entry) => entry.value), result: [...result], current: node.value },
                });
            }

            if (node.left) {
                stack.push(node.left);
                this._renderStep(code, `Empilhando filho esquerdo ${node.left.value}.`, node.left.id, [node.id, node.left.id], {
                    activeLine: 9,
                    debugVars: { stack: stack.map((entry) => entry.value), result: [...result], current: node.value },
                });
            }
        }

        this._renderStep(code, `DFS concluida. Ordem: ${result.join(' -> ')}.`, this.root.id, null, {
            activeLine: 11,
            debugVars: { stack: [], result: [...result], found: true },
        });
        return result;
    }

    remove(value) {
        this._startOperation(`remove(${value})`);
        const code = `public void remove(int value) {\n    Node parent = null;\n    Node current = root;\n    while (current != null && current.value != value) {\n        parent = current;\n        current = value < current.value ? current.left : current.right;\n    }\n    if (current == null) return;\n}`;

        let parent = null;
        let current = this.root;

        if (!current) {
            this._renderStep(code, 'Arvore vazia. Nada para remover.', null, null);
            return false;
        }

        while (current && current.value !== value) {
            this._renderStep(code, `Comparando ${value} com ${current.value}.`, current.id, parent ? [parent.id, current.id] : null);
            parent = current;
            if (value < current.value) {
                this._renderStep(code, `${value} < ${current.value}. Descendo para a esquerda.`, current.id, current.left ? [current.id, current.left.id] : null);
                current = current.left;
            } else {
                this._renderStep(code, `${value} > ${current.value}. Descendo para a direita.`, current.id, current.right ? [current.id, current.right.id] : null);
                current = current.right;
            }
        }

        if (!current) {
            this._renderStep(code, `Valor ${value} nao encontrado para remocao.`, null, null);
            return false;
        }

        this._renderStep(code, `Encontramos ${value} para remocao.`, current.id, parent ? [parent.id, current.id] : null);

        if (!current.left && !current.right) {
            this._unlinkFromParent(parent, current, null);
            this.size--;
            this._renderStep(code, `Caso 1: ${value} era folha. Remocao direta.`, parent ? parent.id : null, parent ? null : null);
            return true;
        }

        if (!current.left || !current.right) {
            const child = current.left || current.right;
            this._unlinkFromParent(parent, current, child);
            this.size--;
            this._renderStep(code, `Caso 2: ${value} tinha um filho. Reencadeando ${child.value}.`, child.id, parent && child ? [parent.id, child.id] : null);
            return true;
        }

        let successorParent = current;
        let successor = current.right;
        this._renderStep(code, `Caso 3: ${value} tem dois filhos. Procurando sucessor em ordem.`, current.id, [current.id, current.right.id]);

        while (successor.left) {
            successorParent = successor;
            successor = successor.left;
            this._renderStep(code, `Indo para a esquerda para achar o menor da subarvore direita: ${successor.value}.`, successor.id, [successorParent.id, successor.id]);
        }

        current.value = successor.value;
        current.memoryAddress = current.memoryAddress;
        this._renderStep(code, `Copiando valor do sucessor ${successor.value} para o no removido.`, current.id, [current.id, current.right ? current.right.id : current.id]);

        const successorChild = successor.right;
        this._unlinkFromParent(successorParent, successor, successorChild);
        this.size--;
        this._renderStep(code, `Removendo o sucessor original ${successor.value}.`, successorParent.id, successorChild ? [successorParent.id, successorChild.id] : null);
        return true;
    }

    _unlinkFromParent(parent, current, replacement) {
        if (!parent) {
            this.root = replacement;
            return;
        }

        if (parent.left === current) {
            parent.left = replacement;
        } else if (parent.right === current) {
            parent.right = replacement;
        }
    }

    clear() {
        this._startOperation('clear()');
        this.root = null;
        this.size = 0;
        this._renderStep('', 'BST reinicializada.', null, null);
    }
}