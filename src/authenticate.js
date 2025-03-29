class Authenticate extends Phaser.Scene {
    constructor() {
        super({ key: 'authenticate'});
    }
    init() {
        this.cameras.main.setBackgroundColor('#ffffff')
    }
    preload() {
    }
    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        this.vaizdasImage = this.add.sprite(centerX, centerY, 'background');
        this.loginButton = this.add.sprite(1920 / 2, (1080 / 2) - 200, 'login');
        this.registerButton = this.add.sprite(1920 / 2, (1080 / 2) + 170, 'register')
        this.loginButton.setInteractive({ useHandCursor: true })
        this.loginButton.on('pointerdown', () => this.login())
        this.loginButton.on('pointerover', () => this.loginButton.setTint(0xf1c40f))
        this.loginButton.on('pointerout', () => this.loginButton.clearTint())
        this.registerButton.setInteractive({ useHandCursor: true })
        this.registerButton.on('pointerdown', () => this.register())
        this.registerButton.on('pointerover', () => this.registerButton.setTint(0xf1c40f))
        this.registerButton.on('pointerout', () => this.registerButton.clearTint())
        this.startButton = this.add.sprite(1920 / 2, (1080 / 2) + 400, 'demo').setScale(0.5)
        this.startButton.setInteractive({ useHandCursor: true })
        this.startButton.on('pointerdown', () => this.start())
        this.startButton.on('pointerover', () => this.startButton.setTint(0xf1c40f))
        this.startButton.on('pointerout', () => this.startButton.clearTint())
        this.isLogged = false

    }
    update() {

    }

    login() {
        this.scene.start('login')
        this.scene.stop()
    }

    register() {
        this.scene.start('register')
        this.scene.stop()
    }

    start() {
        this.scene.start('Singleplayer', {login: this.isLogged})
        this.scene.stop()
    }
}
export default Authenticate
