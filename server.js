const express = require('express');
const path = require('path');
const http = require('http');
const {Server} = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {pingInterval: 2000, pingTimeout: 7000});
const bodyParser = require('body-parser')
const { Pool } = require('pg');
const nodemailer = require('nodemailer')
const crypto = require('crypto');
const { count } = require('console');
const stripe = require('stripe')('sk_test_51PJtjWP7nzuSu7T74zo0oHgD8swBsZMkud51DKwRHzgza3bPnRcHppcxfiqIiLhU35brBlqe3gJgjEv3NkU31GWb00dKn9t344');


app.use(express.static('src'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

app.use('/skins', express.static(path.join(__dirname, 'src/assets/V1.00/PNG/skins')));
app.use('/weapons', express.static(path.join(__dirname, 'src/assets/V1.00/PNG/weapons')));


app.use(bodyParser.json())

const sql = new Pool({
    user: 'postgres',
    host: '193.219.42.55',
    database: 'postgres',
    password: 'newteam',
    port: 11350
})

const sender = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
        user: '2dcspbl@gmail.com',
        pass: 'mawx rgdf puqs kkmd'
    }
});

sql.on('connect', () => {
    console.log('Connected to PostgreSQL database')
});

sql.on('error', (err) => {
    console.error('Error connecting to PostgreSQL database:', err);
});

const backendPlayers = {}
const backendProjectiles = {}
let projectileId = 0
let grenadeId = 0
const playerUsername = {}
const activeSessions = {}
const weaponIds = {}
const grenadeIds = {}
const skinIds = {}
const rooms = {}
const readyPlayers = {}
let countdownInterval
const weaponDetails = {}
const grenadeDetails = {}
const reloadingStatus = {}
const backendGrenades = {}
const availableWeapons = {}
const availableGrenades = {}
const token = {}
const kothState = {};
const explosiveBarrels = {};
const mapVotes = {};
const votedPlayers = {};

