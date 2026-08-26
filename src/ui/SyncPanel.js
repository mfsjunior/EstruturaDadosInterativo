class SyncPanel {
    constructor(appManager) {
        this.appManager = appManager;
        this.syncManager = appManager.syncManager;
        this.container = null;
        
        this._buildUI();
        
        // Link the SyncManager's status callback to the UI
        if (this.syncManager) {
            this.syncManager.onStatusChange = (status) => this._updateStatus(status);
        }
    }

    _buildUI() {
        this.container = document.createElement('div');
        this.container.id = 'syncPanel';
        this.container.className = 'sync-panel collapsed';
        
        this.container.innerHTML = `
            <div class="sync-header">
                <span>📡 Sala de Aula</span>
                <button id="btnToggleSync" class="icon-btn">▼</button>
            </div>
            <div class="sync-content">
                <div class="sync-actions" style="margin-top: 5px;">
                    <button id="btnHostRoom" class="action-btn primary">Iniciar Aula (Tomar Controle)</button>
                </div>
                <div class="sync-status" id="syncStatusText">Aguardando Professor...</div>
                <button id="btnLeaveRoom" class="action-btn danger hidden">Encerrar / Sair</button>
            </div>
        `;
        
        document.body.appendChild(this.container);

        // Bind events
        document.getElementById('btnToggleSync').addEventListener('click', () => {
            this.container.classList.toggle('collapsed');
        });

        document.getElementById('btnHostRoom').addEventListener('click', () => {
            this.syncManager.hostRoom('global_class');
            this._toggleMode(true);
        });

        document.getElementById('btnLeaveRoom').addEventListener('click', () => {
            this.syncManager.leaveRoom();
            this._toggleMode(false);
        });
    }

    _updateStatus(statusText) {
        const el = document.getElementById('syncStatusText');
        if (el) el.textContent = statusText;
    }

    _toggleMode(isActive) {
        document.getElementById('btnHostRoom').classList.toggle('hidden', isActive);
        document.getElementById('btnLeaveRoom').classList.toggle('hidden', !isActive);
        
        if (isActive) {
            this.container.classList.add('active-sync');
        } else {
            this.container.classList.remove('active-sync');
        }
    }
}
