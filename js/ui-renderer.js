import {
    socket,
    currentNick,
    isHost,
    isChoosingPlayer,
    hasPlayerAnswered,
    playersScores,
    setCurrentAudioPlayer,
    addPlayerToAnswered,
    getSortedPlayersByScore,
} from "./game-state.js"
import { playersListEl, categoriesCt } from "./dom-elements.js"

function renderPlayersList(players) {
    playersListEl.innerHTML = ""

    import("./game-state.js").then(({ isHost, currentNick, gameStarted, logPlayerMappings }) => {
        logPlayerMappings()

        players.forEach((p) => {
            const li = document.createElement("li")
            li.className = "player-list-item"

            const playerInfo = document.createElement("span")
            playerInfo.textContent = p.nickname + (p.is_master ? " (хост)" : "")
            li.appendChild(playerInfo)

            const playerId = p.id
            if (playerId !== undefined) {
                li.dataset.playerId = String(playerId)
            }

            if (gameStarted && playersScores[p.nickname] !== undefined) {
                playerInfo.textContent += ` - ${playersScores[p.nickname]} очков`
            }

            import("./game-state.js").then(({ choosingPlayerId }) => {
                if (playerId !== undefined && choosingPlayerId !== null && Number(playerId) === Number(choosingPlayerId)) {
                    li.classList.add("choosing-player")
                    playerInfo.textContent += " (выбирает мелодию)"
                }
            })

            if (isHost && !p.is_master && !gameStarted && p.nickname !== currentNick) {
                const transferBtn = document.createElement("button")
                transferBtn.textContent = "Сделать хостом"
                transferBtn.className = "transfer-host-btn"
                transferBtn.onclick = () => {
                    import("./websocket-manager.js").then(({ transferHost }) => {
                        transferHost(p.nickname)
                    })
                }
                li.appendChild(transferBtn)
            }

            playersListEl.appendChild(li)
        })
    })
}

function addPlayerToList(nickname, isMaster = false, playerId = null) {
    const li = document.createElement("li")
    li.className = "player-list-item"

    const playerInfo = document.createElement("span")
    playerInfo.textContent = nickname + (isMaster ? " (хост)" : "")
    li.appendChild(playerInfo)

    if (playerId !== null && playerId !== undefined) {
        li.dataset.playerId = String(playerId)
        console.log(`Adding player to list with ID: ${playerId}, nickname: ${nickname}`)
    }

    import("./game-state.js").then(({ gameStarted, playersScores, isHost, currentNick }) => {
        if (gameStarted && playersScores[nickname] !== undefined) {
            playerInfo.textContent += ` - ${playersScores[nickname]} очков`
        }

        if (isHost && !isMaster && !gameStarted && nickname !== currentNick) {
            const transferBtn = document.createElement("button")
            transferBtn.textContent = "Сделать хостом"
            transferBtn.className = "transfer-host-btn"
            transferBtn.onclick = () => {
                import("./websocket-manager.js").then(({ transferHost }) => {
                    transferHost(nickname)
                })
            }
            li.appendChild(transferBtn)
        }
    })

    import("./game-state.js").then(({ choosingPlayerId }) => {
        if (playerId !== null && choosingPlayerId !== null && Number(playerId) === Number(choosingPlayerId)) {
            li.classList.add("choosing-player")
            playerInfo.textContent += " (выбирает мелодию)"
        }
    })

    playersListEl.appendChild(li)
}

function removePlayerFromList(nickname) {
    Array.from(playersListEl.children).forEach((li) => {
        if (li.textContent.startsWith(nickname)) {
            playersListEl.removeChild(li)
        }
    })
}

