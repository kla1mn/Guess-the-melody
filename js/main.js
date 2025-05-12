import { loadSavedState } from "./game-state.js"
import { setupEventHandlers } from "./event-handlers.js"

function init() {
    console.log("Initializing application...")

    setupEventHandlers()

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

    // Add event listener for game over modal background click
    const gameOverModal = document.getElementById("game-over-modal")
    if (gameOverModal) {
        gameOverModal.addEventListener("click", (e) => {
            if (e.target === gameOverModal) {
                console.log("Game over modal background clicked")
                // We don't hide the game over modal on background click
                // as it's an important end-game screen
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
