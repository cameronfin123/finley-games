import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sudoku',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './sudoku.component.html',
  styleUrl: './sudoku.component.scss'
})
export class SudokuComponent implements OnInit{

  // Variables that get iniated once (or when a setting changes)
  boardGenerator: BoardGenerator;
  selectorLabels:string[];

  // GAME Option variables
  options:OptionHandler;

  // GAME State Variables
  history: GameState[] = [];
  state:GameState;

  // tracks key strokes
  keys: Set<string>;

  constructor() {
    this.options = new OptionHandler();
    this.boardGenerator = new BoardGenerator(this.options.boardKey);
    this.state = new GameState();
    this.keys = new Set<string>();
  }

  ngOnInit(): void {
    this.newGame();
  }

  /** -------- GAME LOGIC FUNCTIONS -------------- */
  newGame() {
    // reset variables
    this.history = [];
    this.selectorLabels = new Array(this.options.boardKey * this.options.boardKey).fill(0).map((v,i)=>getHex(i+1));
    this.state = new GameState();

    // generate a new board
    this.boardGenerator.generateBoard();

    // Copy values from grid over
    let board = this.boardGenerator.grid;
    let solution = this.boardGenerator.solution;
    for(let r = 0; r < board.length; r++ ) {
      let row = [];
      for(let c = 0; c < board[r].length; c++) {
        let cell = new Cell(r,c,solution[r][c],board[r][c] != 0);
        cell.val = board[r][c];
        row.push(cell);
      }
      this.state.board.push(row);
    }

    // refresh the game state (generate notes if auto-notes and log history)
    this.refreshGameState();
  }

  /**
   * Updates cell validity, cell notes (if auto notes is enabled), and checks if the game is completed
   * And then takes a history snapshot if a cell note and/or val has changed
   */
  refreshGameState(ch?:GameState) {
    if ( ch == undefined ) {
      ch = this.state.clone();
    }

    const key = this.options.boardKey;

    let rowMap = new Array(key * key);
    let colMap = new Array(key * key);
    let subMap = new Array(key * key);

    let emptyCells = [];

    this.state.numberCounts = new Map<string,number>();
    for(let r = 0; r < this.state.board.length; r++ ) {
      for(let c = 0; c < this.state.board[r].length; c++ ) {
        let currentCell = this.state.board[r][c];
        currentCell.valid = true; // a cell defaults to true, and only is false if there is 
        if ( rowMap[r] == undefined ) {
          rowMap[r] = new Map<number,Cell>();
        }
        if ( colMap[c] == undefined ) {
          colMap[c] = new Map<number, Cell>();
        }
        let i = Math.floor(r/key) * key + Math.floor(c/key);
        if ( subMap[i] == undefined ) {
          subMap[i] = new Map<number,Cell>();
        }
        if ( currentCell.val != 0 ) {
          let rowDup = rowMap[r].get(currentCell.val);
          let colDup = colMap[c].get(currentCell.val);
          let subDup = subMap[i].get(currentCell.val);
          
          if ( rowDup != undefined ) {
            currentCell.valid = false;
            rowDup.valid = false;
          } else {
            rowMap[r].set(currentCell.val, currentCell);
          }
          if ( colDup != undefined ) {
            currentCell.valid = false;
            colDup.valid = false;
          } else {
            colMap[c].set(currentCell.val, currentCell);
          }
          if ( subDup != undefined ) {
            currentCell.valid = false;
            subDup.valid = false;
          } else {
            subMap[i].set(currentCell.val, currentCell);
          }
        } else if ( this.options.autoAddNotes || this.options.autoRemoveNotes ) {
          emptyCells.push(currentCell);
        }

        let hexVal = getHex(this.state.board[r][c].val);
        this.state.numberCounts.set(hexVal,(this.state.numberCounts.get(hexVal) || 0) + 1);
      }
    }

    // if game is over, set completed to true, and clear the selected and focused cells
    if ( this.state.numberCounts.get('0') == undefined || this.state.numberCounts.get('0') == 0 ) {
      this.state.completed = true;
      this.state.clearSelected();
      this.state.clearFocused();
    } else {
      this.state.completed = false;
    }

    if ( this.options.autoAddNotes || this.options.autoRemoveNotes ) {
      for(let cell of emptyCells ) {
        let r = cell.getRow();
        let c = cell.getCol();
        let i = Math.floor(r/key) * key + Math.floor(c/key);

        for(let val = 1; val <= key * key; val++ ) {
          let rowDup = rowMap[r].get(val);
          let colDup = colMap[c].get(val);
          let subDup = subMap[i].get(val);
          if ( rowDup == undefined && colDup == undefined && subDup == undefined) {
            if ( this.options.autoAddNotes ) {
              cell.notes.add(val);
            }
          } else if ( this.options.autoRemoveNotes ) {
            cell.notes.delete(val);
          }
        }
      }
    }

    // check if game state has changed, if so log a history
    let stateHasChanged = true;

    if ( stateHasChanged ) {
      this.history.push(ch);
    }
  }

