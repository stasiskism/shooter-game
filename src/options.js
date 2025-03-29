class SettingsButtonWithPanel extends Phaser.GameObjects.Container {
    constructor(scene, x, y, roomId) {
        super(scene, x, y);
        this.scene = scene;
        this.roomId = roomId;

        this.button = scene.add.image(0, 0, 'settingsButton').setInteractive({ useHandCursor: true }).setScale(0.1).setScrollFactor(0);
        this.add(this.button);

        this.button.on('pointerdown', () => {
            this.toggleSettingsPanel();
        });

        this.scene.input.keyboard.on('keydown-O', this.toggleSettingsPanel, this);

        this.createSettingsPanel();

        scene.add.existing(this);
    }

    createSettingsPanel() {

        this.panelBackground = this.scene.add.graphics();
        this.panelBackground.fillStyle(0x000000, 0.8);
        this.panelBackground.fillRoundedRect(-250, 0, 200, 200, 15);
        this.panelBackground.lineStyle(2, 0xffffff, 1);
        this.panelBackground.strokeRoundedRect(-250, 0, 200, 200, 15);
        this.panelBackground.setVisible(false);
        this.panelBackground.setScrollFactor(0);

        const textStyle = {
            fontSize: '16px',
            fill: '#fff',
            fontFamily: 'Arial, sans-serif',
            align: 'center'
        };

        this.nameText = this.scene.add.text(-190, 20, 'OPTIONS', textStyle).setScrollFactor(0);
        this.nameText.setVisible(false);

        this.volumeText = this.scene.add.text(-200, 50, 'Volume:', textStyle).setScrollFactor(0);
        this.volumeText.setVisible(false);

        this.volumeValue = this.scene.add.text(-130, 50, '100%', textStyle).setScrollFactor(0);
        this.volumeValue.setVisible(false);

        this.sliderTrack = this.scene.add.rectangle(-200, 80, 120, 10, 0x888888).setInteractive({ useHandCursor: true }).setScrollFactor(0);
        this.sliderTrack.setOrigin(0, 0.5);
        this.sliderTrack.setVisible(false);

        this.sliderThumb = this.scene.add.rectangle(-200, 80, 10, 20, 0xffffff).setInteractive({ useHandCursor: true }).setScrollFactor(0);
        this.sliderThumb.setOrigin(0.5);
        this.sliderThumb.setVisible(false);

        this.scene.input.setDraggable(this.sliderThumb);

        this.sliderThumb.on('drag', (pointer, dragX, dragY) => {
            dragX = Phaser.Math.Clamp(dragX, this.sliderTrack.x, this.sliderTrack.x + this.sliderTrack.width);
            this.sliderThumb.x = dragX;

            const volume = (dragX - this.sliderTrack.x) / this.sliderTrack.width;
            this.volumeValue.setText(`${Math.floor(volume * 100)}%`);
            this.scene.sound.volume = volume;
        });

        this.soundToggleText = this.scene.add.text(-200, 100, 'Sound Off:', textStyle).setScrollFactor(0);
        this.soundToggleText.setVisible(false);

        this.soundToggleBox = this.scene.add.rectangle(-100, 110, 20, 20, 0xffffff).setInteractive({ useHandCursor: true }).setScrollFactor(0);
        this.soundToggleBox.setStrokeStyle(2, 0x000000);
        this.soundToggleBox.setVisible(false);

        this.soundToggleBox.on('pointerdown', () => {
            const isSoundOn = this.soundToggleBox.fillColor === 0xffff00;
            this.soundToggleBox.setFillStyle(isSoundOn ? 0xffffff : 0xffff00);
            this.scene.sound.mute = !isSoundOn;
        });

        this.fullscreenToggleText = this.scene.add.text(-200, 130, 'Fullscreen:', textStyle).setScrollFactor(0);
        this.fullscreenToggleText.setVisible(false);

        this.fullscreenToggle = this.scene.add.rectangle(-100, 140, 20, 20, 0xffffff).setInteractive({ useHandCursor: true }).setScrollFactor(0);
        this.fullscreenToggle.setStrokeStyle(2, 0x000000);
        this.fullscreenToggle.setVisible(false);

        this.fullscreenToggle.on('pointerdown', () => {
            if (this.scene.scale.isFullscreen) {
                this.scene.scale.stopFullscreen();
                this.fullscreenToggle.setFillStyle(0xffffff)
            } else {
                this.scene.scale.startFullscreen();
                this.fullscreenToggle.setFillStyle(0xffff00)
            }
        });

        this.exitGameText = this.scene.add.text(-190, 160, 'Logout', { ...textStyle, fontSize: '18px', fontStyle: 'bold' }).setInteractive({ useHandCursor: true }).setScrollFactor(0);
        this.exitGameText.setVisible(false);

        this.exitGameText.on('pointerdown', () => {
            const promptContainer = document.getElementById('prompt-container');
            promptContainer.style.display = 'block';

            const yesButton = document.getElementById('yesButton');
            const noButton = document.getElementById('noButton');

            const handleYesClick = () => {
                if (this.roomId) {
                    socket.emit('leaveRoom', this.roomId)
                }
                socket.emit('logout');
                socket.removeAllListeners();
                this.scene.scene.stop('room');
                this.scene.scene.start('authenticate');

                promptContainer.style.display = 'none';
                yesButton.removeEventListener('click', handleYesClick);
                noButton.removeEventListener('click', handleNoClick);
            };

            const handleNoClick = () => {
                promptContainer.style.display = 'none';
                yesButton.removeEventListener('click', handleYesClick);
                noButton.removeEventListener('click', handleNoClick);
            };

            yesButton.addEventListener('click', handleYesClick);
            noButton.addEventListener('click', handleNoClick);
        });

        this.add(this.panelBackground);
        this.add(this.volumeText);
        this.add(this.nameText);
        this.add(this.sliderTrack);
        this.add(this.sliderThumb);
        this.add(this.volumeValue);
        this.add(this.soundToggleText);
        this.add(this.soundToggleBox);
        this.add(this.fullscreenToggleText);
        this.add(this.fullscreenToggle);
        this.add(this.exitGameText);
    }

    toggleSettingsPanel() {
        const isVisible = this.panelBackground.visible;
        this.scene.events.emit('settingsPanelOpened', !isVisible);
        this.panelBackground.setVisible(!isVisible);
        this.volumeText.setVisible(!isVisible);
        this.nameText.setVisible(!isVisible);
        this.sliderTrack.setVisible(!isVisible);
        this.sliderThumb.setVisible(!isVisible);
        this.volumeValue.setVisible(!isVisible);
        this.soundToggleText.setVisible(!isVisible);
        this.soundToggleBox.setVisible(!isVisible);
        this.fullscreenToggleText.setVisible(!isVisible);
        this.fullscreenToggle.setVisible(!isVisible)
        this.exitGameText.setVisible(!isVisible);
    }
}

export default SettingsButtonWithPanel;
