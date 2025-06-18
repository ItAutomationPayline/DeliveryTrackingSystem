import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ExecutiveComponent } from './executive/executive.component';
import { TeamLeadComponent } from './team-lead/team-lead.component';
import { ManagerComponent } from './manager/manager.component';
import { QCComponent } from './qc/qc.component';
import { QcLeadComponent } from './qc-lead/qc-lead.component';
import { ProfileComponent } from './profile/profile.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'executive', component: ExecutiveComponent },
  { path: 'teamlead', component: TeamLeadComponent },
  { path: 'manager', component: ManagerComponent },
  { path: 'qc', component: QCComponent },
  { path: 'qclead', component: QcLeadComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
