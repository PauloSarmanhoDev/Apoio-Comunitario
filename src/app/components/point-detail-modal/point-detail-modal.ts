import { Component, inject, input, output, signal } from '@angular/core';
import { SupportPoint, NeededItemType } from '../../models/support-point.model';
import { SupportPointsService } from '../../services/support-points.service';
import { GeolocationService } from '../../services/geolocation.service';
import { WeatherService } from '../../services/weather.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-point-detail-modal',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="detail-card" (click)="$event.stopPropagation()">
        <!-- Header Image / Top Banner -->
        <div class="card-banner" [class]="point().category">
          <div class="banner-top-actions">
            <span class="category-pill">
              <app-icon [name]="getCategoryIcon(point().category)" [size]="14"></app-icon>
              <span>{{ point().categoryLabel }}</span>
            </span>
            <button class="btn-close-circle" (click)="close.emit()" title="Fechar">
              <app-icon name="x" [size]="18"></app-icon>
            </button>
          </div>

          <div class="banner-title-area">
            @if (point().urgency === 'critical') {
              <div class="critical-alert-tag">
                <span class="dot-pulse critical"></span>
                <span>Alerta de Emergência Alimentar</span>
              </div>
            }
            <h2 class="point-name heading-editorial">{{ point().name }}</h2>
            <div class="meta-row">
              <span class="location-text">
                <app-icon name="map-pin" [size]="14"></app-icon>
                <span>{{ point().city }} - {{ point().state }}</span>
              </span>
              @if (point().distanceKm !== undefined) {
                <span class="distance-chip">
                  <app-icon name="navigation" [size]="12"></app-icon>
                  <span>A {{ geoService.formatDistance(point().distanceKm) }} de você</span>
                </span>
              }
              @if (point().verified) {
                <span class="verified-chip" title="Iniciativa Comunitária Verificada">
                  <app-icon name="shield-check" [size]="14"></app-icon>
                  <span>Verificada</span>
                </span>
              }
            </div>
          </div>
        </div>

        <div class="card-body">
          <!-- Weather alert synergy notice -->
          @if (weatherService.currentWeather()?.isColdWave && point().neededItems.includes('winter_clothes')) {
            <div class="weather-alert-card">
              <app-icon name="thermometer-snowflake" [size]="20"></app-icon>
              <div>
                <strong>Atenção ao Frio ({{ weatherService.currentWeather()?.temperature }}°C)</strong>
                <p>Este ponto acolhe pessoas expostas às baixas temperaturas. Cobertores, meias e agasalhos são prioridade máxima hoje.</p>
              </div>
            </div>
          }

          <!-- Description -->
          <div class="section-block">
            <h3 class="section-title">Sobre a Iniciativa</h3>
            <p class="description-text">{{ point().description }}</p>
            @if (point().mealsPerDayEstimate) {
              <div class="stat-callout">
                <app-icon name="utensils" [size]="16"></app-icon>
                <span>Atendimento estimado: <strong>~{{ point().mealsPerDayEstimate }} refeições por dia</strong></span>
              </div>
            }
          </div>

          <!-- Needed items with interactive pledge action -->
          <div class="section-block">
            <div class="section-header-row">
              <h3 class="section-title">Necessidades Urgentes do Momento</h3>
              <span class="pledge-hint">Clique para registrar seu compromisso</span>
            </div>
            
            <div class="needed-items-list">
              @for (item of point().neededItems; track item) {
                <div class="item-action-row">
                  <div class="item-info">
                    <span class="item-emoji">{{ getItemEmoji(item) }}</span>
                    <div>
                      <strong class="item-label">{{ getItemLabel(item) }}</strong>
                      <span class="item-pledges">
                        {{ pointsService.getPledgeCount(point().id, item) }} pessoas já se comprometeram a apoiar
                      </span>
                    </div>
                  </div>
                  <button 
                    class="btn-pledge" 
                    [class.pledged]="hasPledged(item)"
                    (click)="pledgeItem(item)"
                  >
                    @if (hasPledged(item)) {
                      <app-icon name="check" [size]="14"></app-icon>
                      <span>Vou Ajudar!</span>
                    } @else {
                      <span>Vou Doar</span>
                    }
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Direct Contact & Solidarity Channels -->
          <div class="section-block">
            <h3 class="section-title">Canais Diretos de Apoio e Doação</h3>
            <div class="contact-grid">
              @if (point().contactWhatsapp) {
                <a 
                  [href]="getWhatsappLink()" 
                  target="_blank" 
                  rel="noopener" 
                  class="contact-card whatsapp"
                >
                  <div class="contact-icon">
                    <app-icon name="phone" [size]="18"></app-icon>
                  </div>
                  <div class="contact-details">
                    <span class="contact-type">WhatsApp Solidário</span>
                    <strong class="contact-val">Conversar e Combinar Doação</strong>
                  </div>
                  <app-icon name="external-link" [size]="14" class="ext-icon"></app-icon>
                </a>
              }

              @if (point().pixKey) {
                <div class="contact-card pix" (click)="copyPix()">
                  <div class="contact-icon">
                    <app-icon name="heart" [size]="18"></app-icon>
                  </div>
                  <div class="contact-details">
                    <span class="contact-type">Chave PIX Solidária ({{ point().pixType || 'Direto' }})</span>
                    <strong class="contact-val font-mono">{{ point().pixKey }}</strong>
                  </div>
                  <button class="btn-copy" title="Copiar Chave PIX">
                    <app-icon [name]="pixCopied() ? 'check' : 'copy'" [size]="16"></app-icon>
                    <span>{{ pixCopied() ? 'Copiada!' : 'Copiar' }}</span>
                  </button>
                </div>
              }

              @if (point().contactPhone && !point().contactWhatsapp) {
                <a [href]="'tel:' + point().contactPhone" class="contact-card">
                  <div class="contact-icon">
                    <app-icon name="phone" [size]="18"></app-icon>
                  </div>
                  <div class="contact-details">
                    <span class="contact-type">Telefone Fixo</span>
                    <strong class="contact-val">{{ point().contactPhone }}</strong>
                  </div>
                </a>
              }

              @if (point().website) {
                <a [href]="point().website" target="_blank" rel="noopener" class="contact-card">
                  <div class="contact-icon">
                    <app-icon name="external-link" [size]="18"></app-icon>
                  </div>
                  <div class="contact-details">
                    <span class="contact-type">Portal Oficial</span>
                    <strong class="contact-val">{{ point().website }}</strong>
                  </div>
                </a>
              }
            </div>
          </div>

          <!-- Address & Route directions -->
          <div class="section-block address-section">
            <h3 class="section-title">Endereço & Como Chegar</h3>
            <p class="address-full">
              <app-icon name="map-pin" [size]="16"></app-icon>
              <span>{{ point().address }}, {{ point().city }} - {{ point().state }}</span>
            </p>
            @if (point().openingHours) {
              <p class="hours-text">
                <strong>Horários de Funcionamento/Recebimento:</strong> {{ point().openingHours }}
              </p>
            }

            <div class="route-buttons">
              <a [href]="getRouteOsmLink()" target="_blank" rel="noopener" class="btn-route osm">
                <app-icon name="navigation" [size]="16"></app-icon>
                <span>Ver Rota no OpenStreetMap</span>
              </a>
              <a [href]="getRouteGoogleLink()" target="_blank" rel="noopener" class="btn-route google">
                <app-icon name="map-pin" [size]="16"></app-icon>
                <span>Abrir no Google Maps</span>
              </a>
            </div>
          </div>

          <!-- Share & Community options -->
          <div class="footer-actions-row">
            <button class="btn-share" (click)="sharePoint()">
              <app-icon name="share" [size]="16"></app-icon>
              <span>{{ shareText() }}</span>
            </button>

            @if (point().source === 'community_submission') {
              <button class="btn-delete-point" (click)="deleteMyPoint()">
                <app-icon name="x" [size]="14"></app-icon>
                <span>Remover este ponto</span>
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(28, 25, 23, 0.65);
      backdrop-filter: blur(4px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.2s ease-out;
    }
    .detail-card {
      background: var(--bg-surface);
      border-radius: var(--radius-xl);
      width: 100%;
      max-width: 650px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--border-light);
      overflow: hidden;
      animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .card-banner {
      padding: 24px 28px 20px;
      color: #FFFFFF;
      position: relative;
    }
    .card-banner.soup_kitchen {
      background: linear-gradient(135deg, #B85028 0%, #8A3314 100%);
    }
    .card-banner.food_bank {
      background: linear-gradient(135deg, #2D6B4E 0%, #1A4732 100%);
    }
    .card-banner.shelter {
      background: linear-gradient(135deg, #C8751B 0%, #8C4D0A 100%);
    }
    .card-banner.community_centre {
      background: linear-gradient(135deg, #585A80 0%, #363857 100%);
    }
    .card-banner.collection_point {
      background: linear-gradient(135deg, #7C5B3F 0%, #4E3723 100%);
    }
    .banner-top-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .category-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      padding: 4px 12px;
      border-radius: var(--radius-pill);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .btn-close-circle {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.25);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn-close-circle:hover {
      background: rgba(0, 0, 0, 0.45);
    }
    .critical-alert-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #FFFFFF;
      color: var(--color-urgent-crit-text);
      font-size: 0.75rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .point-name {
      font-size: 1.55rem;
      line-height: 1.25;
      margin-bottom: 10px;
      color: #FFFFFF;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      font-size: 0.85rem;
    }
    .location-text {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      opacity: 0.95;
    }
    .distance-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(255, 255, 255, 0.22);
      padding: 3px 9px;
      border-radius: var(--radius-pill);
      font-weight: 600;
    }
    .verified-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #FFFFFF;
      color: var(--color-sage);
      padding: 2px 8px;
      border-radius: var(--radius-pill);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .card-body {
      padding: 24px 28px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .weather-alert-card {
      display: flex;
      gap: 14px;
      padding: 14px 16px;
      border-radius: var(--radius-md);
      background: #EEF6FC;
      border: 1.5px solid #C4E0F4;
      color: #174E75;
    }
    .weather-alert-card strong {
      display: block;
      font-size: 0.9rem;
      margin-bottom: 2px;
    }
    .weather-alert-card p {
      font-size: 0.82rem;
      line-height: 1.4;
    }
    .section-block {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .section-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .pledge-hint {
      font-size: 0.78rem;
      color: var(--color-primary);
      font-weight: 600;
    }
    .description-text {
      font-size: 0.92rem;
      color: var(--text-body);
      line-height: 1.55;
    }
    .stat-callout {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-surface-muted);
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      color: var(--text-body);
      border-left: 3px solid var(--color-ochre);
      width: fit-content;
    }
    .needed-items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .item-action-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--bg-page);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      gap: 12px;
    }
    .item-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .item-emoji {
      font-size: 1.4rem;
    }
    .item-label {
      display: block;
      font-size: 0.9rem;
      color: var(--text-main);
    }
    .item-pledges {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .btn-pledge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--radius-pill);
      font-size: 0.82rem;
      font-weight: 700;
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
      border: 1px solid var(--color-primary-subtle);
      white-space: nowrap;
    }
    .btn-pledge:hover {
      background: var(--color-primary);
      color: #FFFFFF;
    }
    .btn-pledge.pledged {
      background: var(--color-sage);
      color: #FFFFFF;
      border-color: var(--color-sage-hover);
    }
    .contact-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .contact-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
      background: var(--bg-surface);
      text-decoration: none;
      color: var(--text-main);
      transition: all var(--transition-fast);
      position: relative;
    }
    .contact-card:hover {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-sm);
    }
    .contact-card.whatsapp {
      background: #F0FBF4;
      border-color: #BDE6CC;
    }
    .contact-card.whatsapp:hover {
      border-color: #2D6B4E;
    }
    .contact-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--bg-surface-muted);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .contact-card.whatsapp .contact-icon {
      background: #25D366;
      color: #FFFFFF;
    }
    .contact-details {
      flex: 1;
      min-width: 0;
    }
    .contact-type {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .contact-val {
      display: block;
      font-size: 0.92rem;
      color: var(--text-main);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .font-mono {
      font-family: monospace;
      font-size: 0.88rem;
    }
    .ext-icon {
      color: var(--text-muted);
    }
    .btn-copy {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: var(--radius-pill);
      background: var(--bg-surface-muted);
      border: 1px solid var(--border-subtle);
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-body);
    }
    .btn-copy:hover {
      background: var(--color-primary-light);
      color: var(--color-primary);
    }
    .address-section {
      background: var(--bg-page);
      padding: 16px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-light);
    }
    .address-full {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 0.9rem;
      color: var(--text-body);
      margin-bottom: 6px;
    }
    .hours-text {
      font-size: 0.84rem;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .route-buttons {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn-route {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: var(--radius-pill);
      font-size: 0.84rem;
      font-weight: 600;
      text-decoration: none;
      transition: all var(--transition-fast);
    }
    .btn-route.osm {
      background: var(--color-sage);
      color: #FFFFFF;
    }
    .btn-route.osm:hover {
      background: var(--color-sage-hover);
    }
    .btn-route.google {
      background: var(--bg-surface);
      color: var(--text-body);
      border: 1px solid var(--border-subtle);
    }
    .btn-route.google:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    .footer-actions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid var(--border-light);
    }
    .btn-share {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: var(--radius-pill);
      background: var(--bg-surface-muted);
      border: 1px solid var(--border-light);
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-body);
    }
    .btn-share:hover {
      background: var(--border-light);
    }
    .btn-delete-point {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--color-urgent-crit-text);
      padding: 6px 12px;
      border-radius: var(--radius-pill);
    }
    .btn-delete-point:hover {
      background: var(--color-urgent-crit-bg);
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
export class PointDetailModalComponent {
  public point = input.required<SupportPoint>();
  public close = output<void>();

  public pointsService = inject(SupportPointsService);
  public geoService = inject(GeolocationService);
  public weatherService = inject(WeatherService);

  public pixCopied = signal<boolean>(false);
  public shareText = signal<string>('Compartilhar Ponto');
  public userPledges = signal<Set<string>>(new Set());

  public getCategoryIcon(cat: string): string {
    switch (cat) {
      case 'soup_kitchen': return 'utensils';
      case 'food_bank': return 'carrot';
      case 'shelter': return 'home';
      case 'community_centre': return 'users';
      default: return 'box';
    }
  }

  public getItemEmoji(item: NeededItemType): string {
    switch (item) {
      case 'non_perishable': return '🍚';
      case 'fresh_produce': return '🥕';
      case 'prepared_meals': return '🍲';
      case 'winter_clothes': return '🧥';
      case 'hygiene': return '🧼';
      case 'volunteers': return '🤝';
      case 'financial_pix': return '💳';
    }
  }

  public getItemLabel(item: NeededItemType): string {
    switch (item) {
      case 'non_perishable': return 'Alimentos Não-Perecíveis (Arroz, Feijão, Óleo)';
      case 'fresh_produce': return 'Hortifrúti Fresco (Frutas & Legumes)';
      case 'prepared_meals': return 'Marmitas & Refeições Prontas';
      case 'winter_clothes': return 'Agasalhos, Meias e Cobertores';
      case 'hygiene': return 'Itens de Higiene e Limpeza';
      case 'volunteers': return 'Voluntários (Cozinha & Distribuição)';
      case 'financial_pix': return 'Doação Financeira via PIX';
    }
  }

  public hasPledged(item: NeededItemType): boolean {
    return this.userPledges().has(item);
  }

  public pledgeItem(item: NeededItemType) {
    this.pointsService.togglePledge(this.point().id, item);
    const updated = new Set(this.userPledges());
    updated.add(item);
    this.userPledges.set(updated);
  }

  public copyPix() {
    if (!this.point().pixKey) return;
    navigator.clipboard.writeText(this.point().pixKey!).then(() => {
      this.pixCopied.set(true);
      setTimeout(() => this.pixCopied.set(false), 2500);
    });
  }

  public getWhatsappLink(): string {
    const raw = (this.point().contactWhatsapp || '').replace(/\D/g, '');
    const cleanNumber = raw.startsWith('55') ? raw : `55${raw}`;
    const message = encodeURIComponent(
      `Olá! Vi a iniciativa "${this.point().name}" no aplicativo AlimentaRede e gostaria de combinar uma doação ou me voluntariar para ajudar.`
    );
    return `https://wa.me/${cleanNumber}?text=${message}`;
  }

  public getRouteOsmLink(): string {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${this.point().lat}%2C${this.point().lng}`;
  }

  public getRouteGoogleLink(): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${this.point().lat},${this.point().lng}`;
  }

  public sharePoint() {
    const p = this.point();
    const shareUrl = this.pointsService.getShareableUrl(p);
    const shareData = {
      title: `${p.name} • AlimentaRede`,
      text: `Conheça e apoie a iniciativa solidária "${p.name}" em ${p.city} contra a fome:`,
      url: shareUrl
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`);
      this.shareText.set('Link copiado!');
      setTimeout(() => this.shareText.set('Compartilhar Ponto'), 2500);
    }
  }

  public deleteMyPoint() {
    if (confirm('Deseja realmente remover este ponto cadastrado?')) {
      this.pointsService.removeUserPoint(this.point().id);
      this.close.emit();
    }
  }
}
