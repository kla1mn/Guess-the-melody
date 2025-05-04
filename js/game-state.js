import { showWaiting, showGame } from "./ui-manager.js"

// Game state variables
let socket = null
let currentNick = ""
let currentCode = ""
let isHost = false
let linkAdded = false
let gameStarted = false
let gameCategories = null

// Load saved state from localStorage
function loadSavedState() {
    const savedCode = localStorage.getItem("guessthemelody_code")
    const savedNick = localStorage.getItem("guessthemelody_nick")
    const savedIsHost = localStorage.getItem("guessthemelody_isHost")
    const savedGameStarted = localStorage.getItem("guessthemelody_gameStarted")
    const savedCategories = localStorage.getItem("guessthemelody_categories")

    if (savedCode && savedNick) {
        currentCode = savedCode
        currentNick = savedNick
        isHost = savedIsHost === "1"
        gameStarted = savedGameStarted === "1"

        try {
            if (savedCategories) {
                gameCategories = JSON.parse(savedCategories)
            }
        } catch (e) {
            console.error("Error parsing saved categories:", e)
            gameCategories = null
        }

        console.log("Loaded saved state:", {
            currentCode,
            currentNick,
            isHost,
            gameStarted,
            hasCategories: !!gameCategories,
        })

        // Если игра уже началась, показываем игровой экран
        if (gameStarted && gameCategories) {
            console.log("Game already started, showing game screen")
            showGame(gameCategories)
        } else {
            // Иначе показываем экран ожидания
            console.log("Game not started, showing waiting screen")
            showWaiting()
        }

        return true
    }

    return false
}

// Save current state to localStorage
function saveState() {
    localStorage.setItem("guessthemelody_code", currentCode)
    localStorage.setItem("guessthemelody_nick", currentNick)
    localStorage.setItem("guessthemelody_isHost", isHost ? "1" : "0")
    localStorage.setItem("guessthemelody_gameStarted", gameStarted ? "1" : "0")

    if (gameCategories) {
        localStorage.setItem("guessthemelody_categories", JSON.stringify(gameCategories))
    }

    console.log("Saved state to localStorage:", {
        currentCode,
        currentNick,
        isHost,
        gameStarted,
        hasCategories: !!gameCategories,
    })
}

// Clear saved state
function clearState() {
    localStorage.removeItem("guessthemelody_code")
    localStorage.removeItem("guessthemelody_nick")
    localStorage.removeItem("guessthemelody_isHost")
    localStorage.removeItem("guessthemelody_gameStarted")
    localStorage.removeItem("guessthemelody_categories")

    console.log("Cleared saved state from localStorage")
}

export {
    socket,
    currentNick,
    currentCode,
    isHost,
    linkAdded,
    gameStarted,
    gameCategories,
    loadSavedState,
    saveState,
    clearState,
}

// Allow these to be modified from other modules
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
