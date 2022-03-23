// https://medium.com/swlh/tic-tac-toe-and-deep-neural-networks-ea600bc53f51

const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');

(async function main() {
  let model = getModel();

  // let history = simulateGame();
  // let board = movesToBoard(history.slice(0,4));
  // let prediction = model.predict(tf.tensor(board,[1,9]));
  // console.log(prediction.dataSync());
  // return;

  let games = simulateGames(1000);
  gameStats(games);
  let [XTrain, XTest, yTrain, yTest] = gamesToWinLossData(games);
  // XTrain.forEach((x, i) => console.log(stringify(x) + '\n w='
  //   + Array.from(yTrain[i].dataSync()).join('') + '\n'));
  await model.fit(tf.stack(XTrain), tf.stack(yTrain), {
    validationData: { XTest, yTest },
    epochs: 10, //100
    batchSize: 1000//100
  });
  //model.predict(tf.tensor());
  // let history = simulateGame();
  // console.log(history);
  // let board = movesToBoard(history.slice(0,4));

  console.log('done fitting');// model.predict(tf.stack(initBoard())));
  let games2 = simulateGames(3, model); // player1
  gameStats(games2);
})();


function bestMove(board, model, player, rnd = 0) {
  let scores = [];
  let moves = getMoves(board);
  moves.forEach(move => {
    let future = board.slice();
    future[move] = player;
    let prediction = model.predict(tf.tensor(future,[1,9])).dataSync();
    let winPrediction, lossPrediction;
    if (player == 1) {
      winPrediction = prediction[1];
      lossPrediction = prediction[2];
    }
    else {
      winPrediction = prediction[2];
      lossPrediction = prediction[1];
    }
    let drawPrediction = prediction[0];
    if (winPrediction - lossPrediction > 0) {
      scores.push(winPrediction - lossPrediction)
    }
    else {
      scores.push(drawPrediction - lossPrediction);
    }
  });
  //console.log(scores);
  
  //Choose the best move with a random factor
  let bestMoves = scores.sort().reverse();
  //console.log('bestMoves'+for);
  for (let i = 0; i < bestMoves.length; i++) {
    if (rand() * rnd < 0.5) {
      return moves[bestMoves[i]];
    }    
  }
  return moves[randi(moves.length)];
}

/*# Get best next move for the given player at the given board position
def bestMove(board, model, player, rnd=0):
    scores = []
    moves = getMoves(board)
    
    # Make predictions for each possible move
    for i in range(len(moves)):
        future = np.array(board)
        future[moves[i][0]][moves[i][1]] = player
        prediction = model.predict(future.reshape((-1, 9)))[0]
        if player == 1:
            winPrediction = prediction[1]
            lossPrediction = prediction[2]
        else:
            winPrediction = prediction[2]
            lossPrediction = prediction[1]
        drawPrediction = prediction[0]
        if winPrediction - lossPrediction > 0:
            scores.append(winPrediction - lossPrediction)
        else:
            scores.append(drawPrediction - lossPrediction)

    # Choose the best move with a random factor
    bestMoves = np.flip(np.argsort(scores))
    for i in range(len(bestMoves)):
        if random.random() * rnd < 0.5:
            return moves[bestMoves[i]]

    # Choose a move completely at random
    return moves[random.randint(0, len(moves) - 1)]
}*/

