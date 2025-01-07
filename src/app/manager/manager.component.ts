import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FirestoreService } from '../services/firestore.service';

@Component({
  selector: 'app-manager',
  standalone: false,
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.css'] // Corrected 'styleUrl' to 'styleUrls'
})
export class ManagerComponent{
  public users: any[] = []; // List of users fetched from Firestore
  public managers: any[] = []; // List of managers for dropdown
  public selectedEmployees: string[] = []; // Selected employee IDs for the team
  public selectedManager: string = ''; // Selected manager ID
  public teamName: string = ''; // Team name
  public teams: any[] = [];
  constructor(private router: Router,private firestoreService: FirestoreService,private firestore: AngularFirestore) {}

  ngOnInit() {
    // Check user role from localStorage
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('authToken');

    if (!token || role !== 'Manager') {
      this.router.navigateByUrl('/login'); // Redirect to login if not authorized
      return;
    }
    this.firestoreService.getManagers().subscribe(managers => {
      this.managers = managers;
    });
    // Fetch users if the role is valid
    this.firestoreService.getUsers().subscribe((data) => {
      this.users = data;
      console.log('Fetched users with document IDs:', this.users);
    });
    this.fetchTeams();
  }
  fetchTeams(): void {
    this.firestoreService.getTeams().subscribe(data => {
      this.teams = data;
    });
  }
  deleteTeam(teamId: string): void {
    if (confirm('Are you sure you want to delete this team?')) {
      this.firestoreService.deleteTeam(teamId).then(() => {
        alert('Team deleted successfully!');
        this.fetchTeams(); // Refresh the list
      }).catch(err => {
        alert('Failed to delete team: ' + err.message);
      });
    }
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
  toggleEmployeeSelection(employeeId: string) {
    const index = this.selectedEmployees.indexOf(employeeId);
    if (index === -1) {
      this.selectedEmployees.push(employeeId);
    } else {
      this.selectedEmployees.splice(index, 1);
    }
  }

  createTeam() {
    if (!this.teamName || !this.selectedManager || this.selectedEmployees.length === 0) {
      alert('Please provide a team name, select a manager, and select at least one employee.');
      return;
    }

    // Call Firestore service to create the team
    this.firestoreService.createTeam(this.teamName, this.selectedManager, this.selectedEmployees)
      .then(() => {
        alert('Team created successfully!');
        this.router.navigateByUrl('/dashboard'); // Navigate after success
      })
      .catch(err => {
        alert('Error creating team: ' + err.message);
      });
  }
  
}
