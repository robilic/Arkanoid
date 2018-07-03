// test.js

player = {
	x: 100,
	y: 600,
	x_size: 80,
	y_size: 16
};

b = {
	x: 100,
	y: 600,
	xv: -10,
	yv: -1
};

find_hit = function () {
    c = player.x + (player.x_size/2); // center of bat
    if (c > tx) { // ball hit left side of paddle
      console.log('left');
      b.xv = 0-Math.ceil((c-tx)/(player.x_size/10));
      b.yv = 6-b.xv;
    } else { // ball hit right side of paddle
      console.log('right');
      b.xv = Math.ceil((tx-c)/(player.x_size/10));
      b.yv = 6-b.xv;
    }
}