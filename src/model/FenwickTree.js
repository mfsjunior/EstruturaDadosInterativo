class FenwickTree {
    constructor(size = 8) {
        this.defaultSize = Math.max(1, Number(size) || 8);
        this.size = this.defaultSize;
        this.tree = new Array(this.size + 1).fill(0);
        this.values = new Array(this.size).fill(0);
        this.steps = [];
        this.baseAddress = 0x7000;
        this.elementSize = 4;
    }

    _rangeLabel(left, right) {
        return left === right ? `[${left}]` : `[${left}..${right}]`;
    }

    _coverage(index) {
        const span = index & -index;
        const right = index - 1;
        const left = right - span + 1;
        return this._rangeLabel(left, right);
    }

    _cloudText(description) {
        const cleaned = String(description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (!cleaned) return '';
        if (cleaned.toLowerCase().includes('prefix')) return 'Prefix sum acumula blocos relevantes sem varrer todo o array.';
        if (cleaned.toLowerCase().includes('delta')) return 'Atualizacao propaga apenas pelos indices que cobrem a posicao alterada.';
        if (cleaned.toLowerCase().includes('range')) return 'Range sum usa duas prefix sums para responder rapido.';
        return 'Fenwick tree organiza somas parciais em blocos binarios para consulta e update em O(log n).';
    }

    _fenwickCloud(type, data, description) {
        const idx = Number.isInteger(data?.index) ? data.index : null;
        const coverage = data?.coverage || (idx ? this._coverage(idx) : null);

        if (type === 'FENWICK_CLEAR') {
            return `BIT zerada e pronta (idx 1..${this.size}); idx 0 e reservado e nao participa das consultas.`;
        }

        if (type === 'FENWICK_VISIT') {
            const next = Number.isInteger(data?.nextIndex)
                ? (data.nextIndex > 0 ? `idx ${data.nextIndex}` : 'fim')
                : 'proximo salto';
            const partial = Number.isFinite(Number(data?.partial)) ? `, parcial atual ${data.partial}` : '';
            return `Visitando idx ${idx} (cobre ${coverage})${partial}; proximo salto: ${next}.`;
        }

        if (type === 'FENWICK_SET') {
            return `Atualiza idx ${idx} (${coverage}) com delta ${data?.delta ?? 0}; novo valor armazenado: ${data?.value}.`;
        }

        if (type === 'FENWICK_RESULT') {
            const next = Number.isInteger(data?.nextIndex)
                ? (data.nextIndex > 0 ? `idx ${data.nextIndex}` : 'fim')
                : null;
            return next
                ? `Soma parcial apos idx ${idx}: ${data?.value}. Seguimos para ${next}.`
                : `Resultado parcial/final apos idx ${idx}: ${data?.value}.`;
        }

        if (type === 'INFO') {
            const textRaw = String(description || '');
            const text = textRaw.toLowerCase();
            const startMatch = textRaw.match(/Operacao iniciada:\s*([a-zA-Z]+)\((.*)\)\./);
            if (startMatch) {
                const op = startMatch[1];
                if (op === 'build') return 'Build insere cada valor no BIT e propaga contribuicoes pelos saltos binarios.';
                if (op === 'update') return 'Update recalcula delta e propaga apenas pelos indices afetados em O(log n).';
                if (op === 'prefixSum') return 'Prefix sum acumula blocos descendo pelos ancestrais binarios do indice.';
                if (op === 'rangeSum') return 'Range sum calcula prefix(r) - prefix(l-1) para responder rapido.';
                if (op === 'clear') return 'Clear reinicia a estrutura para um novo conjunto de operacoes.';
            }
            if (text.includes('delta calculado')) {
                return `Delta = novoValor - valorAntigo. So os blocos que cobrem o indice alterado sao atualizados.`;
            }
            if (text.includes('prefixsum')) {
                return 'Prefix sum sobe no BIT removendo o bit menos significativo a cada salto (i -= i & -i).';
            }
            if (text.includes('rangesum')) {
                return 'Range sum = prefix(r) - prefix(l-1), evitando varrer todo o intervalo.';
            }
        }

        return this._cloudText(description);
    }

    _addStep(type, payload = {}, codeSnippet = '', description = '') {
        const data = { ...(payload || {}) };
        data.algorithm = 'FENWICK';
        data.cloud = data.cloud || this._fenwickCloud(type, data, description);
        this.steps.push(new Step(type, data, codeSnippet, description));
    }

    _snapshot() {
        const data = [];
        const relationLabels = [];
        for (let i = 0; i <= this.size; i += 1) {
            data.push(this.tree[i]);
            relationLabels.push(i === 0 ? '0 (nao usado)' : this._coverage(i));
        }
        return {
            capacity: this.size + 1,
            baseAddress: this.baseAddress,
            elementSize: this.elementSize,
            size: this.size,
            data,
            relationLabels,
        };
    }

    _statePayload() {
        return {
            head: 'idx 1',
            tail: `idx ${this.size}`,
            size: this.size,
        };
    }

    _startOperation(name) {
        this.steps = [];
        const description = `Operacao iniciada: ${name}.`;
        this._addStep('INFO', {}, `// ${name}`, description);
    }

    getSteps() {
        const output = [...this.steps];
        this.steps = [];
        return output;
    }

    clear(size = this.defaultSize) {
        const next = Math.max(1, Number(size) || this.defaultSize);
        this._startOperation(`clear(${next})`);
        this.size = next;
        this.tree = new Array(this.size + 1).fill(0);
        this.values = new Array(this.size).fill(0);
        this._addStep('FENWICK_CLEAR', this._snapshot(), 'void clear() { Arrays.fill(bit, 0); }', 'Estrutura reinicializada.');
        this._addStep('UPDATE_STATE', this._statePayload(), '', 'Estado atualizado.');
        this._addStep('COMPLEXITY', { value: 'O(n)', desc: 'Limpa todo o vetor BIT.' }, '', 'Limpeza concluida.');
    }

    build(values) {
        const normalized = Array.isArray(values)
            ? values.map((item) => Number(item)).filter((item) => Number.isFinite(item))
            : [];
        this._startOperation(`build([${normalized.join(', ')}])`);
        const n = Math.max(1, normalized.length);
        this.size = n;
        this.tree = new Array(this.size + 1).fill(0);
        this.values = new Array(this.size).fill(0);
        this._addStep('FENWICK_CLEAR', this._snapshot(), 'void build(int[] values) { clear(values.length); }', `Preparando BIT com tamanho ${this.size}.`);

        normalized.forEach((value, idx) => {
            this._internalAdd(idx + 1, value, true);
            this.values[idx] += value;
        });

        this._addStep('UPDATE_STATE', this._statePayload(), '', 'Build concluido.');
        this._addStep('COMPLEXITY', { value: 'O(n log n)', desc: 'Cada valor atualiza cadeia logaritmica do BIT.' }, '', 'Construcao concluida.');
    }

    _internalAdd(oneBasedIndex, delta, silentBuild = false) {
        let i = oneBasedIndex;
        const code = 'for (int i = idx; i <= n; i += i & -i) bit[i] += delta;';
        while (i <= this.size) {
            const before = this.tree[i];
            const after = before + delta;
            const nextIndex = i + (i & -i);
            this._addStep('FENWICK_VISIT', {
                index: i,
                before,
                after,
                delta,
                coverage: this._coverage(i),
                nextIndex: nextIndex <= this.size ? nextIndex : 0,
            }, code, `Visitando idx ${i}: ${before} + (${delta}).`);
            this.tree[i] = after;
            this._addStep('FENWICK_SET', {
                index: i,
                value: after,
                delta,
                size: this.size,
                coverage: this._coverage(i),
                nextIndex: nextIndex <= this.size ? nextIndex : 0,
            }, code, `Atualizando idx ${i} para ${after}.`);
            i = nextIndex;
        }

        if (!silentBuild) {
            this._addStep('UPDATE_STATE', this._statePayload(), '', 'Atualizacao propagada no BIT.');
        }
    }

    update(index, newValue) {
        const target = Number(index);
        const nextValue = Number(newValue);
        this._startOperation(`update(${target}, ${nextValue})`);

        if (!Number.isInteger(target) || target < 0 || target >= this.size || !Number.isFinite(nextValue)) {
            this._addStep('ERROR', {}, '', `Indice/valor invalido para update: index=${index}, value=${newValue}.`);
            return;
        }

        const delta = nextValue - this.values[target];
        this._addStep('INFO', { delta }, 'int delta = newValue - values[index];', `Delta calculado: ${delta}.`);
        this.values[target] = nextValue;
        this._internalAdd(target + 1, delta, false);
        this._addStep('COMPLEXITY', { value: 'O(log n)', desc: 'Update visita apenas os blocos cobertos pelo indice.' }, '', 'Atualizacao concluida.');
    }

    prefixSum(index) {
        const target = Number(index);
        this._startOperation(`prefixSum(${target})`);
        if (!Number.isInteger(target) || target < 0 || target >= this.size) {
            this._addStep('ERROR', {}, '', `Indice invalido para prefixSum: ${index}.`);
            return 0;
        }

        let i = target + 1;
        let sum = 0;
        const code = 'for (int i = idx; i > 0; i -= i & -i) sum += bit[i];';
        while (i > 0) {
            const nextIndex = i - (i & -i);
            this._addStep('FENWICK_VISIT', {
                index: i,
                value: this.tree[i],
                partial: sum,
                coverage: this._coverage(i),
                nextIndex,
            }, code, `Lendo idx ${i}, soma parcial ${sum}.`);
            sum += this.tree[i];
            this._addStep('FENWICK_RESULT', { index: i, value: sum, coverage: this._coverage(i), nextIndex }, code, `Nova soma parcial: ${sum}.`);
            i = nextIndex;
        }

        this._addStep('INFO', { result: sum }, 'return sum;', `prefixSum(${target}) = ${sum}.`);
        this._addStep('COMPLEXITY', { value: 'O(log n)', desc: 'Prefix sum sobe pelos blocos binarios do BIT.' }, '', 'Consulta prefix concluida.');
        return sum;
    }

    rangeSum(left, right) {
        const l = Number(left);
        const r = Number(right);
        this._startOperation(`rangeSum(${l}, ${r})`);
        if (!Number.isInteger(l) || !Number.isInteger(r) || l < 0 || r < 0 || l > r || r >= this.size) {
            this._addStep('ERROR', {}, '', `Intervalo invalido para rangeSum: [${left}, ${right}].`);
            return 0;
        }

        const rightSum = this._prefixWithoutReset(r);
        const leftSum = l > 0 ? this._prefixWithoutReset(l - 1) : 0;
        const result = rightSum - leftSum;
        this._addStep('FENWICK_RESULT', { value: result }, 'int ans = prefix(r) - prefix(l-1);', `rangeSum(${l}, ${r}) = ${result}.`);
        this._addStep('COMPLEXITY', { value: 'O(log n)', desc: 'Range sum usa duas consultas prefix em O(log n).' }, '', 'Consulta de intervalo concluida.');
        return result;
    }

    _prefixWithoutReset(index) {
        let i = index + 1;
        let sum = 0;
        const code = 'for (int i = idx; i > 0; i -= i & -i) sum += bit[i];';
        while (i > 0) {
            const nextIndex = i - (i & -i);
            this._addStep('FENWICK_VISIT', {
                index: i,
                value: this.tree[i],
                partial: sum,
                coverage: this._coverage(i),
                nextIndex,
            }, code, `Prefix auxiliar lendo idx ${i}.`);
            sum += this.tree[i];
            i = nextIndex;
        }
        this._addStep('INFO', { result: sum }, code, `Prefix auxiliar = ${sum}.`);
        return sum;
    }
}