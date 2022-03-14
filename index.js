const TicTacToe = require('./tictactoe');

let popsize = 500;
let pMutate = 0.001;
let pReplicate = 0.10
let pCrossover = 0.15;
let maxGenerations = 1000;
let idgen = 0, numGames = 0;
let stateToBaseCases = {};
let baseCases = [];

let baseCaseTransforms = ['', 'r', 'rr', 'rrr', 'f', 'fr', 'frr', 'frrr'];

(function main() {
  runGA();
})();

function runGA() {
  let gen = 0, matrix, population = initPop();
  while (++gen <= maxGenerations) {
    matrix = playAll(population);
    let done = assessFitness(population, matrix, gen);
    if (done || gen === maxGenerations) break;
    evolve(population);
  }
  logResult(population, gen, 'best.js');
};

function initPop() {

  let baseCaseArray = parseUniqueCases();
  baseCaseArray.forEach(bca => {
    let { caseArray, geneIndex } = bca;
    caseArray.forEach(state => stateToBaseCases[state] = bca);
    baseCases[geneIndex] = caseArray[0];
  });

  console.log(Object.entries(stateToBaseCases).length + ' total states');
  console.log(baseCases.length + ' genes per individual');
  
  let population = [];
  console.log(`Initializing ${popsize} individuals,`
    + ` ${baseCases.length} genes each`);
  for (let j = 0; j < popsize; j++) {
    let genes = new Array(baseCases.length); // =765
    for (let i = 0; i < genes.length; i++) {
      genes[i] = randomMove(baseCases[i]);
    }
    population.push({ genes, fitness: 0, id: ++idgen });
  }
  return population;
}

function differingIndexes(a, b) {
  //console.log('differingIndexes', a, b);
  let diffs = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diffs.push(i);
  }
  return diffs;
}

function move(game, player, dbug) {

  let state = game.state.join("");
  let { caseArray, geneIndex } = stateToBaseCases[state];
  let stateIndex = caseArray.indexOf(state);
  let onBaseCase = stateIndex === 0;
  
  // make move on base-case state
  let baseCaseMove = player.genes[geneIndex];
  
  let next;
  if (onBaseCase) {
    next = baseCaseMove;
  }
  else {

    // make move on base-case state
    let baseCaseArr = caseArray[0].split('');
    if (baseCaseArr[baseCaseMove] !== '0') throw Error('Illegal move to filled spac: '
      + baseCaseArr[baseCaseMove]);

    baseCaseArr[baseCaseMove] = (player.mark === 'X' ? '1' : '2');
    let updatedBaseCaseState = baseCaseArr.join('');
    let nextRealState = transformBaseCase(updatedBaseCaseState, baseCaseTransforms[stateIndex]);

    let diffIdx = differingIndexes(state, nextRealState);
    if (diffIdx.length !== 1) throw Error('invalid state: '
      + state + ' !=(-1) ' + nextRealState);

    next = diffIdx[0];
  }
  //dbug && console.log(game.state[next]);
  dbug && console.log((geneIndex ? '' : '') + player.mark
    + " moves to " + next + ' ' + (game.state[next] === 0 ? '' : '[illegal]'));

  let winner = game.update(next);
  game.render(dbug);

  return winner;
}

function initPopLessOld(baseCaseArray) {
  // initialize population with gene template
  let population = [];
  console.log(`Initializing ${popsize} individuals,`
    + ` ${baseCases.length} genes each`);
  for (let j = 0; j < popsize; j++) {
    let genes = new Array(baseCases.length); // 3^9=~19k
    for (let i = 0; i < genes.length; i++) {
      genes[i] = randomMove(baseCases[i]);
    }
    population.push({ genes, fitness: 0, id: ++idgen });
  }
  return population;
}

function randomMove(state3) {
  let open = [];
  for (let i = 0; i < state3.length; i++) {
    if (state3[i] === '0') open.push(i);
  }
  return open.length ? rand(open) : -1;
}

function sumWeights(symbol, caseStr) {
  let total = 0;
  for (let i = 0; i < caseStr.length; i++) {
    if (caseStr[i] === symbol) total += (i + 1);
  }
  return total;
}

function prodWeights(symbol, caseStr) {
  let total = 0;
  for (let i = 0; i < caseStr.length; i++) {
    if (caseStr[i] === symbol) total *= (i + 1);
  }
  return total;
}

