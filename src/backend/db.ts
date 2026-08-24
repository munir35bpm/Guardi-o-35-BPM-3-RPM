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

  // Seed with rich mock data representing actual Brazilian criminal cases and intelligence
  private seedDatabase() {
    // 1. Infratores
    const i1: Infrator = {
      id: '2a1d2e30-bfa3-42eb-8286-9a28b06fe9a1',
      nome_completo: 'Thiago da Silva Santos',
      vulgo: 'Careca',
      data_nascimento: '1992-05-14',
      cpf: '123.456.789-01',
      foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
      gangue_faccao: 'PCC (Primeiro Comando da Capital)',
      status_mandado_prisao: true,
      periculosidade: 'Alta',
      created_at: new Date('2025-01-10').toISOString()
    };

    const i2: Infrator = {
      id: '5b8c2e40-cfb4-43fc-9397-9a28b06fe9a2',
      nome_completo: 'Marcos Vinicius de Souza',
      vulgo: 'Marquinho Boy',
      data_nascimento: '1998-11-22',
      cpf: '234.567.890-12',
      foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop',
      gangue_faccao: 'Comando Vermelho',
      status_mandado_prisao: true,
      periculosidade: 'Média',
      created_at: new Date('2025-02-15').toISOString()
    };

    const i3: Infrator = {
      id: '8c9d3e50-dfc5-44fd-a498-9a28b06fe9a3',
      nome_completo: 'Adriano Mendes Ramos',
      vulgo: 'Didi',
      data_nascimento: '1989-08-30',
      cpf: '345.678.901-23',
      foto_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop',
      gangue_faccao: 'PCC (Primeiro Comando da Capital)',
      status_mandado_prisao: false,
      periculosidade: 'Baixa',
      created_at: new Date('2025-03-01').toISOString()
    };

    const i4: Infrator = {
      id: 'ad0e4e60-efd6-45fe-b509-9a28b06fe9a4',
      nome_completo: 'Rodrigo Alencar Lima',
      vulgo: 'Neguinho do Revólver',
      data_nascimento: '1995-03-04',
      cpf: '456.789.012-34',
      foto_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop',
      gangue_faccao: 'PCC (Primeiro Comando da Capital)',
      status_mandado_prisao: true,
      periculosidade: 'Extrema',
      created_at: new Date('2025-01-20').toISOString()
    };

    const i5: Infrator = {
      id: 'be1f5e70-f0e7-46ff-c610-9a28b06fe9a5',
      nome_completo: 'Felipe Gouveia',
      vulgo: 'Lipe',
      data_nascimento: '2001-07-18',
      cpf: '567.890.123-45',
      foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&h=300&fit=crop',
      gangue_faccao: 'Bonde do Palmital & Duquesa',
      status_mandado_prisao: false,
      periculosidade: 'Média',
      created_at: new Date('2025-04-12').toISOString()
    };

    const i6: Infrator = {
      id: 'cf2a6e80-01f8-47aa-d721-9a28b06fe9a6',
      nome_completo: 'Valdemir de Oliveira',
      vulgo: 'Mestre Piauí',
      data_nascimento: '1982-03-11',
      cpf: '678.901.234-56',
      foto_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop',
      gangue_faccao: 'PCC (Primeiro Comando da Capital)',
      status_mandado_prisao: true,
      periculosidade: 'Extrema',
      created_at: new Date('2024-11-05').toISOString()
    };

    const i7: Infrator = {
      id: 'd03b7f90-12a9-48bb-e832-9a28b06fe9a7',
      nome_completo: 'Carlos Eduardo Freitas',
      vulgo: 'Cadu do Financeiro',
      data_nascimento: '1990-09-25',
      cpf: '789.012.345-67',
      foto_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&h=300&fit=crop',
      gangue_faccao: 'PCC (Primeiro Comando da Capital)',
      status_mandado_prisao: false,
      periculosidade: 'Alta',
      created_at: new Date('2025-02-01').toISOString()
    };

    const i8: Infrator = {
      id: 'e14c8a01-23ba-49cc-f943-9a28b06fe9a8',
      nome_completo: 'Anderson Roberto Alves',
      vulgo: 'Bebeto da Serra',
      data_nascimento: '1987-12-04',
      cpf: '890.123.456-78',
      foto_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&h=300&fit=crop',
      gangue_faccao: 'Comando Vermelho',
      status_mandado_prisao: true,
      periculosidade: 'Extrema',
      created_at: new Date('2024-09-18').toISOString()
    };

    const i9: Infrator = {
      id: 'f25d9b12-34cb-4add-0a54-9a28b06fe9a9',
      nome_completo: 'Maurício Gonçalves Lima',
      vulgo: 'Mãozinha do Palmital',
      data_nascimento: '1984-06-19',
      cpf: '901.234.567-89',
      foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=300&fit=crop',
      gangue_faccao: 'Bonde do Palmital & Duquesa',
      status_mandado_prisao: true,
      periculosidade: 'Alta',
      created_at: new Date('2025-01-05').toISOString()
    };

    const i10: Infrator = {
      id: '036ea123-45dc-4bee-1b65-9a28b06fe9b0',
      nome_completo: 'Bruno de Almeida Santos',
      vulgo: 'Bicudo',
      data_nascimento: '2003-01-14',
      cpf: '012.345.678-90',
      foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
      gangue_faccao: 'PCC (Primeiro Comando da Capital)',
      status_mandado_prisao: false,
      periculosidade: 'Baixa',
      created_at: new Date('2025-05-10').toISOString()
    };

    this.infratores = [i1, i2, i3, i4, i5, i6, i7, i8, i9, i10];

    // 2. Caracteristicas Físicas
    this.caracteristicas_fisicas = [
      {
        infrator_id: i1.id,
        altura_estimada: 1.72,
        cor_pele: 'Parda',
        compleicao: 'Atlética',
        tatuagens_detalhes: 'Palhaço sorrindo no braço direito, carpa na perna esquerda e sigla "PCC" no peito.',
        cicatrizes: 'Cicatriz cirúrgica vertical no abdômen, cicatriz de facada no ombro esquerdo.',
        sinais_particulares: 'Calvície frontal acentuada.'
      },
      {
        infrator_id: i2.id,
        altura_estimada: 1.80,
        cor_pele: 'Branca',
        compleicao: 'Delgada',
        tatuagens_detalhes: 'Lobo desenhado no pescoço, frases religiosas no braço esquerdo.',
        cicatrizes: 'Cicatriz de queimadura na mão direita.',
        sinais_particulares: 'Olhos verdes, usa brinco na orelha esquerda.'
      },
      {
        infrator_id: i3.id,
        altura_estimada: 1.68,
        cor_pele: 'Negra',
        compleicao: 'Média',
        tatuagens_detalhes: 'Nome "Maria" tatuado no antebraço direito.',
        cicatrizes: 'Sem cicatrizes dignas de nota.',
        sinais_particulares: 'Dente de ouro frontal superior.'
      },
      {
        infrator_id: i4.id,
        altura_estimada: 1.75,
        cor_pele: 'Negra',
        compleicao: 'Robusta',
        tatuagens_detalhes: 'Desenho de revólver calibre 38 na cintura, palhaço nas costas completas.',
        cicatrizes: 'Cicatriz de projétil de arma de fogo na coxa direita.',
        sinais_particulares: 'Gagueira leve quando sob estresse.'
      },
      {
        infrator_id: i5.id,
        altura_estimada: 1.74,
        cor_pele: 'Parda',
        compleicao: 'Média',
        tatuagens_detalhes: 'Símbolo da paz no pulso esquerdo, dragão no braço direito.',
        cicatrizes: 'Cicatriz de queda na testa (sobrancelha esquerda cortada).',
        sinais_particulares: 'Mancha escura de nascença no pescoço.'
      }
    ];

    // 3. Enderecos de Atuacao (Coordinates located in São Paulo central areas)
    this.enderecos_atuacao = [
      {
        id: 'addr-001',
        infrator_id: i1.id,
        tipo_endereco: 'Residência',
        logradouro: 'Rua das Juntas Provisorias, 1420',
        bairro: 'Heliópolis',
        cidade: 'São Paulo',
        geom_ponto: { lat: -23.6152, lng: -46.5901 },
        raio_influencia_km: 4.5
      },
      {
        id: 'addr-002',
        infrator_id: i1.id,
        tipo_endereco: 'Esconderijo',
        logradouro: 'Avenida Almirante Delamare, 321',
        bairro: 'Heliópolis',
        cidade: 'São Paulo',
        geom_ponto: { lat: -23.6175, lng: -46.5843 },
        raio_influencia_km: 3.0
      },
      {
        id: 'addr-003',
        infrator_id: i2.id,
        tipo_endereco: 'Residência',
        logradouro: 'Rua Rudolph Valentino, 85',
        bairro: 'Paraisópolis',
        cidade: 'São Paulo',
        geom_ponto: { lat: -23.6124, lng: -46.7251 },
        raio_influencia_km: 3.5
      },
      {
        id: 'addr-004',
        infrator_id: i3.id,
        tipo_endereco: 'Área de Atuação',
        logradouro: 'Rua Cavalheiro, 250',
        bairro: 'Brás',
        cidade: 'São Paulo',
        geom_ponto: { lat: -23.5381, lng: -46.6195 },
        raio_influencia_km: 2.0
      },
      {
        id: 'addr-005',
        infrator_id: i4.id,
        tipo_endereco: 'Residência',
        logradouro: 'Estrada das Lágrimas, 2011',
        bairro: 'Heliópolis',
        cidade: 'São Paulo',
        geom_ponto: { lat: -23.6161, lng: -46.5912 },
        raio_influencia_km: 5.0
      },
      {
        id: 'addr-006',
        infrator_id: i5.id,
        tipo_endereco: 'Residência',
        logradouro: 'Rua dos Pinheiros, 400',
        bairro: 'Pinheiros',
        cidade: 'São Paulo',
        geom_ponto: { lat: -23.5621, lng: -46.7025 },
        raio_influencia_km: 2.5
      }
    ];

    // 4. Ocorrencias Criminais (Inicia vazio para novos cadastros do usuário)
    this.ocorrencias_criminais = [];

    // 5. Infrator_Ocorrencia Relations (Inicia vazio)
    this.infrator_ocorrencia = [];

    // 6. Vinculos Comparsas
    this.vinculos_comparsas = [
      {
        infrator_origem_id: i1.id,
        infrator_destino_id: i4.id,
        grau_relacao: 'Forte',
        historico_conjunto: 'Parceiros de roubo de carga na região do Ipiranga e Heliópolis. Agem juntos em assaltos à mão armada contra transportadoras.'
      },
      {
        infrator_origem_id: i1.id,
        infrator_destino_id: i2.id,
        grau_relacao: 'Média',
        historico_conjunto: 'Identificados em trocas de mensagens negociando receptação de aparelhos celulares furtados.'
      },
      {
        infrator_origem_id: i3.id,
        infrator_destino_id: i1.id,
        grau_relacao: 'Fraca',
        historico_conjunto: 'Pertencem à mesma rede de apoio do PCC na Zona Sul, mas raramente atuam na mesma ocorrência direta.'
      }
    ];
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
    if (this.orcrim_organogramas.length === 0) {
      this.initOrcrimOrganograms();
    }
    return this.orcrim_organogramas;
  }

  public getOrcrimById(id: string): any {
    const list = this.getOrcrimOrganogramas();
    return list.find(o => o.id === id || o.gangue_info.nome_gangue.toLowerCase() === id.toLowerCase()) || null;
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

  private initOrcrimOrganograms() {
    this.orcrim_organogramas = [
      {
        id: 'pcc-torre-velhas',
        gangue_info: {
          nome_gangue: 'PCC (Primeiro Comando da Capital) • Regional 35º BPM',
          territorio_principal: 'Setor Alto Rio das Velhas / Heliópolis / Conexão MG-SP',
          total_integrantes_mapeados: 5,
          resumo_atuacao: 'Estrutura celular disciplinada atuante no tráfico interestadual de entorpecentes, lavagem de capitais e roubos estratégicos de carga de alto valor agregado.'
        },
        estrutura_piramidal: {
          nivel_1_lideranca: [
            {
              infrator_id: '2a1d2e30-bfa3-42eb-8286-9a28b06fe9a1',
              nome_completo: 'Thiago da Silva Santos',
              vulgo: 'Careca',
              funcao_especifica: 'Geral do Estado / Sintonia Final de Rua',
              foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
              status_mandado: true,
              situacao_atual: 'FORAGIDO'
            },
            {
              infrator_id: 'cf2a6e80-01f8-47aa-d721-9a28b06fe9a6',
              nome_completo: 'Valdemir de Oliveira',
              vulgo: 'Mestre Piauí',
              funcao_especifica: 'Sintonia dos Gravatas & Articulação Penitenciária',
              foto_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop',
              status_mandado: true,
              situacao_atual: 'PRESO'
            }
          ],
          nivel_2_gerencia_tática: [
            {
              infrator_id: 'ad0e4e60-efd6-45fe-b509-9a28b06fe9a4',
              nome_completo: 'Rodrigo Alencar Lima',
              vulgo: 'Neguinho do Revólver',
              funcao_especifica: 'Gerente Geral de Roubo de Carga & Apoio Bélico',
              area_responsabilidade: 'Eixo Rodoviário / Heliópolis / Transbordo',
              subordinado_a_vulgo: 'Careca',
              foto_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop',
              situacao_atual: 'FORAGIDO'
            },
            {
              infrator_id: 'd03b7f90-12a9-48bb-e832-9a28b06fe9a7',
              nome_completo: 'Carlos Eduardo Freitas',
              vulgo: 'Cadu do Financeiro',
              funcao_especifica: 'Disciplina do Progresso & Controle de Contabilidade',
              area_responsabilidade: 'Recolhimento de Rifas e Pontos de Venda',
              subordinado_a_vulgo: 'Careca',
              foto_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&h=300&fit=crop',
              situacao_atual: 'EM_LIBERDADE'
            }
          ],
          nivel_3_operacionais_e_linha_de_frente: [
            {
              infrator_id: '8c9d3e50-dfc5-44fd-a498-9a28b06fe9a3',
              nome_completo: 'Adriano Mendes Ramos',
              vulgo: 'Didi',
              funcao_especifica: 'Executor de Assaltos e Cobrador Tático',
              foto_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop',
              situacao_atual: 'EM_LIBERDADE'
            },
            {
              infrator_id: '036ea123-45dc-4bee-1b65-9a28b06fe9b0',
              nome_completo: 'Bruno de Almeida Santos',
              vulgo: 'Bicudo',
              funcao_especifica: 'Olheiro / Fogueteiro e Distribuidor de Ponto',
              foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
              situacao_atual: 'EM_LIBERDADE'
            }
          ]
        }
      },
      {
        id: 'cv-bonde-serra',
        gangue_info: {
          nome_gangue: 'Comando Vermelho (CV) • Bonde da Serra',
          territorio_principal: 'Paraisópolis / Setor Sul / Biqueiras Centrais',
          total_integrantes_mapeados: 2,
          resumo_atuacao: 'Facção rival com forte presença armada em áreas conflagradas, atuando na distribuição em larga escala de entorpecentes e roubo de veículos para autofinanciamento.'
        },
        estrutura_piramidal: {
          nivel_1_lideranca: [
            {
              infrator_id: 'e14c8a01-23ba-49cc-f943-9a28b06fe9a8',
              nome_completo: 'Anderson Roberto Alves',
              vulgo: 'Bebeto da Serra',
              funcao_especifica: 'Frente do Morro / Fornecedor de Armamento Pesado',
              foto_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&h=300&fit=crop',
              status_mandado: true,
              situacao_atual: 'FORAGIDO'
            }
          ],
          nivel_2_gerencia_tática: [
            {
              infrator_id: '5b8c2e40-cfb4-43fc-9397-9a28b06fe9a2',
              nome_completo: 'Marcos Vinicius de Souza',
              vulgo: 'Marquinho Boy',
              funcao_especifica: 'Gerente da Biqueira Central & Segurança Armada',
              area_responsabilidade: 'Setor Paraisópolis / Distribuição Noturna',
              subordinado_a_vulgo: 'Bebeto da Serra',
              foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop',
              situacao_atual: 'FORAGIDO'
            }
          ],
          nivel_3_operacionais_e_linha_de_frente: [
            {
              infrator_id: '8c9d3e50-dfc5-44fd-a498-9a28b06fe9a3',
              nome_completo: 'Adriano Mendes Ramos',
              vulgo: 'Didi',
              funcao_especifica: 'Piloto de Fuga & Abordagem Rápida',
              foto_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop',
              situacao_atual: 'EM_LIBERDADE'
            }
          ]
        }
      },
      {
        id: 'bonde-palmital-duquesa',
        gangue_info: {
          nome_gangue: 'Bonde do Palmital & Duquesa • 35º BPM Territorial',
          territorio_principal: 'Bairros Palmital, Duquesa, São Benedito e Adjacências',
          total_integrantes_mapeados: 2,
          resumo_atuacao: 'Gangue territorial focada em roubo a pedestres, comércio local e receptação de celulares e veículos para desmanche.'
        },
        estrutura_piramidal: {
          nivel_1_lideranca: [
            {
              infrator_id: 'f25d9b12-34cb-4add-0a54-9a28b06fe9a9',
              nome_completo: 'Maurício Gonçalves Lima',
              vulgo: 'Mãozinha do Palmital',
              funcao_especifica: 'Chefe de Beco / Mandante Operacional',
              foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=300&fit=crop',
              status_mandado: true,
              situacao_atual: 'PRESO'
            }
          ],
          nivel_2_gerencia_tática: [
            {
              infrator_id: 'be1f5e70-f0e7-46ff-c610-9a28b06fe9a5',
              nome_completo: 'Felipe Gouveia',
              vulgo: 'Lipe',
              funcao_especifica: 'Coordenador de Roubos e Repasse de Veículos',
              area_responsabilidade: 'Zona Comercial / Estações de Ônibus',
              subordinado_a_vulgo: 'Mãozinha do Palmital',
              foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&h=300&fit=crop',
              situacao_atual: 'EM_LIBERDADE'
            }
          ],
          nivel_3_operacionais_e_linha_de_frente: [
            {
              infrator_id: '036ea123-45dc-4bee-1b65-9a28b06fe9b0',
              nome_completo: 'Bruno de Almeida Santos',
              vulgo: 'Bicudo',
              funcao_especifica: 'Soldado de Pista e Olheiro',
              foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
              situacao_atual: 'EM_LIBERDADE'
            }
          ]
        }
      }
    ];
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

