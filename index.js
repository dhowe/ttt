const TicTacToe = require('./tictactoe');

let popsize = 1000;
let pMutate = 0.001;
let pReplicate = 0.10
let pCrossover = 0.15;
let maxGenerations = 1000;
let idgen = 0, totalGames = 0;

(function test() {
  let gen = 0, game = new TicTacToe();
  let population = initPop(game); // X,O
  let bcs = game.baseCaseData.baseCases;
  let validForO = [], validForX = [];
  for (let i = 0; i < bcs.length; i++) {
    let numX = bcs[i].split('').filter(t => t === '1').length;
    let numO = bcs[i].split('').filter(t => t === '2').length;
    if (numX - numO === 1) validForO.push(bcs[i]);
    if (numX - numO === 0) validForX.push(bcs[i]);
  }
  console.log(validForO.length, validForX.length);
  return;

  assessFitness(population, game, gen);
  let tests = population.O[0].testedStates;
  let baseCases = {};
  for (let i = 0; i < tests.length; i++) {
    let numX = tests[i].split('').filter(t => t === '1').length;
    let numO = tests[i].split('').filter(t => t === '2').length;
    if (numX === 2 && numO === 1) {
      console.log(tests[i]);
    }
    let bc = game.baseCaseData.stateToBaseMap[tests[i]].caseArray[0];
    //  console.log(tests[i],bc);
    if (!baseCases[bc]) baseCases[bc] = [];
    baseCases[bc].push(tests[i]);
  }
  console.log(Object.keys(baseCases).length + '/' + 765);
  //logResult(population, gen);
});

(function main() {
  let gen = 0, game = new TicTacToe();
  let population = initPop(game); // X,O
  while (++gen <= maxGenerations) {
    let done = assessFitness(population, game, gen);
    if (done || gen === maxGenerations) break;
    evolve(population, game, gen);
  }
  logResult(population, gen, 'best.js');
})();

(function mainOld() {
  let gen = 0, matrix, game = new TicTacToe();
  let population = initPop(game); // X,O
  while (++gen <= maxGenerations) {
    matrix = playOthers(population, game);
    let done = assessFitnessViaMatrix(population, gen, matrix);
    if (done || gen === maxGenerations) break;
    evolve(population, game);
  }
  logResult(population, gen, 'best.js');
});

function assessFitness(population, game, gen, dbug) {

  ['X', 'O'].forEach(mark => population[mark].forEach(player => {
    let allGames = [game.copy()];
    player.testedStates.length = 0;
    playall(allGames, allGames[0], player, dbug);
    assessPerformance(player, allGames, dbug);
  }));

  let { X, O } = population;
  // TODO: take into account wins?
  X.sort((a, b) => b.fitness === a.fitness && a.fitness >= 1 ? (1 + (b.wins / b.gamesPlayed)) - (1 + (a.wins / a.gamesPlayed)) : b.fitness - a.fitness);
  //O.sort((a, b) => b.fitness === a.fitness ? (b.wins/b.gamesPlayed) - (a.wins/a.gamesPlayed) : b.fitness - a.fitness);
  //X.sort((a, b) => b.fitness - a.fitness);
  O.sort((a, b) => b.fitness - a.fitness);
  logPop(X, O, 0, gen);
  return (X[0].fitness >= 1 && O[0].fitness >= 1); // done ?
}

function assessPerformance(player, games, dbug) {
  let mark = player.mark, opmark = (mark === 'X' ? 'O' : 'X');
  player.draws = games.filter(g => g._winner.draw).length;
  player.wins = games.filter(g => g._winner.mark === mark).length;
  player.losses = games.filter(g => g._winner.mark === opmark).length;
  player.gamesPlayed = player.wins + player.draws + player.losses;
  player.fitness = (player.wins + player.draws) / player.gamesPlayed;
  totalGames += player.gamesPlayed;
  if (dbug) console.log(wins + ' wins, ' + losses + ' losses, ' + draws
    + ' draws -> fitness=' + player.fitness.toFixed(3));
}

function playall(all, game, player, dbug) {
  let mark = player.mark;
  let nextMark = mark === 'X' ? 'O' : 'X';
  if (game._winner) throw Error('invalid');
  if (game.values[game._turn] === mark) { // player
    player.testedStates.push(game.state.join(''));
    game.move(player, dbug);
  }
  if (!game._winner) {
    let nexts = openMoves(game.state.join(''));
    for (let i = 0; i < nexts.length; i++) {
      let newGame = game.copy();
      all.push(newGame);
      newGame.moveTo(nextMark, nexts[i], dbug); // tree
      if (!newGame._winner) {
        playall(all, newGame, player, dbug);
      }
    }
  }
}

