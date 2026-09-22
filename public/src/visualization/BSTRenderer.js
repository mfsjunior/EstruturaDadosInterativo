class BSTRenderer {
    constructor(containerId, svgId) {
        this.container = document.getElementById(containerId);
        this.svg = svgId ? document.getElementById(svgId) : null;
        this.nodeHalfWidth = 46;
        this.nodeHalfHeight = 28;

        if (!this.svg && this.container) {
            this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.svg.classList.add('bst-preview-svg');
            this.container.appendChild(this.svg);
        }
    }

    clear() {
        if (this.container) this.container.innerHTML = '';
        if (this.svg) {
            this.svg.innerHTML = '';
            if (this.container && this.svg.parentNode !== this.container) {
                this.container.appendChild(this.svg);
            }
        }
    }

    render(tree, focusNodeId = null, focusEdge = null) {
        if (!this.container || !this.svg) return;
        this.clear();
        if (!tree || !Array.isArray(tree.nodes) || !tree.nodes.length) return;

        const byId = new Map(tree.nodes.map((node) => [node.id, node]));
        const positions = new Map();
        const countDepth = (nodeId) => {
            if (!nodeId) return 0;
            const node = byId.get(nodeId);
            if (!node) return 0;
            return 1 + Math.max(countDepth(node.leftId), countDepth(node.rightId));
        };

        const treeDepth = Math.max(1, countDepth(tree.rootId));

        const inOrder = [];
        const buildInOrder = (nodeId) => {
            if (!nodeId) return;
            const node = byId.get(nodeId);
            if (!node) return;
            buildInOrder(node.leftId);
            inOrder.push(nodeId);
            buildInOrder(node.rightId);
        };
        buildInOrder(tree.rootId);

        const horizontalPadding = 72;
        const minRequiredWidth = inOrder.length * 64 + horizontalPadding * 2;
        const width = Math.max(340, this.container.clientWidth || 340, minRequiredWidth);
        const height = Math.max(340, 120 + ((treeDepth - 1) * 128));

        this.container.style.minHeight = `${height}px`;
        this.container.style.height = `${height}px`;
        this.container.style.position = 'relative';
        this.svg.setAttribute('width', String(width));
        this.svg.setAttribute('height', String(height));
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');

        const usableWidth = width - (horizontalPadding * 2);
        const spacing = inOrder.length > 1 ? usableWidth / (inOrder.length - 1) : 0;
        
        const nodeRanks = new Map();
        inOrder.forEach((nodeId, index) => {
            nodeRanks.set(nodeId, index);
        });

        const place = (nodeId, depth) => {
            if (!nodeId) return;
            const node = byId.get(nodeId);
            if (!node) return;
            
            const rank = nodeRanks.get(nodeId);
            const x = inOrder.length === 1 ? width / 2 : horizontalPadding + rank * spacing;
            const y = 84 + (depth * 128);
            positions.set(nodeId, { x, y });

            place(node.leftId, depth + 1);
            place(node.rightId, depth + 1);
        };

        place(tree.rootId, 0);

        const edgeKey = Array.isArray(focusEdge) ? `${focusEdge[0]}-${focusEdge[1]}` : null;
        tree.nodes.forEach((node) => {
            const from = positions.get(node.id);
            if (!from) return;
            [node.leftId, node.rightId].forEach((childId) => {
                if (!childId) return;
                const to = positions.get(childId);
                if (!to) return;
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', String(from.x));
                line.setAttribute('y1', String(from.y + this.nodeHalfHeight));
                line.setAttribute('x2', String(to.x));
                line.setAttribute('y2', String(to.y - this.nodeHalfHeight));
                line.setAttribute('class', edgeKey === `${node.id}-${childId}` ? 'bst-edge active' : 'bst-edge');
                this.svg.appendChild(line);
            });
        });

        tree.nodes.forEach((node) => {
            const pos = positions.get(node.id);
            if (!pos) return;
            const el = document.createElement('div');
            const hasExplicitColor = node.nodeColor === 'RED' || node.nodeColor === 'BLACK';
            const colorClass = node.nodeColor === 'RED' ? ' rbt-red' : (node.nodeColor === 'BLACK' ? ' rbt-black' : '');
            const rootClass = tree.rootId === node.id && !hasExplicitColor ? ' root' : '';
            el.className = `bst-node${focusNodeId === node.id ? ' active' : ''}${rootClass}${colorClass}`;
            el.style.left = `${pos.x}px`;
            el.style.top = `${pos.y}px`;
            el.innerHTML = `
                <div class="bst-node-value">${window.escapeHtml(node.value)}</div>
                <div class="bst-node-address">${node.memoryAddress}</div>
            `;
            this.container.appendChild(el);
        });
    }
}