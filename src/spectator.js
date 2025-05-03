import SettingsButtonWithPanel from './options.js'

class Spectator extends Phaser.Scene {
    frontendPlayers = {};
    frontendWeapons = {};
    frontendProjectiles = {};
    playerHealth = {}
    playerAmmo = {}
    currentPlayerIndex = 0
    playerIds = []
    gameStop = false
    weapon = {}
    animationKeys = {
        1: { name: 'Pistol', start: 0, end: 11 },
        2: { name: 'Shotgun', start: 0, end: 11 },
        3: { name: 'AR', start: 0, end: 11 },
        4: { name: 'Sniper', start: 0, end: 11 },
    }
    grenades = {
        1: 'smokeGrenade',
        2: 'grenade'
    }
    explosions = {
        1: 'smoke',
        2: 'explosion'
    }
    fallingObjects = []

    constructor() {
        super({ key: 'spectator' });
    }

    init(data) {
        this.cameras.main.setBackgroundColor('#000000')
        this.multiplayerId = data.multiplayerId
        this.mapSize = data.mapSize
    }

    preload() {
        this.graphics = this.add.graphics()
    }

    create() {
        this.setupScene();
        this.setupMap();
        this.setupInputEvents();
        this.settingsButton = new SettingsButtonWithPanel(this, 1890, 90);
    }

    setupMap() {
        const map1 = this.make.tilemap({ key: "map2", tileWidth: 32, tileHeight: 32 });
        const tileset1 = map1.addTilesetImage("Mapass", "tiles_multiplayer");
        const layer1 = map1.createLayer("Tile Layer 1", tileset1, -2000, -1000).setScale(1);
    }

    setupScene() {
        this.graphics.lineStyle(10, 0xff0000);
        this.graphics.strokeRect(0, 0, this.cameras.main.width + this.mapSize, this.cameras.main.height + this.mapSize).setDepth(999);
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        this.vaizdasImage = this.add.sprite(centerX, centerY, 'mapas');
        this.crosshair = this.physics.add.sprite(centerX, centerY, 'crosshair').setVisible(false);
        this.fullscreenButton = this.add.sprite(1890, 30, 'fullscreen').setDepth().setScale(0.1)
        this.fullscreenButton.setPosition(this.cameras.main.width - 200, 200).setScrollFactor(0)
        this.fullscreenButton.setInteractive({ useHandCursor: true })
        this.fullscreenButton.on('pointerdown', () => {
            document.getElementById('phaser-example');
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
            } else {
                this.scale.startFullscreen();
            }
        })

        this.nextButton = this.add.sprite(0, 0, 'nextButton').setScale(0.2)
        this.nextButton.setPosition(centerX + 320, 1000).setScrollFactor(0)
        this.nextButton.setInteractive({ useHandCursor: true })
        this.nextButton.setDepth(100000);
        this.nextButton.on('pointerdown', () => {
            this.nextPlayer();
        });

        this.previousButton = this.add.sprite(0, 0, 'previousButton').setScale(0.2)
        this.previousButton.setPosition(centerX - 320, 1000).setScrollFactor(0)
        this.previousButton.setInteractive({ useHandCursor: true })
        this.previousButton.setDepth(100000);
        this.previousButton.on('pointerdown', () => {
            this.previousPlayer();
        });

        this.graphics.lineStyle(10, 0xff0000);
        this.graphics.strokeRect(0, 0, this.cameras.main.width + this.mapSize, this.cameras.main.height + this.mapSize);

        this.quitButton = this.add.sprite(1920 / 2, (1080 / 2) - 400, 'exit')
        console.log("cia", this.quitButton)
        this.quitButton.setInteractive({ useHandCursor: true }).setScale(0.75).setPosition(centerX, 1000).setScrollFactor(0).setDepth(100000)
        this.quitButton.on('pointerdown', () => { 
            this.clickQuitButton();
        });

