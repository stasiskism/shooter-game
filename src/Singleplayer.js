/* global Phaser */

import SettingsButtonWithPanel from './options.js'

class Singleplayer extends Phaser.Scene {

  constructor() {
      super({ key: 'Singleplayer'});
      this.score = 0
      this.scoreText
      this.weapon
  }
  isPanelVisible = false

  init (data) {
    this.cameras.main.setBackgroundColor('#000000');
    this.login = data.login
  }

  preload () {
      this.graphics = this.add.graphics()
    }

  create () {

    this.setupScene();
    this.setupInputEvents();
    this.setupPlayer();
    this.gunAnimation();
    this.time.delayedCall(500, this.spawnEnemies, [], this);
    this.score = 0;
    this.intervalID
    this.enemies = []
    this.bullets = []
    this.settingsButton = new SettingsButtonWithPanel(this, 1890, 30);
    this.events.on('settingsPanelOpened', this.onSettingsPanelOpened, this);
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

  gunAnimation(){
    if (this.anims.exists('singleShot')) return
    this.anims.create({
        key: 'singleShot',
        frames: this.anims.generateFrameNumbers('shootAR', { start: 0, end: 15}),
        frameRate: 60,
        repeat: 0
    });
  }

  setupScene() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const map1 = this.make.tilemap({ key: "map2", tileWidth: 32, tileHeight: 32 });
    const tileset1 = map1.addTilesetImage("Mapass", "tiles_multiplayer");
    const layer1 = map1.createLayer("Tile Layer 1", tileset1, -1700, -1700);

    //this.vaizdasImage = this.add.sprite(centerX, centerY, 'mapas');
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' }).setPosition(100, 100).setScrollFactor(0);

    this.crosshair = this.physics.add.sprite(centerX, centerY, 'crosshair');

    this.graphics.lineStyle(10, 0xff0000);
    this.graphics.strokeRect(0, 0, this.cameras.main.width, this.cameras.main.height).setDepth(999);

  }

  setupInputEvents() {
    
  this.input.on('pointerdown', () => {
    if (!this.isPanelVisible) {
      this.input.mouse.requestPointerLock();
    }
  });

  this.input.on('pointermove', pointer => {
      if (this.input.mouse.locked) {
          this.crosshair.x += pointer.movementX;
          this.crosshair.y += pointer.movementY;
      }
  });

  this.input.on('pointerdown', pointer => {
      if (pointer.leftButtonDown() && this.input.mouse.locked) {
        this.sound.play('ARSound', { volume: 0.5})
        this.fireBullet(pointer)
      }
  });

  this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

  }

  setupPlayer() {
    this.player = this.physics.add.sprite(1920 / 2, 1080 /2, 'idleDown')
    this.player.setScale(4);
    this.player.setCollideWorldBounds(true);
    this.weapon = this.physics.add.sprite(this.player.x + 70, this.player.y, 'AR');
    this.weapon.setScale(2);
  }

  update () {
    this.updatePlayerMovement();
    this.updateCameraPosition();
    this.updateCrosshairPosition();
    this.updateBullet()
    this.detectCollision()

    this.enemies.forEach(enemy => {
      const angleToPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const velocityX = Math.cos(angleToPlayer) * 350;
      const velocityY = Math.sin(angleToPlayer) * 350;
      enemy.setVelocity(velocityX, velocityY);
  });
  }

