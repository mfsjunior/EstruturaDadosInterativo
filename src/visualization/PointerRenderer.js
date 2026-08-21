class PointerRenderer {
    constructor(svgId, nodeRenderer, mode = 'auto') {
        this.svg = document.getElementById(svgId);
        this.nodeRenderer = nodeRenderer;
        this.mode = mode; // 'auto' | 'logical' | 'memory'
        this.pointers = new Map(); // key -> { sourceId, targetId, type ('next' | 'previous') }
        this.markerId = `arrowhead-${svgId}`;
        this.activeMarkerId = `arrowhead-active-${svgId}`;

        if (this.svg) {
            this.svg.classList.add(mode === 'memory' ? 'memory-arrows' : 'logical-arrows');
        }
        
        // Ensure SVG has arrowhead markers
        this._initMarkers();
        
        // Window resize needs to redraw arrows
        window.addEventListener('resize', () => this.redraw());
    }

    _initMarkers() {
        this.svg.innerHTML = `
            <defs>
                <marker id="${this.markerId}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="var(--ptr-color)" />
                </marker>
                <marker id="${this.activeMarkerId}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="var(--ptr-active)" />
                </marker>
            </defs>
        `;
    }

    updatePointer(sourceId, type, targetId) {
        const key = `${sourceId}-${type}`;
        
        if (targetId === null) {
            // Remove pointer
            if (this.pointers.has(key)) {
                const pathEl = this.pointers.get(key).pathEl;
                if (pathEl && pathEl.parentNode) pathEl.parentNode.removeChild(pathEl);
                this.pointers.delete(key);
            }
            return;
        }

        if (!this.pointers.has(key)) {
            // Create new path element
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('class', `svg-arrow ${type}`);
            pathEl.setAttribute('marker-end', `url(#${this.markerId})`);
            this.svg.appendChild(pathEl);
            
            this.pointers.set(key, { sourceId, targetId, type, pathEl });
        } else {
            // Update target
            const ptr = this.pointers.get(key);
            ptr.targetId = targetId;
        }

        this.redraw();
    }

    removePointersFrom(nodeId) {
        const toDelete = [];
        this.pointers.forEach((ptr, key) => {
            if (ptr.sourceId === nodeId) {
                if (ptr.pathEl && ptr.pathEl.parentNode) ptr.pathEl.parentNode.removeChild(ptr.pathEl);
                toDelete.push(key);
            }
        });
        toDelete.forEach(k => this.pointers.delete(k));
        this.redraw();
    }

    clear() {
        this.pointers.forEach(ptr => {
            if (ptr.pathEl && ptr.pathEl.parentNode) {
                ptr.pathEl.parentNode.removeChild(ptr.pathEl);
            }
        });
        this.pointers.clear();
        this._initMarkers();
    }

    redraw() {
        this._reorderLogicalDOM();
        
        // Timeout pequeno para garantir que o flexbox aplicou o novo 'order' antes de recalcular BoundingClientRect
        setTimeout(() => {
            const svgRect = this.svg.getBoundingClientRect();
            if (!svgRect.width || !svgRect.height) return;

            this.svg.setAttribute('viewBox', `0 0 ${svgRect.width} ${svgRect.height}`);
            const isMem = this.mode === 'memory' ? true : this.mode === 'logical' ? false : this.nodeRenderer.isMemoryView;

            this.pointers.forEach(ptr => {
                if (!isMem && ptr.type === 'previous') {
                    ptr.pathEl.setAttribute('d', '');
                    return;
                }

                const sourceEl = isMem ? document.getElementById(`memory_${ptr.sourceId}`) : document.getElementById(`logical_${ptr.sourceId}`);
                const targetEl = isMem ? document.getElementById(`memory_${ptr.targetId}`) : document.getElementById(`logical_${ptr.targetId}`);

                if (!sourceEl || !targetEl || ptr.sourceId === ptr.targetId) {
                    ptr.pathEl.setAttribute('d', '');
                    return;
                }

                const sRect = sourceEl.getBoundingClientRect();
                const tRect = targetEl.getBoundingClientRect();
                
                // If it's 0, it means the element is hidden or detached
                if (sRect.width === 0 || tRect.width === 0) {
                    ptr.pathEl.setAttribute('d', '');
                    return;
                }

                let startX, startY, endX, endY, cp1X, cp1Y, cp2X, cp2Y;

                if (isMem) {
                    const sourceField = sourceEl.querySelector(`#mem_${ptr.type === 'previous' ? 'prev' : 'next'}_${ptr.sourceId}`);
                    const targetField = targetEl.querySelector(`#mem_${ptr.type === 'previous' ? 'prev' : 'next'}_${ptr.targetId}`);
                    const sourceFieldRect = sourceField ? sourceField.getBoundingClientRect() : sRect;
                    const targetFieldRect = targetField ? targetField.getBoundingClientRect() : tRect;
                    const laneOffset = 18;
                    const sideOffset = 18;

                    if (ptr.type === 'next') {
                        startX = sourceFieldRect.right - svgRect.left;
                        startY = sourceFieldRect.top + (sourceFieldRect.height / 2) - svgRect.top;
                        endX = tRect.left - svgRect.left;
                        endY = targetFieldRect.top + (targetFieldRect.height / 2) - svgRect.top;

                        const laneY = Math.max(sRect.bottom, tRect.bottom) - svgRect.top + laneOffset;
                        const pathData = [
                            `M ${startX} ${startY}`,
                            `L ${startX + sideOffset} ${startY}`,
                            `L ${startX + sideOffset} ${laneY}`,
                            `L ${endX - sideOffset} ${laneY}`,
                            `L ${endX - sideOffset} ${endY}`,
                            `L ${endX} ${endY}`,
                        ].join(' ');
                        ptr.pathEl.setAttribute('d', pathData);
                        return;
                    }

                    startX = sourceFieldRect.left - svgRect.left;
                    startY = sourceFieldRect.top + (sourceFieldRect.height / 2) - svgRect.top;
                    endX = tRect.right - svgRect.left;
                    endY = targetFieldRect.top + (targetFieldRect.height / 2) - svgRect.top;

                    const laneY = Math.min(sRect.top, tRect.top) - svgRect.top - laneOffset;
                    const pathData = [
                        `M ${startX} ${startY}`,
                        `L ${startX - sideOffset} ${startY}`,
                        `L ${startX - sideOffset} ${laneY}`,
                        `L ${endX + sideOffset} ${laneY}`,
                        `L ${endX + sideOffset} ${endY}`,
                        `L ${endX} ${endY}`,
                    ].join(' ');
                    ptr.pathEl.setAttribute('d', pathData);
                    return;

                } else {
                    // Logical mode: show only forward links under the nodes.
                    startX = sRect.right - 24 - svgRect.left;
                    endX = tRect.left + 24 - svgRect.left;

                    startY = sRect.bottom + 14 - svgRect.top;
                    endY = tRect.bottom + 14 - svgRect.top;

                    const horizontalDistance = Math.abs(endX - startX);
                    const curveDepth = Math.max(52, Math.min(100, horizontalDistance * 0.32));
                    const direction = endX >= startX ? 1 : -1;
                    const spread = Math.max(24, Math.min(60, horizontalDistance * 0.2));

                    cp1X = startX + (direction * spread);
                    cp1Y = startY + curveDepth;
                    cp2X = endX - (direction * spread);
                    cp2Y = endY + curveDepth;
                }

                const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
                ptr.pathEl.setAttribute('d', pathData);
            });
        }, 10);
    }

    _reorderLogicalDOM() {
        const logicalContainer = this.nodeRenderer.logicalContainer;
        if (!logicalContainer) return;

        const orderedNodes = [];
        const visited = new Set();

        let currentId = this.nodeRenderer.headId;
        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const node = this.nodeRenderer.nodes.get(currentId);
            if (!node || !node.logicalEl) break;
            orderedNodes.push(node.logicalEl);
            currentId = node.data && node.data.next ? node.data.next.id : null;
        }

        this.nodeRenderer.nodes.forEach((node, id) => {
            if (node.logicalEl && !visited.has(id)) {
                orderedNodes.push(node.logicalEl);
            }
        });

        orderedNodes.forEach((el, index) => {
            el.style.order = index + 1;
            logicalContainer.appendChild(el);
        });
    }
}
