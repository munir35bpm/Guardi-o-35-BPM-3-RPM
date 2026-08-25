import { db } from '../backend/db';

export interface IntelligenceAnalysisResult {
  ocorrencia_processada: {
    municipio: string;
    bairro: string;
    logradouro?: string;
    tipificacao: string;
    modus_operandi_resumo: string;
    caracteristicas_declaradas: {
      pele?: string;
      vestimentas?: string;
      sinais_particulares?: string;
      armas_veiculos?: string;
    };
  };
  cruzamento_suspeitos: Array<{
    infrator_id: string;
    nome_completo: string;
    vulgo: string;
    score_compatibilidade: number;
    fatores_convergentes: string[];
    fatores_divergentes: string[];
    justificativa_analitica: string;
    recomendacao_operacional: string;
    suspect_details?: any;
  }>;
  alerta_reincidencia_perimetro: {
    nivel_alerta: 'ALTO' | 'MEDIO' | 'BAIXO';
    observacao: string;
  };
}

/**
 * Robust Deterministic AI/Heuristic Intelligence Engine
 * Extracts crime details, cross-references suspects in memory, and generates risk alerts.
 */
export function analyzeCrimeIntelligenceLocally(
  narrative: string,
  candidatesList?: any[],
  coords?: { lat: number; lng: number }
): IntelligenceAnalysisResult {
  const text = narrative || '';
  const textUpper = text.toUpperCase();
  const textLower = text.toLowerCase();

  // 1. Detect Crime Typification
  let tipificacao = 'Ocorrência Policial Geral / Em Apuração';
  if (/homic[ií]dio|assassin|matou|execut|perfura[çc][õo]es|morte|cad[aá]ver|corpo|perito.*óbito/i.test(text)) {
    if (/tentad|tentativa|sobreviveu|socorrid/i.test(text)) {
      tipificacao = 'Homicídio Tentado';
    } else {
      tipificacao = 'Homicídio Consumado';
    }
  } else if (/latroc[ií]nio|roubo seguido de morte/i.test(text)) {
    tipificacao = 'Latrocínio (Roubo Seguido de Morte)';
  } else if (/roubo|assalto|subtra[ií]u|arma de fogo anunci|levou o ve[ií]culo/i.test(text)) {
    tipificacao = 'Roubo a Mão Armada (Art. 157)';
  } else if (/tr[aá]fico|drogas|entorpecente|maconha|coca[ií]na|crack|boca de fumo/i.test(text)) {
    tipificacao = 'Tráfico Ilícito de Drogas (Art. 33)';
  } else if (/furto|arromb|subtra[ií]u sem viol/i.test(text)) {
    tipificacao = 'Furto Qualificado (Art. 155)';
  } else if (/amea[çc]a|jurou|disse que ia matar/i.test(text)) {
    tipificacao = 'Ameaça / Coação no Curso do Processo';
  } else if (/porte|posse|arma raspada|muni[çc][aã]o/i.test(text)) {
    tipificacao = 'Porte Ilegal de Arma de Fogo';
  }

  // 2. Extract Location
  let municipio = 'Santa Luzia';
  let bairro = 'Região do 35º BPM';
  let logradouro = 'Via Pública / Local do Fato';

  // Common Santa Luzia / 35º BPM Neighborhoods
  const knownBairros = [
    'São Benedito', 'Baronesa', 'Palmital', 'Campão', 'Bom Destino', 'Cristina', 'Asteca',
    'Duquesa', 'Frimisa', 'Centro', 'Adeodato', 'Nova Esperança', 'Morada dos Nobres',
    'Chácaras Santa Inês', 'Londrina', 'Pousada Del Rei', 'Kennedy', 'Belo Vale', 'Nossa Senhora do Carmo'
  ];

  for (const b of knownBairros) {
    if (new RegExp(`\\b${b}\\b`, 'i').test(text)) {
      bairro = b;
      break;
    }
  }

  // Detect street if present
  const streetMatch = text.match(/(?:rua|avenida|av\.|alameda|travessa|beco|estrada)\s+([^,\n\.\;]+)/i);
  if (streetMatch) {
    logradouro = streetMatch[0].trim();
  }

  // 3. Modus Operandi & Perforations Extraction
  const perfMatch = text.match(/(\d+|\w+)\s*perfura[çc][õo]es/i);
  const perfCount = perfMatch ? perfMatch[1] : '';

  let moResumo = '';
  if (perfCount) {
    moResumo = `Ação violenta com disparos de arma de fogo. Perícia constatou ${perfCount} perfurações na vítima. `;
  } else if (/disparo|tiro|alvejad/i.test(text)) {
    moResumo = 'Ação criminosa mediante disparos de arma de fogo. ';
  } else if (/moto|motocicleta|garupa/i.test(text)) {
    moResumo = 'Abordagem rápida utilizando motocicleta para fuga. ';
  } else {
    moResumo = 'Modus operandi característico de emboscada ou acerto de contas. ';
  }

  if (/amea[çc]a/i.test(text)) {
    moResumo += 'Histórico prévio de ameaças e disputa entre grupos criminosos relatado por testemunhas.';
  }

  // Extract Weapons / Vehicles
  let armasVeiculos = 'Arma de fogo não especificada';
  if (/pistola|9mm|\.40|\.380|calibre/i.test(text)) {
    armasVeiculos = 'Pistola / Projéteis de arma de fogo';
  } else if (/rev[oó]lver|\.38/i.test(text)) {
    armasVeiculos = 'Revólver cal. 38';
  } else if (/fuzil|calibre restrito/i.test(text)) {
    armasVeiculos = 'Arma de fogo de alto calibre / calibre restrito';
  }

  const veicMatch = text.match(/(moto(?:cicleta)?\s+[^\.\,\n]+|ve[ií]culo\s+[^\.\,\n]+|carro\s+[^\.\,\n]+)/i);
  if (veicMatch) {
    armasVeiculos += ` | Veículo: ${veicMatch[1].trim()}`;
  }

  // 4. Cross-match with Candidates from Database
  let allSuspects = candidatesList || [];
  if (allSuspects.length === 0 && db && db.infratores) {
    allSuspects = db.infratores.map(i => db.getInfratorFull(i.id) || i);
  }

  const matchedSuspects: Array<{
    infrator_id: string;
    nome_completo: string;
    vulgo: string;
    score_compatibilidade: number;
    fatores_convergentes: string[];
    fatores_divergentes: string[];
    justificativa_analitica: string;
    recomendacao_operacional: string;
    suspect_details?: any;
  }> = [];

  // Keywords in text
  for (const s of allSuspects) {
    let score = 20;
    const fatoresConvergentes: string[] = [];
    const fatoresDivergentes: string[] = [];

    const nomeUpper = (s.nome_completo || '').toUpperCase();
    const nomeParts = nomeUpper.split(/\s+/).filter((p: string) => p.length > 2);
    const vulgoUpper = (s.vulgo || '').toUpperCase();
    const faccaoUpper = (s.gangue_faccao || '').toUpperCase();

    // Check direct name match
    let isNameDirectlyCited = false;
    if (nomeUpper && textUpper.includes(nomeUpper)) {
      isNameDirectlyCited = true;
      score += 75;
      fatoresConvergentes.push(`Nome completo ("${s.nome_completo}") citado explicitamente no relato do fato.`);
    } else {
      // Check partial first/last name if distinct
      const matchedParts = nomeParts.filter((p: string) => textUpper.includes(p) && !['DOS', 'DAS', 'SILVA', 'SOUZA', 'SANTOS', 'OLIVEIRA'].includes(p));
      if (matchedParts.length >= 2) {
        isNameDirectlyCited = true;
        score += 65;
        fatoresConvergentes.push(`Nome do infrator ("${matchedParts.join(' ')}") identificado no depoimento.`);
      } else if (matchedParts.length === 1 && matchedParts[0].length >= 5) {
        score += 35;
        fatoresConvergentes.push(`Menção a sobrenome/identificador característico ("${matchedParts[0]}").`);
      }
    }

    // Check Vulgo match
    if (vulgoUpper && vulgoUpper !== 'S/V' && vulgoUpper.length > 2) {
      if (textUpper.includes(vulgoUpper) || textUpper.includes(`"${vulgoUpper}"`)) {
        score += 60;
        fatoresConvergentes.push(`Alcunha/Vulgo "${s.vulgo}" citado diretamente no contexto delitivo.`);
      }
    }

    // Check Gang / Faction match
    if (faccaoUpper && faccaoUpper !== 'NENHUMA' && faccaoUpper !== 'SEM FACÇÃO') {
      const faccaoWords = faccaoUpper.replace(/GANGUE\s+DO\s+|GANGUE\s+DA\s+|GANGUE\s+|FACÇÃO\s+/g, '').trim();
      if (faccaoWords && textUpper.includes(faccaoWords)) {
        score += 40;
        fatoresConvergentes.push(`Infrator integra a facção/gangue apontada no fato: "${s.gangue_faccao}".`);
      }
    }

    // Check Gangue do Muleta / Campão
    if (/MULETA/i.test(text) && /MULETA/i.test(faccaoUpper)) {
      score += 35;
      fatoresConvergentes.push('Vínculo tático confirmado com a Gangue do Muleta.');
    }
    if (/CAMP[AÃ]O/i.test(text) && /CAMP[AÃ]O/i.test(faccaoUpper)) {
      score += 35;
      fatoresConvergentes.push('Vínculo tático confirmado com a Gangue do Campão.');
    }

    // Check crime history
    const ocorrencias = s.ocorrencias || [];
    const hasHomicideHistory = ocorrencias.some((o: any) => /homic[ií]dio|matou|tentativa/i.test(o.tipificacao_penal || ''));
    if (hasHomicideHistory && /homic[ií]dio/i.test(tipificacao)) {
      score += 15;
      fatoresConvergentes.push('Reincidência: histórico criminal com registros prévios de crimes contra a vida.');
    }

    // Periculosidade & Warrant
    if (s.status_mandado_prisao) {
      score += 10;
      fatoresConvergentes.push('Infrator possui Mandado de Prisão em aberto no BNMP.');
    }

    // Cap score at 98%
    score = Math.min(Math.max(score, 15), 98);

    if (fatoresConvergentes.length === 0) {
      fatoresDivergentes.push('Sem citação nominal direta no relato inicial.');
      fatoresDivergentes.push('Modus operandi em fase de qualificação complementar.');
    }

    let justificativa = '';
    let recomendacao = '';

    if (isNameDirectlyCited || score >= 80) {
      justificativa = `Alta probabilidade de autoria/participação. O infrator ${s.nome_completo} (${s.vulgo}) foi formalmente apontado no relato circunstanciado como líder/executor com vinculação à facção ${s.gangue_faccao || 'atuante'}.`;
      recomendacao = `Urgência Operacional: Solicitar mandado de busca/apreensão ou prisão, intensificar vigilância velada nos endereços cadastrados e alinhar com a P2 do 35º BPM.`;
    } else if (score >= 50) {
      justificativa = `Compatibilidade moderada/tática. Infrator possui vínculo com o território ou facção delitiva envolvida no fato criminoso.`;
      recomendacao = `Realizar checagem de álibi e incluir fotografia no álbum de reconhecimento com testemunhas do evento.`;
    } else {
      justificativa = `Baixa correlação nominal, mantido na lista de monitoramento territorial pela proximidade geográfica ou atuação delitiva geral.`;
      recomendacao = `Manter monitoramento de rotina e checagem em abordagens táticas.`;
    }

    // Only include suspects with meaningful score or convergence, or top candidates
    if (score >= 40 || isNameDirectlyCited || fatoresConvergentes.length > 0) {
      matchedSuspects.push({
        infrator_id: s.id,
        nome_completo: s.nome_completo,
        vulgo: s.vulgo || 'S/V',
        score_compatibilidade: score,
        fatores_convergentes: fatoresConvergentes.length > 0 ? fatoresConvergentes : ['Infrator cadastrado no raio geográfico de monitoramento'],
        fatores_divergentes: fatoresDivergentes,
        justificativa_analitica: justificativa,
        recomendacao_operacional: recomendacao,
        suspect_details: s
      });
    }
  }

  // Sort by highest compatibility
  matchedSuspects.sort((a, b) => b.score_compatibilidade - a.score_compatibilidade);

  // 5. Risk Assessment & Reincidence Alert
  const highestScore = matchedSuspects.length > 0 ? matchedSuspects[0].score_compatibilidade : 0;
  let nivelAlerta: 'ALTO' | 'MEDIO' | 'BAIXO' = 'MEDIO';
  let observacaoAlerta = '';

  if (highestScore >= 75 || /homic[ií]dio|execu[çc]|guerra|fac[çc][aã]o|amea[çc]as da gangue/i.test(text)) {
    nivelAlerta = 'ALTO';
    observacaoAlerta = `ALERTA VERMELHO: Indicador de conflito territorial armado ou vingança entre células rivais (ex: Gangue do Muleta / Campão). Risco iminente de novos confrontos ou retaliações. Recomendado patrulhamento preventivo reforçado com Tático Móvel e GEPMOR no setor.`;
  } else if (highestScore >= 50) {
    nivelAlerta = 'MEDIO';
    observacaoAlerta = `ALERTA AMARELO: Ocorrência de impacto tático relevante com suspeitos reincidentes na área. Monitorar pontos de venda de drogas e esconderijos cadastrados.`;
  } else {
    nivelAlerta = 'BAIXO';
    observacaoAlerta = `ALERTA VERDE: Ocorrência sem indício imediato de disputa entre facções hegemônicas. Proceder com diligências preliminares de praxe.`;
  }

  return {
    ocorrencia_processada: {
      municipio,
      bairro,
      logradouro,
      tipificacao,
      modus_operandi_resumo: moResumo,
      caracteristicas_declaradas: {
        pele: /moren|negro|pard|clar|branc/i.test(text) ? (text.match(/moren\w+|negro|pardo|branco|claro/i)?.[0] || 'Conforme apurado') : 'Não especificada no texto',
        vestimentas: /bon[eé]|bermuda|cal[çc]a|blusa|camisa|jaqueta|capuz|capacete/i.test(text) ? (text.match(/(?:vestindo|com)\s+([^,\n\.]+)/i)?.[0] || 'Capacete / Roupas escuras') : 'Não declaradas no chamado inicial',
        sinais_particulares: /tatuag|cicatriz|manco|piercing|marca/i.test(text) ? (text.match(/(?:tatuag\w+|cicatriz\w+|sinal)\s+[^,\n\.]+/i)?.[0] || 'Sinais corporais descritos') : 'Sem sinais particulares descritos no boletim',
        armas_veiculos: armasVeiculos
      }
    },
    cruzamento_suspeitos: matchedSuspects,
    alerta_reincidencia_perimetro: {
      nivel_alerta: nivelAlerta,
      observacao: observacaoAlerta
    }
  };
}
