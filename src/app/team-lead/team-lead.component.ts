import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';
import { DatePipe } from '@angular/common';
import * as XLSX from 'xlsx';
import { debounce, take } from 'rxjs';

@Component({
  selector: 'app-team-lead',
  standalone: false,
  templateUrl: './team-lead.component.html',
  styleUrls: ['./team-lead.component.css'], // Fixed styleUrls typo
  providers: [DatePipe]
})

export class TeamLeadComponent {
  PayPeriod: string = '';//for prepone or postpone
  Days: any = '';//for prepone or postpone
  Preponeorpostponeaction: string = '';
  newFinding = {
    description: '',
    category: '',
    employees:'',
    timestamp: new Date()
  };
  private comebackModalResolver: (() => void) | null = null;
  currentReport = {
    findings: [] as any[]
  };
  teams: any[] = [];
  payPeriods: string[] = [];
  managerId: any = '';
  beforedeadline: any;
  // List of teams led by the team lead
  profile:any = {};
  leadmail:any=localStorage.getItem('profilemail');
  selectedTeamId: string | null = null;
  AllClientsAndGroups:any[] = [];
  AllClients:string[] = [];
  AllGroups:string[]=[];
  teamMembers: string[] = []; // Members of the selected team
  taskDescription: string = '';
  GroupName: string = '';
  ClientName: string = '';
  filterThings: string[] = [];
  filterClients: string[] = [];
  filterGroups: string[] = [];
  filterDescription: string[] = [];
  filterAssignedTo: string[] = [];
  filterStatus: string[] = [];
  clientDropdownOpen = false;
  allClients: string[] = [];
  selectedMemberId: string | null = null;
  taskDeadline: string = ''; // Deadline in ISO format
  membersWithNames: any[] = [];
  tasksAssigned: any[] = []; // Tasks assigned by the logged-in Team Lead
  scheduledTasksAssigned: any[] = [];
  teamLeadId: any = localStorage.getItem('id');
  tasksWithNames: any[] = [];
  scheduledTasksAssignedWithNames: any[] = [];
  // tasksWithDeadlines: { description: string; deadlines: string[] }[] = [];
  tasksWithDeadlines: any[] = [];
  userCache: { [key: string]: string } = {};
  memberNames:  any[] = [];
  rec: string[] = [];
  minDeadline: string = '';
  selectedTime: string = '';
  tableData: any[][] = [];
  taskToEdit: any = null;
  Client: string = '';
  editTaskDescription: string = '';
  editTaskGroup: string = '';
  editTaskClient: string = '';
  editTaskDate: string = '';
  editTaskComment: string = '';
  editSelectedMemberId: string | null = null;
  editTaskDeadline: string = '';
  payperiod:string='';
  public sessionTimeout: any;
  public inactivityDuration = 20 * 60 * 1000;
  
  constructor(private cdRef: ChangeDetectorRef,private router: Router, private firestore: AngularFirestore,private firestoreService: FirestoreService,private datePipe: DatePipe) {}