function initPop(game) {
  let X = [], O = [];
  let baseCases = game.baseCaseData.baseCases;
  let nums = [Math.floor(popsize / 2), Math.ceil(popsize / 2)];
  for (let k = 0; k < nums.length; k++) {
    let mark = (k == 0) ? 'X' : 'O';
    for (let j = 0; j < nums[k]; j++) {
      let genes = new Array(baseCases.length);
      for (let i = 0; i < genes.length; i++) {
        genes[i] = randomMove(baseCases[i]);
      }
      let cand = { mark, genes, fitness: 0, id: ++idgen, testedStates: [] }; // dbug only
      if (mark === 'X') X.push(cand);
      if (mark === 'O') O.push(cand);
    }
  }
  console.log(maxGenerations + ' maximum generations');
  console.log(`${X.length + O.length} individuals`
    + ` with ${baseCases.length} genes each`);

  return { X, O };
}

function playOthers(population, game, dbug) {
  let { X, O } = population;
  let winMatrix = [...Array(popsize)].map(() => [...Array(popsize)]);
  for (let i = 0; i < X.length; i++) {
    for (let j = 0; j < O.length; j++) {
      let winner = play(game, X[i], O[j], dbug);
      winMatrix[i][j + X.length] = winner.mark;
      totalGames++;
    }
  }
  //console.log(matrixInfoOld(winMatrix));
  return winMatrix;
  //console.log(winMatrix);
}

function play(game, a, b, dbug) {
  //console.log('play',a.id, b.id);
  game.reset();
  let winMove, i, player = a;
  for (i = 0; i < 9; i++) {
    winMove = game.move(player, dbug);
    if (winMove) {
      let winner = winMove;
      if (!winMove.draw) {
        winner = winMove.mark === a.mark ? a : b;
      }
      return winner;
    }
    player = (player === a) ? b : a;
  }
  game.render(dbug);
  throw Error('invalid state:' + game);
}

function openMoves(state3) {
  let open = [];
  for (let i = 0; i < state3.length; i++) {
    if (state3[i] === '0') open.push(i);
  }
  return open;
}

function randomMove(state3) {
  let open = openMoves(state3);
  return open.length ? rand(open) : -1;
}

function evolve(population, game, gen) {

  let lastGens = [population.X.slice(), population.O.slice()]; // copy

  Object.values(population).forEach((pop, i) => {

    //if (i === 0) return; // don't evolve X's

    let lastGen = lastGens[i];
    pop.length = 0; // clear 

    // replicate
    let numSurvivors = Math.floor(lastGen.length * pReplicate);
    pop.push(...lastGen.slice(0, Math.max(1, numSurvivors)));

    let fitnessSum = lastGen.reduce((a, c) => a + c.fitness, 0);
    while (pop.length < lastGen.length) {

      let dad, mom = fpselect(lastGen, fitnessSum);
      do { // make sure dad/mom are different
        dad = fpselect(lastGen, fitnessSum);
      } while (dad === mom);

      // reproduce
      let child = {
        birth: gen,
        fitness: 0,
        id: ++idgen,
        genes: [],
        mark: mom.mark,
        testedStates: []  // dbug only
      };
      let parents = [mom, dad];
      let parentIdx = randi(parents.length);

      // with multiple crossover points (pCrossover)
      for (let i = 0; i < parents[parentIdx].genes.length; i++) {
        child.genes.push(parents[parentIdx].genes[i]);
        if (rand() < pCrossover) {
          parentIdx = (parentIdx + 1) % parents.length;
        }
      }

      if (child.genes.length !== mom.genes.length) {
        throw Error('invalid state'); // double-check
      }

      // mutate
      for (let i = 0; i < child.genes.length; i++) {
        if (child.genes[i] > -1 && rand() < pMutate) {
          child.genes[i] = randomMove(game.baseCaseData.baseCases[i]); // ? ok
        }
      }
      pop.push(child);
    }
  });

  let total = Object.values(population).reduce((acc, p) => acc + p.length, 0);
  if (total !== popsize) throw Error('double-check');
}

