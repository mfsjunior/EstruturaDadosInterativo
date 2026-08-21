class GraphRenderer {
    constructor(nodesContainerId, arrowsSvgId) {
        this.nodesContainer = document.getElementById(nodesContainerId);
        this.svg = document.getElementById(arrowsSvgId);
        this.nodeMap = new Map();
        this.edgeMap = new Map();
        this.snapshot = null;
    }

    clear() {
        this.nodeMap.clear();
        this.edgeMap.clear();
        this.snapshot = null;
        if (this.nodesContainer) this.nodesContainer.innerHTML = '';
        if (this.svg) this.svg.innerHTML = '';
    }

    initFromSnapshot(snapshot) {
        this.snapshot = snapshot;
        this._render(snapshot);
    }

    updateFromSnapshot(snapshot) {
        this.snapshot = snapshot;
        this._render(snapshot);
    }

    clearHighlights() {
        this.nodeMap.forEach((nodeEl) => {
            nodeEl.classList.remove('graph-node-active', 'graph-node-queued', 'graph-node-wave', 'graph-node-backtrack', 'graph-node-path');
        });
        this.edgeMap.forEach((edgeEl) => {
            edgeEl.classList.remove('graph-edge-active', 'graph-edge-backtrack', 'graph-edge-path');
        });
    }

    markVisited(node) {
        const el = this.nodeMap.get(node);
        if (!el) return;
        el.classList.add('graph-node-visited');
    }

    highlightNode(node, mode = 'active') {
        const el = this.nodeMap.get(node);
        if (!el) return;
        if (mode === 'active') {
            el.classList.remove('graph-node-queued');
            el.classList.add('graph-node-active');
        } else if (mode === 'queued') {
            el.classList.add('graph-node-queued');
        } else if (mode === 'wave') {
            el.classList.add('graph-node-wave');
            el.classList.remove('graph-node-backtrack');
        } else if (mode === 'backtrack') {
            el.classList.add('graph-node-backtrack');
        } else if (mode === 'path') {
            el.classList.add('graph-node-path');
        }
    }

    setNodeLevel(node, level = 0) {
        const el = this.nodeMap.get(node);
        if (!el) return;
        el.style.setProperty('--graph-level', String(level));
    }

    highlightEdge(a, b, mode = 'active') {
        const key = this._edgeKey(a, b);
        const edgeEl = this.edgeMap.get(key);
        if (!edgeEl) return;
        edgeEl.classList.remove('graph-edge-active', 'graph-edge-backtrack', 'graph-edge-path');
        void edgeEl.offsetWidth;
        if (mode === 'backtrack') edgeEl.classList.add('graph-edge-backtrack');
        else if (mode === 'path') edgeEl.classList.add('graph-edge-path');
        else edgeEl.classList.add('graph-edge-active');
    }

    _edgeKey(a, b) {
        const x = Math.min(Number(a), Number(b));
        const y = Math.max(Number(a), Number(b));
        return `${x}-${y}`;
    }

    _extractEdges(snapshot) {
        const edges = new Set();
        const labels = Array.isArray(snapshot?.relationLabels) ? snapshot.relationLabels : [];

        labels.forEach((label, u) => {
            const raw = String(label || '');
            const match = raw.match(/adj:\s*(.*)$/i);
            if (!match) return;
            const part = match[1].trim();
            if (!part || part === '-') return;
            part.split(',').forEach((item) => {
                const v = Number(String(item || '').trim());
                if (!Number.isInteger(v)) return;
                if (u === v) return;
                edges.add(this._edgeKey(u, v));
            });
        });

        return [...edges].map((value) => value.split('-').map((x) => Number(x)));
    }

    _computePositions(size) {
        const positions = [];
        const radius = 36;
        const cx = 50;
        const cy = 50;
        for (let i = 0; i < size; i += 1) {
            const angle = ((Math.PI * 2) / size) * i - Math.PI / 2;
            positions.push({
                x: cx + radius * Math.cos(angle),
                y: cy + radius * Math.sin(angle),
            });
        }
        return positions;
    }

    _render(snapshot) {
        if (!this.nodesContainer || !this.svg || !snapshot) return;
        const size = Number(snapshot.capacity) || Number(snapshot.size) || 0;
        if (!size) return;

        this.nodesContainer.innerHTML = '';
        this.svg.innerHTML = '';
        this.nodeMap.clear();
        this.edgeMap.clear();

        const stage = document.createElement('div');
        stage.className = 'graph-stage';
        this.nodesContainer.appendChild(stage);

        const positions = this._computePositions(size);
        this.svg.setAttribute('viewBox', '0 0 100 100');

        const edges = this._extractEdges(snapshot);
        edges.forEach(([a, b]) => {
            const pa = positions[a];
            const pb = positions[b];
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(pa.x));
            line.setAttribute('y1', String(pa.y));
            line.setAttribute('x2', String(pb.x));
            line.setAttribute('y2', String(pb.y));
            line.setAttribute('class', 'graph-edge');
            this.svg.appendChild(line);
            this.edgeMap.set(this._edgeKey(a, b), line);
        });

        const labels = Array.isArray(snapshot.relationLabels) ? snapshot.relationLabels : [];
        for (let i = 0; i < size; i += 1) {
            const pos = positions[i];
            const node = document.createElement('div');
            node.className = 'graph-node';
            node.style.left = `${pos.x}%`;
            node.style.top = `${pos.y}%`;
            node.innerHTML = `
                <div class="graph-node-id">${i}</div>
                <div class="graph-node-adj">${String(labels[i] || 'adj: -')}</div>
            `;
            stage.appendChild(node);
            this.nodeMap.set(i, node);
        }
    }
}