/* global Phaser */

import SettingsButtonWithPanel from './options.js'

class Restart extends Phaser.Scene {
    constructor() {
        super({ key: 'Restart'});
    }

    init (data) {
        this.cameras.main.setBackgroundColor('#ffffff')
        this.score = data.score
        this.login = data.login
    }

    preload () {
    }

    create () {
        this.input.mouse.releasePointerLock();
        socket.emit('singleplayer', socket.id, this.score)
      const centerX = this.cameras.main.width / 2;
      const centerY = this.cameras.main.height / 2;
      this.restart = this.add.sprite(centerX, centerY, 'dead');
      this.restartButton = this.add.sprite(1920 / 2 , (1080 / 2) + 200, 'restartButton')
        this.scoreText = this.add.text(centerX, centerY - 400, 'SCORE: ' + this.score, {
            fontFamily: 'Berlin Sans FB Demi',
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(0.5).setScale(2);
      this.restartButton.setInteractive({ useHandCursor: true })
      this.restartButton.on('pointerdown', () => this.clickRestartButton())
        this.restartButton.on('pointerover', () => this.restartButton.setTint(0xf1c40f)); // Change color on mouse over
        this.restartButton.on('pointerout', () => this.restartButton.clearTint()); // Reset color when mouse leaves
      this.quitButton = this.add.sprite(1920 / 2, (1080 / 2) + 400, 'exit')
      this.quitButton.setInteractive({useHandCursor: true})
      this.quitButton.on('pointerdown', () => this.clickQuitButton())
        this.quitButton.on('pointerover', () => this.quitButton.setTint(0xf1c40f)); // Change color on mouse over
        this.quitButton.on('pointerout', () => this.quitButton.clearTint()); // Reset color when mouse leaves
    }

    update () {

    }
    clickRestartButton() {
        this.scene.restart('Singleplayer')
        this.scene.start('Singleplayer')
        this.scene.stop()
    }

    clickQuitButton() {
        if (this.login) {
            this.scene.start('mainMenu')
            this.scene.stop()
        } else {
            this.scene.start('authenticate')
            this.scene.stop()
        }
    }
}

export default Restart