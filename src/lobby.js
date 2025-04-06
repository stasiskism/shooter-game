import SettingsButtonWithPanel from './options.js';

class Lobby extends Phaser.Scene {
    createdSprites = {};
    searchBox;
    continueSearching = false;

    constructor() {
        super({ key: 'lobby' });
    }

    init(data) {
        this.username = data.username;
    }

    preload() {}

    create() {
        this.settingsButton = new SettingsButtonWithPanel(this, 1890, 90);
        this.input.mouse.releasePointerLock();
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        this.add.sprite(centerX, centerY, 'background');

        this.createButton = this.add.sprite(1920 / 2, (1080 / 2) - 170, 'create');
        this.createButton.setInteractive({ useHandCursor: true });
        this.createButton.on('pointerdown', () => this.createRoom());
        this.createButton.on('pointerover', () => this.createButton.setTint(0xf1c40f));
        this.createButton.on('pointerout', () => this.createButton.clearTint());

        this.listButton = this.add.sprite(1920 / 2, (1080 / 2), 'RoomsList');
        this.listButton.setInteractive({ useHandCursor: true });
        this.listButton.on('pointerdown', () => this.showRoomList());
        this.listButton.on('pointerover', () => this.listButton.setTint(0xf1c40f));
        this.listButton.on('pointerout', () => this.listButton.clearTint());

        this.searchButton = this.add.sprite(1920 / 2, (1080 / 2) + 170, 'Search');
        this.searchButton.setInteractive({ useHandCursor: true });
        this.searchButton.on('pointerdown', () => this.search());
        this.searchButton.on('pointerover', () => this.searchButton.setTint(0xf1c40f));
        this.searchButton.on('pointerout', () => this.searchButton.clearTint());

        this.exitButton = this.add.sprite(1920 / 2, (1080 / 2) + 340, 'exit');
        this.exitButton.setInteractive({ useHandCursor: true });
        this.exitButton.on('pointerdown', () => {
            socket.removeAllListeners();
            this.scene.start('mainMenu');
            this.scene.stop();
        });
        this.exitButton.on('pointerover', () => this.exitButton.setTint(0xf1c40f));
        this.exitButton.on('pointerout', () => this.exitButton.clearTint());

        this.searchBox = this.add.container(1920 / 2, 1080 / 2);
        let searchBoxBG = this.add.graphics();
        searchBoxBG.fillStyle(0x000000, 0.7);
        searchBoxBG.fillRect(-150, -50, 300, 100);
        this.searchBox.add(searchBoxBG);

        let searchText = this.add.text(0, -15, 'Searching...', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff'
        });
        this.searchBox.add(searchText);

