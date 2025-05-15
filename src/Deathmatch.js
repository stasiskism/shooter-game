/* global Phaser, socket */
import SettingsButtonWithPanel from './options.js'

class Deathmatch extends Phaser.Scene {
    frontendPlayers = {}
    frontendWeapons = {}
    frontendProjectiles = {}
    frontendGrenades = {}
    frontendSmoke = {}
    frontendExplosion = {}
    playerHealth = {}
    weaponDetails = {}
    playerUsername = {}
    darkOverlay = {}
    weapon = {}
    empty = false
    gameStop = false
    isPanelVisible = false
    animationKeys = {
        1: { name: 'Pistol', startShoot: 0, endShoot: 11, startReload: 0, endReload: 22 },
        2: { name: 'Shotgun', startShoot: 0, endShoot: 13, startReload: 0, endReload: 13 },
        3: { name: 'AR', startShoot: 0, endShoot: 15, startReload: 0, endReload: 15 },
        4: { name: 'Sniper', startShoot: 0, endShoot: 43, startReload: 0, endReload: 27 },
    }
    grenades = {
        5: 'smokeGrenade',
        6: 'grenade'
    }
    explosions = {
        5: 'smoke',
        6: 'explosion'
    }
    playersAffected = {}
    isRespawning = false;


    constructor() {
        super({ key: 'Deathmatch' });
    }

    init(data) {
        this.cameras.main.setBackgroundColor('#000000');
        this.multiplayerId = data.multiplayerId
        this.mapSize = data.mapSize
    }

    preload() {
        this.graphics = this.add.graphics()
        for (let i = 3; i <= 21; i++) {
            this.load.image(`explosion_${i}`, `assets/Explosion/1_${i}.png`)
        }
    }