  ngOnInit() {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('authToken');
     this.managerId = localStorage.getItem('id'); // Retrieve logged-in Team Lead's ID from localStorage
      if (!token || role !== 'Manager') {
        if (!token || role !== 'Team Lead') {
          this.router.navigateByUrl('/login');
          return;
        }
      }
      this.teams=[];
      this.tasksAssigned=[];
      this.memberNames=[];
      this.membersWithNames=[];
      this.userCache = {};
      this.minDeadline='';
      this.editTaskDescription='';
      this.editSelectedMemberId='';
      this.editTaskDeadline='';
      this.tasksWithNames=[];
      this.scheduledTasksAssigned=[];
      this.filterClients=[];
      this.filterAssignedTo=[];
      this.filterDescription=[];
      this.filterStatus=[];
      this.scheduledTasksAssignedWithNames=[];
      console.log("leadmail",this.leadmail);
      this.profile[0]="";
      this.fetchselfprofile();
      this.getTeams(this.managerId);
      setTimeout(() => {
        this.loadData(this.managerId); // Your logic here
      }, 1500);
    this.fixDeadlinesOnSunday();
    this.updateMinDeadline();
    this.getFilteredClients();
    this.getFilteredDescription();
    this.loadDescriptionSuggestions();
      setTimeout(() => {
       this.fetchClients();
      }, 1500);
    this.startSessionTimer();
    this.fillPayPeriods();
     setTimeout(() => {
        this.fixDeadlinesOnSunday();// Your logic here
      }, 1500);
  }
  fixDeadlinesOnSunday() {
  console.log("Method initiated for Sunday check");
  this.tasksWithNames.forEach((task: any) => {
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);
      // Check if it's Sunday (0 = Sunday, 6 = Saturday)
      if (deadlineDate.getDay() === 0) {
        console.log("Task found on Sunday.");
        // Move deadline back to Saturday (same hour/minute/second)
        deadlineDate.setDate(deadlineDate.getDate() - 1);
        // Convert back to ISO format before saving
        const updatedISO = deadlineDate.toISOString();
        this.firestore.collection('tasks').doc(task.id).update({
          deadline: updatedISO
        }).then(() => {
          console.log(`Deadline moved to Saturday for task: ${task.id}`);
        }).catch(err => {
          console.error(`Error updating task ${task.id}:`, err);
        });
      }
    }
  });
}
  fillPayPeriods(): void {
  const today = new Date();
  // helper to format month + year
  const formatMonthYear = (date: Date): string =>
    date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  // previous month
  const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previous = formatMonthYear(prevDate);
  // current month
  const current = formatMonthYear(today);
  // next month
  const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const next = formatMonthYear(nextDate);
  // store in array
  this.payPeriods = [previous, current, next];
}
addFinding() {
  if (this.newFinding.description && this.newFinding.category) {
    this.currentReport.findings.push({
      description: this.newFinding.description,
      category: this.newFinding.category,
      employees:this.newFinding.employees,
      timestamp: new Date()
    });
    // Reset input fields
    this.newFinding = { description: '', category: '',employees:'', timestamp: new Date() };
  }
}

