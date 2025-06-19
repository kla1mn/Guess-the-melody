import { loadSavedState } from "./game-state.js"
import { setupEventHandlers } from "./event-handlers.js"

function init() {
    console.log("Initializing application...")
    setupEventHandlers()
    loadSavedState()
}

window.addEventListener("load", init)
