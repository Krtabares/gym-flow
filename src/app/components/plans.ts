import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Plan } from '../models';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="plans-container animate-fade-in">
      <div class="flex-between header-section">
        <div>
          <h1 class="title-grad">Planes de Suscripción</h1>
          <p class="subtitle">Configura los planes de membresía, precios y beneficios ofrecidos.</p>
        </div>
        <button class="btn btn-primary" (click)="openAddModal()">
          <span>+ Nuevo Plan</span>
        </button>
      </div>

      <!-- Tarjetas de Planes -->
      <div class="plans-grid">
        <div class="glass-card plan-card" *ngFor="let p of planes" [class.featured]="p.duracion_dias >= 90">
          <div class="badge-featured" *ngIf="p.duracion_dias >= 90">POPULAR</div>
          <div class="plan-header">
            <h3>{{ p.nombre }}</h3>
            <span class="plan-duration">{{ p.duracion_dias }} días de acceso</span>
          </div>

          <div class="plan-price-wrapper">
            <span class="currency">$</span>
            <span class="price-val">{{ p.precio }}</span>
          </div>

          <div class="plan-benefits">
            <p class="benefits-title">Beneficios incluidos:</p>
            <ul>
              <li *ngFor="let benefit of p.beneficios">
                <span class="check-icon">✓</span>
                <span>{{ benefit }}</span>
              </li>
            </ul>
          </div>

          <div class="plan-actions flex-between">
            <button class="btn btn-secondary btn-sm" (click)="openEditModal(p)">Editar</button>
            <button class="btn btn-danger btn-sm" (click)="deletePlan(p.id)">Eliminar</button>
          </div>
        </div>
      </div>

      <!-- MODAL FORMULARIO DE PLAN (Crear/Editar) -->
      <div class="modal-backdrop" *ngIf="showModal">
        <div class="glass-card modal-content animate-fade-in">
          <div class="flex-between modal-header">
            <h3>{{ isEditMode ? 'Editar Plan de Suscripción' : 'Nuevo Plan de Suscripción' }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>

          <form (submit)="savePlan()">
            <div class="form-group">
              <label class="form-label">Nombre del Plan</label>
              <input type="text" class="form-control" name="nombre" [(ngModel)]="planForm.nombre" required placeholder="Ej. Pase Trimestral">
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Precio ($)</label>
                <input type="number" class="form-control" name="precio" [(ngModel)]="planForm.precio" required placeholder="45" min="0">
              </div>
              
              <div class="form-group">
                <label class="form-label">Duración (en días)</label>
                <input type="number" class="form-control" name="duracion_dias" [(ngModel)]="planForm.duracion_dias" required placeholder="30" min="1">
              </div>
            </div>

            <!-- Beneficios dinámicos -->
            <div class="form-group">
              <label class="form-label">Beneficios e Incluye</label>
              
              <div class="benefit-input-row" *ngFor="let b of tempBenefits; let i = index; trackBy: trackByIndex">
                <input type="text" class="form-control" name="benefit-{{i}}" [(ngModel)]="tempBenefits[i]" placeholder="Ej. Clases de spinning ilimitadas">
                <button type="button" class="btn-remove-benefit" (click)="removeBenefitInput(i)">✕</button>
              </div>

              <button type="button" class="btn btn-secondary btn-sm mt-10" (click)="addBenefitInput()">
                + Agregar Beneficio
              </button>
            </div>

            <div class="flex-between form-actions">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary">{{ isEditMode ? 'Guardar Plan' : 'Crear Plan' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .plans-container {
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
    
    /* Plans Grid */
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    .plan-card {
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      min-height: 380px;
    }
    .plan-card.featured {
      border-color: var(--secondary);
      box-shadow: 0 8px 32px 0 rgba(139, 92, 246, 0.1);
    }
    .badge-featured {
      position: absolute;
      top: 12px;
      right: -32px;
      background: var(--secondary);
      color: #fff;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 4px 32px;
      transform: rotate(45deg);
      box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
      letter-spacing: 0.05em;
    }
    
    .plan-header h3 {
      font-size: 1.3rem;
      color: #fff;
      margin-bottom: 4px;
    }
    .plan-duration {
      font-size: 0.78rem;
      color: #71717a;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .plan-price-wrapper {
      margin: 20px 0;
      display: flex;
      align-items: baseline;
    }
    .plan-price-wrapper .currency {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--primary);
      margin-right: 2px;
    }
    .plan-price-wrapper .price-val {
      font-size: 2.8rem;
      font-weight: 800;
      font-family: var(--font-display);
      color: #fff;
      line-height: 1;
    }
    
    .plan-benefits {
      flex-grow: 1;
      margin-bottom: 24px;
    }
    .benefits-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: #a1a1aa;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    .plan-benefits ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .plan-benefits li {
      font-size: 0.88rem;
      color: #e4e4e7;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .check-icon {
      color: var(--primary);
      font-weight: bold;
    }
    
    .plan-actions {
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      padding-top: 16px;
    }
    .btn-sm {
      padding: 6px 14px;
      font-size: 0.78rem;
    }

    /* Modal inputs benefits */
    .benefit-input-row {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
      align-items: center;
    }
    .btn-remove-benefit {
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.2);
      color: var(--danger);
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .btn-remove-benefit:hover {
      background: var(--danger);
      color: #fff;
    }
    .mt-10 { margin-top: 10px; }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    /* Modal Backdrop */
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
    .form-actions {
      margin-top: 28px;
    }
  `]
})
export class PlansComponent implements OnInit {
  private db = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  planes: Plan[] = [];

  // Modal controls
  showModal = false;
  isEditMode = false;
  planForm: Omit<Plan, 'id' | 'beneficios'> & { id?: string } = this.getDefaultPlanForm();
  tempBenefits: string[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.db.getPlanes().subscribe(planes => {
      this.planes = planes;
      this.cdr.markForCheck();
    });
  }

  getDefaultPlanForm() {
    return {
      nombre: '',
      precio: 45,
      duracion_dias: 30
    };
  }

  openAddModal() {
    this.isEditMode = false;
    this.planForm = this.getDefaultPlanForm();
    this.tempBenefits = ['Acceso a sala de musculación', 'Clases dirigidas'];
    this.showModal = true;
  }

  openEditModal(plan: Plan) {
    this.isEditMode = true;
    this.planForm = {
      id: plan.id,
      nombre: plan.nombre,
      precio: plan.precio,
      duracion_dias: plan.duracion_dias
    };
    this.tempBenefits = [...plan.beneficios];
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  addBenefitInput() {
    this.tempBenefits.push('');
  }

  removeBenefitInput(index: number) {
    this.tempBenefits.splice(index, 1);
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  savePlan() {
    if (!this.planForm.nombre.trim()) return;

    // Filter out empty benefits
    const cleanBenefits = this.tempBenefits.map(b => b.trim()).filter(b => b.length > 0);

    const payload: Omit<Plan, 'id'> = {
      nombre: this.planForm.nombre,
      precio: this.planForm.precio,
      duracion_dias: this.planForm.duracion_dias,
      beneficios: cleanBenefits
    };

    if (this.isEditMode && this.planForm.id) {
      this.db.updatePlan(this.planForm.id, payload).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    } else {
      this.db.createPlan(payload).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    }
  }

  deletePlan(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este plan de suscripción?')) {
      this.db.deletePlan(id).subscribe(() => {
        this.loadData();
      });
    }
  }
}
