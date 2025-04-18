const IP = '<ip_addr>';

function showInvite() {
    document.getElementById('invite-section').classList.remove('hidden');
    document.getElementById('main-buttons').classList.add('hidden');
}

function hideInvite() {
    document.getElementById('invite-section').classList.add('hidden');
    document.getElementById('main-buttons').classList.remove('hidden');
}

async function createGame(nickname) {
    const url = `http://${IP}/game_app/create_game/${encodeURIComponent(nickname)}/`;
    const res = await fetch(url, {
        method: 'GET',
        credentials: 'include'
    });
    if (!res.ok) {
        throw new Error(`Ошибка ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data.invite_code;
    //TODO понять, что приходит и как называется
}

async function getToken(nickname, inviteCode) {
    const params = new URLSearchParams({
        nickname: nickname,
        invite_code: inviteCode
    });
    const url = `http://${IP}/game_app/get_token?${params.toString()}`;
    const res = await fetch(url, {
        method: 'GET',
        credentials: 'include'
    });
    if (!res.ok) {
        throw new Error(`Ошибка ${res.status}: ${res.statusText}`);
    }
    return await res.json().catch(() => ({}));
}

function redirectToGame(inviteCode) {
    window.location.href = `waiting-room.html?invite_code=${encodeURIComponent(inviteCode)}`;
}

function init() {
    document.getElementById('btn-invite').addEventListener('click', showInvite);
    document.getElementById('btn-back').addEventListener('click', hideInvite);

    document.getElementById('btn-create').addEventListener('click', async () => {
        const nick = document.getElementById('nickname').value.trim();
        if (!nick) {
            alert('Введите, пожалуйста, никнейм');
            return;
        }
        try {
            const code = await createGame(nick);
            console.log('Invite code:', code);
            redirectToGame(code);
        } catch (err) {
            console.error(err);
            alert('Не удалось создать комнату: ' + err.message);
        }
    });

    document.getElementById('btn-connect').addEventListener('click', async () => {
        const nick = document.getElementById('nickname').value.trim();
        const code = document.getElementById('invite-code').value.trim();
        if (!nick || !code) {
            alert('Нужен и никнейм, и код комнаты');
            return;
        }
        try {
            await getToken(nick, code);
            console.log('Токен установлен в cookie');
            redirectToGame(code);
        } catch (err) {
            console.error(err);
            alert('Не удалось подключиться: ' + err.message);
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
