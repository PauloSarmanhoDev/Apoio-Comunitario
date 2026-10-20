import { Component, inject, signal, OnInit } from '@angular/core';
import { SupportPoint } from './models/support-point.model';
import { SupportPointsService } from './services/support-points.service';
import { GeolocationService, GeoLocationCoords } from './services/geolocation.service';
import { HeaderComponent } from './components/header/header';
import { MapViewComponent } from './components/map/map-view';
import { PointsListComponent } from './components/points-list/points-list';
import { PointDetailModalComponent } from './components/point-detail-modal/point-detail-modal';
import { AddPointModalComponent } from './components/add-point-modal/add-point-modal';
import { FoodWasteGuideModalComponent } from './components/food-waste-guide-modal/food-waste-guide-modal';
import { CitySelectorModalComponent } from './components/city-selector-modal/city-selector-modal';
import { IconComponent } from './components/icon/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent,
    MapViewComponent,
    PointsListComponent,
    PointDetailModalComponent,
    AddPointModalComponent,
    FoodWasteGuideModalComponent,
    CitySelectorModalComponent,
    IconComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  public pointsService = inject(SupportPointsService);
  public geoService = inject(GeolocationService);

  // Modals state
  public showCitySelector = signal<boolean>(false);
  public showAddPoint = signal<boolean>(false);
  public showGuide = signal<boolean>(false);
  public detailPoint = signal<SupportPoint | null>(null);

  // Mobile View Toggle: 'list' | 'map'
  public mobileActiveView = signal<'list' | 'map'>('list');

  // Success Notification Toast
  public toastMessage = signal<string | null>(null);

  ngOnInit() {
    const shared = this.pointsService.checkUrlForSharedPoint();
    if (shared) {
      this.detailPoint.set(shared);
      this.showToast(`Iniciativa "${shared.name}" recebida e salva com sucesso!`);
    }
  }

  public onPointSelected(point: SupportPoint) {
    this.pointsService.selectedPoint.set(point);
  }

  public onOpenDetail(point: SupportPoint) {
    this.detailPoint.set(point);
  }

  public onCitySelected(coords: GeoLocationCoords) {
    this.pointsService.updateCoordinates(coords);
    this.showToast(`Região atualizada para ${coords.cityLabel}`);
  }

  public onPointCreated(pointData: Omit<SupportPoint, 'id' | 'source' | 'verified'>) {
    const created = this.pointsService.addSupportPoint(pointData);
    this.detailPoint.set(created);
    this.showToast('Ponto solidário publicado com sucesso na rede!');
  }

  public showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }
}
