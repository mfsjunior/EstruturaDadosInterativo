class TutorialManager {
    constructor() {
        this.tutorialKey = 'ed_tutorial_seen_v2';
        this.overlay = document.getElementById('tutorialOverlay');
        this.contentContainer = document.getElementById('tutorialContent');
        this.dotsContainer = document.getElementById('tutorialDots');
        this.btnPrev = document.getElementById('btnPrevTutorial');
        this.btnNext = document.getElementById('btnNextTutorial');
        this.btnSkip = document.getElementById('btnSkipTutorial');
        
        this.currentStep = 0;
        
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
                content: "Com a estrutura selecionada, use o painel inferior esquerdo para inserir, remover ou buscar valores. As ações refletirão no centro da tela.",
                target: '#leftControlsHost',
                position: 'right'
            },
            {
                title: "Visualização na Memória 🧠",
                content: "A área central exibe a estrutura de dados graficamente. Você verá os valores sendo manipulados, a alocação dos índices e os ponteiros ilustrando o comportamento exato de cada algoritmo!",
                target: '#mainStructureCard',
                position: 'bottom'
            },
            {
                title: "Controle a Animação ⏯️",
                content: "Na barra superior, você pode pausar, avançar passo a passo ou alterar a velocidade da visualização de cada algoritmo.",
                target: '.header-right',
                position: 'bottom'
            },
            {
                title: "Modo Debug 🐞",
                content: "Em operações complexas, clique na aba 'Debug' (centro-cima) para ver o código Java linha a linha sincronizado com a animação.",
                target: '#algorithmDebugCard',
                position: 'center'
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

    applyHighlight(stepData) {
        // Limpa destaque anterior
        if (this.currentTarget) {
            this.currentTarget.classList.remove('tutorial-highlight');
        }
        
        // Pega elemento do modal
        const modal = this.overlay.querySelector('.tutorial-modal');

        if (!stepData.target) {
            this.currentTarget = null;
            this.centerModal(modal);
            return;
        }

        const targetEl = document.querySelector(stepData.target);
        // Se o elemento não existe ou está invisível (altura 0)
        if (targetEl && targetEl.offsetHeight > 0) {
            this.currentTarget = targetEl;
            this.currentTarget.classList.add('tutorial-highlight');
            
            // Move o modal para perto do target
            const rect = targetEl.getBoundingClientRect();
            
            if (stepData.position === 'right') {
                modal.style.top = (rect.top + rect.height/2) + 'px';
                modal.style.left = (rect.right + 20) + 'px';
                modal.style.transform = 'translate(0, -50%)';
            } else if (stepData.position === 'bottom') {
                modal.style.top = (rect.bottom + 20) + 'px';
                modal.style.left = (rect.left + rect.width/2) + 'px';
                modal.style.transform = 'translate(-50%, 0)';
            } else if (stepData.position === 'top') {
                modal.style.top = (rect.top - 20) + 'px';
                modal.style.left = (rect.left + rect.width/2) + 'px';
                modal.style.transform = 'translate(-50%, -100%)';
            } else {
                this.centerModal(modal);
            }
            
            // Delay curto para deixar o CSS aplicar e então checar bounds
            setTimeout(() => {
                const mRect = modal.getBoundingClientRect();
                if (mRect.bottom > window.innerHeight || mRect.right > window.innerWidth || mRect.top < 0 || mRect.left < 0) {
                    this.centerModal(modal);
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
        this.overlay.classList.remove('hidden');
        // Previne scroll do body
        document.body.style.overflow = 'hidden';
    }

    closeTutorial() {
        if (this.currentTarget) {
            this.currentTarget.classList.remove('tutorial-highlight');
            this.currentTarget = null;
        }
        this.overlay.classList.add('hidden');
        document.body.style.overflow = '';
        localStorage.setItem(this.tutorialKey, 'true');
    }
}
