import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { DatePipe } from '@angular/common';
import { take } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: false,
  providers: [DatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  profile: any[] = [];
  firstname:string='';
  middlename:string='';
  lastname:string='';
  dob:string='';
  doj:string='';
  pan:string='';
  personalemail:string='';
  aadhar:string='';
  address:string='';
  emergency:string='';
  relation:string='';
  bloodgroup:string='';
  employeeId: any= localStorage.getItem('id');
  constructor(private fb: FormBuilder,private router: Router,private firestoreService: FirestoreService,private firestore: AngularFirestore) 
    {
      
    }
  ngOnInit()
  {
    const token = localStorage.getItem('authToken');
    const id = localStorage.getItem('id');
    if (!token) {
      this.router.navigateByUrl('/login');
      return;
    }
    this.profile[0]="";
    this.fetchprofile();
  }
   fetchprofile()
      {
        this.firestore
             .collection('users', (ref) => ref.where('id', '==', this.employeeId))
             .valueChanges()
             .pipe(take(1)) // ✅ Only take one result, avoids multiple pushes
             .subscribe((users: any[]) => {
               this.profile[0]=users[0];
             })
       }
       sameAddress: boolean = false;

copyAddressIfSame() {
  if (this.sameAddress) {
      this.profile[0].permanentAddressline1= this.profile[0].addressline1,
      this.profile[0].permanentAddressline2= this.profile[0].addressline2,
      this.profile[0].permanentCity= this.profile[0].city,
      this.profile[0].permanentState= this.profile[0].state,
      this.profile[0].permanentPin= this.profile[0].pincode
  }
}
      UpdateProfile()
      {
       console.log(this.firstname);
       console.log(this.lastname);
       console.log(this.address);
        this.firestore
             .collection('users')
             .doc(this.employeeId)
             .update({
               firstname:this.profile[0].firstname,
               middlename:this.profile[0].middlename,
               lastname:this.profile[0].lastname,
               dob:this.profile[0].dob,
               pan:this.profile[0].pan,
               aadhar:this.profile[0].aadhar,
               doj:this.profile[0].doj,
               addressline1:this.profile[0].addressline1,
               personalemail:this.profile[0].personalemail,
               addressline2:this.profile[0].addressline2,
               emergency:this.profile[0].emergency,
               city:this.profile[0].city,
               state:this.profile[0].state,
               pincode:this.profile[0].pincode,
               relation:this.profile[0].relation,
               bloodgroup:this.profile[0].bloodgroup,
              permanentAddressline1: this.profile[0].permanentAddressline1,
              permanentAddressline2: this.profile[0].permanentAddressline2,
              permanentCity: this.profile[0].permanentCity,
              permanentState: this.profile[0].permanentState,
              permanentPin: this.profile[0].permanentPin
             }) .then(() => {
               alert('Profile details updated successfully!');
               // this.fetchTasks();
             })
      }
}
