import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-team-lead',
  standalone: false,
  
  templateUrl: './team-lead.component.html',
  styleUrl: './team-lead.component.css'
})
export class TeamLeadComponent {
   constructor(private router: Router) {}
  ngOnInit() {
    const role = localStorage.getItem('role');
    // Check if token and role exist and role is 'executive'
    if (role !== 'Team Lead') {
      this.router.navigateByUrl('/login');
    }
    const token=localStorage.getItem('authToken');
    if (token===null) {
      this.router.navigateByUrl('/login');
    }
  }
}
