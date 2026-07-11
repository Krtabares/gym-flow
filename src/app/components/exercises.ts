import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Ejercicio, EjercicioCategoria, EJERCICIO_CATEGORIAS } from '../models';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="exercises-container animate-fade-in">
      <!-- HEADER SECTION -->
      <div class="flex-between header-section">
        <div>
          <h1 class="title-grad">Módulo de Ejercicios</h1>
          <p class="subtitle">Explora, filtra y administra la base de datos de ejercicios de CrossFit y entrenamiento funcional.</p>
        </div>
        <button class="btn btn-primary" (click)="openAddModal()">
          <span>+ Nuevo Ejercicio</span>
        </button>
      </div>

      <!-- FILTER & SEARCH BAR -->
      <div class="glass-card filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            class="form-control search-input" 
            placeholder="Buscar ejercicio por nombre o descripción..." 
            [(ngModel)]="searchQuery"
            (input)="applyFilters()"
          />
        </div>

        <div class="filters-wrapper">
          <div class="filter-group">
            <span class="filter-label">Categoría:</span>
            <div class="filter-chips">
              <button 
                class="chip" 
                [class.active]="selectedCategory === 'Todos'" 
                (click)="setCategory('Todos')"
              >
                Todos
              </button>
              <button 
                class="chip" 
                *ngFor="let cat of exerciseCategories"
                [class.active]="selectedCategory === cat" 
                (click)="setCategory(cat)"
              >
                {{ getCategoryEmoji(cat) }} {{ cat }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- EXERCISES GRID -->
      <div class="exercises-grid" *ngIf="filteredEjercicios.length > 0; else noResults">
        <div 
          class="glass-card exercise-card" 
          *ngFor="let ex of filteredEjercicios"
          [attr.data-category]="ex.categoria"
        >
          <div class="card-header flex-between">
            <span class="badge badge-category" [ngClass]="getCategoryClass(ex.categoria)">
              {{ ex.categoria }}
            </span>
            <span class="badge badge-equipment">
              ⚙️ {{ ex.equipamiento }}
            </span>
          </div>

          <div class="card-body">
            <h3>{{ ex.nombre }}</h3>
            <p class="description">{{ ex.descripcion || 'Sin descripción disponible.' }}</p>
          </div>

          <div class="card-footer flex-between">
            <div class="left-actions">
              <a 
                *ngIf="ex.url_video" 
                [href]="ex.url_video" 
                target="_blank" 
                class="btn-video" 
                title="Ver video explicativo"
              >
                🎥 <span class="video-text">Video</span>
              </a>
            </div>
            <div class="right-actions flex-gap-2">
              <button class="btn btn-secondary btn-icon-sm" (click)="openEditModal(ex)" title="Editar">
                ✏️
              </button>
              <button class="btn btn-danger btn-icon-sm" (click)="deleteEjercicio(ex.id)" title="Eliminar">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- NO RESULTS TEMPLATE -->
      <ng-template #noResults>
        <div class="glass-card empty-state">
          <div class="empty-icon">🏋️‍♂️</div>
          <h3>No se encontraron ejercicios</h3>
          <p>Prueba ajustando los filtros o realizando otra búsqueda.</p>
          <button class="btn btn-secondary mt-15" (click)="resetFilters()">Limpiar Filtros</button>
        </div>
      </ng-template>

      <!-- MODAL FORMULARIO DE EJERCICIO (Crear/Editar) -->
      <div class="modal-backdrop" *ngIf="showModal">
        <div class="glass-card modal-content animate-fade-in">
          <div class="flex-between modal-header">
            <h3>{{ isEditMode ? 'Editar Ejercicio' : 'Nuevo Ejercicio' }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>

          <form (submit)="saveEjercicio()">
            <div class="form-group">
              <label class="form-label">Nombre del Ejercicio</label>
              <input 
                type="text" 
                class="form-control" 
                name="nombre" 
                [(ngModel)]="exerciseForm.nombre" 
                required 
                placeholder="Ej. Ring Dip"
              >
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Categoría</label>
                <select 
                  class="form-control" 
                  name="categoria" 
                  [(ngModel)]="exerciseForm.categoria" 
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
                  name="equipamiento" 
                  [(ngModel)]="exerciseForm.equipamiento" 
                  required 
                  placeholder="Ej. Anillas, Barra, Ninguno"
                >
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Descripción</label>
              <textarea 
                class="form-control text-area" 
                name="descripcion" 
                rows="3"
                [(ngModel)]="exerciseForm.descripcion" 
                placeholder="Describe brevemente la técnica correcta del ejercicio..."
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">URL del Video Demostrativo (Opcional)</label>
              <input 
                type="url" 
                class="form-control" 
                name="url_video" 
                [(ngModel)]="exerciseForm.url_video" 
                placeholder="https://youtube.com/watch?v=..."
              >
            </div>

            <div class="flex-between form-actions">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary">{{ isEditMode ? 'Guardar Cambios' : 'Crear Ejercicio' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .exercises-container {
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

    /* Filter Bar */
    .filter-bar {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 20px;
    }
    .search-box {
      display: flex;
      align-items: center;
      position: relative;
      width: 100%;
    }
    .search-icon {
      position: absolute;
      left: 16px;
      font-size: 1.1rem;
      color: #71717a;
    }
    .search-input {
      padding-left: 48px;
    }
    .filters-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: center;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .filter-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .filter-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .chip {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-glow);
      color: #a1a1aa;
      padding: 6px 14px;
      font-size: 0.82rem;
      font-weight: 600;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .chip:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }
    .chip.active {
      background: rgba(0, 255, 136, 0.1);
      color: var(--primary);
      border-color: rgba(0, 255, 136, 0.3);
      box-shadow: 0 0 10px rgba(0, 255, 136, 0.05);
    }

    /* Grid layout */
    .exercises-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .exercise-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: 100%;
      min-height: 240px;
      justify-content: space-between;
    }
    .exercise-card h3 {
      font-size: 1.2rem;
      color: #fff;
      margin-bottom: 8px;
    }
    .exercise-card .description {
      font-size: 0.85rem;
      color: #a1a1aa;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Badges */
    .badge-category {
      font-size: 0.68rem;
      font-weight: 800;
    }
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
    .badge-estiramiento {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .badge-calentamiento {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .badge-equipment {
      background: rgba(255, 255, 255, 0.04);
      color: #d4d4d8;
      border: 1px solid var(--border-glow);
    }

    /* Card Footer Actions */
    .card-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      padding-top: 12px;
      margin-top: auto;
    }
    .btn-video {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--primary);
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 700;
      transition: all 0.2s;
    }
    .btn-video:hover {
      text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
      transform: translateY(-1px);
    }
    .btn-icon-sm {
      padding: 6px 10px;
      font-size: 0.85rem;
      border-radius: var(--radius-sm);
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 60px 40px;
    }
    .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
      filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.1));
    }
    .empty-state h3 {
      font-size: 1.4rem;
      color: #fff;
      margin-bottom: 8px;
    }
    .empty-state p {
      color: #71717a;
      font-size: 0.9rem;
    }
    .mt-15 { margin-top: 15px; }

    /* Modal Styling */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      width: 100%;
      max-width: 500px;
      padding: 30px;
    }
    .modal-header {
      margin-bottom: 24px;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: #71717a;
      font-size: 1.2rem;
      cursor: pointer;
    }
    .close-btn:hover { color: #fff; }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .text-area {
      resize: vertical;
      min-height: 80px;
    }
    .form-actions {
      margin-top: 28px;
    }
  `]
})
export class ExercisesComponent implements OnInit {
  private db = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
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

  ejercicios: Ejercicio[] = [];
  filteredEjercicios: Ejercicio[] = [];

  // Search & filter state
  searchQuery = '';
  selectedCategory = 'Todos';

  // Modal State
  showModal = false;
  isEditMode = false;
  exerciseForm: Omit<Ejercicio, 'id'> & { id?: string } = this.getDefaultExerciseForm();

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.db.getEjercicios().subscribe(data => {
      this.ejercicios = data;
      this.applyFilters();
      this.cdr.markForCheck();
    });
  }

  getDefaultExerciseForm() {
    return {
      nombre: '',
      categoria: 'Gimnasia',
      equipamiento: '',
      descripcion: '',
      url_video: ''
    };
  }

  setCategory(category: string) {
    this.selectedCategory = category;
    this.applyFilters();
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedCategory = 'Todos';
    this.applyFilters();
  }

  applyFilters() {
    let temp = [...this.ejercicios];

    // Filter by category
    if (this.selectedCategory !== 'Todos') {
      temp = temp.filter(ex => ex.categoria === this.selectedCategory);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      temp = temp.filter(ex => 
        ex.nombre.toLowerCase().includes(q) || 
        ex.descripcion?.toLowerCase().includes(q)
      );
    }

    this.filteredEjercicios = temp;
  }

  getCategoryClass(category: string): string {
    switch (category) {
      case 'Gimnasia': return 'badge-gimnasia';
      case 'Halterofilia': return 'badge-halterofilia';
      case 'Monoestructural': return 'badge-monoestructural';
      case 'Estiramiento': return 'badge-estiramiento';
      case 'Calentamiento': return 'badge-calentamiento';
      default: return 'badge-equipment';
    }
  }

  openAddModal() {
    this.isEditMode = false;
    this.exerciseForm = this.getDefaultExerciseForm();
    this.showModal = true;
  }

  openEditModal(ex: Ejercicio) {
    this.isEditMode = true;
    this.exerciseForm = { ...ex };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveEjercicio() {
    if (!this.exerciseForm.nombre.trim() || !this.exerciseForm.categoria || !this.exerciseForm.equipamiento.trim()) return;

    const payload: Omit<Ejercicio, 'id'> = {
      nombre: this.exerciseForm.nombre.trim(),
      categoria: this.exerciseForm.categoria,
      equipamiento: this.exerciseForm.equipamiento.trim(),
      descripcion: this.exerciseForm.descripcion?.trim() || '',
      url_video: this.exerciseForm.url_video?.trim() || undefined
    };

    if (this.isEditMode && this.exerciseForm.id) {
      this.db.updateEjercicio(this.exerciseForm.id, payload).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    } else {
      this.db.createEjercicio(payload).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    }
  }

  deleteEjercicio(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este ejercicio?')) {
      this.db.deleteEjercicio(id).subscribe(() => {
        this.loadData();
      });
    }
  }
}
