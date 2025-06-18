import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  standalone: false,
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  constructor(private router: Router,private location: Location) {}

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('role');
    this.router.navigateByUrl('/login');
  }
  goBack(): void {
  this.location.back();
}
}
