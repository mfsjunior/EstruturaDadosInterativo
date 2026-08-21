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
        const countLeaves = (nodeId) => {
            if (!nodeId) return 0;
            const node = byId.get(nodeId);
            if (!node) return 0;
            const leftLeaves = countLeaves(node.leftId);
            const rightLeaves = countLeaves(node.rightId);
            if (!leftLeaves && !rightLeaves) return 1;
            return leftLeaves + rightLeaves;
        };
        const countDepth = (nodeId) => {
            if (!nodeId) return 0;
            const node = byId.get(nodeId);
            if (!node) return 0;
            return 1 + Math.max(countDepth(node.leftId), countDepth(node.rightId));
        };

        const treeDepth = Math.max(1, countDepth(tree.rootId));
        const width = Math.max(340, this.container.clientWidth || 340);
        const height = Math.max(340, 120 + ((treeDepth - 1) * 128));

        this.container.style.minHeight = `${height}px`;
        this.container.style.height = `${height}px`;
        this.container.style.position = 'relative';
        this.svg.setAttribute('width', String(width));
        this.svg.setAttribute('height', String(height));
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');

        const totalLeaves = Math.max(1, countLeaves(tree.rootId));
        const horizontalPadding = 72;
        const usableWidth = width - (horizontalPadding * 2);

        const place = (nodeId, depth, minX, maxX) => {
            if (!nodeId) return;
            const node = byId.get(nodeId);
            if (!node) return;
            const x = (minX + maxX) / 2;
            const y = 84 + (depth * 128);
            positions.set(nodeId, { x, y });
            const leftLeaves = countLeaves(node.leftId);
            const rightLeaves = countLeaves(node.rightId);
            const totalChildLeaves = Math.max(1, leftLeaves + rightLeaves);
            const split = minX + (((maxX - minX) * leftLeaves) / totalChildLeaves);

            if (node.leftId) {
                place(node.leftId, depth + 1, minX, Math.max(minX + 96, split));
            }
            if (node.rightId) {
                place(node.rightId, depth + 1, Math.min(maxX - 96, split), maxX);
            }
        };

        place(tree.rootId, 0, horizontalPadding, horizontalPadding + usableWidth);

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
                <div class="bst-node-value">${node.value}</div>
                <div class="bst-node-address">${node.memoryAddress}</div>
            `;
            this.container.appendChild(el);
        });
    }
}