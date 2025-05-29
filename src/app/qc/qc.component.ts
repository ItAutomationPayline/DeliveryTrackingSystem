import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { increment } from '@angular/fire/firestore';
import 'firebase/compat/firestore';

@Component({
  selector: 'app-qc',
  standalone: false,
  templateUrl: './qc.component.html',
  styleUrls: ['./qc.component.css'],
  providers: [DatePipe]
})
export class QCComponent{
  QcReports: any[] = [];
  assignedRequests: any[] = [];
  private intervalId: any;
  currentReport: any = null;
  newFinding = {
    description: '',
    category: ''
  };
  employeeId: any = localStorage.getItem('id');
  profile: any = localStorage.getItem('profile');
  public user: any[] = [];
  rec: string[] = [];
  nm: any = localStorage.getItem('nm');
  public sessionTimeout: any;
  public inactivityDuration = 30 * 60 * 1000; // 30 minutes in milliseconds

  constructor(
    private router: Router,
    private firestoreService: FirestoreService,
    private firestore: AngularFirestore,
    private http: HttpClient,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('authToken');
    
    if ((!token) || (role !== 'QC')) {
      this.router.navigateByUrl('/login');
      return;
    }

    if (!sessionStorage.getItem('hasReloaded')) {
      sessionStorage.setItem('hasReloaded', 'true');
      window.location.reload();
    } else {
      sessionStorage.removeItem('hasReloaded');
    }
    this.fetchAssignedRequests();
    this.fetchQcReports();
  }

  // Fetch requests that are accepted and ready for QC
  fetchAssignedRequests() {
    this.firestore
    .collection('QcReports', ref => ref.where('AssignedTo', '==', 'Pending'))
      .valueChanges({ idField: 'id' })
      .subscribe((requests: any[]) => {
        this.assignedRequests = requests;
        console.log("Assigned requests: ", this.assignedRequests);
      });
  }

  // Fetch QC reports assigned to this QC person
  fetchQcReports() {
    this.firestore
      .collection('QcReports', ref => ref.where('qcPersonId', '==', this.employeeId).where('status', '==', 'in-progress'))
      .valueChanges({ idField: 'id' })
      .subscribe((reports: any[]) => {
        this.QcReports = reports;
        console.log("QC Reports: ", this.QcReports);
      });
  }

  // Start a new QC report for a request
  startQcReport(requestId: string) {
    if (confirm(`Are you sure you want to proceed with QC ? Once selected, It's non-transferable`)) {
    const report = {
      AssignedTo:this.employeeId,
      qcPersonId: this.employeeId,
      status: 'in-progress',
      findings: [],
      updatedAt: new Date(),
      qcName:this.nm
    };
    // Directly update the existing QC report with document ID = requestId
    this.firestore.collection('QcReports').doc(requestId).update(report)
      .then(() => {
        console.log("QC Report updated with ID: ", requestId);
        
        // Update request status to indicate QC has started
        this.firestore.collection('requests').doc(requestId).update({
          status: 'under-review'
        });
      })
      .catch(error => {
        console.error("Error updating QC report: ", error);
      });
    }
  }
  // Load a specific QC report for editing
  loadReport(reportId: string) {
    this.firestore.collection('QcReports').doc(reportId)
      .valueChanges()
      .subscribe((report: any) => {
        this.currentReport = report;
        this.currentReport.id = reportId;
        this.currentReport.taskId=report.taskId
      });
  }