  undo() {
    let lastGameState = this.history.pop();
    if( lastGameState != undefined) {
      this.state = lastGameState;
      this.focusFocusedCell();
    }
  }

  restart() {
    if ( this.history && this.history.length > 0 ) {
      this.state = this.history[0];
      this.history = [this.history[0]];
    }
  }

  selectCell() {
    let focusedCell = this.state.focusedCell();
    let selectedCell = this.state.selectedCell();
    if ( focusedCell != undefined ) {
      if ( selectedCell != undefined
        && selectedCell.getRow() == focusedCell.getRow() 
        && selectedCell.getCol() == focusedCell.getCol() ) {
        this.state.clearSelected();
        this.state.lastSelectedValue = 0;
      } else {
        this.state.selectedRow = this.state.focusedRow;
        this.state.selectedCol = this.state.focusedCol;
        selectedCell = this.state.selectedCell();
        if (selectedCell && selectedCell.val != 0 ) {
          this.state.lastSelectedValue = selectedCell.val;
        }
      }
    } else {
      this.state.clearSelected();
      this.state.lastSelectedValue = 0;
    }
  }

  setValOnCell(val:number,cell:Cell) {
    let ch = this.state.clone();
    cell.val = val;
    this.state.lastSelectedValue = val;
    this.refreshGameState(ch);
  }

  setNoteOnCell(val:number,cell:Cell) {
    this.history.push(this.state.clone());
    cell.setNote(val);
  }

  setCell(val:number) {
    let selectedCell = this.state.selectedCell();
    if (selectedCell != undefined && !selectedCell.getOriginal() && (this.selectorLabels.includes(getHex(val)) || val == 0) ) {
      if ( this.state.notes ) {
        this.setNoteOnCell(val,selectedCell);
      } else {
        this.setValOnCell(val, selectedCell);
      }
    }
    
  }

  toggleNote() {
    this.state.notes = !this.state.notes;
  }
  
  erase() {
    this.setCell(0);
  }

  delete() {
    this.setCell(0);
  }

  toggleShowMistakes() {
    this.options.showMistakes = !this.options.showMistakes;
  }

  toggleShowOriginal() {
    this.options.showOriginal = !this.options.showOriginal;
  }

  toggleShowErrors() {
    this.options.showErrors = !this.options.showErrors;
  }

  selectBoardSize(value:any) {
    this.options.boardKey = Number(value.target.value);
    this.boardGenerator = new BoardGenerator(this.options.boardKey);
    this.newGame();
  }

  toggleAutoAddNotes() {
    this.options.autoAddNotes = !this.options.autoAddNotes;

    if ( this.options.autoAddNotes ) {
      this.options.disableNotes = false;
      this.refreshGameState();
    }
  }

  toggleAutoRemoveNotes() {
    this.options.autoRemoveNotes = !this.options.autoRemoveNotes;

    if ( this.options.autoRemoveNotes ) {
      this.options.disableNotes = false;
      this.refreshGameState();
    }
  }

  toggleDisableNotes() {
    this.options.disableNotes = !this.options.disableNotes;

    if ( this.options.disableNotes ) {
      this.state.notes = false;
      this.options.autoAddNotes = false;
      this.options.autoRemoveNotes = false;
    }
  }

  clearSelected() {
    if ( this.state.focusedCell() != undefined || this.state.selectedCell() != undefined ) {
      this.state.clearFocused();
      this.state.clearSelected();
    } else {
      this.state.lastSelectedValue = 0;
    }
  }

