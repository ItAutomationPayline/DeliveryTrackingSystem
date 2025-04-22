import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { debounceTime, interval, Subscription } from 'rxjs';
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

export class TasksCheckerComponent{
  constructor(private firestore: AngularFirestore, private functions: AngularFireFunctions,private firestoreService: FirestoreService, private datePipe: DatePipe,private router: Router){ this.username = ""; this.tasksSubscription = new Subscription();}
  private reminderSent = new Set<string>(); // To track sent reminders
  private tasksSubscription: Subscription; // To manage the subscription
  rec: string[] = [];
  public user: any[] = [];
  private intervalId: any;
  private intervalId2: any;
  username:string;
  public todayDate: number | undefined
  public sessionTimeout: any;
  public inactivityDuration = 30 * 60 * 1000;// 30 minutes in milliseconds
  public setUsername(value: string) {
    this.username = value;
  }
  ngOnInit() {
    // Run checkPendingTasks every 1 minutes (300,000 milliseconds)
    this.intervalId = setInterval(() => {
      // this.checkPendingTasks();
      // this.checkForReminder();
    }, 60000);
    this.intervalId = setInterval(() => {
      this.checkForReminder();
    }, 3600000);
     // 1 minutes in milliseconds
    // this.intervalId2 = setInterval(() => {
    //   this.checkScheduledTasks();
    // }, 600000);
    this.startSessionTimer();
  }
  checkScheduledTasks() {
    // const todayDate: number = new Date().getDate();
    // const currentTime = new Date();
    // this.firestore
    //   .collection('scheduledTasks', (ref) => ref.where('date', '==', todayDate)) // Fetch only Pending tasks
    //   .valueChanges({ idField: 'id' }) // Include the document ID
    //   .subscribe((tasks: any[]) => {
    //     tasks.forEach((task) => {
    //       const task2 = {
    //         client: task.client,
    //         assignedTo: task.assignedTo,
    //         teamId: task.teamId,
    //         deadline:this.convertToISO(todayDate,task.time),
    //         description: task.description,
    //         status: 'Pending',
    //         createdBy: task.createdBy, // Use the logged-in Team Lead's ID
    //         leadermail:task.leadermail
    //       };
    //       this.firestore
    //       .collection('tasks')
    //       .add(task2)
    //       .then(() => {
    //       })
    //       .catch((error) => {
    //         alert('Failed to assign task. Please try again.');
    //       });
    //     });
    //   });
  }
  convertToISO(dateInt: number, timeStr: string): string {
    const now = new Date(); // Get current date
    const year = now.getFullYear(); // Use current year
    const month = now.getMonth() + 1; // JS months are 0-based
    // Ensure date is in `DD` format
    const day = dateInt.toString().padStart(2, '0');
    // Extract hours and minutes from time string
    const [hours, minutes] = timeStr.split(':');
    const iso=new Date(`${year}-${month.toString().padStart(2, '0')}-${day}T${hours}:${minutes}`).toISOString()
    // Construct full date-time string
    const dateTimeString = `${year}-${month.toString().padStart(2, '0')}-${day}T${hours}:${minutes}:00.000Z`;
  
    return iso;
  }
  // Function to check Pending tasks and process deadlines
  checkPendingTasks() {
    this.firestore
      .collection('tasks', (ref) => ref.where('status', '==', 'Pending').where('clientStatus', '==', 'Active')) // Fetch only Pending tasks
      .valueChanges({ idField: 'id' }) // Include the document ID
      .subscribe((tasks: any[]) => {
        const currentTime = new Date();
        tasks.forEach((task) => {
          const deadline = new Date(task.deadline);
          // Check if the deadline has passed
          if ((deadline < currentTime)&& task.status=='Pending') {
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
            console.log("nameof Delayed: ",this.username);
            // Send an email to the leader
            // Update the task's status to Delayed
            this.firestore
              .collection('tasks')
              .doc(task.id)
              .update({ status: 'Delayed' })
              .then(() => {
                console.log(`Task ${task.id} status updated to Delayed.`);
              })
              .catch((error) => {
                console.error(`Error updating task ${task.id}:`, error);
              });
          }
        });
      });
  }
checkForReminder() {
  // Unsubscribe from previous subscription if it exists
  if (this.tasksSubscription) {
    this.tasksSubscription.unsubscribe();
  }

  this.tasksSubscription = this.firestore
    .collection('tasks', (ref) => ref.where('status', '==', 'Pending').where('clientStatus', '==', 'Active'))
    .valueChanges({ idField: 'id' })
    .pipe(
      debounceTime(1000) // Wait for 1 second of inactivity
    )
    .subscribe((tasks: any[]) => {
      const currentTime = new Date();
      console.log("Reminder function initiated at", currentTime);
      tasks.forEach((task) => {
        // Skip if reminder was already sent for this task
        if (this.reminderSent.has(task.id)) {
          return;
        }
        // Ensure deadline is a valid date
        const deadline = task.deadline?.toDate ? task.deadline.toDate() : new Date(task.deadline);
        const twoHoursBefore = new Date(deadline.getTime() - 2 * 60 * 60 * 1000);
                
        // Check if current time is between twoHoursBefore and deadline
        if (currentTime >= twoHoursBefore && currentTime < deadline && task.status === 'Pending') {
          console.log(`Sending reminder for task ${task.id}`);
          // Mark this reminder as sent
          this.reminderSent.add(task.id);
          this.firestoreService.getUserById(task.assignedTo).subscribe(userData => {
            if (userData.length > 0) {
              const user = userData[0];
              console.log("Sending gentle reminder to:", user.name);
              this.sendGentleReminder(user.email, task, user.name);
            } else {
              console.log('No user found with ID:', task.assignedTo);
            }
          });
        }
      });
    });
}

