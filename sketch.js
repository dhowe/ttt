let game, locked, timer;

function setup() {
  createCanvas(600, 600).doubleClicked(reset);
  textAlign(CENTER, CENTER);
  ellipseMode(CORNER);
  textFont("courier", 150);
  strokeWeight(6);
  reset();
}

function reset() {
  clearTimeout(timer);
  render(game = new TicTacToe(this));
  //game.state = '002011000'.split('');
  let bcs = game.baseCaseData.stateToBaseMap['002011000'];//210010000
  console.log(bcs.caseArray[0] + ' == ' + game.baseCaseData.baseCases[27] + ' -> ' + strategies[1].genes[27]);
  console.log(strategies[0].testedStates.length + ' tested states [X]');
  console.log(strategies[1].testedStates.length + ' tested states [O]');
  loadAI(strategies[Math.random() < .5 ? 0 : 1]);
}

function loadAI(strategy) {
  this.ai = strategy;
  console.log('LOADED', this.ai.mark);
  if (this.ai.mark === 'X') game.update(this.ai.genes[0]);
  locked = false;
  render(game);
}

function mouseReleased() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    if (!locked) {
      locked = game.updateOnClick(mouseX, mouseY);
      render(game);
    }
    if (this.ai && !locked) {
      locked = true;
      timer = setTimeout(nextMove, 500);
    }
  }
}

function nextMove() {
  let next, state = game.state.join("");

  let { transforms, stateToBaseMap } = game.baseCaseData;
  let { caseArray, geneIndex } = stateToBaseMap[state];
  let stateIndex = caseArray.indexOf(state);
  let baseCase = caseArray[0];
  let onBaseCase = stateIndex === 0;

  // make move on base-case state
  let baseCaseMove = this.ai.genes[geneIndex];
  if (typeof baseCaseMove === 'undefined') throw Error("No gene for base case: " + baseCase);

  // caseArray => allCases ?

  if (onBaseCase) {
    next = baseCaseMove;
    console.log(baseCase + '->' + next + '/' + next);
  }
  else {
    // make move on base-case state
    let baseCaseArr = baseCase.split('');
    if (baseCaseArr[baseCaseMove] !== '0') {
      throw Error('Illegal move to filled space: ' + baseCaseArr[baseCaseMove]);
    }

    baseCaseArr[baseCaseMove] = (this.ai.mark === 'X' ? '1' : '2');
    let updatedBaseCaseState = baseCaseArr.join('');
    let nextRealState = transformBaseCase(updatedBaseCaseState, transforms[stateIndex]);

    let diffIdx = differingIndexes(state, nextRealState);
    if (diffIdx.length !== 1) {
      throw Error('invalid state: ' + state + ' !=(-1) ' + nextRealState);
    }
    next = diffIdx[0];
    console.log(baseCase + '->' + baseCaseMove + '/' + next);
  }
  if (typeof next === 'undefined') {
    throw Error('no next for: ' + state + ' base=' + baseCase);
  }

  locked = game.update(next);
  render(game);
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

function differingIndexes(original, updated) {
  //console.log('differingIndexes', a, b);
  if (!original) throw Error('No old state');
  if (!updated) throw Error('No updated state');

  let diffs = [];
  for (let i = 0; i < original.length; i++) {
    if (original[i] !== updated[i]) diffs.push(i);
  }
  return diffs;
}