function assessFitnessViaMatrix(population, gen, matrix) {
  let { X, O } = population;

  for (let i = 0; i < X.length; i++) { // zero out vars
    X[i].wins = X[i].losses = X[i].draws = X[i].gamesPlayed = 0;
    for (let j = X.length; j < X.length + O.length; j++) {
      let po = O[j - X.length];
      po.wins = po.losses = po.draws = po.gamesPlayed = 0;
    }
  }

  for (let i = 0; i < X.length; i++) {
    let px = X[i];
    for (let j = X.length; j < X.length + O.length; j++) {
      let po = O[j - X.length];
      po.gamesPlayed++;
      px.gamesPlayed++;
      if (matrix[i][j] === 'X') {
        px.wins++;
        po.losses++;
      }
      else if (matrix[i][j] === 'O') {
        po.wins++;
        px.losses++;
      }
      else if (matrix[i][j] === '*') {
        px.draws++;
        po.draws++;
      }
    }
  }
  X.forEach(p => p.fitness = (p.gamesPlayed - p.losses) / p.gamesPlayed);
  X.sort((a, b) => b.fitness - a.fitness);

  O.forEach(p => p.fitness = (p.gamesPlayed - p.losses) / p.gamesPlayed);
  O.sort((a, b) => b.fitness - a.fitness);

  logPop(X, O, matrix, gen);

  return (X[0].fitness === 1 && O[0].fitness === 1); // done ?
}

function matrixInfo(Xs, Os, matrix) {
  //console.log('logMatrix');
  let info = '\n\n     ' + [...Array(Math.min(10, Os.length)).keys()].join(' ')
    + (popsize > 10 ? ' ...' : '') + '\n    ' + '-'.repeat(Os.length * 2 + 1) + '\n';
  for (let i = 0; i < Xs.length; i++) {
    info += (i < 10 ? ' ' + i : i) + ' |';
    for (let j = Xs.length; j < Xs.length + Os.length; j++) {
      info += ' ' + matrix[i][j];
    }
    info += '\n';
  }
  return info;
}

function padr(str, len = (popsize > 99 ? 3 : 2), chr = ' ') {
  let res = str + '';
  while (res.length < len) res += chr;
  return res;
}

function popInfo(p) {
  let pad1 = idgen.toString().length;
  let best = p.slice(0, Math.min(p.length, 3));
  return best.reduce((acc, c) => acc + `#${padr(c.id, pad1)} `
    + `(${c.fitness.toFixed(3)}) ${c.wins} wins,`
    + ` ${c.losses} losses, ${c.draws} draws (${c.mark}), ${c.testedStates.length} tests\n`, '');
}

function logResult(population, num, fname = 'best.js') {
  let { X, O } = population;
  // let totalWins = X.reduce((acc, c) => acc + c.wins, 0) + O.reduce((acc, c) => acc + c.wins, 0);
  // let totalLosses = X.reduce((acc, c) => acc + c.losses, 0) + O.reduce((acc, c) => acc + c.losses, 0);
  // let totalDraws = X.reduce((acc, c) => acc + c.draws, 0) + O.reduce((acc, c) => acc + c.draws, 0);
  //let pop = population.slice(0, Math.min(5, popsize));
  console.log('-'.repeat(60) + '\nAfter '
    + `${totalGames.toLocaleString()}`
    + ` games and ${num} generations:\n`);
  console.log(`RESULT\n${popInfo(X)}\n${popInfo(O)}`);
  if (fname) {
    let strategies = [X[0], O[0]];
    strategies.forEach(best =>
      best.meta = {
        testedStates: best.testedStates,
        generations: num,
        population: popsize,
        date: new Date(),
        id: best.id,
        wins: best.wins,
        draws: best.draws,
        losses: best.losses,
        fitness: best.fitness
      });
    require('fs').writeFileSync(fname, 'strategies=' + JSON.stringify(strategies));
    console.log('Wrote bests [#' + X[0].id + ',#' + O[0].id + '] to \'' + fname + '\'\n');
  }
}

function logPop(X, O, matrix, generation) {
  process.stdout.write('Gen #' + generation + ' ('
    + totalGames.toLocaleString() + ' games played)'
    + ' fitness=' + X[0].fitness.toFixed(3) + '/'
    + O[0].fitness.toFixed(3) + '\r');
  if (popsize <= 10) {// || generation===1) {
    if (matrix) console.log(matrixInfo(X, O, matrix));
    console.log(`POP (${popsize} players, `
      + `Xs played ${X[0].gamesPlayed} games, `
      + `Os played ${O[0].gamesPlayed})\n`);
    console.log(popInfo(X));
    console.log(popInfo(O) + '\n');
  }
}

function tselect(pool) { // tournament selection
  let c1 = rand(pool), c2 = rand(pool);
  return c1.fitness > c2.fitness ? c1 : c2;
}

function fpselect(pool, summedFitness) { // fitness proportionate selection
  if (typeof summedFitness === 'undefined') throw Error('requires summed fitness');
  let rand = Math.random()
  let res = pool.find((ele) => (rand -= (ele.fitness / summedFitness)) < 0);
  return res;
}

function pselect(pool) { // weighted random of fitness
  let sum = pool.reduce((acc, ele) => acc + ele.fitness, 0);
  let rand = Math.random() * sum; // from 0 - sum
  return pool.find((ele) => (rand -= ele.fitness) < 0);
}

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