  moveUp() {
    if (this.state.focusedRow != undefined) {
      this.state.focusedRow = Math.abs((this.state.focusedRow - 1) % (this.options.boardKey * this.options.boardKey));
    } else {
      this.state.focusedRow = Math.floor(this.options.boardKey * this.options.boardKey / 2);
    }
    this.focusFocusedCell();
  }

  moveRight() {
    if (this.state.focusedCol != undefined) {
      this.state.focusedCol = Math.abs((this.state.focusedCol + 1) % (this.options.boardKey * this.options.boardKey));
    } else {
      this.state.focusedCol = Math.floor(this.options.boardKey * this.options.boardKey / 2);
    }
    this.focusFocusedCell();
  }

  moveDown() {
    if (this.state.focusedRow != undefined) {
      this.state.focusedRow = Math.abs((this.state.focusedRow + 1) % (this.options.boardKey * this.options.boardKey));
    } else {
      this.state.focusedRow = Math.floor(this.options.boardKey * this.options.boardKey / 2);
    }
    this.focusFocusedCell();
  }

  moveLeft() {
    if (this.state.focusedCol != undefined) {
      this.state.focusedCol = Math.abs((this.state.focusedCol - 1) % (this.options.boardKey * this.options.boardKey));
    } else {
      this.state.focusedCol = Math.floor(this.options.boardKey * this.options.boardKey / 2);
    }
    this.focusFocusedCell();
  }

  focusFocusedCell() {
    let elId = '';
    let focusedCell = this.state.focusedCell();
    if ( focusedCell ) {
      elId = this.getCellId(focusedCell.getRow(),focusedCell.getCol());
    }
    const el = document.getElementById(elId);
    if ( el ) {
      el.focus();
    }
  }

  getCellId(row:number,col:number) {
    return `${row}-${col}`;
  }

  
  highlightNumber(val:number) { 
    if ( this.state.lastSelectedValue == Number(val) ) {
      this.state.lastSelectedValue = 0;
    } else {
      this.state.lastSelectedValue = Number(val);
    }
    this.state.selectedRow = undefined;
    this.state.selectedCol = undefined;
    this.state.focusedRow = undefined;
    this.state.focusedCol = undefined;
  }

  /** Keyboard Listeners */

  @HostListener('keyup', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) { 
    const key = event.key.toLocaleLowerCase();
    // include keys here that work if they don't have a ctrl or or alt modifier
    if (this.selectorLabels.includes(key) ) {
      if ( event.altKey ) {
        this.highlightNumber(Number(key));
      } else if ( !event.ctrlKey ) {
        this.setCell(getNumFromHex(key));
      }
    }
  }

  @HostListener('document:keyup.arrowleft',['$event'])
  handleLeftArrow() {
    this.moveLeft();
  }

  @HostListener('document:keyup.arrowup',['$event'])
  handleUpArrow() {
    this.moveUp();
  }

  @HostListener('document:keyup.arrowright',['$event'])
  handleRightArrow() {
    this.moveRight();
  }

  @HostListener('document:keyup.arrowdown',['$event'])
  handleDownArrow() {
    this.moveDown();
  }

  @HostListener('document:keyup.Escape', ['$event'])
  handleEscape() {
    this.clearSelected();
  }

  @HostListener('document:keyup.backspace', ['$event'])
  handleBackspace() {
    this.delete();
  }

  @HostListener('document:keyup.space', ['$event'])
  handleSpace() {
    this.toggleNote();
  }

  @HostListener('document:keyup.enter', ['$event'])
  handleEnter() {
    this.selectCell();
  }

  @HostListener('document:keyup.alt.z', ['$event'])
  @HostListener('document:keyup.control.z', ['$event'])
  handleCtrlZ() {
    this.undo();
  }

  @HostListener('document:keyup.alt.r', ['$event'])
  handleAltR() {
    this.restart();
  }

  @HostListener('document:keyup.alt.n', ['$event'])
  handleAltN() {
    this.newGame();
  }

  /** Mouse Click Handlers */
  handleCellClick(r:number,c:number, event:MouseEvent) {
    if ( event.detail > 0 ) {
      let focusedCell = this.state.focusedCell();
      if ( focusedCell != undefined && focusedCell.getCol() == c && focusedCell.getRow() == r ) {
        this.state.clearFocused();
      } else {
        this.state.focusedRow = r;
        this.state.focusedCol = c;
      }
      this.selectCell();
    }
  }

