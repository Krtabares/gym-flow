import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Miembro, Asistencia } from '../models';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="attendance-container animate-fade-in">
      <div class="header-section">
        <h1 class="title-grad">Check-In / Control de Acceso</h1>
        <p class="subtitle">Registra el ingreso de miembros y verifica su estado en tiempo real.</p>
      </div>

      <div class="grid-cols-2 attendance-grid">
        <!-- Panel de Registro Rápido -->
        <div class="glass-card register-panel">
          <h3>Escanear / Buscar Atleta</h3>
          <p class="card-desc">Ingresa el nombre o ID para realizar el check-in rápido.</p>

          <div class="search-section">
            <input 
              type="text" 
              class="form-control checkin-search" 
              placeholder="Buscar atleta para check-in..." 
              [(ngModel)]="searchQuery"
              (ngModelChange)="searchMembers()">
            
            <div class="search-results" *ngIf="searchQuery.trim().length > 0">
              <div 
                class="result-item" 
                *ngFor="let m of searchResults" 
                (click)="selectMember(m)">
                <div class="flex-between">
                  <div class="member-details">
                    <span class="member-name">{{ m.nombre }}</span>
                    <span class="member-plan">{{ m.plan?.nombre || 'Sin Plan Asignado' }}</span>
                  </div>
                  <span class="badge" [class.badge-active]="m.estado === 'activo'"
                                       [class.badge-expired]="m.estado === 'vencido'"
                                       [class.badge-inactive]="m.estado === 'inactivo'">
                    {{ m.estado }}
                  </span>
                </div>
              </div>
              <div class="no-results" *ngIf="searchResults.length === 0">
                No se encontraron miembros coincidentes.
              </div>
            </div>
          </div>

          <!-- Zona de Feedback de Check-In -->
          <div class="feedback-area" *ngIf="selectedMember">
            <div class="feedback-card" [class.access-granted]="selectedMember.estado === 'activo'" [class.access-denied]="selectedMember.estado !== 'activo'">
              <div class="feedback-icon" *ngIf="selectedMember.estado === 'activo'">✓</div>
              <div class="feedback-icon" *ngIf="selectedMember.estado !== 'activo'">✕</div>
              
              <div class="feedback-info">
                <h4>{{ selectedMember.nombre }}</h4>
                <p class="status-msg" *ngIf="selectedMember.estado === 'activo'">
                  ACCESO AUTORIZADO - Bienvenido/a a entrenar.
                </p>
                <p class="status-msg" *ngIf="selectedMember.estado === 'vencido'">
                  ACCESO DENEGADO - Suscripción vencida el {{ formatDate(selectedMember.fecha_fin) }}.
                </p>
                <p class="status-msg" *ngIf="selectedMember.estado === 'inactivo'">
                  ACCESO DENEGADO - Cuenta de usuario inactiva.
                </p>
                
                <div class="member-meta-info" *ngIf="selectedMember.plan">
                  <span>Plan: {{ selectedMember.plan.nombre }}</span>
                  <span>Vence: {{ formatDate(selectedMember.fecha_fin) }}</span>
                </div>
              </div>
            </div>

            <div class="checkin-actions">
              <button 
                class="btn btn-primary w-full" 
                [disabled]="selectedMember.estado !== 'activo'"
                (click)="confirmCheckIn()">
                Confirmar Ingreso
              </button>
              <button class="btn btn-secondary w-full mt-8" (click)="clearSelection()">
                Limpiar Selección
              </button>
            </div>
          </div>

          <!-- Mensaje de Éxito -->
          <div class="success-alert animate-fade-in" *ngIf="successMessage">
            <span class="alert-icon">🎉</span>
            <div class="alert-content">
              <h5>Check-In Registrado</h5>
              <p>{{ successMessage }}</p>
            </div>
          </div>
        </div>

        <!-- Panel de Historial de Hoy -->
        <div class="glass-card history-panel">
          <h3>Registro de Entradas de Hoy</h3>
          <p class="card-desc">Historial completo de asistencias del día.</p>

          <div class="logs-list" *ngIf="todayAttendance.length > 0; else noLogs">
            <div class="log-item animate-fade-in" *ngFor="let entry of todayAttendance">
              <div class="log-left">
                <div class="avatar-sm">{{ entry.miembro?.nombre?.charAt(0) }}</div>
                <div class="log-info">
                  <span class="name">{{ entry.miembro?.nombre }}</span>
                  <span class="plan">{{ entry.miembro?.plan?.nombre }}</span>
                </div>
              </div>
              <div class="log-right">
                <span class="time">{{ formatTime(entry.fecha_hora) }}</span>
              </div>
            </div>
          </div>
          <ng-template #noLogs>
            <div class="empty-state">
              <span class="empty-icon">⏳</span>
              <p>Esperando el ingreso de atletas...</p>
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .attendance-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .title-grad {
      font-size: 2rem;
      background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 4px;
    }
    .subtitle {
      color: #71717a;
      font-size: 0.9rem;
    }

    .attendance-grid {
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }
    
    @media (max-width: 768px) {
      .attendance-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }
    
    .register-panel h3, .history-panel h3 {
      font-size: 1.15rem;
      color: #fff;
    }
    .card-desc {
      font-size: 0.8rem;
      color: #71717a;
      margin-bottom: 20px;
    }

    /* Search Area */
    .search-section {
      position: relative;
      margin-bottom: 20px;
    }
    .checkin-search {
      background: rgba(0, 0, 0, 0.4);
      padding: 14px 18px;
      font-size: 0.95rem;
    }
    .search-results {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 100%;
      background: #18181f;
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-md);
      z-index: 100;
      max-height: 200px;
      overflow-y: auto;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    .result-item {
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      transition: background 0.2s;
    }
    .result-item:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    .member-details {
      display: flex;
      flex-direction: column;
    }
    .member-name {
      font-weight: 600;
      color: #fff;
      font-size: 0.88rem;
    }
    .member-plan {
      font-size: 0.72rem;
      color: #a1a1aa;
    }
    .no-results {
      padding: 16px;
      font-size: 0.82rem;
      color: #71717a;
      text-align: center;
    }

    /* Feedback Cards */
    .feedback-area {
      margin-top: 24px;
    }
    .feedback-card {
      display: flex;
      gap: 16px;
      padding: 20px;
      border-radius: var(--radius-md);
      margin-bottom: 20px;
      border: 1px solid transparent;
    }
    .feedback-card.access-granted {
      background: rgba(0, 255, 136, 0.05);
      border-color: rgba(0, 255, 136, 0.2);
    }
    .feedback-card.access-denied {
      background: rgba(244, 63, 94, 0.05);
      border-color: rgba(244, 63, 94, 0.2);
    }

    .feedback-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      font-weight: bold;
    }
    .access-granted .feedback-icon {
      background: var(--primary-glow);
      color: var(--primary);
    }
    .access-denied .feedback-icon {
      background: var(--danger-glow);
      color: var(--danger);
    }

    .feedback-info {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }
    .feedback-info h4 {
      font-size: 1.1rem;
      color: #fff;
      margin-bottom: 4px;
    }
    .status-msg {
      font-size: 0.82rem;
      font-weight: 600;
    }
    .access-granted .status-msg { color: var(--primary); }
    .access-denied .status-msg { color: var(--danger); }
    
    .member-meta-info {
      display: flex;
      gap: 14px;
      font-size: 0.75rem;
      color: #a1a1aa;
      margin-top: 8px;
    }

    .success-alert {
      display: flex;
      gap: 12px;
      background: rgba(6, 182, 212, 0.08);
      border: 1px solid rgba(6, 182, 212, 0.2);
      padding: 16px;
      border-radius: var(--radius-md);
      margin-top: 24px;
      color: #e4e4e7;
    }
    .alert-icon { font-size: 1.5rem; }
    .alert-content h5 { color: #fff; font-size: 0.9rem; }
    .alert-content p { font-size: 0.82rem; color: #a1a1aa; margin-top: 2px; }

    .w-full { width: 100%; }
    .mt-8 { margin-top: 8px; }

    /* Logs History List */
    .logs-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .log-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.03);
    }
    .log-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar-sm {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--accent) 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.8rem;
    }
    .log-info {
      display: flex;
      flex-direction: column;
    }
    .log-info .name {
      font-weight: 600;
      color: #fff;
      font-size: 0.85rem;
    }
    .log-info .plan {
      font-size: 0.72rem;
      color: #71717a;
    }
    .log-right .time {
      font-weight: 600;
      font-size: 0.8rem;
      color: var(--primary);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 250px;
      color: #71717a;
      gap: 10px;
    }
    .empty-icon { font-size: 3rem; }
  `]
})
export class AttendanceComponent implements OnInit {
  private db = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  allMembers: Miembro[] = [];
  searchResults: Miembro[] = [];
  searchQuery = '';
  selectedMember: Miembro | null = null;
  successMessage = '';
  
  todayAttendance: Asistencia[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.db.getMiembros().subscribe(members => {
      this.allMembers = members;
      this.cdr.markForCheck();
    });

    this.db.getAsistencia().subscribe(attendance => {
      // Filter logs from today only
      const todayStr = new Date().toISOString().split('T')[0];
      this.todayAttendance = attendance.filter(a => a.fecha_hora.startsWith(todayStr));
      this.cdr.markForCheck();
    });
  }

  searchMembers() {
    const query = this.searchQuery.toLowerCase().trim();
    if (query.length === 0) {
      this.searchResults = [];
      return;
    }

    this.searchResults = this.allMembers.filter(m => {
      return m.nombre.toLowerCase().includes(query) || 
             (m.email && m.email.toLowerCase().includes(query)) ||
             (m.telefono && m.telefono.includes(query));
    });
  }

  selectMember(member: Miembro) {
    this.selectedMember = member;
    this.searchQuery = '';
    this.searchResults = [];
    this.successMessage = '';
  }

  clearSelection() {
    this.selectedMember = null;
    this.successMessage = '';
  }

  confirmCheckIn() {
    if (!this.selectedMember || this.selectedMember.estado !== 'activo') return;

    this.db.createAsistencia(this.selectedMember.id).subscribe(() => {
      this.successMessage = `¡Ingreso exitoso para ${this.selectedMember!.nombre}!`;
      this.selectedMember = null;
      this.loadData(); // Reload logs

      // Clear success alert after 4 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 4000);
    });
  }

  formatTime(dateTimeStr: string): string {
    const d = new Date(dateTimeStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
