import { Component, HostListener,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

function Key(row?:number, col?:number) {
  if ( row != undefined && col != undefined ) {
    return `${row},${col}`;
  }
  if ( row != undefined) {
    return `${row}`;
  }
  if ( col != undefined ) {
    return `${col}`;
  }
  return `r,c`;
}

function generateInteger(min:number, max:number) {
  return Math.round(Math.random() * (max - min)) + min;
}

class Cell {
  key: string;
  row: number;
  col: number;
  value: number;
  valid: boolean;
  highlighted:boolean;

  constructor(row: number, col: number) {
    this.row = row;
    this.col = col;
    this.valid = true;
    this.value = -1;
    this.key = Key(row, col);
  }

  reset() {
    this.value = -1;
    this.valid = true;
  }

  cellValid() {
    return this.value == -1 || this.valid == true;
  }
}

class Board {
  board: Cell[][] = [];
  boardKey:number;

  constructor(boardKey:number) {
    this.boardKey = boardKey;
    const k = boardKey * boardKey;
    for(let r = 0; r < k; r++){
      let row = [];
      for(let c = 0; c < k; c++) {
        row.push(new Cell(r,c));
      }
      this.board.push(row);
    }
  }

  reset() {
    const k = this.boardKey * this.boardKey;
    for(let r = 0; r < k; r++){
      for(let c = 0; c < k; c++) {
        this.board[r][c].reset();
      }
    }
  }

  generate(numSquares:number) {
    const k = this.boardKey * this.boardKey;
    this.reset();
    let count = 0;
    let limit = numSquares > k*k? k * k : numSquares;
    while(count < limit) {
      const r = generateInteger(0,k - 1);
      const c = generateInteger(0,k - 1);
      if ( this.board[r][c].value == -1 ) {
        const v = generateInteger(1,k);
        this.setCell(r,c,v);
        count++;
      }
    }
  }

  checkCurrentBoard() {
    let rowMapCellMap = new Map<string,Map<number,Cell>>();
    let colMapCellMap = new Map<string,Map<number,Cell>>();
    let subMapCellMap = new Map<string,Map<number,Cell>>();

    this.board.forEach((row,r) => {
      row.forEach((cell,c) => {
        const rowKey = Key(r,undefined);
        const colKey = Key(undefined,c);
        const subKey = Key(Math.floor(r/this.boardKey),Math.floor(c/this.boardKey));

        let validCell = true;
        // Check Duplicate in Rows
        validCell = this.checkHelper(rowMapCellMap,cell,rowKey) && validCell;

        // Check Duplicates in Cols
        validCell = this.checkHelper(colMapCellMap,cell,colKey) && validCell;

        // check for duplicate in subgroup
        validCell = this.checkHelper(subMapCellMap,cell,subKey) && validCell;

        if ( validCell ) {
          this.board[r][c].valid = true;
        }
      });
    });
  }

  private checkHelper(mapCellMap:Map<string,Map<number,Cell>>,cell:Cell,key:string) {
    if ( mapCellMap.has(key) ) {
      if (mapCellMap.get(key)?.has(cell.value) ) {
        this.board[cell.row][cell.col].valid = false;
        let dupCell = mapCellMap.get(key)?.get(cell.value) || new Cell(-1,-1);
        this.board[dupCell.row][dupCell.col].valid = false;
        return false;
      } else if (cell.value != -1) {
        mapCellMap.get(key)?.set(cell.value,cell);
      }
    } else {
      let m = new Map<number,Cell>();
      if ( cell.value != -1 ) {
        m.set(cell.value,cell);
      }
      mapCellMap.set(key,m);
    }
    return true;
  }

  setCell(row:number, col:number, val:number) {
    this.board[row][col].value = val;
    this.checkCurrentBoard();
  }

  getCell(row:number, col:number) {
    return this.board[row][col];
  }
}

class CellHistory {
  old:number;
  new:number;
  row:number;
  col:number;

  constructor(row:number,col:number, old:number,n:number ) {
    this.row = row;
    this.col = col;
    this.old = old;
    this.new = n;
  }
}

@Component({
  selector: 'app-sudoku',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './sudoku.component.html',
  styleUrl: './sudoku.component.scss'
})
export class SudokuComponent implements OnInit {

  boardKey:number;
  board: Board;
  history: CellHistory[] = [];
  gameOver: boolean = false;
  selectedCell?: Cell;

  selectorLabels:string[];

  constructor() {
    this.boardKey = 3;
    this.board = new Board(this.boardKey);
    this.selectorLabels = Array(this.boardKey * this.boardKey).fill(0).map((x,i)=>`${i+1}`);
    
    this.generateBoard();
  }

  ngOnInit(): void {
    
  }

  handleRestart() {
    this.gameOver = false;
    while( this.history.length > 0  ) {
      this.handleUndo();
    }
  }

  handleUndo() {
    if ( this.history.length > 0 ) {
      let cellHistory = this.history.pop();
      if( cellHistory ) {
        this.board.setCell(cellHistory.row,cellHistory.col, cellHistory.old);
      }
    }
  }
  @HostListener('document:keyup', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) { 
    const key = event.key;
    console.log(key);
    const numKey = Number(key); 
    if ( this.selectedCell != undefined && this.selectedCell != null && !isNaN(numKey)) {
      this.setCell(this.selectedCell.row,this.selectedCell.col,numKey);
    } else if (this.selectedCell != undefined && key == 'Backspace') {
      this.setCell(this.selectedCell.row, this.selectedCell.col, -1);
    }

  }

  handleSelectCell(r:number, c:number) {
    if ( this.selectedCell == undefined ) {
        this.selectedCell = this.board.getCell(r,c);
    } else {
      if ( r == this.selectedCell.row && c == this.selectedCell.col ) {
        this.selectedCell = undefined;
      } else {
        this.selectedCell = this.board.getCell(r,c);
      }
    }
    
  }

  handleSelectNumber(val:string) {
    const numKey = Number(val);
    if ( this.selectedCell != undefined && this.selectedCell != null && !isNaN(numKey)) {
      this.setCell(this.selectedCell.row,this.selectedCell.col,numKey);
    }
  }

  handleErase() {
    if ( this.selectedCell != undefined && this.selectedCell != null ) {
      this.setCell(this.selectedCell.row,this.selectedCell.col,-1);
    }
  }

  handleNote() {

  }

  setCell(r:number, c:number, val:number) {
    this.history.push(new CellHistory(r,c,this.board.getCell(r,c).value,val));
    this.board.setCell(r,c,val);
    this.selectedCell = undefined;
  }

  getValidRandomNumber() {
    return Math.floor(Math.random() * 100 % (this.boardKey * this.boardKey)) + 1;
  }

  generateBoard() {
    this.history = [];
    this.gameOver = false;
    this.board.generate(Math.floor(this.boardKey * this.boardKey));
  }
}
