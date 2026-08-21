window.DemoScenarios = {
	array: [
		{
			id: 'array-search',
			label: 'Preencher e Buscar',
			operations: [
				{ method: 'addLast', args: [15] },
				{ method: 'addLast', args: [22] },
				{ method: 'addLast', args: [47] },
				{ method: 'addLast', args: [9] },
				{ method: 'indexOf', args: [47] },
			],
			description: 'Insere elementos aleatorios e faz a busca pelo numero 47.'
		}
	],
	linkedList: [
		{
			id: 'build-chain',
			label: 'Build 3 Nos',
			operations: [
				{ method: 'addFirst', args: ['10'] },
				{ method: 'addLast', args: ['19'] },
				{ method: 'addLast', args: ['27'] },
			],
		},
		{
			id: 'search-middle',
			label: 'Buscar Meio',
			operations: [
				{ method: 'addFirst', args: ['10'] },
				{ method: 'addLast', args: ['19'] },
				{ method: 'addLast', args: ['27'] },
				{ method: 'get', args: [1] },
			],
		},
		{
			id: 'remove-middle',
			label: 'Remover 19',
			operations: [
				{ method: 'addFirst', args: ['10'] },
				{ method: 'addLast', args: ['19'] },
				{ method: 'addLast', args: ['27'] },
				{ method: 'removeValue', args: ['19'] },
			],
		},
		{
			id: 'linkedlist-search',
			label: 'Preencher e Buscar',
			operations: [
				{ method: 'addLast', args: ['12'] },
				{ method: 'addLast', args: ['44'] },
				{ method: 'addLast', args: ['89'] },
				{ method: 'addLast', args: ['2'] },
				{ method: 'indexOf', args: ['89'] },
			],
		},
	],
	bst: [
		{
			id: 'bst-balanced',
			label: 'BST Balanceada',
			values: [50, 25, 75, 10, 30, 60, 90],
			description: 'Insercao intercalada cria uma BST mais distribuida visualmente.',
		},
		{
			id: 'bst-degenerate',
			label: 'BST Degenerada',
			values: [12, 111, 122, 344, 555],
			description: 'Insercao crescente faz a BST degenerar e virar quase uma lista para a direita.',
		},
	],
	avl: [
		{
			id: 'avl-balanced-growth',
			label: 'AVL Balanceada',
			values: [30, 20, 10, 25, 40, 50],
			description: 'Sequencia gera rotacoes e mantem a altura controlada na AVL.',
		},
		{
			id: 'avl-zigzag',
			label: 'AVL Zig-Zag',
			values: [30, 10, 20, 40, 35],
			description: 'Sequencia LR/RL destaca rotacoes compostas para reequilibrio.',
		},
		{
			id: 'avl-remove-two-children',
			label: 'AVL Remove 2 Filhos',
			operations: [
				{ method: 'insert', args: [40] },
				{ method: 'insert', args: [20] },
				{ method: 'insert', args: [60] },
				{ method: 'insert', args: [10] },
				{ method: 'insert', args: [30] },
				{ method: 'insert', args: [50] },
				{ method: 'insert', args: [70] },
				{ method: 'remove', args: [20] },
			],
			description: 'Monta uma AVL e remove um no com dois filhos para mostrar sucessor e rebalanceamento.',
		},
	],
	rbt: [
		{
			id: 'rbt-recolor',
			label: 'RB Recoloracao',
			values: [10, 5, 15, 1, 6, 12, 18],
			description: 'Destaca casos de recoloracao com tio vermelho.',
		},
		{
			id: 'rbt-rotations',
			label: 'RB Rotacoes',
			values: [41, 38, 31, 12, 19, 8],
			description: 'Sequencia classica que provoca rotacoes e ajustes de cor.',
		},
	],
	trie: [
		{
			id: 'trie-shared-prefix',
			label: 'Trie Prefixos',
			words: ['casa', 'caso', 'casulo', 'carro'],
			description: 'Mostra compartilhamento de prefixos comuns (ca...).',
		},
		{
			id: 'trie-contains',
			label: 'Trie Contains',
			operations: [
				{ method: 'insert', args: ['gato'] },
				{ method: 'insert', args: ['garfo'] },
				{ method: 'insert', args: ['gelo'] },
				{ method: 'contains', args: ['garfo'] },
			],
			description: 'Insere palavras e consulta contains em caminho por caracteres.',
		},
	],
	segmentTree: [
		{
			id: 'segment-build',
			label: 'Segment Build',
			operations: [
				{ method: 'build', args: [[2, 1, 3, 4, 5, 6, 7, 8]] },
			],
			description: 'Monta a arvore de segmentos com somas de intervalos.',
		},
		{
			id: 'segment-query-update',
			label: 'Segment Query + Update',
			operations: [
				{ method: 'build', args: [[2, 1, 3, 4, 5, 6, 7, 8]] },
				{ method: 'query', args: [2, 6] },
				{ method: 'update', args: [3, 10] },
				{ method: 'query', args: [2, 6] },
			],
			description: 'Mostra consulta por intervalo e atualizacao pontual.',
		},
	],
	fenwickTree: [
		{
			id: 'fenwick-build',
			label: 'Fenwick Build',
			operations: [
				{ method: 'build', args: [[2, 1, 3, 4, 5, 6, 7, 8]] },
			],
			description: 'Monta a BIT com acumuladores por bloco binario.',
		},
		{
			id: 'fenwick-query-update',
			label: 'Fenwick Query + Update',
			operations: [
				{ method: 'build', args: [[2, 1, 3, 4, 5, 6, 7, 8]] },
				{ method: 'prefixSum', args: [5] },
				{ method: 'rangeSum', args: [2, 6] },
				{ method: 'update', args: [3, 10] },
				{ method: 'rangeSum', args: [2, 6] },
			],
			description: 'Mostra prefix/range sum e update em O(log n).',
		},
	],
	unionFind: [
		{
			id: 'uf-build-groups',
			label: 'UF Formar Grupos',
			operations: [
				{ method: 'reset', args: [8] },
				{ method: 'union', args: [0, 1] },
				{ method: 'union', args: [1, 2] },
				{ method: 'union', args: [4, 5] },
				{ method: 'union', args: [6, 7] },
			],
			description: 'Monta conjuntos disjuntos com uniao por rank.',
		},
		{
			id: 'uf-connectivity',
			label: 'UF Conectividade',
			operations: [
				{ method: 'reset', args: [8] },
				{ method: 'union', args: [0, 1] },
				{ method: 'union', args: [1, 2] },
				{ method: 'union', args: [2, 3] },
				{ method: 'connected', args: [0, 3] },
				{ method: 'connected', args: [0, 6] },
				{ method: 'find', args: [3] },
			],
			description: 'Mostra find/connected com compressao de caminho.',
		},
	],
	graph: [
		{
			id: 'graph-bfs',
			label: 'Graph BFS',
			operations: [
				{ method: 'reset', args: [7] },
				{ method: 'addEdge', args: [0, 1] },
				{ method: 'addEdge', args: [0, 2] },
				{ method: 'addEdge', args: [1, 3] },
				{ method: 'addEdge', args: [2, 4] },
				{ method: 'addEdge', args: [3, 5] },
				{ method: 'addEdge', args: [4, 6] },
				{ method: 'bfs', args: [0] },
			],
			description: 'Mostra percurso em largura com fila.',
		},
		{
			id: 'graph-dfs',
			label: 'Graph DFS',
			operations: [
				{ method: 'reset', args: [7] },
				{ method: 'addEdge', args: [0, 1] },
				{ method: 'addEdge', args: [0, 2] },
				{ method: 'addEdge', args: [1, 3] },
				{ method: 'addEdge', args: [1, 4] },
				{ method: 'addEdge', args: [2, 5] },
				{ method: 'addEdge', args: [5, 6] },
				{ method: 'dfs', args: [0] },
			],
			description: 'Mostra percurso em profundidade com pilha.',
		},
		{
			id: 'graph-shortest-path',
			label: 'Graph Menor Caminho',
			operations: [
				{ method: 'reset', args: [8] },
				{ method: 'addEdge', args: [0, 1] },
				{ method: 'addEdge', args: [0, 2] },
				{ method: 'addEdge', args: [1, 3] },
				{ method: 'addEdge', args: [2, 4] },
				{ method: 'addEdge', args: [3, 5] },
				{ method: 'addEdge', args: [4, 5] },
				{ method: 'addEdge', args: [5, 6] },
				{ method: 'addEdge', args: [6, 7] },
				{ method: 'shortestPath', args: [0, 7] },
			],
			description: 'Mostra descoberta por BFS e reconstrucao da rota minima.',
		},
	],
	deque: [
		{
			id: 'deque-push-both-sides',
			label: 'Deque Push 2 Lados',
			operations: [
				{ method: 'pushBack', args: [10] },
				{ method: 'pushBack', args: [20] },
				{ method: 'pushFront', args: [5] },
				{ method: 'pushFront', args: [2] },
			],
			description: 'Mostra insercao pela frente e pelo fundo em O(1).',
		},
		{
			id: 'deque-pop-mix',
			label: 'Deque Pop Misto',
			operations: [
				{ method: 'pushBack', args: [1] },
				{ method: 'pushBack', args: [2] },
				{ method: 'pushBack', args: [3] },
				{ method: 'pushFront', args: [0] },
				{ method: 'popFront', args: [] },
				{ method: 'popBack', args: [] },
				{ method: 'peekFront', args: [] },
				{ method: 'peekBack', args: [] },
			],
			description: 'Combina remocoes nas duas pontas e consultas sem remover.',
		},
	],
};