function getModel() {
  let model = tf.sequential();
  model.add(tf.layers.dense({ units: 200, activation: 'relu', inputShape: [9] }));
  model.add(tf.layers.dropout(0.2));
  model.add(tf.layers.dense({ units: 125, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 75, activation: 'relu' }));
  model.add(tf.layers.dropout(0.1));
  model.add(tf.layers.dense({ units: 25, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
  model.compile({ optimizer: 'rmsprop', loss: 'categoricalCrossentropy', metrics: 'acc' });
  return model;
}

function gamesToWinLossData(games) {
  let X = [];
  let y = []
  games.forEach(game => {
    let winner = getWinner(movesToBoard(game));
    for (let i = 0; i < game.length; i++) {
      let state = movesToBoard(game.slice(0, i + 1));
      X.push(state);
      y.push(winner);
    }
  });

  X = X.map(e => tf.tensor(e));
  y = y.map(e => tf.oneHot(e, 3));

  let trainNum = Math.floor(X.length * 0.8);
  return [
    X.slice(0, trainNum),
    X.slice(trainNum),
    y.slice(0, trainNum),
    y.slice(trainNum)
  ];
}

// let games = simulateGames(10000);
// gameStats(games);
// gameStats(games, 2);

function initBoard() {
  return [0, 0, 0, 0, 0, 0, 0, 0, 0];
}

/*
   returns a list of valid moves for a given board
 */
function getMoves(board) {
  let open = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 0) open.push(i);
  }
  return open;
}

/*   
   returns state of the board
    -1 (the game is not over)
    0 (the game is a draw)
    1 (‘X’ wins)
    2 (‘O’ wins)
*/
function getWinner(board) {
  let s = board;
  if (s[0] === 1 && s[0] == s[1] && s[1] == s[2]) return 1;
  else if (s[3] === 1 && s[3] == s[4] && s[4] == s[5]) return 1;
  else if (s[6] === 1 && s[6] == s[7] && s[7] == s[8]) return 1;

  else if (s[0] === 1 && s[0] == s[3] && s[0] == s[6]) return 1;
  else if (s[1] === 1 && s[1] == s[4] && s[1] == s[7]) return 1;
  else if (s[2] === 1 && s[2] == s[5] && s[2] == s[8]) return 1;

  else if (s[0] === 1 && s[0] == s[4] && s[4] == s[8]) return 1;
  else if (s[2] === 1 && s[2] == s[4] && s[4] == s[6]) return 1;

  if (s[0] === 2 && s[0] == s[1] && s[1] == s[2]) return 2;
  else if (s[3] === 2 && s[3] == s[4] && s[4] == s[5]) return 2;
  else if (s[6] === 2 && s[6] == s[7] && s[7] == s[8]) return 2;

  else if (s[0] === 2 && s[0] == s[3] && s[0] == s[6]) return 2;
  else if (s[1] === 2 && s[1] == s[4] && s[1] == s[7]) return 2;
  else if (s[2] === 2 && s[2] == s[5] && s[2] == s[8]) return 2;

  else if (s[0] === 2 && s[0] == s[4] && s[4] == s[8]) return 2;
  else if (s[2] === 2 && s[2] == s[4] && s[4] == s[6]) return 2;

  return getMoves(board).length ? -1 : 0;
}

function printBoard(board) {
  let disp = board.map(s => s ? (s === 1 ? 'X' : 'O') : '-');
  console.log(disp.slice(0, 3).join(' '));
  console.log(disp.slice(3, 6).join(' '));
  console.log(disp.slice(6, 9).join(' '));
}

function stringify(board) {
  let disp = board.map(s => s ? (s === 1 ? 'X' : 'O') : '-');
  return disp.slice(0, 3).join(' ') + '\n'
    + disp.slice(3, 6).join(' ') + '\n'
    + disp.slice(6, 9).join(' ');
}

function simulateGames(num, p1, p2) {
  let games = [];
  for (let i = 0; i < num; i++) {
    games.push(simulateGame(p1, p2));
  }
  return games;
}

// returns 'history'
function simulateGame(p1, p2, rnd = 0, opts = {}) {
  let dbug = opts.dbug;
  let history = [], board = initBoard(), player = 1;
  while (getWinner(board) === -1) {
    let move = -1;
    if (p1 && player === 1) {
      move = bestMove(board, p1, player, rnd);
    }
    else if (p2 && player === 2) {
      move = bestMove(board, p2, player, rnd);
    }
    else {
      let moves = getMoves(board);
      move = moves[randi(moves.length)];
    }
    board[move] = player;
    if (dbug) printBoard(board);
    history.push([player, move]);
    player = player === 1 ? 2 : 1;
  }
  return history;
}

function movesToBoard(moves) {
  let board = initBoard();
  moves.forEach(([player, move]) => board[move] = player);
  return board;
}

function gameStats(games, player = 1) {
  let stats = { win: 0, loss: 0, draw: 0 };
  games.forEach(game => {
    let result = getWinner(movesToBoard(game));
    if (result === -1) return;
    if (result === player) {
      stats.win += 1;
    }
    else if (result === 0) {
      stats.draw += 1;
    }
    else {
      stats.loss += 1;
    }
  });
  let num = games.length;
  console.log(`Results for player ${player}:`);
  console.log(`  Wins: ${stats.win} ${toPer(stats.win / num)}%`);
  console.log(`  Loss: ${stats.loss} ${toPer(stats.loss / num)}%`);
  console.log(`  Draw: ${stats.draw} ${toPer(stats.draw / num)}%`);
}

function toPer(num) {
  return (num * 100).toFixed(1);
}


/*
def gameStats(games, player=1):
    stats = {"win": 0, "loss": 0, "draw": 0}
    for game in games:
        result = getWinner(movesToBoard(game))
        if result == -1:
            continue
        elif result == player:
            stats.win += 1
        elif result == 0:
            stats.draw += 1
        else:
            stats.loss += 1
    
    winPct = stats.win / len(games) * 100
    lossPct = stats.loss / len(games) * 100
    drawPct = stats.draw / len(games) * 100
 
    print("Results for player %d:" % (player))
    print("Wins: %d (%.1f%%)" % (stats.win, winPct))
    print("Loss: %d (%.1f%%)" % (stats.loss, lossPct))
    print("Draw: %d (%.1f%%)" % (stats.draw, drawPct))
 
def simulateGame(p1=None, p2=None, rnd=0):
    history = []
    board = initBoard()
    playerToMove = 1
    
    while getWinner(board) == -1:
        
        # Chose a move (random or use a player model if provided)
        move = None
        if playerToMove == 1 and p1 != None:
            move = bestMove(board, p1, playerToMove, rnd)
        elif playerToMove == 2 and p2 != None:
            move = bestMove(board, p2, playerToMove, rnd)
        else:
            moves = getMoves(board)
            move = moves[random.randint(0, len(moves) - 1)]
        
        # Make the move
        board[move[0]][move[1]] = playerToMove
        
        # Add the move to the history
        history.append((playerToMove, move))
        
        # Switch the active player
        playerToMove = 1 if playerToMove == 2 else 2
        
    return history
    */

function randi() {
  return Math.floor(rand(...arguments));
}

function rand() {
  let crand = Math.random();
  if (!arguments.length) return crand;
  if (Array.isArray(arguments[0])) {
    let arr = arguments[0];
    return arr[Math.floor(crand * arr.length)];
  }
  return arguments.length === 1 ? crand * arguments[0] :
    crand * (arguments[1] - arguments[0]) + arguments[0];
}