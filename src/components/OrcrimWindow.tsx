import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldAlert, 
  Crown, 
  Flame, 
  Target, 
  MapPin, 
  FileText, 
  Printer, 
  Sparkles, 
  Plus, 
  RefreshCw, 
  UserCheck, 
  AlertTriangle, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Building,
  Radio,
  Eye,
  SlidersHorizontal,
  X,
  Trash2,
  UserMinus,
  UserX,
  ShieldX,
  AlertCircle,
  Edit3
} from 'lucide-react';
import { OrcrimData, MembroEstruturaOrcrim, Infrator, SituacaoPrisional } from '../types';
import { db } from '../backend/db';
import { openOrcrimDossier, openSuspectDossier } from '../utils/dossierGenerator';
import { FileDown } from 'lucide-react';
import { persistOrcrimToFirebase, deleteOrcrimFromFirebase } from '../services/firebaseSync';

interface OrcrimWindowProps {
  onSelectSuspect?: (infratorId: string) => void;
  registeredSuspects?: Infrator[];
  onDeleteSuspect?: (id: string, nome: string, vulgo: string) => void;
  onRefreshSuspects?: () => void;
}

// Helper to synchronously get organograms from memory or localStorage cache
const getInitialOrganogramas = (): OrcrimData[] => {
  if (db.orcrim_organogramas && db.orcrim_organogramas.length > 0) {
    return db.orcrim_organogramas;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = window.localStorage.getItem('guardiao_orcrim_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          db.orcrim_organogramas = parsed;
          return parsed;
        }
      }
    } catch (e) {}
  }
  return [];
};

// Helper to synchronously get last selected ORCRIM ID
const getInitialSelectedOrcrimId = (list: OrcrimData[]): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem('guardiao_last_selected_orcrim');
      if (saved && list.some(o => o.id === saved || o.gangue_info?.nome_gangue === saved)) {
        return saved;
      }
    } catch (e) {}
  }
  if (list.length > 0) {
    return list[0].id || list[0].gangue_info?.nome_gangue || '';
  }
  return '';
};

