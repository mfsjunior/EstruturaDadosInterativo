window.DemoScenarios = {
	circularQueue: [
		{
			id: 'cq-fill-dequeue',
			label: 'Enfileirar e Remover',
			operations: [
				{ method: 'enqueue', args: [10] },
				{ method: 'enqueue', args: [25] },
				{ method: 'enqueue', args: [40] },
				{ method: 'enqueue', args: [55] },
				{ method: 'dequeue', args: [] },
				{ method: 'dequeue', args: [] },
			],
			description: 'Enfileira 4 elementos e remove 2 mostrando o avanco da frente.'
		},
		{
			id: 'cq-wrap-around',
			label: 'Wrap-Around Circular',
			operations: [
				{ method: 'enqueue', args: [1] },
				{ method: 'enqueue', args: [2] },
				{ method: 'enqueue', args: [3] },
				{ method: 'enqueue', args: [4] },
				{ method: 'enqueue', args: [5] },
				{ method: 'enqueue', args: [6] },
				{ method: 'dequeue', args: [] },
				{ method: 'dequeue', args: [] },
				{ method: 'dequeue', args: [] },
				{ method: 'dequeue', args: [] },
				{ method: 'enqueue', args: [7] },
				{ method: 'enqueue', args: [8] },
				{ method: 'enqueue', args: [9] },
				{ method: 'enqueue', args: [10] },
			],
			description: 'Demonstra o ponteiro traseiro dando a volta no array circular.'
		},
		{
			id: 'cq-peek',
			label: 'Preencher e Espiar Frente',
			operations: [
				{ method: 'enqueue', args: [77] },
				{ method: 'enqueue', args: [88] },
				{ method: 'enqueue', args: [99] },
				{ method: 'peek', args: [] },
			],
			description: 'Consulta o elemento na frente da fila sem remover.'
		},
	],
	array: [
		{
			id: 'array-insert-end',
			label: 'Inserir no Fim (O(1))',
			operations: [
				{ method: 'insertLast', args: [10] },
				{ method: 'insertLast', args: [20] },
				{ method: 'insertLast', args: [30] },
				{ method: 'insertLast', args: [40] },
			],
			description: 'Insere elementos sequencialmente no fim do vetor.'
		},
		{
			id: 'array-insert-beginning',
			label: 'Inserir no Inicio (O(n))',
			operations: [
				{ method: 'insertLast', args: [10] },
				{ method: 'insertLast', args: [20] },
				{ method: 'insertLast', args: [30] },
				{ method: 'insert', args: [0, 99] },
			],
			description: 'Insere no indice 0 forcando o deslocamento (shift) de todos para a direita.'
		},
		{
			id: 'array-search',
			label: 'Preencher e Buscar',
			operations: [
				{ method: 'insertLast', args: [15] },
				{ method: 'insertLast', args: [32] },
				{ method: 'insertLast', args: [47] },
				{ method: 'insertLast', args: [8] },
				{ method: 'indexOf', args: [47] },
			],
			description: 'Insere elementos e faz busca linear por 47.'
		}
	],
	stack: [
		{
			id: 'stack-fill-search',
			label: 'Preencher e Espiar Topo',
			operations: [
				{ method: 'push', args: [12] },
				{ method: 'push', args: [44] },
				{ method: 'push', args: [89] },
				{ method: 'push', args: [2] },
				{ method: 'peek', args: [] },
			],
		},
		{
			id: 'stack-fill-pop',
			label: 'Preencher e Desempilhar',
			operations: [
				{ method: 'push', args: [12] },
				{ method: 'push', args: [44] },
				{ method: 'push', args: [89] },
				{ method: 'push', args: [2] },
				{ method: 'pop', args: [] },
				{ method: 'pop', args: [] },
			],
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
	doublyLinkedList: [
		{
			id: 'dll-build-chain',
			label: 'Inserir Inicio e Fim',
			operations: [
				{ method: 'addFirst', args: ['10'] },
				{ method: 'addLast', args: ['20'] },
				{ method: 'addFirst', args: ['5'] },
				{ method: 'addLast', args: ['30'] },
			],
			description: 'Demonstra criacao de nos e conexao de ponteiros next e previous.'
		},
		{
			id: 'dll-remove-both-ends',
			label: 'Remover Inicio e Fim O(1)',
			operations: [
				{ method: 'addLast', args: ['10'] },
				{ method: 'addLast', args: ['20'] },
				{ method: 'addLast', args: ['30'] },
				{ method: 'addLast', args: ['40'] },
				{ method: 'removeFirst', args: [] },
				{ method: 'removeLast', args: [] },
			],
			description: 'Remove do inicio e do fim demonstrando o custo O(1) com tail.previous.'
		},
		{
			id: 'dll-remove-middle',
			label: 'Remover no Meio (Unlink)',
			operations: [
				{ method: 'addLast', args: ['15'] },
				{ method: 'addLast', args: ['25'] },
				{ method: 'addLast', args: ['35'] },
				{ method: 'removeValue', args: ['25'] },
			],
			description: 'Demonstra a desconexao (unlink) ajustando prev.next e next.prev.'
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
	kdTree: [
		{
			id: 'kdtree-build-6',
			label: 'Construção 2D (6 Pontos)',
			operations: [
				{ method: 'insert', args: [50, 40] },
				{ method: 'insert', args: [30, 60] },
				{ method: 'insert', args: [80, 20] },
				{ method: 'insert', args: [20, 10] },
				{ method: 'insert', args: [40, 70] },
				{ method: 'insert', args: [90, 80] },
			],
			description: 'Insere 6 pontos alternando cortes verticais (X) e horizontais (Y) no espaço [0, 100].',
		},
		{
			id: 'kdtree-knn-prune',
			label: 'KNN (Poda Espacial)',
			operations: [
				{ method: 'insert', args: [50, 40] },
				{ method: 'insert', args: [30, 60] },
				{ method: 'insert', args: [80, 20] },
				{ method: 'insert', args: [20, 10] },
				{ method: 'insert', args: [40, 70] },
				{ method: 'insert', args: [90, 80] },
				{ method: 'nearestNeighbor', args: [45, 65] },
			],
			description: 'Busca o vizinho mais próximo de Q(45, 65) demonstrando a hiperesfera e a poda de ramos distantes.',
		},
		{
			id: 'kdtree-range-search',
			label: 'Busca por Região',
			operations: [
				{ method: 'insert', args: [50, 40] },
				{ method: 'insert', args: [30, 60] },
				{ method: 'insert', args: [80, 20] },
				{ method: 'insert', args: [20, 10] },
				{ method: 'insert', args: [40, 70] },
				{ method: 'insert', args: [90, 80] },
				{ method: 'rangeSearch', args: [25, 60, 30, 75] },
			],
			description: 'Filtra todos os pontos dentro do retângulo delimitador [25..60] x [30..75].',
		},
		{
			id: 'kdtree-isolated-knn',
			label: 'Ponto Isolado (Poda Agressiva)',
			operations: [
				{ method: 'insert', args: [50, 40] },
				{ method: 'insert', args: [30, 60] },
				{ method: 'insert', args: [80, 20] },
				{ method: 'insert', args: [20, 10] },
				{ method: 'insert', args: [40, 70] },
				{ method: 'insert', args: [90, 80] },
				{ method: 'nearestNeighbor', args: [15, 12] },
			],
			description: 'Busca em região de canto onde a hiperesfera é pequena, podando a maior parte da árvore.',
		},
	],
	bst: [
		{
			id: 'bst-skewed',
			label: 'Árvore Torta (Linear)',
			values: [12, 1, 22, 2, 22222, 1212212],
			description: 'Insere os nós na mesma ordem que testamos para ver o formato torto.'
		},
		{
			id: 'bst-balanced',
			label: 'Árvore Balanceada',
			values: [12, 5, 18, 3, 7, 15, 20, 1, 4],
			description: 'Cria uma árvore binária mais balanceada.'
		}
	]
};
