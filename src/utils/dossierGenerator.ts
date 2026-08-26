import { Infrator, OrcrimData } from '../types';
import { db } from '../backend/db';

export function generateSuspectDossierHtml(infratorFull: any): string {
  if (!infratorFull) {
    return '<h1>Infrator não encontrado</h1>';
  }

  // Calculate age
  let idadeStr = 'Não informada';
  if (infratorFull.data_nascimento) {
    const birth = new Date(infratorFull.data_nascimento);
    const diffMs = Date.now() - birth.getTime();
    const ageDate = new Date(diffMs);
    const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    if (!isNaN(calculatedAge)) {
      idadeStr = `${calculatedAge} anos`;
    }
  }

  // Determine Prison Situation & Warrant accurately
  const rawSituacao = String(infratorFull.situacao_atual || infratorFull.situacao_prisional || '').toUpperCase().trim();
  const isMorto = rawSituacao === 'MORTO' || rawSituacao === 'FALECIDO' || rawSituacao === 'ÓBITO' || rawSituacao === 'OBITO';
  const isPreso = !isMorto && (rawSituacao === 'PRESO' || rawSituacao === 'RECOLHIDO' || rawSituacao === 'SISTEMA_PRISIONAL');
  const isForagido = !isMorto && !isPreso && (
    rawSituacao === 'FORAGIDO' ||
    infratorFull.status_mandado_prisao === true ||
    infratorFull.status_mandado_prisao === 'true' ||
    infratorFull.status_mandado === true ||
    infratorFull.mandado === true
  );

  let situacaoPrisionalTexto = 'EM LIBERDADE / MONITORADO';
  let situacaoPrisionalClass = 'status-liberdade';
  if (isMorto) {
    situacaoPrisionalTexto = 'FALECIDO / ÓBITO CONFIRMADO';
    situacaoPrisionalClass = 'status-morto';
  } else if (isForagido) {
    situacaoPrisionalTexto = 'FORAGIDO DA JUSTIÇA (MANDADO EM ABERTO)';
    situacaoPrisionalClass = 'status-foragido';
  } else if (isPreso) {
    situacaoPrisionalTexto = 'PRESO / RECOLHIDO NO SISTEMA PRISIONAL';
    situacaoPrisionalClass = 'status-preso';
  }

  const hasMandadoAtivo = !isMorto && (isForagido || Boolean(infratorFull.status_mandado_prisao || infratorFull.status_mandado || infratorFull.mandado));

  const occurrences = infratorFull.ocorrencias || [];
  const addresses = infratorFull.enderecos || [];
  const comparsas = infratorFull.comparsas || [];
  const fisicas = infratorFull.fisicas || {};

  const altura = fisicas.altura_estimada || infratorFull.altura_estimada || '1.75';
  const corPele = fisicas.cor_pele || infratorFull.cor_pele || 'Parda';
  const compleicao = fisicas.compleicao || infratorFull.compleicao || 'Média';
  const tatuagens = fisicas.tatuagens_detalhes || infratorFull.tatuagens_detalhes || 'Sem tatuagens registradas';
  const cicatrizes = fisicas.cicatrizes || infratorFull.cicatrizes || 'Sem cicatrizes registradas';
  const sinais = fisicas.sinais_particulares || infratorFull.sinais_particulares || 'Sem sinais particulares cadastrados';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DOSSIÊ TÁTICO DE INTELIGÊNCIA - ${infratorFull.nome_completo?.toUpperCase()} (${infratorFull.vulgo}) - PMMG 35º BPM</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.35;
      margin: 0;
      padding: 0;
      font-size: 9.5pt;
      background: #ffffff;
    }
    .btn-bar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      z-index: 9999;
      font-family: monospace;
    }
    .btn-bar .actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      padding: 8px 16px;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #f59e0b;
      color: #000;
    }
    .btn-primary:hover {
      background: #d97706;
    }
    .btn-secondary {
      background: #334155;
      color: #fff;
    }
    .btn-secondary:hover {
      background: #475569;
    }
    .document-container {
      max-width: 820px;
      margin: 0 auto;
      padding: 16px 20px 30px 20px;
      background: #fff;
    }
    .header {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge {
      width: 58px;
      height: 58px;
      background: #0E121B;
      color: #DFC897;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 7.5pt;
      text-align: center;
      border: 2px solid #C4A76E;
      letter-spacing: 0.5px;
      line-height: 1.1;
      box-shadow: 0 2px 5px rgba(0,0,0,0.15);
    }
    .header-title h1 {
      font-size: 12.5pt;
      margin: 0;
      color: #0E121B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 800;
    }
    .header-title h2 {
      font-size: 8pt;
      margin: 2px 0 0 0;
      color: #1D356D;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .confidential-tag {
      border: 1.5px #dc2626 solid;
      color: #dc2626;
      font-weight: 900;
      padding: 3px 8px;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-radius: 4px;
      background: #fef2f2;
    }
    .suspect-overview {
      display: flex;
      gap: 16px;
      margin-bottom: 14px;
      background: #f8fafc;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .suspect-photo-box {
      flex-shrink: 0;
      width: 125px;
      height: 155px;
      border: 2px solid #0f172a;
      border-radius: 4px;
      overflow: hidden;
      background: #e2e8f0;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .suspect-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .suspect-details-grid {
      flex-grow: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
    }
    .detail-item {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
    }
    .detail-label {
      font-size: 7pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.4px;
    }
    .detail-value {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .status-foragido {
      color: #b91c1c;
      background: #fee2e2;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      font-size: 8.5pt;
      font-weight: 800;
      border: 1px solid #f87171;
    }
    .status-preso {
      color: #7f1d1d;
      background: #fecaca;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      font-size: 8.5pt;
      font-weight: 800;
      border: 1px solid #ef4444;
    }
    .status-liberdade {
      color: #15803d;
      background: #dcfce7;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      font-size: 8.5pt;
      font-weight: 800;
      border: 1px solid #86efac;
    }
    .status-morto {
      color: #334155;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      font-size: 8.5pt;
      font-weight: 800;
      border: 1px solid #94a3b8;
    }
    .section-title {
      background: #0f172a;
      color: #ffffff;
      font-size: 8.5pt;
      font-weight: 800;
      padding: 4px 8px;
      margin: 12px 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-title span.count {
      font-size: 7.5pt;
      color: #f59e0b;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-bottom: 10px;
    }
    th {
      background: #f1f5f9;
      text-align: left;
      padding: 5px 6px;
      border-bottom: 2px solid #cbd5e1;
      color: #334155;
      text-transform: uppercase;
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    td {
      padding: 5px 6px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .cf-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      margin-bottom: 10px;
    }
    .cf-item {
      display: flex;
      flex-direction: column;
    }
    .cf-label {
      font-weight: 700;
      color: #64748b;
      font-size: 7pt;
      text-transform: uppercase;
    }
    .cf-value {
      font-size: 9pt;
      color: #0f172a;
      font-weight: 600;
    }
    .incident-card {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      margin-bottom: 8px;
      padding: 8px;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .incident-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .incident-bo {
      font-weight: 800;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .incident-badge {
      font-weight: 800;
      font-size: 7.5pt;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .incident-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      font-size: 8pt;
      margin-bottom: 4px;
      background: #f8fafc;
      padding: 4px 6px;
      border-radius: 3px;
    }
    .incident-narrative {
      font-size: 8.5pt;
      color: #334155;
      line-height: 1.3;
      margin-top: 3px;
      padding-left: 6px;
      border-left: 3px solid #f59e0b;
    }
    .footer {
      margin-top: 20px;
      border-top: 1px solid #000;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #64748b;
      text-transform: uppercase;
      page-break-inside: avoid;
    }
    @media print {
      .btn-bar {
        display: none !important;
      }
      .document-container {
        padding: 0;
        max-width: 100%;
      }
      body {
        background: #ffffff;
      }
    }
  </style>
</head>
<body>
  <div class="btn-bar">
    <div>
      <strong>35º BPM / PMMG • MÓDULO DE INTELIGÊNCIA TÁTICA</strong> — DOSSIÊ DE INFRATOR
    </div>
    <div class="actions">
      <button class="btn btn-secondary" onclick="window.close()">✕ Fechar</button>
      <button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir / Salvar em PDF</button>
    </div>
  </div>

  <div class="document-container">
    <div class="header">
      <div class="header-left">
        <div class="badge">PMMG<br>35º BPM</div>
        <div class="header-title">
          <h1>PMMG • 35º BATALHÃO DE POLÍCIA MILITAR</h1>
          <h2>O GUARDIÃO DO ALTO RIO DAS VELHAS • DOSSIÊ DE INTELIGÊNCIA INDIVIDUAL</h2>
        </div>
      </div>
      <div class="confidential-tag">DOCUMENTO RESERVADO</div>
    </div>

    <div class="suspect-overview">
      <div class="suspect-photo-box">
        <img class="suspect-photo" src="${infratorFull.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'}" alt="Foto Infrator" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'">
      </div>
      <div class="suspect-details-grid">
        <div class="detail-item" style="grid-column: span 2;">
          <div class="detail-label">Nome Completo do Infrator</div>
          <div class="detail-value" style="font-size: 11pt; color: #000;">${infratorFull.nome_completo || 'Não informado'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Alcunha / Vulgo</div>
          <div class="detail-value" style="color: #b45309;">"${infratorFull.vulgo || 'S/V'}"</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">CPF / Documento</div>
          <div class="detail-value">${infratorFull.cpf || 'Não cadastrado'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Data de Nascimento / Idade</div>
          <div class="detail-value">${infratorFull.data_nascimento ? new Date(infratorFull.data_nascimento).toLocaleDateString('pt-BR') : 'Não cadastrada'} (${idadeStr})</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Facção / Organização Criminosa</div>
          <div class="detail-value" style="font-weight: 800; color: #0f172a;">${infratorFull.gangue_faccao || 'Sem facção informada'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Nível de Periculosidade</div>
          <div class="detail-value" style="color: ${infratorFull.periculosidade === 'Extrema' ? '#991b1b' : infratorFull.periculosidade === 'Alta' ? '#dc2626' : infratorFull.periculosidade === 'Média' ? '#d97706' : '#16a34a'}">
            ${(infratorFull.periculosidade || 'Média').toUpperCase()}
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Situação Prisional Atual</div>
          <div class="detail-value">
            <span class="${situacaoPrisionalClass}">${situacaoPrisionalTexto}</span>
          </div>
        </div>
        <div class="detail-item" style="grid-column: span 2;">
          <div class="detail-label">Status de Mandado de Prisão (BNMP / CNJ)</div>
          <div class="detail-value">
            <span class="${isMorto ? 'status-morto' : hasMandadoAtivo ? 'status-foragido' : 'status-liberdade'}">
              ${isMorto ? 'PUNIBILIDADE EXTINTA (ÓBITO CONFIRMADO)' : hasMandadoAtivo ? '⚠️ MANDADO DE PRISÃO ATIVO (PENDENTE DE CUMPRIMENTO)' : 'NENHUM MANDADO PENDENTE'}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="section-title">
      <span>Características Físicas e Sinais Particulares</span>
    </div>
    <div class="cf-grid">
      <div class="cf-item">
        <span class="cf-label">Altura Estimada</span>
        <span class="cf-value">${altura ? `${altura} m` : '1.75 m'}</span>
      </div>
      <div class="cf-item">
        <span class="cf-label">Cor da Pele / Etnia</span>
        <span class="cf-value">${corPele}</span>
      </div>
      <div class="cf-item">
        <span class="cf-label">Compleição Física</span>
        <span class="cf-value">${compleicao}</span>
      </div>
      <div class="cf-item">
        <span class="cf-label">Sinais / Marcas de Nascença</span>
        <span class="cf-value">${sinais}</span>
      </div>
      <div class="cf-item" style="grid-column: span 2;">
        <span class="cf-label">Tatuagens e Detalhes Notáveis</span>
        <span class="cf-value">${tatuagens}</span>
      </div>
      <div class="cf-item" style="grid-column: span 2;">
        <span class="cf-label">Cicatrizes</span>
        <span class="cf-value">${cicatrizes}</span>
      </div>
    </div>

    <div class="section-title">
      <span>Histórico de Ocorrências Criminais Registradas (B.O.s Vinculados)</span>
      <span class="count">${occurrences.length} Registros</span>
    </div>
    ${occurrences.length === 0 ? `
      <div style="padding: 10px; background: #f8fafc; border: 1px dashed #cbd5e1; text-align: center; color: #64748b; font-size: 8.5pt; border-radius: 4px; margin-bottom: 10px;">
        Nenhuma ocorrência criminal vinculada diretamente a este investigado no banco de dados.
      </div>
    ` : occurrences.map((oc: any) => {
      const p = (oc.papel || oc.papel_no_crime || 'Suspeito').toLowerCase();
      let badgeStyle = 'background: #fef3c7; color: #92400e; border: 1px solid #fcd34d;';
      if (p.includes('autor') && !p.includes('coautor')) {
        badgeStyle = 'background: #fee2e2; color: #991b1b; border: 1px solid #f87171;';
      } else if (p.includes('coautor') || p.includes('co-autor')) {
        badgeStyle = 'background: #ffedd5; color: #9a3412; border: 1px solid #fb923c;';
      } else if (p.includes('vítima') || p.includes('vitima')) {
        badgeStyle = 'background: #dbeafe; color: #1e40af; border: 1px solid #60a5fa;';
      } else if (p.includes('notificado')) {
        badgeStyle = 'background: #f3e8ff; color: #6b21a8; border: 1px solid #c084fc;';
      } else if (p.includes('testemunha') || p.includes('condutor')) {
        badgeStyle = 'background: #ccfbf1; color: #115e59; border: 1px solid #2dd4bf;';
      }

      return `
      <div class="incident-card">
        <div class="incident-header">
          <div>
            <span class="incident-bo">B.O. Nº ${oc.numero_bo || 'S/N'}</span>
            <span style="color: #64748b; font-size: 8pt; margin-left: 8px;">
              ${oc.data_hora ? new Date(oc.data_hora).toLocaleDateString('pt-BR') : 'Data N/D'}
            </span>
          </div>
          <span class="incident-badge" style="${badgeStyle}">Papel: ${oc.papel || oc.papel_no_crime || 'Suspeito'}</span>
        </div>
        <div class="incident-meta">
          <div><strong>Tipificação:</strong> ${oc.tipificacao_penal || 'Não informada'}</div>
          <div><strong>Armas:</strong> ${oc.armas_utilizadas || 'Não informada'}</div>
          <div><strong>Veículo:</strong> ${oc.veiculo_utilizado || 'Não informado'}</div>
        </div>
        <div style="font-size: 8pt; margin-bottom: 3px;">
          <strong>Modus Operandi:</strong> ${oc.modus_operandi || 'Padrão não especificado'}
        </div>
        <div>
          <strong style="font-size: 7.5pt; text-transform: uppercase; color: #475569;">Narrativa Circunstanciada do Fato:</strong>
          <div class="incident-narrative">${oc.descricao_fato || 'Sem narrativa circunstanciada cadastrada.'}</div>
        </div>
      </div>
      `;
    }).join('')}

    <div class="section-title">
      <span>Locais Conhecidos de Atuação, Esconderijos e Redutos</span>
      <span class="count">${addresses.length} Locais</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Tipo do Local</th>
          <th>Logradouro</th>
          <th>Bairro</th>
          <th>Cidade</th>
          <th>Coordenadas Geográficas</th>
          <th>Raio de Influência</th>
        </tr>
      </thead>
      <tbody>
        ${addresses.map((addr: any) => `
          <tr>
            <td><strong>${addr.tipo_endereco || 'Geral'}</strong></td>
            <td>${addr.logradouro || 'N/D'}</td>
            <td>${addr.bairro || 'N/D'}</td>
            <td>${addr.cidade || 'N/D'}</td>
            <td style="font-family: monospace;">${addr.geom_ponto ? `${typeof addr.geom_ponto.lat === 'number' ? addr.geom_ponto.lat.toFixed(5) : addr.geom_ponto.lat}, ${typeof addr.geom_ponto.lng === 'number' ? addr.geom_ponto.lng.toFixed(5) : addr.geom_ponto.lng}` : (addr.lat && addr.lng ? `${addr.lat}, ${addr.lng}` : 'N/D')}</td>
            <td>${addr.raio_influencia_km ? `${addr.raio_influencia_km} km` : '1.0 km'}</td>
          </tr>
        `).join('')}
        ${addresses.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 8px;">Nenhum endereço cadastrado para este infrator.</td></tr>' : ''}
      </tbody>
    </table>

    <div class="section-title">
      <span>Rede de Comparsas e Vínculos Criminais Conhecidos</span>
      <span class="count">${comparsas.length} Comparsas</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Nome do Comparsa</th>
          <th>Vulgo</th>
          <th>Grau de Relação</th>
          <th>Histórico e Modus Operandi Compartilhado</th>
        </tr>
      </thead>
      <tbody>
        ${comparsas.map((rel: any) => `
          <tr>
            <td><strong>${rel.comparsa?.nome_completo || rel.nome || 'Identificação Pendente'}</strong></td>
            <td style="color: #b45309; font-weight: bold;">"${rel.comparsa?.vulgo || rel.vulgo || 'N/D'}"</td>
            <td><span style="color: ${rel.grau === 'Forte' ? '#dc2626' : rel.grau === 'Média' ? '#d97706' : '#2563eb'}; font-weight: bold;">${rel.grau || rel.grau_relacao || 'Geral'}</span></td>
            <td>${rel.historico || rel.historico_conjunto || 'Relação baseada em monitoramento tático e comparsaria.'}</td>
          </tr>
        `).join('')}
        ${comparsas.length === 0 ? '<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 8px;">Nenhum comparsa cadastrado no círculo tático.</td></tr>' : ''}
      </tbody>
    </table>

    <div class="footer">
      <div>35º BPM • PMMG • O Guardião do Alto Rio das Velhas • Sistema de Inteligência Policial</div>
      <div>EMISSÃO: ${new Date().toLocaleString('pt-BR')} • DOC ID: ${infratorFull.id || 'N/D'}</div>
      <div>DOCUMENTO RESERVADO DE INTELIGÊNCIA</div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      // Auto open print dialog when loaded standalone if requested
      if (window.location.search.indexOf('autoprint=1') !== -1) {
        setTimeout(function() {
          window.print();
        }, 500);
      }
    });
  </script>
</body>
</html>`;
}

export function openSuspectDossier(infratorId: string, directInfratorData?: any) {
  try {
    // 1. Gather suspect full data from memory or passed in
    let fullData: any = null;

    // A. Check database full resolution
    const dbFull = db.getInfratorFull(infratorId);
    
    // B. Check direct data passed in
    if (directInfratorData) {
      fullData = { ...directInfratorData };
      if (dbFull) {
        // Merge missing relations if not provided on directInfratorData
        if (!fullData.fisicas && dbFull.fisicas) fullData.fisicas = dbFull.fisicas;
        if ((!fullData.enderecos || fullData.enderecos.length === 0) && dbFull.enderecos) fullData.enderecos = dbFull.enderecos;
        if ((!fullData.ocorrencias || fullData.ocorrencias.length === 0) && dbFull.ocorrencias) fullData.ocorrencias = dbFull.ocorrencias;
        if ((!fullData.comparsas || fullData.comparsas.length === 0) && dbFull.comparsas) fullData.comparsas = dbFull.comparsas;
      }
    } else if (dbFull) {
      fullData = dbFull;
    } else {
      // Look in basic in-memory list or registry
      const basic = (db.infratores || []).find(i => i.id === infratorId) || 
                    (db.infratores || []).find(i => i.nome_completo?.toLowerCase() === infratorId.toLowerCase() || i.vulgo?.toLowerCase() === infratorId.toLowerCase());
      if (basic) {
        fullData = {
          ...basic,
          fisicas: (db.caracteristicas_fisicas || []).find(cf => cf.infrator_id === basic.id) || (basic as any).fisicas,
          enderecos: (db.enderecos_atuacao || []).filter(ea => ea.infrator_id === basic.id) || (basic as any).enderecos || [],
          ocorrencias: (basic as any).ocorrencias || [],
          comparsas: []
        };
      }
    }

    if (!fullData) {
      alert('Infrator não encontrado no banco de dados para emissão do dossiê.');
      return;
    }

    // Ensure addresses, characteristics and occurrences are populated
    if (!fullData.enderecos || fullData.enderecos.length === 0) {
      fullData.enderecos = (db.enderecos_atuacao || []).filter(ea => ea.infrator_id === fullData.id);
    }
    if (!fullData.fisicas) {
      fullData.fisicas = (db.caracteristicas_fisicas || []).find(cf => cf.infrator_id === fullData.id);
    }
    if (!fullData.ocorrencias || fullData.ocorrencias.length === 0) {
      const ocRels = (db.infrator_ocorrencia || []).filter(io => io.infrator_id === fullData.id);
      if (ocRels.length > 0) {
        fullData.ocorrencias = ocRels.map(rel => {
          const oc = (db.ocorrencias_criminais || []).find(o => o.id === rel.ocorrencia_id);
          return oc ? { ...oc, papel: rel.papel_no_crime } : null;
        }).filter(Boolean);
      }
    }

    const htmlContent = generateSuspectDossierHtml(fullData);

    // 2. Open via Blob URL or write to popup window
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const printWin = window.open(blobUrl, '_blank');
    if (!printWin || printWin.closed || typeof printWin.closed === 'undefined') {
      // Fallback: If popups are blocked in iframe, create an iframe or force navigation
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }
    }
  } catch (error: any) {
    console.error('Erro ao gerar ficha PDF:', error);
    alert(`Erro ao gerar ficha: ${error.message || 'Falha na emissão'}`);
  }
}

export function generateOrcrimDossierHtml(orcrim: OrcrimData): string {
  const gangue = orcrim.gangue_info || {} as any;
  const estrutura = orcrim.estrutura_piramidal || {} as any;
  const lideranca = estrutura.nivel_1_lideranca || [];
  const gerencia = estrutura.nivel_2_gerencia_tatica || estrutura['nivel_2_gerencia_tática'] || [];
  const operacionais = estrutura.nivel_3_operacionais_e_linha_de_frente || [];

  const getMemberStatusTag = (m: any) => {
    const rawSituacao = String(m.situacao_atual || m.situacao_prisional || (m.status_mandado || m.status_mandado_prisao ? 'FORAGIDO' : 'EM_LIBERDADE')).toUpperCase().trim();
    const isMorto = rawSituacao === 'MORTO' || rawSituacao === 'FALECIDO' || rawSituacao === 'ÓBITO' || rawSituacao === 'OBITO';
    const isPreso = !isMorto && (rawSituacao === 'PRESO' || rawSituacao === 'RECOLHIDO');
    const isForagido = !isMorto && !isPreso && (rawSituacao === 'FORAGIDO' || Boolean(m.status_mandado || m.status_mandado_prisao));

    if (isMorto) {
      return `<span style="background: #e2e8f0; color: #334155; padding: 2px 6px; border-radius: 3px; font-weight: 800; font-size: 7pt; border: 1px solid #94a3b8;">💀 MORTO / FALECIDO</span>`;
    }
    if (isPreso) {
      return `<span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 3px; font-weight: 800; font-size: 7pt; border: 1px solid #f87171;">PRESO</span>`;
    }
    if (isForagido) {
      return `<span style="background: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 3px; font-weight: 800; font-size: 7pt; border: 1px solid #ef4444;">⚠️ FORAGIDO (MANDADO ATIVO)</span>`;
    }
    return `<span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 3px; font-weight: 800; font-size: 7pt; border: 1px solid #86efac;">EM LIBERDADE</span>`;
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>ORGANOGRAMA TÁTICO ORCRIM - ${gangue.nome_gangue?.toUpperCase()} - PMMG 35º BPM</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 9pt; background: #fff; }
    .btn-bar { position: sticky; top: 0; background: #0f172a; color: #fff; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; z-index: 9999; font-family: monospace; }
    .btn { padding: 6px 14px; font-weight: 800; font-size: 11px; text-transform: uppercase; border-radius: 4px; cursor: pointer; border: none; }
    .btn-primary { background: #f59e0b; color: #000; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
    .badge { width: 50px; height: 50px; background: #0E121B; color: #DFC897; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 900; font-size: 7pt; border: 2px solid #C4A76E; }
    .header-title h1 { font-size: 12pt; margin: 0; color: #0E121B; text-transform: uppercase; font-weight: 800; }
    .header-title h2 { font-size: 8pt; margin: 2px 0 0 0; color: #1D356D; font-weight: 700; text-transform: uppercase; }
    .level-header { background: #0f172a; color: #ffffff; padding: 4px 8px; font-weight: 800; text-transform: uppercase; font-size: 8pt; border-radius: 3px; margin: 12px 0 6px 0; display: flex; justify-content: space-between; }
    .cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .member-card { border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; display: flex; gap: 10px; background: #f8fafc; page-break-inside: avoid; }
    .member-photo { width: 45px; height: 55px; border: 1px solid #94a3b8; border-radius: 3px; object-fit: cover; }
    .footer { margin-top: 15px; border-top: 1px solid #000; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7pt; color: #64748b; text-transform: uppercase; }
    @media print { .btn-bar { display: none !important; } }
  </style>
</head>
<body>
  <div class="btn-bar">
    <div><strong>35º BPM / PMMG</strong> — ORGANOGRAMA DE ORGANIZAÇÃO CRIMINOSA</div>
    <div><button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir / PDF</button></div>
  </div>

  <div style="padding: 16px 20px;">
    <div class="header">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div class="badge">PMMG<br>35º BPM</div>
        <div class="header-title">
          <h1>PMMG • 35º BATALHÃO DE POLÍCIA MILITAR</h1>
          <h2>ESTRUTURA HIERÁRQUICA PIRAMIDAL: ${gangue.nome_gangue?.toUpperCase()}</h2>
        </div>
      </div>
      <div style="border: 1.5px #dc2626 solid; color: #dc2626; font-weight: 900; padding: 3px 8px; font-size: 7.5pt; text-transform: uppercase; border-radius: 4px;">DOCUMENTO RESERVADO</div>
    </div>

    <div style="background: #f1f5f9; padding: 8px 12px; border-radius: 4px; border: 1px solid #cbd5e1; margin-bottom: 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; font-size: 8pt;">
      <div><strong>Facção / Gangue:</strong> <br><span style="font-size: 9.5pt; color: #b45309; font-weight: bold;">${gangue.nome_gangue}</span></div>
      <div><strong>Base Territorial:</strong> <br>${gangue.bairro_base || 'Santa Luzia - MG'}</div>
      <div><strong>Total Integrantes:</strong> <br><span style="font-size: 9.5pt; font-weight: bold;">${gangue.total_integrantes_mapeados || (lideranca.length + gerencia.length + operacionais.length)}</span></div>
      <div><strong>Nível de Alerta:</strong> <br><span style="color: #dc2626; font-weight: bold;">${gangue.nivel_periculosidade || 'ELEVADO'}</span></div>
    </div>

    <!-- NÍVEL 1 -->
    <div class="level-header" style="background: #7f1d1d;">
      <span>NÍVEL 1: LIDERANÇA / COMANDO GERAL</span>
      <span style="color: #fef08a;">${lideranca.length} Mapeados</span>
    </div>
    <div class="cards-grid">
      ${lideranca.map((m: any) => `
        <div class="member-card" style="border-left: 3px solid #dc2626;">
          <img class="member-photo" src="${m.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'}" alt="${m.vulgo}">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 800; font-size: 9.5pt; color: #991b1b;">"${m.vulgo}"</div>
            <div style="font-size: 8pt; font-weight: 700; color: #0f172a;">${m.nome_completo}</div>
            <div style="font-size: 7.5pt; color: #64748b;">Função: <strong>${m.funcao_especifica}</strong></div>
            <div style="margin-top: 4px;">
              ${getMemberStatusTag(m)}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- NÍVEL 2 -->
    <div class="level-header" style="background: #9a3412;">
      <span>NÍVEL 2: GERÊNCIA TÁTICA / DISTRIBUIÇÃO & CONTROLE</span>
      <span style="color: #fed7aa;">${gerencia.length} Mapeados</span>
    </div>
    <div class="cards-grid">
      ${gerencia.map((m: any) => `
        <div class="member-card" style="border-left: 3px solid #ea580c;">
          <img class="member-photo" src="${m.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'}" alt="${m.vulgo}">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 800; font-size: 9pt; color: #c2410c;">"${m.vulgo}"</div>
            <div style="font-size: 8pt; font-weight: 700; color: #0f172a;">${m.nome_completo}</div>
            <div style="font-size: 7.5pt; color: #64748b;">Função: <strong>${m.funcao_especifica}</strong></div>
            <div style="margin-top: 4px;">
              ${getMemberStatusTag(m)}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- NÍVEL 3 -->
    <div class="level-header" style="background: #1e3a8a;">
      <span>NÍVEL 3: OPERACIONAIS / LINHA DE FRENTE / VAPORES</span>
      <span style="color: #bfdbfe;">${operacionais.length} Mapeados</span>
    </div>
    <div class="cards-grid">
      ${operacionais.map((m: any) => `
        <div class="member-card" style="border-left: 3px solid #2563eb;">
          <img class="member-photo" src="${m.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'}" alt="${m.vulgo}">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 800; font-size: 9pt; color: #1d4ed8;">"${m.vulgo}"</div>
            <div style="font-size: 8pt; font-weight: 700; color: #0f172a;">${m.nome_completo}</div>
            <div style="font-size: 7.5pt; color: #64748b;">Função: <strong>${m.funcao_especifica}</strong></div>
            <div style="margin-top: 4px;">
              ${getMemberStatusTag(m)}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <div>35º BPM • PMMG • O Guardião do Alto Rio das Velhas • Organogramas de Inteligência</div>
      <div>EMISSÃO: ${new Date().toLocaleString('pt-BR')} • FACÇÃO: ${gangue.nome_gangue}</div>
      <div>DOCUMENTO RESERVADO DE INTELIGÊNCIA</div>
    </div>
  </div>
</body>
</html>`;
}

export function openOrcrimDossier(orcrimData: OrcrimData) {
  try {
    const html = generateOrcrimDossierHtml(orcrimData);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  } catch (err: any) {
    console.error('Erro ao emitir dossiê da ORCRIM:', err);
    alert(`Erro ao emitir dossiê: ${err.message || 'Falha na emissão'}`);
  }
}