export const OrcrimWindow: React.FC<OrcrimWindowProps> = ({ 
  onSelectSuspect, 
  registeredSuspects = [],
  onDeleteSuspect,
  onRefreshSuspects 
}) => {
  const [organogramas, setOrganogramas] = useState<OrcrimData[]>(getInitialOrganogramas);
  const [selectedOrcrimId, setSelectedOrcrimId] = useState<string>(() => {
    const list = getInitialOrganogramas();
    return getInitialSelectedOrcrimId(list);
  });
  const [currentOrcrim, setCurrentOrcrim] = useState<OrcrimData | null>(() => {
    const list = getInitialOrganogramas();
    const id = getInitialSelectedOrcrimId(list);
    return list.find(o => o.id === id || o.gangue_info?.nome_gangue === id) || (list.length > 0 ? list[0] : null);
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzingAi, setAnalyzingAi] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Modals state
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiFactionName, setAiFactionName] = useState<string>('');
  const [aiNarrative, setAiNarrative] = useState<string>('');
  
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [targetLevel, setTargetLevel] = useState<1 | 2 | 3>(1);
  const [selectedSuspectId, setSelectedSuspectId] = useState<string>('');
  const [targetFactionName, setTargetFactionName] = useState<string>('');
  const [memberFuncao, setMemberFuncao] = useState<string>('');
  const [memberArea, setMemberArea] = useState<string>('');
  const [memberSubordinado, setMemberSubordinado] = useState<string>('');
  const [memberSituacao, setMemberSituacao] = useState<SituacaoPrisional>('EM_LIBERDADE');
  const [isSavingMember, setIsSavingMember] = useState<boolean>(false);

  // Member Deletion Modal state
  const [memberToDelete, setMemberToDelete] = useState<{
    membro: MembroEstruturaOrcrim;
    level: 1 | 2 | 3;
  } | null>(null);
  const [deleteOption, setDeleteOption] = useState<'remove_from_orcrim' | 'delete_entire_suspect'>('remove_from_orcrim');
  const [isDeletingMember, setIsDeletingMember] = useState<boolean>(false);

  // Organogram Deletion Modal state
  const [orcrimToDelete, setOrcrimToDelete] = useState<OrcrimData | null>(null);
  const [isDeletingOrcrim, setIsDeletingOrcrim] = useState<boolean>(false);

  // Create New ORCRIM Modal state
  const [showCreateOrcrimModal, setShowCreateOrcrimModal] = useState<boolean>(false);
  const [newOrcrimName, setNewOrcrimName] = useState<string>('');
  const [newOrcrimTerritory, setNewOrcrimTerritory] = useState<string>('Santa Luzia / 35º BPM');
  const [newOrcrimResumo, setNewOrcrimResumo] = useState<string>('');
  const [newOrcrimLeaderId, setNewOrcrimLeaderId] = useState<string>('');
  const [newOrcrimLeaderRole, setNewOrcrimLeaderRole] = useState<string>('Líder Geral / Sintonia de Rua');
  const [newOrcrimLeaderSituacao, setNewOrcrimLeaderSituacao] = useState<SituacaoPrisional>('EM_LIBERDADE');
  const [isSavingOrcrim, setIsSavingOrcrim] = useState<boolean>(false);

  // Edit ORCRIM Info Modal state
  const [showEditOrcrimModal, setShowEditOrcrimModal] = useState<boolean>(false);
  const [editOrcrimName, setEditOrcrimName] = useState<string>('');
  const [editOrcrimTerritory, setEditOrcrimTerritory] = useState<string>('');
  const [editOrcrimResumo, setEditOrcrimResumo] = useState<string>('');
  const [isSavingEditOrcrim, setIsSavingEditOrcrim] = useState<boolean>(false);

  // Edit Member Modal state
  const [memberToEdit, setMemberToEdit] = useState<{
    membro: MembroEstruturaOrcrim;
    level: 1 | 2 | 3;
  } | null>(null);
  const [editMemberFuncao, setEditMemberFuncao] = useState<string>('');
  const [editMemberLevel, setEditMemberLevel] = useState<1 | 2 | 3>(1);
  const [editMemberSituacao, setEditMemberSituacao] = useState<SituacaoPrisional>('EM_LIBERDADE');
  const [editMemberMandado, setEditMemberMandado] = useState<boolean>(false);
  const [editMemberArea, setEditMemberArea] = useState<string>('');
  const [editMemberSubordinado, setEditMemberSubordinado] = useState<string>('');
  const [isSavingEditMember, setIsSavingEditMember] = useState<boolean>(false);

  // Multi-layer persistence helper: saves to React state, in-memory DB, localStorage, Firestore, and backend API
  const persistOrcrimEverywhere = async (targetOrcrim: OrcrimData) => {
    // 1. Immediately update React state
    setCurrentOrcrim(targetOrcrim);
    setOrganogramas(prev => {
      const filtered = prev.filter(
        o => o.id !== targetOrcrim.id && o.gangue_info?.nome_gangue !== targetOrcrim.gangue_info?.nome_gangue
      );
      return [...filtered, targetOrcrim];
    });
    const effectiveId = targetOrcrim.id || targetOrcrim.gangue_info.nome_gangue;
    setSelectedOrcrimId(effectiveId);

    // 2. Immediately update in-memory DB and localStorage
    db.saveOrcrim(targetOrcrim);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('guardiao_orcrim_cache', JSON.stringify(db.orcrim_organogramas));
        window.localStorage.setItem('guardiao_last_selected_orcrim', effectiveId);
      } catch (e) {}
    }

    // 3. Immediately persist to Firestore in background
    persistOrcrimToFirebase(targetOrcrim).catch(err => {
      console.warn('Erro ao sincronizar com Firestore:', err);
    });

    // 4. Immediately persist to Express backend API & disk JSON
    try {
      await fetch('/api/orcrim/organogramas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetOrcrim),
      });
    } catch (err) {
      console.warn('Erro na requisição backend /api/orcrim/organogramas:', err);
    }
  };

  // Multi-layer delete helper: removes from in-memory DB, localStorage, Firestore, and backend API
  const deleteOrcrimEverywhere = async (id: string, name: string) => {
    // 1. In-memory DB
    db.deleteOrcrim(id);

    // 2. LocalStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('guardiao_orcrim_cache', JSON.stringify(db.orcrim_organogramas));
        const last = window.localStorage.getItem('guardiao_last_selected_orcrim');
        if (last === id || last === name) {
          window.localStorage.removeItem('guardiao_last_selected_orcrim');
        }
      } catch (e) {}
    }

    // 3. Firestore
    deleteOrcrimFromFirebase(id).catch(err => console.warn(err));

    // 4. Express backend
    fetch(`/api/orcrim/organogramas/${id}`, { method: 'DELETE' }).catch(err => console.warn(err));
  };

  // Selection handler with persistence
  const handleSelectOrcrim = (id: string) => {
    setSelectedOrcrimId(id);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('guardiao_last_selected_orcrim', id);
    }
  };

  // Load existing organograms from backend and reconcile
  const fetchOrganogramas = async () => {
    try {
      const res = await fetch('/api/orcrim/organogramas').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Merge with memory / localStorage
          const map = new Map<string, OrcrimData>();
          for (const item of db.orcrim_organogramas) {
            const k = item.id || item.gangue_info?.nome_gangue;
            if (k) map.set(k, item);
          }
          for (const item of data) {
            const k = item.id || item.gangue_info?.nome_gangue;
            if (k) map.set(k, item);
          }
          const merged = Array.from(map.values());
          db.orcrim_organogramas = merged;
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('guardiao_orcrim_cache', JSON.stringify(merged));
          }
          setOrganogramas(merged);

          // Restore selection
          const currentId = selectedOrcrimId || (typeof window !== 'undefined' ? window.localStorage.getItem('guardiao_last_selected_orcrim') : null);
          const found = merged.find(o => o.id === currentId || o.gangue_info?.nome_gangue === currentId);
          if (found) {
            setSelectedOrcrimId(found.id || found.gangue_info.nome_gangue);
            setCurrentOrcrim(found);
          } else if (merged.length > 0) {
            setSelectedOrcrimId(merged[0].id || merged[0].gangue_info.nome_gangue);
            setCurrentOrcrim(merged[0]);
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Backend indisponível, mantendo dados locais de ORCRIM:', err);
    }

    // Fallback local memory
    const fallbackData = db.orcrim_organogramas;
    if (fallbackData.length > 0) {
      setOrganogramas(fallbackData);
      const currentId = selectedOrcrimId || (typeof window !== 'undefined' ? window.localStorage.getItem('guardiao_last_selected_orcrim') : null);
      const found = fallbackData.find(d => d.id === currentId || d.gangue_info?.nome_gangue === currentId);
      if (found) {
        setSelectedOrcrimId(found.id || found.gangue_info.nome_gangue);
        setCurrentOrcrim(found);
      } else {
        setSelectedOrcrimId(fallbackData[0].id || fallbackData[0].gangue_info.nome_gangue);
        setCurrentOrcrim(fallbackData[0]);
      }
    }
  };

  useEffect(() => {
    fetchOrganogramas();
  }, []);

  useEffect(() => {
    if (selectedOrcrimId && organogramas.length > 0) {
      const found = organogramas.find(o => o.id === selectedOrcrimId || o.gangue_info?.nome_gangue === selectedOrcrimId);
      if (found) setCurrentOrcrim(found);
    }
  }, [selectedOrcrimId, organogramas]);

  // AI Generator trigger
  const handleGenerateAiOrganogram = async () => {
    if (!aiFactionName.trim()) {
      alert('Informe o nome da Facção / Gangue para gerar a análise.');
      return;
    }

    try {
      setAnalyzingAi(true);
      const res = await fetch('/api/ai/orcrim-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gang_name: aiFactionName,
          custom_narrative: aiNarrative
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao classificar organograma de ORCRIM');
      }

      const generated = await res.json();
      await persistOrcrimEverywhere(generated);
      setShowAiModal(false);
      setAiFactionName('');
      setAiNarrative('');
    } catch (error: any) {
      alert(`Erro na classificação de Inteligência: ${error.message}`);
    } finally {
      setAnalyzingAi(false);
    }
  };

  // Add Member to Organogram
  const handleAddMember = async () => {
    if (!selectedSuspectId) {
      alert('Por favor, selecione um infrator cadastrado na lista.');
      return;
    }

    const suspect = registeredSuspects.find(s => s.id === selectedSuspectId);
    if (!suspect) {
      alert('Infrator selecionado não encontrado no cadastro.');
      return;
    }

    setIsSavingMember(true);

    try {
      const newMember: MembroEstruturaOrcrim = {
        infrator_id: suspect.id,
        nome_completo: suspect.nome_completo,
        vulgo: suspect.vulgo,
        funcao_especifica: memberFuncao.trim() || (targetLevel === 1 ? 'Líder / Sintonia' : targetLevel === 2 ? 'Gerência Operacional' : 'Operador / Linha de Frente'),
        foto_url: suspect.foto_url,
        status_mandado: suspect.status_mandado_prisao,
        situacao_atual: memberSituacao,
        area_responsabilidade: memberArea.trim() || undefined,
        subordinado_a_vulgo: memberSubordinado.trim() || undefined
      };

      // Determine target organogram:
      const effectiveFactionName = targetFactionName.trim() || 
        currentOrcrim?.gangue_info.nome_gangue || 
        suspect.gangue_faccao || 
        'GANGUE / ORCRIM REGIONAL';

      let targetOrcrim: OrcrimData;

      const existingOrcrim = organogramas.find(
        o => (o.id && o.id === selectedOrcrimId) || 
             (o.gangue_info && o.gangue_info.nome_gangue.toLowerCase() === effectiveFactionName.toLowerCase())
      );

      if (existingOrcrim) {
        targetOrcrim = JSON.parse(JSON.stringify(existingOrcrim));
      } else if (currentOrcrim) {
        targetOrcrim = JSON.parse(JSON.stringify(currentOrcrim));
      } else {
        targetOrcrim = {
          id: `orcrim-${Date.now()}`,
          gangue_info: {
            nome_gangue: effectiveFactionName,
            territorio_principal: 'Santa Luzia / 35º BPM',
            total_integrantes_mapeados: 1,
            resumo_atuacao: `Estrutura e organograma da organização ${effectiveFactionName} - Inteligência PMMG.`
          },
          estrutura_piramidal: {
            nivel_1_lideranca: [],
            nivel_2_gerencia_tatica: [],
            nivel_3_operacionais_e_linha_de_frente: []
          }
        };
      }

      if (!targetOrcrim.estrutura_piramidal) {
        targetOrcrim.estrutura_piramidal = {
          nivel_1_lideranca: [],
          nivel_2_gerencia_tatica: [],
          nivel_3_operacionais_e_linha_de_frente: []
        };
      }

      const estrutura = targetOrcrim.estrutura_piramidal;

      // Remove member from any level first if already present to avoid duplicate entries
      estrutura.nivel_1_lideranca = (estrutura.nivel_1_lideranca || []).filter(m => m.infrator_id !== suspect.id);
      const lvl2 = (estrutura.nivel_2_gerencia_tatica || estrutura['nivel_2_gerencia_tática'] || []).filter(m => m.infrator_id !== suspect.id);
      estrutura.nivel_2_gerencia_tatica = lvl2;
      estrutura['nivel_2_gerencia_tática'] = lvl2;
      estrutura.nivel_3_operacionais_e_linha_de_frente = (estrutura.nivel_3_operacionais_e_linha_de_frente || []).filter(m => m.infrator_id !== suspect.id);

      // Add to requested level
      if (targetLevel === 1) {
        estrutura.nivel_1_lideranca = [...estrutura.nivel_1_lideranca, newMember];
      } else if (targetLevel === 2) {
        estrutura.nivel_2_gerencia_tatica = [...lvl2, newMember];
        estrutura['nivel_2_gerencia_tática'] = [...lvl2, newMember];
      } else {
        estrutura.nivel_3_operacionais_e_linha_de_frente = [
          ...estrutura.nivel_3_operacionais_e_linha_de_frente,
          newMember
        ];
      }

      // Recalculate total mapped
      const total = (estrutura.nivel_1_lideranca?.length || 0) + 
        (estrutura.nivel_2_gerencia_tatica?.length || 0) + 
        (estrutura.nivel_3_operacionais_e_linha_de_frente?.length || 0);

      targetOrcrim.gangue_info.total_integrantes_mapeados = total;
      targetOrcrim.estrutura_piramidal = estrutura;

      await persistOrcrimEverywhere(targetOrcrim);

      // Reset form and close modal
      setShowAddMemberModal(false);
      setSelectedSuspectId('');
      setTargetFactionName('');
      setMemberFuncao('');
      setMemberArea('');
      setMemberSubordinado('');
      setToastMessage(`Integrante "${newMember.vulgo}" adicionado e salvo na ORCRIM.`);
    } catch (e: any) {
      console.error('Erro ao salvar membro na ORCRIM:', e);
      alert(`Erro ao salvar integrante na ORCRIM: ${e.message || 'Falha na requisição'}`);
    } finally {
      setIsSavingMember(false);
    }
  };

  // Delete / Remove Member from ORCRIM Handler
  const handleInitiateDeleteMember = (membro: MembroEstruturaOrcrim, level: 1 | 2 | 3) => {
    setMemberToDelete({ membro, level });
    setDeleteOption('remove_from_orcrim');
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete || !currentOrcrim) return;

    setIsDeletingMember(true);
    const { membro } = memberToDelete;

    try {
      if (deleteOption === 'delete_entire_suspect') {
        await fetch(`/api/infratores/${membro.infrator_id}`, { method: 'DELETE' }).catch(() => null);
        db.deleteInfrator(membro.infrator_id);
      }

      // Remove member from current Orcrim structure across all levels
      const updatedOrcrim: OrcrimData = JSON.parse(JSON.stringify(currentOrcrim));
      const estrutura = updatedOrcrim.estrutura_piramidal;

      if (estrutura) {
        estrutura.nivel_1_lideranca = (estrutura.nivel_1_lideranca || []).filter(
          m => m.infrator_id !== membro.infrator_id && m.vulgo !== membro.vulgo
        );
        const lvl2 = (estrutura.nivel_2_gerencia_tatica || estrutura['nivel_2_gerencia_tática'] || []).filter(
          m => m.infrator_id !== membro.infrator_id && m.vulgo !== membro.vulgo
        );
        estrutura.nivel_2_gerencia_tatica = lvl2;
        estrutura['nivel_2_gerencia_tática'] = lvl2;
        estrutura.nivel_3_operacionais_e_linha_de_frente = (estrutura.nivel_3_operacionais_e_linha_de_frente || []).filter(
          m => m.infrator_id !== membro.infrator_id && m.vulgo !== membro.vulgo
        );

        const total = (estrutura.nivel_1_lideranca?.length || 0) + 
          (estrutura.nivel_2_gerencia_tatica?.length || 0) + 
          (estrutura.nivel_3_operacionais_e_linha_de_frente?.length || 0);

        updatedOrcrim.gangue_info.total_integrantes_mapeados = total;
        updatedOrcrim.estrutura_piramidal = estrutura;
      }

      await persistOrcrimEverywhere(updatedOrcrim);

      if (deleteOption === 'delete_entire_suspect') {
        onRefreshSuspects?.();
        setToastMessage(`Infrator "${membro.vulgo}" excluído do sistema policial e removido da ORCRIM.`);
      } else {
        setToastMessage(`Integrante "${membro.vulgo}" removido da estrutura da organização criminosa.`);
      }

      setMemberToDelete(null);
    } catch (error: any) {
      console.error('Erro ao processar exclusão de integrante:', error);
      alert(`Erro ao processar exclusão: ${error.message || 'Falha na operação'}`);
    } finally {
      setIsDeletingMember(false);
    }
  };

  // Delete Organogram Handler
  const handleInitiateDeleteOrcrim = () => {
    if (!currentOrcrim) return;
    setOrcrimToDelete(currentOrcrim);
  };

  const handleConfirmDeleteOrcrim = async () => {
    if (!orcrimToDelete) return;
    setIsDeletingOrcrim(true);

    try {
      const id = orcrimToDelete.id || orcrimToDelete.gangue_info.nome_gangue;
      await deleteOrcrimEverywhere(id, orcrimToDelete.gangue_info.nome_gangue);

      const remaining = organogramas.filter(
        o => o.id !== id && o.gangue_info.nome_gangue !== orcrimToDelete.gangue_info.nome_gangue
      );
      setOrganogramas(remaining);
      if (remaining.length > 0) {
        const nextId = remaining[0].id || remaining[0].gangue_info.nome_gangue;
        setSelectedOrcrimId(nextId);
        setCurrentOrcrim(remaining[0]);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('guardiao_last_selected_orcrim', nextId);
        }
      } else {
        setSelectedOrcrimId('');
        setCurrentOrcrim(null);
      }

      setToastMessage(`Organograma da facção "${orcrimToDelete.gangue_info.nome_gangue}" excluído com sucesso.`);
      setOrcrimToDelete(null);
    } catch (err: any) {
      console.error('Erro ao excluir organograma:', err);
      alert(`Erro ao excluir organograma: ${err.message || 'Falha na operação'}`);
    } finally {
      setIsDeletingOrcrim(false);
    }
  };

  // Edit ORCRIM Details Handlers
  const handleInitiateEditOrcrim = () => {
    if (!currentOrcrim) return;
    setEditOrcrimName(currentOrcrim.gangue_info.nome_gangue);
    setEditOrcrimTerritory(currentOrcrim.gangue_info.territorio_principal || 'Santa Luzia / 35º BPM');
    setEditOrcrimResumo(currentOrcrim.gangue_info.resumo_atuacao || '');
    setShowEditOrcrimModal(true);
  };

  const handleSaveEditOrcrimDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentOrcrim) return;
    const nameTrimmed = editOrcrimName.trim();
    if (!nameTrimmed) {
      alert('Por favor, informe o Nome da Organização Criminosa.');
      return;
    }
    setIsSavingEditOrcrim(true);
    try {
      const updated: OrcrimData = JSON.parse(JSON.stringify(currentOrcrim));
      updated.gangue_info.nome_gangue = nameTrimmed;
      updated.gangue_info.territorio_principal = editOrcrimTerritory.trim() || 'Santa Luzia / 35º BPM';
      updated.gangue_info.resumo_atuacao = editOrcrimResumo.trim() || '';
      await persistOrcrimEverywhere(updated);
      setShowEditOrcrimModal(false);
      setToastMessage(`Dados da organização "${nameTrimmed}" atualizados e salvos com sucesso!`);
    } catch (err: any) {
      alert(`Erro ao salvar dados da ORCRIM: ${err.message || err}`);
    } finally {
      setIsSavingEditOrcrim(false);
    }
  };

  // Edit Member Details Handlers
  const handleInitiateEditMember = (membro: MembroEstruturaOrcrim, level: 1 | 2 | 3) => {
    setMemberToEdit({ membro, level });
    setEditMemberFuncao(membro.funcao_especifica || '');
    setEditMemberLevel(level);
    setEditMemberSituacao(membro.situacao_atual || 'EM_LIBERDADE');
    setEditMemberMandado(!!membro.status_mandado);
    setEditMemberArea(membro.area_responsabilidade || '');
    setEditMemberSubordinado(membro.subordinado_a_vulgo || '');
  };

  const handleSaveEditMember = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!memberToEdit || !currentOrcrim) return;

    setIsSavingEditMember(true);
    try {
      const { membro } = memberToEdit;
      const updated: OrcrimData = JSON.parse(JSON.stringify(currentOrcrim));
      const estrutura = updated.estrutura_piramidal;

      // Remove from all existing levels
      estrutura.nivel_1_lideranca = (estrutura.nivel_1_lideranca || []).filter(
        m => m.infrator_id !== membro.infrator_id
      );
      const lvl2 = (estrutura.nivel_2_gerencia_tatica || estrutura['nivel_2_gerencia_tática'] || []).filter(
        m => m.infrator_id !== membro.infrator_id
      );
      estrutura.nivel_2_gerencia_tatica = lvl2;
      estrutura['nivel_2_gerencia_tática'] = lvl2;
      estrutura.nivel_3_operacionais_e_linha_de_frente = (estrutura.nivel_3_operacionais_e_linha_de_frente || []).filter(
        m => m.infrator_id !== membro.infrator_id
      );

      // Updated member object
      const updatedMember: MembroEstruturaOrcrim = {
        ...membro,
        funcao_especifica: editMemberFuncao.trim() || membro.funcao_especifica,
        situacao_atual: editMemberSituacao,
        status_mandado: editMemberMandado,
        area_responsabilidade: editMemberArea.trim() || undefined,
        subordinado_a_vulgo: editMemberSubordinado.trim() || undefined,
      };

      // Add to new level
      if (editMemberLevel === 1) {
        estrutura.nivel_1_lideranca.push(updatedMember);
      } else if (editMemberLevel === 2) {
        estrutura.nivel_2_gerencia_tatica.push(updatedMember);
        estrutura['nivel_2_gerencia_tática'] = estrutura.nivel_2_gerencia_tatica;
      } else {
        estrutura.nivel_3_operacionais_e_linha_de_frente.push(updatedMember);
      }

      const total = (estrutura.nivel_1_lideranca?.length || 0) + 
        (estrutura.nivel_2_gerencia_tatica?.length || 0) + 
        (estrutura.nivel_3_operacionais_e_linha_de_frente?.length || 0);

      updated.gangue_info.total_integrantes_mapeados = total;
      updated.estrutura_piramidal = estrutura;

      await persistOrcrimEverywhere(updated);
      setMemberToEdit(null);
      setToastMessage(`Dados e função de "${membro.vulgo}" atualizados e salvos.`);
    } catch (err: any) {
      alert(`Erro ao salvar alterações do integrante: ${err.message || err}`);
    } finally {
      setIsSavingEditMember(false);
    }
  };

  // Reset New ORCRIM Form
  const resetNewOrcrimForm = () => {
    setNewOrcrimName('');
    setNewOrcrimTerritory('Santa Luzia / 35º BPM');
    setNewOrcrimResumo('');
    setNewOrcrimLeaderId('');
    setNewOrcrimLeaderRole('Líder Geral / Sintonia de Rua');
    setNewOrcrimLeaderSituacao('EM_LIBERDADE');
  };

  // Create New ORCRIM Handler
  const handleCreateNewOrcrim = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const nameTrimmed = newOrcrimName.trim();
    if (!nameTrimmed) {
      alert('Por favor, informe o Nome da Organização Criminosa / Facção / Gangue.');
      return;
    }

    // Check if organogram with this name already exists
    const existing = organogramas.find(
      o => o.gangue_info && o.gangue_info.nome_gangue.toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (existing) {
      const confirmOpen = window.confirm(
        `A organização "${nameTrimmed}" já possui um organograma cadastrado. Deseja abrir o organograma existente?`
      );
      if (confirmOpen) {
        const id = existing.id || existing.gangue_info.nome_gangue;
        handleSelectOrcrim(id);
        setCurrentOrcrim(existing);
        setShowCreateOrcrimModal(false);
      }
      return;
    }

    setIsSavingOrcrim(true);

    try {
      const cleanSlug = nameTrimmed
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'orcrim';
      const orcrimId = `${cleanSlug}-${Date.now().toString().slice(-6)}`;

      const initialLideranca: MembroEstruturaOrcrim[] = [];
      if (newOrcrimLeaderId) {
        const suspect = registeredSuspects.find(s => s.id === newOrcrimLeaderId);
        if (suspect) {
          initialLideranca.push({
            infrator_id: suspect.id,
            nome_completo: suspect.nome_completo,
            vulgo: suspect.vulgo,
            funcao_especifica: newOrcrimLeaderRole.trim() || 'Líder Geral / Sintonia de Rua',
            foto_url: suspect.foto_url,
            status_mandado: suspect.status_mandado_prisao,
            situacao_atual: newOrcrimLeaderSituacao,
            area_responsabilidade: newOrcrimTerritory.trim() || undefined,
          });
        }
      }

      const newOrcrim: OrcrimData = {
        id: orcrimId,
        gangue_info: {
          nome_gangue: nameTrimmed,
          territorio_principal: newOrcrimTerritory.trim() || 'Santa Luzia / 35º BPM',
          total_integrantes_mapeados: initialLideranca.length,
          resumo_atuacao: newOrcrimResumo.trim() || `Organização criminosa mapeada pela Seção de Inteligência do 35º BPM.`,
        },
        estrutura_piramidal: {
          nivel_1_lideranca: initialLideranca,
          nivel_2_gerencia_tatica: [],
          ['nivel_2_gerencia_tática']: [],
          nivel_3_operacionais_e_linha_de_frente: [],
        },
      };

      await persistOrcrimEverywhere(newOrcrim);
      setShowCreateOrcrimModal(false);
      resetNewOrcrimForm();
      setToastMessage(`Organização Criminosa "${newOrcrim.gangue_info.nome_gangue}" cadastrada com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao cadastrar nova ORCRIM:', err);
      alert(`Erro ao cadastrar nova ORCRIM: ${err.message || 'Falha na requisição'}`);
    } finally {
      setIsSavingOrcrim(false);
    }
  };

  // Helper to extract Level 2 array safely
  const getNivel2Members = (orcrim: OrcrimData): MembroEstruturaOrcrim[] => {
    if (!orcrim || !orcrim.estrutura_piramidal) return [];
    return orcrim.estrutura_piramidal.nivel_2_gerencia_tatica || 
           orcrim.estrutura_piramidal['nivel_2_gerencia_tática'] || [];
  };

  // Filter members by search term
  const filterMember = (m: MembroEstruturaOrcrim) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return m.nome_completo.toLowerCase().includes(term) ||
           m.vulgo.toLowerCase().includes(term) ||
           m.funcao_especifica.toLowerCase().includes(term) ||
           (m.area_responsabilidade && m.area_responsabilidade.toLowerCase().includes(term)) ||
           (m.subordinado_a_vulgo && m.subordinado_a_vulgo.toLowerCase().includes(term));
  };

  const nivel1Filtered = (currentOrcrim?.estrutura_piramidal.nivel_1_lideranca || []).filter(filterMember);
  const nivel2Filtered = (currentOrcrim ? getNivel2Members(currentOrcrim) : []).filter(filterMember);
  const nivel3Filtered = (currentOrcrim?.estrutura_piramidal.nivel_3_operacionais_e_linha_de_frente || []).filter(filterMember);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-[#0E121B] border border-[#C4A76E]/30 rounded-xl p-5 shadow-lg text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#C4A76E]/20 border border-[#C4A76E]/50 rounded-xl text-[#DFC897]">
              <ShieldAlert className="w-7 h-7 text-[#DFC897]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#C4A76E] text-[#0E121B] font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded tracking-widest">
                  MÓDULO TÁTICO PMMG / P2
                </span>
                <span className="text-xs text-[#DFC897] font-semibold">
                  35º BPM • Alto Rio das Velhas
                </span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-wide mt-1">
                ORCRIM • Organogramas de Facções & Gangues
              </h2>
              <p className="text-sm text-slate-300">
                Mapeamento piramidal hierárquico, cadeia de comando e classificação de infratores
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* BOTÃO CADASTRAR NOVA ORCRIM */}
            <button
              type="button"
              onClick={() => {
                resetNewOrcrimForm();
                setShowCreateOrcrimModal(true);
              }}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg border border-emerald-500/50 flex items-center gap-2 transition-all shadow-md cursor-pointer"
              title="Cadastrar uma nova organização criminosa, facção ou gangue"
            >
              <Plus className="w-4 h-4 text-emerald-200" />
              <span>Cadastrar Nova ORCRIM</span>
            </button>

            <button
              onClick={() => {
                setTargetLevel(1);
                setTargetFactionName(currentOrcrim?.gangue_info.nome_gangue || '');
                setShowAddMemberModal(true);
              }}
              className="px-3.5 py-2 bg-[#1D356D] hover:bg-[#2A478C] text-white font-semibold text-xs rounded-lg border border-blue-400/30 flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-300" />
              <span>Cadastrar Infrator na ORCRIM</span>
            </button>

            <button
              onClick={() => setShowAiModal(true)}
              disabled={analyzingAi}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>Gerar / Classificar com IA</span>
            </button>

            {currentOrcrim && (
              <button
                type="button"
                onClick={() => openOrcrimDossier(currentOrcrim)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs rounded-lg border border-amber-500/40 flex items-center gap-2 transition-all cursor-pointer"
                title="Imprimir ou Salvar Dossiê da ORCRIM em PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / PDF</span>
              </button>
            )}

            {currentOrcrim && (
              <button
                type="button"
                onClick={handleInitiateDeleteOrcrim}
                className="px-3 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-white font-semibold text-xs rounded-lg border border-red-800/60 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Excluir este Organograma"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Excluir Organograma</span>
              </button>
            )}

            <button
              onClick={fetchOrganogramas}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all"
              title="Atualizar Dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Faction Selector Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#DFC897]" />
            Organização Ativa:
          </span>
          {organogramas.map((orcrim) => {
            const isSelected = selectedOrcrimId === (orcrim.id || orcrim.gangue_info.nome_gangue);
            return (
              <button
                key={orcrim.id || orcrim.gangue_info.nome_gangue}
                onClick={() => handleSelectOrcrim(orcrim.id || orcrim.gangue_info.nome_gangue)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#C4A76E] text-[#0E121B] shadow-md ring-2 ring-[#DFC897]'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0E121B]' : 'text-amber-400'}`} />
                <span>{orcrim.gangue_info.nome_gangue}</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
                  isSelected ? 'bg-[#0E121B] text-[#DFC897]' : 'bg-slate-900 text-slate-400'
                }`}>
                  {orcrim.gangue_info.total_integrantes_mapeados}
                </span>
              </button>
            );
          })}

          {/* Botão rápido + Nova ORCRIM na barra de abas */}
          <button
            type="button"
            onClick={() => {
              resetNewOrcrimForm();
              setShowCreateOrcrimModal(true);
            }}
            className="px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-emerald-700/60 flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Cadastrar Nova ORCRIM"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Nova ORCRIM</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {currentOrcrim ? (
        <div className="space-y-6">
          {/* Faction Strategic Summary Card */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
              <div className="md:col-span-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Organização Criminosa / Facção
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                    {currentOrcrim.gangue_info.nome_gangue}
                  </h3>
                  <button
                    type="button"
                    onClick={handleInitiateEditOrcrim}
                    className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-md transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shadow-2xs"
                    title="Editar informações da Organização Criminosa"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px]">Editar Dados</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Território de Domínio Principal
                </span>
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mt-1">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{currentOrcrim.gangue_info.territorio_principal}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Efetivo Mapeado SIP/P2
                </span>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mt-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>{currentOrcrim.gangue_info.total_integrantes_mapeados} Infratores Classificados</span>
                </div>
              </div>
            </div>

            {currentOrcrim.gangue_info.resumo_atuacao && (
              <div className="mt-3.5 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Doutrina & Modus Operandi da Facção: </strong>
                  {currentOrcrim.gangue_info.resumo_atuacao}
                </div>
              </div>
            )}

            {/* In-page Filter */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por nome, vulgo, função ou área..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 text-slate-900 font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                  <span className="text-slate-600">Preso</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span className="text-slate-600">Foragido</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="text-slate-600">Em Liberdade</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PYRAMIDAL ORGANOGRAM TREE */}
          {/* ========================================================================= */}

          {/* LEVEL 1: LIDERANÇA ESTRATÉGICA */}
          <div className="bg-gradient-to-br from-red-50/70 via-white to-red-50/30 rounded-xl p-5 border-2 border-red-200 shadow-sm relative">
            <div className="flex items-center justify-between pb-3 border-b border-red-200/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-600 text-white rounded-lg shadow-sm">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-red-600 text-white rounded tracking-wider">
                      NÍVEL 1
                    </span>
                    <h4 className="text-base font-black text-red-950 uppercase tracking-wide">
                      Liderança Estratégica & Sintonia Geral
                    </h4>
                  </div>
                  <p className="text-xs text-red-700 font-medium">
                    Mandantes gerais, sintonias de rua e articulação carcerária
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-red-100 text-red-800 px-2.5 py-1 rounded-full border border-red-200">
                  {nivel1Filtered.length} Integrante(s)
                </span>
                <button
                  onClick={() => {
                    setTargetLevel(1);
                    setTargetFactionName(currentOrcrim?.gangue_info.nome_gangue || '');
                    setShowAddMemberModal(true);
                  }}
                  className="p-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-all cursor-pointer"
                  title="Adicionar à Liderança"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {nivel1Filtered.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Nenhum membro classificado no Nível 1.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nivel1Filtered.map((membro) => (
                  <MemberCard
                    key={membro.infrator_id + membro.vulgo}
                    membro={membro}
                    level={1}
                    onSelectSuspect={onSelectSuspect}
                    onInitiateDelete={handleInitiateDeleteMember}
                    onInitiateEdit={handleInitiateEditMember}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Visual Connecting Node Divider */}
          <div className="flex flex-col items-center justify-center -my-2 z-10 relative">
            <div className="w-0.5 h-6 bg-gradient-to-b from-red-400 to-amber-400"></div>
            <div className="px-3 py-1 bg-slate-900 text-amber-300 text-[10px] font-extrabold uppercase rounded-full shadow-md border border-amber-500/40 tracking-wider">
              ▼ Subordinação Tática ▼
            </div>
            <div className="w-0.5 h-6 bg-gradient-to-b from-amber-400 to-amber-500"></div>
          </div>

          {/* LEVEL 2: GERÊNCIA TÁTICA */}
          <div className="bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 rounded-xl p-5 border-2 border-amber-200 shadow-sm relative">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-600 text-white rounded-lg shadow-sm">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-600 text-white rounded tracking-wider">
                      NÍVEL 2
                    </span>
                    <h4 className="text-base font-black text-amber-950 uppercase tracking-wide">
                      Gerência Tática, Disciplinas & Logística
                    </h4>
                  </div>
                  <p className="text-xs text-amber-700 font-medium">
                    Gerentes de pontos, operadores bélicos, cobrança, roubo de cargas e controle financeiro
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
                  {nivel2Filtered.length} Integrante(s)
                </span>
                <button
                  onClick={() => {
                    setTargetLevel(2);
                    setTargetFactionName(currentOrcrim?.gangue_info.nome_gangue || '');
                    setShowAddMemberModal(true);
                  }}
                  className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-all cursor-pointer"
                  title="Adicionar à Gerência Tática"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {nivel2Filtered.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Nenhum membro classificado no Nível 2.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nivel2Filtered.map((membro) => (
                  <MemberCard
                    key={membro.infrator_id + membro.vulgo}
                    membro={membro}
                    level={2}
                    onSelectSuspect={onSelectSuspect}
                    onInitiateDelete={handleInitiateDeleteMember}
                    onInitiateEdit={handleInitiateEditMember}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Visual Connecting Node Divider */}
          <div className="flex flex-col items-center justify-center -my-2 z-10 relative">
            <div className="w-0.5 h-6 bg-gradient-to-b from-amber-400 to-blue-400"></div>
            <div className="px-3 py-1 bg-slate-900 text-blue-300 text-[10px] font-extrabold uppercase rounded-full shadow-md border border-blue-500/40 tracking-wider">
              ▼ Linha de Frente & Execução ▼
            </div>
            <div className="w-0.5 h-6 bg-gradient-to-b from-blue-400 to-blue-500"></div>
          </div>

          {/* LEVEL 3: OPERACIONAIS E LINHA DE FRENTE */}
          <div className="bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 rounded-xl p-5 border-2 border-blue-200 shadow-sm relative">
            <div className="flex items-center justify-between pb-3 border-b border-blue-200/80 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-blue-600 text-white rounded tracking-wider">
                      NÍVEL 3
                    </span>
                    <h4 className="text-base font-black text-blue-950 uppercase tracking-wide">
                      Operacionais, Soldados de Pista & Linha de Frente
                    </h4>
                  </div>
                  <p className="text-xs text-blue-700 font-medium">
                    Executores de assaltos, olheiros/fogueteiros, pilotos de fuga e varejistas de entorpecentes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
                  {nivel3Filtered.length} Integrante(s)
                </span>
                <button
                  onClick={() => {
                    setTargetLevel(3);
                    setTargetFactionName(currentOrcrim?.gangue_info.nome_gangue || '');
                    setShowAddMemberModal(true);
                  }}
                  className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-all cursor-pointer"
                  title="Adicionar aos Operacionais"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {nivel3Filtered.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Nenhum membro classificado no Nível 3.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nivel3Filtered.map((membro) => (
                  <MemberCard
                    key={membro.infrator_id + membro.vulgo}
                    membro={membro}
                    level={3}
                    onSelectSuspect={onSelectSuspect}
                    onInitiateDelete={handleInitiateDeleteMember}
                    onInitiateEdit={handleInitiateEditMember}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Nenhum organograma carregado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Cadastre uma nova organização criminosa manualmente ou utilize a inteligência artificial para estruturar a hierarquia piramidal.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                resetNewOrcrimForm();
                setShowCreateOrcrimModal(true);
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-200" />
              <span>Cadastrar Nova ORCRIM</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Criar com Inteligência Artificial</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CADASTRAR NOVA ORCRIM / ORGANOGRAMA */}
      {/* ========================================================================= */}
      {showCreateOrcrimModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-700 rounded-xl">
                  <ShieldAlert className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-700 text-white rounded tracking-wider">
                      NOVA ORCRIM
                    </span>
                    <h3 className="text-lg font-black text-slate-900">
                      Cadastrar Organização Criminosa
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Criação de novo organograma piramidal tático do 35º BPM
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateOrcrimModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewOrcrim} className="space-y-4 my-5">
              {/* Nome da ORCRIM */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Nome da Organização Criminosa / Facção / Gangue *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Comando Vermelho - Alto das Velhas, PCC - Santa Luzia, Gangue do Pombo..."
                  value={newOrcrimName}
                  onChange={(e) => setNewOrcrimName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 text-slate-900 font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 shadow-xs"
                />
                {/* Sugestões rápidas de siglas / nomes comuns na região */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 self-center">Sugestões:</span>
                  {[
                    'Comando Vermelho (CV)',
                    'Primeiro Comando da Capital (PCC)',
                    'Terceiro Comando Puro (TCP)',
                    'Gangue 31 de Janeiro',
                    'Gangue do Palmital',
                    'Gangue do Muleta',
                    'Gangue da Linha',
                    'Bonde do Morro'
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNewOrcrimName(sug)}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 rounded border border-slate-200 transition-all cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Território de Domínio Principal */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Território de Domínio Principal / Bairros de Atuação *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bairro Palmital / Frimisa / 35º BPM, Santa Luzia"
                    value={newOrcrimTerritory}
                    onChange={(e) => setNewOrcrimTerritory(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 text-slate-900 font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 shadow-xs"
                  />
                </div>
              </div>

              {/* Doutrina / Histórico da Facção */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Doutrina, Modus Operandi & Histórico Delitivo (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva a atuação da facção, pontos de venda de drogas (biqueiras), armamentos típicos, rivalidades conhecidas ou histórico no 35º BPM..."
                  value={newOrcrimResumo}
                  onChange={(e) => setNewOrcrimResumo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-900 font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 shadow-xs"
                />
              </div>

              {/* Bloco Opcional: Integrante Inicial para Liderança (Nível 1) */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wide">
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span>Designar Líder Geral Inicial (Nível 1) • Opcional</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">Pode ser alocado depois</span>
                </div>

                <div>
                  <select
                    value={newOrcrimLeaderId}
                    onChange={(e) => setNewOrcrimLeaderId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold shadow-xs"
                  >
                    <option value="" className="text-slate-500">-- Nenhum líder designado agora (cadastrar depois) --</option>
                    {registeredSuspects.map((s) => (
                      <option key={s.id} value={s.id} className="text-slate-900 font-semibold">
                        {s.nome_completo} ({s.vulgo}) {s.gangue_faccao ? `• Facção: ${s.gangue_faccao}` : ''} {s.status_mandado_prisao ? '⚠️ [MANDADO]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {newOrcrimLeaderId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Função do Líder
                      </label>
                      <input
                        type="text"
                        value={newOrcrimLeaderRole}
                        onChange={(e) => setNewOrcrimLeaderRole(e.target.value)}
                        placeholder="Ex: Líder Geral / Sintonia de Rua"
                        className="w-full px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Situação Prisional
                      </label>
                      <select
                        value={newOrcrimLeaderSituacao}
                        onChange={(e) => setNewOrcrimLeaderSituacao(e.target.value as SituacaoPrisional)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white text-slate-900 font-bold border border-slate-300 rounded-lg"
                      >
                        <option value="EM_LIBERDADE">EM LIBERDADE (Na rua)</option>
                        <option value="FORAGIDO">FORAGIDO (Mandado pendente)</option>
                        <option value="PRESO">PRESO (No sistema penitenciário)</option>
                        <option value="MORTO">MORTO / FALECIDO</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateOrcrimModal(false)}
                  disabled={isSavingOrcrim}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingOrcrim}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingOrcrim ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                  <span>{isSavingOrcrim ? 'Cadastrando...' : 'Cadastrar ORCRIM'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AI ORGANOGRAM GENERATOR */}
      {/* ========================================================================= */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Classificador de ORCRIM via IA (Gemini)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gera ou reorganiza a estrutura piramidal de acordo com a inteligência do 35º BPM
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-5">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Nome da Organização / Facção / Gangue *
                </label>
                <input
                  type="text"
                  placeholder="Ex: PCC - Regional 35º BPM, Comando Vermelho, Gangue do Palmital, Gangue do Muleta..."
                  value={aiFactionName}
                  onChange={(e) => setAiFactionName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 text-slate-900 font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white placeholder:text-slate-400 shadow-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Informações de Inteligência / Relatório Complementar (Opcional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Descreva particularidades da facção, território disputado, líderes conhecidos, modus operandi ou informações obtidas em interceptações/depoimentos..."
                  value={aiNarrative}
                  onChange={(e) => setAiNarrative(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 text-slate-900 font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white placeholder:text-slate-400 shadow-xs"
                ></textarea>
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  A IA utilizará os {registeredSuspects.length} infratores cadastrados no banco de dados para classificá-los na hierarquia.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={analyzingAi}
                onClick={handleGenerateAiOrganogram}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {analyzingAi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Processando Inteligência...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>Gerar Organograma Piramidal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL ADD MEMBER TO ORCRIM */}
      {/* ========================================================================= */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Cadastrar Integrante na ORCRIM
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Alocar infrator cadastrado na estrutura piramidal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-5">
              {/* Target Faction Name */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Facção / Organização Criminosa de Destino *
                </label>
                <input
                  type="text"
                  placeholder="Ex: GANGUE DO MULETA, PCC, CV, GANGUE DO PALMITAL..."
                  value={targetFactionName}
                  onChange={(e) => setTargetFactionName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-900 font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white placeholder:text-slate-400 shadow-xs"
                />
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                  Se a facção ainda não tiver organograma criado, este será gerado automaticamente.
                </span>
              </div>

              {/* Hierarchical Level Selection */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Nível Hierárquico *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetLevel(1)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      targetLevel === 1 
                        ? 'bg-red-600 text-white border-red-700 shadow-xs ring-2 ring-red-300' 
                        : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    👑 Nível 1 (Liderança)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetLevel(2)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      targetLevel === 2 
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-300' 
                        : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    ⚡ Nível 2 (Gerência)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetLevel(3)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      targetLevel === 3 
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-300' 
                        : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    🎯 Nível 3 (Operacional)
                  </button>
                </div>
              </div>

              {/* Suspect Selector */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Selecione o Infrator Cadastrado *
                </label>
                <select
                  value={selectedSuspectId}
                  onChange={(e) => {
                    const sId = e.target.value;
                    setSelectedSuspectId(sId);
                    const found = registeredSuspects.find(s => s.id === sId);
                    if (found) {
                      if (found.gangue_faccao && !targetFactionName) {
                        setTargetFactionName(found.gangue_faccao);
                      }
                      if (found.status_mandado_prisao) {
                        setMemberSituacao('FORAGIDO');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-bold shadow-xs"
                >
                  <option value="" className="text-slate-500 bg-white">-- Selecione um criminoso cadastrado --</option>
                  {registeredSuspects.map((s) => (
                    <option key={s.id} value={s.id} className="text-slate-900 bg-white font-semibold">
                      {s.nome_completo} ({s.vulgo}) • Facção: {s.gangue_faccao || 'Sem facção'} {s.status_mandado_prisao ? '⚠️ [MANDADO ATIVO]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Specific Role */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Função Específica na Organização *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Geral da Rua, Armeiro, Gerente de Biqueira, Piloto de Fuga, Executor, Cobrador..."
                  value={memberFuncao}
                  onChange={(e) => setMemberFuncao(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-900 font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white placeholder:text-slate-400 shadow-xs"
                />
              </div>

              {targetLevel === 2 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                      Área de Responsabilidade
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Eixo Rodoviário / Bairro Palmital"
                      value={memberArea}
                      onChange={(e) => setMemberArea(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-900 font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white placeholder:text-slate-400 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                      Subordinado ao Vulgo
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Careca / Chefe Morro"
                      value={memberSubordinado}
                      onChange={(e) => setMemberSubordinado(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-900 font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white placeholder:text-slate-400 shadow-xs"
                    />
                  </div>
                </div>
              )}

              {/* Prison status */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Situação Prisional Atual *
                </label>
                <select
                  value={memberSituacao}
                  onChange={(e) => setMemberSituacao(e.target.value as SituacaoPrisional)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-900 border border-slate-300 rounded-lg font-bold shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
                >
                  <option value="EM_LIBERDADE" className="text-slate-900 bg-white font-semibold">EM LIBERDADE (Atuante na rua)</option>
                  <option value="FORAGIDO" className="text-slate-900 bg-white font-semibold">FORAGIDO (Mandado de prisão pendente)</option>
                  <option value="PRESO" className="text-slate-900 bg-white font-semibold">PRESO (Custodiado no sistema penitenciário)</option>
                  <option value="MORTO" className="text-slate-900 bg-white font-semibold">MORTO / FALECIDO (Óbito confirmado)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingMember}
                onClick={handleAddMember}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingMember ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
                <span>{isSavingMember ? 'Salvando...' : 'Salvar Integrante'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Exclusão / Remoção de Infrator da ORCRIM */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-lg w-full border-2 border-red-500/80 shadow-2xl p-6 space-y-5 font-sans">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                  <UserX className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Excluir / Desvincular Infrator
                  </h3>
                  <p className="text-xs text-slate-500">
                    Estrutura da Organização: <strong className="text-slate-800">{currentOrcrim?.gangue_info.nome_gangue}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Member Profile Preview */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3.5">
              <img
                src={memberToDelete.membro.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'}
                alt={memberToDelete.membro.vulgo}
                className="w-13 h-13 rounded-lg object-cover border border-slate-300 shadow-xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop';
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-amber-800 truncate">
                    &quot;{memberToDelete.membro.vulgo}&quot;
                  </h4>
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-slate-200 text-slate-700 rounded">
                    NÍVEL {memberToDelete.level}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                  {memberToDelete.membro.nome_completo}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Função: {memberToDelete.membro.funcao_especifica}
                </p>
              </div>
            </div>

            {/* Action Option Selector */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                Selecione a Ação Desejada:
              </label>

              <div className="space-y-2.5">
                <label 
                  className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    deleteOption === 'remove_from_orcrim'
                      ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={deleteOption === 'remove_from_orcrim'}
                    onChange={() => setDeleteOption('remove_from_orcrim')}
                    className="mt-1 accent-amber-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <UserMinus className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-black text-slate-900">
                        Remover da Facção / Organograma (Recomendado)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Desvincula o infrator desta organização criminosa, preservando sua ficha cadastral no banco de dados geral do sistema policial.
                    </p>
                  </div>
                </label>

                <label 
                  className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    deleteOption === 'delete_entire_suspect'
                      ? 'border-red-500 bg-red-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={deleteOption === 'delete_entire_suspect'}
                    onChange={() => setDeleteOption('delete_entire_suspect')}
                    className="mt-1 accent-red-600 w-4 h-4 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-black text-red-900">
                        Excluir Cadastro Completo do Sistema
                      </span>
                    </div>
                    <p className="text-[11px] text-red-700/80 leading-relaxed">
                      Apaga definitivamente o cadastro do infrator, fotos, características físicas e vínculos de todo o sistema.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                disabled={isDeletingMember}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMember}
                disabled={isDeletingMember}
                className={`px-5 py-2.5 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                  deleteOption === 'delete_entire_suspect'
                    ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                    : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                }`}
              >
                {isDeletingMember ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Trash2 className="w-4 h-4 text-white" />
                )}
                <span>
                  {isDeletingMember 
                    ? 'Processando...' 
                    : deleteOption === 'delete_entire_suspect' 
                      ? 'Excluir Definitivamente' 
                      : 'Confirmar Remoção da ORCRIM'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Exclusão de Organograma Inteiro */}
      {orcrimToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full border-2 border-red-500/80 shadow-2xl p-6 space-y-4 font-sans">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Excluir Organograma de Facção
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Deseja realmente excluir o organograma da organização <strong className="text-red-700">{orcrimToDelete.gangue_info.nome_gangue}</strong>?
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> AVISO:
              </p>
              <p>Esta operação removerá toda a árvore tática mapeada desta facção.</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOrcrimToDelete(null)}
                disabled={isDeletingOrcrim}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrcrim}
                disabled={isDeletingOrcrim}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {isDeletingOrcrim ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeletingOrcrim ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Organização Criminosa */}
      {showEditOrcrimModal && currentOrcrim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Editar Organização Criminosa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atualize os dados estratégicos e território de domínio da facção
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditOrcrimModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditOrcrimDetails} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Nome da Organização Criminosa *
                </label>
                <input
                  type="text"
                  required
                  value={editOrcrimName}
                  onChange={(e) => setEditOrcrimName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:bg-white text-slate-900"
                  placeholder="Nome da facção ou gangue..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Território de Domínio Principal *
                </label>
                <input
                  type="text"
                  required
                  value={editOrcrimTerritory}
                  onChange={(e) => setEditOrcrimTerritory(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:bg-white text-slate-900"
                  placeholder="Ex: Palmital / 35º BPM, Santa Luzia"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Doutrina, Modus Operandi & Histórico
                </label>
                <textarea
                  rows={4}
                  value={editOrcrimResumo}
                  onChange={(e) => setEditOrcrimResumo(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:bg-white text-slate-900"
                  placeholder="Descrição da atuação delitiva da organização..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditOrcrimModal(false)}
                  disabled={isSavingEditOrcrim}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditOrcrim}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isSavingEditOrcrim ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{isSavingEditOrcrim ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Integrante da ORCRIM */}
      {memberToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src={memberToEdit.membro.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'}
                  alt={memberToEdit.membro.vulgo}
                  className="w-12 h-12 rounded-lg object-cover border border-slate-300 shadow-xs"
                />
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    <span>Editar Integrante: &quot;{memberToEdit.membro.vulgo}&quot;</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {memberToEdit.membro.nome_completo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMemberToEdit(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMember} className="space-y-3.5">
              {/* Nível Hierárquico */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Nível Hierárquico no Organograma *
                </label>
                <select
                  value={editMemberLevel}
                  onChange={(e) => setEditMemberLevel(Number(e.target.value) as 1 | 2 | 3)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:bg-white text-slate-900"
                >
                  <option value={1}>Nível 1 • Liderança Estratégica & Sintonia Geral</option>
                  <option value={2}>Nível 2 • Gerência Tática, Disciplinas & Logística</option>
                  <option value={3}>Nível 3 • Operacionais, Soldados de Pista & Linha de Frente</option>
                </select>
              </div>

              {/* Função Específica */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Função Específica no Organograma *
                </label>
                <input
                  type="text"
                  required
                  value={editMemberFuncao}
                  onChange={(e) => setEditMemberFuncao(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:bg-white text-slate-900"
                  placeholder="Ex: Sintonia de Rua, Gerente do Palmital, Fogueteiro, Executor..."
                />
              </div>

              {/* Situação Prisional & Mandado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Situação Prisional
                  </label>
                  <select
                    value={editMemberSituacao}
                    onChange={(e) => setEditMemberSituacao(e.target.value as SituacaoPrisional)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:bg-white text-slate-900"
                  >
                    <option value="EM_LIBERDADE">EM LIBERDADE</option>
                    <option value="PRESO">PRESO</option>
                    <option value="FORAGIDO">FORAGIDO</option>
                    <option value="MORTO">FALECIDO (MORTO)</option>
                  </select>
                </div>

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-red-800 bg-red-50 p-2 rounded-lg border border-red-200 w-full">
                    <input
                      type="checkbox"
                      checked={editMemberMandado}
                      onChange={(e) => setEditMemberMandado(e.target.checked)}
                      className="accent-red-600 w-4 h-4 rounded cursor-pointer"
                    />
                    <span>Mandado de Prisão Ativo</span>
                  </label>
                </div>
              </div>

              {/* Área / Ponto de Responsabilidade */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Área / Ponto de Responsabilidade (Opcional)
                </label>
                <input
                  type="text"
                  value={editMemberArea}
                  onChange={(e) => setEditMemberArea(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:bg-white text-slate-900"
                  placeholder="Ex: Biqueira da Caixa d'Água, Rua 15, Alto do Palmital..."
                />
              </div>

              {/* Subordinado a (Vulgo do Superior) */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Subordinado Diretamente a (Vulgo) (Opcional)
                </label>
                <input
                  type="text"
                  value={editMemberSubordinado}
                  onChange={(e) => setEditMemberSubordinado(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:bg-white text-slate-900"
                  placeholder="Ex: Vulgo do gerente ou líder superior imediato..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMemberToEdit(null)}
                  disabled={isSavingEditMember}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditMember}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isSavingEditMember ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{isSavingEditMember ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-amber-500/80 text-amber-300 px-4 py-3 rounded-lg shadow-2xl font-mono text-xs flex items-center gap-2.5 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENT: MEMBER CARD
// ============================================================================
interface MemberCardProps {
  membro: MembroEstruturaOrcrim;
  level: 1 | 2 | 3;
  onSelectSuspect?: (id: string) => void;
  onInitiateDelete: (membro: MembroEstruturaOrcrim, level: 1 | 2 | 3) => void;
  onInitiateEdit?: (membro: MembroEstruturaOrcrim, level: 1 | 2 | 3) => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ membro, level, onSelectSuspect, onInitiateDelete, onInitiateEdit }) => {
  const getStatusBadge = (status: SituacaoPrisional, mandado?: boolean) => {
    if (status === 'MORTO') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-slate-200 text-slate-800 border border-slate-300 rounded flex items-center gap-1">
          💀 FALECIDO
        </span>
      );
    }
    if (status === 'PRESO') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-red-100 text-red-800 border border-red-200 rounded">
          PRESO
        </span>
      );
    }
    if (status === 'FORAGIDO' || mandado) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300 rounded flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse" />
          FORAGIDO
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-200 rounded">
        EM LIBERDADE
      </span>
    );
  };

  const getBorderColor = () => {
    if (level === 1) return 'border-red-300 hover:border-red-500 shadow-red-500/5';
    if (level === 2) return 'border-amber-300 hover:border-amber-500 shadow-amber-500/5';
    return 'border-blue-300 hover:border-blue-500 shadow-blue-500/5';
  };

  return (
    <div className={`bg-white rounded-xl p-4 border-2 ${getBorderColor()} shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}>
      <div>
        {/* Top Header with Photo and Core ID */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <img
              src={membro.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'}
              alt={membro.vulgo}
              className="w-14 h-14 rounded-lg object-cover border-2 border-slate-300 shadow-xs"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop';
              }}
            />
            {membro.status_mandado && (
              <span 
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white" 
                title="Mandado de Prisão Ativo"
              >
                !
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h5 className="text-base font-black text-amber-700 truncate tracking-tight">
                &quot;{membro.vulgo}&quot;
              </h5>
              {getStatusBadge(membro.situacao_atual, membro.status_mandado)}
            </div>

            <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
              {membro.nome_completo}
            </p>

            <div className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded border border-slate-200 truncate max-w-full">
              {membro.funcao_especifica}
            </div>
          </div>
        </div>

        {/* Tactical Linkages for Level 2 or Specific details */}
        {(membro.subordinado_a_vulgo || membro.area_responsabilidade) && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] space-y-1 text-slate-600 bg-slate-50/80 p-2 rounded-lg">
            {membro.subordinado_a_vulgo && (
              <div className="flex items-center gap-1 truncate">
                <span className="font-bold text-slate-400 uppercase text-[9px]">Subordinado a:</span>
                <span className="font-bold text-slate-800">&quot;{membro.subordinado_a_vulgo}&quot;</span>
              </div>
            )}
            {membro.area_responsabilidade && (
              <div className="flex items-center gap-1 truncate">
                <span className="font-bold text-slate-400 uppercase text-[9px]">Área/Ponto:</span>
                <span className="font-bold text-slate-800">{membro.area_responsabilidade}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-slate-400 truncate">
          ID: {membro.infrator_id.substring(0, 8)}...
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {onInitiateEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInitiateEdit(membro, level);
              }}
              className="text-xs font-bold text-slate-700 hover:text-black bg-slate-100 hover:bg-slate-200 border border-slate-300/80 flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer shadow-2xs"
              title="Editar função, nível ou situação do integrante"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>Editar</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openSuspectDossier(membro.infrator_id);
            }}
            className="text-xs font-bold text-amber-900 hover:text-black bg-amber-400 hover:bg-amber-300 border border-amber-500/80 flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer shadow-2xs"
            title="Extrair Ficha do Infrator em PDF"
          >
            <FileDown className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInitiateDelete(membro, level);
            }}
            className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200/80 flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs"
            title="Excluir / Remover infrator"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Excluir</span>
          </button>

          {onSelectSuspect && (
            <button
              type="button"
              onClick={() => onSelectSuspect(membro.infrator_id)}
              className="text-xs font-bold text-[#1D356D] hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/60 flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs"
            >
              <span>Ver Ficha</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
