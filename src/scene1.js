/* global Phaser */

class Scene1 extends Phaser.Scene {
    constructor() {
        super({ key: 'scene1'});
    }

    init () {
        this.cameras.main.setBackgroundColor('#ffffff')
    }

    preload () {
        this.load.image('vaizdas', 'assets/INTRO.png')
        this.load.image('background', 'assets/ginklas.png')
        this.load.image('login', 'assets/Login_Button.png')
        this.load.image('demo', 'assets/Demo_Button.png')
        this.load.image('register', 'assets/Register_Button.png')
        this.load.image('RoomsList', 'assets/ROOMS_LIST_Button.png')
        this.load.image('ready', 'assets/Ready_Button.png')
        this.load.spritesheet('WalkUp', 'assets/Soldier/WALK/SMS_Soldier_WALK_NORTH_strip4.png', { frameWidth: 16, frameHeight: 24 });
        this.load.spritesheet('WalkLeft', 'assets/Soldier/WALK/SMS_Soldier_WALK_WEST_strip4.png', { frameWidth: 16, frameHeight: 24 });
        this.load.spritesheet('WalkRight', 'assets/Soldier/WALK/SMS_Soldier_WALK_EAST_strip4.png', { frameWidth: 16, frameHeight: 24 });
        this.load.spritesheet('WalkDown', 'assets/Soldier/WALK/SMS_Soldier_WALK_SOUTH_strip4.png', { frameWidth: 16, frameHeight: 24 });
        this.load.spritesheet('WalkUpLeft', 'assets/Soldier/WALK/SMS_Soldier_WALK_UP_LEFT_strip4.png', { frameWidth: 16, frameHeight: 24 });
        this.load.spritesheet('WalkUpRight', 'assets/Soldier/WALK/SMS_Soldier_WALK_UP_RIGHT_strip4.png', { frameWidth: 16, frameHeight: 24 });
        this.load.spritesheet('WalkDownRight', 'assets/Soldier/WALK/SMS_Soldier_WALK_DOWN_RIGHT_strip4.png', { frameWidth: 16, frameHeight: 24 });
        this.load.spritesheet('WalkDownLeft', 'assets/Soldier/WALK/SMS_Soldier_WALK_DOWN_LEFT_strip4.png', { frameWidth: 16, frameHeight: 24 });
        this.load.spritesheet('idleUp', 'assets/Soldier/IDLE/SMS_Soldier_IDLE_NORTH_strip4.png', { frameWidth: 16, frameHeight: 24 });
        this.load.spritesheet('idleLeft', 'assets/Soldier/IDLE/SMS_Soldier_IDLE_WEST_strip4.png', { frameWidth: 16, frameHeight: 24 });
        this.load.spritesheet('idleRight', 'assets/Soldier/IDLE/SMS_Soldier_IDLE_EAST_strip4.png', { frameWidth: 16, frameHeight: 24 });
        this.load.spritesheet('idleDown', 'assets/Soldier/IDLE/SMS_Soldier_SOUTH_strip4.png', { frameWidth: 16, frameHeight: 24 });
        this.load.image('dead', 'assets/Dead_Screen.png')
        this.load.image('restartButton', 'assets/Restart_Button.png')
        this.load.image('mapas', 'assets/mapas.png')
        this.load.image('bullet', 'assets/bullet.png')
        this.load.image('crosshair', 'assets/crosshair008.png')
        this.load.image('multiplayer', 'assets/multiplayer.png');
        this.load.image('singleplayer', 'assets/singleplayer.png');
        this.load.image("tiles", 'assets/assetas.png')
        this.load.image('smokeGrenade', 'assets/smokeGrenade.png')
        this.load.image('grenade', 'assets/grenade.png')
        this.load.image('AR', 'assets/V1.00/PNG/ar.png')
        this.load.spritesheet('shootAR', 'assets/V1.00/Sprite-sheets/Assault_rifle_V1.00/WEAPON/[SINGLE_SHOT] Assault_rifle_V1.00.png', { frameWidth: 128, frameHeight: 48 });
        this.load.spritesheet('reloadAR', 'assets/V1.00/Sprite-sheets/Assault_rifle_V1.00/WEAPON/[RELOAD] Assault_rifle_V1.00 - Reload.png', { frameWidth: 96, frameHeight: 64 });
        this.load.image('Pistol', 'assets/V1.00/PNG/pistol.png')
        this.load.spritesheet('shootPistol', 'assets/V1.00/Sprite-sheets/Pistol_V1.00/Weapon/fullpistolshooy.png', {frameWidth: 64, frameHeight: 28})
        this.load.spritesheet('reloadPistol', 'assets/V1.00/Sprite-sheets/Pistol_V1.00/Weapon/pistolReload.png', {frameWidth: 80, frameHeight: 48})
        this.load.image('Shotgun', 'assets/V1.00/PNG/shotgun.png')
        this.load.spritesheet('shootShotgun', 'assets/V1.00/Sprite-sheets/Shotgun_V1.00/Weapon/shootShotgun.png', {frameWidth: 157, frameHeight: 29})
        this.load.spritesheet('reloadShotgun', 'assets/V1.00/Sprite-sheets/Shotgun_V1.00/Weapon/shotgunReload.png', {frameWidth: 127, frameHeight: 32})
        this.load.image('Sniper', 'assets/V1.00/PNG/sniper.png')
        this.load.spritesheet('shootSniper', 'assets/V1.00/Sprite-sheets/sniper/WEAPON/sniperShoot.png', {frameWidth: 128, frameHeight: 32})
        this.load.spritesheet('reloadSniper', 'assets/V1.00/Sprite-sheets/sniper/WEAPON/sniperReload.png', {frameWidth: 128, frameHeight: 32})
        this.load.spritesheet('reloadSniperBullets', 'assets/V1.00/Sprite-sheets/sniper/FX/reloadSniper.png', {frameWidth: 96, frameHeight: 64})
        this.load.spritesheet('smoke', 'assets/smoke.png', { frameWidth: 32, frameHeight: 32, endFrame: 33 });
        this.load.spritesheet('explosion', 'assets/explosion.png', { frameWidth: 32, frameHeight: 32})
        this.load.spritesheet('enemiess', 'assets/Bowllingguychibi-Run.png', { frameWidth: 64, frameHeight: 64 });
        this.load.tilemapTiledJSON('map', 'assets/maps.json');
        this.load.image('wasd', 'assets/wasd.png')
        this.load.image('tutorial', 'assets/tutorials.png')
        this.load.image('R', 'assets/R-Key.png')
        this.load.image('G', 'assets/G-Key.png')
        this.load.image('O', 'assets/O-Key.png')
        this.load.image('E', 'assets/E-Key.png')
        this.load.image('left-click', 'assets/left-click.png')
        this.load.image('dead', 'assets/Dead_Screen.png')
        this.load.image('wall', 'assets/wall.png')
        this.load.image('restartButton', 'assets/Restart_Button.png')
        this.load.image('quitButton', 'assets/exit-button-icon.png')
        this.load.image('nextButton', 'assets/arrow-right.png')
        this.load.image('previousButton', 'assets/arrow-left.png')
        this.load.image('dead', 'assets/Dead_Screen.png')
        this.load.image('spectateButton', 'assets/Spectate_Button.png')
        this.load.image('Search', 'assets/Search_Button.png')
        this.load.audio('PistolSound', 'assets/sounds/pistol.mp3')
        this.load.audio('ARSound', 'assets/sounds/ar.mp3')
        this.load.audio('SniperSound', 'assets/sounds/sniper.mp3')
        this.load.audio('ShotgunSound', 'assets/sounds/shotgun.mp3')
        this.load.audio('grenadeSound', 'assets/sounds/grenade.mp3')
        this.load.image('settingsButton', 'assets/settings_button.png');
        this.load.audio('Music', 'assets/sounds/Jeremy Blake - Powerup!  NO COPYRIGHT 8-bit Music.mp3');
        this.load.image('create', 'assets/Room_Button.png');
        this.load.image('exit', 'assets/Exit_Button.png');
        this.load.image('plus', 'assets/Plus_Button.png');
        this.load.image('chat', 'assets/chat.png');
        this.load.image("tiles1", 'assets/marketplace/TX Plant.png');
        this.load.image("tiles2", 'assets/marketplace/TX Props.png');
        this.load.image("tiles3", 'assets/marketplace/TX Struct.png');
        this.load.image("tiles4", 'assets/marketplace/TX Tileset Grass.png');
        this.load.image("tiles5", 'assets/marketplace/TX Tileset Stone Ground.png');
        this.load.image("tiles6", 'assets/marketplace/TX Tileset Wall.png');
        this.load.tilemapTiledJSON('map1', 'assets/marketplace/maps_marketplace.json');
        this.load.image("tiles_multiplayer", 'assets/32x32_DEMO.png');
        this.load.tilemapTiledJSON('map2', 'assets/mapsss.json');
        this.load.image("tiles_multiplayer", 'assets/32x32_DEMO.png');
        this.load.tilemapTiledJSON('map2', 'assets/Multiplayer_Map.json');
    }

