class DoublyLinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
        this.nodeCounter = 0; // to generate unique IDs
        this.steps = []; // Stores the generated animation steps
    }

    // Helper to generate IDs
    _nextId() {
        return `node_${this.nodeCounter++}`;
    }

    // Helper to push animation steps
    _addStep(type, data, codeLine, description) {
        const payload = data && typeof data === 'object' ? { ...data } : {};
        if (!payload.cloud) payload.cloud = this._cloudText(description);
        this.steps.push({ type, data: payload, codeLine, description });
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
        if (text.includes('cabeca') || text.includes('head')) return 'na lista duplamente encadeada, a cabeca e o ponto de entrada para percorrer a estrutura.';
        if (text.includes('tail') || text.includes('cauda')) return 'a cauda permite inserir no fim sem percorrer toda a lista.';
        if (text.includes('desloc')) return 'cada ponteiro ajustado mostra como as referencias conectam os nos.';
        if (text.includes('vazia')) return 'casos vazios precisam ser tratados para evitar ponteiros nulos.';
        return 'a lista usa referencias entre nos, entao o custo depende dos ponteiros e do caminho percorrido.';
    }

    // Clears the steps buffer before an operation
    _startOperation(opName, arg) {
        this.steps = [];
        let desc = 'Iniciando operacao...';
        if (opName) {
            desc = `<strong>Chamada de metodo:</strong> <code>${opName}(${arg !== undefined ? arg : ''})</code>. Preparando para modificar o estado da lista.`;
        }
        this._addStep('INFO', {}, 'start', desc);
    }

    isEmpty() {
        return this.size === 0;
    }

    addFirst(value) {
        this._startOperation('addFirst', value);
        const code = `public void addFirst(T value) {\n    Node<T> node = new Node<>(value);\n    node.next = head;\n    if (head != null) head.previous = node;\n    else tail = node;\n    head = node;\n    size++;\n}`;
        
        let node = new Node(value, this._nextId());
        this._addStep('CREATE_NODE', { node: node, activeLine: 2 }, code, `Criando novo Node(${value}) na memoria: ${node.memoryAddress}`);

        node.next = this.head;
        this._addStep('SET_NEXT', { source: node.id, target: this.head ? this.head.id : null, activeLine: 3 }, code, `node.next aponta para a cabeca atual (${this.head ? 'Node '+this.head.value : 'null'}).`);

        if (this.head !== null) {
            this.head.previous = node;
            this._addStep('SET_PREV', { source: this.head.id, target: node.id, activeLine: 4 }, code, `A antiga cabeca.previous aponta para o novo Node.`);
        } else {
            this.tail = node;
            this._addStep('SET_TAIL', { target: node.id, activeLine: 5 }, code, `Como a lista estava vazia, tail tambem aponta para o novo Node.`);
        }

        this.head = node;
        this._addStep('SET_HEAD', { target: node.id, activeLine: 6 }, code, `head agora aponta para o novo Node.`);

        this.size++;
        this._addStep('UPDATE_SIZE', { size: this.size, activeLine: 7 }, code, `Tamanho atualizado para ${this.size}.`);
        this._addStep('COMPLEXITY', { value: 'O(1)', desc: 'Nenhum elemento deslocado. Apenas referencias alteradas.', activeLine: 8 }, code, 'Operacao addFirst concluida.');
    }

    addLast(value) {
        this._startOperation('addLast', value);
        const code = `public void addLast(T value) {\n    Node<T> node = new Node<>(value);\n    node.previous = tail;\n    if (tail != null) tail.next = node;\n    else head = node;\n    tail = node;\n    size++;\n}`;
        
        let node = new Node(value, this._nextId());
        this._addStep('CREATE_NODE', { node: node, activeLine: 2 }, code, `Criando novo Node(${value}) na memoria: ${node.memoryAddress}`);

        node.previous = this.tail;
        this._addStep('SET_PREV', { source: node.id, target: this.tail ? this.tail.id : null, activeLine: 3 }, code, `node.previous aponta para o tail atual.`);

        if (this.tail !== null) {
            this.tail.next = node;
            this._addStep('SET_NEXT', { source: this.tail.id, target: node.id, activeLine: 4 }, code, `O antigo tail.next aponta para o novo Node.`);
        } else {
            this.head = node;
            this._addStep('SET_HEAD', { target: node.id, activeLine: 5 }, code, `Lista estava vazia, head tambem aponta para o novo Node.`);
        }

        this.tail = node;
        this._addStep('SET_TAIL', { target: node.id, activeLine: 6 }, code, `tail agora aponta para o novo Node.`);

        this.size++;
        this._addStep('UPDATE_SIZE', { size: this.size, activeLine: 7 }, code, `Tamanho atualizado para ${this.size}.`);
        this._addStep('COMPLEXITY', { value: 'O(1)', desc: 'Insercao direta no fim com ponteiro tail.', activeLine: 8 }, code, 'Operacao addLast concluida.');
    }

    removeFirst() {
        this._startOperation('removeFirst');
        const code = `public T removeFirst() {\n    if (head == null) return null;\n    T value = head.value;\n    head = head.next;\n    if (head != null) head.previous = null;\n    else tail = null;\n    size--;\n    return value;\n}`;
        
        if (this.head === null) {
            this._addStep('ERROR', { msg: 'Lista vazia', activeLine: 2 }, code, 'A lista ja esta vazia.');
            return null;
        }

        let value = this.head.value;
        let removedNodeId = this.head.id;
        this._addStep('INFO', { value: value, activeLine: 3 }, code, `Salvando o valor da cabeca (${value}).`);

        this.head = this.head.next;
        this._addStep('SET_HEAD', { target: this.head ? this.head.id : null, activeLine: 4 }, code, `head avanca para o proximo Node.`);

        if (this.head !== null) {
            this.head.previous = null;
            this._addStep('REMOVE_PREV', { source: this.head.id, activeLine: 5 }, code, `Removemos a referencia para o no deletado.`);
        } else {
            this.tail = null;
            this._addStep('SET_TAIL', { target: null, activeLine: 6 }, code, `A lista ficou vazia, tail e nulo.`);
        }

        this._addStep('ISOLATE_NODE', { target: removedNodeId, activeLine: 7 }, code, `O no contendo ${value} ficou isolado e sera limpo pelo Garbage Collector.`);

        this.size--;
        this._addStep('UPDATE_SIZE', { size: this.size, activeLine: 7 }, code, `Tamanho reduzido para ${this.size}.`);
        this._addStep('COMPLEXITY', { value: 'O(1)', desc: 'Apenas os ponteiros iniciais foram atualizados.', activeLine: 8 }, code, 'Operacao removeFirst concluida.');
        return value;
    }

    get(index) {
        this._startOperation('get', index);
        const code = `public T get(int index) {\n    checkIndex(index);\n    Node<T> node = head;\n    for (int i = 0; i < index; i++) {\n        node = node.next;\n    }\n    return node.value;\n}`;
        
        if (index < 0 || index >= this.size) {
            this._addStep('ERROR', { msg: 'IndexOutOfBoundsException', activeLine: 2 }, code, `Erro: indice ${index} fora dos limites (0 ate ${this.size - 1}).`);
            return null;
        }

        let node = this.head;
        this._addStep('TRAVERSE_START', { target: node.id, activeLine: 3 }, code, `Iniciando a busca linear a partir de head.`);

        for (let i = 0; i < index; i++) {
            node = node.next;
            this._addStep('TRAVERSE_STEP', { target: node.id, i: i+1, activeLine: 5 }, code, `Caminhando engate por engate (i=${i+1}).`);
        }

        this._addStep('TRAVERSE_END', { target: node.id, value: node.value, activeLine: 7 }, code, `Chegou ao indice ${index}. Valor = ${node.value}.`);
        this._addStep('COMPLEXITY', { value: 'O(n)', desc: `Foram percorridos ${index} nos ate achar a posicao. A memoria nao e sequencial.`, activeLine: 8 }, code, 'Operacao get concluida.');
        
        return node.value;
    }

    removeValue(value) {
        this._startOperation('removeValue', value);
        const code = `public boolean removeValue(T value) {\n    Node<T> node = head;\n    while (node != null) {\n        if (node.value.equals(value)) {\n            unlink(node);\n            return true;\n        }\n        node = node.next;\n    }\n    return false;\n}`;
        
        let node = this.head;
        let count = 0;
        this._addStep('TRAVERSE_START', { target: node ? node.id : null, activeLine: 2 }, code, `Iniciando busca do valor ${value}...`);

        while (node !== null) {
            count++;
            this._addStep('TRAVERSE_COMPARE', { target: node.id, value: node.value, activeLine: 4 }, code, `Comparando: ${node.value} == ${value}`);
            
            if (node.value == value) {
                this._addStep('INFO', { activeLine: 5 }, code, `Valor ${value} encontrado no no ${node.id}.`);
                this._unlink(node);
                
                this._addStep('COMPLEXITY', { value: 'O(n)', desc: `Busca: ${count} iteracoes (O(n)). Unlink isolado: O(1). Dominante: O(n).`, activeLine: 6 }, code, 'Operacao removeValue concluida.');
                return true;
            }
            node = node.next;
            if(node !== null) {
                this._addStep('TRAVERSE_STEP', { target: node.id, activeLine: 8 }, code, `Avancando para o proximo no...`);
            }
        }

        this._addStep('INFO', { activeLine: 10 }, code, `Valor ${value} nao existe na lista.`);
        this._addStep('COMPLEXITY', { value: 'O(n)', desc: 'Percorreu a lista toda e nao encontrou.', activeLine: 10 }, code, 'Operacao concluida sem exclusao.');
        return false;
    }

    clear() {
        this._startOperation('clear');
        const code = `public void clear() {\n    head = null;\n    tail = null;\n    size = 0;\n}`;
        this.head = null;
        this._addStep('SET_HEAD', { target: null, activeLine: 2 }, code, `Referencia de cabeca removida.`);
        this.tail = null;
        this._addStep('SET_TAIL', { target: null, activeLine: 3 }, code, `Referencia de cauda removida.`);
        this.size = 0;
        this._addStep('UPDATE_SIZE', { size: 0, activeLine: 4 }, code, `Tamanho zerado.`);
        this._addStep('ISOLATE_ALL', { activeLine: 5 }, code, `Todos os nos foram isolados da lista principal e serao limpos pelo GC.`);
        this._addStep('COMPLEXITY', { value: 'O(1)', desc: 'Apenas os ponteiros head e tail foram anulados.', activeLine: 5 }, code, 'Lista esvaziada.');
    }

    _unlink(node) {
        const code = `private void unlink(Node<T> node) {\n    if (node.previous != null) node.previous.next = node.next;\n    else head = node.next;\n    if (node.next != null) node.next.previous = node.previous;\n    else tail = node.previous;\n    size--;\n}`;
        this._addStep('UNLINK_START', { target: node.id, activeLine: 2 }, code, `Iniciando o isolamento (unlink) do no.`);

        if (node.previous !== null) {
            node.previous.next = node.next;
            this._addStep('SET_NEXT', { source: node.previous.id, target: node.next ? node.next.id : null, activeLine: 2 }, code, `O proximo do anterior agora pula o no atual.`);
        } else {
            this.head = node.next;
            this._addStep('SET_HEAD', { target: this.head ? this.head.id : null, activeLine: 3 }, code, `Nova cabeca definida.`);
        }

        if (node.next !== null) {
            node.next.previous = node.previous;
            this._addStep('SET_PREV', { source: node.next.id, target: node.previous ? node.previous.id : null, activeLine: 4 }, code, `O anterior do proximo agora volta pulando o no atual.`);
        } else {
            this.tail = node.previous;
            this._addStep('SET_TAIL', { target: this.tail ? this.tail.id : null, activeLine: 5 }, code, `Nova cauda definida.`);
        }

        this.size--;
        this._addStep('ISOLATE_NODE', { target: node.id, activeLine: 6 }, code, `No totalmente isolado.`);
        this._addStep('UPDATE_SIZE', { size: this.size, activeLine: 6 }, code, `Tamanho reduzido para ${this.size}.`);
    }

    getState() {
        return {
            head: this.head,
            tail: this.tail,
            size: this.size
        };
    }
}
