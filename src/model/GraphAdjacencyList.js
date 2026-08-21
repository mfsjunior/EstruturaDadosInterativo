class GraphAdjacencyList {
    constructor(size = 7) {
        this.defaultSize = Math.max(3, Number(size) || 7);
        this.size = this.defaultSize;
        this.adj = [];
        this.steps = [];
        this.baseAddress = 0x9000;
        this.elementSize = 4;
        this.reset(this.defaultSize);
        this.steps = [];
    }

    _neighborsLabel(index) {
        const list = Array.isArray(this.adj[index]) ? this.adj[index] : [];
        return list.length ? `adj: ${list.join(',')}` : 'adj: -';
    }

    _snapshot() {
        return {
            capacity: this.size,
            baseAddress: this.baseAddress,
            elementSize: this.elementSize,
            size: this.size,
            data: Array.from({ length: this.size }, (_, i) => i),
            relationLabels: Array.from({ length: this.size }, (_, i) => this._neighborsLabel(i)),
        };
    }

    _statePayload(extra = {}) {
        return {
            head: `vertices ${this.size}`,
            tail: `arestas ${this.edgeCount()}`,
            size: this.size,
            ...extra,
        };
    }

    edgeCount() {
        const total = this.adj.reduce((acc, list) => acc + list.length, 0);
        return Math.floor(total / 2);
    }

    _cloud(type, data = {}, description = '') {
        if (type === 'GRAPH_INIT') return 'Cada vertice guarda sua lista de vizinhos na lista de adjacencia.';
        if (type === 'GRAPH_ADD_EDGE') return `Aresta adicionada entre ${data.u} e ${data.v}.`;
        if (type === 'GRAPH_PATH') return `Reconstruindo caminho: ${data.from} -> ${data.to}.`;
        if (type === 'GRAPH_VISIT') {
            if (data.traversal === 'BFS') return `Visitando vertice ${data.node} no nivel ${data.level}; onda BFS avanca por camadas.`;
            if (data.traversal === 'DFS') return `Entrando em ${data.node} na profundidade ${data.depth}; DFS aprofunda antes de voltar.`;
            if (data.traversal === 'SP') return `Explorando ${data.node} para encontrar rota minima ate o destino.`;
            return `Visitando vertice ${data.node}; seus vizinhos podem ser explorados.`;
        }
        if (type === 'GRAPH_ENQUEUE') return `Vertice ${data.node} entrou na fila/pilha de exploracao.`;
        if (type === 'GRAPH_DEQUEUE') return `Vertice ${data.node} removido para processamento.`;
        if (type === 'GRAPH_BACKTRACK') return `Retornando de ${data.node} para ${Number.isInteger(data.parent) ? data.parent : 'fim'} (backtracking).`;
        if (type === 'GRAPH_RESULT') return String(description || 'Resultado da busca calculado.');
        return String(description || 'Operacao em grafo.');
    }

    _addStep(type, payload = {}, codeLine = '', description = '') {
        const data = { ...(payload || {}) };
        data.algorithm = 'GRAPH';
        data.cloud = data.cloud || this._cloud(type, data, description);
        this.steps.push(new Step(type, data, codeLine, description));
    }

    _startOperation(name) {
        this.steps = [];
        this._addStep('INFO', {}, `// ${name}`, `Operacao iniciada: ${name}.`);
    }

    getSteps() {
        const out = [...this.steps];
        this.steps = [];
        return out;
    }

    reset(size = this.defaultSize) {
        const n = Math.max(3, Number(size) || this.defaultSize);
        this._startOperation(`reset(${n})`);
        this.size = n;
        this.adj = Array.from({ length: n }, () => []);
        this._addStep('GRAPH_INIT', this._snapshot(), 'adj = new ArrayList[n];', `Grafo reinicializado com ${n} vertices.`);
        this._addStep('UPDATE_STATE', this._statePayload(), '', 'Estado atualizado.');
        this._addStep('COMPLEXITY', { value: 'O(V)', desc: 'Inicializa listas de adjacencia.' }, '', 'Inicializacao concluida.');
    }

    _valid(index) {
        return Number.isInteger(index) && index >= 0 && index < this.size;
    }

    addEdge(u, v) {
        const a = Number(u);
        const b = Number(v);
        this._startOperation(`addEdge(${a}, ${b})`);
        if (!this._valid(a) || !this._valid(b) || a === b) {
            this._addStep('ERROR', {}, '', `Aresta invalida: (${u}, ${v}).`);
            return false;
        }
        if (!this.adj[a].includes(b)) this.adj[a].push(b);
        if (!this.adj[b].includes(a)) this.adj[b].push(a);
        this.adj[a].sort((x, y) => x - y);
        this.adj[b].sort((x, y) => x - y);

        this._addStep('GRAPH_ADD_EDGE', { u: a, v: b, snapshot: this._snapshot() }, 'adj[u].add(v); adj[v].add(u);', `Aresta adicionada: ${a} <-> ${b}.`);
        this._addStep('UPDATE_STATE', this._statePayload(), '', 'Estado atualizado.');
        this._addStep('COMPLEXITY', { value: 'O(grau)', desc: 'Insercao em listas de adjacencia dos dois vertices.' }, '', 'Insercao concluida.');
        return true;
    }

    bfs(start) {
        const s = Number(start);
        this._startOperation(`bfs(${s})`);
        if (!this._valid(s)) {
            this._addStep('ERROR', {}, '', `Vertice invalido para BFS: ${start}.`);
            return [];
        }

        const visited = new Array(this.size).fill(false);
        const level = new Array(this.size).fill(-1);
        const queue = [s];
        const order = [];
        visited[s] = true;
        level[s] = 0;
        this._addStep('GRAPH_ENQUEUE', { node: s, queue: [...queue], level: level[s], traversal: 'BFS' }, 'queue.add(start);', `Fila inicial: [${queue.join(', ')}].`);

        while (queue.length) {
            const node = queue.shift();
            this._addStep('GRAPH_DEQUEUE', { node, queue: [...queue], level: level[node], traversal: 'BFS' }, 'int node = queue.poll();', `Processando vertice ${node}.`);
            order.push(node);
            this._addStep('GRAPH_VISIT', { node, order: [...order], level: level[node], traversal: 'BFS' }, 'visit(node);', `Ordem parcial BFS: ${order.join(' -> ')}.`);

            this.adj[node].forEach((next) => {
                if (!visited[next]) {
                    visited[next] = true;
                    level[next] = level[node] + 1;
                    queue.push(next);
                    this._addStep('GRAPH_ENQUEUE', { node: next, from: node, queue: [...queue], level: level[next], traversal: 'BFS' }, 'if (!visited[next]) queue.add(next);', `Descoberto ${next} a partir de ${node}.`);
                }
            });
        }

        this._addStep('GRAPH_RESULT', { order }, 'return order;', `BFS concluida: ${order.join(' -> ')}.`);
        this._addStep('COMPLEXITY', { value: 'O(V + E)', desc: 'BFS visita cada vertice/aresta no maximo uma vez.' }, '', 'Busca concluida.');
        return order;
    }

    dfs(start) {
        const s = Number(start);
        this._startOperation(`dfs(${s})`);
        if (!this._valid(s)) {
            this._addStep('ERROR', {}, '', `Vertice invalido para DFS: ${start}.`);
            return [];
        }

        const visited = new Array(this.size).fill(false);
        const order = [];

        const dfsVisit = (node, depth, parent) => {
            visited[node] = true;
            this._addStep('GRAPH_DEQUEUE', { node, depth, parent, traversal: 'DFS' }, 'dfs(node);', `Entrando em ${node}.`);
            order.push(node);
            this._addStep('GRAPH_VISIT', { node, order: [...order], depth, parent, traversal: 'DFS' }, 'visit(node);', `Ordem parcial DFS: ${order.join(' -> ')}.`);

            const neighbors = [...this.adj[node]].sort((a, b) => a - b);
            neighbors.forEach((next) => {
                if (!visited[next]) {
                    this._addStep('GRAPH_ENQUEUE', { node: next, from: node, depth: depth + 1, traversal: 'DFS' }, 'dfs(next);', `Descendo para ${next} a partir de ${node}.`);
                    dfsVisit(next, depth + 1, node);
                }
            });

            this._addStep('GRAPH_BACKTRACK', { node, parent, depth, traversal: 'DFS' }, 'return;', `Backtracking: retornando de ${node}.`);
        };

        this._addStep('GRAPH_ENQUEUE', { node: s, depth: 0, traversal: 'DFS' }, 'dfs(start);', `Inicio da DFS em ${s}.`);
        dfsVisit(s, 0, null);

        this._addStep('GRAPH_RESULT', { order }, 'return order;', `DFS concluida: ${order.join(' -> ')}.`);
        this._addStep('COMPLEXITY', { value: 'O(V + E)', desc: 'DFS percorre vertices e arestas uma vez.' }, '', 'Busca concluida.');
        return order;
    }

    shortestPath(start, target) {
        const s = Number(start);
        const t = Number(target);
        this._startOperation(`shortestPath(${s}, ${t})`);
        if (!this._valid(s) || !this._valid(t)) {
            this._addStep('ERROR', {}, '', `Vertices invalidos para shortestPath: ${start}, ${target}.`);
            return [];
        }

        const visited = new Array(this.size).fill(false);
        const parent = new Array(this.size).fill(-1);
        const level = new Array(this.size).fill(-1);
        const queue = [s];
        visited[s] = true;
        level[s] = 0;

        this._addStep('GRAPH_ENQUEUE', { node: s, queue: [...queue], level: 0, traversal: 'SP' }, 'queue.add(start);', `Busca de caminho iniciada em ${s}.`);

        let found = s === t;
        while (queue.length && !found) {
            const node = queue.shift();
            this._addStep('GRAPH_DEQUEUE', { node, queue: [...queue], level: level[node], traversal: 'SP' }, 'int node = queue.poll();', `Analisando vertice ${node}.`);
            this._addStep('GRAPH_VISIT', { node, target: t, level: level[node], traversal: 'SP' }, 'visit(node);', `Visitando ${node} procurando ${t}.`);

            this.adj[node].forEach((next) => {
                if (found || visited[next]) return;
                visited[next] = true;
                parent[next] = node;
                level[next] = level[node] + 1;
                queue.push(next);
                this._addStep('GRAPH_ENQUEUE', {
                    node: next,
                    from: node,
                    queue: [...queue],
                    level: level[next],
                    traversal: 'SP',
                }, 'if (!visited[next]) queue.add(next);', `Descoberto ${next} via ${node}.`);

                if (next === t) found = true;
            });
        }

        if (!visited[t]) {
            this._addStep('GRAPH_RESULT', { path: [], distance: -1, start: s, target: t }, 'return empty;', `Nao existe caminho de ${s} ate ${t}.`);
            this._addStep('COMPLEXITY', { value: 'O(V + E)', desc: 'Busca em largura para descobrir se ha rota.' }, '', 'Busca de caminho encerrada.');
            return [];
        }

        const path = [];
        for (let cur = t; cur !== -1; cur = parent[cur]) path.push(cur);
        path.reverse();

        for (let i = 1; i < path.length; i += 1) {
            this._addStep('GRAPH_PATH', {
                from: path[i - 1],
                to: path[i],
                index: i,
                length: path.length,
                path: [...path],
            }, 'cur = parent[cur];', `Reconstruindo rota: ${path[i - 1]} -> ${path[i]}.`);
        }

        this._addStep('GRAPH_RESULT', {
            path,
            distance: Math.max(0, path.length - 1),
            start: s,
            target: t,
        }, 'return path;', `Menor caminho encontrado: ${path.join(' -> ')}.`);
        this._addStep('COMPLEXITY', { value: 'O(V + E)', desc: 'BFS encontra o menor numero de arestas em grafo nao ponderado.' }, '', 'Busca de caminho concluida.');
        return path;
    }
}