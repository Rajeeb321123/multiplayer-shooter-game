const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

// io is available as we added socket script in html
// we are connecting to backend using socket.io
const socket = io();

const scoreEl = document.querySelector('#scoreEl')

// for better resolution. if browser or screen doesnot have devicePixelRatio property we will set it to 1
const devicePixelRatio = window.devicePixelRatio || 1;

canvas.width = 1024 * devicePixelRatio;
canvas.height = 576 * devicePixelRatio;

// scaling the size of people with smaller screen , so they dont have disadvatages in the game.
c.scale(devicePixelRatio, devicePixelRatio);

const x = canvas.width / 2
const y = canvas.height / 2

// all players to render on frontend here
const frontendPlayers = {};
const frontendProjectiles = {};

// no need it for this , we will be doing this inside at bottom when we submit username to backend
// // listening to main connection from backend
// socket.on("connect", () => {
//   // emittin canvas width and height to other player
//   socket.emit('initCanvas', {
//     width: canvas.width,
//     height: canvas.height,
//     devicePixelRatio,
//   })
// })

socket.on('updateProjectiles', (backendProjectiles) => {
  for (const id in backendProjectiles) {
    const backendProjectile = backendProjectiles[id];

    if (!frontendProjectiles[id]) {
      frontendProjectiles[id] = new Projectile({
        x: backendProjectile.x,
        y: backendProjectile.y,
        radius: 5,
        color: frontendPlayers[backendProjectile.playerId]?.color,
        velocity: backendProjectile.velocity,
      })
    }
    else {
      frontendProjectiles[id].x += backendProjectiles[id].velocity.x
      frontendProjectiles[id].y += backendProjectiles[id].velocity.y
    }
  }

  for (const frontendProjectileId in frontendProjectiles) {
    // if projectile doest exist / deleted from backend we want to remove in front end as well.
    if (!backendProjectiles[frontendProjectileId]) {
      delete frontendProjectiles[frontendProjectileId];
    };
  };
});

// Very imp: receive the event : updatePlayers
socket.on('updatePlayers', (backendPlayers) => {
  // for in great 
  for (const id in backendPlayers) {
    const backendPlayer = backendPlayers[id];

    // if backend player doesnot exist currently right now  inside in player object here
    if (!frontendPlayers[id]) {
      frontendPlayers[id] = new Player({
        x: backendPlayer.x,
        y: backendPlayer.y,
        radius: 10,
        // imp: generating color in frontend isnot ok as player can cheat and make themself blend along with background.
        color: backendPlayer.color,
        username: backendPlayer.username
      });

      document.querySelector('#playerLabels').innerHTML += `<div data-id = "${id}" data-score = "${backendPlayer.score}">${backendPlayer.username}: ${backendPlayer.score}</div>`
    }
    // if player already exist
    else {
      // constantly updating the scoreboard
      document.querySelector(`div[data-id="${id}"]`).innerHTML = `${backendPlayer.username}: ${backendPlayer.score}`;
      // constantly updating the data-score attribute of html element
      document
      .querySelector(`div[data-id="${id}"`)
      .setAttribute(`data-score`, backendPlayer.score);

      // for sorting according to score in leaderboard
      const parentDiv = document.querySelector(`#playerLabels`)
      // Very IMp: we can put html element into a Arrays
      const childDivs = Array.from(parentDiv.querySelectorAll('div'));
      //VERy imp: for sorting  we take element next to each other
      childDivs.sort((a,b) => {
        const scoreA = Number(a.getAttribute('data-score'))
        const scoreB = Number(b.getAttribute('data-score'))

        // imp for descending do like below
        return scoreB - scoreA ;
      });

      // remove old elements 
      childDivs.forEach(div => {
        parentDiv.removeChild(div);
      });

      // adds sorted elements
      childDivs.forEach(div => {
        parentDiv.appendChild(div);
      });

      // VERY IMP: enhanced interpolation
      // we will use gsap , rather we creatre target position and ease into that new position 
      frontendPlayers[id].target = {
        x: backendPlayer.x,
        y: backendPlayer.y
      };

      // we want server reconcillation for our frontend only against jitter error so,
      if (id === socket.id) {
        // // IMP: we can update the movement of our player. using Ticker in backend 
        // frontendPlayers[id].x = backendPlayer.x;
        // frontendPlayers[id].y = backendPlayer.y;


        const lastBackendInputIndex = playerInputs.findIndex(input => {
          // finding the last event from inside playerInputs of client that server processed
          return backendPlayer.sequenceNumber === input.sequenceNumber;
        });

        // lastbackendInputIndex will be -1 if it isnot found after findIndex()
        if (lastBackendInputIndex > -1) {
          // splicing  out the event that are already processed.
          playerInputs.splice(0, lastBackendInputIndex);
        };

        playerInputs.forEach(input => {
          frontendPlayers[id].target.x += input.dx;
          frontendPlayers[id].target.y += input.dy;
        })
      }
      else {
        // for all other players movements
        // VERY IMP: interpolation of other player movement if they lag
        // so, they dont look shitty when moving. USING GSAP
        // gsap.to(frontendPlayers[id], {
        //   x: backendPlayer.x,
        //   y: backendPlayer.y,
        //   // changing default duration
        //   // changin duration to 15 millisecond according to tick rate in a backend for good animation
        //   duration: 0.015,
        //   ease: 'linear'
        // })
      }
    };
  };

  // Deleting the frontedn player not backend as backend is already deleted
  for (const id in frontendPlayers) {
    // if id doest exist / deleted from backend we want to remove in front end as well.
    if (!backendPlayers[id]) {
      //Removing the div in html leaderboard for the remove player 
      const divToDelete = document.querySelector(`div[data-id="${id}"`);
      divToDelete.parentNode.removeChild(divToDelete);

      // if the current id in for loop  === id to be deleted or not found in backendPlayers array, we show the interface again
      if (id === socket.id) {
        document.querySelector('#usernameForm').style.display = 'block';
      };

      delete frontendPlayers[id];
    };
  };
});

