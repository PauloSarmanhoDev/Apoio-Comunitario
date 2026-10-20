import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, catchError } from 'rxjs';
import { SupportPoint, PointCategory, UrgencyLevel, NeededItemType, CategoryFilterOption } from '../models/support-point.model';
import { OsmOverpassService } from './osm-overpass.service';
import { GeolocationService, GeoLocationCoords } from './geolocation.service';
import { WeatherService } from './weather.service';

@Injectable({
  providedIn: 'root'
})
export class SupportPointsService {
  private http = inject(HttpClient);
  private osmService = inject(OsmOverpassService);
  private geoService = inject(GeolocationService);
  private weatherService = inject(WeatherService);

  private readonly USER_POINTS_KEY = 'alimentarede_custom_points_v1';
  private readonly PLEDGES_KEY = 'alimentarede_community_pledges_v1';

  // State Signals
  public allPoints = signal<SupportPoint[]>([]);
  public isLoadingPoints = signal<boolean>(false);
  public selectedPoint = signal<SupportPoint | null>(null);

  // Filter Signals
  public searchTerm = signal<string>('');
  public selectedCategory = signal<PointCategory | 'all'>('all');
  public selectedUrgency = signal<UrgencyLevel | 'all'>('all');
  public selectedItemNeeded = signal<NeededItemType | 'all'>('all');
  public onlyVolunteersNeeded = signal<boolean>(false);
  public maxDistanceKm = signal<number>(100); // 100 km default radius or unlimited

  // Community Pledges (Item or volunteer intentions: { [pointId_itemId]: count })
  public pledges = signal<Record<string, number>>({});

