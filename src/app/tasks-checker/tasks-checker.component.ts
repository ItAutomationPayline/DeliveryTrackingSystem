import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { interval, Subscription } from 'rxjs';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { FirestoreService } from '../services/firestore.service';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tasks-checker',
  standalone: false,
  templateUrl: './tasks-checker.component.html',
  styleUrl: './tasks-checker.component.css',
  providers: [DatePipe]
})
export class TasksCheckerComponent {
  constructor(private firestore: AngularFirestore, private functions: AngularFireFunctions,private firestoreService: FirestoreService, private datePipe: DatePipe,private router: Router) { this.username = "";}
  rec: string[] = [];
  public user: any[] = [];
  private intervalId: any;
  username:string;
  public sessionTimeout: any;
  public inactivityDuration = 30 * 60 * 1000;// 30 minutes in milliseconds
  public setUsername(value: string) {
    this.username = value;
  }
  ngOnInit() {
    // Run checkPendingTasks every 5 minutes (300,000 milliseconds)
    this.intervalId = setInterval(() => {
      this.checkPendingTasks();
    }, 60000); // 5 minutes in milliseconds
    this.startSessionTimer();
  }

  // Function to check pending tasks and process deadlines
  checkPendingTasks() {
    this.firestore
      .collection('tasks', (ref) => ref.where('status', '==', 'pending')) // Fetch only pending tasks
      .valueChanges({ idField: 'id' }) // Include the document ID
      .subscribe((tasks: any[]) => {
        const currentTime = new Date();

        tasks.forEach((task) => {
          const deadline = new Date(task.deadline);
          // Check if the deadline has passed
          if ((deadline < currentTime)&& task.status=='pending') {
            console.log(`Task ${task.id} has crossed the deadline.`);
            this.user[0]=this.firestoreService.getUserById(task.assignedTo);
            //region
            this.firestoreService.getUserById(task.assignedTo).subscribe(data => {
              if (data.length > 0) {
                const user = data[0]; // Since it's an array, the first document will be the matching user
                this.setUsername(user.name);
                console.log("name of it :",user.name);
                this.sendEmail2(task.leadermail, task,user.name);
              } else {
                console.log('No user found with this email.');
              }
            });
            //regionends
            console.log("nameof delayed: ",this.username);
            // Send an email to the leader
           

            // Update the task's status to delayed
            this.firestore
              .collection('tasks')
              .doc(task.id)
              .update({ status: 'delayed' })
              .then(() => {
                console.log(`Task ${task.id} status updated to delayed.`);
              })
              .catch((error) => {
                console.error(`Error updating task ${task.id}:`, error);
              });
          }
        });
      });
  }
  sendEmail2(recipient: string, task: any,name:string) {
    const formattedDeadline = this.datePipe.transform(task.deadline, 'yyyy-MM-dd HH:mm:ss'); // Formatting the deadline
   this.rec[0]=recipient
    let bodydata = {
      "recipients": this.rec,
      "subject": `Task Deadline Missed: ${task.description}`,
      "body": `Hello,\n\nThe task "${task.description}" assigned to "${name}"  has crossed the deadline.\n\nDeadline: ${formattedDeadline}\n\nPlease take immediate action.`,
    };
this.firestoreService.sendMail(bodydata);
  }
  // Function to send an email using Firebase Functions
  sendEmail(recipient: string, task: any) {
    const formattedDeadline = this.datePipe.transform(task.deadline, 'yyyy-MM-dd HH:mm:ss'); // Formatting the deadline
   this.rec[0]=recipient
    let bodydata = {
      "recipients": this.rec,
      "subject": `Task Deadline Missed: ${task.description}`,
      "body": `Hello,\n\nThe task "${task.description}" assigned to "${this.username}"  has crossed the deadline.\n\nDeadline: ${formattedDeadline}\n\nPlease take immediate action.`,
    };
this.firestoreService.sendMail(bodydata);
  }
  ngOnDestroy() {
    // Clear the interval when the component is destroyed
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
  public logout() {
    this.router.navigateByUrl('/login'); // Redirect to login
  }
  startSessionTimer() {
    // Clear any existing timer to avoid multiple timers
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    // Set a new inactivity timer
    this.sessionTimeout = setTimeout(() => {
      this.logout();
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
}
