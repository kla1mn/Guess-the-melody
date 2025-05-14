// Game state variables
let socket = null
let currentNick = ""
let currentCode = ""
let isHost = false
let linkAdded = false
let gameStarted = false
let gameCategories = null

let currentMelody = null
let choosingPlayerId = null
let currentAnswer = null
let playersScores = {}
let playersAnswered = []
let currentAudioPlayer = null
let lastAnsweringPlayer = null

let playerIdToNickname = {}
let playerNicknameToId = {}

let currentPlayerId = null

// Load saved state from localStorage
function loadSavedState() {
    const savedCode = localStorage.getItem("guessthemelody_code")
    const savedNick = localStorage.getItem("guessthemelody_nick")
    const savedIsHost = localStorage.getItem("guessthemelody_isHost")
    const savedGameStarted = localStorage.getItem("guessthemelody_gameStarted")
    const savedCategories = localStorage.getItem("guessthemelody_categories")
    const savedScores = localStorage.getItem("guessthemelody_scores")
    const savedChoosingPlayerId = localStorage.getItem("guessthemelody_choosingPlayerId")
    const savedCurrentAnswer = localStorage.getItem("guessthemelody_currentAnswer")
    const savedPlayerIdMap = localStorage.getItem("guessthemelody_playerIdMap")
    const savedPlayerNicknameMap = localStorage.getItem("guessthemelody_playerNicknameMap")
    const savedCurrentPlayerId = localStorage.getItem("guessthemelody_currentPlayerId")

    if (savedCode && savedNick) {
        currentCode = savedCode
        currentNick = savedNick
        isHost = savedIsHost === "1"
        gameStarted = savedGameStarted === "1"

        try {
            if (savedCategories) {
                gameCategories = JSON.parse(savedCategories)
            }
            if (savedScores) {
                playersScores = JSON.parse(savedScores)
            }
            if (savedChoosingPlayerId) {
                choosingPlayerId = Number(savedChoosingPlayerId)
            }
            if (savedCurrentAnswer) {
                currentAnswer = savedCurrentAnswer
            }
            if (savedPlayerIdMap) {
                const parsedMap = JSON.parse(savedPlayerIdMap)
                playerIdToNickname = {}
                Object.keys(parsedMap).forEach((key) => {
                    playerIdToNickname[Number(key)] = parsedMap[key]
                })
            }
            if (savedPlayerNicknameMap) {
                const parsedMap = JSON.parse(savedPlayerNicknameMap)
                playerNicknameToId = {}
                Object.keys(parsedMap).forEach((key) => {
                    playerNicknameToId[key] = Number(parsedMap[key])
                })
            }
            if (savedCurrentPlayerId) {
                currentPlayerId = Number(savedCurrentPlayerId)
            }
            if (gameStarted) {
                document.getElementById("logout-btn").classList.remove("hidden")
            }
        } catch (e) {
            console.error("Error parsing saved data:", e)
            gameCategories = null
            playersScores = {}
            choosingPlayerId = null
            currentAnswer = null
            playerIdToNickname = {}
            playerNicknameToId = {}
            currentPlayerId = null
        }

        console.log("Loaded saved state:", {
            currentCode,
            currentNick,
            isHost,
            gameStarted,
            hasCategories: !!gameCategories,
            playersScores,
            choosingPlayerId,
            currentAnswer,
            playerIdToNickname,
            playerNicknameToId,
            currentPlayerId,
        })

        if (gameStarted && gameCategories) {
            console.log("Game already started, showing game screen")
            showGame(gameCategories)
        } else {
            console.log("Game not started, showing waiting screen")
            showWaiting()
        }

        return true
    }

    return false
}

