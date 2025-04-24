const BACKEND = 'http://localhost:8000';
const WS_BACKEND = 'ws://localhost:8000/game_app/ws';

const initScreen = document.getElementById('init-screen');
const joinScreen = document.getElementById('join-screen');
const waitingScreen = document.getElementById('waiting-screen');

const initNickInput = document.getElementById('init-nickname-input');
const joinNickInput = document.getElementById('join-nickname-input');
const joinInviteInput = document.getElementById('join-invite-input');
const roomCodeEl = document.getElementById('room-code');

let ws;
let currentNick = '';
let currentCode = '';

// Создание комнаты: create_game устанавливает куку-токен
document.getElementById('create-btn').addEventListener('click', async () => {
    const nick = initNickInput.value.trim();
    if (!nick) return alert('Введите никнейм');
    currentNick = nick;
    try {
        const res = await fetch(`${BACKEND}/game_app/create_game/${encodeURIComponent(nick)}`, { credentials: 'include' });
        const data = await res.json();
        currentCode = data.invite_code;
        showWaiting();
    } catch (e) {
        console.error(e);
        alert('Ошибка при создании игры');
    }
});

// Показать экран входа в комнату
document.getElementById('join-menu-btn').addEventListener('click', () => {
    joinNickInput.value = initNickInput.value;
    initScreen.classList.add('hidden');
    joinScreen.classList.remove('hidden');
});

// Возврат к начальному экрану
document.getElementById('back-btn').addEventListener('click', () => {
    joinScreen.classList.add('hidden');
    initScreen.classList.remove('hidden');
});

// Вход по коду: get_token устанавливает куку-токен
document.getElementById('enter-btn').addEventListener('click', async () => {
    const nick = joinNickInput.value.trim();
    const code = joinInviteInput.value.trim();
    if (!nick || !code) return alert('Введите ник и код комнаты');
    currentNick = nick;
    currentCode = code;
    try {
        await fetch(
            `${BACKEND}/game_app/get_token?nickname=${encodeURIComponent(nick)}&invite_code=${encodeURIComponent(code)}`,
            { credentials: 'include' }
        );
        showWaiting();
    } catch (e) {
        console.error(e);
        alert('Ошибка при подключении');
    }
});

// Выход из комнаты
document.getElementById('leave-btn').addEventListener('click', () => {
    if (ws) ws.close();
    waitingScreen.classList.add('hidden');
    initScreen.classList.remove('hidden');
    initNickInput.value = currentNick;
});

// Показ экрана ожидания и подключение WS
function showWaiting() {
    joinScreen.classList.add('hidden');
    initScreen.classList.add('hidden');
    roomCodeEl.textContent = currentCode;
    waitingScreen.classList.remove('hidden');
    connectWebSocket();
}

function connectWebSocket() {
    ws = new WebSocket(WS_BACKEND);
    ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ event_type: 'join_room', payload: { nickname: currentNick, invite_code: currentCode } }));
    });
    ws.addEventListener('message', evt => {
        const { event_type, payload } = JSON.parse(evt.data);
        handleEvent(event_type, payload);
    });
    ws.addEventListener('close', () => console.log('WS закрыт'));
    ws.addEventListener('error', e => console.error('WS ошибка', e));
}

function handleEvent(type, payload) {
    switch (type) {
        case 'transfer_master':
            handleTransferMaster(payload);
            break;
        case 'start_game':
            handleStartGame(payload);
            break;
        case 'pick_melody':
            handlePickMelody(payload);
            break;
        case 'answer':
            handleAnswer(payload);
            break;
        case 'accept_answer_partially':
            handleAcceptAnswerPartially(payload);
            break;
        case 'accept_answer':
            handleAcceptAnswer(payload);
            break;
        case 'reject_answer':
            handleRejectAnswer(payload);
            break;
        default:
            console.warn('Неизвестная команда:', type, payload);
            ws.send(JSON.stringify({ event_type: 'unknown', payload: { message: 'Неизвестная команда' } }));
    }
}

// Handlers for server events (стаб-функции)
function handleTransferMaster(payload) {
    console.log('Передача прав мастерства:', payload);
    // TODO: обновить UI, показать нового админа
}

function handleStartGame(payload) {
    console.log('Начало игры:', payload);
    // TODO: перейти к экрану игры
}

function handlePickMelody(payload) {
    console.log('Выбор мелодии:', payload);
    // TODO: отобразить варианты мелодий
}

function handleAnswer(payload) {
    console.log('Ответ игрока:', payload);
    // TODO: показать ответ и кнопку «Проверить»
}

function handleAcceptAnswerPartially(payload) {
    console.log('Частичное принятие ответа:', payload);
    // TODO: обновить счёт/статус
}

function handleAcceptAnswer(payload) {
    console.log('Правильный ответ:', payload);
    // TODO: обновить счёт/статус
}

function handleRejectAnswer(payload) {
    console.log('Неправильный ответ:', payload);
    // TODO: показать сообщение об ошибке
}
