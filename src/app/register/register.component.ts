import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  standalone:false,
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  email: string = '';
  password: string = '';
  name: string = '';
  ngOnInit() {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('authToken');

    if (!token && role !== 'Manager') {
      this.router.navigateByUrl('/login');
      return;
    }
  }
  constructor(private afAuth: AngularFireAuth,private router: Router,private firestore: AngularFirestore) {}

  validateName(): boolean {
    const nameRegex = /^[A-Za-z\s]+$/; // Only alphabets and spaces
    return nameRegex.test(this.name.trim());
  }

  register() {
    if (!this.name.trim() || !this.email.trim() || !this.password.trim()) {
      alert('All fields are required.');
      return;
    }
  
    if (!this.validateName()) {
      alert('Name must contain only alphabets and spaces.');
      return;
    }
  
    this.afAuth.createUserWithEmailAndPassword(this.email, this.password)
      .then(() => {
        // Generate a new document ID
        const userDocRef = this.firestore.collection('users').doc(); // Firestore document reference
        const collectionId = userDocRef.ref.id; // Retrieve the generated document ID
  
        // Save the data with the document ID included
        userDocRef.set({
          id: collectionId, // Add the generated document ID to the data
          email: this.email,
          role: 'Executive',
          name: this.name
        }).then(() => {
          alert('Registration Successful');
          this.router.navigateByUrl('/login');
        }).catch(err => {
          alert('Failed to save user data: ' + err.message);
        });
      })
      .catch(err => alert('Registration Failed: ' + err.message));
  }
}
