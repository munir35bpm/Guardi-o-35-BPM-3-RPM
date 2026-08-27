import { Infrator, OrcrimData } from '../types';
import { db } from '../backend/db';

export const SVG_LOGO_PMMG = `
<svg viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 52px; height: 60px; flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));">
  <!-- Shield base -->
  <path d="M100 235C45 200 8 135 8 20C65 20 100 5 100 5C100 5 135 20 192 20C192 135 155 200 100 235Z" fill="#0E1726" stroke="#C4A76E" stroke-width="4"/>
  <path d="M100 225C50 192 18 132 18 28C68 28 100 15 100 15C100 15 132 28 182 28C182 132 150 192 100 225Z" fill="#FAF8F5"/>
  <!-- Upper Header Arc -->
  <path d="M22 30 C 60 28, 140 28, 178 30 L 178 52 C 140 50, 60 50, 22 52 Z" fill="#0E1726"/>
  <text x="100" y="45" text-anchor="middle" fill="#E2E8F0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" font-weight="900" font-size="10.5" letter-spacing="1">POLÍCIA MILITAR</text>
  <!-- Minas Red Triangle -->
  <polygon points="100,68 62,132 138,132" fill="#DC2626" stroke="#991B1B" stroke-width="2"/>
  <!-- Crossed Pistols / Rifles in Gold -->
  <g stroke="#C4A76E" stroke-width="2.5" stroke-linecap="round">
    <line x1="72" y1="168" x2="128" y2="122" />
    <line x1="128" y1="168" x2="72" y2="122" />
  </g>
  <circle cx="100" cy="145" r="5" fill="#C4A76E"/>
  <circle cx="100" cy="100" r="4" fill="#FFFFFF"/>
  <!-- Stars -->
  <circle cx="50" cy="95" r="2.5" fill="#C4A76E"/>
  <circle cx="150" cy="95" r="2.5" fill="#C4A76E"/>
  <circle cx="42" cy="120" r="2" fill="#C4A76E"/>
  <circle cx="158" cy="120" r="2" fill="#C4A76E"/>
  <!-- Lower Banner: MINAS GERAIS / 1775 -->
  <path d="M35 186 C 65 196, 135 196, 165 186 L 160 206 C 130 214, 70 214, 40 206 Z" fill="#0E1726" stroke="#C4A76E" stroke-width="1.5"/>
  <text x="100" y="200" text-anchor="middle" fill="#DFC897" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-weight="800" font-size="9" letter-spacing="1">MINAS GERAIS</text>
  <text x="100" y="216" text-anchor="middle" fill="#94A3B8" font-family="monospace" font-weight="700" font-size="7.5">1775</text>
</svg>
`;

export const SVG_LOGO_35BPM = `
<svg viewBox="0 0 400 450" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 54px; height: 60px; flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));">
  <defs>
    <clipPath id="shield-clip-doc">
      <path d="M200 440C120 400 20 300 20 50C130 50 200 20 200 20C200 20 270 50 380 50C380 300 280 400 200 440Z" />
    </clipPath>
    <linearGradient id="gold-border-doc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#DFC897" />
      <stop offset="50%" stopColor="#C4A76E" />
      <stop offset="100%" stopColor="#9E7E45" />
    </linearGradient>
    <linearGradient id="river-blue-doc" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#12234B" />
      <stop offset="50%" stopColor="#1E3875" />
      <stop offset="100%" stopColor="#152756" />
    </linearGradient>
  </defs>
  <path d="M200 445C118 405 15 303 15 48C128 48 200 15 200 15C200 15 272 48 385 48C385 303 282 405 200 445Z" fill="#111216" stroke="#090A0D" stroke-width="3"/>
  <path d="M200 435C124 397 27 298 27 56C132 56 200 26 200 26C200 26 268 56 373 56C373 298 276 397 200 435Z" fill="url(#gold-border-doc)"/>
  <path d="M200 420C128 384 37 288 37 66C136 66 200 37 200 37C200 37 264 66 363 66C363 288 272 384 200 420Z" fill="#F3EEE4"/>
  <g clip-path="url(#shield-clip-doc)">
    <text x="200" y="125" text-anchor="middle" font-family="Impact, sans-serif" font-weight="900" font-size="74" fill="#141518" letter-spacing="2">PMMG</text>
    <text x="200" y="158" text-anchor="middle" font-family="Impact, sans-serif" font-weight="900" font-size="26" fill="#181A20" letter-spacing="1">35º BPM</text>
    <text x="200" y="178" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="9.5" fill="#333842" letter-spacing="1.2">O GUARDIÃO DO ALTO RIO DAS VELHAS</text>
    <g transform="translate(142, 172)">
      <rect x="10" y="70" width="96" height="60" fill="#E8DFCE" stroke="#A88B52" stroke-width="2.5" />
      <path d="M46,130 L46,102 Q58,92 70,102 L70,130 Z" fill="#1C1E24" />
      <polygon points="30,70 58,35 86,70" fill="#E8DFCE" stroke="#A88B52" stroke-width="2.5" />
      <circle cx="58" cy="58" r="7" fill="#A88B52" />
      <rect x="56" y="20" width="4" height="16" fill="#1A1C22" />
      <rect x="51" y="24" width="14" height="4" fill="#1A1C22" />
      <rect x="10" y="42" width="22" height="88" fill="#E8DFCE" stroke="#A88B52" stroke-width="2" />
      <polygon points="8,42 21,12 34,42" fill="#B3975C" stroke="#7A6335" stroke-width="1.5" />
      <rect x="84" y="42" width="22" height="88" fill="#E8DFCE" stroke="#A88B52" stroke-width="2" />
      <polygon points="82,42 95,12 108,42" fill="#B3975C" stroke="#7A6335" stroke-width="1.5" />
    </g>
    <path d="M90 318 C160 318 110 332 170 332 C230 332 260 345 310 350 L360 415 C280 435 180 435 90 405 C50 375 70 340 90 318 Z" fill="url(#river-blue-doc)"/>
  </g>
</svg>
`;

