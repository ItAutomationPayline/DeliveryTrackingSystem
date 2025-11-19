import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FirestoreService } from '../services/firestore.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Observable } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import 'firebase/compat/firestore';

@Component({
  selector: 'app-qc',
  standalone: false,
  templateUrl: './compliance.component.html',
  styleUrls: ['./compliance.component.css'],
  providers: [DatePipe]
})
export class ComplianceComponent{
  reasonInput: string = '';
  selectedTask: any = null;
  showModal = false;
  showNewTaskModal = false;
  ComplianceReports: any[] = [];
  assignedRequests: any[] = [];
  // private intervalId: any;
  currentReport: any = null;
  selectedReport:any =null;
  newFinding = {
    description: '',
    category: '',
    resolution:'',
  };
  userCache: { [key: string]: string } = {};
  employeeId: any = localStorage.getItem('id');
  tasks: any[] = [];
  temptasks:any[]=[];
  Alltasks: any[] = [];
  Leader:any = {};
  profile: any[] = [];
  public user: any[] = [];
  rec: string[] = [];
  team:string[]=[];
  nm: any = localStorage.getItem('nm');
  profilemail:any=localStorage.getItem('profilemail');
  public sessionTimeout: any;
  public inactivityDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
  AllActiveComplianceReports: any[] = [];
  selectedComplianceMap: { [taskId: string]: string } = {};
  ComplianceTeam:any[]=[];
  membersWithNames: any[] = [];
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
    this.AllActiveComplianceReports=[];
    this.tasks=[];
    this.ComplianceTeam=[];
      
     if (role == 'Compliance Lead') {
      this.fetchAllComplianceReports();
      this.fetchComplianceTeam(this.employeeId);
      setTimeout(() => {
      this.fetchAllTasks();
      },1000);
    }
     setTimeout(() => {
        this.fetchSelfLeaderProfile();
      },1000);
    if((token)||(role === 'Compliance')||(role === 'Compliance Lead')) {
    }
    else
    {
      this.router.navigateByUrl('/login');
      return;
    }
    if(role==='Compliance')
      {
        this.fetchTasks();
      
      }
    console.log(this.profilemail);
    this.profile[0]="";
    this.rec=[];
    this.fetchprofile();
    
    this.fetchAssignedRequests();
    this.fetchComplianceReports();
  }
