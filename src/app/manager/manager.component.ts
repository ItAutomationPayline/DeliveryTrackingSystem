import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FirestoreService } from '../services/firestore.service';
import { debounceTime, forkJoin, take } from 'rxjs';
import * as XLSX from 'xlsx';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-manager',
  standalone: false,
  templateUrl: './manager.component.html',
  providers: [DatePipe],
  styleUrls: ['./manager.component.css'] // Corrected 'styleUrl' to 'styleUrls'
})

export class ManagerComponent {
  // tasksWithDeadlines: { description: string; deadlines: string[] }[] = [];
  employeeId: any= localStorage.getItem('id');
  nm:any=localStorage.getItem('nm');
  tasksWithDeadlines: any[] = [];
  reportForm: FormGroup;
  pps:any[]=[];
  userToEdit:any={};
  todayscompletedTasks:any[] = [];
  AllActiveQcReports: any[] = [];
  ComplianceTasks: any[] = [];
  selectedQC:any;
  selectedQCMap: { [taskId: string]: string } = {};
  QcTeam:any[]=[];
  boss:any;
  ops:any;
  GroupName: string = '';
  newState:any = {};
  allStates:any={};
  searchedUser: any[] = [];
  searchprofile:string='';
  ClientName: string = '';
  PayPeriod: string = '';
  Days: any = '';
  Preponeorpostponeaction: string = '';
  deleteGroupName: string = '';
  deleteClientName: string = '';
  deletetaskDescription: string = '';
  taskDescription: string = '';
  minDeadline: string = '';
  taskDeadline: string = '';
  AllClientsAndGroups:any[] = [];
  public tasksAssigned: any[] = [];
  public users: any[] = [];
  public managers: any[] = [];
  groupName = '';
  selectedgroupName: string = '';
  fromMemberId: string = '';
  toMemberId: string = '';
  clientName = '';
  clientCode='';
  selectedclientName: string = '';
  isActive = true;
  AllClients: any[] = [];
  public selectedEmployees: string[] = [];
  public selectedManager: string = '';
  public teamName: string = '';
  public teams: any[] = [];
  public tasksWithNames: any[] = [];
  membersWithNames: any[] = [];
  Client: string = '';
  tempCountry:string='';
  filterStatus: string[] = [];
  filterComments: string[] = [];
  filterGroup: string[] = [];
  filterClients: string[] = [];
  filterDescription: string[] = [];
  filterAssignedTo: string[] = [];
  editTaskDescription: string = '';
  editTaskClient: string = '';
  editTaskDate: string = '';
  editSelectedMemberId: string | null = null;
  editTaskDeadline: string = '';
  taskToEdit: any = null;
  userCache: { [key: string]: string } = {};
  excelFile: File | null = null;
  teamBeingEdited: any = null;
  editedTeamMemberIds: string[] = [];
  profile:any = {};
  payperiod:string='';
  public sessionTimeout: any;
  public inactivityDuration = 30 * 60 * 1000;
  public userMap: Map<string, string> = new Map(); // Map of user IDs to names

  constructor(private fb: FormBuilder,private router: Router,private firestoreService: FirestoreService,private firestore: AngularFirestore) 
  {
    this.reportForm = this.fb.group({
      // fromDat: ['', Validators.required],
      // toDat: ['', Validators.required],
      opsNames:['', Validators.required],
      includePayroll: [true], // ✅ default checked
      includeQc: [false] ,
      includeComeback: [false] ,
      period: ['', Validators.required]
    });
  }

