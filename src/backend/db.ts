import { GangAreaZone, FotoInfrator, TipoFotoInfrator } from '../types';
import { DEFAULT_GANG_AREAS_35BPM } from '../utils/kmlGeoJsonParser';

// Types representing the database schema
export interface Infrator {
  id: string;
  nome_completo: string;
  vulgo: string;
  data_nascimento: string;
  cpf: string;
  foto_url: string;
  galeria_fotos?: FotoInfrator[];
  gangue_faccao: string;
  status_mandado_prisao: boolean;
  situacao_atual?: string;
  situacao_prisional?: string;
  periculosidade: 'Baixa' | 'Média' | 'Alta' | 'Extrema';
  created_at: string;
}

export interface CaracteristicasFisicas {
  infrator_id: string;
  altura_estimada: number; // in meters
  cor_pele: string;
  compleicao: 'Delgada' | 'Atlética' | 'Média' | 'Robusta' | 'Obesa';
  tatuagens_detalhes: string;
  cicatrizes: string;
  sinais_particulares: string;
}

export interface EnderecoAtuacao {
  id: string;
  infrator_id: string;
  tipo_endereco: 'Residência' | 'Ponto de Venda' | 'Área de Atuação' | 'Esconderijo';
  logradouro: string;
  bairro: string;
  cidade: string;
  geom_ponto: { lat: number; lng: number }; // point representation
  raio_influencia_km: number;
  infrator_nome?: string;
  infrator_vulgo?: string;
}

export interface OcorrenciaCriminal {
  id: string;
  numero_bo: string;
  data_hora: string;
  tipificacao_penal: string;
  descricao_fato: string;
  modus_operandi: string;
  armas_utilizadas: string;
  veiculo_utilizado: string;
  geom_crime: { lat: number; lng: number };
}

export interface InfratorOcorrencia {
  infrator_id: string;
  ocorrencia_id: string;
  papel_no_crime: string;
}

export interface VinculoComparsa {
  infrator_origem_id: string;
  infrator_destino_id: string;
  grau_relacao: 'Forte' | 'Média' | 'Fraca';
  historico_conjunto: string;
}

// In-Memory Database State
class CrimIntelDatabase {
  public infratores: Infrator[] = [];
  public caracteristicas_fisicas: CaracteristicasFisicas[] = [];
  public enderecos_atuacao: EnderecoAtuacao[] = [];
  public ocorrencias_criminais: OcorrenciaCriminal[] = [];
  public infrator_ocorrencia: InfratorOcorrencia[] = [];
  public vinculos_comparsas: VinculoComparsa[] = [];
  public gang_areas: GangAreaZone[] = [];

  constructor() {
    this.seedDatabase();
  }

