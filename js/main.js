import { loadSavedState } from "./game-state.js"
import { setupEventHandlers } from "./event-handlers.js"
import { setupLeaderboardEvents } from "./leaderboard-renderer.js"

function init() {
  console.log("Initializing...")
  setupEventHandlers()
  setupLeaderboardEvents()
  loadSavedState()
}

window.addEventListener("load", init)
