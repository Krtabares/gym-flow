import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Wod, WodEjercicio, TimerMetodo, WodTipo, WOD_TIMER_MAP } from '../models';
import { Subscription } from 'rxjs';

type TimerState = 'setup' | 'prep' | 'work' | 'rest' | 'cycle_rest' | 'finished';
type TimerMode = 'fortime' | 'amrap' | 'emom' | 'tabata' | 'stopwatch';

interface LapTime {
  lapIndex: number;
  lapTimeStr: string;
  totalTimeStr: string;
}

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="timer-container animate-fade-in" [class.fullscreen]="isFullscreen">
      <!-- HEADER -->
      <div class="flex-between header-section" *ngIf="!isFullscreen">
        <div>
          <h1 class="title-grad">Cronómetro WOD</h1>
          <p class="subtitle">Configura tus tiempos de entrenamiento o carga la programación diaria.</p>
        </div>
        <div class="header-actions flex-gap-2">
          <button class="btn btn-secondary" (click)="toggleAudio()" [title]="soundEnabled ? 'Silenciar' : 'Activar sonido'">
            <span>{{ soundEnabled ? '🔊 Sonido' : '🔇 Silencio' }}</span>
          </button>
          <button class="btn btn-secondary" (click)="toggleFullscreen()">
            <span>🖥️ Pantalla Completa</span>
          </button>
        </div>
      </div>

      <!-- IF FULLSCREEN: MINIMAL FLOATING CONTROLS -->
      <div class="fullscreen-top-bar" *ngIf="isFullscreen">
        <div class="fullscreen-wod-title" *ngIf="selectedWod">
          <strong>WOD:</strong> {{ selectedWod.titulo }} ({{ selectedWod.tipo }})
        </div>
        <div class="flex-gap-2">
          <button class="btn btn-secondary btn-sm" (click)="toggleAudio()">
            {{ soundEnabled ? '🔊' : '🔇' }}
          </button>
          <button class="btn btn-secondary btn-sm" (click)="toggleFullscreen()">
            🗗 Salir
          </button>
        </div>
      </div>

      <!-- MAIN AREA: TIMER & WOD PANEL -->
      <div class="timer-layout-grid" [class.with-wod]="selectedWod">
        
        <!-- COLUMN 1: TIMER INTERFACE -->
        <div class="timer-main-card glass-card" [class.state-prep]="state === 'prep'" [class.state-work]="state === 'work'" [class.state-rest]="state === 'rest' || state === 'cycle_rest'" [class.state-finished]="state === 'finished'">
          
          <!-- SETUP VIEW -->
          <div class="setup-view" *ngIf="state === 'setup'">
            <h3 class="section-title">Elige el tipo de Cronómetro</h3>
            
            <div class="timer-modes-grid">
              <button class="mode-btn" [class.active]="selectedMode === 'fortime'" (click)="selectMode('fortime')">
                <span class="mode-icon">⏱️</span>
                <span class="mode-name">For Time</span>
                <span class="mode-desc">Completar en el menor tiempo posible</span>
              </button>
              
              <button class="mode-btn" [class.active]="selectedMode === 'amrap'" (click)="selectMode('amrap')">
                <span class="mode-icon">🔄</span>
                <span class="mode-name">AMRAP</span>
                <span class="mode-desc">Tantas rondas como sea posible</span>
              </button>

              <button class="mode-btn" [class.active]="selectedMode === 'emom'" (click)="selectMode('emom')">
                <span class="mode-icon">🔔</span>
                <span class="mode-name">EMOM</span>
                <span class="mode-desc">Cada minuto en el minuto</span>
              </button>

              <button class="mode-btn" [class.active]="selectedMode === 'tabata'" (click)="selectMode('tabata')">
                <span class="mode-icon">🔥</span>
                <span class="mode-name">Tabata</span>
                <span class="mode-desc">Intervalos de alta intensidad</span>
              </button>

              <button class="mode-btn" [class.active]="selectedMode === 'stopwatch'" (click)="selectMode('stopwatch')">
                <span class="mode-icon">🏃</span>
                <span class="mode-name">Cronómetro</span>
                <span class="mode-desc">Reloj ascendente clásico</span>
              </button>
            </div>

            <!-- MODE CONFIGURATIONS -->
            <div class="config-form-section">
              <div class="form-grid">
                <!-- Prep Time -->
                <div class="form-group">
                  <label class="form-label">Cuenta Regresiva (Prep)</label>
                  <select class="form-control" [(ngModel)]="config.prepTime">
                    <option [ngValue]="0">Ninguno</option>
                    <option [ngValue]="3">3 segundos</option>
                    <option [ngValue]="5">5 segundos</option>
                    <option [ngValue]="10">10 segundos</option>
                    <option [ngValue]="15">15 segundos</option>
                  </select>
                </div>

                <!-- FOR TIME Config -->
                <ng-container *ngIf="selectedMode === 'fortime'">
                  <div class="form-group">
                    <label class="form-label">Dirección del Reloj</label>
                    <select class="form-control" [(ngModel)]="config.forTimeDirection">
                      <option value="up">Ascendente (0 a Time Cap)</option>
                      <option value="down">Descendente (Time Cap a 0)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Time Cap (Minutos)</label>
                    <input type="number" class="form-control" [(ngModel)]="config.timeCapMinutes" min="1" max="99">
                  </div>
                </ng-container>

                <!-- AMRAP Config -->
                <ng-container *ngIf="selectedMode === 'amrap'">
                  <div class="form-group">
                    <label class="form-label">Tiempo Total (Minutos)</label>
                    <input type="number" class="form-control" [(ngModel)]="config.amrapMinutes" min="1" max="99">
                  </div>
                </ng-container>

                <!-- EMOM Config -->
                <ng-container *ngIf="selectedMode === 'emom'">
                  <div class="form-group">
                    <label class="form-label">Intervalo (Minutos:Segundos)</label>
                    <div class="time-inputs-row">
                      <input type="number" class="form-control" [(ngModel)]="config.emomIntervalMinutes" min="0" placeholder="Min">
                      <span class="colon">:</span>
                      <input type="number" class="form-control" [(ngModel)]="config.emomIntervalSeconds" min="0" max="59" placeholder="Seg">
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Rondas / Minutos Totales</label>
                    <input type="number" class="form-control" [(ngModel)]="config.emomRounds" min="1">
                  </div>
                </ng-container>

                <!-- TABATA Config -->
                <ng-container *ngIf="selectedMode === 'tabata'">
                  <div class="form-group">
                    <label class="form-label">Tiempo de Trabajo (s)</label>
                    <input type="number" class="form-control" [(ngModel)]="config.tabataWorkSeconds" min="5">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Tiempo de Descanso (s)</label>
                    <input type="number" class="form-control" [(ngModel)]="config.tabataRestSeconds" min="0">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Rondas</label>
                    <input type="number" class="form-control" [(ngModel)]="config.tabataRounds" min="1">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Series / Ciclos</label>
                    <input type="number" class="form-control" [(ngModel)]="config.tabataCycles" min="1">
                  </div>
                  <div class="form-group" *ngIf="config.tabataCycles > 1">
                    <label class="form-label">Descanso entre Ciclos (s)</label>
                    <input type="number" class="form-control" [(ngModel)]="config.tabataCycleRestSeconds" min="10">
                  </div>
                </ng-container>

                <!-- STOPWATCH Config -->
                <ng-container *ngIf="selectedMode === 'stopwatch'">
                  <div class="form-group">
                    <span class="form-label">Información</span>
                    <div class="info-text">El cronómetro clásico iniciará desde cero y te permitirá registrar tiempos parciales (Laps).</div>
                  </div>
                </ng-container>
              </div>

              <div class="action-buttons-row mt-16">
                <button class="btn btn-primary btn-lg-glow" (click)="startTimer()">
                  🚀 Iniciar Reloj
                </button>
              </div>
            </div>
            
            <!-- LOAD WOD IN SETUP SECTION -->
            <div class="load-wod-card-setup mt-16">
              <h4 class="mini-title">📅 Cargar WOD Programado</h4>
              <div class="flex-gap-2 flex-wrap">
                <input type="date" class="form-control date-picker-input-sm" [(ngModel)]="wodDate" (change)="loadWods()" />
                
                <select class="form-control wod-select" [(ngModel)]="wodSelectedId" (change)="onWodSelected()" [disabled]="wodsList.length === 0">
                  <option value="">{{ wodsList.length === 0 ? 'No hay WODs programados en esta fecha' : '-- Seleccionar WOD --' }}</option>
                  <option *ngFor="let w of wodsList" [value]="w.id">{{ w.titulo }} ({{ w.tipo }})</option>
                </select>

                <button class="btn btn-secondary btn-sm" *ngIf="selectedWod" (click)="clearWod()">
                  Quitar WOD
                </button>
              </div>
            </div>

          </div>

          <!-- ACTIVE TIMER VIEW -->
          <div class="active-timer-view" *ngIf="state !== 'setup'">
            
            <!-- PHASE BADGE -->
            <div class="phase-badge" [ngClass]="'phase-' + state">
              {{ getPhaseLabel() }}
            </div>

            <!-- DIGITAL CLOCK DISPLAY -->
            <div class="digital-clock" (click)="togglePlayPause()">
              {{ displayTime }}<span class="ms-digits" *ngIf="selectedMode === 'stopwatch'">.{{ displayTenths }}</span>
            </div>

            <!-- PROGRESS DETAILS -->
            <div class="timer-details-row">
              <div class="detail-box" *ngIf="selectedMode === 'tabata' || selectedMode === 'emom'">
                <span class="detail-label">RONDA</span>
                <span class="detail-value">{{ currentRound }} / {{ totalRounds }}</span>
              </div>
              <div class="detail-box" *ngIf="selectedMode === 'tabata' && config.tabataCycles > 1">
                <span class="detail-label">CICLO</span>
                <span class="detail-value">{{ currentCycle }} / {{ config.tabataCycles }}</span>
              </div>
              <div class="detail-box">
                <span class="detail-label">TIEMPO TOTAL</span>
                <span class="detail-value">{{ displayTotalElapsedTime }}</span>
              </div>
            </div>

            <!-- CONTROLS ROW -->
            <div class="timer-controls-row flex-gap-2">
              <!-- Back / Prev Round -->
              <button class="btn btn-secondary btn-circle" (click)="prevRound()" [disabled]="!canPrev()" title="Ronda Anterior">
                ⏮️
              </button>

              <!-- Play / Pause -->
              <button class="btn btn-play-pause" [class.btn-paused]="isPaused" (click)="togglePlayPause()" [title]="isPaused ? 'Reanudar' : 'Pausar'">
                <span class="icon">{{ isPaused ? '▶️' : '⏸️' }}</span>
                <span>{{ isPaused ? 'Reanudar' : 'Pausar' }}</span>
              </button>

              <!-- Skip / Next Round -->
              <button class="btn btn-secondary btn-circle" (click)="nextRound()" [disabled]="!canNext()" title="Siguiente Ronda">
                ⏭️
              </button>
            </div>

            <!-- SECONDARY ACTIONS -->
            <div class="secondary-actions-row flex-gap-2 mt-16">
              <button class="btn btn-secondary btn-sm" *ngIf="selectedMode === 'stopwatch' && state !== 'finished'" (click)="addLap()">
                ⏱️ Vuelta (Lap)
              </button>
              <button class="btn btn-danger btn-sm" (click)="resetToSetup()">
                ⏹️ Detener / Configurar
              </button>
            </div>

            <!-- LAP TIMES HISTORY -->
            <div class="laps-history-panel mt-16 animate-fade-in" *ngIf="selectedMode === 'stopwatch' && laps.length > 0">
              <h4>Registro de Vueltas</h4>
              <div class="laps-list">
                <div class="lap-row" *ngFor="let lap of laps">
                  <span class="lap-idx">Vuelta {{ lap.lapIndex }}</span>
                  <span class="lap-val">Tiempo: {{ lap.lapTimeStr }}</span>
                  <span class="lap-total">Total: {{ lap.totalTimeStr }}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- COLUMN 2: WOD DETAIL PANEL (ONLY SHOWN IF WOD SELECTED) -->
        <div class="wod-sidebar-panel glass-card animate-fade-in" *ngIf="selectedWod && (!isFullscreen || isPaused || state === 'setup')">
          <div class="panel-header flex-between">
            <h3>{{ selectedWod.titulo }}</h3>
            <span class="badge" [class.badge-primary]="selectedWod.tipo === 'For Time' || selectedWod.tipo === 'AMRAP'" [class.badge-secondary]="selectedWod.tipo === 'EMOM' || selectedWod.tipo === 'Tabata'">
              {{ selectedWod.tipo }}
            </span>
          </div>

          <div class="panel-body mt-12">
            <!-- Suggested timer badge -->
            <div class="suggested-badge-alert" *ngIf="state === 'setup'">
              <span>💡 Modo sugerido: <strong>{{ selectedWod.tipo }}</strong></span>
              <button class="btn btn-primary btn-sm ml-12" (click)="applySuggestedConfig()">
                Aplicar
              </button>
            </div>

            <!-- Instructions -->
            <div class="wod-section mt-12" *ngIf="selectedWod.descripcion">
              <h5>Calentamiento / Notas:</h5>
              <p class="description-p">{{ selectedWod.descripcion }}</p>
            </div>

            <!-- Exercises -->
            <div class="wod-section mt-16">
              <h5>Ejercicios Programados:</h5>
              <div class="exercises-list-mini mt-8">
                <div class="exercise-mini-row" *ngFor="let we of selectedWod.wod_ejercicios; let idx = index">
                  <span class="ex-idx">{{ idx + 1 }}</span>
                  <div class="ex-info">
                    <span class="ex-name">{{ we.ejercicio?.nombre || 'Ejercicio' }}</span>
                    <span class="ex-specs">
                      <strong *ngIf="we.series">{{ we.series }}s </strong>
                      <span *ngIf="we.repeticiones">{{ we.repeticiones }} </span>
                      <span class="ex-details" *ngIf="we.detalles">({{ we.detalles }})</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .timer-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      transition: all 0.3s ease;
    }

    .title-grad {
      font-size: 2.2rem;
      background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 6px;
    }

    .subtitle {
      color: #71717a;
      font-size: 0.92rem;
    }

    /* Grid layout */
    .timer-layout-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      align-items: start;
    }

    @media (min-width: 992px) {
      .timer-layout-grid.with-wod {
        grid-template-columns: 1.3fr 1fr;
      }
    }

    /* Setup view styles */
    .timer-modes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-top: 16px;
      margin-bottom: 24px;
    }

    .mode-btn {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-md);
      padding: 18px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      color: #a1a1aa;
    }

    .mode-btn:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .mode-btn.active {
      background: rgba(0, 255, 136, 0.08);
      border-color: var(--primary);
      color: #fff;
      box-shadow: 0 0 15px rgba(0, 255, 136, 0.15);
    }

    .mode-icon {
      font-size: 1.8rem;
      margin-bottom: 8px;
    }

    .mode-name {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.95rem;
      margin-bottom: 4px;
    }

    .mode-desc {
      font-size: 0.72rem;
      opacity: 0.7;
      line-height: 1.2;
    }

    .time-inputs-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .time-inputs-row .form-control {
      text-align: center;
    }

    .colon {
      font-weight: bold;
      font-size: 1.2rem;
      color: #fff;
    }

    .info-text {
      color: #a1a1aa;
      font-size: 0.88rem;
      line-height: 1.5;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-glow);
    }

    .btn-lg-glow {
      width: 100%;
      padding: 16px;
      font-size: 1.1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Load WOD setup */
    .load-wod-card-setup {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 18px;
    }

    .mini-title {
      font-size: 0.88rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #71717a;
      margin-bottom: 10px;
    }

    .date-picker-input-sm {
      width: 140px;
      height: 38px;
      font-size: 0.85rem;
      padding: 8px 12px;
    }

    .wod-select {
      flex: 1;
      height: 38px;
      font-size: 0.85rem;
      padding: 4px 12px;
    }

    /* Active Timer Display CSS with glowing shadows */
    .timer-main-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      min-height: 380px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .timer-main-card.state-prep {
      box-shadow: 0 0 50px rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.3);
    }
    
    .timer-main-card.state-work {
      box-shadow: 0 0 50px rgba(0, 255, 136, 0.15);
      border-color: rgba(0, 255, 136, 0.3);
    }

    .timer-main-card.state-rest {
      box-shadow: 0 0 50px rgba(244, 63, 94, 0.15);
      border-color: rgba(244, 63, 94, 0.3);
    }

    .timer-main-card.state-finished {
      box-shadow: 0 0 60px rgba(139, 92, 246, 0.25);
      border-color: rgba(139, 92, 246, 0.4);
      background: linear-gradient(180deg, rgba(18, 18, 24, 0.7) 0%, rgba(139, 92, 246, 0.05) 100%);
    }

    .phase-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 0.82rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 20px;
    }

    .phase-prep {
      background: rgba(245, 158, 11, 0.15);
      color: var(--warning);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .phase-work {
      background: rgba(0, 255, 136, 0.15);
      color: var(--primary);
      border: 1px solid rgba(0, 255, 136, 0.3);
    }

    .phase-rest {
      background: rgba(244, 63, 94, 0.15);
      color: var(--danger);
      border: 1px solid rgba(244, 63, 94, 0.3);
    }

    .phase-cycle_rest {
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent);
      border: 1px solid rgba(6, 182, 212, 0.3);
    }

    .phase-finished {
      background: rgba(139, 92, 246, 0.2);
      color: #a855f7;
      border: 1px solid rgba(139, 92, 246, 0.4);
      animation: pulse 1.5s infinite;
    }

    .digital-clock {
      font-family: monospace, sans-serif;
      font-size: 6.5rem;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.02em;
      color: #fff;
      cursor: pointer;
      user-select: none;
      margin-bottom: 24px;
      transition: all 0.2s;
    }

    .state-prep .digital-clock {
      color: var(--warning);
      text-shadow: 0 0 25px rgba(245, 158, 11, 0.4);
    }

    .state-work .digital-clock {
      color: var(--primary);
      text-shadow: 0 0 25px rgba(0, 255, 136, 0.4);
    }

    .state-rest .digital-clock, .state-cycle_rest .digital-clock {
      color: var(--danger);
      text-shadow: 0 0 25px rgba(244, 63, 94, 0.4);
    }

    .state-finished .digital-clock {
      color: #fff;
      text-shadow: 0 0 35px rgba(139, 92, 246, 0.6);
    }

    .ms-digits {
      font-size: 3.5rem;
      opacity: 0.8;
    }

    .timer-details-row {
      display: flex;
      gap: 32px;
      justify-content: center;
      margin-bottom: 32px;
      width: 100%;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding: 16px 0;
    }

    .detail-box {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .detail-label {
      font-size: 0.68rem;
      color: #71717a;
      font-weight: 600;
      letter-spacing: 0.06em;
      margin-bottom: 4px;
    }

    .detail-value {
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 800;
      color: #fff;
    }

    /* Controls */
    .timer-controls-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .btn-circle {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      padding: 0;
      font-size: 1.1rem;
    }

    .btn-play-pause {
      height: 56px;
      border-radius: 28px;
      padding: 0 28px;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1rem;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      background: var(--primary);
      color: #09090b;
      box-shadow: 0 0 20px rgba(0, 255, 136, 0.25);
      transition: all 0.2s;
    }

    .btn-play-pause:hover {
      transform: scale(1.03);
      box-shadow: 0 0 30px rgba(0, 255, 136, 0.45);
    }

    .btn-play-pause.btn-paused {
      background: var(--secondary);
      color: #fff;
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
    }

    .btn-play-pause.btn-paused:hover {
      box-shadow: 0 0 30px rgba(139, 92, 246, 0.45);
    }

    /* Laps log */
    .laps-history-panel {
      width: 100%;
      max-width: 460px;
      text-align: left;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 16px;
    }

    .laps-history-panel h4 {
      font-size: 0.88rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #71717a;
      margin-bottom: 10px;
    }

    .laps-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 150px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .lap-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
    }

    .lap-idx {
      font-weight: 700;
      color: var(--primary);
    }

    .lap-val {
      color: #fff;
    }

    .lap-total {
      color: #71717a;
    }

    /* WOD Sidebar Panel */
    .wod-sidebar-panel {
      padding: 30px;
      border-radius: var(--radius-lg);
    }

    .suggested-badge-alert {
      background: rgba(0, 255, 136, 0.06);
      border: 1px solid rgba(0, 255, 136, 0.15);
      padding: 10px 14px;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .description-p {
      color: #a1a1aa;
      font-size: 0.88rem;
      line-height: 1.6;
      white-space: pre-line;
    }

    .exercises-list-mini {
      display: flex;
      flex-direction: column;
      gap: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: rgba(0, 0, 0, 0.15);
    }

    .exercise-mini-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .exercise-mini-row:last-child {
      border-bottom: none;
    }

    .ex-idx {
      color: var(--primary);
      font-weight: 800;
      font-size: 0.88rem;
      min-width: 14px;
    }

    .ex-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ex-name {
      color: #fff;
      font-weight: 600;
      font-size: 0.88rem;
    }

    .ex-specs {
      color: #a1a1aa;
      font-size: 0.8rem;
    }

    .ex-details {
      font-style: italic;
      color: #71717a;
    }

    /* FULLSCREEN CSS */
    .fullscreen {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: #09090b !important;
      z-index: 9999 !important;
      padding: 40px !important;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .fullscreen .timer-layout-grid {
      width: 100%;
      height: 80%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .fullscreen .timer-main-card {
      width: 100%;
      max-width: 800px;
      border: none;
      background: transparent;
      box-shadow: none;
      padding: 0;
    }

    .fullscreen .digital-clock {
      font-size: 14rem;
    }

    .fullscreen .ms-digits {
      font-size: 8rem;
    }

    .fullscreen-top-bar {
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10000;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 12px;
    }

    .fullscreen-wod-title {
      font-family: var(--font-display);
      font-size: 1.1rem;
      color: #fff;
    }

    @keyframes pulse {
      0% { opacity: 0.95; }
      50% { opacity: 0.7; }
      100% { opacity: 0.95; }
    }

    /* Responsive tweaks */
    @media (max-width: 768px) {
      .fullscreen {
        padding: 16px !important;
      }
      .fullscreen .digital-clock {
        font-size: 6.5rem;
      }
      .fullscreen .ms-digits {
        font-size: 3.5rem;
      }
      .digital-clock {
        font-size: 4.2rem;
      }
      .ms-digits {
        font-size: 2.2rem;
      }
      .timer-details-row {
        gap: 16px;
      }
      .detail-value {
        font-size: 1.1rem;
      }
    }
  `]
})
export class TimerComponent implements OnInit, OnDestroy {
  private supabaseService = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  // General Settings
  soundEnabled = true;
  isFullscreen = false;
  
  // Audio state
  private activeAudioElements: HTMLAudioElement[] = [];
  timerSoundConfig = {
    prep: 'mp3' as 'mp3' | 'beep' | 'none',
    halfTime: 'mp3' as 'mp3' | 'beep' | 'none',
    oneMinute: 'mp3' as 'mp3' | 'beep' | 'none',
    tenSeconds: 'mp3' as 'mp3' | 'beep' | 'none',
    lastRound: 'mp3' as 'mp3' | 'beep' | 'none',
    finished: 'mp3' as 'mp3' | 'beep' | 'none'
  };
  
  // Audio trigger flags
  private playedCuenta = false;
  private playedHalfTime = false;
  private playedOneMinute = false;
  private playedTenSeconds = false;
  private playedLastRound = false;
  
  // Timer States
  state: TimerState = 'setup';
  selectedMode: TimerMode = 'fortime';
  isPaused = true;

  // Configurations Model
  config = {
    prepTime: 10, // seconds
    // For Time
    forTimeDirection: 'up' as 'up' | 'down',
    timeCapMinutes: 20,
    // AMRAP
    amrapMinutes: 20,
    // EMOM
    emomIntervalMinutes: 1,
    emomIntervalSeconds: 0,
    emomRounds: 10,
    // Tabata
    tabataWorkSeconds: 20,
    tabataRestSeconds: 10,
    tabataRounds: 8,
    tabataCycles: 1,
    tabataCycleRestSeconds: 60
  };

  // Active Timer Counters
  currentRound = 1;
  totalRounds = 1;
  currentCycle = 1;

  // Running calculations
  private timerInterval: any = null;
  private startTime = 0;
  private elapsedOnPause = 0; // ms elapsed before pause
  private lastTickedSecond = -1;

  // Display strings
  displayTime = '00:00';
  displayTenths = '0';
  displayTotalElapsedTime = '00:00';

  // Stopwatch Laps
  laps: LapTime[] = [];
  private lastLapTime = 0; // ms at last lap mark

  // WOD Loader data
  wodDate = '';
  wodsList: Wod[] = [];
  wodSelectedId = '';
  selectedWod: Wod | null = null;

  // Web Audio Context for Beeps
  private audioCtx: AudioContext | null = null;

  ngOnInit(): void {
    // Default date to today
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    this.wodDate = new Date(now.getTime() - tzOffset).toISOString().split('T')[0];
    
    this.loadWods();
    this.loadSoundConfig();
  }

  loadSoundConfig(): void {
    this.supabaseService.getConfiguraciones().subscribe({
      next: (configs) => {
        const soundConfig = configs.find(c => c.clave === 'timer_sound_config');
        if (soundConfig && soundConfig.valor) {
          try {
            this.timerSoundConfig = { ...this.timerSoundConfig, ...JSON.parse(soundConfig.valor) };
          } catch (e) {
            console.error('Error parsing timer sound config:', e);
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading sound configurations:', err)
    });
  }

  ngOnDestroy(): void {
    this.clearTimerInterval();
    if (this.audioCtx) {
      this.audioCtx.close();
    }
    this.stopAllSounds();
  }

  // --- AUDIO SYNTHESIS & PLAYBACK ---
  private playBeep(frequency: number, durationMs: number): void {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = frequency;
      
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch (e) {
      console.warn('Audio synthesis not supported or blocked by browser', e);
    }
  }

  private playSound(soundFile: string): HTMLAudioElement | null {
    if (!this.soundEnabled) return null;
    try {
      const audio = new Audio(`sounds/${soundFile}`);
      audio.volume = 0.5;
      
      audio.onended = () => {
        this.activeAudioElements = this.activeAudioElements.filter(a => a !== audio);
      };
      
      this.activeAudioElements.push(audio);
      audio.play().catch(err => {
        console.warn(`Error playing sound ${soundFile}:`, err);
      });
      return audio;
    } catch (e) {
      console.warn(`Audio playback not supported for ${soundFile}:`, e);
      return null;
    }
  }

  private pauseAllSounds(): void {
    this.activeAudioElements.forEach(audio => {
      try {
        audio.pause();
      } catch (e) {}
    });
  }

  private resumeAllSounds(): void {
    if (!this.soundEnabled) return;
    this.activeAudioElements.forEach(audio => {
      try {
        audio.play().catch(() => {});
      } catch (e) {}
    });
  }

  private stopAllSounds(): void {
    this.activeAudioElements.forEach(audio => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {}
    });
    this.activeAudioElements = [];
  }

  toggleAudio(): void {
    this.soundEnabled = !this.soundEnabled;
    if (!this.soundEnabled) {
      this.pauseAllSounds();
    } else {
      this.resumeAllSounds();
    }
    // Resume context if enabling
    if (this.soundEnabled) {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.playBeep(440, 100); // feedback
    }
  }

  // --- SCREEN CONTROLS ---
  toggleFullscreen(): void {
    const element = document.querySelector('.timer-container');
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen()
        .then(() => {
          this.isFullscreen = true;
          this.cdr.detectChanges();
        })
        .catch(err => {
          console.error(`Error enabling fullscreen: ${err.message}`);
          // Fallback UI fullscreen
          this.isFullscreen = !this.isFullscreen;
          this.cdr.detectChanges();
        });
    } else {
      document.exitFullscreen()
        .then(() => {
          this.isFullscreen = false;
          this.cdr.detectChanges();
        })
        .catch(() => {
          this.isFullscreen = false;
          this.cdr.detectChanges();
        });
    }
  }

  // --- WOD DATABASE LOADER ---
  loadWods(): void {
    this.supabaseService.getWods(this.wodDate).subscribe({
      next: (wods) => {
        this.wodsList = wods;
        if (wods.length > 0) {
          // Auto-select first if none selected
          const match = wods.find(w => w.id === this.wodSelectedId);
          if (!match) {
            this.wodSelectedId = wods[0].id;
            this.selectedWod = wods[0];
          }
        } else {
          this.wodSelectedId = '';
          this.selectedWod = null;
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading WODs for timer:', err)
    });
  }

  onWodSelected(): void {
    const found = this.wodsList.find(w => w.id === this.wodSelectedId);
    this.selectedWod = found || null;
  }

  clearWod(): void {
    this.selectedWod = null;
    this.wodSelectedId = '';
  }

  applySuggestedConfig(): void {
    if (!this.selectedWod) return;
    
    const type = this.selectedWod.tipo;
    const method = WOD_TIMER_MAP[type];

    if (type === 'Tabata') {
      this.selectMode('tabata');
      this.config.tabataWorkSeconds = 20;
      this.config.tabataRestSeconds = 10;
      this.config.tabataRounds = 8;
      this.config.tabataCycles = 1;
    } else if (type === 'EMOM' || type === 'EOMOM') {
      this.selectMode('emom');
      this.config.emomIntervalMinutes = type === 'EOMOM' ? 2 : 1;
      this.config.emomIntervalSeconds = 0;
      this.config.emomRounds = 10; // Default
    } else if (type === 'AMRAP') {
      this.selectMode('amrap');
      this.config.amrapMinutes = 20; // Default AMRAP duration
    } else if (type === 'For Time' || type === 'RFT' || type === 'Chipper') {
      this.selectMode('fortime');
      this.config.forTimeDirection = 'up';
      this.config.timeCapMinutes = 20;
    } else {
      this.selectMode('stopwatch');
    }
    this.cdr.detectChanges();
  }

  // --- TIMER LOGIC ENGINE ---
  selectMode(mode: TimerMode): void {
    this.selectedMode = mode;
  }

  startTimer(): void {
    if (this.state !== 'setup') return;

    // Reset sound flags and stop any active sounds
    this.playedCuenta = false;
    this.playedHalfTime = false;
    this.playedOneMinute = false;
    this.playedTenSeconds = false;
    this.playedLastRound = false;
    this.stopAllSounds();

    // Initialize counters
    this.currentRound = 1;
    this.currentCycle = 1;
    this.laps = [];
    this.lastLapTime = 0;
    this.elapsedOnPause = 0;
    this.lastTickedSecond = -1;

    // Calculate total rounds if necessary
    if (this.selectedMode === 'tabata') {
      this.totalRounds = this.config.tabataRounds;
    } else if (this.selectedMode === 'emom') {
      this.totalRounds = this.config.emomRounds;
    } else {
      this.totalRounds = 1;
    }

    // Move to prep state if prepTime > 0, otherwise directly to work/running
    if (this.config.prepTime > 0) {
      this.state = 'prep';
    } else {
      this.state = (this.selectedMode === 'tabata' || this.selectedMode === 'emom') ? 'work' : 'work'; // General active state
    }

    this.isPaused = false;
    this.startTime = Date.now();
    
    // Play initial beep feedback
    this.playBeep(440, 100);

    this.clearTimerInterval();
    this.timerInterval = setInterval(() => this.tick(), 100);
    
    this.updateDisplays(0);
    this.cdr.detectChanges();
  }

  private tick(): void {
    if (this.isPaused || this.state === 'finished' || this.state === 'setup') return;

    const totalElapsedMs = (Date.now() - this.startTime) + this.elapsedOnPause;
    
    // Process according to state
    if (this.state === 'prep') {
      const prepTimeMs = this.config.prepTime * 1000;
      const remainingMs = prepTimeMs - totalElapsedMs;
      
      if (remainingMs <= 0) {
        // Preparation finished -> Go to work
        this.playBeep(1760, 500); // High pitched GO beep
        this.state = 'work';
        this.startTime = Date.now();
        this.elapsedOnPause = 0;
        this.lastTickedSecond = -1;
        this.updateDisplays(0);
      } else {
        const remainingSec = Math.ceil(remainingMs / 1000);
        const prepPref = this.timerSoundConfig.prep;
        
        // Custom Countdown Mp3 Trigger
        if (prepPref === 'mp3') {
          if (this.config.prepTime >= 10 && remainingMs <= 10000 && !this.playedCuenta) {
            this.playedCuenta = true;
            this.playSound('cuenta.mp3');
          }
        } else if (prepPref === 'beep') {
          // Play count downs for 3, 2, 1 seconds left as beep
          if (remainingSec <= 3 && remainingSec !== this.lastTickedSecond) {
            this.playBeep(880, 150);
            this.lastTickedSecond = remainingSec;
          }
        }
        this.updateDisplays(totalElapsedMs);
      }
    } else {
      // General active training states: work, rest, cycle_rest
      this.processActiveTimer(totalElapsedMs);
    }
    
    this.cdr.detectChanges();
  }

  private getTotalWorkoutDurationMs(): number {
    switch (this.selectedMode) {
      case 'fortime':
        return this.config.timeCapMinutes * 60 * 1000;
      case 'amrap':
        return this.config.amrapMinutes * 60 * 1000;
      case 'emom':
        return (this.config.emomIntervalMinutes * 60 + this.config.emomIntervalSeconds) * 1000 * this.config.emomRounds;
      case 'tabata':
        const workMs = this.config.tabataWorkSeconds * 1000;
        const restMs = this.config.tabataRestSeconds * 1000;
        const roundMs = workMs + restMs;
        const cycleDurationMs = (roundMs * this.config.tabataRounds) - restMs;
        const cycleRestMs = this.config.tabataCycleRestSeconds * 1000;
        return (cycleDurationMs * this.config.tabataCycles) + (cycleRestMs * (this.config.tabataCycles - 1));
      default:
        return 0;
    }
  }

  private checkGeneralTimeTriggers(elapsedMs: number, remainingMs: number, totalDurationMs: number): void {
    // 1. Half Time
    if (!this.playedHalfTime && elapsedMs >= totalDurationMs / 2) {
      this.playedHalfTime = true;
      const pref = this.timerSoundConfig.halfTime;
      if (pref === 'mp3') {
        this.playSound('half_time.mp3');
      } else if (pref === 'beep') {
        this.playBeep(1200, 300);
      }
    }

    // 2. One Minute
    if (!this.playedOneMinute && totalDurationMs >= 90000 && remainingMs <= 60000) {
      this.playedOneMinute = true;
      const pref = this.timerSoundConfig.oneMinute;
      if (pref === 'mp3') {
        this.playSound('one_minute.mp3');
      } else if (pref === 'beep') {
        this.playBeep(1200, 150);
        setTimeout(() => this.playBeep(1200, 150), 200);
      }
    }

    // 3. Ten Seconds
    if (!this.playedTenSeconds && totalDurationMs >= 20000 && remainingMs <= 10000) {
      this.playedTenSeconds = true;
      const pref = this.timerSoundConfig.tenSeconds;
      if (pref === 'mp3') {
        this.playSound('ten_seconds.mp3');
      } else if (pref === 'beep') {
        this.playBeep(1200, 100);
        setTimeout(() => this.playBeep(1200, 100), 150);
        setTimeout(() => this.playBeep(1200, 100), 300);
      }
    }
  }

  private processActiveTimer(totalElapsedMs: number): void {
    if (this.selectedMode === 'stopwatch') {
      this.updateDisplays(totalElapsedMs);
      return;
    }

    if (this.selectedMode === 'fortime') {
      const capMs = this.config.timeCapMinutes * 60 * 1000;
      if (totalElapsedMs >= capMs) {
        this.finishTimer();
      } else {
        const remainingMs = capMs - totalElapsedMs;
        this.checkGeneralTimeTriggers(totalElapsedMs, remainingMs, capMs);
        this.updateDisplays(totalElapsedMs);
      }
      return;
    }

    if (this.selectedMode === 'amrap') {
      const targetMs = this.config.amrapMinutes * 60 * 1000;
      const remainingMs = targetMs - totalElapsedMs;
      
      if (remainingMs <= 0) {
        this.finishTimer();
      } else {
        const remainingSec = Math.ceil(remainingMs / 1000);
        // Spoken cues (one minute, ten seconds, half time)
        this.checkGeneralTimeTriggers(totalElapsedMs, remainingMs, targetMs);
        // Play final beep count downs for 3, 2, 1 seconds left
        if (remainingSec <= 3 && remainingSec !== this.lastTickedSecond) {
          this.playBeep(880, 150);
          this.lastTickedSecond = remainingSec;
        }
        this.updateDisplays(totalElapsedMs);
      }
      return;
    }

    if (this.selectedMode === 'emom') {
      const intervalMs = (this.config.emomIntervalMinutes * 60 + this.config.emomIntervalSeconds) * 1000;
      const totalSessionMs = intervalMs * this.config.emomRounds;
      
      if (totalElapsedMs >= totalSessionMs) {
        this.finishTimer();
        return;
      }

      // Spoken cues for the entire session
      const remainingMs = totalSessionMs - totalElapsedMs;
      this.checkGeneralTimeTriggers(totalElapsedMs, remainingMs, totalSessionMs);

      // Calculate current round
      const newRound = Math.floor(totalElapsedMs / intervalMs) + 1;
      const msInCurrentRound = totalElapsedMs % intervalMs;
      const remainingInRoundMs = intervalMs - msInCurrentRound;
      const remainingInRoundSec = Math.ceil(remainingInRoundMs / 1000);

      // Check if new round started
      if (newRound !== this.currentRound) {
        this.currentRound = newRound;
        if (this.currentRound === this.totalRounds) {
          const pref = this.timerSoundConfig.lastRound;
          if (pref === 'mp3') {
            this.playSound('last_round.mp3');
          } else if (pref === 'beep') {
            this.playBeep(1760, 600);
          }
        } else {
          this.playBeep(1760, 400); // Start of new round beep
        }
      } else if (remainingInRoundSec <= 3 && remainingInRoundSec !== this.lastTickedSecond && remainingInRoundMs > 100) {
        this.playBeep(880, 120);
        this.lastTickedSecond = remainingInRoundSec;
      }

      this.updateDisplays(totalElapsedMs);
      return;
    }

    if (this.selectedMode === 'tabata') {
      const workMs = this.config.tabataWorkSeconds * 1000;
      const restMs = this.config.tabataRestSeconds * 1000;
      const cycleRestMs = this.config.tabataCycleRestSeconds * 1000;
      const roundMs = workMs + restMs;

      // Spoken cues for the entire Tabata session
      const totalSessionMs = this.getTotalWorkoutDurationMs();
      const remainingMs = totalSessionMs - totalElapsedMs;
      this.checkGeneralTimeTriggers(totalElapsedMs, remainingMs, totalSessionMs);

      // Calculate state inside the cycle
      const cycleElapsedMs = totalElapsedMs - this.getCycleOffsetMs();
      const currentCycleRoundsCount = this.config.tabataRounds;
      const cycleDurationMs = (roundMs * currentCycleRoundsCount) - restMs; // Last round rest is skipped if cycles > 1

      if (cycleElapsedMs >= cycleDurationMs) {
        // Cycle ended
        if (this.currentCycle < this.config.tabataCycles) {
          // Transition to CYCLE_REST
          this.state = 'cycle_rest';
          this.playBeep(440, 500); // low beep for cycle rest
          this.currentRound = 1;
          this.startTime = Date.now();
          this.elapsedOnPause = 0;
          this.currentCycle++;
          this.updateDisplays(0);
        } else {
          // Tabata fully finished
          this.finishTimer();
        }
        return;
      }

      // We are in a Cycle Rest phase
      if (this.state === 'cycle_rest') {
        const remainingCycleRestMs = cycleRestMs - totalElapsedMs;
        if (remainingCycleRestMs <= 0) {
          this.state = 'work';
          this.playBeep(1760, 500);
          this.startTime = Date.now();
          this.elapsedOnPause = 0;
          this.lastTickedSecond = -1;
          this.updateDisplays(0);
        } else {
          const remainingSec = Math.ceil(remainingCycleRestMs / 1000);
          if (remainingSec <= 3 && remainingSec !== this.lastTickedSecond) {
            this.playBeep(880, 150);
            this.lastTickedSecond = remainingSec;
          }
          this.updateDisplays(totalElapsedMs);
        }
        return;
      }

      // Normal round processing: WORK or REST
      const newRound = Math.floor(cycleElapsedMs / roundMs) + 1;
      const timeInRound = cycleElapsedMs % roundMs;
      
      let newPhase: TimerState = 'work';
      let phaseRemainingMs = 0;

      if (timeInRound < workMs) {
        newPhase = 'work';
        phaseRemainingMs = workMs - timeInRound;
      } else {
        newPhase = 'rest';
        phaseRemainingMs = roundMs - timeInRound;
      }

      if (newRound !== this.currentRound || newPhase !== this.state) {
        this.state = newPhase;
        this.currentRound = newRound;
        this.lastTickedSecond = -1;
        
        if (newPhase === 'work') {
          if (this.currentRound === this.totalRounds && this.currentCycle === this.config.tabataCycles) {
            const pref = this.timerSoundConfig.lastRound;
            if (pref === 'mp3') {
              this.playSound('last_round.mp3');
            } else if (pref === 'beep') {
              this.playBeep(1760, 600);
            }
          } else {
            this.playBeep(1760, 450); // GO WORK!
          }
        } else {
          this.playBeep(440, 400); // REST
        }
      } else {
        const remainingSec = Math.ceil(phaseRemainingMs / 1000);
        if (remainingSec <= 3 && remainingSec !== this.lastTickedSecond && phaseRemainingMs > 100) {
          this.playBeep(880, 120);
          this.lastTickedSecond = remainingSec;
        }
      }

      this.updateDisplays(totalElapsedMs);
    }
  }

  private getCycleOffsetMs(): number {
    if (this.selectedMode !== 'tabata') return 0;
    const workMs = this.config.tabataWorkSeconds * 1000;
    const restMs = this.config.tabataRestSeconds * 1000;
    const roundMs = workMs + restMs;
    const cycleDurationMs = (roundMs * this.config.tabataRounds) - restMs;
    const cycleRestMs = this.config.tabataCycleRestSeconds * 1000;

    let offset = 0;
    for (let c = 1; c < this.currentCycle; c++) {
      offset += cycleDurationMs + cycleRestMs;
    }
    return offset;
  }

  private finishTimer(): void {
    this.state = 'finished';
    this.isPaused = true;
    this.clearTimerInterval();
    this.displayTime = '00:00';
    this.displayTenths = '0';
    
    const pref = this.timerSoundConfig.finished;
    if (pref === 'mp3') {
      this.playSound('well_done.mp3');
    } else if (pref === 'beep') {
      // Triumph sound: three long/medium beeps
      setTimeout(() => this.playBeep(1760, 300), 0);
      setTimeout(() => this.playBeep(1760, 300), 400);
      setTimeout(() => this.playBeep(2200, 700), 800);
    }
  }

  private updateDisplays(totalElapsedMs: number): void {
    // 1. Total Elapsed display
    this.displayTotalElapsedTime = this.formatTimeMmSs(totalElapsedMs);

    // 2. Main digital clock display depending on phase/mode
    if (this.state === 'prep') {
      const prepTimeMs = this.config.prepTime * 1000;
      const rem = Math.max(0, prepTimeMs - totalElapsedMs);
      this.displayTime = this.formatTimeSecOnly(rem);
      return;
    }

    if (this.state === 'cycle_rest') {
      const cycleRestMs = this.config.tabataCycleRestSeconds * 1000;
      const rem = Math.max(0, cycleRestMs - totalElapsedMs);
      this.displayTime = this.formatTimeMmSs(rem);
      return;
    }

    if (this.selectedMode === 'stopwatch') {
      this.displayTime = this.formatTimeMmSs(totalElapsedMs);
      this.displayTenths = Math.floor((totalElapsedMs % 1000) / 100).toString();
      return;
    }

    if (this.selectedMode === 'fortime') {
      const capMs = this.config.timeCapMinutes * 60 * 1000;
      if (this.config.forTimeDirection === 'up') {
        this.displayTime = this.formatTimeMmSs(totalElapsedMs);
      } else {
        const rem = Math.max(0, capMs - totalElapsedMs);
        this.displayTime = this.formatTimeMmSs(rem);
      }
      return;
    }

    if (this.selectedMode === 'amrap') {
      const targetMs = this.config.amrapMinutes * 60 * 1000;
      const rem = Math.max(0, targetMs - totalElapsedMs);
      this.displayTime = this.formatTimeMmSs(rem);
      return;
    }

    if (this.selectedMode === 'emom') {
      const intervalMs = (this.config.emomIntervalMinutes * 60 + this.config.emomIntervalSeconds) * 1000;
      const msInCurrentRound = totalElapsedMs % intervalMs;
      const remainingInRoundMs = Math.max(0, intervalMs - msInCurrentRound);
      this.displayTime = this.formatTimeMmSs(remainingInRoundMs);
      return;
    }

    if (this.selectedMode === 'tabata') {
      const workMs = this.config.tabataWorkSeconds * 1000;
      const restMs = this.config.tabataRestSeconds * 1000;
      const roundMs = workMs + restMs;
      const cycleElapsedMs = totalElapsedMs - this.getCycleOffsetMs();
      const timeInRound = cycleElapsedMs % roundMs;

      if (this.state === 'work') {
        const rem = Math.max(0, workMs - timeInRound);
        this.displayTime = this.formatTimeSecOnly(rem);
      } else {
        const rem = Math.max(0, restMs - (timeInRound - workMs));
        this.displayTime = this.formatTimeSecOnly(rem);
      }
    }
  }

  // --- CONTROLS ACTIONS ---
  togglePlayPause(): void {
    if (this.state === 'setup' || this.state === 'finished') return;

    if (this.isPaused) {
      // Resume
      this.isPaused = false;
      this.startTime = Date.now();
      
      // Resume Audio Context if needed
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.clearTimerInterval();
      this.timerInterval = setInterval(() => this.tick(), 100);
      this.playBeep(1760, 100);
      this.resumeAllSounds();
    } else {
      // Pause
      this.isPaused = true;
      const elapsedThisPeriod = Date.now() - this.startTime;
      this.elapsedOnPause += elapsedThisPeriod;
      this.clearTimerInterval();
      this.playBeep(440, 100);
      this.pauseAllSounds();
    }
    this.cdr.detectChanges();
  }

  prevRound(): void {
    if (this.state === 'setup' || this.state === 'finished' || this.state === 'prep') return;

    if (this.selectedMode === 'tabata') {
      // Go back to start of current round or previous round
      const elapsedThisCycle = (Date.now() - this.startTime) + this.elapsedOnPause - this.getCycleOffsetMs();
      const workMs = this.config.tabataWorkSeconds * 1000;
      const restMs = this.config.tabataRestSeconds * 1000;
      const roundMs = workMs + restMs;

      let round = Math.floor(elapsedThisCycle / roundMs) + 1;
      const timeInRound = elapsedThisCycle % roundMs;

      if (timeInRound > 2000) {
        // Reset current round work
        const newElapsedTotal = this.getCycleOffsetMs() + ((round - 1) * roundMs);
        this.resetStartPointToMs(newElapsedTotal);
      } else if (round > 1) {
        // Go to previous round work
        const newElapsedTotal = this.getCycleOffsetMs() + ((round - 2) * roundMs);
        this.resetStartPointToMs(newElapsedTotal);
      } else if (this.currentCycle > 1) {
        // Go back to previous cycle rest or work
        this.currentCycle--;
        const previousCycleDurationMs = (roundMs * this.config.tabataRounds) - restMs;
        const newElapsedTotal = this.getCycleOffsetMs() + previousCycleDurationMs - 1000; // end of previous cycle
        this.resetStartPointToMs(newElapsedTotal);
      }
    } else if (this.selectedMode === 'emom') {
      const intervalMs = (this.config.emomIntervalMinutes * 60 + this.config.emomIntervalSeconds) * 1000;
      const totalElapsed = (Date.now() - this.startTime) + this.elapsedOnPause;
      const round = Math.floor(totalElapsed / intervalMs) + 1;
      const timeInRound = totalElapsed % intervalMs;

      if (timeInRound > 2000) {
        const newElapsedTotal = (round - 1) * intervalMs;
        this.resetStartPointToMs(newElapsedTotal);
      } else if (round > 1) {
        const newElapsedTotal = (round - 2) * intervalMs;
        this.resetStartPointToMs(newElapsedTotal);
      }
    }
  }

  nextRound(): void {
    if (this.state === 'setup' || this.state === 'finished' || this.state === 'prep') return;

    if (this.selectedMode === 'tabata') {
      const workMs = this.config.tabataWorkSeconds * 1000;
      const restMs = this.config.tabataRestSeconds * 1000;
      const roundMs = workMs + restMs;
      const elapsedThisCycle = (Date.now() - this.startTime) + this.elapsedOnPause - this.getCycleOffsetMs();
      const round = Math.floor(elapsedThisCycle / roundMs) + 1;
      const timeInRound = elapsedThisCycle % roundMs;

      if (timeInRound < workMs) {
        // Skip work, go to rest
        const newElapsedTotal = this.getCycleOffsetMs() + ((round - 1) * roundMs) + workMs;
        this.resetStartPointToMs(newElapsedTotal);
      } else {
        // Skip rest, go to next round work
        const newElapsedTotal = this.getCycleOffsetMs() + (round * roundMs);
        this.resetStartPointToMs(newElapsedTotal);
      }
    } else if (this.selectedMode === 'emom') {
      const intervalMs = (this.config.emomIntervalMinutes * 60 + this.config.emomIntervalSeconds) * 1000;
      const totalElapsed = (Date.now() - this.startTime) + this.elapsedOnPause;
      const round = Math.floor(totalElapsed / intervalMs) + 1;
      const newElapsedTotal = round * intervalMs;
      
      this.resetStartPointToMs(newElapsedTotal);
    }
  }

  private resetStartPointToMs(newElapsedMs: number): void {
    if (this.isPaused) {
      this.elapsedOnPause = newElapsedMs;
    } else {
      this.startTime = Date.now();
      this.elapsedOnPause = newElapsedMs;
    }
    this.lastTickedSecond = -1;
    this.updateDisplays(newElapsedMs);
    this.cdr.detectChanges();
  }

  canPrev(): boolean {
    if (this.state === 'setup' || this.state === 'finished' || this.state === 'prep') return false;
    return this.selectedMode === 'tabata' || this.selectedMode === 'emom';
  }

  canNext(): boolean {
    if (this.state === 'setup' || this.state === 'finished' || this.state === 'prep') return false;
    return this.selectedMode === 'tabata' || this.selectedMode === 'emom';
  }

  addLap(): void {
    if (this.selectedMode !== 'stopwatch' || this.state !== 'work') return;
    
    const totalElapsedMs = (Date.now() - this.startTime) + this.elapsedOnPause;
    const lapElapsedMs = totalElapsedMs - this.lastLapTime;
    this.lastLapTime = totalElapsedMs;

    this.laps.unshift({
      lapIndex: this.laps.length + 1,
      lapTimeStr: this.formatTimeMmSsMs(lapElapsedMs),
      totalTimeStr: this.formatTimeMmSsMs(totalElapsedMs)
    });
    
    this.playBeep(1200, 100);
    this.cdr.detectChanges();
  }

  resetToSetup(): void {
    this.clearTimerInterval();
    this.stopAllSounds();
    this.state = 'setup';
    this.isPaused = true;
    this.laps = [];
    this.lastLapTime = 0;
    this.elapsedOnPause = 0;
    this.displayTime = '00:00';
    this.displayTenths = '0';
    this.displayTotalElapsedTime = '00:00';
    this.cdr.detectChanges();
  }

  // --- UTILS FORMATTERS ---
  private formatTimeMmSs(ms: number): string {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${this.padZero(mins)}:${this.padZero(secs)}`;
  }

  private formatTimeMmSsMs(ms: number): string {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${this.padZero(mins)}:${this.padZero(secs)}.${tenths}`;
  }

  private formatTimeSecOnly(ms: number): string {
    const secs = Math.ceil(ms / 1000);
    return secs.toString();
  }

  private padZero(num: number): string {
    return num < 10 ? `0${num}` : num.toString();
  }

  private clearTimerInterval(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getPhaseLabel(): string {
    switch (this.state) {
      case 'prep': return 'Preparación';
      case 'work': return this.selectedMode === 'tabata' ? 'Trabajo' : 'Entrenando';
      case 'rest': return 'Descanso';
      case 'cycle_rest': return 'Descanso de Ciclo';
      case 'finished': return '¡Completado!';
      default: return '';
    }
  }
}