app.post('/create-payment-intent', async (req, res) => {
    const { amount, username } = req.body;
  
    let cost;
    switch (amount) {
      case 100:
        cost = 100; // 1 EUR
        break;
      case 500:
        cost = 400; // 4 EUR
        break;
      case 1000:
        cost = 700; // 7 EUR
        break;
      default:
        return res.status(400).json({ error: 'Invalid amount of coins' });
    }
  
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: cost,
        currency: 'eur',
      });
  
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error('Error creating Payment Intent:', error);
      res.status(500).json({ error: 'Failed to create Payment Intent' });
    }
  });
  
  app.post('/update-coins', async (req, res) => {
      const { username, amount } = req.body;
  
      try {
          const client = await sql.connect();
          await client.query('UPDATE user_profile SET coins = coins + $1 WHERE user_name = $2', [amount, username]);
  
          console.log(`Updating ${amount} coins for user ${username}`);
          
          const result = await client.query('SELECT coins FROM user_profile WHERE user_name = $1', [username]);
          const data = result.rows[0];
  
          res.json({ success: true, coins: data.coins });
          client.release();
      } catch (error) {
          console.error('Error updating coins:', error);
          res.status(500).json({ success: false, error: 'Failed to update coins' });
      }
  });

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    for (const roomId in rooms) {
        io.to(roomId).emit('updatePlayers', filterPlayersByMultiplayerId(roomId))
    }

    socket.on('sendVerificationEmail', (email) => {
        token[socket.id] = crypto.randomBytes(6).toString('hex')
        const mailOptions = {
            from: '2dcspbl@gmail.com',
            to: email,
            subject: '2DCS Verification',
            text: `Your verification code is: ${token[socket.id]}`

        }
        sender.sendMail(mailOptions, async (error, info) => {
            if (error) {
                    const client = await sql.connect()
                    await client.query('INSERT INTO error_logs (error_message) VALUES ($1)', [error])
                    console.error('Error sending email:', error);
                    client.release()
            } else {
                console.log('email sent', info.response)
            }
        })
    })

    socket.on('register', async (data) => {
        const { username, email, password, code } = data;
        const client = await sql.connect();
        if (username === '', email === '', password === '', code === '') {
            socket.emit('registerResponse', { success: false, error: 'Provided blank input' });
            await client.query('INSERT INTO error_logs (error_message) VALUES ($1, )', ['Blank input while registering.'])
            return;
        }

        if (username.length > 20 || password.length > 20) {
            socket.emit('registerResponse', { success: false, error: 'Username and password must be 20 characters or less.' });
            await client.query('INSERT INTO error_logs (error_message) VALUES ($1)', ['Username and password must be 20 characters or less.'])
            return;
        }

        if (code != token[socket.id]) {
            socket.emit('registerResponse', { success: false, error: 'Verification code is wrong.' });
            await client.query('INSERT INTO error_logs (error_message) VALUES ($1)', ['Verification code is wrong.'])
            return;
        }
        try {
            const encryptedPassword = await client.query('SELECT crypt($1, gen_salt(\'bf\')) AS encrypted_password', [password]);
            const hashedPassword = encryptedPassword.rows[0].encrypted_password;
            const values = [username, hashedPassword, email];
            const result = await client.query('INSERT INTO user_authentication (user_name, user_password, email) VALUES ($1, $2, $3) RETURNING user_id', values);
            const id = result.rows[0].user_id;
            await client.query('INSERT INTO user_profile (user_id, user_name) VALUES ($1, $2)', [id, username]);
            await client.query('INSERT INTO user_weapons (user_id, user_name) VALUES ($1, $2)', [id, username])
            await client.query('INSERT INTO user_grenades (user_id, user_name) VALUES ($1, $2)', [id, username])
            client.release();
            socket.emit('registerResponse', { success: true });
        } catch (error) {
            console.error('Error inserting data into database:', error);
            socket.emit('registerResponse', { success: false, error: error.detail});
        }
    })

    socket.on('login', async (data) => {
        const { username, password } = data;
        const client = await sql.connect();
    
        try {
            const authResult = await client.query(
                `SELECT user_id, first_login FROM user_authentication WHERE user_name = $1 AND user_password = crypt($2, user_password);`,
                [username, password]
            );
    
            if (authResult.rows.length === 0) {
                socket.emit('loginResponse', { success: false, error: 'Wrong username or password.' });
                await client.query('INSERT INTO error_logs (error_message) VALUES ($1)', ['Invalid credentials']);
                return;
            }
    
            if (activeSessions[username]) {
                socket.emit('loginResponse', { success: false, error: 'User already logged in.' });
                await client.query('INSERT INTO error_logs (error_message) VALUES ($1)', ['Duplicate login attempt']);
                return;
            }
    
            const userId = authResult.rows[0].user_id;
            const firstLogin = authResult.rows[0].first_login;
    
            const profileResult = await client.query(
                `SELECT weapon, grenade, selected_skin FROM user_profile WHERE user_name = $1`,
                [username]
            );
    
            if (profileResult.rows.length === 0) {
                socket.emit('loginResponse', { success: false, error: 'Profile not found.' });
                await client.query('INSERT INTO error_logs (error_message) VALUES ($1)', ['Profile lookup failed']);
                return;
            }
    
            const { weapon, grenade, selected_skin } = profileResult.rows[0];
    
            // Store session values
            playerUsername[socket.id] = username;
            activeSessions[username] = socket.id;
            weaponIds[socket.id] = weapon;
            grenadeIds[socket.id] = grenade;
            skinIds[socket.id] = selected_skin;
    
            if (firstLogin) {
                await client.query(
                    'UPDATE user_authentication SET first_login = FALSE WHERE user_name = $1',
                    [username]
                );
                socket.emit('loginResponse', { success: true, firstLogin: true });
            } else {
                socket.emit('loginResponse', { success: true });
            }
    
        } catch (error) {
            console.error('Error during login:', error);
            socket.emit('loginResponse', { success: false, error: 'Internal error occurred' });
            await client.query(
                'INSERT INTO error_logs (error_message, error_details) VALUES ($1, $2)',
                [error.message, JSON.stringify(error)]
            );
        } finally {
            client.release();
        }
    });
    
    

    socket.on('resetPassword', async (data) => {
        const {email, code, newPassword} = data
        if (code !== token[socket.id]) {
            socket.emit('resetResponse', { success: false, error: 'Verification code is wrong.' });
            await client.query('INSERT INTO error_logs (error_message) VALUES ($1)', ['Verification code is wrong.'])
            return;
        }
        try {
            const client = await sql.connect()
            const result = await client.query(`SELECT user_id from user_authentication WHERE email = $1`, [email])
            if (result.rows.length === 0) {
                socket.emit('resetResponse', { success: false, error: 'Email does not exist. Please provide a valid email.' });
                await client.query('INSERT INTO error_logs (error_message) VALUES ($1)', ['Email does not exist.'])
            } else {
                const userId = result.rows[0].user_id
                const pswResult = await client.query('SELECT crypt($1, gen_salt(\'bf\')) AS encrypted_password', [newPassword]);
                const encryptedPassword = pswResult.rows[0].encrypted_password
                await client.query(`UPDATE user_authentication SET user_password = $1 WHERE user_id = $2`, [encryptedPassword, userId])
                socket.emit('resetResponse', { success: true })
            }
        } catch (error) {
            console.error('Error reseting password:', error);
            socket.emit('resetResponse', { success: false, error });
            await client.query('INSERT INTO error_logs (error_message, error_details) VALUES ($1, $2)', [error.detail, error])
        }
    });

    socket.on('createRoom', ({ roomName, maxPlayers, isPrivate, password }) => {
        const roomId = Math.random().toString(36).substring(7);
        rooms[roomId] = {
            name: roomName || `${playerUsername[socket.id]} Room`,
            host: socket.id,
            players: [socket.id],
            gameStarted: false,
            maxPlayers,
            isPrivate,
            password: isPrivate ? password : null,
            gamemode: 'last_man_standing',
            map: 'map1'
        };
        const mapSize = 250 * maxPlayers;
        console.log('Created roomId:', roomId);
        socket.emit('roomCreated', roomId, mapSize);
    });
    

    socket.on('checkRoom', (data) => {
        const roomId = typeof data === 'string' ? data : data.roomId;
        const password = data?.password || null;
        const room = rooms[roomId];
        if (
            room &&
            room.players.length < room.maxPlayers &&
            !room.gameStarted &&
            (!room.isPrivate || (room.isPrivate && room.password === password))
        ) {
            socket.emit('roomJoined', {
                roomId,
                gamemode: room.gamemode || 'last_man_standing',
                hostId: room.host,
                mapSize: 250 * room.maxPlayers,
                map: room.map || 'map1'
            });
        } else {
            socket.emit('roomJoinFailed', 'Room is full, does not exist, or password is incorrect');
        }
    });
    

    socket.on('searchRoom', () => {
        for (const roomId in rooms) {
            if (rooms[roomId].players.length < rooms[roomId].maxPlayers && !rooms[roomId].gameStarted && !rooms[roomId].isPrivate) {
                socket.emit('roomJoined', {
                    roomId,
                    gamemode: rooms[roomId].gamemode || 'last_man_standing',
                    hostId: rooms[roomId].host,
                    mapSize: 250 * rooms[roomId].maxPlayers,
                    map: rooms[roomId].map || 'map1'
                });
            } else {
                socket.emit('roomJoinFailed', 'There are no rooms available')
            }
        }
    })

    socket.on('getRoomList', () => {
        const publicRooms = [];
    
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (!room.gameStarted && room.players.length < room.maxPlayers) {
                publicRooms.push({
                    roomId,
                    name: room.name || 'Unnamed Room',
                    players: room.players.length,
                    maxPlayers: room.maxPlayers,
                    isPrivate: room.isPrivate
                });
            }
        }
    
        socket.emit('roomList', publicRooms);
    });
    
    

    socket.on('joinRoom', async (roomId) => {
        if (rooms[roomId]) {
            projectileId = 0;
            availableWeapons[socket.id] = [];
            availableGrenades[socket.id] = [];
            const username = playerUsername[socket.id];

            try {
                const client = await sql.connect();

                const badgeRes = await client.query(
                    'SELECT selected_badge FROM user_profile WHERE user_name = $1',
                    [username]
                );
                const badgeKey = badgeRes.rows[0]?.selected_badge || null;

                const weaponId = weaponIds[socket.id];
                const grenadeId = grenadeIds[socket.id];

                rooms[roomId].players.push({
                    id: socket.id,
                    roomId,
                    x: 1920 / 2,
                    y: 1080 / 2,
                    username,
                    weaponId,
                    grenadeId,
                    badge: badgeKey
                });

                console.log('room joined', roomId);
                socket.join(roomId);

                socket.emit('roomJoined', {
                    roomId,
                    gamemode: rooms[roomId].gamemode || 'last_man_standing',
                    hostId: rooms[roomId].host,
                    mapSize: 250 * rooms[roomId].maxPlayers,
                    map: rooms[roomId].map
                });

                socket.emit('roomGamemode', rooms[roomId].gamemode || 'last_man_standing');

                rooms[roomId].players = rooms[roomId].players.filter(player => player.id);
                if (!readyPlayers[roomId]) {
                    readyPlayers[roomId] = {};
                }
                readyPlayers[roomId][socket.id] = false;

                const resultGrenades = await client.query(
                    'SELECT grenade_id FROM user_grenades WHERE user_name = $1',
                    [username]
                );
                const resultWeapons = await client.query(
                    'SELECT weapon_id FROM user_weapons WHERE user_name = $1',
                    [username]
                );
                const resultSkins = await client.query(
                    `SELECT uw.skin_id, ws.weapon_id 
                    FROM user_weapon_skins uw 
                    JOIN weapon_skins ws ON uw.skin_id = ws.skin_id 
                    WHERE uw.user_name = $1`,
                    [username]
                );

                for (const row of resultGrenades.rows) {
                    availableGrenades[socket.id].push(row.grenade_id);
                }
                for (const row of resultWeapons.rows) {
                    availableWeapons[socket.id].push(row.weapon_id);
                }

                const availableSkins = resultSkins.rows.reduce((acc, row) => {
                    if (!acc[row.weapon_id]) acc[row.weapon_id] = [];
                    acc[row.weapon_id].push(row.skin_id);
                    return acc;
                }, {});

                client.release();

                io.to(socket.id).emit('availableWeapons', availableWeapons[socket.id], availableGrenades[socket.id], availableSkins);
                io.to(roomId).emit('updateRoomPlayers', rooms[roomId].players);
            } catch (error) {
                console.error('Error in joinRoom:', error);
                try {
                    const client = await sql.connect();
                    await client.query(
                        'INSERT INTO error_logs (error_message, error_details) VALUES ($1, $2)',
                        [error.message, JSON.stringify(error)]
                    );
                    client.release();
                } catch (logErr) {
                    console.error('Failed to log error to DB:', logErr);
                }
            }
        } else {
            socket.emit('roomJoinFailed', 'Room is full or does not exist');
        }
    });


    socket.on('updateGamemode', ({ roomId, gamemode }) => {
        if (rooms[roomId]) {
            rooms[roomId].gamemode = gamemode;
            io.to(roomId).emit('roomGamemode', gamemode);
        }
    });

    socket.on('updateReadyState', ({playerId, isReady, roomId}) => {
        readyPlayers[roomId][playerId] = isReady
        io.to(roomId).emit('updateReadyPlayers', calculateReadyPlayers(readyPlayers[roomId]))
    })

    socket.on('startCountdown', async (roomId) => {
        if (roomId && !rooms[roomId].countdownStarted) {
            let countdownTime = 1
            rooms[roomId].countdownStarted = true;
            
            countdownInterval = setInterval(async () => {
                countdownTime--;
                if (countdownTime === 0) {
                    clearInterval(countdownInterval);
                    io.to(roomId).emit('countdownEnd');
                    rooms[roomId].countdownStarted = false;
    
                    try {
                        const client = await sql.connect();
    
                        // Collect weapon details for all players
                        for (const playerId in readyPlayers[roomId]) {
                            if (readyPlayers[roomId][playerId]) {
                                const weaponId = weaponIds[playerId]
                                const grenadeId = grenadeIds[playerId]
                                const weaponDetailsResult = await client.query('SELECT weapon_id, damage, fire_rate, ammo, reload, radius FROM weapons WHERE weapon_id = $1', [weaponId]);
                                const grenadeDetailResult = await client.query('SELECT damage FROM grenades WHERE grenade_id = $1', [grenadeId])
                                const weapons = weaponDetailsResult.rows[0];
                                const grenades = grenadeDetailResult.rows[0]
                                weaponDetails[playerId] = weapons;
                                grenadeDetails[playerId] = grenades
                                delete readyPlayers[roomId][playerId];
                            }
                        }
                        delete readyPlayers[roomId]
                        startGame(roomId);
                        client.release();
                    } catch (error) {
                        const client = await sql.connect()
                        console.error('Error in getting weapon details:', error);
                        await client.query('INSERT INTO error_logs (error_message, error_details) VALUES ($1, $2)', [error.detail, error])
                        client.release()
                    }
                } else {
                   io.to(roomId).emit('updateCountdown', countdownTime);
                }
            }, 1000);
        }
    });


    socket.on('playerAnimationChange', (AnimData) => {
        const { playerId, animation } = AnimData;
        // Broadcast the animation change to all other clients
        io.emit('playerAnimationUpdate', { playerId, animation });
    });

    socket.on('updateWeaponState', (WSData) => {
        const { playerId, x, y, rotation } = WSData;
        // Broadcast weapon state to all clients except the sender
        io.emit('weaponStateUpdate', { playerId, x, y, rotation });
    });


    socket.on('shoot', (frontendPlayer, crosshair, direction, multiplayerId) => {

        if (backendPlayers[socket.id] && !reloadingStatus[socket.id]) {
            
            if (backendPlayers[socket.id].bullets > 0) {
                backendPlayers[socket.id].bullets--
                projectileId++
                let x, y
                //Calculate X and y velocity of bullet to move it from shooter to target
                if (crosshair.y >= frontendPlayer.y)
                {
                    x = 30 * Math.sin(direction);
                    y = 30 * Math.cos(direction);
                }
                else
                {
                    x = -30 * Math.sin(direction);
                    y = -30 * Math.cos(direction);
                }

                const velocity = {
                    x,
                    y
                }

                backendProjectiles[projectileId] = {
                    x: frontendPlayer.x,
                    y: frontendPlayer.y,
                    velocity,
                    playerId: socket.id,
                    multiplayerId,
                }
            } 

        }
    })

    socket.on('throw', (frontendPlayer, crosshair, multiplayerId) => {
        //GRANATA TURI SUSTOTI KUR CROSSHAIRAS, IR TADA SPROGTI
        if (backendPlayers[socket.id] && backendPlayers[socket.id].grenades > 0) {
            grenadeId++
            backendPlayers[socket.id].grenades--
            const distanceX = crosshair.x - frontendPlayer.x;
            const distanceY = crosshair.y - frontendPlayer.y;
            
            const x = distanceX / 30
            const y = distanceY / 30           

            const velocity = {
                x,
                y
            }

            const target = {
                x: crosshair.x,
                y: crosshair.y
            }

            backendGrenades[grenadeId] = {
                x: frontendPlayer.x,
                y: frontendPlayer.y,
                velocity,
                playerId: socket.id,
                multiplayerId,
                target,
                grenadeId: backendPlayers[socket.id].grenadeId
            }
        } 
    })

    socket.on('reload', (id) => {
        if (!weaponDetails[id]) return
        const reloadTime = weaponDetails[id].reload
        const bullets = weaponDetails[id].ammo
        reload(reloadTime, bullets, id)
    })

    // Listen for player movement from this client
    socket.on('playerMove', (data) => {
        const movementSpeed = 2
        let mapSize = 250
        if (!backendPlayers[socket.id]) return;
        const multiplayerId = backendPlayers[socket.id].multiplayerId;
        const gamemode = rooms[multiplayerId]?.gamemode;
        if (backendPlayers[socket.id]) {
            const playerId = socket.id;
            const player = backendPlayers[playerId];
            if (!player || player._isDead) return;
            let roomId = null;
            let maxPlayers = null
            for (const id in rooms) {
                if (rooms[id].players.find(player => player.id === playerId)) {
                    roomId = id;
                    maxPlayers = rooms[roomId].maxPlayers
                    break;
                }
            } 
            
            if (maxPlayers) {
                mapSize = 250 * maxPlayers
            }
            // Broadcast this player's movement to all other clients
            if (data === 'a') {
                backendPlayers[socket.id].x -= movementSpeed
                if (backendPlayers[socket.id].x < 0) {
                    if (gamemode !== 'last_man_standing') {
                        const killerUsername = 'the void';
                        player._isDead = true;
                        io.to(multiplayerId).emit('removeKilledPlayer', {
                            killerId: null,
                            victimId: socket.id,
                        });
                        respawnPlayer(socket, killerUsername);
                    } else {
                        delete backendPlayers[socket.id];
                    }

                    return;
                }

            } else if (data === 'd') {
                backendPlayers[socket.id].x += movementSpeed
                if (backendPlayers[socket.id].x > 1920 + mapSize) {
                    if (gamemode !== 'last_man_standing') {
                        const killerUsername = 'the void';
                        player._isDead = true;
                        io.to(multiplayerId).emit('removeKilledPlayer', {
                            killerId: null,
                            victimId: socket.id,
                        });
                        respawnPlayer(socket, killerUsername);
                    } else {
                        delete backendPlayers[socket.id];
                    }

                    return;
                }
            }

            if (data === 'w') {
                backendPlayers[socket.id].y -= movementSpeed
                if (backendPlayers[socket.id].y < 0) {
                    if (gamemode !== 'last_man_standing') {
                        const killerUsername = 'the void';
                        player._isDead = true;
                        io.to(multiplayerId).emit('removeKilledPlayer', {
                            killerId: null,
                            victimId: socket.id,
                        });
                        respawnPlayer(socket, killerUsername);
                    } else {
                        delete backendPlayers[socket.id];
                    }

                    return;
                }
            } else if (data === 's') {
                backendPlayers[socket.id].y += movementSpeed
                if (backendPlayers[socket.id].y > 1080 + mapSize) {
                    if (gamemode !== 'last_man_standing') {
                        const killerUsername = 'the void';
                        player._isDead = true;
                        io.to(multiplayerId).emit('removeKilledPlayer', {
                            killerId: null,
                            victimId: socket.id,
                        });
                        respawnPlayer(socket, killerUsername);
                    } else {
                        delete backendPlayers[socket.id];
                    }

                    return;
                }
            }
        }
    });

    socket.on('roomPlayerMove', (info) => {
        const {data, roomId} = info
        if (rooms[roomId]) {
            // If the player is within a room
            const room = rooms[roomId];
            const playerIndex = room.players.findIndex(player => player.id === socket.id);
            if (playerIndex !== -1) {
                const player = room.players[playerIndex];
                // Update player's position within the room
                if (data === 'a') {
                    player.x -= 2;
                    if (player.x < 0) {
                        player.x = 0;
                    }
                } else if (data === 'd') {
                    player.x += 2;
                    if (player.x > 1920) {
                        player.x = 1920;
                    }
                } else if (data === 'w') {
                    player.y -= 2;
                    if (player.y < 0) {
                        player.y = 0;
                    }
                } else if (data === 's') {
                    player.y += 2;
                    if (player.y > 1080) {
                        player.y = 1080;
                    }
                }
                // Update the player's position in the room's players array
                room.players[playerIndex] = player;
            }
        }
    })


    // Handle client disconnection
    socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', socket.id, reason);
        for (const roomId in rooms) {
        const room = rooms[roomId];
        const index = room.players.findIndex(player => player.id === socket.id);
        if (index !== -1) {
            console.log('Player leaving room:', socket.id);
            room.players.splice(index, 1);
            if (socket.id === room.host && room.players.length > 1) {
                room.host = room.players[Math.floor(Math.random() * room.players.length)].id;
            }
            if (room.players.length === 0) {
                console.log('Deleting room:', roomId);
                delete rooms[roomId];
            } else {
                io.to(roomId).emit('updateRoomPlayers', room.players);
            }
            socket.leave(roomId);
            delete readyPlayers[socket.id];
            delete mapVotes[roomId];
            delete votedPlayers[roomId];
            break;
        }
    }
        delete backendPlayers[socket.id]
        delete weaponDetails[socket.id]
        delete grenadeDetails[socket.id]
        delete weaponIds[socket.id]
        delete grenadeIds[socket.id]
        for (const roomId in rooms) {
            io.to(roomId).emit('updatePlayers', filterPlayersByMultiplayerId(roomId))
        }
        //Puts usernames in an array, finds the first username associated with the disconnected socket.id
        const username = Object.keys(activeSessions).find(key => activeSessions[key] === socket.id);
        if (username) {
            delete activeSessions[username];
        }
    });

    socket.on('logout', () => {
        const username = Object.keys(activeSessions).find(key => activeSessions[key] === socket.id);
        if (username) {
            delete activeSessions[username];
        }
        if (backendPlayers[socket.id]) {
            delete backendPlayers[socket.id]
        }
    })

    socket.on('leaveRoom', (roomId) => {
        for (const id in rooms) {
            if (id === roomId) {
                const room = rooms[roomId];
                const index = room.players.findIndex(player => player.id === socket.id);
                if (index !== -1) {
                    console.log('Player leaving room:', socket.id);
                    room.players.splice(index, 1);
                    if (socket.id === room.host && room.players.length > 1) {
                        room.host = room.players[Math.floor(Math.random() * room.players.length)].id;
                    }
                    if (room.players.length === 0) {
                        console.log('Deleting room:', roomId);
                        delete rooms[roomId];
                        delete readyPlayers[roomId]
                    } else {
                        io.to(roomId).emit('updateRoomPlayers', room.players);
                    }
                    socket.leave(roomId);
                    delete readyPlayers[socket.id];
                    break;
                }
            }
        }
        
    })

    socket.on('singleplayer', async (id, score) => {
        const username = playerUsername[id]
        const client = await sql.connect()
        await client.query(`UPDATE user_profile SET high_score = GREATEST(high_score, $1) WHERE user_name = $2`, [score, username])
        client.release()
    })

    socket.on('gameWon', async (multiplayerId, username) => {
        if (!multiplayerId || !username) return
        const fallingObjectsIntervals = rooms[multiplayerId]?.fallingObjectsIntervals;
        if (fallingObjectsIntervals) {
            clearInterval(fallingObjectsIntervals.createInterval);
            clearInterval(fallingObjectsIntervals.updateInterval);
        }
        const playerId = activeSessions[username]
        if (backendPlayers[playerId]) {
            const player = backendPlayers[playerId];

            if (!player.reloaded) await updateProgress(username, 'no_reload', 1);
            if (player.health === 1) await updateProgress(username, 'close_call', 1);
            if (player.health === 100) await updateProgress(username, 'no_damage', 1);
        }

        if (rooms[multiplayerId]?.startTime) {
            const elapsed = (Date.now() - rooms[multiplayerId].startTime) / 1000;
            if (elapsed < 60) await updateProgress(username, 'speed_demon', 1);
        }
        delete filterPlayersByMultiplayerId(multiplayerId)
        delete filterProjectilesByMultiplayerId(multiplayerId)
        const client = await sql.connect()
        await client.query(`UPDATE user_profile SET coins = coins + 10, xp = xp + 20 WHERE user_name = $1`, [username])
        client.release()
        await updateProgress(username, 'win_match', 1);
        await updateProgress(username, 'reach_xp', 5);
        delete readyPlayers[multiplayerId];
        delete rooms[multiplayerId];
    })

    socket.on('detect', (multiplayerId, playerId) => {
        let mapSize = 250
        let maxPlayers = null
        if (rooms[multiplayerId] && Array.isArray(rooms[multiplayerId].players)) {
            if (rooms[multiplayerId].players.find(player => player.id === playerId)) {
                maxPlayers = rooms[multiplayerId].maxPlayers * 250;
            }
        } else {
            return;
        }

        if (maxPlayers) {
            mapSize = maxPlayers
        }

        if (backendPlayers[playerId]) {
        backendPlayers[playerId].y += 2
        if (backendPlayers[playerId].y > 1080 + mapSize) {
            delete backendPlayers[playerId]
        }
    }
    })

    socket.on('sendMessage', ({roomId, message}) => {
        io.to(roomId).emit('receiveMessage', message)
    })


    socket.on('changeWeapon', async (weaponId) => {
        const username = playerUsername[socket.id];
        const client = await sql.connect();
        try {
            if (availableWeapons[socket.id].includes(weaponId)) {
                await client.query('UPDATE user_profile SET weapon = $1 WHERE user_name = $2;', [weaponId, username]);
                weaponIds[socket.id] = weaponId;
    
                const result = await client.query(`
                    SELECT uw.skin_id 
                    FROM user_weapon_skins uw
                    JOIN weapon_skins ws ON uw.skin_id = ws.skin_id
                    WHERE uw.user_name = $1 AND ws.weapon_id = $2
                    LIMIT 1;
                `, [username, weaponId]);
    
                if (result.rows.length > 0) {
                    const newSkinId = result.rows[0].skin_id;
                    skinIds[socket.id] = newSkinId;
                    await client.query('UPDATE user_profile SET selected_skin = $1 WHERE user_name = $2;', [newSkinId, username]);
                } else {
                    skinIds[socket.id] = null;
                    await client.query('UPDATE user_profile SET selected_skin = NULL WHERE user_name = $1;', [username]);
                }
            }
        } catch (error) {
            console.error('Error updating weapon or skinId:', error);
            await client.query('INSERT INTO error_logs (error_message, error_details) VALUES ($1, $2)', [error.message, JSON.stringify(error)]);
        } finally {
            client.release();
        }
    });
    

    socket.on('changeGrenade', async (grenadeId) => {
        try {
            const client = await sql.connect()
            const username = playerUsername[socket.id]
            if (availableGrenades[socket.id].includes(grenadeId)) {
                await client.query('UPDATE user_profile SET grenade = $1 WHERE user_name = $2;', [grenadeId, username]);
                grenadeIds[socket.id] = grenadeId
            }
            client.release()
        } catch (error) {
            console.error('Error updating grenadeId:', error);
            await client.query('INSERT INTO error_logs (error_message, error_details) VALUES ($1, $2)', [error.detail, error])
        }
    })


    socket.on('explode', async (data) => {
        const { playerId, grenadeId } = data;
        const grenade = backendGrenades[grenadeId];
        const multiplayerId = backendPlayers[playerId].multiplayerId;
        const gamemode = rooms[multiplayerId]?.gamemode;  

        if (!grenade) return;

        const damage = grenadeDetails[grenade.playerId]?.damage;
        if (!damage) return;

        if (backendPlayers[playerId]) {
            backendPlayers[playerId].health = Math.max(0, backendPlayers[playerId].health - damage);

            if (backendPlayers[playerId].health <= 0 && !backendPlayers[playerId]._isDead) {
                backendPlayers[playerId]._isDead = true;
                const killerId = grenade.playerId;

                if (killerId !== playerId && backendPlayers[killerId]) {
                    const client = await sql.connect();
                    const username = backendPlayers[killerId].username;
                    if (username) {
                        await client.query(`UPDATE user_profile SET coins = coins + 1, xp = xp + 5 WHERE user_name = $1`, [username]);
                    }
                    client.release();
                }

                if (backendPlayers[killerId]) {
                    backendPlayers[killerId].kills = (backendPlayers[killerId].kills || 0) + 1;

                    if (backendPlayers[killerId]) {
                        backendPlayers[killerId].kills = (backendPlayers[killerId].kills || 0) + 1;

                        if (
                          rooms[multiplayerId]?.gamemode === 'deathmatch' &&
                          !rooms[multiplayerId]?.gameEnded &&
                          backendPlayers[killerId].kills === 2
                        ) {
                            const winnerUsername = backendPlayers[killerId].username;
                            const multiplayerId = backendPlayers[killerId].multiplayerId;
                            rooms[multiplayerId].gameEnded = true;
                            io.to(multiplayerId).emit('gameWon', winnerUsername);
                        }
                    } 

                if (gamemode !== 'last_man_standing') {
                    io.to(multiplayerId).emit('removeKilledPlayer', {
                        killerId,
                        victimId: playerId,
                    });
                    respawnPlayer(io.sockets.sockets.get(playerId), backendPlayers[killerId]?.username);
                } else {
                  delete backendPlayers[playerId];
                }

            }
          }
        }

        delete backendGrenades[grenadeId];
    });


    socket.on('gunAnimation', (data) => {
        const {multiplayerId, playerId, animation, weapon} = data
        io.to(multiplayerId).emit('updateGunAnimation', playerId, animation, weapon)
    })

    socket.on('buyGun', async (data) => {
        try {
            const { socket, weaponId } = data;
            const username = playerUsername[socket];
            const client = await sql.connect();
            const result = await client.query('SELECT user_id FROM user_profile WHERE user_name = $1', [username]);
            const costResult = await client.query(
                'SELECT cost FROM marketplace WHERE item_type = $1 AND item_id = $2',
                ['weapon', weaponId]
              );
            const userId = result.rows[0].user_id;
            const cost = costResult.rows[0].cost;
            console.log('id', userId, weaponId, cost, username);
            await client.query('UPDATE user_profile SET coins = coins - $1 WHERE user_name = $2', [cost, username]);
            await client.query('INSERT INTO user_weapons (user_id, user_name, weapon_id) VALUES ($1, $2, $3)', [userId, username, weaponId]);
            const totalWeapons = await client.query('SELECT COUNT(*) FROM weapons');
            const ownedWeapons = await client.query('SELECT COUNT(*) FROM user_weapons WHERE user_name = $1', [username]);

            if (parseInt(totalWeapons.rows[0].count) === parseInt(ownedWeapons.rows[0].count)) {
                await updateProgress(username, 'unlock_all_weapons', 1);
            }
            io.to(socket).emit('purchaseConfirmed', { weaponId });
            client.release();
        } catch(error) {
            const client = await sql.connect();
            console.error('Error buying weapon:', error);
            await client.query('INSERT INTO error_logs (error_message) VALUES ($1)', [error]);
            client.release();
        }
    });
    
    socket.on('buyGrenade', async (data) => {
        try {
            const { socket, grenadeId } = data;
            const username = playerUsername[socket];
            const client = await sql.connect();
            const result = await client.query('SELECT user_id FROM user_profile WHERE user_name = $1', [username]);
            const costResult = await client.query('SELECT cost FROM marketplace WHERE item_id = $1', [grenadeId])
            const userId = result.rows[0].user_id;
            const cost = costResult.rows[0].cost;
            console.log('id', userId, grenadeId, cost, username);
            await client.query('INSERT INTO user_grenades (user_id, user_name, grenade_id) VALUES ($1, $2, $3)', [userId, username, grenadeId]);
            await client.query('UPDATE user_profile SET coins = coins - $1 WHERE user_name = $2', [cost, username]);
            io.to(socket).emit('purchaseConfirmed', { grenadeId });
            client.release();
        } catch(error) {
            const client = await sql.connect();
            console.error('Error buying grenade:', error);
            await client.query('INSERT INTO error_logs (error_message) VALUES ($1)', [error]);
            client.release();
        }
    });


    socket.on('buySkin', async (data) => {
        try {
          const { socket: socketId, skinId } = data;
          const username = playerUsername[socketId];
          const client = await sql.connect();
      
          const result = await client.query(
            'SELECT user_id FROM user_profile WHERE user_name = $1',
            [username]
          );
      
          const userId = result.rows[0].user_id;
      
          const costResult = await client.query(
            'SELECT cost, item_type FROM marketplace WHERE item_type = $1 AND item_id = $2',
            ['skin', skinId]
          );
      
          const cost = costResult.rows[0].cost;
          const itemType = costResult.rows[0].item_type;
    
          await client.query(
            'UPDATE user_profile SET coins = coins - $1 WHERE user_name = $2',
            [cost, username]
          );
          
          await client.query(
            'INSERT INTO user_weapon_skins (user_id, user_name, item_type, skin_id) VALUES ($1, $2, $3, $4)',
            [userId, username, itemType, skinId]
          );

          const totalSkins = await client.query('SELECT COUNT(*) FROM weapon_skins');
          const ownedSkins = await client.query('SELECT COUNT(*) FROM user_weapon_skins WHERE user_name = $1', [username]);

          if (parseInt(totalSkins.rows[0].count) === parseInt(ownedSkins.rows[0].count)) {
              await updateProgress(username, 'unlock_all_skins', 1);
          }
      
          io.to(socketId).emit('purchaseConfirmed', { skinId });
      
          client.release();
        } catch (error) {
          const client = await sql.connect();
          console.error('Error buying skin:', error);
          await client.query('INSERT INTO error_logs (error_message) VALUES ($1)', [error.message]);
          client.release();
        }
      });
      

      socket.on('updateProgress', async ({ type, amount }) => {
        const username = playerUsername[socket.id];
        await updateProgress(username, type, amount);
      });
      
      
      socket.on('claimChallengeReward', async ({ challengeId }) => {
        try {
          const username = playerUsername[socket.id];
          if (!username) return;
      
          const client = await sql.connect();
      
          const userResult = await client.query(
            'SELECT user_id FROM user_authentication WHERE user_name = $1',
            [username]
          );
          const userId = userResult.rows[0]?.user_id;
          if (!userId) {
            client.release();
            return;
          }
      
          const progressCheck = await client.query(`
            SELECT uc.progress, uc.completed, uc.is_claimed,
                   c.target,
                   COALESCE(c.reward_coins, 0) AS reward_coins,
                   COALESCE(c.reward_xp, 0) AS reward_xp
            FROM user_challenges uc
            JOIN challenges c ON c.challenge_id = uc.challenge_id
            WHERE uc.user_id = $1 AND uc.challenge_id = $2
          `, [userId, challengeId]);
      
          const challenge = progressCheck.rows[0];
          if (!challenge || !challenge.completed || challenge.is_claimed || challenge.progress < challenge.target) {
            client.release();
            return;
          }
          const completedChallenge = await client.query(`
            SELECT 1 FROM user_challenges
            WHERE user_id = $1 AND challenge_id = $2
              AND progress >= (SELECT target FROM challenges WHERE challenge_id = $2)
              AND completed = FALSE
          `, [userId, challengeId]);

          if (completedChallenge.rowCount > 0) {
            await client.query(`
              UPDATE user_challenges
              SET completed = TRUE
              WHERE user_id = $1 AND challenge_id = $2
            `, [userId, challengeId]);

          }

          await client.query(`
            UPDATE user_profile
            SET coins = coins + $1, xp = xp + $2
            WHERE user_id = $3
          `, [challenge.reward_coins, challenge.reward_xp, userId]);

          await client.query(`
            UPDATE user_challenges
            SET is_claimed = TRUE
            WHERE user_id = $1 AND challenge_id = $2
          `, [userId, challengeId]);

      
          socket.emit('challengeClaimed', {
            challengeId,
            coins: challenge.reward_coins,
            xp: challenge.reward_xp
          });
      
          client.release();
        } catch (err) {
          console.error('Error claiming challenge reward:', err);
        }
      });
      
      
      socket.on('claimAchievementReward', async ({ achievementId }) => {
        try {
          const username = playerUsername[socket.id];
          if (!username) return;

          const client = await sql.connect();

          const userResult = await client.query(
            'SELECT user_id FROM user_authentication WHERE user_name = $1',
            [username]
          );
          const userId = userResult.rows[0]?.user_id;
          if (!userId) {
            client.release();
            return;
          }

          const progressResult = await client.query(`
            SELECT ua.progress, ua.completed, ua.is_claimed,
                  a.target,
                  COALESCE(a.reward_coins, 0) AS reward_coins,
                  COALESCE(a.reward_xp, 0) AS reward_xp
            FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.achievement_id
            WHERE ua.user_id = $1 AND ua.achievement_id = $2
          `, [userId, achievementId]);

          const achievement = progressResult.rows[0];
          if (!achievement || !achievement.completed || achievement.is_claimed || achievement.progress < achievement.target) {
            client.release();
            return;
          }

          await client.query(`
            UPDATE user_profile
            SET coins = coins + $1, xp = xp + $2
            WHERE user_id = $3
          `, [achievement.reward_coins, achievement.reward_xp, userId]);

          await client.query(`
            UPDATE user_achievements
            SET is_claimed = TRUE
            WHERE user_id = $1 AND achievement_id = $2
          `, [userId, achievementId]);

          await client.query(`
            UPDATE user_achievements
            SET completed = TRUE
            WHERE user_id = $1 AND achievement_id = $2 AND completed = FALSE
          `, [userId, achievementId]);

          socket.emit('achievementClaimed', {
            achievementId,
            coins: achievement.reward_coins,
            xp: achievement.reward_xp
          });

          client.release();
        } catch (err) {
          console.error('Error claiming achievement:', err);
        }
      });

      socket.on('updateMap', ({ roomId, map }) => {
          const room = rooms[roomId];
          if (!room) return;

          if (room.isVoting === false && room.votingFinished === true) {
              return;
          }

          room.selectedMap = map;
          io.to(roomId).emit('roomMap', map);
      });

      socket.on('mapVote', ({ roomId, map }) => {
          const room = rooms[roomId];
          if (!room || !room.isVoting) return;

          if (!room.votedPlayers) room.votedPlayers = new Set();
          if (room.votedPlayers.has(socket.id)) return;

          if (!['map1', 'map2', 'random'].includes(map)) return;

          if (!room.voteCountdownStarted) {
              room.voteCountdownStarted = true;

              room.voteCountdown = 10;

              room.voteCountdownInterval = setInterval(() => {
                  const currentRoom = rooms[roomId];
                  if (!currentRoom) {
                      clearInterval(room.voteCountdownInterval);
                      return;
                  }

                  io.to(roomId).emit('mapVoteCountdownUpdate', currentRoom.voteCountdown);

                  if (currentRoom.voteCountdown === 0 || currentRoom.votedPlayers.size === currentRoom.players.length) {
                      clearInterval(room.voteCountdownInterval);
                      finishVoting(roomId);
                  }

                  currentRoom.voteCountdown--;
              }, 700);
          }

          if (!room.voteCounts[map]) room.voteCounts[map] = 0;
          room.voteCounts[map]++;
          room.votedPlayers.add(socket.id);

          io.to(roomId).emit('mapVoteUpdate', room.voteCounts);
      });



      socket.on('startVoting', ({ roomId }) => {
          if (!rooms[roomId]) return;

          rooms[roomId].voteCounts = { map1: 0, map2: 0, random: 0 };
          rooms[roomId].votedPlayers = new Set();
          rooms[roomId].isVoting = true;

          io.to(roomId).emit('startMapVoting');


          setTimeout(() => {
              finishVoting(roomId);
          }, 10000);
      });
 
});