  handleNumberClicked(val:string, event:MouseEvent) {
    if ( event.detail > 0 ) {
      let selectedCell = this.state.selectedCell();
      if ( selectedCell && selectedCell.val == 0 ) {
        this.setCell(getNumFromHex(val));
      } else {
        this.highlightNumber(Number(val));
      }
    }
  }

  handleNewGame() {
    this.newGame();
  }

  handleUndo() {
    this.undo();
  }

  handleRestart() {
    this.restart();
  }

  handleToggleNote() {
    this.toggleNote();
  }

  handleErase() {
    this.erase();
  }

  handleSelctBoardSize(value:any) {
    this.selectBoardSize(value);
  }

  handleToggleShowErrors() {
    this.toggleShowErrors();
  }

  handleToggleShowMistakes() {
    this.toggleShowMistakes();
  }

  handleToggleShowOriginal() {
    this.toggleShowOriginal();
  }

  handleToggleAutoRemoveNotes() {
    this.toggleAutoRemoveNotes();
  }

  handleToggleAutoAddNotes() {
    this.toggleAutoAddNotes();
  }

  handleToggleDisableNotes() {
    this.toggleDisableNotes();
  }

  /* ----- some functions to generate cell css ------ */

  validateCell(r:number, c:number) {
    if ( this.options.showMistakes ) {
      return this.state.board[r][c].correct() && this.state.board[r][c].valid;
    }
    return this.state.board[r][c].valid;
  }

  cellInnerStyling(r:number,c:number) {
    let retVal = '';
    let focusedCell = this.state.focusedCell();
    let selectedCell = this.state.selectedCell();

    if ( selectedCell != undefined && r == selectedCell.getRow() && c == selectedCell.getCol() ) {
      retVal += 'selected ';
    }
    if ( focusedCell != undefined && r == focusedCell.getRow() && c == focusedCell.getCol() ) {
      retVal += 'focused ';
    }
    if (
      (this.state.board[r][c].val != 0 && this.state.board[r][c].val == this.state.lastSelectedValue)
      ||
      (this.state.board[r][c].val == this.state.lastSelectedValue && this.state.board[r][c].val != 0))
    {
      retVal += 'selectedNum ';
    } 
    if ( selectedCell != undefined && (r == selectedCell.getRow() || c == selectedCell.getCol()) ) {
      retVal += 'highlighted ';
    }

    return retVal;
  }

  getCellStyling(r:number,c:number) {
    let retVal = '';
    if ( c % this.options.boardKey == 0 ) retVal += 'bl ';
    if (c % this.options.boardKey == (this.options.boardKey - 1)) retVal += 'br ';
    if (r % this.options.boardKey == 0) retVal += 'bt ';
    if (r % this.options.boardKey == (this.options.boardKey - 1)) retVal += 'bb ';

    if ( this.options.showOriginal && this.state.board[r][c].getOriginal() ) {
      retVal += 'disabled ';
    } if ( this.options.showErrors && !this.validateCell(r,c)) {
        retVal += 'invalid ';
    } else {
      retVal += 'valid ';
    }
    
    return retVal;
  }

  getCellNotesStyling(r:number,c:number,val:number) {
    let retVal = '';
    if ( this.options.boardKey <= 4 ) {
      retVal += 'col-' + (12/this.options.boardKey) + ' '; 
    } else {
      retVal += 'col-4 ';
    }
    if(this.options.disableNotes) retVal+='hide ';
    let selectedCell = this.state.selectedCell();
    if( selectedCell && selectedCell.val == val && this.state.board[r][c].notes.has(val) ) {
      retVal += 'highlightNote ';
    } else if (this.state.lastSelectedValue == val && this.state.board[r][c].notes.has(val) ) {
      retVal += 'highlightNote ';
    }
    return retVal;
  }
}

/*------------------------HELPER CLASSES------------------------
* Option, Cell, CellHistory, BoardGenerator
*/
class OptionHandler {
  boardKey:number;//2,3,4, leads to a 4x4,9x9 or 16x16 board respectively

  // cell highlighting options
  showMistakes:boolean;//cells that are incorrect
  showErrors:boolean;// cells that don't follow the row/col/box rules
  showSelectedNumbers:boolean;//when true, highlights any cell that contains a number matching that of the selected cell
  showRowColSub:boolean;// when true, highlights the row, column and subgroup of the selected cell
  