        const smoke = [
            { key: 'smoke', frame: 1, duration: 200 },
            { key: 'smoke', frame: 2, duration: 200 },
            { key: 'smoke', frame: 4, duration: 200 },
            { key: 'smoke', frame: 8, duration: 500 },
            { key: 'smoke', frame: 12, duration: 500 },
            { key: 'smoke', frame: 13, duration: 2000 },
            { key: 'smoke', frame: 14, duration: 2000 },
            { key: 'smoke', frame: 15, duration: 2000 },
            { key: 'smoke', frame: 16, duration: 3000 },
            { key: 'smoke', frame: 17, duration: 2000 },
            { key: 'smoke', frame: 18, duration: 1000 },
            { key: 'smoke', frame: 20, duration: 500 },
            { key: 'smoke', frame: 22, duration: 500 },
            { key: 'smoke', frame: 26, duration: 200 },
            { key: 'smoke', frame: 30, duration: 200 },
            { key: 'smoke', frame: 31, duration: 200 },
        ];

        const config = {
            key: 'smokeExplode',
            frames: smoke,
            frameRate: 20,
            repeat: 0,
        };

        this.anims.create(config);

        const explosionFrames = [];
        for (let i = 3; i <= 21; i++) {
            explosionFrames.push({ key: `explosion_${i}` });
        }

