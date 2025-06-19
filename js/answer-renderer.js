import { socket, currentNick, isHost, addPlayerToAnswered } from "./game-state.js"
import { hideAnswerInterface } from "./audio-player.js"

export function addPlayerAnswer(nickname, answer, correctAnswer) {
  console.log("Adding player answer to UI:", nickname, answer, correctAnswer)

  const answersContainer = document.getElementById("answers-container")
  if (!answersContainer) {
    console.error("Answers container not found")
    return
  }

  answersContainer.classList.remove("hidden")
  answersContainer.style.opacity = "1"

  addPlayerToAnswered(nickname)

  if (nickname === currentNick) {
    hideAnswerInterface()
  }

  const existingAnswers = answersContainer.querySelectorAll(".player-answer")
  existingAnswers.forEach((el) => {
    if (el.dataset.player === nickname) {
      const hasActiveButtons = el.querySelector(".answer-buttons")
      if (!hasActiveButtons) {
        el.remove()
      }
    }
  })

  const answerElement = document.createElement("div")
  answerElement.className = "player-answer"
  answerElement.dataset.player = nickname

  answerElement.style.animation = "fadeIn 0.5s"

  if (isHost) {
    answerElement.classList.add("host-view")
  }

  const answerContentDiv = document.createElement("div")
  answerContentDiv.style.flex = "1"

  const nameElement = document.createElement("span")
  nameElement.className = "player-name"
  nameElement.textContent = nickname + ": "

  const answerTextElement = document.createElement("span")
  answerTextElement.className = "answer-text"
  answerTextElement.textContent = answer

  answerContentDiv.appendChild(nameElement)
  answerContentDiv.appendChild(answerTextElement)
  answerElement.appendChild(answerContentDiv)

  if (isHost) {
    if (correctAnswer) {
      const correctAnswerEl = document.createElement("div")
      correctAnswerEl.className = "correct-answer"
      correctAnswerEl.textContent = `Правильный ответ: ${correctAnswer}`
      answerElement.appendChild(correctAnswerEl)
    }

    const buttonsContainer = document.createElement("div")
    buttonsContainer.className = "answer-buttons"

    const acceptButton = document.createElement("button")
    acceptButton.textContent = "✓"
    acceptButton.title = "Принять ответ"
    acceptButton.className = "accept-button"
    acceptButton.onclick = () => {
      try {
        if (socket) {
          socket.send(
            JSON.stringify({
              type: "accept_answer",
              payload: {},
            }),
          )
        }
        buttonsContainer.remove()

        answerElement.classList.add("accepted-answer")
      } catch (error) {
        console.error("Error sending accept_answer:", error)
      }
    }

    const partialButton = document.createElement("button")
    partialButton.textContent = "½"
    partialButton.title = "Частично принять ответ"
    partialButton.className = "partial-button"
    partialButton.onclick = () => {
      try {
        if (socket) {
          socket.send(
            JSON.stringify({
              type: "accept_answer_partially",
              payload: {},
            }),
          )
        }
        buttonsContainer.remove()

        answerElement.classList.add("partially-accepted-answer")
      } catch (error) {
        console.error("Error sending accept_answer_partially:", error)
      }
    }

    const rejectButton = document.createElement("button")
    rejectButton.textContent = "✗"
    rejectButton.title = "Отклонить ответ"
    rejectButton.className = "reject-button"
    rejectButton.onclick = () => {
      try {
        if (socket) {
          socket.send(
            JSON.stringify({
              type: "reject_answer",
              payload: {},
            }),
          )
        }
        buttonsContainer.remove()

        answerElement.classList.add("rejected-answer")
      } catch (error) {
        console.error("Error sending reject_answer:", error)
      }
    }

    buttonsContainer.appendChild(acceptButton)
    buttonsContainer.appendChild(partialButton)
    buttonsContainer.appendChild(rejectButton)

    answerElement.appendChild(buttonsContainer)
  }

  answersContainer.appendChild(answerElement)

  answersContainer.scrollTop = answersContainer.scrollHeight

  if (!isHost) {
    setTimeout(() => {
      if (answerElement && answerElement.parentNode) {
        answerElement.style.opacity = "0"
        answerElement.style.transition = "opacity 0.5s"
        setTimeout(() => {
          if (answerElement && answerElement.parentNode) {
            answerElement.remove()
            checkAndHideEmptyContainer()
          }
        }, 500)
      }
    }, 5000)
  }
}

export function showAnswersContainer() {
  const answersContainer = document.getElementById("answers-container")
  if (answersContainer) {
    if (answersContainer.children.length > 0) {
      answersContainer.classList.remove("hidden")
      answersContainer.style.opacity = "1"
    } else {
      answersContainer.classList.add("hidden")
    }
  }
}

export function hideAnswersContainerWithDelay(delay = 3000) {
  console.log(`Scheduling to hide answers container in ${delay}ms`)

  setTimeout(() => {
    const answersContainer = document.getElementById("answers-container")
    if (!answersContainer || answersContainer.classList.contains("hidden")) {
      return
    }

    const activeButtons = answersContainer.querySelectorAll(".answer-buttons")
    if (activeButtons.length > 0) {
      console.log("Found active answer buttons, not hiding container")
      return
    }

    const unprocessedAnswers = answersContainer.querySelectorAll(
      ".player-answer:not(.accepted-answer):not(.partially-accepted-answer):not(.rejected-answer)",
    )
    if (unprocessedAnswers.length > 0) {
      console.log("Found unprocessed answers, not hiding container")
      return
    }

    console.log("Hiding answers container")
    answersContainer.style.opacity = "0"
    answersContainer.style.transition = "opacity 0.5s"

    setTimeout(() => {
      const finalCheck = answersContainer.querySelectorAll(".answer-buttons")
      if (finalCheck.length === 0) {
        answersContainer.classList.add("hidden")
        answersContainer.style.opacity = "1"
      } else {
        answersContainer.style.opacity = "1"
      }
    }, 500)
  }, delay)
}

export function clearAnswersContainerSafely() {
  const answersContainer = document.getElementById("answers-container")
  if (!answersContainer) return

  const activeButtons = answersContainer.querySelectorAll(".answer-buttons")
  if (activeButtons.length > 0) {
    console.log("Not clearing answers container - has active buttons")
    return
  }

  console.log("Safely clearing answers container")
  answersContainer.style.opacity = "0"
  answersContainer.style.transition = "opacity 0.3s"

  setTimeout(() => {
    answersContainer.innerHTML = ""
    answersContainer.classList.add("hidden")
    answersContainer.style.opacity = "1"
  }, 300)
}

export function checkAndHideEmptyContainer() {
  const answersContainer = document.getElementById("answers-container")
  if (!answersContainer) return

  const visibleAnswers = answersContainer.querySelectorAll(".player-answer")

  if (visibleAnswers.length === 0) {
    console.log("No visible player answers, hiding container")
    answersContainer.style.opacity = "0"
    answersContainer.style.transition = "opacity 0.3s"

    setTimeout(() => {
      const finalCheck = answersContainer.querySelectorAll(".player-answer")
      if (finalCheck.length === 0) {
        answersContainer.classList.add("hidden")
        answersContainer.style.opacity = "1"
      } else {
        answersContainer.style.opacity = "1"
      }
    }, 300)
  }
}
