import { socket, isChoosingPlayer, isHost, choosingPlayerId, getNicknameById, gameCategories } from "./game-state.js"
import { categoriesCt } from "./dom-elements.js"
import { showLeaderboard } from "./leaderboard-renderer.js"

export function renderCategories(categories) {
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
        btns.appendChild(btn)
      })
    }

    card.appendChild(btns)
    categoriesCt.appendChild(card)
  })
}

export function updateCategoryButtons() {
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
}
