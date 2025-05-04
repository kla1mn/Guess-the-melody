import { socket } from "./game-state.js"
import { playersListEl, categoriesCt, audioPlayer } from "./dom-elements.js"

// Render the list of players
function renderPlayersList(players) {
    playersListEl.innerHTML = ""
    players.forEach((p) => {
        const li = document.createElement("li")
        li.textContent = p.nickname + (p.is_master ? " (хост)" : "")
        playersListEl.appendChild(li)
    })
}

// Add a single player to the list
function addPlayerToList(nickname, isMaster = false) {
    const li = document.createElement("li")
    li.textContent = nickname + (isMaster ? " (хост)" : "")
    playersListEl.appendChild(li)
}

// Remove a player from the list
function removePlayerFromList(nickname) {
    Array.from(playersListEl.children).forEach((li) => {
        if (li.textContent.startsWith(nickname)) {
            playersListEl.removeChild(li)
        }
    })
}

// Render game categories
function renderCategories(categories) {
    categoriesCt.innerHTML = "" // очистить предыдущее
    categories.forEach((cat) => {
        const card = document.createElement("div")
        card.className = "category-card"
        // на свой вкус можно подставить фон по имени категории
        card.style.backgroundImage = `url('/images/${cat.category_name}.jpg')`

        const title = document.createElement("h3")
        title.textContent = cat.category_name
        card.appendChild(title)

        const btns = document.createElement("div")
        btns.className = "buttons"
        cat.melodies.forEach((m) => {
            const btn = document.createElement("button")
            btn.textContent = m.points
            btn.addEventListener("click", () => {
                // отправляем всем ссылку на трек
                socket.emit("play_melody", { link: m.link })
                // сразу локально запускаем трек
                playMelody(m.link)
            })
            btns.appendChild(btn)
        })
        card.appendChild(btns)

        categoriesCt.appendChild(card)
    })
}

// Play a melody
function playMelody(link) {
    audioPlayer.src = link
    audioPlayer.classList.remove("hidden")
    audioPlayer.play()
}

export { renderPlayersList, addPlayerToList, removePlayerFromList, renderCategories, playMelody }
