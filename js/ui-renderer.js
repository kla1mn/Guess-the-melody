import { playersListEl } from "./dom-elements.js"
import { updateLeaderboardTable } from "./leaderboard-renderer.js"

export function updateScoreDisplay(nickname, points) {
  console.log("Updating score display for", nickname, "with points", points)

  const playerItems = Array.from(playersListEl.children)

  for (const item of playerItems) {
    if (item.textContent.startsWith(nickname)) {
      const isHostText = item.textContent.includes("(хост)") ? " (хост)" : ""
      const isChoosingText = item.textContent.includes("(выбирает мелодию)") ? " (выбирает мелодию)" : ""

      item.textContent = `${nickname}${isHostText}${isChoosingText} - ${points} очков`
      break
    }
  }

  updateLeaderboardTable()
}

export { renderPlayersList, addPlayerToList, removePlayerFromList } from "./player-list-renderer.js"
export { renderCategories, updateCategoryButtons } from "./category-renderer.js"
export { updateLeaderboardTable, showLeaderboard, showGameOverScreen } from "./leaderboard-renderer.js"
export {
  addPlayerAnswer,
  showAnswersContainer,
  hideAnswersContainerWithDelay,
  clearAnswersContainerSafely,
  checkAndHideEmptyContainer,
} from "./answer-renderer.js"
export { playMelody, showAnswerInterface, hideAnswerInterface } from "./audio-player.js"
