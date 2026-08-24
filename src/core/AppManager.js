class AppManager {
    constructor() {
        this.statePanel = new StatePanel();
        this.complexityPanel = new ComplexityPanel();
        this.consolePanel = new ConsolePanel();
        this.codeHighlighter = new CodeHighlighter('codeDisplay', 'codeFileName');
        this.callStackPanel = new CallStackPanel('callStackList');
        this.localVarsPanel = new LocalVariablesPanel('localVarsBody');
        this.timelinePanel = new TimelinePanel('timelineTrack', (index) => {
            if (this.activeModule && this.activeModule.animationController) {
                this.activeModule.animationController.jumpTo(index);
            }
        });
        this.algorithmDebugPanel = new AlgorithmDebugPanel(this);

        this.syncManager = new SyncManager(this);
        this.syncPanel = new SyncPanel(this);
        window.appSyncManager = this.syncManager; // Expose globally for modules

        this.modules = {};
        this.activeModule = null;
        this.activeModuleId = null;
        this.animationController = null;
        this.activeViewTab = 'logical';
        this.isPresentationMode = false;
        this.projectorProfile = 'projector';
        this.activeRightPanel = 'code';

        this._bindSidebar();
        this._bindViewTabs();
        this._bindPresentationMode();
        this._bindAlgorithmDebug();
        this._bindUltraProjectorMode();
        this._bindProjectorProfileSelect();
        this._bindRightPanelMenu();
        this._bindLayoutRefresh();
        this._setupNoRightSidebarLayout();
        
        // Inicializa o tutorial
        if (typeof TutorialManager !== 'undefined') {
            this.tutorialManager = new TutorialManager();
            this.tutorialManager.init();
        }
    }

    _setupNoRightSidebarLayout() {
        const appBody = document.querySelector('.app-body');
        if (appBody) appBody.classList.add('no-right-sidebar');

        const controlsHost = document.getElementById('leftControlsHost');
        if (!controlsHost) return;

        const controls = document.querySelectorAll('.right-sidebar .module-controls');
        controls.forEach((panel) => controlsHost.appendChild(panel));
    }

    _bindLayoutRefresh() {
        window.addEventListener('resize', () => {
            requestAnimationFrame(() => this._refreshActiveTreeLayout());
        });
    }

    init() {
        this.registerModule('LinkedList', new LinkedListModule(this));
        this.registerModule('Array', new ArrayModule(this));
        this.registerModule('Stack', new StackModule(this));
        this.registerModule('CircularQueue', new CircularQueueModule(this));
        this.registerModule('Deque', new DequeModule(this));
        this.registerModule('PriorityHeap', new PriorityHeapModule(this));
        this.registerModule('HashTable', new HashTableModule(this));
        this.registerModule('BST', new BSTModule(this));
        this.registerModule('AVL', new AVLModule(this));
        this.registerModule('RedBlack', new RedBlackModule(this));
        this.registerModule('Trie', new TrieModule(this));
        this.registerModule('SegmentTree', new SegmentTreeModule(this));
        this.registerModule('FenwickTree', new FenwickModule(this));
        this.registerModule('UnionFind', new UnionFindModule(this));
        this.registerModule('Graph', new GraphModule(this));
        this.loadModule('LinkedList');
    }

    registerModule(id, moduleInstance) {
        // Intercept executeOperation to broadcast automatically
        if (typeof moduleInstance.executeOperation === 'function') {
            const originalExecute = moduleInstance.executeOperation.bind(moduleInstance);
            moduleInstance.executeOperation = (methodName, args = [], silent = false, autoPlay = true, fromNetwork = false) => {
                if (!fromNetwork && this.syncManager && this.syncManager.isHost) {
                    this.syncManager.broadcastAction('EXECUTE_OPERATION', { methodName, args, autoPlay });
                }
                return originalExecute(methodName, args, silent, autoPlay, fromNetwork);
            };
        }

        // Intercept runScenario
        if (typeof moduleInstance.runScenario === 'function') {
            const originalRun = moduleInstance.runScenario.bind(moduleInstance);
            moduleInstance.runScenario = (scenarioId, fromNetwork = false) => {
                if (!fromNetwork && this.syncManager && this.syncManager.isHost) {
                    this.syncManager.broadcastAction('RUN_SCENARIO', { scenarioId });
                }
                return originalRun(scenarioId, fromNetwork);
            };
        }

        // Intercept resetSystem
        if (typeof moduleInstance.resetSystem === 'function') {
            const originalReset = moduleInstance.resetSystem.bind(moduleInstance);
            moduleInstance.resetSystem = (fromNetwork = false) => {
                if (!fromNetwork && this.syncManager && this.syncManager.isHost) {
                    this.syncManager.broadcastAction('ANIM_RESTART');
                }
                return originalReset(fromNetwork);
            };
        }

        this.modules[id] = moduleInstance;
    }

    loadModule(id) {
        if (this.activeModuleId === id) return;

        if (this.syncManager && this.syncManager.isHost) {
            this.syncManager.broadcastAction('CHANGE_MODULE', { moduleId: id });
        }

        if (this.activeModule) {
            this.activeModule.destroy();
        }

        const nextModule = this.modules[id];
        if (!nextModule) return;

        this.activeModuleId = id;
        this.activeModule = nextModule;

        const moduleNames = {
            LinkedList: 'LinkedList (Dupla)',
            Array: 'Array Sequencial',
            Stack: 'Pilha (LIFO)',
            CircularQueue: 'Fila Circular (FIFO)',
            Deque: 'Deque (Fila Dupla)',
            PriorityHeap: 'Heap de Prioridade',
            HashTable: 'Tabela Hash',
            BST: 'Arvore BST',
            AVL: 'Arvore AVL',
            RedBlack: 'Arvore Red-Black',
            Trie: 'Arvore Trie',
            SegmentTree: 'Arvore de Segmentos',
            FenwickTree: 'Arvore Fenwick (BIT)',
            UnionFind: 'Union-Find (Disjoint Set)',
            Graph: 'Grafo (Adjacencia)'
        };
        const moduleIndexes = {
            Array: '01',
            LinkedList: '02',
            Stack: '03',
            CircularQueue: '04',
            Deque: '15',
            PriorityHeap: '05',
            HashTable: '06',
            BST: '07',
            AVL: '08',
            RedBlack: '09',
            Trie: '10',
            SegmentTree: '11',
            FenwickTree: '12',
            UnionFind: '13',
            Graph: '14'
        };
        const headerName = document.getElementById('headerModuleName');
        if (headerName) headerName.textContent = moduleNames[id] || id;
        const headerIndex = document.getElementById('headerModuleIndex');
        if (headerIndex) headerIndex.textContent = moduleIndexes[id] || '--';

        document.querySelectorAll('.module-controls').forEach(panel => panel.classList.add('hidden'));
        const activeControls = document.getElementById(`${id}Controls`);
        if (activeControls) activeControls.classList.remove('hidden');

        const nodesContainer = document.getElementById('nodesContainer');
        const arrowsCanvas = document.getElementById('arrowsCanvas');
        const memoryArrowsCanvas = document.getElementById('memoryArrowsCanvas');
        if (nodesContainer) nodesContainer.innerHTML = '';
        if (arrowsCanvas) arrowsCanvas.innerHTML = '';
        if (memoryArrowsCanvas) memoryArrowsCanvas.innerHTML = '';

        this.codeHighlighter.clear();
        this.consolePanel.clear();
        this.statePanel.reset();
        this.complexityPanel.reset();
        this.callStackPanel.reset();
        this.localVarsPanel.clear();
        this.timelinePanel.clear();

        const operationTitle = document.getElementById('currentOperationTitle');
        if (operationTitle) operationTitle.textContent = '-';
        const stepCounter = document.getElementById('stepCounter');
        if (stepCounter) stepCounter.textContent = '0/0';
        const stepAction = document.getElementById('currentStepAction');
        if (stepAction) stepAction.textContent = 'Aguardando operacao...';

        this._applyTeachingLabels(id);

        const memoryContainer = document.getElementById('memoryNodesContainer');
        if (memoryContainer) {
            if (id === 'HashTable') {
                memoryContainer.innerHTML = '<div style="color: rgba(148,163,184,0.85); padding: 20px; text-align: center; font-style: italic;">A Tabela Hash usa um array contiguo de buckets. O hash calcula a posicao inicial e, se houver colisao, a sondagem linear avanca para o proximo slot livre.</div>';
            } else if (id === 'Array' || id === 'Stack' || id === 'CircularQueue' || id === 'Deque' || id === 'PriorityHeap' || id === 'FenwickTree' || id === 'UnionFind' || id === 'Graph') {
                memoryContainer.innerHTML = '<div style="color: rgba(148,163,184,0.85); padding: 20px; text-align: center; font-style: italic;">Na estrutura Array, a alocacao de memoria e contigua. A disposicao logica e fisica permanecem alinhadas.</div>';
            } else {
                memoryContainer.innerHTML = '';
            }
        }

        this._applyViewTab();
        this._applyRightPanel(this.activeRightPanel);
        this.activeModule.init();
        this._syncVisualizationCardMeta();
        this._syncPresentationModeUi();
    }

    _applyTeachingLabels(moduleId) {
        const stateLabel = document.getElementById('stateCardLabel');
        const focusLabel = document.getElementById('focusCardLabel');
        const stateHeadKey = document.getElementById('stateHeadKey');
        const stateTailKey = document.getElementById('stateTailKey');
        const focusKeyNode = document.getElementById('focusKeyNode');
        const focusKeyAddress = document.getElementById('focusKeyAddress');
        const focusKeyValue = document.getElementById('focusKeyValue');
        const focusKeyPrev = document.getElementById('focusKeyPrev');
        const focusKeyNext = document.getElementById('focusKeyNext');

        const labelByModule = {
            LinkedList: {
                state: 'ESTADO DA LISTA',
                focus: 'NODE ATUAL',
                headKey: 'HEAD',
                tailKey: 'TAIL',
                focusKeys: ['Node:', 'Address:', 'Value:', 'Previous:', 'Next:'],
            },
            Array: {
                state: 'ESTADO DO ARRAY',
                focus: 'CELULA ATUAL',
                headKey: 'INICIO',
                tailKey: 'FIM',
                focusKeys: ['Indice ativo:', 'Endereco:', 'Valor:', 'Indice anterior:', 'Proximo indice:'],
            },
            Stack: {
                state: 'ESTADO DA PILHA',
                focus: 'TOPO ATUAL',
                headKey: 'BASE',
                tailKey: 'TOPO',
                focusKeys: ['Topo:', 'Endereco topo:', 'Valor topo:', 'Abaixo do topo:', 'Nova posicao topo:'],
            },
            CircularQueue: {
                state: 'ESTADO DA FILA',
                focus: 'POSICAO ATUAL',
                headKey: 'FRENTE',
                tailKey: 'TRASEIRA',
                focusKeys: ['Frente:', 'Endereco frente:', 'Valor frente:', 'Indice removido:', 'Proxima frente:'],
            },
            Deque: {
                state: 'ESTADO DO DEQUE',
                focus: 'EXTREMIDADE ATUAL',
                headKey: 'FRENTE',
                tailKey: 'FUNDO',
                focusKeys: ['Indice foco:', 'Endereco:', 'Valor:', 'Anterior logico:', 'Proximo logico:'],
            },
            PriorityHeap: {
                state: 'ESTADO DO HEAP',
                focus: 'RAIZ ATUAL',
                headKey: 'MIN',
                tailKey: 'ULTIMO',
                focusKeys: ['Raiz (idx):', 'Endereco raiz:', 'Valor raiz:', 'Filho esquerdo:', 'Filho direito:'],
            },
            HashTable: {
                state: 'ESTADO DA HASH',
                focus: 'SLOT ATUAL',
                headKey: 'HASH',
                tailKey: 'COLISOES',
                focusKeys: ['Slot ativo:', 'Endereco:', 'Entrada:', 'Hash base:', 'Probe atual:'],
            },
            BST: {
                state: 'ESTADO DA BST',
                focus: 'NO ATUAL',
                headKey: 'ROOT',
                tailKey: 'TAMANHO',
                focusKeys: ['No:', 'Endereco:', 'Valor:', 'Filho esquerdo:', 'Filho direito:'],
            },
            AVL: {
                state: 'ESTADO DA AVL',
                focus: 'NO ATUAL',
                headKey: 'ROOT',
                tailKey: 'TAMANHO',
                focusKeys: ['No:', 'Endereco:', 'Valor:', 'Filho esquerdo:', 'Filho direito:'],
            },
            RedBlack: {
                state: 'ESTADO RED-BLACK',
                focus: 'NO ATUAL',
                headKey: 'ROOT',
                tailKey: 'TAMANHO',
                focusKeys: ['No:', 'Endereco:', 'Valor:', 'Filho esquerdo:', 'Filho direito:'],
            },
            Trie: {
                state: 'ESTADO DA TRIE',
                focus: 'NO ATUAL',
                headKey: 'ROOT',
                tailKey: 'PALAVRAS',
                focusKeys: ['No:', 'Endereco:', 'Caractere:', 'Primeiro filho:', 'Proximo irmao:'],
            },
            SegmentTree: {
                state: 'ESTADO DA SEGMENT TREE',
                focus: 'NO ATUAL',
                headKey: 'ROOT',
                tailKey: 'INTERVALOS',
                focusKeys: ['No:', 'Endereco:', 'Intervalo:', 'Valor:', 'Filho esquerdo:', 'Filho direito:'],
            },
            FenwickTree: {
                state: 'ESTADO DA FENWICK',
                focus: 'TEMA ATUAL',
                headKey: 'IDX INICIAL',
                tailKey: 'IDX FINAL',
                focusKeys: ['Indice:', 'Endereco:', 'Valor:', 'Cobertura:', 'Proximo salto:'],
            },
            UnionFind: {
                state: 'ESTADO DO UNION-FIND',
                focus: 'NO ATUAL',
                headKey: 'COMPONENTES',
                tailKey: 'NOS',
                focusKeys: ['No:', 'Endereco:', 'Pai atual:', 'Observacao:', 'Proximo passo:'],
            },
            Graph: {
                state: 'ESTADO DO GRAFO',
                focus: 'VERTICE ATUAL',
                headKey: 'VERTICES',
                tailKey: 'ARESTAS',
                focusKeys: ['Vertice:', 'Endereco:', 'Valor:', 'Status:', 'Ordem de visita:'],
            },
        };

        const labels = labelByModule[moduleId] || labelByModule.LinkedList;
        if (stateLabel) stateLabel.textContent = labels.state;
        if (focusLabel) focusLabel.textContent = labels.focus;
        if (stateHeadKey) stateHeadKey.textContent = labels.headKey;
        if (stateTailKey) stateTailKey.textContent = labels.tailKey;
        if (focusKeyNode) focusKeyNode.textContent = labels.focusKeys[0];
        if (focusKeyAddress) focusKeyAddress.textContent = labels.focusKeys[1];
        if (focusKeyValue) focusKeyValue.textContent = labels.focusKeys[2];
        if (focusKeyPrev) focusKeyPrev.textContent = labels.focusKeys[3];
        if (focusKeyNext) focusKeyNext.textContent = labels.focusKeys[4];
    }

    _bindRightPanelMenu() {
        const select = document.getElementById('rightPanelSelect');
        if (!select) return;

        select.addEventListener('change', (event) => {
            this.activeRightPanel = event.target.value || 'code';
            this._applyRightPanel(this.activeRightPanel);
        });
    }

    _applyRightPanel(panelName) {
        const items = document.querySelectorAll('.right-panel-item');
        items.forEach((item) => {
            const key = item.getAttribute('data-right-panel');
            item.classList.toggle('hidden', key !== panelName);
        });

        const select = document.getElementById('rightPanelSelect');
        if (select && select.value !== panelName) {
            select.value = panelName;
        }
    }

    _bindPresentationMode() {
        const btn = document.getElementById('btnExpandWorkspace');
        if (btn) {
            btn.addEventListener('click', () => this.togglePresentationMode());
        }
    }

    _bindUltraProjectorMode() {
        const btn = document.getElementById('btnUltraProjector');
        if (!btn) return;

        btn.addEventListener('click', () => {
            this.projectorProfile = this.projectorProfile === 'ultra' ? 'projector' : 'ultra';
            this._syncProjectorProfileUi();
            if (this.syncManager && this.syncManager.isHost) {
                this.syncManager.broadcastAction('SET_PROJECTOR_PROFILE', { profile: this.projectorProfile });
            }
        });
    }

    _bindProjectorProfileSelect() {
        const select = document.getElementById('projectorProfileSelect');
        if (!select) return;

        select.addEventListener('change', (event) => {
            const value = (event.target.value || '').toLowerCase();
            if (value === 'normal' || value === 'projector' || value === 'ultra') {
                this.projectorProfile = value;
                this._syncProjectorProfileUi();
                if (this.syncManager && this.syncManager.isHost) {
                    this.syncManager.broadcastAction('SET_PROJECTOR_PROFILE', { profile: value });
                }
            }
        });
    }


    togglePresentationMode(forceValue, fromNetwork = false) {
        this.isPresentationMode = typeof forceValue === 'boolean' ? forceValue : !this.isPresentationMode;
        this._syncPresentationModeUi();
        if (!fromNetwork && this.syncManager && this.syncManager.isHost) {
            this.syncManager.broadcastAction('TOGGLE_PRESENTATION_MODE', { isPresentationMode: this.isPresentationMode });
        }
    }

    _bindSidebar() {
        const sidebar = document.querySelector('.left-sidebar');
        const toggleBtn = document.querySelector('.sidebar-toggle-btn');

        if (sidebar) {
            // Keep menu visible on first load; collapse only via explicit user action.
            sidebar.classList.remove('collapsed');
        }

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                const isCollapsed = sidebar.classList.contains('collapsed');
                toggleBtn.setAttribute('aria-label', isCollapsed ? 'Mostrar menu lateral' : 'Ocultar menu lateral');
                requestAnimationFrame(() => this._refreshActiveTreeLayout());
            });
        }

        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (item.classList.contains('disabled')) return;
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                const moduleId = item.getAttribute('data-module');
                if (moduleId) this.loadModule(moduleId);
            });
        });
    }

    _bindViewTabs() {
        const tabs = document.querySelectorAll('.view-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const viewName = tab.getAttribute('data-view');
                this.setMainViewTab(viewName);
            });
        });
    }

    setMainViewTab(viewName, fromNetwork = false) {
        if (this.activeViewTab === viewName) return;
        
        document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector(`.view-tab[data-view="${viewName}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        this.activeViewTab = viewName;
        this._applyViewTab();
        
        if (!fromNetwork && this.syncManager && this.syncManager.isHost) {
            this.syncManager.broadcastAction('SET_MAIN_VIEW_TAB', { viewName });
        }
    }

    _bindAlgorithmDebug() {
        const btn = document.getElementById('btnVisualAlgorithm');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const nextView = this.activeViewTab === 'debug' ? 'logical' : 'debug';
            this.setMainViewTab(nextView);
        });
    }

    _applyViewTab() {
        const mainStructureCard = document.getElementById('mainStructureCard');
        const heapCard = document.getElementById('heapCard');
        const heapTreeCard = document.getElementById('heapTreeCard');
        const debugCard = document.getElementById('algorithmDebugCard');
        if (!heapCard) return;

        const isDebugView = this.activeViewTab === 'debug';
        const supportsMemoryView = ['LinkedList', 'Array', 'Stack', 'CircularQueue', 'Deque', 'PriorityHeap', 'HashTable', 'FenwickTree', 'UnionFind', 'Graph'].includes(this.activeModuleId);
        const isTreeModule = this.activeModuleId === 'BST' || this.activeModuleId === 'AVL' || this.activeModuleId === 'RedBlack' || this.activeModuleId === 'Trie';
        const showHeap = supportsMemoryView && (this.activeViewTab === 'memory' || this.activeViewTab === 'split') && !isTreeModule;
        const showTree = (this.activeModuleId === 'PriorityHeap' || isTreeModule) && (this.activeViewTab === 'logical' || this.activeViewTab === 'split');
        const hideMainStructure = isTreeModule;

        if (heapCard) heapCard.classList.toggle('hidden', !showHeap);

        if (heapTreeCard) heapTreeCard.classList.toggle('hidden', !showTree);

        if (mainStructureCard) mainStructureCard.classList.toggle('hidden', hideMainStructure);

        const timelineCard = document.querySelector('.timeline-card');

        if (debugCard) {
            const supportsDebug = ['Array', 'LinkedList', 'BST', 'AVL', 'RedBlack', 'Trie', 'Graph'].includes(this.activeModuleId);
            const showDebug = isDebugView && supportsDebug;
            debugCard.classList.toggle('hidden', !showDebug);
            if (timelineCard) timelineCard.classList.toggle('hidden', showDebug);
            if (mainStructureCard && showDebug) mainStructureCard.classList.add('hidden');
            if (heapTreeCard && showDebug) heapTreeCard.classList.add('hidden');
            if (heapCard && showDebug) heapCard.classList.add('hidden');
            if (this.algorithmDebugPanel) {
                this.algorithmDebugPanel.setVisible(showDebug);
                if (showDebug) this.algorithmDebugPanel.showIdleHint(this.activeModuleId);
            }

            const nodesContainer = document.getElementById('nodesContainer');
            const arrowsCanvas = document.getElementById('arrowsCanvas');

            if (showDebug) {
                if (this.activeModuleId === 'LinkedList') {
                    const debugTreePreview = document.getElementById('debugTreePreview');
                    if (debugTreePreview && nodesContainer && arrowsCanvas) {
                        debugTreePreview.appendChild(nodesContainer);
                        debugTreePreview.appendChild(arrowsCanvas);
                    }
                }
                const sidebar = document.querySelector('.left-sidebar');
                if (sidebar && sidebar.classList.contains('collapsed')) {
                    sidebar.classList.remove('collapsed');
                }
            } else {
                const logicalView = document.getElementById('logicalView');
                if (logicalView && nodesContainer && arrowsCanvas) {
                    logicalView.appendChild(nodesContainer);
                    logicalView.appendChild(arrowsCanvas);
                }
            }
        } else if (timelineCard) {
            timelineCard.classList.remove('hidden');
        }

        this._syncVisualizationCardMeta();
        this._syncTreeCardMeta();
        this._refreshActiveTreeLayout();
    }

    _syncVisualizationCardMeta() {
        const mainTitle = document.getElementById('mainStructureTitle');
        const mainLegend = document.getElementById('mainStructureLegend');
        const memoryTitle = document.getElementById('memoryCardTitle');
        if (!mainTitle || !mainLegend || !memoryTitle) return;

        const metaByModule = {
            Array: {
                mainTitle: 'ARRAY SEQUENCIAL',
                mainLegend: 'Acesso direto por indice em memoria contigua.',
                memoryTitle: 'MEMORIA CONTIGUA DO ARRAY',
            },
            LinkedList: {
                mainTitle: 'MAPA DE MEMORIA DA LISTA',
                mainLegend: 'Nos independentes conectados por referencias prev e next.',
                memoryTitle: 'HEAP (NOS NA MEMORIA)',
            },
            Stack: {
                mainTitle: 'PILHA - VISAO LOGICA',
                mainLegend: 'Insercao e remocao sempre no topo (LIFO).',
                memoryTitle: 'MEMORIA CONTIGUA DA PILHA',
            },
            CircularQueue: {
                mainTitle: 'FILA CIRCULAR - VISAO LOGICA',
                mainLegend: 'Frente e traseira avancam em anel sobre o mesmo array.',
                memoryTitle: 'MEMORIA CONTIGUA DA FILA',
            },
            Deque: {
                mainTitle: 'DEQUE (FILA DUPLA) - VISAO LOGICA',
                mainLegend: 'Insercao/remocao em ambas as extremidades com buffer circular.',
                memoryTitle: 'MEMORIA CONTIGUA DO DEQUE',
            },
            PriorityHeap: {
                mainTitle: 'HEAP DE PRIORIDADE - ARRAY BASE',
                mainLegend: 'A raiz guarda o menor valor e os filhos obedecem a ordem local.',
                memoryTitle: 'HEAP (NOS NA MEMORIA)',
            },
            HashTable: {
                mainTitle: 'TABELA HASH - BUCKETS',
                mainLegend: 'Hash base define o bucket inicial; colisoes usam sondagem linear.',
                memoryTitle: 'MEMORIA DOS BUCKETS HASH',
            },
            BST: {
                mainTitle: 'MAPA DE MEMORIA',
                mainLegend: 'Enderecos ilustrativos ? representam referencias entre objetos.',
                memoryTitle: 'HEAP (NOS NA MEMORIA)',
            },
            AVL: {
                mainTitle: 'MAPA DE MEMORIA',
                mainLegend: 'Enderecos ilustrativos ? representam referencias entre objetos.',
                memoryTitle: 'HEAP (NOS NA MEMORIA)',
            },
            RedBlack: {
                mainTitle: 'MAPA DE MEMORIA',
                mainLegend: 'Enderecos ilustrativos ? representam referencias entre objetos.',
                memoryTitle: 'HEAP (NOS NA MEMORIA)',
            },
            Trie: {
                mainTitle: 'MAPA DE MEMORIA',
                mainLegend: 'Cada nivel da Trie representa um caractere e compartilha prefixos.',
                memoryTitle: 'HEAP (NOS NA MEMORIA)',
            },
            SegmentTree: {
                mainTitle: 'ARVORE DE SEGMENTOS',
                mainLegend: 'Cada no representa um intervalo e sua soma acumulada.',
                memoryTitle: 'HEAP (NOS NA MEMORIA)',
            },
            FenwickTree: {
                mainTitle: 'ARVORE FENWICK (BIT)',
                mainLegend: 'Cada indice guarda soma parcial de um bloco binario.',
                memoryTitle: 'MEMORIA CONTIGUA DO BIT',
            },
            UnionFind: {
                mainTitle: 'UNION-FIND (DISJOINT SET)',
                mainLegend: 'Cada posicao guarda o pai do no e o rank indica altura aproximada da arvore.',
                memoryTitle: 'MEMORIA CONTIGUA (PARENT ARRAY)',
            },
            Graph: {
                mainTitle: 'GRAFO (LISTA DE ADJACENCIA)',
                mainLegend: 'Cada vertice aponta para uma lista de vizinhos conectados por arestas.',
                memoryTitle: 'MEMORIA CONTIGUA (VERTICES E VIZINHOS)',
            },
        };

        const meta = metaByModule[this.activeModuleId] || metaByModule.LinkedList;
        mainTitle.innerHTML = `${meta.mainTitle} <span class="info-icon" title="Endere&ccedil;os ilustrativos &mdash; representam refer&ecirc;ncias entre objetos.">&#8505;</span>`;
        mainLegend.textContent = meta.mainLegend;
        memoryTitle.textContent = meta.memoryTitle;
    }

    _syncTreeCardMeta() {
        const title = document.getElementById('heapTreeTitle');
        const legend = document.getElementById('heapTreeLegend');
        const toggle = document.getElementById('btnHeapTreeToggleMeta');
        if (!title || !legend || !toggle) return;

        if (this.activeModuleId === 'BST') {
            title.textContent = 'BST - CAMINHO DE BUSCA';
            legend.textContent = 'Comparacao didatica: busca linear pode varrer todos os nos; na BST, cada comparacao escolhe um lado e segue por um unico caminho.';
            toggle.classList.add('hidden');
            return;
        }

        if (this.activeModuleId === 'AVL') {
            title.textContent = 'AVL - BALANCEAMENTO';
            legend.textContent = 'AVL reequilibra automaticamente com rotacoes para manter altura logaritmica.';
            toggle.classList.add('hidden');
            return;
        }

        if (this.activeModuleId === 'RedBlack') {
            title.textContent = 'RED-BLACK - REGRAS DE COR';
            legend.textContent = 'Insercao combina recoloracao e rotacoes para preservar altura logaritmica.';
            toggle.classList.add('hidden');
            return;
        }

        if (this.activeModuleId === 'Trie') {
            title.textContent = 'TRIE - PREFIXOS';
            legend.textContent = 'A Trie organiza palavras por prefixos: cada nivel e um caractere.';
            toggle.classList.add('hidden');
            return;
        }

        if (this.activeModuleId === 'SegmentTree') {
            title.textContent = 'ARVORE DE SEGMENTOS';
            legend.textContent = 'Cada no representa um intervalo e guarda a soma desses valores.';
            toggle.classList.add('hidden');
            return;
        }

        title.textContent = 'ARVORE BINARIA DO HEAP';
        legend.textContent = 'Visualizacao logica por niveis (pai -> filhos)';
        toggle.classList.remove('hidden');
    }

    _syncPresentationModeUi() {
        const appBody = document.querySelector('.app-body');
        const centerWorkspace = document.querySelector('.center-workspace');
        const expandedScenarioBar = document.getElementById('expandedScenarioBar');
        const expandBtn = document.getElementById('btnExpandWorkspace');
        const exitBtn = document.getElementById('btnExitExpanded');
        const teachingPanel = document.querySelector('.aux-teaching-panel');

        if (appBody) appBody.classList.toggle('presentation-mode', this.isPresentationMode);
        if (centerWorkspace) centerWorkspace.classList.toggle('expanded', this.isPresentationMode);

        if (expandedScenarioBar) {
            const hasScenarios = expandedScenarioBar.querySelectorAll('.scenario-btn').length > 0;
            const showScenarios = this.isPresentationMode && hasScenarios;
            expandedScenarioBar.classList.toggle('hidden', !showScenarios);
        }

        if (expandBtn) {
            expandBtn.textContent = this.isPresentationMode ? 'Fechar Sala' : 'Expandir Sala';
            expandBtn.classList.toggle('danger', this.isPresentationMode);
        }

        if (exitBtn) {
            exitBtn.classList.add('hidden');
        }

        if (teachingPanel) {
            teachingPanel.open = this.isPresentationMode;
        }

        this._syncProjectorProfileUi();

        if (showScenarios && this.activeModule && this.activeModule.operationPanel && typeof this.activeModule.operationPanel._renderScenarioButtons === 'function') {
            this.activeModule.operationPanel._renderScenarioButtons();
        }

        this._refreshActiveTreeLayout();
    }

    _refreshActiveTreeLayout() {
        if (!this.activeModule || typeof this.activeModule.refreshVisualization !== 'function') return;
        this.activeModule.refreshVisualization();
    }

    _syncProjectorProfileUi() {
        const appBody = document.querySelector('.app-body');
        const btn = document.getElementById('btnUltraProjector');
        const select = document.getElementById('projectorProfileSelect');

        const validProfiles = new Set(['normal', 'projector', 'ultra']);
        if (!validProfiles.has(this.projectorProfile)) {
            this.projectorProfile = 'projector';
        }

        if (select && select.value !== this.projectorProfile) {
            select.value = this.projectorProfile;
        }

        if (select) {
            select.disabled = !this.isPresentationMode;
            select.title = this.isPresentationMode
                ? 'Perfil de projeção ativo'
                : 'Ative Sala Expandida para usar o perfil de projecao';
        }

        const enabledProfile = this.isPresentationMode ? this.projectorProfile : 'projector';

        if (appBody) {
            appBody.classList.remove('projector-profile-normal', 'projector-profile-projector', 'projector-profile-ultra', 'ultra-projector');
            appBody.classList.add(`projector-profile-${enabledProfile}`);
            if (enabledProfile === 'ultra') {
                appBody.classList.add('ultra-projector');
            }
        }

        const isUltra = this.isPresentationMode && enabledProfile === 'ultra';

        if (btn) {
            btn.classList.toggle('is-active', isUltra);
            btn.setAttribute('aria-pressed', isUltra ? 'true' : 'false');
            btn.title = isUltra ? 'Ultra projetor ativado (+8%)' : 'Ativar ultra projetor (+8%)';
        }
    }

    getGlobals() {
        return {
            statePanel: this.statePanel,
            complexityPanel: this.complexityPanel,
            consolePanel: this.consolePanel,
            codeHighlighter: this.codeHighlighter,
            callStackPanel: this.callStackPanel,
            localVarsPanel: this.localVarsPanel,
            timelinePanel: this.timelinePanel,
            algorithmDebugPanel: this.algorithmDebugPanel,
            appManager: this,
        };
    }
}


