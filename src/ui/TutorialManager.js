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
                content: "Aqui você aprenderá estruturas de dados na prática. O layout é dividido em áreas lógicas para facilitar o seu estudo."
            },
            {
                title: "Escolha a Estrutura 🗂️",
                content: "Use o menu superior esquerdo para trocar de estrutura (ex: Arrays, Listas Encadeadas, Árvores)."
            },
            {
                title: "Faça Operações ⚙️",
                content: "Com a estrutura selecionada, use o painel inferior esquerdo para inserir, remover ou buscar valores. As ações refletirão no centro da tela."
            },
            {
                title: "Visualização na Memória 🧠",
                content: "A área central exibe a estrutura de dados graficamente. Você verá os valores sendo manipulados, a alocação dos índices e os ponteiros ilustrando o comportamento exato de cada algoritmo!"
            },
            {
                title: "Controle a Animação ⏯️",
                content: "Na barra superior, você pode pausar, avançar passo a passo ou alterar a velocidade da visualização de cada algoritmo."
            },
            {
                title: "Modo Debug 🐞",
                content: "Em operações complexas, clique na aba 'Debug' (centro-cima) para ver o código Java linha a linha sincronizado com a animação."
            },
            {
                title: "Tudo Pronto! 🎬",
                content: "Use a barra inferior (Scenarios) para rodar simulações prontas. <br><br><i>Nota: Este tutorial não aparecerá novamente nas próximas visitas. Clique em 'Começar' para iniciar seus estudos!</i>"
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
        this.overlay.classList.add('hidden');
        document.body.style.overflow = '';
        localStorage.setItem(this.tutorialKey, 'true');
    }
}
