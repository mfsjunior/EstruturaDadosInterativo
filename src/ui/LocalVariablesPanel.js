class LocalVariablesPanel {
    constructor(containerId) {
        this.body = document.getElementById(containerId);
        this.methodName = null;
        this.args = [];
    }

    setContext(methodName, args) {
        this.methodName = methodName;
        this.args = Array.isArray(args) ? args : [args];
    }

    update(step, listState) {
        if (!this.body) return;

        const rows = [];
        const data = (step && step.data) || {};

        if (data.target !== undefined) rows.push(['node', data.target || 'null']);
        else if (data.source !== undefined) rows.push(['node', data.source || 'null']);
        else if (data.node && data.node.id) rows.push(['node', data.node.id]);

        if (this.methodName === 'get' && this.args.length) rows.push(['index', this.args[0]]);
        if (this.methodName === 'removeValue' && this.args.length) rows.push(['value', this.args[0]]);
        if (data.i !== undefined) rows.push(['i', data.i]);

        if (listState) {
            rows.push(['head', listState.head || 'null']);
            rows.push(['tail', listState.tail || 'null']);
            rows.push(['size', listState.size]);
        }

        this.body.innerHTML = rows
            .map(([key, val]) => `<tr><td>${key}</td><td>${val}</td></tr>`)
            .join('') || '<tr><td colspan="2">-</td></tr>';
    }

    clear() {
        this.methodName = null;
        this.args = [];
        if (this.body) this.body.innerHTML = '<tr><td colspan="2">-</td></tr>';
    }
}
