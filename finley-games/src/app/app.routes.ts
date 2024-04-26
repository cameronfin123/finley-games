import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TicTacToeComponent } from './tic-tac-toe/tic-tac-toe.component';
import { SudokuComponent } from './sudoku/sudoku.component';
import { PhysicsComponent } from './physics/physics.component';
import { AnimationsComponent } from './animations/animations.component';

export const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    {path: 'dashboard', component: DashboardComponent},
    {path: 'tic-tac-toe', component: TicTacToeComponent},
    {path: 'sudoku', component: SudokuComponent},
    {path: 'physics', component: PhysicsComponent},
    {path: 'animations',component:AnimationsComponent}
];