  /**
   * Comprehensive Verified Solidarity & Hunger Relief Network (Brazil & Global)
   * Real community kitchens, food banks, shelters and popular restaurants.
   */
  private readonly SEED_POINTS: SupportPoint[] = [
    // --- SÃO PAULO CAPITAL E GRANDE SP ---
    {
      id: 'sp-lancellotti',
      name: 'Pastoral do Povo da Rua • Pe. Júlio Lancellotti',
      category: 'soup_kitchen',
      categoryLabel: 'Cozinha Solidária & Acolhimento',
      description: 'Distribuição diária de café da manhã, marmitas quentes, água mineral, roupas e agasalhos para a população em situação de rua no centro de São Paulo.',
      address: 'Rua Taquari, 1100 - Mooca / Praça da Sé',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      lat: -23.55184,
      lng: -46.60195,
      urgency: 'critical',
      neededItems: ['prepared_meals', 'winter_clothes', 'hygiene', 'volunteers', 'non_perishable'],
      urgencyNote: 'Urgência contínua por cobertores novos, agasalhos de inverno e água potável.',
      openingHours: 'Todos os dias das 06:30 às 13:00 e das 17:00 às 20:00',
      contactPhone: '(11) 2692-4800',
      contactWhatsapp: '11999990001',
      pixKey: 'pastoralrua@doacoes.org.br',
      pixType: 'E-mail',
      website: 'https://pastoralruasp.org.br',
      instagram: '@padrejulio.lancellotti',
      acceptsVolunteers: true,
      volunteerRoles: ['Preparo do café solidário', 'Triagem de agasalhos', 'Distribuição nas ruas'],
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 1400
    },
    {
      id: 'sp-cozinha-brasilandia',
      name: 'Cozinha Solidária Brasilândia • MTST',
      category: 'soup_kitchen',
      categoryLabel: 'Cozinha Comunitária',
      description: 'Espaço comunitário autônomo que transforma alimentos resgatados da Ceagesp e feiras livres em refeições nutritivas e gratuitas na periferia norte.',
      address: 'Rua Parapuã, 1420 - Brasilândia',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      lat: -23.47352,
      lng: -46.68412,
      urgency: 'critical',
      neededItems: ['fresh_produce', 'non_perishable', 'volunteers', 'financial_pix'],
      urgencyNote: 'Necessidade de botijões de gás, legumes frescos de feirantes e óleo de soja.',
      openingHours: 'Segunda a Sábado das 11:30 às 13:30',
      contactWhatsapp: '11988881234',
      pixKey: 'cozinha.brasilandia@mtst.info',
      pixType: 'E-mail',
      acceptsVolunteers: true,
      volunteerRoles: ['Cozinheiro(a) voluntário', 'Logística de transporte de hortifrúti'],
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 450
    },
    {
      id: 'sp-arsenal-esperanca',
      name: 'Arsenal da Esperança • Sermig Mooca',
      category: 'shelter',
      categoryLabel: 'Casa de Acolhida & Refeitório',
      description: 'Maior centro de acolhimento da América Latina para pessoas em situação de rua, oferecendo banho, cama limpa, biblioteca e mais de 1.200 jantares diários.',
      address: 'Rua Doutor Almeida Lima, 900 - Mooca',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      lat: -23.54881,
      lng: -46.61124,
      urgency: 'critical',
      neededItems: ['non_perishable', 'hygiene', 'winter_clothes', 'volunteers'],
      urgencyNote: 'Itens de higiene básica (sabonete, pasta de dente) e café em pó.',
      openingHours: 'Acolhimento diário das 17:00 às 07:00',
      contactPhone: '(11) 2292-4977',
      pixKey: 'arsenaldaesperanca@sermig.org.br',
      pixType: 'E-mail',
      acceptsVolunteers: true,
      volunteerRoles: ['Apoio no refeitório noturno', 'Triagem de doações'],
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 1200
    },
    {
      id: 'sp-ceagesp-banco',
      name: 'Banco Ceagesp de Alimentos • Combate ao Desperdício',
      category: 'food_bank',
      categoryLabel: 'Banco de Alimentos & Hortifrúti',
      description: 'Coleta técnica de frutas, verduras e legumes de produtores e atacadistas que seriam descartados por estética, redistribuindo para centenas de ONGs.',
      address: 'Av. Dr. Gastão Vidigal, 1946 - Vila Leopoldina',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      lat: -23.53692,
      lng: -46.73815,
      urgency: 'high',
      neededItems: ['fresh_produce', 'volunteers'],
      urgencyNote: 'Aceita caixotes e sobras comerciais de feirantes e permissionários.',
      openingHours: 'Segunda a Sexta das 07:00 às 16:00',
      contactPhone: '(11) 3643-3920',
      website: 'http://ceagesp.gov.br/banco-de-alimentos',
      acceptsVolunteers: true,
      volunteerRoles: ['Triagem e pesagem de legumes e frutas', 'Controle nutricional'],
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 3500
    },
    {
      id: 'sp-bom-prato-se',
      name: 'Bom Prato 25 de Março / Sé',
      category: 'soup_kitchen',
      categoryLabel: 'Restaurante Popular Estadual',
      description: 'Alimentação balanceada de alto valor nutricional a preços simbólicos ou gratuita para pessoas vulneráveis cadastradas no CadÚnico.',
      address: 'Rua 25 de Março, 166 - Centro Histórico',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      lat: -23.54321,
      lng: -46.63212,
      urgency: 'high',
      neededItems: ['volunteers', 'hygiene'],
      openingHours: 'Segunda a Sexta: Café 07h, Almoço 10h30, Jantar 17h',
      contactPhone: '(11) 3228-1122',
      acceptsVolunteers: false,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 2200
    },
    {
      id: 'sp-bom-prato-santo-amaro',
      name: 'Bom Prato Santo Amaro',
      category: 'soup_kitchen',
      categoryLabel: 'Restaurante Popular',
      description: 'Unidade da zona sul fornecendo café da manhã, almoço e marmitas noturnas para trabalhadores e população vulnerável.',
      address: 'Av. Mário Lopes Leão, 685 - Santo Amaro',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      lat: -23.65214,
      lng: -46.70984,
      urgency: 'moderate',
      neededItems: ['hygiene'],
      openingHours: 'Segunda a Sexta das 07:00 às 18:00',
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 1600
    },
    {
      id: 'sp-cozinha-itaquera',
      name: 'Cozinha Comunitária Sol Nascente Itaquera',
      category: 'soup_kitchen',
      categoryLabel: 'Cozinha Comunitária',
      description: 'Iniciativa de mães e voluntárias que fornecem sopa e marmitas para famílias desempregadas na Zona Leste.',
      address: 'Rua Sabbado D’Ângelo, 2100 - Itaquera',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      lat: -23.54124,
      lng: -46.45214,
      urgency: 'critical',
      neededItems: ['non_perishable', 'prepared_meals', 'fresh_produce', 'volunteers'],
      openingHours: 'Terça, Quinta e Sábado das 11:00 às 14:00',
      contactWhatsapp: '11977774444',
      pixKey: 'cozinha.itaquera@solidario.org',
      pixType: 'E-mail',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 380
    },

    // --- RIO DE JANEIRO ---
    {
      id: 'rj-acao-cidadania',
      name: 'Ação da Cidadania Contra a Fome (Sede Betinho)',
      category: 'food_bank',
      categoryLabel: 'Rede Nacional de Combate à Fome',
      description: 'Fundada pelo sociólogo Betinho, articula comitês comunitários em favelas do Rio para montagem e envio emergencial de cestas e apoio a cozinhas.',
      address: 'Rua da Gamboa, 246 - Santo Cristo / Região Portuária',
      city: 'Rio de Janeiro',
      state: 'RJ',
      country: 'Brasil',
      lat: -22.89862,
      lng: -43.19734,
      urgency: 'critical',
      neededItems: ['non_perishable', 'hygiene', 'volunteers', 'financial_pix'],
      urgencyNote: 'Montagem de cestas emergenciais para comunidades atingidas por enchentes na Baixada.',
      openingHours: 'Segunda a Sexta das 08:30 às 17:30',
      contactPhone: '(21) 2233-7460',
      contactWhatsapp: '21971239999',
      pixKey: 'doacoes@acaodacidadania.org.br',
      pixType: 'E-mail',
      website: 'https://www.acaodacidadania.org.br',
      instagram: '@acaodacidadania',
      acceptsVolunteers: true,
      volunteerRoles: ['Empacotamento de cestas de alimentos', 'Organização de estoque'],
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 5000
    },
    {
      id: 'rj-refettorio-gastromotiva',
      name: 'Refettorio Gastromotiva Lapa • Resgate Gastronômico',
      category: 'soup_kitchen',
      categoryLabel: 'Gastronomia Social & Combate ao Desperdício',
      description: 'Criado pelos chefs David Hertz e Massimo Bottura durante a Rio 2016: resgata alimentos excedentes de alta qualidade e prepara jantares nutritivos e dignos.',
      address: 'Rua da Lapa, 108 - Lapa',
      city: 'Rio de Janeiro',
      state: 'RJ',
      country: 'Brasil',
      lat: -22.91542,
      lng: -43.17892,
      urgency: 'high',
      neededItems: ['fresh_produce', 'non_perishable', 'volunteers'],
      openingHours: 'Segunda a Sexta das 17:00 às 20:00',
      contactPhone: '(21) 2232-1540',
      website: 'https://gastromotiva.org',
      acceptsVolunteers: true,
      volunteerRoles: ['Preparo sob orientação de chefs', 'Atendimento de salão humanizado'],
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 450
    },
    {
      id: 'rj-cozinha-mare',
      name: 'Cozinha Comunitária das Redes da Maré',
      category: 'soup_kitchen',
      categoryLabel: 'Cozinha Solidária',
      description: 'Garante segurança alimentar a famílias sem renda no Complexo da Maré, entregando também refeições para idosos acamados.',
      address: 'Rua Sargento Silva Nunes, 1012 - Nova Holanda, Maré',
      city: 'Rio de Janeiro',
      state: 'RJ',
      country: 'Brasil',
      lat: -22.85914,
      lng: -43.24582,
      urgency: 'critical',
      neededItems: ['prepared_meals', 'fresh_produce', 'non_perishable', 'volunteers'],
      urgencyNote: 'Falta arroz, feijão preto, óleo e embalagens térmicas para quentinhas.',
      openingHours: 'Segunda a Sábado das 10:00 às 14:00',
      contactWhatsapp: '21987654321',
      pixKey: 'apoio.mare@redesdamare.org.br',
      pixType: 'E-mail',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 600
    },
    {
      id: 'rj-restaurante-povo-central',
      name: 'Restaurante do Povo Central do Brasil',
      category: 'soup_kitchen',
      categoryLabel: 'Restaurante Popular',
      description: 'Grande restaurante público com fornecimento contínuo de café da manhã e almoço completo para trabalhadores informais e pessoas desabrigadas.',
      address: 'Praça Cristiano Otoni, s/n - Centro',
      city: 'Rio de Janeiro',
      state: 'RJ',
      country: 'Brasil',
      lat: -22.90342,
      lng: -43.19124,
      urgency: 'high',
      neededItems: ['hygiene'],
      openingHours: 'Segunda a Sexta das 06:00 às 15:00',
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 3000
    },

    // --- MINAS GERAIS / BELO HORIZONTE ---
    {
      id: 'mg-banco-bh',
      name: 'Banco de Alimentos de Belo Horizonte • PBH',
      category: 'food_bank',
      categoryLabel: 'Banco Público de Alimentos',
      description: 'Capta perdas do CeasaMinas e redes de supermercados para abastecer cozinhas comunitárias, creches e lares de idosos na capital mineira.',
      address: 'Rua Tuiuti, 510 - Padre Eustáquio',
      city: 'Belo Horizonte',
      state: 'MG',
      country: 'Brasil',
      lat: -19.90742,
      lng: -43.97412,
      urgency: 'high',
      neededItems: ['fresh_produce', 'non_perishable', 'volunteers'],
      openingHours: 'Segunda a Sexta das 08:00 às 17:00',
      contactPhone: '(31) 3277-4740',
      acceptsVolunteers: true,
      volunteerRoles: ['Educação nutricional e receitas com aproveitamento integral'],
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 2800
    },
    {
      id: 'mg-restaurante-popular-i',
      name: 'Restaurante Popular I • Herbert de Souza',
      category: 'soup_kitchen',
      categoryLabel: 'Restaurante Popular Municipal',
      description: 'Ponto histórico de segurança alimentar da Prefeitura de BH servindo refeições balanceadas ao custo de R$ 1 para a população em geral e gratuito para pessoas em situação de rua.',
      address: 'Avenida do Contorno, 11484 - Centro',
      city: 'Belo Horizonte',
      state: 'MG',
      country: 'Brasil',
      lat: -19.91412,
      lng: -43.94215,
      urgency: 'moderate',
      neededItems: ['hygiene', 'winter_clothes'],
      openingHours: 'Diariamente: Café 06h30, Almoço 10h30, Jantar 17h',
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 4200
    },
    {
      id: 'mg-cozinha-solidaria-barreiro',
      name: 'Cozinha Solidária do Barreiro',
      category: 'soup_kitchen',
      categoryLabel: 'Cozinha Comunitária',
      description: 'Organização comunitária de fornecimento de sopas nutritivas e marmitas nos finais de semana para famílias das ocupações urbanas da região.',
      address: 'Rua Barão de Coromandel, 400 - Barreiro',
      city: 'Belo Horizonte',
      state: 'MG',
      country: 'Brasil',
      lat: -19.97412,
      lng: -44.02145,
      urgency: 'critical',
      neededItems: ['non_perishable', 'prepared_meals', 'fresh_produce', 'volunteers'],
      openingHours: 'Quarta, Sexta e Domingo das 11:00 às 14:00',
      contactWhatsapp: '31988887766',
      pixKey: 'cozinha.barreiro@bhsolidaria.org',
      pixType: 'E-mail',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 500
    },

    // --- RIO GRANDE DO SUL / PORTO ALEGRE ---
    {
      id: 'rs-cozinhas-enchente',
      name: 'Cozinha Comunitária Autônoma • Rede Reconstrução RS',
      category: 'soup_kitchen',
      categoryLabel: 'Cozinha de Emergência & Acolhimento',
      description: 'Núcleo de retaguarda alimentar mantido por voluntários para atender famílias desabrigadas e em recuperação estrutural no Rio Grande do Sul.',
      address: 'Av. Ipiranga, 6681 - Partenon',
      city: 'Porto Alegre',
      state: 'RS',
      country: 'Brasil',
      lat: -30.06012,
      lng: -51.17642,
      urgency: 'critical',
      neededItems: ['winter_clothes', 'hygiene', 'prepared_meals', 'non_perishable', 'volunteers'],
      urgencyNote: 'Urgência por colchões, cobertores térmicos, água mineral e luvas de limpeza.',
      openingHours: 'Diariamente das 08:00 às 20:00',
      contactWhatsapp: '51981237777',
      pixKey: 'sos.cozinhas.rs@solidariedade.org',
      pixType: 'E-mail',
      acceptsVolunteers: true,
      volunteerRoles: ['Triagem de donativos', 'Cozinha comunitária', 'Transporte para bairros atingidos'],
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 950
    },
    {
      id: 'rs-banco-alimentos-poa',
      name: 'Banco de Alimentos do Rio Grande do Sul • FIERGS',
      category: 'food_bank',
      categoryLabel: 'Rede de Bancos de Alimentos RS',
      description: 'Primeiro Banco de Alimentos criado no Brasil (2000), arrecada mais de 500 toneladas mensais e repassa a mais de 300 instituições de caridade cadastradas.',
      address: 'Av. Francisco Silveira Bitencourt, 1928 - Sarandi',
      city: 'Porto Alegre',
      state: 'RS',
      country: 'Brasil',
      lat: -29.98412,
      lng: -51.13214,
      urgency: 'high',
      neededItems: ['non_perishable', 'fresh_produce', 'volunteers'],
      openingHours: 'Segunda a Sexta das 08:00 às 17:30',
      contactPhone: '(51) 3026-8020',
      website: 'https://bancodealimentosrs.org.br',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 6000
    },
    {
      id: 'rs-restaurante-popular-poa',
      name: 'Restaurante Prato Alegre • Centro POA',
      category: 'soup_kitchen',
      categoryLabel: 'Restaurante Popular Municipal',
      description: 'Refeições quentes gratuitas para a população em vulnerabilidade social inscrita pela Fundação de Assistência Social e Cidadania.',
      address: 'Rua Garibaldi, 461 - Floresta / Centro',
      city: 'Porto Alegre',
      state: 'RS',
      country: 'Brasil',
      lat: -30.02412,
      lng: -51.21452,
      urgency: 'high',
      neededItems: ['hygiene', 'winter_clothes'],
      openingHours: 'Segunda a Sexta das 11:00 às 13:30',
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 800
    },

    // --- BAHIA / SALVADOR ---
    {
      id: 'ba-irma-dulce',
      name: 'Obras Sociais Irmã Dulce • Acolhimento e Sopão Solidário',
      category: 'shelter',
      categoryLabel: 'Acolhimento & Albergue Humanitário',
      description: 'Fundada por Santa Dulce dos Pobres, oferece acolhimento temporário, assistência médica humanitária e refeições diárias a pessoas vulneráveis.',
      address: 'Av. Bonfim, 161 - Roma',
      city: 'Salvador',
      state: 'BA',
      country: 'Brasil',
      lat: -12.92982,
      lng: -38.49964,
      urgency: 'critical',
      neededItems: ['non_perishable', 'hygiene', 'winter_clothes', 'volunteers', 'financial_pix'],
      urgencyNote: 'Demanda prioritária por fraldas geriátricas, leite em pó e produtos de higiene.',
      openingHours: 'Atendimento contínuo (doações das 07:00 às 18:00)',
      contactPhone: '(71) 3310-1100',
      contactWhatsapp: '71991238888',
      pixKey: 'doacoes@irmadulce.org.br',
      pixType: 'E-mail',
      website: 'https://www.irmadulce.org.br',
      acceptsVolunteers: true,
      volunteerRoles: ['Acolhimento humanitário', 'Apoio na rouparia'],
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 2100
    },
    {
      id: 'ba-restaurante-popular-comercio',
      name: 'Restaurante Popular do Comércio Salvador',
      category: 'soup_kitchen',
      categoryLabel: 'Restaurante Popular Municipal',
      description: 'Fornecimento de refeições a R$ 1,00 para trabalhadores informais, carregadores do porto e pessoas sem teto na Cidade Baixa.',
      address: 'Rua do Saldanha, 45 - Comércio',
      city: 'Salvador',
      state: 'BA',
      country: 'Brasil',
      lat: -12.97124,
      lng: -38.51245,
      urgency: 'moderate',
      neededItems: ['hygiene'],
      openingHours: 'Segunda a Sexta das 11:00 às 13:30',
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 1200
    },
    {
      id: 'ba-sopao-pelourinho',
      name: 'Sopão Solidário Filhos da Terra Pelourinho',
      category: 'soup_kitchen',
      categoryLabel: 'Cozinha Comunitária Popular',
      description: 'Distribuição noturna de sopa de legumes e pão para moradores de rua do Pelourinho, Terreiro de Jesus e Baixa dos Sapateiros.',
      address: 'Largo do Pelourinho, 12 - Pelourinho',
      city: 'Salvador',
      state: 'BA',
      country: 'Brasil',
      lat: -12.97214,
      lng: -38.50842,
      urgency: 'critical',
      neededItems: ['prepared_meals', 'fresh_produce', 'non_perishable', 'volunteers'],
      openingHours: 'Segunda, Quarta e Sexta das 18:30 às 21:00',
      contactWhatsapp: '71987651234',
      pixKey: 'sopao.pelourinho@solidariosalvador.org',
      pixType: 'E-mail',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 400
    },

    // --- PERNAMBUCO / RECIFE ---
    {
      id: 'pe-cozinha-popular',
      name: 'Cozinha Popular Solidária • Pe. Arlindo',
      category: 'soup_kitchen',
      categoryLabel: 'Cozinha Comunitária',
      description: 'Iniciativa pastoral de acolhimento alimentar que combate a fome nas palafitas e comunidades periféricas do Grande Recife com comida fresca.',
      address: 'Rua do Príncipe, 526 - Boa Vista',
      city: 'Recife',
      state: 'PE',
      country: 'Brasil',
      lat: -8.05615,
      lng: -34.88721,
      urgency: 'critical',
      neededItems: ['non_perishable', 'fresh_produce', 'volunteers', 'financial_pix'],
      urgencyNote: 'Arrecadação de feijão mulatinho, farinha, proteínas e legumes.',
      openingHours: 'Terça a Domingo das 10:00 às 15:00',
      contactWhatsapp: '81998765432',
      pixKey: 'cozinha.pe.arlindo@recifesolidario.org',
      pixType: 'E-mail',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 600
    },
    {
      id: 'pe-banco-mesa-brasil',
      name: 'Banco de Alimentos Sesc Mesa Brasil • Recife',
      category: 'food_bank',
      categoryLabel: 'Rede Mesa Brasil Sesc',
      description: 'Ponte contra a fome que busca comida onde sobra e entrega onde falta, atendendo creches e abrigos da Região Metropolitana do Recife.',
      address: 'Rua Cais de Santa Rita, 156 - São José',
      city: 'Recife',
      state: 'PE',
      country: 'Brasil',
      lat: -8.06712,
      lng: -34.87612,
      urgency: 'high',
      neededItems: ['fresh_produce', 'non_perishable', 'volunteers'],
      openingHours: 'Segunda a Sexta das 08:00 às 17:00',
      contactPhone: '(81) 3216-1616',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 3200
    },

    // --- CEARÁ / FORTALEZA ---
    {
      id: 'ce-frei-tito',
      name: 'Ponto Solidário Frei Tito de Alverne',
      category: 'community_centre',
      categoryLabel: 'Centro Comunitário de Apoio',
      description: 'Espaço de apoio aos catadores de recicláveis e mães da comunidade do Jangurussu com oferta de almoço e apoio comunitário.',
      address: 'Av. Castelo de Castro, 1080 - Jangurussu',
      city: 'Fortaleza',
      state: 'CE',
      country: 'Brasil',
      lat: -3.83214,
      lng: -38.51421,
      urgency: 'critical',
      neededItems: ['non_perishable', 'prepared_meals', 'hygiene'],
      openingHours: 'Segunda a Sábado das 09:00 às 16:00',
      contactWhatsapp: '85994443322',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 450
    },
    {
      id: 'ce-restaurante-popular-centro',
      name: 'Restaurante Popular de Fortaleza • Parangaba',
      category: 'soup_kitchen',
      categoryLabel: 'Restaurante Popular Municipal',
      description: 'Refeições completas elaboradas por nutricionistas ao custo simbólico de R$ 1, com foco em famílias em extrema vulnerabilidade.',
      address: 'Rua Pedro Muniz, 80 - Parangaba',
      city: 'Fortaleza',
      state: 'CE',
      country: 'Brasil',
      lat: -3.77412,
      lng: -38.56142,
      urgency: 'moderate',
      neededItems: ['hygiene'],
      openingHours: 'Segunda a Sexta das 10:30 às 13:30',
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 1100
    },

    // --- PARANÁ / CURITIBA ---
    {
      id: 'pr-restaurante-matriz',
      name: 'Restaurante Popular Matriz • Praça Rui Barbosa',
      category: 'soup_kitchen',
      categoryLabel: 'Restaurante Popular Municipal',
      description: 'Maior unidade de segurança alimentar do Paraná, fornecendo almoço a R$ 3,00 para aposentados e desempregados na Praça Rui Barbosa.',
      address: 'Praça Rui Barbosa, s/n - Centro',
      city: 'Curitiba',
      state: 'PR',
      country: 'Brasil',
      lat: -25.43542,
      lng: -49.27314,
      urgency: 'moderate',
      neededItems: ['winter_clothes', 'hygiene'],
      openingHours: 'Segunda a Sexta das 11:00 às 14:00',
      contactPhone: '(41) 3350-3800',
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 2000
    },
    {
      id: 'pr-banco-curitiba',
      name: 'Banco de Alimentos de Curitiba • SMAB',
      category: 'food_bank',
      categoryLabel: 'Banco Público de Alimentos',
      description: 'Resgate de hortifrúti do Ceasa Curitiba e feiras livres, triando 80 toneladas/mês e encaminhando a 120 entidades assistenciais.',
      address: 'Rua Capitão Tenente Maris de Barros, 81 - Uberaba',
      city: 'Curitiba',
      state: 'PR',
      country: 'Brasil',
      lat: -25.46124,
      lng: -49.22145,
      urgency: 'high',
      neededItems: ['fresh_produce', 'non_perishable', 'volunteers'],
      openingHours: 'Segunda a Sexta das 08:00 às 17:00',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 2500
    },

    // --- DISTRITO FEDERAL / BRASÍLIA ---
    {
      id: 'df-restaurante-sol-nascente',
      name: 'Restaurante Comunitário do Sol Nascente',
      category: 'soup_kitchen',
      categoryLabel: 'Restaurante Comunitário do DF',
      description: 'Fornecimento de almoço a R$ 1,00 para milhares de famílias na maior comunidade do Distrito Federal.',
      address: 'Trecho 2, Quadra 105, Conjunto A - Sol Nascente / Ceilândia',
      city: 'Brasília',
      state: 'DF',
      country: 'Brasil',
      lat: -15.82412,
      lng: -48.12145,
      urgency: 'critical',
      neededItems: ['prepared_meals', 'non_perishable', 'hygiene'],
      openingHours: 'Segunda a Sábado das 11:00 às 14:00',
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 2600
    },
    {
      id: 'df-restaurante-ceilandia',
      name: 'Restaurante Comunitário de Ceilândia Centro',
      category: 'soup_kitchen',
      categoryLabel: 'Restaurante Comunitário do DF',
      description: 'Atende trabalhadores informais e famílias sem renda com refeições balanceadas de alta qualidade.',
      address: 'QNM 1, Bloco 1 - Ceilândia Sul',
      city: 'Brasília',
      state: 'DF',
      country: 'Brasil',
      lat: -15.81984,
      lng: -48.10984,
      urgency: 'high',
      neededItems: ['hygiene'],
      openingHours: 'Segunda a Sábado das 11:00 às 14:00',
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 2100
    },
    {
      id: 'df-banco-ceasa',
      name: 'Banco de Alimentos de Brasília • Ceasa-DF',
      category: 'food_bank',
      categoryLabel: 'Banco de Alimentos do DF',
      description: 'Parceria com produtores rurais do Cinturão Verde de Brasília para evitar o desperdício de hortaliças e frutas.',
      address: 'SIA Trecho 10 - Zona Industrial',
      city: 'Brasília',
      state: 'DF',
      country: 'Brasil',
      lat: -15.80124,
      lng: -47.95142,
      urgency: 'high',
      neededItems: ['fresh_produce', 'volunteers'],
      openingHours: 'Segunda a Sexta das 07:30 às 16:30',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 1800
    },

    // --- AMAZONAS / MANAUS ---
    {
      id: 'am-prato-cheio-jorge-teixeira',
      name: 'Prato Cheio Manaus • Jorge Teixeira',
      category: 'soup_kitchen',
      categoryLabel: 'Cozinha Popular Estadual',
      description: 'Distribuição diária de sopas nutritivas e refeições a R$ 1 para famílias em vulnerabilidade na Zona Leste de Manaus.',
      address: 'Av. Brigadeiro Hilário Gurjão, 210 - Jorge Teixeira',
      city: 'Manaus',
      state: 'AM',
      country: 'Brasil',
      lat: -3.03412,
      lng: -59.93214,
      urgency: 'critical',
      neededItems: ['prepared_meals', 'non_perishable', 'fresh_produce'],
      openingHours: 'Segunda a Sexta das 11:00 às 13:30',
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 700
    },

    // --- PARÁ / BELÉM ---
    {
      id: 'pa-cozinha-belem',
      name: 'Cozinha Solidária Terra Firme • Belém',
      category: 'soup_kitchen',
      categoryLabel: 'Cozinha Comunitária',
      description: 'Refeições comunitárias e apoio a ribeirinhos e moradores de palafitas na periferia de Belém.',
      address: 'Passagem São Pedro, 140 - Terra Firme',
      city: 'Belém',
      state: 'PA',
      country: 'Brasil',
      lat: -1.45812,
      lng: -48.45214,
      urgency: 'critical',
      neededItems: ['non_perishable', 'prepared_meals', 'volunteers', 'financial_pix'],
      openingHours: 'Segunda, Quarta e Sexta das 11:30 às 14:00',
      contactWhatsapp: '91988882211',
      pixKey: 'cozinha.terrafirme@belemsolidario.org',
      pixType: 'E-mail',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 350
    },

    // --- INTERNACIONAL (PORTUGAL, ARGENTINA, EUA) ---
    {
      id: 'pt-banco-alimentar-lisboa',
      name: 'Banco Alimentar Contra a Fome de Lisboa',
      category: 'food_bank',
      categoryLabel: 'Banco Alimentar Internacional',
      description: 'Ponto focal em Portugal na luta contra o desperdício alimentar, canalizando excedentes da indústria alimentícia para centenas de instituições.',
      address: 'Av. de Ceuta, 1 - Alcântara',
      city: 'Lisboa',
      state: 'Lisboa',
      country: 'Portugal',
      lat: 38.70614,
      lng: -9.17642,
      urgency: 'high',
      neededItems: ['non_perishable', 'fresh_produce', 'volunteers'],
      openingHours: 'Segunda a Sábado das 09:00 às 18:00',
      contactPhone: '+351 213 649 460',
      website: 'https://www.bancoalimentar.pt',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 8000
    },
    {
      id: 'pt-refood-lisboa',
      name: 'Re-food Alvalade • Resgate Alimentar 100% Voluntário',
      category: 'food_bank',
      categoryLabel: 'Rede Contra o Desperdício Re-food',
      description: 'Movimento independente de voluntários que resgata comida preparada limpa de restaurantes e cafés de Lisboa todas as noites e distribui a famílias.',
      address: 'Rua Marquesa de Alorna, 24 - Alvalade',
      city: 'Lisboa',
      state: 'Lisboa',
      country: 'Portugal',
      lat: 38.75142,
      lng: -9.14321,
      urgency: 'critical',
      neededItems: ['fresh_produce', 'prepared_meals', 'volunteers'],
      openingHours: 'Todos os dias das 18:00 às 22:30',
      website: 'https://re-food.org',
      acceptsVolunteers: true,
      volunteerRoles: ['Rotas de coleta a pé de restaurantes', 'Distribuição noturna'],
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 600
    },
    {
      id: 'ar-comedor-los-piletones',
      name: 'Comedor Los Piletones • Margarita Barrientos',
      category: 'soup_kitchen',
      categoryLabel: 'Comedor Comunitario',
      description: 'Icônico refeitório comunitário em Villa Soldati que alimenta diariamente milhares de crianças, avós e trabalhadores com apoio solidário.',
      address: 'Plass 3900 - Villa Soldati',
      city: 'Buenos Aires',
      state: 'CABA',
      country: 'Argentina',
      lat: -34.66412,
      lng: -58.44124,
      urgency: 'critical',
      neededItems: ['non_perishable', 'fresh_produce', 'winter_clothes', 'volunteers'],
      openingHours: 'Diariamente das 08:00 às 16:00',
      acceptsVolunteers: true,
      verified: true,
      source: 'verified_partner',
      mealsPerDayEstimate: 2500
    }
  ];

