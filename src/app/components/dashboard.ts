import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { Miembro, Plan, Asistencia } from '../models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container animate-fade-in">
      <div class="flex-between dashboard-header">
        <div>
          <h1 class="title-grad">Panel de Control</h1>
          <p class="subtitle">Bienvenido a GymFlow. Aquí tienes el estado actual del centro de entrenamiento.</p>
        </div>
        <div class="current-time glass-card flex-gap-2">
          <div class="pulse-indicator"></div>
          <span>Gimnasio Abierto</span>
        </div>
      </div>

      <!-- Métricas Clave -->
      <div class="grid-cols-4 metrics-grid">
        <div class="glass-card metric-card border-purple">
          <div class="metric-icon purple-glow">👥</div>
          <div class="metric-info">
            <span class="metric-label">Total Miembros</span>
            <h2 class="metric-value">{{ totalMembersCount }}</h2>
            <span class="metric-sub text-green">{{ activeMembersCount }} activos / {{ expiredMembersCount }} vencidos</span>
          </div>
        </div>

        <div class="glass-card metric-card border-green">
          <div class="metric-icon green-glow">💰</div>
          <div class="metric-info">
            <span class="metric-label">Ingreso Estimado</span>
            <h2 class="metric-value">\${{ monthlyIncome }}</h2>
            <span class="metric-sub text-zinc">Mensual en suscripciones</span>
          </div>
        </div>

        <div class="glass-card metric-card border-cyan">
          <div class="metric-icon cyan-glow">🏃</div>
          <div class="metric-info">
            <span class="metric-label">Total Check-Ins</span>
            <h2 class="metric-value">{{ totalAttendanceCount }}</h2>
            <span class="metric-sub text-cyan">{{ todayAttendanceCount }} check-ins hoy</span>
          </div>
        </div>

        <div class="glass-card metric-card border-danger">
          <div class="metric-icon danger-glow">⚠️</div>
          <div class="metric-info">
            <span class="metric-label">Planes Vencidos</span>
            <h2 class="metric-value">{{ expiredMembersCount }}</h2>
            <span class="metric-sub text-danger">Acceso bloqueado</span>
          </div>
        </div>
      </div>

      <!-- Sección Principal (Gráfico e Historial) -->
      <div class="grid-cols-2 main-grid">
        <div class="glass-card chart-container">
          <h3>Distribución de Suscripciones</h3>
          <p class="chart-subtitle">Planes más populares en el gimnasio</p>
          <div class="canvas-wrapper">
            <canvas #chartCanvas></canvas>
          </div>
        </div>

        <div class="glass-card attendance-container">
          <div class="flex-between">
            <h3>Últimos Check-ins</h3>
            <a routerLink="/attendance" class="btn btn-secondary btn-sm">Ver Todos</a>
          </div>
          
          <div class="attendance-list" *ngIf="recentAttendance.length > 0; else noAttendance">
            <div class="attendance-item animate-fade-in" *ngFor="let entry of recentAttendance">
              <div class="avatar-col">
                <div class="avatar">{{ entry.miembro?.nombre?.charAt(0) || 'M' }}</div>
              </div>
              <div class="info-col">
                <span class="name">{{ entry.miembro?.nombre }}</span>
                <span class="plan">{{ entry.miembro?.plan?.nombre || 'Sin Plan' }}</span>
              </div>
              <div class="time-col">
                <span class="time">{{ formatTime(entry.fecha_hora) }}</span>
                <span class="date">{{ formatDate(entry.fecha_hora) }}</span>
              </div>
            </div>
          </div>
          <ng-template #noAttendance>
            <div class="empty-state">
              <span class="empty-icon">📭</span>
              <p>No se han registrado check-ins hoy.</p>
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .title-grad {
      font-size: 2.2rem;
      background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 4px;
    }
    .subtitle {
      color: #71717a;
      font-size: 0.95rem;
    }
    .current-time {
      padding: 8px 16px;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 30px;
      display: flex;
      align-items: center;
      background: rgba(16, 185, 129, 0.05);
      border-color: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }
    .pulse-indicator {
      width: 8px;
      height: 8px;
      background-color: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 1.6s infinite;
    }
    @keyframes pulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
      }
    }

    /* Metric Cards Custom Styles */
    .metric-card {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 20px;
    }
    .border-purple { border-left: 4px solid var(--secondary); }
    .border-green { border-left: 4px solid var(--primary); }
    .border-cyan { border-left: 4px solid var(--accent); }
    .border-danger { border-left: 4px solid var(--danger); }
    
    .metric-icon {
      font-size: 2rem;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.03);
    }
    .purple-glow { background: rgba(139, 92, 246, 0.1); color: var(--secondary); }
    .green-glow { background: rgba(0, 255, 136, 0.1); color: var(--primary); }
    .cyan-glow { background: rgba(6, 182, 212, 0.1); color: var(--accent); }
    .danger-glow { background: rgba(244, 63, 94, 0.1); color: var(--danger); }

    .metric-info {
      display: flex;
      flex-direction: column;
    }
    .metric-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #71717a;
      font-weight: 600;
    }
    .metric-value {
      font-size: 1.8rem;
      font-weight: 800;
      font-family: var(--font-display);
      margin: 2px 0;
      color: #fff;
    }
    .metric-sub {
      font-size: 0.75rem;
      font-weight: 500;
    }
    .text-green { color: var(--primary); }
    .text-zinc { color: #a1a1aa; }
    .text-cyan { color: var(--accent); }
    .text-danger { color: var(--danger); }

    /* Main Section */
    .main-grid {
      grid-template-columns: 1.5fr 1fr;
    }
    .chart-container h3, .attendance-container h3 {
      font-size: 1.15rem;
      margin-bottom: 4px;
    }
    .chart-subtitle {
      font-size: 0.8rem;
      color: #71717a;
      margin-bottom: 20px;
    }
    .canvas-wrapper {
      position: relative;
      height: 280px;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.75rem;
      border-radius: var(--radius-sm);
    }

    /* Attendance List */
    .attendance-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
      max-height: 280px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .attendance-item {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.03);
      transition: all 0.2s ease;
    }
    .attendance-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--accent) 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-family: var(--font-display);
      font-size: 0.9rem;
    }
    .info-col {
      margin-left: 14px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }
    .info-col .name {
      font-weight: 600;
      font-size: 0.88rem;
      color: #f4f4f5;
    }
    .info-col .plan {
      font-size: 0.75rem;
      color: #a1a1aa;
    }
    .time-col {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .time-col .time {
      font-weight: 600;
      font-size: 0.8rem;
      color: var(--primary);
    }
    .time-col .date {
      font-size: 0.7rem;
      color: #71717a;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #71717a;
      gap: 10px;
    }
    .empty-icon {
      font-size: 2.5rem;
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private db = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  activeMembersCount = 0;
  expiredMembersCount = 0;
  totalMembersCount = 0;
  monthlyIncome = 0;
  todayAttendanceCount = 0;
  totalAttendanceCount = 0;
  recentAttendance: Asistencia[] = [];
  planes: Plan[] = [];
  miembros: Miembro[] = [];

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    // We delay slightly to ensure data is loaded and DOM is fully ready
    setTimeout(() => this.updateChart(), 500);
  }

  loadData() {
    this.db.getPlanes().subscribe(planes => {
      this.planes = planes;
      this.db.getMiembros().subscribe(miembros => {
        this.miembros = miembros;
        this.calculateMetrics();
        this.updateChart();
        this.cdr.markForCheck();
      });
    });

    this.db.getAsistencia().subscribe(asistencia => {
      // Filter for today
      const today = new Date().toISOString().split('T')[0];
      const todayAsistencia = asistencia.filter(a => a.fecha_hora.startsWith(today));
      this.todayAttendanceCount = todayAsistencia.length;
      this.totalAttendanceCount = asistencia.length;

      // Show top 5 recent
      this.recentAttendance = asistencia.slice(0, 5);
      this.cdr.markForCheck();
    });
  }

  calculateMetrics() {
    // Filter active members
    const active = this.miembros.filter(m => m.estado === 'activo');
    this.activeMembersCount = active.length;

    // Filter expired members
    this.expiredMembersCount = this.miembros.filter(m => m.estado === 'vencido').length;

    // Total members count
    this.totalMembersCount = this.miembros.length;

    // Monthly revenue estimation
    this.monthlyIncome = active.reduce((sum, m) => {
      if (m.plan) {
        // Normalize price to monthly (30 days)
        const dailyRate = m.plan.precio / (m.plan.duracion_dias || 30);
        return sum + Math.round(dailyRate * 30);
      }
      return sum;
    }, 0);
  }

  updateChart() {
    if (!this.chartCanvas || this.planes.length === 0 || this.miembros.length === 0) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    // Count members per plan
    const dataCounts = this.planes.map(p => {
      return this.miembros.filter(m => m.plan_id === p.id && m.estado === 'activo').length;
    });

    const labels = this.planes.map(p => p.nombre);

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataCounts,
          backgroundColor: [
            'rgba(0, 255, 136, 0.7)',
            'rgba(139, 92, 246, 0.7)',
            'rgba(6, 182, 212, 0.7)',
            'rgba(245, 158, 11, 0.7)'
          ],
          borderColor: [
            '#00ff88',
            '#8b5cf6',
            '#06b6d4',
            '#f59e0b'
          ],
          borderWidth: 1.5,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#a1a1aa',
              font: {
                family: 'Plus Jakarta Sans',
                size: 11
              },
              padding: 16
            }
          }
        }
      }
    });
  }

  formatTime(dateTimeStr: string): string {
    const d = new Date(dateTimeStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(dateTimeStr: string): string {
    const d = new Date(dateTimeStr);
    const today = new Date().toDateString();
    if (d.toDateString() === today) return 'Hoy';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
