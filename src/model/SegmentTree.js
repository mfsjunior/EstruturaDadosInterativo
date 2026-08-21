class SegmentTree {
    constructor() {
        this.defaultCapacity = 31;
        this.capacity = this.defaultCapacity;
        this.size = 0;
        this.values = [];
        this.tree = new Array(this.capacity).fill(undefined);
        this.labels = new Array(this.capacity).fill('');
        this.steps = [];
        this.baseAddress = 0x6000;
        this.elementSize = 4;
    }

    _addStep(type, payload, codeSnippet = '', description = '') {
        const stepPayload = payload && typeof payload === 'object' ? { ...payload } : {};
        if (!stepPayload.algorithm) stepPayload.algorithm = 'SEGMENT';
        if (!stepPayload.cloud) stepPayload.cloud = this._cloudText(description);
        this.steps.push(new Step(type, stepPayload, codeSnippet, description));
    }

    _cloudText(description) {
        const cleaned = String(description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (!cleaned) return '';
        const happened = cleaned.endsWith('.') ? cleaned.slice(0, -1) : cleaned;
        const importance = this._importanceForCloud(happened);
        const full = `O que aconteceu: ${happened}. Por que isso importa: ${importance}`;
        return full;
    }

    _importanceForCloud(happened) {
        const text = String(happened || '').toLowerCase();
        if (text.includes('folha')) return 'as folhas guardam os valores originais e viram a base das somas dos pais.';
        if (text.includes('montando')) return 'o build monta os blocos para que a arvore responda consultas sem percorrer o array inteiro.';
        if (text.includes('dividimos')) return 'cada divisao cria dois filhos menores, e cada filho cobre um subintervalo mais simples.';
        if (text.includes('construindo')) return 'cada no guarda a soma do intervalo que ele representa.';
        if (text.includes('visitando')) return 'a consulta entra apenas nos intervalos que podem contribuir para a resposta.';
        if (text.includes('recalculando')) return 'uma atualizacao muda a folha e depois corrige todos os pais acima dela.';
        if (text.includes('atualizada')) return 'quando uma folha muda, os intervalos acima precisam ser atualizados para manter a soma certa.';
        if (text.includes('intervalo')) return 'cada no representa um intervalo, entao a arvore corta partes que nao interessam.';
        if (text.includes('consulta')) return 'a segment tree economiza tempo respondendo com soma de blocos, nao valor por valor.';
        return 'a arvore de segmentos divide o array em intervalos para somar e atualizar rapido.';
    }

    _startOperation(name) {
        this.steps = [];
        const description = `Operacao iniciada: ${name}. Tamanho atual: ${this.size}.`;
        this._addStep('INFO', { cloud: this._cloudText(description) }, `// Iniciando ${name}`, description);
    }

    _treeCapacity(length) {
        const normalized = Math.max(1, Number(length) || 1);
        let power = 1;
        while (power < normalized) power *= 2;
        return (power * 2) - 1;
    }

    _rangeLabel(left, right) {
        return left === right ? `[${left}]` : `[${left}..${right}]`;
    }

    _snapshot() {
        return {
            rootId: this.size > 0 ? 'seg_0' : null,
            size: this.size,
            data: [...this.tree],
            relationLabels: [...this.labels],
        };
    }

    _statePayload() {
        return {
            head: this.size > 0 ? `root@${this.tree[0] ?? 0}` : '-',
            tail: `n@${this.size}`,
            size: this.size,
        };
    }

    _renderStep(code, description, index = null, extraData = null) {
        const payload = {
            tree: this._snapshot(),
            focusNodeId: Number.isInteger(index) ? `seg_${index}` : null,
            state: this._statePayload(),
            algorithm: 'SEGMENT',
        };
        if (extraData && typeof extraData === 'object') {
            Object.assign(payload, extraData);
        }
        this._addStep('BST_RENDER', payload, code, description);
    }

    getSteps() {
        const copy = [...this.steps];
        this.steps = [];
        return copy;
    }

    build(values) {
        const normalizedValues = Array.isArray(values)
            ? values.map((value) => Number(value)).filter((value) => Number.isFinite(value))
            : [];
        this._startOperation(`build([${normalizedValues.join(', ')}])`);

        const code = `public void build(int[] values) {
    build(0, 0, n - 1, values);
}`;

        this.values = normalizedValues;
        this.size = normalizedValues.length;
        this.capacity = this._treeCapacity(this.size || 1);
        this.tree = new Array(this.capacity).fill(undefined);
        this.labels = new Array(this.capacity).fill('');

        this._addStep('SEGMENT_CLEAR', {
            capacity: this.capacity,
            baseAddress: this.baseAddress,
            elementSize: this.elementSize,
            size: 0,
        }, code, `Montando a estrutura para ${this.size} valor(es).`);

        if (!this.size) {
            this._renderStep(code, 'Array vazio. Nada para construir.', null, { cloud: 'Sem valores, nao ha intervalos para montar.' });
            this._addStep('COMPLEXITY', { value: 'O(1)', desc: 'Sem valores, a construcao termina imediatamente.' }, code, 'Construcao concluida.');
            return;
        }

        this._buildRecursive(0, 0, this.size - 1, code);
        this._addStep('COMPLEXITY', { value: 'O(n)', desc: 'A construcao percorre cada valor uma vez para montar as somas.' }, code, 'Construcao concluida.');
    }

    _buildRecursive(nodeIndex, left, right, code) {
        const intervalLabel = this._rangeLabel(left, right);
        this._renderStep(code, `Construindo no ${intervalLabel}.`, nodeIndex, {
            intervalLabel,
            rangeStart: left,
            rangeEnd: right,
        });

        if (left === right) {
            const value = this.values[left] ?? 0;
            this.tree[nodeIndex] = value;
            this.labels[nodeIndex] = intervalLabel;
            this._addStep('SEGMENT_SET', {
                index: nodeIndex,
                value,
                intervalLabel,
                size: this.size,
                highlightIndices: [nodeIndex],
            }, code, `Folha ${intervalLabel}: armazenamos ${value}.`);
            return value;
        }

        const middle = Math.floor((left + right) / 2);
        this._renderStep(code, `Dividimos ${intervalLabel} em ${this._rangeLabel(left, middle)} e ${this._rangeLabel(middle + 1, right)}.`, nodeIndex, {
            intervalLabel,
            rangeStart: left,
            rangeEnd: right,
        });

        const leftSum = this._buildRecursive((nodeIndex * 2) + 1, left, middle, code);
        const rightSum = this._buildRecursive((nodeIndex * 2) + 2, middle + 1, right, code);
        const sum = leftSum + rightSum;
        this.tree[nodeIndex] = sum;
        this.labels[nodeIndex] = intervalLabel;

        this._addStep('SEGMENT_SET', {
            index: nodeIndex,
            value: sum,
            intervalLabel,
            size: this.size,
            highlightIndices: [nodeIndex, (nodeIndex * 2) + 1, (nodeIndex * 2) + 2].filter((item) => item < this.capacity),
        }, code, `No ${intervalLabel}: soma dos filhos = ${sum}.`);
        return sum;
    }

    query(left, right) {
        const ql = Number(left);
        const qr = Number(right);
        this._startOperation(`query(${ql}, ${qr})`);
        const code = `public int query(int left, int right) {
    return queryRec(0, 0, n - 1, left, right);
}`;

        if (!this.size) {
            this._renderStep(code, 'Segment Tree vazia. Consulta encerrada.', null, { cloud: 'Sem arvore montada, nao ha soma para consultar.' });
            this._addStep('COMPLEXITY', { value: 'O(1)', desc: 'Sem dados, a consulta termina imediatamente.' }, code, 'Consulta concluida.');
            return 0;
        }

        if (!Number.isInteger(ql) || !Number.isInteger(qr) || ql < 0 || qr < 0 || ql > qr || qr >= this.size) {
            this._addStep('ERROR', {}, code, `Intervalo invalido para consulta: [${left}, ${right}].`);
            return 0;
        }

        const result = this._queryRecursive(0, 0, this.size - 1, ql, qr, code);
        this._addStep('INFO', {}, code, `Consulta finalizada. Soma de [${ql}..${qr}] = ${result}.`);
        this._addStep('COMPLEXITY', { value: 'O(log n)', desc: 'A consulta visita apenas os intervalos relevantes da arvore.' }, code, 'Consulta concluida.');
        return result;
    }

    _queryRecursive(nodeIndex, left, right, ql, qr, code) {
        const intervalLabel = this._rangeLabel(left, right);
        this._renderStep(code, `Visitando no ${intervalLabel} para responder [${ql}..${qr}].`, nodeIndex, {
            intervalLabel,
            rangeStart: left,
            rangeEnd: right,
            queryLabel: this._rangeLabel(ql, qr),
        });

        if (qr < left || right < ql) {
            this._addStep('INFO', {}, code, `Intervalo ${intervalLabel} nao participa da consulta [${ql}..${qr}].`);
            return 0;
        }

        if (ql <= left && right <= qr) {
            const covered = this.tree[nodeIndex] ?? 0;
            this._addStep('SEGMENT_VISIT', {
                index: nodeIndex,
                intervalLabel,
                isMatch: true,
                highlightIndices: [nodeIndex],
            }, code, `Intervalo ${intervalLabel} esta totalmente coberto. Valor usado: ${covered}.`);
            return covered;
        }

        const middle = Math.floor((left + right) / 2);
        const leftSum = this._queryRecursive((nodeIndex * 2) + 1, left, middle, ql, qr, code);
        const rightSum = this._queryRecursive((nodeIndex * 2) + 2, middle + 1, right, ql, qr, code);
        const sum = leftSum + rightSum;

        this._addStep('SEGMENT_RESULT', {
            index: nodeIndex,
            value: sum,
            intervalLabel,
            highlightIndices: [nodeIndex],
        }, code, `Somando respostas parciais em ${intervalLabel}: ${leftSum} + ${rightSum} = ${sum}.`);
        return sum;
    }

    update(index, value) {
        const targetIndex = Number(index);
        const nextValue = Number(value);
        this._startOperation(`update(${targetIndex}, ${nextValue})`);
        const code = `public void update(int index, int value) {
    updateRec(0, 0, n - 1, index, value);
}`;

        if (!this.size) {
            this._renderStep(code, 'Segment Tree vazia. Nada para atualizar.', null, { cloud: 'Sem arvore montada, nao ha caminho para atualizar.' });
            this._addStep('COMPLEXITY', { value: 'O(1)', desc: 'Sem dados, a atualizacao termina imediatamente.' }, code, 'Atualizacao concluida.');
            return;
        }

        if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= this.size || !Number.isFinite(nextValue)) {
            this._addStep('ERROR', {}, code, `Atualizacao invalida: indice ${index}, valor ${value}.`);
            return;
        }

        this.values[targetIndex] = nextValue;
        this._updateRecursive(0, 0, this.size - 1, targetIndex, nextValue, code);
        this._addStep('INFO', {}, code, `Atualizacao finalizada. indice ${targetIndex} agora vale ${nextValue}.`);
        this._addStep('COMPLEXITY', { value: 'O(log n)', desc: 'Atualizacao recalcula apenas o caminho da folha ate a raiz.' }, code, 'Atualizacao concluida.');
    }

    _updateRecursive(nodeIndex, left, right, targetIndex, nextValue, code) {
        const intervalLabel = this._rangeLabel(left, right);
        this._renderStep(code, `Visitando ${intervalLabel} para atualizar o indice ${targetIndex}.`, nodeIndex, {
            intervalLabel,
            rangeStart: left,
            rangeEnd: right,
        });

        if (left === right) {
            this.tree[nodeIndex] = nextValue;
            this.labels[nodeIndex] = intervalLabel;
            this._addStep('SEGMENT_SET', {
                index: nodeIndex,
                value: nextValue,
                intervalLabel,
                size: this.size,
                highlightIndices: [nodeIndex],
            }, code, `Folha ${intervalLabel} atualizada para ${nextValue}.`);
            return nextValue;
        }

        const middle = Math.floor((left + right) / 2);
        const goLeft = targetIndex <= middle;
        const updatedChild = goLeft
            ? this._updateRecursive((nodeIndex * 2) + 1, left, middle, targetIndex, nextValue, code)
            : this._updateRecursive((nodeIndex * 2) + 2, middle + 1, right, targetIndex, nextValue, code);

        const leftValue = this.tree[(nodeIndex * 2) + 1] ?? 0;
        const rightValue = this.tree[(nodeIndex * 2) + 2] ?? 0;
        const sum = leftValue + rightValue;
        this.tree[nodeIndex] = sum;
        this.labels[nodeIndex] = intervalLabel;

        this._addStep('SEGMENT_SET', {
            index: nodeIndex,
            value: sum,
            intervalLabel,
            size: this.size,
            highlightIndices: [nodeIndex, goLeft ? (nodeIndex * 2) + 1 : (nodeIndex * 2) + 2].filter((item) => item < this.capacity),
        }, code, `Recalculando ${intervalLabel}. Novo valor: ${sum}.`);
        return updatedChild;
    }

    clear() {
        this._startOperation('clear()');
        this.tree = new Array(this.capacity).fill(undefined);
        this.labels = new Array(this.capacity).fill('');
        this.values = [];
        this.size = 0;
        this._addStep('SEGMENT_CLEAR', {
            capacity: this.capacity,
            baseAddress: this.baseAddress,
            elementSize: this.elementSize,
            size: 0,
        }, '', 'Segment Tree reinicializada.');
    }
}
