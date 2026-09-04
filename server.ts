import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from './src/backend/db.js';
import { analyzeCrimeIntelligenceLocally } from './src/utils/intelligenceEngine.js';
import { analyzeFacialRecognitionLocally } from './src/utils/facialForensicsEngine.js';
import {
  ensureServerDataLoaded,
  saveDatabaseToDiskCache,
  syncServerWithFirestore,
} from './src/backend/serverPersistence.js';
import {
  saveInfrator,
  removeInfrator,
  saveEndereco,
  removeEndereco,
  saveOcorrencia,
  removeOcorrencia,
  saveGangArea,
  saveGangAreasBatch,
  removeGangArea,
} from './src/services/firestoreService.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Helper to safely parse JSON from AI model output or strings
function safeJsonParse(raw: string | undefined): any {
  if (!raw) return null;
  let cleaned = raw.trim();
  // Strip markdown fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  // Find first { or [
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }
  if (startIdx !== -1) {
    cleaned = cleaned.slice(startIdx);
  }
  return JSON.parse(cleaned);
}

// Lazy-initialization utility for Gemini API client to prevent crashing on boot when key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please set it in your environment/Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// 1. Infratores (Suspects) CRUD
app.get('/api/infratores', async (req, res) => {
  try {
    await ensureServerDataLoaded();
    const list = db.infratores.map(i => {
      const fisicas = db.caracteristicas_fisicas.find(cf => cf.infrator_id === i.id);
      return { ...i, fisicas };
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/infratores/:id', async (req, res) => {
  try {
    await ensureServerDataLoaded();
    const infrator = db.getInfratorFull(req.params.id);
    if (!infrator) {
      res.status(404).json({ error: 'Infrator não encontrado.' });
      return;
    }
    res.json(infrator);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/infratores', (req, res) => {
  try {
    const {
      nome_completo,
      vulgo,
      data_nascimento,
      cpf,
      foto_url,
      galeria_fotos,
      gangue_faccao,
      status_mandado_prisao,
      situacao_atual,
      situacao_prisional,
      periculosidade,
      // Physical characteristics
      altura_estimada,
      cor_pele,
      compleicao,
      tatuagens_detalhes,
      cicatrizes,
      sinais_particulares,
      enderecos, // Array of operational addresses
      ocorrencias // Array of occurrences to link (existing or new)
    } = req.body;

    if (!nome_completo) {
      res.status(400).json({ error: 'Nome completo é obrigatório.' });
      return;
    }

    const situacaoFinal = situacao_atual || situacao_prisional || (status_mandado_prisao ? 'FORAGIDO' : 'EM_LIBERDADE');
    const id = req.body.id || `inf-${Date.now()}`;

    let parsedGaleria: any[] = [];
    if (Array.isArray(galeria_fotos) && galeria_fotos.length > 0) {
      parsedGaleria = galeria_fotos.map((f: any, idx: number) => ({
        id: f.id || `foto-${Date.now()}-${idx}`,
        url: f.url || f,
        tipo: f.tipo || 'ROSTO',
        descricao: f.descricao || '',
        principal: !!f.principal,
        data_inclusao: f.data_inclusao || new Date().toISOString()
      }));
    } else if (foto_url) {
      parsedGaleria = [{
        id: `foto-${Date.now()}-main`,
        url: foto_url,
        tipo: 'ROSTO',
        descricao: 'Foto Principal',
        principal: true,
        data_inclusao: new Date().toISOString()
      }];
    }

    if (parsedGaleria.length > 0 && !parsedGaleria.some(f => f.principal)) {
      parsedGaleria[0].principal = true;
    }

    const mainPhoto = parsedGaleria.find(f => f.principal) || parsedGaleria[0];
    const finalPhotoUrl = foto_url || mainPhoto?.url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop';

    const newInfrator = {
      id,
      nome_completo,
      vulgo: vulgo || 'S/V',
      data_nascimento: data_nascimento || '1990-01-01',
      cpf: cpf || '000.000.000-00',
      foto_url: finalPhotoUrl,
      galeria_fotos: parsedGaleria,
      gangue_faccao: gangue_faccao || 'Nenhuma',
      status_mandado_prisao: !!status_mandado_prisao || situacaoFinal === 'FORAGIDO',
      situacao_atual: situacaoFinal,
      situacao_prisional: situacaoFinal,
      periculosidade: periculosidade || 'Média',
      created_at: new Date().toISOString()
    };

    const newFisicas = {
      infrator_id: id,
      altura_estimada: Number(altura_estimada) || 1.75,
      cor_pele: cor_pele || 'Parda',
      compleicao: compleicao || 'Média',
      tatuagens_detalhes: tatuagens_detalhes || 'Sem tatuagens cadastradas',
      cicatrizes: cicatrizes || 'Sem cicatrizes cadastradas',
      sinais_particulares: sinais_particulares || 'Sem sinais particulares cadastrados'
    };

    db.infratores.push(newInfrator);
    db.caracteristicas_fisicas.push(newFisicas);

    // Process attached addresses during suspect registration
    if (Array.isArray(enderecos) && enderecos.length > 0) {
      const seenAddr = new Set<string>();
      for (const end of enderecos) {
        if (end.logradouro && end.logradouro.trim()) {
          const logrTrim = end.logradouro.trim();
          const tipoTrim = end.tipo_endereco || 'Residência';
          const key = `${tipoTrim.toLowerCase()}|${logrTrim.toLowerCase()}`;
          if (seenAddr.has(key)) continue;
          seenAddr.add(key);

          const endId = `end-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          db.enderecos_atuacao.push({
            id: endId,
            infrator_id: id,
            tipo_endereco: tipoTrim,
            logradouro: logrTrim,
            bairro: end.bairro || 'Centro',
            cidade: end.cidade || 'Santa Luzia',
            raio_influencia_km: Number(end.raio_influencia_km) || 2.5,
            geom_ponto: {
              lat: end.lat !== undefined && !isNaN(Number(end.lat)) ? Number(end.lat) : -19.7712,
              lng: end.lng !== undefined && !isNaN(Number(end.lng)) ? Number(end.lng) : -43.8564
            }
          });
        }
      }
    }

    // Process attached occurrences during suspect registration
    if (Array.isArray(ocorrencias) && ocorrencias.length > 0) {
      for (const item of ocorrencias) {
        const papel = item.papel_no_crime || item.papel || 'Autor';
        
        if (item.ocorrencia_id) {
          // Link to existing occurrence
          db.infrator_ocorrencia.push({
            infrator_id: id,
            ocorrencia_id: item.ocorrencia_id,
            papel_no_crime: papel
          });
        } else if (item.numero_bo && item.tipificacao_penal) {
          // Create new occurrence on the fly and link
          const ocId = `oc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const createdOc = {
            id: ocId,
            numero_bo: item.numero_bo,
            data_hora: item.data_hora || new Date().toISOString(),
            tipificacao_penal: item.tipificacao_penal,
            descricao_fato: item.descricao_fato || `Ocorrência registrada referente a ${item.tipificacao_penal} com participação de ${newInfrator.nome_completo} como ${papel}.`,
            modus_operandi: item.modus_operandi || 'Padrão em apuração',
            armas_utilizadas: item.armas_utilizadas || 'Não informada',
            veiculo_utilizado: item.veiculo_utilizado || 'Não informado',
            geom_crime: {
              lat: item.lat !== undefined ? Number(item.lat) : -19.7712,
              lng: item.lng !== undefined ? Number(item.lng) : -43.8564
            }
          };
          db.ocorrencias_criminais.push(createdOc);
          db.infrator_ocorrencia.push({
            infrator_id: id,
            ocorrencia_id: ocId,
            papel_no_crime: papel
          });
        }
      }
    }

    const created = db.getInfratorFull(id);
    saveDatabaseToDiskCache();
    if (created) {
      saveInfrator(created).catch(() => null);
    }
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Link / Add an occurrence directly to an existing suspect with role
app.post('/api/infratores/:id/ocorrencias', (req, res) => {
  try {
    const { id } = req.params;
    const infrator = db.infratores.find(i => i.id === id);
    if (!infrator) {
      res.status(404).json({ error: 'Infrator não encontrado.' });
      return;
    }

    const {
      ocorrencia_id,
      papel_no_crime,
      numero_bo,
      data_hora,
      tipificacao_penal,
      descricao_fato,
      modus_operandi,
      armas_utilizadas,
      veiculo_utilizado,
      lat,
      lng
    } = req.body;

    const papel = papel_no_crime || 'Autor';

    if (ocorrencia_id) {
      // Check if already linked
      const existing = db.infrator_ocorrencia.find(
        io => io.infrator_id === id && io.ocorrencia_id === ocorrencia_id
      );
      if (existing) {
        existing.papel_no_crime = papel;
      } else {
        db.infrator_ocorrencia.push({
          infrator_id: id,
          ocorrencia_id,
          papel_no_crime: papel
        });
      }
    } else if (numero_bo && tipificacao_penal) {
      // Create new incident
      const ocId = `oc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const createdOc = {
        id: ocId,
        numero_bo,
        data_hora: data_hora || new Date().toISOString(),
        tipificacao_penal,
        descricao_fato: descricao_fato || `Ocorrência vinculada ao infrator ${infrator.nome_completo} (${infrator.vulgo}) como ${papel}.`,
        modus_operandi: modus_operandi || 'Padrão em apuração',
        armas_utilizadas: armas_utilizadas || 'Não informada',
        veiculo_utilizado: veiculo_utilizado || 'Não informado',
        geom_crime: {
          lat: lat !== undefined ? Number(lat) : -19.7712,
          lng: lng !== undefined ? Number(lng) : -43.8564
        }
      };
      db.ocorrencias_criminais.push(createdOc);
      db.infrator_ocorrencia.push({
        infrator_id: id,
        ocorrencia_id: ocId,
        papel_no_crime: papel
      });
    } else {
      res.status(400).json({ error: 'Informe um B.O. existente (ocorrencia_id) ou os dados de um novo B.O. (numero_bo, tipificacao_penal).' });
      return;
    }

    res.status(201).json(db.getInfratorFull(id));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Unlink an occurrence from a suspect
app.delete('/api/infratores/:id/ocorrencias/:ocorrencia_id', (req, res) => {
  try {
    const { id, ocorrencia_id } = req.params;
    db.unlinkInfratorOcorrencia(id, ocorrencia_id);
    res.json({ success: true, updated: db.getInfratorFull(id) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update an existing suspect
app.put('/api/infratores/:id', (req, res) => {
  try {
    const { id } = req.params;
    const infratorIndex = db.infratores.findIndex(i => i.id === id);
    if (infratorIndex === -1) {
      res.status(404).json({ error: 'Suspeito não encontrado' });
      return;
    }

    const {
      nome_completo, vulgo, data_nascimento, cpf, foto_url, galeria_fotos, gangue_faccao,
      status_mandado_prisao, situacao_atual, situacao_prisional, periculosidade,
      altura_estimada, cor_pele, compleicao, tatuagens_detalhes, cicatrizes, sinais_particulares
    } = req.body;

    const situacaoFinal = situacao_atual || situacao_prisional;

    let updatedGaleria = galeria_fotos !== undefined ? galeria_fotos : db.infratores[infratorIndex].galeria_fotos;
    let mainPhotoUrl = foto_url || db.infratores[infratorIndex].foto_url;

    if (Array.isArray(updatedGaleria) && updatedGaleria.length > 0) {
      const principal = updatedGaleria.find((f: any) => f.principal);
      if (principal && principal.url) {
        mainPhotoUrl = principal.url;
      } else if (!mainPhotoUrl && updatedGaleria[0]?.url) {
        mainPhotoUrl = updatedGaleria[0].url;
      }
    }

    db.infratores[infratorIndex] = {
      ...db.infratores[infratorIndex],
      nome_completo: nome_completo || db.infratores[infratorIndex].nome_completo,
      vulgo: vulgo !== undefined ? vulgo : db.infratores[infratorIndex].vulgo,
      data_nascimento: data_nascimento || db.infratores[infratorIndex].data_nascimento,
      cpf: cpf || db.infratores[infratorIndex].cpf,
      foto_url: mainPhotoUrl,
      galeria_fotos: updatedGaleria,
      gangue_faccao: gangue_faccao !== undefined ? gangue_faccao : db.infratores[infratorIndex].gangue_faccao,
      status_mandado_prisao: status_mandado_prisao !== undefined ? !!status_mandado_prisao : (situacaoFinal === 'FORAGIDO' ? true : db.infratores[infratorIndex].status_mandado_prisao),
      situacao_atual: situacaoFinal || db.infratores[infratorIndex].situacao_atual,
      situacao_prisional: situacaoFinal || db.infratores[infratorIndex].situacao_prisional,
      periculosidade: periculosidade || db.infratores[infratorIndex].periculosidade,
    };

    const fisIndex = db.caracteristicas_fisicas.findIndex(cf => cf.infrator_id === id);
    const fisData = req.body.fisicas || req.body;
    if (fisIndex !== -1) {
      db.caracteristicas_fisicas[fisIndex] = {
        infrator_id: id,
        altura_estimada: fisData.altura_estimada !== undefined ? Number(fisData.altura_estimada) : db.caracteristicas_fisicas[fisIndex].altura_estimada,
        cor_pele: fisData.cor_pele || db.caracteristicas_fisicas[fisIndex].cor_pele,
        compleicao: fisData.compleicao || db.caracteristicas_fisicas[fisIndex].compleicao,
        tatuagens_detalhes: fisData.tatuagens_detalhes !== undefined ? fisData.tatuagens_detalhes : db.caracteristicas_fisicas[fisIndex].tatuagens_detalhes,
        cicatrizes: fisData.cicatrizes !== undefined ? fisData.cicatrizes : db.caracteristicas_fisicas[fisIndex].cicatrizes,
        sinais_particulares: fisData.sinais_particulares !== undefined ? fisData.sinais_particulares : db.caracteristicas_fisicas[fisIndex].sinais_particulares,
      };
    } else {
      db.caracteristicas_fisicas.push({
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
    if (Array.isArray(req.body.enderecos)) {
      db.enderecos_atuacao = db.enderecos_atuacao.filter(ea => ea.infrator_id !== id);
      for (const end of req.body.enderecos) {
        if (end.logradouro && end.logradouro.trim()) {
          db.addEndereco({
            ...end,
            infrator_id: id
          });
        }
      }
    }

    // Process updated occurrences if provided
    if (Array.isArray(req.body.ocorrencias)) {
      db.infrator_ocorrencia = db.infrator_ocorrencia.filter(io => io.infrator_id !== id);
      for (const item of req.body.ocorrencias) {
        const papel = item.papel_no_crime || item.papel || 'Autor';
        if (item.ocorrencia_id) {
          db.linkInfratorOcorrencia(id, item.ocorrencia_id, papel);
        } else if (item.numero_bo && item.tipificacao_penal) {
          const newOc = db.addOcorrencia(item);
          db.linkInfratorOcorrencia(id, newOc.id, papel);
        }
      }
    }

    const updatedFull = db.getInfratorFull(id);
    saveDatabaseToDiskCache();
    if (updatedFull) {
      saveInfrator(updatedFull).catch(() => null);
    }
    res.json(updatedFull);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Photo Management Endpoints
app.post('/api/infratores/:id/fotos', (req, res) => {
  try {
    const { id } = req.params;
    const { url, tipo, descricao, principal } = req.body;
    if (!url) {
      res.status(400).json({ error: 'URL/Imagem da foto é obrigatória.' });
      return;
    }
    const updated = db.addPhotoToInfrator(id, { url, tipo, descricao, principal });
    if (!updated) {
      res.status(404).json({ error: 'Infrator não encontrado.' });
      return;
    }
    saveDatabaseToDiskCache();
    saveInfrator(updated).catch(() => null);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/infratores/:id/fotos/:foto_id/principal', (req, res) => {
  try {
    const { id, foto_id } = req.params;
    const updated = db.setPrimaryPhotoInfrator(id, foto_id);
    if (!updated) {
      res.status(404).json({ error: 'Infrator ou foto não encontrada.' });
      return;
    }
    saveDatabaseToDiskCache();
    saveInfrator(updated).catch(() => null);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/infratores/:id/fotos/:foto_id', (req, res) => {
  try {
    const { id, foto_id } = req.params;
    const updated = db.removePhotoFromInfrator(id, foto_id);
    if (!updated) {
      res.status(404).json({ error: 'Infrator não encontrado.' });
      return;
    }
    saveDatabaseToDiskCache();
    saveInfrator(updated).catch(() => null);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an existing suspect
app.delete('/api/infratores/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteInfrator(id);
    if (!deleted) {
      res.status(404).json({ error: 'Infrator não encontrado.' });
      return;
    }
    // Explicitly guarantee all addresses and links for this suspect are removed from memory
    db.enderecos_atuacao = db.enderecos_atuacao.filter(ea => ea.infrator_id !== id);
    db.infrator_ocorrencia = db.infrator_ocorrencia.filter(io => io.infrator_id !== id);
    saveDatabaseToDiskCache();
    removeInfrator(id).catch(() => null);
    res.json({ success: true, message: 'Infrator, ocorrências vinculadas e endereços excluídos com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Ocorrências (Criminal Incidents) CRUD
app.get('/api/ocorrencias', async (req, res) => {
  try {
    await ensureServerDataLoaded();
    const list = db.ocorrencias_criminais.map(o => {
      const envolvidos = db.infrator_ocorrencia
        .filter(io => io.ocorrencia_id === o.id)
        .map(rel => {
          const inf = db.infratores.find(i => i.id === rel.infrator_id);
          return { id: rel.infrator_id, nome: inf?.nome_completo, vulgo: inf?.vulgo, papel: rel.papel_no_crime };
        });
      return { ...o, envolvidos };
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ocorrencias', (req, res) => {
  try {
    const {
      numero_bo,
      data_hora,
      tipificacao_penal,
      descricao_fato,
      modus_operandi,
      armas_utilizadas,
      veiculo_utilizado,
      lat,
      lng,
      envolvidos_ids // Optional list of suspect IDs and roles: Array<{ infrator_id: string, papel: string }>
    } = req.body;

    if (!numero_bo || !tipificacao_penal || !descricao_fato || lat === undefined || lng === undefined) {
      res.status(400).json({ error: 'Campos obrigatórios ausentes (Número BO, Tipificação, Descrição, Coordenadas).' });
      return;
    }

    const id = `oc-${Date.now()}`;
    const newOcorrencia = {
      id,
      numero_bo,
      data_hora: data_hora || new Date().toISOString(),
      tipificacao_penal,
      descricao_fato,
      modus_operandi: modus_operandi || 'Não especificado',
      armas_utilizadas: armas_utilizadas || 'Nenhuma',
      veiculo_utilizado: veiculo_utilizado || 'Nenhum',
      geom_crime: { lat: Number(lat), lng: Number(lng) }
    };

    db.ocorrencias_criminais.push(newOcorrencia);

    if (Array.isArray(envolvidos_ids)) {
      for (const env of envolvidos_ids) {
        db.infrator_ocorrencia.push({
          infrator_id: env.infrator_id,
          ocorrencia_id: id,
          papel_no_crime: env.papel || 'Suspeito'
        });
      }
    }

    saveDatabaseToDiskCache();
    saveOcorrencia(newOcorrencia).catch(() => null);
    res.status(201).json(newOcorrencia);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/ocorrencias/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteOcorrencia(id);
    if (!deleted) {
      res.status(404).json({ error: 'Ocorrência (B.O.) não encontrada.' });
      return;
    }
    saveDatabaseToDiskCache();
    removeOcorrencia(id).catch(() => null);
    res.json({ success: true, message: 'Ocorrência (B.O.) excluída com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Endereços de Atuação (Operational Addresses) CRUD
app.get('/api/enderecos', async (req, res) => {
  try {
    await ensureServerDataLoaded();
    const validSuspectIds = new Set(db.infratores.map(i => i.id));
    // Filter and prune orphaned addresses of deleted suspects
    db.enderecos_atuacao = db.enderecos_atuacao.filter(
      ea => !ea.infrator_id || validSuspectIds.has(ea.infrator_id)
    );

    const list = db.enderecos_atuacao.map(ea => {
      const inf = db.infratores.find(i => i.id === ea.infrator_id);
      return {
        ...ea,
        infrator_nome: inf?.nome_completo,
        infrator_vulgo: inf?.vulgo
      };
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/enderecos', (req, res) => {
  try {
    const { infrator_id, tipo_endereco, logradouro, bairro, cidade, lat, lng, raio_influencia_km } = req.body;

    if (!infrator_id || !logradouro || lat === undefined || lng === undefined) {
      res.status(400).json({ error: 'Identificação de infrator, logradouro e coordenadas são obrigatórios.' });
      return;
    }

    const tipo = tipo_endereco || 'Área de Atuação';
    const logr = logradouro.trim();

    // Prevent duplicate insertion
    const existing = db.enderecos_atuacao.find(
      ea => ea.infrator_id === infrator_id &&
            ea.tipo_endereco?.toLowerCase() === tipo.toLowerCase() &&
            ea.logradouro?.toLowerCase() === logr.toLowerCase()
    );
    if (existing) {
      res.status(200).json(existing);
      return;
    }

    const id = `ea-${Date.now()}`;
    const newEndereco = {
      id,
      infrator_id,
      tipo_endereco: tipo,
      logradouro: logr,
      bairro: bairro || '',
      cidade: cidade || 'São Paulo',
      geom_ponto: { lat: Number(lat), lng: Number(lng) },
      raio_influencia_km: Number(raio_influencia_km) || 2.0
    };

    db.enderecos_atuacao.push(newEndereco);
    saveDatabaseToDiskCache();
    saveEndereco(newEndereco).catch(() => null);
    res.status(201).json(newEndereco);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/enderecos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const initialLen = db.enderecos_atuacao.length;
    db.enderecos_atuacao = db.enderecos_atuacao.filter(ea => ea.id !== id);
    if (db.enderecos_atuacao.length === initialLen) {
      res.status(404).json({ error: 'Endereço não encontrado.' });
      return;
    }
    saveDatabaseToDiskCache();
    removeEndereco(id).catch(() => null);
    res.json({ success: true, message: 'Endereço excluído com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// GANG AREAS / TERRITORIAL MAPS (KML, KMZ, GEOJSON)
// ==========================================

app.get('/api/gang-areas', async (req, res) => {
  try {
    await ensureServerDataLoaded();
    res.json(db.getGangAreas());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/gang-areas', (req, res) => {
  try {
    const zone = req.body;
    if (!zone.name || !zone.coordinates || !Array.isArray(zone.coordinates)) {
      res.status(400).json({ error: 'Dados da área de gangue inválidos. Coordenadas obrigatórias.' });
      return;
    }
    const newZone = {
      ...zone,
      id: zone.id || `gang-zone-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      visible: zone.visible !== undefined ? zone.visible : true,
    };
    db.addGangArea(newZone);
    saveDatabaseToDiskCache();
    saveGangArea(newZone).catch(() => null);
    res.status(201).json(newZone);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/gang-areas/import', (req, res) => {
  try {
    const { zones, replaceAll } = req.body;
    if (!Array.isArray(zones)) {
      res.status(400).json({ error: 'Array de zonas (zones) é obrigatório.' });
      return;
    }

    if (replaceAll) {
      db.setGangAreas(zones);
    } else {
      // Append only unique / new zones
      for (const z of zones) {
        if (!db.gang_areas.some(existing => existing.id === z.id)) {
          db.gang_areas.push(z);
        }
      }
    }

    saveDatabaseToDiskCache();
    saveGangAreasBatch(zones, replaceAll).catch(() => null);

    res.json({
      success: true,
      message: `${zones.length} área(s) de gangues importadas com sucesso.`,
      total: db.gang_areas.length,
      data: db.gang_areas,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/gang-areas/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const idx = db.gang_areas.findIndex(g => g.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Área de gangue não encontrada.' });
      return;
    }
    db.gang_areas[idx] = { ...db.gang_areas[idx], ...updates };
    saveDatabaseToDiskCache();
    saveGangArea(db.gang_areas[idx]).catch(() => null);
    res.json(db.gang_areas[idx]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/gang-areas/:id', (req, res) => {
  try {
    const { id } = req.params;
    const removed = db.removeGangArea(id);
    if (!removed) {
      res.status(404).json({ error: 'Área de gangue não encontrada.' });
      return;
    }
    saveDatabaseToDiskCache();
    removeGangArea(id).catch(() => null);
    res.json({ success: true, message: 'Área de gangue excluída com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/gang-areas/reset', (req, res) => {
  try {
    const defaultAreas = db.resetGangAreas();
    res.json({ success: true, message: 'Áreas redefinidas para o padrão do 35º BPM.', data: defaultAreas });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// 4. Cúmplices / Vínculos CRUD
app.post('/api/links', (req, res) => {
  try {
    const { infrator_origem_id, infrator_destino_id, grau_relacao, historico_conjunto } = req.body;
    if (!infrator_origem_id || !infrator_destino_id) {
      res.status(400).json({ error: 'Ambos os IDs de suspeitos são necessários.' });
      return;
    }

    const exists = db.vinculos_comparsas.some(v => 
      (v.infrator_origem_id === infrator_origem_id && v.infrator_destino_id === infrator_destino_id) ||
      (v.infrator_origem_id === infrator_destino_id && v.infrator_destino_id === infrator_origem_id)
    );

    if (exists) {
      res.status(400).json({ error: 'Já existe um vínculo registrado entre esses suspeitos.' });
      return;
    }

    const newLink = {
      infrator_origem_id,
      infrator_destino_id,
      grau_relacao: grau_relacao || 'Média',
      historico_conjunto: historico_conjunto || 'Vínculo identificado por inteligência tática.'
    };

    db.vinculos_comparsas.push(newLink);
    res.status(201).json(newLink);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// MODULE A: AI POLICE REPORT PARSER
// ==========================================
app.post('/api/ai/parse-report', async (req, res) => {
  try {
    const { narrative } = req.body;
    if (!narrative || narrative.trim() === '') {
      res.status(400).json({ error: 'A narrativa policial é obrigatória.' });
      return;
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (e: any) {
      res.status(400).json({ error: e.message });
      return;
    }

    const systemPrompt = `Você é um analista de inteligência criminal especializado no processamento e estruturação de ocorrências e relatórios policiais (Boletim de Ocorrência). 
Sua tarefa é analisar a narrativa policial fornecida e extrair os dados em formato JSON estrito correspondente ao esquema de resposta.

Tente geolocalizar o endereço aproximado mencionado na narrativa com coordenadas de São Paulo:
- Heliópolis está tipicamente em torno de lat: -23.615, lng: -46.590
- Paraisópolis está em torno de lat: -23.612, lng: -46.725
- Brás está em torno de lat: -23.538, lng: -46.620
- Pinheiros está em torno de lat: -23.562, lng: -46.702
- Se nenhum local conhecido for listado, estime próximo ao centro de São Paulo (lat: -23.5505, lng: -46.6333) ou use pistas da narrativa.`;

    const userPrompt = `Analise a seguinte narrativa de Boletim de Ocorrência policial e preencha as informações extraídas:
Narrativa: "${narrative}"`;

    let parsedData = null;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nome_envolvidos: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Lista de nomes completos de infratores ou suspeitos identificados na narrativa."
              },
              vulgos: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Apelidos, alcunhas ou vulgos dos infratores citados (ex: 'Careca', 'Neguinho')."
              },
              modus_operandi: {
                type: Type.STRING,
                description: "Resumo do método utilizado para cometer o crime, táticas, ameaças, ferramentas ou técnicas."
              },
              veiculos: {
                type: Type.STRING,
                description: "Veículos utilizados na ação (ex: 'Moto Titan preta', 'Sprinter branca'). Caso contrário, 'Nenhum'."
              },
              armas: {
                type: Type.STRING,
                description: "Armas empregadas (ex: 'Pistola semi-automática 9mm', 'Faca'). Caso contrário, 'Nenhuma'."
              },
              endereco: {
                type: Type.STRING,
                description: "Logradouro ou ponto de referência estimado onde ocorreu o crime."
              },
              lat: {
                type: Type.NUMBER,
                description: "Latitude geográfica estimada em São Paulo."
              },
              lng: {
                type: Type.NUMBER,
                description: "Longitude geográfica estimada em São Paulo."
              },
              tipificacao: {
                type: Type.STRING,
                description: "Tipificação penal sugerida (ex: 'Roubo de Carga', 'Roubo a Transeunte', 'Tráfico de Entorpecentes', 'Roubo de Veículo')."
              }
            },
            required: ["nome_envolvidos", "vulgos", "modus_operandi", "veiculos", "armas", "endereco", "lat", "lng", "tipificacao"]
          }
        }
      });
      parsedData = safeJsonParse(response.text);
    } catch (aiErr) {
      console.warn('Gemini generateContent in parse-report failed, generating heuristic response:', aiErr);
    }

    if (!parsedData) {
      const localResult = analyzeCrimeIntelligenceLocally(narrative);
      parsedData = {
        nome_envolvidos: [],
        vulgos: [],
        modus_operandi: localResult.ocorrencia_processada.modus_operandi_resumo,
        veiculos: localResult.ocorrencia_processada.caracteristicas_declaradas.armas_veiculos || 'Nenhum',
        armas: localResult.ocorrencia_processada.caracteristicas_declaradas.armas_veiculos || 'Nenhuma',
        endereco: `${localResult.ocorrencia_processada.logradouro || ''}, ${localResult.ocorrencia_processada.bairro} - ${localResult.ocorrencia_processada.municipio}`,
        lat: -19.7694,
        lng: -43.8564,
        tipificacao: localResult.ocorrencia_processada.tipificacao
      };
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error('Error in parse-report:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// MODULE A2: ADVANCED CRIMINAL INTELLIGENCE ANALYSIS & TRIAGE (STRICT USER SCHEMA)
// ==========================================
app.post('/api/ai/intelligence-analysis', async (req, res) => {
  try {
    const { narrative, lat, lng, radius_km, filters } = req.body;
    if ((!narrative || narrative.trim() === '') && (!filters || Object.values(filters).every(v => !v))) {
      res.status(400).json({ error: 'Insira a narrativa do fato ou pelo menos um filtro de características físicas/veículo.' });
      return;
    }

    const narrativeText = narrative || 'Triagem criminal orientada por filtros de características físicas, tatuagens, cicatrizes e veículos informados.';

    // 1. Gather all candidates in the system (or filtered by proximity if coordinates provided)
    let candidates = db.infratores.map(i => db.getInfratorFull(i.id)).filter(Boolean);
    if (lat !== undefined && lng !== undefined) {
      const radius = Number(radius_km) || 10.0;
      const inRadius = db.matchSuspectsInRadius(Number(lat), Number(lng), radius);
      if (inRadius && inRadius.length > 0) {
        const inRadiusIds = new Set(inRadius.map(c => c.id));
        candidates = [
          ...inRadius,
          ...candidates.filter(c => !inRadiusIds.has(c.id))
        ];
      }
    }

    let parsedResult: any = null;

    // Try executing with Gemini AI if client key is configured
    try {
      const ai = getGeminiClient();

      const formattedCandidates = candidates.map(c => ({
        infrator_id: c.id,
        nome_completo: c.nome_completo,
        vulgo: c.vulgo,
        gangue_faccao: c.gangue_faccao,
        periculosidade: c.periculosidade,
        mandado_ativo: c.status_mandado_prisao,
        caracteristicas_fisicas: c.fisicas,
        enderecos: c.enderecos.map((e: any) => `${e.tipo_endereco}: ${e.logradouro}, ${e.bairro} (${e.cidade})`),
        historico_crimes: c.ocorrencias.map((o: any) => `[${o.numero_bo}] ${o.tipificacao_penal} (Papel: ${o.papel}) - MO: ${o.modus_operandi} - Armas: ${o.armas_utilizadas} - Veículo: ${o.veiculo_utilizado}`)
      }));

      const systemPrompt = `Você é um Analista de Inteligência Policial da Seção de Inteligência do 35º BPM (PMMG - Guardião do Alto Rio das Velhas).
Sua missão é realizar uma análise rigorosa e estruturada de ocorrências policiais, executando três tarefas integradas:
1. Extração e processamento da ocorrência (município, bairro, logradouro, tipificação, resumo do modus operandi e características declaradas como pele, vestimentas, sinais particulares/tatuagens/cicatrizes e armas/veículos).
2. Cruzamento analítico minucioso com a base de dados de infratores cadastrados, avaliando o score_compatibilidade (0 a 100%) baseado em convergência de tatuagens, cicatrizes, cor de pele, compleição, bairro de atuação, facção criminosa, armas e veículos utilizados, justificativa analítica técnica e recomendação operacional de campo.
3. Avaliação do perímetro e alerta de reincidência operacional (nível de alerta: ALTO, MEDIO ou BAIXO e observação circunstanciada).

Você DEVE responder estritamente de acordo com o esquema JSON solicitado.`;

      const userPrompt = `NARRATIVA POLICIAL REGISTRADA:
"${narrativeText}"

FILTROS ESPECÍFICOS DE CARACTERÍSTICAS DECLARADAS (SE HOUVER):
${JSON.stringify(filters || {}, null, 2)}

BASE DE INFRATORES E SUSPEITOS CADASTRADOS NO SISTEMA:
${JSON.stringify(formattedCandidates, null, 2)}

Por favor, processe a ocorrência, execute o cruzamento minucioso de compatibilidade com os infratores cadastrados (valorizando correspondência de tatuagens, cicatrizes, sinais físicos, bairros e veículos) e gere o alerta de reincidência no perímetro.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ocorrencia_processada: {
                type: Type.OBJECT,
                properties: {
                  municipio: { type: Type.STRING },
                  bairro: { type: Type.STRING },
                  logradouro: { type: Type.STRING },
                  tipificacao: { type: Type.STRING },
                  modus_operandi_resumo: { type: Type.STRING },
                  caracteristicas_declaradas: {
                    type: Type.OBJECT,
                    properties: {
                      pele: { type: Type.STRING },
                      vestimentas: { type: Type.STRING },
                      sinais_particulares: { type: Type.STRING },
                      tatuagens: { type: Type.STRING },
                      cicatrizes: { type: Type.STRING },
                      armas_veiculos: { type: Type.STRING }
                    },
                    required: ["pele", "sinais_particulares", "armas_veiculos"]
                  }
                },
                required: ["municipio", "bairro", "tipificacao", "modus_operandi_resumo", "caracteristicas_declaradas"]
              },
              cruzamento_suspeitos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    infrator_id: { type: Type.STRING },
                    nome_completo: { type: Type.STRING },
                    vulgo: { type: Type.STRING },
                    score_compatibilidade: { type: Type.NUMBER },
                    fatores_convergentes: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    fatores_divergentes: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    justificativa_analitica: { type: Type.STRING },
                    recomendacao_operacional: { type: Type.STRING }
                  },
                  required: [
                    "infrator_id",
                    "nome_completo",
                    "vulgo",
                    "score_compatibilidade",
                    "fatores_convergentes",
                    "justificativa_analitica",
                    "recomendacao_operacional"
                  ]
                }
              },
              alerta_reincidencia_perimetro: {
                type: Type.OBJECT,
                properties: {
                  nivel_alerta: { type: Type.STRING, enum: ["ALTO", "MEDIO", "BAIXO"] },
                  observacao: { type: Type.STRING }
                },
                required: ["nivel_alerta", "observacao"]
              }
            },
            required: ["ocorrencia_processada", "cruzamento_suspeitos", "alerta_reincidencia_perimetro"]
          }
        }
      });

      parsedResult = safeJsonParse(response.text);
    } catch (aiError: any) {
      console.warn('Gemini Intelligence Analysis call failed, falling back to built-in Intelligence Engine:', aiError?.message || aiError);
    }

    // Fallback: If AI is unavailable or output couldn't be parsed, run deterministic intelligence engine
    if (!parsedResult || !parsedResult.ocorrencia_processada) {
      parsedResult = analyzeCrimeIntelligenceLocally(
        narrativeText,
        candidates,
        lat !== undefined && lng !== undefined ? { lat: Number(lat), lng: Number(lng) } : undefined,
        filters
      );
    }

    // Enrich cruzamento_suspeitos with full suspect profiles for frontend rendering
    if (Array.isArray(parsedResult.cruzamento_suspeitos)) {
      parsedResult.cruzamento_suspeitos = parsedResult.cruzamento_suspeitos.map((item: any) => {
        const fullProfile = db.getInfratorFull(item.infrator_id);
        return {
          ...item,
          suspect_details: fullProfile
        };
      }).sort((a: any, b: any) => (b.score_compatibilidade || 0) - (a.score_compatibilidade || 0));
    }

    res.json(parsedResult);
  } catch (error: any) {
    console.error('Error in intelligence-analysis:', error);
    try {
      const fallback = analyzeCrimeIntelligenceLocally(
        req.body?.narrative || '',
        undefined,
        req.body?.lat !== undefined && req.body?.lng !== undefined ? { lat: Number(req.body.lat), lng: Number(req.body.lng) } : undefined,
        req.body?.filters
      );
      res.json(fallback);
    } catch (fbErr) {
      res.status(500).json({ error: error.message });
    }
  }
});

// ==========================================
// MODULE A3: AI FACIAL RECOGNITION & BIOMETRIC MATCHING
// ==========================================
app.post(['/api/ai/facial-recognition-match', '/api/ai/facial-recognition-match/'], async (req, res) => {
  const { image, additional_context } = req.body || {};

  if (!image) {
    res.status(400).json({ error: 'A imagem para reconhecimento facial é obrigatória.' });
    return;
  }

  try {
    let ai;
    try {
      ai = getGeminiClient();
    } catch (e: any) {
      console.warn('Gemini client not initialized, using local forensic facial engine:', e.message);
      const fallbackResult = analyzeFacialRecognitionLocally(image, additional_context || '');
      res.json(fallbackResult);
      return;
    }

    // Extract mime type and clean base64 data
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    // Gather all registered suspects with their physical characteristics and full photo gallery
    const candidates = db.infratores.map(i => {
      const full = db.getInfratorFull(i.id);
      return {
        infrator_id: i.id,
        nome_completo: i.nome_completo,
        vulgo: i.vulgo,
        gangue_faccao: i.gangue_faccao,
        periculosidade: i.periculosidade,
        mandado_ativo: i.status_mandado_prisao,
        foto_url: i.foto_url,
        galeria_fotos: (i.galeria_fotos || []).map(f => ({
          tipo: f.tipo,
          descricao: f.descricao,
          principal: f.principal
        })),
        caracteristicas_fisicas: full?.fisicas || {
          pele: 'Parda',
          altura_estimada: '1.75m',
          compleicao: 'Média',
          cabelo: 'Curto escuro',
          olhos: 'Castanhos',
          tatuagens: 'Não informadas',
          cicatrizes: 'Não informadas',
          outros_sinais: 'Nenhum'
        }
      };
    });

    const systemPrompt = `Você é um Perito Papiloscopista e Analista Forense Sênior de Reconhecimento Facial e Biometria Humana da Seção de Inteligência do 35º BPM (PMMG - Guardião do Alto Rio das Velhas).
Sua missão é realizar uma perícia biométrica facial e morfológica comparativa entre a foto fornecida (vítima/câmera de monitoramento/abordagem policial) e o banco de dados oficial de alvos/infratores cadastrados.

Diretrizes da Análise Pericial:
1. Extraia com precisão os marcos biométricos da imagem de entrada: formato do crânio/rosto (oval, quadrado, triangular), distância interpupilar estimada, linhas da mandíbula e queixo, padrão nasal (largura da base, dorso), formato dos lábios, orelhas, padrão capilar/calvície, tom de pele e quaisquer sinais distintivos particulares (cicatrizes, tatuagens faciais/pescoço, piercings, marcas de nascença, barba/bigode).
2. Compare detalhadamente essa biometria com TODOS os perfis do banco de dados de infratores fornecido.
3. Atribua um score de similaridade facial de 0 a 100% para cada suspeito compatível, discriminando com clareza os pontos convergentes da morfologia facial e os pontos divergentes.
4. Defina o nível de confiança (ALTA para scores >= 75%, MEDIA para 45-74%, BAIXA para < 45%).
5. Formule uma justificativa pericial formal com terminologia técnica policial/forense e recomendações operacionais para os policiais em campo (ex: confirmação via identificação papiloscópica, abordagem preventiva com cautela).

Responda estritamente no formato do esquema JSON solicitado.`;

    const userPrompt = `FOTO DE ENTRADA / PESSOA DE INTERESSE ENVIADA PARA RECONHECIMENTO FACIAL.
${additional_context ? `CONTEXTO OPERACIONAL ADICIONAL: "${additional_context}"` : ''}

BANCO DE DADOS DE FICHAS CADASTRAIS DOS INFRATORES DO 35º BPM:
${JSON.stringify(candidates, null, 2)}

Execute a análise biométrica da foto e confronte os padrões faciais contra cada alvo do banco de dados, listando os mais compatíveis por ordem decrescente de similaridade.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: userPrompt
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analise_biometrica_imagem: {
              type: Type.OBJECT,
              properties: {
                descricao_geral: { type: Type.STRING, description: "Descrição morfológica e estrutural geral da face identificada" },
                faixa_etaria_estimada: { type: Type.STRING, description: "Faixa etária aparente (ex: 22 a 28 anos)" },
                formato_rosto: { type: Type.STRING, description: "Formato geométrico facial (ex: Oval, Quadrado, Triangular, Diamante)" },
                cor_pele_estimada: { type: Type.STRING, description: "Tom de pele aparente (ex: Parda, Branca, Negra, Clara)" },
                cabelo_e_barba: { type: Type.STRING, description: "Padrão capilar, corte, calvície e pelos faciais/barba" },
                olhos_sobrancelhas: { type: Type.STRING, description: "Morfologia ocular, formato de sobrancelhas e distância relativa" },
                marcas_distintivas_visiveis: { type: Type.STRING, description: "Tatuagens, cicatrizes, marcas, manchas ou particularidades" }
              },
              required: [
                "descricao_geral",
                "faixa_etaria_estimada",
                "formato_rosto",
                "cor_pele_estimada",
                "cabelo_e_barba",
                "marcas_distintivas_visiveis"
              ]
            },
            candidatos_compativeis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  infrator_id: { type: Type.STRING },
                  nome_completo: { type: Type.STRING },
                  vulgo: { type: Type.STRING },
                  score_similaridade_facial: { type: Type.NUMBER, description: "Pontuação percentual de compatibilidade facial de 0 a 100" },
                  nivel_confianca: { type: Type.STRING, enum: ["ALTA", "MEDIA", "BAIXA"] },
                  pontos_convergentes_faciais: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Semelhanças anatômicas observadas (ex: linha da mandíbula, nariz largo, formato do queixo)"
                  },
                  pontos_divergentes_faciais: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Diferenças observadas (ex: ausência de cavanhaque no registro, comprimento de cabelo)"
                  },
                  justificativa_pericial: { type: Type.STRING, description: "Parecer técnico da comparação morfológica" },
                  recomendacao_operacional: { type: Type.STRING, description: "Instrução tática para a guarnição em serviço" }
                },
                required: [
                  "infrator_id",
                  "nome_completo",
                  "vulgo",
                  "score_similaridade_facial",
                  "nivel_confianca",
                  "pontos_convergentes_faciais",
                  "pontos_divergentes_faciais",
                  "justificativa_pericial",
                  "recomendacao_operacional"
                ]
              }
            },
            resumo_parecer_forense: {
              type: Type.STRING,
              description: "Resumo conclusivo da análise de reconhecimento facial e nível geral de assertividade"
            }
          },
          required: ["analise_biometrica_imagem", "candidatos_compativeis", "resumo_parecer_forense"]
        }
      }
    });

    const parsedResult = safeJsonParse(response.text) || JSON.parse(response.text || '{}');

    // Enrich candidate results with full suspect details (addresses, occurrences, physical features, gang, etc.)
    if (Array.isArray(parsedResult.candidatos_compativeis)) {
      parsedResult.candidatos_compativeis = parsedResult.candidatos_compativeis.map((item: any) => {
        const fullProfile = db.getInfratorFull(item.infrator_id);
        return {
          ...item,
          suspect_details: fullProfile
        };
      }).sort((a: any, b: any) => (b.score_similaridade_facial || 0) - (a.score_similaridade_facial || 0));
    }

    res.json(parsedResult);
  } catch (error: any) {
    console.error('Error in facial-recognition-match, switching to local forensic engine:', error);
    try {
      const fallbackResult = analyzeFacialRecognitionLocally(image, additional_context || '');
      res.json(fallbackResult);
    } catch (fbErr: any) {
      res.status(500).json({ error: error.message || 'Falha ao processar biometria facial.' });
    }
  }
});


// ==========================================
// MODULE B: GEOSPATIAL MATCHING & MO SCORING
// ==========================================
app.post('/api/match/suspects', async (req, res) => {
  try {
    const { lat, lng, buffer_radius_km, description } = req.body;

    if (lat === undefined || lng === undefined || !description) {
      res.status(400).json({ error: 'Coordenadas (lat, lng) e descrição do fato são obrigatórios.' });
      return;
    }

    const radius = Number(buffer_radius_km) || 5.0;

    // 1. Fetch Candidates dynamically inside the GIS buffer using our emulated PostGIS ST_DWithin query
    const candidates = db.matchSuspectsInRadius(Number(lat), Number(lng), radius);

    if (candidates.length === 0) {
      res.json({
        total_candidates: 0,
        matches: [],
        message: 'Nenhum suspeito localizado na área de influência geográfica selecionada.'
      });
      return;
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (e: any) {
      res.status(400).json({ error: e.message });
      return;
    }

    // 2. Feed candidates criminal profiles and physical features to Gemini for Compatibility Scored Triage
    const systemPrompt = `Você é um Analista Sênior de Inteligência Policial e Cientista Criminal. 
Sua tarefa é analisar uma ocorrência recente de crime e confrontá-la com o perfil criminal de candidatos suspeitos localizados na mesma região geográfica.
Para cada candidato suspeito fornecido, avalie e forneça um índice de compatibilidade de 0 a 100% que represente a probabilidade do suspeito estar envolvido ou ser o autor do crime baseado em:
1. Modus Operandi (grau de semelhança entre as táticas passadas e as do crime atual).
2. Características Físicas (tatuagens relatadas, compleição física, altura, cicatrizes comparadas com a narrativa).
3. Armas e Veículos Utilizados (relação com recursos costumazes do suspeito).
4. Facção Criminal ou Rede de Vínculos associada.

Responda estritamente no formato do esquema JSON fornecido. Forneça uma justificativa analítica muito detalhada, profissional, com jargão policial adequado.`;

    const formattedCandidates = candidates.map(c => ({
      id: c.id,
      nome_completo: c.nome_completo,
      vulgo: c.vulgo,
      gangue_faccao: c.gangue_faccao,
      periculosidade: c.periculosidade,
      mandado_ativo: c.status_mandado_prisao,
      caracteristicas_fisicas: c.fisicas,
      enderecos_conhecidos: c.enderecos.map(e => `${e.tipo_endereco}: ${e.logradouro}, ${e.bairro} (Influência: ${e.raio_influencia_km}km)`),
      historico_crimes: c.ocorrencias.map(o => `Crime: ${o.tipificacao_penal} (Papel: ${o.papel}). BO: ${o.numero_bo}. Descrição: ${o.descricao_fato}. MO: ${o.modus_operandi}. Armas: ${o.armas_utilizadas}. Veículo: ${o.veiculo_utilizado}`)
    }));

    const userPrompt = `CRIME RECENTE ANALISADO:
Coordenadas do crime: Latitude ${lat}, Longitude ${lng}
Descrição do crime atual: "${description}"

LISTA DE CRIMINOSOS LOCALIZADOS NO RAIO GEOGRÁFICO DE ${radius}KM:
${JSON.stringify(formattedCandidates, null, 2)}

Por favor, faça a análise comparativa de inteligência para cada suspeito listado acima e retorne os scores e análises de compatibilidade estruturados.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              infrator_id: { type: Type.STRING },
              score: { 
                type: Type.INTEGER, 
                description: "Porcentagem de compatibilidade entre 0 e 100 baseada na correlação criminal."
              },
              justificativa: { 
                type: Type.STRING, 
                description: "Justificativa de inteligência tática, cruzando os dados físicos, locais e modus operandi do suspeito com a ocorrência." 
              },
              fatores_chave: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Lista de 3 a 5 fatores marcantes de correspondência (ex: ['Tatuagem de palhaço coincidente', 'Veículo similar', 'Dentro do raio residencial'])."
              }
            },
            required: ["infrator_id", "score", "justificativa", "fatores_chave"]
          }
        }
      }
    });

    const parsedAnalysis = JSON.parse(response.text || '[]');

    // 3. Assemble and sort the final response
    const scoredMatches = parsedAnalysis.map((match: any) => {
      const fullInfrator = candidates.find(c => c.id === match.infrator_id);
      return {
        suspect: fullInfrator,
        score: match.score,
        justificativa: match.justificativa,
        fatores_chave: match.fatores_chave
      };
    }).sort((a: any, b: any) => b.score - a.score);

    res.json({
      total_candidates: candidates.length,
      matches: scoredMatches
    });
  } catch (error: any) {
    console.error('Error matching suspects:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// MODULE D: SUSPECT NETWORK / GRAPH VISUALIZER
// ==========================================
app.get('/api/network-graph', (req, res) => {
  try {
    const graphData = db.getNetworkGraph();
    res.json(graphData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// MODULE E: ORCRIM - ORGANOGRAMAS DE FACÇÕES E GANGUES
// ==========================================
app.get('/api/orcrim/organogramas', (req, res) => {
  try {
    const organogramas = db.getOrcrimOrganogramas();
    res.json(organogramas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orcrim/organogramas/:id', (req, res) => {
  try {
    const item = db.getOrcrimById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Organograma de facção/gangue não encontrado.' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orcrim/organogramas', (req, res) => {
  try {
    const data = req.body;
    if (!data.gangue_info || !data.estrutura_piramidal) {
      res.status(400).json({ error: 'Dados inválidos. gangue_info e estrutura_piramidal são obrigatórios.' });
      return;
    }
    const saved = db.saveOrcrim(data);
    saveDatabaseToDiskCache();
    res.status(201).json(saved);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/orcrim/organogramas/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteOrcrim(id);
    if (!deleted) {
      res.status(404).json({ error: 'Organograma não encontrado.' });
      return;
    }
    saveDatabaseToDiskCache();
    res.json({ success: true, message: 'Organograma excluído com sucesso.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI-Powered Organogram Generator & Classifier for Factions/Gangues
app.post('/api/ai/orcrim-analyze', async (req, res) => {
  try {
    const { gang_name, custom_narrative } = req.body;

    let ai;
    try {
      ai = getGeminiClient();
    } catch (e: any) {
      res.status(400).json({ error: e.message });
      return;
    }

    // Prepare existing offenders in the database for classification
    const registeredSuspects = db.infratores.map(i => {
      const full = db.getInfratorFull(i.id);
      return {
        id: i.id,
        nome_completo: i.nome_completo,
        vulgo: i.vulgo,
        faccao_declarada: i.gangue_faccao,
        mandado_prisao: i.status_mandado_prisao,
        periculosidade: i.periculosidade,
        foto_url: i.foto_url,
        historico_resumo: full?.ocorrencias?.map((o: any) => `${o.tipificacao_penal} (${o.papel})`).join(', ') || 'Sem registros',
        comparsas: full?.comparsas?.map((c: any) => `${c.comparsa?.vulgo || c.comparsa?.nome_completo} [${c.grau}]`).join(', ') || 'Nenhum'
      };
    });

    const systemPrompt = `Você é um Oficial Especialista da Seção de Inteligência Policial (P2 / SIP) do 35º BPM da Polícia Militar de Minas Gerais (PMMG).
Sua missão é gerar ou reorganizar o ORGANOGRAMA DE UMA ORGANIZAÇÃO CRIMINOSA (ORCRIM / FACÇÃO / GANGUE), classificando os infratores cadastrados na estrutura piramidal tática.

A estrutura é dividida rigorosamente em 3 Níveis Piramidais:
- NÍVEL 1: LIDERANÇA (Geral do Estado, Sintonia Final, Chefe de Facção, Mandantes, Liderança Penitenciária ou de Rua).
- NÍVEL 2: GERÊNCIA TÁTICA (Gerente de Ponto/Biqueira, Disciplina do Progresso, Operador Financeiro, Armeiro, Coordenador de Roubos/Logística). Devem ter 'area_responsabilidade' e 'subordinado_a_vulgo' bem definidos.
- NÍVEL 3: OPERACIONAIS E LINHA DE FRENTE (Soldados de Pista, Executores de Assalto, Varejistas, Pilotos de Fuga, Fogueteiros/Olheiros).

Para a situação prisional ('situacao_atual'), determine com precisão entre:
- 'PRESO': Infrator sob custódia prisional.
- 'FORAGIDO': Infrator com mandado de prisão em aberto não cumprido.
- 'EM_LIBERDADE': Infrator atuando nas ruas sem mandado ativo ou em liberdade provisória.

Preencha os dados rigorosamente com base no esquema JSON solicitado.`;

    const userPrompt = `ORGANIZAÇÃO CRIMINOSA / GANGUE SOLICITADA: "${gang_name || 'Todas as Frentes Regionais'}"
${custom_narrative ? `INFORMAÇÕES DE INTELIGÊNCIA COMPLEMENTARES / RELATÓRIO DO ANALISTA:\n${custom_narrative}\n` : ''}

BANCO DE DADOS DE INFRATORES CADASTRADOS NO SISTEMA:
${JSON.stringify(registeredSuspects, null, 2)}

Classifique e estruture o organograma completo com os infratores cadastrados e classificados nos 3 níveis piramidais.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gangue_info: {
              type: Type.OBJECT,
              properties: {
                nome_gangue: { type: Type.STRING },
                territorio_principal: { type: Type.STRING },
                total_integrantes_mapeados: { type: Type.INTEGER },
                resumo_atuacao: { type: Type.STRING }
              },
              required: ["nome_gangue", "territorio_principal", "total_integrantes_mapeados"]
            },
            estrutura_piramidal: {
              type: Type.OBJECT,
              properties: {
                nivel_1_lideranca: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      infrator_id: { type: Type.STRING },
                      nome_completo: { type: Type.STRING },
                      vulgo: { type: Type.STRING },
                      funcao_especifica: { type: Type.STRING },
                      foto_url: { type: Type.STRING },
                      status_mandado: { type: Type.BOOLEAN },
                      situacao_atual: { type: Type.STRING, enum: ["PRESO", "FORAGIDO", "EM_LIBERDADE"] }
                    },
                    required: ["infrator_id", "nome_completo", "vulgo", "funcao_especifica", "situacao_atual"]
                  }
                },
                nivel_2_gerencia_tática: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      infrator_id: { type: Type.STRING },
                      nome_completo: { type: Type.STRING },
                      vulgo: { type: Type.STRING },
                      funcao_especifica: { type: Type.STRING },
                      area_responsabilidade: { type: Type.STRING },
                      subordinado_a_vulgo: { type: Type.STRING },
                      foto_url: { type: Type.STRING },
                      situacao_atual: { type: Type.STRING, enum: ["PRESO", "FORAGIDO", "EM_LIBERDADE"] }
                    },
                    required: ["infrator_id", "nome_completo", "vulgo", "funcao_especifica", "situacao_atual"]
                  }
                },
                nivel_3_operacionais_e_linha_de_frente: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      infrator_id: { type: Type.STRING },
                      nome_completo: { type: Type.STRING },
                      vulgo: { type: Type.STRING },
                      funcao_especifica: { type: Type.STRING },
                      foto_url: { type: Type.STRING },
                      situacao_atual: { type: Type.STRING, enum: ["PRESO", "FORAGIDO", "EM_LIBERDADE"] }
                    },
                    required: ["infrator_id", "nome_completo", "vulgo", "funcao_especifica", "situacao_atual"]
                  }
                }
              },
              required: ["nivel_1_lideranca", "nivel_2_gerencia_tática", "nivel_3_operacionais_e_linha_de_frente"]
            }
          },
          required: ["gangue_info", "estrutura_piramidal"]
        }
      }
    });

    const parsedResult = JSON.parse(response.text || '{}');

    // Auto-save generated organogram into db repository
    if (parsedResult.gangue_info) {
      db.saveOrcrim(parsedResult);
    }

    res.json(parsedResult);
  } catch (error: any) {
    console.error('Error generating ORCRIM organogram:', error);
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// MODULE E: AUTOMATED PRINTER-FRIENDLY DOSSIER
// ==========================================
app.get('/api/suspects/:id/dossier', (req, res) => {
  try {
    const infrator = db.getInfratorFull(req.params.id);
    if (!infrator) {
      res.status(404).send('<h1>Erro 404: Suspeito não encontrado no banco de dados</h1>');
      return;
    }

    // Calculate age if date of birth exists
    let idadeStr = 'Não informada';
    if (infrator.data_nascimento) {
      const birth = new Date(infrator.data_nascimento);
      const diffMs = Date.now() - birth.getTime();
      const ageDate = new Date(diffMs);
      const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (!isNaN(calculatedAge)) {
        idadeStr = `${calculatedAge} anos`;
      }
    }

    // Generate an executive, clean printable A4 HTML template
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>FICHA DO INFRATOR - DOSSIÊ DE INTELIGÊNCIA - ${infrator.nome_completo.toUpperCase()} (${infrator.vulgo})</title>
      <style>
        @page {
          size: A4;
          margin: 1.2cm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          line-height: 1.4;
          margin: 0;
          padding: 0;
          font-size: 10pt;
          background: #ffffff;
        }
        .header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .badge {
          width: 65px;
          height: 65px;
          background: #0E121B;
          color: #DFC897;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 8pt;
          text-align: center;
          border: 2px solid #C4A76E;
          letter-spacing: 0.5px;
          line-height: 1.1;
        }
        .header-title h1 {
          font-size: 13.5pt;
          margin: 0;
          color: #0E121B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 800;
        }
        .header-title h2 {
          font-size: 8.5pt;
          margin: 2px 0 0 0;
          color: #1D356D;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .confidential-tag {
          border: 2px #dc2626 solid;
          color: #dc2626;
          font-weight: 900;
          padding: 4px 10px;
          font-size: 9pt;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-radius: 4px;
          background: #fef2f2;
        }
        .suspect-overview {
          display: flex;
          gap: 20px;
          margin-bottom: 18px;
          background: #f8fafc;
          padding: 14px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        .suspect-photo-box {
          flex-shrink: 0;
          width: 140px;
          height: 175px;
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
          gap: 8px 14px;
        }
        .detail-item {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 3px;
        }
        .detail-label {
          font-size: 7.5pt;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .detail-value {
          font-size: 10pt;
          font-weight: 700;
          color: #0f172a;
        }
        .detail-value.warrant-active {
          color: #b91c1c;
          background: #fee2e2;
          padding: 1px 6px;
          border-radius: 3px;
          display: inline-block;
          font-size: 9pt;
        }
        .detail-value.warrant-inactive {
          color: #15803d;
          background: #dcfce7;
          padding: 1px 6px;
          border-radius: 3px;
          display: inline-block;
          font-size: 9pt;
        }
        .section-title {
          background: #0f172a;
          color: #ffffff;
          font-size: 9pt;
          font-weight: 800;
          padding: 5px 10px;
          margin: 16px 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .section-title span.count {
          font-size: 8pt;
          color: #f59e0b;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
          margin-bottom: 12px;
        }
        th {
          background: #f1f5f9;
          text-align: left;
          padding: 6px 8px;
          border-bottom: 2px solid #cbd5e1;
          color: #334155;
          text-transform: uppercase;
          font-size: 7.5pt;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        td {
          padding: 6px 8px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
        }
        .cf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 16px;
          background: #f8fafc;
          padding: 10px 14px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          margin-bottom: 12px;
        }
        .cf-item {
          display: flex;
          flex-direction: column;
        }
        .cf-label {
          font-weight: 700;
          color: #64748b;
          font-size: 7.5pt;
          text-transform: uppercase;
        }
        .cf-value {
          font-size: 9.5pt;
          color: #0f172a;
          font-weight: 600;
        }
        .incident-card {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          margin-bottom: 10px;
          padding: 10px;
          background: #ffffff;
          page-break-inside: avoid;
        }
        .incident-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 5px;
          margin-bottom: 6px;
        }
        .incident-bo {
          font-weight: 800;
          font-size: 10pt;
          color: #0f172a;
        }
        .incident-badge {
          font-weight: 800;
          font-size: 8pt;
          padding: 3px 8px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .incident-meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          font-size: 8.5pt;
          margin-bottom: 6px;
          background: #f8fafc;
          padding: 6px;
          border-radius: 3px;
        }
        .incident-narrative {
          font-size: 9pt;
          color: #334155;
          line-height: 1.35;
          margin-top: 4px;
          padding-left: 6px;
          border-left: 3px solid #f59e0b;
        }
        .footer {
          margin-top: 25px;
          border-top: 1px solid #000;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 7.5pt;
          color: #64748b;
          text-transform: uppercase;
        }
        .btn-bar {
          position: fixed;
          top: 15px;
          right: 20px;
          display: flex;
          gap: 10px;
          z-index: 1000;
        }
        .btn-print {
          background: #f59e0b;
          color: #000000;
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 800;
          font-size: 11pt;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-print:hover {
          background: #d97706;
        }
        @media print {
          .btn-bar {
            display: none !important;
          }
          body {
            background: #ffffff;
          }
        }
      </style>
    </head>
    <body>
      <div class="btn-bar">
        <button class="btn-print" onclick="window.print()">
          🖨️ Imprimir / Salvar em PDF
        </button>
      </div>
      
      <div class="header">
        <div class="header-left">
          <div class="badge">PMMG<br>35º BPM</div>
          <div class="header-title">
            <h1>PMMG • 35º BATALHÃO DE POLÍCIA MILITAR</h1>
            <h2>O GUARDIÃO DO ALTO RIO DAS VELHAS • DOSSIÊ DE INTELIGÊNCIA INDIVIDUAL</h2>
          </div>
        </div>
        <div class="confidential-tag">DOCUMENTO RESERVADO</div>
      </div>

      <div class="suspect-overview">
        <div class="suspect-photo-box">
          <img class="suspect-photo" src="${infrator.foto_url}" alt="Foto Infrator" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'">
        </div>
        <div class="suspect-details-grid">
          <div class="detail-item" style="grid-column: span 2;">
            <div class="detail-label">Nome Completo do Infrator</div>
            <div class="detail-value" style="font-size: 12pt; color: #000;">${infrator.nome_completo}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Alcunha / Vulgo</div>
            <div class="detail-value" style="color: #b45309;">"${infrator.vulgo}"</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">CPF</div>
            <div class="detail-value">${infrator.cpf || 'Não cadastrado'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Data de Nascimento / Idade</div>
            <div class="detail-value">${infrator.data_nascimento ? new Date(infrator.data_nascimento).toLocaleDateString('pt-BR') : 'Não cadastrada'} (${idadeStr})</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Facção / Organização Criminosa</div>
            <div class="detail-value">${infrator.gangue_faccao || 'Sem facção informada'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Nível de Periculosidade</div>
            <div class="detail-value" style="color: ${infrator.periculosidade === 'Extrema' ? '#991b1b' : infrator.periculosidade === 'Alta' ? '#dc2626' : infrator.periculosidade === 'Média' ? '#d97706' : '#16a34a'}">
              ${infrator.periculosidade.toUpperCase()}
            </div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Status de Mandado de Prisão</div>
            <div class="detail-value ${infrator.status_mandado_prisao ? 'warrant-active' : 'warrant-inactive'}">
              ${infrator.status_mandado_prisao ? '⚠️ MANDADO DE PRISÃO ATIVO' : 'NENHUM MANDADO PENDENTE'}
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
          <span class="cf-value">${infrator.fisicas?.altura_estimada || 'Não informada'} m</span>
        </div>
        <div class="cf-item">
          <span class="cf-label">Cor da Pele / Etnia</span>
          <span class="cf-value">${infrator.fisicas?.cor_pele || 'Não informada'}</span>
        </div>
        <div class="cf-item">
          <span class="cf-label">Compleição Física</span>
          <span class="cf-value">${infrator.fisicas?.compleicao || 'Não informada'}</span>
        </div>
        <div class="cf-item">
          <span class="cf-label">Sinais / Marcas de Nascença</span>
          <span class="cf-value">${infrator.fisicas?.sinais_particulares || 'Nenhum registrado'}</span>
        </div>
        <div class="cf-item" style="grid-column: span 2;">
          <span class="cf-label">Tatuagens e Detalhes Notáveis</span>
          <span class="cf-value">${infrator.fisicas?.tatuagens_detalhes || 'Nenhuma tatuagem registrada'}</span>
        </div>
        <div class="cf-item" style="grid-column: span 2;">
          <span class="cf-label">Cicatrizes</span>
          <span class="cf-value">${infrator.fisicas?.cicatrizes || 'Nenhuma cicatriz registrada'}</span>
        </div>
      </div>

      <div class="section-title">
        <span>Histórico de Ocorrências Criminais Registradas (B.O.s Vinculados)</span>
        <span class="count">${infrator.ocorrencias.length} Registros</span>
      </div>
      ${infrator.ocorrencias.length === 0 ? `
        <div style="padding: 12px; background: #f8fafc; border: 1px dashed #cbd5e1; text-align: center; color: #64748b; font-size: 9pt; border-radius: 4px; margin-bottom: 12px;">
          Nenhuma ocorrência criminal registrada diretamente contra este investigado no banco de dados.
        </div>
      ` : infrator.ocorrencias.map((oc: any) => {
        const p = (oc.papel || 'Suspeito').toLowerCase();
        let badgeStyle = 'background: #fef3c7; color: #92400e; border: 1px solid #fcd34d;';
        if (p.includes('autor') && !p.includes('coautor')) {
          badgeStyle = 'background: #fee2e2; color: #991b1b; border: 1px solid #f87171;';
        } else if (p.includes('coautor') || p.includes('co-autor')) {
          badgeStyle = 'background: #ffedd5; color: #9a3412; border: 1px solid #fb923c;';
        } else if (p.includes('vítima') || p.includes('vitima')) {
          badgeStyle = 'background: #dbeafe; color: #1e40af; border: 1px solid #60a5fa;';
        } else if (p.includes('notificado')) {
          badgeStyle = 'background: #f3e8ff; color: #6b21a8; border: 1px solid #c084fc;';
        } else if (p.includes('testemunha') || p.includes('condutor')) {
          badgeStyle = 'background: #ccfbf1; color: #115e59; border: 1px solid #2dd4bf;';
        }

        return `
        <div class="incident-card">
          <div class="incident-header">
            <div>
              <span class="incident-bo">B.O. Nº ${oc.numero_bo}</span>
              <span style="color: #64748b; font-size: 8.5pt; margin-left: 8px;">
                ${new Date(oc.data_hora).toLocaleDateString('pt-BR')} às ${new Date(oc.data_hora).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <span class="incident-badge" style="${badgeStyle}">Papel: ${oc.papel || 'Suspeito'}</span>
          </div>
          <div class="incident-meta">
            <div><strong>Tipificação:</strong> ${oc.tipificacao_penal}</div>
            <div><strong>Armas:</strong> ${oc.armas_utilizadas || 'Não informada'}</div>
            <div><strong>Veículo:</strong> ${oc.veiculo_utilizado || 'Não informado'}</div>
          </div>
          <div style="font-size: 8.5pt; margin-bottom: 4px;">
            <strong>Modus Operandi:</strong> ${oc.modus_operandi || 'Padrão não especificado'}
          </div>
          <div>
            <strong style="font-size: 8pt; text-transform: uppercase; color: #475569;">Narrativa Circunstanciada do Fato:</strong>
            <div class="incident-narrative">${oc.descricao_fato || 'Sem narrativa circunstanciada cadastrada.'}</div>
          </div>
        </div>
      `;}).join('')}

      <div class="section-title">
        <span>Locais Conhecidos de Atuação, Esconderijos e Redutos</span>
        <span class="count">${infrator.enderecos.length} Locais</span>
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
          ${infrator.enderecos.map((addr: any) => `
            <tr>
              <td><strong>${addr.tipo_endereco}</strong></td>
              <td>${addr.logradouro}</td>
              <td>${addr.bairro}</td>
              <td>${addr.cidade}</td>
              <td style="font-family: monospace;">${addr.geom_ponto.lat.toFixed(5)}, ${addr.geom_ponto.lng.toFixed(5)}</td>
              <td>${addr.raio_influencia_km} km</td>
            </tr>
          `).join('')}
          ${infrator.enderecos.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 10px;">Nenhum endereço cadastrado para este infrator.</td></tr>' : ''}
        </tbody>
      </table>

      <div class="section-title">
        <span>Rede de Comparsas e Vínculos Criminais Conhecidos</span>
        <span class="count">${infrator.comparsas.length} Comparsas</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Nome do Comparsa</th>
            <th>Vulgo</th>
            <th>Grau de Relação</th>
            <th>Histórico e Modus Operandi Compartilhado</th>
          </tr>
        </thead>
        <tbody>
          ${infrator.comparsas.map((rel: any) => `
            <tr>
              <td><strong>${rel.comparsa?.nome_completo || 'Identificação Pendente'}</strong></td>
              <td style="color: #b45309; font-weight: bold;">"${rel.comparsa?.vulgo || 'N/D'}"</td>
              <td><span style="color: ${rel.grau === 'Forte' ? '#dc2626' : rel.grau === 'Média' ? '#d97706' : '#2563eb'}; font-weight: bold;">${rel.grau}</span></td>
              <td>${rel.historico || 'Relação baseada em monitoramento tático.'}</td>
            </tr>
          `).join('')}
          ${infrator.comparsas.length === 0 ? '<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 10px;">Nenhum comparsa cadastrado no círculo tático.</td></tr>' : ''}
        </tbody>
      </table>

      <div class="footer">
        <div>35º BPM • PMMG • O Guardião do Alto Rio das Velhas • Sistema de Inteligência Policial</div>
        <div>EMISSÃO: ${new Date().toLocaleString('pt-BR')} • DOC ID: ${infrator.id}</div>
        <div>DOCUMENTO RESERVADO DE INTELIGÊNCIA</div>
      </div>
    </body>
    </html>
    `;

    res.send(html);
  } catch (error: any) {
    res.status(500).send(`<h1>Erro do Servidor: ${error.message}</h1>`);
  }
});

// Printable ORCRIM Organogram Briefing
app.get('/api/orcrim/:id/dossier', (req, res) => {
  try {
    const organogram = db.getOrcrimById(req.params.id);
    if (!organogram) {
      res.status(404).send('<h1>Erro 404: Organograma de ORCRIM não encontrado</h1>');
      return;
    }

    const { gangue_info, estrutura_piramidal } = organogram;

    const renderCard = (m: any, level: number) => `
      <div class="membro-card level-${level}">
        <div class="card-header">
          <img class="card-photo" src="${m.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'}" alt="${m.vulgo}">
          <div class="card-info">
            <div class="card-vulgo">"${m.vulgo}"</div>
            <div class="card-nome">${m.nome_completo}</div>
            <div class="card-funcao">${m.funcao_especifica}</div>
          </div>
        </div>
        <div class="card-footer">
          <span class="status-badge status-${m.situacao_atual || 'EM_LIBERDADE'}">${m.situacao_atual || 'EM_LIBERDADE'}</span>
          ${m.status_mandado ? '<span class="status-badge status-mandado">MANDADO ATIVO</span>' : ''}
          ${m.subordinado_a_vulgo ? `<span class="subord-info">Subordinado a: <strong>${m.subordinado_a_vulgo}</strong></span>` : ''}
          ${m.area_responsabilidade ? `<span class="subord-info">Área: <strong>${m.area_responsabilidade}</strong></span>` : ''}
        </div>
      </div>
    `;

    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>ORCRIM - ORGANOGRAMA TÁTICO - ${gangue_info.nome_gangue.toUpperCase()}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 1cm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 10px;
          background: #ffffff;
          font-size: 9pt;
        }
        .btn-bar {
          position: fixed;
          top: 15px;
          right: 20px;
          display: flex;
          gap: 10px;
          z-index: 1000;
        }
        .btn-print {
          background: #f59e0b;
          color: #000000;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 800;
          font-size: 10pt;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          text-transform: uppercase;
        }
        @media print {
          .btn-bar { display: none !important; }
        }
        .header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 8px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .badge {
          background: #0E121B;
          color: #DFC897;
          border-radius: 6px;
          padding: 6px 12px;
          font-weight: 900;
          font-size: 8pt;
          text-align: center;
          border: 2px solid #C4A76E;
        }
        .header-title h1 {
          font-size: 13pt;
          margin: 0;
          color: #0E121B;
          text-transform: uppercase;
          font-weight: 800;
        }
        .header-title h2 {
          font-size: 9pt;
          margin: 2px 0 0 0;
          color: #b45309;
          font-weight: 700;
          text-transform: uppercase;
        }
        .summary-box {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 14px;
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }
        .summary-item {
          display: flex;
          flex-direction: column;
        }
        .summary-label {
          font-size: 7.5pt;
          text-transform: uppercase;
          color: #64748b;
          font-weight: bold;
        }
        .summary-val {
          font-size: 9.5pt;
          font-weight: bold;
          color: #0f172a;
        }
        .level-container {
          margin-bottom: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 12px;
          background: #ffffff;
        }
        .level-1 { border-left: 5px solid #dc2626; background: #fffbfb; }
        .level-2 { border-left: 5px solid #f59e0b; background: #fffdfa; }
        .level-3 { border-left: 5px solid #2563eb; background: #f8faff; }
        .level-title {
          font-size: 9pt;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .level-1 .level-title { color: #b91c1c; }
        .level-2 .level-title { color: #b45309; }
        .level-3 .level-title { color: #1d4ed8; }
        .grid-members {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 10px;
        }
        .membro-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .card-header {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .card-photo {
          width: 44px;
          height: 44px;
          border-radius: 4px;
          object-fit: cover;
          border: 1px solid #94a3b8;
          flex-shrink: 0;
        }
        .card-vulgo {
          font-weight: 900;
          font-size: 9.5pt;
          color: #b45309;
        }
        .card-nome {
          font-size: 8pt;
          font-weight: bold;
          color: #1e293b;
        }
        .card-funcao {
          font-size: 7.5pt;
          color: #475569;
          margin-top: 1px;
        }
        .card-footer {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px dashed #e2e8f0;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          align-items: center;
        }
        .status-badge {
          font-size: 6.5pt;
          font-weight: 900;
          padding: 2px 5px;
          border-radius: 3px;
          text-transform: uppercase;
        }
        .status-PRESO { background: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
        .status-FORAGIDO { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }
        .status-EM_LIBERDADE { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .status-mandado { background: #991b1b; color: #ffffff; }
        .subord-info {
          font-size: 7pt;
          color: #64748b;
          width: 100%;
        }
      </style>
    </head>
    <body>
      <div class="btn-bar">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir Organograma</button>
      </div>

      <div class="header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="badge">PMMG<br>35º BPM</div>
          <div class="header-title">
            <h1>PMMG • 35º BATALHÃO DE POLÍCIA MILITAR // SIP - SEÇÃO DE INTELIGÊNCIA</h1>
            <h2>ORGANOGRAMA TÁTICO PIRAMIDAL DE ORCRIM: ${gangue_info.nome_gangue}</h2>
          </div>
        </div>
        <div style="border: 2px solid #dc2626; color: #dc2626; font-weight: 900; padding: 4px 8px; border-radius: 4px; font-size: 8pt;">
          DOCUMENTO RESERVADO // P2
        </div>
      </div>

      <div class="summary-box">
        <div class="summary-item">
          <span class="summary-label">Organização / Gangue</span>
          <span class="summary-val">${gangue_info.nome_gangue}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Território Principal de Atuação</span>
          <span class="summary-val">${gangue_info.territorio_principal}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Integrantes Mapeados</span>
          <span class="summary-val">${gangue_info.total_integrantes_mapeados} criminosos</span>
        </div>
        <div class="summary-item" style="flex: 2;">
          <span class="summary-label">Resumo de Atuação / Modus Operandi</span>
          <span class="summary-val" style="font-size: 8pt; font-weight: normal;">${gangue_info.resumo_atuacao || 'Mapeamento constante sob monitoramento da agência local de inteligência.'}</span>
        </div>
      </div>

      <!-- NÍVEL 1: LIDERANÇA -->
      <div class="level-container level-1">
        <div class="level-title">
          <span>👑 NÍVEL 1 — LIDERANÇA ESTRATÉGICA & COMANDO GERAL</span>
          <span>${estrutura_piramidal.nivel_1_lideranca?.length || 0} Integrante(s)</span>
        </div>
        <div class="grid-members">
          ${(estrutura_piramidal.nivel_1_lideranca || []).map((m: any) => renderCard(m, 1)).join('')}
        </div>
      </div>

      <!-- NÍVEL 2: GERÊNCIA TÁTICA -->
      <div class="level-container level-2">
        <div class="level-title">
          <span>⚡ NÍVEL 2 — GERÊNCIA TÁTICA, DISCIPLINAS & LOGÍSTICA</span>
          <span>${estrutura_piramidal.nivel_2_gerencia_tática?.length || estrutura_piramidal.nivel_2_gerencia_tatica?.length || 0} Integrante(s)</span>
        </div>
        <div class="grid-members">
          ${(estrutura_piramidal.nivel_2_gerencia_tática || estrutura_piramidal.nivel_2_gerencia_tatica || []).map((m: any) => renderCard(m, 2)).join('')}
        </div>
      </div>

      <!-- NÍVEL 3: OPERACIONAIS E LINHA DE FRENTE -->
      <div class="level-container level-3">
        <div class="level-title">
          <span>🎯 NÍVEL 3 — OPERACIONAIS, SOLDADOS DE PISTA & LINHA DE FRENTE</span>
          <span>${estrutura_piramidal.nivel_3_operacionais_e_linha_de_frente?.length || 0} Integrante(s)</span>
        </div>
        <div class="grid-members">
          ${(estrutura_piramidal.nivel_3_operacionais_e_linha_de_frente || []).map((m: any) => renderCard(m, 3)).join('')}
        </div>
      </div>

      <div style="margin-top: 15px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px;">
        <div>PMMG 35º BPM • Sistema de Inteligência Policial</div>
        <div>Emissão: ${new Date().toLocaleString('pt-BR')}</div>
        <div>USO ESTRITAMENTE OPERACIONAL</div>
      </div>
    </body>
    </html>
    `;

    res.send(html);
  } catch (error: any) {
    res.status(500).send(`<h1>Erro do Servidor: ${error.message}</h1>`);
  }
});


// ==========================================
// VITE CLIENT MIDDLEWARE & ROUTING INTEGRATION
// ==========================================
async function startServer() {
  try {
    await syncServerWithFirestore();
  } catch (err) {
    console.warn('Falha na sincronização inicial do Firestore no boot do servidor:', err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CrimIntel-Geo Backend Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