function calculateReadyPlayers(readyPlayers) {
    let count = 0;
    for (const playerId in readyPlayers) {
        if (readyPlayers[playerId]) {
            count++;
        }
    }
    return count;
}

function filterPlayersByMultiplayerId(multiplayerId) {
    let playersInSession = {}

    for (const playerId in backendPlayers) {
        if (backendPlayers[playerId].multiplayerId === multiplayerId) {
            const player = backendPlayers[playerId];
            playersInSession[playerId] = {
                id: player.id,
                x: player.x,
                y: player.y,
                username: player.username,
                weaponId: player.weaponId,
                skinId: player.skinId,
                bullets: player.bullets,
                health: player.health,
                firerate: weaponDetails[playerId].fire_rate,
                reload: weaponDetails[playerId].reload,
                radius: weaponDetails[playerId].radius,
                multiplayerId: player.multiplayerId,
                badge: rooms[multiplayerId]?.players.find(p => p.id === playerId)?.badge || null
              };
        }
    }
    return playersInSession
}

function filterProjectilesByMultiplayerId(multiplayerId) {
    let projectilesInSession = {}
    for (const id in backendProjectiles) {
        if (backendProjectiles[id].multiplayerId === multiplayerId) {
            projectilesInSession[id] = backendProjectiles[id]
        }
    }
    return projectilesInSession
}

