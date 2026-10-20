import { Component, output } from '@angular/core';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-food-waste-guide-modal',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-title">
            <span class="icon-circle">
              <app-icon name="book-open" [size]="20"></app-icon>
            </span>
            <div>
              <span class="badge-tag">Combate ao Desperdício</span>
              <h2 class="heading-editorial">Guia Legal de Doação de Alimentos</h2>
            </div>
          </div>
          <button class="btn-close" (click)="close.emit()" title="Fechar">
            <app-icon name="x" [size]="18"></app-icon>
          </button>
        </header>

        <div class="modal-body">
          <!-- Legal context banner: Lei 14.016/2020 -->
          <div class="law-banner">
            <div class="law-icon">
              <app-icon name="shield-check" [size]="24"></app-icon>
            </div>
            <div>
              <h3>Segurança Jurídica: Lei Federal nº 14.016/2020</h3>
              <p>
                No Brasil, restaurantes, feiras, supermercados, padarias e hospitais <strong>podem legalmente doar excedentes de alimentos</strong> próprios para consumo humano sem correr risco de responsabilização civil injusta, desde que cumpridos os critérios sanitários.
              </p>
            </div>
          </div>

          <!-- Section 1: Supermarkets & Restaurants -->
          <div class="guide-section">
            <h4 class="section-title">
              <app-icon name="carrot" [size]="18"></app-icon>
              <span>Para Restaurantes, Mercados e Feirantes</span>
            </h4>
            <div class="tips-grid">
              <div class="tip-card">
                <span class="tip-num">01</span>
                <div>
                  <strong>Hortifrúti Fora do Padrão Estético</strong>
                  <p>Frutas, verduras e legumes maduros ou com formatos irregulares que não atraem o consumidor no varejo são ouro para cozinhas comunitárias.</p>
                </div>
              </div>
              <div class="tip-card">
                <span class="tip-num">02</span>
                <div>
                  <strong>Sobras Limpas não Distribuídas</strong>
                  <p>Comida preparada que não foi exposta a clientes no buffet (mantida em banho-maria ou refrigerada) pode ser acondicionada e doada rapidamente.</p>
                </div>
              </div>
              <div class="tip-card">
                <span class="tip-num">03</span>
                <div>
                  <strong>Produtos Próximos ao Vencimento</strong>
                  <p>Itens secos com prazo de validade próximo de expirar podem ser consumidos de imediato em sopões e almoços comunitários diários.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Citizens and Volunteer Donors -->
          <div class="guide-section">
            <h4 class="section-title">
              <app-icon name="heart" [size]="18"></app-icon>
              <span>Para Cidadãos e Doadores Individuais</span>
            </h4>
            <div class="tips-grid">
              <div class="tip-card">
                <span class="tip-num">04</span>
                <div>
                  <strong>Alimentos Básicos de Alto Rendimento</strong>
                  <p>Arroz, feijão, macarrão, óleo, sal e farinha de mandioca possuem longa durabilidade e sustentam cozinhas que servem centenas de pratos diários.</p>
                </div>
              </div>
              <div class="tip-card">
                <span class="tip-num">05</span>
                <div>
                  <strong>Embalagens Térmicas & Descartáveis</strong>
                  <p>Muitas cozinhas solidárias têm o alimento, mas precisam com urgência de marmitex de alumínio ou copos descartáveis para a entrega de rua.</p>
                </div>
              </div>
              <div class="tip-card">
                <span class="tip-num">06</span>
                <div>
                  <strong>Doações em Dinheiro (PIX Direto)</strong>
                  <p>Comprar ingredientes no comércio local ao redor do ponto de acolhimento reduz custos de frete e movimenta a economia da própria comunidade.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="btn-primary" (click)="close.emit()">
            <app-icon name="map-pin" [size]="16"></app-icon>
            <span>Ver Pontos Próximos que Recebem Doações</span>
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
      max-width: 680px;
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
      background: var(--color-sage-light);
      color: var(--color-sage);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .badge-tag {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--color-sage);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h2 {
      font-size: 1.35rem;
      color: var(--text-main);
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
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .law-banner {
      display: flex;
      gap: 16px;
      padding: 16px 18px;
      border-radius: var(--radius-lg);
      background: var(--color-sage-light);
      border: 1.5px solid var(--color-sage-border);
      color: var(--color-sage-hover);
    }
    .law-icon {
      color: var(--color-sage);
      flex-shrink: 0;
      margin-top: 2px;
    }
    .law-banner h3 {
      font-size: 1rem;
      margin-bottom: 6px;
      color: var(--color-sage-hover);
    }
    .law-banner p {
      font-size: 0.88rem;
      line-height: 1.45;
    }
    .guide-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      color: var(--text-main);
      font-weight: 700;
    }
    .tips-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .tip-card {
      display: flex;
      gap: 14px;
      padding: 12px 14px;
      border-radius: var(--radius-md);
      background: var(--bg-page);
      border: 1px solid var(--border-light);
    }
    .tip-num {
      font-family: var(--font-serif);
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--color-primary);
      line-height: 1;
      padding-top: 2px;
    }
    .tip-card strong {
      display: block;
      font-size: 0.92rem;
      color: var(--text-main);
      margin-bottom: 2px;
    }
    .tip-card p {
      font-size: 0.84rem;
      color: var(--text-body);
      line-height: 1.4;
    }
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border-light);
      background: var(--bg-page);
      display: flex;
      justify-content: flex-end;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--color-primary);
      color: #FFFFFF;
      padding: 10px 22px;
      border-radius: var(--radius-pill);
      font-weight: 600;
      font-size: 0.9rem;
    }
    .btn-primary:hover {
      background: var(--color-primary-hover);
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
export class FoodWasteGuideModalComponent {
  public close = output<void>();
}
