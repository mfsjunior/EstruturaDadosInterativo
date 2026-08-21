class TutorialManager {
    constructor() {
        this.tutorialKey = 'ed_tutorial_seen_v2';
        this.overlay = document.getElementById('tutorialOverlay');
        this.modal = document.getElementById('tutorialModal');
        this.contentContainer = document.getElementById('tutorialContent');
        this.dotsContainer = document.getElementById('tutorialDots');
        this.btnPrev = document.getElementById('btnPrevTutorial');
        this.btnNext = document.getElementById('btnNextTutorial');
        this.btnSkip = document.getElementById('btnSkipTutorial');
        
        // Cria a seta
        this.pointerArrow = document.createElement('div');
        this.pointerArrow.className = 'tutorial-pointer-arrow hidden';
        document.body.appendChild(this.pointerArrow);
        
        this.currentStep = 0;
        this.hiddenTargetRestores = [];
        
        this.steps = [
            {
                title: "Bem-vindo ao ED Lab! 🚀",
                content: "Aqui você aprenderá estruturas de dados na prática. O layout é dividido em áreas lógicas para facilitar o seu estudo.",
                target: null,
                position: 'center'
            },
            {
                title: "Escolha a Estrutura 🗂️",
                content: "Use o menu superior esquerdo para trocar de estrutura (ex: Arrays, Listas Encadeadas, Árvores).",
                target: '.sidebar-nav',
                position: 'right'
            },
            {
                title: "Faça Operações ⚙️",
                content: "Com a estrutura selecionada, use este painel (abaixo do menu) para inserir, remover ou buscar valores. As ações refletirão no centro da tela.",
                target: '#leftControlsHost',
                position: 'right'
            },
            {
                title: "Cenários Prontos 🎬",
                content: "Logo abaixo das operações, temos os Cenários (ex: 'Build 3 Nós', 'Buscar Meio'). Eles carregam simulações prontas instantaneamente para você ver a estrutura funcionando rápido!",
                target: '.scenarios-bar',
                position: 'right'
            },
            {
                title: "Visualização na Memória 🧠",
                content: "A área central exibe a estrutura de dados graficamente. Você verá os valores sendo manipulados, a alocação dos índices e os ponteiros ilustrando o comportamento exato de cada algoritmo!",
                target: '#mainStructureCard',
                position: 'center'
            },
            {
                title: "Controle a Animação ⏯️",
                content: "Aqui no menu superior direito você tem o controle total!<br><br><b>Atenção:</b> Mesmo clicando em <b>Play</b>, os algoritmos podem pausar automaticamente em etapas cruciais para fins didáticos. Quando isso acontecer, clique em <b>Passo</b> para continuar avançando!",
                target: '.header-right',
                position: 'center'
            },
            {
                title: "Expandir Sala & Modo Professor 👨‍🏫",
                content: "Use 'Expandir Sala' para entrar em tela cheia. O botão 'Visualizar Algoritmo' (Modo Professor) permite ver o código Java e as variáveis em tempo real enquanto o algoritmo é executado!",
                target: '#btnVisualAlgorithm',
                position: 'bottom'
            },
            {
                title: "Cenários Expandidos 🎬",
                content: "No modo Expandir Sala, estes botões com simulações prontas aparecem aqui em cima, logo acima do visualizador! Eles são ótimos para ver a estrutura funcionando rápido e em tela cheia.",
                target: '#expandedScenarioBar',
                position: 'bottom'
            },
            {
                title: "Aba Debug 🐞",
                content: "Você também pode alternar a visualização central clicando na aba 'DEBUG' aqui em cima. Isso mostrará o código sendo executado sincronizado com a animação.",
                target: '#viewTabs',
                position: 'bottom'
            },
            {
                title: "Tudo Pronto! 🎬",
                content: "Use a barra inferior (Scenarios) para rodar simulações prontas. <br><br><i>Nota: Este tutorial não aparecerá novamente nas próximas visitas. Clique em 'Começar' para iniciar seus estudos!</i>",
                target: '.app-body',
                position: 'center'
            }
        ];
    }

    init() {
        if (!this.overlay) return;
        
        // Verifica se já viu o tutorial
        const hasSeen = localStorage.getItem(this.tutorialKey);
        if (hasSeen === 'true') {
            return;
        }

        // Configura eventos
        this.btnPrev.addEventListener('click', () => this.prevStep());
        this.btnNext.addEventListener('click', () => this.nextStep());
        this.btnSkip.addEventListener('click', () => this.closeTutorial());
        
        this.renderStep();
        this.openTutorial();
    }

    renderStep() {
        const stepData = this.steps[this.currentStep];
        
        // Atualiza texto
        this.contentContainer.innerHTML = `
            <h2 class="tutorial-title">${stepData.title}</h2>
            <p class="tutorial-text">${stepData.content}</p>
        `;

        // Atualiza dots
        this.dotsContainer.innerHTML = '';
        for (let i = 0; i < this.steps.length; i++) {
            const dot = document.createElement('div');
            dot.className = `tutorial-dot ${i === this.currentStep ? 'active' : ''}`;
            this.dotsContainer.appendChild(dot);
        }

        // Atualiza botões
        if (this.currentStep === 0) {
            this.btnPrev.classList.add('hidden');
        } else {
            this.btnPrev.classList.remove('hidden');
        }

        if (this.currentStep === this.steps.length - 1) {
            this.btnNext.textContent = 'Começar!';
        } else {
            this.btnNext.textContent = 'Próximo';
        }
        
        this.applyHighlight(stepData);
    }

    restoreHiddenElements() {
        while (this.hiddenTargetRestores.length > 0) {
            const el = this.hiddenTargetRestores.pop();
            if (el.id === 'expandedScenarioBar') {
                el.classList.remove('tutorial-force-show');
            } else {
                el.classList.add('hidden');
            }
        }
    }

    applyHighlight(stepData) {
        // Limpa destaque e estados anteriores
        if (this.currentTarget) {
            this.currentTarget.classList.remove('tutorial-highlight');
        }
        this.restoreHiddenElements();
        
        const modal = this.modal;

        if (!stepData.target) {
            this.currentTarget = null;
            this.centerModal(modal);
            return;
        }

        const targetEl = document.querySelector(stepData.target);
        
        // Garante que a sidebar esteja aberta se o alvo estiver dentro dela
        const sidebar = document.querySelector('.left-sidebar');
        if (sidebar && targetEl && sidebar.contains(targetEl) && sidebar.classList.contains('collapsed')) {
            sidebar.style.transition = 'none'; // Desativa animacao temporariamente
            sidebar.classList.remove('collapsed');
            sidebar.offsetHeight; // Forca reflow
            sidebar.style.transition = ''; // Restaura animacao
        }
        
        if (targetEl) {
            // Rola o elemento para ficar visivel na tela antes de calcular coordenadas!
            targetEl.scrollIntoView({ block: 'center' });
            
            // Se estava oculto, mostra temporariamente
            if (targetEl.classList.contains('hidden')) {
                targetEl.classList.remove('hidden');
                this.hiddenTargetRestores.push(targetEl);
            }
            // Força a exibição de elementos especiais (como o expandedScenarioBar)
            if (stepData.target === '#expandedScenarioBar') {
                targetEl.classList.add('tutorial-force-show');
                this.hiddenTargetRestores.push(targetEl);
            }

            this.currentTarget = targetEl;
            this.currentTarget.classList.add('tutorial-highlight');
            
            // Move o modal para perto do target
            const rect = targetEl.getBoundingClientRect();
            
            // Se o elemento estiver invisivel na tela (ex: Expandir Sala ativado, display:none)
            if (rect.width === 0 && rect.height === 0) {
                this.currentTarget = null;
                this.centerModal(modal);
                return;
            }
            
            this.pointerArrow.classList.remove('hidden', 'arrow-left', 'arrow-up', 'arrow-down', 'arrow-right');
            
            if (stepData.position === 'right') {
                modal.style.top = (rect.top + rect.height/2) + 'px';
                modal.style.left = (rect.right + 40) + 'px';
                modal.style.transform = 'translate(0, -50%)';
                
                this.pointerArrow.innerHTML = '👈';
                this.pointerArrow.classList.add('arrow-left');
                this.pointerArrow.style.top = (rect.top + rect.height/2 - 25) + 'px';
                this.pointerArrow.style.left = (rect.right - 10) + 'px';
                
            } else if (stepData.position === 'bottom') {
                modal.style.top = (rect.bottom + 40) + 'px';
                modal.style.left = (rect.left + rect.width/2) + 'px';
                modal.style.transform = 'translate(-50%, 0)';
                
                this.pointerArrow.innerHTML = '👆';
                this.pointerArrow.classList.add('arrow-up');
                this.pointerArrow.style.top = (rect.bottom - 10) + 'px';
                this.pointerArrow.style.left = (rect.left + rect.width/2 - 25) + 'px';
                
            } else if (stepData.position === 'top') {
                modal.style.top = (rect.top - 40) + 'px';
                modal.style.left = (rect.left + rect.width/2) + 'px';
                modal.style.transform = 'translate(-50%, -100%)';
                
                this.pointerArrow.innerHTML = '👇';
                this.pointerArrow.classList.add('arrow-down');
                this.pointerArrow.style.top = (rect.top - 50) + 'px';
                this.pointerArrow.style.left = (rect.left + rect.width/2 - 25) + 'px';
                
            } else {
                this.centerModal(modal);
                this.pointerArrow.classList.add('hidden');
            }
            
            // Delay curto para deixar o CSS aplicar e então checar bounds
            setTimeout(() => {
                const mRect = modal.getBoundingClientRect();
                let newTop = parseFloat(modal.style.top);
                let newLeft = parseFloat(modal.style.left);
                let changed = false;

                if (mRect.bottom > window.innerHeight) {
                    newTop -= (mRect.bottom - window.innerHeight + 20);
                    changed = true;
                }
                if (mRect.top < 0) {
                    newTop += (-mRect.top + 20);
                    changed = true;
                }
                if (mRect.right > window.innerWidth) {
                    newLeft -= (mRect.right - window.innerWidth + 20);
                    changed = true;
                }
                if (mRect.left < 0) {
                    newLeft += (-mRect.left + 20);
                    changed = true;
                }

                if (changed) {
                    modal.style.top = newTop + 'px';
                    modal.style.left = newLeft + 'px';
                }
            }, 50);
        } else {
            this.currentTarget = null;
            this.centerModal(modal);
        }
    }

    centerModal(modal) {
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        if (this.pointerArrow) this.pointerArrow.classList.add('hidden');
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.renderStep();
        } else {
            this.closeTutorial();
        }
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderStep();
        }
    }

    openTutorial() {
        document.body.style.overflow = 'hidden';
        document.body.classList.add('tutorial-active');
        this.overlay.classList.remove('hidden');
        this.modal.classList.remove('hidden');
    }

    closeTutorial() {
        if (this.currentTarget) {
            this.currentTarget.classList.remove('tutorial-highlight');
            this.currentTarget = null;
        }
        this.restoreHiddenElements();
        this.overlay.classList.add('hidden');
        this.modal.classList.add('hidden');
        if (this.pointerArrow) this.pointerArrow.classList.add('hidden');
        document.body.style.overflow = '';
        document.body.classList.remove('tutorial-active');
        localStorage.setItem(this.tutorialKey, 'true');
    }
}