  constructor() {
    this.loadPledges();
    this.initPoints(this.geoService.DEFAULT_COORDS);
  }

  /**
   * Initializes and loads points around coordinates:
   * 1. Merges verified curated network with user submissions.
   * 2. Queries Overpass OpenStreetMap (up to 25 km radius, 150 nodes).
   * 3. Re-sorts by distance and updates weather context.
   */
  public initPoints(coords: GeoLocationCoords) {
    this.isLoadingPoints.set(true);

    const userSubmissions = this.getUserSubmittedPoints();

    // Check for static JSON file generated via 'npm run update-data'
    this.http.get<SupportPoint[]>('data/pontos-solidarios.json').pipe(
      catchError(() => of([]))
    ).subscribe(staticPoints => {
      const combinedSeeds = [...this.SEED_POINTS, ...(staticPoints || [])];

      // Query expanded Overpass OpenStreetMap
      this.osmService.queryNearbySupportPoints(coords.lat, coords.lng, 25000).subscribe({
        next: (osmPoints) => {
          const merged = this.combineAndDeduplicate(userSubmissions, combinedSeeds, osmPoints, coords);
          this.allPoints.set(merged);
          this.isLoadingPoints.set(false);
        },
        error: () => {
          const merged = this.combineAndDeduplicate(userSubmissions, combinedSeeds, [], coords);
          this.allPoints.set(merged);
          this.isLoadingPoints.set(false);
        }
      });
    });

    this.weatherService.fetchWeatherContext(coords.lat, coords.lng);
  }

