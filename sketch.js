let game, locked;

function setup() {
  createCanvas(600, 600);
  textAlign(CENTER, CENTER);
  ellipseMode(CORNER);
  textFont("courier", 150);
  strokeWeight(6);
  render(game = new TicTacToe(this));
  loadAI(ai, 'X');
}

function loadAI(strategy, mark) {
  this.ai = strategy;
  this.ai.mark = mark;
  console.log(strategy.meta);
  if (this.ai.mark === 'X') {
    game.update(strategy.genes[0]);
    render(game);
  }
}

function mouseReleased() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    if (!locked) {
      locked = game.updateOnClick(mouseX, mouseY);
      render(game);
    }
    if (this.ai && !locked) {
      locked = true;
      setTimeout(() => {
        let state = game.state.join('');
        let next = this.ai.genes[baseToDec(state)];
        locked = game.update(next);
        render(game);
      }, 500);
    }
  }
}

function render(game) {

  let { state, cellSize, values } = game;

  game.render(true);

  background(255);
  stroke(0); // draw board
  line(cellSize, 0, cellSize, height);
  line(cellSize * 2, 0, cellSize * 2, height);
  line(0, cellSize, width, cellSize);
  line(0, cellSize * 2, width, cellSize * 2);

  fill(0);
  stroke(0);
  textSize(150); // draw moves
  for (let i = 0; i < state.length; i++) {
    let x = (i % 3) * cellSize;
    let y = floor(i / 3) * cellSize;
    text(values[state[i]], x + cellSize / 2, y + cellSize / 2);
  }

  if (game._winner) { // draw winner
    let pts, { position, mark, draw } = game._winner;
    if (!draw) {
      pts = [
        position[0] % 3, floor(position[0] / 3),
        position[2] % 3, floor(position[2] / 3)
      ].map((p) => p * cellSize + cellSize / 2);
      line(...pts);
    }

    textSize(85);
    fill(200, 0, 0);
    text(draw ? 'draw' : mark + "s win", width / 2, height / 2 + 75);
  }
}

function baseToDec(str, base = 3) {
  return parseInt(str, base);
}