fetchSelfLeaderProfile() {
  this.firestore
    .collection('teams', ref => ref.where('employees', 'array-contains', this.employeeId))
    .valueChanges()
    .pipe(take(1))
    .subscribe(
      (data: any[]) => {
        if (data && data.length > 0) {
          const team = data[0]; // assuming one team per employee
          const managerId = team.managerId;
          if (managerId) {
            console.log('✅ Manager found with ID:', managerId);
             this.firestoreService.getUserById(managerId).subscribe(userData => {
              this.Leader=userData;
              console.log('✅ LEADER:', this.Leader);
             });
          } else {
            console.warn('⚠️ Team found but managerId is missing.');
          }
   
        } else {
          console.warn('❌ No team found for this employee.');
        }
      },
      (error) => {
        alert('Failed to fetch team data. Please try again later.');
        console.error('Error fetching team:', error);
      }
    );
}

    fetchAllTasks() {
    let now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 2);
    now.setHours(23, 59, 0, 0);
    tomorrow.setHours(23, 59, 0, 0);
    // Query Firestore for tasks where `createdBy` matches the Team Lead's ID
    this.firestore
      .collection('tasks', ref => ref.where('createdBy', 'in', this.team).where('status', '!=', 'Completed').where('deadline', '<=', tomorrow.toISOString()))
      .valueChanges({ idField: 'id' })
      .pipe(take(1))
      .subscribe((tasks: any[]) => {
        this.temptasks = tasks;
        console.log('Tasks assigned by you:', this.temptasks);
        this.populateAssignedToNames();
        setTimeout(() => {
          this.sortTasks(this.temptasks);
       }, 500);
      });
  }
   populateAssignedToNames() {
    this.temptasks.forEach((task) => {
      const assignedToId = task.assignedTo;
      // Check if the user's name is already cached
      if (this.userCache[assignedToId]) {
        this.Alltasks.push({
          ...task,
          assignedToName: this.userCache[assignedToId], // Add the name from the cache
        });
         this.tasks.push({
          ...task,
          assignedToName: this.userCache[assignedToId], // Add the name from the cache
        });
      }
      else {
        // Fetch the user's name from Firestore
        this.firestore
          .collection('users', (ref) => ref.where('id', '==', assignedToId))
          .valueChanges().pipe(take(1))
          .subscribe((users: any[]) => {
            if (users.length > 0) {
              const userName = users[0].name; // Assuming "name" is the field in the "users" collection
              this.userCache[assignedToId] = userName; // Cache the name for future use
              this.Alltasks.push({
                ...task,
                assignedToName: userName, // Add the name to the task
              });
            } else {
              console.log(`No user found with ID: ${assignedToId}`);
            }
          });
      }
    });
  }
   fetchTasks() {
    let now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 2);
    now.setHours(23, 59, 0, 0);
    tomorrow.setHours(23, 59, 0, 0);
    this.firestore
      .collection('tasks', ref => ref.where('status', '!=', 'Completed' ).where('assignedTo', '==', this.employeeId ).where('deadline', '<=', tomorrow.toISOString()))  // Filter tasks based on employeeId
      .valueChanges({ idField: 'id' }).pipe(take(1))  // Include document id in result
      .subscribe((tasks: any[]) => {
        this.tasks = tasks;
        console.log("Assigned tasks: ", this.tasks);
        setTimeout(() => {
          this.sortTasks(this.tasks);
        }, 500);
      });
  }
     sortTasks(tasksWithNames: { group: string; deadline: string }[]): { group: string; deadline: string }[] {
    return tasksWithNames.sort((a, b) => {
      const clientCompare = a.group.localeCompare(b.group);
      if (clientCompare !== 0) return clientCompare;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }
  fetchAllComplianceReports(){
    this.firestore.collection('compliancerequests', ref => ref.where('status', '!=', 'completed'))
       .valueChanges({ idField: 'id' })
       .subscribe((requests: any[]) => {
         this.AllActiveComplianceReports = requests;
         console.log("Assigned requests: ", this.assignedRequests);
       });
   }
  
     fetchprofile()
     {
       this.firestore
            .collection('users', (ref) => ref.where('id', '==', this.employeeId))
            .valueChanges()
            .pipe(take(1)) // ✅ Only take one result, avoids multiple pushes
            .subscribe((users: any[]) => {
              this.profile[0]=users[0];
            });
      }
  // Fetch requests that are accepted and ready for QC
  fetchAssignedRequests() {
    this.firestore
    .collection('compliancerequests', ref => ref.where('AssignedTo', '==', 'Pending'))
      .valueChanges({ idField: 'id' })
      .subscribe((requests: any[]) => {
        this.assignedRequests = requests;
        console.log("Assigned requests: ", this.assignedRequests);
      });
  }

  // Fetch QC reports assigned to this QC person
  fetchComplianceReports() {
    this.firestore
      .collection('compliancerequests', ref => ref.where('qcPersonId', '==', this.employeeId).where('status', '==', 'in-progress'))
      .valueChanges({ idField: 'id' })
      .subscribe((reports: any[]) => {
        this.ComplianceReports = reports;
        console.log("QC Reports: ", this.ComplianceReports);
      });
  }

  // Start a new QC report for a request
  startComplianceReport(requestId: any) {
    const complianceToUpdate = this.assignedRequests.find(task => task.id === requestId);
    if (confirm(`Are you sure you want to proceed with Compliance ? Once selected, It's non-transferable`)) {
    const report = {
      AssignedTo:this.employeeId,
      qcPersonId: this.employeeId,
      status: 'in-progress',
      findings: [],
      updatedAt: new Date(),
      startedAt:new Date().toISOString(),
      qcName:this.nm
    };
    let clientData:any;
     this.firestore.collection('clients', ref => 
      ref.where('groupName', '==', complianceToUpdate.groupName)
         .where('clientName', '==', complianceToUpdate.clientName))
    .get().subscribe((snapshot: any) => {
      if (snapshot.empty) {
        console.warn("⚠️ No matching client found for");
        return;
      }
      // Step 2: Get the client data
      const clientDoc = snapshot.docs[0];
      clientData = clientDoc.data();

      if(clientData.pt=='Active')
        {
          // alert("PT is active");
          this.createTask(complianceToUpdate,"PT Reports to QC");
        }
      if(clientData.pf=='Active')
      {
        // alert("PF is active");
        this.createTask(complianceToUpdate,"PF Reports to QC");
      }
      if(clientData.esic=='Active')
      {
        // alert("ESIC is active");
        this.createTask(complianceToUpdate,"ESIC Reports to QC");
      }
      if(clientData.lwf=='Active')
      {
        // alert("LWF is active");
        this.createTask(complianceToUpdate,"LWF Reports to QC");
      }
    });
    // Directly update the existing QC report with document ID = requestId
    this.firestore.collection('compliancerequests').doc(requestId).update(report)
      .then(() => {
        console.log("Compliance Report updated with ID: ", requestId);
      })
      .catch(error => {
        console.error("Error updating QC report: ", error);
      });
    }
  }
  createTask(compliance:any,description:string)
  {
    let desc;
    const regex = /\bto\b/i; // Matches the word 'to' as a whole word, case-insensitive
           const match = description.match(regex);
           if (match && match.index !== undefined) {
              desc=description.substring(0, match.index).trim();
            }
    let task = {
              reportType:desc,
              assignedTo: this.employeeId,
              period:compliance.Period,
              group:compliance.groupName,
              client: compliance.clientName,
              description: description,
              deadline: new Date().toISOString(), // Convert deadline to ISO format
              completedAt:'',
              status: 'Pending',
              createdBy: localStorage.getItem('id'),
              leadermail: compliance.leadermail,
              ops:compliance.ops,
              clientStatus:'Active',
              QcApproval:'Pending',
              Sequence:0,
              comment:"",
              complianceRequest:"yes"
            };
            this.firestore.collection('tasks').add(task)
            .then(() => {})
            .catch((error) => {
              alert('Failed to assign task. Please try again.');
              });
  }
  // Load a specific QC report for editing
  loadReport(reportId: string) {
    this.firestore.collection('compliancerequests').doc(reportId)
      .valueChanges()
      .subscribe((report: any) => {
        this.currentReport = report;
        this.currentReport.id = reportId;
        this.currentReport.taskId=report.taskId
      });
  }

  // Add a finding to the current report
  addQuery() {
    if (!this.currentReport) return;

    const finding = {
      ...this.newFinding,
      timestamp: new Date(),
      findingId: new Date().toString(),
    };

    this.firestore.collection('compliancerequests').doc(this.currentReport.id)
      .update({
        findings: [...(this.currentReport.findings || []), finding],
        resolution:'',
      })
      .then(() => {
        this.newFinding = { description: '',  category: '' , resolution:''};
      })
      .catch(error => {
        console.error("Error adding finding: ", error);
      });
      let originalDate = new Date();
          originalDate.setHours(20, 0, 0, 0);
          let task2 = {
            assignedTo: this.currentReport.ops,
            period:this.currentReport.Period,
            group:this.currentReport.groupName,
            client: this.currentReport.clientName,
            description: "Query:"+this.newFinding.description,
            deadline: originalDate.toISOString(), // Convert deadline to ISO format
            completedAt:'',
            status: 'Pending',
            createdBy:this.currentReport.createdBy,
            leadermail: this.currentReport.leadermail,
            clientStatus:'Active',
            comment:"",
            findingId:new Date().toString(),
            reportid:this.currentReport.id,
            complianceid:this.employeeId,
          };
          this.firestore.collection('tasks')
          .add(task2).then(() => {})
          .catch((error) => {
            alert('Failed to assign task. Please try again.');
          });
          this.firestore
          .collection('users', ref => ref.where('role', 'in', ['Compliance Lead']))
          .get()
          .subscribe((querySnapshot: any) => {
            querySnapshot.forEach((doc: any) => {
              const userData = doc.data();
              if (userData.email) {
                this.rec.push(userData.email);
              }
          })});
          this.firestoreService.getUserById(this.currentReport.ops).subscribe(userData => {
       if (userData.length > 0) {
         const user = userData[0];
         this.rec.push(user.email);
         this.rec.push(this.currentReport.leadermail);
        //  this.rec.push(this.profilemail);
         let recipients= [...new Set(this.rec)];
         console.log("Sorted recipents:",recipients);
         let bodydata = {
          "recipients": recipients,
          "subject": `${this.currentReport.groupName}: Query - ${this.newFinding.category}`,
          "body": `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <div style="max-width: 800px; margin: 0 auto;">
                  <p>Hi ${user.name},</p>
                  <p>Hope you're doing well.</p>

                  <p>I have a Query of the client
                  <b>${this.currentReport.clientName}</b> for the period of
                  <b>${this.currentReport.Period}</b>.</p>

                  <p><b>Query Details:</b></p>
                  <ul>
                    <li>${this.newFinding.description}</li>
                  </ul>

                  <p>Kindly review and resolve this query at the earliest.</p>

                  <p>Best regards,<br>${this.nm}</p>
                </div>
              </body>
            </html>`
        };
      this.firestoreService.sendMail(bodydata);
       }
     });
  }
  formatTextarea(event: any) {
    // Replace newlines with <br> tags and preserve whitespace
    this.newFinding.description = event.target.value
      .replace(/\n/g, '<br>')
      .replace(/\s{2,}/g, ' ');
  }
   completeComplianceReport() {
     if (!this.currentReport) return;
     if(this.newFinding.description!="")
      {
        alert("Please add or remove the query which you typed in the textbox.");
        return;
      }
 if (confirm(`Are you sure compliance for ${this.currentReport.reportType} is completed?`)) {
     this.firestore.collection('compliancerequests').doc(this.currentReport.id)
       .update({
         status: 'completed',
         completedAT:new Date().toISOString(),
         updatedAt: new Date()
       })
       .then(() => {
        setTimeout(() => {
                this.currentReport = null;
              }, 500);
       })
       .catch(error => {
         console.error("Error completing QC report: ", error);
       });
   }
 }
   updateTaskStatus(taskToUpdate:any) {
    // const taskToUpdate = this.tasks.find(task => task.id === taskId);
    
    if (taskToUpdate) {
      const isConfirmed = window.confirm(
        `Are you sure you want to mark "${taskToUpdate.description}" as Completed?`
      );
      
      if (isConfirmed) {
        if(taskToUpdate.QcApproval=="Pending")
        { 
          let desc;
           const regex = /\bto\b/i; // Matches the word 'to' as a whole word, case-insensitive
           const match = taskToUpdate.description.match(regex);
           if (match && match.index !== undefined) {
              desc=taskToUpdate.description.substring(0, match.index).trim();
            }
            let link = prompt("Paste the link of reports if any:");
            if (!link || link.trim() === '') {
              alert("Link is required. Submission cancelled. Kindly submit again");
              return; // Stop execution
            }
            let leadermail=this.Leader.email;
            let userNote = prompt("Enter a note/special instruction for qc if any:");
            let finalData = {
              taskId:taskToUpdate.id,
              reportType:desc,
              createdBy:taskToUpdate.createdBy,
              groupName:taskToUpdate.group,
              clientName: taskToUpdate.client,
              Period:taskToUpdate.period,
              ops:this.employeeId,
              compliancemail:this.profilemail,
              complianceLeadermail:leadermail,
              AssignedTo:"Pending",
              opsName:this.nm,
              status:"Pending",
              note:userNote,
              link:link,
              createdAt: new Date(),
              leadermail:taskToUpdate.leadermail,
            };
             this.firestore
              .collection('users', ref => ref.where('role', 'in', ['QCLead', 'QC']))
              .get()
              .subscribe((querySnapshot: any) => {
                let recipients: string[] = [];
                querySnapshot.forEach((doc: any) => {
                  const userData = doc.data();
                  if (userData.email) {
                    recipients.push(userData.email);
                  }
            
                });
            recipients.push(taskToUpdate.leadermail);
              if (recipients.length > 0) {
                const subject = `${taskToUpdate.group}: QC Request: ${taskToUpdate.reportType}`;
                const body = `
                  <p>Dear QC Team,</p>
                  Please check ${taskToUpdate.reportType} of client<br> ${taskToUpdate.client}<br>
                  of period:${taskToUpdate.period}.<br>
                  link:${link}<br>
                  note:${userNote}<br>
                  For any issues or queries or if link is not given, feel free to reach out.<br>
                  <p>Best regards,
                  <br>${localStorage.getItem('nm')}</p>
                `;
                recipients=[...new Set(recipients)];
                const bodydata = {
                  recipients: recipients,
                  subject: subject,
                  body: body
                };
                console.log("qcteam:"+recipients);
                this.firestoreService.sendMail(bodydata);
              }
              else {
                console.warn('No manager emails found to send notification.');
              }
              }, (error: any) => {
                console.error('Error fetching managers:', error);
              });
            try {
              this.firestore.collection('QcReports').add(finalData);
              alert('Request Sent To QC Successfully!');
              //this.clientForm.reset();
              
            } catch (error) {
              console.error('Error saving to Firebase:', error);
            }
        }
        this.firestore
          .collection('tasks')
          .doc(taskToUpdate.id)
          .update({
            status: 'Completed',
            completedAt:new Date().toISOString()
          })
          .then(() => {
            // console.log(`Task ${taskId} marked as complete`);
            this.tasks = this.tasks.filter(task => task.id !== taskToUpdate.id);
            // this.fetchTasks();
          })
          .catch((error) => {
            console.error('Error updating task status: ', error);
          });
      } else {
        console.log('Task completion canceled by user');
      }
    }
    else
      {
        console.log('Tasknotfound');
      }
  }
openReportModal(task: any) {
  this.selectedTask = task;
  this.reasonInput = '';
  this.showModal = true;
}
openCreateTaskModal() {
  this.showNewTaskModal = true;
  this.selectedReport=this.currentReport;
}
  openEditModal(task:any)
 {

 }
// fetchComplianceTeam() {
//     this.firestore
//       .collection('users', ref => ref.where('role', 'in', ['Compliance Lead', 'Compliance']))
//       .valueChanges({ idField: 'id' })
//       .subscribe((requests: any[]) => {
//         this.ComplianceTeam = requests;
//         console.log("ComplianceTeam: ", this.ComplianceTeam);
//       });
//   }
    fetchComplianceTeam(managerId: string) {
    this.firestore
      .collection('teams', (ref) => ref.where('managerId', '==', managerId))
      .valueChanges().pipe(take(1))
      .subscribe(
        (data) => {
          if (data && data.length > 0) {
            this.ComplianceTeam = data;
             console.log("Compliacne team:",this.ComplianceTeam);
            if (this.ComplianceTeam[0].employees && Array.isArray(this.ComplianceTeam[0].employees)) {
              // this.ComplianceTeam = [...this.ComplianceTeam[0].employees];
               this.team = [...this.ComplianceTeam[0].employees];
              this.getTeamMembers(); // Fetch names for team members
             
            }
          } else {
            console.log('No teams found for this manager.');
          }
        },
        (error) => {
          alert('Failed to fetch teams. Please try again later.');
          console.error('Error fetching teams:', error);
        }
      );
  }

  getTeamMembers() {
    if (this.ComplianceTeam && this.ComplianceTeam.length > 0) {
      console.log("team"+this.team);
      this.team.forEach((id) => {
        this.firestore
          .collection('users', (ref) => ref.where('id', '==', id))
          .valueChanges().pipe(take(1))
          .subscribe((users: any[]) => {
            if (users.length > 0) {
              const user = users[0];
              this.membersWithNames.push({ id: user.id, name: user.name });
            } else {
              console.log(`No user found for ID: ${id}`);
            }
          });
      });
      console.log("Compliacne team:",this.ComplianceTeam);
    } else {
      console.log('No team members found.');
    }
  }
 assignCompliance(id:any,selectedCompliance:any,compliance:any)
 {
  const selectedQcUser = this.membersWithNames.find(qc => qc.id === selectedCompliance);
  const report = {
    AssignedTo:selectedCompliance,
    qcPersonId:selectedCompliance,
    updatedAt:new Date(),
    startedAt:new Date().toISOString(),
    qcName:selectedQcUser.name
  };

  // Directly update the existing QC report with document ID = requestId
  this.firestore.collection('compliancerequests').doc(id).update(report)
    .then(() => {
      console.log("QC Report updated with ID: ", id);
    })
    .catch(error => {
      console.error("Error updating QC report: ", error);
    });
     this.firestore.collection('tasks').doc(id).update(report)
    .then(() => {
      console.log("QC Report updated with ID: ", id);
    })
    .catch(error => {
      console.error("Error updating QC report: ", error);
    });
    this.firestore
      .collection('tasks', ref => ref
        .where('client', '==', compliance.clientName)
        .where('group', '==', compliance.groupName)
        .where('assignedTo', '==', compliance.AssignedTo)
        .where('status', '!=', 'Completed')
      )
      .get()
      .subscribe(snapshot => {
        snapshot.forEach(doc => {
          doc.ref.update({
            assignedTo: selectedCompliance
          });
        });
        alert('Client transferred successfully.');
      }, error => {
        console.error('Error transferring tasks: ', error);
        alert('Error transferring tasks.');
      });
 }

    startSessionTimer() {
      // Clear any existing timer to avoid multiple timers
      if (this.sessionTimeout) {
        clearTimeout(this.sessionTimeout);
      }
      // Set a new inactivity timer
      this.sessionTimeout = setTimeout(() => {
        this.router.navigateByUrl('/login');
      }, this.inactivityDuration);
    }

    resetSessionTimer() {
      this.startSessionTimer();
    }
    closeModal() {
      this.showModal = false;
      this.showNewTaskModal=false;
    }

submitReport() {
  if (!this.reasonInput) {
    alert('Please enter a reason.');
    return;
  }

  const task = this.selectedTask;
  const reason = this.reasonInput;

  this.firestore
    .collection('tasks')
    .doc(task.id)
    .update({ comment: reason })
    .then(() => {
      const formattedDeadline = this.datePipe.transform(task.deadline, 'MMMM dd, y, h:mm:ss a');
      const bodydata = {
        recipients: [this.Leader.email],
        subject: [task.group] + `:Request for Deadline Extension for: ${task.description}`,
        body: `${this.nm} requested an extension for the deadline of Task: ${task.description}<br> originally due on <br>Deadline:${formattedDeadline} <br>Due to reason:${reason}<br>Please take necessary actions.<br><br>Regards,<br>DTS Team`,
      };
      this.firestoreService.sendMail(bodydata);
      this.fetchTasks();
      alert('Reported successfully!');
      this.closeModal();
    })
    .catch((error) => {
      console.error('Error updating task status: ', error);
    });
}
addTask()
{
    let desc;
           const regex = /\bto\b/i; // Matches the word 'to' as a whole word, case-insensitive
           const match = this.reasonInput.match(regex);
           if (match && match.index !== undefined) {
              desc=this.reasonInput.substring(0, match.index).trim();
            }
  let task = {
              reportType:desc,
              assignedTo: this.employeeId,
              period:this.currentReport.Period,
              group:this.currentReport.groupName,
              client: this.currentReport.clientName,
              description: this.reasonInput,
              deadline: new Date().toISOString(), // Convert deadline to ISO format
              completedAt:'',
              status: 'Pending',
              createdBy: localStorage.getItem('id'),
              leadermail: this.Leader.email,
              ops:this.currentReport.ops,
              clientStatus:'Active',
              QcApproval:'Pending',
              Sequence:0,
              comment:"",
              complianceRequest:"yes"
            };
            this.firestore.collection('tasks').add(task)
            .then(() => {
              alert("Task added successfully");
              this.closeModal();
            })
            .catch((error) => {
              alert('Failed to assign task. Please try again.');
              this.closeModal();
              });
}
    // Listen for user interaction events and reset the timer
    @HostListener('document:mousemove')
    @HostListener('document:click')
    @HostListener('document:keydown')
    handleUserActivity() {
      this.resetSessionTimer();
    }
}