  // Haversine distance calculation to emulate ST_DWithin
  public getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Base limpa e inicializada vazia para cadastros reais do usuário
  private seedDatabase() {
    this.infratores = [];
    this.caracteristicas_fisicas = [];
    this.enderecos_atuacao = [];
    this.ocorrencias_criminais = [];
    this.infrator_ocorrencia = [];
    this.vinculos_comparsas = [];
    this.gang_areas = [...DEFAULT_GANG_AREAS_35BPM];

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cachedOrcrim = window.localStorage.getItem('guardiao_orcrim_cache');
        if (cachedOrcrim) {
          const parsed = JSON.parse(cachedOrcrim);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.orcrim_organogramas = parsed;
          }
        }
      } catch (e) {}
    }
  }

  public getGangAreas(): GangAreaZone[] {
    return this.gang_areas;
  }

  public setGangAreas(areas: GangAreaZone[]): GangAreaZone[] {
    this.gang_areas = areas;
    return this.gang_areas;
  }

  public addGangArea(area: GangAreaZone): GangAreaZone {
    this.gang_areas.push(area);
    return area;
  }

  public removeGangArea(id: string): boolean {
    const prevLen = this.gang_areas.length;
    this.gang_areas = this.gang_areas.filter((a) => a.id !== id);
    return this.gang_areas.length < prevLen;
  }

  public resetGangAreas(): GangAreaZone[] {
    this.gang_areas = [...DEFAULT_GANG_AREAS_35BPM];
    return this.gang_areas;
  }

  // Database helper actions
  public getInfratorFull(id: string) {
    const infrator = this.infratores.find(i => i.id === id);
    if (!infrator) return null;
    const fisicas = this.caracteristicas_fisicas.find(cf => cf.infrator_id === id);
    const enderecos = this.enderecos_atuacao.filter(ea => ea.infrator_id === id);
    
    // Resolve occurrences from both relation table and embedded data
    const ocorrenciasRel = this.infrator_ocorrencia.filter(io => io.infrator_id === id);
    const ocorrenciasMap = new Map<string, any>();

    ocorrenciasRel.forEach(rel => {
      const oc = this.ocorrencias_criminais.find(o => o.id === rel.ocorrencia_id || (o.numero_bo && o.numero_bo === rel.ocorrencia_id));
      if (oc) {
        ocorrenciasMap.set(oc.id, {
          ...oc,
          papel: rel.papel_no_crime || 'Autor'
        });
      }
    });

    const embedded = (infrator as any).ocorrencias;
    if (Array.isArray(embedded) && embedded.length > 0) {
      embedded.forEach((emb: any) => {
        if (!emb) return;
        const ocId = emb.id || emb.numero_bo;
        if (ocId && !ocorrenciasMap.has(ocId)) {
          ocorrenciasMap.set(ocId, {
            ...emb,
            papel: emb.papel || emb.papel_no_crime || 'Autor'
          });
        }
      });
    }

    const ocorrencias = Array.from(ocorrenciasMap.values());

    const comparsasOrigem = this.vinculos_comparsas.filter(v => v.infrator_origem_id === id).map(v => {
      const comp = this.infratores.find(i => i.id === v.infrator_destino_id);
      return { comparsa: comp, grau: v.grau_relacao, historico: v.historico_conjunto, tipo_vinculo: 'MANUAL' };
    });
    const comparsasDestino = this.vinculos_comparsas.filter(v => v.infrator_destino_id === id).map(v => {
      const comp = this.infratores.find(i => i.id === v.infrator_origem_id);
      return { comparsa: comp, grau: v.grau_relacao, historico: v.historico_conjunto, tipo_vinculo: 'MANUAL' };
    });

    // Detect suspect linkages via shared police records (B.O.s)
    const boMap = new Map<string, any>();
    
    // Check through all occurrences of this suspect
    ocorrencias.forEach((oc: any) => {
      if (!oc) return;
      const ocId = oc.id;
      const ocBo = oc.numero_bo;
      const myPapel = oc.papel || 'Autor';

      // Find other suspects linked to this same occurrence or matching BO number
      this.infrator_ocorrencia.forEach(io => {
        if (io.infrator_id !== id) {
          const matchByOcId = ocId && (io.ocorrencia_id === ocId);
          let matchByBo = false;
          if (!matchByOcId && ocBo) {
            const targetOc = this.ocorrencias_criminais.find(o => o.id === io.ocorrencia_id);
            if (targetOc && targetOc.numero_bo === ocBo) {
              matchByBo = true;
            }
          }

          if (matchByOcId || matchByBo) {
            const otherSuspect = this.infratores.find(i => i.id === io.infrator_id);
            if (otherSuspect) {
              const existing = boMap.get(otherSuspect.id) || {
                comparsa: otherSuspect,
                grau: 'Forte (Co-autoria)',
                tipo_vinculo: 'REGISTRO_POLICIAL',
                shared_bos: []
              };

              // Avoid duplicate BO entry
              if (!existing.shared_bos.some((b: any) => b.numero_bo === oc.numero_bo)) {
                existing.shared_bos.push({
                  numero_bo: oc.numero_bo || 'S/N',
                  tipificacao_penal: oc.tipificacao_penal || 'Não informada',
                  data_hora: oc.data_hora,
                  papel_infrator: myPapel,
                  papel_comparsa: io.papel_no_crime || 'Autor',
                  modus_operandi: oc.modus_operandi || 'Padrão conjunto'
                });
              }

              existing.historico = `Co-envolvido(s) em ${existing.shared_bos.length} B.O.(s): ` + 
                existing.shared_bos.map((b: any) => `B.O. ${b.numero_bo} (${b.tipificacao_penal} - ${b.papel_comparsa})`).join('; ');

              boMap.set(otherSuspect.id, existing);
            }
          }
        }
      });
    });

    // Merge manual and shared-BO comparsas deduplicated
    const mergedComparsasMap = new Map<string, any>();

    // Add manual comparsas
    [...comparsasOrigem, ...comparsasDestino].forEach(c => {
      if (c && c.comparsa && c.comparsa.id) {
        mergedComparsasMap.set(c.comparsa.id, c);
      }
    });

    // Merge shared-BO comparsas
    Array.from(boMap.values()).forEach(boComp => {
      if (boComp && boComp.comparsa && boComp.comparsa.id) {
        const prev = mergedComparsasMap.get(boComp.comparsa.id);
        if (prev) {
          mergedComparsasMap.set(boComp.comparsa.id, {
            ...prev,
            ...boComp,
            grau: 'Forte (Co-autoria & Vínculo)',
            historico: `${prev.historico ? prev.historico + ' | ' : ''}${boComp.historico}`
          });
        } else {
          mergedComparsasMap.set(boComp.comparsa.id, boComp);
        }
      }
    });

    const comparsas = Array.from(mergedComparsasMap.values());
    const vinculos_policiais_cruzados = Array.from(boMap.values());

    const galeria_fotos = infrator.galeria_fotos && infrator.galeria_fotos.length > 0
      ? infrator.galeria_fotos
      : (infrator.foto_url ? [{
          id: `foto-${infrator.id}-main`,
          url: infrator.foto_url,
          tipo: 'ROSTO',
          descricao: 'Foto Principal',
          principal: true,
          data_inclusao: infrator.created_at
        }] : []);

    return {
      ...infrator,
      foto_url: infrator.foto_url || (galeria_fotos.find(f => f.principal)?.url || galeria_fotos[0]?.url) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop',
      galeria_fotos,
      fisicas,
      enderecos,
      ocorrencias,
      comparsas,
      vinculos_policiais_cruzados
    };
  }

  public addInfrator(data: any): any {
    const id = data.id || `inf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const situacao = data.situacao_atual || data.situacao_prisional || (data.status_mandado_prisao ? 'FORAGIDO' : 'EM_LIBERDADE');
    const isMandado = !!data.status_mandado_prisao || situacao === 'FORAGIDO';

    let galeria_fotos: FotoInfrator[] = [];
    if (Array.isArray(data.galeria_fotos) && data.galeria_fotos.length > 0) {
      galeria_fotos = data.galeria_fotos.map((f: any, idx: number) => ({
        id: f.id || `foto-${Date.now()}-${idx}`,
        url: f.url || f,
        tipo: f.tipo || 'ROSTO',
        descricao: f.descricao || '',
        principal: !!f.principal,
        data_inclusao: f.data_inclusao || new Date().toISOString()
      }));
    } else if (data.foto_url) {
      galeria_fotos = [{
        id: `foto-${Date.now()}-main`,
        url: data.foto_url,
        tipo: 'ROSTO',
        descricao: 'Foto Principal',
        principal: true,
        data_inclusao: new Date().toISOString()
      }];
    }

    // Ensure at least one photo is marked as principal if any exist
    if (galeria_fotos.length > 0 && !galeria_fotos.some(f => f.principal)) {
      galeria_fotos[0].principal = true;
    }

    const principalPhoto = galeria_fotos.find(f => f.principal) || galeria_fotos[0];
    const mainPhotoUrl = data.foto_url || principalPhoto?.url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop';

    const newInfrator: Infrator = {
      id,
      nome_completo: data.nome_completo,
      vulgo: data.vulgo || 'S/V',
      data_nascimento: data.data_nascimento || '1990-01-01',
      cpf: data.cpf || '000.000.000-00',
      foto_url: mainPhotoUrl,
      galeria_fotos,
      gangue_faccao: data.gangue_faccao || 'Nenhuma',
      status_mandado_prisao: isMandado,
      situacao_atual: situacao,
      situacao_prisional: situacao,
      periculosidade: data.periculosidade || 'Média',
      created_at: new Date().toISOString()
    };

    const newFisicas: CaracteristicasFisicas = {
      infrator_id: id,
      altura_estimada: Number(data.altura_estimada) || 1.75,
      cor_pele: data.cor_pele || 'Parda',
      compleicao: data.compleicao || 'Média',
      tatuagens_detalhes: data.tatuagens_detalhes || 'Sem tatuagens cadastradas',
      cicatrizes: data.cicatrizes || 'Sem cicatrizes cadastradas',
      sinais_particulares: data.sinais_particulares || 'Sem sinais particulares cadastrados'
    };

    this.infratores.unshift(newInfrator);
    this.caracteristicas_fisicas.unshift(newFisicas);

    // Process attached addresses (multiple addresses supported)
    if (Array.isArray(data.enderecos) && data.enderecos.length > 0) {
      const seenLogr = new Set<string>();
      for (const end of data.enderecos) {
        if (end.logradouro && end.logradouro.trim()) {
          const key = `${(end.tipo_endereco || 'Residência').toLowerCase()}|${end.logradouro.trim().toLowerCase()}`;
          if (seenLogr.has(key)) continue;
          seenLogr.add(key);

          this.addEndereco({
            infrator_id: id,
            tipo_endereco: end.tipo_endereco || 'Residência',
            logradouro: end.logradouro.trim(),
            bairro: end.bairro || 'Centro',
            cidade: end.cidade || 'Santa Luzia',
            raio_influencia_km: Number(end.raio_influencia_km) || 2.5,
            lat: end.lat !== undefined && !isNaN(Number(end.lat)) ? Number(end.lat) : -19.7712,
            lng: end.lng !== undefined && !isNaN(Number(end.lng)) ? Number(end.lng) : -43.8564
          });
        }
      }
    }

    if (Array.isArray(data.ocorrencias) && data.ocorrencias.length > 0) {
      for (const item of data.ocorrencias) {
        const papel = item.papel_no_crime || item.papel || 'Autor';
        if (item.ocorrencia_id) {
          this.infrator_ocorrencia.push({
            infrator_id: id,
            ocorrencia_id: item.ocorrencia_id,
            papel_no_crime: papel
          });
        } else if (item.numero_bo && item.tipificacao_penal) {
          const ocId = `oc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const createdOc: OcorrenciaCriminal = {
            id: ocId,
            numero_bo: item.numero_bo,
            data_hora: item.data_hora || new Date().toISOString(),
            tipificacao_penal: item.tipificacao_penal,
            descricao_fato: item.descricao_fato || `Ocorrência registrada referente a ${item.tipificacao_penal} com participação de ${newInfrator.nome_completo} como ${papel}.`,
            modus_operandi: item.modus_operandi || 'Padrão em apuração',
            armas_utilizadas: item.armas_utilizadas || 'Não informada',
            veiculo_utilizado: item.veiculo_utilizado || 'Não informado',
            geom_crime: {
              lat: item.lat !== undefined && !isNaN(Number(item.lat)) ? Number(item.lat) : -19.7712,
              lng: item.lng !== undefined && !isNaN(Number(item.lng)) ? Number(item.lng) : -43.8564
            }
          };
          this.ocorrencias_criminais.unshift(createdOc);
          this.infrator_ocorrencia.push({
            infrator_id: id,
            ocorrencia_id: ocId,
            papel_no_crime: papel
          });
        }
      }
    }

    return this.getInfratorFull(id);
  }

  public addOcorrencia(data: any): OcorrenciaCriminal {
    const id = data.id || `oc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newOc: OcorrenciaCriminal = {
      id,
      numero_bo: data.numero_bo,
      data_hora: data.data_hora || new Date().toISOString(),
      tipificacao_penal: data.tipificacao_penal,
      descricao_fato: data.descricao_fato || data.modus_operandi || 'Ocorrência registrada no sistema.',
      modus_operandi: data.modus_operandi || 'Em apuração',
      armas_utilizadas: data.armas_utilizadas || 'Não informada',
      veiculo_utilizado: data.veiculo_utilizado || 'Não informado',
      geom_crime: {
        lat: data.lat !== undefined && !isNaN(Number(data.lat)) ? Number(data.lat) : (data.geom_crime?.lat ?? -19.7712),
        lng: data.lng !== undefined && !isNaN(Number(data.lng)) ? Number(data.lng) : (data.geom_crime?.lng ?? -43.8564)
      }
    };
    this.ocorrencias_criminais.unshift(newOc);
    return newOc;
  }

  public addEndereco(data: any): EnderecoAtuacao {
    const logrNorm = (data.logradouro || '').trim().toLowerCase();
    const tipoNorm = (data.tipo_endereco || 'Residência').trim().toLowerCase();
    const existing = this.enderecos_atuacao.find(
      ea => ea.infrator_id === data.infrator_id &&
            (ea.tipo_endereco || '').trim().toLowerCase() === tipoNorm &&
            (ea.logradouro || '').trim().toLowerCase() === logrNorm
    );
    if (existing) {
      return existing;
    }

    const id = data.id || `end-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const inf = this.infratores.find(i => i.id === data.infrator_id);
    const newEnd: EnderecoAtuacao = {
      id,
      infrator_id: data.infrator_id,
      tipo_endereco: data.tipo_endereco || 'Residência',
      logradouro: data.logradouro || 'Não informado',
      bairro: data.bairro || 'Centro',
      cidade: data.cidade || 'Santa Luzia',
      raio_influencia_km: Number(data.raio_influencia_km) || 2.5,
      geom_ponto: {
        lat: data.lat !== undefined && !isNaN(Number(data.lat)) ? Number(data.lat) : (data.geom_ponto?.lat ?? -19.7712),
        lng: data.lng !== undefined && !isNaN(Number(data.lng)) ? Number(data.lng) : (data.geom_ponto?.lng ?? -43.8564)
      },
      infrator_nome: data.infrator_nome || inf?.nome_completo,
      infrator_vulgo: data.infrator_vulgo || inf?.vulgo
    };
    this.enderecos_atuacao.unshift(newEnd);
    return newEnd;
  }

  public linkInfratorOcorrencia(infrator_id: string, ocorrencia_id: string, papel_no_crime: string = 'Autor'): boolean {
    const oc = this.ocorrencias_criminais.find(o => o.id === ocorrencia_id || o.numero_bo === ocorrencia_id);
    const targetId = oc?.id || ocorrencia_id;
    const targetBo = oc?.numero_bo;

    const exists = this.infrator_ocorrencia.some(
      io => io.infrator_id === infrator_id && (io.ocorrencia_id === targetId || io.ocorrencia_id === ocorrencia_id || (targetBo && io.ocorrencia_id === targetBo))
    );
    if (exists) {
      const item = this.infrator_ocorrencia.find(
        io => io.infrator_id === infrator_id && (io.ocorrencia_id === targetId || io.ocorrencia_id === ocorrencia_id || (targetBo && io.ocorrencia_id === targetBo))
      );
      if (item) {
        item.ocorrencia_id = targetId;
        item.papel_no_crime = papel_no_crime;
      }
      return true;
    }
    this.infrator_ocorrencia.push({
      infrator_id,
      ocorrencia_id: targetId,
      papel_no_crime
    });
    return true;
  }

  public unlinkInfratorOcorrencia(infrator_id: string, ocorrencia_id: string): boolean {
    const oc = this.ocorrencias_criminais.find(o => o.id === ocorrencia_id || o.numero_bo === ocorrencia_id);
    const targetId = oc?.id || ocorrencia_id;
    const targetBo = oc?.numero_bo;

    // Remove from relational table
    this.infrator_ocorrencia = this.infrator_ocorrencia.filter(
      io => !(io.infrator_id === infrator_id && (io.ocorrencia_id === targetId || io.ocorrencia_id === ocorrencia_id || (targetBo && io.ocorrencia_id === targetBo)))
    );

    // Remove from embedded array in target infrator if present
    const infrator = this.infratores.find(i => i.id === infrator_id);
    if (infrator && Array.isArray((infrator as any).ocorrencias)) {
      (infrator as any).ocorrencias = (infrator as any).ocorrencias.filter(
        (o: any) => o && o.id !== targetId && o.id !== ocorrencia_id && (!targetBo || o.numero_bo !== targetBo)
      );
    }

    return true;
  }

  public getInfratorOcorrenciaLinks(): InfratorOcorrencia[] {
    return [...this.infrator_ocorrencia];
  }

  public deleteInfrator(id: string): boolean {
    const index = this.infratores.findIndex(i => i.id === id);
    if (index === -1) return false;

    // Remove from main table
    this.infratores.splice(index, 1);

    // Remove associated physical characteristics
    this.caracteristicas_fisicas = this.caracteristicas_fisicas.filter(cf => cf.infrator_id !== id);

    // Remove associated addresses
    this.enderecos_atuacao = this.enderecos_atuacao.filter(ea => ea.infrator_id !== id);

    // Remove occurrence links
    this.infrator_ocorrencia = this.infrator_ocorrencia.filter(io => io.infrator_id !== id);

    // Remove associate links
    this.vinculos_comparsas = this.vinculos_comparsas.filter(
      vc => vc.infrator_origem_id !== id && vc.infrator_destino_id !== id
    );

    // Remove from ORCRIM organograms if present
    if (this.orcrim_organogramas.length > 0) {
      for (const org of this.orcrim_organogramas) {
        if (org.nivel_1_lideranca) {
          org.nivel_1_lideranca = org.nivel_1_lideranca.filter((m: any) => m.infrator_id !== id);
        }
        if (org.nivel_2_gerencia) {
          org.nivel_2_gerencia = org.nivel_2_gerencia.filter((m: any) => m.infrator_id !== id);
        }
        if (org.nivel_3_operacional) {
          org.nivel_3_operacional = org.nivel_3_operacional.filter((m: any) => m.infrator_id !== id);
        }
      }
    }

    return true;
  }

  public deleteOcorrencia(id: string): boolean {
    const oc = this.ocorrencias_criminais.find(o => o.id === id || o.numero_bo === id);
    const targetId = oc?.id || id;
    const targetBo = oc?.numero_bo;

    // Remove from occurrences table
    this.ocorrencias_criminais = this.ocorrencias_criminais.filter(
      o => o.id !== targetId && o.id !== id && (!targetBo || o.numero_bo !== targetBo)
    );

    // Remove all suspect linkages to this occurrence
    this.infrator_ocorrencia = this.infrator_ocorrencia.filter(
      io => io.ocorrencia_id !== targetId && io.ocorrencia_id !== id && (!targetBo || io.ocorrencia_id !== targetBo)
    );

    // Clean up embedded occurrences from all infratores
    this.infratores.forEach((inf) => {
      if (Array.isArray((inf as any).ocorrencias)) {
        (inf as any).ocorrencias = (inf as any).ocorrencias.filter(
          (o: any) => o && o.id !== targetId && o.id !== id && (!targetBo || o.numero_bo !== targetBo)
        );
      }
    });

    return true;
  }

  public updateInfrator(id: string, data: any): any {
    const infratorIndex = this.infratores.findIndex(i => i.id === id);
    if (infratorIndex === -1) return null;

    const situacaoFinal = data.situacao_atual || data.situacao_prisional;

    let updatedGaleria = data.galeria_fotos !== undefined ? data.galeria_fotos : this.infratores[infratorIndex].galeria_fotos;
    let mainPhotoUrl = data.foto_url || this.infratores[infratorIndex].foto_url;

    if (Array.isArray(updatedGaleria) && updatedGaleria.length > 0) {
      const principal = updatedGaleria.find((f: any) => f.principal);
      if (principal && principal.url) {
        mainPhotoUrl = principal.url;
      } else if (!mainPhotoUrl && updatedGaleria[0]?.url) {
        mainPhotoUrl = updatedGaleria[0].url;
      }
    }

    this.infratores[infratorIndex] = {
      ...this.infratores[infratorIndex],
      nome_completo: data.nome_completo || this.infratores[infratorIndex].nome_completo,
      vulgo: data.vulgo !== undefined ? data.vulgo : this.infratores[infratorIndex].vulgo,
      data_nascimento: data.data_nascimento || this.infratores[infratorIndex].data_nascimento,
      cpf: data.cpf || this.infratores[infratorIndex].cpf,
      foto_url: mainPhotoUrl,
      galeria_fotos: updatedGaleria,
      gangue_faccao: data.gangue_faccao !== undefined ? data.gangue_faccao : this.infratores[infratorIndex].gangue_faccao,
      status_mandado_prisao: data.status_mandado_prisao !== undefined ? !!data.status_mandado_prisao : (situacaoFinal === 'FORAGIDO' ? true : this.infratores[infratorIndex].status_mandado_prisao),
      situacao_atual: situacaoFinal || this.infratores[infratorIndex].situacao_atual,
      situacao_prisional: situacaoFinal || this.infratores[infratorIndex].situacao_prisional,
      periculosidade: data.periculosidade || this.infratores[infratorIndex].periculosidade,
    };

    const fisIndex = this.caracteristicas_fisicas.findIndex(cf => cf.infrator_id === id);
    const fisData = data.fisicas || data;
    if (fisIndex !== -1) {
      this.caracteristicas_fisicas[fisIndex] = {
        infrator_id: id,
        altura_estimada: fisData.altura_estimada !== undefined ? Number(fisData.altura_estimada) : this.caracteristicas_fisicas[fisIndex].altura_estimada,
        cor_pele: fisData.cor_pele || this.caracteristicas_fisicas[fisIndex].cor_pele,
        compleicao: fisData.compleicao || this.caracteristicas_fisicas[fisIndex].compleicao,
        tatuagens_detalhes: fisData.tatuagens_detalhes !== undefined ? fisData.tatuagens_detalhes : this.caracteristicas_fisicas[fisIndex].tatuagens_detalhes,
        cicatrizes: fisData.cicatrizes !== undefined ? fisData.cicatrizes : this.caracteristicas_fisicas[fisIndex].cicatrizes,
        sinais_particulares: fisData.sinais_particulares !== undefined ? fisData.sinais_particulares : this.caracteristicas_fisicas[fisIndex].sinais_particulares,
      };
    } else {
      this.caracteristicas_fisicas.push({
        infrator_id: id,
        altura_estimada: Number(fisData.altura_estimada) || 1.75,
        cor_pele: fisData.cor_pele || 'Parda',
        compleicao: fisData.compleicao || 'Média',
        tatuagens_detalhes: fisData.tatuagens_detalhes || 'Sem tatuagens cadastradas',
        cicatrizes: fisData.cicatrizes || 'Sem cicatrizes cadastradas',
        sinais_particulares: fisData.sinais_particulares || 'Sem sinais particulares cadastrados'
      });
    }

    // Process updated addresses if provided
    if (Array.isArray(data.enderecos)) {
      this.enderecos_atuacao = this.enderecos_atuacao.filter(ea => ea.infrator_id !== id);
      for (const end of data.enderecos) {
        if (end.logradouro && end.logradouro.trim()) {
          this.addEndereco({
            ...end,
            infrator_id: id
          });
        }
      }
    }

    // Process updated occurrences if provided
    if (Array.isArray(data.ocorrencias)) {
      this.infrator_ocorrencia = this.infrator_ocorrencia.filter(io => io.infrator_id !== id);
      for (const item of data.ocorrencias) {
        const papel = item.papel_no_crime || item.papel || 'Autor';
        if (item.ocorrencia_id) {
          this.linkInfratorOcorrencia(id, item.ocorrencia_id, papel);
        } else if (item.numero_bo && item.tipificacao_penal) {
          const newOc = this.addOcorrencia(item);
          this.linkInfratorOcorrencia(id, newOc.id, papel);
        }
      }
    }

    return this.getInfratorFull(id);
  }

  public addPhotoToInfrator(infratorId: string, photo: Partial<FotoInfrator>): any {
    const infrator = this.infratores.find(i => i.id === infratorId);
    if (!infrator) return null;

    if (!infrator.galeria_fotos) {
      infrator.galeria_fotos = infrator.foto_url ? [{
        id: `foto-${infrator.id}-main`,
        url: infrator.foto_url,
        tipo: 'ROSTO',
        descricao: 'Foto Principal',
        principal: true,
        data_inclusao: infrator.created_at
      }] : [];
    }

    const newPhoto: FotoInfrator = {
      id: photo.id || `foto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url: photo.url || '',
      tipo: photo.tipo || 'ROSTO',
      descricao: photo.descricao || '',
      principal: !!photo.principal || infrator.galeria_fotos.length === 0,
      data_inclusao: photo.data_inclusao || new Date().toISOString()
    };

    if (newPhoto.principal) {
      infrator.galeria_fotos.forEach(f => { f.principal = false; });
      infrator.foto_url = newPhoto.url;
    }

    infrator.galeria_fotos.push(newPhoto);
    return this.getInfratorFull(infratorId);
  }

  public setPrimaryPhotoInfrator(infratorId: string, photoId: string): any {
    const infrator = this.infratores.find(i => i.id === infratorId);
    if (!infrator || !infrator.galeria_fotos) return null;

    let targetFound = false;
    infrator.galeria_fotos.forEach(f => {
      if (f.id === photoId || f.url === photoId) {
        f.principal = true;
        infrator.foto_url = f.url;
        targetFound = true;
      } else {
        f.principal = false;
      }
    });

    if (!targetFound && infrator.galeria_fotos.length > 0) {
      infrator.galeria_fotos[0].principal = true;
      infrator.foto_url = infrator.galeria_fotos[0].url;
    }

    return this.getInfratorFull(infratorId);
  }

  public removePhotoFromInfrator(infratorId: string, photoId: string): any {
    const infrator = this.infratores.find(i => i.id === infratorId);
    if (!infrator || !infrator.galeria_fotos) return null;

    const removedWasPrincipal = infrator.galeria_fotos.some(f => (f.id === photoId || f.url === photoId) && f.principal);
    infrator.galeria_fotos = infrator.galeria_fotos.filter(f => f.id !== photoId && f.url !== photoId);

    if (removedWasPrincipal && infrator.galeria_fotos.length > 0) {
      infrator.galeria_fotos[0].principal = true;
      infrator.foto_url = infrator.galeria_fotos[0].url;
    } else if (infrator.galeria_fotos.length === 0) {
      infrator.foto_url = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop';
    }

    return this.getInfratorFull(infratorId);
  }

  // ORCRIM Organograms Repository
  public orcrim_organogramas: any[] = [];

  public getOrcrimOrganogramas(): any[] {
    return this.orcrim_organogramas;
  }

  public getOrcrimById(id: string): any {
    const list = this.getOrcrimOrganogramas();
    return list.find(o => o.id === id || o.gangue_info?.nome_gangue?.toLowerCase() === id.toLowerCase()) || null;
  }

  public saveOrcrim(orcrim: any): any {
    const existingIndex = this.orcrim_organogramas.findIndex(o => o.id === orcrim.id || o.gangue_info?.nome_gangue === orcrim.gangue_info?.nome_gangue);
    let result: any;
    if (existingIndex >= 0) {
      this.orcrim_organogramas[existingIndex] = { ...this.orcrim_organogramas[existingIndex], ...orcrim };
      result = this.orcrim_organogramas[existingIndex];
    } else {
      const newOrcrim = {
        id: orcrim.id || (orcrim.gangue_info?.nome_gangue ? `orcrim-${orcrim.gangue_info.nome_gangue.toLowerCase().replace(/[^a-z0-9]/gi, '_')}` : `orcrim-${Date.now()}`),
        ...orcrim
      };
      this.orcrim_organogramas.push(newOrcrim);
      result = newOrcrim;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('guardiao_orcrim_cache', JSON.stringify(this.orcrim_organogramas));
        if (result && result.id) {
          window.localStorage.setItem('guardiao_last_selected_orcrim', result.id);
        }
      } catch (e) {}
    }

    return result;
  }

  public deleteOrcrim(id: string): boolean {
    const initialLen = this.orcrim_organogramas.length;
    this.orcrim_organogramas = this.orcrim_organogramas.filter(
      o => o.id !== id && o.gangue_info?.nome_gangue?.toLowerCase() !== id.toLowerCase()
    );
    const changed = this.orcrim_organogramas.length < initialLen;

    if (changed && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('guardiao_orcrim_cache', JSON.stringify(this.orcrim_organogramas));
        const lastSelected = window.localStorage.getItem('guardiao_last_selected_orcrim');
        if (lastSelected === id) {
          window.localStorage.removeItem('guardiao_last_selected_orcrim');
        }
      } catch (e) {}
    }

    return changed;
  }

  // Get network graph
  public getNetworkGraph(): { nodes: any[]; edges: any[] } {
    const nodes: any[] = [];
    const edges: any[] = [];

    // Add Suspect Nodes
    this.infratores.forEach(i => {
      const cleanGang = (i.gangue_faccao || '').trim();
      const lower = cleanGang.toLowerCase();
      const hasGangAffiliation = Boolean(
        cleanGang &&
        lower !== 'nenhuma' &&
        lower !== 'sem facção' &&
        lower !== 'sem faccao' &&
        lower !== 'sem facção informada' &&
        lower !== 'não informada' &&
        lower !== 'nao informada' &&
        lower !== 'apurando vínculo' &&
        lower !== 'apurando vinculo' &&
        lower !== 'infratores sem gangue' &&
        lower !== 'sem gangue'
      );
      const gangDisplayName = hasGangAffiliation ? cleanGang : 'Infratores sem gangue';

      nodes.push({
        id: i.id,
        label: `${i.nome_completo} (${i.vulgo})`,
        type: 'suspect',
        gang: gangDisplayName,
        has_gang: hasGangAffiliation,
        periculosidade: i.periculosidade,
        mandado: i.status_mandado_prisao,
        foto_url: i.foto_url
      });
    });

    // Add Crime Incident Nodes
    this.ocorrencias_criminais.forEach(o => {
      nodes.push({
        id: o.id,
        label: `${o.numero_bo} - ${o.tipificacao_penal}`,
        type: 'incident',
        tipificacao: o.tipificacao_penal,
        data: o.data_hora,
        numero_bo: o.numero_bo,
        modus_operandi: o.modus_operandi,
        descricao_fato: o.descricao_fato,
        armas_utilizadas: o.armas_utilizadas,
        veiculo_utilizado: o.veiculo_utilizado
      });
    });

    // Add Edges from infrator_ocorrencia
    this.infrator_ocorrencia.forEach(io => {
      edges.push({
        source: io.infrator_id,
        target: io.ocorrencia_id,
        type: 'participated',
        label: io.papel_no_crime,
        color: '#dc2626'
      });
    });

    // Add Edges from vinculos_comparsas
    this.vinculos_comparsas.forEach(v => {
      edges.push({
        source: v.infrator_origem_id,
        target: v.infrator_destino_id,
        type: 'comparsa',
        label: `Grau: ${v.grau_relacao}`,
        description: v.historico_conjunto,
        color: '#2563eb',
        width: v.grau_relacao === 'Forte' ? 3 : v.grau_relacao === 'Média' ? 2 : 1
      });
    });

    // Detect and Add direct suspect-to-suspect Co-autoria / Shared Police Record (B.O.) Edges
    const coAutoriaPairMap = new Map<string, { suspectA: string; suspectB: string; sharedBos: any[] }>();

    // Group infrator_ocorrencia by ocorrencia_id or matching B.O. number
    const ocToSuspects = new Map<string, { infrator_id: string; papel: string; bo: any }[]>();

    this.infrator_ocorrencia.forEach(io => {
      const oc = this.ocorrencias_criminais.find(o => o.id === io.ocorrencia_id);
      const boKey = oc?.numero_bo || io.ocorrencia_id;
      if (!ocToSuspects.has(boKey)) {
        ocToSuspects.set(boKey, []);
      }
      ocToSuspects.get(boKey)!.push({
        infrator_id: io.infrator_id,
        papel: io.papel_no_crime,
        bo: oc || { numero_bo: boKey, tipificacao_penal: 'Ocorrência Criminal' }
      });
    });

    ocToSuspects.forEach((suspectList) => {
      if (suspectList.length > 1) {
        for (let i = 0; i < suspectList.length; i++) {
          for (let j = i + 1; j < suspectList.length; j++) {
            const s1 = suspectList[i];
            const s2 = suspectList[j];
            if (s1.infrator_id === s2.infrator_id) continue;

            const pairKey = [s1.infrator_id, s2.infrator_id].sort().join('___');
            if (!coAutoriaPairMap.has(pairKey)) {
              coAutoriaPairMap.set(pairKey, {
                suspectA: s1.infrator_id,
                suspectB: s2.infrator_id,
                sharedBos: []
              });
            }

            const pairObj = coAutoriaPairMap.get(pairKey)!;
            const alreadyHasBo = pairObj.sharedBos.some(b => b.numero_bo === s1.bo.numero_bo);
            if (!alreadyHasBo) {
              pairObj.sharedBos.push({
                numero_bo: s1.bo.numero_bo,
                tipificacao_penal: s1.bo.tipificacao_penal,
                data_hora: s1.bo.data_hora,
                papelA: s1.papel,
                papelB: s2.papel
              });
            }
          }
        }
      }
    });

    // Add high-visibility golden-amber Co-autoria edges
    coAutoriaPairMap.forEach(({ suspectA, suspectB, sharedBos }) => {
      const boCount = sharedBos.length;
      const infA = this.infratores.find(i => i.id === suspectA);
      const infB = this.infratores.find(i => i.id === suspectB);

      const boDescriptions = sharedBos.map(b => 
        `• B.O. Nº ${b.numero_bo} (${b.tipificacao_penal}): ${infA?.vulgo || 'Suspeito A'} [${b.papelA}] e ${infB?.vulgo || 'Suspeito B'} [${b.papelB}]`
      ).join('\n');

      edges.push({
        source: suspectA,
        target: suspectB,
        type: 'coautoria',
        label: `B.O. Compartilhado (${boCount})`,
        description: `Vínculo em Registro Policial (${boCount} B.O.s compartilhados):\n${boDescriptions}`,
        color: '#f59e0b',
        width: boCount > 1 ? 4 : 3,
        shared_bos: sharedBos
      });
    });

    return { nodes, edges };
  }

  // Get matching suspects based on radius buffer and modus operandi/physical characteristics
  public matchSuspectsInRadius(lat: number, lng: number, radiusKm: number): any[] {
    const matchedEnderecos = this.enderecos_atuacao.filter(ea => {
      const d = this.getDistanceKm(lat, lng, ea.geom_ponto.lat, ea.geom_ponto.lng);
      return d <= (radiusKm + ea.raio_influencia_km);
    });

    const uniqueInfratorIds = Array.from(new Set(matchedEnderecos.map(ea => ea.infrator_id)));
    return uniqueInfratorIds.map(id => this.getInfratorFull(id)).filter(Boolean);
  }
}

export const db = new CrimIntelDatabase();

