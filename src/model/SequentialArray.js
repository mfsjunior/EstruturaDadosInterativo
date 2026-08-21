class SequentialArray {
    constructor(capacity = 5) {
        this.capacity = capacity;
        this.size = 0;
        this.data = new Array(this.capacity);
        this.steps = [];
        this.baseAddress = 0x1000; // Simulated memory address starts at 4096
        this.elementSize = 4; // Each element takes 4 bytes conceptually
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
        if (text.includes('resize')) return 'crescer a estrutura evita falta de espaco, mas copiar tudo custa O(n).';
        if (text.includes('direto')) return 'o indice leva diretamente ao endereco da celula, sem percorrer outras posicoes.';
        if (text.includes('deslocando')) return 'inserir ou remover no meio exige mover elementos e isso custa tempo linear.';
        if (text.includes('fora dos limites')) return 'o controle de limites evita acessos invalidos e erros de memoria.';
        return 'arrays mantem acesso rapido por indice, mas insercoes internas podem exigir deslocamento.';
    }

    getSteps() {
        const stepsCopy = [...this.steps];
        this.steps = [];
        return stepsCopy;
    }

    _startOperation(name) {
        this.steps = [];
        this._addStep('INFO', {}, `// Iniciando ${name}`, `Operacao iniciada: ${name}. Capacidade atual: ${this.capacity}, Tamanho: ${this.size}`);
    }

    get(index) {
        this._startOperation(`get(${index})`);
        const code = `public T get(int index) {\n    if (index < 0 || index >= size) throw new IndexOutOfBoundsException();\n    return array[index];\n}`;

        if (index < 0 || index >= this.size) {
            this._addStep('ERROR', {
                index,
                activeLine: 2,
                debugVars: { index, size: this.size, inBounds: false },
            }, code, `Indice ${index} fora dos limites. Acesso negado.`);
            return null;
        }

        const calculatedAddress = this.baseAddress + (index * this.elementSize);
        // Direct Access Animation
        const value = this.data[index];
        this._addStep('ARRAY_DIRECT_ACCESS', {
            index,
            address: calculatedAddress,
            value,
            activeLine: 3,
            debugVars: {
                index,
                size: this.size,
                value,
                inBounds: true,
                address: calculatedAddress,
            },
        }, code, `O Array permite acesso aleatorio. Calculando a posicao fisica do indice ${index}: Endereco base + (indice * tamanho_tipo) -> 0x${calculatedAddress.toString(16).toUpperCase()}. Complexidade O(1).`);
        
        this._addStep('INFO', {
            activeLine: 3,
            debugVars: { index, value, inBounds: true },
        }, code, `Valor encontrado no indice ${index}: ${value}.`);
        return value;
    }

    addLast(value) {
        this.add(this.size, value);
    }

    add(index, value) {
        this._startOperation(`add(${index}, ${value})`);
        const code = `public void add(int index, T element) {\n    if (size == capacity) resize();\n    for (int i = size; i > index; i--) {\n        array[i] = array[i - 1];\n    }\n    array[index] = element;\n    size++;\n}`;

        if (index < 0 || index > this.size) {
            this._addStep('ERROR', {
                index,
                activeLine: 1,
                debugVars: { index, size: this.size, canInsert: false },
            }, code, `Indice invalido para insercao.`);
            return;
        }

        this._addStep('ARRAY_INSERT_CHECK', {
            index,
            value,
            activeLine: 1,
            debugVars: { index, size: this.size, canInsert: true },
        }, code, `Validando insercao no indice ${index}.`);

        this._addStep('ARRAY_CAPACITY_CHECK', {
            activeLine: 2,
            debugVars: {
                size: this.size,
                capacity: this.capacity,
                needsResize: this.size === this.capacity,
            },
        }, code, this.size === this.capacity
            ? `Capacidade atingida (${this.capacity}). Resize necessario.`
            : `Capacidade disponivel (${this.size}/${this.capacity}).`);

        if (this.size === this.capacity) {
            this._addStep('INFO', {}, code, `Capacidade atingida (${this.capacity}). Iniciando resize...`);
            this._resize(code);
        }

        // Shift elements to the right
        if (index < this.size) {
            this._addStep('INFO', {}, code, `Insercao no meio do Array: Deslocando elementos para a direita para abrir espaco no indice ${index}. Complexidade O(n).`);
            for (let i = this.size; i > index; i--) {
                this.data[i] = this.data[i - 1];
                this._addStep('ARRAY_SHIFT_RIGHT', {
                    from: i - 1,
                    to: i,
                    value: this.data[i - 1],
                    activeLine: 4,
                    debugVars: {
                        i,
                        from: i - 1,
                        to: i,
                        movedValue: this.data[i - 1],
                        compare: `${i} > ${index}`,
                    },
                }, code, `Deslocando valor ${this.data[i - 1]} do indice ${i - 1} para o indice ${i}.`);
            }
        }

        const sizeBefore = this.size;
        this.data[index] = value;
        this.size++;
        
        this._addStep('ARRAY_INSERT', {
            index,
            value,
            size: this.size,
            activeLine: 6,
            debugVars: {
                index,
                value,
                sizeBefore,
                sizeAfter: this.size,
            },
        }, code, `Inserindo novo elemento ${value} no indice ${index}.`);
        this._addStep('UPDATE_STATE', {
            size: this.size,
            activeLine: 7,
            debugVars: {
                sizeBefore,
                sizeAfter: this.size,
            },
        }, code, `Tamanho atualizado para ${this.size}. Operacao concluida.`);
    }

    remove(index) {
        this._startOperation(`remove(${index})`);
        const code = `public T remove(int index) {\n    if (index < 0 || index >= size) throw new IndexOutOfBoundsException();\n    T removed = array[index];\n    for (int i = index; i < size - 1; i++) {\n        array[i] = array[i + 1];\n    }\n    array[size - 1] = null;\n    size--;\n    return removed;\n}`;

        if (index < 0 || index >= this.size) {
            this._addStep('ERROR', {
                index,
                activeLine: 2,
                debugVars: { index, size: this.size, canRemove: false },
            }, code, `Indice invalido para remocao.`);
            return null;
        }

        this._addStep('ARRAY_REMOVE_CHECK', {
            index,
            activeLine: 2,
            debugVars: { index, size: this.size, canRemove: true },
        }, code, `Validando remocao no indice ${index}.`);

        const removedValue = this.data[index];
        this._addStep('ARRAY_REMOVE_START', {
            index,
            value: removedValue,
            activeLine: 3,
            debugVars: { index, removedValue },
        }, code, `Removendo elemento ${removedValue} do indice ${index}.`);

        // Shift elements to the left
        if (index < this.size - 1) {
            this._addStep('INFO', {}, code, `Remocao do meio do Array: Deslocando elementos posteriores para a esquerda para preencher o buraco. Complexidade O(n).`);
            for (let i = index; i < this.size - 1; i++) {
                this.data[i] = this.data[i + 1];
                this._addStep('ARRAY_SHIFT_LEFT', {
                    from: i + 1,
                    to: i,
                    value: this.data[i + 1],
                    activeLine: 5,
                    debugVars: {
                        i,
                        from: i + 1,
                        to: i,
                        movedValue: this.data[i + 1],
                        compare: `${i} < ${this.size - 1}`,
                    },
                }, code, `Deslocando valor ${this.data[i + 1]} do indice ${i + 1} para o indice ${i}.`);
            }
        }

        const sizeBefore = this.size;
        this.data[this.size - 1] = undefined;
        this.size--;
        
        this._addStep('ARRAY_REMOVE_END', {
            index: this.size,
            size: this.size,
            activeLine: 7,
            debugVars: { clearedIndex: this.size },
        }, code, `Ultima posicao (indice ${this.size}) limpa.`);
        this._addStep('UPDATE_STATE', {
            size: this.size,
            activeLine: 8,
            debugVars: {
                sizeBefore,
                sizeAfter: this.size,
            },
        }, code, `Tamanho atualizado para ${this.size}. Operacao concluida.`);
        return removedValue;
    }

    _resize(callerCode) {
        const code = `private void resize() {\n    T[] newArray = (T[]) new Object[capacity * 2];\n    for (int i = 0; i < size; i++) {\n        newArray[i] = array[i];\n    }\n    array = newArray;\n}`;
        const newCapacity = this.capacity * 2;
        const newBaseAddress = this.baseAddress + 0x5000;
        this._addStep('ARRAY_RESIZE_START', { oldCapacity: this.capacity, newCapacity, newBaseAddress }, code, `Criando um novo array com o dobro da capacidade (${newCapacity}) na memoria.`);
        
        const newData = new Array(newCapacity);
        for (let i = 0; i < this.size; i++) {
            newData[i] = this.data[i];
            this._addStep('ARRAY_RESIZE_COPY', { index: i, value: this.data[i] }, code, `Copiando ${this.data[i]} (indice ${i}) para a nova estrutura.`);
        }
        
        this.data = newData;
        this.capacity = newCapacity;
        this.baseAddress = newBaseAddress; 
        
        this._addStep('ARRAY_RESIZE_END', { newCapacity }, code, `Copia finalizada. Referencia do array antigo descartada pelo Garbage Collector. Resize O(n) concluido.`);
    }

    clear() {
        this._startOperation('clear()');
        this.capacity = 5;
        this.size = 0;
        this.data = new Array(this.capacity);
        this.baseAddress = 0x1000;
        this._addStep('ARRAY_CLEAR', { capacity: this.capacity }, '', `Array redefinido para estado inicial (capacidade ${this.capacity}).`);
    }
}
