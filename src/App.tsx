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
  X
} from 'lucide-react';
import TacticalMap from './components/TacticalMap';
import NetworkGraph from './components/NetworkGraph';
import Logo35BPM from './components/Logo35BPM';
import { OrcrimWindow } from './components/OrcrimWindow';
import {
  SuspectWithDetails,
  OcorrenciaCriminal,
  EnderecoAtuacao,
  Infrator,
  IntelligenceAnalysisResult,
  OcorrenciaProcessada,
  CruzamentoSuspeito,
  AlertaReincidenciaPerimetro
} from './types';
import { db } from './backend/db';

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'network' | 'ai' | 'db' | 'orcrim'>('map');


  // Unified application state
  const [suspects, setSuspects] = useState<any[]>([]);
  const [occurrences, setOccurrences] = useState<OcorrenciaCriminal[]>([]);
  const [addresses, setAddresses] = useState<EnderecoAtuacao[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>({
    lat: -19.7712,
    lng: -43.8564, // Santa Luzia / 35º BPM default coordinates
  });
  const [highlightedSuspectId, setHighlightedSuspectId] = useState<string | null>(null);

  // Stats Counters
  const [totalSuspects, setTotalSuspects] = useState(0);
  const [activeWarrants, setActiveWarrants] = useState(0);
  const [totalIncidents, setTotalIncidents] = useState(0);

  // Module A (AI Narrative Parser) states
  const [narrativeInput, setNarrativeInput] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedReport, setParsedReport] = useState<any | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Dedicated Intelligence Analysis Result state (Schema 35º BPM / PMMG)
  const [isIntelligenceAnalyzing, setIsIntelligenceAnalyzing] = useState(false);
  const [intelligenceResult, setIntelligenceResult] = useState<IntelligenceAnalysisResult | null>(null);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);

  // Module B (Geospatial Scorer) states
  const [searchRadius, setSearchRadius] = useState<number>(5.0);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Database Tab states
  const [suspectSearchQuery, setSuspectSearchQuery] = useState('');
  const [selectedSuspectDetail, setSelectedSuspectDetail] = useState<SuspectWithDetails | null>(null);
  const [isAddingSuspect, setIsAddingSuspect] = useState(false);
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
  const [suspectOcMode, setSuspectOcMode] = useState<'new' | 'existing'>('new');
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

  // Direct linkage from suspect detail card
  const [isLinkingDirectOccurrence, setIsLinkingDirectOccurrence] = useState(false);
  const [directOcMode, setDirectOcMode] = useState<'new' | 'existing'>('new');
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
  const fetchTelemetry = async () => {
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

        setSuspects(listS);
        setOccurrences(listO);
        setAddresses(listA);

        // Stats calculation
        setTotalSuspects(listS.length);
        setActiveWarrants(listS.filter((s: any) => s.status_mandado_prisao).length);
        setTotalIncidents(listO.length);
        return;
      }
    } catch (err) {
      console.warn('API backend indisponível, inicializando dados locais de inteligência:', err);
    }

    // Static fallback for GitHub Pages / client-side execution
    const listS = db.infratores;
    const listO = db.ocorrencias_criminais;
    const listA = db.enderecos_atuacao;

    setSuspects([...listS]);
    setOccurrences([...listO]);
    setAddresses([...listA]);

    setTotalSuspects(listS.length);
    setActiveWarrants(listS.filter((s: any) => s.status_mandado_prisao).length);
    setTotalIncidents(listO.length);
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  // Module A trigger
  const handleParseReport = async () => {
    setIsParsing(true);
    setParseError(null);
    setParsedReport(null);
    try {
      const response = await fetch('/api/ai/parse-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narrative: narrativeInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao processar narrativa policial.');
      setParsedReport(data);

      // Auto update coordinates based on AI geolocation estimation
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao mapear perfis na área.');
      setMatchResults(data.matches || []);
    } catch (err: any) {
      setMatchError(err.message);
    } finally {
      setIsMatching(false);
    }
  };

  // Full Integrated Intelligence Analysis (35º BPM Schema: Ocorrência + Cruzamento + Alerta de Reincidência)
  const handleRunIntelligenceAnalysis = async () => {
    if (!narrativeInput || narrativeInput.trim() === '') {
      setIntelligenceError('Insira uma narrativa policial ou descrição dos fatos para iniciar a análise.');
      return;
    }
    setIsIntelligenceAnalyzing(true);
    setIntelligenceError(null);
    try {
      const response = await fetch('/api/ai/intelligence-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative: narrativeInput,
          lat: selectedCoords?.lat,
          lng: selectedCoords?.lng,
          radius_km: searchRadius
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao processar análise de inteligência.');
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
          lat: selectedCoords?.lat || -23.6141,
          lng: selectedCoords?.lng || -46.5892
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

  const handleRemoveOccurrenceFromSuspect = (tempId: string) => {
    setSuspectOccurrencesList((prev) => prev.filter((item) => item.tempId !== tempId));
  };

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
        bodyData.ocorrencia_id = directOcExistingId;
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

      // Try server API first
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
      fetchTelemetry();
      setToastMessage('Ocorrência vinculada com sucesso.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error linking occurrence directly:', err);
      alert('Erro ao vincular ocorrência.');
    }
  };

  const handleUnlinkOccurrence = async (ocorrenciaId: string) => {
    if (!selectedSuspectDetail) return;
    try {
      let updatedSuspect: any = null;
      try {
        const res = await fetch(`/api/infratores/${selectedSuspectDetail.id}/ocorrencias/${ocorrenciaId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.updated) {
            updatedSuspect = data.updated;
          }
        }
      } catch (e) {
        console.warn('Backend unlink endpoint not available, falling back to local DB', e);
      }

      if (!updatedSuspect) {
        db.unlinkInfratorOcorrencia(selectedSuspectDetail.id, ocorrenciaId);
        updatedSuspect = db.getInfratorFull(selectedSuspectDetail.id);
      }

      if (updatedSuspect) {
        setSelectedSuspectDetail(updatedSuspect);
      }
      fetchTelemetry();
      setToastMessage('Ocorrência desvinculada com sucesso.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error unlinking occurrence:', err);
    }
  };

  const handleInitiateDeleteSuspect = (id: string, nome: string, vulgo?: string) => {
    setSuspectToDelete({ id, nome, vulgo });
  };

  const handleConfirmDeleteSuspect = async () => {
    if (!suspectToDelete) return;
    const { id, nome, vulgo } = suspectToDelete;
    setIsDeletingSuspect(true);
    try {
      // Optimistic update
      setSuspects((prev) => prev.filter((s) => s.id !== id));
      setTotalSuspects((prev) => Math.max(0, prev - 1));
      if (selectedSuspectDetail?.id === id) {
        setSelectedSuspectDetail(null);
      }

      // Delete from client-side DB instance
      db.deleteInfrator(id);

      const res = await fetch(`/api/infratores/${id}`, {
        method: 'DELETE',
      }).catch(() => null);

      const displayName = vulgo ? `${nome} ("${vulgo}")` : nome;
      setToastMessage(`Infrator ${displayName} excluído com sucesso.`);
      setTimeout(() => setToastMessage(null), 4000);
      fetchTelemetry();
    } catch (err) {
      console.error('Error deleting suspect:', err);
      setToastMessage('Infrator excluído do banco de dados.');
      setTimeout(() => setToastMessage(null), 4000);
      fetchTelemetry();
    } finally {
      setIsDeletingSuspect(false);
      setSuspectToDelete(null);
    }
  };

  // Create suspect submit
  const handleAddSuspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuspectForm.nome_completo.trim()) {
      alert('Preencha o Nome Completo do infrator.');
      return;
    }

    try {
      // Collect all occurrences to link including any unadded draft in the input fields
      const occurrencesToLink = [...suspectOccurrencesList];
      if (suspectNewOcData.numero_bo.trim() && suspectNewOcData.tipificacao_penal.trim()) {
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

      let createdSuspect: any = null;

      // Try server API first
      try {
        const res = await fetch('/api/infratores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newSuspectForm,
            ocorrencias: occurrencesToLink,
          }),
        });
        if (res.ok) {
          createdSuspect = await res.json();
        }
      } catch (netErr) {
        console.warn('Backend API unavailable, saving to local in-memory DB', netErr);
      }

      // Local DB fallback for GitHub Pages or offline/standalone preview
      if (!createdSuspect) {
        createdSuspect = db.addInfrator({
          ...newSuspectForm,
          ocorrencias: occurrencesToLink,
        });
      }

      setIsAddingSuspect(false);
      setSuspectOccurrencesList([]);
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
        status_mandado_prisao: false,
        periculosidade: 'Média',
        altura_estimada: '1.75',
        cor_pele: 'Parda',
        compleicao: 'Média',
        tatuagens_detalhes: '',
        cicatrizes: '',
        sinais_particulares: '',
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
      setToastMessage(`Infrator "${newSuspectForm.nome_completo}" cadastrado com sucesso! ${countOc > 0 ? `(${countOc} ocorrência(s) vinculada(s))` : ''}`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Error adding suspect:', err);
      alert('Ocorreu um erro ao salvar o infrator.');
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
      let created = false;
      try {
        const res = await fetch('/api/ocorrencias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newIncidentForm),
        });
        if (res.ok) {
          created = true;
        }
      } catch (e) {
        console.warn('Backend API unavailable, saving to local in-memory DB', e);
      }

      if (!created) {
        db.addOcorrencia(newIncidentForm);
      }

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
      fetchTelemetry();
      setToastMessage('Ocorrência registrada com sucesso.');
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
                />
              </div>

              {/* Sidebar Quick-Action Menu */}
              <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 flex flex-col justify-between shadow-2xl tactical-corner">
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-4">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-amber-500" />
                      Painel Operacional // Alvo
                    </h3>
                    <span className="text-[9px] font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-400">
                      SYS:READY
                    </span>
                  </div>

                  {selectedCoords ? (
                    <div className="space-y-4">
                      {/* Show active coordinate focus */}
                      <div className="bg-[#0A0A0B] p-3 rounded border border-zinc-800/90 font-mono">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                          COORDENADAS EM FOCO [WGS84]
                        </span>
                        <div className="text-xs text-emerald-400 mt-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            LAT: {selectedCoords.lat.toFixed(6)}
                          </span>
                          <span className="text-zinc-400">|</span>
                          <span>LNG: {selectedCoords.lng.toFixed(6)}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setActiveTab('ai');
                            handleMatchSuspects();
                          }}
                          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black rounded text-xs transition uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 font-mono border border-amber-300/40 cursor-pointer"
                        >
                          <BrainCircuit className="w-4 h-4" /> Executar Varredura IA
                        </button>

                        <button
                          onClick={() => {
                            setNewIncidentForm((prev) => ({
                              ...prev,
                              lat: selectedCoords.lat.toString(),
                              lng: selectedCoords.lng.toString(),
                            }));
                            setIsAddingOccurrence(true);
                            setActiveTab('db');
                          }}
                          className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono font-bold rounded transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-cyan-400" /> Registrar Ocorrência Aqui
                        </button>

                        <button
                          onClick={() => {
                            setNewAddressForm((prev) => ({
                              ...prev,
                              lat: selectedCoords.lat.toString(),
                              lng: selectedCoords.lng.toString(),
                            }));
                            setIsAddingAddress(true);
                            setActiveTab('db');
                          }}
                          className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono font-bold rounded transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-amber-400" /> Registrar Área de Atuação
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-[#0A0A0B] rounded border border-zinc-800 font-mono">
                      <p className="text-zinc-500 text-xs">
                        Clique em qualquer ponto do mapa tático para travar mira e habilitar ações de inteligência geográfica.
                      </p>
                    </div>
                  )}

                  {/* Highlights of active warrants listed in the area */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                        Perfis com Mandados Ativos ({suspects.filter((s) => s.status_mandado_prisao).length})
                      </h4>
                      <span className="text-[9px] font-mono text-red-400 bg-red-950/40 px-1 py-0.5 border border-red-900/40 rounded">
                        ALERTA VERMELHO
                      </span>
                    </div>
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 font-mono">
                      {suspects
                        .filter((s) => s.status_mandado_prisao)
                        .map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setHighlightedSuspectId(s.id);
                              // focus coord
                              const primaryAddr = s.enderecos?.[0] || addresses.find((a) => a.infrator_id === s.id);
                              if (primaryAddr) {
                                setSelectedCoords({
                                  lat: primaryAddr.geom_ponto.lat,
                                  lng: primaryAddr.geom_ponto.lng,
                                });
                              }
                            }}
                            className={`p-2 rounded border text-xs cursor-pointer flex items-center justify-between transition ${
                              highlightedSuspectId === s.id
                                ? 'bg-amber-950/40 border-amber-500/80 shadow-md'
                                : 'bg-[#0A0A0B] border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <img src={s.foto_url} alt={s.vulgo} className="w-7 h-7 rounded object-cover border border-zinc-700" />
                              <div>
                                <span className="font-bold text-zinc-200 block text-xs">{s.nome_completo}</span>
                                <span className="text-[10px] text-amber-400/90 block">"{s.vulgo}" // {s.gangue_faccao}</span>
                              </div>
                            </div>
                            <span className="text-[9px] bg-red-950/80 text-red-400 px-1.5 py-0.5 rounded font-bold border border-red-900 uppercase">
                              M.P. ATIVO
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-3 mt-4 leading-relaxed font-mono">
                  *As áreas de influência representadas pelos círculos tracejados delimitam o raio espacial de atuação de cada investigado.
                </div>
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
              {/* Top Controls Card: Narrative Input & Intelligence Execution */}
              <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 flex flex-col shadow-2xl tactical-corner">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-500 w-4 h-4" />
                    <h3 className="font-bold text-zinc-100 text-xs uppercase tracking-widest font-mono">
                      Mecanismo de Inteligência Tática & Cruzamento Criminal // 35º BPM
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono text-amber-400 bg-amber-950/30 border border-amber-800/40 px-2 py-0.5 rounded font-bold">
                    GEMINI 3.7 FLASH • ESQUEMA OFICIAL DE INTELIGÊNCIA
                  </span>
                </div>

                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Insira o relato da ocorrência policial, denúncia anônima ou transcrição do COPOM/SOU. A IA estruturará os dados do B.O., emitirá alerta de reincidência no perímetro e executará o cruzamento analítico com a base de infratores calculando o score de compatibilidade, fatores convergentes/divergentes e recomendação operacional.
                </p>

                <textarea
                  value={narrativeInput}
                  onChange={(e) => setNarrativeInput(e.target.value)}
                  className="w-full min-h-28 bg-[#0A0A0B] text-zinc-200 p-3 rounded border border-zinc-800 focus:outline-none focus:border-amber-500 text-xs font-mono leading-relaxed resize-y focus:ring-1 focus:ring-amber-500/20"
                  placeholder="Cole aqui a narrativa policial do Boletim de Ocorrência..."
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
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
                      onClick={handleParseReport}
                      disabled={isParsing}
                      className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded transition font-mono flex items-center gap-1.5 cursor-pointer"
                    >
                      {isParsing ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <FileText className="w-3 h-3 text-cyan-400" />
                      )}
                      Parser B.O. Rápido
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setNarrativeInput(
                          'Na noite de ontem, um caminhão contendo televisores de última geração foi interceptado por criminosos armados na região de Heliópolis. O motorista relatou que foi abordado de forma agressiva por dois homens utilizando uma van Sprinter branca. O líder da quadrilha era careca de compleição atlética e possuía uma tatuagem visível de palhaço no braço, proferindo ameaças verbais com uma pistola calibre 380, auxiliado por um comparsa alto conhecido como Neguinho.'
                        )
                      }
                      className="px-2.5 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] rounded transition font-mono cursor-pointer"
                    >
                      Exemplo 1 (Carga)
                    </button>
                    <button
                      onClick={() =>
                        setNarrativeInput(
                          'Dois indivíduos numa motocicleta Honda preta assaltaram um estudante na passarela do Brás. O motorista era de cor parda, vestia blusa cinza e fazia alusão de portar arma sob o casaco. O rapaz que estava na garupa foi identificado como "Didi", de dente de ouro frontal superior, o qual recolheu os celulares das vítimas ameaçando-as verbalmente antes de fugir.'
                        )
                      }
                      className="px-2.5 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] rounded transition font-mono cursor-pointer"
                    >
                      Exemplo 2 (Transeunte)
                    </button>
                  </div>
                </div>

                {intelligenceError && (
                  <div className="mt-4 p-3 bg-red-950/40 border border-red-900 text-red-200 rounded text-xs font-mono">
                    <p className="font-semibold">Erro na análise de inteligência:</p>
                    <p className="mt-1">{intelligenceError}</p>
                  </div>
                )}
              </div>

              {/* Structured Output of Intelligence Analysis (User Schema: Ocorrência Processada, Alerta, Cruzamento) */}
              {intelligenceResult && (
                <div className="space-y-6">
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
                            Características Declaradas
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
                          <div>
                            <span className="text-[9px] text-zinc-500 block">Sinais Particulares</span>
                            <span className="text-amber-300 text-xs font-semibold">{intelligenceResult.ocorrencia_processada.caracteristicas_declaradas?.sinais_particulares || 'Nenhum'}</span>
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
                              lat: selectedCoords?.lat.toString() || '-23.6141',
                              lng: selectedCoords?.lng.toString() || '-46.5892',
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
                              <a
                                href={`/api/suspects/${item.infrator_id}/dossier`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-[10px] rounded transition uppercase flex items-center gap-1 cursor-pointer shadow-sm shadow-amber-500/20"
                                title="Extrair Ficha do Infrator em PDF com Foto, Dados Pessoais e B.O.s"
                              >
                                <FileDown className="w-3.5 h-3.5 stroke-[2.5]" /> Extrair Ficha PDF
                              </a>
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
                      <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4" /> Cadastrar Ficha de Infrator
                      </h3>
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
                          <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">CPF</label>
                          <input
                            type="text"
                            placeholder="000.000.000-00"
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
                              onChange={(e) => setNewSuspectForm({ ...newSuspectForm, status_mandado_prisao: e.target.checked })}
                              className="mr-2 accent-amber-500"
                            /> Mandado de Prisão Ativo?
                          </label>
                        </div>
                      </div>

                      {/* Dedicated Photo Upload & Management Section */}
                      <div className="bg-[#0A0A0B] p-4 rounded border border-zinc-800 space-y-3 tactical-corner">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                          <label className="text-[10px] uppercase text-amber-400 font-bold flex items-center gap-1.5 tracking-widest font-mono">
                            <Camera className="w-3.5 h-3.5" />
                            Registro Fotográfico do Infrator / Foto Tática
                          </label>
                          <span className="text-[9px] text-zinc-500 font-mono">JPG, PNG, WEBP ou Link</span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          {/* Photo Thumbnail / Preview Box */}
                          <div className="relative w-28 h-28 rounded bg-zinc-900 border-2 border-dashed border-zinc-700 flex-shrink-0 flex items-center justify-center overflow-hidden group">
                            {newSuspectForm.foto_url ? (
                              <>
                                <img
                                  src={newSuspectForm.foto_url}
                                  alt="Preview Infrator"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setNewSuspectForm({ ...newSuspectForm, foto_url: '' })}
                                    className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs shadow transition cursor-pointer"
                                    title="Remover Foto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="text-center p-2 text-zinc-500 flex flex-col items-center">
                                <ImageIcon className="w-7 h-7 mb-1 text-zinc-600" />
                                <span className="text-[9px] font-mono leading-tight">Sem Foto</span>
                              </div>
                            )}
                          </div>

                          {/* Action Controls */}
                          <div className="flex-1 w-full space-y-2.5 font-mono">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Primary File Upload Button */}
                              <label className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded transition uppercase tracking-wider font-mono cursor-pointer shadow-md shadow-amber-500/10">
                                <Upload className="w-4 h-4 stroke-[2.5]" />
                                <span>Carregar Foto do Computador</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setNewSuspectForm((prev) => ({
                                          ...prev,
                                          foto_url: reader.result as string,
                                        }));
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>

                              {/* Sample preset mugshots */}
                              <button
                                type="button"
                                onClick={() => {
                                  const presets = [
                                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
                                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop',
                                    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&h=300&fit=crop',
                                    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop',
                                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
                                  ];
                                  const random = presets[Math.floor(Math.random() * presets.length)];
                                  setNewSuspectForm({ ...newSuspectForm, foto_url: random });
                                }}
                                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>Foto de Exemplo</span>
                              </button>

                              {newSuspectForm.foto_url && (
                                <button
                                  type="button"
                                  onClick={() => setNewSuspectForm({ ...newSuspectForm, foto_url: '' })}
                                  className="px-2.5 py-2 bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-300 text-xs rounded transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remover</span>
                                </button>
                              )}
                            </div>

                            {/* URL Input */}
                            <div>
                              <input
                                type="text"
                                placeholder="Ou insira o link/URL direto da imagem (https://...)"
                                value={newSuspectForm.foto_url}
                                onChange={(e) => setNewSuspectForm({ ...newSuspectForm, foto_url: e.target.value })}
                                className="w-full bg-[#0F0F12] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                              />
                            </div>

                            <p className="text-[10px] text-zinc-500">
                              {newSuspectForm.foto_url ? (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Imagem vinculada com sucesso à ficha.
                                </span>
                              ) : (
                                'Clique em "Carregar Foto do Computador" para selecionar um arquivo local ou digite uma URL.'
                              )}
                            </p>
                          </div>
                        </div>
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

                        {/* Switcher: Existing vs New B.O. */}
                        <div className="flex items-center gap-2 bg-[#0F0F12] p-1.5 rounded border border-zinc-800">
                          <button
                            type="button"
                            onClick={() => setSuspectOcMode('new')}
                            className={`flex-1 py-1.5 text-xs font-bold font-mono rounded transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              suspectOcMode === 'new'
                                ? 'bg-amber-500 text-black shadow'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Cadastrar Novo B.O. Diretamente
                          </button>
                          <button
                            type="button"
                            onClick={() => setSuspectOcMode('existing')}
                            className={`flex-1 py-1.5 text-xs font-bold font-mono rounded transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              suspectOcMode === 'existing'
                                ? 'bg-amber-500 text-black shadow'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <Search className="w-3.5 h-3.5" />
                            Vincular B.O. Já Existente no Sistema
                          </button>
                        </div>

                        {/* Common: Role Selection */}
                        <div className="bg-[#121216] p-3 rounded border border-zinc-800 space-y-3">
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
                                  <MapPin className="w-3 h-3 text-cyan-400" /> Latitude (Lat) *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Ex: -19.7712"
                                  value={suspectNewOcData.lat}
                                  onChange={(e) => setSuspectNewOcData({ ...suspectNewOcData, lat: e.target.value })}
                                  className="w-full bg-[#0A0A0B] border border-cyan-900/50 rounded p-2 text-xs text-cyan-200 focus:outline-none focus:border-cyan-500 font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase text-cyan-400 font-bold flex items-center gap-1 mb-1">
                                  <MapPin className="w-3 h-3 text-cyan-400" /> Longitude (Long) *
                                </label>
                                <input
                                  type="text"
                                  required
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

                      <div className="pt-2">
                        <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded text-xs uppercase cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-600/20">
                          <CheckCircle className="w-4 h-4" />
                          <span>Salvar Infrator e Vincular Ocorrências</span>
                        </button>
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
                            required
                            placeholder="Ex: Roubo a Mão Armada (Art. 157)"
                            value={newIncidentForm.tipificacao_penal}
                            onChange={(e) => setNewIncidentForm({ ...newIncidentForm, tipificacao_penal: e.target.value })}
                            className="w-full bg-[#0A0A0B] border border-zinc-800 rounded p-2 text-xs focus:outline-none focus:border-amber-500 text-zinc-200"
                          />
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
                        placeholder="Filtrar por nome, vulgo, CPF..."
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
                          <th className="p-2.5">Nome / CPF</th>
                          <th className="p-2.5">Vulgo</th>
                          <th className="p-2.5">Facção</th>
                          <th className="p-2.5">Perigo</th>
                          <th className="p-2.5">Mandado</th>
                          <th className="p-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850 bg-[#0F0F12]/60">
                        {filteredSuspects.map((s) => (
                          <tr key={s.id} className="hover:bg-[#1A1A22] transition">
                            <td className="p-2.5">
                              <img src={s.foto_url} alt={s.vulgo} className="w-8 h-8 rounded object-cover border border-zinc-700" />
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
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${s.status_mandado_prisao ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-zinc-800 text-zinc-500'}`}>
                                {s.status_mandado_prisao ? 'ATIVO' : 'NENHUM'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => handleViewSuspectDetail(s.id)}
                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded text-[10px] font-bold transition cursor-pointer"
                                title="Ver Ficha Detalhada no Painel Lateral"
                              >
                                Ficha
                              </button>
                              <a
                                href={`/api/suspects/${s.id}/dossier`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-[10px] transition inline-flex items-center gap-1 cursor-pointer shadow-sm shadow-amber-500/20"
                                title="Extrair Ficha do Infrator em PDF com Foto, Dados e B.O.s"
                              >
                                <FileDown className="w-3 h-3 stroke-[2.5]" />
                                <span>PDF</span>
                              </a>
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inspect Suspect Drawer/Detail Card */}
                <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 shadow-2xl tactical-corner">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2.5 font-mono flex items-center justify-between">
                    <span>Ficha Tática de Inteligência</span>
                    <span className="text-[9px] text-zinc-500 font-mono">ID // INSPECTION</span>
                  </h3>

                  {selectedSuspectDetail ? (
                    <div className="space-y-4 text-xs">
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

                      <div className="space-y-2 border-t border-zinc-800/80 pt-3 font-mono">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#0A0A0B] p-2 rounded border border-zinc-850">
                            <span className="text-[9px] text-zinc-500 block uppercase font-bold">Nascimento</span>
                            <span className="text-zinc-200 font-medium">
                              {new Date(selectedSuspectDetail.data_nascimento).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="bg-[#0A0A0B] p-2 rounded border border-zinc-850">
                            <span className="text-[9px] text-zinc-500 block uppercase font-bold">CPF</span>
                            <span className="text-zinc-200 font-medium">{selectedSuspectDetail.cpf}</span>
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
                            <div className="flex items-center gap-1 bg-[#141418] p-1 rounded border border-zinc-800">
                              <button
                                type="button"
                                onClick={() => setDirectOcMode('new')}
                                className={`flex-1 py-1 text-[10px] font-bold rounded cursor-pointer ${
                                  directOcMode === 'new'
                                    ? 'bg-amber-500 text-black'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                Novo B.O.
                              </button>
                              <button
                                type="button"
                                onClick={() => setDirectOcMode('existing')}
                                className={`flex-1 py-1 text-[10px] font-bold rounded cursor-pointer ${
                                  directOcMode === 'existing'
                                    ? 'bg-amber-500 text-black'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                B.O. Existente
                              </button>
                            </div>

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
                                    <option value="Roubo a Mão Armada">Roubo a Mão Armada</option>
                                    <option value="Roubo de Carga">Roubo de Carga</option>
                                    <option value="Tráfico de Drogas">Tráfico de Drogas</option>
                                    <option value="Associação para o Tráfico">Associação para o Tráfico</option>
                                    <option value="Homicídio Tentado">Homicídio Tentado</option>
                                    <option value="Homicídio Consumado">Homicídio Consumado</option>
                                    <option value="Porte Ilegal de Arma de Fogo">Porte Ilegal de Arma de Fogo</option>
                                    <option value="Ameaça / Coação">Ameaça / Coação</option>
                                    <option value="Lesão Corporal">Lesão Corporal</option>
                                    <option value="Extorsão / Sequestro">Extorsão / Sequestro</option>
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
                                className="px-2.5 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 rounded text-[10px] cursor-pointer"
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
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${badge.bg}`}>
                                        {badge.label}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleUnlinkOccurrence(oc.id)}
                                        className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition cursor-pointer p-0.5"
                                        title="Desvincular ocorrência"
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
                        <span className="text-[9px] text-zinc-500 block uppercase font-bold font-mono">Áreas de Influência / Atuação</span>
                        <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 font-mono">
                          {selectedSuspectDetail.enderecos.map((ea) => (
                            <div key={ea.id} className="bg-[#0A0A0B] p-2 rounded border border-zinc-800">
                              <span className="font-bold text-amber-400 block uppercase text-[9px]">{ea.tipo_endereco}</span>
                              <p className="text-zinc-300 mt-0.5 text-[11px] font-sans">{ea.logradouro}, {ea.bairro}</p>
                              <span className="text-[9px] text-zinc-500 block mt-0.5">Raio Influência: {ea.raio_influencia_km} km</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-zinc-800/80 pt-3 font-mono space-y-2">
                        <a
                          href={`/api/suspects/${selectedSuspectDetail.id}/dossier`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded flex items-center justify-center gap-2 transition uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer text-xs"
                        >
                          <FileDown className="w-4 h-4 stroke-[2.5]" /> Extrair Ficha do Infrator em PDF
                        </a>
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
                onClick={() => setSuspectToDelete(null)}
                disabled={isDeletingSuspect}
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
                <span>{isDeletingSuspect ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
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
