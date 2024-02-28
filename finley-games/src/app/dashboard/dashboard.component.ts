import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { routes } from '../app.routes';
import { Game } from '../game';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent{
  cardList:Game[] = [
    {
      index: 0,
      name:"Tic-Tac-Toe",
      path:"tic-tac-toe",
      imagePath:"assets/tic-tac-toe-logo.png",
      description: "Try and get 3 in a row before your opponent!"
    },
    {
      index: 1,
      name:"Sudoku",
      path:"sudoku",
      imagePath:"assets/sudoku-logo.png",
      description: "Fill in all 81 squares with no numbers in the same row or column or 9x9 square!"
    }
  ];

  constructor(){}
}