function filterGrenadesByMultiplayerId(multiplayerId) {
    let grenadesInSession = {}
    for (const id in backendGrenades) {
        if (backendGrenades[id].multiplayerId === multiplayerId) {
            grenadesInSession[id] = backendGrenades[id]
        }
    }
    return grenadesInSession
}

function initFallingObjects(roomId) {
    let mapSize = rooms[roomId].maxPlayers * 250;
    let fallingObjects = {};
    let objectId = 0;

    function createFallingObjects() {
        const numObjects = Math.floor(Math.random() * (8 - 2) + 2);
        for (let i = 0; i < numObjects; i++) {
            let startX = Math.floor(Math.random() * (1980 + mapSize));
            let startY = Math.floor(Math.random() * (-15 + 350)) - 350;
            fallingObjects[objectId] = { x: startX, y: startY };
            objectId++;
        }
    }

    function updateFallingObjects() {
        for (let id in fallingObjects) {
            if (fallingObjects.hasOwnProperty(id)) {
                fallingObjects[id].y += 3;
                if (fallingObjects[id].y >= 1080 + mapSize) {
                    delete fallingObjects[id];
                }
            }
        }
        io.to(roomId).emit('updateFallingObjects', fallingObjects);
    }

    createFallingObjects();

    const createInterval = setInterval(createFallingObjects, Math.floor(Math.random() * (5000 - 4000) + 4000));
    const updateInterval = setInterval(updateFallingObjects, 15);

    return { createInterval, updateInterval };
}

