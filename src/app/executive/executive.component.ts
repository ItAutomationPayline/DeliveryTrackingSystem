import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-executive',
  standalone: false,
  templateUrl: './executive.component.html',
  styleUrl: './executive.component.css'
})
export class ExecutiveComponent {
 constructor(private router: Router,private firestoreService: FirestoreService,private firestore: AngularFirestore,private http: HttpClient) {}
 tasks: any[] = [];
 employeeId: any= localStorage.getItem('id');  // Store the employee's ID
 profile:any=localStorage.getItem('profile'); 
 public sessionTimeout: any;
 public inactivityDuration = 30 * 60 * 1000;// 30 minutes in milliseconds 
  ngOnInit() {
    const role = localStorage.getItem('role');
    const token=localStorage.getItem('authToken');
    
    if ((!token) || (role !== 'Executive')) {
      this.router.navigateByUrl('/login');
      return;
    }
    const id = localStorage.getItem('id');
    this.fetchTasks();
    if (!sessionStorage.getItem('hasReloaded')) {
      sessionStorage.setItem('hasReloaded', 'true'); // Mark reload in session storage
      window.location.reload(); // Force reload of the entire page
    } else {
      sessionStorage.removeItem('hasReloaded'); // Clear the reload marker after the first load
      console.log('Component initialized after reload');
    }
    // this.startSessionTimer();
   }
   updateTaskStatus(taskId: string) {
    // Find the task by its ID in the tasks array
    const taskToUpdate = this.tasks.find(task => task.id === taskId);
    
    if (taskToUpdate) {
      // Update the task status to 'completed'
      this.firestore
        .collection('tasks')
        .doc(taskId)
        .update({
          status: 'completed'
        })
        .then(() => {
          console.log(`Task ${taskId} marked as complete`);
          // Refresh the tasks list after the update
          this.fetchTasks();
        })
        .catch((error) => {
          console.error('Error updating task status: ', error);
        });
    }
  }
   fetchTasks() {
    this.firestore
      .collection('tasks', ref => ref.where('assignedTo', '==', this.employeeId ))  // Filter tasks based on employeeId
      .valueChanges({ idField: 'id' })  // Include document id in result
      .subscribe((tasks: any[]) => {
        this.tasks = tasks;
        console.log("Assigned tasks: ", this.tasks);
      });
  }
   bodydata={
    "recipients": ["dayaghan.limaye@paylineindia.com", "dayaghanlimaye@gmail.com"],
    "subject": "Test Email",
    "body": "Hello, this is a test email sent to multiple recipients!"
  }
  startSessionTimer() {
    // Clear any existing timer to avoid multiple timers
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    // Set a new inactivity timer
    this.sessionTimeout = setTimeout(() => {
      this.router.navigateByUrl('/login');
    }, this.inactivityDuration);
  }

  // Reset session timer on user interaction
  resetSessionTimer() {
    this.startSessionTimer(); // Restart session timer
  }

  // Listen for user interaction events and reset the timer
  @HostListener('document:mousemove')
  @HostListener('document:click')
  @HostListener('document:keydown')
  handleUserActivity() {
    this.resetSessionTimer(); // Reset timer on activity
  }
  //this.firestoreService.sendMail(bodydata);
}
