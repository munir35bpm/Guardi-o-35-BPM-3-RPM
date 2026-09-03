import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Map,
  Share2,
  BrainCircuit,
  Database,
  FileText,
  Search,
  UserPlus,
  AlertTriangle,
  MapPin,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  Printer,
  Sliders,
  Crosshair,
  Grid,
  PlusCircle,
  XCircle,
  CheckCircle,
  Plus,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Trash2,
  Camera,
  FileDown,
  Shield,
  X,
  Scan,
  Users,
  Copy,
  Link2,
  Unlink,
  RotateCcw,
  Filter,
  ChevronDown,
  ChevronUp,
  Car,
  Fingerprint,
  Star,
  Eye,
  Maximize2,
  Edit3
} from 'lucide-react';
import TacticalMap from './components/TacticalMap';
import { TacticalGangSidebar } from './components/TacticalGangSidebar';
import NetworkGraph from './components/NetworkGraph';
import Logo35BPM from './components/Logo35BPM';
import { OrcrimWindow } from './components/OrcrimWindow';
import FacialRecognitionModule from './components/FacialRecognitionModule';
import OccurrencePickerFromSuspects from './components/OccurrencePickerFromSuspects';
import {
  SuspectWithDetails,
  OcorrenciaCriminal,
  EnderecoAtuacao,
  Infrator,
  FotoInfrator,
  IntelligenceAnalysisResult,
  OcorrenciaProcessada,
  CruzamentoSuspeito,
  AlertaReincidenciaPerimetro,
  GangAreaZone,
} from './types';
import { DEFAULT_GANG_AREAS_35BPM } from './utils/kmlGeoJsonParser';
import { db } from './backend/db';
import { openSuspectDossier } from './utils/dossierGenerator';
import { analyzeCrimeIntelligenceLocally } from './utils/intelligenceEngine';
import { compressImage } from './utils/imageCompressor';
import {
  initFirebaseSync,
  persistSuspectToFirebase,
  deleteSuspectFromFirebase,
  persistAddressToFirebase,
  deleteAddressFromFirebase,
  persistOccurrenceToFirebase,
  deleteOccurrenceFromFirebase,
  linkOccurrenceToSuspectInFirebase,
  unlinkOccurrenceFromSuspectInFirebase,
  deduplicateAddresses,
} from './services/firebaseSync';

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'network' | 'ai' | 'db' | 'orcrim'>('map');


  // Unified application state
  const [suspects, setSuspects] = useState<any[]>([]);
  const [occurrences, setOccurrences] = useState<OcorrenciaCriminal[]>([]);
  const [addresses, setAddresses] = useState<EnderecoAtuacao[]>([]);
  const [gangAreas, setGangAreas] = useState<GangAreaZone[]>([]);
  const [selectedGangZone, setSelectedGangZone] = useState<GangAreaZone | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>({
    lat: -19.7712,
    lng: -43.8564, // Santa Luzia / 35º BPM default coordinates
  });
  const [highlightedSuspectId, setHighlightedSuspectId] = useState<string | null>(null);

  // Stats Counters
  const [totalSuspects, setTotalSuspects] = useState(0);
  const [activeWarrants, setActiveWarrants] = useState(0);
  const [totalIncidents, setTotalIncidents] = useState(0);

  // Module A (AI Narrative Parser & Facial Recognition) states
  const [aiMode, setAiMode] = useState<'narrative' | 'facial'>('narrative');
  const [narrativeInput, setNarrativeInput] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedReport, setParsedReport] = useState<any | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Dedicated Intelligence Analysis Result state (Schema 35º BPM / PMMG)
  const [isIntelligenceAnalyzing, setIsIntelligenceAnalyzing] = useState(false);
  const [intelligenceResult, setIntelligenceResult] = useState<IntelligenceAnalysisResult | null>(null);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);

  // Dedicated Physical, Tattoos, Scars, Vehicle & Territorial filters for Intelligence Triage
  const [showPhysicalFilters, setShowPhysicalFilters] = useState(false);
  const [intelligenceFilters, setIntelligenceFilters] = useState<{
    tatuagens: string;
    cicatrizes: string;
    sinais_particulares: string;
    cor_pele: string;
    compleicao: string;
    veiculo: string;
    armas: string;
    bairro: string;
    faccao: string;
  }>({
    tatuagens: '',
    cicatrizes: '',
    sinais_particulares: '',
    cor_pele: '',
    compleicao: '',
    veiculo: '',
    armas: '',
    bairro: '',
    faccao: '',
  });

  const activeFiltersCount = (Object.values(intelligenceFilters) as string[]).filter(v => Boolean(v && v.trim())).length;

  const handleResetIntelligence = () => {
    setNarrativeInput('');
    setIntelligenceFilters({
      tatuagens: '',
      cicatrizes: '',
      sinais_particulares: '',
      cor_pele: '',
      compleicao: '',
      veiculo: '',
      armas: '',
      bairro: '',
      faccao: '',
    });
    setIntelligenceResult(null);
    setIntelligenceError(null);
    setParsedReport(null);
    setMatchResults([]);
    setParseError(null);
    setMatchError(null);
  };

  // Module B (Geospatial Scorer) states
  const [searchRadius, setSearchRadius] = useState<number>(5.0);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Database Tab states
  const [suspectSearchQuery, setSuspectSearchQuery] = useState('');
  const [selectedSuspectDetail, setSelectedSuspectDetail] = useState<SuspectWithDetails | null>(null);
  const [isAddingSuspect, setIsAddingSuspect] = useState(false);
  const [editingSuspectId, setEditingSuspectId] = useState<string | null>(null);
  const [isAddingOccurrence, setIsAddingOccurrence] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  // New Suspect Form
  const [newSuspectForm, setNewSuspectForm] = useState({
    nome_completo: '',
    vulgo: '',
    data_nascimento: '1995-01-01',
    cpf: '',
    foto_url: '',
    gangue_faccao: '',
    situacao_atual: 'EM_LIBERDADE' as 'EM_LIBERDADE' | 'FORAGIDO' | 'PRESO' | 'MORTO',
    status_mandado_prisao: false,
    periculosidade: 'Média',
    altura_estimada: '1.75',
    cor_pele: 'Parda',
    compleicao: 'Média',
    tatuagens_detalhes: '',
    cicatrizes: '',
    sinais_particulares: '',
  });

  // Attached occurrences during suspect registration
  const [suspectOccurrencesList, setSuspectOccurrencesList] = useState<any[]>([]);
  const [suspectOcMode, setSuspectOcMode] = useState<'new' | 'from_other' | 'existing'>('new');
  const [suspectOcExistingId, setSuspectOcExistingId] = useState('');
  const [suspectOcPapel, setSuspectOcPapel] = useState('Autor');
  const [suspectNewOcData, setSuspectNewOcData] = useState({
    numero_bo: '',
    tipificacao_penal: 'Roubo a Mão Armada',
    data_hora: new Date().toISOString().slice(0, 16),
    descricao_fato: '',
    modus_operandi: '',
    armas_utilizadas: 'Pistola 9mm',
    veiculo_utilizado: 'Motocicleta',
    lat: '-19.7712',
    lng: '-43.8564',
  });

  // Attached addresses during suspect registration (Multiple Addresses Support)
  const [suspectAddressesList, setSuspectAddressesList] = useState<any[]>([]);
  const [suspectNewAddrData, setSuspectNewAddrData] = useState({
    tipo_endereco: 'Residência',
    logradouro: '',
    bairro: '',
    cidade: 'Santa Luzia',
    raio_influencia_km: '2.5',
    lat: '-19.7712',
    lng: '-43.8564',
  });

  // Direct address addition in suspect detail card
  const [isAddingDirectAddress, setIsAddingDirectAddress] = useState(false);
  const [directNewAddrData, setDirectNewAddrData] = useState({
    tipo_endereco: 'Residência',
    logradouro: '',
    bairro: '',
    cidade: 'Santa Luzia',
    raio_influencia_km: '2.5',
    lat: '-19.7712',
    lng: '-43.8564',
  });

  // Direct linkage from suspect detail card
  const [isLinkingDirectOccurrence, setIsLinkingDirectOccurrence] = useState(false);
  const [directOcMode, setDirectOcMode] = useState<'new' | 'from_other' | 'existing'>('new');
  const [directOcExistingId, setDirectOcExistingId] = useState('');
  const [directOcPapel, setDirectOcPapel] = useState('Autor');
  const [directNewOcData, setDirectNewOcData] = useState({
    numero_bo: '',
    tipificacao_penal: 'Roubo a Mão Armada',
    data_hora: new Date().toISOString().slice(0, 16),
    descricao_fato: '',
    modus_operandi: '',
    armas_utilizadas: 'Pistola 9mm',
    veiculo_utilizado: 'Motocicleta',
    lat: '-19.7712',
    lng: '-43.8564',
  });

  // Photo Gallery for New Suspect Registration (Unlimited Photos)
  const [suspectPhotosList, setSuspectPhotosList] = useState<FotoInfrator[]>([]);
  const [newPhotoManualUrl, setNewPhotoManualUrl] = useState('');
  const [newPhotoManualTipo, setNewPhotoManualTipo] = useState<'ROSTO' | 'TATUAGEM' | 'CICATRIZ' | 'SINAL' | 'PERFIL' | 'CORPO' | 'TATICA'>('ROSTO');
  const [newPhotoManualDesc, setNewPhotoManualDesc] = useState('');

  // Direct Photo Management in Suspect Detail Drawer
  const [isAddingDirectPhoto, setIsAddingDirectPhoto] = useState(false);
  const [directPhotoDraft, setDirectPhotoDraft] = useState({
    url: '',
    tipo: 'TATUAGEM' as 'ROSTO' | 'TATUAGEM' | 'CICATRIZ' | 'SINAL' | 'PERFIL' | 'CORPO' | 'TATICA',
    descricao: '',
    principal: false,
  });

  // Photo Lightbox Zoom
  const [inspectingPhoto, setInspectingPhoto] = useState<{
    url: string;
    tipo?: string;
    descricao?: string;
    principal?: boolean;
    suspectName?: string;
  } | null>(null);

  // Helper for role badge display
  const getPapelBadge = (papel: string) => {
    const p = (papel || '').toLowerCase();
    if (p.includes('autor') && !p.includes('coautor') && !p.includes('co-autor')) {
      return {
        bg: 'bg-red-950/80 border-red-800 text-red-300',
        label: 'AUTOR',
      };
    }
    if (p.includes('coautor') || p.includes('co-autor')) {
      return {
        bg: 'bg-orange-950/80 border-orange-800 text-orange-300',
        label: 'COAUTOR',
      };
    }
    if (p.includes('vítima') || p.includes('vitima')) {
      return {
        bg: 'bg-blue-950/80 border-blue-800 text-blue-300',
        label: 'VÍTIMA',
      };
    }
    if (p.includes('notificado')) {
      return {
        bg: 'bg-purple-950/80 border-purple-800 text-purple-300',
        label: 'NOTIFICADO',
      };
    }
    if (p.includes('testemunha') || p.includes('condutor')) {
      return {
        bg: 'bg-teal-950/80 border-teal-800 text-teal-300',
        label: 'TESTEMUNHA',
      };
    }
    if (p.includes('indiciado')) {
      return {
        bg: 'bg-rose-950/80 border-rose-800 text-rose-300',
        label: 'INDICIADO',
      };
    }
    return {
      bg: 'bg-amber-950/80 border-amber-800 text-amber-300',
      label: papel ? papel.toUpperCase() : 'SUSPEITO',
    };
  };

  // Suspect Deletion Confirmation Modal State
  const [suspectToDelete, setSuspectToDelete] = useState<{ id: string; nome: string; vulgo?: string } | null>(null);
  const [isDeletingSuspect, setIsDeletingSuspect] = useState(false);

  // Occurrence (B.O.) Deletion Confirmation Modal State
  const [boToDelete, setBoToDelete] = useState<{
    id: string;
    numero_bo: string;
    tipificacao: string;
    data_hora?: string;
    envolvidosCount?: number;
  } | null>(null);
  const [isDeletingBo, setIsDeletingBo] = useState(false);

  // DB Sub-Tab Selection (Suspects Grid vs B.O.s Grid)
  const [dbSubTab, setDbSubTab] = useState<'suspects' | 'occurrences'>('suspects');
  const [occurrenceSearchQuery, setOccurrenceSearchQuery] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Incident Form
  const [newIncidentForm, setNewIncidentForm] = useState({
    numero_bo: '',
    data_hora: new Date().toISOString().slice(0, 16),
    tipificacao_penal: '',
    descricao_fato: '',
    modus_operandi: '',
    armas_utilizadas: '',
    veiculo_utilizado: '',
    lat: '-19.7712',
    lng: '-43.8564',
  });

  // New Address Form
  const [newAddressForm, setNewAddressForm] = useState({
    infrator_id: '',
    tipo_endereco: 'Residência',
    logradouro: '',
    bairro: '',
    cidade: 'Santa Luzia',
    lat: '-19.7712',
    lng: '-43.8564',
    raio_influencia_km: '2.5',
  });

  // Fetch core telemetry lists
  const loadGangAreasState = async () => {
    try {
      const resGang = await fetch('/api/gang-areas').catch(() => null);
      if (resGang && resGang.ok) {
        const dataGang = await resGang.json();
        if (Array.isArray(dataGang) && dataGang.length > 0) {
          setGangAreas(dataGang);
          return;
        }
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem('tactical_gang_areas_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGangAreas(parsed);
          return;
        }
      }
    } catch (e) {}

    setGangAreas(DEFAULT_GANG_AREAS_35BPM);
  };

  const syncStateFromDatabase = () => {
    const listS = db.infratores;
    const listO = db.ocorrencias_criminais;
    const listA = db.enderecos_atuacao;
    const { unique: uniqueA } = deduplicateAddresses(listA);

    setSuspects([...listS]);
    setOccurrences([...listO]);
    setAddresses(uniqueA);

    if (db.gang_areas && db.gang_areas.length > 0) {
      setGangAreas([...db.gang_areas]);
    }

    setTotalSuspects(listS.length);
    setActiveWarrants(listS.filter((s: any) => s.status_mandado_prisao).length);
    setTotalIncidents(listO.length);
  };

  const fetchTelemetry = async () => {
    loadGangAreasState();
    try {
      const [resS, resO, resA] = await Promise.all([
        fetch('/api/infratores').catch(() => null),
        fetch('/api/ocorrencias').catch(() => null),
        fetch('/api/enderecos').catch(() => null),
      ]);

      if (resS && resO && resA && resS.ok && resO.ok && resA.ok) {
        const listS = await resS.json();
        const listO = await resO.json();
        const listA = await resA.json();

        if (Array.isArray(listS) && listS.length > 0) {
          db.infratores = listS;
          const { unique: uniqueA } = deduplicateAddresses(listA);
          db.enderecos_atuacao = uniqueA;
          db.ocorrencias_criminais = listO;

          setSuspects(listS);
          setOccurrences(listO);
          setAddresses(uniqueA);

          setTotalSuspects(listS.length);
          setActiveWarrants(listS.filter((s: any) => s.status_mandado_prisao).length);
          setTotalIncidents(listO.length);
          return;
        }
      }
    } catch (err) {
      console.warn('API backend indisponível, inicializando dados locais de inteligência:', err);
    }

    // Static fallback for client-side execution / in-memory database
    syncStateFromDatabase();
  };

  useEffect(() => {
    fetchTelemetry();
    initFirebaseSync(() => {
      syncStateFromDatabase();
    });
  }, []);

  // Module A trigger
  const handleParseReport = async () => {
    setIsParsing(true);
    setParseError(null);
    setParsedReport(null);
    try {
      let data: any = null;
      try {
        const response = await fetch('/api/ai/parse-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ narrative: narrativeInput }),
        });
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          if (response.ok && json) {
            data = json;
          }
        }
      } catch (netErr) {
        console.warn('Backend parse-report not reachable, using local analyzer:', netErr);
      }

      if (!data) {
        const local = analyzeCrimeIntelligenceLocally(narrativeInput, suspects, selectedCoords || undefined);
        data = {
          nome_envolvidos: [],
          vulgos: [],
          modus_operandi: local.ocorrencia_processada.modus_operandi_resumo,
          veiculos: local.ocorrencia_processada.caracteristicas_declaradas.armas_veiculos || 'Nenhum',
          armas: local.ocorrencia_processada.caracteristicas_declaradas.armas_veiculos || 'Nenhuma',
          endereco: `${local.ocorrencia_processada.logradouro || ''}, ${local.ocorrencia_processada.bairro} - ${local.ocorrencia_processada.municipio}`,
          lat: selectedCoords?.lat || -19.7712,
          lng: selectedCoords?.lng || -43.8564,
          tipificacao: local.ocorrencia_processada.tipificacao
        };
      }

      setParsedReport(data);

      // Auto update coordinates based on geolocation estimation
      if (data.lat && data.lng) {
        setSelectedCoords({ lat: data.lat, lng: data.lng });
      }
    } catch (err: any) {
      setParseError(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  // Module B trigger
  const handleMatchSuspects = async () => {
    if (!selectedCoords) {
      setMatchError('Selecione coordenadas no mapa primeiro para definir a área de varredura.');
      return;
    }
    setIsMatching(true);
    setMatchError(null);
    setMatchResults([]);
    try {
      let data: any = null;
      try {
        const response = await fetch('/api/match/suspects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: selectedCoords.lat,
            lng: selectedCoords.lng,
            buffer_radius_km: searchRadius,
            description: parsedReport?.modus_operandi || narrativeInput,
          }),
        });
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          if (response.ok) {
            data = json;
          }
        }
      } catch (netErr) {
        console.warn('Backend match/suspects unreachable:', netErr);
      }

      if (data && data.matches) {
        setMatchResults(data.matches);
      } else {
        const local = analyzeCrimeIntelligenceLocally(narrativeInput, suspects, selectedCoords || undefined);
        if (local.cruzamento_suspeitos && local.cruzamento_suspeitos.length > 0) {
          setMatchResults(local.cruzamento_suspeitos.map((c: any) => ({
            suspect: c.suspect_details || {
              id: c.infrator_id,
              nome_completo: c.nome_completo,
              vulgo: c.vulgo,
              gangue_faccao: 'Apurando Vínculo',
              periculosidade: c.score_compatibilidade > 75 ? 'Alta' : 'Média',
              foto_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop',
              status_mandado_prisao: c.score_compatibilidade > 80
            },
            score: Math.round(c.score_compatibilidade),
            justificativa: c.justificativa_analitica,
            fatores_chave: c.fatores_convergentes || [],
            fatores_divergentes: c.fatores_divergentes || [],
            recomendacao_operacional: c.recomendacao_operacional
          })));
        }
      }
    } catch (err: any) {
      setMatchError(err.message);
    } finally {
      setIsMatching(false);
    }
  };

  // Full Integrated Intelligence Analysis (35º BPM Schema: Ocorrência + Cruzamento + Alerta de Reincidência)
  const handleRunIntelligenceAnalysis = async () => {
    const hasNarrative = Boolean(narrativeInput && narrativeInput.trim() !== '');
    const hasFilters = (Object.values(intelligenceFilters) as string[]).some(v => Boolean(v && v.trim()));

    if (!hasNarrative && !hasFilters) {
      setIntelligenceError('Insira o relato do fato policial ou selecione filtros de características físicas, tatuagens, cicatrizes ou veículos.');
      return;
    }

    setIsIntelligenceAnalyzing(true);
    setIntelligenceError(null);
    try {
      let data: any = null;
      try {
        const response = await fetch('/api/ai/intelligence-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            narrative: narrativeInput,
            lat: selectedCoords?.lat,
            lng: selectedCoords?.lng,
            radius_km: searchRadius,
            filters: intelligenceFilters
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          if (response.ok && json && (json.ocorrencia_processada || json.cruzamento_suspeitos)) {
            data = json;
          }
        }
      } catch (networkOrServerErr) {
        console.warn('API call failed or returned non-JSON, switching to local intelligence engine fallback:', networkOrServerErr);
      }

      // If backend was unreachable or returned non-JSON, run the deterministic intelligence engine locally
      if (!data) {
        data = analyzeCrimeIntelligenceLocally(
          narrativeInput,
          suspects.length > 0 ? suspects : undefined,
          selectedCoords ? { lat: selectedCoords.lat, lng: selectedCoords.lng } : undefined,
          intelligenceFilters
        );
      }

      setIntelligenceResult(data);

      // Backwards-compatible sync with parsedReport and matchResults
      if (data.ocorrencia_processada) {
        setParsedReport({
          tipificacao: data.ocorrencia_processada.tipificacao,
          endereco: `${data.ocorrencia_processada.logradouro || ''}, ${data.ocorrencia_processada.bairro} - ${data.ocorrencia_processada.municipio}`,
          modus_operandi: data.ocorrencia_processada.modus_operandi_resumo,
          armas: data.ocorrencia_processada.caracteristicas_declaradas?.armas_veiculos || 'Conforme apurado',
          veiculos: data.ocorrencia_processada.caracteristicas_declaradas?.armas_veiculos || 'Conforme apurado',
          nome_envolvidos: [],
          vulgos: [],
          lat: selectedCoords?.lat || -19.7712,
          lng: selectedCoords?.lng || -43.8564
        });
      }

      if (data.cruzamento_suspeitos && data.cruzamento_suspeitos.length > 0) {
        setMatchResults(data.cruzamento_suspeitos.map((c: any) => ({
          suspect: c.suspect_details || {
            id: c.infrator_id,
            nome_completo: c.nome_completo,
            vulgo: c.vulgo,
            gangue_faccao: 'Apurando Vínculo',
            periculosidade: c.score_compatibilidade > 75 ? 'Alta' : 'Média',
            foto_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop',
            status_mandado_prisao: c.score_compatibilidade > 80
          },
          score: Math.round(c.score_compatibilidade),
          justificativa: c.justificativa_analitica,
          fatores_chave: c.fatores_convergentes || [],
          fatores_divergentes: c.fatores_divergentes || [],
          recomendacao_operacional: c.recomendacao_operacional
        })));
      }
    } catch (err: any) {
      setIntelligenceError(err.message);
    } finally {
      setIsIntelligenceAnalyzing(false);
    }
  };

  // Open detailed suspect drawer
  const handleViewSuspectDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/infratores/${id}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setSelectedSuspectDetail(data);
        setActiveTab('db');
        return;
      }
    } catch (err) {
      console.warn('Error viewing suspect from API, falling back to local DB:', err);
    }
    const localData = db.getInfratorFull(id);
    if (localData) {
      setSelectedSuspectDetail(localData);
      setActiveTab('db');
    }
  };

  // Start editing existing suspect
  const handleStartEditSuspect = async (id: string) => {
    let target: any = null;
    try {
      const res = await fetch(`/api/infratores/${id}`).catch(() => null);
      if (res && res.ok) {
        target = await res.json();
      }
    } catch (err) {
      console.warn('Error fetching suspect from API for edit, fallback local:', err);
    }

    if (!target) {
      target = db.getInfratorFull(id) || suspects.find(s => s.id === id);
    }

    if (!target) {
      alert('Infrator não encontrado para edição.');
      return;
    }

    setEditingSuspectId(id);
    setNewSuspectForm({
      nome_completo: target.nome_completo || '',
      vulgo: target.vulgo || '',
      data_nascimento: target.data_nascimento ? target.data_nascimento.slice(0, 10) : '1995-01-01',
      cpf: target.cpf || '',
      foto_url: target.foto_url || '',
      gangue_faccao: target.gangue_faccao || '',
      situacao_atual: target.situacao_atual || target.situacao_prisional || (target.status_mandado_prisao ? 'FORAGIDO' : 'EM_LIBERDADE'),
      status_mandado_prisao: !!target.status_mandado_prisao,
      periculosidade: target.periculosidade || 'Média',
      altura_estimada: String(target.fisicas?.altura_estimada ?? '1.75'),
      cor_pele: target.fisicas?.cor_pele || 'Parda',
      compleicao: target.fisicas?.compleicao || 'Média',
      tatuagens_detalhes: target.fisicas?.tatuagens_detalhes || '',
      cicatrizes: target.fisicas?.cicatrizes || '',
      sinais_particulares: target.fisicas?.sinais_particulares || '',
    });

    // Populate gallery photos
    if (target.galeria_fotos && target.galeria_fotos.length > 0) {
      setSuspectPhotosList(target.galeria_fotos);
    } else if (target.foto_url) {
      setSuspectPhotosList([{
        id: `foto-${target.id}-main`,
        url: target.foto_url,
        tipo: 'ROSTO',
        descricao: 'Foto Principal',
        principal: true,
        data_inclusao: new Date().toISOString()
      }]);
    } else {
      setSuspectPhotosList([]);
    }

    // Populate operational addresses
    if (target.enderecos && target.enderecos.length > 0) {
      setSuspectAddressesList(target.enderecos.map((a: any) => ({
        tempId: a.id || `addr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        tipo_endereco: a.tipo_endereco || 'Residência',
        logradouro: a.logradouro || '',
        bairro: a.bairro || 'Centro',
        cidade: a.cidade || 'Santa Luzia',
        raio_influencia_km: String(a.raio_influencia_km || '2.5'),
        lat: String(a.geom_ponto?.lat ?? a.lat ?? '-19.7712'),
        lng: String(a.geom_ponto?.lng ?? a.lng ?? '-43.8564'),
      })));
    } else {
      const currentAddrs = addresses.filter(a => a.infrator_id === target.id);
      if (currentAddrs.length > 0) {
        setSuspectAddressesList(currentAddrs.map((a: any) => ({
          tempId: a.id || `addr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tipo_endereco: a.tipo_endereco || 'Residência',
          logradouro: a.logradouro || '',
          bairro: a.bairro || 'Centro',
          cidade: a.cidade || 'Santa Luzia',
          raio_influencia_km: String(a.raio_influencia_km || '2.5'),
          lat: String(a.geom_ponto?.lat ?? a.lat ?? '-19.7712'),
          lng: String(a.geom_ponto?.lng ?? a.lng ?? '-43.8564'),
        })));
      } else {
        setSuspectAddressesList([]);
      }
    }

    // Populate occurrences
    if (target.ocorrencias_relacionadas && target.ocorrencias_relacionadas.length > 0) {
      setSuspectOccurrencesList(target.ocorrencias_relacionadas.map((oc: any) => ({
        tempId: `tmp-oc-${oc.id || oc.numero_bo}-${Math.random().toString(36).substring(2, 6)}`,
        isNew: false,
        ocorrencia_id: oc.id,
        numero_bo: oc.numero_bo,
        tipificacao_penal: oc.tipificacao_penal,
        papel_no_crime: oc.papel || oc.papel_no_crime || 'Autor',
        data_hora: oc.data_hora,
        descricao_fato: oc.descricao_fato,
        modus_operandi: oc.modus_operandi,
        armas_utilizadas: oc.armas_utilizadas,
        veiculo_utilizado: oc.veiculo_utilizado,
      })));
    } else {
      setSuspectOccurrencesList([]);
    }

    setIsAddingSuspect(true);
    setIsAddingOccurrence(false);
    setIsAddingAddress(false);
    setActiveTab('db');

    // Scroll to top where the form is opened
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel suspect edit
  const handleCancelEditSuspect = () => {
    setEditingSuspectId(null);
    setIsAddingSuspect(false);
    setNewSuspectForm({
      nome_completo: '',
      vulgo: '',
      data_nascimento: '1995-01-01',
      cpf: '',
      foto_url: '',
      gangue_faccao: '',
      situacao_atual: 'EM_LIBERDADE',
      status_mandado_prisao: false,
      periculosidade: 'Média',
      altura_estimada: '1.75',
      cor_pele: 'Parda',
      compleicao: 'Média',
      tatuagens_detalhes: '',
      cicatrizes: '',
      sinais_particulares: '',
    });
    setSuspectOccurrencesList([]);
    setSuspectAddressesList([]);
    setSuspectPhotosList([]);
  };

  // Add an occurrence to the temporary suspect creation list
  const handleAddOccurrenceToSuspect = () => {
    if (suspectOcMode === 'existing') {
      if (!suspectOcExistingId) {
        alert('Selecione uma ocorrência existente na lista.');
        return;
      }
      const existing = occurrences.find((o) => o.id === suspectOcExistingId);
      if (!existing) return;
      setSuspectOccurrencesList((prev) => [
        ...prev,
        {
          tempId: `tmp-${Date.now()}-${Math.random()}`,
          isNew: false,
          ocorrencia_id: existing.id,
          numero_bo: existing.numero_bo,
          tipificacao_penal: existing.tipificacao_penal,
          papel_no_crime: suspectOcPapel,
          data_hora: existing.data_hora,
          descricao_fato: existing.descricao_fato,
          modus_operandi: existing.modus_operandi,
          armas_utilizadas: existing.armas_utilizadas,
          veiculo_utilizado: existing.veiculo_utilizado,
        },
      ]);
      setSuspectOcExistingId('');
    } else {
      if (!suspectNewOcData.numero_bo.trim() || !suspectNewOcData.tipificacao_penal.trim()) {
        alert('Preencha ao menos o Número do B.O. / REDS e a Tipificação Penal.');
        return;
      }
      setSuspectOccurrencesList((prev) => [
        ...prev,
        {
          tempId: `tmp-${Date.now()}-${Math.random()}`,
          isNew: true,
          numero_bo: suspectNewOcData.numero_bo.trim(),
          tipificacao_penal: suspectNewOcData.tipificacao_penal.trim(),
          papel_no_crime: suspectOcPapel,
          data_hora: suspectNewOcData.data_hora,
          descricao_fato: suspectNewOcData.descricao_fato,
          modus_operandi: suspectNewOcData.modus_operandi,
          armas_utilizadas: suspectNewOcData.armas_utilizadas,
          veiculo_utilizado: suspectNewOcData.veiculo_utilizado,
          lat: suspectNewOcData.lat,
          lng: suspectNewOcData.lng,
        },
      ]);
      setSuspectNewOcData({
        numero_bo: '',
        tipificacao_penal: 'Roubo a Mão Armada',
        data_hora: new Date().toISOString().slice(0, 16),
        descricao_fato: '',
        modus_operandi: '',
        armas_utilizadas: 'Pistola 9mm',
        veiculo_utilizado: 'Motocicleta',
        lat: '-19.7712',
        lng: '-43.8564',
      });
    }
  };

  // Link occurrence directly from the other suspects / global picker into registration list
  const handleLinkOccurrenceFromPicker = (oc: OcorrenciaCriminal, papel: string) => {
    if (suspectOccurrencesList.some((item) => (item.ocorrencia_id === oc.id) || (item.numero_bo === oc.numero_bo))) {
      alert(`O B.O. ${oc.numero_bo} já foi adicionado à lista deste infrator.`);
      return;
    }
    setSuspectOccurrencesList((prev) => [
      ...prev,
      {
        tempId: `tmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        isNew: false,
        ocorrencia_id: oc.id,
        numero_bo: oc.numero_bo,
        tipificacao_penal: oc.tipificacao_penal,
        papel_no_crime: papel || suspectOcPapel || 'Autor',
        data_hora: oc.data_hora,
        descricao_fato: oc.descricao_fato,
        modus_operandi: oc.modus_operandi,
        armas_utilizadas: oc.armas_utilizadas,
        veiculo_utilizado: oc.veiculo_utilizado,
      },
    ]);
    setToastMessage(`B.O. Nº ${oc.numero_bo} vinculado como ${papel || suspectOcPapel}!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Copy data from an existing occurrence into the manual creation form
  const handleCopyOccurrenceDataToForm = (oc: OcorrenciaCriminal) => {
    setSuspectNewOcData({
      numero_bo: oc.numero_bo || '',
      tipificacao_penal: oc.tipificacao_penal || 'Roubo a Mão Armada',
      data_hora: oc.data_hora ? new Date(oc.data_hora).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      descricao_fato: oc.descricao_fato || '',
      modus_operandi: oc.modus_operandi || '',
      armas_utilizadas: oc.armas_utilizadas || '',
      veiculo_utilizado: oc.veiculo_utilizado || '',
      lat: oc.geom_crime?.lat !== undefined ? String(oc.geom_crime.lat) : ((oc as any).lat || '-19.7712'),
      lng: oc.geom_crime?.lng !== undefined ? String(oc.geom_crime.lng) : ((oc as any).lng || '-43.8564'),
    });
    setSuspectOcMode('new');
    setToastMessage(`Dados do B.O. ${oc.numero_bo} copiados para o formulário.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemoveOccurrenceFromSuspect = (tempId: string) => {
    setSuspectOccurrencesList((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  // Add an address to the temporary suspect creation list (Multiple Addresses)
  const handleAddAddressToSuspect = () => {
    if (!suspectNewAddrData.logradouro.trim()) {
      alert('Informe o Logradouro / Endereço (Rua, Avenida, Beco, etc.).');
      return;
    }
    const logrNorm = suspectNewAddrData.logradouro.trim().toLowerCase();
    const tipoNorm = (suspectNewAddrData.tipo_endereco || 'Residência').toLowerCase();
    const isDuplicate = suspectAddressesList.some(
      (a) =>
        (a.tipo_endereco || 'Residência').toLowerCase() === tipoNorm &&
        a.logradouro.trim().toLowerCase() === logrNorm
    );
    if (isDuplicate) {
      setToastMessage('Este endereço já foi adicionado à lista.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setSuspectAddressesList((prev) => [
      ...prev,
      {
        tempId: `tmp-addr-${Date.now()}-${Math.random()}`,
        tipo_endereco: suspectNewAddrData.tipo_endereco,
        logradouro: suspectNewAddrData.logradouro.trim(),
        bairro: suspectNewAddrData.bairro.trim() || 'Centro',
        cidade: suspectNewAddrData.cidade.trim() || 'Santa Luzia',
        raio_influencia_km: suspectNewAddrData.raio_influencia_km || '2.5',
        lat: suspectNewAddrData.lat,
        lng: suspectNewAddrData.lng,
      },
    ]);
    setSuspectNewAddrData({
      tipo_endereco: 'Residência',
      logradouro: '',
      bairro: '',
      cidade: 'Santa Luzia',
      raio_influencia_km: '2.5',
      lat: '-19.7712',
      lng: '-43.8564',
    });
    setToastMessage('Endereço adicionado com sucesso.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemoveAddressFromSuspect = (tempId: string) => {
    setSuspectAddressesList((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  // Direct address addition in suspect detail drawer
  const handleAddAddressDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuspectDetail) return;
    if (!directNewAddrData.logradouro.trim()) {
      alert('Informe o Logradouro / Endereço.');
      return;
    }
    const logrNorm = directNewAddrData.logradouro.trim().toLowerCase();
    const tipoNorm = (directNewAddrData.tipo_endereco || 'Residência').toLowerCase();
    const existing = db.enderecos_atuacao.find(
      (ea) =>
        ea.infrator_id === selectedSuspectDetail.id &&
        (ea.tipo_endereco || 'Residência').toLowerCase() === tipoNorm &&
        (ea.logradouro || '').trim().toLowerCase() === logrNorm
    );
    if (existing) {
      setToastMessage('Este endereço já está cadastrado para este infrator.');
      setTimeout(() => setToastMessage(null), 3500);
      setIsAddingDirectAddress(false);
      return;
    }

    try {
      const payload = {
        infrator_id: selectedSuspectDetail.id,
        tipo_endereco: directNewAddrData.tipo_endereco,
        logradouro: directNewAddrData.logradouro.trim(),
        bairro: directNewAddrData.bairro.trim() || 'Centro',
        cidade: directNewAddrData.cidade.trim() || 'Santa Luzia',
        raio_influencia_km: directNewAddrData.raio_influencia_km || '2.5',
        lat: directNewAddrData.lat,
        lng: directNewAddrData.lng,
      };

      let createdAddr: any = null;
      try {
        const res = await fetch('/api/enderecos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          createdAddr = await res.json();
        }
      } catch (err) {
        console.warn('Backend API unavailable, saving to local in-memory DB', err);
      }

      if (!createdAddr) {
        createdAddr = db.addEndereco(payload);
      }

      // Persist to Firebase Firestore
      if (createdAddr && createdAddr.id) {
        await persistAddressToFirebase({
          id: createdAddr.id,
          infrator_id: selectedSuspectDetail.id,
          tipo_endereco: (createdAddr.tipo_endereco || directNewAddrData.tipo_endereco) as any,
          logradouro: createdAddr.logradouro || directNewAddrData.logradouro.trim(),
          bairro: createdAddr.bairro || directNewAddrData.bairro.trim() || 'Centro',
          cidade: createdAddr.cidade || directNewAddrData.cidade.trim() || 'Santa Luzia',
          geom_ponto: {
            lat: Number(directNewAddrData.lat),
            lng: Number(directNewAddrData.lng)
          },
          raio_influencia_km: Number(directNewAddrData.raio_influencia_km) || 2.5
        });
      }

      // Refresh suspect detail
      const updated = db.getInfratorFull(selectedSuspectDetail.id);
      if (updated) {
        setSelectedSuspectDetail(updated);
      }

      setIsAddingDirectAddress(false);
      setDirectNewAddrData({
        tipo_endereco: 'Residência',
        logradouro: '',
        bairro: '',
        cidade: 'Santa Luzia',
        raio_influencia_km: '2.5',
        lat: '-19.7712',
        lng: '-43.8564',
      });
      fetchTelemetry();
      setToastMessage('Novo endereço vinculado com sucesso.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error adding address directly:', err);
      alert('Erro ao cadastrar endereço.');
    }
  };

  const handleDeleteAddressDirectly = async (enderecoId: string) => {
    if (!selectedSuspectDetail) return;
    try {
      try {
        await fetch(`/api/enderecos/${enderecoId}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('Backend delete address failed, using local DB fallback', e);
      }
      db.enderecos_atuacao = db.enderecos_atuacao.filter((ea) => ea.id !== enderecoId);
      setAddresses((prev) => prev.filter((a) => a.id !== enderecoId));
      // Delete from Firebase Firestore
      await deleteAddressFromFirebase(enderecoId);
      const updated = db.getInfratorFull(selectedSuspectDetail.id);
      if (updated) {
        setSelectedSuspectDetail(updated);
      }
      fetchTelemetry();
      setToastMessage('Endereço removido com sucesso.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error deleting address:', err);
    }
  };

  // Photo handlers for Registration Form (Unlimited photos)
  const handleAddFilesToRegistration = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressedDataUrl = await compressImage(file, 1000, 1000, 0.78);
        setSuspectPhotosList((prev) => {
          const isFirst = prev.length === 0;
          const newPhoto: FotoInfrator = {
            id: `foto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            url: compressedDataUrl,
            tipo: isFirst ? 'ROSTO' : 'TATUAGEM',
            descricao: isFirst ? 'Foto Facial Principal' : '',
            principal: isFirst,
            created_at: new Date().toISOString(),
          };
          if (isFirst) {
            setNewSuspectForm((f) => ({ ...f, foto_url: compressedDataUrl }));
          }
          return [...prev, newPhoto];
        });
      } catch (err) {
        console.error('Erro ao processar/comprimir imagem:', err);
      }
    }
  };

  const handleSetRegistrationPrimaryPhoto = (index: number) => {
    setSuspectPhotosList((prev) => {
      const target = prev[index];
      if (target) {
        setNewSuspectForm((f) => ({ ...f, foto_url: target.url }));
      }
      return prev.map((p, i) => ({
        ...p,
        principal: i === index,
      }));
    });
    setToastMessage('Foto principal definida para o cadastro!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleUpdateRegistrationPhoto = (index: number, updates: Partial<FotoInfrator>) => {
    setSuspectPhotosList((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  };

  const handleRemoveRegistrationPhoto = (index: number) => {
    setSuspectPhotosList((prev) => {
      const removing = prev[index];
      const nextList = prev.filter((_, i) => i !== index);
      if (removing.principal && nextList.length > 0) {
        nextList[0].principal = true;
        setNewSuspectForm((f) => ({ ...f, foto_url: nextList[0].url }));
      } else if (nextList.length === 0) {
        setNewSuspectForm((f) => ({ ...f, foto_url: '' }));
      }
      return nextList;
    });
  };

  // Direct Photo Handlers for Suspect Detail Drawer
  const handleUploadDirectPhotoFiles = async (files: FileList | File[]) => {
    if (!selectedSuspectDetail) return;
    const suspectId = selectedSuspectDetail.id;
    const fileList = Array.from(files);

    for (const file of fileList) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressedDataUrl = await compressImage(file, 1000, 1000, 0.78);
        const isFirst = (!selectedSuspectDetail.galeria_fotos || selectedSuspectDetail.galeria_fotos.length === 0);
        const photoPayload = {
          url: compressedDataUrl,
          tipo: isFirst ? 'ROSTO' : 'TATUAGEM',
          descricao: isFirst ? 'Foto Principal' : 'Registro Fotográfico Complementar',
          principal: isFirst,
        };

        let updated: any = null;
        try {
          const res = await fetch(`/api/infratores/${suspectId}/fotos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(photoPayload),
          });
          if (res.ok) {
            updated = await res.json();
          }
        } catch (err) {
          console.warn('API direct photo upload failed, using local DB', err);
        }

        if (!updated) {
          updated = db.addPhotoToInfrator(suspectId, photoPayload);
        }

        if (updated) {
          await persistSuspectToFirebase(updated);
          setSelectedSuspectDetail(updated);
          setSuspects((prev) => prev.map((s) => (s.id === suspectId ? updated : s)));
        }
      } catch (e) {
        console.error('Error uploading photo:', e);
      }
    }

    fetchTelemetry();
    setToastMessage('Foto(s) adicionada(s) ao acervo do infrator com sucesso!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddDirectPhoto = async (photo: { url: string; tipo: any; descricao: string; principal?: boolean }) => {
    if (!selectedSuspectDetail) return;
    const suspectId = selectedSuspectDetail.id;
    try {
      let updated: any = null;
      try {
        const res = await fetch(`/api/infratores/${suspectId}/fotos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photo),
        });
        if (res.ok) {
          updated = await res.json();
        }
      } catch (err) {
        console.warn('API error, adding direct photo locally:', err);
      }

      if (!updated) {
        updated = db.addPhotoToInfrator(suspectId, photo);
      }

      if (updated) {
        await persistSuspectToFirebase(updated);
        setSelectedSuspectDetail(updated);
        setSuspects((prev) => prev.map((s) => (s.id === suspectId ? updated : s)));
      }

      setIsAddingDirectPhoto(false);
      fetchTelemetry();
      setToastMessage('Foto adicionada ao acervo!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error('Error adding direct photo:', e);
    }
  };

  const handleSaveDirectPhotoForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuspectDetail || !directPhotoDraft.url.trim()) {
      alert('Informe a URL da foto ou selecione uma imagem.');
      return;
    }
    const suspectId = selectedSuspectDetail.id;
    try {
      let updated: any = null;
      try {
        const res = await fetch(`/api/infratores/${suspectId}/fotos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(directPhotoDraft),
        });
        if (res.ok) {
          updated = await res.json();
        }
      } catch (err) {
        console.warn('API error, saving photo locally:', err);
      }

      if (!updated) {
        updated = db.addPhotoToInfrator(suspectId, directPhotoDraft);
      }

      if (updated) {
        await persistSuspectToFirebase(updated);
        setSelectedSuspectDetail(updated);
        setSuspects((prev) => prev.map((s) => (s.id === suspectId ? updated : s)));
      }

      setIsAddingDirectPhoto(false);
      setDirectPhotoDraft({
        url: '',
        tipo: 'TATUAGEM',
        descricao: '',
        principal: false,
      });
      fetchTelemetry();
      setToastMessage('Foto registrada com sucesso!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Error saving direct photo:', err);
      alert('Erro ao salvar foto.');
    }
  };

  const handleAddDirectPhotoSubmit = handleSaveDirectPhotoForm;

  const handleSetDirectPrimaryPhoto = async (fotoId: string) => {
    if (!selectedSuspectDetail) return;
    const suspectId = selectedSuspectDetail.id;
    try {
      let updated: any = null;
      try {
        const res = await fetch(`/api/infratores/${suspectId}/fotos/${fotoId}/principal`, {
          method: 'PUT',
        });
        if (res.ok) {
          updated = await res.json();
        }
      } catch (err) {
        console.warn('API error setting primary photo:', err);
      }

      if (!updated) {
        updated = db.setPrimaryPhotoInfrator(suspectId, fotoId);
      }

      if (updated) {
        await persistSuspectToFirebase(updated);
        setSelectedSuspectDetail(updated);
        setSuspects((prev) => prev.map((s) => (s.id === suspectId ? updated : s)));
      }

      fetchTelemetry();
      setToastMessage('Foto principal do infrator atualizada!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Error setting primary photo:', err);
    }
  };

  const handleDeleteDirectPhoto = async (fotoId: string) => {
    if (!selectedSuspectDetail) return;
    const suspectId = selectedSuspectDetail.id;
    try {
      let updated: any = null;
      try {
        const res = await fetch(`/api/infratores/${suspectId}/fotos/${fotoId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          updated = await res.json();
        }
      } catch (err) {
        console.warn('API error deleting photo:', err);
      }

      if (!updated) {
        updated = db.removePhotoFromInfrator(suspectId, fotoId);
      }

      if (updated) {
        await persistSuspectToFirebase(updated);
        setSelectedSuspectDetail(updated);
        setSuspects((prev) => prev.map((s) => (s.id === suspectId ? updated : s)));
      }

      fetchTelemetry();
      setToastMessage('Foto removida da galeria.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

  const handleRemoveDirectPhoto = handleDeleteDirectPhoto;

  // Direct linkage from suspect detail drawer
  const handleLinkOccurrenceDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuspectDetail) return;
    try {
      let bodyData: any = {
        papel_no_crime: directOcPapel || 'Autor',
      };
      if (directOcMode === 'existing') {
        if (!directOcExistingId) {
          alert('Selecione uma ocorrência para vincular.');
          return;
        }
        const existingOc = occurrences.find((o) => o.id === directOcExistingId || o.numero_bo === directOcExistingId);
        bodyData = {
          ...(existingOc || {}),
          ocorrencia_id: directOcExistingId,
          papel_no_crime: directOcPapel || 'Autor',
        };
      } else {
        if (!directNewOcData.numero_bo.trim() || !directNewOcData.tipificacao_penal.trim()) {
          alert('Informe o Número do B.O. e a Tipificação Penal.');
          return;
        }
        bodyData = {
          ...bodyData,
          ...directNewOcData,
        };
      }

      // Try server API
      let updatedSuspect: any = null;
      try {
        const res = await fetch(`/api/infratores/${selectedSuspectDetail.id}/ocorrencias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });
        if (res.ok) {
          updatedSuspect = await res.json();
        }
      } catch (e) {
        console.warn('Backend link endpoint not available, falling back to local DB', e);
      }

      // Persist to Firebase Firestore
      try {
        const persisted = await linkOccurrenceToSuspectInFirebase(selectedSuspectDetail.id, {
          id: bodyData.ocorrencia_id,
          ...bodyData,
        });
        if (persisted) {
          updatedSuspect = persisted;
        }
      } catch (fireErr) {
        console.warn('Erro ao salvar vínculo no Firestore:', fireErr);
      }

      // Local DB fallback
      if (!updatedSuspect) {
        if (directOcMode === 'existing') {
          db.linkInfratorOcorrencia(selectedSuspectDetail.id, directOcExistingId, directOcPapel || 'Autor');
        } else {
          const newOc = db.addOcorrencia({
            ...directNewOcData,
            numero_bo: directNewOcData.numero_bo.trim(),
            tipificacao_penal: directNewOcData.tipificacao_penal.trim(),
            data_hora: directNewOcData.data_hora || new Date().toISOString(),
          });
          db.linkInfratorOcorrencia(selectedSuspectDetail.id, newOc.id, directOcPapel || 'Autor');
        }
        updatedSuspect = db.getInfratorFull(selectedSuspectDetail.id);
      }

      if (updatedSuspect) {
        setSelectedSuspectDetail(updatedSuspect);
        await persistSuspectToFirebase(updatedSuspect).catch(() => null);
      }

      setIsLinkingDirectOccurrence(false);
      setDirectOcExistingId('');
      setDirectNewOcData({
        numero_bo: '',
        tipificacao_penal: 'Roubo a Mão Armada',
        data_hora: new Date().toISOString().slice(0, 16),
        descricao_fato: '',
        modus_operandi: '',
        armas_utilizadas: 'Pistola 9mm',
        veiculo_utilizado: 'Motocicleta',
        lat: '-19.7712',
        lng: '-43.8564',
      });
      await fetchTelemetry();
      setToastMessage('B.O. cadastrado e salvo com sucesso no banco de dados!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error linking occurrence directly:', err);
      alert('Erro ao vincular ocorrência.');
    }
  };

  // Direct link from the other suspects / global picker for selectedSuspectDetail
  const handleDirectLinkOccurrenceFromPicker = async (oc: OcorrenciaCriminal, papel: string) => {
    if (!selectedSuspectDetail) return;
    try {
      const bodyData = {
        ocorrencia_id: oc.id,
        numero_bo: oc.numero_bo,
        tipificacao_penal: oc.tipificacao_penal,
        data_hora: oc.data_hora,
        descricao_fato: oc.descricao_fato,
        modus_operandi: oc.modus_operandi,
        armas_utilizadas: oc.armas_utilizadas,
        veiculo_utilizado: oc.veiculo_utilizado,
        geom_crime: oc.geom_crime,
        papel_no_crime: papel || directOcPapel || 'Autor',
      };

      let updatedSuspect: any = null;
      try {
        const res = await fetch(`/api/infratores/${selectedSuspectDetail.id}/ocorrencias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });
        if (res.ok) {
          updatedSuspect = await res.json();
        }
      } catch (e) {
        console.warn('Backend link endpoint not available, falling back to local DB', e);
      }

      // Persist to Firebase Firestore
      try {
        const persisted = await linkOccurrenceToSuspectInFirebase(selectedSuspectDetail.id, {
          id: oc.id,
          ...oc,
          papel_no_crime: papel || directOcPapel || 'Autor',
        });
        if (persisted) {
          updatedSuspect = persisted;
        }
      } catch (fireErr) {
        console.warn('Erro ao salvar vínculo no Firestore:', fireErr);
      }

      if (!updatedSuspect) {
        db.linkInfratorOcorrencia(selectedSuspectDetail.id, oc.id, papel || directOcPapel || 'Autor');
        updatedSuspect = db.getInfratorFull(selectedSuspectDetail.id);
      }

      if (updatedSuspect) {
        setSelectedSuspectDetail(updatedSuspect);
        await persistSuspectToFirebase(updatedSuspect).catch(() => null);
      }

      setIsLinkingDirectOccurrence(false);
      await fetchTelemetry();
      setToastMessage(`B.O. Nº ${oc.numero_bo} vinculado como ${papel || directOcPapel}!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error linking occurrence directly from picker:', err);
      alert('Erro ao vincular ocorrência.');
    }
  };

  // Direct copy from picker to directNewOcData form in drawer
  const handleDirectCopyOccurrenceToForm = (oc: OcorrenciaCriminal) => {
    setDirectNewOcData({
      numero_bo: oc.numero_bo || '',
      tipificacao_penal: oc.tipificacao_penal || 'Roubo a Mão Armada',
      data_hora: oc.data_hora ? new Date(oc.data_hora).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      descricao_fato: oc.descricao_fato || '',
      modus_operandi: oc.modus_operandi || '',
      armas_utilizadas: oc.armas_utilizadas || '',
      veiculo_utilizado: oc.veiculo_utilizado || '',
      lat: oc.geom_crime?.lat !== undefined ? String(oc.geom_crime.lat) : ((oc as any).lat || '-19.7712'),
      lng: oc.geom_crime?.lng !== undefined ? String(oc.geom_crime.lng) : ((oc as any).lng || '-43.8564'),
    });
    setDirectOcMode('new');
    setToastMessage(`Dados do B.O. ${oc.numero_bo} copiados para o formulário.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUnlinkOccurrence = async (ocorrenciaId: string) => {
    if (!selectedSuspectDetail) return;
    try {
      const oc = (selectedSuspectDetail.ocorrencias || []).find((o: any) => o.id === ocorrenciaId || o.numero_bo === ocorrenciaId);
      const boNum = oc?.numero_bo;

      // 1. Local DB first for instant responsiveness
      db.unlinkInfratorOcorrencia(selectedSuspectDetail.id, ocorrenciaId);
      let updatedSuspect: any = db.getInfratorFull(selectedSuspectDetail.id);
      if (updatedSuspect) {
        setSelectedSuspectDetail(updatedSuspect);
      }

      // 2. Backend API
      try {
        await fetch(`/api/infratores/${selectedSuspectDetail.id}/ocorrencias/${ocorrenciaId}`, {
          method: 'DELETE',
        }).catch(() => null);
      } catch (e) {
        console.warn('Backend unlink endpoint not available', e);
      }

      // 3. Unlink in Firebase Firestore
      try {
        const persisted = await unlinkOccurrenceFromSuspectInFirebase(selectedSuspectDetail.id, ocorrenciaId, boNum);
        if (persisted) {
          updatedSuspect = persisted;
          setSelectedSuspectDetail(persisted as any);
        }
      } catch (fireErr) {
        console.warn('Erro ao desvincular no Firestore:', fireErr);
      }

      await fetchTelemetry();
      setToastMessage(`B.O. ${boNum ? `Nº ${boNum} ` : ''}desvinculado do investigado com sucesso.`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error unlinking occurrence:', err);
    }
  };

  const handleInitiateDeleteSuspect = (id: string, nome: string, vulgo?: string) => {
    setSuspectToDelete({ id, nome, vulgo });
  };

  // Quick update suspect status/situation
  const handleUpdateSelectedSuspectSituacao = async (newSituacao: 'EM_LIBERDADE' | 'FORAGIDO' | 'PRESO' | 'MORTO') => {
    if (!selectedSuspectDetail) return;
    const isMandado = newSituacao === 'FORAGIDO' ? true : (newSituacao === 'MORTO' || newSituacao === 'PRESO' ? false : selectedSuspectDetail.status_mandado_prisao);
    
    const updatedData = {
      ...selectedSuspectDetail,
      situacao_atual: newSituacao,
      situacao_prisional: newSituacao,
      status_mandado_prisao: isMandado
    };

    // Optimistic update in UI
    setSelectedSuspectDetail(updatedData as any);
    setSuspects(prev => prev.map(s => s.id === selectedSuspectDetail.id ? { 
      ...s, 
      situacao_atual: newSituacao, 
      situacao_prisional: newSituacao, 
      status_mandado_prisao: isMandado 
    } : s));

    try {
      try {
        await fetch(`/api/infratores/${selectedSuspectDetail.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData),
        });
      } catch (e) {
        console.warn('API error updating situation, using local DB', e);
      }

      db.updateInfrator(selectedSuspectDetail.id, updatedData);
      await persistSuspectToFirebase(updatedData);
      fetchTelemetry();
      
      const sitLabels: Record<string, string> = {
        EM_LIBERDADE: 'EM LIBERDADE',
        FORAGIDO: 'FORAGIDO DA JUSTIÇA',
        PRESO: 'PRESO / SISTEMA PENITENCIÁRIO',
        MORTO: 'MORTO / FALECIDO'
      };
      setToastMessage(`Situação de "${selectedSuspectDetail.nome_completo}" atualizada para: ${sitLabels[newSituacao] || newSituacao}`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error updating suspect status:', err);
    }
  };

  const handleConfirmDeleteSuspect = async () => {
    if (!suspectToDelete) return;
    const { id, nome, vulgo } = suspectToDelete;
    
    // Close modal immediately so the user is never stuck
    setSuspectToDelete(null);
    setIsDeletingSuspect(false);

    try {
      // 1. Optimistic update
      setSuspects((prev) => prev.filter((s) => s.id !== id));
      setAddresses((prev) => prev.filter((a) => a.infrator_id !== id));
      setTotalSuspects((prev) => Math.max(0, prev - 1));
      if (selectedSuspectDetail?.id === id) {
        setSelectedSuspectDetail(null);
      }

      // 2. Delete from client-side DB instance
      db.deleteInfrator(id);

      const displayName = vulgo ? `${nome} ("${vulgo}")` : nome;
      setToastMessage(`Infrator ${displayName} excluído com sucesso.`);
      setTimeout(() => setToastMessage(null), 4000);

      // 3. Persist deletion in background with safety timeout
      deleteSuspectFromFirebase(id)
        .catch((e) => console.warn('Erro ao excluir infrator do Firebase:', e))
        .finally(() => {
          fetchTelemetry().catch(() => null);
        });

      fetch(`/api/infratores/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch(() => null);

    } catch (err) {
      console.error('Error deleting suspect:', err);
      setToastMessage('Infrator excluído do banco de dados.');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleInitiateDeleteBo = (
    id: string,
    numero_bo: string,
    tipificacao: string,
    data_hora?: string,
    envolvidosCount?: number
  ) => {
    setBoToDelete({ id, numero_bo, tipificacao, data_hora, envolvidosCount });
  };

  const handleConfirmDeleteBo = async () => {
    if (!boToDelete) return;
    const { id, numero_bo, tipificacao } = boToDelete;
    
    // 1. Close modal immediately so the user never gets stuck waiting on screen
    setBoToDelete(null);
    setIsDeletingBo(false);

    try {
      // 2. Optimistic update of local occurrences state
      setOccurrences((prev) => prev.filter((o) => o.id !== id && o.numero_bo !== numero_bo));
      setTotalIncidents((prev) => Math.max(0, prev - 1));

      // 3. Remove from client-side DB
      db.deleteOcorrencia(id);

      // 4. If suspect drawer is open, refresh full suspect info
      if (selectedSuspectDetail) {
        const updated: any = db.getInfratorFull(selectedSuspectDetail.id);
        if (updated) {
          setSelectedSuspectDetail(updated);
        }
      }

      // 5. Also update suspectOccurrencesList if user is currently creating/editing suspect
      setSuspectOccurrencesList((prev) =>
        prev.filter((item) => item.ocorrencia_id !== id && item.numero_bo !== numero_bo && item.tempId !== id)
      );

      setToastMessage(`B.O. Nº ${numero_bo} (${tipificacao}) excluído com sucesso do sistema.`);
      setTimeout(() => setToastMessage(null), 4000);

      // 6. Delete from Firebase & backend in background
      deleteOccurrenceFromFirebase(id, numero_bo)
        .catch((err) => console.warn('Erro ao remover do Firestore:', err))
        .finally(() => {
          fetchTelemetry().catch(() => null);
        });

      fetch(`/api/ocorrencias/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch(() => null);

    } catch (err) {
      console.error('Error deleting occurrence:', err);
      setToastMessage('B.O. excluído do sistema.');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // State to prevent multiple clicks during suspect creation
  const [isSubmittingSuspect, setIsSubmittingSuspect] = useState(false);

  // Create suspect submit
  const handleAddSuspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSuspect) return;
    if (!newSuspectForm.nome_completo.trim()) {
      alert('Preencha o Nome Completo do infrator.');
      return;
    }

    setIsSubmittingSuspect(true);
    try {
      // Collect all occurrences to link including any unadded draft in the input fields
      const occurrencesToLink = [...suspectOccurrencesList];
      if (suspectNewOcData.numero_bo.trim() && suspectNewOcData.tipificacao_penal.trim()) {
        const boNorm = suspectNewOcData.numero_bo.trim().toLowerCase();
        const exists = occurrencesToLink.some(
          (o) => (o.numero_bo || '').trim().toLowerCase() === boNorm
        );
        if (!exists) {
          occurrencesToLink.push({
            tempId: `tmp-${Date.now()}`,
            isNew: true,
            numero_bo: suspectNewOcData.numero_bo.trim(),
            tipificacao_penal: suspectNewOcData.tipificacao_penal.trim(),
            papel_no_crime: suspectOcPapel || 'Autor',
            data_hora: suspectNewOcData.data_hora || new Date().toISOString(),
            descricao_fato: suspectNewOcData.descricao_fato || suspectNewOcData.modus_operandi || '',
            modus_operandi: suspectNewOcData.modus_operandi || '',
            armas_utilizadas: suspectNewOcData.armas_utilizadas || '',
            veiculo_utilizado: suspectNewOcData.veiculo_utilizado || '',
            lat: suspectNewOcData.lat,
            lng: suspectNewOcData.lng,
          });
        }
      }

      // Collect all operational addresses to attach (Multiple Addresses Support with deduplication)
      const addressesToAttach = [...suspectAddressesList];
      if (suspectNewAddrData.logradouro.trim()) {
        const logrNorm = suspectNewAddrData.logradouro.trim().toLowerCase();
        const tipoNorm = (suspectNewAddrData.tipo_endereco || 'Residência').toLowerCase();
        const exists = addressesToAttach.some(
          (a) =>
            (a.tipo_endereco || 'Residência').toLowerCase() === tipoNorm &&
            a.logradouro.trim().toLowerCase() === logrNorm
        );
        if (!exists) {
          addressesToAttach.push({
            tempId: `tmp-addr-${Date.now()}`,
            tipo_endereco: suspectNewAddrData.tipo_endereco,
            logradouro: suspectNewAddrData.logradouro.trim(),
            bairro: suspectNewAddrData.bairro.trim() || 'Centro',
            cidade: suspectNewAddrData.cidade.trim() || 'Santa Luzia',
            raio_influencia_km: suspectNewAddrData.raio_influencia_km || '2.5',
            lat: suspectNewAddrData.lat,
            lng: suspectNewAddrData.lng,
          });
        }
      }

      let createdSuspect: any = null;

      // Determine primary photo from gallery or fallback
      let primaryUrl = newSuspectForm.foto_url;
      if (suspectPhotosList.length > 0) {
        const primaryObj = suspectPhotosList.find((p) => p.principal);
        if (primaryObj && primaryObj.url) {
          primaryUrl = primaryObj.url;
        } else {
          primaryUrl = suspectPhotosList[0].url;
        }
      }

      // Ensure any manual dataUrl photo is compressed
      if (primaryUrl && primaryUrl.startsWith('data:image/') && primaryUrl.length > 200000) {
        try {
          primaryUrl = await compressImage(primaryUrl, 1000, 1000, 0.78);
        } catch (e) {
          console.warn('Compress fallback:', e);
        }
      }

      const suspectPayload = {
        ...newSuspectForm,
        foto_url: primaryUrl,
        galeria_fotos: suspectPhotosList,
        enderecos: addressesToAttach,
        ocorrencias: occurrencesToLink,
      };

      if (editingSuspectId) {
        // UPDATE MODE
        let updatedSuspect: any = null;
        try {
          const res = await fetch(`/api/infratores/${editingSuspectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(suspectPayload),
          });
          if (res.ok) {
            updatedSuspect = await res.json();
          }
        } catch (netErr) {
          console.warn('Backend API unavailable, updating local in-memory DB', netErr);
        }

        if (!updatedSuspect) {
          updatedSuspect = db.updateInfrator(editingSuspectId, suspectPayload);
        }

        if (updatedSuspect) {
          try {
            await persistSuspectToFirebase(updatedSuspect);
          } catch (fireErr) {
            console.warn('Erro ao sincronizar com Firestore:', fireErr);
          }
          setSelectedSuspectDetail(updatedSuspect);
        }

        setIsAddingSuspect(false);
        setEditingSuspectId(null);
        setSuspectOccurrencesList([]);
        setSuspectAddressesList([]);
        setSuspectPhotosList([]);
        setNewPhotoManualUrl('');
        setNewPhotoManualDesc('');
        fetchTelemetry();

        // Reset form
        setNewSuspectForm({
          nome_completo: '',
          vulgo: '',
          data_nascimento: '1995-01-01',
          cpf: '',
          foto_url: '',
          gangue_faccao: '',
          situacao_atual: 'EM_LIBERDADE',
          status_mandado_prisao: false,
          periculosidade: 'Média',
          altura_estimada: '1.75',
          cor_pele: 'Parda',
          compleicao: 'Média',
          tatuagens_detalhes: '',
          cicatrizes: '',
          sinais_particulares: '',
        });

        setToastMessage(`Ficha de "${newSuspectForm.nome_completo}" atualizada e salva com sucesso!`);
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }

      // CREATE MODE (New Suspect)
      // Try server API first
      try {
        const res = await fetch('/api/infratores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(suspectPayload),
        });
        if (res.ok) {
          createdSuspect = await res.json();
        }
      } catch (netErr) {
        console.warn('Backend API unavailable, saving to local in-memory DB', netErr);
      }

      // Local DB fallback for GitHub Pages or offline/standalone preview
      if (!createdSuspect) {
        createdSuspect = db.addInfrator(suspectPayload);
      }

      // Persist to Firebase Firestore
      if (createdSuspect) {
        try {
          await persistSuspectToFirebase(createdSuspect);
        } catch (fireErr) {
          console.warn('Erro ao persistir no Firebase (dados mantidos no sistema local):', fireErr);
        }
      }

      setIsAddingSuspect(false);
      setSuspectOccurrencesList([]);
      setSuspectAddressesList([]);
      setSuspectPhotosList([]);
      setNewPhotoManualUrl('');
      setNewPhotoManualDesc('');
      fetchTelemetry();
      
      if (createdSuspect) {
        setSelectedSuspectDetail(createdSuspect);
      }

      // Reset form
      setNewSuspectForm({
        nome_completo: '',
        vulgo: '',
        data_nascimento: '1995-01-01',
        cpf: '',
        foto_url: '',
        gangue_faccao: '',
        situacao_atual: 'EM_LIBERDADE',
        status_mandado_prisao: false,
        periculosidade: 'Média',
        altura_estimada: '1.75',
        cor_pele: 'Parda',
        compleicao: 'Média',
        tatuagens_detalhes: '',
        cicatrizes: '',
        sinais_particulares: '',
      });

      setSuspectNewAddrData({
        tipo_endereco: 'Residência',
        logradouro: '',
        bairro: '',
        cidade: 'Santa Luzia',
        raio_influencia_km: '2.5',
        lat: '-19.7712',
        lng: '-43.8564',
      });

      setSuspectNewOcData({
        numero_bo: '',
        tipificacao_penal: 'Roubo a Mão Armada',
        data_hora: new Date().toISOString().slice(0, 16),
        descricao_fato: '',
        modus_operandi: '',
        armas_utilizadas: 'Pistola 9mm',
        veiculo_utilizado: 'Motocicleta',
        lat: '-19.7712',
        lng: '-43.8564',
      });

      const countOc = occurrencesToLink.length;
      const countAddr = addressesToAttach.length;
      setToastMessage(`Infrator "${newSuspectForm.nome_completo}" cadastrado com sucesso! ${countAddr > 0 ? `(${countAddr} endereço(s))` : ''} ${countOc > 0 ? `(${countOc} ocorrência(s))` : ''}`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Error adding suspect:', err);
      alert(`Erro ao salvar infrator: ${err?.message || 'Falha de comunicação'}. Seus dados não foram apagados do formulário.`);
    } finally {
      setIsSubmittingSuspect(false);
    }
  };

  // Create incident submit
  const handleAddIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentForm.numero_bo.trim() || !newIncidentForm.tipificacao_penal.trim()) {
      alert('Informe o Número do B.O. e a Tipificação Penal.');
      return;
    }
    try {
      const newOcId = `oc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const ocObj: OcorrenciaCriminal = {
        id: newOcId,
        numero_bo: newIncidentForm.numero_bo.trim(),
        tipificacao_penal: newIncidentForm.tipificacao_penal.trim(),
        data_hora: newIncidentForm.data_hora || new Date().toISOString(),
        descricao_fato: newIncidentForm.descricao_fato || '',
        modus_operandi: newIncidentForm.modus_operandi || '',
        armas_utilizadas: newIncidentForm.armas_utilizadas || '',
        veiculo_utilizado: newIncidentForm.veiculo_utilizado || '',
        geom_crime: {
          lat: Number(newIncidentForm.lat) || -19.7712,
          lng: Number(newIncidentForm.lng) || -43.8564,
        }
      };

      try {
        await fetch('/api/ocorrencias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ocObj),
        });
      } catch (e) {
        console.warn('Backend API unavailable, saving to local in-memory DB', e);
      }

      db.addOcorrencia(ocObj);

      // Persist to Firebase Firestore
      await persistOccurrenceToFirebase(ocObj);

      setIsAddingOccurrence(false);
      setNewIncidentForm({
        numero_bo: '',
        tipificacao_penal: '',
        data_hora: new Date().toISOString().slice(0, 16),
        descricao_fato: '',
        modus_operandi: '',
        armas_utilizadas: '',
        veiculo_utilizado: '',
        lat: '-19.7712',
        lng: '-43.8564',
      });
      await fetchTelemetry();
      setToastMessage('Ocorrência registrada e salva com sucesso!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error adding incident:', err);
    }
  };

  // Create address submit
  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let created = false;
      try {
        const res = await fetch('/api/enderecos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAddressForm),
        });
        if (res.ok) {
          created = true;
        }
      } catch (e) {
        console.warn('Backend API unavailable, saving to local in-memory DB', e);
      }

      if (!created) {
        db.addEndereco(newAddressForm);
      }

      // Persist to Firebase Firestore
      await persistAddressToFirebase({
        id: `addr-${Date.now()}`,
        infrator_id: newAddressForm.infrator_id,
        tipo_endereco: newAddressForm.tipo_endereco as any,
        logradouro: newAddressForm.logradouro,
        bairro: newAddressForm.bairro || 'Centro',
        cidade: newAddressForm.cidade || 'Santa Luzia',
        geom_ponto: {
          lat: Number(newAddressForm.lat),
          lng: Number(newAddressForm.lng)
        },
        raio_influencia_km: Number(newAddressForm.raio_influencia_km) || 2.5
      });

      setIsAddingAddress(false);
      setNewAddressForm({
        infrator_id: '',
        tipo_endereco: 'Residência',
        logradouro: '',
        bairro: '',
        cidade: 'Santa Luzia',
        lat: '-19.7712',
        lng: '-43.8564',
        raio_influencia_km: '2.5',
      });
      fetchTelemetry();
      setToastMessage('Área de atuação cadastrada com sucesso.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error adding address:', err);
    }
  };

  // Map Coordinate sync on click helper
  const handleMapCoordinatePick = (coords: { lat: number; lng: number }) => {
    setSelectedCoords(coords);
    // sync forms coords
    setNewIncidentForm((prev) => ({ ...prev, lat: coords.lat.toString(), lng: coords.lng.toString() }));
    setNewAddressForm((prev) => ({ ...prev, lat: coords.lat.toString(), lng: coords.lng.toString() }));
  };

  // Filter suspects in local search
  const filteredSuspects = suspects.filter(
    (s) =>
      s.nome_completo.toLowerCase().includes(suspectSearchQuery.toLowerCase()) ||
      s.vulgo.toLowerCase().includes(suspectSearchQuery.toLowerCase()) ||
      s.gangue_faccao.toLowerCase().includes(suspectSearchQuery.toLowerCase()) ||
      s.cpf.includes(suspectSearchQuery)
  );

  // Filter occurrences in local search
  const filteredOccurrences = occurrences.filter((oc) => {
    if (!occurrenceSearchQuery.trim()) return true;
    const q = occurrenceSearchQuery.toLowerCase();
    const boMatch = (oc.numero_bo || '').toLowerCase().includes(q);
    const crimeMatch = (oc.tipificacao_penal || '').toLowerCase().includes(q);
    const descMatch = (oc.descricao_fato || '').toLowerCase().includes(q);
    const modusMatch = (oc.modus_operandi || '').toLowerCase().includes(q);
    const armasMatch = (oc.armas_utilizadas || '').toLowerCase().includes(q);
    const veicMatch = (oc.veiculo_utilizado || '').toLowerCase().includes(q);
    const envMatch = (oc as any).envolvidos?.some((e: any) =>
      (e.nome || '').toLowerCase().includes(q) || (e.vulgo || '').toLowerCase().includes(q)
    );
    return boMatch || crimeMatch || descMatch || modusMatch || armasMatch || veicMatch || envMatch;
  });

  // Helper to find all suspects linked to an occurrence
  const getLinkedSuspectsForOccurrence = (oc: OcorrenciaCriminal) => {
    const list: Array<{ id: string; nome: string; vulgo: string; papel: string }> = [];
    const seen = new Set<string>();

    const links = db.getInfratorOcorrenciaLinks().filter(
      (l) => l.ocorrencia_id === oc.id || l.ocorrencia_id === oc.numero_bo
    );
    links.forEach((l) => {
      const s = suspects.find((sp) => sp.id === l.infrator_id);
      if (s && !seen.has(s.id)) {
        seen.add(s.id);
        list.push({
          id: s.id,
          nome: s.nome_completo,
          vulgo: s.vulgo,
          papel: l.papel_no_crime || 'Autor',
        });
      }
    });

    if ((oc as any).envolvidos && Array.isArray((oc as any).envolvidos)) {
      (oc as any).envolvidos.forEach((env: any) => {
        if (env.nome && !seen.has(env.nome)) {
          seen.add(env.nome);
          list.push({
            id: env.id || '',
            nome: env.nome,
            vulgo: env.vulgo || '',
            papel: env.papel || 'Autor',
          });
        }
      });
    }

    return list;
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] bg-tech-grid text-[#F3EEE4] flex flex-col font-sans">
      {/* Platform Header */}
      <header className="border-b border-[#C4A76E]/30 bg-[#0E121B]/95 backdrop-blur-md sticky top-0 z-[1010] shadow-2xl px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative flex-shrink-0 group">
            <Logo35BPM className="w-12 h-14" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-wider text-[#F3EEE4] uppercase font-display flex items-center gap-1.5">
                35º BPM<span className="text-[#C4A76E] font-mono">//</span><span className="text-[#DFC897]">GUARDIÃO</span>
              </h1>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#C4A76E]/15 text-[#DFC897] border border-[#C4A76E]/40 rounded uppercase tracking-wider">
                PMMG • ALTO RIO DAS VELHAS
              </span>
            </div>
            <p className="text-[11px] text-[#A8B4C7] font-mono tracking-tight flex items-center gap-2">
              <span>SISTEMA DE INTELIGÊNCIA ESPACIAL E ANÁLISE CRIMINAL</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            </p>
          </div>
        </div>

        {/* Tactical Telemetry Metrics */}
        <div className="flex flex-wrap items-center gap-3 bg-[#0B0D12] border border-[#1E2536] rounded p-2 px-3.5 text-xs font-mono shadow-inner">
          <div className="flex items-center gap-2.5 pr-3.5 border-r border-[#1E2536]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <Database className="w-3.5 h-3.5 text-[#C4A76E]" />
            <div>
              <span className="text-[9px] text-[#8E9BAE] block uppercase font-bold tracking-wider">Investigados</span>
              <span className="text-[#F3EEE4] font-bold text-xs">{totalSuspects}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 pr-3.5 border-r border-[#1E2536]">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <div>
              <span className="text-[9px] text-[#8E9BAE] block uppercase font-bold tracking-wider">Mandados Ativos</span>
              <span className="text-red-400 font-bold text-xs">{activeWarrants}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Layers className="w-3.5 h-3.5 text-[#60A5FA]" />
            <div>
              <span className="text-[9px] text-[#8E9BAE] block uppercase font-bold tracking-wider">Ocorrências</span>
              <span className="text-[#60A5FA] font-bold text-xs">{totalIncidents}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-[#0E121B] border-b border-[#1E2536] px-6 py-2 flex items-center justify-between overflow-x-auto">
        <nav className="flex gap-2 font-mono">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-1.5 rounded text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === 'map'
                ? 'bg-[#C4A76E] text-black font-extrabold shadow-md shadow-[#C4A76E]/20'
                : 'text-[#8E9BAE] hover:text-[#F3EEE4] hover:bg-[#171E2D] border border-transparent hover:border-[#1E2536]'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            Mapeamento Tático
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`px-4 py-1.5 rounded text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === 'network'
                ? 'bg-[#C4A76E] text-black font-extrabold shadow-md shadow-[#C4A76E]/20'
                : 'text-[#8E9BAE] hover:text-[#F3EEE4] hover:bg-[#171E2D] border border-transparent hover:border-[#1E2536]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Grafo de Vínculos
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-1.5 rounded text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-[#C4A76E] text-black font-extrabold shadow-md shadow-[#C4A76E]/20'
                : 'text-[#8E9BAE] hover:text-[#F3EEE4] hover:bg-[#171E2D] border border-transparent hover:border-[#1E2536]'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-[#60A5FA]" />
            IA Triagem & Cruzamento
          </button>
          <button
            onClick={() => setActiveTab('orcrim')}
            className={`px-4 py-1.5 rounded text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'orcrim'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white font-extrabold shadow-md shadow-red-500/20'
                : 'text-[#8E9BAE] hover:text-white hover:bg-[#171E2D] border border-transparent hover:border-red-500/40'
            }`}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${activeTab === 'orcrim' ? 'text-white' : 'text-red-400'}`} />
            <span>ORCRIM • Organogramas</span>
            <span className="px-1.5 py-0.2 text-[9px] bg-red-950 text-red-300 rounded font-black border border-red-800/80">
              FACÇÕES
            </span>
          </button>
          <button
            onClick={() => setActiveTab('db')}
            className={`px-4 py-1.5 rounded text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === 'db'
                ? 'bg-[#C4A76E] text-black font-extrabold shadow-md shadow-[#C4A76E]/20'
                : 'text-[#8E9BAE] hover:text-[#F3EEE4] hover:bg-[#171E2D] border border-transparent hover:border-[#1E2536]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Banco de Investigados
          </button>
        </nav>


        <div className="text-[11px] font-mono text-[#8E9BAE] hidden md:flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 bg-[#C4A76E] rounded-full animate-pulse"></span>
          <span>GUARDIÃO DO ALTO RIO DAS VELHAS • 35º BPM</span>
        </div>
      </div>

      {/* Main Content Stage */}
      <main className="flex-grow p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div
              key="map-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 xl:grid-cols-3 gap-6"
            >
              {/* GIS Map container */}
              <div className="xl:col-span-2 space-y-4">
                <TacticalMap
                  selectedCoords={selectedCoords}
                  onSelectCoords={handleMapCoordinatePick}
                  highlightedSuspectId={highlightedSuspectId}
                  occurrencesList={occurrences}
                  addressesList={addresses}
                  suspectsList={suspects}
                  onRefresh={fetchTelemetry}
                  selectedGangZone={selectedGangZone}
                  onSelectGangZone={setSelectedGangZone}
                  gangAreasProp={gangAreas}
                  onGangAreasChange={setGangAreas}
                />
              </div>

              {/* Sidebar: Tactical Gangs & Intelligence Details */}
              <div className="h-[740px] xl:h-[840px] flex flex-col">
                <TacticalGangSidebar
                  gangAreas={gangAreas}
                  selectedGangZone={selectedGangZone}
                  onSelectGangZone={setSelectedGangZone}
                  suspects={suspects}
                  addresses={addresses}
                  occurrences={occurrences}
                  onFocusCoordinates={(coords) => {
                    handleMapCoordinatePick(coords);
                  }}
                  onViewSuspectDetail={(suspect) => {
                    setHighlightedSuspectId(suspect.id);
                    openSuspectDossier(suspect.id, suspect);
                  }}
                  onRunAiSweep={(zone) => {
                    if (zone) {
                      setSelectedGangZone(zone);
                    }
                    setActiveTab('ai');
                    handleMatchSuspects();
                  }}
                  onRegisterOccurrence={(coords) => {
                    if (coords) {
                      setNewIncidentForm((prev) => ({
                        ...prev,
                        lat: coords.lat.toString(),
                        lng: coords.lng.toString(),
                      }));
                    }
                    setIsAddingOccurrence(true);
                    setActiveTab('db');
                  }}
                  onRegisterAddress={(coords) => {
                    if (coords) {
                      setNewAddressForm((prev) => ({
                        ...prev,
                        lat: coords.lat.toString(),
                        lng: coords.lng.toString(),
                      }));
                    }
                    setIsAddingAddress(true);
                    setActiveTab('db');
                  }}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'network' && (
            <motion.div
              key="network-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <NetworkGraph onSelectNode={handleViewSuspectDetail} />
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div
              key="ai-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Sub-Mode Selector: Triagem por Narrativa vs. Reconhecimento Facial */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F0F12] border border-zinc-800 p-2.5 rounded shadow-xl font-mono">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAiMode('narrative')}
                    className={`px-3.5 py-2 rounded text-xs font-bold uppercase transition flex items-center gap-2 cursor-pointer ${
                      aiMode === 'narrative'
                        ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>1. Triagem por Narrativa / B.O.</span>
                  </button>

                  <button
                    onClick={() => setAiMode('facial')}
                    className={`px-3.5 py-2 rounded text-xs font-bold uppercase transition flex items-center gap-2 cursor-pointer ${
                      aiMode === 'facial'
                        ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>2. Reconhecimento Facial & Biometria IA</span>
                    <span className="text-[8px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-1 py-0.5 rounded font-black">
                      NOVO
                    </span>
                  </button>
                </div>

                <div className="text-[10px] text-zinc-400 flex items-center gap-2 px-2">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Motor Forense Multimodal // Gemini 3.7 Vision & Flash</span>
                </div>
              </div>

              {aiMode === 'facial' ? (
                <FacialRecognitionModule
                  onSelectSuspectForDetail={(suspect) => handleViewSuspectDetail(suspect.id)}
                  onLocateOnMap={(coords) => {
                    setSelectedCoords(coords);
                    setActiveTab('map');
                  }}
                />
              ) : (
                <>
                  {/* Top Controls Card: Narrative Input, Physical Filters & Intelligence Execution */}
                  <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 flex flex-col shadow-2xl tactical-corner">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-zinc-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="text-amber-500 w-4 h-4" />
                        <h3 className="font-bold text-zinc-100 text-xs uppercase tracking-widest font-mono">
                          Mecanismo de Inteligência Tática & Cruzamento Criminal // 35º BPM
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleResetIntelligence}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-mono font-bold rounded transition flex items-center gap-1.5 cursor-pointer"
                          title="Limpar campos e iniciar uma nova consulta do zero"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>Nova Consulta / Limpar</span>
                        </button>
                        <span className="text-[9px] font-mono text-amber-400 bg-amber-950/30 border border-amber-800/40 px-2 py-0.5 rounded font-bold">
                          GEMINI 3.7 FLASH + HEURÍSTICA FORENSE
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                      Insira o relato da ocorrência policial (B.O., COPOM, SOU) e/ou defina características físicas, tatuagens, cicatrizes e veículos. O sistema processará as evidências, avaliará o nível de alerta territorial e cruzará a base de infratores calculando a probabilidade de autoria.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold mb-1 flex items-center justify-between">
                          <span>Narrativa do Boletim de Ocorrência / COPOM</span>
                          {narrativeInput && (
                            <button
                              onClick={() => setNarrativeInput('')}
                              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-normal lowercase"
                            >
                              limpar texto
                            </button>
                          )}
                        </label>
                        <textarea
                          value={narrativeInput}
                          onChange={(e) => setNarrativeInput(e.target.value)}
                          className="w-full min-h-28 bg-[#0A0A0B] text-zinc-200 p-3 rounded border border-zinc-800 focus:outline-none focus:border-amber-500 text-xs font-mono leading-relaxed resize-y focus:ring-1 focus:ring-amber-500/20"
                          placeholder="Cole aqui a narrativa policial, transcrição do chamado COPOM ou descrição dos fatos..."
                        />
                      </div>

                      {/* Expandable Section: Filtros Táticos por Características Físicas, Tatuagens, Cicatrizes & Veículos */}
                      <div className="bg-[#0A0A0B] border border-zinc-800 rounded p-3 transition">
                        <button
                          type="button"
                          onClick={() => setShowPhysicalFilters(!showPhysicalFilters)}
                          className="w-full flex items-center justify-between text-left font-mono text-xs text-zinc-200 hover:text-amber-400 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Fingerprint className="w-4 h-4 text-amber-500" />
                            <span className="font-bold uppercase tracking-wider text-[11px]">
                              Triagem Específica por Tatuagens, Cicatrizes, Físico & Veículos
                            </span>
                            {activeFiltersCount > 0 && (
                              <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded">
                                {activeFiltersCount} ativo(s)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
                            <span>{showPhysicalFilters ? 'Ocultar Filtros' : 'Expandir Filtros'}</span>
                            {showPhysicalFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </button>

                        {showPhysicalFilters && (
                          <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-3 font-mono text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {/* Tatuagens */}
                              <div>
                                <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
                                  Tatuagens / Desenhos Corporais
                                </label>
                                <input
                                  type="text"
                                  value={intelligenceFilters.tatuagens}
                                  onChange={(e) => setIntelligenceFilters({ ...intelligenceFilters, tatuagens: e.target.value })}
                                  placeholder="Ex: Palhaço no braço, Carpa, Teia, Pescoço..."
                                  className="w-full bg-[#0F0F12] border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1.5 rounded focus:border-amber-500 focus:outline-none"
                                />
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {['Palhaço', 'Carpa', 'Coringa', 'Teia', 'Braço', 'Pescoço', 'Mão', 'Cruz'].map((tag) => (
                                    <button
                                      key={tag}
                                      type="button"
                                      onClick={() => {
                                        const current = intelligenceFilters.tatuagens;
                                        const next = current ? (current.includes(tag) ? current : `${current}, ${tag}`) : tag;
                                        setIntelligenceFilters({ ...intelligenceFilters, tatuagens: next });
                                      }}
                                      className="text-[9px] px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-amber-300 rounded cursor-pointer transition"
                                    >
                                      +{tag}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Cicatrizes & Sinais */}
                              <div>
                                <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
                                  Cicatrizes & Sinais Particulares
                                </label>
                                <input
                                  type="text"
                                  value={intelligenceFilters.cicatrizes}
                                  onChange={(e) => setIntelligenceFilters({ ...intelligenceFilters, cicatrizes: e.target.value })}
                                  placeholder="Ex: Cicatriz no rosto, marca de tiro, queimadura..."
                                  className="w-full bg-[#0F0F12] border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1.5 rounded focus:border-amber-500 focus:outline-none"
                                />
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {['Rosto', 'Tiro', 'Queimadura', 'Dente de ouro', 'Manco'].map((tag) => (
                                    <button
                                      key={tag}
                                      type="button"
                                      onClick={() => {
                                        const current = intelligenceFilters.cicatrizes;
                                        const next = current ? (current.includes(tag) ? current : `${current}, ${tag}`) : tag;
                                        setIntelligenceFilters({ ...intelligenceFilters, cicatrizes: next });
                                      }}
                                      className="text-[9px] px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-amber-300 rounded cursor-pointer transition"
                                    >
                                      +{tag}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Veículo Utilizado */}
                              <div>
                                <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
                                  Veículo / Meio de Transporte
                                </label>
                                <input
                                  type="text"
                                  value={intelligenceFilters.veiculo}
                                  onChange={(e) => setIntelligenceFilters({ ...intelligenceFilters, veiculo: e.target.value })}
                                  placeholder="Ex: Moto Titan preta, Fan vermelha, Palio prata..."
                                  className="w-full bg-[#0F0F12] border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1.5 rounded focus:border-amber-500 focus:outline-none"
                                />
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {['Moto Titan Preta', 'Fan Vermelha', 'XRE', 'Palio Prata', 'Van Sprinter', 'Sem Placa'].map((tag) => (
                                    <button
                                      key={tag}
                                      type="button"
                                      onClick={() => setIntelligenceFilters({ ...intelligenceFilters, veiculo: tag })}
                                      className="text-[9px] px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-amber-300 rounded cursor-pointer transition"
                                    >
                                      +{tag}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Cor de Pele */}
                              <div>
                                <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
                                  Cor da Pele / Etnia
                                </label>
                                <select
                                  value={intelligenceFilters.cor_pele}
                                  onChange={(e) => setIntelligenceFilters({ ...intelligenceFilters, cor_pele: e.target.value })}
                                  className="w-full bg-[#0F0F12] border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1.5 rounded focus:border-amber-500 focus:outline-none"
                                >
                                  <option value="">Todas / Não declarada</option>
                                  <option value="Parda">Parda</option>
                                  <option value="Negra">Negra / Preta</option>
                                  <option value="Branca">Branca / Clara</option>
                                  <option value="Morena">Morena</option>
                                </select>
                              </div>

                              {/* Compleição Física */}
                              <div>
                                <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
                                  Compleição Física
                                </label>
                                <select
                                  value={intelligenceFilters.compleicao}
                                  onChange={(e) => setIntelligenceFilters({ ...intelligenceFilters, compleicao: e.target.value })}
                                  className="w-full bg-[#0F0F12] border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1.5 rounded focus:border-amber-500 focus:outline-none"
                                >
                                  <option value="">Qualquer compleição</option>
                                  <option value="Atlética">Atlética / Forte</option>
                                  <option value="Delgada">Magra / Delgada</option>
                                  <option value="Média">Média</option>
                                  <option value="Robusta">Robusta / Obesa</option>
                                </select>
                              </div>

                              {/* Bairro / Setor do 35º BPM */}
                              <div>
                                <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
                                  Bairro / Região de Atuação (35º BPM)
                                </label>
                                <select
                                  value={intelligenceFilters.bairro}
                                  onChange={(e) => setIntelligenceFilters({ ...intelligenceFilters, bairro: e.target.value })}
                                  className="w-full bg-[#0F0F12] border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1.5 rounded focus:border-amber-500 focus:outline-none"
                                >
                                  <option value="">Qualquer bairro da circunscrição</option>
                                  <option value="Bom Destino">Bom Destino</option>
                                  <option value="Palmital">Palmital</option>
                                  <option value="São Benedito">São Benedito</option>
                                  <option value="Campão">Campão</option>
                                  <option value="Duquesa">Duquesa</option>
                                  <option value="Cristina">Cristina</option>
                                  <option value="Baronesa">Baronesa</option>
                                  <option value="Asteca">Asteca</option>
                                  <option value="Frimisa">Frimisa</option>
                                  <option value="Centro">Centro</option>
                                  <option value="Morada dos Nobres">Morada dos Nobres</option>
                                  <option value="Londrina">Londrina</option>
                                  <option value="Adeodato">Adeodato</option>
                                </select>
                              </div>

                              {/* Gangue / Facção */}
                              <div className="md:col-span-2 lg:col-span-3">
                                <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">
                                  Facção / Gangue Suspeita
                                </label>
                                <div className="flex flex-wrap gap-2 items-center">
                                  <input
                                    type="text"
                                    value={intelligenceFilters.faccao}
                                    onChange={(e) => setIntelligenceFilters({ ...intelligenceFilters, faccao: e.target.value })}
                                    placeholder="Ex: Gangue do Muleta, Gangue do Campão, PCC, CV..."
                                    className="flex-1 min-w-[200px] bg-[#0F0F12] border border-zinc-800 text-zinc-200 text-xs px-2.5 py-1.5 rounded focus:border-amber-500 focus:outline-none"
                                  />
                                  {['Gangue do Muleta', 'Gangue do Campão', 'Palmital', 'PCC', 'CV'].map((fac) => (
                                    <button
                                      key={fac}
                                      type="button"
                                      onClick={() => setIntelligenceFilters({ ...intelligenceFilters, faccao: fac })}
                                      className="text-[10px] px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-400 rounded cursor-pointer"
                                    >
                                      +{fac}
                                    </button>
                                  ))}
                                  {activeFiltersCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setIntelligenceFilters({
                                        tatuagens: '',
                                        cicatrizes: '',
                                        sinais_particulares: '',
                                        cor_pele: '',
                                        compleicao: '',
                                        veiculo: '',
                                        armas: '',
                                        bairro: '',
                                        faccao: '',
                                      })}
                                      className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer ml-auto"
                                    >
                                      Limpar Filtros
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleRunIntelligenceAnalysis}
                          disabled={isIntelligenceAnalyzing}
                          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black rounded text-xs transition uppercase flex items-center justify-center gap-1.5 font-mono shadow-md shadow-amber-500/20 cursor-pointer"
                        >
                          {isIntelligenceAnalyzing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Executando Cruzamento IA...
                            </>
                          ) : (
                            <>
                              <BrainCircuit className="w-3.5 h-3.5" /> Executar Cruzamento de Inteligência
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleResetIntelligence}
                          className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded transition font-mono flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-zinc-400" />
                          Nova Consulta
                        </button>
                        <button
                          onClick={handleParseReport}
                          disabled={isParsing}
                          className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded transition font-mono flex items-center gap-1.5 cursor-pointer"
                        >
                          {isParsing ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <FileText className="w-3 h-3 text-cyan-400" />
                          )}
                          Parser B.O.
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => {
                            setNarrativeInput(
                              'ACIONADOS PELO COPOM PARA ATENDIMENTO DE UMA CHAMADA DE HOMICÍDIO NA RUA DOS PEQUIZEIROS 187, BAIRRO BOM DESTINO - SANTA LUZIA. NO LOCAL DEPARAMOS COM UM CORPO CAÍDO AO SOLO SEM VIDA, COM PERFURAÇÕES PROVENIENTES DE DISPAROS DE ARMA DE FOGO. TESTEMUNHAS RELATAM AÇÃO DE DOIS INDIVÍDUOS EM UMA MOTOCICLETA ESCURA ENVOLVIDOS EM GUERRA DE FACÇÕES.'
                            );
                            setIntelligenceFilters({
                              ...intelligenceFilters,
                              bairro: 'Bom Destino',
                              veiculo: 'Motocicleta escura'
                            });
                          }}
                          className="px-2 py-1 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/50 text-amber-300 text-[10px] rounded transition font-mono cursor-pointer"
                        >
                          Exemplo Homicídio (Bom Destino)
                        </button>
                        <button
                          onClick={() =>
                            setNarrativeInput(
                              'Na noite de ontem, um caminhão contendo televisores de última geração foi interceptado por criminosos armados na região de Heliópolis. O motorista relatou que foi abordado de forma agressiva por dois homens utilizando uma van Sprinter branca. O líder da quadrilha era careca de compleição atlética e possuía uma tatuagem visível de palhaço no braço, proferindo ameaças verbais com uma pistola calibre 380, auxiliado por um comparsa alto conhecido como Neguinho.'
                            )
                          }
                          className="px-2 py-1 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] rounded transition font-mono cursor-pointer"
                        >
                          Exemplo Carga (Palhaço/Armado)
                        </button>
                        <button
                          onClick={() =>
                            setNarrativeInput(
                              'Dois indivíduos numa motocicleta Honda preta assaltaram um estudante na passarela do Brás. O motorista era de cor parda, vestia blusa cinza e fazia alusão de portar arma sob o casaco. O rapaz que estava na garupa foi identificado como "Didi", de dente de ouro frontal superior, o qual recolheu os celulares das vítimas ameaçando-as verbalmente antes de fugir.'
                            )
                          }
                          className="px-2 py-1 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] rounded transition font-mono cursor-pointer"
                        >
                          Exemplo Transeunte (Didi)
                        </button>
                      </div>
                    </div>

                    {intelligenceError && (
                      <div className="mt-4 p-3 bg-red-950/40 border border-red-900 text-red-200 rounded text-xs font-mono flex items-center justify-between">
                        <div>
                          <p className="font-semibold">Aviso de Triagem:</p>
                          <p className="mt-0.5">{intelligenceError}</p>
                        </div>
                        <button
                          onClick={() => setIntelligenceError(null)}
                          className="text-xs text-red-400 hover:text-white px-2 py-1"
                        >
                          Fechar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Structured Output of Intelligence Analysis (User Schema: Ocorrência Processada, Alerta, Cruzamento) */}
                  {intelligenceResult && (
                    <div className="space-y-6">
                      {/* Sub-header with Reset Consultation Button */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0F0F12] border border-zinc-800 p-2.5 rounded font-mono text-xs">
                        <div className="flex items-center gap-2 text-zinc-300">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold">Cruzamento Concluído:</span>
                          <span className="text-zinc-400">
                            {intelligenceResult.cruzamento_suspeitos?.length || 0} suspeito(s) compatibilizado(s)
                          </span>
                        </div>
                        <button
                          onClick={handleResetIntelligence}
                          className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 font-bold rounded flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Fazer Nova Consulta</span>
                        </button>
                      </div>

                      {/* Alert Banner: Alerta de Reincidência no Perímetro */}
                      {intelligenceResult.alerta_reincidencia_perimetro && (
                        <div
                          className={`p-4 rounded border font-mono flex items-start gap-3 shadow-lg ${
                            intelligenceResult.alerta_reincidencia_perimetro.nivel_alerta === 'ALTO'
                              ? 'bg-red-950/30 border-red-800/80 text-red-200'
                              : intelligenceResult.alerta_reincidencia_perimetro.nivel_alerta === 'MEDIO'
                              ? 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                              : 'bg-blue-950/30 border-blue-800/80 text-blue-200'
                          }`}
                        >
                          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            intelligenceResult.alerta_reincidencia_perimetro.nivel_alerta === 'ALTO'
                              ? 'text-red-400 animate-pulse'
                              : intelligenceResult.alerta_reincidencia_perimetro.nivel_alerta === 'MEDIO'
                              ? 'text-amber-400'
                              : 'text-blue-400'
                          }`} />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                                ALERTA DE REINCIDÊNCIA NO PERÍMETRO:
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                intelligenceResult.alerta_reincidencia_perimetro.nivel_alerta === 'ALTO'
                                  ? 'bg-red-500 text-black'
                                  : intelligenceResult.alerta_reincidencia_perimetro.nivel_alerta === 'MEDIO'
                                  ? 'bg-amber-500 text-black'
                                  : 'bg-blue-500 text-black'
                              }`}>
                                NÍVEL {intelligenceResult.alerta_reincidencia_perimetro.nivel_alerta}
                              </span>
                            </div>
                            <p className="text-xs font-sans leading-relaxed text-zinc-200">
                              {intelligenceResult.alerta_reincidencia_perimetro.observacao}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Panel 1: Ocorrência Processada */}
                        <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 shadow-2xl tactical-corner font-mono space-y-4">
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                            <div className="flex items-center gap-2">
                              <FileText className="text-cyan-400 w-4 h-4" />
                              <h4 className="font-bold text-zinc-100 text-xs uppercase tracking-wider">
                                Ocorrência Processada
                              </h4>
                            </div>
                            <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-cyan-400 px-1.5 py-0.5 rounded">
                              ESTRUTURA B.O.
                            </span>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div className="bg-[#0A0A0B] p-2.5 rounded border border-zinc-800">
                              <span className="text-[9px] text-zinc-500 block uppercase font-bold">Tipificação Penal</span>
                              <span className="text-amber-400 font-bold text-xs">
                                {intelligenceResult.ocorrencia_processada.tipificacao}
                              </span>
                            </div>

                            <div className="bg-[#0A0A0B] p-2.5 rounded border border-zinc-800">
                              <span className="text-[9px] text-zinc-500 block uppercase font-bold">Localização</span>
                              <span className="text-zinc-200 block">
                                {intelligenceResult.ocorrencia_processada.logradouro ? `${intelligenceResult.ocorrencia_processada.logradouro}, ` : ''}
                                {intelligenceResult.ocorrencia_processada.bairro} - {intelligenceResult.ocorrencia_processada.municipio}
                              </span>
                            </div>

                            <div className="bg-[#0A0A0B] p-2.5 rounded border border-zinc-800">
                              <span className="text-[9px] text-zinc-500 block uppercase font-bold">Modus Operandi (Resumo)</span>
                              <p className="text-zinc-300 font-sans text-xs leading-relaxed mt-1">
                                {intelligenceResult.ocorrencia_processada.modus_operandi_resumo}
                              </p>
                            </div>

                            {/* Características Declaradas */}
                            <div className="bg-[#0A0A0B] p-2.5 rounded border border-zinc-800 space-y-2">
                              <span className="text-[9px] text-cyan-400 block uppercase font-bold border-b border-zinc-800 pb-1">
                                Características Físicas & Tatuagens Declaradas
                              </span>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                  <span className="text-[9px] text-zinc-500 block">Cor de Pele</span>
                                  <span className="text-zinc-200 font-semibold">{intelligenceResult.ocorrencia_processada.caracteristicas_declaradas?.pele || 'Não declarada'}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-zinc-500 block">Vestimentas</span>
                                  <span className="text-zinc-200 font-semibold">{intelligenceResult.ocorrencia_processada.caracteristicas_declaradas?.vestimentas || 'Não declarada'}</span>
                                </div>
                              </div>
                              {(intelligenceResult.ocorrencia_processada.caracteristicas_declaradas as any)?.tatuagens && (
                                <div>
                                  <span className="text-[9px] text-zinc-500 block">Tatuagens Declaradas</span>
                                  <span className="text-amber-300 text-xs font-semibold">{(intelligenceResult.ocorrencia_processada.caracteristicas_declaradas as any).tatuagens}</span>
                                </div>
                              )}
                              {(intelligenceResult.ocorrencia_processada.caracteristicas_declaradas as any)?.cicatrizes && (
                                <div>
                                  <span className="text-[9px] text-zinc-500 block">Cicatrizes / Marcas</span>
                                  <span className="text-amber-300 text-xs font-semibold">{(intelligenceResult.ocorrencia_processada.caracteristicas_declaradas as any).cicatrizes}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-[9px] text-zinc-500 block">Sinais Particulares</span>
                                <span className="text-zinc-300 text-xs">{intelligenceResult.ocorrencia_processada.caracteristicas_declaradas?.sinais_particulares || 'Nenhum'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-zinc-500 block">Armas & Veículos</span>
                                <span className="text-red-300 text-xs font-semibold">{intelligenceResult.ocorrencia_processada.caracteristicas_declaradas?.armas_veiculos || 'Nenhum'}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setNewIncidentForm({
                                  numero_bo: `BO-${Date.now().toString().slice(-4)}/2026`,
                                  data_hora: new Date().toISOString(),
                                  tipificacao_penal: intelligenceResult.ocorrencia_processada.tipificacao,
                                  descricao_fato: narrativeInput,
                                  modus_operandi: intelligenceResult.ocorrencia_processada.modus_operandi_resumo,
                                  armas_utilizadas: intelligenceResult.ocorrencia_processada.caracteristicas_declaradas?.armas_veiculos || 'Conforme B.O.',
                                  veiculo_utilizado: intelligenceResult.ocorrencia_processada.caracteristicas_declaradas?.armas_veiculos || 'Conforme B.O.',
                                  lat: selectedCoords?.lat.toString() || '-19.7712',
                                  lng: selectedCoords?.lng.toString() || '-43.8564',
                                });
                                setIsAddingOccurrence(true);
                                setActiveTab('db');
                              }}
                              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs rounded uppercase transition font-mono cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Salvar como Ocorrência B.O.
                            </button>
                          </div>
                        </div>

                        {/* Panel 2 & 3: Cruzamento de Suspeitos (Matrix & Operational Triage) */}
                    <div className="xl:col-span-2 bg-[#0F0F12] border border-zinc-800 rounded p-5 shadow-2xl tactical-corner font-mono flex flex-col">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-4">
                        <div className="flex items-center gap-2">
                          <Crosshair className="text-amber-500 w-4 h-4" />
                          <h4 className="font-bold text-zinc-100 text-xs uppercase tracking-wider">
                            Cruzamento de Suspeitos & Compatibilidade ({intelligenceResult.cruzamento_suspeitos?.length || 0})
                          </h4>
                        </div>
                        <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                          SCORED TRIAGE MATRIX
                        </span>
                      </div>

                      <div className="space-y-4 flex-grow overflow-y-auto max-h-[600px] pr-1">
                        {intelligenceResult.cruzamento_suspeitos?.map((item, idx) => (
                          <div
                            key={item.infrator_id || idx}
                            className="bg-[#0A0A0B] border border-zinc-800 hover:border-zinc-700 rounded p-4 space-y-3 transition"
                          >
                            {/* Suspect Header & Match Score */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.suspect_details?.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'}
                                  alt={item.vulgo}
                                  className="w-12 h-12 rounded object-cover border border-zinc-700 flex-shrink-0"
                                />
                                <div>
                                  <h5 className="font-bold text-zinc-100 text-xs">
                                    {item.nome_completo}
                                  </h5>
                                  <span className="text-[10px] text-amber-400 font-bold block">
                                    Vulgo: "{item.vulgo}"
                                  </span>
                                  {item.suspect_details && (
                                    <span className="text-[9px] text-zinc-400 block">
                                      Facção: {item.suspect_details.gangue_faccao} • Mandado Ativo: {item.suspect_details.status_mandado_prisao ? 'SIM' : 'NÃO'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end">
                                <span className="text-[9px] text-zinc-500 uppercase font-bold">Compatibilidade</span>
                                <div className={`px-2.5 py-1 rounded text-xs font-black flex items-center gap-1 ${
                                  item.score_compatibilidade >= 80
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                    : item.score_compatibilidade >= 50
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                }`}>
                                  {Math.round(item.score_compatibilidade)}%
                                </div>
                              </div>
                            </div>

                            {/* Fatores Convergentes & Divergentes */}
                            <div className="space-y-2">
                              {item.fatores_convergentes && item.fatores_convergentes.length > 0 && (
                                <div>
                                  <span className="text-[9px] text-emerald-400 uppercase font-bold block mb-1">
                                    Fatores Convergentes:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.fatores_convergentes.map((fc, i) => (
                                      <span
                                        key={i}
                                        className="text-[10px] bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1"
                                      >
                                        <CheckCircle className="w-2.5 h-2.5" /> {fc}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {item.fatores_divergentes && item.fatores_divergentes.length > 0 && (
                                <div>
                                  <span className="text-[9px] text-zinc-400 uppercase font-bold block mb-1">
                                    Fatores Divergentes:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.fatores_divergentes.map((fd, i) => (
                                      <span
                                        key={i}
                                        className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded"
                                      >
                                        {fd}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Justificativa Analítica */}
                            <div className="bg-[#0F0F12] p-3 rounded border border-zinc-800">
                              <span className="text-[9px] text-zinc-500 block uppercase font-bold mb-1">
                                Justificativa Analítica Policial:
                              </span>
                              <p className="text-zinc-300 font-sans text-xs leading-relaxed">
                                {item.justificativa_analitica}
                              </p>
                            </div>

                            {/* Recomendação Operacional */}
                            <div className="bg-amber-950/20 p-3 rounded border border-amber-900/40">
                              <span className="text-[9px] text-amber-400 block uppercase font-bold mb-1 flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Recomendação Operacional:
                              </span>
                              <p className="text-amber-200 font-sans text-xs leading-relaxed font-semibold">
                                {item.recomendacao_operacional}
                              </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-1 justify-end">
                              <button
                                onClick={() => {
                                  setHighlightedSuspectId(item.infrator_id);
                                  setActiveTab('map');
                                }}
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[10px] font-bold rounded transition cursor-pointer"
                              >
                                Ver no Mapa Tático
                              </button>
                              <button
                                onClick={() => handleViewSuspectDetail(item.infrator_id)}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold rounded transition cursor-pointer"
                              >
                                Ficha Completa
                              </button>
                              <button
                                onClick={() => handleStartEditSuspect(item.infrator_id)}
                                className="px-2.5 py-1 bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-800/80 text-[10px] font-bold rounded transition inline-flex items-center gap-1 cursor-pointer"
                                title="Editar ou Continuar Cadastro deste Infrator"
                              >
                                <Edit3 className="w-3 h-3 stroke-[2.5]" />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openSuspectDossier(item.infrator_id, suspects.find(s => s.id === item.infrator_id) || item.suspect_details)}
                                className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-[10px] rounded transition uppercase flex items-center gap-1 cursor-pointer shadow-sm shadow-amber-500/20"
                                title="Extrair Ficha do Infrator em PDF com Foto, Dados Pessoais e B.O.s"
                              >
                                <FileDown className="w-3.5 h-3.5 stroke-[2.5]" /> Extrair Ficha PDF
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Module B Geospatial Scorer Card (Collapsible or Auxiliary) */}
              <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 shadow-2xl tactical-corner">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sliders className="text-amber-500 w-4 h-4" />
                    <h3 className="font-bold text-zinc-100 text-xs uppercase tracking-widest font-mono">
                      Varredura por Raio Geográfico (Buffer PostGIS)
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                    POSTGIS BUFFER MATCH
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 font-mono">
                  {/* Coords state */}
                  <div className="bg-[#0A0A0B] p-2.5 rounded border border-zinc-800 text-xs">
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold">Mapeando Coordenadas</span>
                    {selectedCoords ? (
                      <span className="font-mono text-emerald-400 block mt-1">
                        {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
                      </span>
                    ) : (
                      <span className="text-amber-500 italic block mt-1">Nenhuma coordenada</span>
                    )}
                  </div>

                  {/* Radius set */}
                  <div className="bg-[#0A0A0B] p-2.5 rounded border border-zinc-800 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Raio de Influência</span>
                      <span className="text-amber-400 font-bold">{searchRadius} km</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="0.5"
                      value={searchRadius}
                      onChange={(e) => setSearchRadius(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 mt-2"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleMatchSuspects}
                      disabled={isMatching || !selectedCoords}
                      className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black rounded text-xs transition uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 font-mono border border-red-500/30 cursor-pointer"
                    >
                      {isMatching ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processando Varredura...
                        </>
                      ) : (
                        <>
                          <Crosshair className="w-3.5 h-3.5" /> Executar Varredura no Raio ({searchRadius}km)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {matchError && (
                  <div className="p-3 bg-red-950/40 border border-red-900 text-red-200 rounded text-xs font-mono">
                    <p className="font-semibold">Erro na varredura:</p>
                    <p className="mt-1">{matchError}</p>
                  </div>
                )}
              </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'db' && (
            <motion.div
              key="db-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Form trigger bar */}
              <div className="flex flex-wrap items-center gap-3 bg-[#0F0F12] border border-zinc-800 p-3.5 rounded shadow-xl font-mono">
                <button
                  onClick={() => {
                    setEditingSuspectId(null);
                    setNewSuspectForm({
                      nome_completo: '',
                      vulgo: '',
                      data_nascimento: '1995-01-01',
                      cpf: '',
                      foto_url: '',
                      gangue_faccao: '',
                      situacao_atual: 'EM_LIBERDADE',
                      status_mandado_prisao: false,
                      periculosidade: 'Média',
                      altura_estimada: '1.75',
                      cor_pele: 'Parda',
                      compleicao: 'Média',
                      tatuagens_detalhes: '',
                      cicatrizes: '',
                      sinais_particulares: '',
                    });
                    setSuspectOccurrencesList([]);
                    setSuspectAddressesList([]);
                    setSuspectPhotosList([]);
                    setIsAddingSuspect(true);
                    setIsAddingOccurrence(false);
                    setIsAddingAddress(false);
                  }}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold text-xs rounded transition flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" /> Cadastrar Novo Infrator
                </button>
                <button
                  onClick={() => {
                    setIsAddingOccurrence(true);
                    setIsAddingSuspect(false);
                    setIsAddingAddress(false);
                  }}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold text-xs rounded transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" /> Registrar Ocorrência (B.O.)
                </button>
                <button
                  onClick={() => {
                    setIsAddingAddress(true);
                    setIsAddingSuspect(false);
                    setIsAddingOccurrence(false);
                  }}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold text-xs rounded transition flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> Cadastrar Área de Atuação
                </button>
              </div>

              {/* Form Area */}
              {(isAddingSuspect || isAddingOccurrence || isAddingAddress) && (
                <div className="bg-[#0F0F12] border border-zinc-800 p-5 rounded relative tactical-corner shadow-2xl">
                  <button
                    onClick={() => {
                      setEditingSuspectId(null);
                      setIsAddingSuspect(false);
                      setIsAddingOccurrence(false);
                      setIsAddingAddress(false);
                    }}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>

                  {isAddingSuspect && (
                    <form onSubmit={handleAddSuspectSubmit} className="space-y-4 font-mono">
                      {editingSuspectId ? (
                        <div className="bg-amber-950/40 border border-amber-500/60 p-3.5 rounded space-y-1.5 mb-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-widest flex items-center gap-2">
                              <Edit3 className="w-4 h-4 text-amber-400" />
                              <span>Modo de Edição / Continuação de Cadastro: {newSuspectForm.nome_completo || 'Infrator'} {newSuspectForm.vulgo ? `("${newSuspectForm.vulgo}")` : ''}</span>
                            </h3>
                            <button
                              type="button"
                              onClick={handleCancelEditSuspect}
                              className="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 px-2.5 py-1 rounded cursor-pointer transition font-bold"
                            >
                              ✕ Cancelar Edição
                            </button>
                          </div>
                          <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                            Você está editando este cadastro existente. Complete ou altere quaisquer dados (informações pessoais, fotos, características físicas, endereços e B.O.s vinculados) e clique em <strong className="text-amber-400">Salvar Alterações da Ficha</strong> no fim do formulário.
                          </p>
                        </div>
                      ) : (
                        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <UserPlus className="w-4 h-4 text-emerald-400" /> Cadastrar Ficha de Infrator
                        </h3>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Nome Completo *</label>
                          <input
                            type="text"
                            required
                            value={newSuspectForm.nome_completo}
                            onChange={(e) => setNewSuspectForm({ ...newSuspectForm, nome_completo: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Alcunha / Vulgo</label>
                          <input
                            type="text"
                            value={newSuspectForm.vulgo}
                            onChange={(e) => setNewSuspectForm({ ...newSuspectForm, vulgo: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Número de Documento</label>
                          <input
                            type="text"
                            placeholder="Ex: CPF, RG ou outro doc"
                            value={newSuspectForm.cpf}
                            onChange={(e) => setNewSuspectForm({ ...newSuspectForm, cpf: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Data de Nascimento</label>
                          <input
                            type="date"
                            value={newSuspectForm.data_nascimento}
                            onChange={(e) => setNewSuspectForm({ ...newSuspectForm, data_nascimento: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Organização / Facção</label>
                          <input
                            type="text"
                            placeholder="Ex: PCC, CV, S/F"
                            value={newSuspectForm.gangue_faccao}
                            onChange={(e) => setNewSuspectForm({ ...newSuspectForm, gangue_faccao: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-amber-400 font-bold block mb-1">
                            Situação Prisional / Status Jurídico *
                          </label>
                          <select
                            value={newSuspectForm.situacao_atual || 'EM_LIBERDADE'}
                            onChange={(e) => {
                              const val = e.target.value as 'EM_LIBERDADE' | 'FORAGIDO' | 'PRESO' | 'MORTO';
                              setNewSuspectForm({ 
                                ...newSuspectForm, 
                                situacao_atual: val,
                                status_mandado_prisao: val === 'FORAGIDO' ? true : (val === 'MORTO' || val === 'PRESO' ? false : newSuspectForm.status_mandado_prisao),
                              });
                            }}
                            className="w-full bg-[#0A0A0B] border border-amber-500/60 rounded p-2 text-xs focus:outline-none focus:border-amber-400 text-amber-300 font-bold"
                          >
                            <option value="EM_LIBERDADE">🟢 EM LIBERDADE (Na rua / Monitorado)</option>
                            <option value="FORAGIDO">🔴 FORAGIDO DA JUSTIÇA (Mandado Ativo)</option>
                            <option value="PRESO">🔒 PRESO / SISTEMA PENITENCIÁRIO</option>
                            <option value="MORTO">💀 MORTO / FALECIDO (Óbito Confirmado)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Grau de Perigo</label>
                          <select
                            value={newSuspectForm.periculosidade}
                            onChange={(e) => setNewSuspectForm({ ...newSuspectForm, periculosidade: e.target.value as any })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          >
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Média</option>
                            <option value="Alta">Alta</option>
                            <option value="Extrema">Extrema</option>
                          </select>
                        </div>
                        <div className="flex items-center pt-5">
                          <label className="text-xs uppercase text-zinc-300 font-bold flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newSuspectForm.status_mandado_prisao}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setNewSuspectForm({ 
                                  ...newSuspectForm, 
                                  status_mandado_prisao: isChecked,
                                  situacao_atual: isChecked ? 'FORAGIDO' : (newSuspectForm.situacao_atual === 'FORAGIDO' ? 'EM_LIBERDADE' : newSuspectForm.situacao_atual),
                                });
                              }}
                              className="mr-2 accent-amber-500"
                            /> Mandado de Prisão Ativo?
                          </label>
                        </div>
                      </div>

                      {/* Dedicated Unlimited Photo Upload & Gallery Management Section */}
                      <div className="bg-[#0A0A0B] p-4 rounded border border-zinc-800 space-y-3.5 tactical-corner">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-850 pb-2">
                          <label className="text-[10px] uppercase text-amber-400 font-bold flex items-center gap-1.5 tracking-widest font-mono">
                            <Camera className="w-3.5 h-3.5" />
                            Acervo Fotográfico & Biometria Tática (Capacidade Ilimitada)
                          </label>
                          <span className="text-[9px] bg-amber-950/40 border border-amber-800/60 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">
                            {suspectPhotosList.length} FOTO(S) CADASTRADA(S)
                          </span>
                        </div>

                        {/* Top Action Bar for Photo Upload */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Multi-file Upload Button */}
                          <label className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded transition uppercase tracking-wider font-mono cursor-pointer shadow-md shadow-amber-500/10">
                            <Upload className="w-4 h-4 stroke-[2.5]" />
                            <span>Carregar Fotos (Múltiplas / Ilimitadas)</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handleAddFilesToRegistration(e.target.files);
                                }
                              }}
                            />
                          </label>

                          {/* Quick Sample Pack */}
                          <button
                            type="button"
                            onClick={() => {
                              const samplePack: FotoInfrator[] = [
                                {
                                  id: `foto-${Date.now()}-face`,
                                  url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
                                  tipo: 'ROSTO',
                                  descricao: 'Foto Facial Frontal - Identificação Tática',
                                  principal: suspectPhotosList.length === 0,
                                  created_at: new Date().toISOString(),
                                },
                                {
                                  id: `foto-${Date.now()}-tat`,
                                  url: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=400&h=400&fit=crop',
                                  tipo: 'TATUAGEM',
                                  descricao: 'Tatuagem no antebraço direito (Carpa/Desenho tribal)',
                                  principal: false,
                                  created_at: new Date().toISOString(),
                                },
                                {
                                  id: `foto-${Date.now()}-cic`,
                                  url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
                                  tipo: 'CICATRIZ',
                                  descricao: 'Cicatriz no supercílio esquerdo',
                                  principal: false,
                                  created_at: new Date().toISOString(),
                                }
                              ];
                              setSuspectPhotosList((prev) => {
                                const next = [...prev, ...samplePack];
                                if (prev.length === 0) {
                                  setNewSuspectForm((f) => ({ ...f, foto_url: samplePack[0].url }));
                                }
                                return next;
                              });
                            }}
                            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded transition flex items-center gap-1.5 cursor-pointer font-mono"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>+ Adicionar Fotos Exemplo (Rosto + Tatuagem)</span>
                          </button>

                          {suspectPhotosList.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSuspectPhotosList([]);
                                setNewSuspectForm((f) => ({ ...f, foto_url: '' }));
                              }}
                              className="px-2.5 py-2 bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs rounded transition flex items-center gap-1 cursor-pointer font-mono ml-auto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Limpar Acervo</span>
                            </button>
                          )}
                        </div>

                        {/* Manual Link Input */}
                        <div className="bg-[#0F0F12] p-2.5 rounded border border-zinc-800 space-y-2">
                          <span className="text-[9px] uppercase text-zinc-400 font-bold block font-mono">
                            Ou Adicionar Foto via Link/URL com Classificação:
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                            <div className="md:col-span-6">
                              <input
                                type="text"
                                placeholder="Link da foto (https://...)"
                                value={newPhotoManualUrl}
                                onChange={(e) => setNewPhotoManualUrl(e.target.value)}
                                className="w-full bg-[#0A0A0B] border border-zinc-700 rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <select
                                value={newPhotoManualTipo}
                                onChange={(e) => setNewPhotoManualTipo(e.target.value as any)}
                                className="w-full bg-[#0A0A0B] border border-zinc-700 rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                              >
                                <option value="ROSTO">👤 Rosto / Face</option>
                                <option value="TATUAGEM">🎨 Tatuagem</option>
                                <option value="CICATRIZ">⚡ Cicatriz</option>
                                <option value="SINAL">🔍 Sinal Particular</option>
                                <option value="PERFIL">📐 Perfil / Lateral</option>
                                <option value="CORPO">🧍 Corpo Inteiro</option>
                                <option value="TATICA">🛡️ Foto Tática / Abordagem</option>
                              </select>
                            </div>
                            <div className="md:col-span-3 flex gap-1.5">
                              <input
                                type="text"
                                placeholder="Descrição (ex: Carpa no braço)"
                                value={newPhotoManualDesc}
                                onChange={(e) => setNewPhotoManualDesc(e.target.value)}
                                className="flex-1 bg-[#0A0A0B] border border-zinc-700 rounded p-1.5 text-xs text-zinc-200 focus:outline-none font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!newPhotoManualUrl.trim()) return;
                                  const isFirst = suspectPhotosList.length === 0;
                                  const newPhoto: FotoInfrator = {
                                    id: `foto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                    url: newPhotoManualUrl.trim(),
                                    tipo: newPhotoManualTipo,
                                    descricao: newPhotoManualDesc.trim() || `${newPhotoManualTipo} do infrator`,
                                    principal: isFirst,
                                    created_at: new Date().toISOString(),
                                  };
                                  setSuspectPhotosList((prev) => [...prev, newPhoto]);
                                  if (isFirst) {
                                    setNewSuspectForm((f) => ({ ...f, foto_url: newPhotoManualUrl.trim() }));
                                  }
                                  setNewPhotoManualUrl('');
                                  setNewPhotoManualDesc('');
                                }}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded transition uppercase font-mono cursor-pointer flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Adicionar</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Gallery Grid */}
                        {suspectPhotosList.length > 0 ? (
                          <div className="space-y-2 pt-1 font-mono">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                Galeria de Fotos ({suspectPhotosList.length}) — Clique na estrela ⭐ para definir a Foto Principal do Cadastro:
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {suspectPhotosList.map((foto, idx) => {
                                const isPrimary = foto.principal;
                                return (
                                  <div
                                    key={foto.id || idx}
                                    className={`relative rounded bg-[#0A0A0B] border overflow-hidden transition group ${
                                      isPrimary
                                        ? 'border-amber-400 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10'
                                        : 'border-zinc-800 hover:border-zinc-700'
                                    }`}
                                  >
                                    {/* Image Viewport */}
                                    <div className="aspect-square relative overflow-hidden bg-black flex items-center justify-center">
                                      <img
                                        src={foto.url}
                                        alt={foto.descricao || 'Foto do infrator'}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                                        onClick={() =>
                                          setInspectingPhoto({
                                            url: foto.url,
                                            tipo: foto.tipo,
                                            descricao: foto.descricao,
                                            principal: foto.principal,
                                            suspectName: newSuspectForm.nome_completo || 'Novo Cadastro'
                                          })
                                        }
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src =
                                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop';
                                        }}
                                      />

                                      {/* Top Badge: Primary or Category */}
                                      <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                                        {isPrimary ? (
                                          <span className="bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-1 uppercase tracking-wider">
                                            <Star className="w-2.5 h-2.5 fill-black" /> PRINCIPAL
                                          </span>
                                        ) : (
                                          <span className="bg-black/75 text-zinc-300 text-[8px] font-bold px-1.5 py-0.5 rounded border border-zinc-700/80 uppercase">
                                            {foto.tipo || 'FOTO'}
                                          </span>
                                        )}
                                      </div>

                                      {/* Hover Action Overlay */}
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 p-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setInspectingPhoto({
                                              url: foto.url,
                                              tipo: foto.tipo,
                                              descricao: foto.descricao,
                                              principal: foto.principal,
                                              suspectName: newSuspectForm.nome_completo || 'Novo Cadastro'
                                            })
                                          }
                                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] cursor-pointer shadow"
                                          title="Ampliar Foto"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>

                                        {!isPrimary && (
                                          <button
                                            type="button"
                                            onClick={() => handleSetRegistrationPrimaryPhoto(idx)}
                                            className="p-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-[10px] font-bold cursor-pointer shadow"
                                            title="Definir como Foto Principal do Cadastro"
                                          >
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleRemoveRegistrationPhoto(idx)}
                                          className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] cursor-pointer shadow"
                                          title="Remover Foto"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Bottom Info & Inline Editing */}
                                    <div className="p-1.5 bg-[#0D0D10] border-t border-zinc-850 space-y-1">
                                      <select
                                        value={foto.tipo || 'ROSTO'}
                                        onChange={(e) => handleUpdateRegistrationPhoto(idx, { tipo: e.target.value as any })}
                                        className="w-full bg-[#050507] border border-zinc-800 text-zinc-300 text-[9px] px-1 py-0.5 rounded focus:outline-none"
                                      >
                                        <option value="ROSTO">Rosto / Face</option>
                                        <option value="TATUAGEM">Tatuagem</option>
                                        <option value="CICATRIZ">Cicatriz</option>
                                        <option value="SINAL">Sinal Particular</option>
                                        <option value="PERFIL">Perfil Lateral</option>
                                        <option value="CORPO">Corpo Inteiro</option>
                                        <option value="TATICA">Foto Tática</option>
                                      </select>
                                      <input
                                        type="text"
                                        placeholder="Descrição do detalhe..."
                                        value={foto.descricao || ''}
                                        onChange={(e) => handleUpdateRegistrationPhoto(idx, { descricao: e.target.value })}
                                        className="w-full bg-[#050507] border border-zinc-800 text-zinc-300 text-[9px] px-1 py-0.5 rounded focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-zinc-950/60 rounded border border-dashed border-zinc-800 text-center font-mono text-xs text-zinc-500">
                            Nenhuma foto carregada ainda. Clique em "Carregar Fotos" para enviar fotos de rosto, tatuagens, cicatrizes e sinais físicos sem limite de quantidade.
                          </div>
                        )}
                      </div>

                      <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-4">Características Físicas</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Altura Estimada (m)</label>
                          <input
                            type="text"
                            value={newSuspectForm.altura_estimada}
                            onChange={(e) => setNewSuspectForm({ ...newSuspectForm, altura_estimada: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Cor da Pele</label>
                          <input
                            type="text"
                            value={newSuspectForm.cor_pele}
                            onChange={(e) => setNewSuspectForm({ ...newSuspectForm, cor_pele: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 block font-bold mb-1">Compleição Física</label>
                          <select
                            value={newSuspectForm.compleicao}
                            onChange={(e) => setNewSuspectForm({ ...newSuspectForm, compleicao: e.target.value as any })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          >
                            <option value="Delgada">Delgada</option>
                            <option value="Atlética">Atlética</option>
                            <option value="Média">Média</option>
                            <option value="Robusta">Robusta</option>
                            <option value="Obesa">Obesa</option>
                          </select>
                        </div>
                        <div className="md:col-span-3">
                          <label className="text-[9px] uppercase text-zinc-500 block font-bold mb-1">Detalhes de Tatuagens</label>
                          <textarea
                            value={newSuspectForm.tatuagens_detalhes}
                            onChange={(e) => setNewSuspectForm({ ...newSuspectForm, tatuagens_detalhes: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none resize-none h-16 text-zinc-200"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="text-[9px] uppercase text-zinc-500 block font-bold mb-1">Cicatrizes / Sinais de Nascença</label>
                          <textarea
                            value={newSuspectForm.cicatrizes}
                            onChange={(e) => setNewSuspectForm({ ...newSuspectForm, cicatrizes: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none resize-none h-16 text-zinc-200"
                          />
                        </div>
                      </div>

                      {/* Endereços Operacionais / Residência / Esconderijos (Múltiplos Endereços) */}
                      <div className="bg-[#0A0A0B] p-4 rounded border border-zinc-800 space-y-4 tactical-corner mt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-850 pb-2.5 gap-2">
                          <div>
                            <label className="text-[11px] uppercase text-amber-400 font-bold flex items-center gap-1.5 tracking-widest font-mono">
                              <MapPin className="w-4 h-4 text-amber-500" />
                              Endereços do Infrator (Residência, Esconderijos e Pontos de Atuação)
                            </label>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              Cadastre um ou múltiplos endereços conhecidos (Residência, Esconderijo, Boca de Fumo, Área de Atuação).
                            </p>
                          </div>
                          <span className="text-[10px] bg-zinc-900 border border-zinc-750 text-amber-400 font-bold px-2 py-0.5 rounded font-mono">
                            {suspectAddressesList.length} Endereço(s) Adicionado(s)
                          </span>
                        </div>

                        {/* Address Input Sub-Form */}
                        <div className="bg-[#121216] p-3 rounded border border-zinc-800 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                Tipo de Endereço / Local *
                              </label>
                              <select
                                value={suspectNewAddrData.tipo_endereco}
                                onChange={(e) => setSuspectNewAddrData({ ...suspectNewAddrData, tipo_endereco: e.target.value })}
                                className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                              >
                                <option value="Residência">Residência (Casa/Apto)</option>
                                <option value="Esconderijo">Esconderijo / Aparelho</option>
                                <option value="Área de Atuação">Área de Atuação / Território</option>
                                <option value="Ponto de Venda">Ponto de Venda / Boca de Fumo</option>
                                <option value="Local de Trabalho / Cobertura">Local de Trabalho / Cobertura</option>
                                <option value="Casa de Parentes">Casa de Parentes / Cônjuge</option>
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                Logradouro / Endereço (Rua, Avenida, Número, Beco) *
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: Rua Direita, 450 ou Beco dos Artistas, próx. ao nº 12"
                                value={suspectNewAddrData.logradouro}
                                onChange={(e) => setSuspectNewAddrData({ ...suspectNewAddrData, logradouro: e.target.value })}
                                className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                Bairro
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: São Benedito, Palmital, Centro"
                                value={suspectNewAddrData.bairro}
                                onChange={(e) => setSuspectNewAddrData({ ...suspectNewAddrData, bairro: e.target.value })}
                                className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                Cidade / Município
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: Santa Luzia, Belo Horizonte"
                                value={suspectNewAddrData.cidade}
                                onChange={(e) => setSuspectNewAddrData({ ...suspectNewAddrData, cidade: e.target.value })}
                                className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                Raio Estimado de Influência (km)
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: 2.5"
                                value={suspectNewAddrData.raio_influencia_km}
                                onChange={(e) => setSuspectNewAddrData({ ...suspectNewAddrData, raio_influencia_km: e.target.value })}
                                className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                              />
                            </div>

                            {/* Geo Coordinates */}
                            <div>
                              <label className="text-[9px] uppercase text-cyan-400 font-bold flex items-center gap-1 mb-1">
                                <MapPin className="w-3 h-3 text-cyan-400" /> Latitude (Lat)
                              </label>
                              <input
                                type="text"
                                placeholder="-19.7712"
                                value={suspectNewAddrData.lat}
                                onChange={(e) => setSuspectNewAddrData({ ...suspectNewAddrData, lat: e.target.value })}
                                className="w-full bg-[#0A0A0B] border border-cyan-900/50 rounded p-2 text-xs text-cyan-200 focus:outline-none font-mono"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] uppercase text-cyan-400 font-bold flex items-center gap-1 mb-1">
                                <MapPin className="w-3 h-3 text-cyan-400" /> Longitude (Long)
                              </label>
                              <input
                                type="text"
                                placeholder="-43.8564"
                                value={suspectNewAddrData.lng}
                                onChange={(e) => setSuspectNewAddrData({ ...suspectNewAddrData, lng: e.target.value })}
                                className="w-full bg-[#0A0A0B] border border-cyan-900/50 rounded p-2 text-xs text-cyan-200 focus:outline-none font-mono"
                              />
                            </div>

                            <div className="flex items-end pb-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setSuspectNewAddrData({
                                    ...suspectNewAddrData,
                                    lat: selectedCoords ? selectedCoords.lat.toFixed(5) : '-19.7712',
                                    lng: selectedCoords ? selectedCoords.lng.toFixed(5) : '-43.8564',
                                  })
                                }
                                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                                title="Carregar coordenadas do ponto selecionado no mapa"
                              >
                                <Crosshair className="w-3 h-3 text-amber-400" /> Ponto 35º BPM / Mapa
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handleAddAddressToSuspect}
                              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded transition uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10"
                            >
                              <Plus className="w-4 h-4 stroke-[2.5]" />
                              <span>Adicionar Este Endereço à Ficha</span>
                            </button>
                          </div>
                        </div>

                        {/* List of Attached Addresses */}
                        {suspectAddressesList.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <span className="text-[9px] uppercase text-zinc-400 font-bold block">
                              Endereços a serem gravados com o infrator:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                              {suspectAddressesList.map((addrItem) => (
                                <div
                                  key={addrItem.tempId}
                                  className="bg-[#0F0F12] border border-zinc-800 rounded p-2.5 flex items-start justify-between gap-2 text-xs font-mono"
                                >
                                  <div className="space-y-0.5 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-amber-400 text-[10px] uppercase bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded">
                                        {addrItem.tipo_endereco}
                                      </span>
                                      <span className="text-zinc-400 text-[10px]">{addrItem.bairro}</span>
                                    </div>
                                    <p className="text-zinc-200 font-medium text-xs">
                                      {addrItem.logradouro}
                                    </p>
                                    <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                                      <span>{addrItem.cidade}</span>
                                      <span>•</span>
                                      <span>Raio: {addrItem.raio_influencia_km} km</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAddressFromSuspect(addrItem.tempId)}
                                    className="p-1 text-zinc-500 hover:text-red-400 rounded transition cursor-pointer"
                                    title="Remover endereço"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-[#0A0A0B] p-4 rounded border border-zinc-800 space-y-4 tactical-corner mt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-850 pb-2.5 gap-2">
                          <div>
                            <label className="text-[11px] uppercase text-amber-400 font-bold flex items-center gap-1.5 tracking-widest font-mono">
                              <ShieldAlert className="w-4 h-4 text-amber-500" />
                              Ocorrências e Registros Criminais Vinculados (B.O.s / REDS)
                            </label>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              Vincule os boletins de ocorrência em que este indivíduo participou como Autor, Coautor, Suspeito, Vítima ou Notificado.
                            </p>
                          </div>
                          <span className="text-[10px] bg-zinc-900 border border-zinc-750 text-amber-400 font-bold px-2 py-0.5 rounded font-mono">
                            {suspectOccurrencesList.length} Ocorrência(s) Adicionada(s)
                          </span>
                        </div>

                        {/* Switcher: New vs From Other Suspect vs Existing */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-[#0F0F12] p-1.5 rounded border border-zinc-800">
                          <button
                            type="button"
                            onClick={() => setSuspectOcMode('new')}
                            className={`py-2 px-2 text-xs font-bold font-mono rounded transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              suspectOcMode === 'new'
                                ? 'bg-amber-500 text-black shadow'
                                : 'text-zinc-400 hover:text-zinc-200 bg-[#141419]'
                            }`}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Cadastrar Novo B.O. (Manual)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSuspectOcMode('from_other')}
                            className={`py-2 px-2 text-xs font-bold font-mono rounded transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              suspectOcMode === 'from_other'
                                ? 'bg-amber-500 text-black shadow'
                                : 'text-amber-300/90 hover:text-amber-200 bg-amber-950/20 border border-amber-800/40'
                            }`}
                          >
                            <Users className="w-3.5 h-3.5" />
                            B.O. de Outro Infrator / Copiar
                          </button>
                          <button
                            type="button"
                            onClick={() => setSuspectOcMode('existing')}
                            className={`py-2 px-2 text-xs font-bold font-mono rounded transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              suspectOcMode === 'existing'
                                ? 'bg-amber-500 text-black shadow'
                                : 'text-zinc-400 hover:text-zinc-200 bg-[#141419]'
                            }`}
                          >
                            <Search className="w-3.5 h-3.5" />
                            Lista Geral de B.O.s
                          </button>
                        </div>

                        {/* MODE 1: FROM OTHER SUSPECT / SYSTEM PICKER */}
                        {suspectOcMode === 'from_other' && (
                          <OccurrencePickerFromSuspects
                            occurrences={occurrences}
                            suspects={suspects}
                            currentSuspectName={newSuspectForm.nome_completo || 'Novo Infrator'}
                            selectedPapel={suspectOcPapel}
                            onChangePapel={(papel) => setSuspectOcPapel(papel)}
                            onLinkOccurrence={handleLinkOccurrenceFromPicker}
                            onCopyOccurrence={handleCopyOccurrenceDataToForm}
                            onDeleteOccurrence={(oc) => handleInitiateDeleteBo(oc.id, oc.numero_bo, oc.tipificacao_penal, oc.data_hora)}
                            alreadyLinkedIds={suspectOccurrencesList.map((item) => item.ocorrencia_id || item.numero_bo)}
                          />
                        )}

                        {/* MODE 2 & 3: MANUAL REGISTRATION OR SIMPLE SELECTOR */}
                        {suspectOcMode !== 'from_other' && (
                          <div className="bg-[#121216] p-3 rounded border border-zinc-800 space-y-3">
                            {/* Quick shortcut to copy from other suspect */}
                            {suspectOcMode === 'new' && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-[#09090C] rounded border border-amber-500/20 text-xs">
                                <span className="text-zinc-400 text-[11px] flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-amber-400" />
                                  Deseja reutilizar ou copiar um B.O. já registrado em outro infrator?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSuspectOcMode('from_other')}
                                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                                >
                                  <Users className="w-3 h-3" />
                                  Buscar B.O. de Outro Infrator
                                </button>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-1">
                                <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                  Condição / Papel do Infrator no Crime *
                                </label>
                                <select
                                  value={suspectOcPapel}
                                  onChange={(e) => setSuspectOcPapel(e.target.value)}
                                  className="w-full bg-[#0A0A0B] border border-amber-500/50 rounded p-2 text-xs text-amber-300 font-bold focus:outline-none"
                                >
                                  <option value="Autor">Autor (Principal)</option>
                                  <option value="Coautor">Coautor</option>
                                  <option value="Suspeito">Suspeito</option>
                                  <option value="Vítima">Vítima</option>
                                  <option value="Notificado">Notificado</option>
                                  <option value="Testemunha / Condutor">Testemunha / Condutor</option>
                                  <option value="Indiciado">Indiciado</option>
                                </select>
                              </div>

                              {suspectOcMode === 'existing' ? (
                                <div className="sm:col-span-2">
                                  <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                    Selecione a Ocorrência Cadastrada *
                                  </label>
                                  <select
                                    value={suspectOcExistingId}
                                    onChange={(e) => setSuspectOcExistingId(e.target.value)}
                                    className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs text-zinc-200 focus:outline-none"
                                  >
                                    <option value="">Selecione o B.O. na lista...</option>
                                    {occurrences.map((oc) => (
                                      <option key={oc.id} value={oc.id}>
                                        B.O. {oc.numero_bo} — {oc.tipificacao_penal} ({new Date(oc.data_hora).toLocaleDateString('pt-BR')})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                      Número do B.O. / REDS *
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Ex: REDS-2026-00458921-001"
                                      value={suspectNewOcData.numero_bo}
                                      onChange={(e) => setSuspectNewOcData({ ...suspectNewOcData, numero_bo: e.target.value })}
                                      className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs text-zinc-200 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                      Tipificação Penal *
                                    </label>
                                    <select
                                      value={suspectNewOcData.tipificacao_penal}
                                      onChange={(e) => setSuspectNewOcData({ ...suspectNewOcData, tipificacao_penal: e.target.value })}
                                      className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs text-zinc-200 focus:outline-none"
                                    >
                                      <option value="Averiguação">Averiguação</option>
                                      <option value="Roubo a Mão Armada">Roubo a Mão Armada (Art. 157 §2º)</option>
                                      <option value="Roubo de Carga">Roubo de Carga</option>
                                      <option value="Tráfico de Drogas">Tráfico Ilícito de Drogas (Art. 33)</option>
                                      <option value="Associação para o Tráfico">Associação para o Tráfico (Art. 35)</option>
                                      <option value="Homicídio Tentado">Homicídio Tentado (Art. 121 c/c 14)</option>
                                      <option value="Homicídio Consumado">Homicídio Consumado (Art. 121)</option>
                                      <option value="Porte Ilegal de Arma de Fogo">Porte Ilegal de Arma de Fogo (Lei 10.826)</option>
                                      <option value="Disparo de Arma de Fogo">Disparo de Arma de Fogo em Via Pública</option>
                                      <option value="Ameaça / Coação">Ameaça / Coação (Art. 147)</option>
                                      <option value="Lesão Corporal">Lesão Corporal (Art. 129)</option>
                                      <option value="Extorsão / Sequestro">Extorsão / Sequestro Relâmpago</option>
                                      <option value="Organização Criminosa">Organização Criminosa (Lei 12.850)</option>
                                      <option value="Furto">Furto (Art. 155)</option>
                                      <option value="Receptação">Receptação (Art. 180)</option>
                                      <option value="Outros">Outros / Não Especificado</option>
                                    </select>
                                  </div>
                                </>
                              )}
                            </div>

                            {suspectOcMode === 'new' && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-850">
                                <div>
                                  <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">Data / Hora do Fato</label>
                                  <input
                                    type="datetime-local"
                                    value={suspectNewOcData.data_hora}
                                    onChange={(e) => setSuspectNewOcData({ ...suspectNewOcData, data_hora: e.target.value })}
                                    className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs text-zinc-200 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">Armas Utilizadas</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: Pistola Taurus 9mm, Fuzil 5.56"
                                    value={suspectNewOcData.armas_utilizadas}
                                    onChange={(e) => setSuspectNewOcData({ ...suspectNewOcData, armas_utilizadas: e.target.value })}
                                    className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs text-zinc-200 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">Veículo Utilizado</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: Fiat Uno cinza, Moto CB300"
                                    value={suspectNewOcData.veiculo_utilizado}
                                    onChange={(e) => setSuspectNewOcData({ ...suspectNewOcData, veiculo_utilizado: e.target.value })}
                                    className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs text-zinc-200 focus:outline-none"
                                  />
                                </div>

                                {/* Coordenadas Geográficas (Lat / Long) */}
                                <div>
                                  <label className="text-[9px] uppercase text-cyan-400 font-bold flex items-center gap-1 mb-1">
                                    <MapPin className="w-3 h-3 text-cyan-400" /> Latitude (Lat)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ex: -19.7712"
                                    value={suspectNewOcData.lat}
                                    onChange={(e) => setSuspectNewOcData({ ...suspectNewOcData, lat: e.target.value })}
                                    className="w-full bg-[#0A0A0B] border border-cyan-900/50 rounded p-2 text-xs text-cyan-200 focus:outline-none focus:border-cyan-500 font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase text-cyan-400 font-bold flex items-center gap-1 mb-1">
                                    <MapPin className="w-3 h-3 text-cyan-400" /> Longitude (Long)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ex: -43.8564"
                                    value={suspectNewOcData.lng}
                                    onChange={(e) => setSuspectNewOcData({ ...suspectNewOcData, lng: e.target.value })}
                                    className="w-full bg-[#0A0A0B] border border-cyan-900/50 rounded p-2 text-xs text-cyan-200 focus:outline-none focus:border-cyan-500 font-mono"
                                  />
                                </div>
                                <div className="flex items-end pb-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSuspectNewOcData({
                                        ...suspectNewOcData,
                                        lat: selectedCoords ? selectedCoords.lat.toFixed(5) : '-19.7712',
                                        lng: selectedCoords ? selectedCoords.lng.toFixed(5) : '-43.8564',
                                      })
                                    }
                                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                                    title="Carregar coordenadas do 35º BPM / Centro"
                                  >
                                    <Crosshair className="w-3 h-3 text-amber-400" /> Ponto 35º BPM / Mapa
                                  </button>
                                </div>

                                <div className="sm:col-span-3">
                                  <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                    Modus Operandi / Resumo do Histórico
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ex: Abordagem violenta com uso de arma de fogo e fuga em motocicleta"
                                    value={suspectNewOcData.modus_operandi}
                                    onChange={(e) => setSuspectNewOcData({ ...suspectNewOcData, modus_operandi: e.target.value })}
                                    className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs text-zinc-200 focus:outline-none"
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                    Narrativa Circunstanciada do Fato (Opcional)
                                  </label>
                                  <textarea
                                    placeholder="Detalhes dos fatos, declarações de testemunhas e atuação do infrator..."
                                    value={suspectNewOcData.descricao_fato}
                                    onChange={(e) => setSuspectNewOcData({ ...suspectNewOcData, descricao_fato: e.target.value })}
                                    className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs text-zinc-200 focus:outline-none resize-none h-14"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={handleAddOccurrenceToSuspect}
                                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded transition uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10"
                              >
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                                <span>Adicionar Esta Ocorrência à Ficha do Infrator</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Display Table / Cards of Linked Occurrences */}
                        {suspectOccurrencesList.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <span className="text-[9px] uppercase text-zinc-400 font-bold block">
                              Ocorrências a serem vinculadas ao salvar:
                            </span>
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                              {suspectOccurrencesList.map((ocItem) => {
                                const badge = getPapelBadge(ocItem.papel_no_crime);
                                return (
                                  <div
                                    key={ocItem.tempId}
                                    className="bg-[#0F0F12] border border-zinc-800 rounded p-2.5 flex items-start justify-between gap-3 text-xs"
                                  >
                                    <div className="space-y-1 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-amber-400 font-mono">
                                          B.O. Nº {ocItem.numero_bo}
                                        </span>
                                        <span
                                          className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.bg}`}
                                        >
                                          {badge.label}
                                        </span>
                                        {ocItem.isNew && (
                                          <span className="text-[8px] bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-bold px-1.5 py-0.2 rounded">
                                            NOVO B.O.
                                          </span>
                                        )}
                                        <span className="text-zinc-500 text-[10px]">
                                          {new Date(ocItem.data_hora).toLocaleDateString('pt-BR')}
                                        </span>
                                      </div>
                                      <p className="text-zinc-200 font-medium text-xs">
                                        {ocItem.tipificacao_penal}
                                      </p>
                                      {ocItem.modus_operandi && (
                                        <p className="text-zinc-400 text-[10px] italic">
                                          Modus Operandi: {ocItem.modus_operandi}
                                        </p>
                                      )}
                                      {(ocItem.armas_utilizadas || ocItem.veiculo_utilizado) && (
                                        <div className="flex gap-3 text-[10px] text-zinc-500">
                                          {ocItem.armas_utilizadas && <span>Armas: {ocItem.armas_utilizadas}</span>}
                                          {ocItem.veiculo_utilizado && <span>Veículo: {ocItem.veiculo_utilizado}</span>}
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOccurrenceFromSuspect(ocItem.tempId)}
                                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded transition cursor-pointer"
                                      title="Remover ocorrência da lista"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="submit"
                          disabled={isSubmittingSuspect}
                          className={`px-5 py-2.5 ${editingSuspectId ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20' : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-emerald-600/20'} font-bold rounded text-xs uppercase cursor-pointer flex items-center gap-2 shadow-lg transition`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            {isSubmittingSuspect
                              ? (editingSuspectId ? 'Salvando Alterações...' : 'Cadastrando Infrator...')
                              : (editingSuspectId ? 'Salvar Alterações da Ficha' : 'Salvar Infrator e Vincular Ocorrências')}
                          </span>
                        </button>

                        {editingSuspectId && (
                          <button
                            type="button"
                            onClick={handleCancelEditSuspect}
                            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold rounded text-xs uppercase cursor-pointer transition flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancelar Edição</span>
                          </button>
                        )}
                      </div>
                    </form>
                  )}

                  {isAddingOccurrence && (
                    <form onSubmit={handleAddIncidentSubmit} className="space-y-4 font-mono">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-cyan-400" /> Registrar Novo Evento Criminal (B.O. / REDS)
                        </h3>
                        <span className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          Georreferenciamento Parametrizado
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Número do B.O. / REDS *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: REDS-2026-00458921-001"
                            value={newIncidentForm.numero_bo}
                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, numero_bo: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Tipificação Penal *</label>
                          <input
                            type="text"
                            list="tipificacoes-list"
                            required
                            placeholder="Ex: Averiguação, Roubo a Mão Armada..."
                            value={newIncidentForm.tipificacao_penal}
                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, tipificacao_penal: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          />
                          <datalist id="tipificacoes-list">
                            <option value="Averiguação" />
                            <option value="Roubo a Mão Armada (Art. 157 §2º)" />
                            <option value="Roubo de Carga" />
                            <option value="Tráfico Ilícito de Drogas (Art. 33)" />
                            <option value="Associação para o Tráfico (Art. 35)" />
                            <option value="Homicídio Tentado (Art. 121 c/c 14)" />
                            <option value="Homicídio Consumado (Art. 121)" />
                            <option value="Porte Ilegal de Arma de Fogo" />
                            <option value="Disparo de Arma de Fogo" />
                            <option value="Ameaça / Coação (Art. 147)" />
                            <option value="Lesão Corporal (Art. 129)" />
                            <option value="Extorsão / Sequestro" />
                            <option value="Organização Criminosa" />
                            <option value="Furto (Art. 155)" />
                            <option value="Receptação (Art. 180)" />
                          </datalist>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Data / Hora do Fato</label>
                          <input
                            type="datetime-local"
                            value={newIncidentForm.data_hora}
                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, data_hora: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Armas Empregadas</label>
                          <input
                            type="text"
                            placeholder="Ex: Pistola calibre 9mm"
                            value={newIncidentForm.armas_utilizadas}
                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, armas_utilizadas: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Veículo Empregado</label>
                          <input
                            type="text"
                            placeholder="Ex: Moto Honda CG 160 Preta"
                            value={newIncidentForm.veiculo_utilizado}
                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, veiculo_utilizado: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Modus Operandi</label>
                          <input
                            type="text"
                            placeholder="Ex: Abordagem com arma em punho e fuga rápida"
                            value={newIncidentForm.modus_operandi}
                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, modus_operandi: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                          />
                        </div>

                        {/* Coordenadas Geográficas Parametrizadas */}
                        <div className="md:col-span-3 bg-[#0A0A0D] p-3.5 rounded border border-cyan-900/40 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-[10px] uppercase text-cyan-400 font-bold flex items-center gap-1.5 tracking-wider">
                              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                              Coordenadas Geográficas do Fato (Latitude e Longitude) *
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setNewIncidentForm({
                                    ...newIncidentForm,
                                    lat: '-19.7712',
                                    lng: '-43.8564',
                                  })
                                }
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-[9px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                              >
                                <Crosshair className="w-3 h-3 text-cyan-400" /> 35º BPM / Santa Luzia (-19.7712, -43.8564)
                              </button>
                              {selectedCoords && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNewIncidentForm({
                                      ...newIncidentForm,
                                      lat: selectedCoords.lat.toFixed(5),
                                      lng: selectedCoords.lng.toFixed(5),
                                    })
                                  }
                                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 rounded text-[9px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                                >
                                  <MapPin className="w-3 h-3 text-amber-400" /> Usar Ponto Atual do Mapa
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[9px] uppercase text-zinc-400 font-bold">Latitude (Lat) *</label>
                                <span className="text-[9px] text-zinc-600">Ex: -19.77120</span>
                              </div>
                              <input
                                type="text"
                                required
                                placeholder="-19.7712"
                                value={newIncidentForm.lat}
                                onChange={(e) => setNewIncidentForm({ ...newIncidentForm, lat: e.target.value })}
                                className="w-full bg-[#0F0F12] border border-cyan-900/50 rounded p-2 text-xs focus:outline-none focus:border-cyan-500 text-cyan-200 font-mono"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[9px] uppercase text-zinc-400 font-bold">Longitude (Long) *</label>
                                <span className="text-[9px] text-zinc-600">Ex: -43.85640</span>
                              </div>
                              <input
                                type="text"
                                required
                                placeholder="-43.8564"
                                value={newIncidentForm.lng}
                                onChange={(e) => setNewIncidentForm({ ...newIncidentForm, lng: e.target.value })}
                                className="w-full bg-[#0F0F12] border border-cyan-900/50 rounded p-2 text-xs focus:outline-none focus:border-cyan-500 text-cyan-200 font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Narrativa Circunstanciada do Fato *</label>
                          <textarea
                            required
                            placeholder="Descreva a dinâmica do crime, depoimentos de vítimas e circunstâncias da ocorrência..."
                            value={newIncidentForm.descricao_fato}
                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, descricao_fato: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 h-20 resize-none text-zinc-200 font-sans"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingOccurrence(false)}
                          className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 font-bold text-xs uppercase rounded cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs uppercase rounded cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-600/20"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Registrar Ocorrência</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {isAddingAddress && (
                    <form onSubmit={handleAddAddressSubmit} className="space-y-4 font-mono">
                      <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-amber-400" /> Adicionar Endereço Operacional
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Infrator Vinculado *</label>
                          <select
                            required
                            value={newAddressForm.infrator_id}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, infrator_id: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                          >
                            <option value="">Selecione o Infrator...</option>
                            {suspects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nome_completo} ({s.vulgo})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Tipo de Local *</label>
                          <select
                            value={newAddressForm.tipo_endereco}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, tipo_endereco: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                          >
                            <option value="Residência">Residência</option>
                            <option value="Esconderijo">Esconderijo</option>
                            <option value="Área de Atuação">Área de Atuação</option>
                            <option value="Ponto de Venda">Ponto de Venda (Boca)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Raio de Influência (km)</label>
                          <input
                            type="text"
                            value={newAddressForm.raio_influencia_km}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, raio_influencia_km: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Logradouro / Avenida *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Estrada das Lágrimas, 120"
                            value={newAddressForm.logradouro}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, logradouro: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Bairro</label>
                          <input
                            type="text"
                            value={newAddressForm.bairro}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, bairro: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Latitude *</label>
                          <input
                            type="text"
                            required
                            value={newAddressForm.lat}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, lat: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">Longitude *</label>
                          <input
                            type="text"
                            required
                            value={newAddressForm.lng}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, lng: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none text-zinc-200"
                          />
                        </div>
                      </div>

                      <button type="submit" className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase rounded cursor-pointer">
                        Salvar Endereço
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Sub-tab Navigation between Infratores and B.O.s */}
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setDbSubTab('suspects')}
                  className={`px-4 py-2 text-xs font-mono font-bold rounded flex items-center gap-2 transition cursor-pointer ${
                    dbSubTab === 'suspects'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'bg-[#121216] text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Infratores Cadastrados</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    dbSubTab === 'suspects' ? 'bg-black/30 text-black' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {filteredSuspects.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDbSubTab('occurrences')}
                  className={`px-4 py-2 text-xs font-mono font-bold rounded flex items-center gap-2 transition cursor-pointer ${
                    dbSubTab === 'occurrences'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'bg-[#121216] text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Boletins de Ocorrência (B.O.s / REDS)</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    dbSubTab === 'occurrences' ? 'bg-black/30 text-black' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {filteredOccurrences.length}
                  </span>
                </button>
              </div>

              {dbSubTab === 'suspects' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Suspect Database list */}
                <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 shadow-2xl lg:col-span-2 tactical-corner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-zinc-800 pb-3">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest font-mono flex items-center gap-2">
                        <Grid className="w-3.5 h-3.5 text-amber-500" />
                        Grid de Infratores e Perfis Policiais
                      </h3>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {filteredSuspects.length} registros indexados
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Filtrar por nome, vulgo, documento..."
                        value={suspectSearchQuery}
                        onChange={(e) => setSuspectSearchQuery(e.target.value)}
                        className="bg-[#0A0A0B] border border-zinc-800 rounded p-2 pl-8 text-xs font-mono focus:outline-none focus:border-amber-500 w-60 text-zinc-200"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-zinc-800/80 rounded">
                    <table className="w-full text-xs text-left text-zinc-300 font-mono">
                      <thead className="text-[9px] uppercase bg-[#0A0A0B] border-b border-zinc-800 text-zinc-500 font-bold tracking-wider">
                        <tr>
                          <th className="p-2.5">Foto</th>
                          <th className="p-2.5">Nome / Nº Documento</th>
                          <th className="p-2.5">Vulgo</th>
                          <th className="p-2.5">Facção</th>
                          <th className="p-2.5">Perigo</th>
                          <th className="p-2.5">Situação / Status</th>
                          <th className="p-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850 bg-[#0F0F12]/60">
                        {filteredSuspects.map((s) => {
                          const situacao = s.situacao_atual || (s.status_mandado_prisao ? 'FORAGIDO' : 'EM_LIBERDADE');
                          return (
                          <tr key={s.id} className="hover:bg-[#1A1A22] transition">
                            <td className="p-2.5">
                              <div
                                className="relative w-9 h-9 rounded overflow-hidden border border-zinc-700 cursor-pointer group"
                                onClick={() => handleViewSuspectDetail(s.id)}
                                title="Ver ficha e galeria de fotos"
                              >
                                <img
                                  src={s.foto_url}
                                  alt={s.vulgo}
                                  className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
                                  }}
                                />
                                {s.galeria_fotos && s.galeria_fotos.length > 1 && (
                                  <span className="absolute bottom-0 right-0 bg-black/85 text-amber-400 text-[8px] font-bold px-1 rounded-tl font-mono border-t border-l border-zinc-700">
                                    +{s.galeria_fotos.length}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5">
                              <div className="font-bold text-zinc-100 font-sans text-xs">{s.nome_completo}</div>
                              <div className="text-[10px] text-zinc-500 font-mono">{s.cpf}</div>
                            </td>
                            <td className="p-2.5 font-bold text-amber-400">"{s.vulgo}"</td>
                            <td className="p-2.5 font-medium text-zinc-300">{s.gangue_faccao}</td>
                            <td className="p-2.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                s.periculosidade === 'Extrema' ? 'bg-red-950 text-red-400 border border-red-900/60' :
                                s.periculosidade === 'Alta' ? 'bg-red-900/30 text-red-300 border border-red-800/40' :
                                s.periculosidade === 'Média' ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                              }`}>
                                {s.periculosidade}
                              </span>
                            </td>
                            <td className="p-2.5">
                              {situacao === 'MORTO' ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                                  💀 MORTO
                                </span>
                              ) : situacao === 'PRESO' ? (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-950/70 text-red-400 border border-red-800/70">
                                  🔒 PRESO
                                </span>
                              ) : (situacao === 'FORAGIDO' || s.status_mandado_prisao) ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                                  FORAGIDO
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                                  EM LIBERDADE
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => handleViewSuspectDetail(s.id)}
                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded text-[10px] font-bold transition cursor-pointer"
                                title="Ver Ficha Detalhada no Painel Lateral"
                              >
                                Ficha
                              </button>
                              <button
                                onClick={() => handleStartEditSuspect(s.id)}
                                className="px-2 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 hover:text-white rounded text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-sm shadow-amber-950/40"
                                title="Editar ou Continuar Preenchimento da Ficha"
                              >
                                <Edit3 className="w-3 h-3 stroke-[2.5]" />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openSuspectDossier(s.id, s)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-[10px] transition inline-flex items-center gap-1 cursor-pointer shadow-sm shadow-amber-500/20"
                                title="Extrair Ficha do Infrator em PDF com Foto, Dados e B.O.s"
                              >
                                <FileDown className="w-3 h-3 stroke-[2.5]" />
                                <span>PDF</span>
                              </button>
                              <button
                                onClick={() => handleInitiateDeleteSuspect(s.id, s.nome_completo, s.vulgo)}
                                className="px-2 py-1 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 hover:text-white rounded text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-sm shadow-red-950/40"
                                title="Excluir Infrator do Banco de Dados"
                              >
                                <Trash2 className="w-3 h-3 stroke-[2.5]" />
                                <span>Excluir</span>
                              </button>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inspect Suspect Drawer/Detail Card */}
                <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 shadow-2xl tactical-corner">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2.5 font-mono flex items-center justify-between">
                    <span>Ficha Tática de Inteligência</span>
                    <div className="flex items-center gap-2">
                      {selectedSuspectDetail && (
                        <button
                          type="button"
                          onClick={() => handleStartEditSuspect(selectedSuspectDetail.id)}
                          className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-[9px] uppercase font-mono flex items-center gap-1 transition cursor-pointer shadow-sm shadow-amber-500/20"
                          title="Continuar Preenchimento ou Editar Ficha"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>Editar Ficha</span>
                        </button>
                      )}
                      <span className="text-[9px] text-zinc-500 font-mono">ID // INSPECTION</span>
                    </div>
                  </h3>

                  {selectedSuspectDetail ? (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between gap-3.5">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={selectedSuspectDetail.foto_url}
                            alt={selectedSuspectDetail.vulgo}
                            className="w-14 h-14 rounded object-cover border border-amber-500/40 shadow-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop';
                            }}
                          />
                          <div>
                            <h4 className="font-bold text-zinc-100 text-sm font-sans">{selectedSuspectDetail.nome_completo}</h4>
                            <span className="text-xs text-amber-400 font-mono block">Alcunha: "{selectedSuspectDetail.vulgo}"</span>
                          </div>
                        </div>
                      </div>

                      {/* Primary Quick Edit Action Banner */}
                      <button
                        type="button"
                        onClick={() => handleStartEditSuspect(selectedSuspectDetail.id)}
                        className="w-full py-2 bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-500/40 border border-amber-500/50 hover:border-amber-400 text-amber-300 font-bold rounded text-xs font-mono flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shadow-amber-500/10"
                        title="Continuar preenchimento, alterar fotos, características, endereços ou ocorrências"
                      >
                        <Edit3 className="w-4 h-4 text-amber-400" />
                        <span>✏️ Continuar / Editar Cadastro Completo</span>
                      </button>

                      <div className="space-y-2 border-t border-zinc-800/80 pt-3 font-mono">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#0A0A0B] p-2 rounded border border-zinc-850">
                            <span className="text-[9px] text-zinc-500 block uppercase font-bold">Nascimento</span>
                            <span className="text-zinc-200 font-medium">
                              {new Date(selectedSuspectDetail.data_nascimento).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="bg-[#0A0A0B] p-2 rounded border border-zinc-850">
                            <span className="text-[9px] text-zinc-500 block uppercase font-bold">Número de Documento</span>
                            <span className="text-zinc-200 font-medium">{selectedSuspectDetail.cpf || 'Não informado'}</span>
                          </div>
                          <div className="bg-[#0A0A0B] p-2 rounded border border-zinc-850">
                            <span className="text-[9px] text-zinc-500 block uppercase font-bold">Facção</span>
                            <span className="text-zinc-200 font-semibold">{selectedSuspectDetail.gangue_faccao}</span>
                          </div>
                          <div className="bg-[#0A0A0B] p-2 rounded border border-zinc-850">
                            <span className="text-[9px] text-zinc-500 block uppercase font-bold">Periculosidade</span>
                            <span className="text-red-400 font-bold">{selectedSuspectDetail.periculosidade}</span>
                          </div>
                        </div>

                        {/* Interactive Status Changer / Situação Prisional */}
                        <div className="bg-[#121216] p-2.5 rounded border border-amber-500/40 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-amber-400 uppercase font-bold flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-amber-400" />
                              Situação Prisional / Status
                            </span>
                            <span className="text-[8px] text-zinc-500 font-mono">Alteração Imediata</span>
                          </div>
                          <select
                            value={selectedSuspectDetail.situacao_atual || (selectedSuspectDetail.status_mandado_prisao ? 'FORAGIDO' : 'EM_LIBERDADE')}
                            onChange={(e) => handleUpdateSelectedSuspectSituacao(e.target.value as any)}
                            className="w-full bg-[#0A0A0B] border border-amber-500/60 rounded p-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                          >
                            <option value="EM_LIBERDADE">🟢 EM LIBERDADE (Na rua / Monitorado)</option>
                            <option value="FORAGIDO">🔴 FORAGIDO DA JUSTIÇA (Mandado Ativo)</option>
                            <option value="PRESO">🔒 PRESO / SISTEMA PENITENCIÁRIO</option>
                            <option value="MORTO">💀 MORTO / FALECIDO (Óbito Confirmado)</option>
                          </select>
                        </div>
                      </div>

                      <div className="border-t border-zinc-800/80 pt-3 space-y-2">
                        <span className="text-[9px] text-zinc-500 block uppercase font-bold font-mono">Características Físicas</span>
                        <div className="font-mono text-[11px] text-zinc-300">
                          <span className="text-zinc-500">Altura:</span> {selectedSuspectDetail.fisicas?.altura_estimada} m |{' '}
                          <span className="text-zinc-500">Compleição:</span> {selectedSuspectDetail.fisicas?.compleicao}
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-mono block">Tatuagens:</span>
                          <p className="text-zinc-300 mt-0.5 text-xs">{selectedSuspectDetail.fisicas?.tatuagens_detalhes || 'Nenhuma cadastrada'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-mono block">Sinais Particulares:</span>
                          <p className="text-zinc-300 mt-0.5 text-xs">{selectedSuspectDetail.fisicas?.sinais_particulares || 'Nenhum'}</p>
                        </div>
                      </div>

                      {/* Acervo Fotográfico & Biometria Tática */}
                      <div className="border-t border-zinc-800/80 pt-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-zinc-400 block uppercase font-bold font-mono flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-amber-400" />
                            Acervo Fotográfico & Biometria ({selectedSuspectDetail.galeria_fotos?.length || 1})
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAddingDirectPhoto(!isAddingDirectPhoto)}
                            className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>{isAddingDirectPhoto ? 'Cancelar' : '+ Adicionar Foto'}</span>
                          </button>
                        </div>

                        {/* Inline Form to add photo to suspect */}
                        {isAddingDirectPhoto && (
                          <div className="bg-[#0A0A0B] p-3 rounded border border-amber-500/40 space-y-2.5 font-mono text-xs">
                            <span className="text-[10px] text-amber-400 font-bold uppercase block flex items-center gap-1">
                              <Upload className="w-3 h-3 text-amber-400" /> Carregar Nova Foto / Detalhe Físico
                            </span>

                            <div className="flex flex-wrap items-center gap-2">
                              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] rounded transition uppercase cursor-pointer shadow">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Do Computador</span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      handleUploadDirectPhotoFiles(e.target.files);
                                    }
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => {
                                  const sampleTattoos = [
                                    {
                                      url: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=400&h=400&fit=crop',
                                      tipo: 'TATUAGEM' as const,
                                      descricao: 'Tatuagem no braço (Identificação de facção)',
                                    },
                                    {
                                      url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
                                      tipo: 'CICATRIZ' as const,
                                      descricao: 'Cicatriz facial no supercílio',
                                    }
                                  ];
                                  const item = sampleTattoos[Math.floor(Math.random() * sampleTattoos.length)];
                                  handleAddDirectPhoto(item);
                                }}
                                className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-[10px] cursor-pointer flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>Foto Exemplo</span>
                              </button>
                            </div>

                            {/* Manual URL Form */}
                            <form onSubmit={handleAddDirectPhotoSubmit} className="space-y-2 pt-1 border-t border-zinc-850">
                              <div>
                                <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-0.5">Link / URL da Imagem</label>
                                <input
                                  type="text"
                                  placeholder="https://..."
                                  value={directPhotoDraft.url}
                                  onChange={(e) => setDirectPhotoDraft({ ...directPhotoDraft, url: e.target.value })}
                                  className="w-full bg-[#121216] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-0.5">Classificação</label>
                                  <select
                                    value={directPhotoDraft.tipo}
                                    onChange={(e) => setDirectPhotoDraft({ ...directPhotoDraft, tipo: e.target.value as any })}
                                    className="w-full bg-[#121216] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                                  >
                                    <option value="ROSTO">👤 Rosto / Face</option>
                                    <option value="TATUAGEM">🎨 Tatuagem</option>
                                    <option value="CICATRIZ">⚡ Cicatriz</option>
                                    <option value="SINAL">🔍 Sinal Particular</option>
                                    <option value="PERFIL">📐 Perfil Lateral</option>
                                    <option value="CORPO">🧍 Corpo Inteiro</option>
                                    <option value="TATICA">🛡️ Foto Tática</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-0.5">Descrição</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: Tatuagem no pescoço"
                                    value={directPhotoDraft.descricao}
                                    onChange={(e) => setDirectPhotoDraft({ ...directPhotoDraft, descricao: e.target.value })}
                                    className="w-full bg-[#121216] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <label className="flex items-center gap-1.5 text-[10px] text-amber-300 font-bold cursor-pointer py-1">
                                <input
                                  type="checkbox"
                                  checked={directPhotoDraft.principal}
                                  onChange={(e) => setDirectPhotoDraft({ ...directPhotoDraft, principal: e.target.checked })}
                                  className="accent-amber-500 rounded"
                                />
                                <span>Definir esta imagem como Foto Principal do Infrator</span>
                              </label>

                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setIsAddingDirectPhoto(false)}
                                  className="px-2.5 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 rounded text-[10px] cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-[10px] uppercase cursor-pointer"
                                >
                                  Salvar Imagem
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {/* Gallery Thumbnails List */}
                        <div className="grid grid-cols-3 gap-2 font-mono">
                          {(() => {
                            const photos = selectedSuspectDetail.galeria_fotos && selectedSuspectDetail.galeria_fotos.length > 0
                              ? selectedSuspectDetail.galeria_fotos
                              : [
                                  {
                                    id: 'photo-default',
                                    url: selectedSuspectDetail.foto_url,
                                    tipo: 'ROSTO' as const,
                                    descricao: 'Foto Cadastral Principal',
                                    principal: true,
                                  }
                                ];

                            return photos.map((foto, idx) => {
                              const isPrimary = foto.principal || foto.url === selectedSuspectDetail.foto_url;
                              return (
                                <div
                                  key={foto.id || idx}
                                  className={`relative rounded bg-[#0A0A0B] border overflow-hidden transition group ${
                                    isPrimary
                                      ? 'border-amber-400 ring-2 ring-amber-500/30'
                                      : 'border-zinc-800 hover:border-zinc-700'
                                  }`}
                                >
                                  <div className="aspect-square relative overflow-hidden bg-black flex items-center justify-center">
                                    <img
                                      src={foto.url}
                                      alt={foto.descricao || 'Foto'}
                                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200 cursor-pointer"
                                      onClick={() =>
                                        setInspectingPhoto({
                                          url: foto.url,
                                          tipo: foto.tipo,
                                          descricao: foto.descricao,
                                          principal: isPrimary,
                                          suspectName: selectedSuspectDetail.nome_completo,
                                        })
                                      }
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop';
                                      }}
                                    />

                                    {/* Primary indicator badge */}
                                    <div className="absolute top-1 left-1 pointer-events-none">
                                      {isPrimary ? (
                                        <span className="bg-amber-500 text-black text-[7px] font-black px-1 py-0.5 rounded shadow uppercase">
                                          ★ PRINCIPAL
                                        </span>
                                      ) : (
                                        <span className="bg-black/80 text-zinc-300 text-[7px] font-bold px-1 py-0.5 rounded border border-zinc-700 uppercase">
                                          {foto.tipo || 'FOTO'}
                                        </span>
                                      )}
                                    </div>

                                    {/* Hover overlay actions */}
                                    <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 p-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setInspectingPhoto({
                                            url: foto.url,
                                            tipo: foto.tipo,
                                            descricao: foto.descricao,
                                            principal: isPrimary,
                                            suspectName: selectedSuspectDetail.nome_completo,
                                          })
                                        }
                                        className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[9px] cursor-pointer"
                                        title="Ampliar"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>

                                      {!isPrimary && (
                                        <button
                                          type="button"
                                          onClick={() => handleSetDirectPrimaryPhoto(foto.id)}
                                          className="p-1 bg-amber-500 hover:bg-amber-400 text-black rounded text-[9px] font-bold cursor-pointer"
                                          title="Tornar Foto Principal"
                                        >
                                          <Star className="w-3 h-3 fill-current" />
                                        </button>
                                      )}

                                      {photos.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveDirectPhoto(foto.id)}
                                          className="p-1 bg-red-600 hover:bg-red-500 text-white rounded text-[9px] cursor-pointer"
                                          title="Remover Foto"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Caption */}
                                  <div className="p-1 bg-[#0D0D10] text-[8px] text-zinc-400 truncate text-center border-t border-zinc-850" title={foto.descricao}>
                                    {foto.descricao || foto.tipo || 'Foto cadastral'}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Ocorrências Criminais Vinculadas */}
                      <div className="border-t border-zinc-800/80 pt-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-zinc-400 block uppercase font-bold font-mono">Ocorrências Vinculadas (B.O.s)</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-amber-400 font-mono font-bold">{selectedSuspectDetail.ocorrencias?.length || 0} Registros</span>
                            <button
                              type="button"
                              onClick={() => setIsLinkingDirectOccurrence(!isLinkingDirectOccurrence)}
                              className="px-2 py-0.5 bg-zinc-850 hover:bg-zinc-800 text-amber-400 border border-zinc-700 rounded text-[9px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Adicionar ou vincular ocorrência a este infrator"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>{isLinkingDirectOccurrence ? 'Fechar' : 'Vincular B.O.'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Inline Linkage Form for existing suspect */}
                        {isLinkingDirectOccurrence && (
                          <form
                            onSubmit={handleLinkOccurrenceDirectly}
                            className="bg-[#0A0A0B] p-3 rounded border border-amber-500/40 space-y-2.5 font-mono text-xs"
                          >
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                              <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
                                <PlusCircle className="w-3 h-3" /> Vincular Ocorrência ao Infrator
                              </span>
                            </div>

                            {/* Mode switcher */}
                            <div className="grid grid-cols-3 gap-1 bg-[#141418] p-1 rounded border border-zinc-800">
                              <button
                                type="button"
                                onClick={() => setDirectOcMode('new')}
                                className={`py-1 text-[10px] font-bold rounded cursor-pointer transition ${
                                  directOcMode === 'new'
                                    ? 'bg-amber-500 text-black'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                Novo B.O.
                              </button>
                              <button
                                type="button"
                                onClick={() => setDirectOcMode('from_other')}
                                className={`py-1 text-[10px] font-bold rounded cursor-pointer transition flex items-center justify-center gap-1 ${
                                  directOcMode === 'from_other'
                                    ? 'bg-amber-500 text-black'
                                    : 'text-amber-300/90 hover:text-amber-200 bg-amber-950/30'
                                }`}
                              >
                                <Users className="w-2.5 h-2.5" />
                                Outro Infrator
                              </button>
                              <button
                                type="button"
                                onClick={() => setDirectOcMode('existing')}
                                className={`py-1 text-[10px] font-bold rounded cursor-pointer transition ${
                                  directOcMode === 'existing'
                                    ? 'bg-amber-500 text-black'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                B.O. Existente
                              </button>
                            </div>

                            {/* Mode 1: From Other Suspects */}
                            {directOcMode === 'from_other' && (
                              <OccurrencePickerFromSuspects
                                occurrences={occurrences}
                                suspects={suspects}
                                currentSuspectName={selectedSuspectDetail.nome_completo}
                                selectedPapel={directOcPapel}
                                onChangePapel={(papel) => setDirectOcPapel(papel)}
                                onLinkOccurrence={handleDirectLinkOccurrenceFromPicker}
                                onCopyOccurrence={handleDirectCopyOccurrenceToForm}
                                onDeleteOccurrence={(oc) => handleInitiateDeleteBo(oc.id, oc.numero_bo, oc.tipificacao_penal, oc.data_hora)}
                                alreadyLinkedIds={(selectedSuspectDetail.ocorrencias || []).map((o: any) => o.id || o.numero_bo)}
                              />
                            )}

                            {directOcMode !== 'from_other' && (
                              <>
                                <div>
                                  <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                    Condição / Papel no Crime *
                                  </label>
                                  <select
                                    value={directOcPapel}
                                    onChange={(e) => setDirectOcPapel(e.target.value)}
                                    className="w-full bg-[#121216] border border-amber-500/50 rounded p-1.5 text-xs text-amber-300 font-bold focus:outline-none"
                                  >
                                    <option value="Autor">Autor (Principal)</option>
                                    <option value="Coautor">Coautor</option>
                                    <option value="Suspeito">Suspeito</option>
                                    <option value="Vítima">Vítima</option>
                                    <option value="Notificado">Notificado</option>
                                    <option value="Testemunha / Condutor">Testemunha / Condutor</option>
                                    <option value="Indiciado">Indiciado</option>
                                  </select>
                                </div>

                                {directOcMode === 'existing' ? (
                                  <div>
                                    <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-1">
                                      Selecione a Ocorrência Cadastrada *
                                    </label>
                                    <select
                                      value={directOcExistingId}
                                      onChange={(e) => setDirectOcExistingId(e.target.value)}
                                      className="w-full bg-[#121216] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                                    >
                                      <option value="">Selecione o B.O....</option>
                                      {occurrences.map((oc) => (
                                        <option key={oc.id} value={oc.id}>
                                          {oc.numero_bo} — {oc.tipificacao_penal}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <div className="space-y-2.5">
                                    <div>
                                      <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-0.5">
                                        Número do B.O. / REDS *
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="Ex: REDS-2026-00458921-001"
                                        value={directNewOcData.numero_bo}
                                        onChange={(e) => setDirectNewOcData({ ...directNewOcData, numero_bo: e.target.value })}
                                        className="w-full bg-[#121216] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-0.5">
                                        Tipificação Penal *
                                      </label>
                                      <select
                                        value={directNewOcData.tipificacao_penal}
                                        onChange={(e) => setDirectNewOcData({ ...directNewOcData, tipificacao_penal: e.target.value })}
                                        className="w-full bg-[#121216] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                                      >
                                        <option value="Averiguação">Averiguação</option>
                                        <option value="Roubo a Mão Armada">Roubo a Mão Armada</option>
                                        <option value="Roubo de Carga">Roubo de Carga</option>
                                        <option value="Tráfico de Drogas">Tráfico de Drogas</option>
                                        <option value="Associação para o Tráfico">Associação para o Tráfico</option>
                                        <option value="Homicídio Tentado">Homicídio Tentado</option>
                                        <option value="Homicídio Consumado">Homicídio Consumado</option>
                                        <option value="Porte Ilegal de Arma de Fogo">Porte Ilegal de Arma de Fogo</option>
                                        <option value="Disparo de Arma de Fogo">Disparo de Arma de Fogo</option>
                                        <option value="Ameaça / Coação">Ameaça / Coação</option>
                                        <option value="Lesão Corporal">Lesão Corporal</option>
                                        <option value="Extorsão / Sequestro">Extorsão / Sequestro</option>
                                        <option value="Organização Criminosa">Organização Criminosa</option>
                                        <option value="Furto">Furto</option>
                                        <option value="Receptação">Receptação</option>
                                        <option value="Outros">Outros / Não Especificado</option>
                                      </select>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-0.5">
                                          Data / Hora do Fato
                                        </label>
                                        <input
                                          type="datetime-local"
                                          value={directNewOcData.data_hora}
                                          onChange={(e) => setDirectNewOcData({ ...directNewOcData, data_hora: e.target.value })}
                                          className="w-full bg-[#121216] border border-zinc-800 rounded p-1.5 text-[11px] text-zinc-200 focus:outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-0.5">
                                          Armas Utilizadas
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="Ex: Pistola .380"
                                          value={directNewOcData.armas_utilizadas}
                                          onChange={(e) => setDirectNewOcData({ ...directNewOcData, armas_utilizadas: e.target.value })}
                                          className="w-full bg-[#121216] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                                        />
                                      </div>
                                    </div>

                                    {/* Coordenadas Geográficas Parametrizadas (Lat / Long) */}
                                    <div className="p-2 bg-[#09090C] rounded border border-cyan-900/40 space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <label className="text-[9px] uppercase text-cyan-400 font-bold flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-cyan-400" /> Coordenadas Geográficas (Lat / Long) *
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDirectNewOcData({
                                              ...directNewOcData,
                                              lat: '-19.7712',
                                              lng: '-43.8564',
                                            })
                                          }
                                          className="text-[9px] text-zinc-400 hover:text-cyan-300 font-mono underline cursor-pointer"
                                        >
                                          35º BPM
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-[8px] uppercase text-zinc-500 font-bold block">Latitude *</label>
                                          <input
                                            type="text"
                                            placeholder="-19.7712"
                                            value={directNewOcData.lat}
                                            onChange={(e) => setDirectNewOcData({ ...directNewOcData, lat: e.target.value })}
                                            className="w-full bg-[#121216] border border-cyan-900/50 rounded p-1.5 text-xs text-cyan-200 focus:outline-none font-mono"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[8px] uppercase text-zinc-500 font-bold block">Longitude *</label>
                                          <input
                                            type="text"
                                            placeholder="-43.8564"
                                            value={directNewOcData.lng}
                                            onChange={(e) => setDirectNewOcData({ ...directNewOcData, lng: e.target.value })}
                                            className="w-full bg-[#121216] border border-cyan-900/50 rounded p-1.5 text-xs text-cyan-200 focus:outline-none font-mono"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-0.5">
                                        Modus Operandi / Dinâmica
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="Ex: Abordagem com emprego de arma de fogo e fuga em veículo"
                                        value={directNewOcData.modus_operandi}
                                        onChange={(e) => setDirectNewOcData({ ...directNewOcData, modus_operandi: e.target.value })}
                                        className="w-full bg-[#121216] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setIsLinkingDirectOccurrence(false)}
                                    className="px-2.5 py-1 bg-zinc-855 hover:bg-zinc-800 text-zinc-400 rounded text-[10px] cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="submit"
                                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-[10px] uppercase cursor-pointer"
                                  >
                                    Salvar Vínculo
                                  </button>
                                </div>
                              </>
                            )}
                          </form>
                        )}

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 font-mono">
                          {selectedSuspectDetail.ocorrencias && selectedSuspectDetail.ocorrencias.length > 0 ? (
                            selectedSuspectDetail.ocorrencias.map((oc: any) => {
                              const badge = getPapelBadge(oc.papel);
                              return (
                                <div key={oc.id} className="bg-[#0A0A0B] p-2.5 rounded border border-zinc-800 text-[11px] group relative">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-amber-400">{oc.numero_bo}</span>
                                    <div className="flex items-center gap-1">
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${badge.bg}`}>
                                        {badge.label}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleUnlinkOccurrence(oc.id)}
                                        className="text-zinc-500 hover:text-amber-400 opacity-80 hover:opacity-100 transition cursor-pointer p-1 rounded hover:bg-zinc-800"
                                        title="Desvincular este B.O. apenas deste infrator"
                                      >
                                        <Unlink className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleInitiateDeleteBo(oc.id, oc.numero_bo, oc.tipificacao_penal, oc.data_hora)}
                                        className="text-zinc-500 hover:text-red-400 opacity-80 hover:opacity-100 transition cursor-pointer p-1 rounded hover:bg-zinc-800"
                                        title="Excluir este B.O. permanentemente do sistema"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-zinc-200 mt-0.5 text-[10px] font-semibold">{oc.tipificacao_penal}</p>
                                  <span className="text-[9px] text-zinc-500 block mt-0.5">
                                    {new Date(oc.data_hora).toLocaleDateString('pt-BR')} • Armas: {oc.armas_utilizadas || 'N/I'}
                                  </span>
                                  {oc.modus_operandi && (
                                    <p className="text-zinc-400 text-[9px] italic mt-0.5">
                                      Modus: {oc.modus_operandi}
                                    </p>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[10px] text-zinc-500 font-mono italic">Nenhuma ocorrência vinculada diretamente.</p>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-zinc-800/80 pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-zinc-400 block uppercase font-bold font-mono flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-500" />
                            Endereços Conhecidos ({selectedSuspectDetail.enderecos?.length || 0})
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAddingDirectAddress(!isAddingDirectAddress)}
                            className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            {isAddingDirectAddress ? 'Cancelar' : '+ Endereço'}
                          </button>
                        </div>

                        {/* Inline Form to add address directly to existing suspect */}
                        {isAddingDirectAddress && (
                          <form onSubmit={handleAddAddressDirectly} className="bg-[#121216] p-2.5 rounded border border-zinc-800 space-y-2 font-mono text-xs">
                            <span className="text-[9px] text-amber-400 font-bold uppercase block">Adicionar Novo Endereço</span>
                            <div>
                              <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-0.5">Tipo de Local</label>
                              <select
                                value={directNewAddrData.tipo_endereco}
                                onChange={(e) => setDirectNewAddrData({ ...directNewAddrData, tipo_endereco: e.target.value })}
                                className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                              >
                                <option value="Residência">Residência (Casa/Apto)</option>
                                <option value="Esconderijo">Esconderijo / Aparelho</option>
                                <option value="Área de Atuação">Área de Atuação / Território</option>
                                <option value="Ponto de Venda">Ponto de Venda / Boca de Fumo</option>
                                <option value="Local de Trabalho / Cobertura">Local de Trabalho / Cobertura</option>
                                <option value="Casa de Parentes">Casa de Parentes / Cônjuge</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-0.5">Logradouro / Rua *</label>
                              <input
                                type="text"
                                placeholder="Ex: Rua Direita, 450"
                                value={directNewAddrData.logradouro}
                                onChange={(e) => setDirectNewAddrData({ ...directNewAddrData, logradouro: e.target.value })}
                                className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-0.5">Bairro</label>
                                <input
                                  type="text"
                                  placeholder="Ex: São Benedito"
                                  value={directNewAddrData.bairro}
                                  onChange={(e) => setDirectNewAddrData({ ...directNewAddrData, bairro: e.target.value })}
                                  className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase text-zinc-400 font-bold block mb-0.5">Cidade</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Santa Luzia"
                                  value={directNewAddrData.cidade}
                                  onChange={(e) => setDirectNewAddrData({ ...directNewAddrData, cidade: e.target.value })}
                                  className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none"
                                />
                              </div>
                            </div>
                            <button
                              type="submit"
                              className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-xs transition uppercase tracking-wider cursor-pointer"
                            >
                              Salvar Endereço
                            </button>
                          </form>
                        )}

                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 font-mono">
                          {selectedSuspectDetail.enderecos && selectedSuspectDetail.enderecos.length > 0 ? (
                            selectedSuspectDetail.enderecos.map((ea) => (
                              <div key={ea.id} className="bg-[#0A0A0B] p-2 rounded border border-zinc-800 flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-amber-400 block uppercase text-[9px]">{ea.tipo_endereco}</span>
                                  <p className="text-zinc-300 text-[11px] font-sans">{ea.logradouro}, {ea.bairro}</p>
                                  <span className="text-[9px] text-zinc-500 block">Cidade: {ea.cidade} • Raio: {ea.raio_influencia_km} km</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAddressDirectly(ea.id)}
                                  className="p-1 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                                  title="Remover endereço"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-zinc-500 font-mono italic">Nenhum endereço cadastrado para este infrator.</p>
                          )}
                        </div>
                      </div>

                      {/* Infratores Vinculados por Registro Policial (B.O.s Compartilhados) */}
                      {(() => {
                        const myBos = (selectedSuspectDetail.ocorrencias || []).map((o: any) => o.numero_bo || o.id).filter(Boolean);
                        
                        const linkedCoauthors: Array<{ suspect: any; sharedBos: any[] }> = [];

                        suspects.forEach((other) => {
                          if (other.id === selectedSuspectDetail.id) return;
                          const otherBos = other.ocorrencias || [];
                          const shared: any[] = [];

                          otherBos.forEach((oOther: any) => {
                            const matchMyOc = (selectedSuspectDetail.ocorrencias || []).find(
                              (oMy: any) => (oMy.id && oMy.id === oOther.id) || (oMy.numero_bo && oMy.numero_bo === oOther.numero_bo)
                            );
                            if (matchMyOc) {
                              shared.push({
                                numero_bo: oOther.numero_bo || matchMyOc.numero_bo,
                                tipificacao: oOther.tipificacao_penal || matchMyOc.tipificacao_penal,
                                papelOther: (oOther as any).papel || (oOther as any).papel_no_crime || 'Autor',
                                papelMy: (matchMyOc as any).papel || (matchMyOc as any).papel_no_crime || 'Autor'
                              });
                            }
                          });

                          if (shared.length > 0) {
                            linkedCoauthors.push({ suspect: other, sharedBos: shared });
                          }
                        });

                        return (
                          <div className="border-t border-zinc-800/80 pt-3 space-y-2 font-mono">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-amber-400 block uppercase font-bold flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-amber-500" />
                                Vínculos em B.O. ({linkedCoauthors.length} Infratores)
                              </span>
                              <span className="text-[9px] text-zinc-500">
                                Co-autoria Policial
                              </span>
                            </div>

                            {linkedCoauthors.length > 0 ? (
                              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                {linkedCoauthors.map(({ suspect: coauthor, sharedBos }) => {
                                  const rawSit = String(coauthor.situacao_atual || coauthor.situacao_prisional || '').toUpperCase();
                                  const isMorto = rawSit === 'MORTO' || rawSit === 'FALECIDO' || rawSit === 'ÓBITO' || rawSit === 'OBITO';
                                  const isPreso = !isMorto && (rawSit === 'PRESO' || rawSit === 'RECOLHIDO');
                                  const isForagido = !isMorto && !isPreso && (rawSit === 'FORAGIDO' || coauthor.status_mandado_prisao);

                                  return (
                                    <div
                                      key={coauthor.id}
                                      onClick={() => handleViewSuspectDetail(coauthor.id)}
                                      className="p-2 bg-[#0A0A0B] hover:bg-zinc-900 border border-amber-950/60 hover:border-amber-500/50 rounded flex items-center justify-between gap-2 cursor-pointer transition"
                                      title="Clique para inspecionar este infrator vinculado"
                                    >
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <img
                                          src={coauthor.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop'}
                                          alt={coauthor.vulgo}
                                          className="w-8 h-8 rounded-full object-cover border border-zinc-700 flex-shrink-0"
                                        />
                                        <div className="truncate">
                                          <div className="flex items-center gap-1.5 truncate">
                                            <span className="text-[11px] font-bold text-zinc-200 truncate">{coauthor.nome_completo}</span>
                                            <span className="text-[10px] text-amber-400 font-bold">"{coauthor.vulgo}"</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            {isMorto ? (
                                              <span className="text-[8px] bg-zinc-800 text-zinc-300 px-1 py-0.2 rounded font-bold">💀 MORTO</span>
                                            ) : isForagido ? (
                                              <span className="text-[8px] bg-red-950 text-red-300 border border-red-800 px-1 py-0.2 rounded font-bold">🔴 FORAGIDO</span>
                                            ) : isPreso ? (
                                              <span className="text-[8px] bg-red-950/60 text-red-200 border border-red-800/60 px-1 py-0.2 rounded font-bold">🔒 PRESO</span>
                                            ) : (
                                              <span className="text-[8px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-1 py-0.2 rounded font-bold">LIBERDADE</span>
                                            )}
                                            <span className="text-[9px] text-amber-400/90 font-mono">
                                              • {sharedBos.length} B.O.(s) compartilhado(s)
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <span className="text-[10px] text-zinc-500 hover:text-amber-300 flex-shrink-0">Ver ➔</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-[10px] text-zinc-500 font-mono italic">
                                Nenhum outro infrator cadastrado compartilha os mesmos B.O.s deste investigado.
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      <div className="border-t border-zinc-800/80 pt-3 font-mono space-y-2">
                        <button
                          type="button"
                          onClick={() => openSuspectDossier(selectedSuspectDetail.id, selectedSuspectDetail)}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded flex items-center justify-center gap-2 transition uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer text-xs"
                        >
                          <FileDown className="w-4 h-4 stroke-[2.5]" /> Extrair Ficha do Infrator em PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInitiateDeleteSuspect(selectedSuspectDetail.id, selectedSuspectDetail.nome_completo, selectedSuspectDetail.vulgo)}
                          className="w-full py-2 bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-300 hover:text-white font-bold rounded flex items-center justify-center gap-1.5 transition uppercase tracking-wider cursor-pointer text-[11px]"
                          title="Excluir este infrator do banco de dados"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir Infrator do Sistema
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-[#0A0A0B] rounded border border-zinc-800 font-mono">
                      <p className="text-zinc-500 text-xs">
                        Selecione um infrator investigado na tabela para ver sua ficha tática de inteligência.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              ) : (
              /* ========================================================================= */
              /* SUB-TAB 2: GRID DE BOLETINS DE OCORRÊNCIA (B.O.s / REDS) & GESTÃO COMPLETA */
              /* ========================================================================= */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Occurrences Main List Table */}
                <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 shadow-2xl lg:col-span-2 tactical-corner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-zinc-800 pb-3">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-widest font-mono flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                        Grid Geral de Boletins de Ocorrência (B.O. / REDS)
                      </h3>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {filteredOccurrences.length} registros policiais indexados
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Buscar por Nº B.O., crime, modus, arma, infrator..."
                        value={occurrenceSearchQuery}
                        onChange={(e) => setOccurrenceSearchQuery(e.target.value)}
                        className="bg-[#0A0A0B] border border-zinc-800 rounded p-2 pl-8 text-xs font-mono focus:outline-none focus:border-amber-500 w-72 text-zinc-200"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-zinc-800/80 rounded">
                    <table className="w-full text-xs text-left text-zinc-300 font-mono">
                      <thead className="text-[9px] uppercase bg-[#0A0A0B] border-b border-zinc-800 text-zinc-500 font-bold tracking-wider">
                        <tr>
                          <th className="p-2.5">Nº B.O. / Data</th>
                          <th className="p-2.5">Tipificação Penal & Modus</th>
                          <th className="p-2.5">Infratores Envolvidos</th>
                          <th className="p-2.5">Armas / Veículos</th>
                          <th className="p-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850 bg-[#0F0F12]/60">
                        {filteredOccurrences.length > 0 ? (
                          filteredOccurrences.map((oc) => {
                            const linkedSuspects = getLinkedSuspectsForOccurrence(oc);
                            return (
                              <tr key={oc.id} className="hover:bg-[#1A1A22] transition">
                                <td className="p-2.5 align-top">
                                  <div className="font-bold text-amber-400 font-mono text-xs flex items-center gap-1.5">
                                    <span>{oc.numero_bo}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(oc.numero_bo);
                                        setToastMessage(`Nº do B.O. ${oc.numero_bo} copiado!`);
                                        setTimeout(() => setToastMessage(null), 2500);
                                      }}
                                      className="text-zinc-600 hover:text-amber-300 p-0.5 rounded cursor-pointer"
                                      title="Copiar Número do B.O."
                                    >
                                      <Copy className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                    {new Date(oc.data_hora).toLocaleString('pt-BR')}
                                  </div>
                                  {oc.geom_crime && (
                                    <div className="text-[9px] text-zinc-600 font-mono mt-0.5">
                                      📍 {Number(oc.geom_crime.lat).toFixed(4)}, {Number(oc.geom_crime.lng).toFixed(4)}
                                    </div>
                                  )}
                                </td>

                                <td className="p-2.5 align-top max-w-xs">
                                  <div className="font-bold text-zinc-100 font-sans text-xs">
                                    {oc.tipificacao_penal}
                                  </div>
                                  {oc.modus_operandi && (
                                    <div className="text-[10px] text-zinc-400 mt-1 italic line-clamp-2">
                                      {oc.modus_operandi}
                                    </div>
                                  )}
                                  {oc.descricao_fato && oc.descricao_fato !== oc.modus_operandi && (
                                    <div className="text-[9px] text-zinc-500 mt-0.5 line-clamp-1">
                                      {oc.descricao_fato}
                                    </div>
                                  )}
                                </td>

                                <td className="p-2.5 align-top">
                                  {linkedSuspects.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {linkedSuspects.map((ls, idx) => {
                                        const badge = getPapelBadge(ls.papel);
                                        return (
                                          <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                              if (ls.id) {
                                                setDbSubTab('suspects');
                                                handleViewSuspectDetail(ls.id);
                                              }
                                            }}
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition ${
                                              ls.id ? 'hover:scale-105 cursor-pointer' : 'cursor-default'
                                            } ${badge.bg}`}
                                            title={ls.id ? 'Clique para inspecionar a ficha do infrator' : undefined}
                                          >
                                            <span>{ls.nome}</span>
                                            {ls.vulgo && <span className="opacity-80">"{ls.vulgo}"</span>}
                                            <span className="opacity-60 text-[8px]">({ls.papel})</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-zinc-500 font-mono italic">
                                      Sem infrator vinculado
                                    </span>
                                  )}
                                </td>

                                <td className="p-2.5 align-top">
                                  <div className="text-[10px] text-zinc-300 font-mono">
                                    <span className="text-zinc-500 text-[9px] uppercase font-bold">Armas: </span>
                                    {oc.armas_utilizadas || 'Não informada'}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                    <span className="text-zinc-500 text-[9px] uppercase font-bold">Veículo: </span>
                                    {oc.veiculo_utilizado || 'Não informado'}
                                  </div>
                                </td>

                                <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap align-top">
                                  {oc.geom_crime && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedCoords({
                                          lat: Number(oc.geom_crime.lat),
                                          lng: Number(oc.geom_crime.lng)
                                        });
                                        setActiveTab('map');
                                      }}
                                      className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 hover:text-amber-300 rounded text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                                      title="Localizar e focar este B.O. no Mapa Tático"
                                    >
                                      <MapPin className="w-3 h-3 text-amber-500" />
                                      <span>Mapa</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleInitiateDeleteBo(
                                        oc.id,
                                        oc.numero_bo,
                                        oc.tipificacao_penal,
                                        oc.data_hora,
                                        linkedSuspects.length
                                      )
                                    }
                                    className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 hover:text-white rounded text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-sm shadow-red-950/40"
                                    title="Excluir este Boletim de Ocorrência permanentemente"
                                  >
                                    <Trash2 className="w-3 h-3 stroke-[2.5]" />
                                    <span>Excluir B.O.</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-zinc-500 font-mono text-xs italic">
                              Nenhum Boletim de Ocorrência encontrado com os filtros atuais.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Side: B.O. Intelligence & Actions Panel */}
                <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 shadow-2xl tactical-corner space-y-4">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest border-b border-zinc-800 pb-2.5 font-mono flex items-center justify-between">
                    <span>Inteligência de Ocorrências</span>
                    <span className="text-[9px] text-zinc-500 font-mono">B.O. / REDS ENGINE</span>
                  </h3>

                  <div className="bg-[#0A0A0B] p-3 rounded border border-zinc-800 space-y-2 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 text-xs">Total de B.O.s Cadastrados:</span>
                      <span className="text-lg font-bold text-amber-400">{occurrences.length}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-850 pt-1.5">
                      <span className="text-zinc-500 text-[10px]">Infratores Mapeados:</span>
                      <span className="text-xs font-bold text-zinc-200">{suspects.length}</span>
                    </div>
                  </div>

                  {/* Button to open quick B.O. registration */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingOccurrence(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded flex items-center justify-center gap-2 transition uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer text-xs font-mono"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Registrar Novo B.O. / Ocorrência
                  </button>

                  {/* Crime types distribution */}
                  <div className="bg-[#0A0A0B] p-3 rounded border border-zinc-800 space-y-2 font-mono">
                    <span className="text-[9px] text-zinc-400 block uppercase font-bold flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                      Distribuição por Natureza Delituosa
                    </span>

                    {(() => {
                      const counts: Record<string, number> = {};
                      occurrences.forEach((oc) => {
                        const tip = oc.tipificacao_penal || 'Outros';
                        counts[tip] = (counts[tip] || 0) + 1;
                      });

                      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

                      return (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {sorted.map(([tip, count]) => (
                            <div
                              key={tip}
                              onClick={() => setOccurrenceSearchQuery(tip)}
                              className="flex items-center justify-between text-[11px] bg-[#121216] hover:bg-[#1A1A22] p-1.5 rounded border border-zinc-850 cursor-pointer transition"
                              title={`Filtrar por ${tip}`}
                            >
                              <span className="text-zinc-300 font-sans truncate mr-2">{tip}</span>
                              <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 text-[10px] shrink-0">
                                {count}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Operational instructions box */}
                  <div className="bg-[#0A0A0B] p-3 rounded border border-zinc-800 text-[11px] text-zinc-400 font-mono space-y-1.5">
                    <p className="text-amber-400 font-bold flex items-center gap-1 text-[10px] uppercase">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Vínculo e Exclusão Segura
                    </p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Ao excluir um B.O., todos os vínculos com os infratores associados serão desfeitos e a ocorrência será removida do mapa tático e do banco em nuvem de forma permanente.
                    </p>
                  </div>
                </div>
              </div>
              )}
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* ORCRIM - ORGANOGRAMAS DE FACÇÕES E GANGUES */}
          {/* ========================================================================= */}
          {activeTab === 'orcrim' && (
            <motion.div
              key="orcrim-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <OrcrimWindow
                onSelectSuspect={handleViewSuspectDetail}
                registeredSuspects={suspects}
                onDeleteSuspect={handleInitiateDeleteSuspect}
                onRefreshSuspects={fetchTelemetry}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Lightbox / Visualizador de Alta Resolução de Foto Tática */}
      {inspectingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200 font-mono">
          <div className="bg-[#0F0F12] border border-zinc-700 rounded-lg max-w-3xl w-full shadow-2xl overflow-hidden tactical-corner">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 bg-[#09090C] border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                  Inspeção Biométrica & Foto Tática
                </span>
                {inspectingPhoto.tipo && (
                  <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded">
                    {inspectingPhoto.tipo}
                  </span>
                )}
                {inspectingPhoto.principal && (
                  <span className="bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded shadow">
                    ★ PRINCIPAL
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setInspectingPhoto(null)}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Image View */}
            <div className="p-4 flex flex-col items-center justify-center bg-black/70 min-h-[360px] max-h-[65vh] overflow-hidden">
              <img
                src={inspectingPhoto.url}
                alt={inspectingPhoto.descricao || 'Foto Tática'}
                className="max-h-[60vh] max-w-full object-contain rounded border border-zinc-800 shadow-2xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=600&h=600&fit=crop';
                }}
              />
            </div>

            {/* Footer / Description */}
            <div className="p-3.5 bg-[#09090C] border-t border-zinc-850 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                {inspectingPhoto.suspectName && (
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">
                    Infrator: <strong className="text-amber-400 font-sans">{inspectingPhoto.suspectName}</strong>
                  </span>
                )}
                <p className="text-zinc-200 text-xs">
                  {inspectingPhoto.descricao || 'Registro fotográfico para reconhecimento facial e detalhamento tático.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectingPhoto(null)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-bold text-xs cursor-pointer transition"
              >
                Fechar Visualizador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Infrator */}
      {suspectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#0F0F12] border border-red-800/80 rounded-lg p-6 max-w-md w-full shadow-2xl space-y-4 font-mono tactical-corner">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-950/80 border border-red-800 rounded text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">
                  Confirmar Exclusão de Registro
                </h3>
                <p className="text-xs text-zinc-300">
                  Deseja realmente remover o cadastro de <strong className="text-amber-400">{suspectToDelete.nome}</strong> {suspectToDelete.vulgo ? `("${suspectToDelete.vulgo}")` : ''}?
                </p>
              </div>
            </div>

            <div className="bg-[#0A0A0B] p-3 rounded border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5">
              <p className="text-red-300 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> AVISO OPERACIONAL:
              </p>
              <p>Esta operação removerá o infrator, suas características físicas, endereços e vínculos com comparsas e facções.</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => {
                  setSuspectToDelete(null);
                  setIsDeletingSuspect(false);
                }}
                className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold rounded cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSuspect}
                disabled={isDeletingSuspect}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded cursor-pointer transition flex items-center gap-1.5 shadow-lg shadow-red-600/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de B.O. / Ocorrência */}
      {boToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setBoToDelete(null);
              setIsDeletingBo(false);
            }
          }}
        >
          <div className="bg-[#0F0F12] border border-red-800/80 rounded-lg p-6 max-w-md w-full shadow-2xl space-y-4 font-mono tactical-corner">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-950/80 border border-red-800 rounded text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">
                  Confirmar Exclusão de B.O.
                </h3>
                <p className="text-xs text-zinc-300">
                  Deseja realmente excluir o Boletim de Ocorrência <strong className="text-amber-400">{boToDelete.numero_bo}</strong>?
                </p>
              </div>
            </div>

            <div className="bg-[#0A0A0B] p-3 rounded border border-zinc-800 text-[11px] text-zinc-400 space-y-2">
              <div className="text-zinc-200">
                <span className="text-zinc-500 font-bold uppercase text-[9px] block">Tipificação Penal:</span>
                <span className="font-semibold text-amber-300">{boToDelete.tipificacao}</span>
              </div>
              {boToDelete.data_hora && (
                <div className="text-zinc-300">
                  <span className="text-zinc-500 font-bold uppercase text-[9px] block">Data do Fato:</span>
                  <span>{new Date(boToDelete.data_hora).toLocaleString('pt-BR')}</span>
                </div>
              )}
              <div className="bg-red-950/30 border border-red-900/40 p-2 rounded text-red-300 text-[10px] space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> AVISO OPERACIONAL:
                </p>
                <p>
                  Esta ação removerá o B.O. permanentemente do sistema, desvinculando-o de todos os infratores, do mapa tático e de todas as análises de inteligência.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => {
                  setBoToDelete(null);
                  setIsDeletingBo(false);
                }}
                className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold rounded cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBo}
                disabled={isDeletingBo}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded cursor-pointer transition flex items-center gap-1.5 shadow-lg shadow-red-600/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão do B.O.</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F0F12] border border-amber-500/80 text-amber-300 px-4 py-3 rounded-md shadow-2xl font-mono text-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-500 hover:text-zinc-300 ml-2 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sticky footer */}
      <footer className="border-t border-zinc-800 bg-[#0F0F12] p-3 text-center text-[11px] font-mono text-zinc-500">
        CrimIntel-Geo Grid Terminal • Secretaria de Inteligência e Tecnologia de Segurança Pública • © 2026
      </footer>
    </div>
  );
}
