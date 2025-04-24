// waiting-room.js
const IP        = '158.160.169.76:8000';
const WS_PROTO  = location.protocol === 'https:' ? 'wss' : 'ws';
const WS_URL    = `${WS_PROTO}://${IP}/game_app/ws`;
let socket    = null;

// Парсим параметры из URL
const params   = new URLSearchParams(window.location.search);
const invite   = params.get('invite_code');
const isHost   = params.get('host') === 'true';

// Элементы DOM
const btnAdd   = document.getElementById('btn-add-link');
const btnStart = document.getElementById('btn-start');
const linkInp  = document.getElementById('playlist-link');
const list     = document.getElementById('link-list');

// Показать кнопку старта только хосту
if (isHost) {
    btnStart.classList.remove('hidden');
}

// Утилита: выполняет GET-запрос с credentials: include
async function getWithToken(url) {
    const res = await fetch(url, { method: 'GET', credentials: 'include' });
    if (!res.ok) throw new Error(`Ошибка ${res.status}: ${res.statusText}`);
    return res;
}

// Добавление ссылки на сервер и по WS
btnAdd.addEventListener('click', async () => {
    const link = linkInp.value.trim();
    if (!link) {
        alert('Введите, пожалуйста, ссылку на плейлист');
        return;
    }

    try {
        // HTTP-запрос к бэку
        await getWithToken(
            `http://${IP}/game_app/add_link/${encodeURIComponent(link)}/`
        );
        // опционально: уведомим других через WS
        socket.send(JSON.stringify({
            event_type: 'new_link',
            payload: { link }
        }));
        linkInp.value = '';
    } catch (err) {
        console.error(err);
        alert('Не удалось добавить ссылку: ' + err.message);
    }
});

// Функция для отрисовки новой ссылки в списке
function addLinkToList(link) {
    const li = document.createElement('li');
    li.textContent = link;
    list.appendChild(li);
}

// Настройка WebSocket
function connectSocket() {
    socket = new WebSocket(WS_URL);
    socket.onopen = () => console.log('WS connected');
    socket.onmessage = e => {
        const msg = JSON.parse(e.data);
        switch (msg.event_type) {
            case 'start_game':
                window.location.href = `game.html?invite_code=${encodeURIComponent(invite)}`;
                break;
            case 'new_link':
                addLinkToList(msg.payload.link);
                break;
        }
    };
    socket.onerror = e => console.error('WS error', e);
    socket.onclose = e => console.log('WS closed', e);
}
connectSocket();

// Хост нажал «Начать игру» → рассылаем событие всем
btnStart.addEventListener('click', () => {
    socket.send(JSON.stringify({
        event_type: 'start_game',
        payload: {}
    }));
});
