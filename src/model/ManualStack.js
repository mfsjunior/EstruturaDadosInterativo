class ManualStack {
    constructor(capacity = 8) {
        this.capacity = capacity;
        this.size = 0;
        this.data = new Array(this.capacity);
        this.steps = [];
        this.baseAddress = 0x2000;
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
        if (text.includes('topo')) return 'a pilha sempre trabalha com o ultimo elemento inserido.';
        if (text.includes('resize')) return 'crescer a pilha evita estouro, mas copiar os elementos custa O(n).';
        if (text.includes('vazia')) return 'casos vazios evitam acesso invalido ao topo.';
        return 'a pilha segue LIFO: o ultimo que entra e o primeiro que sai.';
    }

    _startOperation(name) {
        this.steps = [];
        this._addStep('INFO', {}, `// Iniciando ${name}`, `Operacao iniciada: ${name}. Tamanho atual: ${this.size}.`);
    }

    _topLabel() {
        return this.size > 0 ? `top@${this.size - 1}` : '-';
    }

    getSteps() {
        const copy = [...this.steps];
        this.steps = [];
        return copy;
    }

    push(value) {
        this._startOperation(`push(${value})`);
        const code = `public void push(T value) {\n    if (size == capacity) resize();\n    array[size] = value;\n    size++;\n}`;

        if (this.size === this.capacity) {
            this._addStep('INFO', {}, code, `Capacidade atingida (${this.capacity}). Realocando pilha...`);
            this._resize(code);
        }

        const index = this.size;
        this.data[index] = value;
        this.size++;

        this._addStep('ARRAY_INSERT', { index, value, size: this.size }, code, `Push de ${value} no topo da pilha (indice ${index}).`);
        this._addStep('UPDATE_STATE', { head: '-', tail: this._topLabel(), size: this.size }, code, `Topo agora esta em ${this._topLabel()}.`);
    }

    pop() {
        this._startOperation('pop()');
        const code = `public T pop() {\n    if (size == 0) return null;\n    T removed = array[size - 1];\n    array[size - 1] = null;\n    size--;\n    return removed;\n}`;

        if (this.size === 0) {
            this._addStep('ERROR', {}, code, 'Pilha vazia. Nada para remover.');
            return null;
        }

        const index = this.size - 1;
        const value = this.data[index];
        this._addStep('ARRAY_DIRECT_ACCESS', { index, isSuccess: true }, code, `Lendo topo atual no indice ${index}.`);

        this.data[index] = undefined;
        this.size--;
        this._addStep('ARRAY_REMOVE_END', { index, size: this.size }, code, `Pop removeu ${value} do topo.`);
        this._addStep('UPDATE_STATE', { head: '-', tail: this._topLabel(), size: this.size }, code, `Novo topo: ${this._topLabel()}.`);
        return value;
    }

    peek() {
        this._startOperation('peek()');
        const code = `public T peek() {\n    if (size == 0) return null;\n    return array[size - 1];\n}`;

        if (this.size === 0) {
            this._addStep('ERROR', {}, code, 'Pilha vazia.');
            return null;
        }

        const index = this.size - 1;
        const value = this.data[index];
        this._addStep('ARRAY_DIRECT_ACCESS', { index, isSuccess: true }, code, `Peek no topo (indice ${index}) retornou ${value}.`);
        this._addStep('UPDATE_STATE', { head: '-', tail: this._topLabel(), size: this.size }, code, `Topo permanece em ${this._topLabel()}.`);
        return value;
    }

    clear() {
        this._startOperation('clear()');
        this.capacity = 8;
        this.size = 0;
        this.data = new Array(this.capacity);
        this.baseAddress = 0x2000;
        this._addStep('ARRAY_CLEAR', { capacity: this.capacity }, '', 'Pilha reinicializada.');
        this._addStep('UPDATE_STATE', { head: '-', tail: '-', size: 0 }, '', 'Pilha vazia.');
    }

    _resize(parentCode) {
        const code = `private void resize() {\n    T[] newArray = (T[]) new Object[capacity * 2];\n    for (int i = 0; i < size; i++) newArray[i] = array[i];\n    array = newArray;\n}`;

        const newCapacity = this.capacity * 2;
        const newBaseAddress = this.baseAddress + 0x4000;
        this._addStep('ARRAY_RESIZE_START', { oldCapacity: this.capacity, newCapacity, newBaseAddress }, code, `Criando nova pilha com capacidade ${newCapacity}.`);

        const newData = new Array(newCapacity);
        for (let i = 0; i < this.size; i++) {
            newData[i] = this.data[i];
            this._addStep('ARRAY_RESIZE_COPY', { index: i, value: this.data[i] }, code, `Copiando ${this.data[i]} para indice ${i}.`);
        }

        this.data = newData;
        this.capacity = newCapacity;
        this.baseAddress = newBaseAddress;
        this._addStep('ARRAY_RESIZE_END', { newCapacity }, parentCode, 'Resize concluido.');
    }
}
