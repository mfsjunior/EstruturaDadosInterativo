class HashTable {
    constructor(capacity = 11) {
        this.capacity = capacity;
        this.size = 0;
        this.slots = new Array(this.capacity).fill(null);
        this.steps = [];
        this.baseAddress = 0x5000;
        this.elementSize = 4;
        this.deletedMarker = { deleted: true };
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
        if (text.includes('sondando') || text.includes('consultando')) return 'a sondagem mostra como colisões sao tratadas passo a passo.';
        if (text.includes('tombstone') || text.includes('del')) return 'tombstones preservam a busca apos remocoes sem quebrar a sondagem.';
        if (text.includes('atualizando')) return 'atualizar a chave no mesmo slot evita duplicar a entrada.';
        if (text.includes('vazia') || text.includes('cheia')) return 'o estado da tabela define se a insercao ou busca pode continuar.';
        return 'a hash usa indice calculado e sondagem para encontrar o slot correto.';
    }

    _startOperation(name) {
        this.steps = [];
        this._addStep('INFO', {}, `// Iniciando ${name}`, `Operacao iniciada: ${name}. Tamanho atual: ${this.size}.`);
    }

    _stringifyValue(entry) {
        if (!entry) return null;
        if (entry.deleted) return 'DEL';
        return `k:${entry.key}\nv:${entry.value}`;
    }

    _hash(key) {
        const raw = String(key);
        let total = 0;
        for (let i = 0; i < raw.length; i++) {
            total += raw.charCodeAt(i);
        }
        return total % this.capacity;
    }

    _statePayload(hashIndex = '-', collisions = 0) {
        return {
            head: hashIndex === '-' ? '-' : `hash@${hashIndex}`,
            tail: `col@${collisions}`,
            size: this.size,
        };
    }

    _snapshotData() {
        return this.slots.map((entry) => this._stringifyValue(entry));
    }

    _probeMeta(hashIndex, visitedIndices, collisions, activeIndex, hitIndex = null) {
        return {
            hashIndex,
            probePath: [...visitedIndices],
            collisionIndices: [...collisions],
            activeIndex,
            hitIndex,
        };
    }

    getSteps() {
        const copy = [...this.steps];
        this.steps = [];
        return copy;
    }

    put(key, value) {
        this._startOperation(`put(${key}, ${value})`);
        const code = `public void put(String key, String value) {\n    int hash = hash(key);\n    for (int i = 0; i < capacity; i++) {\n        int index = (hash + i) % capacity;\n        if (table[index] == null || table[index].deleted || table[index].key.equals(key)) {\n            table[index] = new Entry(key, value);\n            return;\n        }\n    }\n}`;

        if (this.size === this.capacity) {
            this._addStep('ERROR', {}, code, 'Tabela Hash cheia. Nao foi possivel inserir.');
            return;
        }

        const hashIndex = this._hash(key);
        let collisions = 0;
        let reusableIndex = -1;
        const visitedIndices = [];
        const collisionIndices = [];

        for (let offset = 0; offset < this.capacity; offset++) {
            const index = (hashIndex + offset) % this.capacity;
            const entry = this.slots[index];
            visitedIndices.push(index);

            this._addStep('ARRAY_DIRECT_ACCESS', {
                index,
                ...this._probeMeta(hashIndex, visitedIndices, collisionIndices, index),
            }, code, `Sondando indice ${index} (hash base ${hashIndex}).`);

            if (entry === this.deletedMarker && reusableIndex < 0) {
                reusableIndex = index;
            }

            if (entry === null) {
                const targetIndex = reusableIndex >= 0 ? reusableIndex : index;
                const wasEmpty = this.slots[targetIndex] === null || this.slots[targetIndex] === this.deletedMarker;
                this.slots[targetIndex] = { key, value };
                if (wasEmpty) this.size++;
                this._addStep('ARRAY_INSERT', {
                    index: targetIndex,
                    value: `${key}:${value}`,
                    size: this.size,
                    ...this._probeMeta(hashIndex, visitedIndices, collisionIndices, targetIndex, targetIndex),
                }, code, `Inserindo chave ${key} no indice ${targetIndex}.`);
                this._addStep('UPDATE_STATE', {
                    ...this._statePayload(hashIndex, collisions),
                    ...this._probeMeta(hashIndex, visitedIndices, collisionIndices, targetIndex, targetIndex),
                }, code, 'Estado da tabela atualizado.');
                return;
            }

            if (entry !== this.deletedMarker && entry.key === key) {
                this.slots[index] = { key, value };
                this._addStep('ARRAY_INSERT', {
                    index,
                    value: `${key}:${value}`,
                    size: this.size,
                    ...this._probeMeta(hashIndex, visitedIndices, collisionIndices, index, index),
                }, code, `Atualizando chave ${key} no indice ${index}.`);
                this._addStep('UPDATE_STATE', {
                    ...this._statePayload(hashIndex, collisions),
                    ...this._probeMeta(hashIndex, visitedIndices, collisionIndices, index, index),
                }, code, 'Valor atualizado sem aumentar a tabela.');
                return;
            }

            collisions++;
            collisionIndices.push(index);
        }

        this._addStep('ERROR', {}, code, 'Nao foi encontrado espaco livre apos sondagem linear.');
    }

    get(key) {
        this._startOperation(`get(${key})`);
        const code = `public String get(String key) {\n    int hash = hash(key);\n    for (int i = 0; i < capacity; i++) {\n        int index = (hash + i) % capacity;\n        if (table[index] == null) return null;\n        if (!table[index].deleted && table[index].key.equals(key)) return table[index].value;\n    }\n    return null;\n}`;

        const hashIndex = this._hash(key);
        let collisions = 0;
        const visitedIndices = [];
        const collisionIndices = [];

        for (let offset = 0; offset < this.capacity; offset++) {
            const index = (hashIndex + offset) % this.capacity;
            const entry = this.slots[index];
            visitedIndices.push(index);
            this._addStep('ARRAY_DIRECT_ACCESS', {
                index,
                ...this._probeMeta(hashIndex, visitedIndices, collisionIndices, index),
            }, code, `Consultando indice ${index} para buscar a chave ${key}.`);

            if (entry === null) {
                this._addStep('UPDATE_STATE', {
                    ...this._statePayload(hashIndex, collisions),
                    ...this._probeMeta(hashIndex, visitedIndices, collisionIndices, index),
                }, code, `Busca encerrada: slot ${index} vazio.`);
                return null;
            }

            if (entry !== this.deletedMarker && entry.key === key) {
                this._addStep('UPDATE_STATE', {
                    ...this._statePayload(hashIndex, collisions),
                    ...this._probeMeta(hashIndex, visitedIndices, collisionIndices, index, index),
                }, code, `Chave ${key} encontrada no indice ${index} com valor ${entry.value}.`);
                return entry.value;
            }

            collisions++;
            collisionIndices.push(index);
        }

        this._addStep('ERROR', {}, code, `Chave ${key} nao encontrada apos percorrer toda a tabela.`);
        return null;
    }

    remove(key) {
        this._startOperation(`remove(${key})`);
        const code = `public void remove(String key) {\n    int hash = hash(key);\n    for (int i = 0; i < capacity; i++) {\n        int index = (hash + i) % capacity;\n        if (table[index] == null) return;\n        if (!table[index].deleted && table[index].key.equals(key)) {\n            table[index].deleted = true;\n            return;\n        }\n    }\n}`;

        const hashIndex = this._hash(key);
        let collisions = 0;
        const visitedIndices = [];
        const collisionIndices = [];

        for (let offset = 0; offset < this.capacity; offset++) {
            const index = (hashIndex + offset) % this.capacity;
            const entry = this.slots[index];
            visitedIndices.push(index);
            this._addStep('ARRAY_DIRECT_ACCESS', {
                index,
                ...this._probeMeta(hashIndex, visitedIndices, collisionIndices, index),
            }, code, `Verificando indice ${index} para remover a chave ${key}.`);

            if (entry === null) {
                this._addStep('UPDATE_STATE', {
                    ...this._statePayload(hashIndex, collisions),
                    ...this._probeMeta(hashIndex, visitedIndices, collisionIndices, index),
                }, code, `Remocao encerrada: chave ${key} nao encontrada.`);
                return false;
            }

            if (entry !== this.deletedMarker && entry.key === key) {
                this.slots[index] = this.deletedMarker;
                this.size--;
                this._addStep('ARRAY_INSERT', {
                    index,
                    value: 'DEL',
                    size: this.size,
                    ...this._probeMeta(hashIndex, visitedIndices, collisionIndices, index, index),
                }, code, `Marcando indice ${index} como tombstone (DEL).`);
                this._addStep('UPDATE_STATE', {
                    ...this._statePayload(hashIndex, collisions),
                    ...this._probeMeta(hashIndex, visitedIndices, collisionIndices, index, index),
                }, code, `Chave ${key} removida com tombstone.`);
                return true;
            }

            collisions++;
            collisionIndices.push(index);
        }

        this._addStep('ERROR', {}, code, `Chave ${key} nao encontrada para remocao.`);
        return false;
    }

    clear() {
        this._startOperation('clear()');
        this.slots = new Array(this.capacity).fill(null);
        this.size = 0;
        this._addStep('ARRAY_CLEAR', {
            capacity: this.capacity,
            baseAddress: this.baseAddress,
            elementSize: this.elementSize,
        }, '', 'Tabela Hash reinicializada.');
        this._addStep('UPDATE_STATE', this._statePayload('-', 0), '', 'Tabela vazia.');
    }
}