  showOriginal:boolean;// highlights starting cells

  autoAddNotes:boolean;//if true, auto generates notes for each cell based on what values could be there. Continues to update while enabled
  autoRemoveNotes:boolean;
  disableNotes:boolean;//if true, all notes are hidden and note taking is disabled. Upon marking as false, previous notes will still be there.
  highlightNotes:boolean;//if true, highlights notes that match the selected number


  constructor() {
    // defaults
    this.boardKey = 3;

    this.showMistakes = false;
    this.showErrors = true;
    this.showSelectedNumbers = true;
    this.showRowColSub = true;
    
    this.showOriginal = false;

    this.autoAddNotes = false;
    this.autoRemoveNotes = true;
    this.disableNotes = false;
    this.highlightNotes = false;
  }
}

class Cell {
  private trueVal:number;
  private row:number;
  private col:number;
  private original:boolean;

  val:number;
  valid:boolean;
  notes:Set<number>;

  constructor(r:number, c:number,trueVal:number, original:boolean) {
    this.trueVal = trueVal;
    this.val = trueVal;
    this.row = r;
    this.col = c;
    this.valid = true;
    this.original = original;
    this.notes = new Set<number>();
  }

  getRow() {
    return this.row;
  }

  getCol() {
    return this.col;
  }

  getTrueVal() {
    return this.trueVal;
  }

  getOriginal() {
    return this.original;
  }

  reset() {
    this.val = 0;
    this.valid = true;
  }

  empty() {
    return this.val == 0;
  }

  setVal(val:number) {
    if ( this.val != val ) {
      this.val = val;
      return true;
    }
    return false;
  }

  correct() {
    return this.val == 0 || this.trueVal == this.val;
  }

  setNote(val:number) {
    if ( this.notes.has(val) ) {
      this.notes.delete(val);
    } else {
      this.notes.add(val);
    }
  }

  clone() {
    let newCell = new Cell(this.row,this.col,this.trueVal,this.original);
    newCell.val = this.val;
    newCell.valid = this.valid;
    newCell.notes = new Set<number>(this.notes);

    return newCell;
  }
}

class GameState {
  board:Cell[][];
  selectedRow?:number;
  selectedCol?:number;
  focusedRow?:number;
  focusedCol?:number;
  lastSelectedValue:number;
  completed:boolean;
  numberCounts:Map<string,number>;
  notes:boolean;

  constructor() {
    this.board = [];
    this.completed = false;
    this.lastSelectedValue = 0;
    this.notes = false;
  }

  selectedCell() {
    if ( this.selectedRow != undefined && this.selectedCol != undefined ) {
      return this.board[this.selectedRow][this.selectedCol];
    }
    return undefined;
  }

  focusedCell() {
    if ( this.focusedRow != undefined && this.focusedCol != undefined ) {
      return this.board[this.focusedRow][this.focusedCol];
    }
    return undefined;
  }

  clearSelected() {
    this.selectedRow = undefined;
    this.selectedCol = undefined;
  }

  clearFocused() {
    this.focusedRow = undefined;
    this.focusedCol = undefined;
  }

  clone() {
    let newState = new GameState();
    newState.numberCounts = new Map<string,number>();
    newState.completed = this.completed;
    newState.lastSelectedValue = this.lastSelectedValue;
    newState.notes = this.notes;
    newState.selectedRow = this.selectedRow;
    newState.selectedCol = this.selectedCol;
    newState.focusedRow = this.focusedRow;
    newState.focusedCol = this.focusedCol;

    // Copy the board over
    newState.board = [];
    for(let r = 0; r < this.board.length; r++ ) {
      let row = [];
      for ( let c = 0; c < this.board[r].length; c++) {
        row.push(this.board[r][c].clone());

        let hexVal = getHex(this.board[r][c].val);
        newState.numberCounts.set(hexVal,(newState.numberCounts.get(hexVal) || 0) + 1);
      }
      
      newState.board.push(row);
    }

    return newState;
  }


}

// a cell and the possible values that could go there
class Element {
  row:number;
  col:number;
  candidates:number[];

  constructor(row:number, col:number ) {
    this.row = row;
    this.col = col;
    this.candidates = new Array<number>();
  }
}

