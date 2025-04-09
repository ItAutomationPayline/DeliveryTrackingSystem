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

export class ManagerComponent {
  public users: any[] = [];
  public managers: any[] = [];
  public selectedEmployees: string[] = [];
  public selectedManager: string = '';
  public teamName: string = '';
  public teams: any[] = [];
  
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
    this.selectedEmployees=[];
    this.users=[];
    this.firestoreService.getUsers().subscribe((users) => {
      this.users = users;
      this.managers = users.filter((user) => user.role === 'Manager' || user.role === 'Team Lead');
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

  toggleEmployeeSelection(employeeId: string): void {
    const index = this.selectedEmployees.indexOf(employeeId);
    if (index === -1) {
      this.selectedEmployees.push(employeeId);
    } else {
      this.selectedEmployees.splice(index, 1);
    }
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
