import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import * as XLSX from 'xlsx';
import { forkJoin, map, switchMap, take } from 'rxjs';

@Component({
  selector: 'app-reports-downloader',
  standalone: false,
  
  templateUrl: './reports-downloader.component.html',
  styleUrl: './reports-downloader.component.css'
})
export class ReportsDownloaderComponent {
reportForm: FormGroup;
 constructor(private fb: FormBuilder,private router: Router,private firestoreService: FirestoreService,private firestore: AngularFirestore) 
  {
    this.reportForm = this.fb.group({
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required]
    });
  }
    generateReport() {
      const { fromDate, toDate } = this.reportForm.value;
      let from = new Date(fromDate);
      let to = new Date(toDate);
      console.log("FROM"+from);
      console.log("TO"+to);
      // // First, get the tasks based on the date range
      this.firestore.collection('tasks', ref =>
        ref.where('deadline', '>=', from.toISOString())
           .where('deadline', '<=', to.toISOString())
      ).valueChanges()
      .pipe(take(1),
        switchMap((temp: any[]) => {
          // Fetch user details for assignedTo and createdBy
          const userIds = [
            ...new Set(temp.map(temp => temp.assignedTo).filter(id => id)), // Get unique user IDs for assignedTo
            ...new Set(temp.map(temp => temp.createdBy).filter(id => id)) // Get unique user IDs for createdBy
          ];
    
          // Return an observable for the user data
          const userPromises = userIds.map(id =>
            this.firestore.collection('users').doc(id).get().toPromise().catch(() => null)
          );
    
          return forkJoin(userPromises).pipe(
            map((userDocs: any[]) => {
              const users = userDocs.reduce((acc, doc) => {
                const userData = doc.data();
                acc[doc.id] = userData.name || ''; // Store name against user ID
                return acc;
              }, {});
    
              // Map tasks and replace IDs with names
              const SelectedTask = temp.map(t => ({
                group: t.group || '',
                client: t.client || '',
                clientStatus: t.clientStatus || '',
                description: t.description || '',
                deadline: this.formatDate(t.deadline),
                completedAt: this.formatDate(t.completedAt),
                createdBy: users[t.createdBy] || '', // Get the name for createdBy
                assignedTo: users[t.assignedTo] || '', // Get the name for assignedTo
                status: t.status || '',
                reportType: t.reportType || '',
                QcApproval: t.QcApproval || '',
                comment:t.comment,
                sequence: t.Sequence !== undefined ? t.Sequence.toString() : '' // Ensure sequence is a string
              }));
              return SelectedTask;
            })
          );
        })
      )
      .subscribe((ShortListedTasks: any[]) => {
        console.log(ShortListedTasks);
        this.downloadExcel(ShortListedTasks);
      });
    }
      downloadExcel(data: any[]) {
        // First create an array with correct headings and data
        const headings = [
          'Group', 'Client', 'Description', 'Deadline', 
          'Completed At', 'TL', 'Ops', 'Status', 
          'Report Type', 'Qc Approval', 'Sequence','Comment'
        ];
        const formattedData = data.map(item => ({
          Group: item.group,
          Client: item.client,
          Description: item.description,
          Deadline: item.deadline,
          'Completed At': item.completedAt,
          'TL': item.createdBy,
          Ops: item.assignedTo,
          Status: item.status,
          'Report Type': item.reportType,
          'Qc Approval': item.QcApproval,
          Sequence: item.sequence,
          Comment: item.comment
        }));
        const ws = XLSX.utils.json_to_sheet(formattedData, { header: headings });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        const from = this.reportForm.value.fromDate;
        const to = this.reportForm.value.toDate;
        const fileName = `Tasks_report_${from}_to_${to}.xlsx`;
        XLSX.writeFile(wb, fileName);
      }
      formatDate(isoTimestamp: string): string {
        if (!isoTimestamp) return '';
        
        const date = new Date(isoTimestamp);
        
        // Check if the date is invalid
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        const pad = (num: number) => num.toString().padStart(2, '0');
        
        const day = pad(date.getDate());
        const month = pad(date.getMonth() + 1);
        const year = date.getFullYear();
        
        let hours = date.getHours();
        const minutes = pad(date.getMinutes());
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours || 12; // Convert 0 to 12
        
        return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
      }
}
