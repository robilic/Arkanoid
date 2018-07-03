$(document).ready(function() {
  var screen = document.getElementById("game_screen");
  var context = screen.getContext("2d");
  context.font = '12pt Arial';
  var context_position = $('#game_screen').position();
  canvas_x_offset = context_position.left;
  canvas_y_offset = context_position.top;

  var double_buffer = document.createElement('canvas');
  double_buffer.width = screen.width; double_buffer.height = screen.height;
  d_buf = double_buffer.getContext('2d');

  // performance logging
  var P_draw_time = "0.000";
  var FRAMERATE = 30;
  var LASER_DELAY = 15;  // frames between firing laser
  var SCREEN_X = 176;  var SCREEN_Y = 216;
  var H_BRICKS = 10;  var V_BRICKS = 10;
  var BRICK_H = 8;  var BRICK_W = 16;
  var BALL_H = 5;  var BALL_W = 5;
  var PUP_H = 8;  var PUP_W = 16;
  var BLT_W = 4;  var BLT_H = 4;
  var PLAYFIELD_X = BRICK_W * H_BRICKS;

  //var BACKGROUND_COLOR = "#202020";

  var GAME_STATE = '';

  var batImg = new Image();
  batImg.src = 'gfx/paddle.png';
  batImg.onload = function () { };

  var ballImg = new Image();
  ballImg.src = 'gfx/ball.png';
  ballImg.onload = function () { };

  var backgroundImg = new Image();
  backgroundImg.src = 'gfx/backgrounds.png';
  backgroundImg.onload = function () { };

  var powerupImg = new Image();
  powerupImg.src = 'gfx/powerups.png';
  powerupImg.onload = function () { };

  var laserImg = new Image();
  laserImg.src = 'gfx/laser.png';
  laserImg.onload = function () { };

  var player = {
  	x: PLAYFIELD_X / 2,
  	y: SCREEN_Y - (8*2),
  	width: 32,
  	height: 8,
    frame: 0,
    metal_ball: false,
    laser: false,         // can we shoot laser
    laser_time: 0,        // last time gun was fired
    last_powerup: 0,
    score: 0
  };

  var balls = [];
  var lasers = [];
  var powerups = [];

  var brickImg = new Image();
  brickImg.src = 'gfx/bricks.png';
  brickImg.onload = function () { };
 
  restartGame = function () {
  };

  drawMessage = function (txt, x, y) {
    var fontSize = 9;
    d_buf.font = fontSize + "px monospace";
    d_buf.fillStyle = '#f33';
    d_buf.fillText(txt, x, y);
  };

  drawPlayer = function () {
    switch (player.width) {
      case 24:
        paddle_sprite = 0;
        break;
      case 32:
        paddle_sprite = 1;
        break;
      case 48:
        paddle_sprite = 2;
        break;
    }
    // +8 includes the shadow part of the sprite
    d_buf.drawImage(batImg, Math.floor(player.frame)*(player.width+8), paddle_sprite*16, player.width + 8, 16,
      player.x+(BRICK_W/2), player.y, player.width + 8, 16);

    player.frame += 0.15;
    if (player.frame >= 4) { player.frame = 0; }
  };
  
  drawBricks = function () {
    for (x=0; x<H_BRICKS; x++) {
      for (y=0; y<V_BRICKS; y++) {
        b = bricks[y][x];
        if (b > 0) {
          drawBrickSprite(b % 10, (BRICK_W * x) + (BRICK_W/2), BRICK_H * y);
        }
      }
    }
  };

  // ctx.drawImage(sprites,srcX,srcY,srcW,srcH,destX,destY,destW,destH);
  drawBrickSprite = function (id, dx, dy) {
    d_buf.drawImage(brickImg, id*BRICK_W, 0, BRICK_W, BRICK_H,
                        dx, dy, BRICK_W, BRICK_H);
  };

  drawPowerUpSprite = function (p) {  // (dy % 8) * PUP_W for x value?
    d_buf.drawImage(powerupImg, Math.floor(p.frame) * PUP_W, p.id*PUP_H, PUP_W, PUP_H,
                      p.x + (PUP_W/2), p.y, PUP_W, PUP_H);
  };

  drawBallSprite = function (b) {
    d_buf.drawImage(ballImg, 0, 0, BALL_W, BALL_H, b.x+(BRICK_W/2), b.y, BALL_W, BALL_H);
  };

  drawLaser = function (b, s) {
    ls = 4; // laser sprite
    d_buf.drawImage(laserImg, ls*BLT_W, 0, BLT_W, BLT_H, b.x+8, b.y, BLT_W, BLT_H);
  };

  createPowerUp = function (x, y, id) {
    powerups.push({ x: x, y: y, id: id, frame: 0.0 });
  };

  doLasers = function () {
    for (b = lasers.length-1; b >= 0; b--) {
      lasers[b].y -= 3;
      drawLaser(lasers[b], b);
      // collsion check
      if (lasers[b].y < (BRICK_H * 10) && lasers[b].y > 0) {  // are we in the area you could even hit a brick?
        tx = Math.floor((lasers[b].x+1) / BRICK_W);
        ty = Math.floor(lasers[b].y / BRICK_H);

        if (bricks[ty][tx] > 0) { // did laser hit a brick
          bricks[ty][tx] = hitBrick(tx, ty);
          lasers.splice(b, 1);
        } else if (lasers[b].y < 0) { // did the laser go off screen?
          lasers.splice(b, 1);
        }
      }
    }
  };

  doBall = function (b) {
    b.x += b.xv;
    b.y += b.yv;

    // check to see if we're still on the playfield
    if (b.x < 0) { // left side
      b.x = 0;
      XBounce(b);
      player.metal_ball = false;
    }

    if (b.x > (PLAYFIELD_X - BALL_W)) { // right side
      b.x = (PLAYFIELD_X - BALL_W);
      XBounce(b);
      player.metal_ball = false;
    }

    if (b.y < 0 + BRICK_H) { // top of screen
      b.y = 0 + BRICK_H;
      YBounce(b);
      player.metal_ball = false;
    }

    if (b.y > (SCREEN_Y - BALL_H)) { // bottom of screen
      b.y = (SCREEN_Y - BALL_H);
      YBounce(b);
      player.metal_ball = false;
    }

    // check collison with bricks

    brickHit = false;
    if (b.y < (BRICK_H * 10)) {  // is ball in the area you could even hit a brick?
      // did the ball hit any bricks on the way UP
      if (b.yv < 0) {
        tx = Math.floor((b.x + (BALL_W/2) - 1) / BRICK_W);
        ty = Math.floor((b.y - (BALL_H)/2) / BRICK_H);

        if (bricks[ty][tx] > 0) {
          bricks[ty][tx] = hitBrick(tx, ty);
          brickHit = true;
        }
      }

      // did the ball hit any bricks on the way DOWN
      if (b.yv > 0) {
        tx = Math.floor((b.x + (BALL_W/2) - 1) / BRICK_W);
        ty = Math.floor((b.y + (BALL_H-1)) / BRICK_H);

        if (ty < 10) {
          if (bricks[ty][tx] > 0) {
            bricks[ty][tx] = hitBrick(tx, ty);
            brickHit = true;
          }
        }
      }

      // didn't hit anything vertically, check horizontally
      if (brickHit && !player.metal_ball) { YBounce(b); } else {
        if (b.xv < 0) { // moving left
          tx = Math.floor((b.x) / BRICK_W);
          ty = Math.floor((b.y + (BALL_H/2)) / BRICK_H);

          if (ty < 10) {
            if (bricks[ty][tx] > 0) {
              bricks[ty][tx] = hitBrick(tx, ty);
              brickHit = true;
            }
          }
        }

        if (b.xv > 0) { // moving right
          tx = Math.floor((b.x + BALL_W) / BRICK_W);
          ty = Math.floor((b.y + (BALL_H/2)) / BRICK_H);

          if (ty < 10) {
            if (bricks[ty][tx] > 0) {
              bricks[ty][tx] = hitBrick(tx, ty);
              brickHit = true;
            }
          }
        }
        if (brickHit && !player.metal_ball) { XBounce(b); }
      }
    }


    // check collisons with bat
    batHit = false;
    if (b.y > SCREEN_Y - (player.height * 3)) {  // are we in the area you could even bat the ball?
      if (b.yv > 0) {
      // did the ball hit the bat on the way DOWN
/*
     000                                000
    0   0                              0   0
    0   0                              0   0
    0   0                              0   0
     0.0                                0.0
        X-+-+-+-+-+-+-+-x+-+-+-+-+-+-+-X
        1234567 1234567 1234567 1234567 

        Test the center point '.'

        player.x = 10
        8 to 34 is the range
        player.x + width/2 = halfway pt

        8-26 is the range for the left size, 18
        split that into 5 sections (3.6 pixels each3/)

        3
        10
        17

        ceil(distance / 3.6) = Y val
        6 - Yval = xVal
*/
        left = player.x - 2;
        right = player.x + player.width + 2;
        bc = b.x + 2; // center of ball
        pc = player.x + (player.width/2); // center of paddle
        range = right - left;
        pw = player.width + 4; // true paddle width
        section = (pw / 2) / 5;

        // check left side of paddle
        if ((bc >= left) && (bc <= pc)) {
          batHit = true;
          xVal = Math.max(1, Math.ceil((pc - bc) / section)); // if this were 0 the ball goes straight up
          b.xv = 0 - xVal
          b.yv = 6 - xVal;
        }
        if ((bc > pc) && (bc <= right)) {
          batHit = true;
          xVal = Math.ceil((bc - pc) / section);
          b.xv = xVal;
          b.yv = 6 - xVal;
        }
      }
    }

    if (batHit) { YBounce(b); }
  };

  doPowerUps = function () {
    if (powerups.length > 0) {
      for (p = powerups.length - 1; p >= 0; p--) {
        powerups[p].y += 2; // move down screen
        powerups[p].frame += 0.5; // increment sprite frame
        if (powerups[p].frame >= 8) { 
          powerups[p].frame = 0;
        }
        drawPowerUpSprite(powerups[p]);

        // check if player 'catches' powerup
        if (((powerups[p].y + PUP_H) >= player.y) && (powerups[p].y < (player.y + player.height))) {
          if (((powerups[p].x + PUP_W) > player.x) && (powerups[p].x < (player.x + player.width))) {
            gainPowerUp(powerups[p].id);
            powerups.splice(p, 1);
          }
        } else if (powerups[p].y > SCREEN_Y) {
        // remove if hit bottom of screen
          powerups.splice(p, 1);
        }
      }
    }
  };

  gainPowerUp = function(id) {
/*
  0 B - Break out - creates exit on right side
  1 C - Catch
  2 D - Disrupt (multiple balls)
  3 E - Enlarge
  4 L - laser
  5 M - Metal ball - destroys bricks instead of bouncing 
  6 P - Player (free life)
  7 S - Slow
  8 T - Forcefield

  any other powerups should be reset
*/
    // only allow 1 powerup at a time
    losePowerUp(player.last_powerup);
    player.last_powerup = id;

    switch (id) {
      case 2: // double the ball (only the original or first ball)
        b = balls[0]; // two balls at slightly different angles
        balls.push({ x: b.x, y: b.y, yv: b.yv, xv: b.xv-1, state: 'free' });
        balls.push({ x: b.x, y: b.y, yv: b.yv, xv: b.xv+1, state: 'free' });
        break;
      case 3: // enlarge paddle
        player.width = 48;
      break;
      case 4: // give laser
        player.laser = true;
      break;
      case 5: // metal ball
        player.metal_ball = true;
      break;
    }
  };

  losePowerUp = function (id) {
    switch (id) {
      case 3: // regular size paddle
        player.width = 32;
      break;
      case 4: // take away laser
        player.laser = false;
      break;
    }
  };

  hitBrick = function (tx, ty) {
    // reduce strength of brick
    // if brick strength = 0
    //   erase brick
    //   give out power up
    //
    //  Brick is encoded as: Strength - PowerUp - Sprite
    brick = bricks[ty][tx];
    brick = brick - 100;

    if (brick < 100) {
      // brick is destroyed
      player.score += 10;
      // release power-up
      brick = Math.floor(brick / 10);

      if (brick > 0) {
        createPowerUp(tx*BRICK_W, ty*BRICK_H, brick);
      }
      return 0;
    }
    else { return brick; }
  };

  XBounce = function (b) {
    b.xv = -b.xv;
  };

  YBounce = function (b) {
    b.yv = -b.yv;
  };

  eraseScreen = function () {
  	// clear background to black
  	context.fillStyle = BACKGROUND_COLOR;
  	context.fillRect(0, 0, SCREEN_X, SCREEN_Y);
  };

  drawBackground = function (id) {
    // 176x216
    d_buf.drawImage(backgroundImg, (id-1)*176, 0, 176, 216,
                        0, 0, 176, 216);
  };

  gameLoop = function (o) {
    t0 = performance.now();

    player.laser_time++;

  	drawBackground(1);
  	drawPlayer();
  	drawBricks();
    for (b = 0; b < balls.length; b++) {
      doBall(balls[b]);
      drawBallSprite(balls[b]);
    }

    doPowerUps();
    doLasers();
    drawMessage("Score: " + player.score, 25, SCREEN_Y-3);
    context.drawImage(double_buffer, 0,0); // copy double buffer to screen

    t1 = performance.now();
    P_draw_time = t1-t0;
  };

  // The actual game starts here

  setInterval(function() { gameLoop(); }, 1000/FRAMERATE);
  document.getElementById('game_screen').onmousemove = getMouseCoords;
  document.getElementById('game_screen').onmousedown = getMouseButton;

  // create the ball
  balls.push({ x: PLAYFIELD_X / 2, y: SCREEN_Y - 100, yv: -2, xv: -4, state: 'free' });

  function getMouseCoords(event) {
  	player.x = Math.floor((event.clientX - canvas_x_offset)/2);
    if (player.x > (PLAYFIELD_X - player.width)) {
      player.x = PLAYFIELD_X - player.width;
    }
  };

  function getMouseButton(event) {
    if (player.laser) {
      if (player.laser_time > 0) {
        player.laser_time = -LASER_DELAY;  // create delay before the next laser
        // add two lasers, one on each side of the paddle
        lasers.push({x: player.x, y: player.y });
        lasers.push({x: player.x+player.width, y: player.y });
      }
    }
  };
  
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  function getRandomArbitrary(min, max) {
  	return Math.random() * (max - min) + min;
  };

  $(document).bind('keydown', function(event) {
  	k = event.which

  	console.log('keydown - not implemented');
  	switch (GAME_STATE) {
  	  } // end switch GAME_STATE
  });

  $(document).bind('keyup', function(event) {
  	k = event.which
//  	console.log('keyup - not implemented');
  });
});
