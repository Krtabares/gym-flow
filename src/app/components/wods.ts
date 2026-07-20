import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SupabaseService } from '../services/supabase.service';
import { Wod, WodEjercicio, Ejercicio, WodTipo, WOD_TYPES, WOD_TIMER_MAP, EjercicioCategoria, EJERCICIO_CATEGORIAS } from '../models';
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
        <div class="flex-between date-header-row">
          <h2 class="wod-day-title">WOD del Día</h2>
          <span class="wod-selected-month-label">{{ selectedDate | date:'dd MMM, yyyy' }}</span>
        </div>

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
        <div class="week-strip no-scrollbar">
          <button 
            *ngFor="let day of weekDays" 
            class="strip-day-btn" 
            [class.active]="day.dateStr === selectedDate"
            (click)="selectDate(day.dateStr)"
          >
            <span class="day-name">{{ day.dayName | uppercase }}</span>
            <span class="day-number">{{ day.dayNum }}</span>
          </button>
        </div>
      </div>

      <!-- WODS DISPLAY SECTION -->
      <div class="wods-display-grid" *ngIf="wods.length > 0; else noWods">
        <div class="wod-detail-card" [ngClass]="getWodTypeClass(wod.tipo)" *ngFor="let wod of wods">
          <!-- Card Header Section -->
          <div class="wod-card-header flex-between">
            <div class="wod-header-info">
              <div class="wod-header-meta">
                <span class="wod-part-label" *ngIf="wod.orden">{{ getWodOrderLabel(wod.orden) }}</span>
                <span class="wod-type-badge-inline" [ngClass]="getWodTypeClass(wod.tipo)">{{ wod.tipo }}</span>
              </div>
              <h2 class="wod-card-title">{{ wod.titulo }}</h2>
            </div>
            
            <div class="wod-header-right flex-gap-2">
              <span class="material-symbols-outlined wod-header-icon" [attr.data-icon]="getWodIcon(wod.tipo, wod.orden)">
                {{ getWodIcon(wod.tipo, wod.orden) }}
              </span>
              <div class="wod-actions flex-gap-2">
                <button class="btn btn-secondary btn-icon-sm" (click)="openEditModal(wod); $event.stopPropagation()" title="Editar WOD">
                  ✏️
                </button>
                <button class="btn btn-danger btn-icon-sm" (click)="deleteWod(wod.id); $event.stopPropagation()" title="Eliminar WOD">
                  🗑️
                </button>
              </div>
            </div>
          </div>

          <!-- Card Body Section -->
          <div class="wod-card-body">
            <!-- General Description -->
            <div class="wod-desc-section" *ngIf="wod.descripcion">
              <p class="description-text">{{ wod.descripcion }}</p>
            </div>

            <!-- Scheduled Exercises list -->
            <div class="wod-exercises-section" *ngIf="wod.wod_ejercicios && wod.wod_ejercicios.length > 0; else noExercisesInWod">
              <div class="exercises-clean-list">
                <div 
                  class="exercise-clean-row" 
                  *ngFor="let we of wod.wod_ejercicios; let i = index"
                  (click)="toggleExerciseExpand(wod.id, i)"
                  [class.is-expanded]="isExerciseExpanded(wod.id, i)"
                >
                  <div class="exercise-left-col">
                    <span class="exercise-name">
                      {{ we.ejercicio ? (we.ejercicio.nombre?.trim() ? we.ejercicio.nombre : 'Ejercicio sin nombre') : 'Ejercicio Eliminado' }}
                      <span 
                        *ngIf="we.ejercicio"
                        class="info-icon-btn" 
                        (click)="openExerciseDetailsModal(we.ejercicio, $event)"
                        title="Ver información del ejercicio"
                      >
                        ℹ️
                      </span>
                    </span>
                    <span class="exercise-details-sub" *ngIf="we.detalles">
                      {{ we.detalles }}
                    </span>
                  </div>
                  
                  <div class="exercise-right-col">
                    <span class="exercise-qty" *ngIf="we.series || we.repeticiones">
                      <ng-container *ngIf="we.series && we.repeticiones">{{ we.series }} × {{ we.repeticiones }}</ng-container>
                      <ng-container *ngIf="!we.series && we.repeticiones">{{ we.repeticiones }}</ng-container>
                      <ng-container *ngIf="we.series && !we.repeticiones">{{ we.series }} series</ng-container>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <ng-template #noExercisesInWod>
              <div class="no-exercises-alert">No hay ejercicios específicos añadidos a este WOD.</div>
            </ng-template>
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
            
            <div class="parsed-block-card glass-card" *ngFor="let bloque of parsedWodBlocks; let bIdx = index" [class.active-card]="isCardActive(bIdx)">
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
                  <div class="ex-preview-item animate-fade-in" *ngFor="let item of bloque.ejercicios; let eIdx = index" [class.active-dropdown-item]="isDropdownActive(bIdx, eIdx)">
                    <div class="ex-preview-row">
                      <div class="flex-gap-2 align-center">
                        <span class="ex-preview-number">{{ eIdx + 1 }}</span>
                        <!-- CONTENEDOR CUSTOM SEARCHABLE SELECT -->
                        <div class="custom-select-container">
                          <!-- BACKDROP LOCAL PARA ESTE DROPDOWN -->
                          <div class="dropdown-backdrop" *ngIf="isDropdownActive(bIdx, eIdx)" (click)="toggleDropdown(bIdx, eIdx); $event.stopPropagation()"></div>

                          <!-- Trigger button that looks like a select box -->
                          <button 
                            type="button" 
                            class="form-control select-control ex-selector-trigger"
                            [class.unmatched]="!item.ejercicio_id"
                            (click)="toggleDropdown(bIdx, eIdx); $event.stopPropagation()"
                          >
                            <span class="trigger-text" *ngIf="item.ejercicio_id">{{ getExerciseName(item.ejercicio_id) }}</span>
                            <span class="trigger-text" *ngIf="!item.ejercicio_id">⚠️ No coincide: "{{ item.matchedEjercicioName }}"</span>
                            <span class="dropdown-arrow">▼</span>
                          </button>

                          <!-- Dropdown List Overlay -->
                          <div class="custom-select-dropdown glass-card animate-fade-in" *ngIf="isDropdownActive(bIdx, eIdx)" (click)="$event.stopPropagation()">
                            <div class="dropdown-search-box">
                              <input 
                                type="text" 
                                class="form-control dropdown-search-input" 
                                placeholder="Buscar ejercicio..."
                                [(ngModel)]="dropdownSearchQueries[bIdx + '_' + eIdx]"
                                name="dropdown_search_{{bIdx}}_{{eIdx}}"
                                (click)="$event.stopPropagation()"
                              >
                            </div>
                            <div class="dropdown-options-list">
                              <div 
                                class="dropdown-option" 
                                *ngFor="let ex of getFilteredExercises(dropdownSearchQueries[bIdx + '_' + eIdx])"
                                (click)="selectExerciseForParsedBlock(bloque, eIdx, ex); toggleDropdown(bIdx, eIdx)"
                                [class.selected]="item.ejercicio_id === ex.id"
                              >
                                <span class="ex-name">{{ ex.nombre }}</span>
                                <span class="badge-category" [ngClass]="getCategoryBadgeClass(ex.categoria)">{{ ex.categoria }}</span>
                              </div>
                              <div class="dropdown-no-results" *ngIf="getFilteredExercises(dropdownSearchQueries[bIdx + '_' + eIdx]).length === 0">
                                Sin resultados
                              </div>
                            </div>
                          </div>
                        </div>
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
            <div class="form-grid-three">
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

              <div class="form-group">
                <label class="form-label">Posición (Orden)</label>
                <input 
                  type="number" 
                  class="form-control" 
                  name="orden" 
                  [(ngModel)]="wodForm.orden" 
                  min="1" 
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
                      <button type="button" class="btn-order-arrow" (click)="editCatalogExercise(item.ejercicio_id)" title="Editar Ejercicio">✏️</button>
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
            <h3>{{ isEditingQuickExercise ? 'Editar Ejercicio' : 'Crear Ejercicio Rápido' }}</h3>
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
                  <option *ngFor="let cat of exerciseCategories" [value]="cat">
                    {{ getCategoryEmoji(cat) }} {{ cat }}
                  </option>
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
              <button type="submit" class="btn btn-primary">{{ isEditingQuickExercise ? 'Guardar Ejercicio' : 'Crear y Añadir' }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- EXERCISE DETAILS MODAL -->
      <div class="modal-backdrop sub-modal" *ngIf="showExerciseDetailsModal" (click)="closeExerciseDetailsModal()">
        <div class="glass-card modal-content quick-exercise-modal animate-fade-in" (click)="$event.stopPropagation()">
          <div class="flex-between modal-header">
            <h3>Detalles del Ejercicio</h3>
            <button class="close-btn" (click)="closeExerciseDetailsModal()">✕</button>
          </div>

          <div class="exercise-details-modal-body" style="padding-top: 15px;" *ngIf="selectedExerciseForModal">
            <h2 style="font-size: 1.5rem; color: #fff; margin-bottom: 12px; font-family: var(--font-display);">{{ selectedExerciseForModal.nombre }}</h2>
            
            <div class="flex-gap-2 mb-16" style="flex-wrap: wrap; margin-bottom: 16px; display: flex; gap: 8px; align-items: center;">
              <span class="badge" [ngClass]="getCategoryBadgeClass(selectedExerciseForModal.categoria)">
                {{ selectedExerciseForModal.categoria }}
              </span>
              <span class="badge badge-equipment" *ngIf="selectedExerciseForModal.equipamiento">
                🛠️ {{ selectedExerciseForModal.equipamiento }}
              </span>
            </div>

            <div class="form-group" *ngIf="selectedExerciseForModal.descripcion">
              <label class="form-label" style="margin-bottom: 6px;">Instrucciones y Técnica</label>
              <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-glow); padding: 14px; border-radius: var(--radius-md); font-size: 0.9rem; line-height: 1.6; color: #e4e4e7; white-space: pre-line;">
                {{ selectedExerciseForModal.descripcion }}
              </div>
            </div>

            <div class="form-group" *ngIf="selectedExerciseForModal.url_video">
              <label class="form-label" style="margin-bottom: 6px;">Video Tutorial / Demostración</label>
              <a [href]="selectedExerciseForModal.url_video" target="_blank" class="btn btn-secondary" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px; background: rgba(139, 92, 246, 0.1); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.25); transition: all 0.2s;">
                🎥 Ver Video de Demostración
              </a>
            </div>
          </div>

          <div class="flex-between form-actions" style="margin-top: 20px;">
            <div></div>
            <button type="button" class="btn btn-primary" (click)="closeExerciseDetailsModal()">Cerrar</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .wods-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .title-grad {
      font-size: 1.8rem;
      background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 4px;
    }
    .subtitle {
      color: #71717a;
      font-size: 0.88rem;
    }

    /* Date scheduler */
    .date-scheduler {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }
    .date-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      padding-bottom: 12px;
    }
    .wod-day-title {
      font-family: var(--font-display);
      font-size: 1.3rem;
      font-weight: 700;
      color: #fff;
    }
    .wod-selected-month-label {
      font-family: var(--font-display);
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--primary);
      text-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
    }
    .date-controls {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .nav-date-btn {
      width: 36px;
      height: 36px;
      padding: 0;
      border-radius: 50%;
      font-size: 0.85rem;
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
      left: 14px;
      font-size: 1rem;
      pointer-events: none;
      color: #a1a1aa;
    }
    .date-picker-input {
      padding-left: 40px;
      font-size: 0.95rem;
      font-weight: 600;
      width: 200px;
      color: #fff;
      text-align: center;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid var(--border-glow);
      height: 38px;
    }
    .date-picker-input::-webkit-calendar-picker-indicator {
      filter: invert(1);
      cursor: pointer;
      opacity: 0.7;
    }

    /* Week Strip */
    .week-strip {
      display: flex;
      gap: 10px;
      width: 100%;
      overflow-x: auto;
      padding: 4px 0 12px 0;
      justify-content: space-between;
    }
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .strip-day-btn {
      flex: 1 0 54px;
      height: 80px;
      min-width: 54px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
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
      background: var(--primary);
      border-color: var(--primary);
      color: #09090b;
      font-weight: 700;
      box-shadow: 0 0 15px rgba(0, 255, 136, 0.35);
    }
    .strip-day-btn.active .day-name {
      color: rgba(9, 9, 11, 0.75);
      font-weight: 600;
    }
    .strip-day-btn.active .day-number {
      color: #09090b;
      font-weight: 800;
    }
    .strip-day-btn .day-name {
      font-size: 0.65rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .strip-day-btn .day-number {
      font-size: 1.15rem;
      font-weight: 700;
      font-family: var(--font-display);
    }

    /* Wods Grid & Detail Card */
    .wods-display-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }
    .wod-detail-card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-lg);
      overflow: hidden;
      padding: 0;
      display: flex;
      flex-direction: column;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .wod-card-header {
      background: transparent;
      padding: 20px 20px 8px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid rgba(255, 255, 255, 0.1) !important;
    }
    .wod-amrap .wod-card-header { border-left-color: var(--danger) !important; }
    .wod-fortime .wod-card-header, .wod-rft .wod-card-header, .wod-chipper .wod-card-header { border-left-color: var(--primary) !important; }
    .wod-emom .wod-card-header, .wod-eomom .wod-card-header, .wod-tabata .wod-card-header, .wod-hiit .wod-card-header, .wod-deathby .wod-card-header { border-left-color: var(--accent) !important; }
    .wod-fuerza .wod-card-header, .wod-complejo .wod-card-header, .wod-halterofilia .wod-card-header, .wod-gimnasia .wod-card-header { border-left-color: var(--secondary) !important; }
    .wod-other .wod-card-header, .wod-calentamiento .wod-card-header, .wod-ladder .wod-card-header, .wod-metcon .wod-card-header, .wod-partnerwod .wod-card-header { border-left-color: var(--warning) !important; }

    .wod-header-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .wod-header-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .wod-part-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--primary);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-family: var(--font-display);
    }
    .wod-amrap .wod-part-label { color: var(--danger); }
    .wod-fortime .wod-part-label, .wod-rft .wod-part-label, .wod-chipper .wod-part-label { color: var(--primary); }
    .wod-emom .wod-part-label, .wod-eomom .wod-part-label, .wod-tabata .wod-part-label, .wod-hiit .wod-part-label, .wod-deathby .wod-part-label { color: var(--accent); }
    .wod-fuerza .wod-part-label, .wod-complejo .wod-part-label, .wod-halterofilia .wod-part-label, .wod-gimnasia .wod-part-label { color: var(--secondary); }
    .wod-other .wod-part-label, .wod-calentamiento .wod-part-label, .wod-ladder .wod-part-label, .wod-metcon .wod-part-label, .wod-partnerwod .wod-part-label { color: var(--warning); }

    .wod-type-badge-inline {
      font-size: 0.62rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      font-family: var(--font-display);
      letter-spacing: 0.04em;
    }
    .wod-amrap .wod-type-badge-inline { background: rgba(244, 63, 94, 0.15); color: var(--danger); border: 1px solid rgba(244, 63, 94, 0.3); }
    .wod-fortime .wod-type-badge-inline, .wod-rft .wod-type-badge-inline, .wod-chipper .wod-type-badge-inline { background: rgba(0, 255, 136, 0.1); color: var(--primary); border: 1px solid rgba(0, 255, 136, 0.25); }
    .wod-emom .wod-type-badge-inline, .wod-eomom .wod-type-badge-inline, .wod-tabata .wod-type-badge-inline, .wod-hiit .wod-type-badge-inline, .wod-deathby .wod-type-badge-inline { background: rgba(6, 182, 212, 0.15); color: var(--accent); border: 1px solid rgba(6, 182, 212, 0.3); }
    .wod-fuerza .wod-type-badge-inline, .wod-complejo .wod-type-badge-inline, .wod-halterofilia .wod-type-badge-inline, .wod-gimnasia .wod-type-badge-inline { background: rgba(139, 92, 246, 0.15); color: var(--secondary); border: 1px solid rgba(139, 92, 246, 0.3); }
    .wod-other .wod-type-badge-inline, .wod-calentamiento .wod-type-badge-inline, .wod-ladder .wod-type-badge-inline, .wod-metcon .wod-type-badge-inline, .wod-partnerwod .wod-type-badge-inline { background: rgba(245, 158, 11, 0.15); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3); }

    .wod-card-title {
      font-family: var(--font-display);
      font-size: 1.3rem;
      font-weight: 700;
      color: #fff;
      margin: 4px 0 0 0;
    }
    .wod-header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .wod-header-icon {
      font-size: 1.7rem;
      opacity: 0.6;
    }
    .wod-amrap .wod-header-icon { color: var(--danger); }
    .wod-fortime .wod-header-icon, .wod-rft .wod-header-icon, .wod-chipper .wod-header-icon { color: var(--primary); }
    .wod-emom .wod-header-icon, .wod-eomom .wod-header-icon, .wod-tabata .wod-header-icon, .wod-hiit .wod-header-icon, .wod-deathby .wod-header-icon { color: var(--accent); }
    .wod-fuerza .wod-header-icon, .wod-complejo .wod-header-icon, .wod-halterofilia .wod-header-icon, .wod-gimnasia .wod-header-icon { color: var(--secondary); }
    .wod-other .wod-header-icon, .wod-calentamiento .wod-header-icon, .wod-ladder .wod-header-icon, .wod-metcon .wod-header-icon, .wod-partnerwod .wod-header-icon { color: var(--warning); }

    .wod-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .wod-actions .btn-icon-sm {
      padding: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
    }

    /* Card Body */
    .wod-card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Timer Info Alert */
    .timer-info-alert {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      font-size: 0.85rem;
      color: #a1a1aa;
      width: fit-content;
      margin-bottom: 0px;
    }
    .timer-icon {
      font-size: 1.05rem;
      filter: drop-shadow(0 0 4px rgba(0, 255, 136, 0.3));
    }
    .timer-method {
      color: var(--primary);
      font-weight: 700;
      margin-left: 4px;
    }

    /* Description */
    .wod-desc-section {
      background: rgba(255, 255, 255, 0.01);
      padding: 10px 14px;
      border-radius: var(--radius-md);
      border-left: 3px solid var(--primary);
    }
    .wod-amrap .wod-desc-section { border-left-color: var(--danger); }
    .wod-fortime .wod-desc-section, .wod-rft .wod-desc-section, .wod-chipper .wod-desc-section { border-left-color: var(--primary); }
    .wod-emom .wod-desc-section, .wod-eomom .wod-desc-section, .wod-tabata .wod-desc-section, .wod-hiit .wod-desc-section, .wod-deathby .wod-desc-section { border-left-color: var(--accent); }
    .wod-fuerza .wod-desc-section, .wod-complejo .wod-desc-section, .wod-halterofilia .wod-desc-section, .wod-gimnasia .wod-desc-section { border-left-color: var(--secondary); }
    .wod-other .wod-desc-section, .wod-calentamiento .wod-desc-section, .wod-ladder .wod-desc-section, .wod-metcon .wod-desc-section, .wod-partnerwod .wod-desc-section { border-left-color: var(--warning); }

    .description-text {
      color: #e4e4e7;
      font-size: 0.92rem;
      line-height: 1.55;
      white-space: pre-line;
      margin: 0;
    }

    /* Scheduled Exercises List */
    .wod-exercises-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .exercises-clean-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .exercise-clean-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 0;
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: background-color 0.2s ease;
      cursor: pointer;
    }
    .exercise-clean-row:last-child {
      border-bottom: none;
    }
    .exercise-clean-row:hover {
      background: rgba(255, 255, 255, 0.015);
    }
    .exercise-left-col {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }
    .exercise-name {
      font-family: var(--font-sans);
      font-size: 0.96rem;
      font-weight: 500;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .exercise-details-sub {
      font-size: 0.8rem;
      color: #a1a1aa;
      font-style: italic;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .exercise-clean-row.is-expanded .exercise-details-sub {
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
    }
    .exercise-right-col {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      margin-left: 12px;
    }
    .exercise-qty {
      font-family: var(--font-sans);
      font-size: 0.92rem;
      font-weight: 500;
      color: #a1a1aa;
    }

    .form-grid-three {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 8px;
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
      position: relative;
      z-index: 1;
    }
    .parsed-block-card.active-card {
      z-index: 9998 !important;
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
      position: relative;
      z-index: 1;
    }
    .ex-preview-item.active-dropdown-item {
      z-index: 9999 !important;
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
    /* Custom Searchable Select */
    .custom-select-container {
      position: relative;
      width: 220px;
      display: inline-block;
    }
    .ex-selector-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 34px !important;
      padding: 4px 10px !important;
      font-size: 0.82rem !important;
      background-color: rgba(0, 0, 0, 0.4) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #fff;
      cursor: pointer;
      text-align: left;
      border-radius: var(--radius-sm);
      transition: all 0.2s ease;
    }
    .ex-selector-trigger:focus, .ex-selector-trigger:hover {
      border-color: rgba(255, 255, 255, 0.2) !important;
      background-color: rgba(255, 255, 255, 0.02) !important;
    }
    .ex-selector-trigger.unmatched {
      border: 1px solid rgba(245, 158, 11, 0.4) !important;
      background-color: rgba(245, 158, 11, 0.08) !important;
      color: #ffe4b3 !important;
    }
    .ex-selector-trigger .trigger-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
      display: inline-block;
    }
    .ex-selector-trigger .dropdown-arrow {
      font-size: 0.6rem;
      color: #71717a;
      transition: transform 0.2s;
    }
    .custom-select-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      min-width: 250px;
      max-height: 250px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      background: #12121d; /* Solid color to prevent overlay transparency issues */
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-md);
      margin-top: 4px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .dropdown-search-box {
      padding: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(0, 0, 0, 0.2);
    }
    .dropdown-search-input {
      height: 30px !important;
      font-size: 0.8rem !important;
      background: rgba(0, 0, 0, 0.3) !important;
      border-color: rgba(255, 255, 255, 0.08) !important;
      padding: 4px 10px !important;
      width: 100%;
    }
    .dropdown-options-list {
      overflow-y: auto;
      flex-grow: 1;
      max-height: 200px;
    }
    .dropdown-option {
      padding: 8px 12px;
      font-size: 0.82rem;
      color: #a1a1aa;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.15s ease;
    }
    .dropdown-option:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #fff;
    }
    .dropdown-option.selected {
      background: rgba(0, 255, 136, 0.08);
      color: var(--primary);
      font-weight: 600;
    }
    .dropdown-no-results {
      padding: 12px;
      text-align: center;
      color: #71717a;
      font-size: 0.8rem;
    }
    .dropdown-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 990;
      background: transparent;
    }
    .dropdown-option .badge-category {
      font-size: 0.6rem;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 700;
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
    /* Unmatched selector styling handled by trigger class */
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
        padding: 12px !important;
        gap: 8px !important;
      }
      .date-header-row {
        margin-bottom: 8px !important;
      }
      .wod-day-title {
        font-size: 1.15rem !important;
      }
      .wod-selected-month-label {
        font-size: 0.85rem !important;
      }
      .date-controls {
        width: 100% !important;
        justify-content: space-between !important;
        gap: 8px !important;
      }
      .date-picker-wrapper {
        flex-grow: 1;
        justify-content: center;
      }
      .calendar-icon {
        left: 10px !important;
        font-size: 0.9rem !important;
      }
      .date-picker-input {
        width: 100% !important;
        max-width: 180px !important;
        height: 36px !important;
        font-size: 0.85rem !important;
        padding-left: 32px !important;
      }
      .nav-date-btn {
        width: 32px !important;
        height: 32px !important;
      }

      .week-strip {
        gap: 8px !important;
        padding-bottom: 4px !important;
        justify-content: flex-start !important;
      }
      .strip-day-btn {
        flex: 0 0 48px !important;
        height: 72px !important;
        min-width: 48px !important;
        gap: 4px !important;
      }
      .strip-day-btn .day-name {
        font-size: 0.58rem !important;
      }
      .strip-day-btn .day-number {
        font-size: 1rem !important;
      }

      .wod-detail-card {
        border-radius: var(--radius-md) !important;
      }
      .wod-card-header {
        padding: 14px 16px 8px 12px !important;
      }
      .wod-card-title {
        font-size: 1.15rem !important;
      }
      .wod-header-icon {
        font-size: 1.4rem !important;
      }
      .wod-card-body {
        padding: 16px !important;
        gap: 12px !important;
      }
      .exercise-clean-row {
        padding: 12px 0 !important;
      }
      .exercise-name {
        font-size: 0.9rem !important;
      }
      .exercise-details-sub {
        font-size: 0.76rem !important;
      }
      .exercise-qty {
        font-size: 0.85rem !important;
        padding: 0 !important;
      }

      /* Formulario de WOD en modal */
      .wod-modal {
        padding: 20px 16px !important;
      }
      .form-grid-three {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
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
  readonly exerciseCategories = EJERCICIO_CATEGORIAS;

  getCategoryEmoji(category: string): string {
    switch (category) {
      case 'Gimnasia': return '🤸';
      case 'Halterofilia': return '🏋️';
      case 'Monoestructural': return '🏃';
      case 'Estiramiento': return '🧘';
      case 'Calentamiento': return '🔥';
      default: return '⚙️';
    }
  }

  // WOD Modal State
  showModal = false;
  isEditMode = false;
  showExerciseDetailsModal = false;
  selectedExerciseForModal: Ejercicio | null = null;
  wodForm: Omit<Wod, 'id' | 'wod_ejercicios'> & { id?: string; orden?: number } = this.getDefaultWodForm();
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

  // Custom Select Searchable Dropdowns
  activeDropdown: string | null = null;
  dropdownSearchQueries: Record<string, string> = {};

  // Catalog exercise search inside form
  exerciseSearchQuery = '';

  // Quick Exercise Creation State
  showQuickCreateModal = false;
  quickExerciseForm = this.getDefaultQuickExerciseForm();
  isEditingQuickExercise = false;
  editingQuickExerciseId = '';

  // AI Configuration
  aiProvider: 'local' | 'gemini' = 'local';
  geminiApiKey = '';
  geminiApiKeyImages = '';

  expandedExercises: { [key: string]: boolean } = {};

  toggleExerciseExpand(wodId: string | undefined, index: number) {
    const key = (wodId || 'temp') + '_' + index;
    this.expandedExercises[key] = !this.expandedExercises[key];
    this.cdr.markForCheck();
  }

  isExerciseExpanded(wodId: string | undefined, index: number): boolean {
    const key = (wodId || 'temp') + '_' + index;
    return !!this.expandedExercises[key];
  }

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
        // Sort WODs by position (orden), placing undefined/null at the end
        this.wods = data.sort((a, b) => {
          const ordA = a.orden !== undefined && a.orden !== null ? a.orden : 999;
          const ordB = b.orden !== undefined && b.orden !== null ? b.orden : 999;
          return ordA - ordB;
        });
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
      fecha: this.selectedDate || this.getTodayDateStr(),
      orden: 1
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
    this.wodForm.orden = this.wods.length + 1; // Suggest the next position!
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
      fecha: wod.fecha,
      orden: wod.orden || 1
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
    this.closeAllDropdowns();
  }

  openExerciseDetailsModal(ejercicio: Ejercicio, event: Event) {
    event.stopPropagation();
    this.selectedExerciseForModal = ejercicio;
    this.showExerciseDetailsModal = true;
    this.cdr.markForCheck();
  }

  closeExerciseDetailsModal() {
    this.showExerciseDetailsModal = false;
    this.selectedExerciseForModal = null;
    this.cdr.markForCheck();
  }

  saveWod() {
    if (!this.wodForm.titulo.trim() || !this.wodForm.fecha) return;

    const payload: Omit<Wod, 'id'> = {
      titulo: this.wodForm.titulo.trim(),
      descripcion: this.wodForm.descripcion?.trim() || '',
      tipo: this.wodForm.tipo,
      fecha: this.wodForm.fecha,
      orden: this.wodForm.orden || 1
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
    this.closeAllDropdowns();
    this.cdr.markForCheck();
  }

  toggleDropdown(bIdx: number, eIdx: number) {
    const key = bIdx + '_' + eIdx;
    if (this.activeDropdown === key) {
      this.activeDropdown = null;
    } else {
      this.activeDropdown = key;
      this.dropdownSearchQueries[key] = '';
    }
    this.cdr.markForCheck();
  }

  isDropdownActive(bIdx: number, eIdx: number): boolean {
    return this.activeDropdown === (bIdx + '_' + eIdx);
  }

  isCardActive(bIdx: number): boolean {
    return !!this.activeDropdown && this.activeDropdown.startsWith(bIdx + '_');
  }

  closeAllDropdowns() {
    this.activeDropdown = null;
    this.cdr.markForCheck();
  }

  getFilteredExercises(query: string): Ejercicio[] {
    if (!query || !query.trim()) {
      return this.catalogEjercicios;
    }
    const q = query.toLowerCase().trim();
    return this.catalogEjercicios.filter(ex =>
      ex.nombre.toLowerCase().includes(q) ||
      ex.categoria.toLowerCase().includes(q)
    );
  }

  selectExerciseForParsedBlock(bloque: any, eIdx: number, ex: Ejercicio) {
    bloque.ejercicios[eIdx].ejercicio_id = ex.id;
    bloque.ejercicios[eIdx].matchedEjercicioName = ex.nombre;
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

    const saveRequests = this.parsedWodBlocks.map((bloque, index) => {
      const wodPayload = {
        titulo: bloque.titulo.trim(),
        descripcion: bloque.descripcion?.trim() || '',
        tipo: bloque.tipo,
        fecha: targetFecha,
        orden: index + 1
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
    this.isEditingQuickExercise = false;
    this.editingQuickExerciseId = '';
    this.quickExerciseForm = this.getDefaultQuickExerciseForm();
    this.quickExerciseForm.nombre = this.exerciseSearchQuery;
    this.quickCreateTargetBlock = null;
    this.quickCreateTargetIndex = null;
    this.showQuickCreateModal = true;
  }

  openQuickCreateForParsedBlock(bloque: any, index: number) {
    this.isEditingQuickExercise = false;
    this.editingQuickExerciseId = '';
    this.quickExerciseForm = this.getDefaultQuickExerciseForm();
    const item = bloque.ejercicios[index];
    this.quickExerciseForm.nombre = item ? (item.matchedEjercicioName || '') : '';
    this.quickCreateTargetBlock = bloque;
    this.quickCreateTargetIndex = index;
    this.showQuickCreateModal = true;
  }

  editCatalogExercise(ejercicioId: string) {
    const ex = this.catalogEjercicios.find(e => e.id === ejercicioId);
    if (!ex) return;

    this.isEditingQuickExercise = true;
    this.editingQuickExerciseId = ejercicioId;
    this.quickExerciseForm = {
      nombre: ex.nombre,
      categoria: ex.categoria,
      equipamiento: ex.equipamiento || '',
      descripcion: ex.descripcion || ''
    };
    this.showQuickCreateModal = true;
    this.cdr.markForCheck();
  }

  closeQuickCreate() {
    this.showQuickCreateModal = false;
    this.isEditingQuickExercise = false;
    this.editingQuickExerciseId = '';
  }

  saveQuickExercise() {
    if (!this.quickExerciseForm.nombre.trim() || !this.quickExerciseForm.categoria || !this.quickExerciseForm.equipamiento.trim()) return;

    const payload: Omit<Ejercicio, 'id'> = {
      nombre: this.quickExerciseForm.nombre.trim(),
      categoria: this.quickExerciseForm.categoria,
      equipamiento: this.quickExerciseForm.equipamiento.trim(),
      descripcion: this.quickExerciseForm.descripcion?.trim() || ''
    };

    if (this.isEditingQuickExercise && this.editingQuickExerciseId) {
      this.db.updateEjercicio(this.editingQuickExerciseId, payload).subscribe({
        next: (updatedEx) => {
          // Update in local catalog immediately
          const idx = this.catalogEjercicios.findIndex(e => e.id === this.editingQuickExerciseId);
          if (idx !== -1) {
            this.catalogEjercicios[idx] = updatedEx;
          }

          // Update reference inside local active daily WODs list so it updates dynamically
          this.wods.forEach(w => {
            if (w.wod_ejercicios) {
              w.wod_ejercicios.forEach(we => {
                if (we.ejercicio_id === this.editingQuickExerciseId) {
                  we.ejercicio = updatedEx;
                }
              });
            }
          });

          this.closeQuickCreate();
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Error al actualizar ejercicio:', err)
      });
    } else {
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
      case 'Estiramiento': return 'badge-estiramiento';
      case 'Calentamiento': return 'badge-calentamiento';
      default: return 'badge-gim';
    }
  }

  getWodOrderLabel(orden?: number): string {
    if (orden === undefined || orden === null || orden <= 0) return '';
    const charCode = 65 + (orden - 1); // 65 is 'A'
    if (charCode <= 90) {
      return `PARTE ${String.fromCharCode(charCode)}`;
    }
    return `PARTE ${orden}`;
  }

  getWodIcon(tipo: WodTipo, orden?: number): string {
    const cleanType = tipo.toLowerCase();
    if (cleanType.includes('calentamiento') || (orden === 1 && cleanType.includes('other'))) {
      return 'timer';
    }
    if (cleanType.includes('fuerza') || cleanType.includes('halterofilia') || cleanType.includes('complejo')) {
      return 'fitness_center';
    }
    if (cleanType.includes('gimnasia') || cleanType.includes('estiramiento')) {
      return 'sports_gymnastics';
    }
    if (cleanType.includes('amrap') || cleanType.includes('time') || cleanType.includes('emom') || cleanType.includes('tabata') || cleanType.includes('hiit') || cleanType.includes('metcon')) {
      return 'sprint';
    }
    return 'exercise';
  }
}
