import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ExecutiveComponent } from './executive/executive.component';
import { TeamLeadComponent } from './team-lead/team-lead.component';
import { ManagerComponent } from './manager/manager.component';
import { QCComponent } from './qc/qc.component';
import { ProfileComponent } from './profile/profile.component';
import { ComplianceComponent } from './compliance/compliance.component';
import { DeploymentComponent } from './deployment/deployment.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'executive', component: ExecutiveComponent },
  { path: 'compliance', component: ComplianceComponent },
  { path: 'teamlead', component: TeamLeadComponent },
  { path: 'manager', component: ManagerComponent },
  { path: 'qc', component: QCComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'deploy', component: DeploymentComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
