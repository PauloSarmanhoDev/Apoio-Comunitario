import { Component, inject, output } from '@angular/core';
import { GeolocationService } from '../../services/geolocation.service';
import { WeatherService } from '../../services/weather.service';
import { PwaService } from '../../services/pwa.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (!pwaService.isOnline()) {
      <div class="offline-bar">
        <app-icon name="box" [size]="14"></app-icon>
        <span>Você está no Modo Offline. Os pontos e contatos salvos no seu aparelho continuam disponíveis.</span>
      </div>
    }

    <header class="app-header">
      <div class="header-main-container">
        <!-- Logo & Brand identity -->
        <div class="brand-group">
          <div class="brand-logo-mark">
            <app-icon name="heart" [size]="22"></app-icon>
          </div>
          <div class="brand-text">
            <h1 class="brand-title heading-editorial">AlimentaRede</h1>
            <span class="brand-subtitle">Redes Solidárias & Combate à Fome</span>
          </div>
        </div>

        <!-- Middle: Region Selector & Weather context -->
        <div class="context-group">
          <!-- City / Region Selector Button -->
          <button class="btn-location-pill" (click)="openCitySelector.emit()" title="Alterar cidade ou país">
            <app-icon name="map-pin" [size]="15" class="icon-accent"></app-icon>
            <span class="location-name">{{ geoService.currentCoords().cityLabel }}</span>
            <span class="change-tag">Alterar</span>
          </button>

          <!-- Quick GPS button -->
          <button 
            class="btn-gps-quick" 
            [class.loading]="geoService.isLocating()"
            (click)="triggerGps()" 
            title="Usar minha localização via GPS"
          >
            <app-icon name="navigation" [size]="14"></app-icon>
            @if (geoService.isLocating()) {
              <span>Buscando...</span>
            } @else {
              <span class="hide-mobile">Meu GPS</span>
            }
          </button>

          <!-- Weather Humanitarian Alert Pill -->
          @if (weatherService.currentWeather(); as weather) {
            <div 
              class="weather-pill" 
              [class.alert-cold]="weather.isColdWave"
              [class.alert-rain]="weather.isRainy"
              [title]="weather.humanitarianNotice"
            >
              @if (weather.isColdWave) {
                <app-icon name="thermometer-snowflake" [size]="15"></app-icon>
                <span>{{ weather.temperature }}°C • Frio Urgente</span>
              } @else if (weather.isRainy) {
                <app-icon name="cloud-rain" [size]="15"></app-icon>
                <span>Chuvoso • {{ weather.temperature }}°C</span>
              } @else {
                <span>{{ weather.temperature }}°C • {{ weather.weatherDescription }}</span>
              }
            </div>
          }
        </div>

        <!-- Right: Actions -->
        <div class="actions-group">
          <!-- Guia de Doação Lei 14.016 -->
          <button class="btn-action-ghost" (click)="openGuide.emit()" title="Guia Legal contra Desperdício de Alimentos">
            <app-icon name="book-open" [size]="16"></app-icon>
            <span class="hide-mobile">Guia Anti-Desperdício</span>
          </button>

          <!-- PWA Install Button -->
          @if (pwaService.canInstall()) {
            <button class="btn-install-pwa" (click)="installPwa()" title="Instalar aplicativo no seu celular ou computador">
              <app-icon name="download" [size]="15"></app-icon>
              <span>Instalar App</span>
            </button>
          }

          <!-- Cadastrar Ponto Solidário -->
          <button class="btn-add-point" (click)="openAddPoint.emit()" title="Cadastrar nova cozinha comunitária ou ponto de coleta">
            <app-icon name="plus" [size]="16"></app-icon>
            <span>Cadastrar Ponto</span>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .offline-bar {
      background: #78350F;
      color: #FEF3C7;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 6px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-align: center;
    }
    .app-header {
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-light);
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: var(--shadow-sm);
    }
    .header-main-container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .brand-logo-mark {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--color-primary), #8F3718);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(184, 80, 40, 0.28);
    }
    .brand-title {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.1;
      color: var(--text-main);
    }
    .brand-subtitle {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 600;
      display: block;
      letter-spacing: 0.02em;
    }
    .context-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn-location-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: var(--bg-surface-muted);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-pill);
      font-size: 0.85rem;
      color: var(--text-main);
      max-width: 240px;
      transition: all var(--transition-fast);
    }
    .btn-location-pill:hover {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
    }
    .icon-accent {
      color: var(--color-primary);
      flex-shrink: 0;
    }
    .location-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }
    .change-tag {
      font-size: 0.7rem;
      padding: 2px 6px;
      background: rgba(0, 0, 0, 0.06);
      border-radius: var(--radius-pill);
      color: var(--text-muted);
    }
    .btn-gps-quick {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--bg-surface-muted);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-pill);
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-body);
    }
    .btn-gps-quick:hover {
      background: var(--color-primary-light);
      color: var(--color-primary);
      border-color: var(--color-primary);
    }
    .weather-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--bg-surface-muted);
      border-radius: var(--radius-pill);
      font-size: 0.78rem;
      color: var(--text-body);
      border: 1px solid var(--border-light);
      cursor: help;
    }
    .weather-pill.alert-cold {
      background: #FDF1F1;
      border-color: #F5B8B8;
      color: #9E1C1C;
      font-weight: 700;
    }
    .weather-pill.alert-rain {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #1E40AF;
      font-weight: 600;
    }
    .actions-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-action-ghost {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-pill);
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-body);
    }
    .btn-action-ghost:hover {
      border-color: var(--color-sage);
      color: var(--color-sage);
      background: var(--color-sage-light);
    }
    .btn-install-pwa {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: var(--color-sage-light);
      color: var(--color-sage-hover);
      border: 1.5px solid var(--color-sage-border);
      border-radius: var(--radius-pill);
      font-size: 0.84rem;
      font-weight: 700;
    }
    .btn-install-pwa:hover {
      background: var(--color-sage);
      color: #FFFFFF;
    }
    .btn-add-point {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      background: var(--color-primary);
      color: #FFFFFF;
      border-radius: var(--radius-pill);
      font-size: 0.88rem;
      font-weight: 700;
      box-shadow: 0 2px 6px rgba(184, 80, 40, 0.25);
      transition: all var(--transition-fast);
    }
    .btn-add-point:hover {
      background: var(--color-primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(184, 80, 40, 0.35);
    }
    @media (max-width: 900px) {
      .hide-mobile {
        display: none;
      }
    }
    @media (max-width: 768px) {
      .header-main-container {
        padding: 10px 14px;
      }
      .brand-title {
        font-size: 1.15rem;
      }
      .brand-subtitle {
        display: none;
      }
      .btn-location-pill {
        max-width: 150px;
        font-size: 0.78rem;
        padding: 6px 10px;
      }
      .btn-add-point {
        padding: 8px 12px;
        font-size: 0.8rem;
      }
    }
  `]
})
export class HeaderComponent {
  public geoService = inject(GeolocationService);
  public weatherService = inject(WeatherService);
  public pwaService = inject(PwaService);

  public openCitySelector = output<void>();
  public openAddPoint = output<void>();
  public openGuide = output<void>();

  public triggerGps() {
    this.geoService.requestDeviceLocation().catch(() => {});
  }

  public installPwa() {
    this.pwaService.installApp();
  }
}