/**
 * Builds an analytical summary of occurrences focusing on modus operandi and investigation points
 */
function buildCriminalDossierSummary(occurrences: any[]) {
  if (!occurrences || occurrences.length === 0) {
    return {
      hasOccurrences: false,
      totalCount: 0,
      tipificacoesCount: [] as { crime: string; count: number }[],
      armas: [] as string[],
      veiculos: [] as string[],
      modusOperandiList: [] as string[],
      papeisCount: {} as Record<string, number>,
      diligencePoints: [] as { bo: string; data: string; tipificacao: string; papel: string; pontoChave: string }[],
    };
  }

  const tipificacoesMap: Record<string, number> = {};
  const armasSet = new Set<string>();
  const veiculosSet = new Set<string>();
  const modusOperandiSet = new Set<string>();
  const papeisCount: Record<string, number> = {};
  const diligencePoints: { bo: string; data: string; tipificacao: string; papel: string; pontoChave: string }[] = [];

  for (const oc of occurrences) {
    // Tipificação
    const tip = (oc.tipificacao_penal || 'Não especificada').trim();
    tipificacoesMap[tip] = (tipificacoesMap[tip] || 0) + 1;

    // Papel
    const papel = (oc.papel || oc.papel_no_crime || 'Autor').trim();
    papeisCount[papel] = (papeisCount[papel] || 0) + 1;

    // Armas
    if (oc.armas_utilizadas && oc.armas_utilizadas.trim() && oc.armas_utilizadas !== 'Não informada' && oc.armas_utilizadas !== 'N/D') {
      const parts = oc.armas_utilizadas.split(/[,;/]+/).map((s: string) => s.trim()).filter(Boolean);
      parts.forEach((p: string) => armasSet.add(p));
    }

    // Veículos
    if (oc.veiculo_utilizado && oc.veiculo_utilizado.trim() && oc.veiculo_utilizado !== 'Não informado' && oc.veiculo_utilizado !== 'N/D') {
      const parts = oc.veiculo_utilizado.split(/[,;/]+/).map((s: string) => s.trim()).filter(Boolean);
      parts.forEach((p: string) => veiculosSet.add(p));
    }

    // Modus Operandi
    if (oc.modus_operandi && oc.modus_operandi.trim() && oc.modus_operandi.length > 5) {
      modusOperandiSet.add(oc.modus_operandi.trim());
    }

    // Build key investigative takeaway
    const boNum = oc.numero_bo || 'S/N';
    const dataFmt = oc.data_hora ? new Date(oc.data_hora).toLocaleDateString('pt-BR') : 'Data N/D';
    let pontoChave = oc.modus_operandi || '';
    if (!pontoChave && oc.descricao_fato) {
      // Shorten description to first 180 chars
      pontoChave = oc.descricao_fato.length > 180 ? oc.descricao_fato.slice(0, 180) + '...' : oc.descricao_fato;
    }
    if (!pontoChave) {
      pontoChave = 'Registro policial vinculado ao investigado no âmbito da circunscrição policial.';
    }

    diligencePoints.push({
      bo: boNum,
      data: dataFmt,
      tipificacao: tip,
      papel: papel,
      pontoChave: pontoChave,
    });
  }

  const tipificacoesCount = Object.entries(tipificacoesMap)
    .map(([crime, count]) => ({ crime, count }))
    .sort((a, b) => b.count - a.count);

  return {
    hasOccurrences: true,
    totalCount: occurrences.length,
    tipificacoesCount,
    armas: Array.from(armasSet),
    veiculos: Array.from(veiculosSet),
    modusOperandiList: Array.from(modusOperandiSet),
    papeisCount,
    diligencePoints,
  };
}

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

  // Build intelligence criminal dossier summary
  const dossierSummary = buildCriminalDossierSummary(occurrences);

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
      font-size: 9pt;
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
      padding: 14px 18px 24px 18px;
      background: #fff;
    }
    .header {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-logos {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-title h1 {
      font-size: 12pt;
      margin: 0;
      color: #0E121B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 900;
    }
    .header-title h2 {
      font-size: 7.8pt;
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
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-radius: 4px;
      background: #fef2f2;
    }
    .suspect-overview {
      display: flex;
      gap: 14px;
      margin-bottom: 12px;
      background: #f8fafc;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .suspect-photo-box {
      flex-shrink: 0;
      width: 120px;
      height: 150px;
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
      gap: 5px 12px;
    }
    .detail-item {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
    }
    .detail-label {
      font-size: 6.8pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.4px;
    }
    .detail-value {
      font-size: 9pt;
      font-weight: 700;
      color: #0f172a;
    }
    .status-foragido {
      color: #b91c1c;
      background: #fee2e2;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      font-size: 8pt;
      font-weight: 800;
      border: 1px solid #f87171;
    }
    .status-preso {
      color: #7f1d1d;
      background: #fecaca;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      font-size: 8pt;
      font-weight: 800;
      border: 1px solid #ef4444;
    }
    .status-liberdade {
      color: #15803d;
      background: #dcfce7;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      font-size: 8pt;
      font-weight: 800;
      border: 1px solid #86efac;
    }
    .status-morto {
      color: #334155;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      font-size: 8pt;
      font-weight: 800;
      border: 1px solid #94a3b8;
    }
    .section-title {
      background: #0f172a;
      color: #ffffff;
      font-size: 8.5pt;
      font-weight: 800;
      padding: 4px 8px;
      margin: 10px 0 6px 0;
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
    .cf-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
      background: #f8fafc;
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      margin-bottom: 8px;
    }
    .cf-item {
      display: flex;
      flex-direction: column;
    }
    .cf-label {
      font-weight: 700;
      color: #64748b;
      font-size: 6.8pt;
      text-transform: uppercase;
    }
    .cf-value {
      font-size: 8.5pt;
      color: #0f172a;
      font-weight: 600;
    }
    .dossier-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 10px;
    }
    .dossier-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    .dossier-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 8px;
    }
    .dossier-card-title {
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #1e293b;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 3px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .crime-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #fee2e2;
      color: #991b1b;
      font-weight: 700;
      font-size: 7.5pt;
      padding: 1.5px 6px;
      border-radius: 3px;
      border: 1px solid #fca5a5;
      margin: 2px;
    }
    .crime-tag-badge {
      background: #991b1b;
      color: #ffffff;
      padding: 0 4px;
      border-radius: 2px;
      font-size: 6.5pt;
    }
    .diligence-item {
      border-left: 3px solid #f59e0b;
      padding: 4px 8px;
      background: #ffffff;
      border-radius: 0 4px 4px 0;
      margin-bottom: 5px;
      border-top: 1px solid #f1f5f9;
      border-right: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
      page-break-inside: avoid;
    }
    .diligence-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }
    .diligence-bo {
      font-weight: 800;
      font-size: 8pt;
      color: #0f172a;
    }
    .diligence-body {
      font-size: 8pt;
      color: #334155;
      line-height: 1.25;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-bottom: 8px;
    }
    th {
      background: #f1f5f9;
      text-align: left;
      padding: 4px 6px;
      border-bottom: 2px solid #cbd5e1;
      color: #334155;
      text-transform: uppercase;
      font-size: 6.8pt;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    td {
      padding: 4px 6px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .footer {
      margin-top: 16px;
      border-top: 1px solid #000;
      padding-top: 5px;
      display: flex;
      justify-content: space-between;
      font-size: 6.8pt;
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
        <div class="header-logos">
          ${SVG_LOGO_PMMG}
          ${SVG_LOGO_35BPM}
        </div>
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
          <div class="detail-value" style="font-size: 10.5pt; color: #000;">${infratorFull.nome_completo || 'Não informado'}</div>
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

    <!-- DOSSIÊ CRIMINAL - SÍNTESE ANALÍTICA PARA INVESTIGAÇÃO E DILIGÊNCIAS -->
    <div class="section-title">
      <span>Dossiê Criminal • Síntese de Inteligência & Modus Operandi</span>
      <span class="count">${dossierSummary.totalCount} Registro(s) Analisado(s)</span>
    </div>

    ${!dossierSummary.hasOccurrences ? `
      <div style="padding: 10px; background: #f8fafc; border: 1px dashed #cbd5e1; text-align: center; color: #64748b; font-size: 8pt; border-radius: 4px; margin-bottom: 10px;">
        Nenhuma ocorrência criminal vinculada diretamente a este investigado no banco de dados.
      </div>
    ` : `
      <div class="dossier-box">
        <!-- Linha 1: Perfil Delitivo Consolidado -->
        <div class="dossier-grid">
          <!-- Bloco A: Tipificações Recorrentes -->
          <div class="dossier-card">
            <div class="dossier-card-title">
              <span>Recorrência Criminal & Tipificações</span>
              <span style="color: #64748b; font-size: 6.5pt;">Incidências</span>
            </div>
            <div>
              ${dossierSummary.tipificacoesCount.map(t => `
                <span class="crime-tag">
                  ${t.crime}
                  <span class="crime-tag-badge">${t.count}x</span>
                </span>
              `).join('')}
            </div>
          </div>

          <!-- Bloco B: Meios Empregados (Armas & Veículos) -->
          <div class="dossier-card">
            <div class="dossier-card-title">
              <span>Meios Empregados em Ações</span>
            </div>
            <div style="font-size: 7.5pt; color: #334155; display: flex; flex-direction: column; gap: 3px;">
              <div>
                <strong style="color: #991b1b;">Armas / Artefatos:</strong>
                <span>${dossierSummary.armas.length > 0 ? dossierSummary.armas.join(', ') : 'Não especificado nos registros'}</span>
              </div>
              <div>
                <strong style="color: #1e3a8a;">Veículos de Apoio/Fuga:</strong>
                <span>${dossierSummary.veiculos.length > 0 ? dossierSummary.veiculos.join(', ') : 'Não especificado nos registros'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bloco C: Pontos de Destaque para Diligências & Investigação Futura -->
        <div class="dossier-card">
          <div class="dossier-card-title" style="color: #9a3412;">
            <span>Pontos de Destaque para Diligências Policiais & Linha de Investigação</span>
            <span style="color: #9a3412; font-size: 6.5pt; font-weight: 700;">Síntese Tática</span>
          </div>
          <div>
            ${dossierSummary.diligencePoints.map(p => `
              <div class="diligence-item">
                <div class="diligence-header">
                  <span class="diligence-bo">B.O. Nº ${p.bo} <span style="font-weight: normal; color: #64748b; font-size: 7.5pt;">(${p.data})</span></span>
                  <span style="font-size: 7pt; font-weight: 700; background: #fef3c7; color: #92400e; padding: 1px 5px; border-radius: 2px; border: 1px solid #fde68a;">
                    ${p.tipificacao} [${p.papel}]
                  </span>
                </div>
                <div class="diligence-body">
                  <strong>Padrão / Modus Operandi:</strong> ${p.pontoChave}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `}

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
      <span>Rede de Comparsas e Vínculos Criminais Cruzados (Co-autores em B.O.s & Inteligência)</span>
      <span class="count">${comparsas.length} Vínculo(s) Detectado(s)</span>
    </div>
    ${comparsas.length === 0 ? `
      <div style="padding: 10px; background: #f8fafc; border: 1px dashed #cbd5e1; text-align: center; color: #64748b; font-size: 8pt; border-radius: 4px; margin-bottom: 8px;">
        Nenhum comparsa ou vínculo direto em registro policial (B.O.) identificado até o momento.
      </div>
    ` : `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
      <thead>
        <tr>
          <th style="width: 45px; text-align: center;">Foto</th>
          <th>Identificação do Comparsa / Co-autor</th>
          <th>Situação Prisional</th>
          <th>Facção</th>
          <th>Tipo do Vínculo & B.O.s em Comum</th>
        </tr>
      </thead>
      <tbody>
        ${comparsas.map((rel: any) => {
          const comp = rel.comparsa || {};
          const nomeComp = comp.nome_completo || rel.nome || 'Identificação Pendente';
          const vulgoComp = comp.vulgo || rel.vulgo || 'S/V';
          const fotoComp = comp.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
          const faccaoComp = comp.gangue_faccao || 'Nenhuma';
          
          const rawSitComp = String(comp.situacao_atual || comp.situacao_prisional || '').toUpperCase();
          const isCompMorto = rawSitComp === 'MORTO' || rawSitComp === 'FALECIDO' || rawSitComp === 'ÓBITO' || rawSitComp === 'OBITO';
          const isCompPreso = !isCompMorto && (rawSitComp === 'PRESO' || rawSitComp === 'RECOLHIDO');
          const isCompForagido = !isCompMorto && !isCompPreso && (rawSitComp === 'FORAGIDO' || comp.status_mandado_prisao);

          let sitBadgeHtml = '<span style="font-size: 7pt; padding: 2px 5px; border-radius: 3px; font-weight: 800; background: #dcfce7; color: #15803d; border: 1px solid #86efac;">EM LIBERDADE</span>';
          if (isCompMorto) {
            sitBadgeHtml = '<span style="font-size: 7pt; padding: 2px 5px; border-radius: 3px; font-weight: 800; background: #e2e8f0; color: #334155; border: 1px solid #94a3b8;">💀 MORTO</span>';
          } else if (isCompForagido) {
            sitBadgeHtml = '<span style="font-size: 7pt; padding: 2px 5px; border-radius: 3px; font-weight: 800; background: #fee2e2; color: #b91c1c; border: 1px solid #f87171;">🔴 FORAGIDO</span>';
          } else if (isCompPreso) {
            sitBadgeHtml = '<span style="font-size: 7pt; padding: 2px 5px; border-radius: 3px; font-weight: 800; background: #fecaca; color: #7f1d1d; border: 1px solid #ef4444;">🔒 PRESO</span>';
          }

          const hasSharedBos = Array.isArray(rel.shared_bos) && rel.shared_bos.length > 0;
          const isRegistroPolicial = rel.tipo_vinculo === 'REGISTRO_POLICIAL' || hasSharedBos;

          return `
          <tr>
            <td style="text-align: center; vertical-align: middle; padding: 3px;">
              <img src="${fotoComp}" alt="${vulgoComp}" style="width: 34px; height: 34px; object-fit: cover; border-radius: 4px; border: 1px solid #0f172a;" />
            </td>
            <td style="vertical-align: top;">
              <strong style="color: #0f172a; font-size: 8pt;">${nomeComp}</strong><br/>
              <span style="color: #b45309; font-weight: 800; font-size: 7.5pt;">"${vulgoComp}"</span>
            </td>
            <td style="vertical-align: top;">
              ${sitBadgeHtml}
            </td>
            <td style="vertical-align: top; font-size: 7.5pt; color: #334155; font-weight: 600;">
              ${faccaoComp}
            </td>
            <td style="vertical-align: top; font-size: 7.5pt;">
              <div style="margin-bottom: 2px;">
                <span style="font-size: 6.8pt; font-weight: 800; text-transform: uppercase; padding: 1px 4px; border-radius: 2px; ${isRegistroPolicial ? 'background: #fef3c7; color: #92400e; border: 1px solid #fcd34d;' : 'background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd;'}">
                  ${isRegistroPolicial ? '📋 VÍNCULO EM REGISTRO POLICIAL (B.O.)' : '🔗 VÍNCULO DE INTELIGÊNCIA TÁTICA'}
                </span>
                <span style="font-weight: bold; color: ${rel.grau === 'Forte' ? '#dc2626' : '#d97706'}; font-size: 7pt; margin-left: 4px;">
                  [${rel.grau || 'Geral'}]
                </span>
              </div>
              
              ${hasSharedBos ? `
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 3px; padding: 3px 5px; margin-top: 2px; font-size: 7pt;">
                  <strong style="color: #92400e; text-transform: uppercase; font-size: 6.8pt;">B.O.s Compartilhados em Co-autoria:</strong>
                  ${rel.shared_bos.map((b: any) => `
                    <div style="margin-top: 1px; color: #1e293b;">
                      • <strong>B.O. Nº ${b.numero_bo}</strong> (${b.tipificacao_penal}): 
                      <span style="color: #475569;">Investigado: <strong>${b.papel_infrator || 'Autor'}</strong> / Comparsa: <strong>${b.papel_comparsa || 'Autor'}</strong></span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <div style="color: #475569; font-size: 7pt; margin-top: 2px; line-height: 1.2;">
                ${rel.historico || rel.historico_conjunto || 'Relação baseada em monitoramento tático e comparsaria.'}
              </div>
            </td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    `}

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

