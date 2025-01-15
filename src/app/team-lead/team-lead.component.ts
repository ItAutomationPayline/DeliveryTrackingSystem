import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-team-lead',
  standalone: false,
  templateUrl: './team-lead.component.html',
  styleUrls: ['./team-lead.component.css'], // Fixed styleUrls typo
  providers: [DatePipe]
})
export class TeamLeadComponent {
  teams: any[] = []; // List of teams led by the team lead
  profile:any=localStorage.getItem('profilemail');
  leadmail:string=this.profile.email  
  selectedTeamId: string | null = null;
  teamMembers: string[] = []; // Members of the selected team
  taskDescription: string = '';
  selectedMemberId: string | null = null;
  taskDeadline: string = ''; // Deadline in ISO format
  membersWithNames: any[] = [];
  tasksAssigned: any[] = []; // Tasks assigned by the logged-in Team Lead
  teamLeadId: any = localStorage.getItem('id');
  tasksWithNames: any[] = [];
  userCache: { [key: string]: string } = {};
  memberNames:  any[] = [];
  rec: string[] = [];
  constructor(private router: Router, private firestore: AngularFirestore,private firestoreService: FirestoreService,private datePipe: DatePipe) {}

  ngOnInit() {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('authToken');
    const managerId = localStorage.getItem('id'); // Retrieve logged-in Team Lead's ID from localStorage

    if (!token || role !== 'Team Lead') {
      this.router.navigateByUrl('/login');
      return;
    }

    if (managerId) {
      this.teams=[];
      this.tasksAssigned=[];
      this.getTeams(managerId); // Pass the managerId to getTeams
      this.fetchAssignedTasks();
      console.log("membernames",this.memberNames)
    } else {
      alert('Manager ID not found. Please log in again.');
      this.router.navigateByUrl('/login');
    }
    // if (!sessionStorage.getItem('hasReloaded')) {
    //   sessionStorage.setItem('hasReloaded', 'true'); // Mark reload in session storage
    //   window.location.reload(); // Force reload of the entire page
    // } else {
    //   sessionStorage.removeItem('hasReloaded'); // Clear the reload marker after the first load
    //   console.log('Component initialized after reload');
    // }
  }
  
  fetchAssignedTasks() {
    // Query Firestore for tasks where `createdBy` matches the Team Lead's ID
    this.firestore
      .collection('tasks', ref => ref.where('createdBy', '==', this.teamLeadId))
      .valueChanges({ idField: 'id' }) // Include document ID in the result
      .subscribe((tasks: any[]) => {
        this.tasksAssigned = tasks;
        console.log('Tasks assigned by you:', this.tasksAssigned);
        this.populateAssignedToNames();
      });
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
      } else {
        // Fetch the user's name from Firestore
        this.firestore
          .collection('users', (ref) => ref.where('id', '==', assignedToId))
          .valueChanges()
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
          .valueChanges()
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
  
  // Assign a task to a selected team member
  assignTask() {
    if (this.selectedTeamId||this.selectedMemberId && this.taskDescription && this.taskDeadline) {
      const task = {
        assignedTo: this.selectedMemberId,
        teamId: this.selectedTeamId,
        description: this.taskDescription,
        deadline: new Date(this.taskDeadline).toISOString(),
        status: 'pending',
        createdBy: localStorage.getItem('id'), // Use the logged-in Team Lead's ID
        leadermail:this.profile
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
              this.sendEmail(usermail,desc,userName,deadline);
            }
          });
  }
  sendEmail(recipient: string, task: any,name:string,deadline:string) {
    const formattedDeadline = this.datePipe.transform(deadline, 'MMMM dd, y, h:mm:ss a'); // Formatting the deadline
   this.rec[0]=recipient
    let bodydata = {
      "recipients": this.rec,
      "subject": `New Task Assigned: ${task}`,
      "body": `Hello ${name},\n\nA new task has been assigned to you.\n\nTask: ${task}\nDeadline: ${formattedDeadline}\n\nPlease take the necessary actions.`,
    };
this.firestoreService.sendMail(bodydata);
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
  // Reset the form after task assignment
  resetForm() {
    this.taskDescription = '';
    this.selectedMemberId = null;
    this.taskDeadline = '';
  }
  
}
