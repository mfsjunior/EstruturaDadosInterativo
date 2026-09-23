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
        const EMAIL_DO_PROFESSOR = "miltonfsjunior@gmail.com"; 

        // Auto-restore session on refresh using Firebase's actual auth state
        firebase.auth().onAuthStateChanged((user) => {
            const hostBtn = document.getElementById('btnHostRoom');
            const loginBtn = document.getElementById('btnLogin');
            if (user && user.email === EMAIL_DO_PROFESSOR) {
                console.log('[SyncPanel] Sessão de professor restaurada via Firebase Auth.');
                sessionStorage.setItem('professorAuth', 'true');
                if (hostBtn) hostBtn.disabled = false;
                if (loginBtn) {
                    loginBtn.textContent = 'Professor Logado';
                    loginBtn.classList.remove('secondary');
                    loginBtn.classList.add('success');
                }
            } else {
                sessionStorage.removeItem('professorAuth');
                if (hostBtn) hostBtn.disabled = true;
                if (loginBtn) {
                    loginBtn.textContent = 'Login Professor';
                    loginBtn.classList.add('secondary');
                    loginBtn.classList.remove('success');
                }
            }
        });

        this._requireProfessorAuth = () => {
            const user = firebase.auth().currentUser;
            if (user && user.email === EMAIL_DO_PROFESSOR) {
                alert('Você já está logado! Clique no botão Iniciar Aula (Tomar Controle).');
                return true;
            }
            
            // Dispara o Popup de Login do Google
            const provider = new firebase.auth.GoogleAuthProvider();
            // Use custom parameters to force account selection if needed, but simple popup is usually fine
            firebase.auth().signInWithPopup(provider).then((result) => {
                const user = result.user;
                if (user) {
                    if (user.email === EMAIL_DO_PROFESSOR) {
                        alert('Login realizado com sucesso! Agora você pode Iniciar a Aula.');
                    } else {
                        alert('Acesso negado! Apenas o professor pode assumir o controle da sala.');
                        firebase.auth().signOut();
                    }
                }
            }).catch((error) => {
                console.error('Auth error:', error);
                alert('Falha ao autenticar: ' + error.message);
            });
            return false;
        };

        // Attach event listeners with safety checks
        const loginBtn = document.getElementById('btnLogin');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this._requireProfessorAuth();
            });
        }

        const hostBtn = document.getElementById('btnHostRoom');
        if (hostBtn) {
            hostBtn.addEventListener('click', () => {
                const user = firebase.auth().currentUser;
                if (user && user.email === EMAIL_DO_PROFESSOR) {
                    this.syncManager.hostRoom('global_class');
                    this._toggleMode(true);
                } else {
                    alert('Por favor, aguarde a autenticação ou faça login como professor antes de iniciar a aula.');
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
