// Глобальные переменные
let isHost = false;
let roomCode = '';
let playerName = '';
let players = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Получаем параметры из URL
    const urlParams = new URLSearchParams(window.location.search);
    isHost = urlParams.get('host') === '1';
    playerName = decodeURIComponent(urlParams.get('name') || '');

    // Если пользователь - хост, показываем элементы управления хоста
    if (isHost) {
        document.getElementById('host-controls').classList.remove('hidden');
        // Получаем код комнаты из URL или localStorage
        roomCode = urlParams.get('code') || '';

        if (!roomCode) {
            // Пытаемся получить код из localStorage
            const roomData = JSON.parse(localStorage.getItem('roomData') || '{}');
            roomCode = roomData.roomCode || generateRoomCode();
        }
    } else {
        // Если не хост, пытаемся получить код комнаты из URL
        roomCode = urlParams.get('code') || '';

        // Если кода нет, перенаправляем на главную страницу
        if (!roomCode) {
            alert('Код комнаты не указан');
            window.location.href = '../index/index.html';
            return;
        }
    }

    // Отображаем код комнаты
    document.getElementById('room-code-display').textContent = roomCode;

    // Добавляем текущего игрока
    addPlayer(playerName, true);

    // Если это не хост, имитируем подключение к комнате
    if (!isHost) {
        joinRoom();
    } else {
        // Если хост, имитируем создание комнаты
        // В реальном приложении здесь будет код для создания комнаты на сервере
        console.log('Комната создана с кодом:', roomCode);

        // Добавляем несколько тестовых игроков (для демонстрации)
        setTimeout(() => {
            addPlayer('Игрок 2');
            setTimeout(() => {
                addPlayer('Игрок 3');
            }, 1500);
        }, 1000);
    }

    // Настраиваем обработчики событий
    setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик для копирования кода комнаты
    document.getElementById('copy-code').addEventListener('click', copyRoomCode);

    // Обработчик для кнопки начала игры (только для хоста)
    if (isHost) {
        document.getElementById('start-game').addEventListener('click', startGame);
    }
}

// Генерация случайного кода комнаты
function generateRoomCode() {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Исключены похожие символы (0/O, 1/I)
    let code = '';

    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters.charAt(randomIndex);
    }

    return code;
}

// Добавление игрока в комнату
function addPlayer(name, isCurrentPlayer = false) {
    // Проверяем, не добавлен ли уже игрок с таким именем
    if (players.includes(name)) {
        return;
    }

    // Добавляем имя в массив игроков
    players.push(name);

    // Получаем шаблон игрока
    const template = document.getElementById('player-template');
    const playerElement = document.importNode(template.content, true).querySelector('.player');

    // Устанавливаем имя игрока
    playerElement.querySelector('.player-name').textContent = name;

    // Устанавливаем случайный цвет аватара
    const avatarIndex = Math.floor(Math.random() * 5) + 1;
    playerElement.querySelector('.player-avatar').classList.add(`avatar-${avatarIndex}`);

    // Если это текущий игрок, добавляем соответствующий класс
    if (isCurrentPlayer) {
        playerElement.classList.add('current-player');
    }

    // Добавляем элемент игрока в контейнер
    document.getElementById('players-container').appendChild(playerElement);

    // Обновляем статус игрока (для демонстрации)
    setTimeout(() => {
        const statusIcon = playerElement.querySelector('.status-icon');
        const statusText = playerElement.querySelector('.status-text');

        statusIcon.textContent = '✓';
        statusText.textContent = 'Плейлист загружен';
    }, 2000);
}

// Копирование кода комнаты в буфер обмена
function copyRoomCode() {
    const roomCodeText = document.getElementById('room-code-display').textContent;

    navigator.clipboard.writeText(roomCodeText)
        .then(() => {
            const copyButton = document.getElementById('copy-code');
            const originalText = copyButton.textContent;

            copyButton.textContent = 'Скопировано!';
            setTimeout(() => {
                copyButton.textContent = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Не удалось скопировать код:', err);
            alert('Не удалось скопировать код комнаты');
        });
}

// Присоединение к комнате (для не-хоста)
function joinRoom() {
    // В реальном приложении здесь будет код для подключения к комнате на сервере
    console.log('Присоединение к комнате с кодом:', roomCode);

    // Имитация получения списка игроков от сервера
    setTimeout(() => {
        // Добавляем хоста (для демонстрации)
        addPlayer('Хост');

        // Добавляем еще одного игрока (для демонстрации)
        setTimeout(() => {
            addPlayer('Другой игрок');
        }, 1500);
    }, 1000);
}

// Начало игры (только для хоста)
function startGame() {
    if (!isHost) return;

    // Проверяем, есть ли достаточно игроков
    if (players.length < 2) {
        alert('Для начала игры нужно минимум 2 игрока');
        return;
    }

    // В реальном приложении здесь будет код для начала игры на сервере
    console.log('Начинаем игру с игроками:', players);

    // Переход на страницу игры
    alert('Игра начинается!');
    // window.location.href = `../game/game.html?room=${roomCode}&name=${encodeURIComponent(playerName)}`;
}

// Добавление плейлиста
function addPlaylist() {
    const playlistLink = document.getElementById('playlist-link').value.trim();

    if (!playlistLink) {
        alert('Введите ссылку на плейлист');
        return;
    }

    // В реальном приложении здесь будет код для добавления плейлиста
    console.log('Добавлен плейлист:', playlistLink);

    // Очищаем поле ввода
    document.getElementById('playlist-link').value = '';

    // Показываем уведомление
    alert('Плейлист успешно добавлен!');
}

// Поделиться комнатой
function shareRoom() {
    // Формируем полный URL для присоединения к комнате
    const baseUrl = window.location.href.split('?')[0]; // Получаем URL без параметров
    const shareUrl = `${baseUrl}?host=0&code=${roomCode}`;

    // Проверяем поддержку Web Share API
    if (navigator.share) {
        navigator.share({
            title: 'Присоединяйся к игре "Угадай мелодию"',
            text: `Присоединяйся к моей комнате в игре "Угадай мелодию"! Код комнаты: ${roomCode}`,
            url: shareUrl
        })
            .catch(error => console.log('Ошибка при попытке поделиться:', error));
    } else {
        // Если Web Share API не поддерживается, копируем ссылку в буфер обмена
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                alert('Ссылка на комнату скопирована в буфер обмена');
            })
            .catch(err => {
                console.error('Не удалось скопировать ссылку:', err);
                alert('Не удалось скопировать ссылку. Код комнаты: ' + roomCode);
            });
    }
}

// Генерация QR-кода (заглушка)
function generateQR() {
    alert('Функция генерации QR-кода будет доступна в следующей версии');
}

// Копирование ссылки на игру
function copyGameLink() {
    // Формируем полный URL для присоединения к комнате
    const baseUrl = window.location.href.split('?')[0]; // Получаем URL без параметров
    const gameUrl = `${baseUrl}?host=0&code=${roomCode}`;

    navigator.clipboard.writeText(gameUrl)
        .then(() => {
            alert('Ссылка на игру скопирована в буфер обмена');
        })
        .catch(err => {
            console.error('Не удалось скопировать ссылку:', err);
            alert('Не удалось скопировать ссылку. Код комнаты: ' + roomCode);
        });
}