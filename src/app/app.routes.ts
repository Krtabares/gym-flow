import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'dashboard', loadComponent: () => import('./components/dashboard').then(m => m.DashboardComponent) },
  { path: 'members', loadComponent: () => import('./components/members').then(m => m.MembersComponent) },
  { path: 'members/profile/:id', loadComponent: () => import('./components/member-profile').then(m => m.MemberProfileComponent) },
  { path: 'plans', loadComponent: () => import('./components/plans').then(m => m.PlansComponent) },
  { path: 'payments', loadComponent: () => import('./components/payments').then(m => m.PaymentsComponent) },
  { path: 'attendance', loadComponent: () => import('./components/attendance').then(m => m.AttendanceComponent) },
  { path: 'exercises', loadComponent: () => import('./components/exercises').then(m => m.ExercisesComponent) },
  { path: 'wods', loadComponent: () => import('./components/wods').then(m => m.WodsComponent) },
  { path: 'timer', loadComponent: () => import('./components/timer').then(m => m.TimerComponent) },
  { path: 'settings', loadComponent: () => import('./components/settings').then(m => m.SettingsComponent) },
  { path: 'users', loadComponent: () => import('./components/users').then(m => m.UsersComponent) },
  { path: 'scores', loadComponent: () => import('./components/scores').then(m => m.ScoresComponent) },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];




