import { Infrator, OrcrimData } from '../types';
import { db } from '../backend/db';

export const SVG_LOGO_PMMG = `
<svg viewBox="0 0 400 460" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 52px; height: 60px; flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));">
  <defs>
    <path id="curve-pmmg-text" d="M 50 120 C 130 50, 270 50, 350 120" />
    <linearGradient id="gold-pmmg-rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#C4A86A" />
      <stop offset="50%" stopColor="#9E844F" />
      <stop offset="100%" stopColor="#816B3C" />
    </linearGradient>
  </defs>

  <!-- Outer Black Shield Outline -->
  <path d="M200 452C122 412 18 310 18 55C125 55 200 18 200 18C200 18 275 55 382 55C382 310 278 412 200 452Z" fill="#111215" stroke="#090A0D" stroke-width="3"/>
  
  <!-- Gold Outer Rim -->
  <path d="M200 442C126 404 28 305 28 63C130 63 200 28 200 28C200 28 270 63 372 63C372 305 274 404 200 442Z" fill="url(#gold-pmmg-rim)"/>
  
  <!-- Shield Inner Field (Warm Off-white / Cream) -->
  <path d="M200 426C130 390 38 295 38 73C135 73 200 39 200 39C200 39 265 73 362 73C362 295 270 390 200 426Z" fill="#ECE8DF"/>

  <!-- Arched Header: PMMG in bold black typography matching official emblem -->
  <g fill="#111215" font-family="Impact, 'Arial Black', -apple-system, sans-serif" font-weight="900">
    <text x="200" y="125" text-anchor="middle" font-size="78" letter-spacing="4">PMMG</text>
  </g>

  <!-- Red Triangle of Minas Gerais / Inconfidência Mineira -->
  <polygon points="200,122 88,322 312,322" fill="#C5282F" stroke="#991B1B" stroke-width="1.5"/>

  <!-- Left Laurel Branch (Black Wreath) -->
  <g fill="#111215">
    <!-- Main stem -->
    <path d="M80 305 Q55 230 92 140" stroke="#111215" stroke-width="4" fill="none" stroke-linecap="round" />
    <!-- Leaves -->
    <ellipse cx="68" cy="275" rx="14" ry="7" transform="rotate(-35 68 275)" />
    <ellipse cx="94" cy="270" rx="14" ry="7" transform="rotate(25 94 270)" />
    <ellipse cx="58" cy="240" rx="14" ry="7" transform="rotate(-45 58 240)" />
    <ellipse cx="86" cy="235" rx="14" ry="7" transform="rotate(15 86 235)" />
    <ellipse cx="56" cy="200" rx="14" ry="7" transform="rotate(-55 56 200)" />
    <ellipse cx="84" cy="195" rx="14" ry="7" transform="rotate(5 84 195)" />
    <ellipse cx="62" cy="165" rx="13" ry="6.5" transform="rotate(-65 62 165)" />
    <ellipse cx="88" cy="160" rx="13" ry="6.5" transform="rotate(-5 88 160)" />
    <ellipse cx="82" cy="135" rx="12" ry="6" transform="rotate(-75 82 135)" />
  </g>

  <!-- Right Laurel Branch (Black Wreath) -->
  <g fill="#111215">
    <!-- Main stem -->
    <path d="M320 305 Q345 230 308 140" stroke="#111215" stroke-width="4" fill="none" stroke-linecap="round" />
    <!-- Leaves -->
    <ellipse cx="332" cy="275" rx="14" ry="7" transform="rotate(35 332 275)" />
    <ellipse cx="306" cy="270" rx="14" ry="7" transform="rotate(-25 306 270)" />
    <ellipse cx="342" cy="240" rx="14" ry="7" transform="rotate(45 342 240)" />
    <ellipse cx="314" cy="235" rx="14" ry="7" transform="rotate(-15 314 235)" />
    <ellipse cx="344" cy="200" rx="14" ry="7" transform="rotate(55 344 200)" />
    <ellipse cx="316" cy="195" rx="14" ry="7" transform="rotate(-5 316 195)" />
    <ellipse cx="338" cy="165" rx="13" ry="6.5" transform="rotate(65 338 165)" />
    <ellipse cx="312" cy="160" rx="13" ry="6.5" transform="rotate(5 312 160)" />
    <ellipse cx="318" cy="135" rx="12" ry="6" transform="rotate(75 318 135)" />
  </g>

  <!-- Alferes Tiradentes Profile Bust (Exact design from official PMMG shield) -->
  <g transform="translate(130, 142)">
    <!-- Tricorn Hat -->
    <path d="M15 48 C 22 20, 52 14, 85 24 C 105 30, 125 50, 126 56 C 100 52, 60 52, 15 48 Z" fill="#1C1E24" />
    <path d="M15 48 C 35 44, 75 42, 126 56 C 120 64, 100 68, 70 66 C 40 64, 20 58, 15 48 Z" fill="#111215" stroke="#C4A86A" stroke-width="1.5" />
    
    <!-- Face & Head Profile (Facing Left) -->
    <path d="M38 52 C 40 60, 36 68, 30 74 C 27 77, 24 82, 28 85 C 32 87, 34 90, 31 93 C 25 96, 22 101, 26 104 C 30 106, 36 108, 42 106 C 48 104, 52 100, 56 104 C 60 108, 62 116, 60 125 L 75 125 C 78 110, 76 96, 75 85 C 75 70, 70 58, 55 52 Z" fill="#ECE8DF" stroke="#111215" stroke-width="1.5"/>
    <!-- Eye and eyebrow -->
    <path d="M35 72 Q 40 69 44 72" stroke="#111215" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="39" cy="76" rx="2" ry="2.5" fill="#111215"/>
    <!-- Nose profile line -->
    <path d="M30 74 L 25 82 L 31 85" stroke="#111215" stroke-width="1.5" fill="none"/>
    <!-- Mouth line -->
    <path d="M29 93 Q 35 94 40 92" stroke="#111215" stroke-width="2" fill="none"/>
    <!-- Hair sideburns & back curl -->
    <path d="M52 64 C 65 68, 72 78, 68 96 C 64 104, 56 108, 54 116 C 52 122, 58 126, 64 126 C 70 126, 74 120, 72 108 C 72 90, 68 76, 52 64 Z" fill="#1C1E24" />

    <!-- Colonial Military Uniform / Coat with Epaulette -->
    <path d="M28 125 C 32 140, 48 178, 52 180 L 152 180 C 150 162, 142 145, 126 132 C 105 120, 85 122, 75 125 Z" fill="#1C1E24"/>
    <!-- Gold Collar / Lapel -->
    <path d="M48 125 C 55 130, 82 148, 86 180 L 98 180 C 95 145, 78 128, 64 125 Z" fill="#9E844F" stroke="#111215" stroke-width="1"/>
    <!-- Ruffled White Cravat / Jabot with pleats -->
    <g fill="#ECE8DF" stroke="#111215" stroke-width="1">
      <path d="M38 125 C 44 128, 58 132, 60 140 C 50 144, 40 142, 38 136 Z"/>
      <path d="M40 138 C 46 142, 58 145, 60 154 C 48 158, 42 154, 40 148 Z"/>
      <path d="M42 152 C 48 156, 58 158, 60 168 C 48 172, 44 168, 42 162 Z"/>
      <path d="M44 166 C 50 170, 58 172, 60 180 C 50 180, 46 178, 44 174 Z"/>
    </g>
    <!-- Gold Epaulette with Fringe on right shoulder -->
    <g fill="#9E844F" stroke="#111215" stroke-width="1.2">
      <ellipse cx="120" cy="138" rx="16" ry="7" transform="rotate(10 120 138)"/>
      <path d="M106 142 Q 108 165 106 170 M 112 143 Q 114 168 112 173 M 118 144 Q 120 170 118 175 M 124 144 Q 126 170 124 175 M 130 143 Q 132 168 130 173 M 136 141 Q 138 165 136 170" stroke="#9E844F" stroke-width="2.5" stroke-linecap="round"/>
    </g>
  </g>

  <!-- Crossed Pistols (Garruchas / Pistolas Cruzadas) at Bottom -->
  <g transform="translate(150, 330)">
    <!-- Pistol 1 (Top-Left to Bottom-Right) -->
    <g transform="rotate(38 50 45)">
      <!-- Barrel & Body -->
      <rect x="10" y="40" width="80" height="9" rx="2" fill="#111215" stroke="#ECE8DF" stroke-width="0.8"/>
      <!-- Curved Handle -->
      <path d="M15 45 C 10 52, 8 68, 16 78 C 22 82, 28 80, 26 72 C 24 64, 22 55, 25 48 Z" fill="#111215" stroke="#ECE8DF" stroke-width="0.8"/>
      <!-- Hammer & Lock -->
      <path d="M35 34 L 40 40 L 30 40 Z" fill="#111215" />
      <circle cx="36" cy="44" r="3.5" fill="#ECE8DF" />
      <!-- Trigger Guard -->
      <path d="M32 49 Q 34 58 44 49" stroke="#ECE8DF" stroke-width="1.8" fill="none" />
    </g>
    <!-- Pistol 2 (Top-Right to Bottom-Left) -->
    <g transform="rotate(-38 50 45)">
      <!-- Barrel & Body -->
      <rect x="10" y="40" width="80" height="9" rx="2" fill="#111215" stroke="#ECE8DF" stroke-width="0.8"/>
      <!-- Curved Handle -->
      <path d="M85 45 C 90 52, 92 68, 84 78 C 78 82, 72 80, 74 72 C 76 64, 78 55, 75 48 Z" fill="#111215" stroke="#ECE8DF" stroke-width="0.8"/>
      <!-- Hammer & Lock -->
      <path d="M65 34 L 60 40 L 70 40 Z" fill="#111215" />
      <circle cx="64" cy="44" r="3.5" fill="#ECE8DF" />
      <!-- Trigger Guard -->
      <path d="M68 49 Q 66 58 56 49" stroke="#ECE8DF" stroke-width="1.8" fill="none" />
    </g>
  </g>
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
 * Generates a rich, highly detailed 5-line intelligence summary of all occurrences
 * synthesising the criminal facts, modus operandi, weapons, mobility, spatiality, and investigative directives.
 */
function generateCriminalDossierRich5LineSummary(infratorFull: any, occurrences: any[]): string[] {
  if (!occurrences || occurrences.length === 0) {
    return [
      'Nenhum registro criminal individual ou B.O. vinculado diretamente a este investigado no banco de dados até a presente data.',
      'Infrator sem histórico de flagrantes ou inquéritos policiais ativos catalogados no sistema de inteligência do 35º BPM.',
      'Recomenda-se verificação periódica de antecedentes junto ao sistema ISP/CINDS e BNMP para atualização cadastral.',
      'Não há registro de apreensão de armas, veículos de apoio ou mandados judiciais pendentes associados.',
      'Diretriz operacional: Proceder à identificação padrão em caso de abordagem policial preventiva de rotina.'
    ];
  }

  // Aggregate data from all occurrences
  const totalBos = occurrences.length;
  const crimesSet = new Set<string>();
  const papeisSet = new Set<string>();
  const armasSet = new Set<string>();
  const veiculosSet = new Set<string>();
  const locaisSet = new Set<string>();
  const modusList: string[] = [];
  const narrativasList: string[] = [];

  occurrences.forEach((oc: any) => {
    if (oc.tipificacao_penal) crimesSet.add(oc.tipificacao_penal.trim());
    if (oc.papel || oc.papel_no_crime) papeisSet.add((oc.papel || oc.papel_no_crime).trim());
    if (oc.bairro) locaisSet.add(oc.bairro.trim());
    if (oc.cidade && !oc.bairro) locaisSet.add(oc.cidade.trim());

    if (oc.armas_utilizadas && oc.armas_utilizadas.trim() && !['não informada', 'n/d', 'nenhuma'].includes(oc.armas_utilizadas.toLowerCase())) {
      oc.armas_utilizadas.split(/[,;/]+/).map((s: string) => s.trim()).filter(Boolean).forEach((w: string) => armasSet.add(w));
    }
    if (oc.veiculo_utilizado && oc.veiculo_utilizado.trim() && !['não informado', 'n/d', 'nenhum'].includes(oc.veiculo_utilizado.toLowerCase())) {
      oc.veiculo_utilizado.split(/[,;/]+/).map((s: string) => s.trim()).filter(Boolean).forEach((v: string) => veiculosSet.add(v));
    }
    if (oc.modus_operandi && oc.modus_operandi.trim().length > 3) {
      modusList.push(oc.modus_operandi.trim());
    }
    if (oc.descricao_fato && oc.descricao_fato.trim().length > 10) {
      narrativasList.push(oc.descricao_fato.trim());
    }
  });

  const crimesStr = Array.from(crimesSet).join(', ') || 'crimes diversos';
  const papeisStr = Array.from(papeisSet).join(', ') || 'Autor/Investigado';
  const armasStr = Array.from(armasSet).join(', ') || 'armamento não especificado no ato do registro';
  const veiculosStr = Array.from(veiculosSet).join(', ') || 'deslocamento a pé ou meio não individualizado';
  const locaisStr = Array.from(locaisSet).slice(0, 4).join(', ') || 'circunscrição do 35º BPM';
  const faccao = infratorFull.gangue_faccao || 'não vinculada oficialmente';
  const nomeGuerra = infratorFull.vulgo ? `"${infratorFull.vulgo}"` : infratorFull.nome_completo;

  // Extract core fact highlights
  let dinamicaFatos = '';
  if (modusList.length > 0) {
    dinamicaFatos = modusList.slice(0, 2).join('; ');
  } else if (narrativasList.length > 0) {
    const rawNarr = narrativasList[0].replace(/(\r\n|\n|\r)/gm, ' ');
    dinamicaFatos = rawNarr.length > 160 ? rawNarr.slice(0, 160) + '...' : rawNarr;
  } else {
    dinamicaFatos = 'prática reiterada de delitos com divisão de tarefas e intimidação no perímetro de atuação';
  }

  // 5 Rich Intelligence Lines
  const line1 = `<strong>1. Reiteração Delitiva & Tipificações:</strong> O investigado <strong>${nomeGuerra}</strong> possui envolvimento catalogado em <strong>${totalBos} ocorrência(s) policial(is)</strong>, com histórico concentrado na prática de <strong>${crimesStr}</strong>, figurando preponderantemente como <strong>${papeisStr}</strong> nos registros do 35º BPM.`;
  
  const line2 = `<strong>2. Dinâmica dos Fatos & Modus Operandi:</strong> As apurações indicam padrão de conduta caracterizado por <strong>${dinamicaFatos}</strong>, com atuação agressiva, rápida tomada de decisão e intimidação ostensiva a fim de assegurar a consumação dos atos criminosos e a impunidade.`;
  
  const line3 = `<strong>3. Meios Empregados (Armamento & Mobilidade):</strong> Constata-se emprego tático de <strong>${armasStr}</strong> para intimidação e confronto, utilizando como suporte logístico e rota de fuga <strong>${veiculosStr}</strong> para rápida evasão do cerco policial e ocultação em redutos.`;
  
  const line4 = `<strong>4. Espacialidade, Comparsaria & Facção:</strong> Reiteração delitiva com raio de ação concentrado nos bairros <strong>${locaisStr}</strong>, operando com suporte de comparsas e co-autores identificados em registros conjuntos, mantendo subordinação ou aliança com <strong>${faccao}</strong>.`;
  
  const line5 = `<strong>5. Diretriz Tática para Diligências & Investigação Futura:</strong> Em intervenções operacionais e cumprimento de mandados judiciais, adotar cautela máxima quanto ao risco de confronto armado, monitorar rotas de escape para áreas de mata/vielas e realizar cerco simultâneo aos pontos de guarda de armamentos e comparsas.`;

  return [line1, line2, line3, line4, line5];
}

/**
 * Builds an analytical summary of occurrences focusing on modus operandi and investigation points
 */
function buildCriminalDossierSummary(infratorFull: any, occurrences: any[]) {
  if (!occurrences || occurrences.length === 0) {
    return {
      hasOccurrences: false,
      totalCount: 0,
      tipificacoesCount: [] as { crime: string; count: number }[],
      armas: [] as string[],
      veiculos: [] as string[],
      modusOperandiList: [] as string[],
      papeisCount: {} as Record<string, number>,
      diligencePoints: [] as { bo: string; data: string; tipificacao: string; papel: string; local: string; pontoChave: string }[],
      rich5Lines: generateCriminalDossierRich5LineSummary(infratorFull, occurrences),
    };
  }

  const tipificacoesMap: Record<string, number> = {};
  const armasSet = new Set<string>();
  const veiculosSet = new Set<string>();
  const modusOperandiSet = new Set<string>();
  const papeisCount: Record<string, number> = {};
  const diligencePoints: { bo: string; data: string; tipificacao: string; papel: string; local: string; pontoChave: string }[] = [];

  for (const oc of occurrences) {
    // Tipificação
    const tip = (oc.tipificacao_penal || 'Não especificada').trim();
    tipificacoesMap[tip] = (tipificacoesMap[tip] || 0) + 1;

    // Papel
    const papel = (oc.papel || oc.papel_no_crime || 'Autor').trim();
    papeisCount[papel] = (papeisCount[papel] || 0) + 1;

    // Local
    const local = oc.bairro ? `${oc.bairro} (${oc.cidade || 'Santa Luzia'})` : (oc.cidade || 'Circunscrição 35º BPM');

    // Armas
    if (oc.armas_utilizadas && oc.armas_utilizadas.trim() && !['não informada', 'n/d', 'nenhuma'].includes(oc.armas_utilizadas.toLowerCase())) {
      const parts = oc.armas_utilizadas.split(/[,;/]+/).map((s: string) => s.trim()).filter(Boolean);
      parts.forEach((p: string) => armasSet.add(p));
    }

    // Veículos
    if (oc.veiculo_utilizado && oc.veiculo_utilizado.trim() && !['não informado', 'n/d', 'nenhum'].includes(oc.veiculo_utilizado.toLowerCase())) {
      const parts = oc.veiculo_utilizado.split(/[,;/]+/).map((s: string) => s.trim()).filter(Boolean);
      parts.forEach((p: string) => veiculosSet.add(p));
    }

    // Modus Operandi
    if (oc.modus_operandi && oc.modus_operandi.trim() && oc.modus_operandi.length > 3) {
      modusOperandiSet.add(oc.modus_operandi.trim());
    }

    // Build key investigative takeaway
    const boNum = oc.numero_bo || 'S/N';
    const dataFmt = oc.data_hora ? new Date(oc.data_hora).toLocaleDateString('pt-BR') : 'Data N/D';
    let pontoChave = oc.modus_operandi || '';
    if (!pontoChave && oc.descricao_fato) {
      pontoChave = oc.descricao_fato.length > 200 ? oc.descricao_fato.slice(0, 200) + '...' : oc.descricao_fato;
    }
    if (!pontoChave) {
      pontoChave = 'Registro policial catalogado na unidade de área.';
    }

    diligencePoints.push({
      bo: boNum,
      data: dataFmt,
      tipificacao: tip,
      papel: papel,
      local: local,
      pontoChave: pontoChave,
    });
  }

  const tipificacoesCount = Object.entries(tipificacoesMap)
    .map(([crime, count]) => ({ crime, count }))
    .sort((a, b) => b.count - a.count);

  const rich5Lines = generateCriminalDossierRich5LineSummary(infratorFull, occurrences);

  return {
    hasOccurrences: true,
    totalCount: occurrences.length,
    tipificacoesCount,
    armas: Array.from(armasSet),
    veiculos: Array.from(veiculosSet),
    modusOperandiList: Array.from(modusOperandiSet),
    papeisCount,
    diligencePoints,
    rich5Lines,
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
  const dossierSummary = buildCriminalDossierSummary(infratorFull, occurrences);

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
    .rich-summary-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #1e3a8a;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 8px;
    }
    .rich-summary-header {
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #1e3a8a;
      letter-spacing: 0.5px;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 3px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .rich-line-item {
      font-size: 8pt;
      color: #1e293b;
      line-height: 1.38;
      margin-bottom: 4px;
      padding-left: 2px;
    }
    .rich-line-item:last-child {
      margin-bottom: 0;
    }
    .rich-line-item strong {
      color: #0f172a;
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
        <!-- Síntese Circunstanciada Consolidada em até 5 Linhas com Riqueza de Detalhes -->
        <div class="rich-summary-box">
          <div class="rich-summary-header">
            <span>📋 Resumo Circunstanciado de Inteligência • Análise Consolidada dos Registros</span>
            <span style="font-size: 6.8pt; font-weight: 700; color: #64748b;">Síntese Integrada</span>
          </div>
          <div>
            ${dossierSummary.rich5Lines.map((line: string) => `
              <div class="rich-line-item">${line}</div>
            `).join('')}
          </div>
        </div>

        <!-- Indicadores Técnicos: Tipificações Recorrentes & Meios Empregados -->
        <div class="dossier-grid">
          <!-- Bloco A: Tipificações Recorrentes -->
          <div class="dossier-card">
            <div class="dossier-card-title">
              <span>Recorrência Criminal & Tipificações</span>
              <span style="color: #64748b; font-size: 6.5pt;">Incidências</span>
            </div>
            <div>
              ${dossierSummary.tipificacoesCount.map((t: any) => `
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
              <span style="color: #1e3a8a; font-size: 6.5pt; font-weight: 700;">Inteligência</span>
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

        <!-- Bloco C: Quadro Sinóptico dos Registros Policiais (Linha do Tempo Compacta) -->
        <div class="dossier-card" style="margin-top: 4px;">
          <div class="dossier-card-title" style="color: #9a3412;">
            <span>Quadro Sinóptico dos Registros Policiais Vinculados (B.O.s)</span>
            <span style="color: #9a3412; font-size: 6.5pt; font-weight: 700;">${dossierSummary.diligencePoints.length} B.O.(s)</span>
          </div>
          <table style="margin-bottom: 0;">
            <thead>
              <tr>
                <th style="width: 140px;">B.O. Nº / Data</th>
                <th style="width: 130px;">Tipificação Penal</th>
                <th style="width: 70px;">Papel</th>
                <th style="width: 120px;">Bairro / Local</th>
                <th>Destaque do Fato / Modus Operandi</th>
              </tr>
            </thead>
            <tbody>
              ${dossierSummary.diligencePoints.map((p: any) => `
                <tr>
                  <td><strong>${p.bo}</strong><br/><span style="color: #64748b; font-size: 7pt;">${p.data}</span></td>
                  <td><span style="font-weight: 700; color: #991b1b;">${p.tipificacao}</span></td>
                  <td><span style="background: #fef3c7; color: #92400e; font-weight: 700; font-size: 6.8pt; padding: 1px 4px; border-radius: 2px; border: 1px solid #fde68a;">${p.papel}</span></td>
                  <td>${p.local}</td>
                  <td style="color: #334155; line-height: 1.25;">${p.pontoChave}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
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
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          ${SVG_LOGO_PMMG}
          ${SVG_LOGO_35BPM}
        </div>
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

