import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  public email: string = '';
  public password: string = '';
  public sessionTimeout: any;
  public inactivityDuration = 30 * 60 * 1000;

  ngOnInit() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('role');
    localStorage.removeItem('nm');
    localStorage.removeItem('id'); // Clear collection ID on logout or fresh login
    localStorage.removeItem('profilemail');
     if (!sessionStorage.getItem('hasReloaded')) {
      sessionStorage.setItem('hasReloaded', 'true'); // Mark reload in session storage
      window.location.reload(); // Force reload of the entire page
    } else {
      sessionStorage.removeItem('hasReloaded'); // Clear the reload marker after the first load
      console.log('Component initialized after reload');
    }
    this.startSessionTimer();
  }
  constructor(public firestoreService: FirestoreService,private afAuth: AngularFireAuth,private router: Router,private firestore: AngularFirestore) {}
  public users: any[] = [];
  login() {
    this.afAuth.signInWithEmailAndPassword(this.email, this.password)
      .then(userCredential => {
        // Retrieve and save the token
        userCredential.user?.getIdToken().then(idToken => {
          localStorage.setItem('authToken', idToken); // Save token to local storage

          // Query Firestore to get the user by email
          this.firestoreService.getUserByEmail(this.email).subscribe(data => {
            if (data.length > 0) {
              const user = data[0]; // Since it's an array, the first document will be the matching user
              const role = user.role;
              localStorage.setItem('profilemail',data[0].email);
              localStorage.setItem('nm',data[0].name);
              // Save the document ID (collection ID) to localStorage
              const collectionId = user.id; // Assuming `id` is the Firestore document ID
              localStorage.setItem('id', collectionId);
              console.log(collectionId);
              localStorage.setItem('profile', user);
              // Navigate based on the user's role
              if (role === "Executive") {
                this.router.navigateByUrl('/executive');
                localStorage.setItem('role', role);
              }
               else if (role === "Manager") {
                this.router.navigateByUrl('/manager');
                localStorage.setItem('role', role);
              }
              else if (role === "Compliance") {
                this.router.navigateByUrl('/compliance');
                localStorage.setItem('role', role);
              }
              else if (role === "Compliance Lead") {
                this.router.navigateByUrl('/compliance');
                localStorage.setItem('role', role);
              }
              else if (role === "General Manager") {
                this.router.navigateByUrl('/manager');
                localStorage.setItem('role', role);
              }
              else if (role === "Director") {
                this.router.navigateByUrl('/manager');
                localStorage.setItem('role', role);
              }
              else if (role === "QC") {
                this.router.navigateByUrl('/qc');
                localStorage.setItem('role', role);
              }
              else if (role === "QCLead") {
                this.router.navigateByUrl('/qc');
                localStorage.setItem('role', role);
              }
               else if (role === "Team Lead") {
                this.router.navigateByUrl('/teamlead');
                localStorage.setItem('role', role);
              }
            } else {
              console.log('No user found with this email.');
            }
          });
        });
      })
      .catch(err => alert('Login Failed: ' + err.message));
  }
    startSessionTimer() {
      // Clear any existing timer to avoid multiple timers
      if (this.sessionTimeout) {
        clearTimeout(this.sessionTimeout);
      }
      // Set a new inactivity timer
      this.sessionTimeout = setTimeout(() => {
        window.location.reload();
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
