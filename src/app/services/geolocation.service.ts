import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

export interface GeoLocationCoords {
  lat: number;
  lng: number;
  cityLabel: string;
}

export interface PresetLocation {
  name: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  badge?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private http = inject(HttpClient);

  // Default initial location: Praça da Sé / São Paulo (Centro humanitário de grande acolhimento no Brasil)
  public readonly DEFAULT_COORDS: GeoLocationCoords = {
    lat: -23.55052,
    lng: -46.633309,
    cityLabel: 'São Paulo - SP, Brasil'
  };

  public currentCoords = signal<GeoLocationCoords>(this.DEFAULT_COORDS);
  public isLocating = signal<boolean>(false);
  public locationError = signal<string | null>(null);

  // Curated prominent regional humanitarian hubs
  public readonly PRESET_LOCATIONS: PresetLocation[] = [
    { name: 'São Paulo', state: 'SP', country: 'Brasil', lat: -23.55052, lng: -46.633309, badge: 'Capital' },
    { name: 'Rio de Janeiro', state: 'RJ', country: 'Brasil', lat: -22.906847, lng: -43.172897, badge: 'Maré & Centro' },
    { name: 'Belo Horizonte', state: 'MG', country: 'Brasil', lat: -19.916681, lng: -43.934493, badge: 'Banco de Alimentos' },
    { name: 'Porto Alegre', state: 'RS', country: 'Brasil', lat: -30.034647, lng: -51.217659, badge: 'Rede Enchentes' },
    { name: 'Salvador', state: 'BA', country: 'Brasil', lat: -12.977749, lng: -38.50163, badge: 'Pelourinho' },
    { name: 'Recife', state: 'PE', country: 'Brasil', lat: -8.047562, lng: -34.876964, badge: 'Cozinhas Populares' },
    { name: 'Fortaleza', state: 'CE', country: 'Brasil', lat: -3.731862, lng: -38.52667, badge: 'Solidariedade' },
    { name: 'Curitiba', state: 'PR', country: 'Brasil', lat: -25.428954, lng: -49.267137, badge: 'Mesa Brasil' },
    { name: 'Brasília', state: 'DF', country: 'Brasil', lat: -15.797515, lng: -47.891887, badge: 'Sol Nascente & Ceilândia' },
    { name: 'Manaus', state: 'AM', country: 'Brasil', lat: -3.119028, lng: -60.021731, badge: 'Prato Cheio Norte' },
    { name: 'Belém', state: 'PA', country: 'Brasil', lat: -1.455833, lng: -48.503889, badge: 'Terra Firme' },
    { name: 'Goiânia', state: 'GO', country: 'Brasil', lat: -16.686891, lng: -49.264794, badge: 'Restaurante Cidadão' },
    { name: 'Florianópolis', state: 'SC', country: 'Brasil', lat: -27.595378, lng: -48.54805, badge: 'Restaurante Popular' },
    { name: 'Campinas', state: 'SP', country: 'Brasil', lat: -22.909938, lng: -47.062633, badge: 'Bom Prato Interior' },
    { name: 'Lisboa', state: 'Lisboa', country: 'Portugal', lat: 38.722252, lng: -9.139337, badge: 'Banco Alimentar' },
    { name: 'Buenos Aires', state: 'CABA', country: 'Argentina', lat: -34.603722, lng: -58.381592, badge: 'Comedores' }
  ];

  /**
   * Request user device GPS location
   */
  public requestDeviceLocation(): Promise<GeoLocationCoords> {
    this.isLocating.set(true);
    this.locationError.set(null);

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        this.isLocating.set(false);
        this.locationError.set('Geolocalização não suportada pelo seu navegador.');
        reject('Not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          // Reverse geocode to get city name
          this.reverseGeocode(lat, lng).subscribe(cityLabel => {
            const coords: GeoLocationCoords = { lat, lng, cityLabel };
            this.currentCoords.set(coords);
            this.isLocating.set(false);
            resolve(coords);
          });
        },
        (err) => {
          this.isLocating.set(false);
          let message = 'Não foi possível obter sua localização exata.';
          if (err.code === 1) message = 'Permissão de localização negada no navegador.';
          else if (err.code === 2) message = 'Sinal de GPS indisponível.';
          this.locationError.set(message);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  /**
   * Set location directly from preset
   */
  public setCoords(coords: GeoLocationCoords) {
    this.currentCoords.set(coords);
  }

  /**
   * Search location worldwide via OpenStreetMap Nominatim
   */
  public searchLocations(query: string): Observable<Array<{ label: string; lat: number; lng: number }>> {
    if (!query || query.trim().length < 2) return of([]);

    const encoded = encodeURIComponent(query.trim());
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&addressdetails=1&limit=6&accept-language=pt,es,en`;

    return this.http.get<any[]>(url).pipe(
      map(results => {
        return (results || []).map(item => {
          const addr = item.address || {};
          const city = addr.city || addr.town || addr.municipality || addr.village || addr.suburb || item.name;
          const state = addr.state ? `, ${addr.state}` : '';
          const country = addr.country ? ` - ${addr.country}` : '';
          const display = `${city}${state}${country}`;

          return {
            label: display || item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          };
        });
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Reverse geocode coordinates to human-readable address
   */
  public reverseGeocode(lat: number, lng: number): Observable<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1&accept-language=pt`;

    return this.http.get<any>(url).pipe(
      map(res => {
        const addr = res.address || {};
        const district = addr.suburb || addr.neighbourhood || '';
        const city = addr.city || addr.town || addr.municipality || 'Região';
        const state = addr.state_code || addr.state || '';
        const parts = [district, city, state].filter(Boolean);
        return parts.length ? parts.join(', ') : 'Localização atual';
      }),
      catchError(() => of('Localização aproximada'))
    );
  }

  /**
   * Haversine formula to compute great-circle distance between two points on Earth in km
   */
  public calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round((R * c) * 10) / 10;
  }

  public formatDistance(distanceKm?: number): string {
    if (distanceKm === undefined || distanceKm === null) return '';
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
