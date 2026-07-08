import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { Miembro, Pago, Asistencia, MarcaMiembro } from '../models';

@Component({
  selector: 'app-member-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-container animate-fade-in" *ngIf="!loading && member; else stateTemp">
      <!-- Barra superior de navegación y estado -->
      <div class="flex-between header-section">
        <button class="btn btn-secondary btn-back" (click)="goBack()">
          <span>← Volver a Miembros</span>
        </button>
        <div>
          <span class="badge" [class.badge-active]="member.estado === 'activo'"
                               [class.badge-expired]="member.estado === 'vencido'"
                               [class.badge-inactive]="member.estado === 'inactivo'">
            {{ member.estado }}
          </span>
        </div>
      </div>

      <!-- Ficha de Encabezado Principal (Resumen) -->
      <div class="glass-card profile-header-card">
        <div class="header-main-info">
          <div class="profile-avatar">{{ member.nombre.charAt(0).toUpperCase() }}</div>
          <div class="profile-meta">
            <h1 class="profile-name">{{ member.nombre }}</h1>
            <p class="profile-subtitle">Atleta registrado • ID: {{ member.id.substring(0, 8) }}</p>
          </div>
        </div>
        
        <!-- Bloques de estado rápido -->
        <div class="quick-status-grid">
          <div class="status-box">
            <span class="box-label">Membresía</span>
            <span class="box-value text-primary" *ngIf="member.plan; else noPlanText">{{ member.plan.nombre }}</span>
            <ng-template #noPlanText><span class="box-value text-muted">Sin Plan</span></ng-template>
          </div>
          <div class="status-box">
            <span class="box-label">Vencimiento</span>
            <span class="box-value" [class.text-danger]="member.estado === 'vencido'">{{ formatDate(member.fecha_fin) }}</span>
          </div>
          <div class="status-box">
            <span class="box-label">Asistencias</span>
            <span class="box-value text-accent">{{ attendance.length }} check-ins</span>
          </div>
          <div class="status-box">
            <span class="box-label">Récords / PRs</span>
            <span class="box-value text-secondary">{{ scores.length }} marcas</span>
          </div>
        </div>
      </div>

      <!-- Cuadrícula de Contenidos -->
      <div class="profile-grid">
        <!-- Columna Izquierda: Información Básica, Plan y Anamnesis -->
        <div class="profile-column">
          
          <!-- Datos Personales -->
          <div class="glass-card section-card">
            <h3 class="section-title"><span class="section-icon">👤</span> Datos Personales</h3>
            <div class="detail-list">
              <div class="detail-item">
                <span class="detail-label">Nombre Completo</span>
                <span class="detail-value">{{ member.nombre }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Correo Electrónico</span>
                <span class="detail-value">{{ member.email || 'Sin correo registrado' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Teléfono de Contacto</span>
                <span class="detail-value">{{ member.telefono || 'Sin teléfono registrado' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Fecha de Nacimiento</span>
                <span class="detail-value">🎂 {{ formatDate(member.fecha_nacimiento) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Fecha de Ingreso</span>
                <span class="detail-value">📅 {{ formatDate(member.fecha_ingreso || member.created_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Suscripción y Facturación -->
          <div class="glass-card section-card mt-24">
            <h3 class="section-title"><span class="section-icon">💳</span> Plan y Suscripción</h3>
            <div class="detail-list" *ngIf="member.plan; else noPlanDetails">
              <div class="detail-item">
                <span class="detail-label">Plan Asignado</span>
                <span class="detail-value text-primary font-bold">{{ member.plan.nombre }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Precio</span>
                <span class="detail-value font-bold">\${{ member.plan.precio }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Duración del Plan</span>
                <span class="detail-value">{{ member.plan.duracion_dias }} días de acceso</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Fecha de Inicio</span>
                <span class="detail-value">{{ formatDate(member.fecha_inicio) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Vencimiento</span>
                <span class="detail-value" [class.text-danger]="member.estado === 'vencido'">
                  {{ formatDate(member.fecha_fin) }}
                </span>
              </div>
              <div class="detail-item" *ngIf="member.fecha_cobro">
                <span class="detail-label">Próximo Cobro</span>
                <span class="detail-value text-accent font-bold">{{ formatDate(member.fecha_cobro) }}</span>
              </div>
              <div class="detail-item" *ngIf="member.plan.beneficios && member.plan.beneficios.length > 0">
                <span class="detail-label">Beneficios Incluidos</span>
                <div class="plan-benefits-tags">
                  <span class="benefit-tag" *ngFor="let b of member.plan.beneficios">✓ {{ b }}</span>
                </div>
              </div>
            </div>
            <ng-template #noPlanDetails>
              <div class="empty-section-message">
                <span class="message-icon">⚠️</span>
                <p>Este miembro no cuenta con un plan de suscripción activo por el momento.</p>
              </div>
            </ng-template>
          </div>

          <!-- Ficha Médica / Anamnesis -->
          <div class="glass-card section-card mt-24">
            <h3 class="section-title"><span class="section-icon">📋</span> Ficha Médica / Anamnesis</h3>
            <div *ngIf="member.anamnesis; else noAnamnesis">
              <p class="anamnesis-date">Completada el {{ formatDate(member.anamnesis.fecha_completado) }}</p>
              <div class="anamnesis-answers-list">
                <div class="anamnesis-answer-item" *ngFor="let ans of member.anamnesis.respuestas">
                  <span class="anamnesis-question">{{ ans.pregunta_texto }}</span>
                  <div class="anamnesis-response-box" [class.response-si]="ans.respuesta === 'si'" [class.response-no]="ans.respuesta === 'no'">
                    <span class="response-text">{{ ans.respuesta === 'si' ? 'Sí' : (ans.respuesta === 'no' ? 'No' : ans.respuesta || '-') }}</span>
                  </div>
                </div>
              </div>
            </div>
            <ng-template #noAnamnesis>
              <div class="empty-section-message">
                <span class="message-icon">📋</span>
                <p>No se ha registrado una ficha médica o anamnesis para este atleta.</p>
              </div>
            </ng-template>
          </div>

        </div>

        <!-- Columna Derecha: PRs/Marcas, Asistencia y Pagos -->
        <div class="profile-column">
          
          <!-- Marcas Personales / PRs -->
          <div class="glass-card section-card">
            <h3 class="section-title"><span class="section-icon">🏆</span> Récords Personales (PRs)</h3>
            <div class="table-container" *ngIf="scores.length > 0; else noScores">
              <table class="custom-table compact-table">
                <thead>
                  <tr>
                    <th>Ejercicio</th>
                    <th>Marca</th>
                    <th>Fecha</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let score of scores">
                    <td>
                      <span class="exercise-name">{{ score.ejercicio?.nombre || 'Ejercicio' }}</span>
                      <span class="exercise-cat">{{ score.ejercicio?.categoria }}</span>
                    </td>
                    <td class="score-value">{{ score.valor }} {{ score.unidad }}</td>
                    <td class="score-date">{{ formatDate(score.fecha) }}</td>
                    <td class="score-notes" [title]="score.notas || ''">{{ score.notas || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #noScores>
              <div class="empty-section-message">
                <span class="message-icon">🏋️</span>
                <p>Aún no hay marcas o PRs registrados para este atleta.</p>
              </div>
            </ng-template>
          </div>

          <!-- Historial de Asistencia -->
          <div class="glass-card section-card mt-24">
            <h3 class="section-title"><span class="section-icon">🏃</span> Historial de Asistencia</h3>
            <div class="timeline-container" *ngIf="attendance.length > 0; else noAttendance">
              <div class="timeline-list">
                <div class="timeline-item" *ngFor="let att of attendance">
                  <div class="timeline-badge"></div>
                  <div class="timeline-content">
                    <span class="timeline-time">{{ formatDateTime(att.fecha_hora) }}</span>
                    <span class="timeline-desc">Check-In en el box realizado correctamente.</span>
                  </div>
                </div>
              </div>
            </div>
            <ng-template #noAttendance>
              <div class="empty-section-message">
                <span class="message-icon">🏃</span>
                <p>No se registran asistencias ni check-ins para este miembro.</p>
              </div>
            </ng-template>
          </div>

          <!-- Historial de Pagos -->
          <div class="glass-card section-card mt-24">
            <h3 class="section-title"><span class="section-icon">💵</span> Historial de Pagos</h3>
            <div class="table-container" *ngIf="payments.length > 0; else noPayments">
              <table class="custom-table compact-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let p of payments">
                    <td>{{ formatDate(p.fecha_pago) }}</td>
                    <td class="payment-amount">\${{ p.monto }}</td>
                    <td>{{ p.metodo_pago }}</td>
                    <td>
                      <span class="badge badge-active" style="font-size: 9px; padding: 2px 6px;">{{ p.estado }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #noPayments>
              <div class="empty-section-message">
                <span class="message-icon">💵</span>
                <p>No se registran pagos previos para este miembro.</p>
              </div>
            </ng-template>
          </div>

        </div>
      </div>
    </div>

    <!-- Templates de estado de carga o error -->
    <ng-template #stateTemp>
      <div class="profile-state-container glass-card" *ngIf="loading">
        <div class="loading-spinner"></div>
        <p>Cargando información completa del atleta...</p>
      </div>

      <div class="profile-state-container glass-card" *ngIf="!loading && error">
        <span class="error-icon">⚠️</span>
        <p class="error-msg">{{ error }}</p>
        <button class="btn btn-secondary mt-16" (click)="goBack()">Volver a la Lista</button>
      </div>
    </ng-template>
  `,
  styles: [`
    .profile-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    
    .btn-back {
      padding: 8px 16px;
      font-size: 13px;
    }
    
    /* Header Card */
    .profile-header-card {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      background: linear-gradient(135deg, rgba(18, 18, 24, 0.8) 0%, rgba(26, 26, 36, 0.6) 100%);
      border-color: rgba(139, 92, 246, 0.2);
    }
    
    .header-main-info {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .profile-avatar {
      width: 70px;
      height: 70px;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--accent) 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      font-family: var(--font-display);
      border: 3px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
    }
    
    .profile-meta {
      display: flex;
      flex-direction: column;
    }
    
    .profile-name {
      font-size: 1.8rem;
      background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 2px;
    }
    
    .profile-subtitle {
      font-size: 0.85rem;
      color: #71717a;
      font-weight: 500;
    }
    
    .quick-status-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    
    .status-box {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-md);
      padding: 12px 18px;
      display: flex;
      flex-direction: column;
      min-width: 120px;
    }
    
    .box-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: #71717a;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    
    .box-value {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
    }
    
    .text-primary { color: var(--primary); }
    .text-secondary { color: var(--secondary); }
    .text-accent { color: var(--accent); }
    .text-danger { color: var(--danger); }
    .text-muted { color: #71717a; }
    .font-bold { font-weight: 700; }
    
    /* Layout Grid */
    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    
    .profile-column {
      display: flex;
      flex-direction: column;
    }
    
    .section-card {
      height: fit-content;
    }
    
    .section-title {
      font-size: 1.15rem;
      color: #fff;
      margin-bottom: 18px;
      border-bottom: 1px solid var(--border-glow);
      padding-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-icon {
      font-size: 1.1rem;
    }
    
    /* Detail list */
    .detail-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    
    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    }
    
    .detail-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .detail-label {
      font-size: 0.82rem;
      color: #71717a;
      font-weight: 500;
    }
    
    .detail-value {
      font-size: 0.88rem;
      color: #e4e4e7;
      font-weight: 600;
    }
    
    .plan-benefits-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: flex-end;
      max-width: 60%;
    }
    
    .benefit-tag {
      font-size: 0.72rem;
      background: rgba(0, 255, 136, 0.08);
      color: var(--primary);
      border: 1px solid rgba(0, 255, 136, 0.15);
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
    }
    
    /* Anamnesis Answers */
    .anamnesis-date {
      font-size: 0.75rem;
      color: #71717a;
      margin-bottom: 14px;
      font-weight: 500;
    }
    
    .anamnesis-answers-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .anamnesis-answer-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 12px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-sm);
    }
    
    .anamnesis-question {
      font-size: 0.85rem;
      color: #a1a1aa;
      font-weight: 500;
    }
    
    .anamnesis-response-box {
      font-size: 0.85rem;
      color: #fff;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      width: fit-content;
      background: rgba(255, 255, 255, 0.05);
    }
    
    .anamnesis-response-box.response-si {
      background: rgba(0, 255, 136, 0.1);
      color: var(--primary);
      border: 1px solid rgba(0, 255, 136, 0.2);
    }
    
    .anamnesis-response-box.response-no {
      background: rgba(244, 63, 94, 0.1);
      color: var(--danger);
      border: 1px solid rgba(244, 63, 94, 0.2);
    }
    
    /* Compact Table */
    .compact-table th {
      padding: 10px 12px;
      font-size: 11px;
    }
    .compact-table td {
      padding: 10px 12px;
      font-size: 13px;
    }
    
    .exercise-name {
      display: block;
      font-weight: 600;
      color: #fff;
    }
    .exercise-cat {
      font-size: 0.72rem;
      color: #71717a;
    }
    .score-value {
      font-weight: 700;
      color: var(--secondary);
    }
    .score-date {
      color: #a1a1aa;
      font-size: 0.78rem;
    }
    .score-notes {
      color: #71717a;
      max-width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .payment-amount {
      font-weight: 700;
      color: var(--primary);
    }
    
    /* Timeline */
    .timeline-container {
      max-height: 300px;
      overflow-y: auto;
      padding-right: 8px;
    }
    
    .timeline-list {
      position: relative;
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .timeline-list::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 6px;
      bottom: 6px;
      width: 2px;
      background: var(--border-glow);
    }
    
    .timeline-item {
      position: relative;
      display: flex;
      align-items: flex-start;
    }
    
    .timeline-badge {
      position: absolute;
      left: -20px;
      top: 6px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent);
      border: 2px solid var(--bg-dark);
      box-shadow: 0 0 8px var(--accent);
    }
    
    .timeline-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .timeline-time {
      font-size: 0.78rem;
      color: var(--accent);
      font-weight: 600;
    }
    
    .timeline-desc {
      font-size: 0.85rem;
      color: #e4e4e7;
    }
    
    /* Empty Messages */
    .empty-section-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px 16px;
      color: #71717a;
      gap: 8px;
      text-align: center;
      background: rgba(0, 0, 0, 0.15);
      border-radius: var(--radius-md);
      border: 1px dashed var(--border-glow);
    }
    
    .message-icon {
      font-size: 1.8rem;
    }
    
    /* State containers */
    .profile-state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      color: #71717a;
      text-align: center;
      gap: 12px;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      border-top-color: var(--primary);
      animation: spin 1s ease-in-out infinite;
    }
    
    .error-icon {
      font-size: 2.5rem;
      color: var(--danger);
    }
    .error-msg {
      color: #e4e4e7;
      font-weight: 500;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Responsive styling overrides */
    @media (max-width: 1024px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }
      .profile-header-card {
        flex-direction: column;
        align-items: flex-start;
      }
      .quick-status-grid {
        width: 100%;
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (max-width: 480px) {
      .quick-status-grid {
        grid-template-columns: 1fr;
      }
      .header-main-info {
        flex-direction: column;
        align-items: center;
        text-align: center;
        width: 100%;
      }
      .profile-name {
        font-size: 1.5rem;
      }
    }
  `]
})
export class MemberProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private db = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  member: Miembro | null = null;
  payments: Pago[] = [];
  attendance: Asistencia[] = [];
  scores: MarcaMiembro[] = [];
  loading = true;
  error = '';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadMemberData(id);
    } else {
      this.error = 'No se especificó un ID de atleta válido.';
      this.loading = false;
    }
  }

  loadMemberData(id: string) {
    this.loading = true;
    this.db.getMiembro(id).subscribe({
      next: (m) => {
        this.member = m;
        
        // Cargar pagos del miembro
        this.db.getPagos().subscribe({
          next: (pagos) => {
            this.payments = pagos.filter(p => p.miembro_id === id);
            this.cdr.markForCheck();
          },
          error: (err) => console.error('Error al cargar pagos:', err)
        });

        // Cargar asistencias del miembro
        this.db.getAsistencia().subscribe({
          next: (asist) => {
            this.attendance = asist.filter(a => a.miembro_id === id);
            this.cdr.markForCheck();
          },
          error: (err) => console.error('Error al cargar asistencia:', err)
        });

        // Cargar marcas personales / PRs del miembro
        this.db.getMarcas(id).subscribe({
          next: (marcas) => {
            this.scores = marcas;
            this.cdr.markForCheck();
          },
          error: (err) => console.error('Error al cargar marcas:', err)
        });

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar miembro:', err);
        this.error = 'El atleta no fue encontrado o hubo un error al obtener la información.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr.split('T')[0] + 'T00:00:00');
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatDateTime(dateTimeStr: string | null | undefined): string {
    if (!dateTimeStr) return '-';
    const d = new Date(dateTimeStr);
    const datePart = d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${datePart} a las ${timePart}`;
  }

  goBack() {
    this.router.navigate(['/members']);
  }
}