function startGame(multiplayerId) {
    if (rooms[multiplayerId] && rooms[multiplayerId].players) {
      let playersInRoom = {}
      rooms[multiplayerId].gameStarted = true
      rooms[multiplayerId].startTime = Date.now();
      playersInRoom = rooms[multiplayerId].players
      const corners = [
          { x: 50, y: 50 },
          { x: 1870, y: 50 },
          { x: 50, y: 1030 },
          { x: 1870, y: 1030 }
      ];
      for (let i = corners.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [corners[i], corners[j]] = [corners[j], corners[i]];
      }
      const selectedMap = rooms[multiplayerId]?.map || 'map1';
      playersInRoom.forEach(async(player, index) => {
          const id = player.id
          const username = playerUsername[id];
          const weaponId = weaponIds[id];
          const bullets = weaponDetails[id].ammo
          const firerate = weaponDetails[id].fire_rate
          const reload = weaponDetails[id].reload
          const radius = weaponDetails[id].radius
          const grenadeId = grenadeIds[id]
          const corner = corners[index]

          

          backendPlayers[id] = { 
              id,
              multiplayerId,
              x: corner.x,
              y: corner.y,
              score: 0,
              username,
              health: 100,
              bullets,
              firerate,
              reload,
              radius,
              grenades: 1,
              grenadeId,
              weaponId,
              skinId: skinIds[id] || null,
              _isDead: false,
              reloaded: false,
              badge: rooms[multiplayerId]?.players.find(p => p.id === id)?.badge || null
          };

          if (rooms[multiplayerId]?.gamemode !== 'last_man_standing') {
              backendPlayers[id].kills = 0;
              backendPlayers[id].deaths = 0;
          }

          await updateProgress(username, 'play_match', 1);
          await updateProgress(username, 'play_games', 1);

          if (rooms[multiplayerId]?.gamemode === 'capture_the_point') {
            const mapSize = rooms[multiplayerId]?.maxPlayers * 250;
            kothState[multiplayerId] = {
                zone: {
                    x: 1920 / 2 + mapSize / 2,
                    y: 1080 / 2 + mapSize / 2,
                    radius: 200
                },
                controlTime: {}
            };
              if (!kothState[multiplayerId]) {
                  kothState[multiplayerId] = {
                      zone: { x: 960, y: 540, radius: 150 },
                      controlTime: {}
                  };
              }
              kothState[multiplayerId].controlTime[player.id] = 0;
          }

      });

      const fallingObjectsIntervals = initFallingObjects(multiplayerId);
      rooms[multiplayerId].fallingObjectsIntervals = fallingObjectsIntervals;

      //if (rooms[multiplayerId].gamemode === 'deathmatch') {
          for (const id in explosiveBarrels) {
              if (explosiveBarrels[id].multiplayerId === multiplayerId) {
                  delete explosiveBarrels[id];
              }
          }

          const mapSize = rooms[multiplayerId].maxPlayers * 250;
          const safeMargin = 200;
          for (let i = 1; i <= 4; i++) {
              const x = Math.floor(Math.random() * ((1920 + mapSize) - 2 * safeMargin)) + safeMargin;
              const y = Math.floor(Math.random() * ((1080 + mapSize) - 2 * safeMargin)) + safeMargin;

              explosiveBarrels[`barrel_${multiplayerId}_${i}`] = {
                  id: `barrel_${multiplayerId}_${i}`,
                  x,
                  y,
                  exploded: false,
                  multiplayerId
              };
          }
          setTimeout(() => {
              io.to(multiplayerId).emit('spawnExplosiveBarrels', explosiveBarrels);
          }, 500);

     // }

    } 
}

// function startGame(multiplayerId) {
//     if (rooms[multiplayerId] && rooms[multiplayerId].players) {
//         rooms[multiplayerId].gameStarted = true;
//         const playersInRoom = rooms[multiplayerId].players;

//         // Set a fixed spawn point for all players
//         const spawnPoint = { x: 960, y: 540 }; // center of a 1920x1080 screen

//         playersInRoom.forEach((player) => {
//             const id = player.id;
//             const username = playerUsername[id];
//             const weaponId = weaponIds[id];
//             const bullets = weaponDetails[id].ammo;
//             const firerate = weaponDetails[id].fire_rate;
//             const reload = weaponDetails[id].reload;
//             const radius = weaponDetails[id].radius;
//             const grenadeId = grenadeIds[id];

//             backendPlayers[id] = {
//                 id,
//                 multiplayerId,
//                 x: spawnPoint.x,
//                 y: spawnPoint.y,
//                 score: 0,
//                 username,
//                 health: 100,
//                 bullets,
//                 firerate,
//                 reload,
//                 radius,
//                 grenades: 1,
//                 grenadeId,
//                 weaponId,
//                 skinId: skinIds[id] || null
//             };
//         });
//     }
// }


