import { loadSavedState } from "./game-state.js"
import { setupEventHandlers } from "./event-handlers.js"

// Initialize the application
function init() {
    // Setup all event handlers
    setupEventHandlers()

    // Load saved state from localStorage
    loadSavedState()
}

// Run initialization when the page loads
window.addEventListener("load", init)