class BoardGenerator {
  private boardKey:number; // whether 
  private boardSize:number;
  grid:number[][];
  solution:number[][];
  private solver:BitmaskSolver;

  constructor(boardKey:number) {
    this.boardKey = boardKey;
    this.boardSize = this.boardKey * this.boardKey;
    this.solver = new BitmaskSolver(this.boardKey);
  }

  generateBoard() {
    this.generateSolvedBoard();// generate a completed board
    this.pokeHoles();
  }

  // Sets the grid property to a randomly generated board
  generateSolvedBoard() {
    this.solver.randomizeCandidates = true;
    this.solver.solve(new Array(this.boardSize).fill(0).map(n=>new Array(this.boardSize).fill(0)));// solve an empty grid
    this.solver.randomizeCandidates = false;
    this.grid = this.solver.grid;// set the generator
    this.solution = deepClone(this.grid);
  }

  // Stores the solution, and pokes holes in the board
  pokeHoles() {
    if ( this.grid == undefined || this.grid.length == 0 ) {
      this.generateSolvedBoard();
    }
    let cellList = [];
    let limitList = [];

    for(let r = 0; r < this.grid.length; r++) {
      let limitListRow = [];
      for(let c = 0; c < this.grid[r].length; c++) {
        cellList.push({row:r,col:c});
        limitListRow.push(new Set<number>());
      }
      limitList.push(limitListRow);
    }

    cellList = shuffleList(cellList);

    let cellsLeft = this.boardSize * this.boardSize;

    const limiter = this.boardKey==3?17:(this.boardKey==2?0:Math.ceil((17/81) * this.boardSize * this.boardSize));
    // check ever cell or until there are only 30 squares left
    while(cellList.length > 0 && cellsLeft > limiter ) {
      // Get the next cell to remove
      let cellToClear = cellList.pop();
      if ( cellToClear == undefined ) {
        if( loggerEnabled) console.log('All cells checked');
        break;
      }

      // save the old cell, and add to the list of numbers to restrict for this cell
      const oldCellValue = this.grid[cellToClear.row][cellToClear.col];
      limitList[cellToClear.row][cellToClear.col].add(oldCellValue);
      this.grid[cellToClear.row][cellToClear.col] = 0;

      // Check if there is a solution other than the one we've found
      this.solver.limit = limitList;
      this.solver.solve(deepClone(this.grid));

      // if there is a solution other than the one we found or a timeout error
      if ( this.solver.getNumSolutions() > 0 || this.solver.getNumSolutions() == -1) {
        this.grid[cellToClear.row][cellToClear.col] = oldCellValue;
      } else {
        cellsLeft--;
      }
      limitList[cellToClear.row][cellToClear.col].delete(oldCellValue);
    }

    if( loggerEnabled) printBoard(this.grid,"Final Board: \n");
  }
}

class BitmaskSolver {
  private N = 9;
  private key = 3;
  private loopMax = 20000000;// limits the execution
  randomizeCandidates = false;

  countLimit:number;//sets how many solutions are needed before execution stops
  private numSolutions:number;// counts how many solutions have been found
  private loopLimit = 0; // counts how many times solveSudok has been called, and ends execution if it reaches loopMax
  

  grid:number[][];
  private graph:Element[]; // This is a map of cells, and possible values for those cells
  private rows:number[];//has a 1 at the index = r and bit = val
  private cols:number[];// has a 1 at the index = c and bit = val
  private subs:number[];// has a 1 at the boxIndex=getIndex(r,c) and bit = val
  solutions:string[];
  limit:Set<number>[][];

  constructor(boardKey:number) {
    this.key = boardKey;
    this.N = this.key * this.key;
    this.countLimit = 1;
  }

  solve(grid:number[][]) {
    this.grid = grid;
    this.numSolutions = 0;
    this.loopLimit = 0;

    this.setInitialValues();
    if(this.setInitialGraph()) {
      this.solveSudoku();
    }
  }

  private getBox(i:number,j:number) {
    return Math.floor(i/this.key) * this.key + Math.floor(j/this.key);
  }

  private isSafe(i:number, j:number, num:number) {
    return ((this.rows[i] >> num) & 1 ) == 0 && 
      ((this.cols[j] >> num) & 1 ) == 0 && 
      ((this.subs[this.getBox(i,j)] >> num ) & 1) == 0;
  }

