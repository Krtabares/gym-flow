import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { PreguntaAnamnesis } from '../models';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container animate-fade-in">
      <div class="flex-between header-section">
        <div>
          <h1 class="title-grad">Configuración del Sistema</h1>
          <p class="subtitle">Administra conexiones, base de datos y la evaluación médica (anamnesis).</p>
        </div>
      </div>

      <!-- Pestañas -->
      <div class="tabs-container">
        <button class="tab-btn" [class.active]="activeTab === 'database'" (click)="activeTab = 'database'">
          <span class="tab-icon">🔌</span>
          <span>Base de Datos & Conexión</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'anamnesis'" (click)="activeTab = 'anamnesis'">
          <span class="tab-icon">📋</span>
          <span>Plantilla de Anamnesis</span>
        </button>
      </div>

      <!-- Contenido de Pestaña: Base de Datos -->
      <div class="tab-content animate-fade-in" *ngIf="activeTab === 'database'">
        <div class="settings-grid">
          <!-- Estado de la Conexión -->
          <div class="glass-card connection-card">
            <h3>Estado del Servidor</h3>
            <div class="connection-status">
              <div class="status-indicator" [class.connected]="!isMockMode" [class.mock]="isMockMode"></div>
              <span class="status-text">{{ isMockMode ? 'Modo Demo (Local)' : 'Conectado (Producción)' }}</span>
            </div>
            <p class="status-desc" *ngIf="isMockMode">
              La aplicación está utilizando <strong>localStorage</strong> de tu navegador. Los datos no se persistirán en un servidor remoto.
            </p>
            <p class="status-desc" *ngIf="!isMockMode">
              La aplicación está conectada directamente al servidor cloud de Supabase.
            </p>
          </div>

          <!-- Credenciales de Conexión -->
          <div class="glass-card credentials-card">
            <h3>Parámetros de Conexión</h3>
            <div class="credential-item">
              <span class="cred-label">URL de Supabase:</span>
              <code class="cred-value">{{ supabaseUrl || 'No configurado' }}</code>
            </div>
            <div class="credential-item">
              <span class="cred-label">Clave Anónima:</span>
              <code class="cred-value">{{ maskedKey }}</code>
            </div>
          </div>
        </div>

        <!-- Estadísticas de la Base de Datos -->
        <div class="stats-section mt-24">
          <h3 class="section-title">Estadísticas de Tablas</h3>
          <div class="stats-grid">
            <div class="glass-card stat-item">
              <div class="stat-icon">👥</div>
              <div class="stat-info">
                <span class="stat-label">Miembros</span>
                <span class="stat-value">{{ stats.miembros }}</span>
              </div>
            </div>
            <div class="glass-card stat-item">
              <div class="stat-icon">🏷️</div>
              <div class="stat-info">
                <span class="stat-label">Planes</span>
                <span class="stat-value">{{ stats.planes }}</span>
              </div>
            </div>
            <div class="glass-card stat-item">
              <div class="stat-icon">💳</div>
              <div class="stat-info">
                <span class="stat-label">Pagos</span>
                <span class="stat-value">{{ stats.pagos }}</span>
              </div>
            </div>
            <div class="glass-card stat-item">
              <div class="stat-icon">🏃</div>
              <div class="stat-info">
                <span class="stat-label">Asistencias</span>
                <span class="stat-value">{{ stats.asistencia }}</span>
              </div>
            </div>
            <div class="glass-card stat-item">
              <div class="stat-icon">🏋️</div>
              <div class="stat-info">
                <span class="stat-label">Ejercicios</span>
                <span class="stat-value">{{ stats.ejercicios }}</span>
              </div>
            </div>
            <div class="glass-card stat-item">
              <div class="stat-icon">📅</div>
              <div class="stat-info">
                <span class="stat-label">WODs</span>
                <span class="stat-value">{{ stats.wods }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones de Datos (Solo Mock Mode) -->
        <div class="glass-card mt-24 data-actions-card" *ngIf="isMockMode">
          <h3>Acciones y Respaldos (Modo Demo)</h3>
          <p class="desc">Administra tus datos locales guardados en la memoria de este navegador.</p>
          <div class="action-buttons">
            <button class="btn btn-secondary" (click)="exportBackup()">
              <span>📤 Exportar Backup JSON</span>
            </button>
            <button class="btn btn-secondary" (click)="openImportSection()">
              <span>📥 Importar Datos JSON</span>
            </button>
            <button class="btn btn-danger" (click)="resetDemoData()">
              <span>⚠️ Restablecer Datos de Demo</span>
            </button>
          </div>

          <!-- Sección de Importar -->
          <div class="import-section mt-20 animate-fade-in" *ngIf="showImportArea">
            <label class="form-label">Pegar datos JSON de backup:</label>
            <textarea class="form-control code-textarea" [(ngModel)]="importDataString" placeholder='{ "gf_planes": "..." }'></textarea>
            <div class="flex-between mt-10">
              <button class="btn btn-secondary btn-sm" (click)="showImportArea = false">Cancelar</button>
              <button class="btn btn-primary btn-sm" (click)="importBackup()">Confirmar e Importar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Contenido de Pestaña: Anamnesis -->
      <div class="tab-content animate-fade-in" *ngIf="activeTab === 'anamnesis'">
        <div class="glass-card anamnesis-card">
          <div class="flex-between section-header">
            <div>
              <h3>Preguntas de la Evaluación Médica (Anamnesis)</h3>
              <p class="desc">Define el cuestionario de salud que deben completar los miembros.</p>
            </div>
            <button class="btn btn-primary btn-sm" (click)="addPregunta()">
              <span>+ Agregar Pregunta</span>
            </button>
          </div>

          <div class="questions-list mt-20">
            <div class="question-item" *ngFor="let q of preguntas; let i = index">
              <div class="question-number">{{ i + 1 }}</div>
              
              <div class="question-fields">
                <div class="field-text">
                  <input type="text" class="form-control" placeholder="Ej. ¿Tiene dolores articulares?" [(ngModel)]="q.texto">
                </div>
                
                <div class="field-type">
                  <select class="form-control select-control" [(ngModel)]="q.tipo">
                    <option value="sino">Pregunta Sí / No</option>
                    <option value="texto">Texto Libre</option>
                  </select>
                </div>

                <div class="field-required">
                  <label class="checkbox-container">
                    <input type="checkbox" [(ngModel)]="q.requerido">
                    <span class="checkbox-label">Requerida</span>
                  </label>
                </div>
              </div>

              <button class="btn-remove" (click)="removePregunta(i)">✕</button>
            </div>

            <div class="no-questions" *ngIf="preguntas.length === 0">
              <p>No hay preguntas configuradas en la plantilla. Los miembros se registrarán sin anamnesis.</p>
            </div>
          </div>

          <div class="form-actions mt-24">
            <button class="btn btn-primary" (click)="saveAnamnesis()">
              <span>Guardar Cambios de Plantilla</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal de Exportar Backup -->
      <div class="modal-backdrop" *ngIf="showBackupModal">
        <div class="glass-card modal-content animate-fade-in">
          <div class="flex-between modal-header">
            <h3>Copia de Seguridad de Datos Demo</h3>
            <button class="close-btn" (click)="showBackupModal = false">✕</button>
          </div>
          <p class="modal-desc">Copia el contenido a continuación y guárdalo en un archivo de texto en tu computadora.</p>
          <textarea class="form-control code-textarea" readonly (click)="selectBackupText($event)">{{ backupDataString }}</textarea>
          <div class="modal-footer flex-between mt-20">
            <span class="tip-text">Haz clic en el cuadro para seleccionar todo</span>
            <button class="btn btn-secondary" (click)="showBackupModal = false">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
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

    /* Tabs Layout */
    .tabs-container {
      display: flex;
      gap: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 8px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: #71717a;
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 0.95rem;
      padding: 10px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: var(--radius-md);
      transition: all 0.2s ease;
    }
    .tab-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.03);
    }
    .tab-btn.active {
      color: var(--primary);
      background: rgba(0, 255, 136, 0.05);
      border: 1px solid rgba(0, 255, 136, 0.15);
    }
    .tab-icon {
      font-size: 1.1rem;
    }

    /* Grid layout database tab */
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 16px 0;
    }
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
    }
    .status-indicator.connected {
      background: var(--primary);
      box-shadow: 0 0 12px var(--primary);
    }
    .status-indicator.mock {
      background: var(--warning);
      box-shadow: 0 0 12px var(--warning);
    }
    .status-text {
      font-weight: 700;
      font-size: 0.95rem;
      color: #fff;
    }
    .status-desc {
      font-size: 0.85rem;
      color: #a1a1aa;
      line-height: 1.5;
    }

    .credential-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 12px;
    }
    .cred-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .cred-value {
      font-family: monospace;
      font-size: 0.85rem;
      background: rgba(0, 0, 0, 0.25);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.03);
      color: #e4e4e7;
      word-break: break-all;
    }

    /* Stats Grid */
    .section-title {
      font-size: 1.1rem;
      color: #fff;
      margin-bottom: 16px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }
    .stat-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
    }
    .stat-icon {
      font-size: 1.8rem;
    }
    .stat-info {
      display: flex;
      flex-direction: column;
    }
    .stat-label {
      font-size: 0.75rem;
      color: #71717a;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
    }

    /* Data actions card */
    .desc {
      font-size: 0.85rem;
      color: #71717a;
      margin-bottom: 16px;
    }
    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .mt-24 { margin-top: 24px; }
    .mt-20 { margin-top: 20px; }
    .mt-10 { margin-top: 10px; }

    /* Code Textarea */
    .code-textarea {
      font-family: monospace;
      font-size: 0.8rem;
      min-height: 120px;
      resize: vertical;
      line-height: 1.4;
      background: rgba(0, 0, 0, 0.4);
    }

    /* Anamnesis Template editor */
    .section-header {
      margin-bottom: 16px;
    }
    .questions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 500px;
      overflow-y: auto;
      padding-right: 6px;
    }
    .question-item {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid rgba(255, 255, 255, 0.03);
      padding: 12px 16px;
      border-radius: var(--radius-md);
      transition: all 0.2s ease;
    }
    .question-item:hover {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.06);
    }
    .question-number {
      font-family: var(--font-display);
      font-weight: 800;
      color: var(--secondary);
      font-size: 1.1rem;
      width: 24px;
    }
    .question-fields {
      display: grid;
      grid-template-columns: 3fr 1.5fr 1fr;
      gap: 16px;
      flex-grow: 1;
      align-items: center;
    }
    .select-control {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>");
      background-repeat: no-repeat;
      background-position: right 8px center;
      padding-right: 32px;
    }
    .checkbox-container {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      font-size: 0.85rem;
      color: #a1a1aa;
    }
    .checkbox-container input {
      cursor: pointer;
      width: 16px;
      height: 16px;
      accent-color: var(--primary);
    }
    .checkbox-label {
      font-weight: 600;
    }
    .btn-remove {
      background: transparent;
      border: none;
      color: #71717a;
      cursor: pointer;
      font-size: 1rem;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
    }
    .btn-remove:hover {
      background: rgba(244, 63, 94, 0.15);
      color: var(--danger);
    }
    .no-questions {
      padding: 30px;
      text-align: center;
      color: #71717a;
      font-style: italic;
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
      max-width: 600px;
      padding: 30px;
    }
    .modal-header {
      margin-bottom: 12px;
    }
    .modal-desc {
      font-size: 0.85rem;
      color: #a1a1aa;
      margin-bottom: 16px;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: #71717a;
      font-size: 1.2rem;
      cursor: pointer;
    }
    .close-btn:hover { color: #fff; }
    .tip-text {
      font-size: 0.78rem;
      color: #71717a;
      font-style: italic;
    }
    .btn-sm {
      padding: 6px 14px;
      font-size: 0.78rem;
    }
  `]
})
export class SettingsComponent implements OnInit {
  private db = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  activeTab: 'database' | 'anamnesis' = 'database';
  isMockMode = true;
  supabaseUrl = '';
  supabaseKey = '';
  maskedKey = 'No configurada';

  stats = {
    miembros: 0,
    planes: 0,
    pagos: 0,
    asistencia: 0,
    ejercicios: 0,
    wods: 0
  };

  preguntas: PreguntaAnamnesis[] = [];

  // Backup and Data Options
  showBackupModal = false;
  backupDataString = '';
  showImportArea = false;
  importDataString = '';

  ngOnInit() {
    this.isMockMode = this.db.isMockMode;
    this.supabaseUrl = environment.supabaseUrl;
    this.supabaseKey = environment.supabaseKey;

    if (this.supabaseKey) {
      if (this.supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
        this.maskedKey = 'YOUR_SUPABASE_ANON_KEY (Sin configurar)';
      } else {
        const len = this.supabaseKey.length;
        this.maskedKey = this.supabaseKey.substring(0, 8) + '...' + this.supabaseKey.substring(len - 4);
      }
    }

    this.loadStats();
    this.loadAnamnesis();
  }

  loadStats() {
    this.db.getMiembros().subscribe({
      next: (data) => { this.stats.miembros = data.length; this.cdr.markForCheck(); },
      error: (err) => console.error('Error loading miembros stats', err)
    });
    this.db.getPlanes().subscribe({
      next: (data) => { this.stats.planes = data.length; this.cdr.markForCheck(); },
      error: (err) => console.error('Error loading planes stats', err)
    });
    this.db.getPagos().subscribe({
      next: (data) => { this.stats.pagos = data.length; this.cdr.markForCheck(); },
      error: (err) => console.error('Error loading pagos stats', err)
    });
    this.db.getAsistencia().subscribe({
      next: (data) => { this.stats.asistencia = data.length; this.cdr.markForCheck(); },
      error: (err) => console.error('Error loading asistencia stats', err)
    });
    this.db.getEjercicios().subscribe({
      next: (data) => { this.stats.ejercicios = data.length; this.cdr.markForCheck(); },
      error: (err) => console.error('Error loading ejercicios stats', err)
    });
    this.db.getWods().subscribe({
      next: (data) => { this.stats.wods = data.length; this.cdr.markForCheck(); },
      error: (err) => console.error('Error loading wods stats', err)
    });
  }

  loadAnamnesis() {
    this.db.getAnamnesisPlantilla().subscribe({
      next: (data) => {
        this.preguntas = data;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error loading anamnesis template', err)
    });
  }

  addPregunta() {
    const newId = 'q_' + Math.random().toString(36).substring(2, 11);
    this.preguntas.push({
      id: newId,
      texto: '',
      tipo: 'sino',
      requerido: false
    });
    this.cdr.markForCheck();
  }

  removePregunta(index: number) {
    if (confirm('¿Estás seguro de que deseas eliminar esta pregunta de la plantilla?')) {
      this.preguntas.splice(index, 1);
      this.cdr.markForCheck();
    }
  }

  saveAnamnesis() {
    const cleanPreguntas = this.preguntas.filter(q => q.texto.trim().length > 0);
    
    if (cleanPreguntas.length === 0) {
      if (!confirm('Has dejado la lista vacía o con preguntas sin texto. ¿Deseas guardar la plantilla sin preguntas? (Los miembros nuevos no tendrán anamnesis)')) {
        return;
      }
    }

    if (cleanPreguntas.length !== this.preguntas.length) {
      alert('Se omitieron preguntas vacías sin texto al guardar.');
    }

    this.db.saveAnamnesisPlantilla(cleanPreguntas).subscribe({
      next: () => {
        this.preguntas = cleanPreguntas;
        alert('Plantilla de anamnesis guardada exitosamente.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        alert('Error al guardar la plantilla: ' + (err.message || err));
      }
    });
  }

  resetDemoData() {
    if (confirm('¿Estás seguro de que deseas restablecer todos los datos? Esto borrará tus cambios locales de miembros, planes, pagos, ejercicios y WODs, y los reemplazará con los datos de prueba iniciales.')) {
      const keys = [
        'gf_anamnesis_plantilla',
        'gf_planes',
        'gf_miembros',
        'gf_pagos',
        'gf_asistencia',
        'gf_ejercicios',
        'gf_wods',
        'gf_wod_ejercicios'
      ];
      keys.forEach(k => localStorage.removeItem(k));
      alert('Datos eliminados de la memoria local. Recargando la aplicación para volver a generar los datos por defecto...');
      window.location.reload();
    }
  }

  exportBackup() {
    const backup: Record<string, string | null> = {};
    const keys = [
      'gf_anamnesis_plantilla',
      'gf_planes',
      'gf_miembros',
      'gf_pagos',
      'gf_asistencia',
      'gf_ejercicios',
      'gf_wods',
      'gf_wod_ejercicios'
    ];
    
    keys.forEach(k => {
      backup[k] = localStorage.getItem(k);
    });

    this.backupDataString = JSON.stringify(backup, null, 2);
    this.showBackupModal = true;
    this.cdr.markForCheck();
  }

  openImportSection() {
    this.showImportArea = true;
    this.importDataString = '';
    this.cdr.markForCheck();
  }

  importBackup() {
    if (!this.importDataString.trim()) {
      alert('Por favor pegue el contenido JSON exportado primero.');
      return;
    }

    try {
      const parsed = JSON.parse(this.importDataString);
      const keys = [
        'gf_anamnesis_plantilla',
        'gf_planes',
        'gf_miembros',
        'gf_pagos',
        'gf_asistencia',
        'gf_ejercicios',
        'gf_wods',
        'gf_wod_ejercicios'
      ];
      
      let count = 0;
      keys.forEach(k => {
        if (parsed[k] !== undefined) {
          if (parsed[k] === null) {
            localStorage.removeItem(k);
          } else {
            localStorage.setItem(k, parsed[k]);
          }
          count++;
        }
      });

      if (count > 0) {
        alert('Datos demo importados exitosamente. Recargando para aplicar los cambios...');
        window.location.reload();
      } else {
        alert('El JSON provisto no contiene claves de respaldo válidas (ej. gf_planes, gf_miembros).');
      }
    } catch (e: any) {
      alert('Error al analizar el JSON provisto: ' + e.message);
    }
  }

  selectBackupText(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.select();
  }
}
