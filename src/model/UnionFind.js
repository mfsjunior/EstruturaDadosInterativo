class UnionFind {
    constructor(size = 8) {
        this.defaultSize = Math.max(2, Number(size) || 8);
        this.size = this.defaultSize;
        this.parent = [];
        this.rank = [];
        this.components = 0;
        this.steps = [];
        this.baseAddress = 0x8000;
        this.elementSize = 4;
        this.reset(this.defaultSize);
        this.steps = [];
    }

    _snapshot() {
        return {
            capacity: this.size,
            baseAddress: this.baseAddress,
            elementSize: this.elementSize,
            size: this.size,
            data: [...this.parent],
            relationLabels: this.rank.map((value) => `rank=${value}`),
        };
    }

    _statePayload() {
        return {
            head: `componentes ${this.components}`,
            tail: `nos ${this.size}`,
            size: this.size,
        };
    }

    _cloud(type, data = {}, description = '') {
        if (type === 'UF_INIT') return 'Cada no inicia como seu proprio pai; todos os conjuntos comecam separados.';
        if (type === 'UF_VISIT') return `No ${data.index} aponta para ${data.parent}. Seguimos ate a raiz.`;
        if (type === 'UF_COMPRESS') return `Compressao de caminho: no ${data.index} passa a apontar direto para a raiz ${data.root}.`;
        if (type === 'UF_UNION') return `Uniao por rank: raiz ${data.childRoot} agora pertence a raiz ${data.parentRoot}.`;
        if (type === 'UF_RESULT') return String(description || 'Resultado da operacao calculado.');
        if (type === 'INFO') return String(description || 'Resumo da operacao atual.');
        return 'Union-Find responde conectividade quase em O(1) amortizado com compressao de caminho.';
    }

    _addStep(type, payload = {}, codeLine = '', description = '') {
        const data = { ...(payload || {}) };
        data.algorithm = 'UNION_FIND';
        data.cloud = data.cloud || this._cloud(type, data, description);
        this.steps.push(new Step(type, data, codeLine, description));
    }

    getSteps() {
        const output = [...this.steps];
        this.steps = [];
        return output;
    }

    _startOperation(name) {
        this.steps = [];
        this._addStep('INFO', {}, `// ${name}`, `Operacao iniciada: ${name}.`);
    }

    reset(size = this.defaultSize) {
        this._startOperation(`reset(${size})`);
        this.size = Math.max(2, Number(size) || this.defaultSize);
        this.parent = new Array(this.size);
        this.rank = new Array(this.size).fill(0);
        this.components = this.size;

        for (let i = 0; i < this.size; i += 1) {
            this.parent[i] = i;
        }

        this._addStep('UF_INIT', this._snapshot(), 'for (int i = 0; i < n; i++) parent[i] = i;', `Union-Find inicializado com ${this.size} nos.`);
        this._addStep('UPDATE_STATE', this._statePayload(), '', 'Estado atualizado.');
        this._addStep('COMPLEXITY', { value: 'O(n)', desc: 'Inicializa parent e rank de todos os nos.' }, '', 'Inicializacao concluida.');
    }

    _validateIndex(index) {
        return Number.isInteger(index) && index >= 0 && index < this.size;
    }

    _findRoot(index, enableCompression = true) {
        const code = 'while (x != parent[x]) x = parent[x];';
        let node = index;
        const path = [];

        while (node !== this.parent[node]) {
            path.push(node);
            this._addStep('UF_VISIT', {
                index: node,
                parent: this.parent[node],
            }, code, `Subindo de ${node} para ${this.parent[node]}.`);
            node = this.parent[node];
        }

        this._addStep('UF_VISIT', {
            index: node,
            parent: this.parent[node],
            isRoot: true,
        }, code, `Raiz encontrada: ${node}.`);

        if (enableCompression) {
            path.forEach((item) => {
                this.parent[item] = node;
                this._addStep('UF_COMPRESS', {
                    index: item,
                    root: node,
                    snapshot: this._snapshot(),
                }, 'parent[v] = root;', `Comprimindo caminho: parent[${item}] = ${node}.`);
            });
        }

        return node;
    }

    find(index) {
        const value = Number(index);
        this._startOperation(`find(${value})`);
        if (!this._validateIndex(value)) {
            this._addStep('ERROR', {}, '', `Indice invalido para find: ${index}.`);
            return -1;
        }

        const root = this._findRoot(value, true);
        this._addStep('UF_RESULT', { index: value, root }, 'return root;', `Representante de ${value} = ${root}.`);
        this._addStep('UPDATE_STATE', this._statePayload(), '', 'Estado atualizado.');
        this._addStep('COMPLEXITY', { value: 'O(alpha(n))', desc: 'Find com compressao de caminho.' }, '', 'Busca concluida.');
        return root;
    }

    union(a, b) {
        const x = Number(a);
        const y = Number(b);
        this._startOperation(`union(${x}, ${y})`);
        if (!this._validateIndex(x) || !this._validateIndex(y)) {
            this._addStep('ERROR', {}, '', `Indices invalidos para union: ${a}, ${b}.`);
            return false;
        }

        const rootX = this._findRoot(x, true);
        const rootY = this._findRoot(y, true);
        if (rootX === rootY) {
            this._addStep('UF_RESULT', { root: rootX }, '', `Nos ${x} e ${y} ja estao no mesmo conjunto.`);
            this._addStep('COMPLEXITY', { value: 'O(alpha(n))', desc: 'Apenas finds, sem alterar estrutura.' }, '', 'Uniao concluida.');
            return false;
        }

        let parentRoot = rootX;
        let childRoot = rootY;
        if (this.rank[parentRoot] < this.rank[childRoot]) {
            parentRoot = rootY;
            childRoot = rootX;
        }

        this.parent[childRoot] = parentRoot;
        if (this.rank[parentRoot] === this.rank[childRoot]) {
            this.rank[parentRoot] += 1;
        }
        this.components -= 1;

        this._addStep('UF_UNION', {
            parentRoot,
            childRoot,
            rankParent: this.rank[parentRoot],
            rankChild: this.rank[childRoot],
            snapshot: this._snapshot(),
        }, 'if (rank[rx] < rank[ry]) swap(rx, ry); parent[ry] = rx;', `Unindo raizes ${rootX} e ${rootY}.`);
        this._addStep('UPDATE_STATE', this._statePayload(), '', 'Estado atualizado apos uniao.');
        this._addStep('COMPLEXITY', { value: 'O(alpha(n))', desc: 'Union por rank com compressao de caminho.' }, '', 'Uniao concluida.');
        return true;
    }

    connected(a, b) {
        const x = Number(a);
        const y = Number(b);
        this._startOperation(`connected(${x}, ${y})`);
        if (!this._validateIndex(x) || !this._validateIndex(y)) {
            this._addStep('ERROR', {}, '', `Indices invalidos para connected: ${a}, ${b}.`);
            return false;
        }

        const rootX = this._findRoot(x, true);
        const rootY = this._findRoot(y, true);
        const result = rootX === rootY;
        this._addStep('UF_RESULT', { a: x, b: y, rootX, rootY, result }, 'return find(a) == find(b);', `connected(${x}, ${y}) = ${result ? 'true' : 'false'}.`);
        this._addStep('UPDATE_STATE', this._statePayload(), '', 'Estado atualizado.');
        this._addStep('COMPLEXITY', { value: 'O(alpha(n))', desc: 'Connected usa duas operacoes find.' }, '', 'Consulta concluida.');
        return result;
    }
}