  ngOnInit() {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('authToken');
    const id = localStorage.getItem('id');
    // if ((!token) || (role !== 'Manager')) {
    //   this.router.navigateByUrl('/login');
    //   return;
    // }
    if ((role === 'Manager')||(role === 'Director')||(role === 'General Manager')) {
    }
    else
    {
      this.router.navigateByUrl('/login');
      return;
    }
    this.teams=[];
    this.users=[];
    this.AllClients=[];
    this.selectedEmployees=[];
    this.users=[];
    this.firestoreService.getUsers().subscribe((users) => {
      this.users = users;
      this.managers = users.filter((user) => user.role === 'Manager' || user.role === 'Team Lead'|| user.role === 'QCLead'|| user.role === 'Compliance Lead');
      this.userMap = new Map(users.map((user) => [user.id, user.name]));
      this.fetchTeams();
    });
    this.profile="";
    this.searchedUser[0]="";
    this.teams=[];
    this.tasksAssigned=[];
    this.userCache = {};
    this.editTaskDescription='';
    this.editSelectedMemberId='';
    this.editTaskDeadline='';
    this.tasksWithNames=[];
    
    setTimeout(() => {
      this.getAllEmployees();
      this.fetchprofile();
      this.fetchAssignedTasks();
      
      this.fetchCompletedTasks();
      this.fetchAllClientList();
      this.sortClientsByGroupAndName();
      this.fetchAllQcReports();
      this.fetchClients();
      this.fetchQcTeam();
      this.fetchComplianceTasks();
      this.fetchAllStates();
     }, 500);
     this.startSessionTimer();
     setTimeout(() => {
      this.fixDeadlinesOnSunday();
      this.fixDeadlinesAfter8PM();
      this.fixDeadlinesBefore8AM();
     },3500);
     this.pps = this.generatePayPeriods();
  }
  fetchAllStates()
  {
    this.firestore.collection('states')
      .valueChanges({ idField: 'id' })
      .subscribe((states: any[]) => {
        this.allStates= states;
      });
  }
addState()
{
  if(this.newState.pt==null)
    {
      alert("Select PT Freq");
    }
  if(this.newState.lwf==null)
    {
      alert("Select LWF Freq");
    }
    console.log(this.newState)
    let state= {
      name:this.newState.name,
      ptFreq: this.newState.pt,
      lwfFreq: this.newState.lwf,
      ptReturn:this.newState.ptReturn
    };
    this.firestore
      .collection('states')
      .add(state)
      .then(() => {
        alert('State added successfully!');
        this.fetchAllStates();
      })
      .catch((error) => {
        alert('Failed to assign task. Please try again.');
      });

}
  generatePayPeriods(): string[] {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const now = new Date();
  const periods: string[] = [];

  for (let offset of [-5,-4,-3,-2,-1,0,1,2,3]) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    periods.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
  }
  return periods;
}
fixDeadlinesOnSunday() {
  console.log("Method initiated for Sunday check");
  this.tasksAssigned.forEach((task: any) => {
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

  fixDeadlinesAfter8PM() {
    console.log("Method initiated");
    this.tasksAssigned.forEach((task: any) => {
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);

      // Check if the deadline is beyond 8 PM
      if (deadlineDate.getHours() > 20 ||
        (deadlineDate.getHours() === 20 && deadlineDate.getMinutes() > 0)) {
        console.log("TAsk found.");
        // Reset to 8:00 PM same day
        deadlineDate.setHours(20, 0, 0, 0);

        // Convert back to ISO format before saving
        const updatedISO = deadlineDate.toISOString();

        this.firestore.collection('tasks').doc(task.id).update({
          deadline: updatedISO
        }).then(() => {
          console.log(`Deadline fixed to 8 PM for task: ${task.id}`);
        }).catch(err => {
          console.error(`Error updating task ${task.id}:`, err);
        });
      }
    }
  });
}
fixDeadlinesBefore8AM() {
    console.log("Method initiated");
  this.tasksAssigned.forEach((task: any) => {
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);

      // Check if the deadline is beyond 8 PM
      if (
        deadlineDate.getHours() < 8 ||
        (deadlineDate.getHours() === 20 && deadlineDate.getMinutes() > 0)
      ) {
        console.log("TAsk found.");
        // Reset to 8:00 PM same day
        deadlineDate.setHours(8, 0, 0, 0);

        // Convert back to ISO format before saving
        const updatedISO = deadlineDate.toISOString();

        this.firestore.collection('tasks').doc(task.id).update({
          deadline: updatedISO
        }).then(() => {
          console.log(`Deadline fixed to 8 AM for task: ${task.id}`);
        }).catch(err => {
          console.error(`Error updating task ${task.id}:`, err);
        });
      }
    }
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

  fetchComplianceTasks()
  {
    this.firestore.collection('compliance', ref => ref.where('status', '==', 'In-Progress'))
      .valueChanges({ idField: 'id' })
      .subscribe((requests: any[]) => {
        this.ComplianceTasks= requests;
      });
  }
  searchUserByEmail()
  {
     this.firestore
          .collection('users', (ref) => ref.where('email', '==', this.searchprofile))
          .valueChanges()
          .pipe(take(1)) // ✅ Only take one result, avoids multiple pushes
          .subscribe((users: any[]) => {
            this.searchedUser[0]=users[0];
          })
  }
  fetchprofile()
   {
     this.firestore
          .collection('users', (ref) => ref.where('id', '==', this.employeeId))
          .valueChanges()
          .pipe(take(1)) // ✅ Only take one result, avoids multiple pushes
          .subscribe((users: any[]) => {
            this.profile=users[0];
          })
  }

   DeleteTaskofcalendar()
   {
    if(!this.deletetaskDescription)
    {
      alert("Task description is required.");
      return;
    }
     if (!this.deleteGroupName || !this.deleteClientName) {
const isConfirmed = window.confirm('As group and client is not provided. Task will be deleted from all clients.');
  if (isConfirmed) {
  const taskCollectionRef = this.firestore.collection('tasks', ref =>
    ref.where('description', '==', this.deletetaskDescription)
       .where('status', '!=', 'Completed')
  );

  taskCollectionRef.get().subscribe(snapshot => {
    if (snapshot.empty) {
      alert('No matching tasks found to delete.');
      return;
    }

    const batch = this.firestore.firestore.batch(); // Raw Firestore batch
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    batch.commit().then(() => {
       alert(`Deleted ${snapshot.size} task(s) for all clients.`);
    }).catch(err => {
      console.error('Error deleting tasks:', err);
      alert('Error occurred while deleting tasks.');
    });
  });
}
  }
  else
    {
      const isConfirmed= window.confirm('Are you sure want to delete the task:'+this.deletetaskDescription+" from client "+this.deleteClientName+"?");
      if (isConfirmed) 
        {
          const taskCollectionRef = this.firestore.collection('tasks', ref =>
    ref.where('description', '==', this.deletetaskDescription)
       .where('status', '!=', 'Completed')
       .where('group', '==',this.deleteGroupName)
       .where('client', '==',this.deleteClientName)
  );

  taskCollectionRef.get().subscribe(snapshot => {
    if (snapshot.empty) {
      alert('No matching tasks found to delete.');
      return;
    }

    const batch = this.firestore.firestore.batch(); // Raw Firestore batch
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    batch.commit().then(() => {
      alert(`Deleted ${snapshot.size} task(s) for group "${this.deleteGroupName}" and client "${this.deleteClientName}".`);
    }).catch(err => {
      console.error('Error deleting tasks:', err);
      alert('Error occurred while deleting tasks.');
    });
    });
    }
    }
   }
DeletePayCalendar(): void {
  if (!this.deleteGroupName || !this.deleteClientName) {
    alert('Please fill both Group Name and Client Name.');
    return;
  }
  const isConfirmed = window.confirm(`Are you sure you want delete all tasks of "${this.deleteClientName}" client?`);
  if (isConfirmed) {
  const taskCollectionRef = this.firestore.collection('tasks', ref =>
    ref.where('group', '==', this.deleteGroupName)
       .where('client', '==', this.deleteClientName)
       .where('status', '!=', 'Completed')
  );

  taskCollectionRef.get().subscribe(snapshot => {
    if (snapshot.empty) {
      alert('No matching tasks found to delete.');
      return;
    }

    const batch = this.firestore.firestore.batch(); // Raw Firestore batch
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    batch.commit().then(() => {
      alert(`Deleted ${snapshot.size} task(s) for group "${this.deleteGroupName}" and client "${this.deleteClientName}".`);
    }).catch(err => {
      console.error('Error deleting tasks:', err);
      alert('Error occurred while deleting tasks.');
    });
  });
}
}
deleteCountry(index: number) {
  this.userToEdit.country.splice(index, 1);
}
addCountry() {
  if (this.tempCountry) {
      if (!Array.isArray(this.userToEdit.country)) {
        this.userToEdit.country = [];
      }
    this.userToEdit.country.push(this.tempCountry);
    this.tempCountry='';
  }
  else
    {
      alert("Please type country")
    }
}
 updateEmployeeCountry(user:any)
  {
    if(this.tempCountry!='')
      {
        alert("Please add or remove the country which you typed in textbox");
        return;
      }
    // Update the user's role in Firestore
    this.firestore
      .collection('users')
      .doc(user.id) // Firestore document ID
      .update({ country: user.country }) // Update the role field
      .then(() => {})
      .catch((error) => {
        console.error('Error updating role:', error);
        alert('Failed to update the country. Please try again later.');
      });
  }
  fetchCompletedTasks(){
  const today = new Date();
  let tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  today.setHours(0, 0, 0, 0); // Normalize time for comparison
  tomorrow.setHours(23, 59, 0, 0);
  this.firestore
    .collection('tasks', ref =>
      ref.where('status', '==','Completed').where('completedAt', '<=', tomorrow.toISOString()).where('completedAt', '>=', today.toISOString())
    )
    .valueChanges({ idField: 'id' })
    .subscribe((tasks: any[]) => {
      this.todayscompletedTasks = tasks;
      console.log('Filtered tasks (pending/delayed due today or earlier):', this.tasksAssigned);
      this.populateTodaysTaskstoname(tasks);
      setTimeout(() => {
        this.sortTasks(this.todayscompletedTasks);
      }, 500);
    });
  }
  populateTodaysTaskstoname(tasks:any[])
  {
    this.todayscompletedTasks = [];
    tasks.forEach((task) => {
      const assignedToId = task.assignedTo;
  
      if (this.userCache[assignedToId]) {
        this.tasksWithNames.push({
          ...task,
          assignedToName: this.userCache[assignedToId],
        });
      } else {
        // Firestore call to get user's name
        this.firestore
          .collection('users', (ref) => ref.where('id', '==', assignedToId))
          .valueChanges()
          .pipe(take(1)) // ✅ Only take one result, avoids multiple pushes
          .subscribe((users: any[]) => {
            if (users.length > 0) {
              const userName = users[0].name;
              this.userCache[assignedToId] = userName;
              this.todayscompletedTasks.push({
                ...task,
                assignedToName: userName,
              });
              // Optionally sort after pushing last item — or debounce this in future
              this.sortTasks(this.todayscompletedTasks);
            }
          });
      }
    });
  }
    assignTask() {
    if ( this.taskDescription && this.taskDeadline) {
    let  task = {};
    const selectedManager = this.managers.find(m => m.id === this.boss);
    const leaderEmail = selectedManager ? selectedManager.email : '';
    if(this.taskDescription.includes("QC")||this.taskDescription.includes("qc")){
      let desc;
           const regex = /\bto\b/i; // Matches the word 'to' as a whole word, case-insensitive
           const match = this.taskDescription.match(regex);
           if (match && match.index !== undefined) {
              desc=this.taskDescription.substring(0, match.index).trim();
            }
    task = {
      reportType:desc,
      assignedTo: this.ops,
      group:this.GroupName,
      client: this.ClientName,
      description: this.taskDescription,
      period:this.payperiod,
      deadline: new Date(this.taskDeadline).toISOString(), // Convert deadline to ISO format
      completedAt:'',
      status: 'Pending',
      createdBy: this.boss,
      clientStatus:'Active',
      QcApproval:'Pending',
      Sequence:0,
      comment:"",
      leadermail:leaderEmail
    };
  }
  else{
    task = {
      assignedTo: this.ops,
      group:this.GroupName,
      client: this.ClientName,
      period:this.payperiod,
      description: this.taskDescription,
      deadline: new Date(this.taskDeadline).toISOString(), // Convert deadline to ISO format
      completedAt:'',
      status: 'Pending',
      createdBy: this.boss,
      clientStatus:'Active',
      comment:"",
      leadermail:leaderEmail
    };
  }
    this.firestore
      .collection('tasks')
      .add(task)
      .then(() => {
        alert('Task assigned successfully!');
      })
      .catch((error) => {
        alert('Failed to assign task. Please try again.');
      });
    }
  }
onFileChange2(event: any) {
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

          if (
            description &&
            deadline &&
            description.trim() !== "Day" &&
            description.trim() !== "PayPeriod"
          ) {
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
        date.setHours(20, 0, 0); // Replace 00:00 with 11:59 PM
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
      date.setHours(20, 0, 0); // Adjust 00:00 to 11:59 PM
    }
    return date;
  }
  assignTasksFromExcel() {
    if (!this.ops || this.tasksWithDeadlines.length === 0) {
      alert('Please select an executive and upload a valid Excel file.');
      return;
    }
      this.tasksWithDeadlines.forEach((task: any) => {
  console.log(`Pay Period: ${task.payPeriod}, Description: ${task.description}, Deadline: ${task.deadline}`);
});
    const selectedManager = this.managers.find(m => m.id === this.boss);
    const leaderEmail = selectedManager ? selectedManager.email : '';
    this.tasksWithDeadlines.forEach((taskData) => {
        const formattedDeadline = this.formatExcelDate(taskData.deadline);
        console.log("taskDesc"+taskData.description+"Deadline"+formattedDeadline);
        let  task = {};
        if(formattedDeadline!=null){
        if(taskData.description.includes("QC")||taskData.description.includes("qc")){
          let desc;
           const regex = /\bto\b/i; // Matches the word 'to' as a whole word, case-insensitive
           const match = this.taskDescription.match(regex);
           if (match && match.index !== undefined) {
              desc=this.taskDescription.substring(0, match.index).trim();
            }
        task = {
          reportType:desc,
          assignedTo: this.ops,
          group:this.GroupName,
          client: this.ClientName,
          description: taskData.description,
          deadline: formattedDeadline, // Convert deadline to ISO format
          completedAt:'',
          status: 'Pending',
          createdBy: this.boss,
          leadermail:leaderEmail,
          clientStatus:'Active',
          QcApproval:'Pending',
          Sequence:0,
          comment:"",
          period:taskData.payPeriod
        };
      }
      else{
        task = {
          assignedTo: this.ops,
          group:this.GroupName,
          client: this.ClientName,
          description: taskData.description,
          deadline: formattedDeadline, // Convert deadline to ISO format
          completedAt:'',
          status: 'Pending',
          createdBy: this.boss,
          leadermail:leaderEmail,
          clientStatus:'Active',
          comment:"",
          period:taskData.payPeriod
        };
      }
        this.firestore
          .collection('tasks')
          .add(task)
          .then(() => console.log('Task assigned:', task))
          .catch((error) => console.error('Error assigning task:', error));
        }
        else{
          console.log("Wrong formatted deadline");
        }
      });
    alert('All tasks assigned successfully!');
    setTimeout(() => {
        window.location.reload();
      }, 5000);
  }
editTeam(team: any): void {
  this.teamBeingEdited = team;
  this.editedTeamMemberIds = [...team.employees]; // assuming `employees` is an array of user IDs
}

toggleEditedMember(userId: string): void {
  const index = this.editedTeamMemberIds.indexOf(userId);
  if (index > -1) {
    this.editedTeamMemberIds.splice(index, 1);
  } else {
    this.editedTeamMemberIds.push(userId);
  }
}
updateTeamMembers(teamId: string, newMembers: string[]): Promise<void> {
  return this.firestore.collection('teams').doc(teamId).update({
    employees: newMembers
  });
}
updateTeam(): void {
  if (!this.teamBeingEdited) return;

  this.updateTeamMembers(this.teamBeingEdited.id, this.editedTeamMemberIds)
    .then(() => {
      alert('Team updated successfully!');
      this.teamBeingEdited = null;
      this.editedTeamMemberIds = [];
      this.fetchTeams();
    })
    .catch((err: { message: string; }) => {
      alert('Error updating team: ' + err.message);
    });
}

cancelEdit(): void {
  this.teamBeingEdited = null;
  this.editedTeamMemberIds = [];
}
  assignQc(id:any,selectedQC:any)
  {
    const selectedQcUser = this.QcTeam.find(qc => qc.id === selectedQC);
    const report = {
      AssignedTo:selectedQC,
      qcPersonId: selectedQC,
      status: 'in-progress',
      findings: [],
      updatedAt: new Date(),
      startedAt:new Date().toISOString(),
      qcName:selectedQcUser.name
    };
    // Directly update the existing QC report with document ID = requestId
    this.firestore.collection('QcReports').doc(id).update(report)
    .then(() => {
      console.log("QC Report updated with ID: ", id);
      
      // Update request status to indicate QC has started
      this.firestore.collection('requests').doc(id).update({
        status: 'under-review'
      });
    })
    .catch(error => {
      console.error("Error updating QC report: ", error);
    });
  }
  fetchQcTeam() {
    this.firestore.collection('users', ref => ref.where('role', 'in', ['QCLead', 'QC','Manager','General Manager','Team Lead']))
      .valueChanges({ idField: 'id' })
      .subscribe((requests: any[]) => {
        this.QcTeam = requests;
        console.log("QcTeam: ", this.QcTeam);
      });
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
        if(taskToUpdate.description.includes("Payroll Approval Notification to Partner")||taskToUpdate.description.includes("Customer Approves the Payroll Reports"))
        {
          let headcount = prompt("Kindly provide the headcount");
           if (!headcount || headcount.trim() === '') {
              alert("Headcount is required. Submission cancelled.");
              return; // Stop execution
            }
          this.firestore
          .collection('tasks')
          .doc(taskToUpdate.id)
          .update({
            headcount: headcount,
          })
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
            let link = prompt("Paste the link of reports if any:");
            let userNote = prompt("Enter a note/special instruction for qc if any:");
            let finalData = {
              taskId:taskToUpdate.id,
              reportType:taskToUpdate.reportType,
              groupName:taskToUpdate.group,
              clientName: taskToUpdate.client,
              Period:taskToUpdate.period,
              ops:taskToUpdate.assignedTo,
              AssignedTo:"Pending",
              opsName:taskToUpdate.assignedToName,
              status:"Pending",
              link:link,
              note:userNote,
              createdAt: new Date(),
              leadermail:taskToUpdate.leadermail
            };
             this.firestore
              .collection('users', ref => ref.where('role', '==', 'QC').where('role', '==', 'QCLead'))
              .get()
              .subscribe((querySnapshot: any) => {
                let recipients: string[] = [];
                querySnapshot.forEach((doc: any) => {
                  const userData = doc.data();
                  if (userData.email) {
                    recipients.push(userData.email);
                  }
                });
            recipients.push(taskToUpdate.leadermail);
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
                  <br>${taskToUpdate.assignedToName}</p>
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
formatPeriod(isoDate: string): string {
  const date = new Date(isoDate);
  const month = date.toLocaleString('default', { month: 'long' }); // e.g., "May"
  const year = date.getFullYear();
  return `${month} ${year}`;
}
generateReport() {
  const { fromDat, toDat, opsNames, includePayroll, includeQc,includeComeback ,period} = this.reportForm.value;
  let fr = new Date(fromDat);
  let t = new Date(toDat);
  if(period=="")
    {
      alert("Period is required.");
      return;
    }
  const wb = XLSX.utils.book_new();
  let reportsCompleted = 0;
  const totalReports = (includePayroll ? 1 : 0) + (includeQc ? 1 : 0)+ (includeComeback ? 1 : 0);

  // Helper function to check if we should save the file
  const checkAndSave = () => {
    reportsCompleted++;
    if (reportsCompleted === totalReports) {
      const fileName = `Merged_Report_${period}_to_.xlsx`;
      XLSX.writeFile(wb, fileName);
    }
  };

  // ✅ If Payroll selected
  if (includePayroll) {
    this.firestore.collection('tasks', ref =>
      opsNames == ""
        ? ref.where('period', '==', period)
        : ref.where('period', '==', period)
             .where('assignedTo', '==', opsNames)
    ).valueChanges({ idField: 'id' }).pipe(
      debounceTime(1000),
      take(1) // Take only one emission to complete the observable
    ).subscribe((temp: any[]) => {
      if (temp.length === 0) {
        // If no data, add empty sheet and check if we should save
        const ws1 = XLSX.utils.json_to_sheet([{ message: 'No data available for the selected criteria' }]);
        XLSX.utils.book_append_sheet(wb, ws1, 'Payroll Report');
        checkAndSave();
        return;
      }

      const userIds = [
        ...new Set(temp.map(temp => temp.assignedTo).filter(id => id)),
        ...new Set(temp.map(temp => temp.createdBy).filter(id => id))
      ];

      const userPromises = userIds.map(id =>
        this.firestore.collection('users').doc(id).get().toPromise().catch(() => null)
      );

      forkJoin(userPromises).subscribe((userDocs: any[]) => {
        const users = userDocs.reduce((acc, doc) => {
          if (doc && doc.exists) {
            const userData = doc.data();
            acc[doc.id] = userData.name || '';
          }
          return acc;
        }, {});

        let formattedTask = temp.map(t => ({
          Group: t.group || '',
          Client: t.client || '',
          Period: t.period,
          Description: t.description || '',
          Deadline: this.formatDate(t.deadline),
          'Completed At': this.formatDate(t.completedAt),
          TL: users[t.createdBy] || '',
          Ops: users[t.assignedTo] || '',
          Status: t.status || '',
          'Report Type': t.reportType || '',
          'QC Approval': t.QcApproval || '',
          'QC Duration': t.qcduration || '',
          Comment: t.comment,
          'QC Person': t.QCPerson,
          Headcount: t.headcount || '',
          Sequence: t.Sequence !== undefined ? t.Sequence.toString() : ''
        }));
        
        const ws1 = XLSX.utils.json_to_sheet(formattedTask);
        XLSX.utils.book_append_sheet(wb, ws1, 'Payroll Report');
        checkAndSave();
      }, error => {
        // Handle error by adding an error sheet
        const ws1 = XLSX.utils.json_to_sheet([{ error: 'Failed to generate payroll report' }]);
        XLSX.utils.book_append_sheet(wb, ws1, 'Payroll Report');
        checkAndSave();
      });
    });
  }

  // ✅ If QC selected
  if (includeQc) {
    this.firestore.collection('QcReports', ref =>
      ref.where('Period', '==', period)
    ).valueChanges({ idField: 'id' }).pipe(
      debounceTime(1000),
      take(1) // Take only one emission to complete the observable
    ).subscribe((temp: any[]) => {
      if (temp.length === 0) {
        // If no data, add empty sheet and check if we should save
        const ws2 = XLSX.utils.json_to_sheet([{ message: 'No data available for the selected criteria' }]);
        XLSX.utils.book_append_sheet(wb, ws2, 'QC Report');
        checkAndSave();
        return;
      }

      const userIds = [...new Set(temp.map(temp => temp.ops).filter(id => id))];

      const userPromises = userIds.map(id =>
        this.firestore.collection('users').doc(id).get().toPromise().catch(() => null)
      );

      forkJoin(userPromises).subscribe((userDocs: any[]) => {
        const users = userDocs.reduce((acc, doc) => {
          if (doc && doc.exists) {
            const userData = doc.data();
            acc[doc.id] = userData.name || '';
          }
          return acc;
        }, {});

        let formattedTask = temp.map(t => {
          const findingsText = (t.findings || [])
            .map((f: { category: any; description: any }, idx: number) => `${idx + 1}) ${f.category} - ${f.description}`)
            .join("\n");

          return {
            Group: t.groupName || '',
            Client: t.clientName || '',
            Period: t.Period,
            Ops: users[t.ops] || t.opsName || '',
            'Completed At': this.formatDate(t.completedAT),
            'Report Type': t.reportType,
            'QC Person': t.qcName,
            Findings: findingsText
          };
        });

        const ws2 = XLSX.utils.json_to_sheet(formattedTask);
        XLSX.utils.book_append_sheet(wb, ws2, 'QC Report');
        checkAndSave();
      }, error => {
        // Handle error by adding an error sheet
        const ws2 = XLSX.utils.json_to_sheet([{ error: 'Failed to generate QC report' }]);
        XLSX.utils.book_append_sheet(wb, ws2, 'QC Report');
        checkAndSave();
      });
    });
  }
   // ✅ If Commeback selected
    if (includeComeback) {
    this.firestore.collection('comebacks', ref =>
      ref.where('payPeriod', '==', period)
    ).valueChanges({ idField: 'id' }).pipe(
      debounceTime(1000),
      take(1) // Take only one emission to complete the observable
    ).subscribe((temp: any[]) => {
      if (temp.length === 0) {
        console.log("No comeback records found");
        // If no data, add empty sheet and check if we should save
        const ws2 = XLSX.utils.json_to_sheet([{ message: 'No data available for the selected criteria' }]);
        XLSX.utils.book_append_sheet(wb, ws2, 'Comeback Report');
        checkAndSave();
        return;
      }

      const userIds = [
        ...new Set(temp.map(temp => temp.assignedTo).filter(id => id)),
        ...new Set(temp.map(temp => temp.createdBy).filter(id => id))
      ];

      const userPromises = userIds.map(id =>
        this.firestore.collection('users').doc(id).get().toPromise().catch(() => null)
      );

      forkJoin(userPromises).subscribe((userDocs: any[]) => {
        const users = userDocs.reduce((acc, doc) => {
          if (doc && doc.exists) {
            const userData = doc.data();
            acc[doc.id] = userData.name || '';
          }
          return acc;
        }, {});

        let formattedTask = temp.map(t => {
          const findingsText = (t.findings || [])
            .map((f: { category: any; description: any ,employees:any}, idx: number) => `${idx + 1}) ${f.category} - ${f.description}-[Affected employees:${f.employees}]`)
            .join("\n");

          return {
            Group: t.group || '',
            Client: t.client || '',
            Period: t.payPeriod,
            Ops: users[t.assignedTo] || t.opsName || '',
            TL:users[t.createdBy],
            Comebacks: findingsText
          };
        });

        const ws2 = XLSX.utils.json_to_sheet(formattedTask);
        XLSX.utils.book_append_sheet(wb, ws2, 'Comeback Report');
        checkAndSave();
      }, error => {
        // Handle error by adding an error sheet
        const ws2 = XLSX.utils.json_to_sheet([{ error: 'Failed to generate QC report' }]);
        XLSX.utils.book_append_sheet(wb, ws2, 'Comeback Report');
        checkAndSave();
      });
    });
  }
}

  downloadExcel(data: any[]) {
    // First create an array with correct headings and data
    const headings = [
      'Group', 'Client','Period','Description','Deadline' ,
      'Completed At', 'TL', 'Ops', 'Status','Comment',
      'Report Type', 'QC Person','QC Duration', 'Sequence','Headcount'
    ];
    const formattedData = data.map(item => ({
      Group: item.group,
      Client: item.client,
      Period:item.period,
      Description: item.description,
      Deadline: item.deadline,
      'Completed At': item.completedAt,
      'TL': item.createdBy,
      Ops: item.assignedTo,
      Status: item.status,
      'Report Type': item.reportType,
      'QC Person': item.QCPerson,
      'QC Duration': item.qcduration,
      Sequence: item.sequence,
      Headcount:item.headcount,
      Comment: item.comment
    }));
    const ws = XLSX.utils.json_to_sheet(formattedData, { header: headings });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const from = this.reportForm.value.fromDat;
    const to = this.reportForm.value.toDat;
    const fileName = `Tasks_report_${from}_to_${to}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
  generateQcReport() {
  console.log("QC REPORT DOWNLOAD Initiated");
  const { fromDat, toDat, opsNames } = this.reportForm.value;
  let fr = new Date(fromDat);
  let t = new Date(toDat);
  fr.setHours(0, 0, 0, 0);
  t.setHours(23, 59, 59, 999);
  console.log("FROM" + fr.toISOString());
  console.log("TO" + t.toISOString());

  this.firestore.collection('QcReports', ref =>
    ref.where('updatedAt', '>=', fr)
       .where('updatedAt', '<=', t)
  ).valueChanges({ idField: 'id' }).pipe(debounceTime(1000))
  .subscribe((temp: any[]) => {
    console.log("QC'S", temp);

    const userIds = [
      ...new Set(temp.map(temp => temp.ops).filter(id => id))
    ];

    const userPromises = userIds.map(id =>
      this.firestore.collection('users').doc(id).get().toPromise().catch(() => null)
    );

    forkJoin(userPromises).subscribe((userDocs: any[]) => {
      const users = userDocs.reduce((acc, doc) => {
        if (doc && doc.exists) {
          const userData = doc.data();
          acc[doc.id] = userData.name || '';
        }
        return acc;
      }, {});

      let formattedTask = temp.map(t => {
        // 🔹 Merge findings into one string
        const findingsText = (t.findings || [])
          .map((f: { category: any; description: any; }, idx: number) => `${idx + 1}) ${f.category} - ${f.description}`)
          .join("\n"); // newline separated

        return {
          group: t.groupName || '',
          client: t.clientName || '',
          period: t.Period,
          qcName: t.qcName,
          ops: t.opsName,
          reportType: t.reportType,
          completedAt: this.formatDate(t.completedAT),
          findings: findingsText
        };
      });

      console.log("ShortListedQCTasks:", formattedTask);
      this.downloadQcExcel(formattedTask);
    });
  });
}

downloadQcExcel(data: any[]) {
  console.log("DownloadQc initiated");
  const headings = [
    'Group', 'Client', 'Period', 'Completed At', 'Ops',
    'Report Type', 'QC Person', 'Findings'
  ];

  const formattedData = data.map(item => ({
    Group: item.group,
    Client: item.client,
    Period: item.period,
    'Report Type': item.reportType,
    Ops: item.ops,
    'Completed At': item.completedAt,
    'QC Person': item.qcName,
    Findings: item.findings
  }));

  const ws = XLSX.utils.json_to_sheet(formattedData, { header: headings });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'QC');

  const from = this.reportForm.value.fromDat;
  const to = this.reportForm.value.toDat;
  const fileName = `QC_Findings_report_${from}_to_${to}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// generateQcReport()
// {
//   console.log("QC REPORT DOWNLOAD Initiated");
//    const { fromDat, toDat ,opsNames} = this.reportForm.value;
//     let fr = new Date(fromDat);
//     let t = new Date(toDat);
//       fr.setHours(0, 0, 0, 0);
//   t.setHours(23, 59, 59, 999);
//     console.log("FROM"+fr.toISOString());
//     console.log("TO"+t.toISOString());
//     this.firestore.collection('QcReports', ref =>
//       ref.where('completedAt', '>=', fr)
//          .where('completedAt', '<=', t)
//     ).valueChanges({ idField: 'id' }).pipe(debounceTime(1000))
//     .subscribe((temp: any[]) => {
//       console.log("QC'S",temp);
//       // Fetch user details for assignedTo and createdBy
//       const userIds = [
//         ...new Set(temp.map(temp => temp.ops).filter(id => id)) // Get unique user IDs for createdBy
//       ];

//       const userPromises = userIds.map(id =>
//         this.firestore.collection('users').doc(id).get().toPromise().catch(() => null)
//       );

//       forkJoin(userPromises).subscribe((userDocs: any[]) => {
//         const users = userDocs.reduce((acc, doc) => {
//           if (doc && doc.exists) {
//             const userData = doc.data();
//             acc[doc.id] = userData.name || ''; // Store name against user ID
//           }
//           return acc;
//         }, {});
//         let formattedTask = temp.map(t => ({
//           group: t.groupName || '',
//           client: t.clientName || '',
//           period:t.Period,
//           qcName:t.qcName,
//           ops:t.opsName,
//           reportType:t.reportType,
//           completedAt:t.completedAt
//         }));
//         console.log("ShortListedQCTasks:",formattedTask);
        
//         this.downloadQcExcel(formattedTask);
//         // window.location.reload();
//       });
//     });
// }
// downloadQcExcel(data: any[]) {
//   console.log("DownloadQc initiated");
//     // First create an array with correct headings and data
//     const headings = [
//       'Group', 'Client','Period','Completed At', 'Ops',
//       'Report Type', 'QC Person'];
//     const formattedData = data.map(item => ({
//       Group: item.group,
//       Client: item.client,
//       Period:item.period,
//       'Report Type': item.reportType,
//       Ops: item.ops,
//       'Completed At': item.completedAt,
//       'QC Person': item.qcName,
//     }));
//     const ws = XLSX.utils.json_to_sheet(formattedData, { header: headings });
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, 'QC');
//     const from = this.reportForm.value.fromDat;
//     const to = this.reportForm.value.toDat;
//     const fileName = `QC_report_${from}_to_${to}.xlsx`;
//     XLSX.writeFile(wb, fileName);
//   }
  formatDate(isoTimestamp: string): string {
    if (!isoTimestamp) return '';
    
    const date = new Date(isoTimestamp);
    
    // Check if the date is invalid
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = pad(date.getMinutes());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours || 12; // Convert 0 to 12
    
    return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
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

  transferTasks() { 
    console.log("Group"+this.selectedgroupName);
    console.log("Client"+this.selectedclientName);
    console.log("From"+this.fromMemberId);
    console.log("TO"+this.toMemberId);
    if (!this.selectedgroupName || !this.selectedclientName|| !this.fromMemberId || !this.toMemberId) {
      alert('Please fill all fields.');
      return;
    }
  if (confirm(`Are you sure you want to transfer ${this.selectedclientName} client?`)) {
    this.firestore
      .collection('tasks', ref => ref
        .where('client', '==', this.selectedclientName)
        .where('group', '==', this.selectedgroupName)
        .where('assignedTo', '==', this.fromMemberId)
        .where('status', '!=', 'Completed')
      )
      .get()
      .subscribe(snapshot => {
        snapshot.forEach(doc => {
          doc.ref.update({
            assignedTo: this.toMemberId
          });
        });
        alert('Client transferred successfully.');
      }, error => {
        console.error('Error transferring tasks: ', error);
        alert('Error transferring tasks.');
      });
  }
}
  fetchAllQcReports(){
    this.firestore
     .collection('QcReports', ref => ref.where('status', '!=', 'completed'))
       .valueChanges({ idField: 'id' })
       .subscribe((requests: any[]) => {
         this.AllActiveQcReports = requests;
       });
   }

  sortClientsByGroupAndName() {
    this.AllClients.sort((a, b) => {
      const groupA = a.groupName || '';
      const groupB = b.groupName || '';
      const clientA = a.clientName || '';
      const clientB = b.clientName || '';
  
      const groupCompare = groupA.localeCompare(groupB, undefined, { sensitivity: 'base' });
      if (groupCompare !== 0) {
        return groupCompare;
      }
      return clientA.localeCompare(clientB, undefined, { sensitivity: 'base' });
    });
  }
  
  
  onFileChange(event: any) {
    this.excelFile = event.target.files[0];
  }

  // Upload Excel file and process data
  uploadExcel() {
    if (!this.excelFile) {
      alert('Please select an Excel file first');
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = (e: any) => {
      const arrayBuffer = e.target.result;
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Assuming first sheet is the one with data
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Process each row
      this.processExcelData(jsonData);
    };
    fileReader.readAsArrayBuffer(this.excelFile);
  }
  deactivateExcel(){
    if (!this.excelFile) {
      alert('Please select an Excel file first');
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = (e: any) => {
      const arrayBuffer = e.target.result;
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Assuming first sheet is the one with data
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Process each row
      this.deactivateExcelData(jsonData);
    };
    fileReader.readAsArrayBuffer(this.excelFile);
  }
  deactivateExcelData(data: any[]) {
    const batch = this.firestore.firestore.batch();
    const clientsRef = this.firestore.collection('clients').ref;
  
    const updatePromises: Promise<void>[] = [];
  
    data.forEach((row: any) => {
      const groupName = row['Group Name'] || row['groupName'] || '';
      const clientName = row['Client Name'] || row['clientName'] || '';
  
      if (groupName && clientName) {
        // Query to find the existing client
        const query = clientsRef
          .where('groupName', '==', groupName)
          .where('clientName', '==', clientName)
          .limit(1)
          .get()
          .then(snapshot => {
            if (!snapshot.empty) {
              const doc = snapshot.docs[0].ref;
              batch.update(doc, {
                status: 'Inactive',
                timestamp: new Date()
              });
            } else {
              console.warn(`Client not found: Group=${groupName}, Client=${clientName}`);
            }
          })
          .catch(error => {
            console.error(`Error finding client: Group=${groupName}, Client=${clientName}`, error);
          });
        updatePromises.push(query);
      }
    });
  
    Promise.all(updatePromises).then(() => {
      batch.commit()
        .then(() => {
          alert('Clients deactivated successfully!');
          this.fetchAllClientList();
          this.excelFile = null;
          const fileInput = document.getElementById('excelUpload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        })
        .catch(error => {
          console.error('Error updating clients:', error);
          alert('Error updating clients. Please check the console for details.');
        });
    });
  }
  
  // Process and save Excel data to Firestore
  processExcelData(data: any[]) {
    const batch = this.firestore.firestore.batch();
    const clientsRef = this.firestore.collection('clients').ref;
    
    data.forEach((row: any) => {
      // Adjust these property names to match your Excel columns
      const groupName = row['Group Name'] || row['groupName'] || '';
      const clientName = row['Client Name'] || row['clientName'] || '';
      
      if (groupName && clientName) {
        const newClientRef = clientsRef.doc();
        batch.set(newClientRef, {
          groupName: groupName,
          clientName: clientName,
          status: 'Active',
          timestamp: new Date()
        });
      }
    });

    batch.commit()
      .then(() => {
        alert('Clients imported successfully!');
        this.fetchAllClientList();
        this.excelFile = null;
        // Reset file input
        const fileInput = document.getElementById('excelUpload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      })
      .catch(error => {
        console.error('Error importing clients:', error);
        alert('Error importing clients. Please check the console for details.');
      });
  }
  fetchAllClientList()
  {
    this.firestore
      .collection('clients')
      .valueChanges({ idField: 'id' })
      .pipe(take(1))
      .subscribe((clients: any[]) => {
        this.AllClients = clients;
      });
      setTimeout(() => {
        this.sortClientsByGroupAndName();
     }, 1000);
  }
  addClient() {
      if (isNaN(Number(this.clientCode))) {
      alert("clientCode must contain numbers only.");
      return; // stop method execution
    }
    const clientData = {
      groupName: this.groupName,
      clientName: this.clientName,
      status:'Active',
      timestamp: new Date(),
      country:this.clientCode
    };

    this.firestore
      .collection('clients')
      .add(clientData)
      .then(() => {
        this.groupName = '';
        this.clientName = '';
        this.clientCode=''
        this.fetchAllClientList()
      })
      .catch((error) => {
        console.error('Error adding client: ', error);
      });
  }

  toggleStatus(client: any) {
    const newStatus = client.status === 'Active' ? 'Inactive' : 'Active';
    this.firestore
      .collection('clients')
      .doc(client.id)
      .update({ status: newStatus });
  }
  toggleField(client: any, field: string) {
  const newStatus = client[field] === 'Active' ? 'Inactive' : 'Active';
  this.firestore.collection('clients')
    .doc(client.id).update({ [field]: newStatus });
}
  updateField(client: any, field: string ,value:string) {
  this.firestore.collection('clients')
    .doc(client.id).update({ [field]: value });
}
  getAllEmployees() {
    this.membersWithNames = [];
    this.firestore
      .collection('users')
      .valueChanges()
      .pipe(take(1))
      .subscribe((users: any[]) => {
        if (users.length > 0) {
          this.membersWithNames = users.map(user => ({
            id: user.id,
            name: user.name,
            email:user.email
          }));
        } else {
          console.log('No users found in the database.');
        }
      });
  }
  getFilteredGroups()
  {
    this.filterGroup=[];
    this.filterGroup=Array.from(new Set(this.tasksAssigned.map(t => t.group))).sort();
  }
  getFilteredClients()
  {
    this.filterClients=[];
    this.filterClients=Array.from(new Set(this.tasksAssigned.map(t => t.client))).sort();
  }
  getFilteredComments()
  {
    this.filterComments=[];
    this.filterComments=Array.from(new Set(this.tasksAssigned.map(t => t.comment))).sort();
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
  isTaskDueTodayOrEarlier(dueDate: string | Date): boolean {
    const today = new Date();
    const taskDate = new Date(dueDate);
    // Set both dates to midnight to compare only the date part
    today.setHours(0, 0, 0, 0);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate <= today;
  }
  fetchTeams(): void {
    this.firestoreService.getTeams().subscribe((teams) => {
      this.teams = teams.map((team) => ({
        ...team,
        managerName: this.userMap.get(team.managerId) || 'Unknown',
        employeeNames: team.employees.map((id: string) => this.userMap.get(id) || 'Unknown'),
      }));
    });
  }
fetchAssignedTasks() {
  const today = new Date();
  let tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  today.setHours(0, 0, 0, 0); // Normalize time for comparison
  tomorrow.setHours(23, 59, 0, 0);
  this.firestore
    .collection('tasks', ref =>
      ref.where('status', 'in', ['Pending', 'Delayed']).where('deadline', '<=', tomorrow.toISOString())
    )
    .valueChanges({ idField: 'id' })
    .subscribe((tasks: any[]) => {
      this.tasksAssigned = tasks;
      console.log('Filtered tasks (pending/delayed due today or earlier):', this.tasksAssigned);
      this.populateAssignedToNames();
      setTimeout(() => {
        this.sortTasks(this.tasksWithNames);
      }, 500);
    });
}

  get uniqueClients(): string[] {
    return Array.from(new Set(this.tasksWithNames.map(t => t.client))).sort();
  }
  get uniqueDescription(): string[] {
    return Array.from(new Set(this.tasksWithNames.map(t => t.description))).sort();
  }
  deleteTask(taskId: string): void {
    if (confirm('Are you sure you want to delete this task?')) {
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
    }
  }
  updateTask() {
    if (this.taskToEdit) {
      const updatedTask = {
        client:this.editTaskClient,
        description: this.editTaskDescription,
        assignedTo: this.editSelectedMemberId,
        deadline: new Date(this.editTaskDeadline).toISOString(),
      };
      this.firestore
        .collection('tasks')
        .doc(this.taskToEdit.id)
        .update(updatedTask)
        .then(() => {
          // this.taskUpdatedAlert(updatedTask);
          alert('Task updated successfully!');
          this.taskToEdit = null;
          this.closeModal();
          this.fetchAssignedTasks(); // Refresh task list
          this.closeModal(); // Close modal
        })
        .catch((error) => {
          console.error('Error updating task:', error);
        });
    }
  }
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
  filters = {
    group:'',
    client: '',
    description: '',
    assignedToName: '',
    deadline: '',
    status: '',
    comment: ''
  };
  RevertTask(task:any)
  {
    const isConfirmed = window.confirm(
        `Are you sure you want to mark "${task.description}" as Completed?`
      );
      
      if (isConfirmed) {
        this.firestore.collection('tasks').doc(task.id)
                .update({
                status: 'Pending',
                completedAt:''
              })
        this.todayscompletedTasks = this.todayscompletedTasks.filter(task => task.id !== task.id);
      }
  }

  filteredTasks() {
    return this.tasksWithNames.filter(task =>
      (!this.filters.group || task.group?.toLowerCase().includes(this.filters.group.toLowerCase())) &&
      (!this.filters.client || task.client?.toLowerCase().includes(this.filters.client.toLowerCase())) &&
      (!this.filters.description || task.description?.toLowerCase().includes(this.filters.description.toLowerCase())) &&
      (!this.filters.assignedToName || task.assignedToName?.toLowerCase().includes(this.filters.assignedToName.toLowerCase())) &&
      (!this.filters.deadline || new Date(task.deadline).toLocaleString().toLowerCase().includes(this.filters.deadline.toLowerCase())) &&
      (!this.filters.status || task.status?.toLowerCase().includes(this.filters.status.toLowerCase())) &&
      (!this.filters.comment || task.comment?.toLowerCase().includes(this.filters.comment.toLowerCase()))
    );
  }
  filteredCompletedTasks() {
    return this.todayscompletedTasks.filter(task =>
      (!this.filters.group || task.group?.toLowerCase().includes(this.filters.group.toLowerCase())) &&
      (!this.filters.client || task.client?.toLowerCase().includes(this.filters.client.toLowerCase())) &&
      (!this.filters.description || task.description?.toLowerCase().includes(this.filters.description.toLowerCase())) &&
      (!this.filters.assignedToName || task.assignedToName?.toLowerCase().includes(this.filters.assignedToName.toLowerCase())) &&
      (!this.filters.deadline || new Date(task.deadline).toLocaleString().toLowerCase().includes(this.filters.deadline.toLowerCase())) &&
      (!this.filters.status || task.status?.toLowerCase().includes(this.filters.status.toLowerCase())) &&
      (!this.filters.comment || task.comment?.toLowerCase().includes(this.filters.comment.toLowerCase()))
    );
  }
  populateAssignedToNames() {
    this.tasksWithNames = []; // Reset first
  
    this.tasksAssigned.forEach((task) => {
      const assignedToId = task.assignedTo;
  
      if (this.userCache[assignedToId]) {
        this.tasksWithNames.push({
          ...task,
          assignedToName: this.userCache[assignedToId],
        });
      } else {
        // Firestore call to get user's name
        this.firestore
          .collection('users', (ref) => ref.where('id', '==', assignedToId))
          .valueChanges()
          .pipe(take(1)) // ✅ Only take one result, avoids multiple pushes
          .subscribe((users: any[]) => {
            if (users.length > 0) {
              const userName = users[0].name;
              this.userCache[assignedToId] = userName;
  
              this.tasksWithNames.push({
                ...task,
                assignedToName: userName,
              });
  
              // Optionally sort after pushing last item — or debounce this in future
              this.sortTasks(this.tasksWithNames);
            }
          });
      }
    });
  }
  
  toggleEmployeeSelection(employeeId: string): void {
    const index = this.selectedEmployees.indexOf(employeeId);
    if (index === -1) {
      this.selectedEmployees.push(employeeId);
    } else {
      this.selectedEmployees.splice(index, 1);
    }
  }
  
  sortTasks(tasksWithNames: { client: string; deadline: string }[]): { client: string; deadline: string }[] {
    return tasksWithNames.sort((a, b) => {
      const clientCompare = a.client.localeCompare(b.client);
      if (clientCompare !== 0) return clientCompare;
  
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }
  createTeam(): void {
    if (!this.teamName || !this.selectedManager || this.selectedEmployees.length === 0) {
      alert('Please provide a team name, select a manager, and select at least one employee.');
      return;
    }

    this.firestoreService
      .createTeam(this.teamName, this.selectedManager, this.selectedEmployees)
      .then(() => {
        alert('Team created successfully!');
        this.fetchTeams();
      })
      .catch((err) => {
        alert('Error creating team: ' + err.message);
      });
  }

  deleteTeam(teamId: string): void {
    if (confirm('Are you sure you want to delete this team?')) {
      this.firestoreService.deleteTeam(teamId).then(() => {
        alert('Team deleted successfully!');
        this.fetchTeams();
      });
    }
  }

  openEditModal(task: any) {
    this.editTaskClient=task.client;
    this.taskToEdit = task;
    this.editTaskDescription = task.description;
    this.editSelectedMemberId = task.assignedTo;
    const utcDate = new Date(task.deadline);
    utcDate.setMinutes(utcDate.getMinutes() - utcDate.getTimezoneOffset()); // Convert to local time
    this.editTaskDeadline = utcDate.toISOString().slice(0, 16); // Format properly
    console.log("DEADLINE:"+this.editTaskDeadline);
  }
    openCountryEditModal(user: any) {
    this.userToEdit=user;
    console.log(user);
  }
 
  updateRole(user: any) {
    if (!user.newRole) {
      alert('Please select a new role.');
      return;
    }

    // Update the user's role in Firestore
    this.firestore
      .collection('users')
      .doc(user.id) // Firestore document ID
      .update({ role: user.newRole }) // Update the role field
      .then(() => {
        alert(
          `Role updated for ${user.name}:\n\nOld Role: ${user.role}\nNew Role: ${user.newRole}`
        );

        // Update the role locally
        user.role = user.newRole;
        user.newRole = ''; // Reset dropdown value
      })
      .catch((error) => {
        console.error('Error updating role:', error);
        alert('Failed to update the role. Please try again later.');
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
