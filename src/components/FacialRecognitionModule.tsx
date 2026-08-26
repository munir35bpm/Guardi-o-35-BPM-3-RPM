import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Scan,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Shield,
  MapPin,
  FileText,
  User,
  ArrowRight,
  Zap,
  Info,
  Maximize2,
  ChevronRight
} from 'lucide-react';
import {
  ResultadoReconhecimentoFacial,
  CandidatoSimilaridadeFacial,
  Infrator,
  SuspectWithDetails
} from '../types';
import { db } from '../backend/db';
import { openSuspectDossier } from '../utils/dossierGenerator';
import { analyzeFacialRecognitionLocally } from '../utils/facialForensicsEngine';
import { FileDown } from 'lucide-react';

interface FacialRecognitionModuleProps {
  onSelectSuspectForDetail?: (suspect: SuspectWithDetails) => void;
  onLocateOnMap?: (coords: { lat: number; lng: number }) => void;
}

export default function FacialRecognitionModule({
  onSelectSuspectForDetail,
  onLocateOnMap
}: FacialRecognitionModuleProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [additionalContext, setAdditionalContext] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultadoReconhecimentoFacial | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sample photos from registered suspects for 1-click testing
  const sampleSuspects = db.infratores.slice(0, 4);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setResult(null);
        setAnalysisError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setResult(null);
        setAnalysisError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Erro ao acessar a câmera:', err);
      setIsCameraActive(false);
      setAnalysisError('Não foi possível acessar a câmera do dispositivo. Verifique as permissões.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedImage(dataUrl);
        setResult(null);
        setAnalysisError(null);
        stopCamera();
      }
    }
  };

  const runFacialRecognition = async () => {
    if (!selectedImage) {
      setAnalysisError('Por favor, selecione ou tire uma foto para realizar a perícia facial.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setResult(null);

    try {
      let data: ResultadoReconhecimentoFacial | null = null;

      try {
        const res = await fetch('/api/ai/facial-recognition-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: selectedImage,
            additional_context: additionalContext
          })
        });

        if (res.ok) {
          data = await res.json();
        } else {
          console.warn(`Server responded with ${res.status}, executing client-side forensic analysis fallback...`);
          data = analyzeFacialRecognitionLocally(selectedImage, additionalContext);
        }
      } catch (fetchErr) {
        console.warn('Network request failed, executing client-side forensic analysis fallback...', fetchErr);
        data = analyzeFacialRecognitionLocally(selectedImage, additionalContext);
      }

      if (data) {
        setResult(data);
      } else {
        throw new Error('Não foi possível processar a análise biométrica da imagem.');
      }
    } catch (err: any) {
      console.error('Falha no reconhecimento facial:', err);
      setAnalysisError(err.message || 'Falha ao processar reconhecimento facial com a IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Card: Capture & Input Zone */}
      <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 shadow-2xl tactical-corner font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Scan className="text-cyan-400 w-5 h-5 animate-pulse" />
            <div>
              <h3 className="font-bold text-zinc-100 text-sm uppercase tracking-wider">
                Reconhecimento Facial & Biometria Morfológica IA
              </h3>
              <span className="text-[10px] text-zinc-400 block font-sans">
                Comparação morfológica e confrontação automatizada contra a base de alvos do 35º BPM via Gemini 3.7 Vision
              </span>
            </div>
          </div>
          <span className="text-[9px] bg-cyan-950/40 border border-cyan-800/60 text-cyan-400 px-2 py-0.5 rounded font-bold">
            BIOMETRIA FORENSE // MOTOR MULTIMODAL
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Image Upload / Camera Box (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Viewport Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`relative aspect-[4/3] rounded border-2 border-dashed bg-[#0A0A0B] flex flex-col items-center justify-center overflow-hidden transition ${
                selectedImage
                  ? 'border-cyan-500/50'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {isCameraActive ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* Tactical Target Overlay */}
                  <div className="absolute inset-0 border-2 border-cyan-500/40 pointer-events-none flex items-center justify-center">
                    <div className="w-36 h-48 border border-dashed border-cyan-400/80 rounded-full animate-pulse flex items-center justify-center">
                      <span className="text-[9px] text-cyan-400/80 bg-black/60 px-1 rounded">
                        ENQUADRE O ROSTO
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                    <button
                      onClick={capturePhoto}
                      className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs rounded uppercase flex items-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" /> Capturar Foto
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded uppercase cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : selectedImage ? (
                <div className="relative w-full h-full group">
                  <img
                    src={selectedImage}
                    alt="Foto do Suspeito"
                    className="w-full h-full object-cover"
                  />
                  {/* Tactical HUD Scanner overlay on hover or analysis */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] bg-black/80 border border-cyan-500/50 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                        IMAGEM CARREGADA
                      </span>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="p-1 bg-black/80 text-zinc-400 hover:text-red-400 rounded transition cursor-pointer"
                        title="Remover Imagem"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Laser Scanner Line Animation during analysis */}
                    {isAnalyzing && (
                      <div className="absolute inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_12px_#06b6d4] animate-bounce top-1/2" />
                    )}

                    <div className="flex justify-between items-end">
                      <div className="text-[10px] text-zinc-300 bg-black/70 px-2 py-1 rounded">
                        <span>Pressione Executar para escanear biometria</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                    <Scan className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">
                      Arraste ou selecione a foto do suspeito
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Suporta fotos de abordagem, câmeras de segurança ou arquivos JPG/PNG
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center pt-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-cyan-400" /> Selecionar Arquivo
                    </button>
                    <button
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" /> Abrir Câmera
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Test Samples */}
            {sampleSuspects.length > 0 && !selectedImage && !isCameraActive && (
              <div className="bg-[#0A0A0B] p-2.5 rounded border border-zinc-800/80">
                <span className="text-[10px] text-zinc-400 font-bold block mb-1.5 uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Teste Rápido com Alvos do Sistema:
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {sampleSuspects.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedImage(s.foto_url);
                        setResult(null);
                        setAnalysisError(null);
                      }}
                      className="group relative rounded overflow-hidden border border-zinc-800 hover:border-cyan-500 transition aspect-square bg-zinc-900 cursor-pointer"
                      title={`${s.nome_completo} (${s.vulgo})`}
                    >
                      <img
                        src={s.foto_url}
                        alt={s.vulgo}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1 py-0.5 text-[8px] text-zinc-300 truncate">
                        {s.vulgo || s.nome_completo.split(' ')[0]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Context, Parameters & Execution Button (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1 uppercase">
                  Contexto Adicional da Abordagem / Ocorrência (Opcional)
                </label>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Ex: Indivíduo abordado na Av. Brasília pilotando moto suspeita, alega não possuir documentos, possui tatuagem no antebraço direito..."
                  className="w-full h-24 bg-[#0A0A0B] text-zinc-200 p-3 rounded border border-zinc-800 focus:outline-none focus:border-cyan-500 text-xs font-mono resize-none focus:ring-1 focus:ring-cyan-500/20"
                />
              </div>

              <div className="bg-[#0A0A0B] p-3 rounded border border-zinc-800/80 space-y-2">
                <span className="text-[10px] text-cyan-400 font-bold uppercase block border-b border-zinc-800 pb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Parâmetros de Confrontação Forense:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span>Morfologia Facial & Crânio</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span>Distância Interocular & Nariz</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span>Marcas, Tatuagens & Cicatrizes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span>Base 35º BPM ({db.infratores.length} fichas)</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={runFacialRecognition}
                disabled={isAnalyzing || !selectedImage}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-black font-black text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Processando Biometria & Varrendo Banco de Dados...</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4" />
                    <span>Executar Perícia & Reconhecimento Facial IA</span>
                  </>
                )}
              </button>

              {analysisError && (
                <div className="mt-3 p-3 bg-red-950/40 border border-red-900 text-red-200 rounded text-xs">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Erro no reconhecimento facial:
                  </p>
                  <p className="mt-0.5 text-zinc-300">{analysisError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Forensic Summary Card */}
          <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 shadow-2xl tactical-corner font-mono space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Eye className="text-cyan-400 w-4 h-4" />
                <h4 className="font-bold text-zinc-100 text-xs uppercase tracking-wider">
                  Laudo Pericial de Biometria da Imagem de Entrada
                </h4>
              </div>
              <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-cyan-400 px-2 py-0.5 rounded font-bold">
                EXTRAÇÃO DE MARCOS FACIAIS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#0A0A0B] p-3 rounded border border-zinc-800/80 space-y-1">
                <span className="text-[9px] text-zinc-500 uppercase font-bold block">
                  Descrição Morfológica Geral
                </span>
                <p className="text-zinc-200 font-sans leading-relaxed text-xs">
                  {result.analise_biometrica_imagem?.descricao_geral}
                </p>
              </div>

              <div className="bg-[#0A0A0B] p-3 rounded border border-zinc-800/80 space-y-2">
                <span className="text-[9px] text-cyan-400 uppercase font-bold block border-b border-zinc-800/60 pb-1">
                  Parâmetros Estruturais
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[9px] text-zinc-500 block">Formato Rosto:</span>
                    <span className="text-zinc-200 font-semibold">{result.analise_biometrica_imagem?.formato_rosto}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block">Faixa Etária:</span>
                    <span className="text-zinc-200 font-semibold">{result.analise_biometrica_imagem?.faixa_etaria_estimada}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block">Pele Estimada:</span>
                    <span className="text-zinc-200 font-semibold">{result.analise_biometrica_imagem?.cor_pele_estimada}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block">Cabelo/Barba:</span>
                    <span className="text-zinc-200 font-semibold truncate block">{result.analise_biometrica_imagem?.cabelo_e_barba}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0A0B] p-3 rounded border border-zinc-800/80 space-y-1">
                <span className="text-[9px] text-amber-400 uppercase font-bold block">
                  Marcas Distintivas / Tatuagens
                </span>
                <p className="text-amber-200/90 font-sans leading-relaxed text-xs">
                  {result.analise_biometrica_imagem?.marcas_distintivas_visiveis || 'Nenhuma marca particular evidente identificada'}
                </p>
              </div>
            </div>

            {/* Parecer Forense Conclusivo */}
            {result.resumo_parecer_forense && (
              <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-cyan-400 font-bold uppercase block">
                    Parecer Conclusivo de Inteligência:
                  </span>
                  <p className="text-zinc-300 font-sans leading-relaxed mt-0.5">
                    {result.resumo_parecer_forense}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Suspects Matches Matrix */}
          <div className="bg-[#0F0F12] border border-zinc-800 rounded p-5 shadow-2xl tactical-corner font-mono space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Shield className="text-amber-400 w-4 h-4" />
                <h4 className="font-bold text-zinc-100 text-xs uppercase tracking-wider">
                  Alvos Compatíveis Identificados ({result.candidatos_compativeis?.length || 0})
                </h4>
              </div>
              <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-amber-400 px-2 py-0.5 rounded font-bold">
                RANKING POR SCORE DE CONFRONTAÇÃO
              </span>
            </div>

            {result.candidatos_compativeis?.length === 0 ? (
              <div className="p-6 text-center text-zinc-400 bg-[#0A0A0B] rounded border border-zinc-800">
                <p className="text-xs">Nenhum alvo cadastrado atingiu o limiar de compatibilidade biométrica facial.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {result.candidatos_compativeis.map((item, idx) => {
                  const isTopMatch = idx === 0 && item.score_similaridade_facial >= 70;
                  const suspectData = item.suspect_details;

                  return (
                    <div
                      key={item.infrator_id || idx}
                      className={`bg-[#0A0A0B] border rounded p-4 space-y-4 transition ${
                        isTopMatch
                          ? 'border-amber-500/60 shadow-lg shadow-amber-500/5'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {/* Top Header: Side-by-side Photo Comparison & Info */}
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-4">
                          {/* Side by side images */}
                          <div className="flex items-center gap-2">
                            {/* Probe photo */}
                            <div className="relative w-14 h-14 rounded overflow-hidden border border-cyan-500/60 flex-shrink-0 bg-zinc-900">
                              <img
                                src={selectedImage!}
                                alt="Foto Entrada"
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] text-cyan-300 text-center uppercase">
                                Entrada
                              </span>
                            </div>

                            <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />

                            {/* Database photo */}
                            <div className="relative w-14 h-14 rounded overflow-hidden border border-amber-500/60 flex-shrink-0 bg-zinc-900">
                              <img
                                src={suspectData?.foto_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'}
                                alt={item.vulgo}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] text-amber-300 text-center uppercase">
                                Cadastro
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-zinc-100 text-sm">
                                {item.nome_completo}
                              </h5>
                              {suspectData?.status_mandado_prisao && (
                                <span className="bg-red-500 text-black font-black text-[9px] px-1.5 py-0.5 rounded animate-pulse">
                                  MANDADO ATIVO
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 mt-0.5">
                              <span className="text-amber-400 font-bold">
                                Vulgo: "{item.vulgo}"
                              </span>
                              {suspectData && (
                                <>
                                  <span>• Facção: {suspectData.gangue_faccao}</span>
                                  <span>• Periculosidade: {suspectData.periculosidade}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Similarity Score Badge */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[9px] text-zinc-500 uppercase font-bold block">
                              Similaridade Facial
                            </span>
                            <div className={`px-3 py-1 rounded text-sm font-black flex items-center justify-end gap-1 ${
                              item.score_similaridade_facial >= 75
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : item.score_similaridade_facial >= 45
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}>
                              <span>{Math.round(item.score_similaridade_facial)}%</span>
                              <span className="text-[9px] font-normal uppercase ml-1">
                                ({item.nivel_confianca})
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Convergences & Divergences Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-emerald-400 uppercase font-bold block flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Pontos Convergentes Morfológicos:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.pontos_convergentes_faciais?.map((pc, i) => (
                              <span
                                key={i}
                                className="text-[10px] bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 px-2 py-0.5 rounded"
                              >
                                {pc}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[9px] text-zinc-400 uppercase font-bold block flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-zinc-500" /> Pontos Divergentes / Variações:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.pontos_divergentes_faciais?.map((pd, i) => (
                              <span
                                key={i}
                                className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded"
                              >
                                {pd}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Technical Justification & Recommendation */}
                      <div className="space-y-2 pt-1 border-t border-zinc-800/60 text-xs">
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase font-bold block">
                            Justificativa Pericial:
                          </span>
                          <p className="text-zinc-300 font-sans text-xs leading-relaxed mt-0.5">
                            {item.justificativa_pericial}
                          </p>
                        </div>

                        <div>
                          <span className="text-[9px] text-amber-400 uppercase font-bold block">
                            Recomendação Operacional de Campo:
                          </span>
                          <p className="text-amber-200/90 font-sans text-xs leading-relaxed mt-0.5">
                            {item.recomendacao_operacional}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                        {suspectData && (
                          <button
                            type="button"
                            onClick={() => openSuspectDossier(suspectData.id, suspectData)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded transition flex items-center gap-1.5 font-mono cursor-pointer shadow-sm shadow-amber-500/20"
                            title="Extrair Ficha do Infrator em PDF"
                          >
                            <FileDown className="w-3.5 h-3.5 stroke-[2.5]" /> Extrair PDF
                          </button>
                        )}

                        {suspectData && onSelectSuspectForDetail && (
                          <button
                            onClick={() => onSelectSuspectForDetail(suspectData)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded border border-zinc-700 flex items-center gap-1.5 transition font-mono cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-cyan-400" /> Abrir Ficha Completa
                          </button>
                        )}

                        {suspectData?.enderecos?.[0] && onLocateOnMap && (
                          <button
                            onClick={() => {
                              const addr = suspectData.enderecos[0];
                              onLocateOnMap(addr.geom_ponto);
                            }}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs rounded border border-amber-500/30 flex items-center gap-1.5 transition font-mono cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5 text-amber-400" /> Localizar Endereço no Mapa
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
