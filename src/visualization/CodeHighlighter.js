class CodeHighlighter {
    constructor(containerId, fileNameId) {
        this.container = document.getElementById(containerId);
        this.fileNameEl = fileNameId ? document.getElementById(fileNameId) : null;
        this.lastActiveLineText = '';
    }

    setFileName(name) {
        if (this.fileNameEl) this.fileNameEl.textContent = `${name} \u25BE`;
    }

    clear() {
        if (!this.container) return;
        this.container.innerHTML = '<span class="code-placeholder">Selecione uma opera\u00e7\u00e3o para ver a implementa\u00e7\u00e3o.</span>';
        this.lastActiveLineText = '';
    }

    _escape(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    _tokenize(line) {
        return this._escape(line)
            .replace(/(public|private|protected|class|if|else|for|while|return|new|null|true|false|throw|break|continue)/g, '<span class="token-keyword">$1</span>')
            .replace(/(Node|T|int|void|boolean)/g, '<span class="token-type">$1</span>')
            .replace(/(&quot;.*?&quot;)/g, '<span class="token-string">$1</span>');
    }

    highlight(code) {
        if (!this.container) return '';

        const source = String(code ?? '');
        const lines = source.split('\n');

        let activeIndex = lines.findIndex((line) => line.includes('<---'));
        if (activeIndex === -1) {
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].trim() && !lines[i].trim().startsWith('//') && lines[i].trim() !== '}' && lines[i].trim() !== '{') {
                    activeIndex = i;
                    break;
                }
            }
        }

        const html = lines
            .map((line, index) => {
                const isActive = index === activeIndex;
                const cleanLine = line.replace(/\/\/\s*<---.*$/, '').replace(/<---.*$/, '');
                const marker = isActive ? '\u25B6' : '';
                return `<div class="code-line${isActive ? ' active-line' : ''}"><span class="code-line-marker">${marker}</span><span class="code-line-number">${index + 1}</span><span class="code-line-text">${this._tokenize(cleanLine)}</span></div>`;
            })
            .join('');

        this.container.innerHTML = html || '<span class="code-placeholder">Sem c\u00f3digo para exibir.</span>';

        const activeLine = activeIndex >= 0 ? lines[activeIndex] : '';
        this.lastActiveLineText = activeLine
            .replace(/\/\/.*$/, '')
            .replace(/<---.*$/, '')
            .trim();

        return this.lastActiveLineText;
    }
}

