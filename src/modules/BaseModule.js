class BaseModule {
    constructor(appManager) {
        this.appManager = appManager;
    }

    /**
     * Called when the module is activated.
     * Should set up the specific data structure, UI, and animation.
     */
    init() {
        throw new Error("Method 'init()' must be implemented.");
    }

    /**
     * Called when the module is deactivated.
     * Should clean up the DOM, stop animations, and remove listeners.
     */
    destroy() {
        throw new Error("Method 'destroy()' must be implemented.");
    }
}
