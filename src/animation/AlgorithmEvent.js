class AlgorithmEvent {
    constructor({
        id,
        type,
        step,
        lineNumber = null,
        description = '',
        why = '',
        nodeId = null,
        affectedNodes = [],
        variables = {},
        beforeState = null,
        afterState = null,
        animation = 'highlight',
        rawStep = null,
    } = {}) {
        this.id = id || `evt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
        this.type = String(type || 'STEP');
        this.step = Number(step || 0);
        this.lineNumber = Number.isInteger(lineNumber) ? lineNumber : null;
        this.description = String(description || '');
        this.why = String(why || '');
        this.nodeId = nodeId || null;
        this.affectedNodes = Array.isArray(affectedNodes) ? [...affectedNodes] : [];
        this.variables = variables && typeof variables === 'object' ? { ...variables } : {};
        this.beforeState = beforeState;
        this.afterState = afterState;
        this.animation = String(animation || 'highlight');
        this.rawStep = rawStep || null;
    }
}
