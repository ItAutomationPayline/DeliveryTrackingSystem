import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { AngularFireAuth, AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireModule } from '@angular/fire/compat';
import { environment } from '../environments/environment';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { routes } from './app-routing.module';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ExecutiveComponent } from './executive/executive.component';
import { TeamLeadComponent } from './team-lead/team-lead.component';
import { NavbarComponent } from './navbar/navbar.component';
import { ManagerComponent } from './manager/manager.component';
import { QCComponent } from './qc/qc.component';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { ProfileComponent } from './profile/profile.component';
import { ComplianceComponent } from './compliance/compliance.component';
import { DeploymentComponent } from './deployment/deployment.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    ResetPasswordComponent,
    ExecutiveComponent,
    TeamLeadComponent,
    NavbarComponent,
    ManagerComponent,
    QCComponent,
    ProfileComponent,
    ComplianceComponent,
    DeploymentComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireModule.initializeApp(environment.firebase),
    FormsModule,
    HttpClientModule,
    RouterModule.forRoot(routes)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
