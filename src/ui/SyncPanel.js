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
        this.container.className = 'sync-panel';
        
        this.container.innerHTML = `
            <div class="sync-header">
                <span>📡 Sala de Aula</span>
                <button id="btnToggleSync" class="icon-btn">▼</button>
            </div>
            <div class="sync-content">
                <div class="sync-actions" style="margin-top: 5px;">
                     <button id="btnLogin" type="button" class="action-btn secondary" style="margin-right:5px;">Login Professor</button>
                     <button id="btnHostRoom" class="action-btn primary" disabled>Iniciar Aula (Tomar Controle)</button>
                </div>
                <div class="sync-status" id="syncStatusText">Aguardando Professor...</div>
                <button id="btnLeaveRoom" class="action-btn danger hidden">Encerrar / Sair</button>
            </div>
        `;
        
        document.body.appendChild(this.container);
        console.log('SyncPanel UI built');

        // Bind events
        document.getElementById('btnToggleSync').addEventListener('click', () => this.container.classList.toggle('collapsed'));

        // Helper: Google Sign‑In for professor authentication
        if (!window.firebase) {
            console.error('Firebase SDK not loaded. Check script imports.');
            alert('Firebase SDK not loaded. Cannot authenticate.');
            return;
        }
        const AUTHORIZED_PROFESSOR_EMAIL = 'professor@example.com';

        // Check for redirect result on page load
        firebase.auth().getRedirectResult().then((result) => {
            if (result && result.user) {
                const user = result.user;
                if (user.email === AUTHORIZED_PROFESSOR_EMAIL) {
                    sessionStorage.setItem('professorAuth', 'true');
                    document.getElementById('btnHostRoom').disabled = false;
                    console.log('Professor authenticated successfully via redirect');
                } else {
                    alert('Usuário não autorizado.');
                    firebase.auth().signOut();
                }
            }
        }).catch((error) => {
            console.error('Auth error from redirect:', error);
            alert('Falha ao autenticar.');
        });

        this._requireProfessorAuth = () => {
            // If already authorized in this session, enable host button
            if (sessionStorage.getItem('professorAuth') === 'true') {
                document.getElementById('btnHostRoom').disabled = false;
                return true;
            }
            // Trigger Google Sign-In with Redirect (fixes Cross-Origin-Opener-Policy on GitHub Pages)
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithRedirect(provider);
            return false;
        };

        // Attach event listeners with safety checks
        const loginBtn = document.getElementById('btnLogin');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                console.log('Login button clicked');
                this._requireProfessorAuth();
            });
        } else {
            console.warn('Login button (btnLogin) not found in DOM');
        }

        const hostBtn = document.getElementById('btnHostRoom');
        if (hostBtn) {
            hostBtn.addEventListener('click', () => {
                console.log('Host button clicked');
                if (sessionStorage.getItem('professorAuth') === 'true') {
                    console.log('Auth verified, hosting room');
                    this.syncManager.hostRoom('global_class');
                    this._toggleMode(true);
                } else {
                    alert('Faça login como professor antes de iniciar a aula.');
                }
            });
        } else {
            console.warn('Host button (btnHostRoom) not found in DOM');
        }

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
        // O botão Iniciar Aula (Tomar Controle) NUNCA é ocultado, permitindo que o professor retome a sessão
        document.getElementById('btnLeaveRoom').classList.toggle('hidden', !isActive);
        
        if (isActive) {
            this.container.classList.add('active-sync');
        } else {
            this.container.classList.remove('active-sync');
        }
    }
}
