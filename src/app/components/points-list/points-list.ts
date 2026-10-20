import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupportPoint, PointCategory, UrgencyLevel, NeededItemType } from '../../models/support-point.model';
import { SupportPointsService } from '../../services/support-points.service';
import { GeolocationService } from '../../services/geolocation.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-points-list',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="list-wrapper">
      <!-- Search & Impact Statistics -->
      <div class="search-and-stats-card">
        <!-- Search bar -->
        <div class="search-box-large">
          <app-icon name="search" [size]="20" class="search-icon"></app-icon>
          <input 
            type="text" 
            placeholder="Buscar por instituição, bairro, alimento necessário..."
            [ngModel]="pointsService.searchTerm()"
            (ngModelChange)="pointsService.searchTerm.set($event)"
          />
          @if (pointsService.searchTerm()) {
            <button class="btn-clear" (click)="pointsService.searchTerm.set('')">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          }
        </div>

        <!-- Community Impact metrics strip -->
        <div class="impact-metrics-row">
          <div class="metric-item">
            <span class="metric-value">{{ pointsService.impactStats().totalPoints }}</span>
            <span class="metric-label">Pontos na Rede</span>
          </div>
          <div class="metric-item">
            <span class="metric-value text-terracotta">{{ pointsService.impactStats().soupKitchens }}</span>
            <span class="metric-label">Cozinhas Solidárias</span>
          </div>
          <div class="metric-item">
            <span class="metric-value text-sage">~{{ pointsService.impactStats().estimatedDailyMeals }}</span>
            <span class="metric-label">Refeições/dia</span>
          </div>
          <div class="metric-item">
            <span class="metric-value text-crit">{{ pointsService.impactStats().criticalUrgencyPoints }}</span>
            <span class="metric-label">Urgência Crítica</span>
          </div>
        </div>
      </div>

      <!-- Categories Filter Tabs (Scrollable) -->
      <div class="categories-scroll-container">
        @for (cat of pointsService.categoryOptions(); track cat.id) {
          <button 
            class="cat-chip" 
            [class.active]="pointsService.selectedCategory() === cat.id"
            (click)="pointsService.selectedCategory.set(cat.id)"
          >
            <app-icon [name]="cat.icon" [size]="15"></app-icon>
            <span>{{ cat.label }}</span>
            @if (cat.count) {
              <span class="chip-count">{{ cat.count }}</span>
            }
          </button>
        }
      </div>

      <!-- Secondary Filters Bar: Urgency, Items Needed, Volunteers -->
      <div class="secondary-filters-bar">
        <!-- Urgency Dropdown/Buttons -->
        <div class="filter-group">
          <span class="filter-label">Urgência:</span>
          <button 
            class="filter-pill-mini" 
            [class.active]="pointsService.selectedUrgency() === 'all'"
            (click)="pointsService.selectedUrgency.set('all')"
          >Todas</button>
          <button 
            class="filter-pill-mini crit" 
            [class.active]="pointsService.selectedUrgency() === 'critical'"
            (click)="pointsService.selectedUrgency.set('critical')"
          >
            <span class="dot-pulse critical"></span>
            <span>Crítica</span>
          </button>
          <button 
            class="filter-pill-mini high" 
            [class.active]="pointsService.selectedUrgency() === 'high'"
            (click)="pointsService.selectedUrgency.set('high')"
          >Alta</button>
          <button 
            class="filter-pill-mini mod" 
            [class.active]="pointsService.selectedUrgency() === 'moderate'"
            (click)="pointsService.selectedUrgency.set('moderate')"
          >Moderada</button>
        </div>

        <!-- Only Volunteers toggle -->
        <button 
          class="btn-toggle-volunteer" 
          [class.active]="pointsService.onlyVolunteersNeeded()"
          (click)="pointsService.onlyVolunteersNeeded.set(!pointsService.onlyVolunteersNeeded())"
        >
          <app-icon name="users" [size]="14"></app-icon>
          <span>Vagas para Voluntários</span>
        </button>
      </div>

      <!-- Needed Items Quick Bar -->
      <div class="items-filter-bar">
        <span class="filter-label">Doar Item Específico:</span>
        <div class="items-chips-scroll">
          <button 
            class="item-btn" 
            [class.active]="pointsService.selectedItemNeeded() === 'all'"
            (click)="pointsService.selectedItemNeeded.set('all')"
          >
            Todos os Itens
          </button>
          <button 
            class="item-btn" 
            [class.active]="pointsService.selectedItemNeeded() === 'non_perishable'"
            (click)="selectItem('non_perishable')"
          >
            🍚 Alimentos Não-Perecíveis
          </button>
          <button 
            class="item-btn" 
            [class.active]="pointsService.selectedItemNeeded() === 'fresh_produce'"
            (click)="selectItem('fresh_produce')"
          >
            🥕 Hortifrúti (Resgate)
          </button>
          <button 
            class="item-btn" 
            [class.active]="pointsService.selectedItemNeeded() === 'prepared_meals'"
            (click)="selectItem('prepared_meals')"
          >
            🍲 Marmitas Prontas
          </button>
          <button 
            class="item-btn" 
            [class.active]="pointsService.selectedItemNeeded() === 'winter_clothes'"
            (click)="selectItem('winter_clothes')"
          >
            🧥 Agasalhos & Cobertores
          </button>
          <button 
            class="item-btn" 
            [class.active]="pointsService.selectedItemNeeded() === 'hygiene'"
            (click)="selectItem('hygiene')"
          >
            🧼 Higiene
          </button>
        </div>
      </div>

      <!-- Search Radius Distance Selector Bar -->
      <div class="radius-filter-bar">
        <span class="filter-label">Raio:</span>
        <div class="radius-buttons-scroll">
          <button 
            class="filter-pill-mini" 
            [class.active]="pointsService.maxDistanceKm() === 25"
            (click)="pointsService.maxDistanceKm.set(25)"
          >25 km</button>
          <button 
            class="filter-pill-mini" 
            [class.active]="pointsService.maxDistanceKm() === 50"
            (click)="pointsService.maxDistanceKm.set(50)"
          >50 km</button>
          <button 
            class="filter-pill-mini" 
            [class.active]="pointsService.maxDistanceKm() === 100"
            (click)="pointsService.maxDistanceKm.set(100)"
          >100 km</button>
          <button 
            class="filter-pill-mini highlight" 
            [class.active]="pointsService.maxDistanceKm() >= 1000"
            (click)="pointsService.maxDistanceKm.set(99999)"
          >
            <app-icon name="map-pin" [size]="12"></app-icon>
            <span>Sem Limite (Todas as Redes)</span>
          </button>
        </div>
      </div>

      <!-- Results Count & Status -->
      <div class="results-header">
        <span class="results-count">
          <strong>{{ pointsService.filteredPoints().length }}</strong> iniciativas encontradas
        </span>
        @if (pointsService.isLoadingPoints()) {
          <div class="loading-tag">
            <span class="mini-spinner"></span>
            <span>Atualizando rede OSM...</span>
          </div>
        }
      </div>

      <!-- Cards List -->
      <div class="cards-grid">
        @for (point of pointsService.filteredPoints(); track point.id) {
          <div 
            class="point-card" 
            [class.selected]="pointsService.selectedPoint()?.id === point.id"
            (click)="selectPoint(point)"
          >
            <!-- Card Header: Category & Distance & Urgency -->
            <div class="card-top-row">
              <span class="card-cat-badge" [class]="point.category">
                <app-icon [name]="getCatIcon(point.category)" [size]="13"></app-icon>
                <span>{{ point.categoryLabel }}</span>
              </span>

              <div class="card-top-right">
                @if (point.distanceKm !== undefined) {
                  <span class="card-distance-pill">
                    <app-icon name="navigation" [size]="11"></app-icon>
                    <span>{{ geoService.formatDistance(point.distanceKm) }}</span>
                  </span>
                }
                <span class="badge-urgency" [class]="point.urgency">
                  <span class="dot-pulse" [class]="point.urgency"></span>
                  <span>{{ getUrgencyLabel(point.urgency) }}</span>
                </span>
              </div>
            </div>

            <!-- Title & Address -->
            <div class="card-title-block">
              <h3 class="card-title">
                {{ point.name }}
                @if (point.verified) {
                  <span class="verified-icon" title="Iniciativa Verificada">
                    <app-icon name="shield-check" [size]="15"></app-icon>
                  </span>
                }
              </h3>
              <p class="card-address">
                <app-icon name="map-pin" [size]="13" class="pin-icon"></app-icon>
                <span>{{ point.address }}</span>
              </p>
            </div>

            <!-- Description excerpt -->
            <p class="card-desc">{{ point.description }}</p>

            <!-- Urgent Items Chips -->
            <div class="card-items-row">
              <span class="items-prefix">Precisam de:</span>
              <div class="items-tags-wrap">
                @for (item of point.neededItems.slice(0, 4); track item) {
                  <span class="item-tag">{{ getItemShortLabel(item) }}</span>
                }
                @if (point.neededItems.length > 4) {
                  <span class="item-tag more">+{{ point.neededItems.length - 4 }}</span>
                }
              </div>
            </div>

            <!-- Footer: Actions -->
            <div class="card-footer" (click)="$event.stopPropagation()">
              <div class="footer-left-info">
                @if (point.acceptsVolunteers) {
                  <span class="volunteer-available-pill">
                    <app-icon name="users" [size]="12"></app-icon>
                    <span>Vagas Voluntários</span>
                  </span>
                }
              </div>

              <div class="footer-actions">
                <button class="btn-card-map" (click)="locateOnMap(point)" title="Localizar no Mapa">
                  <app-icon name="map-pin" [size]="14"></app-icon>
                  <span>Mapa</span>
                </button>
                @if (point.contactWhatsapp) {
                  <a 
                    [href]="getWhatsappLink(point)" 
                    target="_blank" 
                    rel="noopener" 
                    class="btn-card-wa" 
                    title="Conversar no WhatsApp"
                  >
                    <app-icon name="phone" [size]="14"></app-icon>
                    <span>WhatsApp</span>
                  </a>
                }
                <button class="btn-card-details" (click)="openDetail(point)">
                  <span>Detalhes & Doar</span>
                  <app-icon name="heart" [size]="13"></app-icon>
                </button>
              </div>
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <div class="empty-icon-circle">
              <app-icon name="heart" [size]="36"></app-icon>
            </div>
            <h3 class="heading-editorial">Nenhuma iniciativa encontrada com esses filtros</h3>
            <p>Tente limpar a busca ou selecionar outra categoria para ver os pontos da rede de solidariedade.</p>
            <div class="empty-actions">
              <button class="btn-reset-filters" (click)="resetFilters()">
                Limpar Todos os Filtros
              </button>
              <button class="btn-add-ponto-empty" (click)="openAddPoint.emit()">
                <app-icon name="plus" [size]="15"></app-icon>
                <span>Cadastrar Iniciativa Desta Região</span>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .list-wrapper {
      display: flex;
      flex-direction: column;
      gap: 14px;
      height: 100%;
      overflow-y: auto;
      padding: 16px 20px;
    }
    .search-and-stats-card {
      background: var(--bg-surface);
      border-radius: var(--radius-lg);
      padding: 14px 16px;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .search-box-large {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 14px;
      color: var(--color-primary);
      pointer-events: none;
    }
    .search-box-large input {
      width: 100%;
      padding: 11px 40px 11px 44px;
      border-radius: var(--radius-pill);
      border: 1.5px solid var(--border-subtle);
      font-family: var(--font-sans);
      font-size: 0.92rem;
      background: var(--bg-surface-muted);
      color: var(--text-main);
      transition: all var(--transition-fast);
    }
    .search-box-large input:focus {
      outline: none;
      background: #FFFFFF;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(184, 80, 40, 0.12);
    }
    .btn-clear {
      position: absolute;
      right: 12px;
      color: var(--text-muted);
      padding: 4px;
    }
    .impact-metrics-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding-top: 6px;
      border-top: 1px solid var(--border-light);
    }
    @media (max-width: 520px) {
      .impact-metrics-row {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .metric-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .metric-value {
      font-family: var(--font-serif);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.1;
    }
    .text-terracotta { color: var(--color-primary); }
    .text-sage { color: var(--color-sage); }
    .text-crit { color: var(--color-urgent-crit-text); }
    .metric-label {
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-top: 2px;
      white-space: nowrap;
    }
    .categories-scroll-container {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .cat-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 14px;
      border-radius: var(--radius-pill);
      border: 1.5px solid var(--border-light);
      background: var(--bg-surface);
      color: var(--text-body);
      font-size: 0.82rem;
      font-weight: 600;
      white-space: nowrap;
      transition: all var(--transition-fast);
      flex-shrink: 0;
    }
    .cat-chip:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
    }
    .cat-chip.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #FFFFFF;
      box-shadow: 0 2px 6px rgba(184, 80, 40, 0.25);
    }
    .chip-count {
      font-size: 0.7rem;
      padding: 1px 6px;
      border-radius: var(--radius-pill);
      background: rgba(0, 0, 0, 0.08);
    }
    .cat-chip.active .chip-count {
      background: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
    }
    .secondary-filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .filter-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .filter-pill-mini {
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-light);
      background: var(--bg-surface);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-body);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .filter-pill-mini.active {
      background: var(--text-main);
      color: #FFFFFF;
      border-color: var(--text-main);
    }
    .filter-pill-mini.crit.active {
      background: var(--color-urgent-crit-text);
      border-color: var(--color-urgent-crit-text);
    }
    .filter-pill-mini.high.active {
      background: var(--color-urgent-high-text);
      border-color: var(--color-urgent-high-text);
    }
    .filter-pill-mini.mod.active {
      background: var(--color-urgent-mod-text);
      border-color: var(--color-urgent-mod-text);
    }
    .btn-toggle-volunteer {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--text-body);
    }
    .btn-toggle-volunteer.active {
      background: var(--color-sage-light);
      border-color: var(--color-sage);
      color: var(--color-sage-hover);
      font-weight: 700;
    }
    .items-filter-bar {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .items-chips-scroll {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .item-btn {
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      background: var(--bg-surface-muted);
      border: 1px solid var(--border-light);
      font-size: 0.74rem;
      color: var(--text-body);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .item-btn:hover {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
    }
    .item-btn.active {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
      color: var(--color-primary-dark);
      font-weight: 700;
    }
    .radius-filter-bar {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .radius-buttons-scroll {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .filter-pill-mini.highlight.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #FFFFFF;
    }
    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 2px;
    }
    .results-count {
      font-size: 0.85rem;
      color: var(--text-body);
    }
    .loading-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .mini-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid var(--border-subtle);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .cards-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .point-card {
      background: var(--bg-surface);
      border-radius: var(--radius-lg);
      border: 1.5px solid var(--border-light);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      cursor: pointer;
      transition: all var(--transition-fast);
      box-shadow: var(--shadow-card);
    }
    .point-card:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .point-card.selected {
      border-color: var(--color-primary);
      background: #FFFDFB;
      box-shadow: 0 0 0 2px var(--color-primary);
    }
    .card-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .card-cat-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.74rem;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: var(--radius-pill);
      letter-spacing: 0.02em;
    }
    .card-cat-badge.soup_kitchen {
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
    }
    .card-cat-badge.food_bank {
      background: var(--color-sage-light);
      color: var(--color-sage-hover);
    }
    .card-cat-badge.shelter {
      background: var(--color-ochre-light);
      color: var(--color-ochre);
    }
    .card-cat-badge.community_centre {
      background: #F1F1F8;
      color: #3E4061;
    }
    .card-cat-badge.collection_point {
      background: #F8F3EE;
      color: #573E29;
    }
    .card-top-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-distance-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      background: var(--bg-surface-muted);
      border-radius: var(--radius-pill);
      color: var(--text-body);
    }
    .card-title-block {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .card-title {
      font-size: 1.12rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .verified-icon {
      color: var(--color-sage);
      display: inline-flex;
    }
    .card-address {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .pin-icon {
      color: var(--color-primary);
      flex-shrink: 0;
    }
    .card-desc {
      font-size: 0.85rem;
      color: var(--text-body);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-items-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      background: var(--bg-page);
      padding: 8px 10px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
    }
    .items-prefix {
      font-size: 0.74rem;
      font-weight: 700;
      color: var(--text-muted);
    }
    .items-tags-wrap {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    }
    .item-tag {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-pill);
      color: var(--text-main);
    }
    .item-tag.more {
      background: var(--color-primary-light);
      color: var(--color-primary);
      border-color: var(--color-primary-subtle);
    }
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 6px;
      border-top: 1px solid var(--border-light);
    }
    .volunteer-available-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--color-sage-hover);
      background: var(--color-sage-light);
      padding: 3px 8px;
      border-radius: var(--radius-pill);
    }
    .footer-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }
    .btn-card-map {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 10px;
      border-radius: var(--radius-pill);
      background: var(--bg-surface-muted);
      border: 1px solid var(--border-light);
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-body);
    }
    .btn-card-map:hover {
      background: var(--border-light);
    }
    .btn-card-wa {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 10px;
      border-radius: var(--radius-pill);
      background: #E8F8EE;
      color: #1B783E;
      border: 1px solid #BDE6CC;
      font-size: 0.78rem;
      font-weight: 600;
      text-decoration: none;
    }
    .btn-card-wa:hover {
      background: #25D366;
      color: #FFFFFF;
    }
    .btn-card-details {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--radius-pill);
      background: var(--color-primary);
      color: #FFFFFF;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .btn-card-details:hover {
      background: var(--color-primary-hover);
    }
    .empty-state {
      padding: 40px 20px;
      background: var(--bg-surface);
      border-radius: var(--radius-xl);
      border: 1.5px dashed var(--border-subtle);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .empty-icon-circle {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: var(--color-primary-light);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .empty-state h3 {
      font-size: 1.3rem;
    }
    .empty-state p {
      font-size: 0.88rem;
      color: var(--text-muted);
      max-width: 440px;
    }
    .empty-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 6px;
    }
    .btn-reset-filters {
      padding: 9px 18px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-subtle);
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--text-body);
    }
    .btn-add-ponto-empty {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 20px;
      border-radius: var(--radius-pill);
      background: var(--color-primary);
      color: #FFFFFF;
      font-size: 0.84rem;
      font-weight: 700;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class PointsListComponent {
  public pointsService = inject(SupportPointsService);
  public geoService = inject(GeolocationService);

  public pointSelected = output<SupportPoint>();
  public openDetailModal = output<SupportPoint>();
  public openAddPoint = output<void>();

  public selectPoint(point: SupportPoint) {
    this.pointsService.selectedPoint.set(point);
  }

  public locateOnMap(point: SupportPoint) {
    this.pointsService.selectedPoint.set(point);
    this.pointSelected.emit(point);
  }

  public openDetail(point: SupportPoint) {
    this.pointsService.selectedPoint.set(point);
    this.openDetailModal.emit(point);
  }

  public selectItem(item: NeededItemType) {
    this.pointsService.selectedItemNeeded.set(item);
  }

  public resetFilters() {
    this.pointsService.searchTerm.set('');
    this.pointsService.selectedCategory.set('all');
    this.pointsService.selectedUrgency.set('all');
    this.pointsService.selectedItemNeeded.set('all');
    this.pointsService.onlyVolunteersNeeded.set(false);
  }

  public getCatIcon(cat: PointCategory): string {
    switch (cat) {
      case 'soup_kitchen': return 'utensils';
      case 'food_bank': return 'carrot';
      case 'shelter': return 'home';
      case 'community_centre': return 'users';
      default: return 'box';
    }
  }

  public getUrgencyLabel(urg: UrgencyLevel): string {
    switch (urg) {
      case 'critical': return 'Urgência Crítica';
      case 'high': return 'Alta Necessidade';
      case 'moderate': return 'Apoio Regular';
    }
  }

  public getItemShortLabel(item: NeededItemType): string {
    switch (item) {
      case 'non_perishable': return '🍚 Não-Perecíveis';
      case 'fresh_produce': return '🥕 Hortifrúti';
      case 'prepared_meals': return '🍲 Marmitas';
      case 'winter_clothes': return '🧥 Agasalhos';
      case 'hygiene': return '🧼 Higiene';
      case 'volunteers': return '🤝 Voluntários';
      case 'financial_pix': return '💳 PIX';
    }
  }

  public getWhatsappLink(point: SupportPoint): string {
    const raw = (point.contactWhatsapp || '').replace(/\D/g, '');
    const clean = raw.startsWith('55') ? raw : `55${raw}`;
    const msg = encodeURIComponent(`Olá! Vi o ponto "${point.name}" no AlimentaRede e gostaria de apoiar com doações.`);
    return `https://wa.me/${clean}?text=${msg}`;
  }
}