    create() {
        this.gameStop = false;
        this.isRespawning = false;
        this.isPanelVisible = false;
        this.empty = false;
        this.frontendPlayers = {}
        this.setupScene();
        this.setupMap();
        this.setupInputEvents();
        this.settingsButton = new SettingsButtonWithPanel(this, 1890, 90);
        this.events.on('settingsPanelOpened', this.onSettingsPanelOpened, this);
        this.killFeed = this.add.group();
        this.damageOverlay = this.add.rectangle(0, 0, 3000, 3000, 0xff0000)
            .setOrigin(0)
            .setAlpha(0)
            .setDepth(9999);
        this.reloadIndicator = this.add.graphics();
        this.reloadIndicator.setDepth(999);
        this.reloadIndicator.setVisible(false);
        this.leaderboardText = this.add.text(20, 100, '', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setScrollFactor(0).setDepth(999);

        this.killCounts = {};

    }
    
    onSettingsPanelOpened(panelVisible) {
        this.isPanelVisible = panelVisible;
        if (panelVisible) {
            this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.W);
            this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.A);
            this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.S);
            this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.D);
            this.input.mouse.releasePointerLock();
        } else {
            this.input.mouse.requestPointerLock();
            this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.W);
            this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.A);
            this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.S);
            this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.D);
        }
    }

    setupMap() {
        const map1 = this.make.tilemap({ key: "map2", tileWidth: 32, tileHeight: 32 });
        const tileset1 = map1.addTilesetImage("Mapass", "tiles_multiplayer");
        const layer1 = map1.createLayer("Tile Layer 1", tileset1, -2000, -1000).setScale(1);
    }

    gunAnimation() {
        for (const weaponId in this.animationKeys) {
            const weaponData = this.animationKeys[weaponId];
            const weapon = weaponData.name;
            const startShoot = weaponData.startShoot;
            const endShoot = weaponData.endShoot;
            const startReload = weaponData.startReload;
            const endReload = weaponData.endReload;
    
            const reloadTime = this.weaponDetails.reload;
            const reloadFrames = endReload - startReload + 1;
            const reloadFrameRate = reloadFrames / (reloadTime / 1000);
    
        }
    }
    

    setupScene() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        this.crosshair = this.physics.add.sprite(centerX, centerY, 'crosshair').setDepth(999);
        this.graphics.lineStyle(10, 0xff0000);
        this.graphics.strokeRect(0, 0, this.cameras.main.width + this.mapSize, this.cameras.main.height + this.mapSize).setDepth(999);

        if (!this.anims.exists('smokeExplode')) {
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
        }

        if (!this.anims.exists('explosion_anim')) {
            const explosionFrames = [];
            for (let i = 3; i <= 21; i++) {
                explosionFrames.push({ key: `explosion_${i}` });
            }

            this.anims.create({
                key: 'explosion_anim',
                frames: explosionFrames,
                frameRate: 30,
                repeat: 0,
            });
        }

    }

    setupInputEvents() {

        this.input.on('pointermove', pointer => {
            if (this.input.mouse.locked) {
                this.crosshair.x += pointer.movementX;
                this.crosshair.y += pointer.movementY;
            }
        });

        let canShoot = true
        this.input.mouse.requestPointerLock();

        this.input.on('pointerdown', (pointer) => {
            if (!this.isPanelVisible) {
                this.input.mouse.requestPointerLock();
            }
            if (!this.weaponDetails) return
            const firerate = this.weaponDetails.fire_rate
            if (pointer.leftButtonDown() && this.input.mouse.locked && canShoot && this.ammo != 0) {
                this.startShooting(firerate);
                canShoot = false;
                setTimeout(() => {
                    canShoot = true;
                }, firerate);
            }
        });

        this.input.on('pointerup', this.stopShooting, this)

        let canReload = true

        this.input.keyboard.on('keydown-R', () => {
            if (!this.weaponDetails || !canReload) return;
            /*this.frontendWeapons[socket.id].anims.play(`reloads_${this.weapon[socket.id]}`, true);
            socket.emit('gunAnimation', {multiplayerId: this.multiplayerId, playerId: socket.id, animation: 'reloads', weapon: this.weapon[socket.id]})*/
            canShoot = false;
            const reloadTime = this.weaponDetails.reload;
            canReload = false;
            this.reloadIndicator.setVisible(true);
            const startTime = this.time.now;

            this.reloadTimer = this.time.addEvent({
                delay: 16, // ~60 FPS
                loop: true,
                callback: () => {
                    const elapsed = this.time.now - startTime;
                    const progress = Phaser.Math.Clamp(elapsed / reloadTime, 0, 1);
                    this.drawReloadCircle(progress);

                    if (progress >= 1) {
                        this.reloadTimer.remove();
                        this.reloadIndicator.clear();
                        this.reloadIndicator.setVisible(false);
                        canReload = true;
                        canShoot = true;
                    }
                }
            });
            socket.emit('reload', socket.id);
        });

        this.input.keyboard.on('keydown-G', () => {
            if (!this.frontendPlayers[socket.id] || !this.crosshair) return;
            socket.emit('throw', this.frontendPlayers[socket.id], this.crosshair, this.multiplayerId);
        })

        this.cursors = this.input.keyboard.createCursorKeys();
        this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

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
            
            const alivePlayers = {};
            for (const id in backendPlayers) {
                const backendPlayer = backendPlayers[id];
                if (this.multiplayerId !== backendPlayer.multiplayerId) continue;
                const playerId = backendPlayer.id
                if (!this.frontendPlayers[playerId]) {
                    this.setupPlayer(playerId, backendPlayer);
                } else {
                    this.updatePlayerPosition(playerId, backendPlayer);
                }
                alivePlayers[id] = true;
            }


            for (const id in this.frontendPlayers) {
                if (!alivePlayers[id]) {
                    this.removePlayer(id);
                }
            }


            for (const id in this.frontendPlayers) {
                if (!alivePlayers[id]) {
                    this.removePlayer(id);
                }
            }
        });

        socket.on('updateProjectiles', (backendProjectiles, backendGrenades) => {
            for (const id in backendProjectiles) {
                if (!this.frontendProjectiles[id]) {
                    this.setupProjectile(backendProjectiles[id].playerId, id);
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

        socket.on('removeKilledPlayer', ({ victimId, killerId }) => {
            const killerName = killerId ? this.playerUsername[killerId]?.text : 'The Void';
            const victimName = this.playerUsername[victimId]?.text;

            const feedX = this.cameras.main.width - 40;
            const feedY = 100 + this.killFeed.getLength() * 40;

            const killText = this.add.text(feedX - 10, feedY,
                `${killerName} → ${victimName}`, {
                    fontFamily: 'Arial Black',
                    fontSize: '28px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 4,
                    backgroundColor: 'transparent'
                }).setOrigin(1, 0).setScrollFactor(0).setDepth(999);

            this.killFeed.add(killText);
            this.time.delayedCall(4000, () => killText.destroy());

            if (killerId) {
                if (!this.killCounts[killerName]) {
                    this.killCounts[killerName] = 0;
                }
                this.killCounts[killerName]++;
                this.updateLeaderboard();
            }

            this.removePlayer(victimId);
        });



        socket.on('startRespawnCountdown', ({ killerUsername }) => {
            if (this.isRespawning || this.gameStop) return;
            this.isRespawning = true;
            this.removePlayer(socket.id)

            if (this.frontendPlayers[socket.id]) {
                this.removePlayer(socket.id);
            }

            this.input.keyboard.enabled = false;
            this.input.mouse.enabled = false;

            const width = this.cameras.main.width;
            const height = this.cameras.main.height;

            this.deathOverlay = this.add.rectangle(0, 0, 3000, 3000, 0x000000)
                .setOrigin(0)
                .setAlpha(0.6)
                .setDepth(998)

            const killedByText = this.add.text(width / 2, height / 2 - 100, `You were killed by ${killerUsername}`, {
                fontFamily: 'Arial',
                fontSize: 32,
                color: '#ff4c4c'
            }).setOrigin(0.5).setDepth(1000).setScrollFactor(0);

            const countdownText = this.add.text(width / 2, height / 2, 'Respawning in 3...', {
                fontFamily: 'Arial',
                fontSize: 48,
                color: '#ffffff'
            }).setOrigin(0.5).setDepth(1000).setScrollFactor(0);


            let timeLeft = 3;
            this.time.addEvent({
                delay: 1000,
                repeat: 2,
                callback: () => {
                    timeLeft--;
                    countdownText.setText(`Respawning in ${timeLeft}...`);

                    if (timeLeft === 0) {
                        countdownText.destroy();
                        killedByText.destroy();
                        this.deathOverlay.destroy();

                        this.input.keyboard.enabled = true;
                        this.input.mouse.enabled = true;

                        if (this.playerAmmo) this.playerAmmo.setVisible(true);
                        if (this.playerHealth[socket.id]?.container) {
                            this.playerHealth[socket.id].container.setVisible(true);
                        }

                        this.isRespawning = false;
                        this.w.reset();
                        this.a.reset();
                        this.s.reset();
                        this.d.reset();

                    }
                }
            });
        });

        if (!window.socketNotificationHandlersSet) {
            socket.on('achievementCompleted', ({ achievementId, title }) => {
                console.log('Received achievementCompleted:', achievementId, title);
                window.showTopNotification(`Achievement completed: ${title}! Reward is ready to be claimed.`);
            });

            socket.on('challengeCompleted', ({ challengeId, title }) => {
                console.log('Received challengeCompleted:', challengeId, title);
                window.showTopNotification(`Challenge completed: ${title}! Reward is ready to be claimed.`);
            });

            window.socketNotificationHandlersSet = true;
        }


        socket.on('gameWon', (winnerUsername) => {
            this.gameWon(winnerUsername);
        });
    }

    startShooting(firerate) {
        if (this.gameStop || !this.frontendPlayers[socket.id] || !this.crosshair) return;
        //this.frontendWeapons[socket.id].anims.play(`singleShot_${this.weapon[socket.id]}`, true);
        this.sound.play(this.weapon[socket.id] + 'Sound', { volume: 0.5 })
        const direction = Math.atan((this.crosshair.x - this.frontendPlayers[socket.id].x) / (this.crosshair.y - this.frontendPlayers[socket.id].y))
        socket.emit('shoot', this.frontendPlayers[socket.id], this.crosshair, direction, this.multiplayerId);
        socket.emit('gunAnimation', {multiplayerId: this.multiplayerId, playerId: socket.id, animation: 'singleShot', weapon: this.weapon[socket.id]})
        this.shootingInterval = setInterval(() => {
            if (this.ammo === 0) return
            if (!this.crosshair || !this.frontendPlayers[socket.id]) return
            const direction = Math.atan((this.crosshair.x - this.frontendPlayers[socket.id].x) / (this.crosshair.y - this.frontendPlayers[socket.id].y))
            this.sound.play(this.weapon[socket.id] + 'Sound', { volume: 0.5 })
            socket.emit('shoot', this.frontendPlayers[socket.id], this.crosshair, direction, this.multiplayerId);
            socket.emit('gunAnimation', {multiplayerId: this.multiplayerId, playerId: socket.id, animation: 'singleShot', weapon: this.weapon[socket.id]})
            //this.frontendWeapons[socket.id].anims.play(`singleShot_${this.weapon[socket.id]}`, true);
        }, firerate); // fire rate based on weapon

    }

    stopShooting() {
        clearInterval(this.shootingInterval)
    }

    showDamageFlash() {
        if (!this.damageOverlay) return;
        this.damageOverlay.setAlpha(0.4);
        this.tweens.add({
            targets: this.damageOverlay,
            alpha: 0,
            duration: 200,
            ease: 'Power2'
        });
    }

    setupPlayer(id, playerData) {
        // Cleanup existing player sprites if they exist
        if (this.frontendPlayers[id]) {
            this.frontendPlayers[id].destroy();
            this.frontendWeapons[id].destroy();
            this.playerHealth[id].container.destroy();
            this.playerUsername[id].destroy();
            if (id === socket.id) {
                this.playerAmmo.destroy();
            }
            this.deathOverlay.destroy();
            delete this.deathOverlay;
        }

        this.frontendPlayers[id] = this.physics.add.sprite(playerData.x, playerData.y, 'idleDown').setScale(5);
        this.playerUsername[id] = this.add.text(playerData.x, playerData.y - 50, playerData.username, { fontFamily: 'Arial', fontSize: 12, color: '#ffffff' });
        const healthBarWidth = 100;
        const healthBarHeight = 10;
        const healthBarBg = this.add.graphics().fillStyle(0xff0000).fillRect(0, 0, healthBarWidth, healthBarHeight);
        const healthBarFg = this.add.graphics().fillStyle(0x00ff00).fillRect(0, 0, healthBarWidth, healthBarHeight);
        const healthBarContainer = this.add.container(playerData.x - healthBarWidth / 2, playerData.y + 55, [healthBarBg, healthBarFg]);
        this.playerHealth[id] = { bg: healthBarBg, fg: healthBarFg, container: healthBarContainer };

        if (id === socket.id) {
            this.playerAmmo = this.add.text(playerData.x, playerData.y + 750, '', { fontFamily: 'Arial', fontSize: 12, color: '#ffffff' });
            this.weaponDetails = { fire_rate: playerData.firerate, ammo: playerData.bullets, reload: playerData.reload, radius: playerData.radius };
            this.ammoFixed = playerData.bullets
            this.gunAnimation()
        }

        this.weapon[id] = this.animationKeys[playerData.weaponId].name;
        const skinTextureKey = this.getSkinTextureKey(playerData.skinId, playerData.weaponId);
        this.frontendWeapons[id] = this.physics.add.sprite(playerData.x, playerData.y, skinTextureKey).setScale(2);

    }

    updatePlayerPosition(id, backendPlayer) {
        const player = this.frontendPlayers[id];
        const weapon = this.frontendWeapons[id];

        player.x = backendPlayer.x;
        player.y = backendPlayer.y;

        this.playerHealth[id].container.setPosition(backendPlayer.x - 50, backendPlayer.y + 55);

        if (id === socket.id && this.prevHealth !== undefined && backendPlayer.health < this.prevHealth) {
            this.showDamageFlash();
        }
        if (id === socket.id) {
            this.prevHealth = backendPlayer.health;
        }

        const healthPercentage = backendPlayer.health / 100;
        this.playerHealth[id].fg.scaleX = healthPercentage;

        this.playerUsername[id].setPosition(backendPlayer.x, backendPlayer.y - 50);
        this.playerUsername[id].setText(`${backendPlayer.username}`);
        this.playerUsername[id].setOrigin(0.5).setScale(2);

        if (id === socket.id) {
            this.ammo = backendPlayer.bullets;
            this.playerAmmo
                .setPosition(backendPlayer.x, backendPlayer.y + 75)
                .setText(`Ammo: ${this.ammo}/${this.ammoFixed}`)
                .setOrigin(0.5)
                .setScale(2);
        }
    }

    removePlayer(id) {
        
        if (id === socket.id && this.playerAmmo) {
            this.playerAmmo.destroy();
        }

        if (this.frontendPlayers[id]) {
        this.frontendPlayers[id].anims.stop();
        this.frontendPlayers[id].destroy();
        delete this.frontendPlayers[id];
    }

        if (this.frontendPlayers[id]) this.frontendPlayers[id].anims.stop();
        if (this.frontendPlayers[id]) this.frontendPlayers[id].destroy();
        if (this.frontendWeapons[id]) this.frontendWeapons[id].destroy();
        if (this.playerHealth[id]?.container) this.playerHealth[id].container.destroy();
        if (this.playerUsername[id]) this.playerUsername[id].destroy();

        delete this.frontendPlayers[id];
        delete this.frontendWeapons[id];
        delete this.playerHealth[id];
        delete this.playerUsername[id];
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
        projectile.x += backendProjectile.velocity.x
        projectile.y += backendProjectile.velocity.y
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
        this.updatePlayerMovement();
        this.updateCameraPosition();
        this.updateCrosshairPosition();
        this.isInSmoke();
        this.isInGrenade()
    }

    updatePlayerMovement() {
        if (!this.frontendPlayers[socket.id]) return;
        if (this.isRespawning || this.gameStop) return;
        const player = this.frontendPlayers[socket.id];
        const weapon = this.frontendWeapons[socket.id];
        let moving = false;
        let direction = '';

        if (this.w.isDown) {
            moving = true;
            direction += 'Up';
            player.y -= 2;
            socket.emit('playerMove', 'w');
        } else if (this.s.isDown) {
            moving = true;
            direction += 'Down';
            player.y += 2;
            socket.emit('playerMove', 's');
        }

        if (this.a.isDown) {
            moving = true;
            direction += 'Left';
            player.x -= 2;
            socket.emit('playerMove', 'a');
        } else if (this.d.isDown) {
            moving = true;
            direction += 'Right';
            player.x += 2;
            socket.emit('playerMove', 'd');
        }

        if (moving) {
            const animationName = `Walk${direction}`;
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
            player.anims.play(idleAnimationName, true);
            socket.emit('playerAnimationChange', { playerId: socket.id, animation: idleAnimationName });
        }

        if (player && weapon) {
            const angleToPointer = Phaser.Math.Angle.Between(player.x, player.y, this.crosshair.x, this.crosshair.y);
            weapon.setRotation(angleToPointer);
            let orbitDistance = 0
            switch (this.weapon[socket.id]) {
                case 'Pistol':
                    orbitDistance = 50;
                    break;
                case 'Shotgun':
                    orbitDistance = 50;
                    break;
                case 'AR':
                    orbitDistance = 70;
                    break;
                case 'Sniper':
                    orbitDistance = 50;
                    break;
            }
            const weaponX = player.x + Math.cos(angleToPointer) * orbitDistance;
            const weaponY = player.y + Math.sin(angleToPointer) * orbitDistance;
            weapon.setPosition(weaponX, weaponY);
            socket.emit('updateWeaponState', { playerId: socket.id, x: weaponX, y: weaponY, rotation: angleToPointer });
        }
    }

    updateCameraPosition() {
        if (!this.frontendPlayers[socket.id]) return;
        const avgX = (this.frontendPlayers[socket.id].x + this.crosshair.x) / 2 - 1920 / 2;
        const avgY = (this.frontendPlayers[socket.id].y + this.crosshair.y) / 2 - 1080 / 2;
        this.cameras.main.scrollX = avgX;
        this.cameras.main.scrollY = avgY;
    }

    updateCrosshairPosition() {
        if (!this.frontendPlayers[socket.id]) return;
        const crosshairRadius = this.weaponDetails.radius
        const player = this.frontendPlayers[socket.id];
        this.crosshair.body.velocity.x = player.body.velocity.x;
        this.crosshair.body.velocity.y = player.body.velocity.y;
        this.constrainReticle(this.crosshair, crosshairRadius);
    }

    constrainReticle(reticle, radius) {
        const distBetween = Phaser.Math.Distance.Between(this.frontendPlayers[socket.id].x, this.frontendPlayers[socket.id].y, reticle.x, reticle.y);
        if (distBetween > radius) {
            const scale = distBetween / radius;
            reticle.x = this.frontendPlayers[socket.id].x + (reticle.x - this.frontendPlayers[socket.id].x) / scale;
            reticle.y = this.frontendPlayers[socket.id].y + (reticle.y - this.frontendPlayers[socket.id].y) / scale;
        }
    }

    gameWon(username) {
    this.gameStop = true;

    socket.removeAllListeners();
    this.cameras.main.centerOn(this.cameras.main.width / 2, this.cameras.main.height / 2);
    this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        `${username} has won the game!`,
        { fontFamily: 'Arial', fontSize: 48, color: '#ffffff' }
    ).setOrigin(0.5);

    if (this.playerAmmo) this.playerAmmo.setVisible(false);
    if (this.playerHealth[socket.id]?.container) this.playerHealth[socket.id].container.setVisible(false);

    for (const id in this.frontendPlayers) this.removePlayer(id);
    for (const id in this.frontendProjectiles) this.removeProjectile(id);
    for (const id in this.frontendGrenades) this.removeGrenade(id);
    for (const id in this.frontendSmoke) {
        this.frontendSmoke[id].destroy();
        delete this.frontendSmoke[id];
    }
    for (const id in this.frontendExplosion) {
        this.frontendExplosion[id].destroy();
        delete this.frontendExplosion[id];
    }

    for (const id in this.darkOverlay) {
        this.darkOverlay[id].destroy();
    }
    this.darkOverlay = {};

    socket.emit('gameWon', this.multiplayerId, username);

    this.time.delayedCall(5000, () => {
        for (const id in this.frontendPlayers) {
            this.removePlayer(id);
        }
        this.scene.stop('Deathmatch');
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
            }, 400);
        }
    }

    isLineBlockedBySmoke(x1, y1, x2, y2) {
        for (const smokeId in this.frontendSmoke) {
            const smoke = this.frontendSmoke[smokeId];
            if (!smoke) continue;
            const smokeBounds = smoke.getBounds();

            // Check intersection with each side of the smoke bounds
            if (Phaser.Geom.Intersects.LineToRectangle(new Phaser.Geom.Line(x1, y1, x2, y2), smokeBounds)) {
                return true;
            }
        }
        return false;
    }

    isPlayerInSmoke(player) {
        for (const smokeId in this.frontendSmoke) {
            const smoke = this.frontendSmoke[smokeId];
            if (!smoke) continue;
            const smokeBounds = smoke.getBounds();
            if (smokeBounds.contains(player.x, player.y)) {
                return true;
            }
        }
        return false;
    }

    isInSmoke() {
        const players = Object.keys(this.frontendPlayers);

        const visibilityState = {};
        players.forEach(playerId => {
            visibilityState[playerId] = {};
            players.forEach(otherPlayerId => {
                visibilityState[playerId][otherPlayerId] = true;
            });
        });

        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const player1 = this.frontendPlayers[players[i]];
                const player2 = this.frontendPlayers[players[j]];

                if (!player1 || !player2) continue;

                const player1InSmoke = this.isPlayerInSmoke(player1);
                const player2InSmoke = this.isPlayerInSmoke(player2);

                if (player1InSmoke || player2InSmoke || this.isLineBlockedBySmoke(player1.x, player1.y, player2.x, player2.y)) {
                    visibilityState[players[i]][players[j]] = false;
                    visibilityState[players[j]][players[i]] = false;
                } else {
                    visibilityState[players[i]][players[j]] = true;
                    visibilityState[players[j]][players[i]] = true;
                }
            }
        }

        const currentPlayerId = socket.id;

        if (!this.frontendPlayers || !visibilityState) {
            return;
        }

        players.forEach(playerId => {
            const currentPlayer = this.frontendPlayers[playerId];
            if (!currentPlayer || !playerId) return;

            const playerVisibilityState = visibilityState[currentPlayerId];
            if (!playerVisibilityState) {
                return;
            }
            const isVisible = playerVisibilityState[playerId];
            currentPlayer.setVisible(isVisible);

            if (this.playerHealth[playerId]) {
                this.playerHealth[playerId].container.setVisible(isVisible);
            }

            if (this.playerUsername[playerId]) {
                this.playerUsername[playerId].setVisible(isVisible);
            }

            if (this.frontendWeapons[playerId]) {
                this.frontendWeapons[playerId].setVisible(isVisible);
            }

            if (this.isPlayerInSmoke(currentPlayer) && playerId === socket.id) {
                if (!this.darkOverlay[playerId]) {
                    this.darkOverlay[playerId] = this.add.rectangle(0, 0, 3000, 3000, 0x808080);
                    this.darkOverlay[playerId].setOrigin(0);
                    this.darkOverlay[playerId].setAlpha(1);
                }
            } else {
                if (this.darkOverlay[playerId]) {
                    this.darkOverlay[playerId].destroy();
                    delete this.darkOverlay[playerId];
                }
            }
        });
    }

    isInGrenade() {
        for (const id in this.frontendPlayers) {
            const player = this.frontendPlayers[id]
            if (!player) continue
            for (const grenadeId in this.frontendExplosion) {
                const explosion = this.frontendExplosion[grenadeId]
                if (!explosion) continue
                const smallerBounds = new Phaser.Geom.Rectangle(
                    explosion.x - 90,
                    explosion.y,
                    100 * 2,
                    100 * 2
                )
                if (Phaser.Geom.Intersects.RectangleToRectangle(player.getBounds(), smallerBounds)
                    && (!this.playersAffected[grenadeId] || !this.playersAffected[grenadeId][id])) {
                    socket.emit('explode', { playerId: id, grenadeId });
                    if (!this.playersAffected[grenadeId]) {
                        this.playersAffected[grenadeId] = {};
                    }
                    this.playersAffected[grenadeId][id] = true;
                    break;
                }
            }
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

    drawReloadCircle(progress) {
        const centerX = this.crosshair.x;
        const centerY = this.crosshair.y;
        const radius = 30;

        this.reloadIndicator.clear();
        this.reloadIndicator.lineStyle(4, 0xffffff, 1);
        this.reloadIndicator.beginPath();
        this.reloadIndicator.arc(centerX, centerY, radius, Phaser.Math.DegToRad(270), Phaser.Math.DegToRad(270 + 360 * progress), false);
        this.reloadIndicator.strokePath();
    }

    updateLeaderboard() {
        const entries = Object.entries(this.killCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const leaderboard = entries.map(([name, kills], index) =>
            `${index + 1}. ${name}: ${kills} kill${kills === 1 ? '' : 's'}`).join('\n');

        this.leaderboardText.setText(`LEADERBOARD\n${leaderboard}`);
    }


}

export default Deathmatch;
