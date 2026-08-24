class SyncManager {
    constructor(appManager) {
        this.appManager = appManager;
        this.peer = null;
        this.connections = []; // For host to store clients
        this.hostConnection = null; // For client to store host connection
        
        this.isHost = false;
        this.isClient = false;
        this.roomId = null;
        
        this.onStatusChange = null; // Callback for UI updates
    }

    _updateStatus(status) {
        if (this.onStatusChange) {
            this.onStatusChange(status);
        }
        console.log(`[SyncManager] Status: ${status}`);
    }

    hostRoom(roomId) {
        this.leaveRoom();
        
        // Use a unique prefix to avoid collisions on the public PeerJS server
        const fullRoomId = `ed-interativo-${roomId}`.toLowerCase();

        this.peer = new Peer(fullRoomId, {
            debug: 2
        });

        this.peer.on('open', (id) => {
            this.isHost = true;
            this.roomId = roomId;
            this._updateStatus(`Hospedando Sala: ${roomId}`);
        });

        this.peer.on('connection', (conn) => {
            this.connections.push(conn);
            this._updateStatus(`Aluno conectado (${this.connections.length} total)`);
            
            // Send current state to newly connected client
            conn.on('open', () => {
                conn.send({
                    action: 'SYNC_STATE',
                    payload: {
                        activeModuleId: this.appManager.activeModuleId,
                        isPresentationMode: this.appManager.isPresentationMode,
                        projectorProfile: this.appManager.projectorProfile,
                        activeViewTab: this.appManager.activeViewTab,
                        isSidebarCollapsed: document.querySelector('.left-sidebar')?.classList.contains('collapsed')
                    }
                });
            });

            conn.on('close', () => {
                this.connections = this.connections.filter(c => c !== conn);
                this._updateStatus(`Aluno desconectado (${this.connections.length} total)`);
            });
        });

        this.peer.on('error', (err) => {
            this._updateStatus(`Erro: ${err.type}`);
        });
    }

    joinRoom(roomId) {
        this.leaveRoom();
        
        const fullRoomId = `ed-interativo-${roomId}`.toLowerCase();
        
        this.peer = new Peer({ debug: 2 });

        this.peer.on('open', (id) => {
            this.hostConnection = this.peer.connect(fullRoomId, {
                reliable: true
            });

            this.hostConnection.on('open', () => {
                this.isClient = true;
                this.roomId = roomId;
                this._updateStatus(`Conectado à sala: ${roomId}`);
                
                // Disable UI interactions for the client
                document.body.classList.add('sync-client-mode');
            });

            this.hostConnection.on('data', (data) => {
                this._handleIncomingAction(data);
            });

            this.hostConnection.on('close', () => {
                this.leaveRoom();
                this._updateStatus('Conexão encerrada pelo host.');
            });
        });

        this.peer.on('error', (err) => {
            this._updateStatus(`Erro: ${err.type}`);
        });
    }

    leaveRoom() {
        if (this.connections.length > 0) {
            this.connections.forEach(conn => conn.close());
            this.connections = [];
        }
        if (this.hostConnection) {
            this.hostConnection.close();
            this.hostConnection = null;
        }
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        this.isHost = false;
        this.isClient = false;
        this.roomId = null;
        
        document.body.classList.remove('sync-client-mode');
        this._updateStatus('Desconectado');
    }

    // Called by the application to send actions to clients
    broadcastAction(action, payload = {}) {
        if (!this.isHost || this.connections.length === 0) return;
        
        const message = { action, payload };
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.send(message);
            }
        });
    }

    // Handles incoming actions on the client side
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
                const sidebar = document.querySelector('.left-sidebar');
                if (sidebar) sidebar.scrollTop = payload.scrollTop;
                break;
            case 'TOGGLE_SIDEBAR':
                const sb = document.querySelector('.left-sidebar');
                if (sb) {
                    sb.classList.toggle('collapsed', payload.isCollapsed);
                    if (this.appManager._refreshActiveTreeLayout) requestAnimationFrame(() => this.appManager._refreshActiveTreeLayout());
                }
                break;
            case 'EXECUTE_OPERATION':
                if (module && typeof module.executeOperation === 'function') {
                    module.executeOperation(payload.methodName, payload.args, false, payload.autoPlay, true);
                }
                break;
            case 'RUN_SCENARIO':
                if (module && typeof module.runScenario === 'function') {
                    module.runScenario(payload.scenarioId, true);
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
                if (module && module.animationController) {
                    module.animationController.restart(true);
                } else if (module && typeof module.resetSystem === 'function') {
                    module.resetSystem(true);
                }
                break;
            case 'ANIM_SET_SPEED':
                if (module && module.animationController) {
                    module.animationController.setSpeed(payload.speed, true);
                    // Also update the UI slider so the student sees the speed change
                    const speedSelect = document.getElementById('speedSelect');
                    if (speedSelect) speedSelect.value = payload.speed;
                }
                break;
        }
    }
}