function renderCategories(categories) {
    console.log("Rendering categories:", categories)
    categoriesCt.innerHTML = ""

    if (!categories || categories.length === 0) {
        console.error("No categories to render")
        const errorMsg = document.createElement("div")
        errorMsg.textContent = "Нет доступных категорий"
        categoriesCt.appendChild(errorMsg)
        return
    }

    const leaderboardBtn = document.createElement("button")
    leaderboardBtn.textContent = "Таблица лидеров"
    leaderboardBtn.className = "leaderboard-btn"
    leaderboardBtn.style.position = "fixed"
    leaderboardBtn.style.top = "10px"
    leaderboardBtn.style.left = "10px"
    leaderboardBtn.style.zIndex = "1000"
    leaderboardBtn.style.padding = "8px 16px"
    leaderboardBtn.style.backgroundColor = "#4a90e2"
    leaderboardBtn.style.color = "white"
    leaderboardBtn.style.border = "none"
    leaderboardBtn.style.borderRadius = "5px"
    leaderboardBtn.style.cursor = "pointer"
    leaderboardBtn.style.fontSize = "14px"
    leaderboardBtn.onclick = showLeaderboard

    const existingBtn = document.getElementById("leaderboard-btn")
    if (existingBtn) {
        existingBtn.remove()
    }

    leaderboardBtn.id = "leaderboard-btn"
    document.body.appendChild(leaderboardBtn)

    const infoEl = document.createElement("div")
    infoEl.id = "game-info"
    infoEl.className = "game-info"
    categoriesCt.appendChild(infoEl)

    import("./game-state.js").then(({ isHost, isChoosingPlayer, choosingPlayerId, getNicknameById }) => {
        const isChoosing = isChoosingPlayer()
        console.log("Current player is choosing:", isChoosing, "choosingPlayerId:", choosingPlayerId)

        if (isChoosing) {
            infoEl.innerHTML = `<p>Ты выбираешь мелодию</p>`
        } else {
            const choosingPlayerName = getNicknameById(choosingPlayerId)
            infoEl.innerHTML = `<p>${choosingPlayerName} выбирает мелодию...</p>`
        }

        if (isChoosing || isHost) {
            console.log("Showing categories for choosing player or host")
            renderCategoryCards(categories)
        } else {
            console.log("Not showing categories - player is not choosing and not host")
            const categoryCards = categoriesCt.querySelectorAll(".category-card")
            categoryCards.forEach((card) => card.remove())
        }
    })
}

function setCategoryBackground(card, categoryName) {
    const desired = `/images/${categoryName}.png`
    const fallback = `/images/unknown.png`
    const img = new Image()

    img.onload = () => {
        card.style.backgroundImage = `url('${desired}')`
    }

    img.onerror = () => {
        card.style.backgroundImage = `url('${fallback}')`
    }

    img.src = desired
}

function renderCategoryCards(categories) {
    categories.forEach((cat) => {
        const card = document.createElement("div")
        card.className = "category-card"
        setCategoryBackground(card, cat.category_name)

        const title = document.createElement("h3")
        title.textContent = cat.category_name
        card.appendChild(title)

        const btns = document.createElement("div")
        btns.className = "buttons"

        if (!cat.melodies || cat.melodies.length === 0) {
            console.warn(`No melodies in category ${cat.category_name}`)
            const noMelodies = document.createElement("p")
            noMelodies.textContent = "Нет мелодий"
            noMelodies.style.padding = "10px"
            noMelodies.style.color = "#FFF"
            btns.appendChild(noMelodies)
        } else {
            cat.melodies.forEach((m) => {
                const btn = document.createElement("button")
                btn.textContent = m.points

                if (m.is_guessed) {
                    btn.disabled = true
                    btn.style.opacity = "0.5"
                }

                btn.addEventListener("click", () => {
                    console.log("Melody button clicked:", m)
                    import("./game-state.js").then(({ socket, isChoosingPlayer, isHost }) => {
                        if (socket && (isChoosingPlayer() || isHost)) {
                            const message = {
                                type: "pick_melody",
                                payload: {
                                    category: cat.category_name,
                                    melody: m.name || `Мелодия ${m.points}`,
                                    points: m.points,
                                    link: m.link,
                                },
                            }
                            console.log("Sending message:", message)
                            socket.send(JSON.stringify(message))
                        }
                    })
                })
                btns.appendChild(btn)
            })
        }

        card.appendChild(btns)
        categoriesCt.appendChild(card)
    })
}

let onTimeUpdate

