import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SupabaseService } from './services/supabase.service';
import { LoginComponent } from './components/login';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LoginComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private db = inject(SupabaseService);

  protected readonly title = signal('gym-flow');
  protected readonly isMobileMenuOpen = signal(false);

  // Expose the current user from SupabaseService
  protected readonly currentUser = this.db.currentUser;

  protected toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  protected logout(): void {
    this.db.logout();
    this.closeMobileMenu();
  }

  protected getRolLabel(rol: string): string {
    switch (rol) {
      case 'admin': return 'Administrador';
      case 'coach': return 'Entrenador';
      case 'recepcion': return 'Recepción';
      default: return rol;
    }
  }
}
