// script.js

const BACKEND    = 'http://158.160.169.76:8000';
const WS_BACKEND = 'ws://158.160.169.76:8000/ws/game/';

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

let ws = null;
let currentNick = '';
let currentCode = '';
let isHost = false;
let linkAdded = false;

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
    if (ws) ws.close();
    waitingScreen.classList.add('hidden');
    initScreen.classList.remove('hidden');
    initNickInput.value = currentNick;
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
            `${BACKEND}/game_app/add_link/${encodeURIComponent(link)}`,
            { credentials: 'include' }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => null);
            return alert(err?.error || `Ошибка сервера: ${res.status}`);
        }

        const data = await res.json();
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
    if (!ws) return;
    ws.send(JSON.stringify({ event_type: 'start_game', payload: {} }));
});

// --- Переключение экранов и WebSocket ---

function showWaiting() {
    initScreen.classList.add('hidden');
    joinScreen.classList.add('hidden');
    roomCodeEl.textContent = currentCode;
    // Показать дополнительные элементы
    linkInput.value = '';
    linkInput.parentElement.classList.remove('hidden');
    addLinkBtn.parentElement.classList.remove('hidden');
    if (isHost) startBtn.classList.remove('hidden');
    else startBtn.classList.add('hidden');

    waitingScreen.classList.remove('hidden');
    connectWebSocket();
}

function connectWebSocket() {
    ws = new WebSocket(WS_BACKEND);

    ws.addEventListener('open', () => {
        ws.send(JSON.stringify({
            event_type: 'join_room',
            payload: { nickname: currentNick, invite_code: currentCode }
        }));
    });

    ws.addEventListener('message', evt => {
        const { event_type, payload } = JSON.parse(evt.data);
        handleEvent(event_type, payload);
    });
    ws.addEventListener('close', () => console.log('WS закрыт'));
    ws.addEventListener('error', e => console.error('WS ошибка', e));
}

// --- Обработка входящих WS-событий ---
function handleEvent(type, payload) {
    switch (type) {
        case 'user_list':
            console.log('Игроки в комнате:', payload.users);
            break;
        case 'user_joined':
            console.log('Игрок присоединился:', payload.nickname);
            break;
        case 'user_left':
            console.log('Игрок вышел:', payload.nickname);
            break;
        case 'transfer_master':
            console.log('Передача мастерства:', payload);
            break;
        case 'start_game':
            console.log('Игра началась:', payload);
            // TODO: перейти к игровому экрану
            break;
        case 'pick_melody':
            console.log('Выбор мелодии:', payload);
            break;
        case 'answer':
            console.log('Ответ:', payload);
            break;
        case 'accept_answer_partially':
            console.log('Частично принято:', payload);
            break;
        case 'accept_answer':
            console.log('Принято:', payload);
            break;
        case 'reject_answer':
            console.log('Отклонено:', payload);
            break;
        default:
            console.warn('Неизвестная команда:', type, payload);
    }
}
