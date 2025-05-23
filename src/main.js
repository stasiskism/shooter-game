/* global Phaser */

import Scene1 from './scene1.js'
import MainMenu from './MainMenu.js'
import Singleplayer from './Singleplayer.js'
import Multiplayer from './Multiplayer.js'
import Restart from './Restart.js'
import Register from './register.js'
import Login from './login.js'
import Authenticate from './authenticate.js'
import Respawn from './respawn.js'
import Tutorial from './tutorial.js'
import Lobby from './lobby.js'
import Room from './room.js'
import Spectator from './spectator.js'
import Marketplace from './marketplace.js'
import Deathmatch from './Deathmatch.js'
import CaptureThePoint from './CaptureThePoint.js'


const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    dom: {
        createContainer: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    pixelArt: true,
    roundPixels: true,
    backgroundColor: 0x5F6e7a,
    parent: 'phaser-example',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
    
}

const game = new Phaser.Game(config)



game.scene.add('scene1', Scene1)
game.scene.add('mainMenu', MainMenu)
game.scene.add('Singleplayer', Singleplayer)
game.scene.add('Multiplayer', Multiplayer)
game.scene.add('Restart', Restart)
game.scene.add('register', Register)
game.scene.add('login', Login)
game.scene.add('authenticate', Authenticate)
game.scene.add('respawn', Respawn)
game.scene.add('tutorial', Tutorial)
game.scene.add('lobby', Lobby)
game.scene.add('room', Room)
game.scene.add('spectator', Spectator)
game.scene.add('marketplace', Marketplace)
game.scene.add('Deathmatch', Deathmatch)
game.scene.add('CaptureThePoint', CaptureThePoint)
game.scene.start('scene1')

