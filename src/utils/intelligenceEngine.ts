import { db } from '../backend/db';

export interface IntelligenceFilters {
  tatuagens?: string;
  cicatrizes?: string;
  sinais_particulares?: string;
  cor_pele?: string;
  compleicao?: string;
  altura_faixa?: string;
  veiculo?: string;
  armas?: string;
  bairro?: string;
  faccao?: string;
}

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
      tatuagens?: string;
      cicatrizes?: string;
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
 * Normalizes text for robust comparison (removes accents and casing)
 */
function normalizeStr(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Checks if query contains any of words
 */
function hasAnyWord(text: string, words: string[]): boolean {
  const normText = normalizeStr(text);
  return words.some(w => normText.includes(normalizeStr(w)));
}

/**
 * Robust Deterministic AI/Heuristic Intelligence Engine
 * Extracts crime details, cross-references suspects in memory by narrative AND/OR physical filters,
 * and generates risk alerts.
 */
export function analyzeCrimeIntelligenceLocally(
  narrative: string,
  candidatesList?: any[],
  coords?: { lat: number; lng: number },
  filters?: IntelligenceFilters
): IntelligenceAnalysisResult {
  const text = narrative || '';
  const textNorm = normalizeStr(text);

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
  } else if (/roubo de carga|caminh[aã]o|carga|intercept/i.test(text)) {
    tipificacao = 'Roubo de Carga';
  } else if (/roubo|assalto|subtra[ií]u|arma de fogo anunci|levou o ve[ií]culo|transeunte/i.test(text)) {
    tipificacao = 'Roubo a Mão Armada (Art. 157)';
  } else if (/tr[aá]fico|drogas|entorpecente|maconha|coca[ií]na|crack|boca de fumo|pinos|buchas/i.test(text)) {
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
  let bairro = filters?.bairro || 'Região do 35º BPM';
  let logradouro = 'Via Pública / Local do Fato';

  // Specific regex to capture explicit "BAIRRO <NOME>"
  const explicitBairroMatch = text.match(/(?:bairro|b\.)\s+([a-zA-ZáéíóúÁÉÍÓÚãõÃÕâêôÂÊÔçÇ\s]+?)(?:-|\n|,|\.|\s+em|\s+santa luzia|$)/i);
  if (explicitBairroMatch && explicitBairroMatch[1]?.trim().length > 2) {
    const rawB = explicitBairroMatch[1].trim();
    if (!/santa luzia|mg|minas/i.test(rawB)) {
      bairro = rawB;
    }
  } else if (!filters?.bairro) {
    // Common Santa Luzia / 35º BPM Neighborhoods
    const knownBairros = [
      'Bom Destino', 'São Benedito', 'Baronesa', 'Palmital', 'Campão', 'Cristina', 'Asteca',
      'Duquesa', 'Frimisa', 'Centro', 'Adeodato', 'Nova Esperança', 'Morada dos Nobres',
      'Chácaras Santa Inês', 'Londrina', 'Pousada Del Rei', 'Kennedy', 'Belo Vale', 'Nossa Senhora do Carmo',
      'Capim Branco', 'Industrial Americano', 'Vila Olga', 'Santa Rita', 'Idulipê', 'Liberdade'
    ];

    for (const b of knownBairros) {
      if (new RegExp(`\\b${b}\\b`, 'i').test(text)) {
        bairro = b;
        break;
      }
    }
  }

  // Detect street if present
  const streetMatch = text.match(/(?:rua|avenida|av\.|alameda|travessa|beco|estrada|rodovia)\s+([^,\n\.\;]+)/i);
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
    moResumo = 'Ação criminosa violenta mediante disparos de arma de fogo. ';
  } else if (/moto|motocicleta|garupa/i.test(text)) {
    moResumo = 'Abordagem rápida utilizando motocicleta para aproximação e fuga. ';
  } else {
    moResumo = 'Modus operandi característico de emboscada, acerto de contas ou ação territorial. ';
  }

  if (/amea[çc]a/i.test(text)) {
    moResumo += 'Histórico prévio de ameaças e disputa entre grupos criminosos relatado por testemunhas.';
  }

  // 4. Physical Characteristics, Tattoos, Scars & Vehicles Extraction
  let peleExtracted = filters?.cor_pele || '';
  if (!peleExtracted) {
    if (/moren[oa]/i.test(text)) peleExtracted = 'Morena';
    else if (/negr[oa]|pret[oa]/i.test(text)) peleExtracted = 'Negra';
    else if (/pard[oa]/i.test(text)) peleExtracted = 'Parda';
    else if (/branc[oa]|clar[oa]/i.test(text)) peleExtracted = 'Branca / Clara';
    else peleExtracted = 'Não especificada';
  }

  let vestimentasExtracted = 'Não declaradas';
  const vestMatch = text.match(/(?:vestindo|trajando|com|usava)\s+(?:um[a]?\s+)?(bon[eé]|bermuda|cal[çc]a|blusa|camisa|jaqueta|capuz|capacete[^\,\.\n]+)/i);
  if (vestMatch) {
    vestimentasExtracted = vestMatch[0].trim();
  } else if (/capacete/i.test(text)) {
    vestimentasExtracted = 'Capacete de motociclista';
  }

  // Tattoos extraction
  let tatuagensExtracted = filters?.tatuagens || '';
  const tatMatch = text.match(/tatuag\w+\s+(?:de\s+|no\s+|na\s+|em\s+)?([^\,\.\n]+)/i);
  if (tatMatch && !tatuagensExtracted) {
    tatuagensExtracted = tatMatch[0].trim();
  }

  // Scars & Particular Signs extraction
  let cicatrizesExtracted = filters?.cicatrizes || '';
  const cicMatch = text.match(/cicatriz\w*\s+(?:no\s+|na\s+|em\s+|de\s+)?([^\,\.\n]+)/i);
  if (cicMatch && !cicatrizesExtracted) {
    cicatrizesExtracted = cicMatch[0].trim();
  }

  let sinaisParticulares = filters?.sinais_particulares || '';
  if (/manco|mancando/i.test(text)) sinaisParticulares += ' Infrator manco/claudicante.';
  if (/dente de ouro/i.test(text)) sinaisParticulares += ' Dente de ouro visível.';
  if (/queimadura/i.test(text)) sinaisParticulares += ' Marca de queimadura corporal.';
  if (/orelha/i.test(text)) sinaisParticulares += ' Sinal/deformidade na orelha.';
  if (!sinaisParticulares && !cicatrizesExtracted) {
    sinaisParticulares = 'Sem sinais particulares descritos no boletim';
  }

  // Vehicles and Weapons extraction
  let armasVeiculos = filters?.veiculo ? `Veículo: ${filters.veiculo}` : '';
  if (filters?.armas) {
    armasVeiculos += armasVeiculos ? ` | Arma: ${filters.armas}` : `Arma: ${filters.armas}`;
  }

  if (!armasVeiculos) {
    if (/pistola|9mm|\.40|\.380/i.test(text)) {
      armasVeiculos = 'Pistola semi-automática / estojos no local';
    } else if (/rev[oó]lver|\.38/i.test(text)) {
      armasVeiculos = 'Revólver cal. 38';
    } else if (/fuzil|calibre restrito/i.test(text)) {
      armasVeiculos = 'Arma de alto calibre';
    } else if (/disparo|perfura[çc]/i.test(text)) {
      armasVeiculos = 'Arma de fogo (calibre em apuração)';
    } else {
      armasVeiculos = 'Não informada';
    }

    const veicMatch = text.match(/(moto(?:cicleta)?\s+[^\.\,\n]+|ve[ií]culo\s+[^\.\,\n]+|carro\s+[^\.\,\n]+|van\s+[^\.\,\n]+|sprinter\s+[^\.\,\n]+|palio\s+[^\.\,\n]+|titan\s+[^\.\,\n]+|fan\s+[^\.\,\n]+)/i);
    if (veicMatch) {
      armasVeiculos += ` | Veículo: ${veicMatch[1].trim()}`;
    }
  }

  // 5. Cross-match with Candidates from Database
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

  const filterTatNorm = normalizeStr(filters?.tatuagens);
  const filterCicNorm = normalizeStr(filters?.cicatrizes);
  const filterSinNorm = normalizeStr(filters?.sinais_particulares);
  const filterPeleNorm = normalizeStr(filters?.cor_pele);
  const filterCompNorm = normalizeStr(filters?.compleicao);
  const filterVeicNorm = normalizeStr(filters?.veiculo);
  const filterBairroNorm = normalizeStr(filters?.bairro || bairro);
  const filterFaccaoNorm = normalizeStr(filters?.faccao);

  for (const s of allSuspects) {
    let score = 0;
    const fatoresConvergentes: string[] = [];
    const fatoresDivergentes: string[] = [];

    const nomeNorm = normalizeStr(s.nome_completo);
    const vulgoNorm = normalizeStr(s.vulgo);
    const faccaoNorm = normalizeStr(s.gangue_faccao);
    const fisicas = s.fisicas || db.caracteristicas_fisicas?.find(cf => cf.infrator_id === s.id);
    const enderecos = s.enderecos || db.enderecos_atuacao?.filter(ea => ea.infrator_id === s.id) || [];
    const ocorrencias = s.ocorrencias || [];

    const tatSuspect = normalizeStr(fisicas?.tatuagens_detalhes);
    const cicSuspect = normalizeStr(fisicas?.cicatrizes);
    const sinSuspect = normalizeStr(fisicas?.sinais_particulares);
    const peleSuspect = normalizeStr(fisicas?.cor_pele);
    const compSuspect = normalizeStr(fisicas?.compleicao);

    // --- A. DIRECT NAME & VULGO MATCH ---
    let isDirectHit = false;
    if (nomeNorm && textNorm.includes(nomeNorm)) {
      isDirectHit = true;
      score += 85;
      fatoresConvergentes.push(`Nome completo ("${s.nome_completo}") citado explicitamente no relato do fato.`);
    } else {
      const parts = nomeNorm.split(/\s+/).filter(p => p.length > 2 && !['DOS', 'DAS', 'SILVA', 'SOUZA', 'SANTOS', 'OLIVEIRA'].includes(p));
      const matched = parts.filter(p => textNorm.includes(p));
      if (matched.length >= 2) {
        isDirectHit = true;
        score += 70;
        fatoresConvergentes.push(`Identificação nominal ("${matched.join(' ')}") presente no depoimento.`);
      } else if (matched.length === 1 && matched[0].length >= 5) {
        score += 35;
        fatoresConvergentes.push(`Menção a sobrenome distintivo ("${matched[0]}").`);
      }
    }

    if (vulgoNorm && vulgoNorm !== 'S/V' && vulgoNorm.length >= 3) {
      if (textNorm.includes(vulgoNorm) || textNorm.includes(`"${vulgoNorm}"`)) {
        isDirectHit = true;
        score += 75;
        fatoresConvergentes.push(`Alcunha/Vulgo "${s.vulgo}" citado diretamente como autor/envolvido.`);
      }
    }

    // --- B. TATTOOS MATCH (CARPA, PALHAÇO, CORINGA, TEIA, BRAÇO, PESCOÇO, ETC.) ---
    const tatTarget = filterTatNorm || (tatuagensExtracted ? normalizeStr(tatuagensExtracted) : '');
    if (tatTarget && tatSuspect) {
      const tatKeywords = ['PALHACO', 'CARPA', 'TEIA', 'CORINGA', 'ESCORPIAO', 'CAVEIRA', 'CRUZ', 'INDIA', 'ESTRELA', 'LAGRIMA', 'SAO JORGE', 'TIGRE', 'DRAGAO', 'BRACO', 'PESCOCO', 'MAO', 'PERNA', 'COSTAS', 'PEITO'];
      const matchedKeywords = tatKeywords.filter(k => tatTarget.includes(k) && tatSuspect.includes(k));
      if (matchedKeywords.length > 0) {
        score += 45;
        fatoresConvergentes.push(`Tatuagem coincidente no cadastro policial: ${matchedKeywords.join(', ')} (${fisicas.tatuagens_detalhes}).`);
      } else if (tatSuspect.includes(tatTarget) || tatTarget.includes(tatSuspect)) {
        score += 40;
        fatoresConvergentes.push(`Padrão de tatuagem compatível: "${fisicas.tatuagens_detalhes}".`);
      }
    } else if (tatSuspect && tatSuspect.length > 3) {
      // Check if text mentions words in suspect's tattoos
      const wordsInTat = tatSuspect.split(/[\s,.;]+/).filter(w => w.length > 3 && !['UMA', 'COM', 'LADO', 'PARTE'].includes(w));
      const matchedWords = wordsInTat.filter(w => textNorm.includes(w));
      if (matchedWords.length > 0) {
        score += 35;
        fatoresConvergentes.push(`Tatuagem descrita na ocorrência compatível com cadastro: "${fisicas.tatuagens_detalhes}".`);
      }
    }

    // --- C. SCARS & PARTICULAR SIGNS MATCH ---
    const cicTarget = filterCicNorm || (cicatrizesExtracted ? normalizeStr(cicatrizesExtracted) : '');
    if (cicTarget && cicSuspect) {
      if (cicSuspect.includes(cicTarget) || cicTarget.includes(cicSuspect) || hasAnyWord(cicTarget, ['ROSTO', 'TIRO', 'FACADA', 'PERNA', 'BRACO', 'QUEIMADURA'])) {
        score += 35;
        fatoresConvergentes.push(`Cicatriz compatível no prontuário: "${fisicas.cicatrizes}".`);
      }
    } else if (cicSuspect && cicSuspect.length > 3) {
      const wordsInCic = cicSuspect.split(/[\s,.;]+/).filter(w => w.length > 3);
      if (wordsInCic.some(w => textNorm.includes(w))) {
        score += 30;
        fatoresConvergentes.push(`Sinal/Cicatriz descrita confere com prontuário: "${fisicas.cicatrizes}".`);
      }
    }

    const sinTarget = filterSinNorm || (sinaisParticulares ? normalizeStr(sinaisParticulares) : '');
    if (sinTarget && sinSuspect) {
      if (sinSuspect.includes(sinTarget) || sinTarget.includes(sinSuspect)) {
        score += 30;
        fatoresConvergentes.push(`Sinal particular registrado: "${fisicas.sinais_particulares}".`);
      }
    }

    // --- D. PHYSICAL TRAITS (SKIN TONE, BODY BUILD, HEIGHT) ---
    if (filterPeleNorm && peleSuspect) {
      if (peleSuspect.includes(filterPeleNorm) || filterPeleNorm.includes(peleSuspect)) {
        score += 15;
        fatoresConvergentes.push(`Cor de pele compatível: ${fisicas.cor_pele}.`);
      } else {
        fatoresDivergentes.push(`Cor de pele divergente do filtro (Cadastrado: ${fisicas.cor_pele}).`);
      }
    } else if (peleExtracted && peleExtracted !== 'Não especificada' && peleSuspect) {
      if (normalizeStr(peleExtracted) === peleSuspect || peleSuspect.includes(normalizeStr(peleExtracted))) {
        score += 10;
        fatoresConvergentes.push(`Etnia/Pele compatível com o relato: ${fisicas.cor_pele}.`);
      }
    }

    if (filterCompNorm && compSuspect) {
      if (compSuspect.includes(filterCompNorm) || filterCompNorm.includes(compSuspect)) {
        score += 15;
        fatoresConvergentes.push(`Compleição física compatível: ${fisicas.compleicao}.`);
      }
    }

    // --- E. TERRITORIAL / NEIGHBORHOOD MATCH ---
    const targetBairro = filterBairroNorm || normalizeStr(bairro);
    const operatesInBairro = enderecos.some((e: any) => {
      const endBairro = normalizeStr(e.bairro);
      return endBairro && (endBairro.includes(targetBairro) || targetBairro.includes(endBairro));
    });

    if (operatesInBairro && targetBairro && targetBairro !== 'REGIAO DO 35O BPM') {
      score += 35;
      fatoresConvergentes.push(`Território: Atuação, residência ou ponto de venda confirmado no Bairro "${bairro}".`);
    } else if (enderecos.length > 0) {
      score += 10;
      fatoresConvergentes.push(`Atuação territorial mapeada na circunscrição do 35º BPM.`);
    }

    // --- F. GANG / FACTION ALIGNMENT ---
    if (filterFaccaoNorm && faccaoNorm) {
      if (faccaoNorm.includes(filterFaccaoNorm) || filterFaccaoNorm.includes(faccaoNorm)) {
        score += 40;
        fatoresConvergentes.push(`Vínculo de facção/gangue correspondente: "${s.gangue_faccao}".`);
      }
    } else if (faccaoNorm && faccaoNorm !== 'NENHUMA' && faccaoNorm !== 'SEM FACÇÃO') {
      const faccaoWords = faccaoNorm.replace(/GANGUE\s+DO\s+|GANGUE\s+DA\s+|GANGUE\s+|FACÇÃO\s+/g, '').trim();
      if (faccaoWords && textNorm.includes(faccaoWords)) {
        score += 35;
        fatoresConvergentes.push(`Infrator integra a facção apontada no evento: "${s.gangue_faccao}".`);
      }
    }

    // Specific 35º BPM Rivalries (Muleta vs Campão vs Palmital)
    if (/MULETA/i.test(text) && /MULETA/i.test(faccaoNorm)) {
      score += 35;
      fatoresConvergentes.push('Vínculo tático confirmado com a Gangue do Muleta.');
    }
    if (/CAMP[AÃ]O/i.test(text) && /CAMP[AÃ]O/i.test(faccaoNorm)) {
      score += 35;
      fatoresConvergentes.push('Vínculo tático confirmado com a Gangue do Campão.');
    }
    if (/PALMITAL/i.test(text) && /PALMITAL/i.test(faccaoNorm)) {
      score += 30;
      fatoresConvergentes.push('Vínculo tático com a célula do Palmital.');
    }

    // --- G. VEHICLES & WEAPONS USED IN PRIOR CRIMES ---
    const targetVeic = filterVeicNorm || normalizeStr(armasVeiculos);
    if (targetVeic && targetVeic.length > 2) {
      const hasVeicMatch = ocorrencias.some((o: any) => {
        const veicOc = normalizeStr(o.veiculo_utilizado);
        return veicOc && (veicOc.includes(targetVeic) || targetVeic.includes(veicOc) || (/MOTO/i.test(targetVeic) && /MOTO|TITAN|FAN|TWISTER/i.test(veicOc)));
      });
      if (hasVeicMatch) {
        score += 25;
        fatoresConvergentes.push(`Histórico de utilização de veículo similar em delitos anteriores.`);
      }
    }

    // --- H. CRIME REINCIDENCE & MODUS OPERANDI ---
    const hasHomicideHistory = ocorrencias.some((o: any) => /homic[ií]dio|matou|tentativa|execu/i.test(o.tipificacao_penal || ''));
    if (hasHomicideHistory && /homic[ií]dio/i.test(tipificacao)) {
      score += 20;
      fatoresConvergentes.push('Reincidência criminal: passagens anteriores por crimes contra a vida (Homicídio).');
    }

    const hasRobberyHistory = ocorrencias.some((o: any) => /roubo|assalto|157/i.test(o.tipificacao_penal || ''));
    if (hasRobberyHistory && /roubo/i.test(tipificacao)) {
      score += 20;
      fatoresConvergentes.push('Reincidência criminal: histórico de crimes patrimoniais violentos (Roubo).');
    }

    const hasTrafficHistory = ocorrencias.some((o: any) => /tr[aá]fico|entorpecente|33/i.test(o.tipificacao_penal || ''));
    if (hasTrafficHistory && /tr[aá]fico/i.test(tipificacao)) {
      score += 20;
      fatoresConvergentes.push('Reincidência: histórico de liderança/atuação no tráfico de drogas.');
    }

    // --- I. BNMP ARREST WARRANT & RISK LEVEL ---
    if (s.status_mandado_prisao) {
      score += 15;
      fatoresConvergentes.push('Infrator foragido da Justiça com Mandado de Prisão Ativo (BNMP).');
    }
    if (s.periculosidade === 'Extrema' || s.periculosidade === 'Alta') {
      score += 10;
      fatoresConvergentes.push(`Perfil de alta periculosidade tática (${s.periculosidade}).`);
    }

    // Base score for being an active monitored suspect in the battalion
    if (fatoresConvergentes.length > 0 && score < 30) {
      score = 30;
    }

    // Cap score at 98%
    score = Math.min(Math.max(score, 0), 98);

    if (fatoresConvergentes.length === 0) {
      fatoresDivergentes.push('Sem citação nominal ou correspondência imediata no relato inicial.');
      fatoresDivergentes.push('Sem registros prévios no mesmo endereço/bairro.');
    }

    let justificativa = '';
    let recomendacao = '';

    if (isDirectHit || score >= 80) {
      justificativa = `Alta probabilidade de autoria/coautoria. O infrator ${s.nome_completo} (${s.vulgo}) possui forte convergência tática com a dinâmica do fato, características físicas/tatuagens e vinculação ao grupo criminoso ${s.gangue_faccao || 'local'}.`;
      recomendacao = `Urgência Operacional: Solicitar mandado de busca e apreensão/prisão, intensificar patrulhamento velado e orientar guarnições do Tático Móvel e GEPMOR.`;
    } else if (score >= 50) {
      justificativa = `Compatibilidade tática relevante. Infrator possui atuação territorial mapeada no setor ou histórico de modus operandi similar.`;
      recomendacao = `Realizar checagem de álibi, monitorar pontos de venda de drogas vinculados e apresentar fotografia em álbum de reconhecimento.`;
    } else {
      justificativa = `Compatibilidade preliminar. Suspeito fichado na área de abrangência do 35º BPM.`;
      recomendacao = `Manter monitoramento de rotina e checagem de antecedentes durante abordagens.`;
    }

    // Include suspect if score > 20 or if user applied filters and suspect matched, or top candidates
    if (score >= 25 || isDirectHit || fatoresConvergentes.length > 0) {
      matchedSuspects.push({
        infrator_id: s.id,
        nome_completo: s.nome_completo,
        vulgo: s.vulgo || 'S/V',
        score_compatibilidade: score,
        fatores_convergentes: fatoresConvergentes.length > 0 ? fatoresConvergentes : ['Infrator fichado na área do 35º BPM'],
        fatores_divergentes: fatoresDivergentes,
        justificativa_analitica: justificativa,
        recomendacao_operacional: recomendacao,
        suspect_details: s
      });
    }
  }

  // Sort by highest compatibility
  matchedSuspects.sort((a, b) => b.score_compatibilidade - a.score_compatibilidade);

  // 6. Risk Assessment & Reincidence Alert
  const highestScore = matchedSuspects.length > 0 ? matchedSuspects[0].score_compatibilidade : 0;
  let nivelAlerta: 'ALTO' | 'MEDIO' | 'BAIXO' = 'MEDIO';
  let observacaoAlerta = '';

  if (highestScore >= 70 || /homic[ií]dio|execu[çc]|guerra|fac[çc][aã]o|amea[çc]as da gangue|disparos/i.test(text)) {
    nivelAlerta = 'ALTO';
    observacaoAlerta = `ALERTA VERMELHO: Ocorrência de alta gravidade no Bairro ${bairro}. Indicativo de ação violenta ou disputa armada entre células rivais (ex: Muleta / Campão). Recomendado reforço imediato de patrulhamento com Tático Móvel e GEPMOR.`;
  } else if (highestScore >= 45) {
    nivelAlerta = 'MEDIO';
    observacaoAlerta = `ALERTA AMARELO: Ocorrência tática relevante com suspeitos cadastrados atuantes no setor ${bairro}. Intensificar abordagens e monitoramento de esconderijos.`;
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
        pele: peleExtracted || 'Não especificada no texto',
        vestimentas: vestimentasExtracted,
        sinais_particulares: sinaisParticulares,
        tatuagens: tatuagensExtracted || 'Não declaradas',
        cicatrizes: cicatrizesExtracted || 'Não declaradas',
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
