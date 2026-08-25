class AlgorithmExecutionEngine {
    constructor({ onApply, onReset, onProgress, onComplete } = {}) {
        this.events = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.speed = 1;
        this.timer = null;
        this.autoPauseEachEvent = false;

        this.onApply = typeof onApply === 'function' ? onApply : null;
        this.onReset = typeof onReset === 'function' ? onReset : null;
        this.onProgress = typeof onProgress === 'function' ? onProgress : null;
        this.onComplete = typeof onComplete === 'function' ? onComplete : null;
    }

    setEvents(events = []) {
        this.pause();
        this.events = Array.isArray(events) ? events : [];
        this.currentIndex = 0;
        this._resetVisualState();
        this._notifyProgress();
    }

    setSpeed(value) {
        const parsed = Number(value);
        this.speed = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }

    setAutoPauseEachEvent(enabled) {
        this.autoPauseEachEvent = Boolean(enabled);
    }

    next() {
        if (this.currentIndex >= this.events.length) return;
        this._applyAt(this.currentIndex, false);
        this.currentIndex += 1;
        this._notifyProgress();
        if (this.currentIndex >= this.events.length) {
            this.pause();
            this._fireComplete();
        }
    }

    previous() {
        if (this.currentIndex <= 0) return;
        const target = this.currentIndex - 1;
        this.pause();
        this._resetVisualState();
        this.currentIndex = 0;

        for (let i = 0; i < target; i += 1) {
            this._applyAt(i, true);
            this.currentIndex += 1;
        }

        this._notifyProgress();
    }

    jumpTo(targetIndex) {
        const bounded = Math.max(0, Math.min(Number(targetIndex) || 0, this.events.length));
        this.pause();
        this._resetVisualState();
        this.currentIndex = 0;

        for (let i = 0; i < bounded; i += 1) {
            this._applyAt(i, true);
            this.currentIndex += 1;
        }

        this._notifyProgress();
    }

    play() {
        if (!this.events.length) return;
        this.isPlaying = true;
        this._updatePlayButtons();
        this._schedule();
    }

    pause() {
        this.isPlaying = false;
        this._updatePlayButtons();
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    _updatePlayButtons() {
        const btnMain = document.getElementById('btnPlayPause');
        const btnDebug = document.getElementById('btnDebugPlay');
        if (btnMain) {
            btnMain.textContent = this.isPlaying ? String.fromCodePoint(0x23F8) : String.fromCodePoint(0x25B6);
        }
        if (btnDebug) {
            btnDebug.textContent = this.isPlaying ? '\u23F8 Pause' : '\u25B6 Play';
        }
    }

    finish() {
        this.pause();
        while (this.currentIndex < this.events.length) {
            this._applyAt(this.currentIndex, true);
            this.currentIndex += 1;
        }
        this._notifyProgress();
        this._fireComplete();
    }

    reset() {
        this.pause();
        this.currentIndex = 0;
        this._resetVisualState();
        this._notifyProgress();
    }

    _schedule() {
        if (!this.isPlaying) return;
        if (this.currentIndex >= this.events.length) {
            this.pause();
            return;
        }

        this._applyAt(this.currentIndex, false);
        this.currentIndex += 1;
        this._notifyProgress();

        if (this.autoPauseEachEvent || this.currentIndex >= this.events.length) {
            this.pause();
            if (this.currentIndex >= this.events.length) {
                this._fireComplete();
            }
            return;
        }

        const delay = Math.max(120, 820 / this.speed);
        this.timer = setTimeout(() => this._schedule(), delay);
    }

    _applyAt(index, isFast) {
        const event = this.events[index];
        if (!event || !this.onApply) return;
        this.onApply(event, Boolean(isFast));
    }

    _resetVisualState() {
        if (this.onReset) this.onReset();
    }

    _notifyProgress() {
        if (!this.onProgress) return;
        this.onProgress(this.currentIndex, this.events.length, this.events[this.currentIndex - 1] || null);
    }

    _fireComplete() {
        if (typeof this.onComplete === 'function') {
            this.onComplete();
        }
    }
}