let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  // c.fillRect(0, 0, canvas.width, canvas.height)
  c.clearRect(0, 0, canvas.width, canvas.height);

  // rendering each of the other players in canvas 
  // VERY IMP: for in is for object loop
  for (const id in frontendPlayers) {
    const frontendPlayer = frontendPlayers[id];

    // Very IMp:Enhanced linear Interpolation :
    if (frontendPlayer.target) {
      frontendPlayers[id].x += (frontendPlayers[id].target.x - frontendPlayers[id].x) * 0.5
      frontendPlayers[id].y += (frontendPlayers[id].target.y - frontendPlayers[id].y) * 0.5
    }
    frontendPlayer.draw();
  };
  for (const id in frontendProjectiles) {
    const frontenProjectile = frontendProjectiles[id];
    frontenProjectile.draw();
  };

  //  this is for  array but we changed it object
  // for (let i = frontendProjectiles.length-1; i >= 0 ; i--){
  //   //  very iMP: for logic we need to render from back 
  //   // when we render from back , if one of the projectile is removed index isnot  corect to move to next item, but there is no such if we start from back. GIve a thought experiment yourself. it solves weird flash error
  //   const frontendProjectile = frontendProjectiles[i];
  //   frontendProjectile.update();
  // }

};

animate();

const keys = {
  w: {
    pressed: false
  },
  s: {
    pressed: false
  },
  a: {
    pressed: false
  },
  d: {
    pressed: false
  },
};

const SPEED = 5;
const playerInputs = [];
let sequenceNumber = 0;
// frontend ticker for whether keys are pressed. moving this code out of eventListener will make it more snappy and smooth.
setInterval(() => {
  // server reconcillation is our frontend only
  // very very IMp: server reconcillation: when we move in client , but server may be behind client due large numbers of requests by client. so we have to adjust client and server . other wise  we will haver jittery effect on our client or frontend
  // very interesting concept for really knowing look from 1.55 min fo online multipler js game Chris Courses.
  sequenceNumber++;


  // keep track for multiple key press
  // IMp: for diagonal movement we use if{}, not else if as we want multiple keys pressed at same time.
  if (keys.w.pressed) {
    // dx is differential of x for movement
    playerInputs.push({ sequenceNumber, dx: 0, dy: -SPEED });
    // we can grab our frontend player from frontendPlayers object using unique id provided by socket.io for our connection
    // move upward with -5 to y
    // IMP:we dont do it like this frontendPlayers[socket.id].y -= 5 only; as hack and hack frontend and set properties to their liking
    // CLient side prediction for movement
    // very very imp: below client side movement is just for use one player so to give illusion of smooth movement for our player against lag posed by real world servers. this doesnt move the player in reality , below socket.emit move the player
    frontendPlayers[socket.id].y -= SPEED;

    // submit an emit for backend
    // this socket control real movement of players in backend and then afterward in frontend , making hacking very hard due to authoratative server movement.
    socket.emit('keydown', { keyCode: 'KeyW', sequenceNumber });
  };
  if (keys.a.pressed) {
    playerInputs.push({ sequenceNumber, dx: -SPEED, dy: 0 });
    frontendPlayers[socket.id].x -= SPEED;
    socket.emit('keydown', { keyCode: 'KeyA', sequenceNumber });
  };
  if (keys.s.pressed) {
    playerInputs.push({ sequenceNumber, dx: 0, dy: -SPEED });
    frontendPlayers[socket.id].y += SPEED;
    socket.emit('keydown', { keyCode: 'KeyS', sequenceNumber });
  };
  if (keys.d.pressed) {
    playerInputs.push({ sequenceNumber, dx: SPEED, dy: 0 });
    frontendPlayers[socket.id].x += SPEED;
    socket.emit('keydown', { keyCode: 'KeyD', sequenceNumber });
  };

}, 15);

// event listener for when key in keyboard is pressed
window.addEventListener('keydown', (event) => {

  // we havenot connected to backend with socket.io for some reason we dont want error so,
  if (!frontendPlayers[socket.id]) {
    return;
  };
  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = true;
      break;
    case 'KeyA':
      keys.a.pressed = true;
      break;
    case 'KeyS':
      keys.s.pressed = true;
      break;
    case 'KeyD':
      keys.d.pressed = true;
      break;
  }
});

// when key is lifted 
window.addEventListener('keyup', (event) => {
  if (!frontendPlayers[socket.id]) {
    return;
  };
  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = false;
      break;
    case 'KeyA':
      keys.a.pressed = false;
      break;
    case 'KeyS':
      keys.s.pressed = false;
      break;
    case 'KeyD':
      keys.d.pressed = false;
      break;
  }
});

// VERY imp: whenever we click submit
document.querySelector('#usernameForm').addEventListener('submit', (event) => {
  // removing the refresh default behaviour of form element whenevere we submit
  event.preventDefault();

  // hiding the interface
  document.querySelector(`#usernameForm`).style.display = 'none';
  socket.emit('initGame',{
    username:document.querySelector('#usernameInput').value,
    width: canvas.width,
    height: canvas.height,
    devicePixelRatio,
  });

})
