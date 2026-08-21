class CallStackPanel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.frames = ['main()'];
        this._render();
    }

    push(frameLabel) {
        this.frames.push(frameLabel);
        this._render();
    }

    pop() {
        if (this.frames.length > 1) this.frames.pop();
        this._render();
    }

    reset() {
        this.frames = ['main()'];
        this._render();
    }

    _render() {
        if (!this.container) return;
        this.container.innerHTML = this.frames
            .map((frame, index) => {
                const isTop = index === this.frames.length - 1;
                return `<div class="call-stack-frame${isTop ? ' top' : ''}">${frame}</div>`;
            })
            .join('');
    }
}
