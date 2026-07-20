import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SupabaseService } from '../services/supabase.service';
import { Miembro, Plan, Asistencia, Ejercicio, Wod, MarcaMiembro } from '../models';
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

      <!-- Toast Messages -->
      <div class="toast-container" *ngIf="successMessage || errorMessage">
        <div class="toast-card success-toast animate-slide-in" *ngIf="successMessage">
          <span>✨ {{ successMessage }}</span>
        </div>
        <div class="toast-card error-toast animate-slide-in" *ngIf="errorMessage">
          <span>⚠️ {{ errorMessage }}</span>
        </div>
      </div>

      <!-- TABS CONTROL -->
      <div class="tabs-navigation">
        <button 
          class="tab-btn" 
          [class.active]="activeTab === 'negocio'" 
          (click)="setTab('negocio')"
        >
          💼 Resumen de Negocio
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab === 'entrenamiento'" 
          (click)="setTab('entrenamiento')"
        >
          🏋️ Rendimiento y Ejercicios
        </button>
      </div>

      <!-- TAB 1: RESUMEN DE NEGOCIO -->
      <div *ngIf="activeTab === 'negocio'" class="tab-content animate-fade-in" style="display: flex; flex-direction: column; gap: 28px; width: 100%;">
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
              <h2 class="metric-value" style="display: flex; flex-direction: column; gap: 2px;">
                <span>\${{ monthlyIncome }}</span>
                <span *ngIf="tasaCambio > 1" style="font-size: 0.95rem; color: #a1a1aa; font-weight: 600;">
                  Bs. {{ (monthlyIncome * tasaCambio).toFixed(2) }}
                </span>
              </h2>
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

          <div class="flex-col gap-20">
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

            <!-- Próximos Cumpleaños -->
            <div class="glass-card birthdays-container">
              <div class="flex-between" style="margin-bottom: 16px;">
                <h3 style="margin-bottom: 0;">🎉 Próximos Cumpleaños</h3>
              </div>
              
              <div class="birthdays-list" *ngIf="upcomingBirthdays.length > 0; else noBirthdays">
                <div class="birthday-item animate-fade-in" *ngFor="let bday of upcomingBirthdays">
                  <div class="avatar-col">
                    <div class="avatar birthday-avatar">{{ bday.miembro.nombre.charAt(0) || 'M' }}</div>
                  </div>
                  <div class="info-col">
                    <span class="name">{{ bday.miembro.nombre }}</span>
                    <span class="bday-desc">Cumple {{ bday.nextAge }} años</span>
                  </div>
                  <div class="bday-date-col">
                    <span class="bday-date">{{ bday.formattedDate }}</span>
                    <span class="badge" 
                      [class.badge-today]="bday.daysRemaining === 0"
                      [class.badge-tomorrow]="bday.daysRemaining === 1"
                      [class.badge-upcoming]="bday.daysRemaining > 1"
                    >
                      {{ bday.daysRemaining === 0 ? 'Hoy 🎉' : bday.daysRemaining === 1 ? 'Mañana 🎂' : 'En ' + bday.daysRemaining + ' días' }}
                    </span>
                  </div>
                </div>
              </div>
              <ng-template #noBirthdays>
                <div class="empty-state" style="height: 120px;">
                  <span class="empty-icon" style="font-size: 1.8rem;">🎂</span>
                  <p style="font-size: 0.85rem;">No hay cumpleaños registrados próximamente.</p>
                </div>
              </ng-template>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: RENDIMIENTO Y EJERCICIOS -->
      <div *ngIf="activeTab === 'entrenamiento'" class="tab-content animate-fade-in" style="display: flex; flex-direction: column; gap: 28px; width: 100%;">
        <!-- Métricas Rápidas Entrenamiento -->
        <div class="grid-cols-4 metrics-grid">
          <div class="glass-card metric-card border-purple">
            <div class="metric-icon purple-glow">🏋️‍♂️</div>
            <div class="metric-info">
              <span class="metric-label">Ejercicios Totales</span>
              <h2 class="metric-value">{{ ejercicios.length }}</h2>
              <span class="metric-sub text-zinc">En catálogo local</span>
            </div>
          </div>

          <div class="glass-card metric-card border-green">
            <div class="metric-icon green-glow">🏆</div>
            <div class="metric-info">
              <span class="metric-label">PRs Registrados</span>
              <h2 class="metric-value">{{ marcas.length }}</h2>
              <span class="metric-sub text-green">Récords de atletas</span>
            </div>
          </div>

          <div class="glass-card metric-card border-cyan">
            <div class="metric-icon cyan-glow">📅</div>
            <div class="metric-info">
              <span class="metric-label">WODs Programados</span>
              <h2 class="metric-value">{{ wods.length }}</h2>
              <span class="metric-sub text-cyan">Sesiones creadas</span>
            </div>
          </div>

          <div class="glass-card metric-card border-danger">
            <div class="metric-icon danger-glow">🔥</div>
            <div class="metric-info">
              <span class="metric-label">PRs Recientes</span>
              <h2 class="metric-value">{{ recentPRs.length }}</h2>
              <span class="metric-sub text-danger">En el feed actual</span>
            </div>
          </div>
        </div>

        <!-- Gráficos de Entrenamiento y Feed/Sugerencias -->
        <div class="grid-cols-2 main-grid">
          <!-- Columna Izquierda: Gráficos de Balance y Popularidad -->
          <div class="flex-col gap-20">
            <div class="glass-card chart-container">
              <h3>Balance de Programación</h3>
              <p class="chart-subtitle">Distribución por categoría de ejercicio</p>
              <div class="canvas-wrapper">
                <canvas #categoriesChartCanvas></canvas>
              </div>
            </div>

            <div class="glass-card chart-container">
              <h3>Ejercicios más Frecuentes</h3>
              <p class="chart-subtitle">Top 5 programados en WODs</p>
              <div class="canvas-wrapper">
                <canvas #programmedChartCanvas></canvas>
              </div>
            </div>
          </div>

          <!-- Columna Derecha: Feed de PRs y Sugerencias de API -->
          <div class="flex-col gap-20">
            <!-- Feed de PRs Recientes -->
            <div class="glass-card">
              <div class="flex-between pr-feed-header">
                <h3 style="margin-bottom: 0;">Muro de PRs Recientes</h3>
                <span class="pulse-green-dot"></span>
              </div>
              <div class="pr-feed-list" *ngIf="recentPRs.length > 0; else noRecentPRs">
                <div class="pr-feed-item animate-fade-in" *ngFor="let pr of recentPRs">
                  <div class="avatar">{{ pr.miembro?.nombre?.charAt(0) || 'A' }}</div>
                  <div class="pr-feed-info">
                    <div class="pr-feed-text">
                      <span class="athlete-name">{{ pr.miembro?.nombre }}</span> 
                      logró un PR en <span class="exercise-name">{{ pr.ejercicio?.nombre }}</span>
                    </div>
                    <div class="pr-feed-val">
                      {{ pr.valor }} {{ pr.unidad }}
                    </div>
                    <div class="pr-feed-date">Logueado el: {{ formatDate(pr.fecha) }}</div>
                  </div>
                </div>
              </div>
              <ng-template #noRecentPRs>
                <div class="empty-state" style="height: 120px;">
                  <span class="empty-icon" style="font-size: 1.8rem;">🥈</span>
                  <p style="font-size: 0.85rem;">Aún no hay récords personales registrados.</p>
                </div>
              </ng-template>
            </div>

            <!-- Ejercicios Sugeridos de API -->
            <div class="glass-card">
              <div class="flex-between border-b" style="padding-bottom: 12px; margin-bottom: 16px;">
                <div>
                  <h3 style="margin-bottom: 4px;">Ejercicios Sugeridos</h3>
                  <p class="chart-subtitle" style="margin-bottom: 0;">Biblioteca de wger.de en español</p>
                </div>
                <button class="btn btn-secondary btn-sm" (click)="refreshSuggestions()" [disabled]="isLoadingSuggestions">
                  {{ isLoadingSuggestions ? 'Cargando...' : '🔄 Refrescar' }}
                </button>
              </div>

              <!-- Loading State -->
              <div class="loading-suggestions" *ngIf="isLoadingSuggestions">
                <div class="spinner"></div>
                <p>Consultando biblioteca de ejercicios...</p>
              </div>

              <!-- Suggestions List -->
              <div class="suggestions-list" *ngIf="!isLoadingSuggestions && suggestedExercises.length > 0">
                <div class="suggestion-item animate-fade-in" *ngFor="let exercise of suggestedExercises">
                  <div class="flex-between" style="gap: 12px; align-items: flex-start;">
                    <div style="flex-grow: 1;">
                      <h4 class="suggestion-name" style="margin: 0 0 6px 0;">{{ exercise.nombre }}</h4>
                      <div class="tags-row" style="gap: 6px;">
                        <span class="badge badge-cat" style="font-size: 0.68rem; padding: 2px 8px; border-radius: 4px;">{{ exercise.categoria }}</span>
                        <span class="badge badge-eq" style="font-size: 0.68rem; padding: 2px 8px; border-radius: 4px;">{{ exercise.equipamiento }}</span>
                      </div>
                    </div>
                    <button 
                      class="btn btn-primary btn-sm" 
                      style="flex-shrink: 0; padding: 6px 12px; font-size: 0.72rem;"
                      (click)="addSuggestedToCatalog(exercise)" 
                      [disabled]="isAddingSuggested"
                    >
                      ✚ Importar
                    </button>
                  </div>
                  <div class="suggestion-desc" [innerHTML]="exercise.descripcion || 'Sin descripción detallada.'"></div>
                </div>
              </div>

              <div class="empty-state" style="height: 150px;" *ngIf="!isLoadingSuggestions && suggestedExercises.length === 0">
                <span class="empty-icon">⚠️</span>
                <p>No se pudieron cargar sugerencias.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
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

    /* Tabs Navigation */
    .tabs-navigation {
      display: flex;
      gap: 12px;
      border-bottom: 1px solid var(--border-glow);
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: #71717a;
      font-size: 1rem;
      font-weight: 600;
      padding: 10px 20px;
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: all 0.2s ease;
      font-family: var(--font-display);
    }
    .tab-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.03);
    }
    .tab-btn.active {
      color: var(--primary);
      background: rgba(0, 255, 136, 0.05);
      box-shadow: inset 0 0 10px rgba(0, 255, 136, 0.02);
      border: 1px solid rgba(0, 255, 136, 0.15);
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

    .main-grid {
      grid-template-columns: 1.2fr 1fr;
    }
    
    @media (max-width: 992px) {
      .main-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }
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

    /* Birthdays List */
    .birthdays-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 280px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .birthday-item {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.03);
      transition: all 0.2s ease;
    }
    .birthday-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .birthday-avatar {
      background: linear-gradient(135deg, #f59e0b 0%, #f43f5e 100%);
    }
    .bday-desc {
      font-size: 0.75rem;
      color: #a1a1aa;
    }
    .bday-date-col {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .bday-date {
      font-weight: 600;
      font-size: 0.8rem;
      color: #fff;
    }
    .badge-today {
      background: rgba(244, 63, 94, 0.1);
      color: #f43f5e;
      border: 1px solid rgba(244, 63, 94, 0.25);
      font-size: 0.65rem;
      padding: 1px 6px;
    }
    .badge-tomorrow {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.25);
      font-size: 0.65rem;
      padding: 1px 6px;
    }
    .badge-upcoming {
      background: rgba(6, 182, 212, 0.1);
      color: #06b6d4;
      border: 1px solid rgba(6, 182, 212, 0.25);
      font-size: 0.65rem;
      padding: 1px 6px;
    }

    /* PR Feed */
    .pr-feed-header {
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
    }
    .pulse-green-dot {
      width: 8px;
      height: 8px;
      background-color: var(--primary);
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.7);
      animation: pulse-green 1.6s infinite;
    }
    @keyframes pulse-green {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 6px rgba(0, 255, 136, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(0, 255, 136, 0);
      }
    }
    .pr-feed-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 280px;
      overflow-y: auto;
    }
    .pr-feed-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.03);
      transition: all 0.2s ease;
    }
    .pr-feed-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .pr-feed-info {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }
    .pr-feed-text {
      font-size: 0.82rem;
      color: #a1a1aa;
    }
    .athlete-name {
      color: #fff;
      font-weight: 600;
    }
    .pr-feed-info .exercise-name {
      color: var(--accent);
      font-weight: 600;
    }
    .pr-feed-val {
      font-family: var(--font-display);
      font-weight: 800;
      color: var(--primary);
      font-size: 1.05rem;
      margin-top: 2px;
    }
    .pr-feed-date {
      font-size: 0.68rem;
      color: #71717a;
      margin-top: 1px;
    }

    /* Suggested Exercises */
    .loading-suggestions {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 180px;
      color: #71717a;
      gap: 12px;
      font-size: 0.85rem;
    }
    .spinner {
      width: 28px;
      height: 28px;
      border: 3px solid rgba(255, 255, 255, 0.05);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s infinite linear;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .suggestions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .suggestion-item {
      padding: 14px;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.03);
      transition: all 0.2s ease;
    }
    .suggestion-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .suggestion-name {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
    }
    .tags-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .badge-cat {
      background: rgba(139, 92, 246, 0.1);
      color: var(--secondary);
      border: 1px solid rgba(139, 92, 246, 0.2);
    }
    .badge-eq {
      background: rgba(6, 182, 212, 0.1);
      color: var(--accent);
      border: 1px solid rgba(6, 182, 212, 0.2);
    }
    .suggestion-desc {
      font-size: 0.78rem;
      color: #a1a1aa;
      margin-top: 10px;
      max-height: 80px;
      overflow-y: auto;
      padding-right: 4px;
      line-height: 1.4;
      border-left: 2px solid rgba(255, 255, 255, 0.05);
      padding-left: 8px;
    }

    .flex-col {
      display: flex;
      flex-direction: column;
    }
    .gap-20 { gap: 20px; }
    .border-b { border-bottom: 1px solid rgba(255, 255, 255, 0.04); }

    /* Toasts styles */
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .toast-card {
      padding: 12px 20px;
      border-radius: var(--radius-md);
      font-size: 0.88rem;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      min-width: 250px;
      max-width: 400px;
      pointer-events: auto;
      border: 1px solid;
    }
    .success-toast {
      background: rgba(10, 25, 18, 0.95);
      border-color: var(--primary);
      color: #34d399;
    }
    .error-toast {
      background: rgba(30, 15, 18, 0.95);
      border-color: var(--danger);
      color: #f87171;
    }
    .animate-slide-in {
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes slideIn {
      0% { transform: translateX(100%); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private db = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoriesChartCanvas') categoriesChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('programmedChartCanvas') programmedChartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private categoriesChart: Chart | null = null;
  private programmedChart: Chart | null = null;

  activeTab: 'negocio' | 'entrenamiento' = 'negocio';

  // Metrics
  activeMembersCount = 0;
  expiredMembersCount = 0;
  totalMembersCount = 0;
  monthlyIncome = 0;
  todayAttendanceCount = 0;
  totalAttendanceCount = 0;
  recentAttendance: Asistencia[] = [];
  planes: Plan[] = [];
  miembros: Miembro[] = [];
  tasaCambio = 1.0;

  upcomingBirthdays: Array<{
    miembro: Miembro;
    daysRemaining: number;
    nextAge: number;
    formattedDate: string;
  }> = [];

  // Exercise Statistics data
  ejercicios: Ejercicio[] = [];
  wods: Wod[] = [];
  marcas: MarcaMiembro[] = [];
  recentPRs: MarcaMiembro[] = [];

  // wger Suggested Exercises state
  suggestedExercises: any[] = [];
  isLoadingSuggestions = false;
  isAddingSuggested = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    // We delay slightly to ensure data is loaded and DOM is fully ready
    setTimeout(() => this.updateChart(), 500);
  }

  setTab(tab: 'negocio' | 'entrenamiento') {
    this.activeTab = tab;
    this.cdr.markForCheck();
    if (tab === 'negocio') {
      setTimeout(() => this.updateChart(), 100);
    } else {
      if (this.suggestedExercises.length === 0) {
        this.loadSuggestedExercises();
      }
      this.updateExerciseStats();
    }
  }

  loadData() {
    this.db.getTasaCambio().subscribe(tasa => {
      this.tasaCambio = tasa;
      this.cdr.markForCheck();
    });
    this.db.getPlanes().subscribe(planes => {
      this.planes = planes;
      this.db.getMiembros().subscribe(miembros => {
        this.miembros = miembros;
        this.calculateMetrics();
        this.calculateUpcomingBirthdays();
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

    this.db.getEjercicios().subscribe(ejercicios => {
      this.ejercicios = ejercicios;
      this.updateExerciseStats();
      this.cdr.markForCheck();
    });

    this.db.getWods().subscribe(wods => {
      this.wods = wods;
      this.updateExerciseStats();
      this.cdr.markForCheck();
    });

    this.db.getMarcas().subscribe(marcas => {
      this.marcas = marcas;
      this.calculateRecentPRs();
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

  calculateUpcomingBirthdays() {
    if (!this.miembros || this.miembros.length === 0) {
      this.upcomingBirthdays = [];
      return;
    }

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    this.upcomingBirthdays = this.miembros
      .filter(m => m.fecha_nacimiento && m.estado !== 'inactivo')
      .map(m => {
        const parts = m.fecha_nacimiento!.split('-');
        const birthYear = parseInt(parts[0], 10);
        const birthMonth = parseInt(parts[1], 10) - 1;
        const birthDay = parseInt(parts[2], 10);

        let nextBirthday = new Date(today.getFullYear(), birthMonth, birthDay);
        let nextAge = today.getFullYear() - birthYear;

        if (nextBirthday < todayMidnight) {
          nextBirthday = new Date(today.getFullYear() + 1, birthMonth, birthDay);
          nextAge++;
        }

        const diffTime = nextBirthday.getTime() - todayMidnight.getTime();
        const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

        const meses = [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        const formattedDate = `${birthDay} de ${meses[birthMonth]}`;

        return {
          miembro: m,
          daysRemaining,
          nextAge,
          formattedDate
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);
  }

  calculateRecentPRs() {
    // Sort all member marks by date descending and display the latest 5
    this.recentPRs = [...this.marcas]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 5);
  }

  updateExerciseStats() {
    if (this.ejercicios.length === 0 || this.wods.length === 0) return;

    // 1. Calculate category distribution
    const categoryCounts: Record<string, number> = {};
    this.ejercicios.forEach(e => {
      const cat = e.categoria || 'Otro';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // 2. Calculate exercise popularity in WODs
    const exercisePopularity: Record<string, { nombre: string; count: number }> = {};
    this.wods.forEach(wod => {
      if (wod.wod_ejercicios) {
        wod.wod_ejercicios.forEach(we => {
          if (we.ejercicio) {
            const id = we.ejercicio_id;
            if (!exercisePopularity[id]) {
              exercisePopularity[id] = { nombre: we.ejercicio.nombre, count: 0 };
            }
            exercisePopularity[id].count++;
          }
        });
      }
    });

    const popularityList = Object.values(exercisePopularity)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Call chart update method asynchronously to ensure DOM elements exist
    setTimeout(() => {
      this.updateExerciseCharts(categoryCounts, popularityList);
    }, 100);
  }

  updateExerciseCharts(categoryCounts: Record<string, number>, popularityList: any[]) {
    if (this.activeTab !== 'entrenamiento') return;

    // Categories Distribution Chart (Doughnut)
    if (this.categoriesChartCanvas) {
      const ctx = this.categoriesChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        if (this.categoriesChart) {
          this.categoriesChart.destroy();
        }
        
        const labels = Object.keys(categoryCounts);
        const data = Object.values(categoryCounts);

        this.categoriesChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: [
                'rgba(139, 92, 246, 0.7)',  // Violet
                'rgba(6, 182, 212, 0.7)',   // Cyan
                'rgba(245, 158, 11, 0.7)',  // Orange
                'rgba(0, 255, 136, 0.7)',   // Neon Green
                'rgba(244, 63, 94, 0.7)',   // Rose/Red
              ],
              borderColor: [
                '#8b5cf6',
                '#06b6d4',
                '#f59e0b',
                '#00ff88',
                '#f43f5e'
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
    }

    // Programmed Exercises Popularity Chart (Horizontal Bar)
    if (this.programmedChartCanvas) {
      const ctx = this.programmedChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        if (this.programmedChart) {
          this.programmedChart.destroy();
        }

        const labels = popularityList.map(item => item.nombre);
        const data = popularityList.map(item => item.count);

        this.programmedChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Veces Programado',
              data: data,
              backgroundColor: 'rgba(0, 255, 136, 0.15)',
              borderColor: '#00ff88',
              borderWidth: 1.5,
              borderRadius: 6
            }]
          },
          options: {
            indexAxis: 'y', // Horizontal bars
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              x: {
                grid: {
                  color: 'rgba(255, 255, 255, 0.05)'
                },
                ticks: {
                  color: '#a1a1aa',
                  stepSize: 1
                }
              },
              y: {
                grid: {
                  display: false
                },
                ticks: {
                  color: '#e4e4e7',
                  font: {
                    family: 'Plus Jakarta Sans',
                    size: 11
                  }
                }
              }
            }
          }
        });
      }
    }
  }

  updateChart() {
    if (!this.chartCanvas || this.planes.length === 0 || this.miembros.length === 0 || this.activeTab !== 'negocio') return;

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

  // wger API Suggestions Loader
  loadSuggestedExercises() {
    this.isLoadingSuggestions = true;
    this.http.get<any>('https://wger.de/api/v2/exerciseinfo/?language=4&limit=30')
      .subscribe({
        next: (response) => {
          if (response && response.results) {
            const fetched = response.results;
            this.suggestedExercises = this.shuffleArray(fetched)
              .slice(0, 3)
              .map((item: any) => {
                // Find Spanish translation name and description
                const translation = item.translations.find((t: any) => t.language === 4) 
                                 || item.translations[0] 
                                 || { name: 'Ejercicio sin nombre', description: 'Sin descripción' };
                
                return {
                  wgerId: item.id,
                  nombre: translation.name,
                  descripcion: translation.description || 'Sin descripción.',
                  categoria: this.mapWgerCategory(item.category),
                  equipamiento: item.equipment && item.equipment.length > 0 
                    ? this.mapWgerEquipment(item.equipment[0].id, item.equipment[0].name)
                    : 'Ninguno'
                };
              });
          }
          this.isLoadingSuggestions = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error fetching exercises from wger:', err);
          this.isLoadingSuggestions = false;
          this.cdr.markForCheck();
        }
      });
  }

  refreshSuggestions() {
    this.loadSuggestedExercises();
  }

  addSuggestedToCatalog(exercise: any) {
    if (this.isAddingSuggested) return;
    this.isAddingSuggested = true;

    // Check if it already exists locally
    const exists = this.ejercicios.some(e => e.nombre.toLowerCase() === exercise.nombre.toLowerCase());
    if (exists) {
      this.showToast('El ejercicio "' + exercise.nombre + '" ya existe en tu catálogo.', 'error');
      this.isAddingSuggested = false;
      return;
    }

    // Map categories to GymFlow schema categories: Gimnasia, Halterofilia, Monoestructural, Estiramiento, Calentamiento
    let localCat = 'Gimnasia';
    if (exercise.categoria === 'Cardio') {
      localCat = 'Monoestructural';
    } else if (['Brazos', 'Espalda', 'Pecho', 'Piernas', 'Hombros', 'Pantorrillas'].includes(exercise.categoria)) {
      localCat = 'Halterofilia';
    }

    // Strip HTML tags for clean description
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = exercise.descripcion;
    const plainDescription = tempDiv.textContent || tempDiv.innerText || exercise.descripcion;

    const newExercise = {
      nombre: exercise.nombre,
      categoria: localCat,
      descripcion: plainDescription.trim().slice(0, 500),
      equipamiento: exercise.equipamiento,
      url_video: ''
    };

    this.db.createEjercicio(newExercise).subscribe({
      next: (created) => {
        this.showToast('¡"' + created.nombre + '" añadido correctamente al catálogo!', 'success');
        this.ejercicios.push(created);
        this.updateExerciseStats();
        this.isAddingSuggested = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error creating exercise:', err);
        this.showToast('Error al añadir el ejercicio al catálogo.', 'error');
        this.isAddingSuggested = false;
        this.cdr.markForCheck();
      }
    });
  }

  private shuffleArray(array: any[]): any[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private mapWgerCategory(catId: any): string {
    const WGER_CATEGORIES: Record<number, string> = {
      10: 'Abdomen',
      8: 'Brazos',
      12: 'Espalda',
      14: 'Pantorrillas',
      15: 'Cardio',
      11: 'Pecho',
      9: 'Piernas',
      13: 'Hombros'
    };
    return WGER_CATEGORIES[Number(catId)] || 'Fuerza';
  }

  private mapWgerEquipment(eqId: number, defaultName: string): string {
    const WGER_EQUIPMENT_ES: Record<number, string> = {
      1: 'Barra',
      2: 'Barra SZ',
      3: 'Mancuerna',
      4: 'Colchoneta',
      5: 'Pelota Suiza',
      6: 'Barra de Dominadas',
      7: 'Peso Corporal',
      8: 'Banco Plano',
      9: 'Banco Inclinado',
      10: 'Pesa Rusa (Kettlebell)',
      11: 'Banda de Resistencia'
    };
    return WGER_EQUIPMENT_ES[eqId] || defaultName || 'Ninguno';
  }

  showToast(message: string, type: 'success' | 'error') {
    if (type === 'success') {
      this.successMessage = message;
      setTimeout(() => {
        this.successMessage = null;
        this.cdr.markForCheck();
      }, 4000);
    } else {
      this.errorMessage = message;
      setTimeout(() => {
        this.errorMessage = null;
        this.cdr.markForCheck();
      }, 4000);
    }
    this.cdr.markForCheck();
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
