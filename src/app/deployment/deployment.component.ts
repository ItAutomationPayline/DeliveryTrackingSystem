import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-deployment',
  standalone: false,
  providers: [DatePipe],
  templateUrl: './deployment.component.html',
  styleUrl: './deployment.component.css'
})
export class DeploymentComponent {
  constructor(
      private router: Router,
      private firestoreService: FirestoreService,
      private firestore: AngularFirestore,
      private http: HttpClient,
      private datePipe: DatePipe
    ) {}
    ngOnInit(){}
    
    setAllUsersIndiaCode()
    {
      if (confirm('Are you sure you want to set all users as +91 code?'))
        {
          let countryArray: string[] = ['+91'];
          this.firestore
      .collection('users')
      .get().subscribe(snapshot => {
        snapshot.forEach(doc => {
          doc.ref.update({ country: countryArray })
        });
        alert('All users set as indian successfully!!!.');
      }, error => {
        console.error('Error transferring tasks: ', error);
        alert('Error transferring tasks.');
      })
        }
    }
    setAllClientsIndian()
    {
      if (confirm('Are you sure you want to set all clients as +91 code?'))
        {
           this.firestore.collection('clients').get()
           .subscribe(snapshot => {
            snapshot.forEach(doc => {
              doc.ref.update({ country: '+91' })
            });
        alert('All clients are set as +91 successfullly');
      }, error => {
        console.error('Error transferring tasks: ', error);
        alert('Error transferring tasks.');
      })
        }
    }
    setAllTasksIndian()
    {
      if (confirm('Are you sure you want to set all tasks as +91 code?'))
        {
          this.firestore.collection('tasks')
          .get()
          .subscribe(snapshot => {
            snapshot.forEach(doc => {
              doc.ref.update({ country:'+91'})
            });
            alert('All tasks are set as +91 successfullly');
          }, error => {
            console.error('Error transferring tasks: ', error);
            alert('Error transferring tasks.');
          })
        }
    }
}
