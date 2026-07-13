import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Pago } from '../models';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="payments-container animate-fade-in">
      <div class="header-section">
        <h1 class="title-grad">Historial de Pagos</h1>
        <p class="subtitle">Consulta los registros de facturación e ingresos del gimnasio.</p>
      </div>

      <!-- Filtro de Búsqueda -->
      <div class="glass-card filters-bar">
        <div class="search-box">
          <input 
            type="text" 
            class="form-control" 
            placeholder="🔍 Buscar transacciones por nombre de miembro..." 
            [(ngModel)]="searchQuery" 
            (ngModelChange)="filterPayments()">
        </div>
      </div>

      <!-- Tabla de Pagos -->
      <div class="glass-card list-card">
        <!-- Vista Desktop: Tabla de Pagos -->
        <div class="table-container desktop-only" *ngIf="filteredPayments.length > 0; else emptyState">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Factura ID</th>
                <th>Miembro</th>
                <th>Monto</th>
                <th>Fecha de Pago</th>
                <th>Método de Pago</th>
                <th>Estado</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of filteredPayments">
                <td>
                  <span class="invoice-id">#{{ p.id.substring(0, 8).toUpperCase() }}</span>
                </td>
                <td>
                  <div class="member-profile">
                    <span class="avatar-sm">{{ p.miembro?.nombre?.charAt(0) }}</span>
                    <span class="name">{{ p.miembro?.nombre || 'Miembro Eliminado' }}</span>
                  </div>
                </td>
                <td>
                  <div class="payment-amount">\${{ p.monto }}</div>
                  <div *ngIf="(p.tasa_cambio || tasaCambio) > 1" style="font-size: 0.75rem; color: #a1a1aa; font-weight: 500;">
                    Bs. {{ (p.monto * (p.tasa_cambio || tasaCambio)).toFixed(2) }}
                  </div>
                </td>
                <td>
                  <span>{{ formatDateTime(p.fecha_pago) }}</span>
                </td>
                <td>
                  <span class="payment-method">💳 {{ p.metodo_pago }}</span>
                </td>
                <td>
                  <span class="badge badge-active" *ngIf="p.estado === 'completado'">Completado</span>
                  <span class="badge badge-expired" *ngIf="p.estado === 'fallido'">Fallido</span>
                </td>
                <td style="text-align: right;">
                  <button class="btn btn-secondary btn-sm" (click)="viewReceipt(p)">Ver Recibo</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Vista Móvil: Tarjetas de Transacciones -->
        <div class="mobile-cards-container mobile-only" *ngIf="filteredPayments.length > 0">
          <div class="mobile-payment-card glass-card" *ngFor="let p of filteredPayments">
            <div class="card-header-row">
              <span class="invoice-id font-xs" style="font-family: monospace;">#{{ p.id.substring(0, 8).toUpperCase() }}</span>
              <div>
                <span class="badge badge-active" *ngIf="p.estado === 'completado'">Completado</span>
                <span class="badge badge-expired" *ngIf="p.estado === 'fallido'">Fallido</span>
              </div>
            </div>

            <div class="card-body-row mt-12 flex-between">
              <div class="member-profile">
                <span class="avatar-sm" style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: rgba(255,255,255,0.05); color: var(--secondary); font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.1); margin-right: 8px;">
                  {{ p.miembro?.nombre?.charAt(0) }}
                </span>
                <span class="name" style="font-weight: 600; color: #fff; font-size: 0.9rem;">
                  {{ p.miembro?.nombre || 'Miembro Eliminado' }}
                </span>
              </div>
              <div class="payment-amount-col text-right" style="display: flex; flex-direction: column; align-items: flex-end;">
                <span class="payment-amount" style="font-weight: 700; color: var(--primary); font-size: 1.1rem;">
                  \${{ p.monto }}
                </span>
                <span *ngIf="(p.tasa_cambio || tasaCambio) > 1" style="font-size: 0.78rem; color: #a1a1aa; font-weight: 600; margin-top: 2px;">
                  Bs. {{ (p.monto * (p.tasa_cambio || tasaCambio)).toFixed(2) }}
                </span>
              </div>
            </div>

            <div class="card-footer-row mt-12">
              <div class="payment-meta font-xs text-muted" style="display: flex; flex-direction: column; gap: 4px;">
                <span>📅 {{ formatDateTime(p.fecha_pago) }}</span>
                <span>💳 Método: {{ p.metodo_pago }}</span>
              </div>
              <button class="btn btn-secondary btn-sm" (click)="viewReceipt(p)">Ver Recibo</button>
            </div>
          </div>
        </div>

        <ng-template #emptyState>
          <div class="empty-state">
            <span class="empty-icon">💸</span>
            <p>No se encontraron transacciones registradas.</p>
          </div>
        </ng-template>
      </div>

      <!-- MODAL DE RECIBO DE PAGO -->
      <div class="modal-backdrop" *ngIf="showReceiptModal">
        <div class="glass-card modal-content receipt-box animate-fade-in" *ngIf="selectedPago">
          <div class="receipt-header">
            <div class="flex-between">
              <h2 class="receipt-logo">Gym<span class="text-green">Flow</span></h2>
              <button class="close-btn" (click)="closeReceipt()">✕</button>
            </div>
            <p class="receipt-tagline">Centro de Entrenamiento de Alto Rendimiento</p>
          </div>

          <div class="receipt-body">
            <div class="receipt-status-badge">PAGO COMPLETADO</div>
            
            <div class="receipt-section">
              <div class="row">
                <span class="label">Nro. Factura:</span>
                <span class="val text-white">#{{ selectedPago.id.toUpperCase() }}</span>
              </div>
              <div class="row">
                <span class="label">Fecha y Hora:</span>
                <span class="val">{{ formatDateTime(selectedPago.fecha_pago) }}</span>
              </div>
              <div class="row">
                <span class="label">Método de Pago:</span>
                <span class="val">{{ selectedPago.metodo_pago }}</span>
              </div>
              <div class="row" *ngIf="(selectedPago.tasa_cambio || tasaCambio) > 1">
                <span class="label">Tasa de Cambio:</span>
                <span class="val">{{ selectedPago.tasa_cambio || tasaCambio }} Bs.</span>
              </div>
            </div>

            <div class="divider"></div>

            <div class="receipt-section">
              <h4>Detalle del Cliente</h4>
              <div class="row">
                <span class="label">Nombre:</span>
                <span class="val text-white">{{ selectedPago.miembro?.nombre }}</span>
              </div>
              <div class="row" *ngIf="selectedPago.miembro?.email">
                <span class="label">Email:</span>
                <span class="val">{{ selectedPago.miembro?.email }}</span>
              </div>
              <div class="row" *ngIf="selectedPago.miembro?.telefono">
                <span class="label">Teléfono:</span>
                <span class="val">{{ selectedPago.miembro?.telefono }}</span>
              </div>
            </div>

            <div class="divider"></div>

            <div class="receipt-section amount-summary">
              <div class="flex-between" style="align-items: flex-start;">
                <span class="total-label" style="margin-top: 6px;">TOTAL NETO:</span>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                  <span class="total-val">\${{ selectedPago.monto }}</span>
                  <span *ngIf="(selectedPago.tasa_cambio || tasaCambio) > 1" style="font-size: 1.15rem; color: #a1a1aa; font-weight: 700; font-family: var(--font-display);">
                    Bs. {{ (selectedPago.monto * (selectedPago.tasa_cambio || tasaCambio)).toFixed(2) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="receipt-footer">
            <p>¡Gracias por entrenar con nosotros!</p>
            <p class="footer-note">GymFlow System - Keep Flowing</p>
            <button class="btn btn-primary w-full mt-20" (click)="printReceipt()">Imprimir Recibo</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payments-container {
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

    .filters-bar {
      padding: 16px 24px;
    }
    .search-box {
      max-width: 480px;
    }
    
    .invoice-id {
      font-family: monospace;
      color: #71717a;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .member-profile {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .avatar-sm {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      color: var(--secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.75rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .member-profile .name {
      font-weight: 500;
      color: #fff;
    }
    .payment-amount {
      font-weight: 700;
      color: var(--primary);
    }
    .payment-method {
      font-size: 0.85rem;
      color: #a1a1aa;
    }

    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content.receipt-box {
      --modal-pad-top: 24px;
      --modal-pad-bottom: 24px;
      --modal-pad-side: 24px;
      width: 100%;
      max-width: 420px;
      padding: 24px;
      background: #121218;
      border: 1px solid var(--border-glow);
    }
    
    /* Receipt Styles */
    .receipt-header {
      text-align: center;
      margin-bottom: 24px;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
      padding-bottom: 16px;
    }
    .receipt-logo {
      font-size: 1.5rem;
      font-weight: 800;
      font-family: var(--font-display);
      margin: 0 auto;
    }
    .text-green { color: var(--primary); }
    .receipt-tagline {
      font-size: 0.7rem;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 4px;
    }

    .receipt-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .receipt-status-badge {
      background: rgba(0, 255, 136, 0.1);
      color: var(--primary);
      border: 1px solid rgba(0, 255, 136, 0.2);
      font-size: 0.75rem;
      font-weight: 800;
      padding: 6px;
      text-align: center;
      border-radius: 4px;
      letter-spacing: 0.08em;
    }
    .receipt-section h4 {
      font-size: 0.8rem;
      color: #a1a1aa;
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 0.05em;
    }
    .row {
      display: flex;
      justify-content: space-between;
      font-size: 0.82rem;
      margin-bottom: 6px;
    }
    .row .label { color: #71717a; }
    .row .val { color: #e4e4e7; text-align: right; }
    .text-white { color: #fff !important; }
    
    .divider {
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
      margin: 8px 0;
    }

    .amount-summary {
      padding: 10px 0;
    }
    .total-label {
      font-weight: 700;
      font-size: 0.9rem;
      color: #fff;
    }
    .total-val {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--primary);
      font-family: var(--font-display);
    }
    
    .receipt-footer {
      text-align: center;
      margin-top: 24px;
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
      padding-top: 16px;
      font-size: 0.8rem;
      color: #71717a;
    }
    .footer-note {
      font-size: 0.65rem;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .w-full { width: 100%; }
    .mt-20 { margin-top: 20px; }
    .close-btn {
      background: transparent;
      border: none;
      color: #71717a;
      font-size: 1.1rem;
      cursor: pointer;
    }
    .close-btn:hover { color: #fff; }

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
export class PaymentsComponent implements OnInit {
  private db = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  payments: Pago[] = [];
  filteredPayments: Pago[] = [];
  searchQuery = '';
  tasaCambio = 1.0;

  // Modal control
  showReceiptModal = false;
  selectedPago: Pago | null = null;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.db.getTasaCambio().subscribe(tasa => {
      this.tasaCambio = tasa;
      this.cdr.markForCheck();
    });
    this.db.getPagos().subscribe(payments => {
      this.payments = payments;
      this.filterPayments();
      this.cdr.markForCheck();
    });
  }

  filterPayments() {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredPayments = this.payments;
      return;
    }

    this.filteredPayments = this.payments.filter(p => {
      return p.miembro && p.miembro.nombre.toLowerCase().includes(query);
    });
  }

  viewReceipt(pago: Pago) {
    this.selectedPago = pago;
    this.showReceiptModal = true;
  }

  closeReceipt() {
    this.showReceiptModal = false;
    this.selectedPago = null;
  }

  printReceipt() {
    window.print();
  }

  formatDateTime(dateTimeStr: string): string {
    const d = new Date(dateTimeStr);
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + 
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