  // Add a finding to the current report
  addFinding() {
    if (!this.currentReport) return;

    const finding = {
      ...this.newFinding,
      timestamp: new Date()
    };

    this.firestore.collection('QcReports').doc(this.currentReport.id)
      .update({
        findings: [...(this.currentReport.findings || []), finding],
        updatedAt: new Date()
      })
      .then(() => {
        this.newFinding = { description: '',  category: '' };
      })
      .catch(error => {
        console.error("Error adding finding: ", error);
      });
  }
  formatTextarea(event: any) {
    // Replace newlines with <br> tags and preserve whitespace
    this.newFinding.description = event.target.value
      .replace(/\n/g, '<br>')
      .replace(/\s{2,}/g, ' ');
  }
  sendQcFindingsMail(currentReport: any) {
    const formattedPeriod = this.datePipe.transform(currentReport.Period, 'MMMM-yyyy');
    // Process all findings with proper formatting
    let findingsDescriptions = currentReport.findings
      .map((finding: any, index: number) => {
        // Ensure description has proper HTML line breaks
        const formattedDescription = finding.description
          .replace(/\n/g, '<br>')
          .replace(/\s{2,}/g, ' ');
        return `
          <div style="margin-bottom: 15px;">
            <strong>Finding ${index + 1}:</strong><br>
            <strong>Category:</strong> ${finding.category}<br>
            <div style="white-space: pre-wrap; word-wrap: break-word; 
                        margin-top: 5px; padding: 8px; 
                        background-color: #f5f5f5; border-radius: 4px;">
              ${formattedDescription}
            </div>
          </div>`;
      })
      .join('');
       this.firestore
      .collection('users', ref => ref.where('role', '==', 'Manager'))
      .get()
      .subscribe((querySnapshot: any) => {
        const recipients: string[] = [];
        querySnapshot.forEach((doc: any) => {
          const userData = doc.data();
          if (userData.email) {
            recipients.push(userData.email);
            this.rec.push(userData.email);
          }
        })});
    this.firestoreService.getUserById(currentReport.ops).subscribe(userData => {
      if (userData.length > 0) {
        const user = userData[0];
        this.rec.push(user.email);
         this.rec.push(currentReport.leadermail);
        let bodydata = {
          "recipients": this.rec,
          "subject": `${currentReport.groupName}:QC Findings - ${currentReport.reportType}- ${formattedPeriod}`,
          "body": `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <div style="max-width: 800px; margin: 0 auto;">
                  <p>Hi ${user.name},</p>
                  <p>Hope you're doing well.</p>
                  <p>This is to inform you that the Quality Check (QC) for the ${currentReport.reportType} of client: 
                  ${currentReport.clientName} for the period of ${formattedPeriod} has been completed.</p>
                  <p>The following findings were observed during the QC process:</p>
                  ${findingsDescriptions}
                  <p>Best regards,<br>${this.nm}</p>
                </div>
              </body>
            </html>`,
        };
        this.firestoreService.sendMail(bodydata);
      }
    });
  }
  sendQcApprovedMail(currentReport:any)
  {
    const formattedPeriod = this.datePipe.transform(currentReport.Period, 'MMMM-yyyy') || currentReport.Period;
    this.firestoreService.getUserById(currentReport.ops).subscribe(userData => {
      if (userData.length > 0) {
        const user = userData[0];
        //console.log("Sending gentle reminder to:", user.email);
        const recipients: string[] = [];
        recipients.push(user.email);
        this.rec[0]=user.email
        let bodydata = {
        "recipients": this.rec,
        "subject": `${currentReport.groupName}: No QC Findings - ${currentReport.reportType} ${formattedPeriod}`,
        "body": `Hi ${user.name},<br><br>Hope you're doing well.<br>This is to inform you that the Quality Check (QC) for the ${currentReport.reportType} of client: ${currentReport.clientName} <br>for the period of ${formattedPeriod} has been completed.<br>✅ No findings were observed during the QC process.<br><br>Best regards,<br>${this.nm}`,
      };
    this.firestoreService.sendMail(bodydata);
      }
    });
    console.log("USER:",this.user[0]);
    
  }
  // Complete the QC report
  completeQcReport() {
    if (!this.currentReport) return;
if (confirm(`Are you sure QC for ${this.currentReport.reportType} is completed?`)) {
    this.firestore.collection('QcReports').doc(this.currentReport.id)
      .update({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .then(() => {
        // Update the request status
        this.firestore.collection('requests').doc(this.currentReport.requestId)
          .update({
            status: 'qc-completed'
          });
          if(this.currentReport.findings.length==0)
            {
              this.sendQcApprovedMail(this.currentReport);
              this.firestore.collection('tasks').doc(this.currentReport.taskId)
              .update({
                QcApproval: 'Approved'
              });
            }
            else{
              console.log("Found findings");
              this.sendQcFindingsMail(this.currentReport);
              this.firestore
              .collection('tasks').doc(this.currentReport.taskId)
              .update({
                status: 'Pending',
                Sequence:increment(1)
              })
              .then(() => {
              })
              .catch((error) => {
                console.error('Error updating task status: ', error);
              });
            }
            this.intervalId = setInterval(() => {
              this.currentReport = null;
            }, 1000);
      })
      .catch(error => {
        console.error("Error completing QC report: ", error);
      });
  }
}
}