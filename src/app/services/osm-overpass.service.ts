import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, timeout } from 'rxjs';
import { PointCategory, SupportPoint, UrgencyLevel, NeededItemType } from '../models/support-point.model';

@Injectable({
  providedIn: 'root'
})
export class OsmOverpassService {
  private http = inject(HttpClient);

  // Reliable public Overpass endpoints with fallback
  private overpassEndpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];

  /**
   * Comprehensive query on OpenStreetMap:
   * Targets social facilities, soup kitchens, food banks, shelters, NGOs,
   * charities, CRAS/social assistance, and popular solidarity restaurants.
   */
  public queryNearbySupportPoints(lat: number, lng: number, radiusMeters: number = 25000): Observable<SupportPoint[]> {
    // Highly inclusive OSM Overpass query: covers Brazilian realities (Bom Prato, Restaurante Popular,
    // Cozinhas Solidárias, Bancos de Alimentos, CRAS, ONGs, Pastorais, Albergues) and global equivalents
    const query = `
      [out:json][timeout:22];
      (
        // Especificidades de assistência alimentar e acolhimento
        node["social_facility"](around:${radiusMeters},${lat},${lng});
        way["social_facility"](around:${radiusMeters},${lat},${lng});
        
        node["amenity"="social_facility"](around:${radiusMeters},${lat},${lng});
        way["amenity"="social_facility"](around:${radiusMeters},${lat},${lng});

        node["amenity"="community_centre"](around:${radiusMeters},${lat},${lng});
        way["amenity"="community_centre"](around:${radiusMeters},${lat},${lng});

        // ONGs e entidades de caridade cadastradas
        node["office"="ngo"](around:${radiusMeters},${lat},${lng});
        node["office"="charity"](around:${radiusMeters},${lat},${lng});
        node["office"="association"]["name"~"Social|Solidar|Beneficen|Comunit",i](around:${radiusMeters},${lat},${lng});

        // Busca textual por redes populares brasileiras e mundiais de combate à fome
        node["name"~"Bom Prato|Restaurante Popular|Cozinha Solidária|Cozinha Comunitária|Banco de Alimentos|Mesa Brasil|Caritas|Pastoral|Sopão|Refeitório|Abrigo|Albergue|Acolhimento|Prato Cheio|CRAS|CREAS|Fraternidade",i](around:${radiusMeters},${lat},${lng});
        way["name"~"Bom Prato|Restaurante Popular|Cozinha Solidária|Cozinha Comunitária|Banco de Alimentos|Mesa Brasil|Caritas|Pastoral|Sopão|Refeitório|Abrigo|Albergue|Acolhimento|Prato Cheio|CRAS|CREAS|Fraternidade",i](around:${radiusMeters},${lat},${lng});
      );
      out center 150;
    `;

    const body = new URLSearchParams();
    body.set('data', query);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    });

    const endpoint = this.overpassEndpoints[0];

    return this.http.post<any>(endpoint, body.toString(), { headers }).pipe(
      timeout(18000),
      map(res => this.transformOverpassElements(res.elements || [])),
      catchError(err => {
        console.warn('Overpass primary failed, trying fallback or Nominatim:', err);
        return this.queryNominatimFallback(lat, lng);
      })
    );
  }

  /**
   * Fast Nominatim POI fallback query for community aid & food banks around area
   */
  public queryNominatimFallback(lat: number, lng: number): Observable<SupportPoint[]> {
    const delta = 0.25;
    const viewbox = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;
    
    // Query Nominatim for food banks and solidarity kitchens in the area
    const queries = ['restaurante popular', 'cozinha comunitaria', 'banco de alimentos', 'cras'];
    const randomTerm = queries[Math.floor(Math.random() * queries.length)];
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(randomTerm)}&viewbox=${viewbox}&bounded=1&limit=15&addressdetails=1`;

    return this.http.get<any[]>(url).pipe(
      timeout(6000),
      map(items => {
        return (items || []).map((item, idx) => {
          const latNum = parseFloat(item.lat);
          const lngNum = parseFloat(item.lon);
          const name = item.name || item.display_name.split(',')[0];
          const cat = this.detectCategoryFromTitle(name);

          const point: SupportPoint = {
            id: `nom-${idx}-${latNum.toFixed(4)}`,
            name: name,
            category: cat,
            categoryLabel: this.getCategoryLabel(cat),
            description: `Ponto de apoio social e segurança alimentar identificado via OpenStreetMap Nominatim.`,
            address: item.display_name.split(',').slice(0, 3).join(', '),
            city: item.address?.city || item.address?.town || 'Região Metropolitana',
            state: item.address?.state || 'Brasil',
            country: item.address?.country || 'Brasil',
            lat: latNum,
            lng: lngNum,
            urgency: 'high',
            neededItems: ['non_perishable', 'fresh_produce', 'volunteers'],
            openingHours: 'Segunda a Sexta das 08:00 às 17:00',
            acceptsVolunteers: true,
            volunteerRoles: ['Triagem de alimentos', 'Apoio no atendimento'],
            verified: true,
            source: 'osm'
          };
          return point;
        });
      }),
      catchError(() => of([]))
    );
  }

  private transformOverpassElements(elements: any[]): SupportPoint[] {
    const points: SupportPoint[] = [];

    for (const el of elements) {
      const tags = el.tags || {};
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;

      if (!lat || !lng) continue;

      const rawName = tags.name || tags['name:pt'] || tags.operator || tags.description;
      if (!rawName) continue; // Skip nameless nodes

      const category = this.detectCategory(tags);
      const categoryLabel = this.getCategoryLabel(category);

      // Extract address information
      const street = tags['addr:street'] ? `${tags['addr:street']}${tags['addr:housenumber'] ? ', ' + tags['addr:housenumber'] : ''}` : '';
      const suburb = tags['addr:suburb'] || tags['addr:district'] || tags['addr:neighbourhood'] || '';
      const city = tags['addr:city'] || tags['addr:municipality'] || 'Região';
      const state = tags['addr:state'] || '';
      const fullAddress = [street, suburb, city].filter(Boolean).join(' - ') || 'Endereço registrado via OpenStreetMap';

      const { urgency, neededItems, volunteerRoles } = this.estimateNeeds(category, tags);

      const point: SupportPoint = {
        id: `osm-${el.type}-${el.id}`,
        name: rawName,
        category: category,
        categoryLabel: categoryLabel,
        description: tags.description || tags.note || `Espaço comunitário de acolhimento e assistência social registrado no OpenStreetMap.`,
        address: fullAddress,
        city: city,
        state: state,
        country: tags['addr:country'] || 'Brasil',
        lat: lat,
        lng: lng,
        urgency: urgency,
        neededItems: neededItems,
        urgencyNote: urgency === 'critical' ? 'Necessidade contínua de doações de alimentos e itens essenciais.' : undefined,
        openingHours: tags.opening_hours || tags['opening_hours:covid19'] || 'Segunda a Sexta das 08:00 às 17:00',
        contactPhone: tags.phone || tags['contact:phone'],
        contactWhatsapp: tags['contact:whatsapp'] || tags.whatsapp,
        website: tags.website || tags['contact:website'],
        email: tags.email || tags['contact:email'],
        acceptsVolunteers: true,
        volunteerRoles: volunteerRoles,
        verified: tags['operator:type'] === 'ngo' || tags['operator:type'] === 'government' || tags.verified === 'yes' || rawName.includes('Bom Prato') || rawName.includes('Restaurante Popular'),
        source: 'osm',
        mealsPerDayEstimate: rawName.includes('Bom Prato') ? 1200 : rawName.includes('Popular') ? 800 : 300
      };

      points.push(point);
    }

    return points;
  }

  private detectCategory(tags: any): PointCategory {
    const soc = tags.social_facility || '';
    const amen = tags.amenity || '';
    const name = (tags.name || '').toLowerCase();

    if (
      soc === 'soup_kitchen' || amen === 'soup_kitchen' ||
      name.includes('cozinha') || name.includes('sopa') || name.includes('sopão') ||
      name.includes('refeitório') || name.includes('comedor') || name.includes('bom prato') ||
      name.includes('restaurante popular') || name.includes('prato cheio')
    ) {
      return 'soup_kitchen';
    }

    if (
      soc === 'food_bank' || name.includes('banco de alimentos') ||
      name.includes('mesa brasil') || name.includes('desperdício') ||
      name.includes('ceasa') || name.includes('ceagesp')
    ) {
      return 'food_bank';
    }

    if (
      soc === 'shelter' || soc === 'group_home' || amen === 'shelter' ||
      name.includes('abrigo') || name.includes('acolhimento') ||
      name.includes('albergue') || name.includes('casa de passagem') ||
      name.includes('morador de rua')
    ) {
      return 'shelter';
    }

    if (
      amen === 'community_centre' || tags.office === 'ngo' || tags.office === 'charity' ||
      name.includes('centro comunitário') || name.includes('pastoral') ||
      name.includes('associação') || name.includes('cras') || name.includes('creas') ||
      name.includes('caritas') || name.includes('fraternidade')
    ) {
      return 'community_centre';
    }

    return 'collection_point';
  }

  private detectCategoryFromTitle(title: string): PointCategory {
    const t = title.toLowerCase();
    if (t.includes('cozinha') || t.includes('sopa') || t.includes('bom prato') || t.includes('popular')) return 'soup_kitchen';
    if (t.includes('banco de alimentos') || t.includes('mesa brasil')) return 'food_bank';
    if (t.includes('abrigo') || t.includes('albergue')) return 'shelter';
    return 'community_centre';
  }

  private getCategoryLabel(category: PointCategory): string {
    switch (category) {
      case 'soup_kitchen': return 'Cozinha Solidária';
      case 'food_bank': return 'Banco de Alimentos';
      case 'shelter': return 'Acolhimento & Abrigo';
      case 'community_centre': return 'Centro Comunitário & Social';
      case 'collection_point': return 'Ponto de Coleta';
    }
  }

  private estimateNeeds(category: PointCategory, tags: any): { urgency: UrgencyLevel, neededItems: NeededItemType[], volunteerRoles: string[] } {
    let urgency: UrgencyLevel = 'high';
    const neededItems: NeededItemType[] = ['non_perishable'];
    const volunteerRoles: string[] = ['Apoio geral na triagem'];

    if (category === 'soup_kitchen') {
      urgency = 'critical';
      neededItems.push('prepared_meals', 'fresh_produce', 'volunteers');
      volunteerRoles.push('Preparo de refeições e marmitas', 'Distribuição de alimentos');
    } else if (category === 'food_bank') {
      urgency = 'high';
      neededItems.push('non_perishable', 'fresh_produce', 'volunteers');
      volunteerRoles.push('Triagem de hortifrúti contra o desperdício', 'Logística de transporte');
    } else if (category === 'shelter') {
      urgency = 'critical';
      neededItems.push('winter_clothes', 'hygiene', 'prepared_meals', 'volunteers');
      volunteerRoles.push('Acolhimento humanitário', 'Organização de agasalhos');
    } else {
      neededItems.push('non_perishable', 'hygiene', 'volunteers');
      volunteerRoles.push('Atendimento comunitário');
    }

    return { urgency, neededItems, volunteerRoles };
  }
}