function saveState() {
    localStorage.setItem("guessthemelody_code", currentCode)
    localStorage.setItem("guessthemelody_nick", currentNick)
    localStorage.setItem("guessthemelody_isHost", isHost ? "1" : "0")
    localStorage.setItem("guessthemelody_gameStarted", gameStarted ? "1" : "0")

    if (currentPlayerId !== null) {
        localStorage.setItem("guessthemelody_currentPlayerId", String(currentPlayerId))
    }

    if (gameCategories) {
        localStorage.setItem("guessthemelody_categories", JSON.stringify(gameCategories))
    }

    if (Object.keys(playersScores).length > 0) {
        localStorage.setItem("guessthemelody_scores", JSON.stringify(playersScores))
    }

    if (choosingPlayerId !== null) {
        localStorage.setItem("guessthemelody_choosingPlayerId", String(choosingPlayerId))
    }

    if (currentAnswer) {
        localStorage.setItem("guessthemelody_currentAnswer", currentAnswer)
    }

    if (Object.keys(playerIdToNickname).length > 0) {
        localStorage.setItem("guessthemelody_playerIdMap", JSON.stringify(playerIdToNickname))
    }

    if (Object.keys(playerNicknameToId).length > 0) {
        localStorage.setItem("guessthemelody_playerNicknameMap", JSON.stringify(playerNicknameToId))
    }

    console.log("Saved state to localStorage:", {
        currentCode,
        currentNick,
        isHost,
        gameStarted,
        hasCategories: !!gameCategories,
        playersScores,
        choosingPlayerId,
        currentAnswer,
        playerIdToNickname,
        playerNicknameToId,
        currentPlayerId,
    })
}

function clearState() {
    localStorage.removeItem("guessthemelody_code")
    localStorage.removeItem("guessthemelody_nick")
    localStorage.removeItem("guessthemelody_isHost")
    localStorage.removeItem("guessthemelody_gameStarted")
    localStorage.removeItem("guessthemelody_categories")
    localStorage.removeItem("guessthemelody_scores")
    localStorage.removeItem("guessthemelody_choosingPlayerId")
    localStorage.removeItem("guessthemelody_currentAnswer")
    localStorage.removeItem("guessthemelody_playerIdMap")
    localStorage.removeItem("guessthemelody_playerNicknameMap")
    localStorage.removeItem("guessthemelody_currentPlayerId")

    console.log("Cleared saved state from localStorage")
}

function isChoosingPlayer() {
    console.log("Checking if current player is choosing:", {
        currentNick,
        currentPlayerId: currentPlayerId,
        choosingPlayerId: choosingPlayerId,
        currentPlayerIdType: typeof currentPlayerId,
        choosingPlayerIdType: typeof choosingPlayerId,
    })

    if (currentPlayerId === null || choosingPlayerId === null) {
        return false
    }

    return Number(currentPlayerId) === Number(choosingPlayerId)
}

function getNicknameById(id) {
    if (id === null || id === undefined) return "Unknown Player"

    const numericId = Number(id)
    const nickname = playerIdToNickname[numericId]

    if (nickname) {
        return nickname
    }

    console.warn(`Could not find nickname for player ID: ${id} (${typeof id})`)
    return "Unknown Player"
}

function hasPlayerAnswered() {
    return playersAnswered.includes(currentNick)
}

function resetAnsweredPlayers() {
    playersAnswered = []
}

function addPlayerToAnswered(nickname) {
    if (!playersAnswered.includes(nickname)) {
        playersAnswered.push(nickname)
    }
}

function setPlayerScore(nickname, points) {
    playersScores[nickname] = points
    saveState()
}

function setAllPlayersScores(scores) {
    playersScores = { ...scores }
    saveState()
}

function getSortedPlayersByScore() {
    const filteredScores = { ...playersScores }

    return Object.entries(filteredScores)
        .map(([nickname, score]) => ({ nickname, score }))
        .sort((a, b) => b.score - a.score)
}

