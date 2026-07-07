import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Miembro, Plan, PreguntaAnamnesis, RespuestaAnamnesis, AnamnesisMiembro } from '../models';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="members-container animate-fade-in">
      <div class="flex-between header-section">
        <div>
          <h1 class="title-grad">Directorio de Miembros</h1>
          <p class="subtitle">Administra los atletas, sus suscripciones y estados de cuenta.</p>
        </div>
        <div class="flex-gap-2">
          <button class="btn btn-secondary" (click)="openConfigModal()" title="Configurar las preguntas globales de la ficha médica">
            <span>⚙️ Configurar Anamnesis</span>
          </button>
          <button class="btn btn-primary" (click)="openAddModal()">
            <span>+ Nuevo Miembro</span>
          </button>
        </div>
      </div>

      <!-- Barra de Filtros -->
      <div class="glass-card filters-bar flex-between">
        <div class="search-box">
          <input 
            type="text" 
            class="form-control search-input" 
            placeholder="🔍 Buscar por nombre, email o teléfono..." 
            [(ngModel)]="searchQuery" 
            (ngModelChange)="filterMembers()">
        </div>
        
        <div class="status-filters flex-gap-2">
          <button 
            class="btn btn-sm" 
            [class.btn-primary]="selectedStatus === 'todos'" 
            [class.btn-secondary]="selectedStatus !== 'todos'"
            (click)="setStatusFilter('todos')">Todos</button>
          <button 
            class="btn btn-sm" 
            [class.btn-primary]="selectedStatus === 'activo'" 
            [class.btn-secondary]="selectedStatus !== 'activo'"
            (click)="setStatusFilter('activo')">Activos</button>
          <button 
            class="btn btn-sm" 
            [class.btn-primary]="selectedStatus === 'vencido'" 
            [class.btn-secondary]="selectedStatus !== 'vencido'"
            (click)="setStatusFilter('vencido')">Vencidos</button>
          <button 
            class="btn btn-sm" 
            [class.btn-primary]="selectedStatus === 'inactivo'" 
            [class.btn-secondary]="selectedStatus !== 'inactivo'"
            (click)="setStatusFilter('inactivo')">Inactivos</button>
        </div>
      </div>

      <!-- Listado de Miembros -->
      <div class="glass-card list-card">
        <!-- Vista Desktop: Tabla de Miembros -->
        <div class="table-container desktop-only" *ngIf="filteredMembers.length > 0; else emptyState">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Miembro</th>
                <th>Contacto</th>
                <th>Plan Actual</th>
                <th>Vigencia</th>
                <th>Estado</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of filteredMembers">
                <td>
                  <div class="member-profile">
                    <div class="avatar">{{ m.nombre.charAt(0) }}</div>
                    <div class="info">
                      <span class="name">{{ m.nombre }}</span>
                      <span class="id-tag">ID: {{ m.id.substring(0, 8) }}</span>
                      <span class="birth-date" *ngIf="m.fecha_nacimiento">🎂 Cumple: {{ formatDate(m.fecha_nacimiento) }}</span>
                      <span class="join-date">📅 Ingreso: {{ formatDate(m.fecha_ingreso || m.created_at) }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="contact-info">
                    <span class="email">{{ m.email || 'Sin correo' }}</span>
                    <span class="phone">{{ m.telefono || 'Sin teléfono' }}</span>
                  </div>
                </td>
                <td>
                  <div class="plan-info" *ngIf="m.plan; else noPlan">
                    <span class="plan-name">{{ m.plan.nombre }}</span>
                    <span class="plan-price">\${{ m.plan.precio }}</span>
                  </div>
                  <ng-template #noPlan><span class="text-muted">Ninguno</span></ng-template>
                </td>
                <td>
                  <div class="date-info" *ngIf="m.plan; else noDates">
                    <span class="expiry-date" [class.text-danger]="m.estado === 'vencido'">
                      Vence: {{ formatDate(m.fecha_fin) }}
                    </span>
                    <span class="start-date">Inició: {{ formatDate(m.fecha_inicio) }}</span>
                    <span class="cobro-date" *ngIf="m.fecha_cobro">
                      💵 Cobro: {{ formatDate(m.fecha_cobro) }}
                    </span>
                  </div>
                  <ng-template #noDates>
                    <div class="date-info">
                      <span class="cobro-date" *ngIf="m.fecha_cobro">💵 Cobro: {{ formatDate(m.fecha_cobro) }}</span>
                      <span class="text-muted" *ngIf="!m.fecha_cobro">-</span>
                    </div>
                  </ng-template>
                </td>
                <td>
                  <span class="badge" [class.badge-active]="m.estado === 'activo'"
                                       [class.badge-expired]="m.estado === 'vencido'"
                                       [class.badge-inactive]="m.estado === 'inactivo'">
                    {{ m.estado }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div class="actions-wrapper">
                    <button class="btn-action border-cyan" [class.active-record]="m.anamnesis" [title]="m.anamnesis ? 'Ficha Médica (Completada)' : 'Registrar Ficha Médica'" (click)="openAnamnesisModal(m)">📋</button>
                    <button class="btn-action border-cyan" title="Ver Marcas / PRs" (click)="viewMemberScores(m)">🏆</button>
                    <button class="btn-action" title="Editar Miembro" (click)="openEditModal(m)">✏️</button>
                    <button class="btn-action border-green" title="Registrar Pago" *ngIf="m.plan_id" (click)="openPaymentModal(m)">💵</button>
                    <button class="btn-action border-danger" title="Eliminar Miembro" (click)="deleteMember(m.id)">🗑️</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Vista Móvil: Tarjetas de Miembros -->
        <div class="mobile-cards-container mobile-only" *ngIf="filteredMembers.length > 0">
          <div class="mobile-member-card glass-card" *ngFor="let m of filteredMembers">
            <div class="card-header-row">
              <div class="member-profile">
                <div class="avatar">{{ m.nombre.charAt(0) }}</div>
                <div class="info">
                  <span class="name">{{ m.nombre }}</span>
                  <span class="id-tag">ID: {{ m.id.substring(0, 8) }}</span>
                </div>
              </div>
              <span class="badge" [class.badge-active]="m.estado === 'activo'"
                                   [class.badge-expired]="m.estado === 'vencido'"
                                   [class.badge-inactive]="m.estado === 'inactivo'">
                {{ m.estado }}
              </span>
            </div>

            <div class="card-body-row mt-12">
              <div class="contact-info">
                <span>📧 {{ m.email || 'Sin correo' }}</span>
                <span>📞 {{ m.telefono || 'Sin teléfono' }}</span>
              </div>
              
              <div class="plan-details mt-8 flex-between">
                <div class="plan-info" *ngIf="m.plan; else noMobilePlan">
                  <span class="plan-name" style="font-weight: 700; color: var(--primary);">{{ m.plan.nombre }}</span>
                  <span class="plan-price text-muted">\${{ m.plan.precio }}</span>
                </div>
                <ng-template #noMobilePlan><span class="text-muted">Sin Plan</span></ng-template>
                
                <div class="date-info text-right" *ngIf="m.plan">
                  <span class="expiry-date font-xs" [class.text-danger]="m.estado === 'vencido'">
                    Vence: {{ formatDate(m.fecha_fin) }}
                  </span>
                </div>
              </div>

              <div class="dates-meta mt-8 flex-between text-muted font-xs">
                <span *ngIf="m.fecha_nacimiento">🎂 {{ formatDate(m.fecha_nacimiento) }}</span>
                <span>📅 Ingreso: {{ formatDate(m.fecha_ingreso || m.created_at) }}</span>
              </div>
            </div>

            <div class="card-footer-row mt-12">
              <div class="cobro-info">
                <span class="cobro-date font-xs" style="color: var(--accent); font-weight: 600;" *ngIf="m.fecha_cobro">
                  💵 Cobro: {{ formatDate(m.fecha_cobro) }}
                </span>
                <span class="text-muted font-xs" *ngIf="!m.fecha_cobro">-</span>
              </div>
              
              <div class="actions-wrapper">
                <button class="btn-action border-cyan" [class.active-record]="m.anamnesis" [title]="m.anamnesis ? 'Ficha Médica (Completada)' : 'Registrar Ficha Médica'" (click)="openAnamnesisModal(m)">📋</button>
                <button class="btn-action border-cyan" title="Ver Marcas / PRs" (click)="viewMemberScores(m)">🏆</button>
                <button class="btn-action" title="Editar Miembro" (click)="openEditModal(m)">✏️</button>
                <button class="btn-action border-green" title="Registrar Pago" *ngIf="m.plan_id" (click)="openPaymentModal(m)">💵</button>
                <button class="btn-action border-danger" title="Eliminar Miembro" (click)="deleteMember(m.id)">🗑️</button>
              </div>
            </div>
          </div>
        </div>

        <ng-template #emptyState>
          <div class="empty-state">
            <span class="empty-icon">🔍</span>
            <p>No se encontraron miembros que coincidan con la búsqueda o el filtro.</p>
          </div>
        </ng-template>
      </div>

      <!-- MODAL FORMULARIO (Crear/Editar) -->
      <div class="modal-backdrop" *ngIf="showModal">
        <div class="glass-card modal-content animate-fade-in">
          <div class="flex-between modal-header">
            <h3>{{ isEditMode ? 'Editar Miembro' : 'Nuevo Miembro' }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          
          <form (submit)="saveMember()">
            <div class="form-group">
              <label class="form-label">Nombre Completo</label>
              <input type="text" class="form-control" name="nombre" [(ngModel)]="memberForm.nombre" required placeholder="Ej. Juan Pérez">
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Correo Electrónico</label>
                <input type="email" class="form-control" name="email" [(ngModel)]="memberForm.email" placeholder="juan@email.com">
              </div>
              <div class="form-group">
                <label class="form-label">Teléfono</label>
                <input type="text" class="form-control" name="telefono" [(ngModel)]="memberForm.telefono" placeholder="555-0199">
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Fecha de Nacimiento</label>
                <input type="date" class="form-control" name="fecha_nacimiento" [(ngModel)]="memberForm.fecha_nacimiento">
              </div>
              <div class="form-group">
                <label class="form-label">Fecha de Ingreso</label>
                <input type="date" class="form-control" name="fecha_ingreso" [(ngModel)]="memberForm.fecha_ingreso" required>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Plan de Suscripción</label>
                <select class="form-control" name="plan_id" [(ngModel)]="memberForm.plan_id" (change)="onPlanChange()">
                  <option [value]="null">Sin Plan / Inactivo</option>
                  <option *ngFor="let p of planes" [value]="p.id">{{ p.nombre }} - \${{ p.precio }} ({{ p.duracion_dias }} días)</option>
                </select>
              </div>
              
              <div class="form-group" *ngIf="memberForm.plan_id">
                <label class="form-label">Fecha de Inicio</label>
                <input type="date" class="form-control" name="fecha_inicio" [(ngModel)]="memberForm.fecha_inicio" (change)="onPlanChange()">
              </div>
            </div>

            <div class="form-grid" *ngIf="memberForm.plan_id">
              <div class="form-group">
                <label class="form-label text-cyan">Fin de Suscripción Estimado</label>
                <input type="date" class="form-control font-cyan" name="fecha_fin" [ngModel]="memberForm.fecha_fin" disabled>
                <span class="info-note">Calculado automáticamente.</span>
              </div>
              <div class="form-group">
                <label class="form-label text-accent">Fecha de Cobro</label>
                <input type="date" class="form-control" name="fecha_cobro" [(ngModel)]="memberForm.fecha_cobro">
                <span class="info-note">Próximo cobro/facturación.</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Estado de la Cuenta</label>
              <select class="form-control" name="estado" [(ngModel)]="memberForm.estado">
                <option value="activo">Activo (Acceso Permitido)</option>
                <option value="vencido">Vencido (Acceso Bloqueado)</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div class="flex-between form-actions">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary">{{ isEditMode ? 'Guardar Cambios' : 'Registrar Miembro' }}</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL DE PAGO RÁPIDO -->
      <div class="modal-backdrop" *ngIf="showPaymentModal">
        <div class="glass-card modal-content animate-fade-in max-w-sm">
          <div class="flex-between modal-header">
            <h3>Registrar Pago</h3>
            <button class="close-btn" (click)="closePaymentModal()">✕</button>
          </div>
          
          <div class="payment-summary">
            <p class="summary-label">Miembro</p>
            <p class="summary-value text-white">{{ activePaymentMember?.nombre }}</p>
            
            <p class="summary-label mt-12">Plan Asignado</p>
            <p class="summary-value text-cyan">{{ activePaymentMember?.plan?.nombre }}</p>

            <p class="summary-label mt-12">Monto a Pagar</p>
            <p class="summary-amount">\${{ activePaymentMember?.plan?.precio }}</p>
          </div>

          <form (submit)="recordPayment()">
            <div class="form-group">
              <label class="form-label">Método de Pago</label>
              <select class="form-control" name="metodo_pago" [(ngModel)]="paymentForm.metodo_pago">
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                <option value="Transferencia">Transferencia Bancaria</option>
              </select>
            </div>

            <div class="flex-between form-actions mt-24">
              <button type="button" class="btn btn-secondary" (click)="closePaymentModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary">Registrar y Renovar</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL DE CONFIGURACIÓN DE PLANTILLA DE ANAMNESIS -->
      <div class="modal-backdrop" *ngIf="showConfigModal">
        <div class="glass-card modal-content animate-fade-in max-w-lg">
          <div class="flex-between modal-header">
            <h3>⚙️ Configurar Ficha Médica</h3>
            <button class="close-btn" (click)="closeConfigModal()">✕</button>
          </div>

          <!-- Nueva Pregunta Form -->
          <div class="new-question-section">
            <h4 class="section-title">Nueva Pregunta</h4>
            <div class="form-group">
              <label class="form-label">Texto de la Pregunta</label>
              <input type="text" class="form-control" placeholder="Ej. ¿Tiene antecedentes de asma?" [(ngModel)]="nuevaPreguntaTexto">
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Tipo de Respuesta</label>
                <select class="form-control" [(ngModel)]="nuevaPreguntaTipo">
                  <option value="sino">Sí / No</option>
                  <option value="texto">Texto Libre</option>
                </select>
              </div>
              <div class="form-group flex-align-end">
                <button type="button" class="btn btn-primary w-full" (click)="agregarPregunta()">
                  Agregar Pregunta
                </button>
              </div>
            </div>
          </div>

          <hr class="modal-divider">

          <!-- Listado de Preguntas de la Plantilla -->
          <div class="questions-list-section">
            <h4 class="section-title">Preguntas Configuradas ({{ plantillaPreguntas.length }})</h4>
            <div class="questions-scroll">
              <div class="question-item flex-between" *ngFor="let q of plantillaPreguntas; let i = index">
                <div class="question-info">
                  <span class="q-number">#{{ i + 1 }}</span>
                  <span class="q-text">{{ q.texto }}</span>
                  <span class="badge badge-type" [class.badge-active]="q.tipo === 'sino'">
                    {{ q.tipo === 'sino' ? 'Sí/No' : 'Texto' }}
                  </span>
                </div>
                <button class="btn-action border-danger btn-sm-action" (click)="eliminarPregunta(q.id)" title="Eliminar Pregunta">✕</button>
              </div>
              <div class="empty-questions" *ngIf="plantillaPreguntas.length === 0">
                Aún no hay preguntas configuradas.
              </div>
            </div>
          </div>

          <div class="flex-between form-actions mt-24">
            <button type="button" class="btn btn-secondary" (click)="closeConfigModal()">Cancelar</button>
            <button type="button" class="btn btn-primary" (click)="guardarPlantilla()">Guardar Plantilla</button>
          </div>
        </div>
      </div>

      <!-- MODAL DE FICHA MÉDICA DE MIEMBRO -->
      <div class="modal-backdrop" *ngIf="showAnamnesisModal">
        <div class="glass-card modal-content animate-fade-in max-w-lg">
          <div class="flex-between modal-header">
            <div>
              <h3>📋 Ficha Médica / Anamnesis</h3>
              <p class="subtitle mt-4">Miembro: {{ activeAnamnesisMember?.nombre }}</p>
            </div>
            <button class="close-btn" (click)="closeAnamnesisModal()">✕</button>
          </div>

          <div class="anamnesis-status-bar" *ngIf="activeAnamnesisMember?.anamnesis">
            <span class="text-green">✓ Completada el {{ formatDate(activeAnamnesisMember?.anamnesis?.fecha_completado) }}</span>
          </div>

          <div class="anamnesis-form-scroll">
            <div *ngIf="anamnesisFormAnswers.length === 0" class="empty-questions">
              No hay preguntas en la plantilla. Ve a "Configurar Anamnesis" para configurarlas.
            </div>

            <div class="anamnesis-form-field" *ngFor="let ans of anamnesisFormAnswers; let i = index">
              <label class="form-label q-label">Pregunta {{ i + 1 }}</label>
              <p class="pregunta-texto-display">{{ ans.pregunta_texto }}</p>

              <!-- Condicional por tipo de pregunta -->
              <!-- Tipo 'sino' -->
              <div *ngIf="ans.tipo === 'sino'" class="sino-buttons-container">
                <button type="button" class="btn-sino" [class.active-si]="ans.respuesta === 'si'" (click)="ans.respuesta = 'si'">
                  Sí
                </button>
                <button type="button" class="btn-sino" [class.active-no]="ans.respuesta === 'no'" (click)="ans.respuesta = 'no'">
                  No
                </button>
              </div>

              <!-- Tipo 'texto' -->
              <div *ngIf="ans.tipo === 'texto'">
                <textarea class="form-control text-area-premium" rows="2" [(ngModel)]="ans.respuesta" placeholder="Escribe la respuesta aquí..."></textarea>
              </div>
            </div>
          </div>

          <div class="flex-between form-actions mt-24">
            <button type="button" class="btn btn-secondary" (click)="closeAnamnesisModal()">Cancelar</button>
            <button type="button" class="btn btn-primary" [disabled]="anamnesisFormAnswers.length === 0" (click)="saveAnamnesis()">
              Guardar Ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .members-container {
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
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .search-box {
      flex-grow: 1;
      max-width: 480px;
    }
    .search-input {
      background: rgba(0, 0, 0, 0.4);
    }
    
    /* Table profiles */
    .member-profile {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--accent) 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #fff;
      font-family: var(--font-display);
    }
    .member-profile .info {
      display: flex;
      flex-direction: column;
    }
    .member-profile .name {
      font-weight: 600;
      color: #fff;
    }
    .member-profile .id-tag {
      font-size: 0.7rem;
      color: #71717a;
    }
    .birth-date, .join-date {
      font-size: 0.7rem;
      color: #a1a1aa;
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .birth-date {
      color: #f472b6;
    }
    
    .contact-info {
      display: flex;
      flex-direction: column;
      font-size: 0.82rem;
    }
    .contact-info .email { color: #e4e4e7; }
    .contact-info .phone { color: #71717a; }

    .plan-info {
      display: flex;
      flex-direction: column;
    }
    .plan-info .plan-name {
      font-weight: 600;
      color: var(--primary);
      font-size: 0.85rem;
    }
    .plan-info .plan-price {
      font-size: 0.75rem;
      color: #a1a1aa;
    }

    .date-info {
      display: flex;
      flex-direction: column;
      font-size: 0.8rem;
    }
    .date-info .expiry-date { font-weight: 600; }
    .date-info .start-date { color: #71717a; font-size: 0.72rem; }
    .date-info .cobro-date {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--accent);
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .text-muted { color: #71717a; font-size: 0.8rem; }

    .actions-wrapper {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .btn-action {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-glow);
      color: #fff;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }
    .btn-action:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-1px);
    }
    .btn-action.border-green:hover {
      border-color: var(--primary);
      background: var(--primary-glow);
    }
    .btn-action.border-danger:hover {
      border-color: var(--danger);
      background: var(--danger-glow);
    }

    /* Modal styles */
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
      max-width: 580px;
      padding: 30px;
    }
    .max-w-sm { max-width: 400px; }
    .modal-header {
      margin-bottom: 24px;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: #71717a;
      font-size: 1.2rem;
      cursor: pointer;
      transition: color 0.2s;
    }
    .close-btn:hover { color: #fff; }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .font-cyan {
      color: var(--accent);
      font-weight: 600;
      border-color: rgba(6, 182, 212, 0.3);
    }
    .info-note {
      font-size: 0.75rem;
      color: #71717a;
      margin-top: 4px;
      display: block;
    }
    .form-actions {
      margin-top: 28px;
    }

    /* Payment Quick Modal Info */
    .payment-summary {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-md);
      padding: 16px;
      margin-bottom: 20px;
    }
    .summary-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      color: #71717a;
      font-weight: 600;
    }
    .summary-value {
      font-weight: 600;
      font-size: 0.92rem;
    }
    .summary-amount {
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--primary);
      font-family: var(--font-display);
    }
    .mt-12 { margin-top: 12px; }
    .mt-24 { margin-top: 24px; }
    .text-white { color: #fff; }
    .text-cyan { color: var(--accent); }

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

    /* Estilos Premium para Anamnesis */
    .max-w-lg { max-width: 600px; }
    .w-full { width: 100%; }
    .mt-4 { margin-top: 4px; }
    .flex-align-end {
      display: flex;
      align-items: flex-end;
    }
    
    .btn-action.border-cyan:hover {
      border-color: var(--accent);
      background: var(--accent-glow);
    }
    .btn-action.active-record {
      border-color: var(--primary);
      background: var(--primary-glow);
      color: var(--primary);
    }

    .modal-divider {
      border: 0;
      height: 1px;
      background: var(--border-glow);
      margin: 20px 0;
    }

    .new-question-section {
      background: rgba(0, 0, 0, 0.2);
      padding: 16px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-glow);
    }
    .section-title {
      font-size: 0.95rem;
      margin-bottom: 12px;
      color: #fff;
    }

    .questions-scroll {
      max-height: 200px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 8px;
    }
    .question-item {
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-glow);
      border-radius: var(--radius-sm);
    }
    .question-info {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.85rem;
    }
    .q-number {
      font-weight: 700;
      color: var(--accent);
    }
    .q-text {
      color: #e4e4e7;
    }
    .badge-type {
      font-size: 9px;
      padding: 2px 6px;
    }
    .btn-sm-action {
      width: 24px;
      height: 24px;
      font-size: 0.75rem;
    }

    /* Anamnesis Member Form styles */
    .anamnesis-status-bar {
      background: rgba(0, 255, 136, 0.08);
      border: 1px solid rgba(0, 255, 136, 0.15);
      border-radius: var(--radius-sm);
      padding: 8px 12px;
      font-size: 0.85rem;
      margin-bottom: 20px;
    }
    .text-green {
      color: var(--primary);
      font-weight: 600;
    }

    .anamnesis-form-scroll {
      max-height: 450px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding-right: 8px;
    }
    .anamnesis-form-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .q-label {
      margin-bottom: 0;
      font-size: 0.7rem;
      color: var(--accent);
    }
    .pregunta-texto-display {
      font-size: 0.95rem;
      color: #fff;
      font-weight: 500;
    }
    
    .sino-buttons-container {
      display: flex;
      gap: 12px;
    }
    .btn-sino {
      flex: 1;
      padding: 10px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-glow);
      color: #a1a1aa;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-sino:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
    .btn-sino.active-si {
      border-color: var(--primary);
      background: rgba(0, 255, 136, 0.1);
      color: var(--primary);
      box-shadow: 0 0 10px rgba(0, 255, 136, 0.1);
    }
    .btn-sino.active-no {
      border-color: var(--danger);
      background: rgba(244, 63, 94, 0.1);
      color: var(--danger);
      box-shadow: 0 0 10px rgba(244, 63, 94, 0.1);
    }
    .text-area-premium {
      resize: vertical;
      min-height: 60px;
      background: rgba(0, 0, 0, 0.4);
    }
    .empty-questions {
      text-align: center;
      padding: 20px;
      color: #71717a;
      font-style: italic;
      font-size: 0.9rem;
    }
  `]
})
export class MembersComponent implements OnInit {
  private db = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  members: Miembro[] = [];
  filteredMembers: Miembro[] = [];
  planes: Plan[] = [];

  // Filters
  searchQuery = '';
  selectedStatus = 'todos';

  // Modal control
  showModal = false;
  isEditMode = false;
  memberForm: Omit<Miembro, 'id'> & { id?: string } = this.getDefaultMemberForm();

  // Payment quick registration modal
  showPaymentModal = false;
  activePaymentMember: Miembro | null = null;
  paymentForm = {
    metodo_pago: 'Efectivo'
  };

  // Anamnesis logic variables
  showAnamnesisModal = false;
  activeAnamnesisMember: Miembro | null = null;
  anamnesisFormAnswers: RespuestaAnamnesis[] = [];

  showConfigModal = false;
  plantillaPreguntas: PreguntaAnamnesis[] = [];
  nuevaPreguntaTexto = '';
  nuevaPreguntaTipo: 'sino' | 'texto' = 'sino';

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.db.getPlanes().subscribe(planes => {
      this.planes = planes;
      this.db.getMiembros().subscribe(miembros => {
        this.members = miembros;
        this.filterMembers();
        this.cdr.markForCheck();
      });
    });
  }

  filterMembers() {
    this.filteredMembers = this.members.filter(m => {
      // Filter by status
      const matchesStatus = this.selectedStatus === 'todos' || m.estado === this.selectedStatus;
      
      // Filter by search query
      const query = this.searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        m.nombre.toLowerCase().includes(query) ||
        (m.email && m.email.toLowerCase().includes(query)) ||
        (m.telefono && m.telefono.includes(query));

      return matchesStatus && matchesSearch;
    });
  }

  setStatusFilter(status: string) {
    this.selectedStatus = status;
    this.filterMembers();
  }

  getDefaultMemberForm() {
    return {
      nombre: '',
      email: '',
      telefono: '',
      plan_id: null,
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: '',
      estado: 'activo' as const,
      fecha_nacimiento: '',
      fecha_ingreso: new Date().toISOString().split('T')[0],
      fecha_cobro: ''
    };
  }

  openAddModal() {
    this.isEditMode = false;
    this.memberForm = this.getDefaultMemberForm();
    this.onPlanChange(); // Calculate initial dates
    this.showModal = true;
  }

  openEditModal(member: Miembro) {
    this.isEditMode = true;
    this.memberForm = {
      id: member.id,
      nombre: member.nombre,
      email: member.email,
      telefono: member.telefono,
      plan_id: member.plan_id,
      fecha_inicio: member.fecha_inicio,
      fecha_fin: member.fecha_fin,
      estado: member.estado,
      fecha_nacimiento: member.fecha_nacimiento || '',
      fecha_ingreso: member.fecha_ingreso || member.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      fecha_cobro: member.fecha_cobro || ''
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  onPlanChange() {
    if (!this.memberForm.plan_id) {
      this.memberForm.fecha_fin = '';
      this.memberForm.fecha_cobro = '';
      return;
    }

    const selectedPlan = this.planes.find(p => p.id === this.memberForm.plan_id);
    if (selectedPlan && this.memberForm.fecha_inicio) {
      const startDate = new Date(this.memberForm.fecha_inicio);
      startDate.setDate(startDate.getDate() + selectedPlan.duracion_dias);
      this.memberForm.fecha_fin = startDate.toISOString().split('T')[0];
      
      // Auto-assign billing date to match plan start date if currently empty
      if (!this.memberForm.fecha_cobro) {
        this.memberForm.fecha_cobro = this.memberForm.fecha_inicio;
      }
    }
  }

  saveMember() {
    if (!this.memberForm.nombre.trim()) return;

    const payload: Omit<Miembro, 'id'> = {
      nombre: this.memberForm.nombre,
      email: this.memberForm.email,
      telefono: this.memberForm.telefono,
      plan_id: this.memberForm.plan_id,
      fecha_inicio: this.memberForm.fecha_inicio,
      fecha_fin: this.memberForm.fecha_fin || this.memberForm.fecha_inicio,
      estado: this.memberForm.estado,
      fecha_nacimiento: this.memberForm.fecha_nacimiento || undefined,
      fecha_ingreso: this.memberForm.fecha_ingreso || new Date().toISOString().split('T')[0],
      fecha_cobro: this.memberForm.fecha_cobro || undefined
    };

    if (this.isEditMode && this.memberForm.id) {
      this.db.updateMiembro(this.memberForm.id, payload).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    } else {
      this.db.createMiembro(payload).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    }
  }

  deleteMember(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar este miembro? Se borrarán sus datos y registros de pago.')) {
      this.db.deleteMiembro(id).subscribe(() => {
        this.loadData();
      });
    }
  }

  // Quick Payment logic
  openPaymentModal(member: Miembro) {
    this.activePaymentMember = member;
    this.paymentForm = { metodo_pago: 'Efectivo' };
    this.showPaymentModal = true;
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.activePaymentMember = null;
  }

  recordPayment() {
    if (!this.activePaymentMember || !this.activePaymentMember.plan) return;

    // Create a payment record
    const pagoRecord = {
      miembro_id: this.activePaymentMember.id,
      monto: this.activePaymentMember.plan.precio,
      metodo_pago: this.paymentForm.metodo_pago,
      estado: 'completado'
    };

    this.db.createPago(pagoRecord).subscribe(() => {
      // Renew membership dates starting today
      const todayStr = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (this.activePaymentMember!.plan!.duracion_dias || 30));
      const endDateStr = endDate.toISOString().split('T')[0];

      // Update member state to active and renew dates including billing date
      this.db.updateMiembro(this.activePaymentMember!.id, {
        fecha_inicio: todayStr,
        fecha_fin: endDateStr,
        estado: 'activo',
        fecha_cobro: todayStr
      }).subscribe(() => {
        alert('Pago registrado correctamente. Suscripción renovada con éxito.');
        this.loadData();
        this.closePaymentModal();
      });
    });
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr.split('T')[0] + 'T00:00:00'); // Prevent timezone issues
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // --- CONFIGURACIÓN DE PLANTILLA DE ANAMNESIS ---
  openConfigModal() {
    this.db.getAnamnesisPlantilla().subscribe(preguntas => {
      this.plantillaPreguntas = preguntas;
      this.nuevaPreguntaTexto = '';
      this.nuevaPreguntaTipo = 'sino';
      this.showConfigModal = true;
      this.cdr.markForCheck();
    });
  }

  closeConfigModal() {
    this.showConfigModal = false;
  }

  agregarPregunta() {
    const texto = this.nuevaPreguntaTexto.trim();
    if (!texto) return;

    const nuevaPregunta: PreguntaAnamnesis = {
      id: 'q_' + Math.random().toString(36).substr(2, 9),
      texto: texto,
      tipo: this.nuevaPreguntaTipo,
      requerido: false
    };

    this.plantillaPreguntas = [...this.plantillaPreguntas, nuevaPregunta];
    this.nuevaPreguntaTexto = '';
    this.cdr.markForCheck();
  }

  eliminarPregunta(id: string) {
    this.plantillaPreguntas = this.plantillaPreguntas.filter(q => q.id !== id);
    this.cdr.markForCheck();
  }

  guardarPlantilla() {
    this.db.saveAnamnesisPlantilla(this.plantillaPreguntas).subscribe(() => {
      alert('Plantilla de ficha médica guardada con éxito.');
      this.closeConfigModal();
    });
  }

  // --- RESPONDER ANAMNESIS DE MIEMBRO ---
  openAnamnesisModal(member: Miembro) {
    this.activeAnamnesisMember = member;
    
    // Primero obtenemos la plantilla actual de preguntas
    this.db.getAnamnesisPlantilla().subscribe(preguntas => {
      // Mapeamos las preguntas a respuestas para el formulario
      const respuestasExistentes = member.anamnesis?.respuestas || [];
      
      this.anamnesisFormAnswers = preguntas.map(pregunta => {
        // Buscamos si el miembro ya tenía respuesta para esta pregunta
        const respuestaPrevia = respuestasExistentes.find(r => r.pregunta_id === pregunta.id);
        
        return {
          pregunta_id: pregunta.id,
          pregunta_texto: pregunta.texto,
          tipo: pregunta.tipo,
          respuesta: respuestaPrevia ? respuestaPrevia.respuesta : ''
        };
      });

      this.showAnamnesisModal = true;
      this.cdr.markForCheck();
    });
  }

  closeAnamnesisModal() {
    this.showAnamnesisModal = false;
    this.activeAnamnesisMember = null;
    this.anamnesisFormAnswers = [];
  }

  saveAnamnesis() {
    if (!this.activeAnamnesisMember) return;

    const anamnesisPayload: AnamnesisMiembro = {
      fecha_completado: new Date().toISOString().split('T')[0],
      respuestas: this.anamnesisFormAnswers
    };

    // Actualizamos el miembro en la base de datos
    this.db.updateMiembro(this.activeAnamnesisMember.id, {
      anamnesis: anamnesisPayload
    }).subscribe(() => {
      // Actualizamos localmente el miembro
      const idx = this.members.findIndex(m => m.id === this.activeAnamnesisMember!.id);
      if (idx !== -1) {
        this.members[idx].anamnesis = anamnesisPayload;
        this.filterMembers();
      }
      alert('Ficha médica de ' + this.activeAnamnesisMember!.nombre + ' guardada con éxito.');
      this.closeAnamnesisModal();
      this.cdr.markForCheck();
    });
  }

  viewMemberScores(member: Miembro): void {
    this.router.navigate(['/scores'], { queryParams: { miembroId: member.id } });
  }
}