deleteFinding(index: number) {
  this.currentReport.findings.splice(index, 1);
}
  fetchselfprofile()
   {
      this.firestore
    .collection('users')
    .doc(this.managerId)
    .valueChanges()
    .subscribe(user => {
      this.profile = user || {};
      console.log("Profile loaded:", this.profile);
    });
    }

   markTaskasComplete(taskToUpdate: any) {
    if (taskToUpdate) {
      const isConfirmed = window.confirm(
        `Are you sure you want to mark "${taskToUpdate.description}" as Completed?`
      );
      
      if (isConfirmed) {
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
        if(taskToUpdate.description.includes("Approves")||taskToUpdate.description.includes("Payroll Approval Notification to Partner")||taskToUpdate.description.includes("Customer Approves the Payroll Reports"))
        {
          let headcount = prompt("Kindly provide the headcount");
           if (!headcount || headcount.trim() === '') {
              alert("Headcount is required. Submission cancelled. Kindly submit again.");
              return; // Stop execution
            }
          this.firestore
          .collection('tasks')
          .doc(taskToUpdate.id)
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
            comment:""
          };
          this.firestore
          .collection('tasks')
          .add(task2)
          .then(() => {
          })
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
              alert("Link is required. Submission cancelled. Kindly submit again.");
              return; // Stop execution
            }
            // if (!(link.includes(":") && (link.includes("\\") || link.includes("/")))) {
            //     alert("Please provide a valid link.");
            //     return;
            // }
            let userNote = prompt("Enter a note/special instruction for qc if any:");
            let finalData = {
              taskId:taskToUpdate.id,
              reportType:desc,
              groupName:taskToUpdate.group,
              clientName: taskToUpdate.client,
              Period:taskToUpdate.period,
              ops:taskToUpdate.assignedTo,
              AssignedTo:"Pending",
              opsName:taskToUpdate.assignedToName,
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
            // recipients.push(taskToUpdate.leadermail);
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
                const bodydata = {
                  recipients: recipients,
                  subject: subject,
                  body: body
                };
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
          .doc(taskToUpdate.id)
          .update({
            status: 'Completed',
            completedAt:new Date().toISOString()
          })
          .then(() => {
            this.fetchAssignedTasks();
          })
          .catch((error) => {
            console.error('Error updating task status: ', error);
          });
      } else {
        console.log('Task completion canceled by user');
      }
    }
  }
  fetchClients()
  {
    const allowedCountries = Array.isArray(this.profile.country)
  ? this.profile.country
  : [this.profile.country];
    this.firestore
    .collection('clients', ref => ref.where('status', '==', 'Active').where('country','in',allowedCountries))
    .valueChanges({ idField: 'id' }) // Include document ID in the result
    .subscribe((tasks: any[]) => {
      this.AllClientsAndGroups = tasks;
    });
  }
  // get uniqueClients(): string[] {
  //   this.filterClients=Array.from(new Set(this.tasksWithNames.map(t => t.client))).sort();
  //   return Array.from(new Set(this.tasksWithNames.map(t => t.client))).sort();
  // }
  getFilteredClients()
  {
    this.filterClients=[];
    this.filterClients=Array.from(new Set(this.tasksAssigned.map(t => t.client))).sort();
  }
  getFilteredGroups()
  {
    this.filterGroups=[];
    this.filterGroups=Array.from(new Set(this.tasksAssigned.map(t => t.group))).sort();
  }
  getFilteredDescription()
  {
    this.filterDescription=[];
    this.filterDescription=Array.from(new Set(this.tasksAssigned.map(t => t.description))).sort();
  }
  getFilteredAssignedTo()
  {
    this.filterAssignedTo=[];
    this.filterAssignedTo=Array.from(new Set(this.tasksWithNames.map(t => t.assignedToName))).sort();
  }
  getFilteredStatus()
  {
    this.filterStatus=[];
    this.filterStatus=Array.from(new Set(this.tasksWithNames.map(t => t.status))).sort();
  }
  formatPeriod(isoDate: string): string 
  {
  const date = new Date(isoDate);
  const month = date.toLocaleString('default', { month: 'long' }); // e.g., "May"
  const year = date.getFullYear();
  return `${month} ${year}`;
  }
  // get uniqueClients(): string[] {
  //   return [...new Set(this.data.map(item => item.client).filter(Boolean))];
  // }
  filters = {
    group:'',
    client: '',
    description: '',
    assignedToName: '',
    deadline: '',
    status: '',
    comment: ''
  };
  
  filteredTasks() {
    return this.tasksWithNames.filter(task =>
      (!this.filters.group || task.group?.toLowerCase().includes(this.filters.group.toLowerCase()))&&
      (!this.filters.client || task.client?.toLowerCase().includes(this.filters.client.toLowerCase())) &&
      (!this.filters.description || task.description?.toLowerCase().includes(this.filters.description.toLowerCase())) &&
      (!this.filters.assignedToName || task.assignedToName?.toLowerCase().includes(this.filters.assignedToName.toLowerCase())) &&
      (!this.filters.deadline || new Date(task.deadline).toLocaleString().toLowerCase().includes(this.filters.deadline.toLowerCase())) &&
      (!this.filters.status || task.status?.toLowerCase().includes(this.filters.status.toLowerCase())) &&
      (!this.filters.comment || task.comment?.toLowerCase().includes(this.filters.comment.toLowerCase()))
    );
  }
   sortTasks(tasksWithNames: { client: string; deadline: string }[]): { client: string; deadline: string }[] {
    return tasksWithNames.sort((a, b) => {
      const clientCompare = a.client.localeCompare(b.client);
      if (clientCompare !== 0) return clientCompare;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }
  loadDescriptionSuggestions() {
    this.filterThings=[];
    this.filterThings = Array.from(new Set(this.tasksWithNames.map(t => t.description)))
                        .filter(client => client) // remove empty values
                        .sort();
  }
  loadAssignedToSuggestions() {
    this.filterThings=[];
    this.filterThings = Array.from(new Set(this.tasksWithNames.map(t => t.assignedToName)))
                        .filter(client => client) // remove empty values
                        .sort();
  }
onFileChange(event: any) {
  const target: DataTransfer = <DataTransfer>event.target;
  if (target.files.length !== 1) {
    alert('Cannot upload multiple files');
    return;
  }

  const reader: FileReader = new FileReader();
  reader.onload = (e: any) => {
    const bstr: string = e.target.result;
    const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

    const wsname: string = wb.SheetNames[0];
    const ws: XLSX.WorkSheet = wb.Sheets[wsname];

    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (data.length > 1) {
      const headerRow = data[0]; // First row: headers

      for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        const payPeriod = row[0]; // Assuming 1st column is Pay Period

        for (let colIndex = 1; colIndex < row.length; colIndex++) {
          const description = headerRow[colIndex];
          const deadline = row[colIndex];

          if (description &&deadline &&description.trim() !== "Day" &&description.trim() !== "PayPeriod") 
          {
            this.tasksWithDeadlines.push({
              payPeriod: String(payPeriod),
              description: String(description),
              deadline: String(deadline),
            });
          }
        }
      }
    }
  };

  reader.readAsBinaryString(target.files[0]);

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

  ngOnDestroy() {
    this.teams=[];
    this.tasksAssigned=[];
    this.memberNames=[];
    this.membersWithNames=[];
    this.userCache = {};
    this.minDeadline='';
    this.editTaskDescription='';
    this.editSelectedMemberId='';
    this.editTaskDeadline='';
    this.tasksWithNames=[];
  }
  loadData(managerId:any): void {
    this.fetchAssignedTasks();
    this.sortTasks(this.tasksWithNames);
    //this.fetchAssignedScheduledTasks();
     // Pass the managerId to getTeams
    console.log("membernames",this.memberNames)
  }

  openEditModal(task: any) {
    this.editTaskGroup=task.group;
    this.editTaskClient=task.client;
    this.taskToEdit = task;
    this.beforedeadline=task.deadline;
    this.editTaskDescription = task.description;
    this.editSelectedMemberId = task.assignedTo;
    this.editTaskComment=task.comment;
    const utcDate = new Date(task.deadline);
    utcDate.setMinutes(utcDate.getMinutes() - utcDate.getTimezoneOffset()); // Convert to local time
    this.editTaskDeadline = utcDate.toISOString().slice(0, 16); // Format properly
    console.log("DEADLINE:"+this.editTaskDeadline);
  }
  updateTask() {
    if (this.taskToEdit) {
      const updatedTask = {
        group:this.editTaskGroup,
        client:this.editTaskClient,
        description: this.editTaskDescription,
        assignedTo: this.editSelectedMemberId,
        deadline: new Date(this.editTaskDeadline).toISOString(),
        comment:this.editTaskComment
      };
      this.firestore
        .collection('tasks')
        .doc(this.taskToEdit.id)
        .update(updatedTask)
        .then(() => {
          this.taskUpdatedAlert(updatedTask);
          alert('Task updated successfully!');
          this.taskToEdit = null;
          this.fetchAssignedTasks(); // Refresh task list
          this.closeModal(); // Close modal
        })
        .catch((error) => {
          console.error('Error updating task:', error);
        });
    }
  }
  taskUpdatedAlert(updatedTask: any) {
    this.firestore
      .collection('users', ref => ref.where('role', '==', 'Manager'))
      .get()
      .subscribe((querySnapshot: any) => {
        const recipients: string[] = [];
        querySnapshot.forEach((doc: any) => {
          const userData = doc.data();
          if (userData.email) {
            recipients.push(userData.email);
          }
        });
        if (recipients.length > 0) {
          const subject = `${updatedTask.group}: Task Updated: ${updatedTask.description}`;
          const body = `
            <p>Dear Manager,</p>
            <p>Team Leader ${localStorage.getItem('nm')} updated a task in the DTS with the following details:</p>
            <ul>
              <li><strong>Client:</strong> ${updatedTask.client}</li>
              <li><strong>Description:</strong> ${updatedTask.description}</li>
              <li><strong>Deadline:</strong> From ${new Date(this.beforedeadline).toLocaleString()} to ${new Date(updatedTask.deadline).toLocaleString()}</li>
              <li><strong>Reason:</strong> ${updatedTask.comment}</li>
            </ul>
            <p>Best regards,<br>DTS</p>
          `;
          console.log("BODY:"+body);
          const bodydata = {
            recipients: recipients,
            subject: subject,
            body: body
          };
  
          this.firestoreService.sendMail(bodydata);
        } else {
          console.warn('No manager emails found to send notification.');
        }
      }, (error: any) => {
        console.error('Error fetching managers:', error);
      });
  }
   PreponeorPostPone() {
  if(this.GroupName=='')
    {
      alert("Group name is required");
      return;
    }
  if(this.ClientName=='')
    {
      alert("Client name is required.");
      return;
    }
  if(this.PayPeriod=='')
    {
      alert("valid PayPeriod is required.");
      return;
    }
  if(this.Days=='')
    {
      alert("valid Days are required.");
      return;
    }
    if(this.Preponeorpostponeaction=='')
    {
      alert("Choose Prepone or Postpone.");
      return;
    }
  console.log(this.GroupName);
  console.log(this.ClientName);
  console.log(this.PayPeriod);
  console.log(this.Days);
  console.log(this.Preponeorpostponeaction);

  this.firestore.collection('tasks', ref =>
    ref.where('group', '==', this.GroupName)
       .where('client', '==', this.ClientName)
       .where('period', '==', this.PayPeriod)
  ).get().toPromise().then(querySnapshot => {
    if (!querySnapshot || querySnapshot.empty) {
      alert("No tasks found. Make sure you've correctly spelled client, group and period");
      return;
    }

    const batch = this.firestore.firestore.batch();

  querySnapshot.forEach(doc => {
  const taskData: any = doc.data();
  const rawDeadline = taskData.deadline;

  console.log(`Document ${doc.id} raw deadline:`, rawDeadline);

  const originalDeadline = new Date(rawDeadline);
  if (isNaN(originalDeadline.getTime())) {
    console.warn(`Skipping document ${doc.id}: invalid or missing deadline`);
    return;
  }

  const daysToAdjust = this.Preponeorpostponeaction === 'Prepone'
    ? -this.Days
    : this.Days;

  const newDeadline = new Date(originalDeadline);
  newDeadline.setDate(newDeadline.getDate() + daysToAdjust);

  // Save as ISO string to maintain consistency
  batch.update(doc.ref, { deadline: newDeadline.toISOString() });
});

    batch.commit().then(() => {
      if(this.Preponeorpostponeaction==="Prepone")
        {
          alert(`Payroll of client: ${this.GroupName} having period ${this.PayPeriod} is preponed to ${this.Days} days.`);
        }
        else
          {
             alert(`Payroll of client: ${this.GroupName} having period ${this.PayPeriod} is postponed to ${this.Days} days.`);
          }
      
    }).catch(commitErr => {
      console.error("Error committing batch:", commitErr);
    });

  }).catch(error => {
    console.error("Error retrieving tasks:", error);
  });
}
async openComebackModal(): Promise<void> {
  return new Promise(resolve => {
    const modal = document.getElementById('addComebackModal');
    if (modal) {
      // Add Bootstrap classes
      modal.classList.add('show');
      modal.setAttribute('style', 'display: block; padding-right: 17px;');
      modal.removeAttribute('aria-hidden');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('role', 'dialog');

      // Prevent body scrolling
      document.body.classList.add('modal-open');

      // Add backdrop if not already present
      if (!document.querySelector('.modal-backdrop')) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
      }

      // 🔑 Store resolver so closeComebackModal can call it
      this.comebackModalResolver = resolve;
    } else {
      resolve(); // if modal not found, resolve immediately
    }
  });
}
submitAllComebacks() {
  if ( !this.selectedMemberId ) {
    alert("Please fill all required fields (Group, Client, Ops person, Pay period).");
    return;
  }
  if ( this.newFinding.description!="" ) {
    alert("Please add or remove the comeback which you typed in the textbox.");
    return;
  }

  const comebackDoc = {
    group: this.GroupName,
    client: this.ClientName,
    assignedTo: this.selectedMemberId,
    payPeriod: this.payperiod,
    findings: this.currentReport.findings || [],
    createdBy: localStorage.getItem("id"),
    createdAt: new Date().toISOString(),  // or Firestore server timestamp
  };

  this.firestore
    .collection("comebacks")
    .add(comebackDoc)
    .then(() => {
      alert("Comebacks submitted successfully!");
      this.currentReport.findings = [];
      this.newFinding = { description: "", category: "",employees:"",timestamp:new Date() }; // reset input
      this.closeComebackModal();
    })
    .catch((error) => {
      console.error("Error adding comeback:", error);
      alert("Failed to submit comebacks. Please try again.");
    });
}
  // Close modal manually
  closeModal() {
    const modal = document.getElementById('updateTaskModal');
    if (modal) {
      (modal as any).classList.remove('show');
      (modal as any).style.display = 'none';
      document.body.classList.remove('modal-open');
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }
    }
  }
  closeComebackModal() {
  const modal = document.getElementById('addComebackModal');
  if (modal) {
    modal.classList.remove('show');
    modal.setAttribute('style', 'display: none;');
    document.body.classList.remove('modal-open');

    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
  }

  // ✅ Resolve the promise when modal closes
  if (this.comebackModalResolver) {
    this.comebackModalResolver();
    this.comebackModalResolver = null;
  }
}
  closeScheduledTasksModal() {
    const modal = document.getElementById('updateScheduledTaskModal');
    if (modal) {
      (modal as any).classList.remove('show');
      (modal as any).style.display = 'none';
      document.body.classList.remove('modal-open');
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }
    }
  }

  fetchAssignedTasks() {
    let now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 2);
    now.setHours(23, 59, 0, 0);
    tomorrow.setHours(23, 59, 0, 0);
    // Query Firestore for tasks where `createdBy` matches the Team Lead's ID
    this.firestore
      .collection('tasks', ref => ref.where('assignedTo','in',this.teamMembers).where('status', '!=', 'Completed').where('deadline', '<=', tomorrow.toISOString()))
      .valueChanges({ idField: 'id' })
      .pipe(take(1))
      .subscribe((tasks: any[]) => {
        this.tasksAssigned = tasks;
        console.log('Tasks assigned by you:', this.tasksAssigned);
        this.populateAssignedToNames();
        setTimeout(() => {
          this.sortTasks(this.tasksWithNames);
       }, 500);
      });
  }
  updateMinDeadline() {
    const now = new Date();
    this.minDeadline = now.toISOString().slice(0, 16); // Format as 'YYYY-MM-DDTHH:mm'
  }
  populateAssignedToNames() {
    this.tasksWithNames = []; // Reset the tasks array with names
    this.tasksAssigned.forEach((task) => {
      const assignedToId = task.assignedTo;
      // Check if the user's name is already cached
      if (this.userCache[assignedToId]) {
        this.tasksWithNames.push({
          ...task,
          assignedToName: this.userCache[assignedToId], // Add the name from the cache
        });
      }
      else {
        // Fetch the user's name from Firestore
        this.firestore
          .collection('users', (ref) => ref.where('id', '==', assignedToId))
          .valueChanges().pipe(take(1))
          .subscribe((users: any[]) => {
            if (users.length > 0) {
              const userName = users[0].name; // Assuming "name" is the field in the "users" collection
              this.userCache[assignedToId] = userName; // Cache the name for future use
              this.tasksWithNames.push({
                ...task,
                assignedToName: userName, // Add the name to the task
              });
            } else {
              console.log(`No user found with ID: ${assignedToId}`);
            }
          });
      }
    });
    this.sortTasks(this.tasksWithNames);
  }

  getTeams(managerId: string) {
    this.firestore
      .collection('teams', (ref) => ref.where('managerId', '==', managerId))
      .valueChanges().pipe(take(1))
      .subscribe(
        (data) => {
          if (data && data.length > 0) {
            this.teams = data;
            if (this.teams[0].employees && Array.isArray(this.teams[0].employees)) {
              this.teamMembers = [...this.teams[0].employees];
              this.getTeamMembers(); // Fetch names for team members
            }
          } else {
            console.log('No teams found for this manager.');
          }
        },
        (error) => {
          alert('Failed to fetch teams. Please try again later.');
          console.error('Error fetching teams:', error);
        }
      );
  }

  getTeamMembers() {
    this.membersWithNames = [];
    console.log("members:"+this.teamMembers)
    if (this.teamMembers && this.teamMembers.length > 0) {
      this.teamMembers.forEach((id) => {
        this.firestore
          .collection('users', (ref) => ref.where('id', '==', id))
          .valueChanges().pipe(take(1))
          .subscribe((users: any[]) => {
            if (users.length > 0) {
              const user = users[0];
              this.membersWithNames.push({ id: user.id, name: user.name });
            } else {
              console.log(`No user found for ID: ${id}`);
            }
          });
      });
    } else {
      console.log('No team members found.');
    }
  }
  formatExcelDate(value: any): string | null {
    if (!value) return null;
    // Handle Excel serial number
    if (!isNaN(value)) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return this.adjustTime(date).toISOString();
    }
    const strVal = value.toString().trim();
    // Match dd/mm/yyyy hh:mm or dd-mm-yyyy hh:mm
    const datetimeMatch = strVal.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})[ T](\d{2}):(\d{2})$/);
    if (datetimeMatch) {
      const [, dd, mm, yyyy, hh, min] = datetimeMatch;
      const date = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`);
      if (hh === '00' && min === '00') {
        date.setHours(23, 59, 0); // Replace 00:00 with 11:59 PM
      }else {
        date.setHours(date.getHours() + 3); // Add 4 hours to given time
        date.setMinutes(date.getMinutes() + 30); // Add 4 hours to given time
      }
      return date.toISOString();
    }
  
    // Match only date
    const dateOnlyMatch = strVal.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (dateOnlyMatch) {
      const [, dd, mm, yyyy] = dateOnlyMatch;
      const date = new Date(`${yyyy}-${mm}-${dd}T14:00:00`); // Default to 2:00 PM
      return date.toISOString();
    }
  
    return null;
  }
  
  adjustTime(date: Date): Date {
    if (date.getHours() === 0 && date.getMinutes() === 0) {
      date.setHours(23, 59, 0); // Adjust 00:00 to 11:59 PM
    }
    return date;
  }
  
  assignTasksFromExcel() {
    if (!this.selectedMemberId || this.tasksWithDeadlines.length === 0) {
      alert('Please select an executive and upload a valid Excel file.');
      return;
    }
    const matchedClient = this.AllClientsAndGroups.find(
        c => c.clientName === this.ClientName
      );
    this.tasksWithDeadlines.forEach((taskData) => {

        const formattedDeadline = this.formatExcelDate(taskData.deadline);
        console.log("taskDesc"+taskData.description+"Deadline"+formattedDeadline);
        let  task = {};
        if(formattedDeadline!=null){
        if(taskData.description.includes("QC")||taskData.description.includes("qc")){
          let desc;
           const regex = /\bto\b/i; // Matches the word 'to' as a whole word, case-insensitive
           const match = taskData.description.match(regex);
           if (match && match.index !== undefined) {
              desc=taskData.description.substring(0, match.index).trim();
            }
        task = {
          reportType:desc,
          assignedTo: this.selectedMemberId,
          teamId: this.selectedTeamId,
          group:this.GroupName,
          client: this.ClientName,
          description: taskData.description,
          deadline: formattedDeadline, // Convert deadline to ISO format
          completedAt:'',
          status: 'Pending',
          createdBy: localStorage.getItem('id'),
          leadermail: this.leadmail,
          clientStatus:'Active',
          QcApproval:'Pending',
          Sequence:0,
          comment:"",
          period:taskData.payPeriod,
          country:matchedClient?.country || ''
        };
      }
      else{
        task = {
          assignedTo: this.selectedMemberId,
          teamId: this.selectedTeamId,
          group:this.GroupName,
          client: this.ClientName,
          description: taskData.description,
          deadline: formattedDeadline, // Convert deadline to ISO format
          completedAt:'',
          status: 'Pending',
          createdBy: localStorage.getItem('id'),
          leadermail: this.leadmail,
          clientStatus:'Active',
          comment:"",
          period:taskData.payPeriod,
          country:matchedClient?.country || ''
        };
      }
        this.firestore
          .collection('tasks')
          .add(task)
          .then(() => console.log('Task assigned:', task))
          .catch((error) => console.error('Error assigning task:', error));
        };
    });
    this.loadData(this.managerId);
    alert('All tasks assigned successfully!');
  }
  
  // Assign a task to a selected team member
  async assignTask() {
    if(this.taskDescription==null)
      {
        alert("Description is required.");
        return;
      }
      if(this.payperiod==null)
      {
        alert("Pay period is required.");
        return;
      }
    if (this.selectedTeamId||this.selectedMemberId && this.taskDescription && this.taskDeadline) {
      const matchedClient = this.AllClientsAndGroups.find(
        c => c.clientName === this.ClientName
      );
     let  task = {};
     let  task2 = {};
     let  task3 = {};
    if(this.taskDescription.includes("QC")||this.taskDescription.includes("qc")){
       let desc;
       if(this.taskDescription.toLowerCase().includes("revised")){
          const isConfirmed = window.confirm(`Is there any client comeback?`);
          if (isConfirmed){
           await this.openComebackModal();
            }
          }
           const regex = /\bto\b/i; // Matches the word 'to' as a whole word, case-insensitive
           const match = this.taskDescription.match(regex);
           if (match && match.index !== undefined) {
              desc=this.taskDescription.substring(0, match.index).trim();
            }
            //Here because of multiple qc's reporttype will be the word before to
            task = {
              reportType:desc,
              assignedTo: this.selectedMemberId,
              teamId: this.selectedTeamId,
              period:this.payperiod,
              group:this.GroupName,
              client: this.ClientName,
              description: this.taskDescription,
              deadline: new Date(this.taskDeadline).toISOString(), // Convert deadline to ISO format
              completedAt:'',
              status: 'Pending',
              createdBy: localStorage.getItem('id'),
              leadermail: this.leadmail,
              clientStatus:'Active',
              QcApproval:'Pending',
              Sequence:0,
              comment:"",
              country:matchedClient?.country || ''
            };
      if(this.taskDescription.includes("Off-Cycle Payroll Reports to QC"))
      {
        let originalDate = new Date(this.taskDeadline);
        originalDate.setDate(originalDate.getDate() + 2);
        task2 = {
          assignedTo: this.selectedMemberId,
          teamId: this.selectedTeamId,
          period:this.payperiod,
          group:this.GroupName,
          client: this.ClientName,
          description: "Off-Cycle Reports to Client",
          deadline: originalDate.toISOString(), // Convert deadline to ISO format
          completedAt:'',
          status: 'Pending',
          createdBy: localStorage.getItem('id'),
          leadermail: this.leadmail,
          clientStatus:'Active',
          comment:"",
          country:matchedClient?.country || ''
        }
        originalDate.setDate(originalDate.getDate() + 2);
        task3 = {
          assignedTo: this.selectedMemberId,
          teamId: this.selectedTeamId,
          period:this.payperiod,
          group:this.GroupName,
          client: this.ClientName,
          description: "Customer Approves the Off-Cycle Reports",
          deadline: originalDate.toISOString(), // Convert deadline to ISO format
          completedAt:'',
          status: 'Pending',
          createdBy: localStorage.getItem('id'),
          leadermail: this.leadmail,
          clientStatus:'Active',
          comment:"",
          country:matchedClient?.country || ''
        }
        this.firestore
      .collection('tasks')
      .add(task2)
      .then(() => {
      })
      .catch((error) => {
        alert('Failed to assign task. Please try again.');
      });
      this.firestore
      .collection('tasks')
      .add(task3)
      .then(() => {
      })
      .catch((error) => {
        alert('Failed to assign task. Please try again.');
      });
      }
  }
  else{
    task = {
      assignedTo: this.selectedMemberId,
      teamId: this.selectedTeamId,
      period:this.payperiod,
      group:this.GroupName,
      client: this.ClientName,
      description: this.taskDescription,
      deadline: new Date(this.taskDeadline).toISOString(), // Convert deadline to ISO format
      completedAt:'',
      status: 'Pending',
      createdBy: localStorage.getItem('id'),
      leadermail: this.leadmail,
      clientStatus:'Active',
      comment:"",
      country:matchedClient?.country || ''
    };
  }
    this.firestore
      .collection('tasks')
      .add(task)
      .then(() => {
        alert('Task assigned successfully!');
        this.resetForm();
        this.loadData(this.managerId);
      })
      .catch((error) => {
        alert('Failed to assign task. Please try again.');
      });
    }
  }
  
  fetchprofile(task:any){
    console.log("fetchprofile initiated")
    this.firestore
    .collection('users', (ref) => ref.where('id', '==', task.assignedTo))
    .valueChanges()
    .subscribe((users: any[]) => {
      if (users.length > 0) {
        const userName = users[0].name; // Assuming "name" is the field in the "users" collection
        const usermail=  users[0].email;// Cache the name for future use
        const desc=task.description;
        const deadline=task.deadline;
        // this.sendEmail(usermail,desc,userName,deadline);
      }
    });
  }

  sendEmail(recipient: string, task: any,name:string,deadline:string) {
  const formattedDeadline = this.datePipe.transform(deadline, 'MMMM dd, y, h:mm:ss a'); // Formatting the deadline
  this.rec[0]=recipient;
  let bodydata = {
      "recipients": this.rec,
      "subject": `New Task Assigned: ${task}`,
      "body": `Hello ${name},<br><br>A new task has been assigned to you.<br><br>Task: ${task}\nDeadline: ${formattedDeadline}<br><br>Please take the necessary actions.`,
    };
  this.firestoreService.sendMail(bodydata);
  }

  UpdateTask(taskId: string): void {
    
  }

  deleteTask(taskId: string): void {
    //if (confirm('Are you sure you want to delete this task?')) {
      this.firestore
        .collection('tasks') // Reference to the tasks collection
        .doc(taskId) // Reference to the specific task document
        .delete()
        .then(() => {
          console.log('Task deleted successfully!');
          // Optionally, update the tasksWithNames array locally
          this.tasksWithNames = this.tasksWithNames.filter(task => task.id !== taskId);
        })
        .catch(error => {
          console.error('Error deleting task: ', error);
        });
    //}
  }
  userName: string = '';

getUserNameById(id: string){
  this.firestore
    .collection('users')
    .doc(id)
    .get()
    .subscribe((docSnapshot: any) => {
      if (docSnapshot.exists) {
        const userData = docSnapshot.data();
        console.log("getuserName:"+docSnapshot.name);
        return docSnapshot.name;
      } else {
        console.warn(`No user found with ID: ${id}`);
        return null;
      }
    }, (error: any) => {
      console.error('Error fetching user:', error);
      this.userName = 'Error fetching name';
    });
}
  resetForm() {
    this.taskDescription = '';
    this.selectedMemberId = null;
    this.taskDeadline = '';
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