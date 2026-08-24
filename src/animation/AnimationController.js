class AnimationController {
    constructor(stepExecutor) {
        this.stepExecutor = stepExecutor;
        this.steps = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.speed = 1;
        this.timer = null;
        this.onComplete = null;
        this.onStep = null; // (currentIndex, total)
        this.resetHandler = null;
    }

    setResetHandler(handler) {
        this.resetHandler = typeof handler === 'function' ? handler : null;
    }

    setSteps(steps) {
        this.steps = Array.isArray(steps) ? steps : [];
        this.currentIndex = 0;
        this.pause();
        if (this.steps.length > 0) {
            this._resetVisualState();
        }
        this._notifyStep();
    }

    play(fromNetwork = false) {
        if (!fromNetwork && window.appSyncManager) window.appSyncManager.broadcastAction('ANIM_PLAY');
        if (!this.steps.length) return;
        this.isPlaying = true;
        this._scheduleNext();
    }

    pause(fromNetwork = false) {
        if (!fromNetwork && window.appSyncManager) window.appSyncManager.broadcastAction('ANIM_PAUSE');
        this.isPlaying = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    restart(fromNetwork = false) {
        if (!fromNetwork && window.appSyncManager) window.appSyncManager.broadcastAction('ANIM_RESTART');
        this.pause();
        this.currentIndex = 0;
        this._resetVisualState();
        this._notifyStep();
    }

    jumpTo(targetIndex) {
        this.pause();
        this._resetVisualState();
        this.currentIndex = 0;
        const boundedTarget = Math.max(-1, Math.min(Number(targetIndex), this.steps.length - 1));
        if (boundedTarget < 0) {
            this._notifyStep();
            return;
        }

        while (this.currentIndex < boundedTarget && this.currentIndex < this.steps.length) {
            this.stepExecutor.executeFast(this.steps[this.currentIndex]);
            this.currentIndex += 1;
        }

        if (this.currentIndex === boundedTarget && this.currentIndex < this.steps.length) {
            this.stepExecutor.execute(this.steps[this.currentIndex]);
            this.currentIndex += 1;
        }

        this._notifyStep();
    }

    stepForward(fromNetwork = false) {
        if (!fromNetwork && window.appSyncManager) window.appSyncManager.broadcastAction('ANIM_STEP_FORWARD');
        if (this.currentIndex >= this.steps.length) return;
        const step = this.steps[this.currentIndex];
        this.stepExecutor.execute(step);
        this.currentIndex += 1;
        this._notifyStep();

        if (this.currentIndex >= this.steps.length) {
            this._finish();
        }
    }

    fastForward(fromNetwork = false) {
        if (!fromNetwork && window.appSyncManager) window.appSyncManager.broadcastAction('ANIM_FAST_FORWARD');
        this.pause();
        const lastIndex = this.steps.length - 1;

        while (this.currentIndex < lastIndex) {
            this.stepExecutor.executeFast(this.steps[this.currentIndex]);
            this.currentIndex += 1;
        }

        if (this.currentIndex === lastIndex && this.currentIndex < this.steps.length) {
            this.stepExecutor.execute(this.steps[this.currentIndex]);
            this.currentIndex += 1;
        }

        this._notifyStep();
        this._finish();
    }

    setSpeed(value, fromNetwork = false) {
        if (!fromNetwork && window.appSyncManager) window.appSyncManager.broadcastAction('ANIM_SET_SPEED', { speed: value });
        const next = Number(value) || 1;
        this.speed = next;
    }

    hasPendingSteps() {
        return this.currentIndex < this.steps.length;
    }

    _notifyStep() {
        if (typeof this.onStep === 'function') {
            this.onStep(this.currentIndex, this.steps.length);
        }
    }

    _resetVisualState() {
        if (this.resetHandler) {
            this.resetHandler();
            return;
        }
        this.stepExecutor.clear();
    }

    _scheduleNext() {
        if (!this.isPlaying || this.currentIndex >= this.steps.length) {
            this._finish();
            return;
        }

        const step = this.steps[this.currentIndex];
        this.stepExecutor.execute(step);
        this.currentIndex += 1;
        this._notifyStep();

        if (this.currentIndex >= this.steps.length) {
            this._finish();
            return;
        }

        const baseDelay = Math.max(220, 900 / this.speed);
        let delay = baseDelay;
        
        const desc = step.description || '';
        if (step.data?.isSuccess || desc.match(/(encontrado|peek no topo|pop removeu)/i)) {
            delay += (1500 / this.speed);
        }

        this.timer = setTimeout(() => this._scheduleNext(), delay);
    }

    _finish() {
        this.pause();
        if (typeof this.onComplete === 'function') {
            this.onComplete();
        }
    }
}

