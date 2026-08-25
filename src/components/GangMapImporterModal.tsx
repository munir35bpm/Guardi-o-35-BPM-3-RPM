import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, X, MapPin, Eye, Layers, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import { parseMapFile } from '../utils/kmlGeoJsonParser';
import { GangAreaZone } from '../types';

interface GangMapImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (zones: GangAreaZone[], replaceExisting: boolean) => void;
}

export default function GangMapImporterModal({
  isOpen,
  onClose,
  onImportSuccess,
}: GangMapImporterModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedZones, setParsedZones] = useState<GangAreaZone[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setErrorMsg(null);
    setLoading(true);
    setFileName(file.name);

    try {
      const zones = await parseMapFile(file);
      if (!zones || zones.length === 0) {
        throw new Error('Nenhum polígono ou demarcação geográfica de gangue foi identificado no arquivo fornecido.');
      }
      setParsedZones(zones);
    } catch (err: any) {
      console.error('Erro ao processar arquivo KML/GeoJSON:', err);
      setErrorMsg(err.message || 'Falha ao processar o arquivo. Verifique se é um KML, KMZ ou GeoJSON válido.');
      setParsedZones([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedZones.length === 0) return;
    onImportSuccess(parsedZones, replaceExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-[#0e1017] border border-zinc-700/80 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden tactical-corner">
        
        {/* Header */}
        <div className="bg-[#141824] px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono flex items-center gap-2">
                Importar Mapa de Gangues & Territórios
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                  Google Maps / My Maps
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Suporta formatos padrão <span className="text-amber-400 font-bold">.KML</span>, <span className="text-amber-400 font-bold">.KMZ</span> e <span className="text-cyan-400 font-bold">.GeoJSON</span> com cores preservadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 font-mono text-xs">
          
          {/* Tutorial / Help Box */}
          <div className="bg-[#121620] border border-zinc-800 rounded-md p-3">
            <button
              type="button"
              onClick={() => setShowTutorial(!showTutorial)}
              className="flex items-center justify-between w-full text-left text-zinc-300 hover:text-amber-400 font-bold text-[11px] uppercase tracking-wide cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                Como exportar do Google Maps (Google My Maps)?
              </span>
              <span className="text-[10px] text-amber-400 underline">
                {showTutorial ? 'Ocultar instruções' : 'Ver passo a passo'}
              </span>
            </button>

            {showTutorial && (
              <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2 text-[11px] text-zinc-400">
                <div className="flex items-start gap-2">
                  <span className="bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[10px]">1</span>
                  <span>Acesse seu mapa no <strong>Google My Maps</strong> (<span className="text-amber-400">google.com/maps/d</span>).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[10px]">2</span>
                  <span>Clique nos <strong>três pontinhos (⋮)</strong> ao lado do título do seu mapa no painel esquerdo.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[10px]">3</span>
                  <span>Selecione <strong>"Exportar para KML/KMZ"</strong>. Deixe marcado para exportar o mapa ou a camada das gangues.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[10px]">4</span>
                  <span>Faça o upload do arquivo <span className="text-zinc-200">.kml</span> ou <span className="text-zinc-200">.kmz</span> baixado abaixo!</span>
                </div>
              </div>
            )}
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition ${
              dragOver
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-zinc-700 hover:border-amber-500/60 bg-[#0A0C12] hover:bg-[#0E121A]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".kml,.kmz,.geojson,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-full mb-3 text-amber-400">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>

            <p className="text-zinc-200 font-bold text-xs uppercase tracking-wider mb-1">
              Arraste e solte o arquivo do Google Maps aqui
            </p>
            <p className="text-zinc-500 text-[11px]">
              ou clique para selecionar do seu computador (<span className="text-zinc-400">.KML, .KMZ, .GeoJSON</span>)
            </p>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center justify-center gap-2 p-4 bg-zinc-900/80 rounded border border-zinc-800 text-amber-400">
              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Processando geometrias, polígonos e cores do mapa...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded flex items-start gap-2.5 text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px]">Erro ao ler arquivo:</p>
                <p className="text-[10px] text-red-300 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Preview of Parsed Zones */}
          {parsedZones.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-[11px] uppercase">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {parsedZones.length} Área(s) Identificada(s) no Arquivo ({fileName})
                </span>
                <span className="text-[10px] text-zinc-400">
                  Pronto para plotagem
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {parsedZones.map((zone, idx) => (
                  <div
                    key={zone.id || idx}
                    className="p-2.5 bg-[#08090C] border border-zinc-800/90 rounded flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-4 h-4 rounded flex-shrink-0 border border-white/20 shadow-sm"
                        style={{ backgroundColor: zone.color }}
                      />
                      <div className="truncate">
                        <span className="font-bold text-zinc-200 text-xs block truncate">
                          {zone.name}
                        </span>
                        {zone.description && (
                          <span className="text-[10px] text-zinc-500 block truncate">
                            {zone.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 text-[10px]">
                      <span className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                        {zone.type}
                      </span>
                      {zone.areaKm2 ? (
                        <span className="text-zinc-400">
                          {zone.areaKm2} km²
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {/* Replace vs Merge Option */}
              <div className="bg-[#121620] p-3 rounded border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-300 block text-[11px]">Substituir demarcações existentes?</span>
                  <span className="text-zinc-500 text-[10px]">
                    {replaceExisting
                      ? 'Substituirá todas as áreas atuais pelas áreas deste arquivo.'
                      : 'Adicionará as novas áreas às demarcações já existentes.'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#141824] px-5 py-3 border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded transition uppercase tracking-wider cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedZones.length === 0}
            className={`px-5 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
              parsedZones.length > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Plotar {parsedZones.length > 0 ? `${parsedZones.length} Área(s) no Mapa` : 'no Mapa'}
          </button>
        </div>

      </div>
    </div>
  );
}