        this.anims.create({
            key: 'explosion_anim',
            frames: explosionFrames,
            frameRate: 30,
            repeat: 0, // No repeat
        });
    }

    setupInputEvents() {
        this.input.on('pointermove', pointer => {
            if (this.input.mouse.locked) {
                this.crosshair.x += pointer.movementX;
                this.crosshair.y += pointer.movementY;
            }
        });

        socket.on('playerAnimationUpdate', animData => {
            const { playerId, animation } = animData;
            if (this.frontendPlayers[playerId]) {
                this.frontendPlayers[playerId].anims.play(animation, true);
            }
        });

        socket.on('weaponStateUpdate', wsData => {
            const { playerId, x, y, rotation } = wsData;
            if (this.frontendPlayers[playerId] && this.frontendWeapons[playerId]) {
                this.frontendWeapons[playerId].setPosition(x, y).setRotation(rotation);
            }
        });

        socket.on('updatePlayers', backendPlayers => {
            const alivePlayers = {}
            for (const id in backendPlayers) {
                const backendPlayer = backendPlayers[id];
                if (this.multiplayerId !== backendPlayer.multiplayerId) return
                const playerId = backendPlayer.id
                if (!this.frontendPlayers[playerId]) {
                    this.setupPlayer(playerId, backendPlayer);
                } else {
                    this.updatePlayerPosition(playerId, backendPlayer);
                }
                alivePlayers[id] = true;
            }

            // const alivePlayerCount = Object.keys(alivePlayers).length;
            // if (alivePlayerCount === 1) {
            //     this.gameStop = true
            //     const id = Object.keys(alivePlayers)[0]
            //     this.gameWon(backendPlayers[id].username)
            //     socket.off('updatePlayers')
            // }

            for (const id in this.frontendPlayers) {
                if (!alivePlayers[id]) {
                    this.removePlayer(id);
                }
            }

            Object.keys(alivePlayers).forEach(playerId => {
                if (!this.playerIds.includes(playerId)) {
                    this.playerIds.push(playerId);
                }
            });
        });

        socket.on('updateProjectiles', (backendProjectiles, backendGrenades) => {
            for (const id in backendProjectiles) {
                if (!this.frontendProjectiles[id]) {
                    this.setupProjectile(backendProjectiles[id].playerId, id, backendProjectiles[id]);
                }
                else {
                    this.updateProjectilePosition(id, backendProjectiles[id]);
                }
            }

            for (const id in backendGrenades) {
                if (!this.frontendGrenades[id]) {
                    this.setupGrenade(backendGrenades[id].playerId, id, backendGrenades[id])
                }
                else {
                    this.updateGrenadePosition(id, backendGrenades[id])
                }
            }

            for (const id in this.frontendProjectiles) {
                if (!backendProjectiles[id]) {
                    this.removeProjectile(id);
                }
            }

            for (const id in this.frontendGrenades) {
                if (!backendGrenades[id]) {
                    this.removeGrenade(id)
                }
            }
        });

        socket.on('updateFallingObjects', (fallingObjects) => {
            for (const i in fallingObjects) {
                if (this.fallingObjects[i]) {
                    this.fallingObjects[i].setPosition(fallingObjects[i].x, fallingObjects[i].y);
                } else {
                    const object = this.physics.add.image(
                        fallingObjects[i].x,
                        fallingObjects[i].y,
                        'wall'
                    ).setScale(2);
                    this.fallingObjects[i] = object;
                }
            }
            for (const id in this.fallingObjects) {
                if (!fallingObjects.hasOwnProperty(id)) {
                    this.fallingObjects[id].destroy();
                    delete this.fallingObjects[id];
                }
            }
        })
    }

    setupPlayer(id, playerData) {
        if (this.frontendPlayers[id]) {
            this.frontendPlayers[id].destroy();
            this.frontendWeapons[id].destroy();
            this.playerHealth[id].container.destroy();
            this.playerAmmo[id].destroy()
        }

        this.frontendPlayers[id] = this.physics.add.sprite(playerData.x, playerData.y, 'idleDown').setScale(4);
        this.weapon[id] = this.animationKeys[playerData.weaponId].name;
        const skinTextureKey = getSkinTextureKey(playerData.skinId);
        this.frontendWeapons[id] = this.physics.add.sprite(playerData.x, playerData.y, skinTextureKey).setScale(2);


        const healthBarWidth = 100;
        const healthBarHeight = 10;
        const healthBarBg = this.add.graphics().fillStyle(0xff0000).fillRect(0, 0, healthBarWidth, healthBarHeight);
        const healthBarFg = this.add.graphics().fillStyle(0x00ff00).fillRect(0, 0, healthBarWidth, healthBarHeight);
        const healthBarContainer = this.add.container(playerData.x - healthBarWidth / 2, playerData.y + 55, [healthBarBg, healthBarFg]);
        this.playerHealth[id] = { bg: healthBarBg, fg: healthBarFg, container: healthBarContainer };
        this.weapon[id] = playerData.weaponId
        this.playerAmmo[id] = this.add.text(playerData.x, playerData.y + 75, `Ammo: ${playerData.bullets}`, { fontFamily: 'Arial', fontSize: 12, color: '#ffffff' });
    }

    updatePlayerPosition(id, backendPlayer) {
        this.frontendPlayers[id].x = backendPlayer.x;
        this.frontendPlayers[id].y = backendPlayer.y;
        this.playerHealth[id].container.setPosition(backendPlayer.x - 50, backendPlayer.y + 55);
        const healthPercentage = backendPlayer.health / 100;
        this.playerHealth[id].fg.scaleX = healthPercentage;
        this.playerAmmo[id].setPosition(backendPlayer.x, backendPlayer.y + 75)
        this.playerAmmo[id].setText(`Ammo: ${backendPlayer.bullets}`).setOrigin(0.5).setScale(2);
    }

    removePlayer(id) {
        if (this.frontendPlayers[id]) {
            this.frontendPlayers[id].destroy();
            this.frontendWeapons[id].destroy();
            this.playerHealth[id].container.destroy();
            this.playerAmmo[id].destroy();
            delete this.frontendPlayers[id];
            delete this.frontendWeapons[id];
            delete this.playerHealth[id];
            delete this.playerAmmo[id];
        }
    }

    setupProjectile(playerId, id) {
        const weapon = this.frontendWeapons[playerId]
        const angle = weapon.rotation
        const bulletOffsetX = Math.cos(angle) * 40
        const bulletOffsetY = Math.sin(angle) * 40
        const bulletX = weapon.x + bulletOffsetX
        const bulletY = weapon.y + bulletOffsetY
        const projectile = this.physics.add.sprite(bulletX, bulletY, 'bullet').setScale(2);
        projectile.setRotation(angle);
        this.frontendProjectiles[id] = projectile;
    }

    updateProjectilePosition(id, backendProjectile) {
        const projectile = this.frontendProjectiles[id];
        projectile.x += backendProjectile.velocity.x * 1;
        projectile.y += backendProjectile.velocity.y * 1;
    }

    removeProjectile(id) {
        this.frontendProjectiles[id].destroy();
        delete this.frontendProjectiles[id];
    }

    setupGrenade(playerId, id, backendGrenade) {
        const grenadeName = this.grenades[backendGrenade.grenadeId]
        const grenade = this.physics.add.sprite(backendGrenade.x, backendGrenade.y, '' + grenadeName).setScale(4)
        const direction = Phaser.Math.Angle.Between(
            this.frontendPlayers[playerId].x,
            this.frontendPlayers[playerId].y,
            this.crosshair.x,
            this.crosshair.y
        );
        grenade.setRotation(direction)
        this.frontendGrenades[id] = grenade
    }

    updateGrenadePosition(id, backendGrenade) {
        const grenade = this.frontendGrenades[id]
        if (this.frontendGrenades[id].exploded) {
            return
        }
        grenade.x += backendGrenade.velocity.x
        grenade.y += backendGrenade.velocity.y
        const explosion = this.explosions[backendGrenade.grenadeId]
        if (backendGrenade.velocity.x === 0 && backendGrenade.velocity.y === 0) {
            this.grenadeExplode(grenade.x, grenade.y, id, explosion)
            this.frontendGrenades[id].exploded = true;
        }
    }

    removeGrenade(id) {
        this.frontendGrenades[id].destroy()
        delete this.frontendGrenades[id]
    }

    update() {
        this.updateCameraPosition();
        this.updateCrosshairPosition();
    }

    updateCameraPosition() {
        if (this.playerIds.length === 0) return;

        const playerId = this.playerIds[this.currentPlayerIndex];
        if (!this.frontendPlayers[playerId]) return;

        const playerX = this.frontendPlayers[playerId].x;
        const playerY = this.frontendPlayers[playerId].y;

        const cameraScrollX = playerX - this.cameras.main.width / 2;
        const cameraScrollY = playerY - this.cameras.main.height / 2;

        this.cameras.main.scrollX = cameraScrollX;
        this.cameras.main.scrollY = cameraScrollY;
    }

    nextPlayer() {
        if (this.playerIds.length === 0) return;
        this.currentPlayerIndex++;
        if (this.currentPlayerIndex >= this.playerIds.length) {
            this.currentPlayerIndex = 0;
        }
    }

    previousPlayer() {
        if (this.playerIds.length === 0) return;
        this.currentPlayerIndex--;
        if (this.currentPlayerIndex < 0) {
            this.currentPlayerIndex = this.playerIds.length - 1;
        }
    }

    updateCrosshairPosition() {
        for (const id in this.frontendPlayers) {
            const player = this.frontendPlayers[id];
            this.crosshair.body.velocity.x = player.body.velocity.x;
            this.crosshair.body.velocity.y = player.body.velocity.y;
        }
    }

    clickQuitButton() {
        socket.emit('leaveRoom', this.multiplayerId)
        this.scene.start('mainMenu')
        this.scene.stop('spectator')
        this.scene.stop()
        socket.removeAllListeners()
    }

    gameWon(username) {
        socket.removeAllListeners()
        this.cameras.main.centerOn(this.cameras.main.width / 2, this.cameras.main.height / 2);
        const winningText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            `${username} has won the game!`,
            { fontFamily: 'Arial', fontSize: 48, color: '#ffffff' }
        );

        winningText.setOrigin(0.5);
        for (const id in this.frontendPlayers) {
            this.removePlayer(id);
        }

        this.time.delayedCall(5000, () => {
            socket.emit('leaveRoom', this.multiplayerId)
            this.scene.stop()
            this.scene.start('lobby');
        });
    }

    grenadeExplode(x, y, id, explosion) {
        if (explosion === 'smoke') {
            const smoke = this.add.sprite(x, y, 'smoke').setScale(14);
            this.frontendSmoke[id] = smoke

            // this.sound.play('smokeSound', {volume: 0.5})
            smoke.play('smokeExplode');
            //removint granatos sprite
            smoke.on('animationcomplete', () => {
                smoke.destroy();
                delete this.frontendSmoke[id]
            });
        } else if (explosion === 'explosion') {
            this.sound.play('grenadeSound', { volume: 1 })
            setTimeout(() => {
                const grenade = this.add.sprite(x - 30, y - 110, 'explosion_1').setScale(7);
                this.frontendExplosion[id] = grenade;
                grenade.play('explosion_anim');
                grenade.on('animationcomplete', () => {
                    grenade.destroy();
                    delete this.frontendExplosion[id];
                });
            }, 400); //2000
        }
    }

    getSkinTextureKey(skinId, weaponId) {
        const skinMap = {
            20: 'skin1_pistol',
            21: 'skin1_shotgun',
            22: 'skin1_ar',
            23: 'skin1_sniper'
        };
    
        const weaponDefaults = {
            1: 'Pistol',
            2: 'Shotgun',
            3: 'AR',
            4: 'Sniper'
        };
    
        return skinMap[skinId] || weaponDefaults[weaponId];
    }

}

export default Spectator;
