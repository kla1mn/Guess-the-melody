import { loadSavedState } from "./game-state.js"
import { setupEventHandlers } from "./event-handlers.js"

// Initialize the application
function init() {
    console.log("Initializing application...")

    // Setup all event handlers
    setupEventHandlers()

    // Load saved state from localStorage
    const stateLoaded = loadSavedState()
    console.log("Saved state loaded:", stateLoaded)
}

// Run initialization when the page loads
window.addEventListener("load", init)

// Добавляем обработчик для beforeunload, чтобы сохранить состояние перед закрытием страницы
window.addEventListener("beforeunload", () => {
    console.log("Page is being unloaded, state is already saved in localStorage")
})
