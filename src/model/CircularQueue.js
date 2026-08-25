class CircularQueue {
    constructor(capacity = 8) {
        this.capacity = capacity;
        this.size = 0;
        this.front = 0;
        this.rear = 0;
        this.data = new Array(this.capacity);
        this.steps = [];
        this.baseAddress = 0x3000;
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
        if (text.includes('frente')) return 'a fila sempre remove primeiro o elemento que chegou primeiro.';
        if (text.includes('rear') || text.includes('cauda')) return 'o rear mostra onde o proximo elemento sera inserido sem quebrar o ciclo.';
        if (text.includes('circular')) return 'o uso do modulo reaproveita o espaco sem mover a fila inteira.';
        if (text.includes('vazia') || text.includes('cheia')) return 'checar limites evita perda de dados e acessos invalidos.';
        return 'a fila segue FIFO: o primeiro que entra e o primeiro que sai.';
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

    enqueue(value) {
        this._startOperation(`enqueue(${value})`);
        const code = `public void enqueue(T value) {\n    if (size == capacity) throw new FullException();\n    array[rear] = value;\n    rear = (rear + 1) % capacity;\n    size++;\n}`;

        this._addStep('STEP', { activeLine: 2 }, code, `Verificando se a fila esta cheia (size == capacity).`);

        if (this.size === this.capacity) {
            this._addStep('ERROR', { activeLine: 2 }, code, 'Fila circular cheia. Nao foi possivel inserir.');
            return;
        }

        const index = this.rear;
        this.data[index] = value;
        this.rear = (this.rear + 1) % this.capacity;
        this.size++;

        this._addStep('ARRAY_INSERT', { index, value, size: this.size, activeLine: 3 }, code, `Enqueue de ${value} na posicao circular ${index}.`);
        this._addStep('UPDATE_STATE', { ...this._statePayload(), activeLine: 4 }, code, 'Ponteiros front/rear atualizados.');
    }

    dequeue() {
        this._startOperation('dequeue()');
        const code = `public T dequeue() {\n    if (size == 0) return null;\n    T value = array[front];\n    array[front] = null;\n    front = (front + 1) % capacity;\n    size--;\n    return value;\n}`;

        this._addStep('STEP', { activeLine: 2 }, code, `Verificando se a fila esta vazia (size == 0).`);

        if (this.size === 0) {
            this._addStep('ERROR', { activeLine: 2 }, code, 'Fila circular vazia.');
            return null;
        }

        const index = this.front;
        const value = this.data[index];
        this._addStep('ARRAY_DIRECT_ACCESS', { index, activeLine: 3 }, code, `Lendo frente da fila no indice ${index}.`);

        this.data[index] = undefined;
        this.front = (this.front + 1) % this.capacity;
        this.size--;
        if (this.size === 0) {
            this.front = 0;
            this.rear = 0;
        }

        this._addStep('ARRAY_REMOVE_END', { index, size: this.size, activeLine: 4 }, code, `Dequeue removeu ${value} da frente.`);
        this._addStep('UPDATE_STATE', { ...this._statePayload(), activeLine: 5 }, code, 'Ponteiros front/rear atualizados.');
        return value;
    }

    peek() {
        this._startOperation('peek()');
        const code = `public T peek() {\n    if (size == 0) return null;\n    return array[front];\n}`;

        if (this.size === 0) {
            this._addStep('ERROR', { activeLine: 2 }, code, 'Fila circular vazia.');
            return null;
        }

        const index = this.front;
        const value = this.data[index];
        this._addStep('ARRAY_DIRECT_ACCESS', { index, isSuccess: true, activeLine: 3 }, code, `Peek (frente) retornou ${value} no indice ${index}.`);
        this._addStep('UPDATE_STATE', { ...this._statePayload(), activeLine: 3 }, code, 'Estado da fila circular inalterado.');
        return value;
    }

    clear() {
        this._startOperation('clear()');
        this.size = 0;
        this.front = 0;
        this.rear = 0;
        this.data = new Array(this.capacity);
        this._addStep('ARRAY_CLEAR', { capacity: this.capacity }, '', 'Fila circular reinicializada.');
        this._addStep('UPDATE_STATE', this._statePayload(), '', 'Fila vazia.');
    }
}
