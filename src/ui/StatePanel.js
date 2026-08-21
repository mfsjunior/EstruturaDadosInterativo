class StatePanel {
    constructor() {
        this.elHead = document.getElementById('stateHead');
        this.elTail = document.getElementById('stateTail');
        this.elSize = document.getElementById('stateSize');

        this.elNodeId = document.getElementById('stateNodeId');
        this.elNodeAddress = document.getElementById('stateNodeAddress');
        this.elNodeVal = document.getElementById('stateNodeValue');
        this.elNodePrev = document.getElementById('stateNodePrev');
        this.elNodeNext = document.getElementById('stateNodeNext');
    }

    updateProp(prop, val) {
        if (prop === 'head') this.elHead.textContent = val || 'null';
        if (prop === 'tail') this.elTail.textContent = val || 'null';
        if (prop === 'size') this.elSize.textContent = val;
    }

    getState() {
        return {
            head: this.elHead ? this.elHead.textContent : 'null',
            tail: this.elTail ? this.elTail.textContent : 'null',
            size: this.elSize ? this.elSize.textContent : 0
        };
    }

    updateCurrentNode(val, prev, next) {
        this.elNodeVal.textContent = val !== undefined ? val : '-';
        this.elNodePrev.textContent = prev || 'null';
        this.elNodeNext.textContent = next || 'null';
    }

    updateNodeDetails(nodeObj) {
        if (!nodeObj) {
            if (this.elNodeId) this.elNodeId.textContent = '-';
            if (this.elNodeAddress) this.elNodeAddress.textContent = '-';
            this.updateCurrentNode('-', '-', '-');
            return;
        }
        if (this.elNodeId) this.elNodeId.textContent = nodeObj.id;
        if (this.elNodeAddress) this.elNodeAddress.textContent = nodeObj.memoryAddress;
        this.updateCurrentNode(
            nodeObj.value,
            nodeObj.previous ? nodeObj.previous.memoryAddress : 'null',
            nodeObj.next ? nodeObj.next.memoryAddress : 'null'
        );
    }

    reset() {
        this.elHead.textContent = 'null';
        this.elTail.textContent = 'null';
        this.elSize.textContent = '0';
        if (this.elNodeId) this.elNodeId.textContent = '-';
        if (this.elNodeAddress) this.elNodeAddress.textContent = '-';
        this.updateCurrentNode('-', '-', '-');
    }
}

