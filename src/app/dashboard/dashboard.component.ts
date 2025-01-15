import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  constructor(private router: Router,private firestoreService: FirestoreService) {}
  public users: any[] = [];
  public users2: any[] = [];
  ngOnInit() {
    const role = localStorage.getItem('authToken');
    // Check if token and role exist and role is 'executive'
    if (role) {
      this.firestoreService.getUsers().subscribe(data => {
        this.users = data;
    })
    
    this.firestoreService.getUserByEmail("mahesh31169@gmail.com").subscribe(data => {
      this.users2=data;
    })
  }
    else{
      this.router.navigateByUrl('/login');
    }
    
}
}
