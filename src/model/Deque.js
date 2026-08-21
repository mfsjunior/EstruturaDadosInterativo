class Deque {
    constructor(capacity = 8) {
        this.capacity = Math.max(4, Number(capacity) || 8);
        this.size = 0;
        this.front = 0;
        this.rear = 0;
        this.data = new Array(this.capacity);
        this.steps = [];
        this.baseAddress = 0xA000;
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
        if (text.includes('frente')) return 'o deque permite inserir e remover pela frente em O(1).';
        if (text.includes('fundo') || text.includes('traseira')) return 'o deque tambem opera no fundo em O(1), sem deslocar elementos.';
        if (text.includes('circular')) return 'o buffer circular reaproveita espaco e evita mover o array inteiro.';
        if (text.includes('vazio') || text.includes('cheio')) return 'validar limites evita acesso invalido e perda de dados.';
        return 'deque combina comportamentos de fila e pilha com eficiencia.';
    }

    _startOperation(name) {
        this.steps = [];
        this._addStep('INFO', {}, `// Iniciando ${name}`, `Operacao iniciada: ${name}. Tamanho atual: ${this.size}.`);
    }

    _statePayload() {
        const head = this.size > 0 ? `front@${this.front}` : '-';
        const rearIndex = this.size > 0 ? (this.rear - 1 + this.capacity) % this.capacity : -1;
        const tail = rearIndex >= 0 ? `rear@${rearIndex}` : '-';
        return { head, tail, size: this.size };
    }

    getSteps() {
        const copy = [...this.steps];
        this.steps = [];
        return copy;
    }

    pushFront(value) {
        this._startOperation(`pushFront(${value})`);
        const code = `public void pushFront(T value) {\n    if (size == capacity) throw new IllegalStateException();\n    front = (front - 1 + capacity) % capacity;\n    array[front] = value;\n    size++;\n}`;

        if (this.size === this.capacity) {
            this._addStep('ERROR', {}, code, 'Deque cheio. Nao foi possivel inserir na frente.');
            return;
        }

        this.front = (this.front - 1 + this.capacity) % this.capacity;
        this.data[this.front] = value;
        this.size++;

        this._addStep('ARRAY_INSERT', { index: this.front, value, size: this.size }, code, `PushFront inseriu ${value} na frente (indice ${this.front}).`);
        this._addStep('UPDATE_STATE', this._statePayload(), code, 'Ponteiros front/rear atualizados.');
    }

    pushBack(value) {
        this._startOperation(`pushBack(${value})`);
        const code = `public void pushBack(T value) {\n    if (size == capacity) throw new IllegalStateException();\n    array[rear] = value;\n    rear = (rear + 1) % capacity;\n    size++;\n}`;

        if (this.size === this.capacity) {
            this._addStep('ERROR', {}, code, 'Deque cheio. Nao foi possivel inserir no fundo.');
            return;
        }

        const index = this.rear;
        this.data[index] = value;
        this.rear = (this.rear + 1) % this.capacity;
        this.size++;

        this._addStep('ARRAY_INSERT', { index, value, size: this.size }, code, `PushBack inseriu ${value} no fundo (indice ${index}).`);
        this._addStep('UPDATE_STATE', this._statePayload(), code, 'Ponteiros front/rear atualizados.');
    }

    popFront() {
        this._startOperation('popFront()');
        const code = `public T popFront() {\n    if (size == 0) return null;\n    T value = array[front];\n    array[front] = null;\n    front = (front + 1) % capacity;\n    size--;\n    return value;\n}`;

        if (this.size === 0) {
            this._addStep('ERROR', {}, code, 'Deque vazio. Nao ha elemento na frente.');
            return null;
        }

        const index = this.front;
        const value = this.data[index];
        this._addStep('ARRAY_DIRECT_ACCESS', { index }, code, `Lendo frente do deque no indice ${index}.`);

        this.data[index] = undefined;
        this.front = (this.front + 1) % this.capacity;
        this.size--;

        if (this.size === 0) {
            this.front = 0;
            this.rear = 0;
        }

        this._addStep('ARRAY_REMOVE_END', { index, size: this.size }, code, `PopFront removeu ${value} da frente.`);
        this._addStep('UPDATE_STATE', this._statePayload(), code, 'Ponteiros front/rear atualizados.');
        return value;
    }

    popBack() {
        this._startOperation('popBack()');
        const code = `public T popBack() {\n    if (size == 0) return null;\n    rear = (rear - 1 + capacity) % capacity;\n    T value = array[rear];\n    array[rear] = null;\n    size--;\n    return value;\n}`;

        if (this.size === 0) {
            this._addStep('ERROR', {}, code, 'Deque vazio. Nao ha elemento no fundo.');
            return null;
        }

        this.rear = (this.rear - 1 + this.capacity) % this.capacity;
        const index = this.rear;
        const value = this.data[index];
        this._addStep('ARRAY_DIRECT_ACCESS', { index }, code, `Lendo fundo do deque no indice ${index}.`);

        this.data[index] = undefined;
        this.size--;

        if (this.size === 0) {
            this.front = 0;
            this.rear = 0;
        }

        this._addStep('ARRAY_REMOVE_END', { index, size: this.size }, code, `PopBack removeu ${value} do fundo.`);
        this._addStep('UPDATE_STATE', this._statePayload(), code, 'Ponteiros front/rear atualizados.');
        return value;
    }

    peekFront() {
        this._startOperation('peekFront()');
        const code = `public T peekFront() {\n    if (size == 0) return null;\n    return array[front];\n}`;

        if (this.size === 0) {
            this._addStep('ERROR', {}, code, 'Deque vazio.');
            return null;
        }

        const index = this.front;
        const value = this.data[index];
        this._addStep('ARRAY_DIRECT_ACCESS', { index }, code, `PeekFront encontrou ${value} no indice ${index}.`);
        this._addStep('UPDATE_STATE', this._statePayload(), code, 'Ponteiros preservados.');
        return value;
    }

    peekBack() {
        this._startOperation('peekBack()');
        const code = `public T peekBack() {\n    if (size == 0) return null;\n    int idx = (rear - 1 + capacity) % capacity;\n    return array[idx];\n}`;

        if (this.size === 0) {
            this._addStep('ERROR', {}, code, 'Deque vazio.');
            return null;
        }

        const index = (this.rear - 1 + this.capacity) % this.capacity;
        const value = this.data[index];
        this._addStep('ARRAY_DIRECT_ACCESS', { index }, code, `PeekBack encontrou ${value} no indice ${index}.`);
        this._addStep('UPDATE_STATE', this._statePayload(), code, 'Ponteiros preservados.');
        return value;
    }

    clear() {
        this._startOperation('clear()');
        this.size = 0;
        this.front = 0;
        this.rear = 0;
        this.data = new Array(this.capacity);
        this._addStep('ARRAY_CLEAR', { capacity: this.capacity, baseAddress: this.baseAddress, elementSize: this.elementSize }, '', 'Deque reinicializado.');
        this._addStep('UPDATE_STATE', this._statePayload(), '', 'Deque vazio.');
    }
}
