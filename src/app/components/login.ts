import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <!-- Glow Decorativo -->
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>

      <div class="login-container animate-fade-in">
        <!-- Logo y Marca -->
        <div class="brand-section">
          <div class="brand-logo">⚡</div>
          <h1 class="brand-title">Gym<span class="text-neon">Flow</span></h1>
          <p class="brand-subtitle">Control de Acceso y Gestión Deportiva</p>
        </div>

        <!-- Tarjeta de Login -->
        <div class="glass-card login-card">
          <h2 class="card-title">Iniciar Sesión</h2>
          <p class="card-subtitle">Ingresa tus credenciales registradas para continuar.</p>

          <!-- Error Alert -->
          <div class="error-alert animate-fade-in" *ngIf="errorMessage">
            <span class="error-icon">⚠️</span>
            <span class="error-text">{{ errorMessage }}</span>
          </div>

          <form (submit)="onSubmit()">
            <!-- Campo Email -->
            <div class="form-group">
              <label class="form-label" for="email">Correo Electrónico</label>
              <div class="input-wrapper">
                <span class="input-icon">✉️</span>
                <input 
                  type="email" 
                  id="email"
                  class="form-control" 
                  name="email" 
                  [(ngModel)]="email" 
                  required 
                  placeholder="ejemplo@gymflow.com"
                  [disabled]="loading"
                  autocomplete="username"
                />
              </div>
            </div>

            <!-- Campo Contraseña -->
            <div class="form-group">
              <label class="form-label" for="password">Contraseña</label>
              <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input 
                  type="password" 
                  id="password"
                  class="form-control" 
                  name="password" 
                  [(ngModel)]="password" 
                  required 
                  placeholder="••••••••"
                  [disabled]="loading"
                  autocomplete="current-password"
                />
              </div>
            </div>

            <!-- Botón de Ingreso -->
            <button type="submit" class="btn btn-primary btn-block mt-8" [disabled]="loading">
              <span *ngIf="!loading">Ingresar al Sistema</span>
              <span *ngIf="loading" class="flex-center gap-8">
                <span class="spinner"></span>
                Autenticando...
              </span>
            </button>
          </form>

          <!-- Separador para Accesos Demo -->
          <div class="demo-divider">
            <span>Acceso Rápido de Prueba</span>
          </div>

          <!-- Botones de Relleno Automático para Pruebas -->
          <div class="demo-users-grid">
            <button 
              type="button" 
              class="demo-user-btn badge-admin-demo" 
              (click)="fillDemoUser('admin@gymflow.com')"
              [disabled]="loading"
            >
              <span>🔑 Administrador</span>
            </button>
            <button 
              type="button" 
              class="demo-user-btn badge-coach-demo" 
              (click)="fillDemoUser('coach@gymflow.com')"
              [disabled]="loading"
            >
              <span>🏋️ Entrenador</span>
            </button>
            <button 
              type="button" 
              class="demo-user-btn badge-recepcion-demo" 
              (click)="fillDemoUser('recepcion@gymflow.com')"
              [disabled]="loading"
            >
              <span>👥 Recepción</span>
            </button>
          </div>
        </div>

        <div class="login-footer">
          <p>&copy; 2026 GymFlow. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      width: 100vw;
      display: flex;
      justify-content: center;
      align-items: center;
      position: fixed;
      top: 0;
      left: 0;
      background-color: #050508;
      overflow-y: auto;
      z-index: 2000;
      box-sizing: border-box;
      padding: 24px;
    }

    /* Orbs decorativos de fondo */
    .glow-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(140px);
      z-index: 1;
      opacity: 0.12;
      pointer-events: none;
    }
    .orb-1 {
      width: 400px;
      height: 400px;
      background: var(--secondary);
      top: 10%;
      left: 15%;
    }
    .orb-2 {
      width: 450px;
      height: 450px;
      background: var(--primary);
      bottom: 10%;
      right: 15%;
    }

    .login-container {
      width: 100%;
      max-width: 460px;
      display: flex;
      flex-direction: column;
      gap: 28px;
      z-index: 2;
      position: relative;
    }

    /* Brand Header */
    .brand-section {
      text-align: center;
    }
    .brand-logo {
      font-size: 3rem;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 0 15px rgba(0, 255, 136, 0.4));
      display: inline-block;
      margin-bottom: 8px;
      animation: pulse 3s infinite ease-in-out;
    }
    .brand-title {
      font-size: 2.2rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.03em;
      margin-bottom: 4px;
    }
    .brand-subtitle {
      font-size: 0.95rem;
      color: #71717a;
    }

    /* Card styling details */
    .login-card {
      background: rgba(18, 18, 24, 0.65) !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6) !important;
      backdrop-filter: blur(25px) !important;
      -webkit-backdrop-filter: blur(25px) !important;
      padding: 40px 32px !important;
      border-radius: 20px !important;
    }
    .card-title {
      font-size: 1.5rem;
      color: #fff;
      margin-bottom: 6px;
      font-weight: 700;
    }
    .card-subtitle {
      font-size: 0.88rem;
      color: #a1a1aa;
      margin-bottom: 24px;
    }

    /* Error alert styling */
    .error-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.2);
      padding: 12px 16px;
      border-radius: var(--radius-md);
      margin-bottom: 20px;
    }
    .error-icon {
      font-size: 1.1rem;
    }
    .error-text {
      color: #fda4af;
      font-size: 0.85rem;
      font-weight: 500;
    }

    /* Inputs fields decoration */
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 14px;
      color: #71717a;
      font-size: 1rem;
    }
    .input-wrapper .form-control {
      padding-left: 42px !important;
    }

    .btn-block {
      width: 100%;
      padding: 12px !important;
      font-size: 0.95rem !important;
    }

    /* Demo Quick access decoration */
    .demo-divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 28px 0 16px 0;
      color: #52525b;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 600;
    }
    .demo-divider::before,
    .demo-divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .demo-divider:not(:empty)::before {
      margin-right: 12px;
    }
    .demo-divider:not(:empty)::after {
      margin-left: 12px;
    }

    .demo-users-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .demo-user-btn {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      color: #d4d4d8;
      border-radius: var(--radius-md);
      padding: 10px 16px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      font-family: var(--font-sans);
    }
    .demo-user-btn:hover {
      background: rgba(255, 255, 255, 0.06);
      transform: translateY(-1px);
    }
    .demo-user-btn:active {
      transform: translateY(0);
    }

    .badge-admin-demo:hover {
      border-color: rgba(139, 92, 246, 0.4);
      color: #a78bfa;
    }
    .badge-coach-demo:hover {
      border-color: rgba(6, 182, 212, 0.4);
      color: #22d3ee;
    }
    .badge-recepcion-demo:hover {
      border-color: rgba(245, 158, 11, 0.4);
      color: #fbbf24;
    }

    /* Spinner animation */
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 9, 5, 0.3);
      border-top-color: #09090b;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    .flex-center {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .gap-8 {
      gap: 8px;
    }

    .login-footer {
      text-align: center;
      font-size: 0.78rem;
      color: #52525b;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(0, 255, 136, 0.4)); }
      50% { transform: scale(1.05); filter: drop-shadow(0 0 25px rgba(0, 255, 136, 0.6)); }
    }

    /* Small heights and mobile adaptability */
    @media (max-width: 480px) {
      .login-card {
        padding: 30px 20px !important;
      }
      .brand-title {
        font-size: 1.8rem;
      }
    }
  `]
})
export class LoginComponent {
  private db = inject(SupabaseService);

  email = '';
  password = '';
  loading = false;
  errorMessage: string | null = null;

  onSubmit(): void {
    if (!this.email.trim()) {
      this.errorMessage = 'Por favor, introduce tu correo electrónico.';
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    // Simular un retardo leve de conexión de red para mejorar la experiencia de usuario
    setTimeout(() => {
      this.db.login(this.email.trim(), this.password).subscribe({
        next: () => {
          this.loading = false;
        },
        error: (err: Error) => {
          this.loading = false;
          this.errorMessage = err.message || 'Ocurrió un error inesperado al iniciar sesión.';
        }
      });
    }, 800);
  }

  fillDemoUser(email: string): void {
    this.email = email;
    this.password = '123456';
    this.errorMessage = null;
    this.onSubmit();
  }
}
