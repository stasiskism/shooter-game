import SettingsButtonWithPanel from './options.js'

class Room extends Phaser.Scene {
    frontendPlayers = {};
    readyPlayers = {}
    playerUsername = {}
    playerUsernameText = {}
    chatHistory = []
    readyPlayersCount = 0
    countdownTime = 0
    weaponId
    grenadeId
    weapons = {
        1: 'Pistol',
        2: 'Shotgun',
        3: 'AR',
        4: 'Sniper'
    }
    grenades = {
        5: 'smokeGrenade',
        6: 'grenade'
    }
    availableWeapons = []
    availableGrenades = []
    gamemodes = [
    'last_man_standing',
    'deathmatch',
    'king_of_the_hill'
    ];

    selectedGamemodeIndex = 0;
    gamemode = this.gamemodes[0];
    gamemodeText = null;

    badgeEmojiMap = {
      no_reload: '🎯',
      close_call: '❤️‍🩹',
      unlock_all_weapons: '🔫',
      unlock_all_skins: '🧢',
      speed_demon: '⚡',
      no_damage: '🧹'
    };
    
    constructor() {
        super({ key: 'room'});
    }
    init(data) {
        this.roomId = data.roomId
        this.mapSize = data.mapSize
        this.gamemode = data.gamemode || 'last_man_standing';
        this.hostId = data.hostId;
    }
    preload() {
        this.graphics = this.add.graphics()
        
    }
    create() {
        this.frontendPlayers= {}
        this.setupScene()
        this.setupInputEvents()
        this.add.text(10, 10, 'ROOM CODE: ' + this.roomId, {
            fontFamily: 'Berlin Sans FB Demi',
            fontSize: '16px',
            fill: '#ffffff'
        }).setOrigin(0, 0);
        this.settingsButton = new SettingsButtonWithPanel(this, 1890, 90, this.roomId);
        this.events.on('settingsPanelOpened', this.onSettingsPanelOpened, this);
    }

