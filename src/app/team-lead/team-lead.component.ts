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
  teams: any[] = [];
  // List of teams led by the team lead
  profile:any=localStorage.getItem('profilemail');
  leadmail:string=this.profile.email;
  selectedTeamId: string | null = null;
  AllClientsAndGroups:any[] = [];
  AllClients:string[] = [];
  AllGroups:string[]=[];
  teamMembers: string[] = []; // Members of the selected team
  taskDescription: string = '';
  GroupName: string = '';
  ClientName: string = '';
  opsName: string = '';
  TaskName: string = '';
  ScheduledDate: number = 0;
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
  tasksWithDeadlines: { description: string; deadlines: string[] }[] = [];
  userCache: { [key: string]: string } = {};
  memberNames:  any[] = [];
  rec: string[] = [];
  minDeadline: string = '';
  selectedTime: string = '';
  tableData: any[][] = [];
  taskToEdit: any = null;
  Client: string = '';
  editTaskDescription: string = '';
  editTaskClient: string = '';
  editTaskDate: string = '';
  editSelectedMemberId: string | null = null;
  editTaskDeadline: string = '';

  constructor(private cdRef: ChangeDetectorRef,private router: Router, private firestore: AngularFirestore,private firestoreService: FirestoreService,private datePipe: DatePipe) {}

  ngOnInit() {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('authToken');
    const managerId = localStorage.getItem('id'); // Retrieve logged-in Team Lead's ID from localStorage
    if (!token || role !== 'Manager') {
      if (!token || role !== 'Team Lead') {
        this.router.navigateByUrl('/login');
        return;
      }
    }
      this.teams=[];
      this.opsName='';
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
      setTimeout(() => {
        this.loadData(managerId); // Your logic here
      }, 500);
    this.updateMinDeadline();
    this.getFilteredClients();
    this.getFilteredDescription();
    this.loadDescriptionSuggestions();
    this.fetchClients();
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
  // toggleClientDropdown(event: Event) {
  //   event.stopPropagation();
  //   this.clientDropdownOpen = true;
  //   this.allClients=[];
  //   this.allClients = Array.from(new Set(this.tasksWithNames.map(t => t.client)))
  //     .filter(client => client)
  //     .sort();
  //   this.filteredClients = [...this.allClients];
  // }

  // toggleDescriptiontDropdown(event: Event) {
  //   event.stopPropagation();
  //   this.clientDropdownOpen = true;
  //   this.allClients=[];
  //   this.allClients = Array.from(new Set(this.tasksWithNames.map(t => t.description)))
  //     .filter(client => client)
  //     .sort();
  //   this.filteredClients = [...this.allClients];
  // }
  
  // toggleassignedToNametDropdown(event: Event) {
  //   event.stopPropagation();
  //   this.clientDropdownOpen = true;
  //   this.allClients=[];
  //   this.allClients = Array.from(new Set(this.tasksWithNames.map(t => t.assignedToName)))
  //     .filter(client => client)
  //     .sort();
  //   this.filteredClients = [...this.allClients];
  // }

  // filterClientSuggestions() {
  //   const val = this.filters.client?.toLowerCase() || '';
  //   this.filteredClients = this.allClients.filter(client =>
  //     client.toLowerCase().includes(val)
  //   );
  // }
  
  // selectClient(client: string) {
  //   this.filters.client = client;
  //   this.clientDropdownOpen = false;
  // }
  // selectDescription(client: string) {
  //   this.filters.description = client;
  //   this.clientDropdownOpen = false;
  // }
  
  // @HostListener('document:click')
  // closeClientDropdown() {
  //   this.clientDropdownOpen = false;
  // }
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
  
      // Get the first worksheet
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];
  
      // Convert sheet data to JSON (header: 1 returns arrays)
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
      if (data.length > 1) {
        this.tasksWithDeadlines = [];
        // Extract first row as task descriptions
        const taskHeaders = data[0]; 
        // Iterate over each column to get deadlines
        for (let col = 0; col < taskHeaders.length; col++) {
          const description = taskHeaders[col]; 
          if (description) {
            const deadlines = data.slice(1).map(row => row[col]).filter(deadline => deadline);
            if (deadlines.length > 0) {
              this.tasksWithDeadlines.push({ description, deadlines });
            }
          }
        }
      }
    };
  
    reader.readAsBinaryString(target.files[0]);
  }
  // sortTasks() {
  //   this.tasksWithNames = this.tasksWithNames.slice().sort((a, b) => 
  //     a.client.localeCompare(b.client)
  //   );
  //   console.log("Sorted Tasks"+this.tasksWithNames);
  // }
  
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
    this.getTeams(managerId); // Pass the managerId to getTeams
    console.log("membernames",this.memberNames)
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
  openScheduledTasksEditModal(task: any) {
    this.editTaskClient=task.client;
    this.taskToEdit = task;
    this.ScheduledDate = task.date;
    this.editTaskDescription = task.description;
    this.editSelectedMemberId = task.assignedTo;
    this.editTaskDeadline = new Date(task.deadline).toISOString().slice(0, 16);
  }
  // updateScheduledTask() {
  //   if (this.taskToEdit) {
  //     const updatedTask = {
  //       description: this.editTaskDescription,
  //       assignedTo: this.editSelectedMemberId,
  //       time: this.editTaskDeadline,
  //     };

  //     this.firestore
  //       .collection('scheduledTasks')
  //       .doc(this.taskToEdit.id)
  //       .update(updatedTask)
  //       .then(() => {
  //         alert('Task updated successfully!');
  //         this.taskToEdit = null;
  //         this.closeScheduledTasksModal(); // Close modal
  //         this.fetchAssignedTasks();
  //       })
  //       .catch((error) => {
  //         console.error('Error updating task:', error);
  //       });
  //   }
  // }
  // Update Task in Firestore
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
          const subject = `${this.editTaskClient}: Task Updated: ${updatedTask.description}`;
          const body = `
            <p>Dear Manager,</p>
            <p>Team Leader ${localStorage.getItem('nm')} updated a task in the DTS with the following details:</p>
            <ul>
              <li><strong>Client:</strong> ${updatedTask.client}</li>
              <li><strong>Description:</strong> ${updatedTask.description}</li>
              <li><strong>Deadline:</strong> ${new Date(updatedTask.deadline).toLocaleString()}</li>
            </ul>
            <p>Best regards,<br>DTS</p>
          `;
  
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
    // Query Firestore for tasks where `createdBy` matches the Team Lead's ID
    this.firestore
      .collection('tasks', ref => ref.where('createdBy', '==', this.teamLeadId).where('clientStatus', '==', 'Active'))
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
  // fetchAssignedScheduledTasks(){
  //   this.firestore
  //     .collection('scheduledTasks', ref => ref.where('createdBy', '==', this.teamLeadId))
  //     .valueChanges({ idField: 'id' }) // Include document ID in the result
  //     .subscribe((tasks: any[]) => {
  //       this.scheduledTasksAssigned = tasks;
  //       console.log('Tasks assigned by you:', this.tasksAssigned);
  //       this.populateAssignedScheduledTasksToNames();
  //     });
  // }
  updateMinDeadline() {
    const now = new Date();
    this.minDeadline = now.toISOString().slice(0, 16); // Format as 'YYYY-MM-DDTHH:mm'
  }

  // assignScheduledTask(){
  //   if (this.selectedTeamId||this.selectedMemberId && this.TaskName && this.ScheduledDate&& this.selectedTime) {
  //     const task = {
  //       assignedTo: this.selectedMemberId,
  //       teamId: this.selectedTeamId,
  //       client:this.ClientName,
  //       description: this.TaskName,
  //       date:this.ScheduledDate,
  //       time:this.selectedTime,
  //       status: '',
  //       createdBy: localStorage.getItem('id'), // Use the logged-in Team Lead's ID
  //       leadermail:this.profile
  //     };
  //     this.fetchprofile(task);
  //     this.firestore
  //       .collection('scheduledTasks')
  //       .add(task)
  //       .then(() => {
  //         alert('Task assigned successfully!');
  //         this.resetForm();
  //       })
  //       .catch((error) => {
  //         alert('Failed to assign task. Please try again.');
  //       });
  //   }
  // }
  // populateAssignedScheduledTasksToNames(){
  //   this.scheduledTasksAssignedWithNames = []; // Reset the tasks array with names
  //   this.scheduledTasksAssigned.forEach((task) => {
  //     const assignedToId = task.assignedTo;
  //     // Check if the user's name is already cached
  //     if (this.userCache[assignedToId]) {
  //       this.scheduledTasksAssignedWithNames.push({
  //         ...task,
  //         assignedToName: this.userCache[assignedToId], // Add the name from the cache
  //       });
  //     }
  //     else {
  //       // Fetch the user's name from Firestore
  //       this.firestore
  //         .collection('users', (ref) => ref.where('id', '==', assignedToId))
  //         .valueChanges()
  //         .subscribe((users: any[]) => {
  //           if (users.length > 0) {
  //             const userName = users[0].name; // Assuming "name" is the field in the "users" collection
  //             this.userCache[assignedToId] = userName; // Cache the name for future use
  //             this.scheduledTasksAssignedWithNames.push({
  //               ...task,
  //               assignedToName: userName, // Add the name to the task
  //             });
  //           } else {
  //             console.log(`No user found with ID: ${assignedToId}`);
  //           }
  //         });
  //     }
  //   });
  // }
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
      .valueChanges()
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
    this.tasksWithDeadlines.forEach((taskData) => {
      taskData.deadlines.forEach((deadline) => {
        const formattedDeadline = this.formatExcelDate(deadline);
        console.log("taskDesc"+taskData.description+"Deadline"+formattedDeadline);
        const task = {
          assignedTo: this.selectedMemberId,
          teamId: this.selectedTeamId,
          group:this.GroupName,
          client: this.ClientName,
          description: taskData.description,
          deadline: formattedDeadline, // Convert deadline to ISO format
          completedAt:'',
          status: 'Pending',
          createdBy: localStorage.getItem('id'),
          leadermail: this.profile,
          clientStatus:'Active'
        };
  
        this.firestore
          .collection('tasks')
          .add(task)
          .then(() => console.log('Task assigned:', task))
          .catch((error) => console.error('Error assigning task:', error));
      });
    });
  
    alert('All tasks assigned successfully!');
  }
  
  // Assign a task to a selected team member
  assignTask() {
    if (this.selectedTeamId||this.selectedMemberId && this.taskDescription && this.taskDeadline) {
      const task = {
        assignedTo: this.selectedMemberId,
        teamId: this.selectedTeamId,
        group:this.GroupName,
        client:this.ClientName,
        description: this.taskDescription,
        deadline: new Date(this.taskDeadline).toISOString(),
        completedAt:'',
        status: 'Pending',
        createdBy: localStorage.getItem('id'), // Use the logged-in Team Lead's ID
        leadermail:this.profile,
        clientStatus:'Active'
      };
      this.fetchprofile(task);
      this.firestore
        .collection('tasks')
        .add(task)
        .then(() => {
          alert('Task assigned successfully!');
          this.resetForm();
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
  // deleteScheduledTask(taskId: string): void {
  //   if (confirm('Are you sure you want to delete this task?')) {
  //     this.firestore
  //       .collection('scheduledTasks') // Reference to the tasks collection
  //       .doc(taskId) // Reference to the specific task document
  //       .delete()
  //       .then(() => {
  //         console.log('Task deleted successfully!');
  //         // Optionally, update the tasksWithNames array locally
  //         this.tasksWithNames = this.tasksWithNames.filter(task => task.id !== taskId);
  //       })
  //       .catch(error => {
  //         console.error('Error deleting task: ', error);
  //       });
  //   }
  // }
  
  // get sortedTasks(): Task[] {
  //   return this.tasksWithNames.slice().sort((a, b) => {
  //     // Sort by client name (alphabetically)
  //     if (a.client.toLowerCase() < b.client.toLowerCase()) return -1;
  //     if (a.client.toLowerCase() > b.client.toLowerCase()) return 1;
  
  //     // If client names are the same, sort by deadline (earliest first)
  //     return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  //   });
  // }
  trackById( item: any) {
    return item.id; // Ensure 'id' is unique for each item
  }

  // Reset the form after task assignment
  resetForm() {
    this.taskDescription = '';
    this.selectedMemberId = null;
    this.taskDeadline = '';
  }
}