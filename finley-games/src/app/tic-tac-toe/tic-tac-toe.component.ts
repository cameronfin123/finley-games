import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 

class Cell {
  value: string;
  index: number;
  winningCell?:boolean;

  constructor(public i:number) {
    this.value = '';
    this.winningCell = false;
    this.index = i;
  }

  getStyle() {
    if( this.value == 'X') {
      return 'xButton show-scale';
    } else if (this.value=='O') {
      return 'oButton show-scale';
    } else {
      return 'hide-scale';
    }
  }

  getParentStyle() {
    return 'cell' + this.index;
  }
}

@Component({
  selector: 'app-tic-tac-toe',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './tic-tac-toe.component.html',
  styleUrl: './tic-tac-toe.component.scss'
})

export class TicTacToeComponent {

  winningCombos: number[][] = [
    [0,1,2],
    [3,4,5],
    [6,7,8],
    [0,3,6],
    [1,4,7],
    [2,5,8],
    [0,4,8],
    [2,4,6]
  ]

  isXTurn: Boolean = true;
  gameOver: Boolean = false;
  gameWinner: String = '';
  board: Cell[] = [];
  history:number[] = [];

  constructor( ) {
    this.handleRestart();
  }

  handleRestart() {
    for(let i = 0; i < 9; i++) {
      this.board[i] = new Cell(i);
    }
    this.history = [];
    this.isXTurn = true;
    this.gameOver = false;
    this.gameWinner = '';
  }

  handleUndo() {
    if ( !this.history || this.history.length == 0 ) {
      return;
    }
    let valToUndo = this.history.pop();
    if ( valToUndo != undefined ) {
      this.board[valToUndo] = new Cell(valToUndo);
    }
    this.isXTurn = !this.isXTurn;
  }

  handleMakeMove(index:number) {
    this.board[index].value = this.isXTurn?'X':'O';
    this.history.push(index);

    if ( this.checkBoard() ) {
      this.gameOver = true;
    } else {
      this.isXTurn = !this.isXTurn;
    }
  }


  checkBoard() {
    for(let i = 0; i < this.winningCombos.length; i++) {
      let combo = this.winningCombos[i];
      if( this.board[combo[0]].value == this.board[combo[1]].value && this.board[combo[1]].value == this.board[combo[2]].value && this.board[combo[0]].value != '') {
        this.gameWinner = this.board[combo[0]].value;
        this.board[combo[0]].winningCell = true;
        this.board[combo[1]].winningCell = true;
        this.board[combo[2]].winningCell = true;
        return true;
      }
    }

    let isEmptySquares = false;
    for(let cell of this.board) {
      if ( cell.value == '') {
        return false;
      }
    }

    if ( !isEmptySquares ) {
      return true;
    }

    return false;
  }
}
