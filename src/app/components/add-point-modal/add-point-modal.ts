import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PointCategory, UrgencyLevel, NeededItemType, SupportPoint } from '../../models/support-point.model';
import { GeolocationService } from '../../services/geolocation.service';
import { SupportPointsService } from '../../services/support-points.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-add-point-modal',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-title">
            <span class="icon-circle">
              <app-icon name="plus" [size]="20"></app-icon>
            </span>
            <div>
              <span class="badge-tag">Mapeamento Colaborativo</span>
              <h2 class="heading-editorial">Cadastrar Ponto Solidário</h2>
            </div>
          </div>
          <button class="btn-close" (click)="close.emit()" title="Fechar">
            <app-icon name="x" [size]="18"></app-icon>
          </button>
        </header>

        <form class="modal-body" (ngSubmit)="submitForm()">
          <p class="form-intro">
            Ajude a dar visibilidade a cozinhas comunitárias, pontos de coleta e abrigos da sua região para que recebam doações e voluntários.
          </p>

          <!-- Nome da Iniciativa -->
          <div class="form-group">
            <label for="pointName">Nome da Iniciativa ou Ponto Solidário *</label>
            <input 
              id="pointName" 
              type="text" 
              required
              placeholder="Ex: Cozinha Comunitária Esperança Viva"
              [(ngModel)]="name"
              name="name"
            />
          </div>

          <!-- Categoria -->
          <div class="form-group">
            <label for="pointCat">Tipo de Rede Solidária *</label>
            <select id="pointCat" [(ngModel)]="category" name="category">
              <option value="soup_kitchen">Cozinha Solidária (Distribuição de Refeições/Marmitas)</option>
              <option value="food_bank">Banco de Alimentos (Resgate de Hortifrúti e Desperdício)</option>
              <option value="shelter">Abrigo & Acolhimento Humanitário</option>
              <option value="collection_point">Ponto de Coleta e Triagem Comunitária</option>
              <option value="community_centre">Centro Comunitário / Pastoral Social</option>
            </select>
          </div>

          <!-- Nível de Urgência -->
          <div class="form-group">
            <label>Nível de Urgência Atual</label>
            <div class="urgency-selector">
              <label class="urgency-option" [class.selected]="urgency() === 'critical'">
                <input type="radio" name="urgency" value="critical" [checked]="urgency() === 'critical'" (change)="urgency.set('critical')" />
                <span class="dot-pulse critical"></span>
                <span>Crítica (Necessidade Imediata)</span>
              </label>
              <label class="urgency-option" [class.selected]="urgency() === 'high'">
                <input type="radio" name="urgency" value="high" [checked]="urgency() === 'high'" (change)="urgency.set('high')" />
                <span class="dot-pulse high"></span>
                <span>Alta</span>
              </label>
              <label class="urgency-option" [class.selected]="urgency() === 'moderate'">
                <input type="radio" name="urgency" value="moderate" [checked]="urgency() === 'moderate'" (change)="urgency.set('moderate')" />
                <span class="dot-pulse moderate"></span>
                <span>Moderada (Apoio Contínuo)</span>
              </label>
            </div>
          </div>

          <!-- Localização e Endereço -->
          <div class="form-row">
            <div class="form-group flex-2">
              <label for="pointAddr">Endereço Completo (Rua, Número, Bairro) *</label>
              <input 
                id="pointAddr" 
                type="text" 
                required
                placeholder="Ex: Rua das Flores, 120 - Vila Nova"
                [(ngModel)]="address"
                name="address"
              />
            </div>
            <div class="form-group flex-1">
              <label for="pointCity">Cidade *</label>
              <input 
                id="pointCity" 
                type="text" 
                required
                placeholder="Ex: São Paulo"
                [(ngModel)]="city"
                name="city"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label for="pointState">Estado (UF)</label>
              <input 
                id="pointState" 
                type="text" 
                placeholder="Ex: SP"
                [(ngModel)]="state"
                name="state"
              />
            </div>
            <div class="form-group flex-2">
              <label>Coordenadas GPS</label>
              <div class="gps-inputs">
                <input type="number" step="any" placeholder="Latitude" [(ngModel)]="lat" name="lat" required />
                <input type="number" step="any" placeholder="Longitude" [(ngModel)]="lng" name="lng" required />
                <button type="button" class="btn-auto-gps" (click)="useCurrentLocation()">
                  <app-icon name="navigation" [size]="14"></app-icon>
                  <span>Preencher GPS</span>
                </button>
              </div>
            </div>
          </div>

          <!-- O que precisam no momento (Checkboxes) -->
          <div class="form-group">
            <label>O que o ponto precisa no momento? (Selecione todos que se aplicam)</label>
            <div class="items-chips-grid">
              @for (item of availableItems; track item.id) {
                <button 
                  type="button"
                  class="item-chip-toggle" 
                  [class.active]="isItemSelected(item.id)"
                  (click)="toggleItem(item.id)"
                >
                  <span class="chip-check">
                    @if (isItemSelected(item.id)) {
                      <app-icon name="check" [size]="12"></app-icon>
                    }
                  </span>
                  <span>{{ item.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Descrição / Detalhes -->
          <div class="form-group">
            <label for="pointDesc">Descrição do Trabalho e Instruções de Doação</label>
            <textarea 
              id="pointDesc" 
              rows="3" 
              placeholder="Descreva brevemente quem é atendido, quantidade média de marmitas, dias de entrega ou como as doações devem ser entregues..."
              [(ngModel)]="description"
              name="description"
            ></textarea>
          </div>

          <!-- Contatos e PIX -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label for="pointWhatsapp">WhatsApp de Contato</label>
              <input 
                id="pointWhatsapp" 
                type="text" 
                placeholder="Ex: 11999998888 (com DDD)"
                [(ngModel)]="contactWhatsapp"
                name="contactWhatsapp"
              />
            </div>
            <div class="form-group flex-1">
              <label for="pointPix">Chave PIX Solidária (opcional)</label>
              <input 
                id="pointPix" 
                type="text" 
                placeholder="E-mail, CNPJ ou telefone"
                [(ngModel)]="pixKey"
                name="pixKey"
              />
            </div>
          </div>

          <!-- Vagas para Voluntários -->
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="acceptsVolunteers" name="acceptsVolunteers" />
              <span>Esta iniciativa aceita voluntários (cozinha, distribuição, triagem)?</span>
            </label>
          </div>

          <!-- Persistence and Backup Information Card -->
          <div class="persistence-tip-card">
            <div class="tip-icon">
              <app-icon name="box" [size]="18"></app-icon>
            </div>
            <div class="tip-content">
              <strong>Onde este ponto fica salvo?</strong>
              <p>O ponto cadastrado fica gravado com segurança na memória do seu aparelho (LocalStorage). Ele não se perde ao fechar a aba ou recarregar a página. Você também pode exportar um arquivo de backup ou gerar um link compartilhável para enviar pelo WhatsApp.</p>
              <div class="tip-actions">
                <button type="button" class="btn-tip-action" (click)="pointsService.exportUserPointsJson()">
                  <app-icon name="download" [size]="13"></app-icon>
                  <span>Exportar Meus Pontos (JSON)</span>
                </button>
                <label class="btn-tip-action cursor-pointer">
                  <app-icon name="plus" [size]="13"></app-icon>
                  <span>Restaurar Backup</span>
                  <input type="file" accept=".json" class="hidden-input" (change)="onFileImport($event)" />
                </label>
              </div>
            </div>
          </div>

          <div class="modal-footer-inside">
            <button type="button" class="btn-cancel" (click)="close.emit()">Cancelar</button>
            <button type="submit" class="btn-submit">
              <app-icon name="check" [size]="16"></app-icon>
              <span>Publicar Ponto Solidário</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(28, 25, 23, 0.6);
      backdrop-filter: blur(4px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.2s ease-out;
    }
    .modal-card {
      background: var(--bg-surface);
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 640px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--border-light);
      overflow: hidden;
      animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-header {
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-light);
      background: var(--bg-page);
    }
    .header-title {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .icon-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--color-primary-light);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .badge-tag {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--color-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h2 {
      font-size: 1.35rem;
      color: var(--text-main);
    }
    .btn-close {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
    }
    .modal-body {
      padding: 22px 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-intro {
      font-size: 0.88rem;
      color: var(--text-muted);
      line-height: 1.4;
      background: var(--bg-page);
      padding: 10px 14px;
      border-radius: var(--radius-md);
      border-left: 3px solid var(--color-primary);
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-row {
      display: flex;
      gap: 12px;
    }
    @media (max-width: 560px) {
      .form-row {
        flex-direction: column;
      }
    }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    label {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-body);
    }
    input[type="text"], input[type="number"], select, textarea {
      padding: 10px 14px;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--border-subtle);
      font-family: var(--font-sans);
      font-size: 0.9rem;
      background: var(--bg-surface);
      color: var(--text-main);
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--color-primary);
    }
    .gps-inputs {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .gps-inputs input {
      flex: 1;
      min-width: 0;
    }
    .btn-auto-gps {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 12px;
      background: var(--bg-surface-muted);
      border: 1.5px solid var(--border-subtle);
      border-radius: var(--radius-md);
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-body);
      white-space: nowrap;
    }
    .btn-auto-gps:hover {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
      color: var(--color-primary-dark);
    }
    .urgency-selector {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .urgency-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--border-light);
      background: var(--bg-surface);
      cursor: pointer;
      font-size: 0.82rem;
    }
    .urgency-option.selected {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
    }
    .items-chips-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .item-chip-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      border-radius: var(--radius-pill);
      border: 1.5px solid var(--border-subtle);
      background: var(--bg-surface);
      font-size: 0.82rem;
      color: var(--text-body);
      transition: all var(--transition-fast);
    }
    .item-chip-toggle.active {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
      font-weight: 600;
    }
    .chip-check {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1.5px solid var(--border-subtle);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .item-chip-toggle.active .chip-check {
      border-color: var(--color-primary);
      background: var(--color-primary);
      color: #FFFFFF;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 0.88rem;
      font-weight: 500;
      padding: 8px 0;
    }
    .form-error {
      padding: 10px 14px;
      background: var(--color-urgent-crit-bg);
      border: 1px solid var(--color-urgent-crit-border);
      border-radius: var(--radius-md);
      color: var(--color-urgent-crit-text);
      font-size: 0.85rem;
    }
    .modal-footer-inside {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-light);
    }
    .btn-cancel {
      padding: 10px 18px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-subtle);
      color: var(--text-body);
      font-size: 0.9rem;
    }
    .btn-submit {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--color-primary);
      color: #FFFFFF;
      padding: 10px 22px;
      border-radius: var(--radius-pill);
      font-weight: 600;
      font-size: 0.9rem;
    }
    .btn-submit:hover {
      background: var(--color-primary-hover);
    }
    .persistence-tip-card {
      display: flex;
      gap: 12px;
      padding: 14px 16px;
      background: var(--bg-page);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      margin-top: 4px;
    }
    .tip-icon {
      color: var(--color-primary);
      flex-shrink: 0;
      margin-top: 2px;
    }
    .tip-content strong {
      display: block;
      font-size: 0.88rem;
      color: var(--text-main);
      margin-bottom: 3px;
    }
    .tip-content p {
      font-size: 0.82rem;
      color: var(--text-muted);
      line-height: 1.4;
      margin-bottom: 8px;
    }
    .tip-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn-tip-action {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-pill);
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--text-body);
      cursor: pointer;
    }
    .btn-tip-action:hover {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
      color: var(--color-primary-dark);
    }
    .hidden-input {
      display: none;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class AddPointModalComponent {
  public geoService = inject(GeolocationService);
  public pointsService = inject(SupportPointsService);

  public close = output<void>();
  public created = output<Omit<SupportPoint, 'id' | 'source' | 'verified'>>();

  public onFileImport(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const count = this.pointsService.importUserPointsJson(content);
        alert(`${count} pontos comunitários importados com sucesso!`);
        this.close.emit();
      }
    };
    reader.readAsText(file);
  }

  public name = signal<string>('');
  public category = signal<PointCategory>('soup_kitchen');
  public urgency = signal<UrgencyLevel>('critical');
  public address = signal<string>('');
  public city = signal<string>('');
  public state = signal<string>('SP');
  public lat = signal<number>(-23.55052);
  public lng = signal<number>(-46.633309);
  public description = signal<string>('');
  public contactWhatsapp = signal<string>('');
  public pixKey = signal<string>('');
  public acceptsVolunteers = signal<boolean>(true);

  public selectedItems = signal<Set<NeededItemType>>(new Set(['non_perishable', 'prepared_meals', 'volunteers']));
  public formError = signal<string | null>(null);

  public readonly availableItems: Array<{ id: NeededItemType; label: string }> = [
    { id: 'non_perishable', label: '🍚 Alimentos Não-Perecíveis' },
    { id: 'fresh_produce', label: '🥕 Hortifrúti Fresco (Sem Desperdício)' },
    { id: 'prepared_meals', label: '🍲 Marmitas & Refeições Prontas' },
    { id: 'winter_clothes', label: '🧥 Agasalhos & Cobertores' },
    { id: 'hygiene', label: '🧼 Itens de Higiene e Limpeza' },
    { id: 'volunteers', label: '🤝 Voluntários para Apoio' },
    { id: 'financial_pix', label: '💳 Apoio Financeiro / PIX' }
  ];

  constructor() {
    const coords = this.geoService.currentCoords();
    this.lat.set(coords.lat);
    this.lng.set(coords.lng);
    const parts = coords.cityLabel.split(',');
    if (parts.length > 0) {
      this.city.set(parts[0].trim());
    }
  }

  public isItemSelected(id: NeededItemType): boolean {
    return this.selectedItems().has(id);
  }

  public toggleItem(id: NeededItemType) {
    const current = new Set(this.selectedItems());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedItems.set(current);
  }

  public useCurrentLocation() {
    const coords = this.geoService.currentCoords();
    this.lat.set(coords.lat);
    this.lng.set(coords.lng);
  }

  public submitForm() {
    if (!this.name().trim() || !this.address().trim() || !this.city().trim()) {
      this.formError.set('Por favor, preencha os campos obrigatórios (Nome, Endereço e Cidade).');
      return;
    }

    const catLabels: Record<PointCategory, string> = {
      soup_kitchen: 'Cozinha Solidária',
      food_bank: 'Banco de Alimentos',
      shelter: 'Abrigo & Acolhimento',
      community_centre: 'Centro Comunitário',
      collection_point: 'Ponto de Coleta'
    };

    const newPoint: Omit<SupportPoint, 'id' | 'source' | 'verified'> = {
      name: this.name().trim(),
      category: this.category(),
      categoryLabel: catLabels[this.category()],
      description: this.description().trim() || 'Ponto solidário comunitário cadastrado pela população.',
      address: this.address().trim(),
      city: this.city().trim(),
      state: this.state().trim(),
      country: 'Brasil',
      lat: Number(this.lat()),
      lng: Number(this.lng()),
      urgency: this.urgency(),
      neededItems: Array.from(this.selectedItems()),
      contactWhatsapp: this.contactWhatsapp().trim() || undefined,
      pixKey: this.pixKey().trim() || undefined,
      acceptsVolunteers: this.acceptsVolunteers(),
      openingHours: 'Consulte horários locais com a organização'
    };

    this.created.emit(newPoint);
    this.close.emit();
  }
}
