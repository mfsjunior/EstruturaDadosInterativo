class NodeRenderer {
    constructor(logicalContainerId, memoryContainerId) {
        this.logicalContainer = document.getElementById(logicalContainerId);
        this.memoryContainer = document.getElementById(memoryContainerId);
        this.nodes = new Map(); // id -> { logicalEl, memoryEl, data }
        this.isMemoryView = false;
        this.headId = null;
        this.tailId = null;
    }

    setMemoryView(isMemory) {
        this.isMemoryView = isMemory;
        if (isMemory) {
            this._generateGarbageNodes();
        } else {
            this._clearGarbageNodes();
        }
    }

    addNode(nodeData) {
        // 1. Elemento Lógico (Simplificado)
        const logicalEl = document.createElement('div');
        logicalEl.className = 'list-node';
        logicalEl.id = 'logical_' + nodeData.id;
        
        logicalEl.innerHTML = `
            <div class="node-label-head">HEAD</div>
            <div class="node-header">Node</div>
            <div class="node-body">
                <div class="node-ptr prev">prev</div>
                <div class="node-value">${nodeData.value}</div>
                <div class="node-ptr next">next</div>
            </div>
            <div class="node-label-tail">TAIL</div>
        `;
        
        // 2. Elemento de Memória (Detalhado)
        const memoryEl = document.createElement('div');
        memoryEl.className = 'memory-node';
        memoryEl.id = 'memory_' + nodeData.id;
        
        memoryEl.innerHTML = `
            <div class="node-label-head">HEAD</div>
            <div class="memory-node-header">
                <div>Node</div>
                <div id="mem_addr_${nodeData.id}" class="memory-node-address">Address: ${nodeData.memoryAddress}</div>
            </div>
            <div class="memory-node-row">
                <span class="memory-node-label">prev</span>
                <span class="memory-node-val" id="mem_prev_${nodeData.id}">null</span>
            </div>
            <div class="memory-node-row" style="background: rgba(37,99,235,0.1);">
                <span class="memory-node-label">value</span>
                <span class="memory-node-val" style="font-weight: bold; font-size: 1.1rem;">${nodeData.value}</span>
            </div>
            <div class="memory-node-row">
                <span class="memory-node-label">next</span>
                <span class="memory-node-val" id="mem_next_${nodeData.id}">null</span>
            </div>
            <div class="node-label-tail">TAIL</div>
        `;

        this.nodes.set(nodeData.id, { logicalEl, memoryEl, data: nodeData });

        this.logicalContainer.appendChild(logicalEl);
        this.memoryContainer.appendChild(memoryEl);
        this._layoutMemoryNodes();
    }

    updatePointers(id, prevAddress, nextAddress) {
        if (this.nodes.has(id)) {
            const memPrev = document.getElementById(`mem_prev_${id}`);
            const memNext = document.getElementById(`mem_next_${id}`);
            if (memPrev) memPrev.textContent = prevAddress || 'null';
            if (memNext) memNext.textContent = nextAddress || 'null';
        }
    }

    setHead(id) {
        if (this.headId && this.nodes.has(this.headId)) {
            this.nodes.get(this.headId).logicalEl.classList.remove('is-head');
            this.nodes.get(this.headId).memoryEl.classList.remove('is-head');
        }
        this.headId = id;
        if (id && this.nodes.has(id)) {
            this.nodes.get(id).logicalEl.classList.add('is-head');
            this.nodes.get(id).memoryEl.classList.add('is-head');
        }
        this._layoutMemoryNodes();
    }

    setTail(id) {
        if (this.tailId && this.nodes.has(this.tailId)) {
            this.nodes.get(this.tailId).logicalEl.classList.remove('is-tail');
            this.nodes.get(this.tailId).memoryEl.classList.remove('is-tail');
        }
        this.tailId = id;
        if (id && this.nodes.has(id)) {
            this.nodes.get(id).logicalEl.classList.add('is-tail');
            this.nodes.get(id).memoryEl.classList.add('is-tail');
        }
        this._layoutMemoryNodes();
    }

    highlightNode(id, emphasis = false) {
        this.nodes.forEach(node => {
            if (node.logicalEl) node.logicalEl.classList.remove('highlight', 'emphasis');
            if (node.memoryEl) node.memoryEl.classList.remove('highlight', 'emphasis');
        });

        if (id && this.nodes.has(id)) {
            const node = this.nodes.get(id);
            if (node.logicalEl) node.logicalEl.classList.add(emphasis ? 'emphasis' : 'highlight');
            if (node.memoryEl) node.memoryEl.classList.add(emphasis ? 'emphasis' : 'highlight');
        }
    }

    isolateNode(id) {
        if (id && this.nodes.has(id)) {
            const node = this.nodes.get(id);
            node.logicalEl.classList.remove('is-head', 'is-tail', 'highlight');
            node.logicalEl.classList.add('isolated');
            node.logicalEl.style.transform = 'translateY(60px)';
            
            node.memoryEl.style.opacity = '0.5';
        }
    }

    isolateAll() {
        this.nodes.forEach((node, id) => {
            this.isolateNode(id);
        });
        this.headId = null;
        this.tailId = null;
    }

    clear() {
        this.nodes.forEach(node => {
            node.logicalEl.remove();
            node.memoryEl.remove();
        });
        this.nodes.clear();
        this.headId = null;
        this.tailId = null;
    }

    _layoutMemoryNodes() {
        if (!this.memoryContainer) return;

        const ordered = [];
        const visited = new Set();

        let currentId = this.headId;
        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const entry = this.nodes.get(currentId);
            if (!entry || !entry.memoryEl) break;
            ordered.push(entry);
            currentId = entry.data && entry.data.next ? entry.data.next.id : null;
        }

        this.nodes.forEach((entry, id) => {
            if (entry.memoryEl && !visited.has(id)) {
                ordered.push(entry);
            }
        });

        ordered.forEach((entry, index) => {
            const col = index % 4;
            const row = Math.floor(index / 4);
            const left = 8 + col * 24;
            const top = 20 + row * 24;
            entry.memoryEl.style.left = `${left}%`;
            entry.memoryEl.style.top = `${top}%`;
        });
    }

    getNodeElement(id) {
        // Para compatibilidade com o código antigo (PointerRenderer usa para referências)
        return this.nodes.has(id) ? this.nodes.get(id).logicalEl : null;
    }

    getMemoryNodeElement(id) {
        return this.nodes.has(id) ? this.nodes.get(id).memoryEl : null;
    }

    _generateGarbageNodes() {
        this._clearGarbageNodes();
        const count = 8; 
        const labels = ['[String]', 'Array[10]', '0x4F2A', 'UserObj', 'HTTPReq', '[Garbage]', '0x1A2B', 'Cache'];
        for(let i=0; i<count; i++) {
            const el = document.createElement('div');
            el.className = 'garbage-node';
            el.innerText = labels[Math.floor(Math.random() * labels.length)];
            
            el.style.left = Math.random() * 70 + 10 + '%';
            el.style.top = Math.random() * 60 + 15 + '%';
            
            this.memoryContainer.appendChild(el);
        }
    }

    _clearGarbageNodes() {
        const garbages = this.memoryContainer.querySelectorAll('.garbage-node');
        garbages.forEach(g => g.remove());
    }
}
