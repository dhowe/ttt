class TicTacToe {
  constructor(p5) {
    this.p5 = p5;
    this.values = ["", "X", "O"];
    this.cellSize = p5 ? Math.max(p5.width, p5.height) / 3 : 0;
    this.reset();
  }

  reset() {
    this.state = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    this._turn = 1; // 1 (X) or 2 (O)
    this._winner = 0;
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

  checkForWinningPosition() {
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
    let {mark, position} = this._winner;
    if (dbug) {
      if (mark === '*') return console.log('DRAW\n');
      console.log(mark + 's WIN');
    }
  }
}

typeof module !== 'undefined' && (module.exports = TicTacToe);
