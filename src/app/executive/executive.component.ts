import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs';

@Component({
  selector: 'app-executive',
  standalone: false,
  templateUrl: './executive.component.html',
  styleUrl: './executive.component.css',
  providers: [DatePipe]
})
export class ExecutiveComponent {
  clientForm: FormGroup;
 constructor(private fb: FormBuilder,private router: Router,private firestoreService: FirestoreService,private firestore: AngularFirestore,private http: HttpClient,private datePipe: DatePipe) 
 {
  this.clientForm = this.fb.group({
    ReportType: ['', Validators.required],
    groupName: ['', Validators.required],
    clientName: ['', Validators.required],
    monthYear: ['', Validators.required], // format: "2025-04"
  });
 }
 tasks: any[] = [];
 scheduledTasks: any[] = [];
 showModal = false;
 selectedTask: any = null;
 AllClientsAndGroups:any[] = [];
 reasonInput: string = '';
 employeeId: any= localStorage.getItem('id');  // Store the employee's ID
 profile:any=localStorage.getItem('profile'); 
 nm:any=localStorage.getItem('nm');
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
    this.fetchClients();
    this.sortTasks(this.tasks);
    if (!sessionStorage.getItem('hasReloaded')) {
      sessionStorage.setItem('hasReloaded', 'true'); // Mark reload in session storage
      window.location.reload(); // Force reload of the entire page
    } else {
      sessionStorage.removeItem('hasReloaded'); // Clear the reload marker after the first load
      console.log('Component initialized after reload');
    }
    // this.startSessionTimer();
   }
  fetchClients()
  {
    this.firestore
    .collection('clients', ref => ref.where('status', '==', 'Active'))
    .valueChanges({ idField: 'id' }) // Include document ID in the result
    .subscribe((tasks: any[]) => {
      this.AllClientsAndGroups = tasks;
    });
  }
   sortTasks(tasksWithNames: { client: string; deadline: string }[]): { client: string; deadline: string }[] {
    return tasksWithNames.sort((a, b) => {
      const clientCompare = a.client.localeCompare(b.client);
      if (clientCompare !== 0) return clientCompare;
  
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }
   isTaskDueTodayOrEarlier(dueDate: string | Date): boolean {
    const today = new Date();
    const taskDate = new Date(dueDate);
    
    // Set both dates to midnight to compare only the date part
    today.setHours(0, 0, 0, 0);
    taskDate.setHours(0, 0, 0, 0);
  
    return taskDate <= today;
  }
  isTaskDueTomorrowOrEarlier(dueDate: string | Date): boolean {
    const today = new Date();
    const taskDate = new Date(dueDate);
    
    // Set both dates to midnight to compare only the date part
    today.setHours(0, 0, 0, 0);
    taskDate.setHours(0, 0, 0, 0);

    // Calculate tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return taskDate <= tomorrow;
}
   updateTaskStatus(taskId: string) {
  
    // Find the task by its ID in the tasks array
    const taskToUpdate = this.tasks.find(task => task.id === taskId);
    
    if (taskToUpdate) {
      // Add confirmation dialog
      const isConfirmed = window.confirm(
        `Are you sure you want to mark "${taskToUpdate.description}" as Completed?`
      );
      
      if (isConfirmed) {
        // Update the task status to 'completed' only if user confirms
        if(taskToUpdate.QcApproval!="Approved")
          {
            let finalData = {
              taskId:taskId,
              reportType:taskToUpdate.reportType,
              groupName:taskToUpdate.group,
              clientName: taskToUpdate.client,
              Period:taskToUpdate.deadline,
              ops:this.employeeId,
              AssignedTo:"Pending",
              opsName:this.nm,
              status:"Pending",
            };
            try {
              this.firestore.collection('QcReports').add(finalData);
              alert('Request Sent To QC Successfully!');
              //this.clientForm.reset();
            } catch (error) {
              console.error('Error saving to Firebase:', error);
            }
          }
        this.firestore
          .collection('tasks')
          .doc(taskId)
          .update({
            status: 'Completed',
            completedAt:new Date().toISOString()
          })
          .then(() => {
            console.log(`Task ${taskId} marked as complete`);
            // Refresh the tasks list after the update
            this.fetchTasks();
          })
          .catch((error) => {
            console.error('Error updating task status: ', error);
          });
      } else {
        console.log('Task completion canceled by user');
      }
    }
  }
  // reportTask(task:any){
  //   const reason = window.prompt(`Enter a reason for reporting Task: ${task.description}:`);
  //   let  mail: string[] = [];
  //   if (reason) {
  //     this.firestore
  //     .collection('tasks')
  //     .doc(task.id)
  //     .update({
  //       comment: reason
  //     })
  //     .then(() => {
  //       const formattedDeadline = this.datePipe.transform(task.deadline, 'MMMM dd, y, h:mm:ss a');
  //       let bodydata = {
  //         "recipients": [task.leadermail],
  //         "subject": [task.client]+`:Request for Deadline Extension for: ${task.description}`,
  //         "body": `${this.nm} requested an extension for the deadline of Task: ${task.description}<br> originally due on <br>Deadline:${ formattedDeadline} <br>Due to reason:${reason}.<br>Please take necessary actions.<br><br>Reagrds,<br>DTS`,
  //       };
  //       this.firestoreService.sendMail(bodydata)
  //       // Refresh the tasks list after the update
  //       this.fetchTasks();
  //     })
  //     .catch((error) => {
  //       console.error('Error updating task status: ', error);
  //     });
  //     console.log(`Task ${task.id} reported for reason:`, reason);
  //     alert(`reported successfully!`);
  //   } else {
  //     alert("Report cancelled.");
  //   }
  // }


openReportModal(task: any) {
  this.selectedTask = task;
  this.reasonInput = '';
  this.showModal = true;
}

closeModal() {
  this.showModal = false;
}

submitReport() {
  if (!this.reasonInput) {
    alert('Please enter a reason.');
    return;
  }

  const task = this.selectedTask;
  const reason = this.reasonInput;

  this.firestore
    .collection('tasks')
    .doc(task.id)
    .update({ comment: reason })
    .then(() => {
      const formattedDeadline = this.datePipe.transform(task.deadline, 'MMMM dd, y, h:mm:ss a');
      const bodydata = {
        recipients: [task.leadermail],
        subject: [task.group] + `:Request for Deadline Extension for: ${task.description}`,
        body: `${this.nm} requested an extension for the deadline of Task: ${task.description}<br> originally due on <br>Deadline:${formattedDeadline} <br>Due to reason:${reason}<br>Please take necessary actions.<br><br>Regards,<br>DTS Team`,
      };
      this.firestoreService.sendMail(bodydata);
      this.fetchTasks();
      alert('Reported successfully!');
      this.closeModal();
    })
    .catch((error) => {
      console.error('Error updating task status: ', error);
    });
}

  async onSubmit() {
    if (this.clientForm.valid) {
      const formValue = this.clientForm.value;
      const month = new Date(formValue.monthYear).toLocaleString('default', { month: 'long' });
      const year = new Date(formValue.monthYear).getFullYear();
      const finalData = {
        reportType:formValue.ReportType,
        groupName:formValue.groupName,
        clientName: formValue.clientName,
        Period:month+' '+year,
        ops:this.employeeId,
        AssignedTo:"Pending",
        opsName:this.nm
      };

      try {
        await this.firestore.collection('QcReports').add(finalData);
        alert('Request Sent Successfully!');
        this.clientForm.reset();
      } catch (error) {
        console.error('Error saving to Firebase:', error);
      }
    }
  }
   fetchTasks() {
    this.firestore
      .collection('tasks', ref => ref.where('assignedTo', '==', this.employeeId ))  // Filter tasks based on employeeId
      .valueChanges({ idField: 'id' }).pipe(take(1))  // Include document id in result
      .subscribe((tasks: any[]) => {
        this.tasks = tasks;
        console.log("Assigned tasks: ", this.tasks);
        this.sortTasks(this.tasks);
      });
      // this.firestore
      // .collection('scheduledTasks', ref => ref.where('assignedTo', '==', this.employeeId ))  // Filter tasks based on employeeId
      // .valueChanges({ idField: 'id' })  // Include document id in result
      // .subscribe((tasks: any[]) => {
      //   this.scheduledTasks = tasks;
      //   console.log("Assigned scheduled tasks: ", this.tasks);
      // });
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
