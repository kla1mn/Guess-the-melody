// script.js

const BACKEND    = 'http://localhost:8000';
const WS_BACKEND = 'ws://localhost:8000/ws/game/';

// Элементы UI
const initScreen      = document.getElementById('init-screen');
const joinScreen      = document.getElementById('join-screen');
const waitingScreen   = document.getElementById('waiting-screen');

const initNickInput   = document.getElementById('init-nickname-input');
const joinNickInput   = document.getElementById('join-nickname-input');
const joinInviteInput = document.getElementById('join-invite-input');
const roomCodeEl      = document.getElementById('room-code');

// Дополнительные элементы на экране ожидания
const linkInput       = document.getElementById('link-input');
const addLinkBtn      = document.getElementById('add-link-btn');
const startBtn        = document.getElementById('start-btn');

// контейнер для списка игроков
const playersListEl = document.getElementById('players-list');


let socket = null;
let currentNick = '';
let currentCode = '';
let isHost = false;
let linkAdded = false;

// 2) В начале файла — после объявления переменных —
window.addEventListener('load', () => {
    const savedCode = localStorage.getItem('guessthemelody_code');
    const savedNick = localStorage.getItem('guessthemelody_nick');
    const savedIsHost = localStorage.getItem('guessthemelody_isHost');

    // Если есть данные — восстанавливаем состояние
    if (savedCode && savedNick) {
        currentCode = savedCode;
        currentNick = savedNick;
        isHost = savedIsHost === '1';

        // Сразу показываем экран ожидания и подключаем WS
        showWaiting();
    }
});


// --- Обработчики UI ---

// Создать комнату
document.getElementById('create-btn').addEventListener('click', async () => {
    const nick = initNickInput.value.trim();
    if (!nick) return alert('Введите никнейм');
    currentNick = nick;
    isHost = true;
    try {
        const res = await fetch(
            `${BACKEND}/game_app/create_game/${encodeURIComponent(nick)}/`,
            { credentials: 'include' }
        );
        if (!res.ok)
            throw new Error(`Ошибка сети: ${res.status}`);
        currentCode = await res.text()
        console.log(currentCode);
        showWaiting();
    } catch (e) {
        console.error(e);
        alert('Ошибка при создании игры');
    }
});

// Перейти к экрану входа по коду
document.getElementById('join-menu-btn').addEventListener('click', () => {
    joinNickInput.value = initNickInput.value;
    initScreen.classList.add('hidden');
    joinScreen.classList.remove('hidden');
});

// Назад на главный экран
document.getElementById('back-btn').addEventListener('click', () => {
    joinScreen.classList.add('hidden');
    initScreen.classList.remove('hidden');
});

// Войти по коду комнаты
document.getElementById('enter-btn').addEventListener('click', async () => {
    const nick = joinNickInput.value.trim();
    const code = joinInviteInput.value.trim();
    if (!nick || !code) {
        return alert('Введите ник и код комнаты');
    }

    currentNick = nick;
    currentCode = code;
    isHost = false;

    try {
        const res = await fetch(
            `${BACKEND}/game_app/get_token?nickname=${encodeURIComponent(nick)}&invite_code=${encodeURIComponent(code)}`,
            { method: 'GET', credentials: 'include' }
        );

        if (res.ok) {
            showWaiting();
        } else if (res.status === 400) {
            const errorText = await res.text();
            alert(errorText);
        } else {
            alert(`Ошибка сервера: ${res.status}`);
        }
    } catch (e) {
        console.error(e);
        alert('Сетевая ошибка при подключении');
    }
});


// Выйти из комнаты ожидания
document.getElementById('leave-btn').addEventListener('click', () => {
    if (socket)
        socket.close();
    waitingScreen.classList.add('hidden');
    initScreen.classList.remove('hidden');
    initNickInput.value = currentNick;

    localStorage.removeItem('guessthemelody_code');
    localStorage.removeItem('guessthemelody_nick');
    localStorage.removeItem('guessthemelody_isHost');
});

