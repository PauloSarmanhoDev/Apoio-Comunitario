import { Component, ElementRef, OnInit, OnDestroy, inject, viewChild, effect, output } from '@angular/core';
import * as L from 'leaflet';
import { SupportPoint, PointCategory } from '../../models/support-point.model';
import { SupportPointsService } from '../../services/support-points.service';
import { GeolocationService } from '../../services/geolocation.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="map-container">
      <div #mapContainer class="leaflet-map-canvas"></div>

      <!-- Floating Controls -->
      <div class="map-floating-overlay">
        <button class="btn-float-locate" (click)="locateMe()" title="Centralizar na minha localização">
          <app-icon name="navigation" [size]="18"></app-icon>
          <span class="btn-text">Minha Posição</span>
        </button>

        <div class="map-legend">
          <div class="legend-item">
            <span class="legend-dot soup_kitchen"></span>
            <span>Cozinha Solidária</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot food_bank"></span>
            <span>Banco de Alimentos</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot shelter"></span>
            <span>Abrigo</span>
          </div>
          <div class="legend-item">
            <span class="legend-pulse"></span>
            <span>Urgência Crítica</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }
    .map-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    .leaflet-map-canvas {
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    .map-floating-overlay {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 400;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-end;
      pointer-events: none;
    }
    .btn-float-locate {
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--bg-surface);
      color: var(--color-primary);
      border-radius: var(--radius-pill);
      box-shadow: var(--shadow-md);
      font-weight: 700;
      font-size: 0.85rem;
      border: 1.5px solid var(--border-light);
      transition: all var(--transition-fast);
    }
    .btn-float-locate:hover {
      background: var(--color-primary);
      color: #FFFFFF;
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }
    .map-legend {
      pointer-events: auto;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(8px);
      padding: 10px 14px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-md);
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.76rem;
      color: var(--text-body);
      max-width: 170px;
    }
    @media (max-width: 768px) {
      .map-legend {
        display: none;
      }
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .legend-dot.soup_kitchen { background: #B85028; }
    .legend-dot.food_bank { background: #2D6B4E; }
    .legend-dot.shelter { background: #C8751B; }
    .legend-pulse {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #A82A2A;
      box-shadow: 0 0 0 2px rgba(168, 42, 42, 0.4);
    }
  `]
})
export class MapViewComponent implements OnInit, OnDestroy {
  public mapContainer = viewChild<ElementRef>('mapContainer');

  public pointSelected = output<SupportPoint>();

  public pointsService = inject(SupportPointsService);
  public geoService = inject(GeolocationService);

  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;
  private userLocationMarker: L.Marker | null = null;

  constructor() {
    // React to coordinates change (fly to new location)
    effect(() => {
      const coords = this.geoService.currentCoords();
      if (this.map) {
        this.map.flyTo([coords.lat, coords.lng], 13, { duration: 1.2 });
        this.updateUserMarker(coords.lat, coords.lng);
      }
    });

    // React to filtered points change (re-render markers)
    effect(() => {
      const points = this.pointsService.filteredPoints();
      if (this.map && this.markersLayer) {
        this.renderMarkers(points);
      }
    });
  }

  ngOnInit() {
    setTimeout(() => {
      this.initMap();
    }, 50);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap() {
    const el = this.mapContainer()?.nativeElement;
    if (!el) return;

    const coords = this.geoService.currentCoords();

    this.map = L.map(el, {
      center: [coords.lat, coords.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: true
    });

    // Friendly OpenStreetMap humanitarian / standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores • AlimentaRede'
    }).addTo(this.map);

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    this.updateUserMarker(coords.lat, coords.lng);
    this.renderMarkers(this.pointsService.filteredPoints());

    // Window resize handler
    window.addEventListener('resize', () => {
      this.map?.invalidateSize();
    });
  }

  private updateUserMarker(lat: number, lng: number) {
    if (!this.map) return;

    if (this.userLocationMarker) {
      this.userLocationMarker.setLatLng([lat, lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-location-pin',
        html: `
          <div style="
            width: 18px;
            height: 18px;
            background: #2563EB;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.3), 0 2px 8px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      this.userLocationMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 2000 })
        .addTo(this.map)
        .bindTooltip('Sua localização atual', { direction: 'top', offset: [0, -10] });
    }
  }

  private renderMarkers(points: SupportPoint[]) {
    if (!this.markersLayer || !this.map) return;
    this.markersLayer.clearLayers();

    for (const point of points) {
      const isCritical = point.urgency === 'critical';
      const iconSvg = this.getSvgForCategory(point.category);

      const html = `
        <div class="custom-humanitarian-pin ${isCritical ? 'pulse-emergency' : ''}">
          <div class="pin-bubble category-${point.category}">
            ${iconSvg}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-pin-wrapper',
        html: html,
        iconSize: [40, 40],
        iconAnchor: [20, 36],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([point.lat, point.lng], { icon: customIcon });

      const distLabel = point.distanceKm !== undefined ? `• A ${this.geoService.formatDistance(point.distanceKm)}` : '';
      const popupHtml = `
        <div style="padding: 14px 16px; min-width: 230px; font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: #B85028; margin-bottom: 4px;">
            ${point.categoryLabel} ${distLabel}
          </div>
          <h4 style="font-size: 0.98rem; font-weight: 700; color: #1C1917; margin-bottom: 6px; line-height: 1.3;">
            ${point.name}
          </h4>
          <p style="font-size: 0.8rem; color: #78716C; margin-bottom: 10px;">
            ${point.address}
          </p>
          <button id="btn-popup-${point.id}" style="
            width: 100%;
            background: #B85028;
            color: #FFFFFF;
            border: none;
            padding: 8px 12px;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
          ">
            Ver Detalhes e Doações &rarr;
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: false });

      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`btn-popup-${point.id}`);
          if (btn) {
            btn.onclick = () => {
              this.pointSelected.emit(point);
            };
          }
        }, 10);
      });

      marker.on('click', () => {
        this.pointSelected.emit(point);
      });

      this.markersLayer.addLayer(marker);
    }
  }

  private getSvgForCategory(cat: PointCategory): string {
    switch (cat) {
      case 'soup_kitchen':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v10"/><path d="M15 12v10"/><path d="M5 2v4a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2"/><path d="M8 9v13"/></svg>`;
      case 'food_bank':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.05-2.05"/><path d="M22 2l-2.5 4.5M22 2l-4.5 2.5"/></svg>`;
      case 'shelter':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
      case 'community_centre':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
      default:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
    }
  }

  public locateMe() {
    this.geoService.requestDeviceLocation().catch(() => {});
  }
}
