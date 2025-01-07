import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';

@Component({
  standalone:false,
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {
  public email: string = '';

  constructor(private afAuth: AngularFireAuth, private router: Router) {}

  resetPassword() {
    if (!this.email) {
      alert('Please enter your email address');
      return;
    }

    this.afAuth.sendPasswordResetEmail(this.email)
      .then(() => {
        alert('Password reset email sent. Check your inbox.');
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        alert('Error: ' + error.message);
      });
  }
}