    onSettingsPanelOpened() {
        this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.W);
        this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.A);
        this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.S);
        this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.D);
        this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.E);
    }

    setupInputEvents() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        socket.emit('joinRoom', this.roomId)

        socket.on('roomJoined', ({ gamemode, hostId }) => {
            this.gamemode = gamemode;
            this.selectedGamemodeIndex = this.gamemodes.indexOf(gamemode);
            this.hostId = hostId;
            this.initGamemodeUI();
        });

        socket.on('roomJoinFailed', errorMessage => {
            alert(errorMessage)
            this.scene.start('lobby')
            this.scene.stop()
        })

        socket.on('updateRoomPlayers', roomPlayers => {
            for (const playerIndex in roomPlayers) {
                const playerData = roomPlayers[playerIndex];
                const roomId = playerData.roomId
                if (this.roomId !== roomId) return;
                const id = playerData.id
                if (!this.frontendPlayers[id]) {
                    this.setupPlayer(id, playerData)
                    this.readyPlayers[id] = false
                } else {
                    this.updatePlayerPosition(id, playerData)
                }
            }

            for (const playerId in this.frontendPlayers) {
                //goes through players, get their id, and if returns undefined, then the player does not exist
                if (!roomPlayers.find(player => player.id === playerId)) { 
                    this.frontendPlayers[playerId].anims.stop();
                    this.frontendPlayers[playerId].destroy();
                    this.playerUsernameText[playerId].destroy();
                    delete this.frontendPlayers[playerId];
                    delete this.playerUsernameText[playerId];  // Remove the text object from the storage
                }
            }

        });

        socket.on('countdownEnd', () => {
            const sceneMap = {
                deathmatch: 'Deathmatch',
                last_man_standing: 'Multiplayer',
                king_of_the_hill: 'KingOfTheHill'
            };

            const sceneToStart = sceneMap[this.gamemode] || 'Multiplayer';
            this.scene.start(sceneToStart, {
                multiplayerId: this.roomId,
                mapSize: this.mapSize,
                gamemode: this.gamemode
            });
            this.scene.stop();

            for (const id in this.frontendPlayers) {
                this.frontendPlayers[id].anims.stop();
                this.frontendPlayers[id].destroy();
                this.playerUsernameText[id].destroy();
                delete this.frontendPlayers[id];
                delete this.playerUsernameText[id];
            }
            
            this.chatHistory = [];
            socket.removeAllListeners();
        });

        socket.on('playerAnimationUpdate', animData => {
            const { playerId, animation } = animData;
            if (this.frontendPlayers[playerId]) {
                this.frontendPlayers[playerId].anims.play(animation, true);
            }
        });

        socket.on('updateReadyPlayers', (readyCount) => {
            this.readyPlayersCount = readyCount
            if (this.readyPlayersText) {
                this.readyPlayersText.setText(`READY PLAYERS: ${this.readyPlayersCount}`);
            }
            this.checkAllPlayersReady();

            if (this.readyPlayers[socket.id]) {
                const username = this.playerUsername[socket.id]
                const message = `${username} is ready!`
                socket.emit('sendMessage', {roomId: this.roomId, message})
            }
        })

        socket.on('updateCountdown', (countdownTime) => {
            this.countdownTime = countdownTime
            if (this.countdownText) {
                this.countdownText.setText(`Game starts in: ${this.countdownTime}`);
            }
        })

        socket.on('receiveMessage', (message) => {
            this.chatHistory.push(message);
            this.chatDisplay.setText(this.chatHistory.slice(-15).join('\n'));
        })

        socket.on('availableWeapons', (availableWeapons, availableGrenades, availableSkins) => {
            this.availableWeapons = availableWeapons;
            this.availableGrenades = availableGrenades;
            this.availableSkins = availableSkins;
            this.currentSkinIndex = 0;
            this.updateSkinDisplay();
        });
          
        this.registerGamemodeSocketEvents();
    }

    setupScene() {
        this.centerX = this.cameras.main.width / 2;
        this.centerY = this.cameras.main.height / 2;
        const map = this.make.tilemap({ key: "map", tileWidth: 32, tileHeight: 32});
        const tileset = map.addTilesetImage("asd", "tiles");
        const layer = map.createLayer("Tile Layer 1", tileset, 0, 0);
        this.add.sprite(430, 430, 'wasd').setScale(0.2)
        this.add.text(375, 350, 'Movement').setScale(1.5)
        this.add.image(450, 520, 'R').setScale(1.5)
        this.add.text(385, 480, 'Reload').setScale(1.5)
        this.add.image(450, 590, 'G').setScale(1.5)
        this.add.text(350, 540, 'Smoke grenade').setScale(1.5)
        this.add.image(420, 680, 'left-click').setScale(0.2)
        this.add.text(385, 610, 'Shoot').setScale(1.5)

        this.exitButton = this.add.sprite(1890, 30, 'quitButton').setScale(0.1)
        this.exitButton.setInteractive({ useHandCursor: true })
        this.exitButton.on('pointerdown', () => {
            const exitPromptContainer = document.getElementById('exit-prompt-container');
            const exitYesButton = document.getElementById('exitYesButton');
            const exitNoButton = document.getElementById('exitNoButton');

            const handleExitYes = () => {
                socket.emit('leaveRoom', this.roomId);
                socket.removeAllListeners();
                this.scene.start('lobby');
                this.scene.stop();
                if (this.frontendPlayers[socket.id]) {
                    this.frontendPlayers[socket.id].anims.stop()
                    this.frontendPlayers[socket.id].destroy();
                    this.playerUsernameText[socket.id].destroy();
                    delete this.frontendPlayers[socket.id];
                    delete this.playerUsernameText[socket.id];
                }
                cleanupEventListeners();
                hideExitPrompt();
            };
        
            const handleExitNo = () => {
                cleanupEventListeners();
                hideExitPrompt();
            };
        
            const cleanupEventListeners = () => {
                exitYesButton.removeEventListener('click', handleExitYes);
                exitNoButton.removeEventListener('click', handleExitNo);
            };
            const hideExitPrompt = () => {
                overlay.style.display = 'none';
                exitPromptContainer.style.display = 'none';
            };
            exitPromptContainer.style.display = 'block';
            exitYesButton.addEventListener('click', handleExitYes);
            exitNoButton.addEventListener('click', handleExitNo);
        })

        this.readyButton = this.add.sprite(1920 / 2, (1080 / 2) - 300, 'ready')
        this.readyButton.setInteractive({useHandCursor: true})
        this.readyButton.on('pointerover', () => this.readyButton.setTint(0xf1c40f));
        this.readyButton.on('pointerout', () => this.readyButton.clearTint()); 
        this.readyButton.on('pointerdown', () => {
            let isReady = !this.readyPlayers[socket.id];
            this.readyPlayers[socket.id] = isReady
            socket.emit('updateReadyState', { playerId: socket.id, isReady, roomId: this.roomId });
        });

        this.readyPlayersText = this.add.text(1920 / 2, (1080 / 2) - 500, `READY PLAYERS: 0`, {
            fontFamily: 'Berlin Sans FB Demi',
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(0.5).setScale(2);

        const chatButton = this.add.image(1890, 150, 'chat').setInteractive({ useHandCursor: true }).setScale(0.1)

        chatButton.on('pointerdown', () => {
            this.chatDisplay.visible = !this.chatDisplay.visible;
            closeButton.visible = !closeButton.visible;
            chatInputElement.style.display = chatInputElement.style.display === 'none' ? 'block' : 'none';
        });

        const closeButton = this.add.text(1840, 300, 'X', {
            fontSize: '32px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 10 },
        }).setInteractive({ useHandCursor: true });

        closeButton.on('pointerdown', () => {
            this.chatDisplay.visible = false;
            closeButton.visible = false;
            chatInputElement.style.display = 'none';
        });

        this.chatDisplay = this.add.text(1500, 350, '', { 
            fontSize: '20px', 
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 10 },
            wordWrap: { width: 380, useAdvancedWrap: true }
        }).setInteractive().setDepth(1);
        this.chatDisplay.setFixedSize(380, 380);

        this.chatHistory = [];
        this.chatDisplay.setText('');

        
        const chatInputHTML = `
            <div style="position: fixed; bottom: 10px; left: 10px;">
                <input type="text" id="chatInput" style="width: 300px; padding: 10px; font-size: 16px;" placeholder="Type your message...">
            </div>
        `;

        this.add.dom(1500, 730).createFromHTML(chatInputHTML);
        const chatInputElement = document.getElementById('chatInput')
        chatInputElement.addEventListener('keydown', (event) => {
            if (chatInputElement.contains(document.activeElement)) {
                this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.W);
                this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.A);
                this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.S);
                this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.D);
                this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.E);
                this.input.keyboard.enabled = false;
            }

            chatInputElement.addEventListener('keypress', function(event) {
                if (chatInputElement.value.length >= 30) {
                    event.preventDefault();
                }
            });

            if (event.key === 'Enter') {
                event.preventDefault();
                const text = chatInputElement.value.trim();

                const allowedPattern = /^[a-zA-Z0-9\s.,!?]*$/;

                if (text === '') {
                    alert('Cannot send an empty message.');
                    return;
                }

                if (text.length > 30) {
                    alert('Message is too long. Maximum 30 characters allowed.');
                    return;
                }

                if (!allowedPattern.test(text)) {
                    alert('Message contains invalid characters.');
                    return;
                }

                const username = this.playerUsername[socket.id];
                const message = `${username}: ${text}`;
                chatInputElement.value = '';
                socket.emit('sendMessage', { roomId: this.roomId, message });
            } else if (event.key === 'Escape') {
                this.input.keyboard.enabled = true;
                chatInputElement.value = '';
                chatInputElement.blur();
            } else if (event.key === ' ') {
                if (chatInputElement.value.length < 30) {
                    chatInputElement.value += ' ';
                }
            }
        });

        this.nextButtonWeapon = this.add.sprite(0, 0, 'nextButton').setScale(0.2)
        this.nextButtonWeapon.setPosition(this.centerX - 50, 880).setScrollFactor(0).setDepth(1)
        this.nextButtonWeapon.setInteractive({useHandCursor: true})
        this.nextButtonWeapon.on('pointerdown', () => {
            this.weaponId++;
            if (this.weaponId > 4) {
                this.weaponId = 1
            }
            this.setupWeapon(this.weaponId)
            socket.emit('changeWeapon', this.weaponId)
        });

        this.add.text(this.centerX - 930, 880, 'Choose loadout:', { fontFamily: 'Arial', fontSize: 48, color: '#ffffff' });

        this.add.text(this.centerX - 930, 980, 'Choose skin:', { fontFamily: 'Arial', fontSize: 48, color: '#ffffff' });

        this.previousButtonWeapon = this.add.sprite(0, 0, 'previousButton').setScale(0.2)
        this.previousButtonWeapon.setPosition(this.centerX - 510, 880).setScrollFactor(0).setDepth(1)
        this.previousButtonWeapon.setInteractive({useHandCursor: true})
        this.previousButtonWeapon.on('pointerdown', () => {
            this.weaponId--;
            if (this.weaponId < 1) {
                this.weaponId = 4
            }
            this.setupWeapon(this.weaponId)
            socket.emit('changeWeapon', this.weaponId)
        });

        this.nextButtonGrenade = this.add.sprite(0, 0, 'nextButton').setScale(0.2)
        this.nextButtonGrenade.setPosition(this.centerX + 400, 880).setScrollFactor(0).setDepth(1)
        this.nextButtonGrenade.setInteractive({useHandCursor: true})
        this.nextButtonGrenade.on('pointerdown', () => {
            this.grenadeId++;
            if (this.grenadeId > 6) {
                this.grenadeId = 5
            }
            this.setupGrenade(this.grenadeId)
            socket.emit('changeGrenade', this.grenadeId)
        });

        this.previousButtonGrenade = this.add.sprite(0, 0, 'previousButton').setScale(0.2)
        this.previousButtonGrenade.setPosition(this.centerX + 200, 880).setScrollFactor(0).setDepth(1)
        this.previousButtonGrenade.setInteractive({useHandCursor: true})
        this.previousButtonGrenade.on('pointerdown', () => {
            this.grenadeId--;
            if (this.grenadeId < 5) {
                this.grenadeId = 6
            }
            this.setupGrenade(this.grenadeId)
            socket.emit('changeGrenade', this.grenadeId)
        });

        this.previousButtonSkin = this.add.sprite(0, 0, 'previousButton').setScale(0.2)
        this.previousButtonSkin.setPosition(this.centerX - 510, 980).setScrollFactor(0).setDepth(1)
        this.previousButtonSkin.setInteractive({useHandCursor: true})
        this.previousButtonSkin.on('pointerdown', () => {
            const skinsForWeapon = this.availableSkins?.[this.weaponId];
            if (!skinsForWeapon?.length) return;
        
            this.currentSkinIndex = (this.currentSkinIndex - 1 + skinsForWeapon.length) % skinsForWeapon.length;
            const selectedSkinId = skinsForWeapon[this.currentSkinIndex];
        
            this.updateSkinDisplay();
            socket.emit('changeSkin', selectedSkinId);
        });
        

        this.nextButtonSkin = this.add.sprite(0, 0, 'nextButton').setScale(0.2)
        this.nextButtonSkin.setPosition(this.centerX - 50, 980).setScrollFactor(0).setDepth(1)
        this.nextButtonSkin.setInteractive({useHandCursor: true})
        this.nextButtonSkin.on('pointerdown', () => {
            const skinsForWeapon = this.availableSkins?.[this.weaponId];
            if (!skinsForWeapon?.length) return;
        
            this.currentSkinIndex = (this.currentSkinIndex + 1) % skinsForWeapon.length;
            const selectedSkinId = skinsForWeapon[this.currentSkinIndex];
        
            this.updateSkinDisplay();
            socket.emit('changeSkin', selectedSkinId);
        });

    }

    setupPlayer(id, playerData) {
        this.frontendPlayers[id] = this.physics.add.sprite(playerData.x, playerData.y, 'idle').setScale(4);
        this.playerUsername[id] = playerData.username;

        const badgeKey = playerData.badge || null;
        const badge = this.badgeEmojiMap[badgeKey] || '';
        const displayName = badge ? `${badge} ${playerData.username}` : playerData.username;

        this.playerUsernameText[id] = this.add.text(playerData.x, playerData.y - 50, displayName, {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        
        if (id === socket.id) {
            this.weaponId = playerData.weaponId
            this.grenadeId = playerData.grenadeId
            this.setupWeapon(this.weaponId)
            this.setupGrenade(this.grenadeId)
        }
    }

    setupWeapon(weaponId) {
        if (this.displayWeapon) {
            this.displayWeapon.destroy()
        }
        if (this.lockedWeaponText) {
            this.lockedWeaponText.destroy()
        }

        if (weaponId === 3) {
            this.displayWeapon = this.add.sprite(0, 0, '' + this.weapons[weaponId]).setScale(3)
            this.displayWeapon.setPosition(this.centerX - 200, 880).setScrollFactor(0).setDepth(1)
        } else {
            this.displayWeapon = this.add.sprite(0, 0, '' + this.weapons[weaponId]).setScale(3)
            this.displayWeapon.setPosition(this.centerX - 270, 880).setScrollFactor(0).setDepth(1)
        }

        if (!this.availableWeapons.length) return
        if (!this.availableWeapons.includes(weaponId)) {
            this.lockedWeaponText = this.add.text(this.centerX - 350, 880, 'LOCKED', {
                fontFamily: 'Arial',
                fontSize: 28,
                color: '#FFFFFF',
                backgroundColor: '#000000',
                padding: {
                    x: 5,
                    y: 2
                }
            });
            this.lockedWeaponText.setScrollFactor(0).setDepth(1);
        }
        this.currentSkinIndex = 0;
        this.updateSkinDisplay();

    }

    setupGrenade(grenadeId) {
        if (this.displayGrenade) {
            this.displayGrenade.destroy()
        }
        if (this.lockedGrenadeText) {
            this.lockedGrenadeText.destroy()
        }

        this.displayGrenade = this.add.sprite(0, 0, '' + this.grenades[grenadeId]).setScale(3)
        this.displayGrenade.setPosition(this.centerX + 300, 880).setScrollFactor(0).setDepth(1)

        if (!this.availableGrenades.length) return
        if (!this.availableGrenades.includes(grenadeId)) {
            this.lockedGrenadeText = this.add.text(this.displayGrenade.x - 50, this.displayGrenade.y, 'LOCKED', {
                fontFamily: 'Arial',
                fontSize: 28,
                color: '#FFFFFF',
                backgroundColor: '#000000',
                padding: {
                    x: 5,
                    y: 2
                }
            });
            this.lockedGrenadeText.setScrollFactor(0).setDepth(1);
        }
    }
    
    update() {
        this.updatePlayerMovement();
    }

    updatePlayerMovement() {
        if (!this.frontendPlayers[socket.id] || !this.roomId) return;
        const player = this.frontendPlayers[socket.id];
        let moving = false;
        let direction = '';

        if (this.w.isDown) {
            moving = true;
            direction += 'Up';
            player.y -= 2;
            socket.emit('roomPlayerMove', { data: 'w', roomId: this.roomId });
        } else if (this.s.isDown) {
            moving = true;
            direction += 'Down';
            player.y += 2;
            socket.emit('roomPlayerMove', { data: 's', roomId: this.roomId });
        }

        if (this.a.isDown) {
            moving = true;
            direction += 'Left';
            player.x -= 2;
            socket.emit('roomPlayerMove', { data: 'a', roomId: this.roomId });
        } else if (this.d.isDown) {
            moving = true;
            direction += 'Right';
            player.x += 2;
            socket.emit('roomPlayerMove', { data: 'd', roomId: this.roomId });
        }

        if (moving) {
            const animationName = `Walk${direction}`;
            if (!player.anims) return
            player.anims.play(animationName, true);
            socket.emit('playerAnimationChange', { playerId: socket.id, animation: animationName });
            this.lastDirection = direction;
        } else {
            let idleAnimationName;
            if (this.lastDirection) {
                if (this.lastDirection.includes('Up')) {
                    idleAnimationName = 'IdleUp';
                } else if (this.lastDirection.includes('Down')) {
                    idleAnimationName = 'IdleDown';
                } else if (this.lastDirection.includes('Left') || this.lastDirection.includes('Right')) {
                    idleAnimationName = this.lastDirection.includes('Left') ? 'IdleLeft' : 'IdleRight';
                } else {
                    idleAnimationName = 'IdleDown';
                }
            } else {
                idleAnimationName = 'IdleDown';
            }
            if (!player.anims) return
            player.anims.play(idleAnimationName, true);
            socket.emit('playerAnimationChange', { playerId: socket.id, animation: idleAnimationName });
        }

    }

    updatePlayerPosition(id, roomPlayer) {
        this.frontendPlayers[id].x = roomPlayer.x;
        this.frontendPlayers[id].y = roomPlayer.y;
        
        if (this.playerUsernameText[id]) {
            this.playerUsernameText[id].setPosition(roomPlayer.x, roomPlayer.y - 50);
            const badgeKey = roomPlayer.badge || null;
            const badge = this.badgeEmojiMap[badgeKey] || '';
            const displayName = badge ? `${badge} ${roomPlayer.username}` : roomPlayer.username;
            this.playerUsernameText[id].setText(displayName);
        }
    }

    checkAllPlayersReady() {
        let count = 0
        for (const playerId in this.readyPlayers) {
           count++
        }
        if (count === this.readyPlayersCount && count > 0) { // > 1
            this.readyButton.destroy()
            this.countdownText = this.add.text(800, 200, '', { fontSize: '64px', fill: '#fff' });
            this.countdownText.setOrigin(0.5);
            socket.emit('startCountdown', this.roomId)
        }
    }

    updateSkinDisplay() {
        if (this.displaySkin) {
          this.displaySkin.destroy();
        }
      
        const skins = this.availableSkins?.[this.weaponId] || [];
        if (!skins.length) {
          this.displaySkin = this.add.text(this.centerX - 270, 980, 'No skins available', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff'
          });
          return;
        }
      
        const currentSkinId = skins[this.currentSkinIndex % skins.length];
        const textureKey = this.getSkinTextureKey(currentSkinId); // You may need to map this
      
        this.displaySkin = this.add.sprite(this.centerX - 270, 980, textureKey).setScale(2);
      }

      getSkinTextureKey(skinId) {
        const textureMap = {
          20: 'skin1_pistol',
          21: 'skin1_shotgun',
          22: 'skin1_ar',
          23: 'skin1_sniper'
        };
        return textureMap[skinId] || 'default_skin';
      }

      initGamemodeUI() {
        const textY = (1080 / 2) - 390;

        this.gamemodeText = this.add.text(this.centerX, textY, `Gamemode: ${this.formatGamemode(this.gamemode)}`, {
            fontFamily: 'Berlin Sans FB Demi',
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(0.5).setScale(2);

        this.updateGamemodeDisplay();

        const buttonOffsetX = 500;

        if (socket.id === this.hostId) {
            this.previousGamemodeButton = this.add.sprite(this.centerX - buttonOffsetX, textY, 'previousButton')
                .setScale(0.2)
                .setInteractive({ useHandCursor: true })
                .setScrollFactor(0)
                .setDepth(1);

            this.nextGamemodeButton = this.add.sprite(this.centerX + buttonOffsetX, textY, 'nextButton')
                .setScale(0.2)
                .setInteractive({ useHandCursor: true })
                .setScrollFactor(0)
                .setDepth(1);

            this.previousGamemodeButton.on('pointerdown', () => {
                if (this.scene.key !== 'room') return;
                this.handleGamemodeChange(-1);
            });

            this.nextGamemodeButton.on('pointerdown', () => {
                if (this.scene.key !== 'room') return;
                this.handleGamemodeChange(1);
            });
        }
      }

      updateGamemodeDisplay() {
        const formatted = this.gamemode
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());

        if (this.gamemodeText) {
        this.gamemodeText.setText(`Gamemode: ${formatted}`);
        }
      }

      formatGamemode(mode) {
        return mode
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
      }


      handleGamemodeChange(direction) {
        const totalModes = this.gamemodes.length;
        this.selectedGamemodeIndex = (this.selectedGamemodeIndex + direction + totalModes) % totalModes;
        this.gamemode = this.gamemodes[this.selectedGamemodeIndex];

        this.updateGamemodeDisplay();

        socket.emit('updateGamemode', {
            roomId: this.roomId,
            gamemode: this.gamemode
        });
      }

      registerGamemodeSocketEvents() {
        socket.on('roomGamemode', (gamemode) => {
            this.gamemode = gamemode;
            this.selectedGamemodeIndex = this.gamemodes.indexOf(gamemode);
            this.updateGamemodeDisplay();
        });
      }


}

export default Room
