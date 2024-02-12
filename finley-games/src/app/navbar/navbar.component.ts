import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import * as bootstrap from 'bootstrap';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  title="Finley Games";
}