  sendGentleReminder(leaderEmail: string, task: any, userName: string) {
    const subject = `${task.group} :Gentle Reminder: ,Task "${task.description}" due soon`;
    const message = `
      Hi ${userName},<br><br>
      This is a gentle reminder that the task "${task.description}"<br>of client:${task.client}<br>
      is due in less than 2 hours (by ${new Date(task.deadline).toLocaleString()}).<br>
      <br>
      Please ensure it's completed on time.<br>
      <br>
      Best regards,<br>
      DTS
    `;
    this.rec[0]=leaderEmail
    let bodydata = {
      "recipients": this.rec,
      "subject": subject,
      "body": message,
    };
this.firestoreService.sendMail(bodydata);
    // Implement your email sending logic here
    console.log('Sending gentle reminder:', { leaderEmail, subject, message });
    // this.emailService.sendEmail(leaderEmail, subject, message);
  }
  sendEmail2(recipient: string, task: any,name:string) {
    const formattedDeadline = this.datePipe.transform(task.deadline, 'yyyy-MM-dd HH:mm:ss'); // Formatting the deadline
   this.rec[0]=recipient;
    let bodydata = {
      "recipients": this.rec,
      "subject": `${task.client}:Task Deadline Missed: ${task.description}`,
      "body": `Hello,<br><br>The task "${task.description}" assigned to "${name}"  has crossed the deadline.<br><br>Deadline: ${formattedDeadline}<br><br>Please take immediate action.`,
    };
this.firestoreService.sendMail(bodydata);
  }
  // Function to send an email using Firebase Functions
  sendEmail(recipient: string, task: any) {
    const formattedDeadline = this.datePipe.transform(task.deadline, 'yyyy-MM-dd HH:mm:ss'); // Formatting the deadline
    this.rec[0]=recipient;
    let bodydata = {
      "recipients": this.rec,
      "subject": `Task Deadline Missed: ${task.description}`,
      "body": `Hello,\n\nThe task "${task.description}" assigned to "${this.username}"  has crossed the deadline.\n\nDeadline: ${formattedDeadline}\n\nPlease take immediate action.`,
    };
this.firestoreService.sendMail(bodydata);
  }
  ngOnDestroy() {
    if (this.tasksSubscription) {
      this.tasksSubscription.unsubscribe();
    }
    // Clear the interval when the component is destroyed
    if (this.intervalId) {
      clearInterval(this.intervalId);
    if (this.intervalId2) {
        clearInterval(this.intervalId2);
      }
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