import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Usuario } from '../models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="users-container animate-fade-in">
      <!-- CABECERA -->
      <div class="flex-between header-section">
        <div>
          <h1 class="title-grad">Usuarios del Sistema</h1>
          <p class="subtitle">Administra los accesos y roles del personal, entrenadores y administradores.</p>
        </div>
        <button class="btn btn-primary" (click)="openAddModal()">
          <span>+ Nuevo Usuario</span>
        </button>
      </div>

      <!-- BARRA DE FILTROS -->
      <div class="glass-card filters-bar flex-between">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            class="form-control search-input" 
            placeholder="Buscar por nombre o correo..." 
            [(ngModel)]="searchQuery"
            (ngModelChange)="applyFilters()"
          />
        </div>

        <div class="status-filters flex-gap-2">
          <div class="filter-group">
            <span class="filter-label">Rol:</span>
            <select class="form-control filter-select" [(ngModel)]="roleFilter" (change)="applyFilters()">
              <option value="todos">Todos los Roles</option>
              <option value="admin">Administrador</option>
              <option value="coach">Entrenador (Coach)</option>
              <option value="recepcion">Recepción</option>
            </select>
          </div>

          <div class="filter-group">
            <span class="filter-label">Estado:</span>
            <select class="form-control filter-select" [(ngModel)]="statusFilter" (change)="applyFilters()">
              <option value="todos">Todos los Estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      <!-- VISTA ESCRITORIO (TABLA) -->
      <div class="glass-card desktop-only table-card mt-16">
        <div class="table-container" *ngIf="filteredUsuarios.length > 0; else emptyState">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo Electrónico</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Estado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of filteredUsuarios">
                <td>
                  <div class="user-avatar-row">
                    <div class="avatar-circle">{{ u.nombre.charAt(0).toUpperCase() }}</div>
                    <span class="user-display-name">{{ u.nombre }}</span>
                  </div>
                </td>
                <td>{{ u.email }}</td>
                <td>{{ u.telefono || '—' }}</td>
                <td>
                  <span class="badge" [ngClass]="getRoleBadgeClass(u.rol)">
                    {{ getRolLabel(u.rol) }}
                  </span>
                </td>
                <td>
                  <span class="badge" [class.badge-active]="u.activo" [class.badge-inactive]="!u.activo">
                    {{ u.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="actions-group">
                    <button class="btn btn-secondary btn-sm" (click)="openEditModal(u)">
                      Editar
                    </button>
                    <button class="btn btn-danger btn-sm" (click)="deleteUsuario(u)">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- VISTA MÓVIL (TARJETAS) -->
      <div class="mobile-only mt-16">
        <div class="mobile-cards-container" *ngIf="filteredUsuarios.length > 0; else emptyState">
          <div class="glass-card mobile-user-card" *ngFor="let u of filteredUsuarios">
            <div class="card-header-row">
              <div class="user-avatar-row">
                <div class="avatar-circle">{{ u.nombre.charAt(0).toUpperCase() }}</div>
                <div>
                  <h4 class="user-display-name">{{ u.nombre }}</h4>
                  <span class="badge" [ngClass]="getRoleBadgeClass(u.rol)">
                    {{ getRolLabel(u.rol) }}
                  </span>
                </div>
              </div>
              <span class="badge" [class.badge-active]="u.activo" [class.badge-inactive]="!u.activo">
                {{ u.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </div>

            <div class="card-body-row mt-12">
              <div class="contact-info">
                <div>✉️ {{ u.email }}</div>
                <div class="mt-4">📞 {{ u.telefono || 'Sin teléfono' }}</div>
              </div>
            </div>

            <div class="card-footer-row mt-16">
              <button class="btn btn-secondary btn-sm" (click)="openEditModal(u)">Editar</button>
              <button class="btn btn-danger btn-sm" (click)="deleteUsuario(u)">Eliminar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ESTADO VACÍO -->
      <ng-template #emptyState>
        <div class="empty-state">
          <span class="empty-icon">👥</span>
          <h3>No se encontraron usuarios</h3>
          <p>Intenta cambiar los filtros de búsqueda o registra un nuevo usuario.</p>
        </div>
      </ng-template>

      <!-- MODAL FORMULARIO (Crear/Editar) -->
      <div class="modal-backdrop" *ngIf="showModal">
        <div class="glass-card modal-content animate-fade-in">
          <div class="flex-between modal-header">
            <h3>{{ isEditMode ? 'Editar Usuario' : 'Nuevo Usuario' }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>

          <form (submit)="saveUsuario()">
            <div class="form-group">
              <label class="form-label">Nombre Completo</label>
              <input 
                type="text" 
                class="form-control" 
                name="nombre" 
                [(ngModel)]="userForm.nombre" 
                required 
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Correo Electrónico</label>
              <input 
                type="email" 
                class="form-control" 
                name="email" 
                [(ngModel)]="userForm.email" 
                required 
                placeholder="juan.perez@email.com"
                [disabled]="isEditMode"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Contraseña de Acceso</label>
              <input 
                type="password" 
                class="form-control" 
                name="contrasena" 
                [(ngModel)]="userForm.contrasena" 
                placeholder="Ingresa la contraseña para iniciar sesión"
                [required]="!isEditMode"
              />
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Teléfono</label>
                <input 
                  type="text" 
                  class="form-control" 
                  name="telefono" 
                  [(ngModel)]="userForm.telefono" 
                  placeholder="555-0100"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Rol de Acceso</label>
                <select class="form-control" name="rol" [(ngModel)]="userForm.rol">
                  <option value="admin">Administrador</option>
                  <option value="coach">Entrenador (Coach)</option>
                  <option value="recepcion">Recepción</option>
                </select>
              </div>
            </div>

            <div class="form-group inline-checkbox-group mt-12">
              <label class="switch-container">
                <input type="checkbox" name="activo" [(ngModel)]="userForm.activo" />
                <span class="switch-slider"></span>
              </label>
              <span class="checkbox-label">Usuario activo en el sistema</span>
            </div>

            <div class="flex-between form-actions">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary">{{ isEditMode ? 'Guardar Cambios' : 'Crear Usuario' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .users-container {
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

    /* Filters Bar */
    .filters-bar {
      display: flex;
      gap: 16px;
      padding: 16px 24px;
      align-items: center;
    }
    .search-box {
      display: flex;
      align-items: center;
      position: relative;
      flex-grow: 1;
      max-width: 400px;
    }
    .search-icon {
      position: absolute;
      left: 14px;
      color: #71717a;
      font-size: 0.9rem;
    }
    .search-input {
      padding-left: 40px !important;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .filter-label {
      font-size: 0.8rem;
      color: #71717a;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .filter-select {
      width: 170px;
      padding: 8px 12px;
      font-size: 13px;
    }

    /* Table styling and custom columns */
    .table-card {
      padding: 0;
      overflow: hidden;
    }
    .user-avatar-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--accent) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #fff;
      font-size: 0.85rem;
    }
    .user-display-name {
      font-weight: 600;
      color: #fff;
    }
    .actions-group {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .btn-sm {
      padding: 6px 14px;
      font-size: 0.78rem;
    }

    /* Role Badge Colors */
    .badge-admin {
      background: rgba(139, 92, 246, 0.1) !important;
      color: #a78bfa !important;
      border: 1px solid rgba(139, 92, 246, 0.25) !important;
    }
    .badge-coach {
      background: rgba(6, 182, 212, 0.1) !important;
      color: #22d3ee !important;
      border: 1px solid rgba(6, 182, 212, 0.25) !important;
    }
    .badge-recepcion {
      background: rgba(245, 158, 11, 0.1) !important;
      color: #fbbf24 !important;
      border: 1px solid rgba(245, 158, 11, 0.25) !important;
    }

    /* Mobile Cards View */
    .mobile-user-card {
      margin-bottom: 12px;
    }
    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      padding-bottom: 12px;
    }
    .card-body-row {
      color: #a1a1aa;
      font-size: 0.85rem;
    }
    .card-footer-row {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      padding-top: 12px;
    }

    /* Empty state */
    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: #71717a;
    }
    .empty-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    .empty-state h3 {
      color: #fff;
      margin-bottom: 8px;
    }

    /* Inline Switch Slider for active/inactive check */
    .inline-checkbox-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .checkbox-label {
      color: #e4e4e7;
      font-size: 0.88rem;
    }
    .switch-container {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 22px;
    }
    .switch-container input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .switch-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.08);
      transition: .3s;
      border-radius: 34px;
      border: 1px solid var(--border-glow);
    }
    .switch-slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: #a1a1aa;
      transition: .3s;
      border-radius: 50%;
    }
    input:checked + .switch-slider {
      background-color: rgba(0, 255, 136, 0.1);
      border-color: rgba(0, 255, 136, 0.3);
    }
    input:checked + .switch-slider:before {
      transform: translateX(22px);
      background-color: var(--primary);
      box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
    }

    /* Responsive overrides */
    @media (max-width: 768px) {
      .filters-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      .search-box {
        max-width: 100%;
      }
      .status-filters {
        justify-content: space-between;
      }
      .filter-select {
        flex-grow: 1;
        width: auto;
      }
    }
  `]
})
export class UsersComponent implements OnInit {
  private db = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  usuarios: Usuario[] = [];
  filteredUsuarios: Usuario[] = [];

  // Filtros
  searchQuery = '';
  roleFilter = 'todos';
  statusFilter = 'todos';

  // Modal
  showModal = false;
  isEditMode = false;
  userForm: Omit<Usuario, 'id' | 'created_at'> & { id?: string } = this.getDefaultUserForm();

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.db.getUsuarios().subscribe(users => {
      this.usuarios = users;
      this.applyFilters();
    });
  }

  getDefaultUserForm() {
    return {
      nombre: '',
      email: '',
      rol: 'coach' as const,
      telefono: '',
      contrasena: '',
      activo: true
    };
  }

  applyFilters() {
    this.filteredUsuarios = this.usuarios.filter(u => {
      // 1. Buscador por nombre o email
      const searchMatch = !this.searchQuery || 
        u.nombre.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(this.searchQuery.toLowerCase());

      // 2. Filtro de Rol
      const roleMatch = this.roleFilter === 'todos' || u.rol === this.roleFilter;

      // 3. Filtro de Estado
      const statusMatch = this.statusFilter === 'todos' || 
        (this.statusFilter === 'activo' && u.activo) || 
        (this.statusFilter === 'inactivo' && !u.activo);

      return searchMatch && roleMatch && statusMatch;
    });
    this.cdr.markForCheck();
  }

  openAddModal() {
    this.isEditMode = false;
    this.userForm = this.getDefaultUserForm();
    this.showModal = true;
  }

  openEditModal(usuario: Usuario) {
    this.isEditMode = true;
    this.userForm = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      telefono: usuario.telefono || '',
      contrasena: usuario.contrasena || '',
      activo: usuario.activo
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveUsuario() {
    if (!this.userForm.nombre.trim() || !this.userForm.email.trim()) return;

    const payload: Omit<Usuario, 'id'> & { contrasena?: string } = {
      nombre: this.userForm.nombre.trim(),
      email: this.userForm.email.trim().toLowerCase(),
      rol: this.userForm.rol,
      telefono: this.userForm.telefono?.trim() || undefined,
      activo: this.userForm.activo
    };

    if (this.userForm.contrasena?.trim()) {
      payload.contrasena = this.userForm.contrasena.trim();
    }

    if (this.isEditMode && this.userForm.id) {
      this.db.updateUsuario(this.userForm.id, payload).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    } else {
      this.db.createUsuario(payload).subscribe(() => {
        this.loadData();
        this.closeModal();
      });
    }
  }

  deleteUsuario(usuario: Usuario) {
    if (usuario.id === 'u_root' || usuario.email === 'root@gymflow.com') {
      alert('No es posible eliminar al usuario root del sistema.');
      return;
    }

    if (confirm(`¿Estás seguro de que deseas eliminar al usuario "${usuario.nombre}"?`)) {
      this.db.deleteUsuario(usuario.id).subscribe(() => {
        this.loadData();
      });
    }
  }

  getRolLabel(rol: string): string {
    switch (rol) {
      case 'admin': return 'Administrador';
      case 'coach': return 'Entrenador';
      case 'recepcion': return 'Recepción';
      default: return rol;
    }
  }

  getRoleBadgeClass(rol: string): string {
    return `badge-${rol}`;
  }
}
