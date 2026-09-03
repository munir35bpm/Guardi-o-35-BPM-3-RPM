import React, { useEffect, useState, useRef, useMemo } from 'react';
import { NetworkNode, NetworkEdge } from '../types';
import {
  Users,
  AlertTriangle,
  FileText,
  Share2,
  FileDown,
  ShieldAlert,
  UserX,
  RotateCcw,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';
import { db } from '../backend/db';
import { openSuspectDossier } from '../utils/dossierGenerator';

interface NetworkGraphProps {
  onSelectNode?: (nodeId: string, nodeType: 'suspect' | 'incident') => void;
}

interface PhysicsNode extends NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function isSuspectInGang(gang?: string, has_gang?: boolean): boolean {
  if (typeof has_gang === 'boolean') return has_gang;
  if (!gang) return false;
  const clean = gang.trim().toLowerCase();
  return Boolean(
    clean &&
    clean !== 'nenhuma' &&
    clean !== 'sem facção' &&
    clean !== 'sem faccao' &&
    clean !== 'sem facção informada' &&
    clean !== 'não informada' &&
    clean !== 'nao informada' &&
    clean !== 'apurando vínculo' &&
    clean !== 'apurando vinculo' &&
    clean !== 'infratores sem gangue' &&
    clean !== 'sem gangue'
  );
}

export function getDisplayGangName(gang?: string, has_gang?: boolean): string {
  if (isSuspectInGang(gang, has_gang)) {
    return gang!.trim();
  }
  return 'Infratores sem gangue';
}

export default function NetworkGraph({ onSelectNode }: NetworkGraphProps) {
  const [rawNodes, setRawNodes] = useState<NetworkNode[]>([]);
  const [rawEdges, setRawEdges] = useState<NetworkEdge[]>([]);
  const [nodes, setNodes] = useState<PhysicsNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<PhysicsNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Filter settings: 'gang_only' is active by default as requested
  const [filterMode, setFilterMode] = useState<'gang_only' | 'no_gang' | 'all' | string>('gang_only');
  const [showIncidents, setShowIncidents] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragNodeIdRef = useRef<string | null>(null);
  const requestRef = useRef<number | null>(null);
  const nodePositionsRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());

  const width = 920;
  const height = 560;

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      setError(null);
      let graphData: any = null;
      const res = await fetch('/api/network-graph').catch(() => null);
      if (res && res.ok) {
        graphData = await res.json();
      } else {
        graphData = db.getNetworkGraph();
      }

      if (!graphData || !graphData.nodes) {
        graphData = db.getNetworkGraph();
      }

      const fetchedNodes: NetworkNode[] = (graphData.nodes || []).map((n: any) => {
        const inGang = isSuspectInGang(n.gang, n.has_gang);
        return {
          ...n,
          gang: inGang ? n.gang : 'Infratores sem gangue',
          has_gang: inGang,
        };
      });

      const fetchedEdges: NetworkEdge[] = graphData.edges || [];

      setRawNodes(fetchedNodes);
      setRawEdges(fetchedEdges);
    } catch (err: any) {
      console.warn('Erro ao processar dados do grafo:', err);
      const fallbackData = db.getNetworkGraph();
      const fetchedNodes: NetworkNode[] = fallbackData.nodes.map((n: any) => {
        const inGang = isSuspectInGang(n.gang, n.has_gang);
        return {
          ...n,
          gang: inGang ? n.gang : 'Infratores sem gangue',
          has_gang: inGang,
        };
      });
      setRawNodes(fetchedNodes);
      setRawEdges(fallbackData.edges || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Compute available distinct gangs and counters
  const { availableGangs, countGang, countNoGang, totalSuspects } = useMemo(() => {
    const suspectNodes = rawNodes.filter((n) => n.type === 'suspect');
    const withGang = suspectNodes.filter((n) => isSuspectInGang(n.gang, n.has_gang));
    const withoutGang = suspectNodes.filter((n) => !isSuspectInGang(n.gang, n.has_gang));

    const gangsSet = new Set<string>();
    withGang.forEach((n) => {
      if (n.gang && n.gang !== 'Infratores sem gangue') {
        gangsSet.add(n.gang.trim());
      }
    });

    return {
      availableGangs: Array.from(gangsSet).sort(),
      countGang: withGang.length,
      countNoGang: withoutGang.length,
      totalSuspects: suspectNodes.length,
    };
  }, [rawNodes]);

  // Filter visible nodes and edges whenever raw data or filter modes change
  useEffect(() => {
    if (rawNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // 1. Filter suspects based on filterMode
    const visibleSuspects = rawNodes.filter((n) => {
      if (n.type !== 'suspect') return false;
      const inGang = isSuspectInGang(n.gang, n.has_gang);
      if (filterMode === 'gang_only') {
        return inGang;
      }
      if (filterMode === 'no_gang') {
        return !inGang;
      }
      if (filterMode === 'all') {
        return true;
      }
      // Specific gang filter
      return n.gang?.trim().toLowerCase() === filterMode.trim().toLowerCase();
    });

    const visibleSuspectIds = new Set(visibleSuspects.map((s) => s.id));

    // 2. Filter incidents: only display if showIncidents is enabled AND connected to at least one visible suspect
    let visibleIncidents: NetworkNode[] = [];
    if (showIncidents) {
      const incidentsWithVisibleSuspect = new Set<string>();
      rawEdges.forEach((e) => {
        if (e.type === 'participated') {
          if (visibleSuspectIds.has(e.source)) incidentsWithVisibleSuspect.add(e.target);
          if (visibleSuspectIds.has(e.target)) incidentsWithVisibleSuspect.add(e.source);
        }
      });

      visibleIncidents = rawNodes.filter(
        (n) => n.type === 'incident' && incidentsWithVisibleSuspect.has(n.id)
      );
    }

    const visibleNodesList = [...visibleSuspects, ...visibleIncidents];
    const visibleNodeIds = new Set(visibleNodesList.map((n) => n.id));

    // 3. Filter edges: both source and target must exist in visible nodes
    const visibleEdgesList = rawEdges.filter((e) => {
      if (!visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)) return false;
      if (!showIncidents && e.type === 'participated') return false;
      return true;
    });

    // 4. Map to physics nodes preserving existing coordinates or generating initial radial layout
    const physicsNodes: PhysicsNode[] = visibleNodesList.map((node, idx) => {
      const existing = nodePositionsRef.current.get(node.id);
      if (existing) {
        return {
          ...node,
          x: existing.x,
          y: existing.y,
          vx: existing.vx || 0,
          vy: existing.vy || 0,
        };
      }

      // Initial placement in radial distribution
      const isSuspect = node.type === 'suspect';
      const angle = (idx / (visibleNodesList.length || 1)) * Math.PI * 2;
      const baseRadius = isSuspect ? 150 + Math.random() * 40 : 230 + Math.random() * 30;
      const initX = width / 2 + Math.cos(angle) * baseRadius;
      const initY = height / 2 + Math.sin(angle) * baseRadius;

      nodePositionsRef.current.set(node.id, { x: initX, y: initY, vx: 0, vy: 0 });

      return {
        ...node,
        x: initX,
        y: initY,
        vx: 0,
        vy: 0,
      };
    });

    setNodes(physicsNodes);
    setEdges(visibleEdgesList);

    // If selected node was filtered out, deselect
    if (selectedNode && !visibleNodeIds.has(selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [rawNodes, rawEdges, filterMode, showIncidents]);

  // Spring-Force physics simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const runPhysics = () => {
      setNodes((prevNodes) => {
        if (prevNodes.length === 0) return prevNodes;
        const nextNodes = prevNodes.map((n) => ({ ...n, vx: n.vx * 0.85, vy: n.vy * 0.85 }));

        // 1. Repulsion between all nodes
        for (let i = 0; i < nextNodes.length; i++) {
          for (let j = i + 1; j < nextNodes.length; j++) {
            const n1 = nextNodes[i];
            const n2 = nextNodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            const minSep = n1.type === 'suspect' && n2.type === 'suspect' ? 200 : 150;
            if (dist < minSep) {
              const force = (minSep - dist) * 0.04;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (n1.id !== dragNodeIdRef.current) {
                nextNodes[i].vx -= fx;
                nextNodes[i].vy -= fy;
              }
              if (n2.id !== dragNodeIdRef.current) {
                nextNodes[j].vx += fx;
                nextNodes[j].vy += fy;
              }
            }
          }
        }

        // 2. Attraction along edges
        edges.forEach((edge) => {
          const sourceNode = nextNodes.find((n) => n.id === edge.source);
          const targetNode = nextNodes.find((n) => n.id === edge.target);

          if (sourceNode && targetNode) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const desiredDist = edge.type === 'comparsa' ? 120 : edge.type === 'coautoria' ? 130 : 160;
            const force = (dist - desiredDist) * 0.03;

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (sourceNode.id !== dragNodeIdRef.current) {
              sourceNode.vx += fx;
              sourceNode.vy += fy;
            }
            if (targetNode.id !== dragNodeIdRef.current) {
              targetNode.vx += fx;
              targetNode.vy += fy;
            }
          }
        });

        // 3. Gravity center attraction and window bounding
        nextNodes.forEach((n) => {
          if (n.id === dragNodeIdRef.current) return;

          n.vx += (width / 2 - n.x) * 0.005;
          n.vy += (height / 2 - n.y) * 0.005;

          n.x += n.vx;
          n.y += n.vy;

          n.x = Math.max(50, Math.min(width - 50, n.x));
          n.y = Math.max(50, Math.min(height - 50, n.y));

          // Save position
          nodePositionsRef.current.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy });
        });

        return nextNodes;
      });

      requestRef.current = requestAnimationFrame(runPhysics);
    };

    requestRef.current = requestAnimationFrame(runPhysics);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [edges, nodes.length]);

  // Handle Dragging
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    dragNodeIdRef.current = nodeId;
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragNodeIdRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === dragNodeIdRef.current) {
          nodePositionsRef.current.set(n.id, { x: mouseX, y: mouseY, vx: 0, vy: 0 });
          return { ...n, x: mouseX, y: mouseY, vx: 0, vy: 0 };
        }
        return n;
      })
    );
  };

  const handleMouseUpOrLeave = () => {
    dragNodeIdRef.current = null;
  };

  const handleNodeClick = (node: PhysicsNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    if (onSelectNode) {
      onSelectNode(node.id, node.type);
    }
  };

  const handleEdgeClick = (edge: NetworkEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  const handleResetPositions = () => {
    nodePositionsRef.current.clear();
    setNodes((prev) =>
      prev.map((n, idx) => {
        const isSuspect = n.type === 'suspect';
        const angle = (idx / (prev.length || 1)) * Math.PI * 2;
        const baseRadius = isSuspect ? 150 : 230;
        const x = width / 2 + Math.cos(angle) * baseRadius;
        const y = height / 2 + Math.sin(angle) * baseRadius;
        nodePositionsRef.current.set(n.id, { x, y, vx: 0, vy: 0 });
        return { ...n, x, y, vx: 0, vy: 0 };
      })
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mb-4"></div>
        <p className="text-slate-400 font-medium">Renderizando vínculos criminais e inteligência de rede...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-900 text-red-200 rounded-lg">
        <p className="font-semibold mb-2">Erro ao carregar mapa de rede:</p>
        <p className="text-sm">{error}</p>
        <button onClick={fetchGraphData} className="mt-4 px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded text-xs transition">
          Tentar Novamente
        </button>
      </div>
    );
  }

  const currentVisibleSuspectsCount = nodes.filter((n) => n.type === 'suspect').length;
  const currentVisibleIncidentsCount = nodes.filter((n) => n.type === 'incident').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
      {/* Network Graph Stage */}
      <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden relative flex flex-col shadow-inner">
        {/* Graph Header */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Share2 className="text-amber-500 w-5 h-5" />
              <h3 className="font-bold text-slate-100 text-sm md:text-base">
                Grafo de Vínculos & Inteligência Policial
              </h3>
            </div>

            {/* Tactical Legend */}
            <div className="flex items-center flex-wrap gap-2.5 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-200"></span> Infrator
              </span>
              <span className="flex items-center gap-1.5 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                <span className="w-2.5 h-2.5 rounded bg-red-600"></span> Fato Delituoso (B.O.)
              </span>
              <span className="flex items-center gap-1.5 bg-slate-950/70 px-2 py-0.5 rounded border border-amber-900/50 text-amber-300 text-[11px]">
                <span className="w-3 h-1 bg-amber-500 rounded"></span> Co-autoria
              </span>
              <span className="flex items-center gap-1.5 bg-slate-950/70 px-2 py-0.5 rounded border border-blue-900/50 text-blue-300 text-[11px]">
                <span className="w-3 h-1 bg-blue-500 rounded"></span> Comparsa
              </span>
            </div>
          </div>

          {/* Tactical Filters Toolbar - Despoluição e Filtro de Gangues */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
            {/* Gang Filtration Buttons */}
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 uppercase tracking-wider">
                <Filter className="w-3 h-3 text-amber-400" /> Filtro:
              </span>

              {/* Botão: Apenas Infratores com Gangue (Padrão) */}
              <button
                type="button"
                onClick={() => setFilterMode('gang_only')}
                className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  filterMode === 'gang_only'
                    ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
                }`}
                title="Exibe somente infratores vinculados a facções ou gangues criminosas (modo despoluído)"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Apenas com Gangue</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    filterMode === 'gang_only' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {countGang}
                </span>
              </button>

              {/* Botão: Infratores sem gangue */}
              <button
                type="button"
                onClick={() => setFilterMode('no_gang')}
                className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  filterMode === 'no_gang'
                    ? 'bg-blue-600 text-white shadow-blue-600/20'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
                }`}
                title="Exibe apenas investigados sem gangue ou sem vínculo formal registrado"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Infratores sem gangue</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    filterMode === 'no_gang' ? 'bg-slate-950 text-blue-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {countNoGang}
                </span>
              </button>

              {/* Seletor de Gangue Específica (caso existam facções cadastradas) */}
              {availableGangs.length > 0 && (
                <select
                  value={availableGangs.includes(filterMode) ? filterMode : ''}
                  onChange={(e) => {
                    if (e.target.value) setFilterMode(e.target.value);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold bg-slate-900 border text-slate-200 outline-none cursor-pointer transition ${
                    availableGangs.includes(filterMode)
                      ? 'border-amber-500 text-amber-300 bg-amber-950/40'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                  title="Filtrar por facção específica"
                >
                  <option value="" disabled>
                    Facção específica...
                  </option>
                  {availableGangs.map((gang) => (
                    <option key={gang} value={gang}>
                      {gang}
                    </option>
                  ))}
                </select>
              )}

              {/* Botão: Todos */}
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer border ${
                  filterMode === 'all'
                    ? 'bg-slate-700 text-white border-slate-600 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800'
                }`}
                title="Exibir todos os investigados (sem filtragem)"
              >
                Todos ({totalSuspects})
              </button>
            </div>

            {/* Right Controls: Toggle B.O. nodes & Reorganize */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowIncidents(!showIncidents)}
                className={`px-2.5 py-1 rounded text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                  showIncidents
                    ? 'bg-red-950/60 text-red-300 border-red-900/80 hover:bg-red-900/60'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title={showIncidents ? 'Ocultar nós de B.O. (fatos delituosos) para visualização mais limpa' : 'Exibir nós de B.O.'}
              >
                {showIncidents ? <Eye className="w-3.5 h-3.5 text-red-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                <span>B.O.s: {showIncidents ? 'Visíveis' : 'Ocultos'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetPositions}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                title="Reorganizar e re-centralizar os nós do grafo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reorganizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Graph SVG canvas */}
        <div ref={containerRef} className="flex-grow min-h-[500px] bg-slate-950 relative cursor-grab active:cursor-grabbing">
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
              <ShieldAlert className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-slate-300 font-bold text-sm mb-1">
                {filterMode === 'gang_only'
                  ? 'Nenhum infrator cadastrado com gangue/facção no momento.'
                  : filterMode === 'no_gang'
                  ? 'Nenhum infrator sem gangue cadastrado.'
                  : 'Nenhum nó disponível com os filtros atuais.'}
              </p>
              <p className="text-slate-500 text-xs max-w-sm mb-4">
                {filterMode === 'gang_only'
                  ? 'Você pode visualizar os infratores sem gangue ou vincular facções aos investigados na aba Banco de Investigados.'
                  : 'Ajuste os filtros acima para visualizar a inteligência de rede.'}
              </p>
              {filterMode === 'gang_only' && countNoGang > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode('no_gang')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition cursor-pointer shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Ver Infratores sem gangue ({countNoGang})</span>
                </button>
              )}
            </div>
          ) : null}

          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className="absolute inset-0 w-full h-full"
          >
            {/* Draw Links/Edges */}
            {edges.map((edge, idx) => {
              const source = nodes.find((n) => n.id === edge.source);
              const target = nodes.find((n) => n.id === edge.target);
              if (!source || !target) return null;

              const isHighlighted =
                hoveredNode === edge.source ||
                hoveredNode === edge.target ||
                (selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target));

              const isSelected = selectedEdge === edge;

              // Bezier curve calculations for better visual overlap handling
              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;

              return (
                <g key={`edge-${idx}`} className="cursor-pointer" onClick={() => handleEdgeClick(edge)}>
                  {/* Invisible wide track to make clicking links easy */}
                  <path
                    d={`M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="14"
                  />
                  {/* Active link path */}
                  <path
                    d={`M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`}
                    fill="none"
                    stroke={isSelected ? '#f59e0b' : edge.color}
                    strokeWidth={isSelected ? 4 : isHighlighted ? 2.8 : edge.width || 1.8}
                    strokeDasharray={edge.type === 'participated' ? '4 3' : undefined}
                    opacity={isHighlighted || isSelected ? 1.0 : hoveredNode ? 0.15 : 0.75}
                    className="transition-all duration-200"
                  />
                  {/* Link Label on Hover/Select */}
                  {(isHighlighted || isSelected) && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-55"
                        y="-10"
                        width="110"
                        height="20"
                        rx="4"
                        fill="#0f172a"
                        stroke={isSelected ? '#f59e0b' : '#334155'}
                        strokeWidth="1"
                      />
                      <text
                        fill="#f1f5f9"
                        fontSize="9"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontWeight="600"
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Draw Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isHighlighted = hoveredNode === node.id || (selectedNode && selectedNode.id === node.id);
              const isDimmed =
                hoveredNode &&
                hoveredNode !== node.id &&
                !edges.some(
                  (e) =>
                    (e.source === node.id && e.target === hoveredNode) ||
                    (e.target === node.id && e.source === hoveredNode)
                );

              const hasGangAffiliation = node.type === 'suspect' && isSuspectInGang(node.gang, node.has_gang);
              const gangLabel = node.type === 'suspect' ? getDisplayGangName(node.gang, node.has_gang) : '';

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="transition-all duration-100"
                  onMouseDown={(e) => handleMouseDown(node.id, e)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => handleNodeClick(node)}
                  opacity={isDimmed ? 0.3 : 1.0}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Selection Ring */}
                  <circle
                    r={node.type === 'suspect' ? 28 : 22}
                    fill="none"
                    stroke={isSelected ? '#f59e0b' : isHighlighted ? '#3b82f6' : 'transparent'}
                    strokeWidth="3"
                    className="animate-pulse"
                  />

                  {/* Outer circle base */}
                  <circle
                    r={node.type === 'suspect' ? 22 : 16}
                    fill={node.type === 'suspect' ? (hasGangAffiliation ? '#1e1b4b' : '#1e293b') : '#7f1d1d'}
                    stroke={
                      node.type === 'suspect'
                        ? hasGangAffiliation
                          ? '#f59e0b'
                          : '#64748b'
                        : '#b91c1c'
                    }
                    strokeWidth={hasGangAffiliation ? '2.5' : '2'}
                    className="shadow-md"
                  />

                  {/* Suspect Photo inside Node, or Icon */}
                  {node.type === 'suspect' && node.foto_url ? (
                    <g>
                      <clipPath id={`clip-${node.id}`}>
                        <circle r="20" />
                      </clipPath>
                      <image
                        href={node.foto_url}
                        x="-20"
                        y="-20"
                        width="40"
                        height="40"
                        clipPath={`url(#clip-${node.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </g>
                  ) : (
                    <g>
                      {node.type === 'suspect' ? (
                        <path
                          d="M -6 6 A 6 6 0 0 1 6 6 M -3 -3 A 3 3 0 0 1 3 -3"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      ) : (
                        <rect x="-5" y="-5" width="10" height="10" fill="#ffffff" />
                      )}
                    </g>
                  )}

                  {/* Node Warning badge for active warrants */}
                  {node.type === 'suspect' && node.mandado && (
                    <circle cx="15" cy="-15" r="7" fill="#ef4444" stroke="#0f172a" strokeWidth="1.5" />
                  )}
                  {node.type === 'suspect' && node.mandado && (
                    <text x="15" y="-13" fill="#ffffff" fontSize="8" textAnchor="middle" fontWeight="bold">
                      W
                    </text>
                  )}

                  {/* Suspect / Incident primary name pill */}
                  <rect
                    x="-65"
                    y={node.type === 'suspect' ? 26 : 20}
                    width="130"
                    height="16"
                    rx="3"
                    fill="#0f172a"
                    fillOpacity="0.9"
                    stroke={isSelected ? '#f59e0b' : '#334155'}
                    strokeWidth="0.8"
                  />
                  <text
                    y={node.type === 'suspect' ? 37 : 31}
                    fill={node.type === 'suspect' ? '#f8fafc' : '#fecaca'}
                    fontSize="9"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {node.label.length > 20 ? `${node.label.slice(0, 18)}...` : node.label}
                  </text>

                  {/* Secondary Gang Pill underneath name (Apenas para infratores) */}
                  {node.type === 'suspect' && (
                    <g transform="translate(0, 44)">
                      <rect
                        x="-60"
                        y="0"
                        width="120"
                        height="14"
                        rx="3"
                        fill={hasGangAffiliation ? '#451a03' : '#18181b'}
                        stroke={hasGangAffiliation ? '#f59e0b' : '#52525b'}
                        strokeWidth="0.8"
                      />
                      <text
                        y="10"
                        fill={hasGangAffiliation ? '#fbbf24' : '#a1a1aa'}
                        fontSize="8"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {hasGangAffiliation
                          ? (gangLabel.length > 18 ? `${gangLabel.slice(0, 16)}...` : `🛡️ ${gangLabel}`)
                          : 'Infratores sem gangue'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Sync & Stats Footer */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>
                Exibindo: <strong className="text-slate-200">{currentVisibleSuspectsCount}</strong> infratores
                {showIncidents ? ` • ${currentVisibleIncidentsCount} B.O.s vinculados` : ''}
              </span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-[11px]">
              Modo:{' '}
              <strong className="text-amber-400">
                {filterMode === 'gang_only'
                  ? 'Apenas Integrantes de Gangue'
                  : filterMode === 'no_gang'
                  ? 'Infratores sem gangue'
                  : filterMode === 'all'
                  ? 'Todos os Infratores'
                  : `Facção: ${filterMode}`}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchGraphData}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded shadow-sm transition cursor-pointer"
            >
              Sincronizar Grafo
            </button>
          </div>
        </div>
      </div>

      {/* Network Graph Inspector Sidebar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col shadow-md">
        <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-1.5">
          <Users className="w-4 h-4" /> Inspetor de Vínculos
        </h3>

        {!selectedNode && !selectedEdge ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
            <Users className="w-12 h-12 text-slate-700 mb-3" />
            <p className="text-slate-400 text-sm">
              Selecione um suspeito, ocorrência ou linha de ligação no grafo para inspecionar os detalhes da inteligência criminal.
            </p>
          </div>
        ) : selectedNode ? (
          <div className="flex-grow flex flex-col justify-between">
            <div>
              {/* Suspect / Incident Profile view */}
              <div className="flex items-center gap-3 mb-4">
                {selectedNode.type === 'suspect' && selectedNode.foto_url ? (
                  <img
                    src={selectedNode.foto_url}
                    alt={selectedNode.label}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-700"
                  />
                ) : (
                  <div
                    className={`p-3 rounded-full ${
                      selectedNode.type === 'suspect' ? 'bg-slate-800 text-slate-100' : 'bg-red-950 text-red-400'
                    }`}
                  >
                    {selectedNode.type === 'suspect' ? <Users className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                )}
                <div className="overflow-hidden">
                  <h4 className="font-bold text-slate-100 text-base truncate">{selectedNode.label}</h4>
                  <p className="text-xs text-slate-400 capitalize">
                    Categoria: {selectedNode.type === 'suspect' ? 'Infrator Investigado' : 'Fato Delituoso (B.O.)'}
                  </p>
                </div>
              </div>

              {selectedNode.type === 'suspect' ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Organização / Facção:</span>
                    {isSuspectInGang(selectedNode.gang, selectedNode.has_gang) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 rounded text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-700">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {selectedNode.gang}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 rounded text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        <UserX className="w-3.5 h-3.5 text-zinc-400" />
                        Infratores sem gangue
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Nível de Perigo:</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold mt-0.5 ${
                        selectedNode.periculosidade === 'Extrema'
                          ? 'bg-red-950 text-red-400 border border-red-900'
                          : selectedNode.periculosidade === 'Alta'
                          ? 'bg-red-900/60 text-red-200'
                          : selectedNode.periculosidade === 'Média'
                          ? 'bg-amber-950 text-amber-400'
                          : 'bg-emerald-950 text-emerald-400'
                      }`}
                    >
                      {selectedNode.periculosidade?.toUpperCase() || 'MÉDIA'}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Mandado de Prisão:</span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold mt-0.5 ${
                        selectedNode.mandado
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {selectedNode.mandado ? 'CONSTATADO ATIVO' : 'NENHUM REGISTRO'}
                    </span>
                  </div>

                  {/* Connected Suspects / Co-authors */}
                  {(() => {
                    const connectedEdges = edges.filter(
                      (e) =>
                        (e.source === selectedNode.id || e.target === selectedNode.id) &&
                        (e.type === 'coautoria' || e.type === 'comparsa')
                    );

                    if (connectedEdges.length === 0) return null;

                    return (
                      <div className="mt-4 pt-3 border-t border-slate-800">
                        <span className="text-xs font-bold text-amber-400 uppercase block mb-2">
                          Infratores Vinculados ({connectedEdges.length}):
                        </span>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {connectedEdges.map((e, idx) => {
                            const otherId = e.source === selectedNode.id ? e.target : e.source;
                            const otherNode = nodes.find((n) => n.id === otherId);
                            if (!otherNode) return null;

                            return (
                              <div
                                key={idx}
                                onClick={() => handleNodeClick(otherNode)}
                                className="p-2 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded flex items-center justify-between gap-2 cursor-pointer transition"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  {otherNode.foto_url ? (
                                    <img
                                      src={otherNode.foto_url}
                                      alt={otherNode.label}
                                      className="w-7 h-7 rounded-full object-cover border border-slate-700 flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xs flex-shrink-0">
                                      <Users className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                  <div className="truncate">
                                    <p className="text-xs font-semibold text-slate-200 truncate">{otherNode.label}</p>
                                    <span className="text-[10px] text-amber-400 font-mono block">
                                      {e.type === 'coautoria' ? '📋 ' + e.label : '🔗 Comparsa'}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-slate-400 hover:text-amber-300">Ver ➔</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Tipificação Penal:</span>
                    <span className="text-slate-200 font-medium">{selectedNode.tipificacao || 'Não cadastrado'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Data e Hora:</span>
                    <span className="text-slate-300 text-xs">
                      {selectedNode.data ? new Date(selectedNode.data).toLocaleString('pt-BR') : 'Não cadastrado'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-800 pt-4">
              {selectedNode.type === 'suspect' && (
                <button
                  type="button"
                  onClick={() => openSuspectDossier(selectedNode.id, selectedNode)}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center justify-center gap-1.5 transition uppercase shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <FileDown className="w-4 h-4 stroke-[2.5]" /> Extrair Ficha do Infrator em PDF
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedEdge.color }}></div>
              <h4 className="font-bold text-slate-100 text-base capitalize">
                {selectedEdge.type === 'coautoria'
                  ? 'Co-autoria em Registro Policial'
                  : selectedEdge.type === 'comparsa'
                  ? 'Elo de Comparsaria'
                  : 'Ligação Delitiva'}
              </h4>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block uppercase">Grau / Vínculo:</span>
              <span className="text-slate-200 font-medium">{selectedEdge.label}</span>
            </div>

            {selectedEdge.description && (
              <div>
                <span className="text-xs font-semibold text-slate-400 block uppercase">Relatório de Inteligência & B.O.s:</span>
                <div className="text-slate-300 text-xs mt-1 bg-slate-950 p-2.5 rounded border border-slate-800 leading-relaxed whitespace-pre-line font-sans">
                  {selectedEdge.description}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
