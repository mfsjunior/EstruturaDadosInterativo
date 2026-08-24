class ArrayRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.arrayWrapper = null;
        this.cells = [];
        this.activeTopIndex = -1;
        this.activeFrontIndex = -1;
        this.activeRearIndex = -1;
        this.queueSize = 0;
        this.baseAddress = 0x1000;
        this.elementSize = 4;
    }

    init(capacity, baseAddress, elementSize) {
        this.baseAddress = baseAddress;
        this.elementSize = elementSize;
        this.container.innerHTML = '';
        this.arrayWrapper = document.createElement('div');
        this.arrayWrapper.className = 'array-wrapper';
        this.container.appendChild(this.arrayWrapper);
        this.renderArray(capacity, baseAddress, elementSize);
    }

    renderArray(capacity, baseAddress, elementSize) {
        this.arrayWrapper.innerHTML = '';
        this.cells = [];
        this.activeTopIndex = -1;
        this.activeFrontIndex = -1;
        this.activeRearIndex = -1;
        this.queueSize = 0;
        for (let i = 0; i < capacity; i++) {
            const cellContainer = document.createElement('div');
            cellContainer.className = 'array-cell-container';

            const idxLabel = document.createElement('div');
            idxLabel.className = 'array-index';
            idxLabel.textContent = i;

            const relationLabel = document.createElement('div');
            relationLabel.className = 'array-relation';
            if (this.container?.classList?.contains('heap-mode')) {
                if (i === 0) {
                    relationLabel.textContent = 'raiz';
                } else {
                    relationLabel.textContent = `pai:${Math.floor((i - 1) / 2)}`;
                }
            } else if (this.container?.classList?.contains('hash-mode')) {
                relationLabel.textContent = 'bucket';
            }

            const box = document.createElement('div');
            box.className = 'array-box empty';
            box.id = `array-box-${i}`;

            const valSpan = document.createElement('span');
            valSpan.className = 'array-value';
            box.appendChild(valSpan);

            const memLabel = document.createElement('div');
            memLabel.className = 'array-memory';
            memLabel.textContent = `0x${(baseAddress + (i * elementSize)).toString(16).toUpperCase()}`;

            cellContainer.appendChild(idxLabel);
            cellContainer.appendChild(relationLabel);
            cellContainer.appendChild(box);
            cellContainer.appendChild(memLabel);

            this.arrayWrapper.appendChild(cellContainer);
            this.cells.push({ box, valSpan, cellContainer, idxLabel, relationLabel });
        }
    }

    setStackTop(index) {
        this.activeTopIndex = Number.isInteger(index) ? index : -1;
        this.cells.forEach((cell, cellIndex) => {
            if (!cell?.cellContainer) return;
            cell.cellContainer.classList.toggle('is-stack-top', cellIndex === this.activeTopIndex && this.activeTopIndex >= 0);
        });
    }

    setQueuePointers(frontIndex, rearIndex, size = this.queueSize) {
        this.activeFrontIndex = Number.isInteger(frontIndex) ? frontIndex : -1;
        this.activeRearIndex = Number.isInteger(rearIndex) ? rearIndex : -1;
        this.queueSize = Number.isFinite(size) ? Number(size) : this.queueSize;

        this.cells.forEach((cell, cellIndex) => {
            if (!cell?.cellContainer) return;
            cell.cellContainer.classList.toggle('is-queue-front', cellIndex === this.activeFrontIndex && this.activeFrontIndex >= 0);
            cell.cellContainer.classList.toggle('is-queue-rear', cellIndex === this.activeRearIndex && this.activeRearIndex >= 0);
        });
    }

    clearCustomHighlights() {
        this.cells.forEach((cell) => {
            if (!cell?.cellContainer) return;
            cell.cellContainer.classList.remove(
                'is-probe-origin',
                'is-probe-path',
                'is-probe-collision',
                'is-probe-active',
                'is-probe-hit'
            );
        });
    }

    setCustomHighlights({ originIndex = null, pathIndices = [], collisionIndices = [], activeIndex = null, hitIndex = null } = {}) {
        const pathSet = new Set(Array.isArray(pathIndices) ? pathIndices : []);
        const collisionSet = new Set(Array.isArray(collisionIndices) ? collisionIndices : []);

        this.cells.forEach((cell, index) => {
            if (!cell?.cellContainer) return;
            cell.cellContainer.classList.toggle('is-probe-origin', index === originIndex && originIndex >= 0);
            cell.cellContainer.classList.toggle('is-probe-path', pathSet.has(index));
            cell.cellContainer.classList.toggle('is-probe-collision', collisionSet.has(index));
            cell.cellContainer.classList.toggle('is-probe-active', index === activeIndex && activeIndex >= 0);
            cell.cellContainer.classList.toggle('is-probe-hit', index === hitIndex && hitIndex >= 0);
        });
    }

    clearFenwickHighlights() {
        this.cells.forEach((cell) => {
            if (!cell?.cellContainer) return;
            cell.cellContainer.classList.remove('is-fenwick-active', 'is-fenwick-next');
        });
    }

    setFenwickHighlights({ activeIndex = null, nextIndex = null } = {}) {
        this.cells.forEach((cell, index) => {
            if (!cell?.cellContainer) return;
            cell.cellContainer.classList.toggle('is-fenwick-active', index === activeIndex && activeIndex >= 0);
            cell.cellContainer.classList.toggle('is-fenwick-next', index === nextIndex && nextIndex >= 0);
        });
    }

    updateValue(index, value) {
        if (index < 0 || index >= this.cells.length) return;
        const cell = this.cells[index];
        if (value === undefined || value === null) {
            cell.valSpan.textContent = '';
            cell.box.classList.add('empty');
            cell.box.classList.remove('filled');
        } else {
            cell.valSpan.textContent = value;
            cell.box.classList.remove('empty');
            cell.box.classList.add('filled');
            
            this._triggerAnim(cell.box, 'flash-green');
        }
    }

    clearValue(index) {
        if (index < 0 || index >= this.cells.length) return;
        const cell = this.cells[index];
        cell.valSpan.textContent = '';
        cell.box.classList.add('empty');
        cell.box.classList.remove('filled');
        this._triggerAnim(cell.box, 'flash-red');
    }

    shiftValue(fromIndex, toIndex, value) {
        // Para uma animação real, poderíamos clonar o elemento e movê-lo via CSS transform.
        // Por simplicidade lógica inicial, atualizamos o DOM com feedback visual de deslocamento.
        this.updateValue(toIndex, value);
        
        // Se estamos movendo da esquerda para a direita (insert)
        // a célula 'from' ficará vazia (temporariamente)
        const cellFrom = this.cells[fromIndex];
        cellFrom.valSpan.textContent = '';
        cellFrom.box.classList.add('empty');
        cellFrom.box.classList.remove('filled');

        const cellTo = this.cells[toIndex];
        this._triggerAnim(cellTo.box, 'flash-yellow');
    }

    highlight(index, colorClass = 'highlight-blue') {
        if (index < 0 || index >= this.cells.length) return;
        const cell = this.cells[index];
        this._triggerAnim(cell.box, colorClass);
    }

    _triggerAnim(element, animClass) {
        element.classList.remove(animClass);
        void element.offsetWidth; // trigger reflow
        element.classList.add(animClass);
        setTimeout(() => element.classList.remove(animClass), 2500);
    }
}