  private setInitialValues() {
    this.rows = new Array(this.N).fill(0);
    this.cols = new Array(this.N).fill(0);
    this.subs = new Array(this.N).fill(0);
    for (let i = 0; i < this.grid.length; i++) {
      for (let j = 0; j < this.grid.length; j++) {
        if ( this.grid[i][j] != 0 ) {
          this.rows[i] |= 1 << this.grid[i][j];
          this.cols[j] |= 1 << this.grid[i][j];
          this.subs[this.getBox(i, j)] |= 1 << this.grid[i][j];
        }
      }
    }
  }

  private setInitialGraph() {
    this.graph = [];
    for (let i = 0; i < this.grid.length; i++) {
      for (let j = 0; j < this.grid.length; j++) {
        if ( this.grid[i][j] == 0) {
          let e = new Element(i,j);
          for(let num = 1; num <= this.N; num++ ) {
            if ( (this.limit == undefined || !this.limit[i][j].has(num)) && this.isSafe(i,j,num)) {
              e.candidates.push(num);
            }
          }
          if ( e.candidates.length == 0 ) {
            if( loggerEnabled) console.log(`Cell with no candidates at (${i},${j})`);
            return false;
          }
          if ( this.randomizeCandidates) {
            e.candidates = shuffleList(e.candidates);
          }
          this.graph.push(e);
        }
      }
    }
    this.graph.sort((a,b)=>b.candidates.length - a.candidates.length);
    
    return true;
  }

  private solveSudoku() {
    // limit how much time we will try and fine solutions on this board
    this.loopLimit++;
    if ( this.loopLimit >= this.loopMax ) {
      if( loggerEnabled) console.log('Branching limit reached: ' + this.loopLimit);
      this.numSolutions = -1;
      return ;
    }

    let e = this.graph.pop();
    if ( e == undefined ) {
      this.numSolutions++;
      if( loggerEnabled) printBoard(this.grid,"Solution:\n");
      return ;
    }
    for (let candidate of e.candidates ) {
      if (this.isSafe(e.row, e.col, candidate)) {
        this.setNumber(e.row, e.col,candidate);
        this.solveSudoku()
        if ( this.numSolutions >= this.countLimit || this.numSolutions == -1) return;
        // Remove candidate from each bitmask
        this.removeNumber(e.row, e.col,candidate);
      }
    }
    // add the Empty square back to the graph list
    this.graph.push(e);
  }

  setNumber(r:number,c:number,val:number) {
    this.grid[r][c] = val;
    this.rows[r] |= 1 << val;
    this.cols[c] |= 1 << val;
    this.subs[this.getBox(r, c)] |= 1 << val;
  }

  removeNumber(r:number,c:number,val:number) {
    this.grid[r][c] = 0;
    this.rows[r] &= ~(1 << val);
    this.cols[c] &= ~(1 << val);
    this.subs[this.getBox(r, c)] &= ~(1 << val);
  }

  getNumSolutions() {
    return this.numSolutions;
  }
}

/*----------------------HELPER FUNCTIONS----------------------- */
/**
 * Converts a number to a hex value
 * @param val Val to convert to hex
 */
function getHex(val:number) {
  return val.toString(32);
}
function getNumFromHex(val:string) {
  if ( val == undefined ) {
    return -1;
  }
  return Number('0x'+val);
}
function generateInteger(min:number, max:number) {
  return Math.round(Math.random() * (max - min)) + min;
}
function shuffleList<T>(array:T[]) {
  let newArray = [...array]
  for ( let i = newArray.length - 1; i > 0; i-- ) {
      const j = generateInteger(0,i);
      [ newArray[ i ], newArray[ j ] ] = [ newArray[ j ], newArray[ i ] ];
  }
  return newArray;
}
/**
 * Accepts an object and then returns a copy of it
 * NOTE: If there is a field on the object that isn't populated, it will not 
 * @param inVal 
 * @returns 
 */
function deepClone(inVal:Object) {
  return JSON.parse(JSON.stringify(inVal));
}

function printBoard(b:number[][],title?:string) {
  let printString = ''
  if( title != undefined ) {
    printString += title;
  }
  b.forEach(row=>{
    row.forEach(cell=>{
      if ( cell == 0 ) {
        printString += '.';
      } else {
        printString += (cell);
      }
    });
  });
  console.log(printString);
  return printString;
}

const loggerEnabled = true;