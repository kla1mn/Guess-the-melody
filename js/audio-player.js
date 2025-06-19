import {
  isHost,
  isChoosingPlayer,
  hasPlayerAnswered,
  setCurrentAudioPlayer,
  checkAllMelodiesGuessed,
  showGameOverAfterDelay,
} from "./game-state.js"

let onTimeUpdate

export function playMelody(link, startTime = 0, maxDuration = 30) {
  if (!link) {
    console.error("No link provided for melody playback")
    return
  }

  const audioPlayer = document.getElementById("audio-player")
  if (onTimeUpdate) {
    audioPlayer.removeEventListener("timeupdate", onTimeUpdate)
  }

  audioPlayer.src = link
  audioPlayer.currentTime = startTime
  audioPlayer.classList.remove("hidden")
  setCurrentAudioPlayer(audioPlayer)

  if (!isHost) {
    showAnswerInterface()
  }

  if (window.gameOverTimer) {
    clearTimeout(window.gameOverTimer)
    window.gameOverTimer = null
  }

  if (checkAllMelodiesGuessed()) {
    console.log("This is the last melody, setting timer for game over screen")
    window.gameOverTimer = setTimeout(() => {
      console.log("30 seconds passed after last melody, showing game over screen")
      showGameOverAfterDelay()
    }, maxDuration * 1000)
  }

  onTimeUpdate = () => {
    if (audioPlayer.currentTime >= startTime + maxDuration) {
      audioPlayer.pause()
      audioPlayer.removeEventListener("timeupdate", onTimeUpdate)
      onTimeUpdate = null
    }
  }
  audioPlayer.addEventListener("timeupdate", onTimeUpdate)

  audioPlayer.play().catch((error) => {
    console.log("Auto-play prevented by browser:", error)
  })
}

export function showAnswerInterface() {
  if (isChoosingPlayer() || hasPlayerAnswered() || isHost) {
    return
  }

  const answerForm = document.getElementById("answer-form")
  if (answerForm) {
    answerForm.classList.remove("hidden")
  }
}

export function hideAnswerInterface() {
  const answerForm = document.getElementById("answer-form")
  if (answerForm) {
    answerForm.classList.add("hidden")
  }
}