// Добавление ссылки на плейлист
addLinkBtn.addEventListener('click', async () => {
    if (linkAdded) {
        return alert('Ссылка уже добавлена');
    }

    const link = linkInput.value.trim();
    if (!link) {
        return alert('Введите ссылку');
    }

    const yaPlaylistRe = /^https?:\/\/music\.yandex\.ru\/users\/[^\/]+\/playlists\/\d+(\?.*)?$/;
    if (!yaPlaylistRe.test(link)) {
        return alert('Некорректная ссылка. Пожалуйста, введите ссылку на плейлист Яндекс.Музыки.');
    }

    try {
        const res = await fetch(
            `${BACKEND}/game_app/add_link/`,
            {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'text/plain',
                    'Accept': '*/*'
                },
                body: link
            }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => null);
            return alert(err?.error || `Ошибка сервера: ${res.status}`);
        }

        const data = await res.text();
        console.log('Ссылка добавлена:', data);

        linkAdded = true;
        linkInput.disabled = true;
        addLinkBtn.disabled = true;
        alert('Плейлист успешно добавлен!');
    } catch (e) {
        console.error(e);
        alert('Ошибка при добавлении ссылки');
    }
});


// Начать игру (только хост)
startBtn.addEventListener('click', () => {
    if (!socket)
        return;
    console.log('start_game')
    socket.send(JSON.stringify({ type: 'start_game', payload: {} }));
});

// --- Переключение экранов и WebSocket ---

function showWaiting() {
    initScreen.classList.add('hidden');
    joinScreen.classList.add('hidden');
    roomCodeEl.textContent = currentCode;
    linkInput.value = '';
    linkInput.parentElement.classList.remove('hidden');
    addLinkBtn.parentElement.classList.remove('hidden');
    if (isHost) startBtn.classList.remove('hidden');
    else startBtn.classList.add('hidden');

    waitingScreen.classList.remove('hidden');

    localStorage.setItem('guessthemelody_code', currentCode);
    localStorage.setItem('guessthemelody_nick', currentNick);
    localStorage.setItem('guessthemelody_isHost', isHost ? '1' : '0');

    connectWebSocket();
}

function connectWebSocket() {
    socket = new WebSocket(WS_BACKEND);

    socket.addEventListener('open', () => {
        console.log('WS: connected');
    });

    socket.addEventListener('message', event => {
        let msg;
        try {
            msg = JSON.parse(event.data);
        } catch {
            console.error('WS: некорректный JSON', event.data);
            return;
        }
        const event_type = msg['type'];
        const payload = msg['payload'];
        handleEvent(event_type, payload);
    });

    socket.addEventListener('close', () => console.log('WS: closed'));
    socket.addEventListener('error', e => console.error('WS error', e));
}

function handleEvent(type, payload) {
    switch (type) {
        case 'init':
            console.log('init');
            currentCode = payload.invite_code;
            currentNick = payload.current_player_nickname;
            document.getElementById('room-code').textContent = currentCode;

            renderPlayersList(payload.players);
            break;

        case 'new_player':
            console.log('new_player');
            addPlayerToList(payload.nickname, payload.is_master);
            break;

        case 'user_left':
            removePlayerFromList(payload.nickname);
            break

        case 'exception':
            console.log('exception');
            alert(payload.message);
            break;

        default:
            console.warn('Неизвестный ивент:', type, payload);
    }
}


function renderPlayersList(players) {
    playersListEl.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.textContent = p.nickname + (p.is_master ? ' (хост)' : '');
        playersListEl.appendChild(li);
    });
}


function addPlayerToList(nickname, isMaster = false) {
    const li = document.createElement('li');
    li.textContent = nickname + (isMaster ? ' (хост)' : '');
    playersListEl.appendChild(li);
}


function removePlayerFromList(nickname) {
    Array.from(playersListEl.children).forEach(li => {
        if (li.textContent.startsWith(nickname)) {
            playersListEl.removeChild(li);
        }
    });
}