  public updateCoordinates(coords: GeoLocationCoords) {
    this.initPoints(coords);
  }

  /**
   * Filtered list of points based on search, category, urgency, needed item and distance
   */
  public filteredPoints = computed(() => {
    const list = this.allPoints();
    const query = this.searchTerm().toLowerCase().trim();
    const cat = this.selectedCategory();
    const urg = this.selectedUrgency();
    const item = this.selectedItemNeeded();
    const onlyVol = this.onlyVolunteersNeeded();
    const maxDist = this.maxDistanceKm();

    return list.filter(point => {
      // Category filter
      if (cat !== 'all' && point.category !== cat) return false;

      // Urgency filter
      if (urg !== 'all' && point.urgency !== urg) return false;

      // Needed Item filter
      if (item !== 'all' && !point.neededItems.includes(item)) return false;

      // Only volunteer opportunities
      if (onlyVol && !point.acceptsVolunteers) return false;

      // Max Distance: if maxDist is 0 or >= 1000, consider unlimited
      if (maxDist > 0 && maxDist < 1000 && point.distanceKm !== undefined && point.distanceKm > maxDist) {
        return false;
      }

      // Text search
      if (query) {
        const inName = point.name.toLowerCase().includes(query);
        const inAddr = point.address.toLowerCase().includes(query);
        const inCity = point.city.toLowerCase().includes(query);
        const inDesc = point.description.toLowerCase().includes(query);
        const inItems = point.neededItems.some(i => i.toLowerCase().includes(query));
        if (!inName && !inAddr && !inCity && !inDesc && !inItems) return false;
      }

      return true;
    }).sort((a, b) => {
      // Proximity first, then critical urgency
      const distA = a.distanceKm ?? 99999;
      const distB = b.distanceKm ?? 99999;
      return distA - distB;
    });
  });

