class SyncManager {
    constructor(appManager) {
        this.appManager = appManager;
        this.db = null;
        this.roomRef = null;
        this._listeners = [];
        this._clientRef = null;
        this._cleanupInterval = null;

        this.isHost = false;
        this.isClient = false;
        this.isExecutingFromNetwork = false;
        this.roomId = null;

        this.onStatusChange = null; // Callback for UI updates
        this._initHostCursor();
        this._initMouseTracking();

        // Initialize Firebase
        this._initFirebase();

        // Clean up connection gracefully on page reload/close
        window.addEventListener('beforeunload', () => {
            this.leaveRoom();
        });
    }

    _initFirebase() {
        if (typeof firebase !== 'undefined' && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey !== 'COLE_AQUI') {
            try {
                if (!firebase.apps.length) {
                    firebase.initializeApp(window.FIREBASE_CONFIG);
                }
                this.db = firebase.database();
                console.log('[SyncManager] Firebase inicializado com sucesso.');
                
                // --- NOVO: Auto-escutar a sala global para alunos ---
                this._watchGlobalRoom();
            } catch (err) {
                console.error('[SyncManager] Erro ao iniciar Firebase:', err);
            }
        } else {
            console.warn('[SyncManager] Firebase não configurado. Abra firebaseConfig.js e preencha as credenciais.');
        }
    }

    _watchGlobalRoom() {
        if (!this.db) return;
        
        const loadTime = Date.now();
        const globalRef = this.db.ref('rooms/global_class');
        
        // Se o professor estiver online, entrar automaticamente (caso não seja o professor)
        globalRef.child('hostActive').on('value', snap => {
            const isHostActive = snap.val();
            if (isHostActive && !this.isHost && !this.isClient) {
                console.log('[SyncManager] Sala Global ativa. Conectando automaticamente...');
                
                // Mostrar status amigável
                this._updateStatus('Aula iniciada! Conectando...');
                
                // Conectar
                this.joinRoom('global_class');
                
                // Ocultar os botões de host e mostrar os de Sair
                const btnLeave = document.getElementById('btnLeaveRoom');
                const syncPanel = document.getElementById('syncPanel');
                if (btnLeave) btnLeave.classList.remove('hidden');
                if (syncPanel) syncPanel.classList.add('active-sync');
            }
        });
        
        // Se o professor clicar em Iniciar Aula, ele força o refresh nos alunos conectados
        globalRef.child('forceRefresh').on('value', snap => {
            const refreshTime = snap.val();
            // Se o refreshTime for mais novo que a hora que carregamos a página, dar refresh
            if (refreshTime && refreshTime > loadTime && !this.isHost) {
                console.log('[SyncManager] Professor solicitou sincronização forçada (Refresh).');
                window.location.reload();
            }
        });
    }

