/* global Phaser */

import SettingsButtonWithPanel from './options.js'

class Respawn extends Phaser.Scene {
    constructor() {
        super({ key: 'respawn'});
    }

    init (data) {
        this.cameras.main.setBackgroundColor('#ffffff')
        this.multiplayerId = data.multiplayerId
        this.mapSize = data.mapSize
    }

    preload () {
    }

    create () {
      this.input.mouse.releasePointerLock();
      const centerX = this.cameras.main.width / 2;
      const centerY = this.cameras.main.height / 2;
      this.add.sprite(centerX, centerY, 'dead');
      this.spectateButton = this.add.sprite(1920 / 2 , (1080 / 2) + 200, 'spectateButton')
      this.spectateButton.setInteractive({ useHandCursor: true })
      this.spectateButton.on('pointerdown', () => this.clickspectateButton())
        this.spectateButton.on('pointerover', () => this.spectateButton.setTint(0xf1c40f)) // Change color on mouse over
        this.spectateButton.on('pointerout', () => this.spectateButton.clearTint()) // Reset color when mouse leaves
      this.quitButton = this.add.sprite(1920 / 2, (1080 / 2) + 400, 'exit')
      this.quitButton.setInteractive({useHandCursor: true})
      this.quitButton.on('pointerdown', () => this.clickQuitButton())
        this.quitButton.on('pointerover', () => this.quitButton.setTint(0xf1c40f)); // Change color on mouse over
        this.quitButton.on('pointerout', () => this.quitButton.clearTint()); // Reset color when mouse leaves
    }

    update () {

    }
    clickspectateButton() {
        this.scene.stop('Multiplayer')
        this.scene.start('spectator', {multiplayerId: this.multiplayerId, mapSize: this.mapSize})
        this.scene.stop()
    }

    clickQuitButton() {
        socket.emit('leaveRoom', this.multiplayerId)
        this.scene.start('mainMenu')
        this.scene.stop('multiplayer')
        this.scene.stop()
        socket.removeAllListeners()
    }
}

export default Respawn