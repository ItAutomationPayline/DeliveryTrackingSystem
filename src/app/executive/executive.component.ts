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
    monthYear: ['', Validators.required],
  });
 }
 tasks: any[] = [];
 rec: string[] = [];
 scheduledTasks: any[] = [];
 showModal = false;
 selectedTask: any = null;
 AllClientsAndGroups:any[] = [];
 reasonInput: string = '';
 employeeId: any= localStorage.getItem('id');
 profile:any = {};
 Leader:any = {};
 nm:any=localStorage.getItem('nm');
public sessionTimeout: any;
public inactivityDuration = 15 * 60 * 1000;
  ngOnInit() {
    const role = localStorage.getItem('role');
    const token=localStorage.getItem('authToken');
    
    if ((!token) || (role !== 'Executive')) {
      this.router.navigateByUrl('/login');
      return;
    }

    const id = localStorage.getItem('id');
    this.fetchTasks();
    // this.fetchClients();
    this.sortTasks(this.tasks);
    if (!sessionStorage.getItem('hasReloaded')) {
      sessionStorage.setItem('hasReloaded', 'true'); // Mark reload in session storage
      window.location.reload(); // Force reload of the entire page
    } else {
      sessionStorage.removeItem('hasReloaded'); // Clear the reload marker after the first load
      console.log('Component initialized after reload');
    }
    this.fetchprofile();
    this.fetchSelfLeaderProfile();
    this.startSessionTimer();
   }
   
   fetchSelfLeaderProfile() {
  this.firestore
    .collection('teams', ref => ref.where('employees', 'array-contains', this.employeeId))
    .valueChanges()
    .pipe(take(1))
    .subscribe(
      (data: any[]) => {
        if (data && data.length > 0) {
          const team = data[0]; // assuming one team per employee
          const managerId = team.managerId;
          if (managerId) {
            console.log('✅ Manager found with ID:', managerId);
              this.firestore.collection('users')
              .doc(managerId).valueChanges()
              .subscribe(user => {
                this.Leader = user || {};
                console.log('✅ LEADER:', this.Leader);
              });
          } else {
            console.warn('⚠️ Team found but managerId is missing.');
          }
        }
      },
      (error) => {
        alert('Failed to fetch team data. Please try again later.');
        console.error('Error fetching team:', error);
      }
    );
}
   fetchprofile()
   {
      this.firestore
    .collection('users')
    .doc(this.employeeId)
    .valueChanges()
    .subscribe(user => {
      this.profile = user || {};
      console.log("Profile loaded:", this.profile);
    });
          console.log("prof:::"+this.profile);
    }
  // fetchClients()
  // {
  //   this.firestore
  //   .collection('clients', ref => ref.where('status', '==', 'Active'))
  //   .valueChanges({ idField: 'id' })
  //   .subscribe((tasks: any[]) => {
  //     this.AllClientsAndGroups = tasks;
  //   });
  // }
   sortTasks(tasksWithNames: { group: string; deadline: string }[]): { group: string; deadline: string }[] {
    return tasksWithNames.sort((a, b) => {
      const clientCompare = a.group.localeCompare(b.group);
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
    tomorrow.setDate(today.getDate() + 2);

    return taskDate <= tomorrow;
}

   updateTaskStatus(taskId: string) {
    const taskToUpdate = this.tasks.find(task => task.id === taskId);
    
    if (taskToUpdate) {
      const isConfirmed = window.confirm(
        `Are you sure you want to mark "${taskToUpdate.description}" as Completed?`
      );
      
      if (isConfirmed) {
        if(taskToUpdate.description=="Customer Provides Payroll Inputs"||taskToUpdate.description=="Payroll Input Received"||taskToUpdate.description=="Payroll Inputs to Partner")
        {
          const bodydata = {
          recipients: [this.Leader.email],
          subject: [taskToUpdate.group] + `: Payroll Input Received`,
          body: `This is to inform you that the payroll input of client ${taskToUpdate.client} has been received.<br>I will proceed with the necessary processing as per the defined timelines.<br><br>Best regards,<br>${this.nm}`,
          };
          this.firestoreService.sendMail(bodydata);
        }
        if(taskToUpdate.description=="Compliance Reports to Customer")
          {
            this.firestore.collection('compliance', ref =>
                              ref.where('group', '==', taskToUpdate.group)
                                  .where('client', '==', taskToUpdate.client)
                                  .where('period', '==', taskToUpdate.period)
                            ).get().subscribe(querySnapshot => {
                              querySnapshot.forEach(doc => {
                                this.firestore.collection('compliance').doc(doc.id).delete()
                                  .then(() => {
                                    console.log(`Deleted document: ${doc.id}`);
                                  })
                                  .catch(error => {
                                    console.error(`Error deleting document: ${doc.id}`, error);
                                  });
                              });
                            });
          }
        if(taskToUpdate.description.includes("Query")||taskToUpdate.description.includes("query"))
        {
          let resolution = prompt("Kindly provide the resolution:");
          if (!resolution || resolution.trim() === '') {
              alert("resolution is required. Submission cancelled.");
              return; // Stop execution
            }
           // Step 1: Get the document
            this.firestore.collection('compliancerequests')
              .doc(taskToUpdate.reportid)
              .get()
              .subscribe((doc: any) => {
                const data = doc.data();
                const findings = data.findings || [];
                // Step 2: Find the specific finding
                const index = findings.findIndex((f: any) =>
                  f.findingId === taskToUpdate.findingId
              );
                if (index !== -1) {
                  findings[index].resolution = resolution;
                  this.firestore.collection('compliancerequests')
                    .doc(taskToUpdate.reportid)
                    .update({ findings })
                    .then(() => alert("Resolution added successfully ✅"))
                    .catch((error) => alert("Error updating resolution:"+ error));
                }
              });
      this.firestore
      .collection('users', ref => ref.where('role', '==', ['Compliance Lead']))
      .get()
      .subscribe((querySnapshot: any) => {
         querySnapshot.forEach((doc: any) => {
          const userData = doc.data();
          if (userData.email) {
            this.rec.push(userData.email);
          }
      })});
          this.firestoreService.getUserById(taskToUpdate.complianceid).subscribe(userData => {
       if (userData.length > 0) {
         const user = userData[0];
         this.rec.push(user.email);
         this.rec.push(this.Leader.email);
        //  this.rec.push(this.profilemail);
         let recipients= [...new Set(this.rec)];
         console.log("Sorted recipents:",recipients);
         let bodydata = {
          "recipients": recipients,
          "subject": `${taskToUpdate.group}: Query Resolution`,
          "body": `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <div style="max-width: 800px; margin: 0 auto;">
                  <p>Hi ${user.name},</p>
                  <p>Hope you're doing well.</p>
                  <p>Please find attached resolution for the query of the client,
                  <b>${taskToUpdate.client}</b> for the period of
                  <b>${taskToUpdate.period}</b>.</p>
                  <ul>
                    <li>${taskToUpdate.description}</li>
                  </ul>
                  <p><b>Resolution:</b></p>
                  <ul>
                    <li>${resolution}</li>
                  </ul>
                  <p>Please review and confirm if any further action is required.</p>
                  <p>Best regards,<br>
                    ${this.nm}
                  </p>
                </div>
              </body>
            </html>`
        };
        console.log(bodydata);
      this.firestoreService.sendMail(bodydata);
       }
     });
        }
        if(taskToUpdate.description.includes("Payroll Approval Notification to Partner")||taskToUpdate.description.includes("Customer Approves the Payroll Reports"))
        {
          let headcount = prompt("Kindly provide the headcount");
          if (!headcount || headcount.trim() === '') {
              alert("Headcount is required. Submission cancelled.");
              return; // Stop execution
            }
          this.firestore
          .collection('tasks')
          .doc(taskId)
          .update({
            headcount: headcount,
          });
          let originalDate = new Date(taskToUpdate.deadline);
          originalDate.setDate(originalDate.getDate() + 5);
          let task2 = {
            assignedTo: taskToUpdate.assignedTo,
            teamId: taskToUpdate.teamId,
            period:taskToUpdate.period,
            group:taskToUpdate.group,
            client: taskToUpdate.client,
            description: "Compliance Reports to Customer",
            deadline: originalDate.toISOString(), // Convert deadline to ISO format
            completedAt:'',
            status: 'Pending',
            createdBy:taskToUpdate.createdBy,
            leadermail: taskToUpdate.leadermail,
            clientStatus:'Active',
            comment:"",
            country:taskToUpdate.country
          };
          this.firestore.collection('tasks')
          .add(task2).then(() => {})
          .catch((error) => {
            alert('Failed to assign task. Please try again.');
          });
          let task3 = {
            period:taskToUpdate.period,
            group:taskToUpdate.group,
            client: taskToUpdate.client,
            status: 'In-Progress',
            clientStatus:'Active',
            comment:""
          };
          this.firestore
          .collection('compliance')
          .add(task3)
          .then(() => {
          })
          .catch((error) => {
            alert('Failed to assign task. Please try again.');
          });

        }
        if(taskToUpdate.description=="Payroll Reports To Compliance")
        { 
          let desc;
           const regex = /\bto\b/i; // Matches the word 'to' as a whole word, case-insensitive
           const match = taskToUpdate.description.match(regex);
           if (match && match.index !== undefined) {
              desc=taskToUpdate.description.substring(0, match.index).trim();
            }
            let link = prompt("Paste the link of reports if any:");
            if (!link || link.trim() === '') {
              alert("Link is required. Submission cancelled. Kindly submit again");
              return; // Stop execution
            }
            let userNote = prompt("Enter a note/special instruction for compliance if any:");
            let finalData = {
              taskId:taskId,
              reportType:"Compliance Request",
              groupName:taskToUpdate.group,
              clientName: taskToUpdate.client,
              Period:taskToUpdate.period,
              ops:this.employeeId,
              opsmail:this.profile.email,
              AssignedTo:"Pending",
              opsName:this.nm,
              status:"Pending",
              note:userNote,
              createdBy:taskToUpdate.createdBy,
              link:link,
              createdAt: new Date(),
              leadermail:taskToUpdate.leadermail
            };
             this.firestore
              .collection('users', ref => ref.where('role', 'in', ['Compliance Lead', 'Compliance']))
              .get()
              .subscribe((querySnapshot: any) => {
                let recipients: string[] = [];
                querySnapshot.forEach((doc: any) => {
                  const userData = doc.data();
                  if (userData.email) {
                    recipients.push(userData.email);
                  }
            
                });
            recipients.push(this.Leader.email);
              if (recipients.length > 0) {
                const subject = `${taskToUpdate.group}: Compliance Request: ${taskToUpdate.reportType}`;
                const body = `
                  <p>Dear Compliance Team,</p>
                  Please check ${taskToUpdate.reportType} of client<br> ${taskToUpdate.client}<br>
                  of period:${taskToUpdate.period}.<br>
                  link:${link}<br>
                  note:${userNote}<br>
                  For any issues or queries or if link is not given, feel free to reach out.<br>
                  <p>Best regards,
                  <br>${localStorage.getItem('nm')}</p>`;
                recipients=[...new Set(recipients)];
                const bodydata = {
                  recipients: recipients,
                  subject: subject,
                  body: body
                };
                console.log("qcteam:"+recipients);
                this.firestoreService.sendMail(bodydata);
              }
              else {
                console.warn('No manager emails found to send notification.');
              }
              }, (error: any) => {
                console.error('Error fetching managers:', error);
              });
            try {
              this.firestore.collection('compliancerequests').add(finalData);
              alert('Request Sent To Compliance Successfully!');
              //this.clientForm.reset();
              
            } catch (error) {
              console.error('Error saving to Firebase:', error);
            }
        }
        if(taskToUpdate.QcApproval=="Pending")
        { 
          let desc;
           const regex = /\bto\b/i; // Matches the word 'to' as a whole word, case-insensitive
           const match = taskToUpdate.description.match(regex);
           if (match && match.index !== undefined) {
              desc=taskToUpdate.description.substring(0, match.index).trim();
            }
            let link = prompt("Paste the link of reports if any:");
            if (!link || link.trim() === '') {
              alert("Link is required. Submission cancelled. Kindly submit again");
              return; // Stop execution
            }
            // if (!(link.includes(":") && (link.includes("\\") || link.includes("/")))) {
            //     alert("Please provide a valid link.");
            //     return;
            // }
            let userNote = prompt("Enter a note/special instruction for qc if any:");
            let finalData = {
              taskId:taskId,
              reportType:desc,
              createdBy:taskToUpdate.createdBy,
              groupName:taskToUpdate.group,
              clientName: taskToUpdate.client,
              Period:taskToUpdate.period,
              ops:this.employeeId,
              AssignedTo:"Pending",
              opsName:this.nm,
              status:"Pending",
              note:userNote,
              link:link,
              createdAt: new Date(),
              leadermail:taskToUpdate.leadermail
            };
             this.firestore
              .collection('users', ref => ref.where('role', 'in', ['QCLead', 'QC','Manager','General Manager']))
              .get()
              .subscribe((querySnapshot: any) => {
                let recipients: string[] = [];
                querySnapshot.forEach((doc: any) => {
                  const userData = doc.data();
                  if (userData.email) {
                    recipients.push(userData.email);
                  }
            
                });
            recipients.push(this.Leader.email);
              if (recipients.length > 0) {
                const subject = `${taskToUpdate.group}: QC Request: ${taskToUpdate.reportType}`;
                const body = `
                  <p>Dear QC Team,</p>
                  Please check ${taskToUpdate.reportType} of client<br> ${taskToUpdate.client}<br>
                  of period:${taskToUpdate.period}.<br>
                  link:${link}<br>
                  note:${userNote}<br>
                  For any issues or queries or if link is not given, feel free to reach out.<br>
                  <p>Best regards,
                  <br>${localStorage.getItem('nm')}</p>
                `;
                recipients=[...new Set(recipients)];
                const bodydata = {
                  recipients: recipients,
                  subject: subject,
                  body: body
                };
                console.log("qcteam:"+recipients);
                this.firestoreService.sendMail(bodydata);
              }
              else {
                console.warn('No manager emails found to send notification.');
              }
              }, (error: any) => {
                console.error('Error fetching managers:', error);
              });
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
            // console.log(`Task ${taskId} marked as complete`);
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            // this.fetchTasks();
          })
          .catch((error) => {
            console.error('Error updating task status: ', error);
          });
      } else {
        console.log('Task completion canceled by user');
      }
    }
  }
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
    let now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 2);
    now.setHours(23, 59, 0, 0);
    tomorrow.setHours(23, 59, 0, 0);
    this.firestore
      .collection('tasks', ref => ref.where('status', '!=', 'Completed' ).where('assignedTo', '==', this.employeeId ).where('deadline', '<=', tomorrow.toISOString()))  // Filter tasks based on employeeId
      .valueChanges({ idField: 'id' }).pipe(take(1))  // Include document id in result
      .subscribe((tasks: any[]) => {
        this.tasks = tasks;
        console.log("Assigned tasks: ", this.tasks);
        setTimeout(() => {
          this.sortTasks(this.tasks);
        }, 500);
      });
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
  resetSessionTimer() {
    this.startSessionTimer();
  }
  // Listen for user interaction events and reset the timer
  @HostListener('document:mousemove')
  @HostListener('document:click')
  @HostListener('document:keydown')
  handleUserActivity() {
    this.resetSessionTimer(); // Reset timer on activity
  }
}
