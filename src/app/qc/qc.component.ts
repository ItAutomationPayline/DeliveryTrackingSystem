import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-qc',
  standalone: false,
  
  templateUrl: './qc.component.html',
  styleUrl: './qc.component.css',
  providers: [DatePipe]
})
export class QCComponent {
  constructor(private router: Router,private firestoreService: FirestoreService,private firestore: AngularFirestore,private http: HttpClient,private datePipe: DatePipe) {}
   tasks: any[] = [];
   scheduledTasks: any[] = [];
   employeeId: any= localStorage.getItem('id');  // Store the employee's ID
   profile:any=localStorage.getItem('profile'); 
   nm:any=localStorage.getItem('nm');
   public sessionTimeout: any;
   public inactivityDuration = 30 * 60 * 1000;// 30 minutes in milliseconds 
  
    ngOnInit() {
      const role = localStorage.getItem('role');
      const token = localStorage.getItem('authToken');
      
      if ((!token) || (role !== 'QC')) {
        this.router.navigateByUrl('/login');
        return;
      }
  
      const id = localStorage.getItem('id');
      // this.fetchTasks();
      // this.sortTasks(this.tasks);
      if (!sessionStorage.getItem('hasReloaded')) {
        sessionStorage.setItem('hasReloaded', 'true'); // Mark reload in session storage
        window.location.reload(); // Force reload of the entire page
      } else {
        sessionStorage.removeItem('hasReloaded'); // Clear the reload marker after the first load
        console.log('Component initialized after reload');
      }
      // this.startSessionTimer();
     }
}
