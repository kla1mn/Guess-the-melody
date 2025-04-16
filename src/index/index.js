function showInvite() {
    document.getElementById('invite-section').classList.remove('hidden');
    document.getElementById('main-buttons').classList.add('hidden');
}

function goToRoom(asHost) {
    const nickname = document.getElementById('nickname').value;
    if (!nickname.trim()) {
        alert('Введите никнейм');
        return;
    }

    // Генерируем код комнаты, если пользователь - хост
    let roomCode = '';
    if (asHost) {
        roomCode = generateRoomCode();
    } else {
        roomCode = document.getElementById('invite-code').value.trim();
        if (!roomCode) {
            alert('Введите код приглашения');
            return;
        }
    }

    // Сохраняем данные комнаты в localStorage
    const roomData = {
        isHost: asHost,
        nickname: nickname,
        roomCode: roomCode,
        createdAt: new Date().toISOString()
    };

    localStorage.setItem('roomData', JSON.stringify(roomData));

    // Выводим информацию о путях для отладки
    console.log('Текущий путь:', window.location.href);

    // Формируем URL для перехода с учетом структуры проекта
    // Используем относительный путь от текущей директории (src/index) к src/waiting-room
    const targetUrl = `../waiting-room/waiting-room.html?host=${asHost ? '1' : '0'}&name=${encodeURIComponent(nickname)}&code=${roomCode}`;
    console.log('Переходим по URL:', targetUrl);

    // Выполняем переход
    window.location.href = targetUrl;
}

// Функция для генерации случайного кода комнаты
function generateRoomCode() {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Исключены похожие символы (0/O, 1/I)
    let code = '';

    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters.charAt(randomIndex);
    }

    return code;
}