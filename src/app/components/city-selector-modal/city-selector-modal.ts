import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeolocationService, PresetLocation, GeoLocationCoords } from '../../services/geolocation.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-city-selector-modal',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-title">
            <span class="icon-circle">
              <app-icon name="map-pin" [size]="20"></app-icon>
            </span>
            <div>
              <h2 class="heading-editorial">Escolher Região</h2>
              <p class="subtitle">Encontre pontos de acolhimento solidário no Brasil e no mundo</p>
            </div>
          </div>
          <button class="btn-close" (click)="close.emit()" title="Fechar">
            <app-icon name="x" [size]="18"></app-icon>
          </button>
        </header>

        <div class="modal-body">
          <!-- Search input for any city in the world -->
          <div class="search-box">
            <app-icon name="search" [size]="18" class="search-icon"></app-icon>
            <input 
              type="text" 
              placeholder="Digite o nome de uma cidade, bairro ou país..."
              [(ngModel)]="searchQuery"
              (input)="onSearchInput()"
            />
            @if (searchQuery()) {
              <button class="btn-clear" (click)="clearSearch()">
                <app-icon name="x" [size]="14"></app-icon>
              </button>
            }
          </div>

          <!-- Live search results from Nominatim -->
          @if (isSearching()) {
            <div class="searching-state">
              <div class="spinner"></div>
              <span>Buscando no OpenStreetMap...</span>
            </div>
          } @else if (searchResults().length > 0) {
            <div class="results-group">
              <span class="group-label">Resultados da Busca Global:</span>
              <div class="results-list">
                @for (res of searchResults(); track res.label) {
                  <button class="result-item" (click)="selectCustomLocation(res)">
                    <app-icon name="map-pin" [size]="16"></app-icon>
                    <span>{{ res.label }}</span>
                  </button>
                }
              </div>
            </div>
          }

          <!-- Quick presets: Brazilian Hubs and Global -->
          <div class="presets-section">
            <span class="group-label">Capitais e Redes de Destaque:</span>
            <div class="preset-grid">
              @for (preset of geoService.PRESET_LOCATIONS; track preset.name) {
                <button 
                  class="preset-card" 
                  [class.active]="isCurrent(preset)"
                  (click)="selectPreset(preset)"
                >
                  <div class="preset-info">
                    <span class="preset-name">{{ preset.name }}</span>
                    <span class="preset-region">{{ preset.state }} • {{ preset.country }}</span>
                  </div>
                  @if (preset.badge) {
                    <span class="preset-badge">{{ preset.badge }}</span>
                  }
                </button>
              }
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="btn-gps" (click)="useGps()">
            <app-icon name="navigation" [size]="16"></app-icon>
            <span>Usar meu GPS exato</span>
          </button>
        </footer>
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
      max-width: 580px;
      max-height: 90vh;
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
    h2 {
      font-size: 1.35rem;
      margin-bottom: 2px;
    }
    .subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
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
    .btn-close:hover {
      background: var(--border-light);
      color: var(--text-main);
    }
    .modal-body {
      padding: 20px 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-box input {
      width: 100%;
      padding: 12px 40px 12px 42px;
      border-radius: var(--radius-lg);
      border: 1.5px solid var(--border-subtle);
      font-family: var(--font-sans);
      font-size: 0.95rem;
      background: var(--bg-surface-muted);
      color: var(--text-main);
      transition: border-color var(--transition-fast), background var(--transition-fast);
    }
    .search-box input:focus {
      outline: none;
      background: #FFFFFF;
      border-color: var(--color-primary);
    }
    .search-icon {
      position: absolute;
      left: 14px;
      color: var(--text-muted);
      pointer-events: none;
    }
    .btn-clear {
      position: absolute;
      right: 12px;
      padding: 4px;
      color: var(--text-muted);
    }
    .searching-state {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      color: var(--text-muted);
      padding: 8px 0;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border-subtle);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .group-label {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 10px;
      display: block;
    }
    .results-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .result-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      background: var(--bg-page);
      border: 1px solid var(--border-light);
      text-align: left;
      font-size: 0.9rem;
      color: var(--text-main);
    }
    .result-item:hover {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
      color: var(--color-primary-dark);
    }
    .preset-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    @media (max-width: 480px) {
      .preset-grid {
        grid-template-columns: 1fr;
      }
    }
    .preset-card {
      padding: 12px 14px;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--border-light);
      background: var(--bg-surface);
      display: flex;
      align-items: center;
      justify-content: space-between;
      text-align: left;
      transition: all var(--transition-fast);
    }
    .preset-card:hover {
      border-color: var(--color-primary);
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }
    .preset-card.active {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
    }
    .preset-name {
      display: block;
      font-weight: 700;
      color: var(--text-main);
      font-size: 0.95rem;
    }
    .preset-region {
      display: block;
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    .preset-badge {
      font-size: 0.7rem;
      padding: 3px 8px;
      background: var(--color-primary-subtle);
      color: var(--color-primary-dark);
      border-radius: var(--radius-pill);
      font-weight: 600;
      white-space: nowrap;
    }
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border-light);
      background: var(--bg-page);
      display: flex;
      justify-content: flex-end;
    }
    .btn-gps {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--color-primary);
      color: #FFFFFF;
      padding: 10px 20px;
      border-radius: var(--radius-pill);
      font-weight: 600;
      font-size: 0.9rem;
    }
    .btn-gps:hover {
      background: var(--color-primary-hover);
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
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
export class CitySelectorModalComponent {
  public geoService = inject(GeolocationService);

  public close = output<void>();
  public selected = output<GeoLocationCoords>();

  public searchQuery = signal<string>('');
  public isSearching = signal<boolean>(false);
  public searchResults = signal<Array<{ label: string; lat: number; lng: number }>>([]);

  private searchDebounceTimeout: any = null;

  public onSearchInput() {
    clearTimeout(this.searchDebounceTimeout);
    const q = this.searchQuery().trim();
    if (q.length < 3) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);
    this.searchDebounceTimeout = setTimeout(() => {
      this.geoService.searchLocations(q).subscribe(results => {
        this.searchResults.set(results);
        this.isSearching.set(false);
      });
    }, 450);
  }

  public clearSearch() {
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  public selectPreset(preset: PresetLocation) {
    const coords: GeoLocationCoords = {
      lat: preset.lat,
      lng: preset.lng,
      cityLabel: `${preset.name} - ${preset.state}, ${preset.country}`
    };
    this.geoService.setCoords(coords);
    this.selected.emit(coords);
    this.close.emit();
  }

  public selectCustomLocation(res: { label: string; lat: number; lng: number }) {
    const coords: GeoLocationCoords = {
      lat: res.lat,
      lng: res.lng,
      cityLabel: res.label
    };
    this.geoService.setCoords(coords);
    this.selected.emit(coords);
    this.close.emit();
  }

  public useGps() {
    this.geoService.requestDeviceLocation().then(coords => {
      this.selected.emit(coords);
      this.close.emit();
    }).catch(() => {
      // Handled by geoService signal
    });
  }

  public isCurrent(preset: PresetLocation): boolean {
    const cur = this.geoService.currentCoords();
    return Math.abs(cur.lat - preset.lat) < 0.05 && Math.abs(cur.lng - preset.lng) < 0.05;
  }
}