  updatePlayerMovement() {
    const player = this.player;
    const weapon = this.weapon;
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

    if (player && weapon) {
        const angleToPointer = Phaser.Math.Angle.Between(player.x, player.y, this.crosshair.x, this.crosshair.y);
        weapon.setRotation(angleToPointer);
        const orbitDistance = 85;
        const weaponX = player.x + Math.cos(angleToPointer) * orbitDistance;
        const weaponY = player.y + Math.sin(angleToPointer) * orbitDistance;
        weapon.setPosition(weaponX, weaponY);
    }
}

updateCameraPosition() {
  const avgX = (this.player.x + this.crosshair.x) / 2 - 1920 / 2;
  const avgY = (this.player.y + this.crosshair.y) / 2 - 1080 / 2;
  this.cameras.main.scrollX = avgX;
  this.cameras.main.scrollY = avgY;
}

updateCrosshairPosition() {
  this.crosshair.body.velocity.x = this.player.body.velocity.x;
  this.crosshair.body.velocity.y = this.player.body.velocity.y;
  this.constrainReticle(this.crosshair, 550);
}

constrainReticle(reticle, radius) {
  const distX = reticle.x - this.player.x;
  const distY = reticle.y - this.player.y;

  if (distX > 1920) reticle.x = this.player.x + 1920;
  else if (distX < -1920) reticle.x = this.player.x - 1920;

  if (distY > 1080) reticle.y = this.player.y + 1080;
  else if (distY < -1080) reticle.y = this.player.y - 1080;

  const distBetween = Phaser.Math.Distance.Between(this.player.x, this.player.y, reticle.x, reticle.y);
  if (distBetween > radius) {
      const scale = distBetween / radius;
      reticle.x = this.player.x + (reticle.x - this.player.x) / scale;
      reticle.y = this.player.y + (reticle.y - this.player.y) / scale;
  }
}

updateBullet() {
  //bullets should be deleted that go out of the screen
  for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
    const bullet = this.bullets[bulletIndex]

    if (bullet.x < 0 ||
        bullet.x > this.cameras.main.width ||
        bullet.y  < 0 ||
        bullet.y  > this.cameras.main.height) 
        {
        this.bullets.splice(bulletIndex, 1)
        bullet.destroy()
        }

}
}

detectCollision() {
    // Player and enemy collision
    for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
        const enemy = this.enemies[enemyIndex];
        const distance = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
        // Player dies, end game. Change distance for more accurate collision.
        if (distance < 50) {
          this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.W);
          this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.A);
          this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.S);
          this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.D);
            clearInterval(this.intervalID);
            this.scene.start('Restart', { score: this.score, login: this.login });
            this.scene.stop();

        }

        // Player bullet and enemy collision
        for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = this.bullets[bulletIndex];
            const distance = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);

            if (distance < 50) {
                this.score += 1;
                this.scoreText.setText('Score: ' + this.score);
                this.enemies.splice(enemyIndex, 1);
                enemy.destroy();
                this.bullets.splice(bulletIndex, 1);
                bullet.destroy();
            }
        }
    }
}



fireBullet(pointer) {
  const direction = Math.atan((this.crosshair.x - this.player.x) / (this.crosshair.y - this.player.y));
        if (!pointer.leftButtonDown()) return;
        this.weapon.anims.play('singleShot', true);
        // Create a projectile
        const bullet = this.physics.add.sprite(this.player.x, this.player.y, 'bullet').setScale(2);
        bullet.setRotation(this.weapon.rotation);

        let x, y
        //Calculate X and y velocity of bullet to move it from shooter to target
        if (this.crosshair.y >= this.player.y)
        {
            x = 30 * Math.sin(direction);
            y = 30 * Math.cos(direction);
        }
        else
        {
            x = -30 * Math.sin(direction);
            y = -30 * Math.cos(direction);
        }

        // Calculate velocity based on direction
        bullet.velocity = { x, y };

        // Add the projectile to the list
        this.bullets.push(bullet);
}

updateBullet() {
  this.bullets.forEach((bullet, index) => {
      bullet.x += bullet.velocity.x;
      bullet.y += bullet.velocity.y;
      if (bullet.x < 0 || bullet.x > this.cameras.main.width || bullet.y < 0 || bullet.y > this.cameras.main.height) {
          bullet.destroy();
          this.bullets.splice(index, 1);
      }
  });
}

  spawnEnemies() {
    this.intervalID = setInterval(() => {
    const numEnemies = Phaser.Math.Between(1, 4);
    for(let i = 0; i < numEnemies; i++) {
      const spawnPoints = [
        { x: 0, y: Phaser.Math.Between(0, 1080) },  // Left border
        { x: 1920, y: Phaser.Math.Between(0, 1080) }, // Right border
        { x: Phaser.Math.Between(0, 1920), y: 0 },   // Top border
        { x: Phaser.Math.Between(0, 1920), y: 1080 } // Bottom border
      ];
      const spawnPoint = Phaser.Utils.Array.GetRandom(spawnPoints);
      const enemy = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, 'enemiess');
      enemy.anims.play('enemiess', true);
      enemy.setScale(2)
      enemy.setCollideWorldBounds(false)
      const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x)
      enemy.setVelocity(300 * Math.cos(angle), 300 * Math.sin(angle))
      this.enemies.push(enemy)
    }
    }, 1000)
  }

}

export default Singleplayer