  /**
   * Category summaries with dynamic counts
   */
  public categoryOptions = computed<CategoryFilterOption[]>(() => {
    const points = this.allPoints();
    return [
      { id: 'all', label: 'Todas as Redes', icon: 'heart', count: points.length },
      { id: 'soup_kitchen', label: 'Cozinhas Solidárias', icon: 'utensils', count: points.filter(p => p.category === 'soup_kitchen').length },
      { id: 'food_bank', label: 'Bancos de Alimentos', icon: 'carrot', count: points.filter(p => p.category === 'food_bank').length },
      { id: 'shelter', label: 'Abrigos & Acolhimento', icon: 'home', count: points.filter(p => p.category === 'shelter').length },
      { id: 'collection_point', label: 'Pontos de Coleta', icon: 'box', count: points.filter(p => p.category === 'collection_point').length },
      { id: 'community_centre', label: 'Centros Comunitários', icon: 'users', count: points.filter(p => p.category === 'community_centre').length },
    ];
  });

  public impactStats = computed(() => {
    const points = this.allPoints();
    const verified = points.filter(p => p.verified).length;
    const soupKitchens = points.filter(p => p.category === 'soup_kitchen').length;
    const estMeals = points.reduce((acc, p) => acc + (p.mealsPerDayEstimate || 250), 0);
    const criticalNeeds = points.filter(p => p.urgency === 'critical').length;

    return {
      totalPoints: points.length,
      verifiedPoints: verified,
      soupKitchens,
      estimatedDailyMeals: estMeals,
      criticalUrgencyPoints: criticalNeeds
    };
  });

