import React, { useEffect, useState, useRef } from 'react';
import { NetworkNode, NetworkEdge } from '../types';
import { Users, AlertTriangle, FileText, Share2, FileDown } from 'lucide-react';
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

export default function NetworkGraph({ onSelectNode }: NetworkGraphProps) {
  const [nodes, setNodes] = useState<PhysicsNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<PhysicsNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragNodeIdRef = useRef<string | null>(null);
  const requestRef = useRef<number | null>(null);

  const width = 800;
  const height = 500;

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

      // Initialize positions in a circle/radial layout to let the force layout settle nicely
      const physicsNodes = (graphData.nodes || []).map((node: NetworkNode, idx: number) => {
        const angle = (idx / (graphData.nodes.length || 1)) * Math.PI * 2;
        const radius = 150 + Math.random() * 50;
        return {
          ...node,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
        };
      });

      setNodes(physicsNodes);
      setEdges(graphData.edges || []);
    } catch (err: any) {
      console.warn('Erro ao processar dados do grafo:', err);
      const fallbackData = db.getNetworkGraph();
      const physicsNodes = fallbackData.nodes.map((node: NetworkNode, idx: number) => {
        const angle = (idx / fallbackData.nodes.length) * Math.PI * 2;
        const radius = 150 + Math.random() * 50;
        return {
          ...node,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
        };
      });
      setNodes(physicsNodes);
      setEdges(fallbackData.edges);
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

  // Physics loop (Spring-Force simulation)
  useEffect(() => {
    if (nodes.length === 0) return;

    const runPhysics = () => {
      setNodes((prevNodes) => {
        const nextNodes = prevNodes.map((n) => ({ ...n, vx: n.vx * 0.85, vy: n.vy * 0.85 }));

        // 1. Repulsion between all nodes (Electrostatic force)
        for (let i = 0; i < nextNodes.length; i++) {
          for (let j = i + 1; j < nextNodes.length; j++) {
            const n1 = nextNodes[i];
            const n2 = nextNodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            // Minimum separation
            if (dist < 180) {
              const force = (180 - dist) * 0.05;
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

        // 2. Attraction along edges (Hooke's Spring force)
        edges.forEach((edge) => {
          const sourceNode = nextNodes.find((n) => n.id === edge.source);
          const targetNode = nextNodes.find((n) => n.id === edge.target);

          if (sourceNode && targetNode) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const desiredDist = edge.type === 'comparsa' ? 120 : 160;
            const force = (dist - desiredDist) * 0.03;

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (sourceNode.id !== dragNodeIdRef.current) {
              sourceNode.vx += fx;
              sourceNode.vy += fy;
            }
            if (targetNode.id !== dragNodeIdRef.current) {
              targetNode.vx -= fx;
              targetNode.vy -= fy;
            }
          }
        });

        // 3. Gravity center attraction and window bounding
        nextNodes.forEach((n) => {
          if (n.id === dragNodeIdRef.current) return;

          // Pull to center
          n.vx += (width / 2 - n.x) * 0.005;
          n.vy += (height / 2 - n.y) * 0.005;

          // Apply velocity
          n.x += n.vx;
          n.y += n.vy;

          // Bounding box limits
          n.x = Math.max(40, Math.min(width - 40, n.x));
          n.y = Math.max(40, Math.min(height - 40, n.y));
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Network Graph Stage */}
      <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden relative flex flex-col shadow-inner">
        {/* Graph Header */}
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Share2 className="text-amber-500 w-5 h-5" />
            <h3 className="font-semibold text-slate-100">Grafo de Vínculos & Inteligência Policial</h3>
          </div>
          
          {/* Legend */}
          <div className="flex items-center flex-wrap gap-3 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-200"></span> Infrator
            </span>
            <span className="flex items-center gap-1.5 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Fato Delituoso (B.O.)
            </span>
            <span className="flex items-center gap-1.5 bg-slate-950/70 px-2 py-0.5 rounded border border-amber-900/50 text-amber-300">
              <span className="w-3 h-1 bg-amber-500 rounded"></span> B.O. Compartilhado (Co-autoria)
            </span>
            <span className="flex items-center gap-1.5 bg-slate-950/70 px-2 py-0.5 rounded border border-blue-900/50 text-blue-300">
              <span className="w-3 h-1 bg-blue-500 rounded"></span> Vínculo de Inteligência
            </span>
          </div>
        </div>

        {/* Graph SVG canvas */}
        <div ref={containerRef} className="flex-grow min-h-[480px] bg-slate-950 relative cursor-grab active:cursor-grabbing">
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
                  {/* Invisible wide track to make clicking links extremely easy */}
                  <path
                    d={`M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="12"
                  />
                  {/* Active link path */}
                  <path
                    d={`M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`}
                    fill="none"
                    stroke={isSelected ? '#f59e0b' : edge.color}
                    strokeWidth={isSelected ? 4 : isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={edge.type === 'participated' ? '4 3' : undefined}
                    opacity={isHighlighted || isSelected ? 1.0 : hoveredNode ? 0.2 : 0.7}
                    className="transition-all duration-200"
                  />
                  {/* Link Label on Hover/Select */}
                  {(isHighlighted || isSelected) && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-50"
                        y="-10"
                        width="100"
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
              const isDimmed = hoveredNode && hoveredNode !== node.id && !edges.some(
                (e) => (e.source === node.id && e.target === hoveredNode) || (e.target === node.id && e.source === hoveredNode)
              );

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="transition-all duration-100"
                  onMouseDown={(e) => handleMouseDown(node.id, e)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => handleNodeClick(node)}
                  opacity={isDimmed ? 0.35 : 1.0}
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
                    fill={node.type === 'suspect' ? '#1e293b' : '#7f1d1d'}
                    stroke={node.type === 'suspect' ? '#475569' : '#b91c1c'}
                    strokeWidth="2"
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

                  {/* Text label underneath */}
                  <rect
                    x="-60"
                    y={node.type === 'suspect' ? 26 : 20}
                    width="120"
                    height="16"
                    rx="3"
                    fill="#0f172a"
                    fillOpacity="0.85"
                  />
                  <text
                    y={node.type === 'suspect' ? 37 : 31}
                    fill={node.type === 'suspect' ? '#f1f5f9' : '#fecaca'}
                    fontSize="9"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {node.label.length > 18 ? `${node.label.slice(0, 16)}...` : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Sync panel */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <button
            onClick={fetchGraphData}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold rounded shadow-md transition"
          >
            Sincronizar Grafo
          </button>
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
              Selecione um suspeito (círculo azul), ocorrência (círculo vermelho) ou linha de ligação no grafo para ver os detalhes da inteligência criminal.
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
                  <div className={`p-3 rounded-full ${selectedNode.type === 'suspect' ? 'bg-slate-800 text-slate-100' : 'bg-red-950 text-red-400'}`}>
                    {selectedNode.type === 'suspect' ? <Users className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-100 text-base">{selectedNode.label}</h4>
                  <p className="text-xs text-slate-400 capitalize">Categoria: {selectedNode.type === 'suspect' ? 'Infrator Investigado' : 'Fato Delituoso'}</p>
                </div>
              </div>

              {selectedNode.type === 'suspect' ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Organização / Facção:</span>
                    <span className="text-slate-200 font-medium">{selectedNode.gang || 'Nenhuma'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Nível de Perigo:</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      selectedNode.periculosidade === 'Extrema' ? 'bg-red-950 text-red-400 border border-red-900' :
                      selectedNode.periculosidade === 'Alta' ? 'bg-red-900/60 text-red-200' :
                      selectedNode.periculosidade === 'Média' ? 'bg-amber-950 text-amber-400' : 'bg-emerald-950 text-emerald-400'
                    }`}>
                      {selectedNode.periculosidade?.toUpperCase() || 'MÉDIA'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Mandado de Prisão:</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${selectedNode.mandado ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-800 text-slate-400'}`}>
                      {selectedNode.mandado ? 'CONSTATADO ATIVO' : 'NENHUM REGISTRO'}
                    </span>
                  </div>

                  {/* Connected Suspects / Co-authors */}
                  {(() => {
                    const connectedEdges = edges.filter(
                      (e) => (e.source === selectedNode.id || e.target === selectedNode.id) && (e.type === 'coautoria' || e.type === 'comparsa')
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
                                    <img src={otherNode.foto_url} alt={otherNode.label} className="w-7 h-7 rounded-full object-cover border border-slate-700 flex-shrink-0" />
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
                {selectedEdge.type === 'coautoria' ? 'Co-autoria em Registro Policial' : selectedEdge.type === 'comparsa' ? 'Elo de Comparsaria' : 'Ligação Delitiva'}
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
