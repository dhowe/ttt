class TicTacToe {
  constructor(p5) {
    this.p5 = p5;
    this.values = ["", "X", "O"];
    this.baseCaseData = this.computeBaseCases();
    this.cellSize = this.p5 ? Math.max(this.p5.width, this.p5.height) / 3 : 0;
    this.reset();
  }

  reset() {
    this.state = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._turn = 1; // 1 (X) or 2 (O)
    this._winner = 0;
  }

  move(player, dbug) {

    let state = this.state.join("");
    let { transforms, stateToBaseMap } = this.baseCaseData;
    let { caseArray, geneIndex } = stateToBaseMap[state];
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
      let nextRealState = transformBaseCase
        (updatedBaseCaseState, transforms[stateIndex]);

      let diffIdx = differingIndexes(state, nextRealState);
      if (diffIdx.length !== 1) throw Error('invalid state: '
        + state + ' !=(-1) ' + nextRealState);

      next = diffIdx[0];
    }
    //dbug && console.log(game.state[next]);
    dbug && console.log((geneIndex ? '' : '') + player.mark
      + " moves to " + next + ' ' + (game.state[next] === 0 ? '' : '[illegal]'));

    let winner = this.update(next);
    this.render(dbug);

    return winner;
  }

  
  computeBaseCases() {
    let uniqueCases = this.parseUniqueCases();
    let baseCases = [];
    let stateToBaseMap = {};
    uniqueCases.forEach(bca => {
      let { caseArray, geneIndex } = bca;
      caseArray.forEach(state => stateToBaseMap[state] = bca);
      baseCases[geneIndex] = caseArray[0];
    });

    console.log(Object.entries(stateToBaseMap).length + ' total states');
    console.log(baseCases.length + ' genes per individual');

    let transforms = ['', 'r', 'rr', 'rrr', 'f', 'fr', 'frr', 'frrr'];

    return { baseCases, transforms, stateToBaseMap };
  }

  parseUniqueCases() {

    let total = 3 ** 9, states = [], baseCaseSets = {};
    for (let i = 0; i < total; i++) states[i] = [];

    //let unique = new Set();
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
      baseCaseSets[hash] = permutations;
    }

    let uniqueCases = []; // convert to array [{caseArray, geneIndex}]
    Object.entries(baseCaseSets).forEach(([a, b], i) => {
      uniqueCases.push({ caseArray: orderCases(b[0]), geneIndex: i });
    });

    return uniqueCases; // array {caseArray, geneIndex} 
  }

  updateOnClick(mx, my) {
    let x = floor((mx / width) * 3);
    let y = floor((my / height) * 3);
    let idx = x + y * 3;
    return this.update(idx);
  }

  update(idx) {
    if (!this._winner) {
      if (!this.state[idx]) {
        //console.log('marking point');
        this.state[idx] = this._turn;
        let position = this.checkForWinningPosition();
        if (position) {
          this._winner = {
            position, // actual win
            mark: this.values[this._turn],
          };
        }
        else {
          // check for empty spaces
          if (!this.state.filter(s => s === 0).length) {
            this._winner = {
              position: 0,
              draw: true,
              mark: '*' // draw
            }
          }
          else { // next turn
            this._turn = this._turn == 1 ? 2 : 1;
          }
        }
      }
    }

    return this._winner;
  }

  checkForWinningPosition() { // DUP?
    let s = this.state;
    if (s[0] && s[0] == s[1] && s[1] == s[2]) return [0, 1, 2];
    if (s[3] && s[3] == s[4] && s[4] == s[5]) return [3, 4, 5];
    if (s[6] && s[6] == s[7] && s[7] == s[8]) return [6, 7, 8];

    if (s[0] && s[0] == s[3] && s[0] == s[6]) return [0, 3, 6];
    if (s[1] && s[1] == s[4] && s[1] == s[7]) return [1, 4, 7];
    if (s[2] && s[2] == s[5] && s[2] == s[8]) return [2, 5, 8];

    if (s[0] && s[0] == s[4] && s[4] == s[8]) return [0, 4, 8];
    if (s[2] && s[2] == s[4] && s[4] == s[6]) return [2, 4, 6];
    return 0;
  }

  render(dbug) {
    let disp = this.state.map(s => s ? this.values[s] : '-');
    if (dbug) {
      console.log(disp.slice(0, 3).join(' '));
      console.log(disp.slice(3, 6).join(' '));
      console.log(disp.slice(6, 9).join(' '));
      console.log('');
    }
    if (this._winner) this.showWin(dbug);
  }

  showWin(dbug) {
    let { mark, position } = this._winner;
    if (dbug) {
      if (mark === '*') return console.log('DRAW\n');
      console.log(mark + 's WIN');
    }
  }
}

//////////////////////////////////////////////////////////////////////

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

function decToBase(num, base = 3, strlen = 9) {
  let dec = num.toString(base); // convert to base
  while (dec.length < strlen) dec = "0" + dec; // pad
  return dec;
}

function rot(state3a, dir = 'right') {
  //if (!Array.isArray(state3a)) throw Error('takes array');
  let indexes = [2, 5, 8, 1, 4, 7, 0, 3, 6], res = [];
  if (dir !== 'right') indexes.reverse();
  for (let i = 0; i < indexes.length; i++) {
    res[indexes[i]] = state3a[i];
  }
  return res.join('');
}

function flip(state3a) {
  //if (!Array.isArray(state3a)) throw Error('takes array');
  let indexes = [6, 7, 8, 3, 4, 5, 0, 1, 2], res = [];
  for (let i = 0; i < indexes.length; i++) {
    res[indexes[i]] = state3a[i];
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
      let tmp = rot(next);
      perms.push(tmp);
      next = tmp;
    }
  }
  return perms.sort(sortCases);
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

function transformBaseCase(state, txString) {
  let current = state;
  if (!txString.length) return state;
  for (let i = 0; i < txString.length; i++) {
    if (txString[i] === 'r') current = rot(current);
    else if (txString[i] === 'f') current = flip(current);
  }
  return current;
}



function getWinners(state) {
  let s = state;

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

typeof module !== 'undefined' && (module.exports = TicTacToe);

//new TicTacToe();
