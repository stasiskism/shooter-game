import SettingsButtonWithPanel from './options.js'

class MainMenu extends Phaser.Scene {
  constructor() {
    super({ key: 'mainMenu' });
    this.player = null;
    this.eKey = null;
    this.objects = null;
    this.popupText = null;
    this.singleplayerObject = null;
    this.multiplayerObject = null;
    this.login = true;
    this.coinsText = null;
    this.plusButton = null;
    this.progressBar = null;
    this.progressBarBackground = null;
    this.currentLevelText = null;
    this.nextLevelText = null;
    this.percentageText = null;
    this.usernameText = null;
    this.selectedBadge = null;
    this.badgeEmojiMap = {
      no_reload: '🎯',
      close_call: '❤️‍🩹',
      unlock_all_weapons: '🔫',
      unlock_all_skins: '🧢',
      speed_demon: '⚡',
      no_damage: '🧹'
    };


  }

  init(data) {
    this.username = data.username;
  }

  preload() {
  }

  create() {
    this.setupScene();
    this.setupInputEvents();
    this.settingsButton = new SettingsButtonWithPanel(this, 1890, 90);
    this.events.on('settingsPanelOpened', this.onSettingsPanelOpened, this);
    const badge = this.badgeEmojiMap[this.selectedBadge] || '';
    const displayName = badge ? `${badge} ${this.username}` : this.username;

    this.usernameText = this.add.text(this.player.x, this.player.y - 50, displayName, {
      fontFamily: 'Arial',
      fontSize: 18,
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5);

    fetch(`/get-badge?username=${this.username}`)
      .then(res => res.json())
      .then(data => {
        this.selectedBadge = data.badge;
        this.showPlayerUsernameTag();
      })
      .catch(err => {
        console.error('Error loading badge:', err);
      });
  }

  onSettingsPanelOpened() {
    this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.W);
    this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.A);
    this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.S);
    this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.D);
  }

  setupInputEvents() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  }

  setupScene() {
    this.centerX = this.cameras.main.width / 2;
    this.centerY = this.cameras.main.height / 2;

    const map = this.make.tilemap({ key: "map", tileWidth: 32, tileHeight: 32 });
    const tileset = map.addTilesetImage("asd", "tiles");
    const layer = map.createLayer("Tile Layer 1", tileset, 0, 0);

    const textStyle = {
      fontFamily: 'Arial',
      fontSize: '30px',
      align: 'center'
  };
    
    this.add.sprite(430, 430, 'wasd').setScale(0.2);
    this.add.text(365, 350, 'Movement', textStyle);

    this.player = this.physics.add.sprite(864, 624, 'idleDown').setScale(3);
    this.player.setCollideWorldBounds(true);

    this.objects = this.physics.add.staticGroup();
    this.singleplayerObject = this.objects.create(530, 613, 'singleplayer');
    this.multiplayerObject = this.objects.create(720, 613, 'multiplayer');
    this.marketplaceObject = this.objects.create(910, 613, 'marketplace');
    this.tutorialObject = this.objects.create(1105, 613, 'tutorial');

    const newWidth = 150;
    const newHeight = 100;

    this.singleplayerObject.setDisplaySize(newWidth, newHeight);
    this.multiplayerObject.setDisplaySize(newWidth, newHeight);
    this.marketplaceObject.setDisplaySize(newWidth, newHeight);
    this.tutorialObject.setDisplaySize(newWidth, newHeight);

    this.singleplayerObject.body.setSize(newWidth, newHeight, true);
    this.multiplayerObject.body.setSize(newWidth, newHeight, true);
    this.marketplaceObject.body.setSize(newWidth, newHeight, true);
    this.tutorialObject.body.setSize(newWidth, newHeight, true);

    this.singleplayerObject.body.setOffset((this.singleplayerObject.width - newWidth) / 2, (this.singleplayerObject.height - newHeight) / 2);
    this.multiplayerObject.body.setOffset((this.multiplayerObject.width - newWidth) / 2, (this.multiplayerObject.height - newHeight) / 2);
    this.marketplaceObject.body.setOffset((this.marketplaceObject.width - newWidth) / 2, (this.marketplaceObject.height - newHeight) / 2);
    this.tutorialObject.body.setOffset((this.tutorialObject.width - newWidth) / 2, (this.tutorialObject.height - newHeight) / 2);


    this.objects.getChildren().forEach(object => {
      object.setScale(0.2);
    });

    this.add.image(615, 430, 'O').setScale(1.5)
    this.add.text(565, 350, 'Options', textStyle)

    this.add.image(760, 430, 'E').setScale(1.5)
    this.add.text(735, 350, 'Use', textStyle)

    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.popupText = this.add.text(100, 100, '', { fontFamily: 'Arial', fontSize: 24, color: '#ffffff' });
    this.popupText.setVisible(false);

    this.physics.add.overlap(this.player, this.objects, this.interactWithObject, null, this);

    const achievementsButton = this.add.text(1650, 130, 'Achievements', {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#333',
      padding: { x: 10, y: 5 }
    })
    .setInteractive()
    .on('pointerdown', () => {
      this.showAchievementsUI();
    });

    const challengesButton = this.add.text(1650, 90, 'Challenges', {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#333',
      padding: { x: 10, y: 5 }
    })
    .setInteractive()
    .on('pointerdown', () => {
      this.showChallengesUI();
    });

    fetch(`/get-badge?username=${this.username}`)
    .then(res => res.json())
    .then(data => {
      this.selectedBadge = data.badge;
      this.showPlayerUsernameTag();
    })
    .catch(err => {
      console.error('Error loading badge:', err);
      this.selectedBadge = null;
      this.showPlayerUsernameTag();
    });

  }

  showLogout() {
    const promptContainer = document.getElementById('prompt-container');
    promptContainer.style.display = 'block';

    const yesButton = document.getElementById('yesButton');
    const noButton = document.getElementById('noButton');

    const handleYesClick = () => {
      socket.emit('logout');
      socket.removeAllListeners();
      this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.W);
      this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.A);
      this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.S);
      this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.D);
      this.scene.start('authenticate');
      this.scene.stop();
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
  }

  update() {
    this.updatePlayerMovement();
    if (this.usernameText && this.player) {
      this.usernameText.setPosition(this.player.x, this.player.y - 50);
    }
  }

  updatePlayerMovement() {
    if (!this.player) return;
    const player = this.player;
    let moving = false;
    let direction = '';

    if (this.w.isDown) {
      moving = true;
      direction += 'Up';
      player.y -= 2;
    } else if (this.s.isDown) {
      moving = true;
      direction += 'Down';
      player.y += 2;
    }

    if (this.a.isDown) {
      moving = true;
      direction += 'Left';
      player.x -= 2;
    } else if (this.d.isDown) {
      moving = true;
      direction += 'Right';
      player.x += 2;
    }

    if (moving) {
      const animationName = `Walk${direction}`;
      player.anims.play(animationName, true);
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
  }
}

  interactWithObject(player, object) {
    const distance = Phaser.Math.Distance.Between(player.x, player.y, object.x, object.y);

    if (distance < 50) {
      let message = '';
      if (object === this.singleplayerObject) {
        message = 'Press E to start singleplayer';
      } else if (object === this.multiplayerObject) {
        message = 'Press E to start multiplayer';
      } else if (object === this.tutorialObject) {
        message = 'Press E to start tutorial';
      } else if (object == this.marketplaceObject) {
        message = 'Press E to go to marketplace'
      }

      this.popupText.setPosition(object.x - 100, object.y - 80);
      this.popupText.setText(message);
      this.popupText.setVisible(true);
    } else {
      this.popupText.setVisible(false);
    }

    if (this.eKey.isDown && distance < 50) {
      if (object === this.singleplayerObject) {
        this.scene.start('Singleplayer', { login: this.login });
        this.scene.stop();
      } else if (object === this.multiplayerObject) {
        this.scene.start('lobby', {username: this.username});
        this.scene.stop();
      } else if (object === this.tutorialObject) {
        this.scene.start('tutorial', {username: this.username});
        this.scene.stop();
      } else if (object === this.marketplaceObject) {
        this.scene.start('marketplace', {username: this.username})
        this.scene.stop()
      }
    }
  }

  fetchLeaderboardData() {
    fetch('/leaderboard')
      .then(response => response.json())
      .then(data => {
        this.document.innerHTML = '';
        data.forEach((player, index) => {
          const playerDiv = document.createElement('div');
          playerDiv.textContent = `${index + 1}. ${player.user_name}: ${player.high_score}`;
          playerDiv.style.fontFamily = 'Arial';
          playerDiv.style.fontSize = '24px';
          playerDiv.style.color = '#ffffff';
          playerDiv.style.marginBottom = '8px';
          this.document.appendChild(playerDiv);
        });
      })
      .catch(error => console.error('Error fetching leaderboard data:', error));
  }

  showChallengesUI() {
    fetch(`/get-challenges?username=${this.username}`)
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById('progress-ui');
        const list = document.getElementById('progress-list');
        const title = document.getElementById('progress-title');
        title.textContent = 'Challenges';
        list.innerHTML = '';

        data.forEach(ch => {
          const item = document.createElement('div');
          item.style.marginBottom = '12px';
          const isComplete = ch.completed;
          const isClaimed = ch.is_claimed;

          item.innerHTML = `
            <strong>${ch.title}</strong><br/>
            ${ch.description}<br/>
            Progress: ${ch.progress}/${ch.target}<br/>
            ${isComplete && !isClaimed ? '<span style="color: lightgreen">Reward Ready!</span>' : ''}
            ${isClaimed ? '<span style="color: gray">Reward Claimed</span>' : ''}
          `;

          if (isComplete && !isClaimed) {
            const claimButton = document.createElement('button');
            claimButton.textContent = 'Claim Reward';
            claimButton.onclick = () => {
              socket.emit('claimChallengeReward', { challengeId: ch.challenge_id });
              socket.once('challengeClaimed', ({ challengeId, coins, xp }) => {
                alert(`+${coins} Coins, +${xp} XP`);
                this.showChallengesUI();
              });
            };
            item.appendChild(document.createElement('br'));
            item.appendChild(claimButton);
          }

          list.appendChild(item);
        });

        container.style.display = 'block';
      })
      .catch(err => console.error('Error loading challenges:', err));
  }

  showAchievementsUI() {

    fetch(`/get-badge?username=${this.username}`)
      .then(res => res.json())
      .then(badgeData => {
        const selectedBadgeKey = badgeData.badge;

        fetch(`/get-achievements?username=${this.username}`)
          .then(res => res.json())
          .then(data => {
            const container = document.getElementById('progress-ui');
            const list = document.getElementById('progress-list');
            const title = document.getElementById('progress-title');
            title.textContent = 'Achievements';
            list.innerHTML = '';

            data.forEach(ach => {
              const isComplete = ach.completed;
              const isClaimed = ach.is_claimed;
              const hasBadge = !!this.badgeEmojiMap[ach.trigger_key]; // makes boolean
              const badgeEmoji = this.badgeEmojiMap[ach.trigger_key] || '';

              const item = document.createElement('div');
              item.style.marginBottom = '12px';
              item.innerHTML = `
                <strong>${ach.title}</strong>
                ${hasBadge ? `<span style="font-size: 20px;"> ${badgeEmoji}</span>` : ''}<br/>
                ${ach.description}<br/>
                Progress: ${ach.progress}/${ach.target}<br/>
                ${isComplete && !isClaimed ? '<span style="color: lightgreen">Reward Ready!</span>' : ''}
                ${isClaimed ? '<span style="color: gray">Reward Claimed</span>' : ''}
              `;

              if (isComplete && !isClaimed) {
                const claimButton = document.createElement('button');
                claimButton.textContent = 'Claim Reward';
                claimButton.onclick = () => {
                  socket.emit('claimAchievementReward', { achievementId: ach.achievement_id });
                  socket.once('achievementClaimed', ({ achievementId, coins, xp }) => {
                    alert(`+${coins} Coins, +${xp} XP`);
                    this.showAchievementsUI();
                  });
                };
                item.appendChild(document.createElement('br'));
                item.appendChild(claimButton);
              }

              if (isClaimed && hasBadge) {
                const isSelected = ach.trigger_key === selectedBadgeKey;
                const badgeBtn = document.createElement('button');
                badgeBtn.textContent = isSelected ? 'Selected Badge ✔️' : 'Set as Badge';
                badgeBtn.disabled = isSelected;
                badgeBtn.onclick = () => {
                  fetch('/set-badge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: this.username, badgeKey: ach.trigger_key })
                  })
                    .then(() => {
                      this.selectedBadge = ach.trigger_key;
                      this.showPlayerUsernameTag();
                      alert('Badge updated!');
                      this.showAchievementsUI();
                    })
                    .catch(err => console.error('Failed to set badge:', err));
                };
                item.appendChild(document.createElement('br'));
                item.appendChild(badgeBtn);
              }

              list.appendChild(item);
            });

            const removeBadgeBtn = document.createElement('button');
            removeBadgeBtn.textContent = 'Remove Badge';
            removeBadgeBtn.onclick = () => {
              fetch('/set-badge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.username, badgeKey: null })
              })
                .then(() => {
                  this.selectedBadge = null;
                  this.showPlayerUsernameTag();
                  alert('Badge removed.');
                  this.showAchievementsUI();
                })
                .catch(err => console.error('Failed to remove badge:', err));
            };
            list.appendChild(document.createElement('br'));
            list.appendChild(removeBadgeBtn);

            container.style.display = 'block';
          })
          .catch(err => {
            console.error('Error loading achievements:', err);
          });
      })
      .catch(err => {
        console.error('Error loading selected badge:', err);
      });
  }

  showPlayerUsernameTag() {
    if (!this.player) return;

    const badge = this.badgeEmojiMap[this.selectedBadge] || '';
    const displayName = badge ? `${badge} ${this.username}` : this.username;

    if (!this.usernameText) {
      this.usernameText = this.add.text(this.player.x, this.player.y - 50, displayName, {
        fontFamily: 'Arial',
        fontSize: 18,
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 3
      }).setOrigin(0.5);
    } else {
      this.usernameText.setText(displayName);
    }
  }



}

export default MainMenu;
