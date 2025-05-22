2DCS – 2D Shooter Game

2DCS is a top-down multiplayer shooter game made using HTML5 technologies. It supports real-time multiplayer and single-player modes, with many gameplay features like leveling up, achievements, and a marketplace.

Features

Lobby System

  Create or join rooms using a code
  
  Public and private rooms
  
  Real-time chat in lobby
  
  Ready system – game starts when all players are ready
  
  Spectator mode after death
  
  Change weapons with different stats

Marketplace

  Earn coins by playing or completing challenges
  
  Buy and sell skins and weapons
  
  Leveling system (XP = level × 100)
  
  Weekly rotating skins
  
  Buy currency using real money through Stripe

Achievements

  In-game challenges and rewards
  
  Unlock and equip badges
  
  Daily and weekly tasks
  
  Notifications when achievements unlock
  
  Deathmatch game mode

Maps

  Capture the Point game mode
  
  Vote for maps
  
  Randomly generated maps
  
  Explosive barrels
  
  Falling rock hazard in "Last Man Standing" mode

Technologies Used

  HTML5 – for wide compatibility and fast rendering
  Phaser.js – for game development
  Node.js and Express.js – for backend server
  Socket.io – for real-time multiplayer features
  PostgreSQL – for storing users, stats, and game data
  Stripe – for handling in-game purchases

How to Run

Install dependencies:
npm install

Start the server:
nodemon server.js

If there's an error about pg:
npm install pg
nodemon server.js

Open in your browser:
http://localhost:3000

Team:
Tadas Jokšas
Tautvydas Lukoševičius
Mantas Stasiškis
