export type SituacaoInfrator = 'EM_LIBERDADE' | 'FORAGIDO' | 'PRESO' | 'MORTO';

export type TipoFotoInfrator = 'ROSTO' | 'PERFIL' | 'TATUAGEM' | 'CICATRIZ' | 'SINAL' | 'CORPO' | 'TATICA' | 'OUTRO';

export interface FotoInfrator {
  id: string;
  url: string;
  tipo?: TipoFotoInfrator | string;
  descricao?: string;
  principal?: boolean;
  data_inclusao?: string;
  created_at?: string;
}

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
  situacao_atual?: SituacaoInfrator | string;
  situacao_prisional?: SituacaoInfrator | string;
  periculosidade: 'Baixa' | 'Média' | 'Alta' | 'Extrema';
  created_at: string;
}

export interface CaracteristicasFisicas {
  infrator_id: string;
  altura_estimada: number;
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
  geom_ponto: { lat: number; lng: number };
  raio_influencia_km: number;
  // Dynamic fields added by API:
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
  envolvidos?: Array<{
    id: string;
    nome?: string;
    vulgo?: string;
    papel: string;
  }>;
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

export interface SuspectWithDetails extends Infrator {
  fisicas?: CaracteristicasFisicas;
  enderecos: EnderecoAtuacao[];
  ocorrencias: Array<OcorrenciaCriminal & { papel: string }>;
  comparsas: Array<{
    comparsa?: Infrator;
    grau: string;
    historico: string;
  }>;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: 'suspect' | 'incident';
  gang?: string;
  has_gang?: boolean;
  periculosidade?: string;
  mandado?: boolean;
  foto_url?: string;
  tipificacao?: string;
  data?: string;
  numero_bo?: string;
  modus_operandi?: string;
  descricao_fato?: string;
  armas_utilizadas?: string;
  veiculo_utilizado?: string;
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: 'participated' | 'comparsa' | 'coautoria';
  label: string;
  description?: string;
  color: string;
  width?: number;
}

export interface OcorrenciaProcessada {
  municipio: string;
  bairro: string;
  logradouro?: string;
  tipificacao: string;
  modus_operandi_resumo: string;
  caracteristicas_declaradas: {
    pele: string;
    vestimentas?: string;
    sinais_particulares: string;
    armas_veiculos: string;
  };
}

export interface CruzamentoSuspeito {
  infrator_id: string;
  nome_completo: string;
  vulgo: string;
  score_compatibilidade: number;
  fatores_convergentes: string[];
  fatores_divergentes?: string[];
  justificativa_analitica: string;
  recomendacao_operacional: string;
  suspect_details?: SuspectWithDetails;
}

export interface AlertaReincidenciaPerimetro {
  nivel_alerta: 'ALTO' | 'MEDIO' | 'BAIXO';
  observacao: string;
}

export interface IntelligenceAnalysisResult {
  ocorrencia_processada: OcorrenciaProcessada;
  cruzamento_suspeitos: CruzamentoSuspeito[];
  alerta_reincidencia_perimetro: AlertaReincidenciaPerimetro;
}

export type SituacaoPrisional = 'PRESO' | 'FORAGIDO' | 'EM_LIBERDADE' | 'MORTO';

export interface MembroEstruturaOrcrim {
  infrator_id: string;
  nome_completo: string;
  vulgo: string;
  funcao_especifica: string;
  foto_url?: string;
  status_mandado?: boolean;
  situacao_atual: SituacaoPrisional;
  area_responsabilidade?: string;
  subordinado_a_vulgo?: string;
}

export interface EstruturaPiramidalOrcrim {
  nivel_1_lideranca: MembroEstruturaOrcrim[];
  nivel_2_gerencia_tatica?: MembroEstruturaOrcrim[];
  ['nivel_2_gerencia_tática']?: MembroEstruturaOrcrim[];
  nivel_3_operacionais_e_linha_de_frente: MembroEstruturaOrcrim[];
}

export interface GangueInfoOrcrim {
  nome_gangue: string;
  territorio_principal: string;
  total_integrantes_mapeados: number;
  resumo_atuacao?: string;
}

export interface OrcrimData {
  id?: string;
  gangue_info: GangueInfoOrcrim;
  estrutura_piramidal: EstruturaPiramidalOrcrim;
}

export interface AnaliseBiometricaImagem {
  descricao_geral: string;
  faixa_etaria_estimada: string;
  formato_rosto: string;
  cor_pele_estimada: string;
  cabelo_e_barba: string;
  olhos_sobrancelhas?: string;
  marcas_distintivas_visiveis: string;
}

export interface CandidatoSimilaridadeFacial {
  infrator_id: string;
  nome_completo: string;
  vulgo: string;
  score_similaridade_facial: number;
  nivel_confianca: 'ALTA' | 'MEDIA' | 'BAIXA';
  pontos_convergentes_faciais: string[];
  pontos_divergentes_faciais: string[];
  justificativa_pericial: string;
  recomendacao_operacional: string;
  suspect_details?: SuspectWithDetails;
}

export interface ResultadoReconhecimentoFacial {
  analise_biometrica_imagem: AnaliseBiometricaImagem;
  candidatos_compativeis: CandidatoSimilaridadeFacial[];
  resumo_parecer_forense: string;
}

export interface GangAreaZone {
  id: string;
  name: string;
  gangName?: string;
  description?: string;
  color: string;
  fillOpacity?: number;
  strokeWidth?: number;
  coordinates: [number, number][]; // [lat, lng] pairs
  innerHoles?: [number, number][][];
  type: 'Polygon' | 'LineString' | 'Point';
  pointCoords?: [number, number];
  visible: boolean;
  sourceFile?: string;
  dangerLevel?: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO';
  rivalGang?: string;
  notes?: string;
  areaKm2?: number;
}