function play(a, b, dbug) {
  //console.log(a.id, b.id, dbug);
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

function parseUniqueCases() {

  let total = 3 ** 9, states = [], baseCases = {};
  for (let i = 0; i < total; i++) states[i] = [];

  let unique = new Set();
  for (let i = 0; i < states.length; i++) {
    let state3str = decToBase(i);

    let numXs = state3str.split('1').length - 1;
    let numOs = state3str.split('2').length - 1;
    let diff = numXs - numOs;
    if (diff < 0 || diff > 1) continue; // illegal mark count

    let winners = getWinners(state3str);
    if (winners.length > 1) continue; // two winners
    if (winners[0] === '2' && numXs > numOs) continue; // O wins, then X moves
    if (winners[0] === '1' && numXs === numOs) continue; // X wins, then O moves

    // create a hash as key for each base case set
    let permutations = perms(state3str);
    let hash = permutations.slice().sort().join('-');

    // eliminiate duplicates in list of states
    //unique.clear();
    //caseStrArr.forEach(p => unique.add(p));

    // hash => array of unique states
    // if (baseCases[hash]) console.log('exists: '+hash);
    baseCases[hash] = permutations;//Array.from(unique);
  }

  function orderCases(base) {
    return [base,
      transformBaseCase(base, 'r'),
      transformBaseCase(base, 'rr'),
      transformBaseCase(base, 'rrr'),
      transformBaseCase(base, 'f'),
      transformBaseCase(base, 'fr'),
      transformBaseCase(base, 'frr'),
      transformBaseCase(base, 'frrr')]
  }

  let result = [];
  Object.entries(baseCases).forEach(([a, b], i) => {
    result.push({ caseArray: orderCases(b[0]), geneIndex: i });
  });

  //console.log(result.length, 'base cases');
  return result;
}

// returns a 765-element array with all unique cases for each base
function parseUniqueCasesBunk() {
  let total = 3 ** 9, baseCases = {};
  let unique = new Set();
  for (let i = 0; i < total; i++) {
    let state3str = decToBase(i);

    //console.log(i,state3str);
    let numXs = state3str.split('1').length - 1;
    let numOs = state3str.split('2').length - 1;
    let diff = numXs - numOs;
    if (diff < 0 || diff > 1) continue; // illegal mark count

    let winners = getWinners(state3str);
    if (winners.length > 1) continue; // two winners
    if (winners[0] === '2' && numXs > numOs) continue; // O wins, then X moves
    if (winners[0] === '1' && numXs === numOs) continue; // X wins, then O moves

    // create a hash as key for each base case set
    let caseStrArr = perms(state3str);
    let hash = caseStrArr.join('-');

    // eliminiate duplicates in list of states
    unique.clear();
    caseStrArr.forEach(p => unique.add(p));

    baseCases[hash] = Array.from(unique);
  }

  // Object.entries(baseCases).slice(0, 5).forEach
  //   (([a, b], i) => console.log(a + '\n  -> ' + b + '\n'));

  return Object.values(baseCases);
}

function transformBaseCase(state, txs) {
  let current = state;
  if (!txs.length) return state;
  for (let i = 0; i < txs.length; i++) {
    let tx = txs[i];
    if (tx === 'f') {
      current = flip(current);
    }
    if (tx === 'r') {
      current = rotate(current);
    }
  }
  return current;
}

// min sum of X-indexes, then min sum of y-indexes
// then min prod of X-indexes, then min prod of y-indexes
function sortCases(a, b) {
  let aXs = sumWeights('1', a), bXs = sumWeights('1', b);
  if (aXs !== bXs) return aXs - bXs;
  let aOs = sumWeights('2', a), bOs = sumWeights('2', b);
  if (aOs !== bOs) return aOs - bOs;
  aXs = prodWeights('1', a), bXs = prodWeights('1', b);
  if (aXs !== bXs) return aXs - bXs;
  aOs = prodWeights('2', a), bOs = prodWeights('2', b);
  return aOs - bOs;
}

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
        child.genes[i] = randomMove(baseCases[i]); // ?
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
    let fitness = (numGames - losses[i]) / numGames;
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

function rotate(state3a, dir = 'right') {
  //if (!Array.isArray(state3a)) throw Error('takes array');
  let map = [2, 5, 8, 1, 4, 7, 0, 3, 6], res = [];
  if (dir !== 'right') map.reverse();
  for (let i = 0; i < map.length; i++) {
    res[map[i]] = state3a[i];
  }
  return res.join('');
}

function flip(state3a) {
  //if (!Array.isArray(state3a)) throw Error('takes array');
  let map = [6, 7, 8, 3, 4, 5, 0, 1, 2], res = [];
  for (let i = 0; i < map.length; i++) {
    res[map[i]] = state3a[i];
  }
  return res.join('');
}

function perms(state3s) {
  let perms = [];
  let flipped = flip(state3s);
  let opts = [state3s, flipped];
  perms.push(...opts);
  for (let i = 0; i < opts.length; i++) {
    let next = opts[i];
    for (let j = 0; j < 3; j++) {
      let tmp = rotate(next);
      perms.push(tmp);
      next = tmp;
    }
  }
  return perms.sort(sortCases);
}

function baseCaseIndexFromPerms(perms) {
  let indexes = perms.map(p => baseToDec(p.join('')));
  return indexes.sort((a, b) => a - b)[0];
}

function baseCaseIndex(state3a) {
  //let numXs = state3a.join('').split('1').length - 1;
  //let numOs = state3a.join('').split('2').length - 1;
  return baseCaseIndexFromPerms(perms(state3a));
}

function getWinners(s) {

  // X's
  let xWins = false;
  if (s[0] === '1' && s[0] == s[1] && s[1] == s[2]) xWins = true;
  else if (s[3] === '1' && s[3] == s[4] && s[4] == s[5]) xWins = true;
  else if (s[6] === '1' && s[6] == s[7] && s[7] == s[8]) xWins = true;

  else if (s[0] === '1' && s[0] == s[3] && s[0] == s[6]) xWins = true;
  else if (s[1] === '1' && s[1] == s[4] && s[1] == s[7]) xWins = true;
  else if (s[2] === '1' && s[2] == s[5] && s[2] == s[8]) xWins = true;

  else if (s[0] === '1' && s[0] == s[4] && s[4] == s[8]) xWins = true;
  else if (s[2] === '1' && s[2] == s[4] && s[4] == s[6]) xWins = true;

  // O's
  let oWins = false;
  if (s[0] === '2' && s[0] == s[1] && s[1] == s[2]) oWins = true;
  else if (s[3] === '2' && s[3] == s[4] && s[4] == s[5]) oWins = true;
  else if (s[6] === '2' && s[6] == s[7] && s[7] == s[8]) oWins = true;

  else if (s[0] === '2' && s[0] == s[3] && s[0] == s[6]) oWins = true;
  else if (s[1] === '2' && s[1] == s[4] && s[1] == s[7]) oWins = true;
  else if (s[2] === '2' && s[2] == s[5] && s[2] == s[8]) oWins = true;

  else if (s[0] === '2' && s[0] == s[4] && s[4] == s[8]) oWins = true;
  else if (s[2] === '2' && s[2] == s[4] && s[4] == s[6]) oWins = true;

  let result = [];
  if (xWins) result.push('1');
  if (oWins) result.push('2');

  return result;
}

function testTransform(players) { // DBUGGING ONLY
  //console.log("100000000", rotate("100000000"));
  let tests = [
    {
      caseArray: [
        '000000000',
        '000000000',
        '000000000',
        '000000000',
        '000000000',
        '000000000',
        '000000000',
        '000000000'
      ],
      geneIndex: 0,
      mark: 'X'
    },
    {
      caseArray: [
        '100000000',
        '001000000',
        '000000001',
        '000000100',
        '000000100',
        '100000000',
        '001000000',
        '000000001'
      ],
      geneIndex: 1,
      mark: 'O'
    },
    {
      caseArray: [
        '010000000',
        '000001000',
        '000000010',
        '000100000',
        '000000010',
        '000100000',
        '010000000',
        '000001000'
      ],
      geneIndex: 2,
      mark: 'O'
    },
    {
      caseArray: [
        '210000000',
        '002001000',
        '000000012',
        '000100200',
        '000000210',
        '200100000',
        '012000000',
        '000001002'
      ],
      geneIndex: 3,
      mark: 'X'
    },
    {
      caseArray: [
        '120000000',
        '001002000',
        '000000021',
        '000200100',
        '000000120',
        '100200000',
        '021000000',
        '000002001'
      ],
      geneIndex: 4,
      mark: 'X'
    }
  ]
  tests.forEach((e, i) => {
    let baseCases = e.caseArray;
    //console.log(i, baseCases);
    let base = baseCases[0];
    for (let k = 0; k < baseCaseTransforms.length; k++) {
      if (transformBaseCase(base, baseCaseTransforms[k]) !== baseCases[k]) {
        throw Error(i + '[' + k + ']\n' + flip(base) + '\n' + baseCases[1]);
      }
    }
  });

  for (let j = 0; j < tests.length; j++) {

    let { caseArray, geneIndex, mark } = tests[j];
    console.log('CASE ' + j + ' ---------------------------------------');
    for (let i = 0; i < caseArray.length; i++) {
      let state = caseArray[i];
      //for (let i = 3; i < 9; i++) {
      let game = new TicTacToe();
      console.log('base:');
      let gs = caseArray[0].split('');
      console.log(gs.slice(0, 3).join(' '));
      console.log(gs.slice(3, 6).join(' '));
      console.log(gs.slice(6, 9).join(' '));
      console.log('');
      gs = state.split('')
      game.state = gs.map(k => parseInt(k));
      console.log('state(' + i + '): mark=' + (mark === 'X' ? '1' : '2'));
      console.log(gs.slice(0, 3).join(' '));
      console.log(gs.slice(3, 6).join(' '));
      console.log(gs.slice(6, 9).join(' '));
      console.log('');
      stateToBaseCases[state] = { caseArray, geneIndex };
      let player = { genes: [], mark };
      player.genes[geneIndex] = randomMove(caseArray[0]);
      if (j == 1 && i == 1) {
        console.log('hit!!!');
      }
      move(game, player, 1);
    }
  }
}