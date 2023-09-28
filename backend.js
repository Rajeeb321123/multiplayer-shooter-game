// OUR BACKEND

const express = require('express')
const app = express()


// VERY IMP : SOCKET.io SETUP
// ----------------------------
// VERY imp: Socket need http server , not express server so are using http. here we combine http server with express server
// http package is package and it is default with nodejs so no need to install. http is protocol for sending over the internet
// wrapping the http with express i.e app here , so we use express functionality. eg what we want to with request below in server.get . it cant be done without express.
const http = require('http');
const server = http.createServer(app);
// getting Server from socket.io
const { Server } = require("socket.io");
// then wrapping the our previous server we created with Server from socket.io
// basically we are doing multiple wrapping of server.
// default timeout is 25 second in const io = new Server(server); but we want only 5 sec to remove the disconnected player. PingInterval means frontend check backend every 2 sec and PingTimeout  means if frontend doesnot receive any valid respnse from backedn then we are going to disconnect the player in 5 second. and emit the players again 
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 });

const port = 3000

// making public folder static. they are publicly visible to anybody
app.use(express.static('public'))

// if anyone make request url i.e homepage here or '/' then we want send them index.html in pulic directory
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
});

// for saving all the players data, properties
// adding and deleting in object rather than array is better for performance as in array we had to search through whole array for that
// if someone join we add them in uding random and unique id 
const backendPlayers = {};
const backendProjectiles = {};
let projectileId = 0;
const SPEED = 5;
const RADIUS = 10;
const PROJECTILE_RADIUS = 5;



// creating connection between this  backend and frontend.
// if a user want to establish connection to this backend then we run the command inside  {} below.
io.on('connection', (socket) => {
  console.log(`a user connected with id ${socket.id}`);


  // Very Imp: broadcast the event: updatePlayers
  // brodacast to everyone players frontend when new player is connect
  // tip: io.emit is for everyone but if we to emit and event for only the player just connected we use socket.emit instead
  io.emit('updatePlayers', backendPlayers);

  // // getting the size of screen to each player
  // socket.on('initCanvas', ({ width, height, devicePixelRatio }) => {
    
  // })

  // getting data  from eventListener.js 
  socket.on('shoot', ({ x, y, angle }) => {
    //  we want velocity in backend rather than in frontend for safeguarding against hackers
    const velocity = {
      // we get angle from frontend
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5
    }
    projectileId++;
    // creating key value pair for each projectile
    backendProjectiles[projectileId] = {
      x,
      y,
      velocity,
      // we save playerId, so if projectile hit ourself we dont want to die and also color the projectile according the player id
      playerId: socket.id,
    };
  });

  socket.on('initGame', ({username, width, height, devicePixelRatio}) => {
    console.log(username)
    // we want to create the player whenever we click on submit in frontednd
    // here we know player is connected so we can populate players object
    // socket.id is unique random string assigned when player connect from frontend
    // players[socket.id] will create inside   players object with property  socket.id and we use players.socket.id to access later on
    backendPlayers[socket.id] = {
      // x and y are postion new player spawn
      x: 1024 * Math.random(),
      y: 576 * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username,
    };
    // init our canvas
    backendPlayers[socket.id].canvas = {
      width,
      height,
    }
    backendPlayers[socket.id].radius = RADIUS

    // setting the size of player according individual screen ratio
    // if (devicePixelRatio > 1) {
    //   backendPlayers[socket.id].radius = 2 * RADIUS
    // };
    // WE  dont need to consider devicePixelRatio now as we already used c.scale in frontend.js

  });

  // we want to remove the player every time each player disconnect or refresh on backend and then frontend inside
  socket.on('disconnect', (reason) => {
    console.log(reason);
    // remove the player  on backend
    delete backendPlayers[socket.id];
    //we broadcast our  updated players object after removing the player on backend so, front end we can compare it with players obj in frontend to remove the disconnected player
    io.emit('updatePlayers', backendPlayers);

    
  });


  // IMP: Authorative server Movement
  // we will be moving player in backend so hacker cannot hack the movement
  socket.on('keydown', ({ keyCode, sequenceNumber }) => {
    const backendPlayer = backendPlayers[socket.id];
    
    if (!backendPlayers[socket.id]) {
      return;
    };
    
    // to keep track which event or request by frontend we are currently on
    backendPlayers[socket.id].sequenceNumber = sequenceNumber;
    switch (keyCode) {
      case 'KeyW':
        backendPlayers[socket.id].y -= SPEED;
        break;
      case 'KeyA':
        backendPlayers[socket.id].x -= SPEED;
        break;
      case 'KeyS':
        backendPlayers[socket.id].y += SPEED;
        break;
      case 'KeyD':
        backendPlayers[socket.id].x += SPEED;
        break;
    };

    const playerSides = {
      left: backendPlayer.x - backendPlayer.radius,
      right: backendPlayer.x + backendPlayer.radius,
      top: backendPlayer.y - backendPlayer.radius,
      bottom: backendPlayer.y + backendPlayer.radius
    };
    // stoppin from goind out of bound
    if ( playerSides.left < 0) {
      backendPlayers[socket.id].x = backendPlayer.radius
    };
    if ( playerSides.right > 1024 ) {
      backendPlayers[socket.id].x = 1024-backendPlayer.radius
    };
    if ( playerSides.top < 0) {
      backendPlayers[socket.id].y = backendPlayer.radius
    };
    if ( playerSides.bottom > 576 ) {
      backendPlayers[socket.id].y = 576-backendPlayer.radius
    };
  });
});

