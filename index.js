const TicTacToe = require('./tictactoe');

let popsize = 500;
let pMutate = 0.001;
let pReplicate = 0.10
let pCrossover = 0.15;
let maxGenerations = 1000;
let idgen = 0, numGames = 0;

(function main() {
  if (0) {
    //initPop();
    //play(...initPop().slice(0, 2), true);
    popsize = 4;
    let pop = [
      { genes: ('0'.repeat(10)).split(''), fitness: .1, id: 0 },
      { genes: ('1'.repeat(10)).split(''), fitness: .2, id: 1 },
      { genes: ('2'.repeat(10)).split(''), fitness: .4, id: 2 },
      { genes: ('3'.repeat(10)).split(''), fitness: .8, id: 3 }
    ];
    let result = [0, 0, 0, 0];
    for (let i = 0; i < 15000; i++) {
      let win = fpselect(pop, 1.5);
      result[win.id]++;
    }
    return;
  }
  let gen = 0, matrix, population = initPop();
  while (++gen <= maxGenerations) {
    matrix = playAll(population);
    let done = assessFitness(population, matrix, gen);
    if (done || gen === maxGenerations) break;
    evolve(population);
  }
  logResult(population, gen, 'best.js');
})();


function evolve(pop) {
  let lastGen = pop.slice(); // copy
  pop.length = 0; // clear 

  // replicate
  let numSurvivors = Math.floor(popsize * pReplicate);
  pop.push(...lastGen.slice(0, Math.max(1, numSurvivors)));

  let fitnessSum = lastGen.reduce((a, c) => a + c.fitness, 0);
  while (pop.length < popsize) {

    let dad, mom = fpselect(lastGen, fitnessSum);
    do { // make sure dad/mom are different
      dad = fpselect(lastGen, fitnessSum);
    } while (dad === mom);

    // reproduce
    let child = { fitness: 0, id: ++idgen, genes: [] };
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
        // -1 ?
        let tmp = child.genes[i];
        child.genes[i] = randomMove(i);
        //console.log('mutate:',tmp,child.genes[i]);
      }
    }

    pop.push(child);
  }
}

function playAll(pop, dbug) {
  let winMatrix = [...Array(popsize)].map(() => [...Array(popsize)]);
  for (let j = 0, c = 0; j < popsize; j++) {
    for (let i = 0; i < popsize; i++) {
      if (i == j) continue;
      let winner = play(pop[j], pop[i], dbug);
      winMatrix[j][i] = winner.mark;
      numGames++;
      dbug && console.log((c++) + ")", j + '(X) vs ' + i + '(O) =>',
        (winner.mark === 'X' ? j + '(X)' : i + '(O)') + ' wins ' + hash(winner));
      //return winMatrix;
    }
  }
  return winMatrix;
}

function play(a, b, dbug) {
  a.mark = 'X';
  b.mark = 'O';
  let game = new TicTacToe();
  let winMove, i, player = a;
  for (i = 0; i < 9; i++) {
    winMove = move(game, player, dbug);
    if (winMove) {
      let winner = winMove;
      if (!winMove.draw) {
        winner = winMove.mark === a.mark ? a : b;
      }
      return winner;
    }
    player = (player === a) ? b : a;
  }
  game.render(1);
  throw Error('invalid state:' + game);
}

function move(game, player, dbug) {
  let state = game.state.join("");
  let arrIndex = baseToDec(state);
  let next = player.genes[arrIndex];
  //let mark = game.values[game.turn];
  dbug && console.log((arrIndex ? '' : '\n') + player.mark
    + " moves to " + next + ' ' + (!game.state[next] ? '' : '[illegal]'));

  let winner = game.update(next);
  //if (winner) console.log('Winner:', winner);
  game.render(dbug);
  return winner;
}

function hash(cand) {
  return '[#' + cand.genes.slice(0, 5).join('')
    + cand.genes.slice(-5).join('') + ']';
}

function baseToDec(str, base = 3) {
  return parseInt(str, base);
}

function decToBase(num, base = 3, strlen = 9) {
  let dec = num.toString(base); // convert to base
  while (dec.length < strlen) dec = "0" + dec; // pad
  return dec;
}

