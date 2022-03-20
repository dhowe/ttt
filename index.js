const TicTacToe = require('./tictactoe');

let popsize = 100;
let pMutate = 0.001;
let pReplicate = 0.10
let pCrossover = 0.15;
let maxGenerations = 1000;
let idgen = 0, totalGames = 0;

// NEXT: cleanup unused funcs, then debug (test not evolveing Xs or Os)
// are the draws the problem?

(function main() {
  let gen = 0, matrix, game = new TicTacToe();
  let population = initPop(game); // X,O
  while (++gen <= maxGenerations) {
    matrix = playAll(population, game);
    let done = assessFitness(population, matrix, gen);
    if (done || gen === maxGenerations) break;
    evolve(population, game);
  }
  logResult(population, gen, 'best.js');
})();

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
      let cand = { mark, genes, fitness: 0, id: ++idgen };
      if (mark === 'X') X.push(cand);
      if (mark === 'O') O.push(cand);
    }
  }
  console.log(`Created ${X.length + O.length} individuals (${X.length} Xs, ${O.length} Os)`
    + ` with ${baseCases.length} genes each`);

  return { X, O };
}

function playAll(population, game, dbug) {
  let { X, O } = population;

  // console.log(X.map(x => x.id));
  // console.log(O.map(x => x.id));

  //  let winMatrix = [...Array(X.length)].map(() => [...Array(O.length)]);
  let winMatrix = [...Array(popsize)].map(() => [...Array(popsize)]);
  for (let i = 0; i < X.length; i++) {
    for (let j = 0; j < O.length; j++) {
      //console.log(i,j);
      //console.log(X[i].id +' vs ' +O[j].id);
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

function randomMove(state3) {
  let open = [];
  for (let i = 0; i < state3.length; i++) {
    if (state3[i] === '0') open.push(i);
  }
  return open.length ? rand(open) : -1;
}

function evolve(population, game) {

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
      let child = { fitness: 0, id: ++idgen, genes: [], mark: mom.mark };
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

function assessFitness(population, matrix, gen) {
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
    + ` ${c.losses} losses, ${c.draws} draws (${c.mark})\n`, '');
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