    _initHostCursor() {
        if (!document.getElementById('hostCursor')) {
            const cursor = document.createElement('div');
            cursor.id = 'hostCursor';
            cursor.style.position = 'fixed';
            cursor.style.width = '16px';
            cursor.style.height = '16px';
            cursor.style.backgroundColor = '#ef4444';
            cursor.style.border = '2px solid white';
            cursor.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.9)';
            cursor.style.borderRadius = '50%';
            cursor.style.pointerEvents = 'none';
            cursor.style.zIndex = '9999999';
            cursor.style.transition = 'top 0.05s linear, left 0.05s linear';
            cursor.style.transform = 'translate(-50%, -50%)';
            cursor.style.display = 'none';

            // Add a label
            const label = document.createElement('div');
            label.textContent = 'Professor';
            label.style.position = 'absolute';
            label.style.top = '100%';
            label.style.left = '100%';
            label.style.backgroundColor = '#ef4444';
            label.style.color = 'white';
            label.style.fontSize = '10px';
            label.style.padding = '2px 6px';
            label.style.borderRadius = '4px';
            label.style.marginTop = '4px';
            label.style.fontWeight = 'bold';
            cursor.appendChild(label);

            document.body.appendChild(cursor);
        }
    }

    _initMouseTracking() {
        if (this._mouseListenerAdded) return;
        this._mouseListenerAdded = true;

        let lastMove = 0;
        document.addEventListener('mousemove', (e) => {
            if (!this.isHost) return;
            const now = Date.now();
            if (now - lastMove < 80) return; // ~12fps (Firebase-friendly)
            lastMove = now;

            this.broadcastAction('SYNC_MOUSE', {
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight
            });
        });

        document.addEventListener('input', (e) => {
            if (!this.isHost) return;
            const target = e.target;
            if (target.id && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) {
                this.broadcastAction('SYNC_INPUT', {
                    id: target.id,
                    value: target.value
                });
            }
        });
    }

    _updateStatus(status) {
        if (this.onStatusChange) {
            this.onStatusChange(status);
        }
        console.log(`[SyncManager] Status: ${status}`);
    }

    // ─────────────────────────────────────────────────────
    //  HOST: Criar sala
    // ─────────────────────────────────────────────────────
    hostRoom(roomId) {
        this.leaveRoom();
        if (!this.db) {
            this._updateStatus('Erro: Firebase não configurado.');
            alert('Firebase não está configurado. Preencha o arquivo src/core/firebaseConfig.js com as credenciais do seu projeto.');
            return;
        }

        this.roomId = roomId;
        const safeName = roomId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        this.roomRef = this.db.ref(`rooms/${safeName}`);

        // Definir ANTES do set para evitar que eventos locais (optimistic) tratem o professor como aluno!
        this.isHost = true; 

        // Limpa dados antigos, cria a sala e envia sinal de refresh para alunos existentes
        this.roomRef.set({
            hostActive: true,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            forceRefresh: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            this._updateStatus(`Controlando a Aula`);

            // Auto-remove quando o host desconectar inesperadamente
            this.roomRef.child('hostActive').onDisconnect().set(false);

            // Gravar estado inicial para alunos que entrarem depois
            this._pushState();

            // Rastrear alunos conectados
            let clientCount = 0;
            const clientsRef = this.roomRef.child('clients');

            const addedCb = clientsRef.on('child_added', () => {
                clientCount++;
                this._updateStatus(`Aluno conectado (${clientCount} total)`);
                this._pushState(); // Atualiza o estado para o novo aluno
            });
            this._listeners.push({ ref: clientsRef, event: 'child_added', cb: addedCb });

            const removedCb = clientsRef.on('child_removed', () => {
                clientCount = Math.max(0, clientCount - 1);
                this._updateStatus(clientCount > 0 ? `${clientCount} aluno(s) conectado(s)` : 'Nenhum aluno conectado');
            });
            this._listeners.push({ ref: clientsRef, event: 'child_removed', cb: removedCb });

            // A limpeza periódica de ações foi removida para permitir
            // que alunos "late-joiners" reconstruam o estado completo da sala.

        }).catch(err => {
            this.isHost = false;
            this._updateStatus(`Erro ao criar sala: ${err.message}`);
            alert(`Erro ao criar sala: ${err.message}`);
        });
    }

    _pushState() {
        if (!this.roomRef || !this.isHost) return;
        this.roomRef.child('state').set({
            activeModuleId: this.appManager.activeModuleId,
            isPresentationMode: this.appManager.isPresentationMode,
            projectorProfile: this.appManager.projectorProfile,
            activeViewTab: this.appManager.activeViewTab,
            isSidebarCollapsed: document.querySelector('.left-sidebar')?.classList.contains('collapsed') || false
        });
    }

    // ─────────────────────────────────────────────────────
    //  CLIENT: Entrar na sala
    // ─────────────────────────────────────────────────────
    joinRoom(roomId) {
        this.leaveRoom();
        if (!this.db) {
            this._updateStatus('Erro: Firebase não configurado.');
            alert('Firebase não está configurado.');
            return;
        }

        const safeName = roomId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        this.roomRef = this.db.ref(`rooms/${safeName}`);

        // Verificar se a sala existe
        this.roomRef.child('hostActive').once('value').then(snap => {
            if (!snap.val()) {
                this._updateStatus(`Sala "${roomId}" não encontrada.`);
                alert(`Sala "${roomId}" não encontrada ou o professor já saiu. Verifique o ID.`);
                this.roomRef = null;
                return;
            }

            this.isClient = true;
            this.roomId = roomId;

            // Registrar como aluno (com auto-remoção ao desconectar)
            const clientId = 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
            this._clientRef = this.roomRef.child(`clients/${clientId}`);
            this._clientRef.set(true);
            this._clientRef.onDisconnect().remove();

            this._updateStatus(`Assistindo Aula`);
            document.body.classList.add('sync-client-mode');

            // 1) Buscar estado inicial (módulo ativo, modo apresentação, etc.)
            this.roomRef.child('state').once('value').then(stateSnap => {
                const state = stateSnap.val();
                if (state) {
                    this._handleIncomingAction({ action: 'SYNC_STATE', payload: state });
                }
            });

            // 2) Escutar AÇÕES. Como a limpeza foi removida, alunos
            // reconstruirão o estado processando o histórico em fast-forward naturalmente.
            const actionsRef = this.roomRef.child('actions');
            let initialLoad = true;
            
            actionsRef.once('value').then(() => {
                initialLoad = false;
                // Força fast-forward na última ação antiga se estiver animando
                if (this.appManager.activeModule && this.appManager.activeModule.animationController) {
                    this.appManager.activeModule.animationController.fastForward();
                }
            });

            const actionCb = actionsRef.on('child_added', (snap) => {
                const data = snap.val();
                if (data) {
                    this._handleIncomingAction(data);
                    // Se ainda estivermos no carregamento inicial, força fast-forward
                    if (initialLoad && this.appManager.activeModule && this.appManager.activeModule.animationController) {
                        this.appManager.activeModule.animationController.fastForward();
                    }
                }
            });
            this._listeners.push({ ref: actionsRef, event: 'child_added', cb: actionCb });

            // 3) Escutar cursor do professor
            const cursorRef = this.roomRef.child('cursor');
            const cursorCb = cursorRef.on('value', (snap) => {
                const pos = snap.val();
                if (pos) {
                    this._handleIncomingAction({ action: 'SYNC_MOUSE', payload: pos });
                }
            });
            this._listeners.push({ ref: cursorRef, event: 'value', cb: cursorCb });

            // 4) Escutar sync de inputs
            const inputRef = this.roomRef.child('inputSync');
            const inputCb = inputRef.on('value', (snap) => {
                const val = snap.val();
                if (val) {
                    this._handleIncomingAction({ action: 'SYNC_INPUT', payload: val });
                }
            });
            this._listeners.push({ ref: inputRef, event: 'value', cb: inputCb });

            // 5) Detectar se o professor saiu
            const hostRef = this.roomRef.child('hostActive');
            const hostCb = hostRef.on('value', (snap) => {
                if (snap.val() === false && this.isClient) {
                    this._updateStatus('O professor encerrou a aula.');
                    this.leaveRoom();
                    // Restaurar botões do painel globalmente
                    const btnLeave = document.getElementById('btnLeaveRoom');
                    const syncPanel = document.getElementById('syncPanel');
                    if (btnLeave) btnLeave.classList.add('hidden');
                    if (syncPanel) syncPanel.classList.remove('active-sync');
                }
            });
            this._listeners.push({ ref: hostRef, event: 'value', cb: hostCb });

        }).catch(err => {
            this._updateStatus(`Erro: ${err.message}`);
            alert(`Erro ao entrar na sala: ${err.message}`);
        });
    }

    // ─────────────────────────────────────────────────────
    //  Sair / Desconectar
    // ─────────────────────────────────────────────────────
    leaveRoom() {
        // Remover todos os listeners do Firebase
        this._listeners.forEach(({ ref, event, cb }) => {
            ref.off(event, cb);
        });
        this._listeners = [];

        // Remover registro de aluno
        if (this._clientRef) {
            this._clientRef.remove();
            this._clientRef = null;
        }

        // Se for host, limpar a sala inteira
        if (this.isHost && this.roomRef) {
            this.roomRef.child('hostActive').onDisconnect().cancel();
            this.roomRef.remove();
        }

        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
            this._cleanupInterval = null;
        }

        this.roomRef = null;
        this.isHost = false;
        this.isClient = false;
        this.roomId = null;

        document.body.classList.remove('sync-client-mode');
        this._updateStatus('Desconectado');
    }

    // ─────────────────────────────────────────────────────
    //  Enviar ações para os alunos (via Firebase)
    // ─────────────────────────────────────────────────────
    broadcastAction(action, payload = {}) {
        if (!this.isHost || !this.roomRef) return;

        // Cursor: sobrescreve (alta frequência, só o último importa)
        if (action === 'SYNC_MOUSE') {
            this.roomRef.child('cursor').set(payload);
            return;
        }

        // Input sync: sobrescreve
        if (action === 'SYNC_INPUT') {
            this.roomRef.child('inputSync').set(payload);
            return;
        }

        // Demais ações: push para a lista
        this.roomRef.child('actions').push({
            action,
            payload,
            ts: firebase.database.ServerValue.TIMESTAMP
        });

        // Atualiza snapshot de estado para alunos que entrarem depois
        const stateActions = [
            'CHANGE_MODULE', 'TOGGLE_PRESENTATION_MODE',
            'SET_PROJECTOR_PROFILE', 'SET_MAIN_VIEW_TAB', 'TOGGLE_SIDEBAR'
        ];
        if (stateActions.includes(action)) {
            this._pushState();
        }
    }

    // ─────────────────────────────────────────────────────
    //  Processar ações recebidas (MESMA LÓGICA DE ANTES)
    // ─────────────────────────────────────────────────────
    _handleIncomingAction(data) {
        if (!data || !data.action) return;
        const { action, payload } = data;

        const module = this.appManager.activeModule;

        switch (action) {
            case 'SYNC_STATE':
                if (payload.activeModuleId !== this.appManager.activeModuleId) {
                    this.appManager.loadModule(payload.activeModuleId);
                }
                if (payload.isPresentationMode !== undefined) this.appManager.togglePresentationMode(payload.isPresentationMode, true);
                if (payload.projectorProfile) {
                    this.appManager.projectorProfile = payload.projectorProfile;
                    this.appManager._syncProjectorProfileUi();
                }
                if (payload.activeViewTab) this.appManager.setMainViewTab(payload.activeViewTab, true);
                if (payload.isSidebarCollapsed !== undefined) {
                    const sidebar = document.querySelector('.left-sidebar');
                    if (sidebar) sidebar.classList.toggle('collapsed', payload.isSidebarCollapsed);
                }
                break;
            case 'CHANGE_MODULE':
                this.appManager.loadModule(payload.moduleId);
                break;
            case 'SET_MAIN_VIEW_TAB':
                this.appManager.setMainViewTab(payload.viewName, true);
                break;
            case 'TOGGLE_PRESENTATION_MODE':
                this.appManager.togglePresentationMode(payload.isPresentationMode, true);
                break;
            case 'SET_PROJECTOR_PROFILE':
                this.appManager.projectorProfile = payload.profile;
                this.appManager._syncProjectorProfileUi();
                break;
            case 'SYNC_SCROLL':
                const scrollSidebar = document.querySelector('.left-sidebar');
                if (scrollSidebar) scrollSidebar.scrollTop = payload.scrollTop;
                break;
            case 'TOGGLE_SIDEBAR':
                const sb = document.querySelector('.left-sidebar');
                if (sb) {
                    sb.classList.toggle('collapsed', payload.isCollapsed);
                    if (this.appManager._refreshActiveTreeLayout) requestAnimationFrame(() => this.appManager._refreshActiveTreeLayout());
                }
                break;
            case 'SYNC_MOUSE':
                const cursor = document.getElementById('hostCursor');
                if (cursor && this.isClient) {
                    cursor.style.display = 'block';
                    cursor.style.left = `${payload.x * window.innerWidth}px`;
                    cursor.style.top = `${payload.y * window.innerHeight}px`;

                    clearTimeout(this._cursorTimeout);
                    this._cursorTimeout = setTimeout(() => { cursor.style.display = 'none'; }, 2000);
                }
                break;
            case 'SYNC_INPUT':
                if (this.isClient && payload.id) {
                    const input = document.getElementById(payload.id);
                    if (input) input.value = payload.value;
                }
                break;
            case 'EXECUTE_OPERATION':
                if (module && typeof module.executeOperation === 'function') {
                    this.isExecutingFromNetwork = true;
                    try {
                        if (payload.fullArgs) {
                            module.executeOperation(...payload.fullArgs);
                        } else {
                            module.executeOperation(payload.methodName, payload.args, false, payload.autoPlay, true);
                        }
                    } finally {
                        this.isExecutingFromNetwork = false;
                    }
                }
                break;
            case 'RUN_SCENARIO':
                if (module && typeof module.runScenario === 'function') {
                    this.isExecutingFromNetwork = true;
                    try {
                        module.runScenario(payload.scenarioId, true);
                    } finally {
                        this.isExecutingFromNetwork = false;
                    }
                }
                break;
            case 'ANIM_PLAY':
                if (module && module.animationController) {
                    module.animationController.play(true);
                }
                break;
            case 'ANIM_PAUSE':
                if (module && module.animationController) {
                    module.animationController.pause(true);
                }
                break;
            case 'ANIM_STEP_FORWARD':
                if (module && module.animationController) {
                    module.animationController.stepForward(true);
                }
                break;
            case 'ANIM_FAST_FORWARD':
                if (module && module.animationController) {
                    module.animationController.fastForward(true);
                }
                break;
            case 'ANIM_RESTART':
                this.isExecutingFromNetwork = true;
                try {
                    if (module && module.animationController) {
                        module.animationController.restart(true);
                    } else if (module && typeof module.resetSystem === 'function') {
                        module.resetSystem(true);
                    }
                } finally {
                    this.isExecutingFromNetwork = false;
                }
                break;
            case 'ANIM_SET_SPEED':
                if (module && module.animationController) {
                    module.animationController.setSpeed(payload.speed, true);
                    const speedSelect = document.getElementById('speedSelect');
                    if (speedSelect) speedSelect.value = payload.speed;
                }
                break;
        }
    }
}
