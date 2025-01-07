import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';

@Component({
  standalone:false,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
 public email: string = '';
  public password: string = '';
  ngOnInit() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('role');
}
  constructor(public firestoreService: FirestoreService,private afAuth: AngularFireAuth, private router: Router,firestore:AngularFirestore) {}
  public users: any[] = [];
  login() {
    this.afAuth.signInWithEmailAndPassword(this.email, this.password)
      .then(userCredential => {
        // Retrieve and save the token
        userCredential.user?.getIdToken().then(idToken => {
          localStorage.setItem('authToken', idToken); // Save token to local storage
          this.firestoreService.getUserByEmail(this.email).subscribe(data => {
            if (data.length > 0) {
              this.users = data[0]; // Since it's an array, the first document will be the matching user
              let role=data[0].role;
             if(role==="Executive"){
              this.router.navigateByUrl('/executive');
              localStorage.setItem('role',role);
             }
             if(role==="Manager"){
              this.router.navigateByUrl('/manager');
              localStorage.setItem('role',role);
             }
             if(role==="Team Lead"){
              localStorage.setItem('role',role);
              this.router.navigateByUrl('/teamlead');
             }
            } 
            else {
              console.log('No user found with this email.');
            }
          }
        );
        });
      }
    )
      .catch(err => alert('Login Failed: ' + err.message));
  }
}
