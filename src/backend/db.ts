// Types representing the database schema
export interface Infrator {
  id: string;
  nome_completo: string;
  vulgo: string;
  data_nascimento: string;
  cpf: string;
  foto_url: string;
  gangue_faccao: string;
  status_mandado_prisao: boolean;
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
  }

  // Database helper actions
  public getInfratorFull(id: string) {
    const infrator = this.infratores.find(i => i.id === id);
    if (!infrator) return null;
    const fisicas = this.caracteristicas_fisicas.find(cf => cf.infrator_id === id);
    const enderecos = this.enderecos_atuacao.filter(ea => ea.infrator_id === id);
    const ocorrenciasRel = this.infrator_ocorrencia.filter(io => io.infrator_id === id);
    const ocorrencias = ocorrenciasRel.map(rel => {
      const oc = this.ocorrencias_criminais.find(o => o.id === rel.ocorrencia_id);
      return {
        ...oc,
        papel: rel.papel_no_crime
      };
    }).filter(Boolean);

    const comparsasOrigem = this.vinculos_comparsas.filter(v => v.infrator_origem_id === id).map(v => {
      const comp = this.infratores.find(i => i.id === v.infrator_destino_id);
      return { comparsa: comp, grau: v.grau_relacao, historico: v.historico_conjunto };
    });
    const comparsasDestino = this.vinculos_comparsas.filter(v => v.infrator_destino_id === id).map(v => {
      const comp = this.infratores.find(i => i.id === v.infrator_origem_id);
      return { comparsa: comp, grau: v.grau_relacao, historico: v.historico_conjunto };
    });

    return {
      ...infrator,
      fisicas,
      enderecos,
      ocorrencias,
      comparsas: [...comparsasOrigem, ...comparsasDestino]
    };
  }

  public addInfrator(data: any): any {
    const id = data.id || `inf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newInfrator: Infrator = {
      id,
      nome_completo: data.nome_completo,
      vulgo: data.vulgo || 'S/V',
      data_nascimento: data.data_nascimento || '1990-01-01',
      cpf: data.cpf || '000.000.000-00',
      foto_url: data.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop',
      gangue_faccao: data.gangue_faccao || 'Nenhuma',
      status_mandado_prisao: !!data.status_mandado_prisao,
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
    const id = data.id || `end-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
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
      }
    };
    this.enderecos_atuacao.unshift(newEnd);
    return newEnd;
  }

  public linkInfratorOcorrencia(infrator_id: string, ocorrencia_id: string, papel_no_crime: string = 'Autor'): boolean {
    const exists = this.infrator_ocorrencia.some(io => io.infrator_id === infrator_id && io.ocorrencia_id === ocorrencia_id);
    if (exists) {
      const item = this.infrator_ocorrencia.find(io => io.infrator_id === infrator_id && io.ocorrencia_id === ocorrencia_id);
      if (item) item.papel_no_crime = papel_no_crime;
      return true;
    }
    this.infrator_ocorrencia.push({
      infrator_id,
      ocorrencia_id,
      papel_no_crime
    });
    return true;
  }

  public unlinkInfratorOcorrencia(infrator_id: string, ocorrencia_id: string): boolean {
    this.infrator_ocorrencia = this.infrator_ocorrencia.filter(
      io => !(io.infrator_id === infrator_id && io.ocorrencia_id === ocorrencia_id)
    );
    return true;
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
    if (existingIndex >= 0) {
      this.orcrim_organogramas[existingIndex] = { ...this.orcrim_organogramas[existingIndex], ...orcrim };
      return this.orcrim_organogramas[existingIndex];
    } else {
      const newOrcrim = {
        id: orcrim.id || `orcrim-${Date.now()}`,
        ...orcrim
      };
      this.orcrim_organogramas.push(newOrcrim);
      return newOrcrim;
    }
  }

  // Get network graph
  public getNetworkGraph(): { nodes: any[]; edges: any[] } {
    const nodes: any[] = [];
    const edges: any[] = [];

    // Add Suspect Nodes
    this.infratores.forEach(i => {
      nodes.push({
        id: i.id,
        label: `${i.nome_completo} (${i.vulgo})`,
        type: 'suspect',
        gang: i.gangue_faccao,
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
        data: o.data_hora
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