function assessFitness(pop, matrix, gen) {
  let mark, wins = Array(popsize).fill(0);
  let draws = Array(popsize).fill(0);
  let losses = Array(popsize).fill(0);
  for (let j = 0; j < popsize; j++) {
    for (let i = 0; i < popsize; i++) {
      mark = matrix[j][i];
      if (mark == "X") {
        wins[j]++;
        losses[i]++;
      }
      else if (mark == "O") {
        wins[i]++;
        losses[j]++;
      }
      else if (mark == "*") {
        draws[i]++;
        draws[j]++;
      }
    }
  }
  //let classes = pop.map((q,i) => q.losses === losses[i]).length;
  let numGames = ((popsize - 1) * 2);
  pop.forEach((p, i) => {
    //let fitness = (numGames - losses[i]) / numGames;
    let numWithSameRecord = pop.filter(q => q.losses === losses[i]).length;
    let fitness = (1 - losses[i] / numGames) * (1 / numWithSameRecord);
    p.fitness = fitness;
    p.wins = wins[i];
    p.draws = draws[i];
    p.losses = losses[i];
  });
  pop.sort((a, b) => b.fitness - a.fitness);

  logPop(pop, matrix, gen);

  return (pop[0].fitness === 1); // done ?
}

function matrixInfo(matrix) {
  let info = '\n\n    ' + [...Array(Math.min(10, popsize)).keys()].join(' ')
    + (popsize > 10 ? ' ...' : '') + '\n   ' + '-'.repeat(popsize * 2) + '\n';
  for (let i = 0; i < popsize; i++) {
    info += (i < 10 ? ' ' + i : i) + ' |' +
      matrix[i].map(r => (r ? r : "-")).join(" ") + '\n';
  }
  return info;
}

function padl(num, len = (popsize > 99 ? 3 : 2), chr = '0') {
  let res = num + '';
  while (res.length < len) res = chr + res;
  return res;
}

function padr(str, len = (popsize > 99 ? 3 : 2), chr = ' ') {
  let res = str + '';
  while (res.length < len) res += chr;
  return res;
}

function popInfo(pop) {
  let pad1 = idgen.toString().length;
  return pop.reduce((acc, c) => acc + `#${padr(c.id, pad1)} `
    + `(${c.fitness.toFixed(3)}) ${c.wins} wins,`
    + ` ${c.losses} losses, ${c.draws} draws\n`, '');
}

function logResult(population, num, fname = 'best.js') {
  let pop = population.slice(0, Math.min(5, popsize));
  console.log('-'.repeat(50) + '\nAfter '
    + `${numGames.toLocaleString()}`
    + ` games and ${num} generations:\n`);
  console.log(`RESULT\n${popInfo(pop)}`);
  if (fname) {
    let best = population[0];
    best.meta = {
      generations: num,
      population: popsize,
      date: new Date(),
      id: best.id,
      wins: best.wins,
      draws: best.draws,
      losses: best.losses,
      fitness: best.fitness
    }
    require('fs').writeFileSync(fname, 'ai=' + JSON.stringify(best));
    console.log('\nWrote best (#' + pop[0].id + ') to \'' + fname + '\'\n');
  }
}

function logPop(pop, matrix, generation) {
  let gamesPer = ((popsize - 1) * 2);
  process.stdout.write('Gen #' + generation + ' ('
    + numGames.toLocaleString() + ' games played)'
    + ' fitness=' + pop[0].fitness.toFixed(3) + '\r');
  if (popsize <= 10) {
    if (matrix) console.log(matrixInfo(matrix));
    console.log(`POPULATION (${popsize} players, `
      + `${gamesPer} games each)\n${popInfo(pop)}`);
  }
}

function randomMove(state10) {
  let available = [];
  let state3 = decToBase(state10).split('');
  state3.forEach((s, i) => {
    if (s === '0') available.push(i);
  });
  return available.length ? rand(available) : -1;
}

function initPop() {
  let pop = [];
  let geneLength = 3 ** 9;
  console.log(`Initializing ${popsize} individuals,`
    + ` ${geneLength} genes each`);
  for (let j = 0; j < popsize; j++) {
    let genes = new Array(geneLength); // 3^9=~19k
    for (let i = 0; i < genes.length; i++) {
      genes[i] = randomMove(i);
    }
    pop.push({ genes, fitness: 0, id: ++idgen });
  }
  return pop;
}

function tselect(pool) { // tournament selection
  let c1 = rand(pool), c2 = rand(pool);
  return c1.fitness > c2.fitness ? c1 : c2;
}

function fpselect(pool, summedFitness) { // fitness proportionate selection
  if (!summedFitness) throw Error('requires summed fitness');
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