function reload(reloadTime, bullets, id) {
    reloadingStatus[id] = true
    if (backendPlayers[id]) {
        backendPlayers[id].reloaded = true;
    }
    const reloadInterval = setInterval(() => {
        if (!backendPlayers[id]) return
        backendPlayers[id].bullets = bullets //CHANGE BASED ON WEAPON
        clearInterval(reloadInterval)
        reloadingStatus[id] = false
    }, reloadTime) //RELOAD TIME CHANGE BASED ON WEAPON
}


async function updateProgress(username, type, amount) {
    try {
      if (!username) return;
  
      const client = await sql.connect();
  
      const userResult = await client.query(
        'SELECT user_id FROM user_authentication WHERE user_name = $1',
        [username]
      );
      const userId = userResult.rows[0]?.user_id;
      if (!userId) {
        client.release();
        return;
      }
  
      const weeksSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
      const maxGroupResult = await client.query('SELECT MAX(rotation_group) AS max FROM challenges');
      const maxGroup = maxGroupResult.rows[0].max || 1;
      const rotationGroup = (weeksSinceEpoch % maxGroup) + 1;

      const challengeResult = await client.query(`
        SELECT challenge_id FROM challenges
        WHERE type IN ('daily', 'weekly')
          AND rotation_group = $2
          AND LOWER(trigger_key) = LOWER($1)
      `, [type, rotationGroup]);
  
      for (const row of challengeResult.rows) {
        await client.query(`
          INSERT INTO user_challenges (user_id, challenge_id, progress)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, challenge_id)
          DO UPDATE SET progress = user_challenges.progress + EXCLUDED.progress
        `, [userId, row.challenge_id, amount]);
  
        await client.query(`
          UPDATE user_challenges
          SET completed = TRUE
          WHERE user_id = $1 AND challenge_id = $2 AND progress >= (
            SELECT target FROM challenges WHERE challenge_id = $2
          )
        `, [userId, row.challenge_id]);

        const completedChallenge = await client.query(`
          SELECT c.title
          FROM user_challenges uc
          JOIN challenges c ON uc.challenge_id = c.challenge_id
          WHERE uc.user_id = $1 AND uc.challenge_id = $2
            AND uc.completed = TRUE AND uc.is_claimed = FALSE
            AND NOT EXISTS (
              SELECT 1 FROM user_challenges log
              WHERE log.user_id = $1 AND log.challenge_id = $2 AND log.notified = TRUE
            )
        `, [userId, row.challenge_id]);

        if (completedChallenge.rows.length > 0) {
          await client.query(`
            UPDATE user_challenges
            SET notified = TRUE
            WHERE user_id = $1 AND challenge_id = $2
          `, [userId, row.challenge_id]);

          const challengeTitle = completedChallenge.rows[0].title;

          io.to(activeSessions[username]).emit('challengeCompleted', {
            challengeId: row.challenge_id,
            title: challengeTitle
          });
        }

      }
  
      const achievementResult = await client.query(`
        SELECT achievement_id FROM achievements
        WHERE LOWER(trigger_key) = LOWER($1)
      `, [type]);
  
      for (const row of achievementResult.rows) {
        await client.query(`
          INSERT INTO user_achievements (user_id, achievement_id, progress)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, achievement_id)
          DO UPDATE SET progress = user_achievements.progress + EXCLUDED.progress
        `, [userId, row.achievement_id, amount]);
  
        await client.query(`
          UPDATE user_achievements
          SET completed = TRUE
          WHERE user_id = $1 AND achievement_id = $2 AND progress >= (
            SELECT target FROM achievements WHERE achievement_id = $2
          )
        `, [userId, row.achievement_id]);

        const completedAchievement = await client.query(`
          SELECT a.title
          FROM user_achievements ua
          JOIN achievements a ON ua.achievement_id = a.achievement_id
          WHERE ua.user_id = $1 AND ua.achievement_id = $2
            AND ua.completed = TRUE AND ua.is_claimed = FALSE
            AND ua.notified = FALSE
        `, [userId, row.achievement_id]);

        if (completedAchievement.rows.length > 0) {
          await client.query(`
            UPDATE user_achievements
            SET notified = TRUE
            WHERE user_id = $1 AND achievement_id = $2
          `, [userId, row.achievement_id]);

          const achievementTitle = completedAchievement.rows[0].title;
          console.log('Emitting achievementCompleted to', username, 'with socket ID:', activeSessions[username]);
          io.to(activeSessions[username]).emit('achievementCompleted', {
            achievementId: row.achievement_id,
            title: achievementTitle
          });
        }

      }
      
  
      client.release();
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  }
  
  function respawnPlayer(socket, killerUsername) {
      const playerId = socket.id;
      const multiplayerId = backendPlayers[playerId]?.multiplayerId;
      const username = playerUsername[playerId];

      if (!backendPlayers[playerId] || !rooms[multiplayerId]) return;

      const prevStats = backendPlayers[playerId];
      const weaponId = weaponIds[playerId];
      const skinId = skinIds[playerId];
      const grenadeId = grenadeIds[playerId];
      const weapon = weaponDetails[playerId];

      const prevKills = prevStats.kills || 0;
      const prevDeaths = (prevStats.deaths || 0) + 1;

      // Hide the player and start countdown
      backendPlayers[playerId].x = -9999;
      backendPlayers[playerId].health = 0;
      backendPlayers[playerId].bullets = 0;
      backendPlayers[playerId].grenades = 0;
      socket.emit('startRespawnCountdown', { seconds: 3, killerUsername });

      let remaining = 3;
      const interval = setInterval(() => {
          remaining--;
          socket.emit('respawnCountdownTick', { seconds: remaining });

          if (remaining <= 0) {
              clearInterval(interval);

              const mapSize = rooms[multiplayerId]?.maxPlayers * 250 || 250;
              const spawnX = Math.floor(Math.random() * (1920 + mapSize));
              const spawnY = Math.floor(Math.random() * (1080 + mapSize));

              backendPlayers[playerId] = {
                  id: playerId,
                  username,
                  x: spawnX,
                  y: spawnY,
                  health: 100,
                  bullets: weapon.ammo,
                  firerate: weapon.fire_rate,
                  reload: weapon.reload,
                  radius: weapon.radius,
                  weaponId,
                  skinId,
                  grenadeId,
                  kills: prevKills,
                  deaths: prevDeaths,
                  grenades: 1,
                  multiplayerId,
                  _isDead: false
              };

              if (rooms[multiplayerId]?.gamemode === 'capture_the_point') {
                  if (!kothState[multiplayerId].controlTime[playerId]) {
                      kothState[multiplayerId].controlTime[playerId] = 0;
                  }
              }

              io.to(multiplayerId).emit('updatePlayers', filterPlayersByMultiplayerId(multiplayerId));
          }
      }, 1000);
  }

  function finishVoting(roomId) {
      const room = rooms[roomId];
      if (!room || room.voteFinished) return;
      room.voteFinished = true;

      clearInterval(room.voteCountdownInterval);

      const voteCounts = room.voteCounts || {};
      let maxVotes = -1;
      let selectedMaps = [];

      for (const map in voteCounts) {
          const votes = voteCounts[map];
          if (votes > maxVotes) {
              maxVotes = votes;
              selectedMaps = [map];
          } else if (votes === maxVotes) {
              selectedMaps.push(map);
          }
      }

      const selected = selectedMaps[Math.floor(Math.random() * selectedMaps.length)];

      io.to(roomId).emit('mapVotingFinished', selected);
      room.selectedMap = selected;
      room.isVoting = false;
      room.votingFinished = true;
  }



app.get('/get-info', async (req, res) => {
    try {
        const username = req.query.username
        const client = await sql.connect()
        const result = await client.query(`SELECT coins, level, xp FROM user_profile WHERE user_name = $1;`, [username])
        const data = result.rows[0]

        res.json({coins: data.coins, level: data.level, xp: data.xp})
        client.release()
        
    }
    catch (error) {
        const client = await sql.connect()
        console.error('Error fetching coins data:', error);
        await client.query('INSERT INTO error_logs (error_message) VALUES ($1)', [error])
        client.release()
        res.status(500).json({ error: 'Internal server error' });
    }
})

app.get('/get-weapons', async (req, res) => {
    try {
      const username = req.query.username;
      const client = await sql.connect();
  
      const resultWeapons = await client.query('SELECT weapon_id FROM user_weapons WHERE user_name = $1', [username]);
      const resultGrenades = await client.query('SELECT grenade_id FROM user_grenades WHERE user_name = $1', [username]);
      const resultSkins = await client.query('SELECT skin_id FROM user_weapon_skins WHERE user_name = $1', [username]);
  
      const userWeapons = resultWeapons.rows.map(row => row.weapon_id);
      const userGrenades = resultGrenades.rows.map(row => row.grenade_id);
      const userSkins = resultSkins.rows.map(row => row.skin_id);
  
      res.json({ weapons: userWeapons, grenades: userGrenades, skins: userSkins });
  
      client.release();
    } catch (error) {
      console.error('Error fetching items:', error);
      res.status(500).json({ error: 'Failed to fetch user items' });
    }
  });
  

  app.get('/get-marketplace-items', async (req, res) => {
    const client = await sql.connect();
    try {
      const maxGroupResult = await client.query('SELECT MAX(rotation_group) AS max FROM weapon_skins');
      const maxGroup = maxGroupResult.rows[0].max || 1;
  
      const weeksSinceEpoch = Math.ceil(Date.now() / (1000 * 60 * 60 * 24 * 7));
      const calculatedGroup = ((weeksSinceEpoch - 1) % maxGroup) + 1;
  
      const groupCheck = await client.query(
        'SELECT COUNT(*) FROM weapon_skins WHERE rotation_group = $1',
        [calculatedGroup]
      );
      const hasSkins = parseInt(groupCheck.rows[0].count) > 0;
      const rotationGroup = hasSkins ? calculatedGroup : 1;
  
      const result = await client.query(`
        SELECT 
          m.item_id, 
          m.item_type, 
          m.name, 
          m.cost, 
          m.required_level,
          ws.image_url
        FROM marketplace m
        LEFT JOIN weapon_skins ws 
          ON m.item_type = 'skin' AND m.item_id = ws.skin_id
        WHERE 
          m.item_type IN ('weapon', 'grenade') 
          OR (m.item_type = 'skin' AND ws.rotation_group = $1)
      `, [rotationGroup]);
  
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching marketplace items:', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });
  
  

app.get('/get-skin-listings', async (req, res) => {
  try {
    const client = await sql.connect();

    // Get ALL listings from the last 7 days (no pagination)
    const listingsResult = await client.query(`
      SELECT l.listing_id, l.skin_id, l.price, ws.skin_name, ws.image_url, ws.rarity, l.seller_name
      FROM skin_marketplace_listings l
      JOIN weapon_skins ws ON l.skin_id = ws.skin_id
      WHERE l.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY l.created_at DESC
    `);

    client.release();

    res.json({
      listings: listingsResult.rows
    });

  } catch (error) {
    console.error('Error in /get-skin-listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

  app.get('/get-all-skin-listings', async (req, res) => {
    try {
      const client = await sql.connect();
      const listings = await client.query(`
        SELECT l.listing_id, l.skin_id, l.price, ws.skin_name, ws.image_url, ws.rarity, l.seller_name
        FROM skin_marketplace_listings l
        JOIN weapon_skins ws ON l.skin_id = ws.skin_id
      `);
      client.release();
      res.json(listings.rows);
    } catch (error) {
      console.error('Error fetching listings:', error);
      res.status(500).json({ error: 'Failed to fetch listings' });
    }
  });
  
  app.post('/buy-listed-skin', async (req, res) => {
    const { buyerName, listingId } = req.body;
    const client = await sql.connect();
  
    try {
      const listingResult = await client.query(
        'SELECT * FROM skin_marketplace_listings WHERE listing_id = $1',
        [listingId]
      );
  
      if (listingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Listing not found' });
      }
  
      const listing = listingResult.rows[0];
      const { seller_id, seller_name, skin_id, price } = listing;
  
      const buyerResult = await client.query(
        'SELECT user_id, coins FROM user_profile WHERE user_name = $1',
        [buyerName]
      );
      const buyer = buyerResult.rows[0];
  
      if (!buyer) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
  
      if (buyer.coins < price) {
        return res.status(400).json({ error: 'Not enough coins' });
      }

      const alreadyOwnsResult = await client.query(
        'SELECT 1 FROM user_weapon_skins WHERE user_id = $1 AND skin_id = $2',
        [buyer.user_id, skin_id]
      );
  
      if (alreadyOwnsResult.rows.length > 0) {
        return res.status(400).json({ error: 'You already own this skin' });
      }
  
      await client.query('BEGIN');
  
      await client.query(
        'UPDATE user_profile SET coins = coins - $1 WHERE user_id = $2',
        [price, buyer.user_id]
      );
  
      await client.query(
        'UPDATE user_profile SET coins = coins + $1 WHERE user_id = $2',
        [price, seller_id]
      );
  
      await client.query(
        'DELETE FROM user_weapon_skins WHERE user_id = $1 AND skin_id = $2',
        [seller_id, skin_id]
      );
  
      await client.query(
        `INSERT INTO user_weapon_skins (user_id, user_name, item_type, skin_id)
         VALUES ($1, $2, 'skin', $3)`,
        [buyer.user_id, buyerName, skin_id]
      );
  
      await client.query(
        'DELETE FROM skin_marketplace_listings WHERE listing_id = $1',
        [listingId]
      );
  
      await client.query('COMMIT');
      res.json({ success: true });
  
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing skin purchase:', error);
      res.status(500).json({ error: 'Failed to buy skin' });
    } finally {
      client.release();
    }
  });
  
  

  app.get('/get-skin-details', async (req, res) => {
    const skinId = req.query.skinId;
    try {
      const client = await sql.connect();
      const result = await client.query(
        'SELECT skin_name, rarity FROM weapon_skins WHERE skin_id = $1',
        [skinId]
      );
      client.release();
      if (result.rows.length === 0) return res.status(404).json({ error: 'Skin not found' });
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error getting skin details:', error);
      res.status(500).json({ error: 'Failed to fetch skin details' });
    }
  });

  app.post('/list-skin', async (req, res) => {
    const { username, skinId, price } = req.body;
    const client = await sql.connect();
  
    try {
      const result = await client.query(
        'SELECT user_id FROM user_authentication WHERE user_name = $1',
        [username]
      );
      const userId = result.rows[0].user_id;
  
      const owns = await client.query(
        'SELECT * FROM user_weapon_skins WHERE user_id = $1 AND skin_id = $2',
        [userId, skinId]
      );
      if (owns.rows.length === 0) {
        return res.status(400).json({ error: 'You do not own this skin.' });
      }
  
      const alreadyListed = await client.query(
        'SELECT 1 FROM skin_marketplace_listings WHERE seller_id = $1 AND skin_id = $2',
        [userId, skinId]
      );
      if (alreadyListed.rows.length > 0) {
        return res.status(400).json({ error: 'You already listed this skin for sale.' });
      }
  
      await client.query(
        'INSERT INTO skin_marketplace_listings (seller_id, seller_name, skin_id, price) VALUES ($1, $2, $3, $4)',
        [userId, username, skinId, price]
      );
  
      res.json({ success: true });
    } catch (error) {
      console.error('Error listing skin:', error);
      res.status(500).json({ error: 'Failed to list skin' });
    } finally {
      client.release();
    }
  });
  
  app.post('/update-skin-listing', async (req, res) => {
    const { listingId, price, username } = req.body;
    const client = await sql.connect();
  
    try {
      const result = await client.query(
        'UPDATE skin_marketplace_listings SET price = $1 WHERE listing_id = $2 AND seller_name = $3',
        [price, listingId, username]
      );
  
      if (result.rowCount === 0) {
        return res.status(403).json({ error: 'You are not allowed to update this listing.' });
      }
  
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating listing:', error);
      res.status(500).json({ error: 'Failed to update listing.' });
    } finally {
      client.release();
    }
  });
  
  
  app.post('/cancel-skin-listing', async (req, res) => {
    const { listingId, username } = req.body;
    const client = await sql.connect();
  
    try {
      const result = await client.query(
        'DELETE FROM skin_marketplace_listings WHERE listing_id = $1 AND seller_name = $2',
        [listingId, username]
      );
  
      if (result.rowCount === 0) {
        return res.status(403).json({ error: 'You are not allowed to cancel this listing.' });
      }
  
      res.json({ success: true });
    } catch (error) {
      console.error('Error canceling listing:', error);
      res.status(500).json({ error: 'Failed to cancel listing.' });
    } finally {
      client.release();
    }
  });

  app.get('/get-challenges', async (req, res) => {
    const username = req.query.username;
    const client = await sql.connect();
  
    try {
      const userResult = await client.query(
        'SELECT user_id FROM user_authentication WHERE user_name = $1',
        [username]
      );
      const userId = userResult.rows[0]?.user_id;
  
      if (!userId) return res.status(400).json({ error: 'Invalid user' });
  
      const maxGroupResult = await client.query('SELECT MAX(rotation_group) AS max FROM challenges');
      const maxGroup = maxGroupResult.rows[0].max || 1;
  
      const weeksSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
      const rotationGroup = (weeksSinceEpoch % maxGroup) + 1;
  
      const activeChallenges = await client.query(
        `SELECT challenge_id FROM challenges WHERE rotation_group = $1 AND type IN ('daily', 'weekly')`,
        [rotationGroup]
      );
  
      for (const row of activeChallenges.rows) {
        await client.query(`
          INSERT INTO user_challenges (user_id, challenge_id, progress, completed)
          VALUES ($1, $2, 0, false)
          ON CONFLICT (user_id, challenge_id) DO NOTHING
        `, [userId, row.challenge_id]);
      }
  
      const challengeResult = await client.query(`
        SELECT 
            c.challenge_id,
            c.title,
            c.description,
            c.type,
            c.target,
            c.reward_coins,
            c.reward_xp,
            COALESCE(uc.progress, 0)     AS progress,
            uc.completed,
            COALESCE(uc.is_claimed, false) AS is_claimed
        FROM challenges c
        LEFT JOIN user_challenges uc 
            ON c.challenge_id = uc.challenge_id AND uc.user_id = $1
        WHERE c.rotation_group = $2
          AND c.type IN ('daily', 'weekly')
    `, [userId, rotationGroup]);
    
    res.json(challengeResult.rows);
    
  
    } catch (err) {
      console.error('Error fetching challenges:', err);
      res.status(500).json({ error: 'Failed to load challenges' });
    } finally {
      client.release();
    }
  });
  

  app.post('/update-challenge-progress', async (req, res) => {
      const { username, challengeId, amount } = req.body;
      const client = await sql.connect();

      try {
          const userResult = await client.query('SELECT user_id FROM user_authentication WHERE user_name = $1', [username]);
          const userId = userResult.rows[0].user_id;

          await client.query(`
              INSERT INTO user_challenges (user_id, challenge_id, progress)
              VALUES ($1, $2, $3)
              ON CONFLICT (user_id, challenge_id)
              DO UPDATE SET progress = user_challenges.progress + EXCLUDED.progress
          `, [userId, challengeId, amount]);

          const progressResult = await client.query(`
              SELECT progress, completed, target FROM user_challenges uc
              JOIN challenges c ON c.challenge_id = uc.challenge_id
              WHERE uc.user_id = $1 AND uc.challenge_id = $2
          `, [userId, challengeId]);

          const row = progressResult.rows[0];
          if (!row.completed && row.progress >= row.target) {
              await client.query(`UPDATE user_challenges SET completed = TRUE WHERE user_id = $1 AND challenge_id = $2`, [userId, challengeId]);

              await client.query(`
                  UPDATE user_profile 
                  SET coins = coins + $1, xp = xp + $2 
                  WHERE user_id = $3
              `, [row.reward_coins, row.reward_xp, userId]);

              return res.json({ completed: true, rewardCoins: row.reward_coins, rewardXP: row.reward_xp });
          }

          res.json({ completed: false });
      } catch (err) {
          console.error('Error updating challenge progress:', err);
          res.status(500).json({ error: 'Failed to update progress' });
      } finally {
          client.release();
      }
  });


  app.get('/get-achievements', async (req, res) => {
    const username = req.query.username;
    const client = await sql.connect();

    try {
      const userResult = await client.query(
        'SELECT user_id FROM user_authentication WHERE user_name = $1',
        [username]
      );
      const userId = userResult.rows[0]?.user_id;

      if (!userId) return res.status(400).json({ error: 'Invalid user' });

      const allAchievements = await client.query('SELECT achievement_id FROM achievements');
      for (const row of allAchievements.rows) {
        await client.query(`
          INSERT INTO user_achievements (user_id, achievement_id, progress, completed)
          VALUES ($1, $2, 0, FALSE)
          ON CONFLICT (user_id, achievement_id) DO NOTHING
        `, [userId, row.achievement_id]);
      }

      const result = await client.query(`
        SELECT 
          a.achievement_id,
          a.title,
          a.description,
          a.target,
          a.reward_coins,
          a.reward_xp,
          a.trigger_key,
          COALESCE(ua.progress, 0) AS progress,
          ua.completed,
          COALESCE(ua.is_claimed, false) AS is_claimed
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.achievement_id = ua.achievement_id AND ua.user_id = $1
      `, [userId]);


      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching achievements:', err);
      res.status(500).json({ error: 'Failed to load achievements' });
    } finally {
      client.release();
    }
  });

  app.get('/get-badge', async (req, res) => {
    const { username } = req.query;
    const client = await sql.connect();
    try {
      const result = await client.query(`SELECT selected_badge FROM user_profile WHERE user_name = $1`, [username]);
      res.json({ badge: result.rows[0]?.selected_badge || null });
    } catch (error) {
      console.error('Error getting badge:', error);
      res.status(500).json({ error: 'Failed to get badge' });
    } finally {
      client.release();
    }
  });

  app.post('/set-badge', async (req, res) => {
    const { username, badgeKey } = req.body;
    const client = await sql.connect();
    try {
      await client.query(`UPDATE user_profile SET selected_badge = $1 WHERE user_name = $2`, [badgeKey, username]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error setting badge:', error);
      res.status(500).json({ error: 'Failed to set badge' });
    } finally {
      client.release();
    }
  });

  

setInterval(async () => {
    for (const id in backendProjectiles) {
        backendProjectiles[id].x += backendProjectiles[id].velocity.x;
        backendProjectiles[id].y += backendProjectiles[id].velocity.y;

        let mapSize = 250;
        let lastHit = '';

        for (const roomId in rooms) {
            const maxPlayers = rooms[roomId].maxPlayers;
            if (maxPlayers) {
                mapSize = maxPlayers * 250;
                break;
            }
        }

        if (
            backendProjectiles[id].x >= 1920 + mapSize ||
            backendProjectiles[id].x <= 0 ||
            backendProjectiles[id].y >= 1080 + mapSize ||
            backendProjectiles[id].y <= 0
        ) {
            delete backendProjectiles[id];
            continue;
        }

        const shooterId = backendProjectiles[id].playerId;

        if (!backendPlayers[shooterId]) {
            delete backendProjectiles[id];
            continue;
        }

        for (const playerId in backendPlayers) {
            if (!playerId) return;
            const backendPlayer = backendPlayers[playerId];
            const multiplayerId = backendPlayers[playerId].multiplayerId;
            const gamemode = rooms[multiplayerId]?.gamemode;
            const distance = Math.hypot(
                backendProjectiles[id].x - backendPlayer.x,
                backendProjectiles[id].y - backendPlayer.y
            );

            if (distance < 30 && shooterId !== playerId) {
                const damage = weaponDetails[shooterId]?.damage;
                if (!damage) {
                    delete backendProjectiles[id];
                    continue;
                }

                lastHit = backendPlayers[shooterId]?.username;
                backendPlayers[playerId].health = Math.max(0, backendPlayers[playerId].health - damage);

                if (backendPlayers[playerId].health <= 0 && !backendPlayers[playerId]._isDead) {
                  backendPlayers[playerId]._isDead = true;

                    if (backendPlayers[shooterId]) {
                        const client = await sql.connect();
                        await client.query(
                            `UPDATE user_profile SET coins = coins + 1, xp = xp + 5 WHERE user_name = $1`,
                            [lastHit]
                        );
                        client.release();
                        await updateProgress(lastHit, 'reach_xp', 5);
                    }

                    if (backendPlayers[shooterId]) {
                        backendPlayers[shooterId].kills = (backendPlayers[shooterId].kills || 0) + 1;

                        if (
                          rooms[multiplayerId]?.gamemode === 'deathmatch' &&
                          !rooms[multiplayerId]?.gameEnded &&
                          backendPlayers[shooterId].kills === 2
                        ) {
                            const winnerUsername = backendPlayers[shooterId].username;
                            const multiplayerId = backendPlayers[shooterId].multiplayerId;
                            rooms[multiplayerId].gameEnded = true;
                            io.to(multiplayerId).emit('gameWon', winnerUsername);
                        }

                    }

                    if (gamemode !== 'last_man_standing') {
                        io.to(multiplayerId).emit('removeKilledPlayer', {
                            killerId: shooterId,
                            victimId: playerId,
                        });
                        respawnPlayer(io.sockets.sockets.get(playerId), backendPlayers[shooterId]?.username);
                    } else {
                      delete backendPlayers[playerId];
                    }

                }


                delete backendProjectiles[id];
                break;
            }
        }

        for (const barrelId in explosiveBarrels) {
            const barrel = explosiveBarrels[barrelId];
            if (barrel.exploded) continue;
            if (!backendProjectiles[id]) continue;

            const dx = backendProjectiles[id].x - barrel.x;
            const dy = backendProjectiles[id].y - barrel.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 40) {
                barrel.exploded = true;
                io.to(barrel.multiplayerId).emit('barrelExploded', {
                    id: barrelId,
                    x: barrel.x,
                    y: barrel.y
                });

                for (const playerId in backendPlayers) {
                    const player = backendPlayers[playerId];
                    if (player.multiplayerId !== barrel.multiplayerId || player._isDead) continue;

                    const pdx = player.x - barrel.x;
                    const pdy = player.y - barrel.y;
                    const playerDist = Math.sqrt(pdx * pdx + pdy * pdy);

                    const BARREL_RADIUS = 200;
                    const BARREL_DAMAGE = 500;

                    if (playerDist <= BARREL_RADIUS) {
                        player.health = Math.max(0, player.health - BARREL_DAMAGE);

                        const barrelShooter = backendProjectiles[id]?.playerId || null;

                        if (player.health <= 0 && !player._isDead) {
                            player._isDead = true;

                            const isSuicide = barrelShooter === playerId;

                            const killerId = isSuicide ? playerId : barrelShooter;

                            io.to(barrel.multiplayerId).emit('removeKilledPlayer', {
                                killerId,
                                victimId: playerId
                            });

                            

                            if (!isSuicide && backendPlayers[killerId]) {
                                backendPlayers[killerId].kills = (backendPlayers[killerId].kills || 0) + 1;

                                const client = await sql.connect();
                                const killerName = backendPlayers[killerId].username;
                                await client.query(`UPDATE user_profile SET coins = coins + 1, xp = xp + 5 WHERE user_name = $1`, [killerName]);
                                client.release();
                            }

                            if (rooms[barrel.multiplayerId]?.gamemode === 'deathmatch') {
                                const killerUsername = backendPlayers[killerId]?.username || 'barrel explosion';
                                respawnPlayer(io.sockets.sockets.get(playerId), killerUsername);
                            } else {
                                delete backendPlayers[playerId];
                            }
                        }
                    }
                }

                delete backendProjectiles[id];
                break;
            }
        }
    }

    for (const id in backendGrenades) {
        backendGrenades[id].x += backendGrenades[id].velocity.x;
        backendGrenades[id].y += backendGrenades[id].velocity.y;
        const radius = 10; // distance for grenade to stop
        const distanceX = backendGrenades[id].target.x - backendGrenades[id].x;
        const distanceY = backendGrenades[id].target.y - backendGrenades[id].y;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        if (distance <= radius) {
            backendGrenades[id].velocity = { x: 0, y: 0 };
            if (backendGrenades[id].grenadeId === 5) {
                setTimeout(() => {
                    delete backendGrenades[id];
                }, 1000);
            // } else if (backendGrenades[id].grenadeId === 6) {
            //     setTimeout(() => {
            //         delete backendGrenades[id];
            //     }, 400); //2000
             }
        }
    }

    for (const roomId in rooms) {
        const players = filterPlayersByMultiplayerId(roomId);
        const projectiles = filterProjectilesByMultiplayerId(roomId);
        const grenades = filterGrenadesByMultiplayerId(roomId);
        io.to(roomId).emit('updateProjectiles', projectiles, grenades);
        io.to(roomId).emit('updatePlayers', players);
    }
    for (const roomId in rooms) {
        io.emit('updateRoomPlayers', rooms[roomId].players);
    }

    for (const multiplayerId in kothState) {
        const room = rooms[multiplayerId];
        if (!room || room.gamemode !== 'capture_the_point') continue;

        const koth = kothState[multiplayerId];
        const players = filterPlayersByMultiplayerId(multiplayerId);

        const playersInZone = [];

        for (const playerId in players) {
            const player = players[playerId];
            const dx = player.x - koth.zone.x;
            const dy = player.y - koth.zone.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < koth.zone.radius) {
                playersInZone.push(playerId);
            }
        }

        for (const playerId in koth.controlTime) {
            if (!players[playerId]) {
                delete koth.controlTime[playerId];
            }
        }

        let holder = null;

        if (playersInZone.length === 1) {
            holder = playersInZone[0];
            if (!koth.controlTime[holder]) koth.controlTime[holder] = 0;
            koth.controlTime[holder] += 0.015;

            if (koth.controlTime[holder] >= 15) { // cia keiciam zonos capturinimo laika
                const winnerUsername = playerUsername[holder];
                const room = rooms[multiplayerId];

                if (room && !room.gameEnded) {
                    room.gameEnded = true;
                    io.to(multiplayerId).emit('gameWon', winnerUsername);

                    delete kothState[multiplayerId];
                    delete rooms[multiplayerId];
                    continue;
                }
            }
        }
        io.to(multiplayerId).emit('kothZone', koth.zone);

        io.to(multiplayerId).emit('kothUpdate', {
            holder,
            controlTime: koth.controlTime
        });
    }


}, 15);

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
