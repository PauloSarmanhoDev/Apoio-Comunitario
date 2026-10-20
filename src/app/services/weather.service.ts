import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { WeatherContext } from '../models/support-point.model';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private http = inject(HttpClient);

  // Weather state signals
  public currentWeather = signal<WeatherContext | null>(null);
  public isLoadingWeather = signal<boolean>(false);

  /**
   * Fetches real-time weather from the free, public Open-Meteo API
   * and translates it into actionable humanitarian advice for food and shelter networks.
   */
  public fetchWeatherContext(lat: number, lng: number) {
    this.isLoadingWeather.set(true);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,precipitation,weather_code&timezone=auto`;

    this.http.get<any>(url).pipe(
      map(res => {
        const cur = res.current || {};
        const temp = Math.round(cur.temperature_2m ?? 22);
        const apparent = Math.round(cur.apparent_temperature ?? temp);
        const precip = cur.precipitation ?? 0;
        const code = cur.weather_code ?? 0;

        const isColdWave = temp <= 16;
        const isRainy = precip > 0.5 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(code);

        let notice = 'Clima ameno na região: doações regulares de alimentos não perecíveis continuam essenciais.';
        let description = 'Céu aberto';

        if (isColdWave) {
          notice = `Alerta de Frio (${temp}°C): Demanda URGENTE por sopas quentes, marmitas noturnas, cobertores e agasalhos para pessoas acolhidas.`;
          description = 'Frio Intenso';
        } else if (isRainy) {
          notice = `Chuva na região: Alta prioridade para marmitas embaladas prontas e pontos secos de distribuição comunitária.`;
          description = 'Chuvoso';
        } else if (temp >= 31) {
          notice = `Calor elevado (${temp}°C): Necessidade crítica de água mineral potável, sucos e alimentos frescos/frutas.`;
          description = 'Calor Forte';
        }

        const context: WeatherContext = {
          temperature: temp,
          apparentTemperature: apparent,
          weatherCode: code,
          weatherDescription: description,
          isColdWave,
          isRainy,
          humanitarianNotice: notice
        };
        return context;
      }),
      catchError(err => {
        console.warn('Weather API unavailable, applying default context:', err);
        const fallback: WeatherContext = {
          temperature: 23,
          apparentTemperature: 23,
          weatherCode: 0,
          weatherDescription: 'Estável',
          isColdWave: false,
          isRainy: false,
          humanitarianNotice: 'Apoio contínuo: bancos de alimentos e cozinhas solidárias operando normalmente.'
        };
        return of(fallback);
      })
    ).subscribe(context => {
      this.currentWeather.set(context);
      this.isLoadingWeather.set(false);
    });
  }
}
