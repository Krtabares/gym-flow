import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SupabaseService } from '../services/supabase.service';
import { Wod, WodEjercicio, Ejercicio, WodTipo, WOD_TYPES, WOD_TIMER_MAP } from '../models';
import { WodParserService } from '../services/wod-parser.service';

@Component({
  selector: 'app-wods',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wods-container animate-fade-in">
      <!-- HEADER SECTION -->
      <div class="flex-between header-section">
        <div>
          <h1 class="title-grad">Programación de WODs</h1>
          <p class="subtitle">Planifica, programa y gestiona los entrenamientos diarios para tus atletas.</p>
        </div>
        <button class="btn btn-primary" (click)="openAddModal()">
          <span>+ Programar WOD</span>
        </button>
      </div>

      <!-- DATE SELECTOR SECTION -->
      <div class="glass-card date-scheduler">
        <div class="date-controls">
          <button class="btn btn-secondary nav-date-btn" (click)="navigateDays(-1)" title="Día Anterior">
            ◀
          </button>
          
          <div class="date-picker-wrapper">
            <span class="calendar-icon">📅</span>
            <input 
              type="date" 
              class="form-control date-picker-input" 
              [(ngModel)]="selectedDate" 
              (change)="onDateChange()"
            />
          </div>

          <button class="btn btn-secondary nav-date-btn" (click)="navigateDays(1)" title="Día Siguiente">
            ▶
          </button>
        </div>

        <!-- Weekly Strip Navigation -->
        <div class="week-strip">
          <button 
            *ngFor="let day of weekDays" 
            class="strip-day-btn" 
            [class.active]="day.dateStr === selectedDate"
            (click)="selectDate(day.dateStr)"
          >
            <span class="day-name">{{ day.dayName }}</span>
            <span class="day-number">{{ day.dayNum }}</span>
            <span class="day-month">{{ day.monthName }}</span>
          </button>
        </div>
      </div>

      <!-- WODS DISPLAY SECTION -->
      <div class="wods-display-grid" *ngIf="wods.length > 0; else noWods">
        <div class="glass-card wod-detail-card" *ngFor="let wod of wods">
          <div class="wod-card-header flex-between">
            <div class="wod-title-wrapper">
              <span class="badge badge-wod-type" [ngClass]="getWodTypeClass(wod.tipo)">
                {{ wod.tipo }}
              </span>
              <h2>{{ wod.titulo }}</h2>
            </div>
            
            <div class="wod-actions flex-gap-2">
              <button class="btn btn-secondary btn-icon-sm" (click)="openEditModal(wod)" title="Editar WOD">
                ✏️
              </button>
              <button class="btn btn-danger btn-icon-sm" (click)="deleteWod(wod.id)" title="Eliminar WOD">
                🗑️
              </button>
            </div>
          </div>

          <div class="wod-card-body">
            <!-- Timer Suggestion -->
            <div class="timer-info-alert">
              <span class="timer-icon">⏱️</span>
              <div>
                <strong>Cronómetro Sugerido:</strong> 
                <span class="timer-method">{{ getTimerMethodLabel(wod.tipo) }}</span>
              </div>
            </div>

            <!-- General Description -->
            <div class="wod-desc-section" *ngIf="wod.descripcion">
              <h4>Instrucciones y Calentamiento</h4>
              <p class="description-text">{{ wod.descripcion }}</p>
            </div>

            <!-- Exercises list -->
            <div class="wod-exercises-section">
              <h4>Ejercicios Programados</h4>
              <div class="exercises-list-table" *ngIf="wod.wod_ejercicios && wod.wod_ejercicios.length > 0; else noExercisesInWod">
                <div class="exercise-item-row" *ngFor="let we of wod.wod_ejercicios; let i = index">
                  <span class="exercise-order">{{ i + 1 }}</span>
                  <div class="exercise-main-info">
                    <span class="exercise-name">{{ we.ejercicio?.nombre || 'Ejercicio Eliminado' }}</span>
                    <span class="exercise-category-badge" [ngClass]="getCategoryBadgeClass(we.ejercicio?.categoria)">
                      {{ we.ejercicio?.categoria || 'Desconocido' }}
                    </span>
                  </div>
                  
                  <div class="exercise-specs">
                    <span class="spec-series" *ngIf="we.series">
                      <strong>{{ we.series }}</strong> series
                    </span>
                    <span class="spec-reps" *ngIf="we.repeticiones">
                      <strong>{{ we.repeticiones }}</strong> reps
                    </span>
                    <span class="spec-details" *ngIf="we.detalles">
                      💬 {{ we.detalles }}
                    </span>
                  </div>
                </div>
              </div>
              <ng-template #noExercisesInWod>
                <div class="no-exercises-alert">No hay ejercicios específicos añadidos a este WOD.</div>
              </ng-template>
            </div>
          </div>
        </div>
      </div>

      <!-- NO WODS TEMPLATE -->
      <ng-template #noWods>
        <div class="glass-card empty-state">
          <div class="empty-icon">📋</div>
          <h3>No hay entrenamientos programados</h3>
          <p>No se ha programado ningún WOD para el {{ selectedDate | date:'dd/MM/yyyy' }}.</p>
          <button class="btn btn-primary mt-15" (click)="openAddModal()">Programar WOD Ahora</button>
        </div>
      </ng-template>

      <!-- WOD FORM MODAL -->
      <div class="modal-backdrop" *ngIf="showModal">
        <div class="glass-card modal-content wod-modal animate-fade-in">
          <div class="flex-between modal-header">
            <h3>{{ isEditMode ? 'Editar WOD Programado' : 'Programar Nuevo WOD' }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>

          <!-- BOTÓN TOGGLE DE PANEL IA (Sólo en modo creación) -->
          <div class="ai-toggle-container" *ngIf="!isEditMode">
            <button type="button" class="btn btn-secondary btn-ai-toggle" [class.active]="showAiPanel" (click)="toggleAiPanel()">
              ✨ {{ showAiPanel ? 'Ocultar Creador Rápido con IA' : 'Rellenar con IA (Texto Plano)' }}
            </button>
          </div>

          <!-- PANEL CREADOR RÁPIDO CON IA -->
          <div class="glass-card ai-fast-card animate-fade-in" *ngIf="showAiPanel && !isEditMode">
            <div class="ai-card-header">
              <span class="ai-sparkle">🤖</span>
              <div>
                <h4>Asistente Inteligente de WODs</h4>
                <p class="ai-subtitle">Pega tu entrenamiento en texto libre o sube una imagen de la pizarra. Extraeremos los ejercicios.</p>
              </div>
            </div>

            <div class="form-group mt-10">
              <textarea 
                class="form-control text-area ai-textarea" 
                rows="4" 
                [(ngModel)]="aiInputText" 
                placeholder="Ejemplo:&#10;AMRAP 15 min&#10;15 Burpees&#10;50 Saltos dobles&#10;10 Dominadas"
              ></textarea>
            </div>

            <!-- Carga de Imagen -->
            <div class="ai-image-upload-section">
              <label class="ai-image-upload-label" *ngIf="!aiSelectedImage">
                <span class="upload-icon">📷</span>
                <span class="upload-text">Subir imagen del WOD (pizarra, pantalla, etc.)</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  class="hidden-file-input" 
                  (change)="onAiImageSelected($event)"
                />
              </label>

              <div class="ai-image-preview-container" *ngIf="aiSelectedImage">
                <div class="image-preview-wrapper">
                  <img [src]="'data:' + aiSelectedImage.mimeType + ';base64,' + aiSelectedImage.data" class="ai-image-preview" alt="Vista previa del WOD" />
                  <div class="image-info">
                    <span class="image-name">{{ aiSelectedImage.name }}</span>
                  </div>
                </div>
                <button type="button" class="btn-remove-image" (click)="clearAiSelectedImage()" title="Eliminar imagen">✕</button>
              </div>
            </div>

            <div class="flex-between ai-actions">
              <span class="ai-provider-badge">
                Motor: <strong>{{ getAiProviderLabel() }}</strong>
              </span>
              <button type="button" class="btn btn-primary btn-sm flex-align-center" (click)="processTextWithAi()" [disabled]="isAiLoading || (!aiInputText.trim() && !aiSelectedImage)">
                <span class="btn-spinner" *ngIf="isAiLoading"></span>
                <span>{{ isAiLoading ? 'Analizando...' : 'Procesar con IA' }}</span>
              </button>
            </div>

            <!-- Banner de Feedback -->
            <div class="ai-feedback-banner mt-10 flex-align-center" *ngIf="aiFeedbackMessage" [ngClass]="'banner-' + aiFeedbackType">
              <span class="btn-spinner" *ngIf="isAiLoading" style="border-top-color: currentColor; margin-right: 8px;"></span>
              <span>{{ aiFeedbackMessage }}</span>
            </div>
          </div>

          <!-- VISTA PREVIA DE BLOQUES DETECTADOS CON IA -->
          <div class="parsed-blocks-preview animate-fade-in" *ngIf="parsedWodBlocks.length > 0 && !isEditMode">
            <h4 class="preview-title">📋 Bloques Detectados (Revisa y edita antes de guardar)</h4>
            
            <div class="parsed-block-card glass-card" *ngFor="let bloque of parsedWodBlocks; let bIdx = index">
              <div class="block-card-header flex-between">
                <h5>Bloque {{ bIdx + 1 }}</h5>
                <button type="button" class="btn-remove-block" (click)="removeParsedBlock(bIdx)" title="Descartar Bloque">✕ Quitar</button>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Título del Bloque</label>
                  <input type="text" class="form-control" name="block_titulo_{{bIdx}}" [(ngModel)]="bloque.titulo" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Tipo de WOD</label>
                  <select class="form-control" name="block_tipo_{{bIdx}}" [(ngModel)]="bloque.tipo" required>
                    <option *ngFor="let t of wodTypes" [value]="t">{{ t }}</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Instrucciones / Calentamiento</label>
                <textarea class="form-control text-area block-textarea" name="block_desc_{{bIdx}}" rows="2" [(ngModel)]="bloque.descripcion" placeholder="Notas, calentamiento o escala de este bloque..."></textarea>
              </div>

              <div class="block-exercises-preview">
                <div class="flex-between align-center mb-10">
                  <h6 style="margin: 0;">Ejercicios Mapeados ({{ bloque.ejercicios.length }})</h6>
                  <button type="button" class="btn-add-ex-inline" (click)="addPlaceholderExercise(bloque)">
                    ➕ Añadir Ejercicio
                  </button>
                </div>
                <div class="exercise-preview-list" *ngIf="bloque.ejercicios.length > 0; else noExPreview">
                  <div class="ex-preview-item animate-fade-in" *ngFor="let item of bloque.ejercicios; let eIdx = index">
                    <div class="ex-preview-row">
                      <div class="flex-gap-2 align-center">
                        <span class="ex-preview-number">{{ eIdx + 1 }}</span>
                        <select 
                          class="form-control select-control ex-selector-dropdown" 
                          [class.unmatched]="!item.ejercicio_id"
                          name="ex_select_{{bIdx}}_{{eIdx}}" 
                          [(ngModel)]="item.ejercicio_id"
                        >
                          <option value="" disabled *ngIf="!item.ejercicio_id">⚠️ No coincide: "{{ item.matchedEjercicioName }}"</option>
                          <option *ngFor="let ex of catalogEjercicios" [value]="ex.id">{{ ex.nombre }}</option>
                        </select>
                        <button 
                          type="button" 
                          class="btn-create-ex-inline" 
                          [class.highlight]="!item.ejercicio_id"
                          (click)="openQuickCreateForParsedBlock(bloque, eIdx)" 
                          [title]="!item.ejercicio_id ? 'Crear este ejercicio en el catálogo' : 'Crear nuevo ejercicio en catálogo'"
                        >
                          {{ !item.ejercicio_id ? '➕ Registrar' : '➕ Nuevo' }}
                        </button>
                      </div>

                      <div class="ex-preview-specs">
                        <input 
                          type="number" 
                          class="form-control form-control-sm ex-spec-input" 
                          placeholder="Series" 
                          name="ex_series_{{bIdx}}_{{eIdx}}" 
                          [(ngModel)]="item.series" 
                          style="width: 70px;"
                          min="1"
                        >
                        <input 
                          type="text" 
                          class="form-control form-control-sm ex-spec-input" 
                          placeholder="Reps" 
                          name="ex_reps_{{bIdx}}_{{eIdx}}" 
                          [(ngModel)]="item.repeticiones" 
                          style="width: 80px;"
                        >
                        <input 
                          type="text" 
                          class="form-control form-control-sm ex-spec-input" 
                          placeholder="Detalles" 
                          name="ex_detalles_{{bIdx}}_{{eIdx}}" 
                          [(ngModel)]="item.detalles" 
                          style="width: 140px;"
                        >
                        <button type="button" class="btn-remove-ex-tag" (click)="removeExerciseFromParsedBlock(bloque, eIdx)" title="Quitar Ejercicio">✕</button>
                      </div>
                    </div>
                  </div>
                </div>
                <ng-template #noExPreview>
                  <div class="no-exercises-alert-form">No se detectaron exercises específicos en este bloque.</div>
                </ng-template>
              </div>
            </div>

            <div class="flex-between form-actions preview-actions">
              <button type="button" class="btn btn-secondary" (click)="discardParsedBlocks()">Volver al Formulario</button>
              <button type="button" class="btn btn-primary btn-save-all flex-align-center" (click)="saveAllParsedBlocks()" [disabled]="isAiLoading || parsedWodBlocks.length === 0">
                <span class="btn-spinner" *ngIf="isAiLoading"></span>
                <span>Guardar todos los bloques ({{ parsedWodBlocks.length }})</span>
              </button>
            </div>
          </div>

          <form *ngIf="parsedWodBlocks.length === 0 || isEditMode" (submit)="$event.preventDefault(); saveWod()">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Título del WOD</label>
                <input 
                  type="text" 
                  class="form-control" 
                  name="titulo" 
                  [(ngModel)]="wodForm.titulo" 
                  required 
                  placeholder="Ej. Murph, Acondicionamiento Diario"
                >
              </div>

              <div class="form-group">
                <label class="form-label">Fecha</label>
                <input 
                  type="date" 
                  class="form-control" 
                  name="fecha" 
                  [(ngModel)]="wodForm.fecha" 
                  required
                >
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Tipo de WOD</label>
                <select 
                  class="form-control" 
                  name="tipo" 
                  [(ngModel)]="wodForm.tipo" 
                  (change)="onWodTypeChange()"
                  required
                >
                  <option *ngFor="let t of wodTypes" [value]="t">{{ t }}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Método de Cronómetro</label>
                <div class="timer-method-badge" [attr.data-timer-type]="WOD_TIMER_MAP[wodForm.tipo]">
                  ⏱️ {{ getTimerMethodLabel(wodForm.tipo) }}
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Instrucciones / Calentamiento / Notas</label>
              <textarea 
                class="form-control text-area" 
                name="descripcion" 
                rows="3"
                [(ngModel)]="wodForm.descripcion" 
                placeholder="Detalla el calentamiento, escalas (RX/Scaled) o explicaciones adicionales..."
              ></textarea>
            </div>

            <!-- EXERCISES PICKER SECTION IN MODAL -->
            <div class="modal-exercises-picker">
              <div class="flex-between section-title-row">
                <h4>Ejercicios del WOD</h4>
                <span class="exercises-counter">{{ wodFormEjercicios.length }} añadidos</span>
              </div>

              <!-- Search/Add Exercise Catalog -->
              <div class="exercise-search-section">
                <div class="search-input-wrapper">
                  <input 
                    type="text" 
                    class="form-control" 
                    placeholder="Buscar ejercicio para añadir... (Ej. Air Squat)" 
                    [(ngModel)]="exerciseSearchQuery"
                    name="exerciseSearch"
                    (input)="filterExercises()"
                  />
                  <!-- Search dropdown list -->
                  <div class="search-results-dropdown" *ngIf="exerciseSearchQuery.trim() !== ''">
                    <div 
                      *ngFor="let ex of filteredCatalogEjercicios" 
                      class="dropdown-item"
                      (click)="addExerciseToWod(ex)"
                    >
                      <span class="ex-name">{{ ex.nombre }}</span>
                      <span class="ex-cat">{{ ex.categoria }}</span>
                    </div>

                    <div class="dropdown-empty" *ngIf="filteredCatalogEjercicios.length === 0">
                      <p>No se encontró el ejercicio <strong>"{{ exerciseSearchQuery }}"</strong></p>
                      <button type="button" class="btn btn-primary btn-sm mt-5" (click)="openQuickCreateExercise()">
                        ➕ Crear Ejercicio Rápido
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Selected Exercises List -->
              <div class="selected-exercises-list">
                <div 
                  *ngFor="let item of wodFormEjercicios; let idx = index" 
                  class="form-exercise-item"
                >
                  <div class="item-header flex-between">
                    <div class="item-title">
                      <span class="item-idx">{{ idx + 1 }}</span>
                      <strong>{{ getExerciseName(item.ejercicio_id) }}</strong>
                    </div>
                    
                    <div class="item-actions flex-gap-2">
                      <button type="button" class="btn-order-arrow" (click)="moveExercise(idx, -1)" [disabled]="idx === 0" title="Subir">▲</button>
                      <button type="button" class="btn-order-arrow" (click)="moveExercise(idx, 1)" [disabled]="idx === wodFormEjercicios.length - 1" title="Bajar">▼</button>
                      <button type="button" class="btn-remove-ex" (click)="removeExerciseFromWod(idx)" title="Quitar">✕</button>
                    </div>
                  </div>

                  <div class="item-fields-grid">
                    <div class="form-group mini">
                      <label class="form-label">Series</label>
                      <input 
                        type="number" 
                        class="form-control form-control-sm" 
                        [(ngModel)]="item.series" 
                        [name]="'series_' + idx" 
                        placeholder="Opcional"
                        min="1"
                      />
                    </div>
                    <div class="form-group mini">
                      <label class="form-label">Reps / Cantidad</label>
                      <input 
                        type="text" 
                        class="form-control form-control-sm" 
                        [(ngModel)]="item.repeticiones" 
                        [name]="'reps_' + idx" 
                        placeholder="Ej. 21-15-9, 10 cal"
                      />
                    </div>
                    <div class="form-group mini wide">
                      <label class="form-label">Pesos / Detalles</label>
                      <input 
                        type="text" 
                        class="form-control form-control-sm" 
                        [(ngModel)]="item.detalles" 
                        [name]="'detalles_' + idx" 
                        placeholder="Ej. RX 40/30 kg, Unbroken"
                      />
                    </div>
                  </div>
                </div>

                <div class="empty-list-indicator" *ngIf="wodFormEjercicios.length === 0">
                  Busca e incorpora ejercicios en la barra de arriba.
                </div>
              </div>
            </div>

            <div class="flex-between form-actions">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary">{{ isEditMode ? 'Guardar Cambios' : 'Programar WOD' }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- QUICK CREATE EXERCISE SUB-MODAL -->
      <div class="modal-backdrop sub-modal" *ngIf="showQuickCreateModal">
        <div class="glass-card modal-content quick-exercise-modal animate-fade-in">
          <div class="flex-between modal-header">
            <h3>Crear Ejercicio Rápido</h3>
            <button class="close-btn" (click)="closeQuickCreate()">✕</button>
          </div>

          <form (submit)="$event.preventDefault(); saveQuickExercise()">
            <div class="form-group">
              <label class="form-label">Nombre del Ejercicio</label>
              <input 
                type="text" 
                class="form-control" 
                name="quickNombre" 
                [(ngModel)]="quickExerciseForm.nombre" 
                required 
                placeholder="Ej. Kettlebell Thruster"
              >
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Categoría</label>
                <select 
                  class="form-control" 
                  name="quickCategoria" 
                  [(ngModel)]="quickExerciseForm.categoria" 
                  required
                >
                  <option value="Gimnasia">🤸 Gimnasia</option>
                  <option value="Halterofilia">🏋️ Halterofilia</option>
                  <option value="Monoestructural">🏃 Monoestructural</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Equipamiento</label>
                <input 
                  type="text" 
                  class="form-control" 
                  name="quickEquipamiento" 
                  [(ngModel)]="quickExerciseForm.equipamiento" 
                  required 
                  placeholder="Ej. Barra, Kettlebell, Mancuerna"
                >
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Descripción corta (Opcional)</label>
              <textarea 
                class="form-control text-area" 
                name="quickDescripcion" 
                rows="2"
                [(ngModel)]="quickExerciseForm.descripcion" 
                placeholder="Indica la técnica del ejercicio..."
              ></textarea>
            </div>

            <div class="flex-between form-actions">
              <button type="button" class="btn btn-secondary" (click)="closeQuickCreate()">Cancelar</button>
              <button type="submit" class="btn btn-primary">Crear y Añadir</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .wods-container {
      display: flex;
      flex-direction: column;
      gap: 28px;
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

    /* Date scheduler */
    .date-scheduler {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 30px;
    }
    .date-controls {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .nav-date-btn {
      width: 44px;
      height: 44px;
      padding: 0;
      border-radius: 50%;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .nav-date-btn:hover {
      transform: scale(1.05);
      border-color: var(--primary);
      box-shadow: 0 0 10px rgba(0, 255, 136, 0.15);
    }
    .date-picker-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .calendar-icon {
      position: absolute;
      left: 16px;
      font-size: 1.15rem;
      pointer-events: none;
      color: #a1a1aa;
    }
    .date-picker-input {
      padding-left: 48px;
      font-size: 1.05rem;
      font-weight: 600;
      width: 240px;
      color: #fff;
      text-align: center;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid var(--border-glow);
      height: 45px;
    }
    .date-picker-input::-webkit-calendar-picker-indicator {
      filter: invert(1);
      cursor: pointer;
      opacity: 0.7;
    }

    /* Week Strip */
    .week-strip {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 12px;
      width: 100%;
      max-width: 820px;
    }
    .strip-day-btn {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-md);
      padding: 14px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      color: #a1a1aa;
    }
    .strip-day-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      transform: translateY(-2px);
    }
    .strip-day-btn.active {
      background: rgba(0, 255, 136, 0.08);
      border-color: var(--primary);
      color: #fff;
      box-shadow: 0 0 16px rgba(0, 255, 136, 0.2);
    }
    .strip-day-btn .day-name {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      opacity: 0.8;
      letter-spacing: 0.06em;
    }
    .strip-day-btn .day-number {
      font-size: 1.4rem;
      font-weight: 800;
      margin: 4px 0;
      font-family: var(--font-display);
    }
    .strip-day-btn .day-month {
      font-size: 0.68rem;
      opacity: 0.7;
    }

    /* Wods Grid & Detail Card */
    .wods-display-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 28px;
    }
    .wod-detail-card {
      padding: 36px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .wod-card-header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 20px;
      margin-bottom: 4px;
    }
    .wod-title-wrapper {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .wod-title-wrapper h2 {
      font-size: 1.8rem;
      color: #fff;
      font-weight: 800;
    }
    .badge-wod-type {
      font-size: 0.78rem;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
    }

    /* WOD type colors */
    .wod-amrap { background: rgba(244, 63, 94, 0.15); color: var(--danger); border: 1px solid rgba(244, 63, 94, 0.3); }
    .wod-fortime, .wod-rft, .wod-chipper { background: rgba(0, 255, 136, 0.1); color: var(--primary); border: 1px solid rgba(0, 255, 136, 0.25); }
    .wod-emom, .wod-eomom, .wod-tabata, .wod-hiit, .wod-deathby { background: rgba(6, 182, 212, 0.15); color: var(--accent); border: 1px solid rgba(6, 182, 212, 0.3); }
    .wod-fuerza, .wod-complejo, .wod-halterofilia, .wod-gimnasia { background: rgba(139, 92, 246, 0.15); color: var(--secondary); border: 1px solid rgba(139, 92, 246, 0.3); }
    .wod-other, .wod-calentamiento, .wod-ladder, .wod-metcon, .wod-partnerwod { background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3); }

    /* Timer Info Alert */
    .timer-info-alert {
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-md);
      padding: 14px 20px;
      font-size: 0.92rem;
      color: #d4d4d8;
      margin-bottom: 8px;
    }
    .timer-icon {
      font-size: 1.25rem;
      filter: drop-shadow(0 0 4px rgba(0, 255, 136, 0.3));
    }
    .timer-method {
      color: var(--primary);
      font-weight: 700;
      margin-left: 6px;
    }

    /* Sections */
    .wod-desc-section, .wod-exercises-section {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 12px;
    }
    .wod-desc-section h4, .wod-exercises-section h4 {
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #71717a;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 10px;
      margin-bottom: 8px;
    }
    .description-text {
      color: #d4d4d8;
      font-size: 0.92rem;
      line-height: 1.65;
      white-space: pre-line;
      padding: 4px 0;
    }

    /* Exercises list table */
    .exercises-list-table {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: rgba(0, 0, 0, 0.25);
    }
    .exercise-item-row {
      display: grid;
      grid-template-columns: 50px 1.2fr 1.8fr;
      align-items: center;
      padding: 18px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      transition: background-color 0.2s ease;
    }
    .exercise-item-row:hover {
      background-color: rgba(255, 255, 255, 0.015);
    }
    .exercise-item-row:last-child {
      border-bottom: none;
    }
    .exercise-order {
      color: var(--primary);
      font-weight: 800;
      font-size: 1.1rem;
    }
    .exercise-main-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .exercise-name {
      color: #fff;
      font-weight: 700;
      font-size: 1.05rem;
      letter-spacing: -0.01em;
    }
    .exercise-category-badge {
      font-size: 0.68rem;
      padding: 2px 8px;
      border-radius: 4px;
      width: fit-content;
      text-transform: uppercase;
      font-weight: 700;
    }
    .badge-gim { background: rgba(6, 182, 212, 0.1); color: var(--accent); }
    .badge-halt { background: rgba(139, 92, 246, 0.1); color: var(--secondary); }
    .badge-mono { background: rgba(245, 158, 11, 0.1); color: var(--warning); }

    .exercise-specs {
      display: flex;
      flex-direction: row;
      gap: 14px;
      font-size: 0.92rem;
      color: #e4e4e7;
      flex-wrap: wrap;
      justify-content: flex-end;
      align-items: center;
    }
    .spec-series, .spec-reps {
      background: rgba(255, 255, 255, 0.04);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.06);
      font-weight: 600;
    }
    .spec-details {
      color: #a1a1aa;
      font-style: italic;
      background: rgba(255, 255, 255, 0.01);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      border: 1px dashed rgba(255, 255, 255, 0.05);
    }

    .no-exercises-alert, .no-exercises-alert-form {
      padding: 24px;
      text-align: center;
      color: #71717a;
      font-size: 0.9rem;
      background: rgba(255, 255, 255, 0.01);
      border: 1px dashed var(--border-glow);
      border-radius: var(--radius-md);
    }

    /* Modal / Form styles */
    .wod-modal {
      --modal-pad-top: 32px;
      --modal-pad-bottom: 32px;
      --modal-pad-side: 32px;
      max-width: 700px;
      width: 95%;
      max-height: 90vh;
      overflow-y: auto;
      padding: 32px;
    }
    .timer-method-badge {
      display: inline-flex;
      align-items: center;
      height: 45px;
      width: 100%;
      padding: 0 16px;
      border-radius: var(--radius-md);
      font-weight: 700;
      font-size: 0.9rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-glow);
    }
    .timer-method-badge[data-timer-type="countdown"] { color: var(--danger); border-color: rgba(244, 63, 94, 0.25); background: rgba(244, 63, 94, 0.03); }
    .timer-method-badge[data-timer-type="stopwatch"] { color: var(--primary); border-color: rgba(0, 255, 136, 0.25); background: rgba(0, 255, 136, 0.03); }
    .timer-method-badge[data-timer-type="interval"] { color: var(--accent); border-color: rgba(6, 182, 212, 0.25); background: rgba(6, 182, 212, 0.03); }
    .timer-method-badge[data-timer-type="none"] { color: #a1a1aa; border-color: var(--border-glow); }

    /* Exercise selector in form */
    .modal-exercises-picker {
      margin-top: 28px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .section-title-row h4 {
      font-size: 1.05rem;
      color: #fff;
    }
    .exercises-counter {
      font-size: 0.82rem;
      color: var(--primary);
      font-weight: 700;
    }
    .exercise-search-section {
      position: relative;
    }
    .search-input-wrapper {
      position: relative;
      width: 100%;
    }
    .search-results-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      background: #121218;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-md);
      margin-top: 4px;
      max-height: 220px;
      overflow-y: auto;
      z-index: 2000;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
    }
    .dropdown-item {
      padding: 12px 18px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      font-size: 0.9rem;
      transition: background 0.2s;
    }
    .dropdown-item:hover {
      background: rgba(0, 255, 136, 0.08);
      color: #fff;
    }
    .dropdown-item .ex-name {
      font-weight: 600;
      color: #fff;
    }
    .dropdown-item .ex-cat {
      font-size: 0.72rem;
      color: #a1a1aa;
      text-transform: uppercase;
      font-weight: 600;
    }
    .dropdown-empty {
      padding: 16px;
      text-align: center;
      font-size: 0.88rem;
      color: #a1a1aa;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.78rem;
    }
    .mt-5 { margin-top: 5px; }

    /* Selected exercises grid in form */
    .selected-exercises-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 320px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .form-exercise-item {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-md);
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .item-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .item-idx {
      background: rgba(255, 255, 255, 0.05);
      color: #a1a1aa;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 800;
    }
    .item-actions {
      display: flex;
      align-items: center;
    }
    .btn-order-arrow {
      background: transparent;
      border: none;
      color: #71717a;
      cursor: pointer;
      font-size: 0.78rem;
      padding: 2px 6px;
      transition: color 0.15s;
    }
    .btn-order-arrow:hover:not(:disabled) {
      color: var(--primary);
    }
    .btn-order-arrow:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }
    .btn-remove-ex {
      background: transparent;
      border: none;
      color: var(--danger);
      cursor: pointer;
      font-size: 0.95rem;
      padding: 2px 6px;
      font-weight: bold;
      transition: transform 0.15s;
    }
    .btn-remove-ex:hover {
      transform: scale(1.2);
    }

    .item-fields-grid {
      display: grid;
      grid-template-columns: 80px 140px 1fr;
      gap: 12px;
    }
    .form-group.mini {
      margin-bottom: 0;
    }
    .form-group.mini label {
      font-size: 0.68rem;
      margin-bottom: 4px;
    }
    .form-control-sm {
      padding: 6px 10px;
      font-size: 0.78rem;
      height: 32px;
    }
    .empty-list-indicator {
      padding: 24px;
      text-align: center;
      color: #71717a;
      font-size: 0.85rem;
      border: 1px dashed var(--border-glow);
      border-radius: var(--radius-md);
    }

    /* Sub-modal quick create */
    .sub-modal {
      z-index: 3000;
      background: rgba(0, 0, 0, 0.85);
    }

    /* AI Panel styles */
    .ai-toggle-container {
      margin-top: 10px;
      margin-bottom: 16px;
      display: flex;
      justify-content: flex-end;
    }
    .btn-ai-toggle {
      font-size: 0.82rem;
      padding: 8px 16px;
      background: rgba(0, 255, 136, 0.04);
      border: 1px solid rgba(0, 255, 136, 0.15);
      color: var(--primary);
      font-weight: 700;
      transition: all 0.2s ease;
    }
    .btn-ai-toggle:hover, .btn-ai-toggle.active {
      background: rgba(0, 255, 136, 0.1);
      border-color: var(--primary);
      box-shadow: 0 0 10px rgba(0, 255, 136, 0.15);
    }
    .ai-fast-card {
      padding: 20px;
      background: rgba(255, 255, 255, 0.01) !important;
      border: 1px dashed rgba(255, 255, 255, 0.1) !important;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ai-card-header {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .ai-sparkle {
      font-size: 1.5rem;
    }
    .ai-fast-card h4 {
      margin: 0 0 4px 0;
      font-size: 0.95rem;
      color: #fff;
      font-weight: 700;
    }
    .ai-subtitle {
      margin: 0;
      font-size: 0.78rem;
      color: #71717a;
      line-height: 1.4;
    }
    .ai-textarea {
      background: rgba(0, 0, 0, 0.35) !important;
      font-size: 0.88rem;
      font-family: inherit;
      border-color: rgba(255, 255, 255, 0.06);
    }
    .ai-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .ai-provider-badge {
      font-size: 0.78rem;
      color: #a1a1aa;
    }
    .ai-provider-badge strong {
      color: var(--primary);
    }
    .ai-feedback-banner {
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.82rem;
      line-height: 1.4;
    }
    .banner-success {
      background: rgba(0, 255, 136, 0.08);
      border: 1px solid rgba(0, 255, 136, 0.2);
      color: #a3ffd6;
    }
    .banner-warning {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      color: #ffe4b3;
    }
    .banner-error {
      background: rgba(244, 63, 94, 0.08);
      border: 1px solid rgba(244, 63, 94, 0.2);
      color: #ffd1d8;
    }

    /* Helper utilities */
    .flex-align-center {
      display: inline-flex;
      align-items: center;
    }

    /* Loading Spinner Styles */
    .btn-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
      flex-shrink: 0;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Image Upload Section Styles */
    .ai-image-upload-section {
      margin-top: 6px;
      margin-bottom: 6px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ai-image-upload-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: var(--radius-md);
      padding: 14px;
      cursor: pointer;
      color: #a1a1aa;
      font-size: 0.85rem;
      transition: all 0.2s ease;
    }
    .ai-image-upload-label:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--primary);
      color: #fff;
    }
    .upload-icon {
      font-size: 1.2rem;
    }
    .hidden-file-input {
      display: none;
    }
    .ai-image-preview-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-md);
      padding: 10px 14px;
    }
    .image-preview-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ai-image-preview {
      width: 48px;
      height: 48px;
      object-fit: cover;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .image-info {
      display: flex;
      flex-direction: column;
    }
    .image-name {
      font-size: 0.82rem;
      color: #e4e4e7;
      font-weight: 600;
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-remove-image {
      background: transparent;
      border: none;
      color: var(--danger);
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: bold;
      padding: 4px 8px;
      transition: transform 0.15s;
    }
    .btn-remove-image:hover {
      transform: scale(1.2);
    }

    /* Multi-block preview styles */
    .parsed-blocks-preview {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 10px;
      margin-bottom: 20px;
    }
    .preview-title {
      color: var(--primary);
      font-weight: 700;
      margin: 0;
    }
    .parsed-block-card {
      padding: 20px;
      border: 1px solid var(--border-glow);
      background: rgba(255, 255, 255, 0.02) !important;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .block-card-header {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 8px;
    }
    .block-card-header h5 {
      margin: 0;
      color: #fff;
      font-weight: 800;
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .btn-remove-block {
      background: transparent;
      border: none;
      color: var(--danger);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .btn-remove-block:hover {
      text-decoration: underline;
    }
    .block-textarea {
      background: rgba(0, 0, 0, 0.25) !important;
      font-size: 0.85rem;
    }
    .block-exercises-preview h6 {
      margin: 0 0 10px 0;
      font-size: 0.82rem;
      text-transform: uppercase;
      color: #71717a;
      letter-spacing: 0.05em;
    }
    .exercise-preview-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ex-preview-item {
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
    }
    .ex-preview-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .ex-preview-number {
      font-weight: 800;
      color: var(--primary);
      font-size: 0.9rem;
    }
    .ex-selector-dropdown {
      height: 34px !important;
      padding: 4px 30px 4px 10px !important;
      font-size: 0.82rem !important;
      width: 220px;
      background-color: rgba(0, 0, 0, 0.4) !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
      cursor: pointer;
    }
    .ex-preview-specs {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ex-spec-input {
      height: 32px !important;
      font-size: 0.8rem !important;
      background: rgba(0, 0, 0, 0.3) !important;
      border-color: rgba(255, 255, 255, 0.06) !important;
    }
    .btn-remove-ex-tag {
      background: transparent;
      border: none;
      color: var(--danger);
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: bold;
      padding: 4px;
      transition: transform 0.15s;
    }
    .btn-remove-ex-tag:hover {
      transform: scale(1.2);
    }
    .preview-actions {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 16px;
    }
    .btn-save-all {
      box-shadow: 0 0 16px rgba(0, 255, 136, 0.25);
    }
    .btn-add-ex-inline {
      background: transparent;
      border: none;
      color: var(--primary);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 700;
      transition: all 0.2s;
    }
    .btn-add-ex-inline:hover {
      text-decoration: underline;
      color: #fff;
    }
    .btn-create-ex-inline {
      background: rgba(0, 255, 136, 0.05);
      border: 1px solid rgba(0, 255, 136, 0.2);
      color: var(--primary);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 8px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      margin-left: 4px;
    }
    .btn-create-ex-inline:hover {
      background: rgba(0, 255, 136, 0.15);
      border-color: var(--primary);
    }
    .ex-selector-dropdown.unmatched {
      border: 1px solid rgba(245, 158, 11, 0.4) !important;
      background-color: rgba(245, 158, 11, 0.08) !important;
      color: #ffe4b3 !important;
    }
    .btn-create-ex-inline.highlight {
      background: rgba(245, 158, 11, 0.15) !important;
      border: 1px solid rgba(245, 158, 11, 0.4) !important;
      color: #ffe4b3 !important;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.15);
    }
    .btn-create-ex-inline.highlight:hover {
      background: rgba(245, 158, 11, 0.3) !important;
      border-color: #ffe4b3 !important;
    }
    .quick-exercise-modal {
      --modal-pad-top: 24px;
      --modal-pad-bottom: 24px;
      --modal-pad-side: 24px;
      max-width: 420px;
      width: 90%;
      padding: 24px;
    }

    /* Utilities */
    .btn-icon-sm {
      padding: 6px 10px;
      font-size: 0.85rem;
    }
    .mt-15 { margin-top: 15px; }

    @media (max-width: 768px) {
      .date-scheduler {
        padding: 16px !important;
        gap: 16px !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      .date-controls {
        width: 100% !important;
        justify-content: space-between !important;
      }
      .date-picker-input {
        width: 150px !important;
        height: 40px !important;
        font-size: 0.9rem !important;
      }
      .nav-date-btn {
        width: 36px !important;
        height: 36px !important;
      }

      /* Tira semanal horizontal swipeable en móvil */
      .week-strip {
        display: flex !important;
        grid-template-columns: none !important;
        overflow-x: auto !important;
        gap: 8px !important;
        width: 100% !important;
        padding-bottom: 8px !important;
        scroll-snap-type: x mandatory !important;
        -webkit-overflow-scrolling: touch !important;
        justify-content: flex-start !important;
      }
      .strip-day-btn {
        flex: 0 0 65px !important;
        scroll-snap-align: start !important;
        padding: 10px 4px !important;
      }
      .strip-day-btn .day-number {
        font-size: 1.1rem !important;
      }
      .strip-day-btn .day-name {
        font-size: 0.65rem !important;
      }
      
      /* Tarjeta de WOD */
      .wod-detail-card {
        padding: 16px !important;
        gap: 16px !important;
      }
      .wod-card-header {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 12px !important;
        padding-bottom: 12px !important;
      }
      .wod-title-wrapper h2 {
        font-size: 1.3rem !important;
      }
      .wod-actions {
        width: 100% !important;
        display: flex !important;
        gap: 8px !important;
      }
      .wod-actions button {
        flex: 1 !important;
      }

      /* Ejercicios del WOD */
      .exercise-item-row {
        grid-template-columns: 30px 1fr !important;
        gap: 8px !important;
        padding: 12px !important;
      }
      .exercise-specs {
        grid-column: 2 !important;
        justify-content: flex-start !important;
        margin-top: 6px !important;
        gap: 6px !important;
      }
      .spec-series, .spec-reps {
        padding: 4px 8px !important;
        font-size: 0.8rem !important;
      }
      .spec-details {
        padding: 4px 8px !important;
        font-size: 0.8rem !important;
        width: 100% !important;
      }

      /* Formulario de WOD en modal */
      .wod-modal {
        padding: 20px 16px !important;
      }
      .item-fields-grid {
        grid-template-columns: 1fr !important;
        gap: 8px !important;
      }
      .form-exercise-item {
        padding: 10px !important;
      }
      .form-exercise-item .form-group.mini.wide {
        grid-column: auto !important;
      }
    }
  `]
})
export class WodsComponent implements OnInit {
  private db = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private parser = inject(WodParserService);

  selectedDate: string = '';
  wods: Wod[] = [];
  catalogEjercicios: Ejercicio[] = [];
  filteredCatalogEjercicios: Ejercicio[] = [];
  weekDays: Array<{ dateStr: string; dayName: string; dayNum: string; monthName: string }> = [];

  // Constants
  readonly wodTypes = WOD_TYPES;
  readonly WOD_TIMER_MAP = WOD_TIMER_MAP;

  // WOD Modal State
  showModal = false;
  isEditMode = false;
  wodForm: Omit<Wod, 'id' | 'wod_ejercicios'> & { id?: string } = this.getDefaultWodForm();
  wodFormEjercicios: Array<Omit<WodEjercicio, 'id' | 'wod_id'> & { id?: string; wod_id?: string }> = [];

  // AI Creator Panel States
  showAiPanel = false;
  aiInputText = '';
  aiSelectedImage: { data: string; mimeType: string; name: string } | null = null;
  isAiLoading = false;
  aiFeedbackMessage = '';
  aiFeedbackType: 'success' | 'warning' | 'error' = 'success';
  parsedWodBlocks: any[] = [];
  quickCreateTargetBlock: any = null;
  quickCreateTargetIndex: number | null = null;

  // Catalog exercise search inside form
  exerciseSearchQuery = '';

  // Quick Exercise Creation State
  showQuickCreateModal = false;
  quickExerciseForm = this.getDefaultQuickExerciseForm();

  // AI Configuration
  aiProvider: 'local' | 'gemini' = 'local';
  geminiApiKey = '';
  geminiApiKeyImages = '';

  ngOnInit() {
    this.selectedDate = this.getTodayDateStr();
    this.updateWeekDays();
    this.loadCatalog();
    this.loadWods();
    this.loadAiConfig();
  }

  loadAiConfig() {
    this.db.getConfiguraciones().subscribe({
      next: (configs) => {
        const providerConfig = configs.find(c => c.clave === 'ai_provider');
        const apiKeyConfig = configs.find(c => c.clave === 'gemini_api_key');
        const apiKeyImagesConfig = configs.find(c => c.clave === 'gemini_api_key_images');
        this.aiProvider = (providerConfig?.valor as 'local' | 'gemini') || 'local';
        this.geminiApiKey = apiKeyConfig?.valor || '';
        this.geminiApiKeyImages = apiKeyImagesConfig?.valor || '';
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error loading AI config in WodsComponent', err)
    });
  }

  // --- DATE CONVENIENCE METHODS ---
  getTodayDateStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  updateWeekDays() {
    const current = new Date(this.selectedDate + 'T00:00:00');
    const startOfWeek = new Date(current);
    // Find the starting monday
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const weekdaysNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      this.weekDays.push({
        dateStr,
        dayName: weekdaysNames[i],
        dayNum: date.getDate().toString(),
        monthName: monthNames[date.getMonth()]
      });
    }
  }

  selectDate(dateStr: string) {
    this.selectedDate = dateStr;
    this.updateWeekDays();
    this.loadWods();
  }

  navigateDays(offset: number) {
    const current = new Date(this.selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + offset);
    this.selectedDate = current.toISOString().split('T')[0];
    this.updateWeekDays();
    this.loadWods();
  }

  onDateChange() {
    this.updateWeekDays();
    this.loadWods();
  }

  // --- DATA LOADING ---
  loadWods() {
    this.db.getWods(this.selectedDate).subscribe({
      next: (data) => {
        this.wods = data;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar WODs:', err);
      }
    });
  }

  loadCatalog() {
    this.db.getEjercicios().subscribe({
      next: (data) => {
        this.catalogEjercicios = data;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar catálogo de ejercicios:', err);
      }
    });
  }

  // --- CRUD METHODS ---
  getDefaultWodForm() {
    return {
      titulo: '',
      descripcion: '',
      tipo: 'AMRAP' as WodTipo,
      fecha: this.selectedDate || this.getTodayDateStr()
    };
  }

  getDefaultQuickExerciseForm() {
    return {
      nombre: '',
      categoria: 'Gimnasia',
      equipamiento: '',
      descripcion: ''
    };
  }

  openAddModal() {
    this.isEditMode = false;
    this.wodForm = this.getDefaultWodForm();
    this.wodForm.fecha = this.selectedDate; // Program for the active view date
    this.wodFormEjercicios = [];
    this.exerciseSearchQuery = '';
    this.aiInputText = '';
    this.aiSelectedImage = null;
    this.aiFeedbackMessage = '';
    this.showAiPanel = false;
    this.parsedWodBlocks = [];
    this.showModal = true;
  }

  openEditModal(wod: Wod) {
    this.isEditMode = true;
    this.wodForm = {
      id: wod.id,
      titulo: wod.titulo,
      descripcion: wod.descripcion || '',
      tipo: wod.tipo,
      fecha: wod.fecha
    };
    
    // Deep copy current exercises
    this.wodFormEjercicios = wod.wod_ejercicios ? wod.wod_ejercicios.map(we => ({
      id: we.id,
      wod_id: we.wod_id,
      ejercicio_id: we.ejercicio_id,
      series: we.series,
      repeticiones: we.repeticiones,
      detalles: we.detalles,
      orden: we.orden
    })) : [];

    this.exerciseSearchQuery = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveWod() {
    if (!this.wodForm.titulo.trim() || !this.wodForm.fecha) return;

    const payload: Omit<Wod, 'id'> = {
      titulo: this.wodForm.titulo.trim(),
      descripcion: this.wodForm.descripcion?.trim() || '',
      tipo: this.wodForm.tipo,
      fecha: this.wodForm.fecha
    };

    // Prepare exercises list, making sure order matches the active array index
    const ejerciciosPayload: Omit<WodEjercicio, 'id' | 'wod_id'>[] = this.wodFormEjercicios.map((we, index) => ({
      ejercicio_id: we.ejercicio_id,
      series: we.series || null,
      repeticiones: we.repeticiones?.trim() || null,
      detalles: we.detalles?.trim() || null,
      orden: index
    }));

    if (this.isEditMode && this.wodForm.id) {
      this.db.updateWod(this.wodForm.id, payload, ejerciciosPayload).subscribe({
        next: () => {
          this.loadWods();
          this.closeModal();
        },
        error: (err) => console.error('Error al editar WOD:', err)
      });
    } else {
      this.db.createWod(payload, ejerciciosPayload).subscribe({
        next: () => {
          // If we programmed a WOD for a different date than selected, navigate to it!
          if (this.wodForm.fecha !== this.selectedDate) {
            this.selectedDate = this.wodForm.fecha;
            this.updateWeekDays();
          }
          this.loadWods();
          this.closeModal();
        },
        error: (err) => console.error('Error al crear WOD:', err)
      });
    }
  }

  deleteWod(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este WOD programado?')) {
      this.db.deleteWod(id).subscribe({
        next: () => {
          this.loadWods();
        },
        error: (err) => console.error('Error al eliminar WOD:', err)
      });
    }
  }

  // --- FORM EXERCISES HANDLING ---
  getExerciseName(ejercicioId: string): string {
    const ex = this.catalogEjercicios.find(e => e.id === ejercicioId);
    return ex ? ex.nombre : 'Ejercicio Desconocido';
  }

  filterExercises() {
    const query = this.exerciseSearchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredCatalogEjercicios = [];
      return;
    }
    this.filteredCatalogEjercicios = this.catalogEjercicios.filter(ex => 
      ex.nombre.toLowerCase().includes(query) ||
      ex.categoria.toLowerCase().includes(query)
    );
  }

  addExerciseToWod(ex: Ejercicio) {
    // Avoid duplicates inside same WOD if not desired, or just allow multiple instances
    // Standard CrossFit workouts might repeat exercises, so we just add it
    this.wodFormEjercicios.push({
      ejercicio_id: ex.id,
      series: null,
      repeticiones: '',
      detalles: '',
      orden: this.wodFormEjercicios.length
    });
    this.exerciseSearchQuery = '';
    this.filteredCatalogEjercicios = [];
  }

  removeExerciseFromWod(index: number) {
    this.wodFormEjercicios.splice(index, 1);
  }

  moveExercise(index: number, direction: number) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= this.wodFormEjercicios.length) return;
    
    // Swap items
    const temp = this.wodFormEjercicios[index];
    this.wodFormEjercicios[index] = this.wodFormEjercicios[targetIdx];
    this.wodFormEjercicios[targetIdx] = temp;
  }

  onWodTypeChange() {
    // Can auto-fill descriptions or default values in the future if needed
  }

  // --- AI CREATOR HELPER METHODS ---
  toggleAiPanel() {
    this.showAiPanel = !this.showAiPanel;
    this.aiFeedbackMessage = '';
    if (this.showAiPanel) {
      this.loadAiConfig();
    }
  }

  getAiProviderLabel(): string {
    return this.aiProvider === 'gemini' ? 'Google Gemini API' : 'Analizador Local';
  }

  onAiImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const resultString = e.target.result as string;
        const commaIndex = resultString.indexOf(',');
        const base64Data = resultString.substring(commaIndex + 1);
        
        this.aiSelectedImage = {
          data: base64Data,
          mimeType: file.type,
          name: file.name
        };
        
        if (this.aiProvider === 'local') {
          this.aiFeedbackMessage = 'Para procesar imágenes, se recomienda configurar Google Gemini en Ajustes.';
          this.aiFeedbackType = 'warning';
        } else {
          this.aiFeedbackMessage = '';
        }
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  clearAiSelectedImage() {
    this.aiSelectedImage = null;
    this.cdr.markForCheck();
  }

  processTextWithAi() {
    if (!this.aiInputText.trim() && !this.aiSelectedImage) return;
    this.isAiLoading = true;
    this.aiFeedbackMessage = 'Analizando ' + (this.aiSelectedImage ? 'imagen y ' : '') + 'texto...';
    this.aiFeedbackType = 'success';

    const handleResult = (res: any) => {
      this.isAiLoading = false;
      if (res && res.bloques && res.bloques.length > 0) {
        this.parsedWodBlocks = res.bloques;
        const numBloques = res.bloques.length;
        this.aiFeedbackMessage = `¡Completado! Se detectaron ${numBloques} bloques de entrenamiento.`;
        this.aiFeedbackType = 'success';
      } else {
        this.parsedWodBlocks = [];
        this.aiFeedbackMessage = 'No se pudieron extraer bloques de entrenamiento. Inténtalo de nuevo.';
        this.aiFeedbackType = 'warning';
      }
      this.cdr.markForCheck();
    };

    if (this.aiProvider === 'gemini') {
      // Usar la clave de imágenes si está configurada; de lo contrario, caer en la clave estándar como fallback
      const activeApiKey = (this.aiSelectedImage && this.geminiApiKeyImages) ? this.geminiApiKeyImages : this.geminiApiKey;
      if (!activeApiKey) {
        this.aiFeedbackMessage = 'La clave API de Gemini no está configurada.';
        this.aiFeedbackType = 'error';
        this.isAiLoading = false;
        this.cdr.markForCheck();
        return;
      }
      const imagePayload = this.aiSelectedImage ? { data: this.aiSelectedImage.data, mimeType: this.aiSelectedImage.mimeType } : undefined;
      this.parser.parseWithGemini(this.aiInputText, activeApiKey, this.catalogEjercicios, imagePayload).subscribe({
        next: (res) => handleResult(res),
        error: (err) => {
          console.error("Gemini API error, using local fallback", err);
          const localRes = this.parser.parseWodText(this.aiInputText, this.catalogEjercicios);
          handleResult(localRes);
          this.aiFeedbackMessage = 'La API de Gemini falló. Se usó el Analizador Local como alternativa.';
          this.aiFeedbackType = 'warning';
          this.cdr.markForCheck();
        }
      });
    } else {
      if (this.aiSelectedImage) {
        this.aiFeedbackMessage = 'El análisis de imagen no está disponible con el Analizador Local. Cambia a Google Gemini en Ajustes.';
        this.aiFeedbackType = 'error';
        this.isAiLoading = false;
        this.cdr.markForCheck();
        return;
      }
      const res = this.parser.parseWodText(this.aiInputText, this.catalogEjercicios);
      handleResult(res);
    }
  }

  removeParsedBlock(index: number) {
    this.parsedWodBlocks.splice(index, 1);
    this.cdr.markForCheck();
  }

  removeExerciseFromParsedBlock(bloque: any, index: number) {
    bloque.ejercicios.splice(index, 1);
    this.cdr.markForCheck();
  }

  discardParsedBlocks() {
    this.parsedWodBlocks = [];
    this.aiFeedbackMessage = '';
    this.aiSelectedImage = null;
    this.cdr.markForCheck();
  }

  saveAllParsedBlocks() {
    if (this.parsedWodBlocks.length === 0) return;

    // Verificar si hay algún ejercicio sin mapear
    let hasUnmapped = false;
    for (const bloque of this.parsedWodBlocks) {
      for (const ex of bloque.ejercicios) {
        if (!ex.ejercicio_id) {
          hasUnmapped = true;
          break;
        }
      }
    }

    if (hasUnmapped) {
      this.aiFeedbackMessage = 'Por favor, asocia un ejercicio o descarta (✕) los que no coinciden (en amarillo) antes de guardar.';
      this.aiFeedbackType = 'warning';
      this.cdr.markForCheck();
      return;
    }

    this.isAiLoading = true;
    this.aiFeedbackMessage = 'Guardando todos los bloques...';

    const targetFecha = this.wodForm.fecha || this.selectedDate || this.getTodayDateStr();

    const saveRequests = this.parsedWodBlocks.map((bloque) => {
      const wodPayload = {
        titulo: bloque.titulo.trim(),
        descripcion: bloque.descripcion?.trim() || '',
        tipo: bloque.tipo,
        fecha: targetFecha
      };

      const ejerciciosPayload = bloque.ejercicios.map((we: any, index: number) => ({
        ejercicio_id: we.ejercicio_id,
        series: we.series || null,
        repeticiones: we.repeticiones?.trim() || null,
        detalles: we.detalles?.trim() || null,
        orden: index
      }));

      return this.db.createWod(wodPayload, ejerciciosPayload);
    });

    forkJoin(saveRequests).subscribe({
      next: () => {
        this.isAiLoading = false;
        this.parsedWodBlocks = [];
        this.loadWods();
        this.closeModal();
      },
      error: (err) => {
        this.isAiLoading = false;
        this.aiFeedbackMessage = 'Error al guardar algunos bloques. Revisa la consola.';
        this.aiFeedbackType = 'error';
        console.error('Error saving blocks:', err);
        this.cdr.markForCheck();
      }
    });
  }

  // --- QUICK EXERCISE CREATION IN WOD ---
  openQuickCreateExercise() {
    this.quickExerciseForm = this.getDefaultQuickExerciseForm();
    this.quickExerciseForm.nombre = this.exerciseSearchQuery;
    this.quickCreateTargetBlock = null;
    this.quickCreateTargetIndex = null;
    this.showQuickCreateModal = true;
  }

  openQuickCreateForParsedBlock(bloque: any, index: number) {
    this.quickExerciseForm = this.getDefaultQuickExerciseForm();
    const item = bloque.ejercicios[index];
    this.quickExerciseForm.nombre = item ? (item.matchedEjercicioName || '') : '';
    this.quickCreateTargetBlock = bloque;
    this.quickCreateTargetIndex = index;
    this.showQuickCreateModal = true;
  }

  closeQuickCreate() {
    this.showQuickCreateModal = false;
  }

  saveQuickExercise() {
    if (!this.quickExerciseForm.nombre.trim() || !this.quickExerciseForm.categoria || !this.quickExerciseForm.equipamiento.trim()) return;

    const payload: Omit<Ejercicio, 'id'> = {
      nombre: this.quickExerciseForm.nombre.trim(),
      categoria: this.quickExerciseForm.categoria,
      equipamiento: this.quickExerciseForm.equipamiento.trim(),
      descripcion: this.quickExerciseForm.descripcion?.trim() || ''
    };

    this.db.createEjercicio(payload).subscribe({
      next: (createdEx) => {
        // 1. Add to local catalog immediately
        this.catalogEjercicios.push(createdEx);

        // 2. Add/Map depending on source context
        if (this.quickCreateTargetBlock && this.quickCreateTargetIndex !== null) {
          const item = this.quickCreateTargetBlock.ejercicios[this.quickCreateTargetIndex];
          if (item) {
            item.ejercicio_id = createdEx.id;
            item.matchedEjercicioName = createdEx.nombre;
          }
          this.quickCreateTargetBlock = null;
          this.quickCreateTargetIndex = null;
        } else {
          this.addExerciseToWod(createdEx);
        }

        // 3. Close quick modal
        this.closeQuickCreate();
        // Reset query
        this.exerciseSearchQuery = '';
        this.filteredCatalogEjercicios = [];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error al crear ejercicio rápido:', err)
    });
  }

  addPlaceholderExercise(bloque: any) {
    const defaultExId = this.catalogEjercicios.length > 0 ? this.catalogEjercicios[0].id : '';
    bloque.ejercicios.push({
      ejercicio_id: defaultExId,
      series: null,
      repeticiones: null,
      detalles: null,
      orden: bloque.ejercicios.length
    });
    this.cdr.markForCheck();
  }

  // --- VIEW STYLING HELPERS ---
  getWodTypeClass(tipo: WodTipo): string {
    const cleanType = tipo.toLowerCase().replace(/\\s+/g, '');
    return `wod-${cleanType}`;
  }

  getTimerMethodLabel(tipo: WodTipo): string {
    const method = WOD_TIMER_MAP[tipo] || 'none';
    switch (method) {
      case 'countdown': return 'Cuenta Atrás (Temporizador)';
      case 'stopwatch': return 'Cronómetro (Cuenta Adelante)';
      case 'interval': return 'Intervalos (Pitidos)';
      case 'none':
      default:
        return 'Libre / Sin cronómetro requerido';
    }
  }

  getCategoryBadgeClass(category?: string): string {
    if (!category) return 'badge-gim';
    switch (category) {
      case 'Gimnasia': return 'badge-gim';
      case 'Halterofilia': return 'badge-halt';
      case 'Monoestructural': return 'badge-mono';
      default: return 'badge-gim';
    }
  }
}
