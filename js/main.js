import { loadSavedState } from "./game-state.js"
import { setupEventHandlers } from "./event-handlers.js"

function init() {
    console.log("Initializing application...")

    setupEventHandlers()

    const stateLoaded = loadSavedState()
    console.log("Saved state loaded:", stateLoaded)
}

window.addEventListener("load", init)

window.addEventListener("beforeunload", () => {
    console.log("Page is being unloaded, state is already saved in localStorage")
})