        let cancelButton = this.add.text(0, 15, 'Cancel', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#ffffff',
            backgroundColor: '#3498db',
            padding: { x: 10, y: 5 }
        });
        cancelButton.setInteractive({ useHandCursor: true });
        cancelButton.on('pointerdown', () => this.cancelSearch());
        this.searchBox.add(cancelButton);

        this.searchBox.setVisible(false);
    }

    update() {}

    createRoom() {
        this.disableButtons();
        this.removeCapture();

        const overlay = document.getElementById('overlay');
        const createRoomContainer = document.getElementById('create-room-container');
        const privateRoomPrompt = document.getElementById('private-room-prompt');
        const maxPlayersPrompt = document.getElementById('max-players-prompt');
        const privateYesButton = document.getElementById('privateYesButton');
        const privateNoButton = document.getElementById('privateNoButton');
        const maxPlayersInput = document.getElementById('maxPlayersInput');
        const roomNameInput = document.getElementById('roomNameInput');
        const roomPasswordContainer = document.getElementById('roomPasswordContainer');
        const roomPasswordInput = document.getElementById('roomPasswordInput');
        const maxPlayersButton = document.getElementById('maxPlayersButton');
        const privateCancelButton = document.getElementById('privateCancelButton');
        const maxPlayersCancelButton = document.getElementById('maxPlayersCancelButton');

        let isPrivate = false;

        const handlePrivateYesClick = () => {
            isPrivate = true;
            roomPasswordContainer.style.display = 'block';
            showMaxPlayersPrompt();
        };

        const handlePrivateNoClick = () => {
            isPrivate = false;
            roomPasswordContainer.style.display = 'none';
            showMaxPlayersPrompt();
        };

        const handleMaxPlayersSubmit = () => {
            const maxPlayers = maxPlayersInput.value;
            let roomName = roomNameInput.value || `${this.username} Room`;
            console.log(this.username)
            let password = roomPasswordInput.value;

            if (!maxPlayers || isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 4) {
                alert('Please enter a valid number of players (2-4).');
                return;
            }

            if (isPrivate && !password) {
                alert('Please provide a password for a private room.');
                return;
            }

            socket.emit('createRoom', {
                roomName,
                maxPlayers,
                isPrivate,
                password: isPrivate ? password : null
            });

            socket.once('roomCreated', (roomId, mapSize) => {
                this.scene.start('room', { roomId, mapSize });
                this.scene.stop();
            });

            overlay.style.display = 'none';
            createRoomContainer.style.display = 'none';
            this.enableButtons();
            this.restoreCapture();
            cleanupEventListeners();
            maxPlayersInput.value = '';
            roomPasswordInput.value = '';
            roomNameInput.value = '';
        };

        const handleEnterKey = (event) => {
            if (event.key === 'Enter') {
                handleMaxPlayersSubmit();
            }
        };

        const showMaxPlayersPrompt = () => {
            privateRoomPrompt.style.display = 'none';
            maxPlayersPrompt.style.display = 'block';
            roomNameInput.focus();
        };

        const cleanupEventListeners = () => {
            privateYesButton.removeEventListener('click', handlePrivateYesClick);
            privateNoButton.removeEventListener('click', handlePrivateNoClick);
            maxPlayersButton.removeEventListener('click', handleMaxPlayersSubmit);
            privateCancelButton.removeEventListener('click', handleCancel);
            maxPlayersCancelButton.removeEventListener('click', handleCancel);
            maxPlayersInput.removeEventListener('keyup', handleEnterKey);
        };

        const handleCancel = () => {
            overlay.style.display = 'none';
            createRoomContainer.style.display = 'none';
            this.enableButtons();
            this.restoreCapture();
            cleanupEventListeners();
            maxPlayersInput.value = '';
            roomPasswordInput.value = '';
            roomNameInput.value = '';
        };

        overlay.style.display = 'block';
        createRoomContainer.style.display = 'block';
        privateRoomPrompt.style.display = 'block';
        maxPlayersPrompt.style.display = 'none';
        this.disableButtons();

        privateYesButton.addEventListener('click', handlePrivateYesClick);
        privateNoButton.addEventListener('click', handlePrivateNoClick);
        maxPlayersButton.addEventListener('click', handleMaxPlayersSubmit);
        privateCancelButton.addEventListener('click', handleCancel);
        maxPlayersCancelButton.addEventListener('click', handleCancel);
        maxPlayersInput.addEventListener('keyup', handleEnterKey);
    }

    joinRoom(roomId) {
        socket.off('roomJoined');
        socket.off('roomJoinFailed');

        socket.emit('checkRoom', {roomId});

        socket.on('roomJoined', roomId => {
            this.scene.start('room', { roomId: roomId });
            this.scene.stop();
        });

        socket.on('roomJoinFailed', errorMessage => {
            alert(errorMessage);
        });
    }

    search() {
        const overlay = document.getElementById('overlay');
        const searchRoomContainer = document.getElementById('search-room-container');
        const searchCancelButton = document.getElementById('searchCancelButton');

        this.searchBox.setVisible(true);
        this.continueSearching = true;

        const handleRoomJoined = (roomId) => {
            if (!this.continueSearching) return;
            this.searchBox.setVisible(false);
            this.continueSearching = false;
            this.scene.start('room', { roomId });
            this.scene.stop();
            cleanupEventListeners();
            hideSearchPrompt();
        };

        const handleRoomJoinFailed = (errorMessage) => {
            if (!this.continueSearching) return;
            this.searchBox.setVisible(false);
            alert(errorMessage);
            cleanupEventListeners();
            hideSearchPrompt();
        };

        const continuousSearch = () => {
            if (!this.continueSearching) return;
            socket.emit('searchRoom');
        };

        const cleanupEventListeners = () => {
            socket.off('roomJoined', handleRoomJoined);
            socket.off('roomJoinFailed', handleRoomJoinFailed);
            clearInterval(searchInterval);
            this.cancelSearch();
        };

        const handleCancel = () => {
            this.continueSearching = false;
            cleanupEventListeners();
            hideSearchPrompt();
        };

        const hideSearchPrompt = () => {
            overlay.style.display = 'none';
            searchRoomContainer.style.display = 'none';
            this.enableButtons();
        };

        overlay.style.display = 'block';
        searchRoomContainer.style.display = 'block';
        this.disableButtons();

        searchCancelButton.addEventListener('click', handleCancel);

        socket.on('roomJoined', handleRoomJoined);
        socket.on('roomJoinFailed', handleRoomJoinFailed);
        continuousSearch();
        const searchInterval = setInterval(continuousSearch, 5000);
    }

    cancelSearch() {
        this.searchBox.setVisible(false);
        this.continueSearching = false;
        this.enableButtons();
        this.restoreCapture();
    }

    disableButtons() {
        this.createButton.disableInteractive();
        this.listButton.disableInteractive();
        this.searchButton.disableInteractive();
        this.exitButton.disableInteractive();
    }

    enableButtons() {
        this.createButton.setInteractive({ useHandCursor: true });
        this.listButton.setInteractive({ useHandCursor: true });
        this.searchButton.setInteractive({ useHandCursor: true });
        this.exitButton.setInteractive({ useHandCursor: true });
    }

    showRoomList() {
        this.disableButtons();
        const overlay = document.getElementById('overlay');
        const container = document.getElementById('room-list-container');
        const roomListEntries = document.getElementById('roomListEntries');
        const closeButton = document.getElementById('roomListCloseButton');

        roomListEntries.innerHTML = '';

        overlay.style.display = 'block';
        container.style.display = 'block';

        closeButton.onclick = () => {
            overlay.style.display = 'none';
            container.style.display = 'none';
            this.enableButtons();
        };

        socket.emit('getRoomList');
        socket.once('roomList', (rooms) => {
            if (rooms.length === 0) {
                roomListEntries.innerHTML = '<div>No rooms available</div>';
            } else {
                rooms.forEach(room => {
                    const div = document.createElement('div');
                    const label = room.isPrivate ? '[PRIVATE]' : '[PUBLIC]';
                    div.textContent = `${label} ${room.name} (${room.players}/${room.maxPlayers})`;
                    div.className = 'prompt-button';
                    div.style.marginBottom = '5px';
                    div.style.cursor = 'pointer';
                    div.onclick = () => {
                        if (room.isPrivate) {
                            this.showJoinPrivateRoomPrompt(room.roomId);
                        } else {
                            this.joinRoom(room.roomId);
                        }
                        overlay.style.display = 'none';
                        container.style.display = 'none';
                    };
                    roomListEntries.appendChild(div);
                });
            }
        });
    }

    showJoinPrivateRoomPrompt(roomId) {
        this.removeCapture()
        const overlay = document.getElementById('overlay');
        const createRoomContainer = document.getElementById('create-room-container');
        const joinPrompt = document.getElementById('join-password-prompt');
        const input = document.getElementById('joinRoomPasswordInput');
        const joinButton = document.getElementById('joinRoomPasswordButton');
        const cancelButton = document.getElementById('joinRoomPasswordCancelButton');

        document.getElementById('private-room-prompt').style.display = 'none';
        document.getElementById('max-players-prompt').style.display = 'none';

        overlay.style.display = 'block';
        createRoomContainer.style.display = 'block';
        joinPrompt.style.display = 'block';
        input.value = '';
        input.focus();

        this.disableButtons();

        const handleJoin = () => {
            const password = input.value;
            if (!password) return alert('Please enter a password.');

            socket.emit('checkRoom', { roomId, password });
            cleanup();
        };

        const cleanup = () => {
            joinPrompt.style.display = 'none';
            overlay.style.display = 'none';
            createRoomContainer.style.display = 'none';
            this.enableButtons();
            this.restoreCapture();
            joinButton.removeEventListener('click', handleJoin);
            cancelButton.removeEventListener('click', cleanup);
        };

        joinButton.addEventListener('click', handleJoin);
        cancelButton.addEventListener('click', cleanup);

        socket.once('roomJoined', roomId => {
            this.scene.start('room', { roomId });
            this.scene.stop();
        });

        socket.once('roomJoinFailed', message => {
            alert(message);
            this.enableButtons();
        });
    }

    removeCapture() {
        this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.W);
        this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.A);
        this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.S);
        this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.D);
        this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.E);
    }

    restoreCapture() {
        this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.W);
        this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.A);
        this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.S);
        this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.D);
        this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.E);
    }
    
}



export default Lobby;
