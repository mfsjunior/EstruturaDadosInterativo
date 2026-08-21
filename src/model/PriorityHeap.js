class PriorityHeap {
    constructor(capacity = 15) {
        this.capacity = capacity;
        this.size = 0;
        this.data = new Array(this.capacity);
        this.steps = [];
        this.baseAddress = 0x4000;
        this.elementSize = 4;
    }

    _addStep(type, payload, codeSnippet = '', description = '') {
        const stepPayload = payload && typeof payload === 'object' ? { ...payload } : {};
        if (!stepPayload.cloud) stepPayload.cloud = this._cloudText(description);
        this.steps.push(new Step(type, stepPayload, codeSnippet, description));
    }

    _cloudText(description) {
        const cleaned = String(description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (!cleaned) return '';
        const happened = cleaned.endsWith('.') ? cleaned.slice(0, -1) : cleaned;
        const importance = this._importanceForCloud(happened);
        const full = `O que aconteceu: ${happened}. Por que isso importa: ${importance}`;
        return full.length > 220 ? `${full.slice(0, 217)}...` : full;
    }

    _importanceForCloud(happened) {
        const text = String(happened || '').toLowerCase();
        if (text.includes('subindo') || text.includes('descendo')) return 'trocas locais mantem a propriedade de heap sem reorganizar tudo.';
        if (text.includes('raiz')) return 'a raiz sempre mostra o menor elemento do min-heap.';
        if (text.includes('heap cheio') || text.includes('vazio')) return 'validar limites evita operacoes invalidas.';
        return 'o heap organiza prioridades em forma de arvore para acesso rapido ao extremo.';
    }

    _startOperation(name) {
        this.steps = [];
        this._addStep('INFO', {}, `// Iniciando ${name}`, `Operacao iniciada: ${name}. Tamanho atual: ${this.size}.`);
    }

    _statePayload() {
        return {
            head: this.size > 0 ? `min@${this.data[0]}` : '-',
            tail: this.size > 0 ? `idx@${this.size - 1}` : '-',
            size: this.size,
        };
    }

    getSteps() {
        const copy = [...this.steps];
        this.steps = [];
        return copy;
    }

    insert(value) {
        this._startOperation(`insert(${value})`);
        const code = `public void insert(int value) {\n    if (size == capacity) throw new IllegalStateException();\n    heap[size] = value;\n    int i = size;\n    size++;\n    while (i > 0 && heap[parent(i)] > heap[i]) {\n        swap(i, parent(i));\n        i = parent(i);\n    }\n}`;

        if (this.size === this.capacity) {
            this._addStep('ERROR', {}, code, 'Heap cheio. Nao foi possivel inserir.');
            return;
        }

        const index = this.size;
        this.data[index] = value;
        this.size++;
        this._addStep('ARRAY_INSERT', {
            index,
            value,
            size: this.size,
            highlightIndices: [index],
            highlightEdges: index > 0 ? [[Math.floor((index - 1) / 2), index]] : [],
        }, code, `Inserindo ${value} no indice ${index}.`);

        let i = index;
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.data[parent] <= this.data[i]) break;

            const temp = this.data[parent];
            this.data[parent] = this.data[i];
            this.data[i] = temp;

            this._addStep('ARRAY_INSERT', {
                index: parent,
                value: this.data[parent],
                size: this.size,
                highlightIndices: [parent, i],
                highlightEdges: [[parent, i]],
            }, code, `Subindo ${this.data[parent]} para manter propriedade de heap.`);
            this._addStep('ARRAY_INSERT', {
                index: i,
                value: this.data[i],
                size: this.size,
                highlightIndices: [parent, i],
                highlightEdges: [[parent, i]],
            }, code, `Descendo ${this.data[i]} para o indice ${i}.`);
            i = parent;
        }

        this._addStep('UPDATE_STATE', this._statePayload(), code, 'Estado do heap atualizado.');
    }

    extractMin() {
        this._startOperation('extractMin()');
        const code = `public int extractMin() {\n    if (size == 0) return -1;\n    int min = heap[0];\n    heap[0] = heap[size - 1];\n    heap[size - 1] = 0;\n    size--;\n    heapifyDown(0);\n    return min;\n}`;

        if (this.size === 0) {
            this._addStep('ERROR', {}, code, 'Heap vazio. Nada para remover.');
            return null;
        }

        const min = this.data[0];
        this._addStep('ARRAY_DIRECT_ACCESS', {
            index: 0,
            highlightIndices: [0],
            highlightEdges: [[0, 1], [0, 2]],
        }, code, `Menor elemento atual (raiz): ${min}.`);

        if (this.size === 1) {
            this.data[0] = undefined;
            this.size = 0;
            this._addStep('ARRAY_REMOVE_END', {
                index: 0,
                size: 0,
                highlightIndices: [0],
                highlightEdges: [],
            }, code, `Removendo unico elemento ${min}.`);
            this._addStep('UPDATE_STATE', this._statePayload(), code, 'Heap ficou vazio.');
            return min;
        }

        const lastIndex = this.size - 1;
        const replacement = this.data[lastIndex];
        this.data[0] = replacement;
        this._addStep('ARRAY_INSERT', {
            index: 0,
            value: replacement,
            size: this.size,
            highlightIndices: [0, lastIndex],
            highlightEdges: [],
        }, code, `Movendo ultimo elemento ${replacement} para a raiz.`);

        this.data[lastIndex] = undefined;
        this.size--;
        this._addStep('ARRAY_REMOVE_END', {
            index: lastIndex,
            size: this.size,
            highlightIndices: [0, lastIndex],
            highlightEdges: [],
        }, code, `Removendo posicao final apos extracao.`);

        let i = 0;
        while (true) {
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            let smallest = i;

            if (left < this.size && this.data[left] < this.data[smallest]) smallest = left;
            if (right < this.size && this.data[right] < this.data[smallest]) smallest = right;
            if (smallest === i) break;

            const tmp = this.data[i];
            this.data[i] = this.data[smallest];
            this.data[smallest] = tmp;

            this._addStep('ARRAY_INSERT', {
                index: i,
                value: this.data[i],
                size: this.size,
                highlightIndices: [i, smallest],
                highlightEdges: [[i, smallest]],
            }, code, `Descendo elemento para preservar min-heap.`);
            this._addStep('ARRAY_INSERT', {
                index: smallest,
                value: this.data[smallest],
                size: this.size,
                highlightIndices: [i, smallest],
                highlightEdges: [[i, smallest]],
            }, code, `Ajuste de troca no indice ${smallest}.`);
            i = smallest;
        }

        this._addStep('UPDATE_STATE', this._statePayload(), code, `Extracao concluida. Minimo removido: ${min}.`);
        return min;
    }

    peek() {
        this._startOperation('peek()');
        const code = `public int peek() {\n    if (size == 0) return -1;\n    return heap[0];\n}`;

        if (this.size === 0) {
            this._addStep('ERROR', {}, code, 'Heap vazio.');
            return null;
        }

        this._addStep('ARRAY_DIRECT_ACCESS', {
            index: 0,
            highlightIndices: [0],
            highlightEdges: [[0, 1], [0, 2]],
        }, code, `Peek retornou ${this.data[0]} na raiz.`);
        this._addStep('UPDATE_STATE', this._statePayload(), code, 'Estado preservado.');
        return this.data[0];
    }

    clear() {
        this._startOperation('clear()');
        this.size = 0;
        this.data = new Array(this.capacity);
        this._addStep('ARRAY_CLEAR', { capacity: this.capacity }, '', 'Heap reinicializado.');
        this._addStep('UPDATE_STATE', this._statePayload(), '', 'Heap vazio.');
    }
}
