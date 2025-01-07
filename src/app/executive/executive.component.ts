import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-executive',
  standalone: false,
  
  templateUrl: './executive.component.html',
  styleUrl: './executive.component.css'
})
export class ExecutiveComponent {
  constructor(private router: Router) {}
  ngOnInit() {
    const role = localStorage.getItem('role');
    // Check if token and role exist and role is 'executive'
    if (role !== 'Executive') {
      this.router.navigateByUrl('/login');
    }
    const token=localStorage.getItem('authToken');
    if (token===null) {
      this.router.navigateByUrl('/login');
    }
  }
}
