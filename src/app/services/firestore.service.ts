import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(private firestore: AngularFirestore,private httpClient:HttpClient) {}
 SERVER_URL="https://emailservice-6-e22v.onrender.com/sendEmail";
  // Retrieve all users from Firestore
  getUsers(): Observable<any[]> {
    return this.firestore.collection('users').snapshotChanges().pipe(
      map((snapshots) => 
        snapshots.map((doc) => {
          const data = doc.payload.doc.data() as any;
          const id = doc.payload.doc.id; // Fetching the document ID
          return { id, ...data }; // Return the ID along with user data
        })
      )
    );
  }
  getUserByEmail(email: string): Observable<any> {
    return this.firestore.collection('users', ref => ref.where('email', '==', email)).valueChanges();
  }
  getManagers(): Observable<any[]> {
    return this.firestore
      .collection('users', ref => ref.where('role', '==', 'Team Lead'))
      .valueChanges({ idField: 'id' });
  }

  createTeam(teamName: string, managerId: string, employeeIds: string[]) {
    return this.firestore.collection('teams').add({
      name: teamName,
      managerId: managerId,
      employees: employeeIds,
      createdAt: new Date(),
    });
  }
  deleteTeam(teamId: string): Promise<void> {
    return this.firestore.collection('teams').doc(teamId).delete();
  }
  getTeams(): Observable<any[]> {
    return this.firestore.collection('teams', ref => ref.orderBy('createdAt')).valueChanges({ idField: 'id' });
  }
  getUserById(userId: string):Observable<any> {
    return this.firestore.collection('users', ref => ref.where('id', '==', userId)).valueChanges();
  }
  sendMail(bodydata:{recipients:string[],subject:string,body:string}){
    return this.httpClient.post(this.SERVER_URL,bodydata).subscribe( (resultdata: any) => {
      console.log(resultdata)});
   }
}