function updatePlayerMappings(players) {
    if (!players || !Array.isArray(players)) {
        console.warn("Invalid players data for mapping:", players)
        return
    }

    players.forEach((player) => {
        const playerId = player.id

        if (playerId !== undefined && player.nickname) {
            const numericId = Number(playerId)
            console.log(`Mapping player: ID ${numericId} (${typeof numericId}) -> ${player.nickname}`)

            playerIdToNickname[numericId] = player.nickname
            playerNicknameToId[player.nickname] = numericId
        } else {
            console.warn("Missing player ID or nickname:", player)
        }
    })

    saveState()
    logPlayerMappings()
}

function markMelodyAsGuessed(categoryName, points) {
    if (!gameCategories) return

    for (const category of gameCategories) {
        if (category.category_name === categoryName) {
            for (const melody of category.melodies) {
                if (melody.points === points) {
                    melody.is_guessed = true
                    console.log(`Marked melody as guessed: ${categoryName}, ${points} points`)
                    break
                }
            }
            break
        }
    }
    saveState()

    checkAllMelodiesGuessed()
}

function checkAllMelodiesGuessed() {
    if (!gameCategories) return false

    let allGuessed = true
    let totalMelodies = 0
    let guessedMelodies = 0

    for (const category of gameCategories) {
        if (category.melodies && category.melodies.length > 0) {
            for (const melody of category.melodies) {
                totalMelodies++
                if (melody.is_guessed) {
                    guessedMelodies++
                } else {
                    allGuessed = false
                }
            }
        }
    }

    console.log(`Checked melodies: ${guessedMelodies}/${totalMelodies} guessed, all guessed: ${allGuessed}`)

    return allGuessed && totalMelodies > 0
}

function showGameOverAfterDelay() {
    import("./ui-renderer.js").then(({ showGameOverScreen }) => {
        showGameOverScreen()
    })
}

function logPlayerMappings() {
    console.log("Current player ID to nickname mappings:", playerIdToNickname)
    console.log("Current player nickname to ID mappings:", playerNicknameToId)
}

import { showWaiting, showGame } from "./ui-manager.js"

export {
    socket,
    currentNick,
    currentCode,
    isHost,
    linkAdded,
    gameStarted,
    gameCategories,
    currentMelody,
    choosingPlayerId,
    currentAnswer,
    playersScores,
    currentAudioPlayer,
    playerIdToNickname,
    playerNicknameToId,
    currentPlayerId,
    lastAnsweringPlayer,
    loadSavedState,
    saveState,
    clearState,
    isChoosingPlayer,
    getNicknameById,
    hasPlayerAnswered,
    resetAnsweredPlayers,
    addPlayerToAnswered,
    setPlayerScore,
    setAllPlayersScores,
    getSortedPlayersByScore,
    updatePlayerMappings,
    markMelodyAsGuessed,
    checkAllMelodiesGuessed,
    showGameOverAfterDelay,
    logPlayerMappings,
}

export function setSocket(newSocket) {
    socket = newSocket
}

export function setCurrentNick(nick) {
    currentNick = nick
}

export function setCurrentCode(code) {
    currentCode = code
}

export function setIsHost(host) {
    isHost = host
    saveState()
}

export function setLinkAdded(added) {
    linkAdded = added
}

export function setGameStarted(started) {
    gameStarted = started
    saveState()
}

export function setGameCategories(categories) {
    gameCategories = categories
    saveState()
}

export function setCurrentMelody(melody) {
    currentMelody = melody
}

export function setChoosingPlayerId(id) {
    choosingPlayerId = id !== null ? Number(id) : null
    console.log(`Setting choosing player ID: ${choosingPlayerId} (${typeof choosingPlayerId})`)
    saveState()
}

export function setCurrentAnswer(answer) {
    currentAnswer = answer
    saveState()
}

export function setCurrentAudioPlayer(player) {
    currentAudioPlayer = player
}

export function setCurrentPlayerId(id) {
    currentPlayerId = id !== null ? Number(id) : null
    console.log(`Setting current player ID: ${currentPlayerId} (${typeof currentPlayerId})`)
    saveState()
}

export function setLastAnsweringPlayer(nickname) {
    lastAnsweringPlayer = nickname
}
