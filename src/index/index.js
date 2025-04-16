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
    const url = `room.html?host=${asHost ? '1' : '0'}&name=${encodeURIComponent(nickname)}`;
    window.location.href = url;
}
