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
                <span>📡 Sync</span>
                <button id="btnToggleSync" class="icon-btn">▼</button>
            </div>
            <div class="sync-content">
                <div class="sync-input-group">
                    <input type="text" id="syncRoomId" placeholder="ID da Sala (ex: AULA1)" />
                </div>
                <div class="sync-actions">
                    <button id="btnHostRoom" class="action-btn primary">Hospedar (Prof)</button>
                    <button id="btnJoinRoom" class="action-btn info">Entrar (Aluno)</button>
                </div>
                <div class="sync-status" id="syncStatusText">Desconectado</div>
                <button id="btnLeaveRoom" class="action-btn danger hidden">Sair / Desconectar</button>
            </div>
        `;
        
        document.body.appendChild(this.container);

        // Bind events
        document.getElementById('btnToggleSync').addEventListener('click', () => {
            this.container.classList.toggle('collapsed');
        });

        document.getElementById('btnHostRoom').addEventListener('click', () => {
            const roomId = document.getElementById('syncRoomId').value.trim();
            if (!roomId) {
                this._updateStatus('Digite um ID válido.');
                return;
            }
            this.syncManager.hostRoom(roomId);
            this._toggleMode(true);
        });

        document.getElementById('btnJoinRoom').addEventListener('click', () => {
            const roomId = document.getElementById('syncRoomId').value.trim();
            if (!roomId) {
                this._updateStatus('Digite um ID válido.');
                return;
            }
            this.syncManager.joinRoom(roomId);
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
        document.getElementById('btnJoinRoom').classList.toggle('hidden', isActive);
        document.getElementById('syncRoomId').classList.toggle('hidden', isActive);
        document.getElementById('btnLeaveRoom').classList.toggle('hidden', !isActive);
        
        if (isActive) {
            this.container.classList.add('active-sync');
        } else {
            this.container.classList.remove('active-sync');
        }
    }
}
