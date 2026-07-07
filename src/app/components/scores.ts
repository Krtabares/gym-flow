import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { Miembro, Ejercicio, MarcaMiembro } from '../models';

interface ExercisePR {
  ejercicio: Ejercicio;
  bestMarca: MarcaMiembro;
  history: MarcaMiembro[];
}

@Component({
  selector: 'app-scores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="scores-container animate-fade-in">
      <!-- HEADER -->
      <div class="flex-between header-section">
        <div>
          <h1 class="title-grad">Rendimiento y PRs</h1>
          <p class="subtitle">Registra las marcas personales de los atletas y consulta las tablas de líderes del box.</p>
        </div>
      </div>

      <!-- TABS CONTROL -->
      <div class="tabs-navigation">
        <button 
          class="tab-btn" 
          [class.active]="activeTab === 'history'" 
          (click)="setTab('history')"
        >
          🏆 Historial de Atleta
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab === 'leaderboards'" 
          (click)="setTab('leaderboards')"
        >
          🥇 Tabla de Líderes
        </button>
      </div>

      <!-- TAB 1: ATHLETE PR HISTORY -->
      <div *ngIf="activeTab === 'history'" class="tab-content animate-fade-in">
        <div class="grid-layout">
          <!-- Side Panel: Select Athlete & Log Form -->
          <div class="flex-col gap-20">
            <div class="glass-card panel-card">
              <h3 class="panel-title">Seleccionar Atleta</h3>
              <div class="form-group">
                <label class="form-label">Miembro</label>
                <select 
                  class="form-control select-premium" 
                  [(ngModel)]="selectedMiembroId" 
                  (change)="onMiembroChange()"
                >
                  <option [value]="''">-- Seleccione un atleta --</option>
                  <option *ngFor="let m of miembros" [value]="m.id">
                    {{ m.nombre }} ({{ m.estado }})
                  </option>
                </select>
              </div>

              <!-- Quick stats when athlete selected -->
              <div class="quick-stats-grid mt-15" *ngIf="selectedMiembro">
                <div class="stat-box">
                  <span class="stat-label">Total Marcas</span>
                  <span class="stat-value text-cyan">{{ marcasMiembro.length }}</span>
                </div>
                <div class="stat-box">
                  <span class="stat-label">Récords Activos</span>
                  <span class="stat-value text-green">{{ athletePRs.length }}</span>
                </div>
              </div>
            </div>

            <!-- Record Log Form -->
            <div class="glass-card panel-card" *ngIf="selectedMiembro">
              <h3 class="panel-title">{{ isEditMode ? 'Editar Marca' : 'Registrar Nueva Marca' }}</h3>
              <form (submit)="saveMarca()">
                <div class="form-group">
                  <label class="form-label">Ejercicio</label>
                  <select 
                    class="form-control select-premium" 
                    name="ejercicio_id"
                    [(ngModel)]="marcaForm.ejercicio_id"
                    (change)="onExerciseFormChange()"
                    required
                    [disabled]="isEditMode"
                  >
                    <option value="">-- Seleccionar Ejercicio --</option>
                    <optgroup label="🏋️ Halterofilia">
                      <option *ngFor="let ex of filterExercisesByCategory('Halterofilia')" [value]="ex.id">
                        {{ ex.nombre }}
                      </option>
                    </optgroup>
                    <optgroup label="🤸 Gimnasia">
                      <option *ngFor="let ex of filterExercisesByCategory('Gimnasia')" [value]="ex.id">
                        {{ ex.nombre }}
                      </option>
                    </optgroup>
                    <optgroup label="🏃 Monoestructural">
                      <option *ngFor="let ex of filterExercisesByCategory('Monoestructural')" [value]="ex.id">
                        {{ ex.nombre }}
                      </option>
                    </optgroup>
                  </select>
                </div>

                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label">Valor (Marca)</label>
                    <input 
                      type="number" 
                      step="any"
                      class="form-control"
                      name="valor"
                      [(ngModel)]="marcaForm.valor"
                      placeholder="Ej. 100 o 240"
                      required
                    >
                  </div>
                  <div class="form-group">
                    <label class="form-label">Unidad</label>
                    <select 
                      class="form-control"
                      name="unidad"
                      [(ngModel)]="marcaForm.unidad"
                      required
                    >
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="lbs">Libras (lbs)</option>
                      <option value="reps">Repeticiones (reps)</option>
                      <option value="segundos">Segundos (sec)</option>
                      <option value="metros">Metros (m)</option>
                      <option value="calorias">Calorías (cal)</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Fecha del Log</label>
                  <input 
                    type="date"
                    class="form-control"
                    name="fecha"
                    [(ngModel)]="marcaForm.fecha"
                    required
                  >
                </div>

                <div class="form-group">
                  <label class="form-label">Notas (Opcional)</label>
                  <textarea 
                    class="form-control text-area-premium"
                    name="notas"
                    rows="2"
                    [(ngModel)]="marcaForm.notas"
                    placeholder="Ej. Strict, unbroken, PR anterior era..."
                  ></textarea>
                </div>

                <div class="flex-between form-actions mt-15">
                  <button 
                    type="button" 
                    class="btn btn-secondary" 
                    *ngIf="isEditMode"
                    (click)="resetForm()"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    class="btn btn-primary"
                    [disabled]="!marcaForm.ejercicio_id || !marcaForm.valor"
                  >
                    {{ isEditMode ? 'Actualizar' : 'Guardar Marca' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Main Content: Athlete Performance Summary -->
          <div class="main-panel">
            <!-- If no athlete selected -->
            <div class="glass-card empty-state" *ngIf="!selectedMiembro">
              <span class="empty-icon">🏆</span>
              <h3>Por favor, selecciona un atleta</h3>
              <p>Elige un atleta de la lista lateral para ver su perfil de marcas personales e historial.</p>
            </div>

            <!-- Athlete Profile -->
            <div class="flex-col gap-20" *ngIf="selectedMiembro">
              <div class="glass-card member-summary-card">
                <div class="member-header-row">
                  <div class="avatar-large">{{ selectedMiembro.nombre.charAt(0) }}</div>
                  <div>
                    <h2 class="member-title">{{ selectedMiembro.nombre }}</h2>
                    <p class="member-sub font-xs">
                      📧 {{ selectedMiembro.email || 'Sin correo' }} | 📞 {{ selectedMiembro.telefono || 'Sin teléfono' }}
                    </p>
                    <span class="badge mt-8" [class.badge-active]="selectedMiembro.estado === 'activo'"
                                         [class.badge-expired]="selectedMiembro.estado === 'vencido'"
                                         [class.badge-inactive]="selectedMiembro.estado === 'inactivo'">
                      {{ selectedMiembro.estado }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- List of Personal Records -->
              <div class="glass-card">
                <div class="flex-between list-header border-b">
                  <h3 class="panel-title">Mejores Marcas Personales (PRs)</h3>
                  <span class="text-muted font-xs">Haz clic en un ejercicio para ver el histórico</span>
                </div>

                <div class="prs-list" *ngIf="athletePRs.length > 0; else noPRs">
                  <div 
                    class="pr-item" 
                    *ngFor="let pr of athletePRs"
                    [class.selected]="selectedPrExercise?.ejercicio?.id === pr.ejercicio.id"
                    (click)="selectExerciseHistory(pr)"
                  >
                    <div class="pr-info">
                      <span class="category-indicator" [class]="getCategoryIndicatorClass(pr.ejercicio.categoria)"></span>
                      <div>
                        <span class="exercise-name font-semibold">{{ pr.ejercicio.nombre }}</span>
                        <span class="exercise-cat font-xs text-muted">{{ pr.ejercicio.categoria }}</span>
                      </div>
                    </div>
                    
                    <div class="pr-value-container">
                      <span class="pr-value">{{ formatValue(pr.bestMarca.valor, pr.bestMarca.unidad) }}</span>
                      <span class="pr-date font-xs text-muted">Acanzado: {{ formatDate(pr.bestMarca.fecha) }}</span>
                    </div>
                  </div>
                </div>
                <ng-template #noPRs>
                  <div class="empty-state-small">
                    <p class="text-muted">Aún no se han registrado marcas para este atleta.</p>
                  </div>
                </ng-template>
              </div>

              <!-- Progression History for Selected Exercise -->
              <div class="glass-card" *ngIf="selectedPrExercise">
                <div class="flex-between list-header border-b">
                  <div>
                    <h3 class="panel-title">Historial de Progreso: {{ selectedPrExercise.ejercicio.nombre }}</h3>
                    <p class="subtitle mt-4">Todos los intentos y logs ordenados por fecha.</p>
                  </div>
                  <button class="btn btn-secondary btn-icon-sm" (click)="closeExerciseHistory()">✕ Cerrar</button>
                </div>

                <div class="timeline">
                  <div class="timeline-item" *ngFor="let log of selectedPrExercise.history">
                    <div class="timeline-badge" [class.is-pr]="log.id === selectedPrExercise.bestMarca.id">
                      {{ log.id === selectedPrExercise.bestMarca.id ? '🥇' : '✓' }}
                    </div>
                    <div class="timeline-content glass-card">
                      <div class="flex-between">
                        <span class="timeline-value font-semibold">
                          {{ formatValue(log.valor, log.unidad) }}
                          <span class="pr-tag" *ngIf="log.id === selectedPrExercise.bestMarca.id">RECORD PERSONAL</span>
                        </span>
                        <span class="timeline-date font-xs text-muted">{{ formatDate(log.fecha) }}</span>
                      </div>
                      <p class="timeline-notes font-xs text-white" *ngIf="log.notas">{{ log.notas }}</p>
                      
                      <div class="timeline-actions mt-8 flex-gap-2">
                        <button class="btn-action border-cyan btn-sm-action" title="Editar" (click)="editMarca(log)">✏️</button>
                        <button class="btn-action border-danger btn-sm-action" title="Eliminar" (click)="deleteMarca(log.id)">🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: LEADERBOARDS -->
      <div *ngIf="activeTab === 'leaderboards'" class="tab-content animate-fade-in">
        <div class="glass-card filter-bar">
          <div class="form-group flex-grow">
            <label class="form-label">Seleccionar Ejercicio</label>
            <select 
              class="form-control select-premium" 
              [(ngModel)]="leaderboardExerciseId" 
              (change)="onLeaderboardExerciseChange()"
            >
              <option value="">-- Seleccionar un ejercicio para ver ranking --</option>
              <optgroup label="🏋️ Halterofilia">
                <option *ngFor="let ex of filterExercisesByCategory('Halterofilia')" [value]="ex.id">
                  {{ ex.nombre }}
                </option>
              </optgroup>
              <optgroup label="🤸 Gimnasia">
                <option *ngFor="let ex of filterExercisesByCategory('Gimnasia')" [value]="ex.id">
                  {{ ex.nombre }}
                </option>
              </optgroup>
              <optgroup label="🏃 Monoestructural">
                <option *ngFor="let ex of filterExercisesByCategory('Monoestructural')" [value]="ex.id">
                  {{ ex.nombre }}
                </option>
              </optgroup>
            </select>
          </div>
        </div>

        <div class="leaderboard-panel mt-20">
          <div class="glass-card" *ngIf="leaderboardExercise">
            <div class="flex-between list-header border-b">
              <div>
                <h2 class="leaderboard-title">🥇 Líderes del Box: {{ leaderboardExercise.nombre }}</h2>
                <p class="subtitle mt-4">Categoría: {{ leaderboardExercise.categoria }} | Equipamiento: {{ leaderboardExercise.equipamiento }}</p>
              </div>
              <span class="badge badge-category" [ngClass]="getCategoryClass(leaderboardExercise.categoria)">
                {{ leaderboardExercise.categoria }}
              </span>
            </div>

            <!-- Podium (Top 3) for premium wow factor! -->
            <div class="podium-container" *ngIf="leaderboardRecords.length > 0">
              <!-- Second Place -->
              <div class="podium-step step-2" *ngIf="leaderboardRecords[1]">
                <div class="podium-avatar">🥈</div>
                <span class="podium-name font-semibold">{{ leaderboardRecords[1].miembro?.nombre }}</span>
                <span class="podium-score">{{ formatValue(leaderboardRecords[1].valor, leaderboardRecords[1].unidad) }}</span>
                <div class="podium-pedestal pedestal-silver">2</div>
              </div>

              <!-- First Place -->
              <div class="podium-step step-1" *ngIf="leaderboardRecords[0]">
                <div class="podium-avatar">👑</div>
                <span class="podium-name font-bold">{{ leaderboardRecords[0].miembro?.nombre }}</span>
                <span class="podium-score text-cyan">{{ formatValue(leaderboardRecords[0].valor, leaderboardRecords[0].unidad) }}</span>
                <div class="podium-pedestal pedestal-gold">1</div>
              </div>

              <!-- Third Place -->
              <div class="podium-step step-3" *ngIf="leaderboardRecords[2]">
                <div class="podium-avatar">🥉</div>
                <span class="podium-name font-semibold">{{ leaderboardRecords[2].miembro?.nombre }}</span>
                <span class="podium-score">{{ formatValue(leaderboardRecords[2].valor, leaderboardRecords[2].unidad) }}</span>
                <div class="podium-pedestal pedestal-bronze">3</div>
              </div>
            </div>

            <!-- Table of all ranks -->
            <div class="table-container" *ngIf="leaderboardRecords.length > 0; else emptyLeaderboard">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th style="width: 80px;">Rango</th>
                    <th>Atleta</th>
                    <th>Récord Personal (PR)</th>
                    <th>Fecha del Log</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let record of leaderboardRecords; let idx = index">
                    <td class="font-bold">
                      <span class="rank-badge" [class.rank-1]="idx === 0" [class.rank-2]="idx === 1" [class.rank-3]="idx === 2">
                        #{{ idx + 1 }}
                      </span>
                    </td>
                    <td>
                      <div class="athlete-profile-row">
                        <div class="avatar-sm">{{ record.miembro?.nombre?.charAt(0) }}</div>
                        <span class="name font-semibold">{{ record.miembro?.nombre }}</span>
                      </div>
                    </td>
                    <td class="text-cyan font-bold">
                      {{ formatValue(record.valor, record.unidad) }}
                    </td>
                    <td class="text-muted font-xs">
                      {{ formatDate(record.fecha) }}
                    </td>
                    <td class="font-xs text-white">
                      {{ record.notas || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <ng-template #emptyLeaderboard>
              <div class="empty-state">
                <span class="empty-icon">🏋️‍♂️</span>
                <h3>Sin marcas registradas</h3>
                <p>Nadie ha registrado una marca para este ejercicio aún. ¡Sé el primero!</p>
              </div>
            </ng-template>
          </div>

          <!-- If no exercise selected -->
          <div class="glass-card empty-state" *ngIf="!leaderboardExercise">
            <span class="empty-icon">🥇</span>
            <h3>Selecciona un ejercicio</h3>
            <p>Elige un ejercicio del selector de arriba para visualizar el ranking y el podio de atletas.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scores-container {
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
    
    /* Tabs Navigation */
    .tabs-navigation {
      display: flex;
      gap: 12px;
      border-bottom: 1px solid var(--border-glow);
      padding-bottom: 8px;
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

    /* Layout structure */
    .grid-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 24px;
      align-items: start;
    }
    
    @media (max-width: 900px) {
      .grid-layout {
        grid-template-columns: 1fr;
      }
    }

    .flex-col {
      display: flex;
      flex-direction: column;
    }
    .gap-20 { gap: 20px; }
    .mt-15 { margin-top: 15px; }
    .mt-20 { margin-top: 20px; }
    .mt-8 { margin-top: 8px; }
    .mt-4 { margin-top: 4px; }
    .border-b { border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-xs { font-size: 0.75rem; }
    .text-cyan { color: var(--accent); }
    .text-green { color: var(--primary); }
    .text-white { color: #e4e4e7; }
    .w-full { width: 100%; }

    .panel-card {
      padding: 20px;
    }
    .panel-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 16px;
      font-family: var(--font-display);
    }

    /* Select Premium */
    .select-premium {
      background: rgba(0, 0, 0, 0.5);
      border-color: var(--border-glow);
    }
    .select-premium option, .select-premium optgroup {
      background: #0d0d12;
      color: #fff;
    }

    /* Quick stats */
    .quick-stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .stat-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-sm);
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .stat-label {
      font-size: 0.68rem;
      color: #71717a;
      text-transform: uppercase;
      font-weight: 600;
    }
    .stat-value {
      font-size: 1.4rem;
      font-weight: 800;
      font-family: var(--font-display);
    }

    /* Member Header Card */
    .member-summary-card {
      padding: 20px;
    }
    .member-header-row {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .avatar-large {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--accent) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      font-weight: 800;
      color: #fff;
      border: 2px solid var(--border-glow);
      box-shadow: 0 0 15px rgba(139, 92, 246, 0.15);
    }
    .member-title {
      font-size: 1.3rem;
      color: #fff;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .member-sub {
      color: #a1a1aa;
    }

    /* List layouts */
    .list-header {
      padding: 16px 24px;
    }
    .prs-list {
      display: flex;
      flex-direction: column;
      max-height: 400px;
      overflow-y: auto;
    }
    .pr-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .pr-item:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    .pr-item.selected {
      background: rgba(0, 255, 136, 0.03);
      border-left: 3px solid var(--primary);
    }
    .pr-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .category-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .indicator-halterofilia { background: var(--secondary); box-shadow: 0 0 8px var(--secondary); }
    .indicator-gimnasia { background: var(--accent); box-shadow: 0 0 8px var(--accent); }
    .indicator-monoestructural { background: var(--warning); box-shadow: 0 0 8px var(--warning); }
    
    .exercise-name {
      color: #fff;
      display: block;
    }
    .exercise-cat {
      display: block;
    }
    .pr-value-container {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .pr-value {
      font-weight: 800;
      color: var(--primary);
      font-size: 1.15rem;
      font-family: var(--font-display);
    }
    .pr-date {
      font-size: 0.7rem;
    }

    /* Timeline style for history */
    .timeline {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-height: 400px;
      overflow-y: auto;
      position: relative;
    }
    .timeline::before {
      content: '';
      position: absolute;
      left: 35px;
      top: 24px;
      bottom: 24px;
      width: 2px;
      background: rgba(255, 255, 255, 0.05);
    }
    .timeline-item {
      display: flex;
      gap: 20px;
      align-items: flex-start;
      position: relative;
    }
    .timeline-badge {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #1f1f29;
      border: 2px solid var(--border-glow);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      z-index: 10;
      flex-shrink: 0;
      margin-left: 12px;
    }
    .timeline-badge.is-pr {
      background: rgba(0, 255, 136, 0.1);
      border-color: var(--primary);
      box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
    }
    .timeline-content {
      flex-grow: 1;
      padding: 14px 18px;
    }
    .timeline-value {
      font-size: 1.05rem;
      color: #fff;
    }
    .pr-tag {
      font-size: 0.65rem;
      color: var(--primary);
      background: rgba(0, 255, 136, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 8px;
      font-weight: 700;
      border: 1px solid rgba(0, 255, 136, 0.2);
    }
    .timeline-notes {
      margin-top: 6px;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      border-left: 2px solid rgba(255, 255, 255, 0.1);
    }
    .timeline-actions {
      display: flex;
      justify-content: flex-end;
    }
    .btn-sm-action {
      padding: 4px 8px;
      font-size: 0.75rem;
      width: 28px;
      height: 28px;
    }

    /* Leaderboards Tab elements */
    .leaderboard-title {
      font-size: 1.4rem;
      color: #fff;
      font-weight: 800;
      font-family: var(--font-display);
    }
    
    /* Podium Layout */
    .podium-container {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 20px;
      padding: 30px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      background: linear-gradient(to top, rgba(0, 255, 136, 0.02) 0%, transparent 100%);
    }
    
    .podium-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 140px;
      transition: transform 0.2s ease;
    }
    .podium-step:hover {
      transform: translateY(-4px);
    }
    
    .podium-avatar {
      font-size: 2.2rem;
      margin-bottom: 8px;
      filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.1));
    }
    .podium-name {
      color: #fff;
      font-size: 0.88rem;
      text-align: center;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      width: 100%;
    }
    .podium-score {
      font-size: 1.25rem;
      font-weight: 800;
      margin-top: 4px;
      font-family: var(--font-display);
    }
    .podium-pedestal {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 800;
      font-size: 1.6rem;
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-bottom: none;
      font-family: var(--font-display);
    }
    
    .step-1 { order: 2; z-index: 5; }
    .step-2 { order: 1; }
    .step-3 { order: 3; }
    
    .step-1 .podium-pedestal {
      height: 100px;
      background: linear-gradient(180deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.02) 100%);
      border-color: rgba(234, 179, 8, 0.3);
      color: rgba(234, 179, 8, 0.8);
      text-shadow: 0 0 10px rgba(234, 179, 8, 0.3);
    }
    .step-2 .podium-pedestal {
      height: 70px;
      background: linear-gradient(180deg, rgba(161, 161, 170, 0.15) 0%, rgba(161, 161, 170, 0.02) 100%);
      border-color: rgba(161, 161, 170, 0.3);
      color: rgba(161, 161, 170, 0.8);
    }
    .step-3 .podium-pedestal {
      height: 50px;
      background: linear-gradient(180deg, rgba(180, 83, 9, 0.15) 0%, rgba(180, 83, 9, 0.02) 100%);
      border-color: rgba(180, 83, 9, 0.3);
      color: rgba(180, 83, 9, 0.8);
    }
    
    @media (max-width: 480px) {
      .podium-container {
        flex-direction: column;
        align-items: center;
        gap: 15px;
      }
      .podium-step {
        width: 100%;
      }
      .step-1 { order: 1; }
      .step-2 { order: 2; }
      .step-3 { order: 3; }
      .podium-pedestal {
        height: 35px !important;
      }
    }

    /* Rank Badges in table */
    .rank-badge {
      display: inline-flex;
      width: 28px;
      height: 28px;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-glow);
      font-size: 0.82rem;
    }
    .rank-1 {
      background: rgba(234, 179, 8, 0.15);
      border-color: rgba(234, 179, 8, 0.4);
      color: rgb(234, 179, 8);
    }
    .rank-2 {
      background: rgba(161, 161, 170, 0.15);
      border-color: rgba(161, 161, 170, 0.4);
      color: rgb(212, 212, 216);
    }
    .rank-3 {
      background: rgba(180, 83, 9, 0.15);
      border-color: rgba(180, 83, 9, 0.4);
      color: rgb(249, 115, 22);
    }
    .athlete-profile-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .avatar-sm {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--accent) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #fff;
      font-size: 0.72rem;
    }

    /* General category badges (matching exercises catalog) */
    .badge-category { font-size: 0.7rem; font-weight: 700; }
    .badge-gimnasia {
      background: rgba(6, 182, 212, 0.1);
      color: var(--accent);
      border: 1px solid rgba(6, 182, 212, 0.2);
    }
    .badge-halterofilia {
      background: rgba(139, 92, 246, 0.1);
      color: var(--secondary);
      border: 1px solid rgba(139, 92, 246, 0.2);
    }
    .badge-monoestructural {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    /* Common empty lists */
    .empty-state-small {
      padding: 30px;
      text-align: center;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: #71717a;
      gap: 12px;
      text-align: center;
      padding: 20px;
    }
    .empty-icon { font-size: 3rem; }
    .empty-state h3 { color: #fff; font-size: 1.25rem; font-weight: 600; }
    .empty-state p { font-size: 0.9rem; max-width: 320px; line-height: 1.4; }
  `]
})
export class ScoresComponent implements OnInit {
  private db = inject(SupabaseService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  activeTab: 'history' | 'leaderboards' = 'history';

  // Catalog data
  miembros: Miembro[] = [];
  ejercicios: Ejercicio[] = [];

  // Athlete History tab state
  selectedMiembroId = '';
  selectedMiembro: Miembro | null = null;
  marcasMiembro: MarcaMiembro[] = [];
  athletePRs: ExercisePR[] = [];
  selectedPrExercise: ExercisePR | null = null;

  // Record Form state
  isEditMode = false;
  editingMarcaId = '';
  marcaForm = this.getDefaultMarcaForm();

  // Leaderboards tab state
  leaderboardExerciseId = '';
  leaderboardExercise: Ejercicio | null = null;
  leaderboardRecords: MarcaMiembro[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    // Load members
    this.db.getMiembros().subscribe(mList => {
      this.miembros = mList;
      
      // Load exercises
      this.db.getEjercicios().subscribe(exList => {
        this.ejercicios = exList;

        // Check if query params specify a member to pre-load
        this.route.queryParams.subscribe(params => {
          const mId = params['miembroId'];
          if (mId) {
            const found = this.miembros.find(m => m.id === mId);
            if (found) {
              this.activeTab = 'history';
              this.selectedMiembroId = found.id;
              this.onMiembroChange();
            }
          }
        });

        this.cdr.markForCheck();
      });
    });
  }

  getDefaultMarcaForm() {
    return {
      ejercicio_id: '',
      valor: null as number | null,
      unidad: 'kg',
      fecha: new Date().toISOString().split('T')[0],
      notas: ''
    };
  }

  setTab(tab: 'history' | 'leaderboards'): void {
    this.activeTab = tab;
    
    // Automatically select first exercise for leaderboard if none selected
    if (tab === 'leaderboards' && !this.leaderboardExerciseId && this.ejercicios.length > 0) {
      // Find a popular exercise like Back Squat (e33) or Clean & Jerk (e21)
      const defaultEx = this.ejercicios.find(ex => ex.nombre === 'Back Squat') || this.ejercicios[0];
      this.leaderboardExerciseId = defaultEx.id;
      this.onLeaderboardExerciseChange();
    }
  }

  // ATHLETE TABS ACTIONS
  onMiembroChange(): void {
    if (!this.selectedMiembroId) {
      this.selectedMiembro = null;
      this.marcasMiembro = [];
      this.athletePRs = [];
      this.selectedPrExercise = null;
      this.resetForm();
      return;
    }

    this.selectedMiembro = this.miembros.find(m => m.id === this.selectedMiembroId) || null;
    this.resetForm();
    this.loadAthleteScores();
  }

  loadAthleteScores(): void {
    if (!this.selectedMiembroId) return;

    this.db.getMarcas(this.selectedMiembroId).subscribe(data => {
      this.marcasMiembro = data;
      this.calculateAthletePRs();
      
      // Keep exercise history updated if one is open
      if (this.selectedPrExercise) {
        const foundPR = this.athletePRs.find(pr => pr.ejercicio.id === this.selectedPrExercise!.ejercicio.id);
        if (foundPR) {
          this.selectedPrExercise = foundPR;
        } else {
          this.selectedPrExercise = null;
        }
      }

      this.cdr.markForCheck();
    });
  }

  calculateAthletePRs(): void {
    const prMap = new Map<string, MarcaMiembro[]>();
    
    // Group all attempts by exercise
    this.marcasMiembro.forEach(m => {
      if (!prMap.has(m.ejercicio_id)) {
        prMap.set(m.ejercicio_id, []);
      }
      prMap.get(m.ejercicio_id)!.push(m);
    });

    const prs: ExercisePR[] = [];
    prMap.forEach((history, ejId) => {
      const exercise = this.ejercicios.find(e => e.id === ejId);
      if (!exercise) return;

      // Find the best marca in history based on exercise properties
      let best = history[0];
      history.forEach(attempt => {
        if (this.isBetterMarca(attempt, best, exercise.categoria)) {
          best = attempt;
        }
      });

      // Sort history descending by date
      const sortedHistory = [...history].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      prs.push({
        ejercicio: exercise,
        bestMarca: best,
        history: sortedHistory
      });
    });

    // Sort PRs by exercise name
    this.athletePRs = prs.sort((a, b) => a.ejercicio.nombre.localeCompare(b.ejercicio.nombre));
  }

  isBetterMarca(attempt: MarcaMiembro, currentBest: MarcaMiembro, category: string): boolean {
    // For weightlifting/gymnastics: higher is better
    if (category === 'Halterofilia' || category === 'Gimnasia') {
      return attempt.valor > currentBest.valor;
    }
    // For mono-structural: depends on unit
    if (category === 'Monoestructural') {
      if (attempt.unidad === 'segundos' || attempt.unidad === 'minutos') {
        // Time based: lower is better
        return attempt.valor < currentBest.valor;
      }
      // Distance or calories: higher is better
      return attempt.valor > currentBest.valor;
    }
    return attempt.valor > currentBest.valor;
  }

  onExerciseFormChange(): void {
    const exId = this.marcaForm.ejercicio_id;
    if (!exId) return;

    const ex = this.ejercicios.find(e => e.id === exId);
    if (!ex) return;

    // Suggest logical default unit
    if (ex.categoria === 'Halterofilia') {
      this.marcaForm.unidad = 'kg';
    } else if (ex.categoria === 'Gimnasia') {
      this.marcaForm.unidad = 'reps';
    } else if (ex.categoria === 'Monoestructural') {
      if (ex.nombre.includes('Carrera') || ex.nombre.includes('Run') || ex.nombre.includes('Remo') || ex.nombre.includes('Row')) {
        this.marcaForm.unidad = 'segundos';
      } else {
        this.marcaForm.unidad = 'calorias';
      }
    }
  }

  selectExerciseHistory(pr: ExercisePR): void {
    this.selectedPrExercise = pr;
  }

  closeExerciseHistory(): void {
    this.selectedPrExercise = null;
  }

  // RECORD SAVE / UPDATE / DELETE
  saveMarca(): void {
    if (!this.selectedMiembroId || !this.marcaForm.ejercicio_id || this.marcaForm.valor === null) return;

    const payload: Omit<MarcaMiembro, 'id' | 'created_at'> = {
      miembro_id: this.selectedMiembroId,
      ejercicio_id: this.marcaForm.ejercicio_id,
      valor: Number(this.marcaForm.valor),
      unidad: this.marcaForm.unidad,
      fecha: this.marcaForm.fecha,
      notas: this.marcaForm.notas.trim() || undefined
    };

    if (this.isEditMode && this.editingMarcaId) {
      this.db.updateMarca(this.editingMarcaId, payload).subscribe(() => {
        this.loadAthleteScores();
        this.resetForm();
        alert('Marca actualizada correctamente.');
      });
    } else {
      this.db.createMarca(payload).subscribe(() => {
        this.loadAthleteScores();
        this.resetForm();
        alert('Nueva marca registrada con éxito.');
      });
    }
  }

  editMarca(log: MarcaMiembro): void {
    this.isEditMode = true;
    this.editingMarcaId = log.id;
    this.marcaForm = {
      ejercicio_id: log.ejercicio_id,
      valor: log.valor,
      unidad: log.unidad,
      fecha: log.fecha,
      notas: log.notas || ''
    };
  }

  deleteMarca(id: string): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta marca de rendimiento?')) {
      this.db.deleteMarca(id).subscribe(() => {
        this.loadAthleteScores();
        alert('Marca eliminada.');
      });
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.editingMarcaId = '';
    this.marcaForm = this.getDefaultMarcaForm();
  }

  // LEADERBOARDS TABS ACTIONS
  onLeaderboardExerciseChange(): void {
    if (!this.leaderboardExerciseId) {
      this.leaderboardExercise = null;
      this.leaderboardRecords = [];
      return;
    }

    this.leaderboardExercise = this.ejercicios.find(e => e.id === this.leaderboardExerciseId) || null;
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    const exercise = this.leaderboardExercise;
    if (!this.leaderboardExerciseId || !exercise) return;

    this.db.getMarcas(undefined, this.leaderboardExerciseId).subscribe(data => {
      // Find the BEST PR for each member for this exercise
      const bestByMiembro = new Map<string, MarcaMiembro>();
      
      data.forEach(m => {
        const existing = bestByMiembro.get(m.miembro_id);
        if (!existing) {
          bestByMiembro.set(m.miembro_id, m);
        } else {
          // Compare and keep better one
          if (this.isBetterMarca(m, existing, exercise.categoria)) {
            bestByMiembro.set(m.miembro_id, m);
          }
        }
      });

      // Convert map to list and sort
      let recordsList = Array.from(bestByMiembro.values());
      const cat = exercise.categoria;

      if (cat === 'Halterofilia' || cat === 'Gimnasia') {
        // High scores first
        recordsList.sort((a, b) => b.valor - a.valor);
      } else if (cat === 'Monoestructural') {
        // Inspect unit
        const testItem = recordsList[0];
        if (testItem && (testItem.unidad === 'segundos' || testItem.unidad === 'minutos')) {
          // Time based: Lower first (fastest)
          recordsList.sort((a, b) => a.valor - b.valor);
        } else {
          // Distance/Cals: Higher first
          recordsList.sort((a, b) => b.valor - a.valor);
        }
      } else {
        recordsList.sort((a, b) => b.valor - a.valor);
      }

      this.leaderboardRecords = recordsList;
      this.cdr.markForCheck();
    });
  }

  // HELPERS
  filterExercisesByCategory(category: string): Ejercicio[] {
    return this.ejercicios.filter(ex => ex.categoria === category);
  }

  getCategoryClass(category: string): string {
    switch (category) {
      case 'Gimnasia': return 'badge-gimnasia';
      case 'Halterofilia': return 'badge-halterofilia';
      case 'Monoestructural': return 'badge-monoestructural';
      default: return 'badge-equipment';
    }
  }

  getCategoryIndicatorClass(category: string): string {
    switch (category) {
      case 'Gimnasia': return 'category-indicator indicator-gimnasia';
      case 'Halterofilia': return 'category-indicator indicator-halterofilia';
      case 'Monoestructural': return 'category-indicator indicator-monoestructural';
      default: return 'category-indicator';
    }
  }

  formatValue(val: number, unit: string): string {
    if (unit === 'segundos') {
      const minutes = Math.floor(val / 60);
      const secs = Math.floor(val % 60);
      return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
    }
    return `${val} ${unit}`;
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  }
}