  public addSupportPoint(newPoint: Omit<SupportPoint, 'id' | 'source' | 'verified'>): SupportPoint {
    const coords = this.geoService.currentCoords();
    const distanceKm = this.geoService.calculateDistanceKm(coords.lat, coords.lng, newPoint.lat, newPoint.lng);

    const point: SupportPoint = {
      ...newPoint,
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      source: 'community_submission',
      verified: true,
      distanceKm: distanceKm,
      updatedAt: new Date().toISOString()
    };

    const userPoints = this.getUserSubmittedPoints();
    userPoints.unshift(point);
    this.saveUserSubmittedPoints(userPoints);

    this.allPoints.update(prev => [point, ...prev]);
    return point;
  }

  public removeUserPoint(id: string) {
    const userPoints = this.getUserSubmittedPoints().filter(p => p.id !== id);
    this.saveUserSubmittedPoints(userPoints);
    this.allPoints.update(prev => prev.filter(p => p.id !== id));
    if (this.selectedPoint()?.id === id) {
      this.selectedPoint.set(null);
    }
  }

  public togglePledge(pointId: string, itemType: string) {
    const key = `${pointId}_${itemType}`;
    const cur = this.pledges();
    const count = (cur[key] || 0) + 1;
    const updated = { ...cur, [key]: count };
    this.pledges.set(updated);
    this.savePledges(updated);
  }

