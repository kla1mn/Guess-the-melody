import { loadSavedState } from "./game-state.js"
import { setupEventHandlers } from "./event-handlers.js"

function init() {
    console.log("Initializing application...")

    setupEventHandlers()

    // Set up leaderboard close button event with direct implementation
    const closeLeaderboardBtn = document.getElementById("close-leaderboard-btn")
    if (closeLeaderboardBtn) {
        closeLeaderboardBtn.addEventListener("click", () => {
            console.log("Close leaderboard button clicked")
            const leaderboardModal = document.getElementById("leaderboard-modal")
            if (leaderboardModal) {
                leaderboardModal.classList.add("hidden")
                leaderboardModal.style.display = "none"
            }
        })
    }

    // Set up leaderboard modal background click with direct implementation
    const leaderboardModal = document.getElementById("leaderboard-modal")
    if (leaderboardModal) {
        leaderboardModal.addEventListener("click", (e) => {
            if (e.target === leaderboardModal) {
                console.log("Leaderboard background clicked")
                leaderboardModal.classList.add("hidden")
                leaderboardModal.style.display = "none"
            }
        })
    }

    const stateLoaded = loadSavedState()
    console.log("Saved state loaded:", stateLoaded)
}

window.addEventListener("load", init)

window.addEventListener("beforeunload", () => {
    console.log("Page is being unloaded, state is already saved in localStorage")
})