    create () {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.vaizdasImage = this.add.sprite(centerX, centerY, 'vaizdas');
        this.setupAnimations()

        this.music = this.sound.add('Music', { loop: true, volume: 0.15 });
        this.music.play();

    }

    setupAnimations() {
        const animations = [
            { key: 'WalkUp', frames: { start: 0, end: 3 }, spriteSheet: 'WalkUp' },
            { key: 'WalkRight', frames: { start: 0, end: 3 }, spriteSheet: 'WalkRight' },
            { key: 'WalkLeft', frames: { start: 0, end: 3 }, spriteSheet: 'WalkLeft' },
            { key: 'WalkDown', frames: { start: 0, end: 3 }, spriteSheet: 'WalkDown' },
            { key: 'WalkUpRight', frames: { start: 0, end: 3 }, spriteSheet: 'WalkUpRight' },
            { key: 'WalkUpLeft', frames: { start: 0, end: 3 }, spriteSheet: 'WalkUpLeft' },
            { key: 'WalkDownRight', frames: { start: 0, end: 3 }, spriteSheet: 'WalkDownRight' },
            { key: 'WalkDownLeft', frames: { start: 0, end: 3 }, spriteSheet: 'WalkDownLeft' },
            { key: 'IdleUp', frames: { start: 0, end: 3 }, spriteSheet: 'idleUp' },
            { key: 'IdleLeft', frames: { start: 0, end: 3 }, spriteSheet: 'idleLeft' },
            { key: 'IdleRight', frames: { start: 0, end: 3 }, spriteSheet: 'idleRight' },
            { key: 'IdleDown', frames: { start: 0, end: 3 }, spriteSheet: 'idleDown' }
        ];
        animations.forEach(anim => this.anims.create({
            key: anim.key,
            frames: this.anims.generateFrameNumbers(anim.spriteSheet, { start: anim.frames.start, end: anim.frames.end }),
            frameRate: 10,
            repeat: -1
        }));

        this.anims.create({
            key: 'enemiess',
            frames: this.anims.generateFrameNumbers('enemiess', { start: 0, end: 7 }),
            frameRate: 30,
            repeat: -1
        });
    }

    update (time) {
        if (time > 1000){
            this.scene.stop()
            this.scene.start('authenticate')
        }
    }
}

export default Scene1