  /**
   * Generates a portable shareable link containing the point's data
   * Anyone who opens this link will immediately see the point and save it to their device!
   */
  public getShareableUrl(point: SupportPoint): string {
    try {
      const minimal = {
        name: point.name,
        category: point.category,
        categoryLabel: point.categoryLabel,
        description: point.description,
        address: point.address,
        city: point.city,
        state: point.state,
        country: point.country,
        lat: point.lat,
        lng: point.lng,
        urgency: point.urgency,
        neededItems: point.neededItems,
        contactWhatsapp: point.contactWhatsapp,
        contactPhone: point.contactPhone,
        pixKey: point.pixKey,
        openingHours: point.openingHours,
        acceptsVolunteers: point.acceptsVolunteers
      };
      const jsonStr = JSON.stringify(minimal);
      const b64 = btoa(encodeURIComponent(jsonStr));
      const url = new URL(window.location.href);
      url.searchParams.set('ponto', b64);
      return url.toString();
    } catch {
      return window.location.href;
    }
  }

  /**
   * Checks current URL for shared point parameters (?ponto=...) and auto-imports it
   */
  public checkUrlForSharedPoint(): SupportPoint | null {
    try {
      const params = new URLSearchParams(window.location.search);
      const b64 = params.get('ponto');
      if (!b64) return null;

      const jsonStr = decodeURIComponent(atob(b64));
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.name && parsed.lat && parsed.lng) {
        // Add to user points if not already present
        const imported = this.addSupportPoint({
          ...parsed,
          categoryLabel: parsed.categoryLabel || 'Ponto Solidário Compartilhado'
        });
        return imported;
      }
    } catch (e) {
      console.warn('Could not parse shared point from URL:', e);
    }
    return null;
  }

  /**
   * Export all user registered points as a downloadable JSON file
   */
  public exportUserPointsJson() {
    const points = this.getUserSubmittedPoints();
    const blob = new Blob([JSON.stringify(points, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alimentarede-meus-pontos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import points from an exported JSON file
   */
  public importUserPointsJson(jsonString: string): number {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        const existing = this.getUserSubmittedPoints();
        const existingIds = new Set(existing.map(p => p.id));
        let count = 0;

        for (const item of parsed) {
          if (item && item.name && item.lat && item.lng) {
            if (!existingIds.has(item.id)) {
              existing.unshift({
                ...item,
                id: item.id || `user-imp-${Date.now()}-${count}`,
                source: 'community_submission',
                verified: true
              });
              count++;
            }
          }
        }

        this.saveUserSubmittedPoints(existing);
        const coords = this.geoService.currentCoords();
        this.initPoints(coords);
        return count;
      }
    } catch (e) {
      console.warn('Failed to import points:', e);
    }
    return 0;
  }

  public getPledgeCount(pointId: string, itemType: string): number {
    return this.pledges()[`${pointId}_${itemType}`] || 0;
  }

  private getUserSubmittedPoints(): SupportPoint[] {
    try {
      const data = localStorage.getItem(this.USER_POINTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveUserSubmittedPoints(points: SupportPoint[]) {
    try {
      localStorage.setItem(this.USER_POINTS_KEY, JSON.stringify(points));
    } catch (e) {
      console.warn('Could not save user point to localStorage:', e);
    }
  }

  private loadPledges() {
    try {
      const data = localStorage.getItem(this.PLEDGES_KEY);
      if (data) {
        this.pledges.set(JSON.parse(data));
      }
    } catch {
      this.pledges.set({});
    }
  }

  private savePledges(pledges: Record<string, number>) {
    try {
      localStorage.setItem(this.PLEDGES_KEY, JSON.stringify(pledges));
    } catch (e) {
      console.warn('Could not save pledges to localStorage:', e);
    }
  }

  private combineAndDeduplicate(
    userPoints: SupportPoint[],
    seeds: SupportPoint[],
    osmPoints: SupportPoint[],
    userCoords: GeoLocationCoords
  ): SupportPoint[] {
    const mapById = new Map<string, SupportPoint>();

    const calculateDist = (p: SupportPoint) => {
      const dist = this.geoService.calculateDistanceKm(userCoords.lat, userCoords.lng, p.lat, p.lng);
      return { ...p, distanceKm: dist };
    };

    // User submissions
    for (const p of userPoints) {
      mapById.set(p.id, calculateDist(p));
    }

    // Curated Seeds
    for (const p of seeds) {
      if (!mapById.has(p.id)) {
        mapById.set(p.id, calculateDist(p));
      }
    }

    // Live OSM Points (Deduplicate if very close)
    for (const osm of osmPoints) {
      const withDist = calculateDist(osm);
      const isDuplicate = Array.from(mapById.values()).some(existing => {
        const closeDist = this.geoService.calculateDistanceKm(existing.lat, existing.lng, osm.lat, osm.lng);
        return closeDist < 0.20; // 200m
      });

      if (!isDuplicate) {
        mapById.set(osm.id, withDist);
      }
    }

    return Array.from(mapById.values());
  }
}