function playMelody(link, startTime = 0, maxDuration = 30) {
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

    import("./game-state.js").then(({ checkAllMelodiesGuessed }) => {
        if (checkAllMelodiesGuessed()) {
            console.log("This is the last melody, setting timer for game over screen")
            window.gameOverTimer = setTimeout(() => {
                import("./game-state.js").then(({ showGameOverAfterDelay }) => {
                    console.log("30 seconds passed after last melody, showing game over screen")
                    showGameOverAfterDelay()
                })
            }, maxDuration * 1000)
        }
    })

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

function showAnswerInterface() {
    if (isChoosingPlayer() || hasPlayerAnswered() || isHost) {
        return
    }

    const answerForm = document.getElementById("answer-form")
    if (answerForm) {
        answerForm.classList.remove("hidden")
    }
}

function hideAnswerInterface() {
    const answerForm = document.getElementById("answer-form")
    if (answerForm) {
        answerForm.classList.add("hidden")
    }
}

function clearAnswersContainer() {
    const answersContainer = document.getElementById("answers-container")
    if (answersContainer) {
        answersContainer.style.opacity = "0"
        answersContainer.style.transition = "opacity 0.3s"

        setTimeout(() => {
            answersContainer.innerHTML = ""
            answersContainer.classList.add("hidden")
            answersContainer.style.opacity = "1"
        }, 300)
    }
}

function showAnswersContainer() {
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

function addPlayerAnswer(nickname, answer, correctAnswer) {
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
            el.remove()
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

            setTimeout(() => {
                if (correctAnswerEl && correctAnswerEl.parentNode) {
                    correctAnswerEl.style.opacity = "0"
                    correctAnswerEl.style.transition = "opacity 0.5s"
                    setTimeout(() => {
                        if (correctAnswerEl && correctAnswerEl.parentNode) {
                            correctAnswerEl.remove()
                        }
                    }, 500)
                }
            }, 3000)
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
}

function updateScoreDisplay(nickname, points) {
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

function updateLeaderboardTable() {
    console.log("Updating leaderboard table")
    const sortedPlayers = getSortedPlayersByScore()
    const tbody = document.getElementById("leaderboard-tbody")

    if (!tbody) {
        console.error("Leaderboard tbody not found")
        return
    }

    tbody.innerHTML = ""

    if (sortedPlayers.length === 0) {
        console.log("No player scores available")
        return
    }

    sortedPlayers.forEach((player, index) => {
        const row = document.createElement("tr")

        if (player.nickname === currentNick) {
            row.classList.add("current-player")
        }

        if (index < 3) {
            row.classList.add(`rank-${index + 1}`)
        }

        const rankCell = document.createElement("td")
        rankCell.textContent = (index + 1).toString()

        const nameCell = document.createElement("td")
        nameCell.textContent = player.nickname

        const scoreCell = document.createElement("td")
        scoreCell.textContent = player.score.toString()
        scoreCell.classList.add("score-cell")

        row.appendChild(rankCell)
        row.appendChild(nameCell)
        row.appendChild(scoreCell)
        tbody.appendChild(row)
    })

    console.log(`Leaderboard updated with ${sortedPlayers.length} players`)
}

function showLeaderboard() {
    console.log("Showing leaderboard")
    const leaderboardModal = document.getElementById("leaderboard-modal")

    if (leaderboardModal) {
        updateLeaderboardTable()

        const tbody = document.getElementById("leaderboard-tbody")
        if (tbody && tbody.children.length === 0) {
            console.log("No leaderboard data available")
            const row = document.createElement("tr")
            const cell = document.createElement("td")
            cell.colSpan = 3
            cell.textContent = "Нет данных о счете игроков"
            cell.style.textAlign = "center"
            cell.style.padding = "20px"
            row.appendChild(cell)
            tbody.appendChild(row)
        }

        leaderboardModal.classList.remove("hidden")
        leaderboardModal.style.display = "flex"
    } else {
        console.error("Leaderboard modal not found")
    }
}

function hideLeaderboard() {
    console.log("Hiding leaderboard")
    const leaderboardModal = document.getElementById("leaderboard-modal")

    if (leaderboardModal) {
        leaderboardModal.classList.add("hidden")
        leaderboardModal.style.display = "none"
    } else {
        console.error("Leaderboard modal not found when trying to hide")
    }
}

function updateCategoryButtons() {
    import("./game-state.js").then(({ gameCategories }) => {
        if (!gameCategories) return

        const categoryCards = document.querySelectorAll(".category-card")
        categoryCards.forEach((card) => {
            const categoryName = card.querySelector("h3").textContent
            const buttons = card.querySelectorAll(".buttons button")

            const category = gameCategories.find((c) => c.category_name === categoryName)
            if (category && category.melodies) {
                buttons.forEach((btn, index) => {
                    if (index < category.melodies.length) {
                        const melody = category.melodies[index]
                        if (melody.is_guessed) {
                            btn.disabled = true
                            btn.style.opacity = "0.5"
                        }
                    }
                })
            }
        })
    })
}

function showGameOverScreen() {
    console.log("Showing game over screen")

    const gameOverModal = document.getElementById("game-over-modal")
    if (!gameOverModal) {
        console.error("Game over modal not found")
        return
    }

    import("./game-state.js").then(({ getSortedPlayersByScore, currentNick }) => {
        const sortedPlayers = getSortedPlayersByScore()

        if (sortedPlayers.length === 0) {
            console.error("No player scores available for game over screen")
            return
        }

        const winner = sortedPlayers[0]

        const winnerNameEl = document.getElementById("winner-name")
        const winnerScoreEl = document.getElementById("winner-score")

        if (winnerNameEl && winnerScoreEl) {
            winnerNameEl.textContent = winner.nickname
            winnerScoreEl.textContent = `${winner.score} очков`

            if (winner.nickname === currentNick) {
                winnerNameEl.style.textShadow = "0 0 10px rgba(255, 215, 0, 0.8)"
                document.getElementById("winner-container").style.animation = "winner-glow 1s infinite alternate"
            }
        }

        const finalResultsTbody = document.getElementById("final-results-tbody")
        if (finalResultsTbody) {
            finalResultsTbody.innerHTML = ""

            sortedPlayers.forEach((player, index) => {
                const row = document.createElement("tr")

                if (player.nickname === currentNick) {
                    row.classList.add("current-player")
                }

                if (index < 3) {
                    row.classList.add(`rank-${index + 1}`)
                }

                const rankCell = document.createElement("td")
                rankCell.textContent = (index + 1).toString()

                const nameCell = document.createElement("td")
                nameCell.textContent = player.nickname

                const scoreCell = document.createElement("td")
                scoreCell.textContent = player.score.toString()
                scoreCell.classList.add("score-cell")

                row.appendChild(rankCell)
                row.appendChild(nameCell)
                row.appendChild(scoreCell)
                finalResultsTbody.appendChild(row)
            })
        }

        const exitGameBtn = document.getElementById("exit-game-btn")
        if (exitGameBtn) {
            exitGameBtn.onclick = () => {
                import("./game-state.js").then(({ clearState }) => {
                    clearState()
                    window.location.reload()
                })
            }
        }

        gameOverModal.classList.remove("hidden")
        gameOverModal.style.display = "flex"

        addConfettiEffect()
    })
}

function addConfettiEffect() {
    const confettiCount = 200
    const container = document.body

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement("div")
        confetti.style.position = "fixed"
        confetti.style.width = `${Math.random() * 10 + 5}px`
        confetti.style.height = `${Math.random() * 10 + 5}px`
        confetti.style.backgroundColor = getRandomColor()
        confetti.style.borderRadius = "50%"
        confetti.style.left = `${Math.random() * 100}vw`
        confetti.style.top = "-10px"
        confetti.style.zIndex = "1999"
        confetti.style.opacity = Math.random() * 0.7 + 0.3
        confetti.style.animation = `fall ${Math.random() * 3 + 2}s linear forwards`

        container.appendChild(confetti)

        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti)
            }
        }, 5000)
    }

    if (!document.getElementById("confetti-style")) {
        const style = document.createElement("style")
        style.id = "confetti-style"
        style.innerHTML = `
      @keyframes fall {
        0% {
          transform: translateY(0) rotate(0deg);
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
        }
      }
    `
        document.head.appendChild(style)
    }
}

function getRandomColor() {
    const colors = [
        "#ff5c00",
        "#ffd700",
        "#4a90e2",
        "#50c878",
        "#e94e77",
        "#9370db",
    ]
    return colors[Math.floor(Math.random() * colors.length)]
}

export {
    renderPlayersList,
    addPlayerToList,
    removePlayerFromList,
    renderCategories,
    playMelody,
    showAnswerInterface,
    hideAnswerInterface,
    showAnswersContainer,
    addPlayerAnswer,
    updateScoreDisplay,
    clearAnswersContainer,
    showLeaderboard,
    hideLeaderboard,
    updateLeaderboardTable,
    updateCategoryButtons,
    showGameOverScreen,
}