// BACKEND TICKER
// Very Very IMp: we dont to flood the frontend with all the data from movement event . so,
// IMP: So, we use Ticker functionality to send data at specific rate at specific interval
// imp: donot place it inside io.connection as we dont want ticker for eacher player but same ticker for all the players
setInterval(() => {

  // update projectile position
  for (const id in backendProjectiles) {
    backendProjectiles[id].x += backendProjectiles[id].velocity.x;
    backendProjectiles[id].y += backendProjectiles[id].velocity.y;

    // removing the projectile if they are out of screen
    const PROJECTILE_RADIUS = 5;
    if (
      backendProjectiles[id].x - PROJECTILE_RADIUS >=
      backendPlayers[backendProjectiles[id].playerId]?.canvas?.width ||
      backendProjectiles[id].x + PROJECTILE_RADIUS <= 0 ||
      backendProjectiles[id].y - PROJECTILE_RADIUS >=
      backendPlayers[backendProjectiles[id].playerId]?.canvas?.height ||
      backendProjectiles[id].y + PROJECTILE_RADIUS <= 0
    ) {
      delete backendProjectiles[id];
      continue;
    }

    // VERY IMP: collision detection
    // Removing players and projectiles if they hit each other
    for (const playerId in backendPlayers) {
      const backendPlayer = backendPlayers[playerId];

      const DISTANCE = Math.hypot(
        backendProjectiles[id].x - backendPlayer.x,
        backendProjectiles[id].y - backendPlayer.y
      );
      if (DISTANCE < 5 + backendPlayer.radius && backendProjectiles[id].playerId !== playerId) {
        // this if is imp as player removed score addition let to error
        if (backendPlayers[backendProjectiles[id].playerId]) {
          backendPlayers[backendProjectiles[id].playerId].score++;
        };
        delete backendPlayers[playerId];
        delete backendProjectiles[id];
        break;
      }

    }
  };

  // sending or emiting the projectile to frontend
  io.emit('updateProjectiles', backendProjectiles);

  // update players position
  io.emit('updatePlayers', backendPlayers);
}, 15);
// 15 millisecond means 66 refresh rate

// listening to the port. listening on http server instead of express server like app.listen as we are using socket.io
server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);

});



// SOCKET.io
// socket.io will allow to connect to our backend server and broadcast to anyone who is connected to it.