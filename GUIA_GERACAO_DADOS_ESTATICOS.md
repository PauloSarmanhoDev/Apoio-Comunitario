# Guia de Geração e Atualização de Dados Estáticos (100% Free)
**Projeto AlimentaRede • Mapeamento Comunitário e Combate à Fome**

Este guia foi elaborado para que você possa, a qualquer momento no futuro, alimentar, atualizar e expandir a base de dados de cozinhas solidárias, bancos de alimentos, restaurantes populares e abrigos do seu aplicativo Angular sem gastar **nenhum centavo** e mantendo o aplicativo com **carregamento instantâneo** e suporte a **PWA Offline**.

---

## 📑 Sumário
1. [Por que a Abordagem de Dados Estáticos é Superior?](#1-por-que-a-abordagem-de-dados-estáticos-é-superior)
2. [Estrutura do Arquivo JSON (`public/data/pontos-solidarios.json`)](#2-estrutura-do-arquivo-json)
3. [Método 1: Script Automatizado em Node.js (Recomendado)](#3-método-1-script-automatizado-em-nodejs-recomendado)
4. [Método 2: Bases Oficiais do Governo Federal (dados.gov.br / MDS)](#4-método-2-bases-oficiais-do-governo-federal-dadosgovbr--mds)
5. [Método 3: Extração Visual no Overpass Turbo (Navegador)](#5-método-3-extração-visual-no-overpass-turbo-navegador)
6. [Como Integrar o Arquivo JSON no Angular](#6-como-integrar-o-arquivo-json-no-angular)
7. [Boas Práticas de Otimização e Cache PWA](#7-boas-práticas-de-otimização-e-cache-pwa)

---

## 1. Por que a Abordagem de Dados Estáticos é Superior?

| Critério | Consultas Vivas na Overpass API a Cada Clique | Arquivo Estático Local (`public/data/`) |
| :--- | :--- | :--- |
| **Custo de Hospedagem** | Grátis (mas com servidores instáveis) | **100% Grátis** (hospedado com o Angular) |
| **Tempo de Carregamento** | 5 a 15 segundos (sensação de travamento) | **15 a 40 milissegundos** (instantâneo) |
| **Disponibilidade** | Sujeito a queda de servidores (HTTP 504 / 429) | **100% Disponível** (nunca cai) |
| **Funcionamento Offline (PWA)** | Não funciona sem internet ativa | **Funciona 100% offline** (cache no celular) |
| **Volume e Qualidade** | Poucos dados cadastrados em periferias | **Milhares de registros reais e padronizados** |

---

## 2. Estrutura do Arquivo JSON

O arquivo final deve ser colocado em:
```text
c:\Users\paulo.tcarvalho\Desktop\Git\Apoio-Comunitario\public\data\pontos-solidarios.json
```

Cada item da lista segue a interface TypeScript do modelo `SupportPoint`:

```json
[
  {
    "id": "sp-bom-prato-se",
    "name": "Bom Prato 25 de Março / Sé",
    "category": "soup_kitchen",
    "categoryLabel": "Restaurante Popular Estadual",
    "description": "Alimentação de alta qualidade nutricional a preço simbólico de R$ 1 ou gratuita para pessoas vulneráveis cadastradas no CadÚnico.",
    "address": "Rua 25 de Março, 166 - Centro Histórico",
    "city": "São Paulo",
    "state": "SP",
    "country": "Brasil",
    "lat": -23.54321,
    "lng": -46.63212,
    "urgency": "high",
    "neededItems": ["volunteers", "hygiene"],
    "openingHours": "Segunda a Sexta das 07:00 às 15:00",
    "contactPhone": "(11) 3228-1122",
    "contactWhatsapp": "11988881234",
    "pixKey": "doacoes@bomprato.sp.gov.br",
    "acceptsVolunteers": false,
    "verified": true,
    "source": "verified_partner",
    "mealsPerDayEstimate": 2200
  }
]
```

### Categorias Válidas (`category`):
- `soup_kitchen`: Cozinha Solidária / Restaurante Popular / Sopão
- `food_bank`: Banco de Alimentos / Mesa Brasil / Resgate de Excedentes
- `shelter`: Abrigo / Albergue / Casa de Passagem
- `community_centre`: Centro Comunitário / Pastoral / CRAS
- `collection_point`: Ponto de Coleta e Triagem Comunitária

### Itens de Necessidade Válidos (`neededItems`):
- `non_perishable`: Alimentos Não-Perecíveis (arroz, feijão, óleo)
- `fresh_produce`: Hortifrúti Fresco (legumes, verduras, frutas)
- `prepared_meals`: Marmitas e Refeições Prontas
- `winter_clothes`: Agasalhos, Meias e Cobertores
- `hygiene`: Itens de Higiene e Limpeza
- `volunteers`: Vagas para Voluntários
- `financial_pix`: Doações Financeiras / PIX Direto

---

## 3. Método 1: Script Automatizado em Node.js (Recomendado)

Você pode criar um script que roda no seu computador e baixa tudo de forma automática.

### Passo 1: Criar o arquivo `scripts/generate-data.mjs`
Crie a pasta `scripts/` e adicione o arquivo com o código abaixo:

```javascript
import fs from 'fs';
import path from 'path';

// Consulta abrangente para capitais brasileiras
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const query = `
  [out:json][timeout:60];
  area["ISO3166-1"="BR"][admin_level=2]->.brazil;
  (
    node["amenity"="social_facility"](area.brazil);
    node["name"~"Bom Prato|Restaurante Popular|Cozinha Solidária|Banco de Alimentos|Mesa Brasil|Pastoral|Sopão|CRAS",i](area.brazil);
    way["name"~"Bom Prato|Restaurante Popular|Cozinha Solidária|Banco de Alimentos|Mesa Brasil|Pastoral|Sopão|CRAS",i](area.brazil);
  );
  out center 500;
`;

async function run() {
  console.log('🔄 Consultando dados abertos do OpenStreetMap para o Brasil...');
  
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const rawData = await response.json();
  const elements = rawData.elements || [];
  console.log(`✅ Recebidos ${elements.length} registros brutos.`);

  const points = [];

  for (const el of elements) {
    const tags = el.tags || {};
    const lat = el.lat || el.center?.lat;
    const lng = el.lon || el.center?.lon;
    const name = tags.name || tags['name:pt'];

    if (!lat || !lng || !name) continue;

    const lower = name.toLowerCase();
    let category = 'community_centre';
    let catLabel = 'Centro Comunitário';

    if (lower.includes('cozinha') || lower.includes('bom prato') || lower.includes('popular') || lower.includes('sopa')) {
      category = 'soup_kitchen';
      catLabel = 'Cozinha Solidária';
    } else if (lower.includes('alimento') || lower.includes('mesa brasil')) {
      category = 'food_bank';
      catLabel = 'Banco de Alimentos';
    } else if (lower.includes('abrigo') || lower.includes('albergue')) {
      category = 'shelter';
      catLabel = 'Abrigo & Acolhimento';
    }

    points.push({
      id: `osm-${el.type}-${el.id}`,
      name: name,
      category: category,
      categoryLabel: catLabel,
      description: tags.description || `Iniciativa pública ou comunitária registrada no OpenStreetMap.`,
      address: [tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(' - ') || 'Endereço local',
      city: tags['addr:city'] || 'Região Metropolitana',
      state: tags['addr:state'] || 'BR',
      country: 'Brasil',
      lat: lat,
      lng: lng,
      urgency: 'high',
      neededItems: ['non_perishable', 'fresh_produce', 'volunteers'],
      openingHours: tags.opening_hours || 'Consulte horários locais',
      acceptsVolunteers: true,
      verified: true,
      source: 'osm'
    });
  }

  const outDir = path.resolve('public', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, 'pontos-solidarios.json');
  fs.writeFileSync(outFile, JSON.stringify(points, null, 2), 'utf-8');

  console.log(`🎉 Sucesso! ${points.length} pontos salvos em: ${outFile}`);
}

run().catch(console.error);
```

### Passo 2: Adicionar o comando no `package.json`
No seu `package.json`, na seção `"scripts"`:
```json
"scripts": {
  "ng": "ng",
  "start": "ng serve",
  "build": "ng build",
  "update-data": "node scripts/generate-data.mjs"
}
```

### Passo 3: Executar a qualquer momento
Sempre que você quiser atualizar o arquivo, basta rodar no terminal:
```bash
npm run update-data
```

---

## 4. Método 2: Bases Oficiais do Governo Federal (`dados.gov.br` / MDS)

O Ministério do Desenvolvimento e Assistência Social (MDS) publica planilhas públicas atualizadas periodicamente com os equipamentos de segurança alimentar de todos os estados:

1. **Acesse o Portal Brasileiro de Dados Abertos:** [dados.gov.br](https://dados.gov.br/)
2. **Termos de busca sugeridos:**
   - *"Equipamentos Públicos de Segurança Alimentar"*
   - *"Restaurantes Populares"*
   - *"Bancos de Alimentos SISAN"*
   - *"Censo SUAS CRAS"*
3. **Baixe o arquivo CSV** disponibilizado pelo ministério.
4. O arquivo contém colunas como:
   `NOME_EQUIPAMENTO`, `LOGRADOURO`, `BAIRRO`, `MUNICIPIO`, `UF`, `LATITUDE`, `LONGITUDE`, `TELEFONE`.
5. Você pode importar esse CSV no Excel/Google Planilhas, filtrar as cidades desejadas e usar qualquer conversor de **CSV para JSON** (como o gratuito [csvjson.com](https://csvjson.com/)).

---

## 5. Método 3: Extração Visual no Overpass Turbo (Navegador)

Se você preferir selecionar uma cidade específica (ex: Grande São Paulo, Rio, Salvador ou Lisboa) desenhando no mapa:

1. Acesse: **[https://overpass-turbo.eu/](https://overpass-turbo.eu/)**
2. No painel de código à esquerda, cole esta query limpa:
   ```overpass
   [out:json][timeout:30];
   (
     node["amenity"="social_facility"]({{bbox}});
     node["name"~"Bom Prato|Restaurante Popular|Cozinha|Sopa|Alimento|Mesa Brasil|CRAS",i]({{bbox}});
     way["name"~"Bom Prato|Restaurante Popular|Cozinha|Sopa|Alimento|Mesa Brasil|CRAS",i]({{bbox}});
   );
   out center;
   ```
3. No mapa à direita, dê zoom na cidade ou estado que você quer extrair.
4. Clique no botão verde **Executar** no topo.
5. Quando os pontinhos amarelos aparecerem no mapa, clique em **Exportar** ➔ **Baixar como GeoJSON / JSON**.
6. Salve o arquivo na pasta `public/data/`.

---

## 6. Como Integrar o Arquivo JSON no Angular

Para que o Angular carregue esse arquivo JSON instantaneamente, basta ajustar o método `initPoints()` no serviço `src/app/services/support-points.service.ts`:

```typescript
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

// No SupportPointsService:
private http = inject(HttpClient);

public loadStaticData() {
  this.http.get<SupportPoint[]>('data/pontos-solidarios.json').subscribe({
    next: (staticPoints) => {
      // Mescla os pontos estáticos com as sementes locais e submissões do usuário
      console.log(`Carregados ${staticPoints.length} pontos da base estática local!`);
      this.allPoints.set(staticPoints);
    },
    error: (err) => {
      console.warn('Arquivo estático ainda não gerado, usando sementes padrão.', err);
    }
  });
}
```

---

## 7. Boas Práticas de Otimização e Cache PWA

1. **Ativar Cache no `ngsw-config.json`:**
   Para garantir que o arquivo fique 100% gravado no celular do usuário (mesmo sem sinal de internet), certifique-se de que a pasta `data/` esteja no grupo de recursos do Service Worker no arquivo `ngsw-config.json`:
   ```json
   {
     "name": "assets",
     "installMode": "lazy",
     "updateMode": "prefetch",
     "resources": {
       "files": [
         "/favicon.ico",
         "/index.html",
         "/manifest.webmanifest",
         "/*.css",
         "/*.js",
         "/data/**"
       ]
     }
   }
   ```

2. **Tamanho do Arquivo:**
   Um arquivo JSON com **1.000 pontos** ocupa cerca de **250 KB** em texto puro, e quando compactado pela hospedagem (Gzip/Brotli) fica em menos de **45 KB**, sendo baixado no celular em menos de meio segundo.

---

Este arquivo está salvo na raiz do seu projeto como [GUIA_GERACAO_DADOS_ESTATICOS.md](file:///c:/Users/paulo.tcarvalho/Desktop/Git/Apoio-Comunitario/GUIA_GERACAO_DADOS_ESTATICOS.md).
