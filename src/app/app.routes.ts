import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard';
import { MembersComponent } from './components/members';
import { PlansComponent } from './components/plans';
import { PaymentsComponent } from './components/payments';
import { AttendanceComponent } from './components/attendance';
import { ExercisesComponent } from './components/exercises';
import { WodsComponent } from './components/wods';
import { SettingsComponent } from './components/settings';
import { TimerComponent } from './components/timer';
import { UsersComponent } from './components/users';
import { ScoresComponent } from './components/scores';

export const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'members', component: MembersComponent },
  { path: 'plans', component: PlansComponent },
  { path: 'payments', component: PaymentsComponent },
  { path: 'attendance', component: AttendanceComponent },
  { path: 'exercises', component: ExercisesComponent },
  { path: 'wods', component: WodsComponent },
  { path: 'timer', component: TimerComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'users', component: UsersComponent },
  { path: 'scores', component: ScoresComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];



