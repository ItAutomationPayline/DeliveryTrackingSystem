import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FirestoreService } from '../services/firestore.service';
import { take } from 'rxjs';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-manager',
  standalone: false,
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.css'] // Corrected 'styleUrl' to 'styleUrls'
})

export class ManagerComponent {
  AllActiveQcReports: any[] = [];
  public tasksAssigned: any[] = [];
  public users: any[] = [];
  public managers: any[] = [];
  groupName = '';
  clientName = '';
  isActive = true;
  AllClients: any[] = [];
  public selectedEmployees: string[] = [];
  public selectedManager: string = '';
  public teamName: string = '';
  public teams: any[] = [];
  public tasksWithNames: any[] = [];
  membersWithNames: any[] = [];
  Client: string = '';
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
  
  public userMap: Map<string, string> = new Map(); // Map of user IDs to names

  constructor(private router: Router,private firestoreService: FirestoreService,private firestore: AngularFirestore) {}

  ngOnInit() {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('authToken');
    const id = localStorage.getItem('id');
    if ((!token) || (role !== 'Manager')) {
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
      this.managers = users.filter((user) => user.role === 'Manager' || user.role === 'Team Lead'|| user.role === 'QCLead');
      this.userMap = new Map(users.map((user) => [user.id, user.name]));
      this.fetchTeams();
    });
    if (!sessionStorage.getItem('hasReloaded')) {
      sessionStorage.setItem('hasReloaded', 'true'); // Mark reload in session storage
      window.location.reload(); // Force reload of the entire page
    } else {
      sessionStorage.removeItem('hasReloaded'); // Clear the reload marker after the first load
      console.log('Component initialized after reload');
    }
    this.teams=[];
    this.tasksAssigned=[];
    this.userCache = {};
    this.editTaskDescription='';
    this.editSelectedMemberId='';
    this.editTaskDeadline='';
    this.tasksWithNames=[];
    this.fetchAssignedTasks();
    this.getAllEmployees();
    this.fetchAllClientList();
    this.sortClientsByGroupAndName();
    this.fetchAllQcReports();
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
    const clientData = {
      groupName: this.groupName,
      clientName: this.clientName,
      status:'Active',
      timestamp: new Date(),
    };

    this.firestore
      .collection('clients')
      .add(clientData)
      .then(() => {
        this.groupName = '';
        this.clientName = '';
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
            name: user.name
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
    // Query Firestore for tasks where `createdBy` matches the Team Lead's ID
    this.firestore
      .collection('tasks')
      .valueChanges({ idField: 'id' }) // Include document ID in the result
      .subscribe((tasks: any[]) => {
        this.tasksAssigned = tasks;
        console.log('Tasks assigned by you:', this.tasksAssigned);
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
  // populateAssignedToNames() {
  //   this.tasksWithNames = []; // Reset the tasks array with names
  //   this.tasksAssigned.forEach((task) => {
  //     const assignedToId = task.assignedTo;
  //     // Check if the user's name is already cached
  //     if (this.userCache[assignedToId]) {
  //       this.tasksWithNames.push({
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
  //             this.tasksWithNames.push({
  //               ...task,
  //               assignedToName: userName, // Add the name to the task
  //             });
  //           } else {
  //             console.log(`No user found with ID: ${assignedToId}`);
  //           }
  //         });
  //     }
  //   });
  //   this.sortTasks(this.tasksAssigned);
  //   // this.sortTasks(this.tasksWithNames);
  // }
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
}
