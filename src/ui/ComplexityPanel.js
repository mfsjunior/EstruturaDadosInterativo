class ComplexityPanel {
    constructor() {
        this.elValue = document.getElementById('complexityValue');
        this.elWhyValue = document.getElementById('complexityWhyValue');
        this.elWhyBtn = document.getElementById('complexityWhyBtn');
        this.elDesc = document.getElementById('complexityDesc');

        if (this.elWhyBtn) {
            this.elWhyBtn.addEventListener('click', () => {
                if (this.elDesc) this.elDesc.classList.toggle('visible');
            });
        }
    }

    show(value, desc) {
        if (!this.elValue || !this.elDesc) return;
        this.elValue.textContent = value;
        if (this.elWhyValue) this.elWhyValue.textContent = value;
        this.elDesc.textContent = desc;
    }

    reset() {
        if (this.elValue) this.elValue.textContent = 'O(1)';
        if (this.elWhyValue) this.elWhyValue.textContent = 'O(1)';
        if (this.elDesc) {
            this.elDesc.textContent = 'Aguardando opera\u00e7\u00e3o...';
            this.elDesc.classList.remove('visible');
        }
    }
}

