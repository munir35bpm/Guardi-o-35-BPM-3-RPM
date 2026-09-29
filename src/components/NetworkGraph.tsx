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
  Filter,
  Crosshair,
  BookOpen,
  Copy,
  Check,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  CircleDot,
  Network
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

export function normalizeGangDisplayName(name?: string): string {
  if (!name) return '';
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  // Short uppercase acronyms (<= 5 chars, no spaces, like "PCC", "CV", "ADA", "TCP")
  if (trimmed.length <= 5 && trimmed === trimmed.toUpperCase() && !trimmed.includes(' ')) {
    return trimmed;
  }

  // If already mixed case (e.g. "Gangue 31 de Janeiro"), preserve it
  const isAllUpper = trimmed === trimmed.toUpperCase();
  const isAllLower = trimmed === trimmed.toLowerCase();
  if (!isAllUpper && !isAllLower) {
    return trimmed;
  }

  // Format Title Case with lowercase Portuguese prepositions
  const lowercaseWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas', 'por', 'com']);
  const words = trimmed.toLowerCase().split(' ');
  return words
    .map((word, idx) => {
      if (idx > 0 && lowercaseWords.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function getDisplayGangName(gang?: string, has_gang?: boolean): string {
  if (isSuspectInGang(gang, has_gang)) {
    return normalizeGangDisplayName(gang);
  }
  return 'Infratores sem gangue';
}

export function getFactionColorTheme(gang?: string, has_gang?: boolean) {
  if (!isSuspectInGang(gang, has_gang)) {
    return {
      border: '#64748b',
      fill: '#1e293b',
      text: '#94a3b8',
      halo: 'rgba(100, 116, 139, 0.25)',
      badgeBg: '#1e293b',
      badgeText: '#cbd5e1'
    };
  }
  const clean = (gang || '').toLowerCase();
  if (clean.includes('31 de janeiro')) {
    return {
      border: '#f59e0b',
      fill: '#451a03',
      text: '#fbbf24',
      halo: 'rgba(245, 158, 11, 0.35)',
      badgeBg: '#451a03',
      badgeText: '#fde68a'
    };
  }
  if (clean.includes('muleta')) {
    return {
      border: '#10b981',
      fill: '#064e3b',
      text: '#34d399',
      halo: 'rgba(16, 185, 129, 0.35)',
      badgeBg: '#064e3b',
      badgeText: '#a7f3d0'
    };
  }
  if (clean.includes('correntinha')) {
    return {
      border: '#ec4899',
      fill: '#500724',
      text: '#f472b6',
      halo: 'rgba(236, 72, 153, 0.35)',
      badgeBg: '#500724',
      badgeText: '#fbcfe8'
    };
  }
  return {
    border: '#8b5cf6',
    fill: '#2e1065',
    text: '#a78bfa',
    halo: 'rgba(139, 92, 246, 0.35)',
    badgeBg: '#2e1065',
    badgeText: '#ddd6fe'
  };
}

function parseSuspectLabel(label: string) {
  // Extract Name and Vulgo: "NOME COMPLETO (VULGO)"
  const match = label.match(/^(.+?)\s*\((.+?)\)$/);
  if (match) {
    return {
      nome: match[1].trim(),
      vulgo: match[2].trim(),
    };
  }
  return { nome: label, vulgo: '' };
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

  // View Mode:
  // 'clean' -> Only investigated suspects + direct co-authorship & comparsa ties (Default & Recommended)
  // 'bridges' -> Suspects + only B.O.s that connect 2 or more suspects (shared crime bridges)
  // 'all' -> Full mode with all B.O.s (compact representation)
  const [viewMode, setViewMode] = useState<'clean' | 'bridges' | 'all'>('clean');

  // Filter settings: 'gang_only' is active by default
  const [filterMode, setFilterMode] = useState<'gang_only' | 'no_gang' | 'all' | string>('gang_only');

  // Zoom and Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Inspector state
  const [incidentExposureMode, setIncidentExposureMode] = useState<'geral' | 'modus_operandi'>('geral');
  const [copiedClipboard, setCopiedClipboard] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragNodeIdRef = useRef<string | null>(null);
  const requestRef = useRef<number | null>(null);
  const nodePositionsRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());

  const width = 1000;
  const height = 620;

  const handleCopyModusOperandi = (boNum: string, tip: string, mo: string, hist: string) => {
    const text = `INFORMAÇÃO POLICIAL - B.O. ${boNum}\nTipificação: ${tip}\n\n[MODUS OPERANDI]\n${mo || 'Não informado'}\n\n[RESUMO DO HISTÓRICO]\n${hist || 'Não informado'}`;
    navigator.clipboard.writeText(text);
    setCopiedClipboard(true);
    setTimeout(() => setCopiedClipboard(false), 2500);
  };

  const enrichIncidentNode = (n: any): NetworkNode => {
    const inGang = isSuspectInGang(n.gang, n.has_gang);
    const nodeData = { ...n };
    if (nodeData.type === 'incident') {
      const matchOc = (db.ocorrencias_criminais || []).find(
        (o) =>
          o.id === n.id ||
          o.numero_bo === n.id ||
          (n.numero_bo && o.numero_bo === n.numero_bo) ||
          (n.label && o.numero_bo && n.label.includes(o.numero_bo))
      );
      if (matchOc) {
        nodeData.numero_bo = nodeData.numero_bo || matchOc.numero_bo;
        nodeData.modus_operandi = nodeData.modus_operandi || matchOc.modus_operandi;
        nodeData.descricao_fato = nodeData.descricao_fato || matchOc.descricao_fato;
        nodeData.armas_utilizadas = nodeData.armas_utilizadas || matchOc.armas_utilizadas;
        nodeData.veiculo_utilizado = nodeData.veiculo_utilizado || matchOc.veiculo_utilizado;
        nodeData.tipificacao = nodeData.tipificacao || matchOc.tipificacao_penal;
        nodeData.data = nodeData.data || matchOc.data_hora;
      }
    }
    return {
      ...nodeData,
      gang: inGang ? normalizeGangDisplayName(n.gang) : 'Infratores sem gangue',
      has_gang: inGang,
    };
  };

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

      const fetchedNodes: NetworkNode[] = (graphData.nodes || []).map(enrichIncidentNode);
      const fetchedEdges: NetworkEdge[] = graphData.edges || [];

      setRawNodes(fetchedNodes);
      setRawEdges(fetchedEdges);
    } catch (err: any) {
      console.warn('Erro ao processar dados do grafo:', err);
      const fallbackData = db.getNetworkGraph();
      const fetchedNodes: NetworkNode[] = fallbackData.nodes.map(enrichIncidentNode);
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

  // Compute available distinct gangs (strictly deduplicated case-insensitively) and counters
  const { availableGangs, countGang, countNoGang, totalSuspects } = useMemo(() => {
    const suspectNodes = rawNodes.filter((n) => n.type === 'suspect');
    const withGang = suspectNodes.filter((n) => isSuspectInGang(n.gang, n.has_gang));
    const withoutGang = suspectNodes.filter((n) => !isSuspectInGang(n.gang, n.has_gang));

    // Map lowercase key -> canonical display name and count
    const gangMap = new Map<string, { canonical: string; count: number }>();

    withGang.forEach((n) => {
      if (n.gang && n.gang !== 'Infratores sem gangue') {
        const raw = n.gang.trim().replace(/\s+/g, ' ');
        const lowerKey = raw.toLowerCase();
        const normalized = normalizeGangDisplayName(raw);

        const existing = gangMap.get(lowerKey);
        if (!existing) {
          gangMap.set(lowerKey, { canonical: normalized, count: 1 });
        } else {
          existing.count += 1;
          const currentIsAllUpper = existing.canonical === existing.canonical.toUpperCase();
          const currentIsAllLower = existing.canonical === existing.canonical.toLowerCase();
          const newIsAllUpper = normalized === normalized.toUpperCase();
          const newIsAllLower = normalized === normalized.toLowerCase();

          if ((currentIsAllUpper || currentIsAllLower) && (!newIsAllUpper && !newIsAllLower)) {
            existing.canonical = normalized;
          }
        }
      }
    });

    const distinctGangs = Array.from(gangMap.values())
      .map((item) => item.canonical)
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    return {
      availableGangs: distinctGangs,
      countGang: withGang.length,
      countNoGang: withoutGang.length,
      totalSuspects: suspectNodes.length,
    };
  }, [rawNodes]);

  // Compute B.O. count for each suspect
  const suspectBoCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rawEdges.forEach((e) => {
      if (e.type === 'participated') {
        counts.set(e.source, (counts.get(e.source) || 0) + 1);
        counts.set(e.target, (counts.get(e.target) || 0) + 1);
      }
    });
    return counts;
  }, [rawEdges]);

  // Filter visible nodes and edges whenever raw data, filter modes, or viewMode changes
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
      const targetGang = filterMode.trim().replace(/\s+/g, ' ').toLowerCase();
      const suspectGang = (n.gang || '').trim().replace(/\s+/g, ' ').toLowerCase();
      return suspectGang === targetGang;
    });

    const visibleSuspectIds = new Set(visibleSuspects.map((s) => s.id));

    // 2. Filter incidents based on viewMode
    let visibleIncidents: NetworkNode[] = [];
    if (viewMode === 'bridges') {
      // Only incidents that connect 2 or more visible suspects (Shared Crime Bridges)
      const incidentSuspectCount = new Map<string, number>();
      rawEdges.forEach((e) => {
        if (e.type === 'participated') {
          if (visibleSuspectIds.has(e.source)) {
            incidentSuspectCount.set(e.target, (incidentSuspectCount.get(e.target) || 0) + 1);
          }
          if (visibleSuspectIds.has(e.target)) {
            incidentSuspectCount.set(e.source, (incidentSuspectCount.get(e.source) || 0) + 1);
          }
        }
      });

      visibleIncidents = rawNodes.filter(
        (n) => n.type === 'incident' && (incidentSuspectCount.get(n.id) || 0) >= 2
      );
    } else if (viewMode === 'all') {
      // All incidents connected to at least one visible suspect
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
    } else {
      // 'clean' mode: ZERO incident nodes! Pure, uncluttered suspect network
      visibleIncidents = [];
    }

    const visibleNodesList = [...visibleSuspects, ...visibleIncidents];
    const visibleNodeIds = new Set(visibleNodesList.map((n) => n.id));

    // 3. Filter edges
    const visibleEdgesList = rawEdges.filter((e) => {
      if (!visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)) return false;
      if (viewMode === 'clean' && e.type === 'participated') return false;
      return true;
    });

    // 4. Map to physics nodes preserving existing coordinates or generating layout
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
      const baseRadius = isSuspect ? 180 + Math.random() * 40 : 280 + Math.random() * 30;
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
  }, [rawNodes, rawEdges, filterMode, viewMode]);

  // Spring-Force physics simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const runPhysics = () => {
      setNodes((prevNodes) => {
        if (prevNodes.length === 0) return prevNodes;
        const nextNodes = prevNodes.map((n) => ({ ...n, vx: n.vx * 0.86, vy: n.vy * 0.86 }));

        // 1. Repulsion between all nodes (increased spacing to prevent collision)
        for (let i = 0; i < nextNodes.length; i++) {
          for (let j = i + 1; j < nextNodes.length; j++) {
            const n1 = nextNodes[i];
            const n2 = nextNodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy || 1;
            const dist = Math.sqrt(distSq);

            const minSep = n1.type === 'suspect' && n2.type === 'suspect' ? 240 : 160;
            if (dist < minSep) {
              const force = (minSep - dist) * 0.045;
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
            const desiredDist = edge.type === 'coautoria' ? 170 : edge.type === 'comparsa' ? 180 : 130;
            const force = (dist - desiredDist) * 0.025;

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

          n.vx += (width / 2 - n.x) * 0.004;
          n.vy += (height / 2 - n.y) * 0.004;

          n.x += n.vx;
          n.y += n.vy;

          n.x = Math.max(70, Math.min(width - 70, n.x));
          n.y = Math.max(70, Math.min(height - 70, n.y));

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

  // Handle Dragging Node
  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dragNodeIdRef.current = nodeId;
  };

  // Handle Canvas Pan & Drag
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If clicking background, start pan
    if (e.button === 0 && !dragNodeIdRef.current) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    // 1. Pan canvas
    if (isPanningRef.current) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    // 2. Drag specific node
    if (dragNodeIdRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;

      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.id === dragNodeIdRef.current) {
            nodePositionsRef.current.set(n.id, { x: mouseX, y: mouseY, vx: 0, vy: 0 });
            return { ...n, x: mouseX, y: mouseY, vx: 0, vy: 0 };
          }
          return n;
        })
      );
    }
  };

  const handleMouseUpOrLeave = () => {
    dragNodeIdRef.current = null;
    isPanningRef.current = false;
  };

  // Handle Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(2.5, Math.max(0.5, prev * zoomFactor)));
  };

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(1)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(1)));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
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

  // Layout 1: Force Dynamic Reorganization
  const handleResetPositions = () => {
    nodePositionsRef.current.clear();
    setNodes((prev) =>
      prev.map((n, idx) => {
        const isSuspect = n.type === 'suspect';
        const angle = (idx / (prev.length || 1)) * Math.PI * 2;
        const baseRadius = isSuspect ? 180 : 270;
        const x = width / 2 + Math.cos(angle) * baseRadius;
        const y = height / 2 + Math.sin(angle) * baseRadius;
        nodePositionsRef.current.set(n.id, { x, y, vx: 0, vy: 0 });
        return { ...n, x, y, vx: 0, vy: 0 };
      })
    );
  };

  // Layout 2: Clean Circular Orbit (Zero Collision)
  const handleLayoutCircular = () => {
    nodePositionsRef.current.clear();
    const suspectNodes = nodes.filter((n) => n.type === 'suspect');
    const incidentNodes = nodes.filter((n) => n.type === 'incident');

    const newMap = new Map<string, { x: number; y: number }>();

    suspectNodes.forEach((n, idx) => {
      const angle = (idx / (suspectNodes.length || 1)) * Math.PI * 2 - Math.PI / 2;
      const x = width / 2 + Math.cos(angle) * (width * 0.34);
      const y = height / 2 + Math.sin(angle) * (height * 0.34);
      newMap.set(n.id, { x, y });
    });

    incidentNodes.forEach((n, idx) => {
      const angle = (idx / (incidentNodes.length || 1)) * Math.PI * 2 - Math.PI / 2;
      const x = width / 2 + Math.cos(angle) * (width * 0.44);
      const y = height / 2 + Math.sin(angle) * (height * 0.44);
      newMap.set(n.id, { x, y });
    });

    setNodes((prev) =>
      prev.map((n) => {
        const pos = newMap.get(n.id);
        if (pos) {
          nodePositionsRef.current.set(n.id, { x: pos.x, y: pos.y, vx: 0, vy: 0 });
          return { ...n, x: pos.x, y: pos.y, vx: 0, vy: 0 };
        }
        return n;
      })
    );
  };

  // Layout 3: Clean Clustering by Faction
  const handleLayoutByFaction = () => {
    nodePositionsRef.current.clear();
    const suspectNodes = nodes.filter((n) => n.type === 'suspect');
    const incidentNodes = nodes.filter((n) => n.type === 'incident');

    // Group suspects by faction
    const groups = new Map<string, PhysicsNode[]>();
    suspectNodes.forEach((s) => {
      const faction = isSuspectInGang(s.gang, s.has_gang)
        ? normalizeGangDisplayName(s.gang)
        : 'Infratores sem gangue';
      if (!groups.has(faction)) groups.set(faction, []);
      groups.get(faction)!.push(s);
    });

    const newMap = new Map<string, { x: number; y: number }>();
    const groupKeys = Array.from(groups.keys());

    groupKeys.forEach((key, gIdx) => {
      const groupAngle = (gIdx / (groupKeys.length || 1)) * Math.PI * 2 - Math.PI / 2;
      const groupRadius = groupKeys.length === 1 ? 0 : 210;
      const centerX = width / 2 + Math.cos(groupAngle) * groupRadius;
      const centerY = height / 2 + Math.sin(groupAngle) * (groupRadius * 0.85);

      const members = groups.get(key)!;
      members.forEach((m, mIdx) => {
        if (members.length === 1) {
          newMap.set(m.id, { x: centerX, y: centerY });
        } else {
          const mAngle = (mIdx / members.length) * Math.PI * 2;
          const mRadius = 75 + members.length * 6;
          const x = centerX + Math.cos(mAngle) * mRadius;
          const y = centerY + Math.sin(mAngle) * mRadius;
          newMap.set(m.id, { x, y });
        }
      });
    });

    // Place incidents on the outer perimeter
    incidentNodes.forEach((inc, idx) => {
      const angle = (idx / (incidentNodes.length || 1)) * Math.PI * 2;
      const x = width / 2 + Math.cos(angle) * (width * 0.45);
      const y = height / 2 + Math.sin(angle) * (height * 0.44);
      newMap.set(inc.id, { x, y });
    });

    setNodes((prev) =>
      prev.map((n) => {
        const pos = newMap.get(n.id);
        if (pos) {
          nodePositionsRef.current.set(n.id, { x: pos.x, y: pos.y, vx: 0, vy: 0 });
          return { ...n, x: pos.x, y: pos.y, vx: 0, vy: 0 };
        }
        return n;
      })
    );
  };

  // Find matching full incident from database for maximum data richness
  const matchingIncident = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'incident') return null;
    return (
      (db.ocorrencias_criminais || []).find(
        (o) =>
          o.id === selectedNode.id ||
          o.numero_bo === selectedNode.id ||
          (selectedNode.numero_bo && o.numero_bo === selectedNode.numero_bo) ||
          (selectedNode.label && o.numero_bo && selectedNode.label.includes(o.numero_bo))
      ) || null
    );
  }, [selectedNode]);

  // Connected suspects in this incident
  const connectedIncidentSuspects = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'incident') return [];
    return edges
      .filter(
        (e) =>
          (e.source === selectedNode.id || e.target === selectedNode.id) &&
          e.type === 'participated'
      )
      .map((e) => {
        const suspectId = e.source === selectedNode.id ? e.target : e.source;
        const suspectNode = nodes.find((n) => n.id === suspectId) || rawNodes.find((n) => n.id === suspectId);
        return {
          id: suspectId,
          suspectNode,
          papel: e.label || 'Autor / Envolvido',
        };
      })
      .filter((item) => Boolean(item.suspectNode));
  }, [selectedNode, edges, nodes, rawNodes]);

  // Extract all B.O.s of selected suspect from database
  const selectedSuspectBos = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'suspect') return [];
    return db.infrator_ocorrencia
      .filter((io) => io.infrator_id === selectedNode.id)
      .map((io) => {
        const oc = db.ocorrencias_criminais.find((o) => o.id === io.ocorrencia_id);
        return {
          id: io.ocorrencia_id,
          numero_bo: oc?.numero_bo || io.ocorrencia_id,
          tipificacao: oc?.tipificacao_penal || 'Ocorrência Criminal',
          data_hora: oc?.data_hora || '',
          papel: io.papel_no_crime || 'Autor',
          modus_operandi: oc?.modus_operandi || '',
          descricao_fato: oc?.descricao_fato || '',
        };
      });
  }, [selectedNode]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-slate-900 border border-slate-800 rounded-lg">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mb-4"></div>
        <p className="text-slate-400 font-medium">Carregando inteligência de vínculos e rede criminal...</p>
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
  const currentCoautoriaLinksCount = edges.filter((e) => e.type === 'coautoria').length;

  const incidentBoNumber =
    selectedNode?.numero_bo || matchingIncident?.numero_bo || selectedNode?.label?.split(' - ')[0] || 'S/N';
  const incidentTipificacao =
    selectedNode?.tipificacao || matchingIncident?.tipificacao_penal || 'Não informada';
  const incidentDataHora =
    selectedNode?.data || matchingIncident?.data_hora;
  const incidentModusOperandi =
    selectedNode?.modus_operandi || matchingIncident?.modus_operandi || '';
  const incidentDescricaoFato =
    selectedNode?.descricao_fato || matchingIncident?.descricao_fato || '';
  const incidentArmas =
    selectedNode?.armas_utilizadas || matchingIncident?.armas_utilizadas || '';
  const incidentVeiculo =
    selectedNode?.veiculo_utilizado || matchingIncident?.veiculo_utilizado || '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
      {/* Network Graph Stage */}
      <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative flex flex-col shadow-2xl">
        {/* Graph Header: Main bar */}
        <div className="p-4 bg-slate-900/95 border-b border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm md:text-base flex items-center gap-2">
                  Grafo de Vínculos & Inteligência Policial
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                    35º BPM
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Cruzamento tático de co-autorias em crimes e alianças de comparsaria
                </p>
              </div>
            </div>

            {/* Tactical Legend: Clean & Clear */}
            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-amber-900/40 text-amber-300 text-[11px] font-medium shadow-sm">
                <span className="w-3 h-1 bg-amber-500 rounded"></span> ⚡ Co-autoria em B.O.s
              </span>
              <span className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-blue-900/40 text-blue-300 text-[11px] font-medium shadow-sm">
                <span className="w-3 h-1 bg-blue-500 rounded"></span> 🔗 Elo de Comparsa
              </span>
              {viewMode !== 'clean' && (
                <span className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-red-900/40 text-red-300 text-[11px] font-medium shadow-sm">
                  <span className="w-2.5 h-2.5 rounded bg-red-600"></span> Fato Delituoso (B.O.)
                </span>
              )}
            </div>
          </div>

          {/* Mode Switcher: Clean vs Pontes vs Completo */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            {/* View Mode Segmented Controls */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Visualização:</span>
              
              <button
                type="button"
                onClick={() => setViewMode('clean')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'clean'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="Modo Clean: Exibe apenas os investigados e as ligações diretas de co-autoria e comparsaria. Sem poluição visual."
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Modo Clean (Infratores)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-slate-950/20">
                  Recomendado
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('bridges')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'bridges'
                    ? 'bg-slate-800 text-amber-300 border border-amber-600/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="Exibe os investigados e apenas os B.O.s que possuem co-autoria comprovada (pontes de ligação)."
              >
                <Network className="w-3.5 h-3.5 text-amber-400" />
                <span>Pontes de Crimes</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'all'
                    ? 'bg-slate-800 text-red-300 border border-red-900/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title="Exibe todos os nós de B.O. cadastrados no sistema em formato compacto."
              >
                <Layers className="w-3.5 h-3.5 text-red-400" />
                <span>Todos os B.O.s</span>
              </button>
            </div>

            {/* Layout Presets (Disposição Inteligente) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleLayoutByFaction}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Agrupar investigados por facção criminosa em setores espaciais organizados"
              >
                <CircleDot className="w-3.5 h-3.5 text-amber-400" />
                <span>Por Facção</span>
              </button>

              <button
                type="button"
                onClick={handleLayoutCircular}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-blue-300 border border-slate-700 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Distribuir investigados em anel circular limpo (matriz anti-colisão)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                <span>Circular</span>
              </button>

              <button
                type="button"
                onClick={handleResetPositions}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer shadow-sm"
                title="Recalcular simulação de física de forças elásticas"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                <span>Força</span>
              </button>
            </div>
          </div>

          {/* Sub Toolbar: Filtros de Gangue */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 uppercase tracking-wider">
                <Filter className="w-3 h-3 text-amber-400" /> Filtro:
              </span>

              {/* Botão: Apenas Infratores com Gangue */}
              <button
                type="button"
                onClick={() => setFilterMode('gang_only')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  filterMode === 'gang_only'
                    ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
                }`}
                title="Exibe somente infratores vinculados a facções ou gangues criminosas"
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
                className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  filterMode === 'no_gang'
                    ? 'bg-blue-600 text-white shadow-blue-600/20'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
                }`}
                title="Exibe apenas investigados sem gangue ou sem vínculo formal registrado"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Sem gangue</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    filterMode === 'no_gang' ? 'bg-slate-950 text-blue-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {countNoGang}
                </span>
              </button>

              {/* Seletor de Gangue Específica (sem duplicidade de maiúsculas/minúsculas) */}
              {availableGangs.length > 0 && (
                <select
                  value={
                    availableGangs.find(
                      (g) => g.toLowerCase() === filterMode.trim().toLowerCase()
                    ) || ''
                  }
                  onChange={(e) => {
                    if (e.target.value) setFilterMode(e.target.value);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-900 border text-slate-200 outline-none cursor-pointer transition ${
                    availableGangs.some(
                      (g) => g.toLowerCase() === filterMode.trim().toLowerCase()
                    )
                      ? 'border-amber-500 text-amber-300 bg-amber-950/40'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                  title="Filtrar por facção específica (lista consolidada sem duplicidades)"
                >
                  <option value="" disabled>
                    Facção específica...
                  </option>
                  {availableGangs.map((gang) => {
                    const count = rawNodes.filter(
                      (n) =>
                        n.type === 'suspect' &&
                        (n.gang || '').trim().toLowerCase() === gang.trim().toLowerCase()
                    ).length;
                    return (
                      <option key={gang} value={gang}>
                        {gang} {count > 0 ? `(${count})` : ''}
                      </option>
                    );
                  })}
                </select>
              )}

              {/* Botão: Todos */}
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer border ${
                  filterMode === 'all'
                    ? 'bg-slate-700 text-white border-slate-600 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800'
                }`}
                title="Exibir todos os investigados (sem filtragem)"
              >
                Todos ({totalSuspects})
              </button>
            </div>

            {/* Hint Badge */}
            <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Dica: Arraste o fundo para mover • Scroll para Zoom</span>
            </div>
          </div>
        </div>

        {/* Graph SVG canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleCanvasMouseDown}
          className={`flex-grow min-h-[520px] bg-slate-950 relative overflow-hidden select-none ${
            isPanningRef.current ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
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

          {/* Floating Zoom & Canvas Controls */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 shadow-xl backdrop-blur-sm">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer"
              title="Aumentar Zoom (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1 min-w-[34px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer"
              title="Diminuir Zoom (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-slate-700 mx-0.5"></div>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer"
              title="Centralizar e redefinir zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onWheel={handleWheel}
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              {/* Subtle background dot grid pattern */}
              <pattern id="grid-dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#1e293b" opacity="0.6" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width={width} height={height} fill="url(#grid-dots)" />

            {/* Main Zoom/Pan Container Group */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
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

                // Midpoint for curve and badge
                const midX = (source.x + target.x) / 2;
                const midY = (source.y + target.y) / 2;

                const isCoautoria = edge.type === 'coautoria';
                const isComparsa = edge.type === 'comparsa';

                return (
                  <g key={`edge-${idx}`} className="cursor-pointer" onClick={() => handleEdgeClick(edge)}>
                    {/* Invisible wide track to make clicking easy */}
                    <path
                      d={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="16"
                    />

                    {/* Active link stroke */}
                    <path
                      d={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                      fill="none"
                      stroke={isSelected ? '#f59e0b' : isCoautoria ? '#f59e0b' : isComparsa ? '#3b82f6' : '#ef4444'}
                      strokeWidth={isSelected ? 4 : isHighlighted ? 3.5 : isCoautoria ? 3 : isComparsa ? 2.4 : 1.2}
                      strokeDasharray={edge.type === 'participated' ? '4 3' : undefined}
                      opacity={isHighlighted || isSelected ? 1.0 : hoveredNode ? 0.15 : isCoautoria ? 0.95 : isComparsa ? 0.85 : 0.4}
                      className="transition-all duration-200"
                    />

                    {/* Edge Center Badge (⚡ Co-autoria or 🔗 Comparsa) */}
                    {(isCoautoria || isComparsa || isHighlighted || isSelected) && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x={isCoautoria ? -46 : -38}
                          y="-9"
                          width={isCoautoria ? 92 : 76}
                          height="18"
                          rx="9"
                          fill="#090d16"
                          stroke={isSelected ? '#f59e0b' : isCoautoria ? '#d97706' : '#2563eb'}
                          strokeWidth="1.2"
                          className="shadow-sm"
                        />
                        <text
                          fill={isCoautoria ? '#fef3c7' : '#dbeafe'}
                          fontSize="8.5"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontWeight="700"
                        >
                          {isCoautoria ? `⚡ ${edge.label}` : `🔗 ${edge.label}`}
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
                const theme = getFactionColorTheme(node.gang, node.has_gang);
                const parsed = parseSuspectLabel(node.label);
                const boCount = suspectBoCounts.get(node.id) || 0;

                // SUSPECT NODE RENDERING (Super clean, spacious, professional)
                if (node.type === 'suspect') {
                  const displayVulgo = parsed.vulgo || parsed.nome.split(' ').slice(0, 2).join(' ');
                  const displayName = parsed.vulgo ? parsed.nome : '';

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className="transition-all duration-100"
                      onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => handleNodeClick(node)}
                      opacity={isDimmed ? 0.2 : 1.0}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Selection & Halo Ring */}
                      <circle
                        r="32"
                        fill={isHighlighted ? theme.halo : 'transparent'}
                        stroke={isSelected ? '#f59e0b' : isHighlighted ? '#3b82f6' : 'transparent'}
                        strokeWidth="3.5"
                        strokeDasharray={isSelected ? '4 2' : undefined}
                      />

                      {/* Main Node Background Circle */}
                      <circle
                        r="25"
                        fill={theme.fill}
                        stroke={theme.border}
                        strokeWidth={hasGangAffiliation ? '3' : '2'}
                        className="shadow-lg"
                      />

                      {/* Suspect Photo inside Node */}
                      {node.foto_url ? (
                        <g>
                          <clipPath id={`clip-${node.id}`}>
                            <circle r="23" />
                          </clipPath>
                          <image
                            href={node.foto_url}
                            x="-23"
                            y="-23"
                            width="46"
                            height="46"
                            clipPath={`url(#clip-${node.id})`}
                            preserveAspectRatio="xMidYMid slice"
                          />
                        </g>
                      ) : (
                        <g>
                          <path
                            d="M -7 7 A 7 7 0 0 1 7 7 M -3.5 -3.5 A 3.5 3.5 0 0 1 3.5 -3.5"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.2"
                          />
                        </g>
                      )}

                      {/* Top Right Warning Badge: Active Arrest Warrant (W) */}
                      {node.mandado && (
                        <g transform="translate(18, -18)">
                          <circle r="8.5" fill="#ef4444" stroke="#090d16" strokeWidth="2" />
                          <text y="3" fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="900">
                            !
                          </text>
                        </g>
                      )}

                      {/* Top Left Badge: B.O. Count Chip */}
                      {boCount > 0 && (
                        <g transform="translate(-18, -18)">
                          <circle r="7.5" fill="#334155" stroke="#090d16" strokeWidth="1.5" />
                          <text y="2.5" fill="#f8fafc" fontSize="7.5" textAnchor="middle" fontWeight="bold">
                            {boCount}
                          </text>
                        </g>
                      )}

                      {/* Clean Suspect Label Card (Underneath avatar) */}
                      <g transform="translate(0, 31)">
                        {/* Primary Label Pill */}
                        <rect
                          x="-58"
                          y="0"
                          width="116"
                          height={displayName ? "28" : "18"}
                          rx="5"
                          fill="#090d16"
                          fillOpacity="0.94"
                          stroke={isSelected ? '#f59e0b' : theme.border}
                          strokeWidth={isSelected ? '1.5' : '1'}
                          className="shadow-md"
                        />

                        {/* Line 1: Vulgo / Primary Identifier */}
                        <text
                          y={displayName ? "11" : "12"}
                          fill="#f8fafc"
                          fontSize="9.5"
                          fontWeight="800"
                          textAnchor="middle"
                        >
                          {displayVulgo.length > 16 ? `${displayVulgo.slice(0, 14)}...` : displayVulgo}
                        </text>

                        {/* Line 2: Real Name (smaller, if vulgo exists) */}
                        {displayName && (
                          <text
                            y="22"
                            fill="#94a3b8"
                            fontSize="7.5"
                            fontWeight="500"
                            textAnchor="middle"
                          >
                            {displayName.length > 20 ? `${displayName.slice(0, 18)}...` : displayName}
                          </text>
                        )}

                        {/* Line 3: Faction Badge */}
                        <g transform={`translate(0, ${displayName ? 32 : 22})`}>
                          <rect
                            x="-52"
                            y="0"
                            width="104"
                            height="13"
                            rx="3"
                            fill={theme.badgeBg}
                            stroke={theme.border}
                            strokeWidth="0.8"
                          />
                          <text
                            y="9"
                            fill={theme.badgeText}
                            fontSize="7.5"
                            fontWeight="700"
                            textAnchor="middle"
                          >
                            {hasGangAffiliation
                              ? (gangLabel.length > 18 ? `${gangLabel.slice(0, 16)}...` : `🛡️ ${gangLabel}`)
                              : 'Sem gangue'}
                          </text>
                        </g>
                      </g>
                    </g>
                  );
                }

                // INCIDENT (B.O.) NODE RENDERING (Compact, sleek, zero overlapping rectangles)
                const isBridge = (connectedIncidentSuspects || []).length >= 2;
                const shortBo = node.numero_bo?.slice(-7) || node.label.slice(0, 8);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="transition-all duration-100"
                    onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => handleNodeClick(node)}
                    opacity={isDimmed ? 0.2 : 0.95}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Selection Ring */}
                    <circle
                      r="18"
                      fill="none"
                      stroke={isSelected ? '#f59e0b' : isHighlighted ? '#ef4444' : 'transparent'}
                      strokeWidth="2.5"
                    />

                    {/* Small Node Circle */}
                    <circle
                      r="12"
                      fill="#7f1d1d"
                      stroke="#ef4444"
                      strokeWidth="1.8"
                      className="shadow-sm"
                    />

                    {/* Tiny Document Icon in Center */}
                    <rect x="-3" y="-4" width="6" height="8" rx="1" fill="#ffffff" />

                    {/* Compact B.O. Badge (Only on hover or compact tag to avoid massive collisions) */}
                    {(isHighlighted || isSelected || viewMode === 'bridges') && (
                      <g transform="translate(0, 16)">
                        <rect
                          x="-32"
                          y="0"
                          width="64"
                          height="14"
                          rx="3"
                          fill="#090d16"
                          fillOpacity="0.95"
                          stroke={isSelected ? '#f59e0b' : '#ef4444'}
                          strokeWidth="0.8"
                        />
                        <text
                          y="10"
                          fill="#fecaca"
                          fontSize="7.5"
                          fontWeight="700"
                          textAnchor="middle"
                        >
                          B.O. ...{shortBo}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Sync & Stats Footer */}
        <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>
                Exibindo: <strong className="text-slate-200">{currentVisibleSuspectsCount}</strong> investigados
                {currentCoautoriaLinksCount > 0 && (
                  <> • <strong className="text-amber-400">{currentCoautoriaLinksCount}</strong> vínculos de co-autoria</>
                )}
                {viewMode !== 'clean' && currentVisibleIncidentsCount > 0 && (
                  <> • <strong className="text-red-400">{currentVisibleIncidentsCount}</strong> B.O.s no grafo</>
                )}
              </span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-[11px]">
              Visualização:{' '}
              <strong className="text-amber-400">
                {viewMode === 'clean'
                  ? '✨ Modo Clean (Rede de Infratores)'
                  : viewMode === 'bridges'
                  ? '🔗 Pontes de Crimes (Co-autorias)'
                  : '🌐 Todos os B.O.s'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchGraphData}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-md shadow-sm transition cursor-pointer"
            >
              Sincronizar Grafo
            </button>
          </div>
        </div>
      </div>

      {/* Network Graph Inspector Sidebar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col shadow-xl">
        <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2.5 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" /> Inspetor de Vínculos
          </span>
          {selectedNode && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
              {selectedNode.type === 'suspect' ? 'Infrator' : 'B.O.'}
            </span>
          )}
        </h3>

        {!selectedNode && !selectedEdge ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="p-4 rounded-full bg-slate-950 border border-slate-800 text-slate-600">
              <Share2 className="w-8 h-8" />
            </div>
            <p className="text-slate-300 font-medium text-xs">Nenhum elemento selecionado</p>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs">
              Clique em um <strong className="text-slate-300">investigado</strong> para consultar sua ficha e histórico, ou em uma <strong className="text-amber-400">linha de co-autoria</strong> para inspecionar os crimes cometidos em conjunto.
            </p>
          </div>
        ) : selectedNode ? (
          <div className="flex-grow flex flex-col justify-between space-y-4">
            <div>
              {/* Suspect / Incident Profile header */}
              <div className="flex items-center gap-3 mb-4 p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                {selectedNode.type === 'suspect' && selectedNode.foto_url ? (
                  <img
                    src={selectedNode.foto_url}
                    alt={selectedNode.label}
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/60 shadow-md flex-shrink-0"
                  />
                ) : (
                  <div
                    className={`p-3 rounded-full flex-shrink-0 ${
                      selectedNode.type === 'suspect' ? 'bg-slate-800 text-slate-100' : 'bg-red-950 text-red-400'
                    }`}
                  >
                    {selectedNode.type === 'suspect' ? <Users className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                )}
                <div className="overflow-hidden">
                  <h4 className="font-bold text-slate-100 text-sm truncate">{selectedNode.label}</h4>
                  <p className="text-xs text-slate-400 capitalize">
                    {selectedNode.type === 'suspect' ? 'Infrator Investigado' : 'Fato Delituoso (B.O.)'}
                  </p>
                </div>
              </div>

              {selectedNode.type === 'suspect' ? (
                <div className="space-y-3.5 text-sm">
                  {/* Faction */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Organização / Facção:</span>
                    {isSuspectInGang(selectedNode.gang, selectedNode.has_gang) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 rounded text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80">
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

                  {/* Danger and Warrant */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Periculosidade:</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold mt-1 ${
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
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Mandado Ativo:</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold mt-1 ${
                          selectedNode.mandado
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {selectedNode.mandado ? '⚠️ SIM (ATIVO)' : 'NENHUM'}
                      </span>
                    </div>
                  </div>

                  {/* Connected Associates (Co-authors & Comparsas) */}
                  {(() => {
                    const connectedEdges = edges.filter(
                      (e) =>
                        (e.source === selectedNode.id || e.target === selectedNode.id) &&
                        (e.type === 'coautoria' || e.type === 'comparsa')
                    );

                    if (connectedEdges.length === 0) return null;

                    return (
                      <div className="mt-3 pt-3 border-t border-slate-800">
                        <span className="text-[11px] font-bold text-amber-400 uppercase block mb-2 flex items-center justify-between">
                          <span>Infratores Vinculados ({connectedEdges.length}):</span>
                          <span className="text-[10px] text-slate-400 font-normal">Clique para focar</span>
                        </span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {connectedEdges.map((e, idx) => {
                            const otherId = e.source === selectedNode.id ? e.target : e.source;
                            const otherNode = nodes.find((n) => n.id === otherId);
                            if (!otherNode) return null;

                            return (
                              <div
                                key={idx}
                                onClick={() => handleNodeClick(otherNode)}
                                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md flex items-center justify-between gap-2 cursor-pointer transition shadow-sm"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  {otherNode.foto_url ? (
                                    <img
                                      src={otherNode.foto_url}
                                      alt={otherNode.label}
                                      className="w-6 h-6 rounded-full object-cover border border-slate-700 flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xs flex-shrink-0">
                                      <Users className="w-3 h-3" />
                                    </div>
                                  )}
                                  <div className="truncate">
                                    <p className="text-xs font-semibold text-slate-200 truncate">{otherNode.label}</p>
                                    <span className="text-[9.5px] text-amber-400 font-mono block">
                                      {e.type === 'coautoria' ? '⚡ ' + e.label : '🔗 Comparsa'}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-slate-400 hover:text-amber-300">➔</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Registered Incident Reports of this suspect */}
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <span className="text-[11px] font-bold text-slate-300 uppercase block mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-red-400" />
                        Ocorrências / B.O.s ({selectedSuspectBos.length}):
                      </span>
                    </span>

                    {selectedSuspectBos.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-2 bg-slate-950 rounded">
                        Nenhum boletim de ocorrência vinculado registrado.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {selectedSuspectBos.map((bo, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-md text-xs space-y-1 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono font-bold text-red-400 text-[11px] truncate">
                                B.O. {bo.numero_bo}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                                {bo.papel}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-200 text-xs">{bo.tipificacao}</p>
                            {bo.modus_operandi && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 italic pt-0.5">
                                "{bo.modus_operandi}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* INCIDENT INSPECTOR VIEW */
                <div className="space-y-3.5 text-sm">
                  {/* Seletor de Opção de Exposição de Dados */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider mb-1.5">
                      Exposição de Dados:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setIncidentExposureMode('geral')}
                        className={`py-1.5 px-2 rounded font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          incidentExposureMode === 'geral'
                            ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Visualizar dados gerais do Boletim de Ocorrência"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        <span>Dados Gerais</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIncidentExposureMode('modus_operandi')}
                        className={`py-1.5 px-2 rounded font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          incidentExposureMode === 'modus_operandi'
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'text-slate-400 hover:text-amber-400'
                        }`}
                        title="Visualizar Modus Operandi e Resumo do Histórico"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="truncate">Modus Operandi</span>
                      </button>
                    </div>
                  </div>

                  {incidentExposureMode === 'modus_operandi' ? (
                    <div className="space-y-3 pt-1">
                      {/* Modus Operandi */}
                      <div className="bg-slate-950 p-3 rounded-lg border border-amber-900/60 shadow-sm space-y-1.5">
                        <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Crosshair className="w-3.5 h-3.5 text-amber-500" /> Modus Operandi da Ação
                        </span>
                        <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                          {incidentModusOperandi || 'Nenhum modus operandi discriminado.'}
                        </div>
                      </div>

                      {/* Resumo do Histórico */}
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-sm space-y-1.5">
                        <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Resumo dos Fatos
                        </span>
                        <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line max-h-44 overflow-y-auto pr-1">
                          {incidentDescricaoFato || 'Sem histórico narrativo registrado.'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Número do B.O.:</span>
                        <span className="font-mono text-slate-100 font-bold text-xs">{incidentBoNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Tipificação Penal:</span>
                        <span className="text-slate-200 font-semibold text-xs">{incidentTipificacao}</span>
                      </div>
                      {incidentDataHora && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Data / Hora:</span>
                          <span className="text-slate-300 font-mono text-xs">{new Date(incidentDataHora).toLocaleString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Connected suspects in this B.O. */}
                  {connectedIncidentSuspects.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <span className="text-[11px] font-bold text-amber-400 uppercase block mb-2">
                        Infratores Vinculados a este B.O. ({connectedIncidentSuspects.length}):
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {connectedIncidentSuspects.map((item, idx) => {
                          const sNode = item.suspectNode as PhysicsNode;
                          return (
                            <div
                              key={idx}
                              onClick={() => handleNodeClick(sNode)}
                              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md flex items-center justify-between gap-2 cursor-pointer transition shadow-sm"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                {sNode.foto_url ? (
                                  <img
                                    src={sNode.foto_url}
                                    alt={sNode.label}
                                    className="w-6 h-6 rounded-full object-cover border border-slate-700 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-[10px] flex-shrink-0">
                                    <Users className="w-3 h-3" />
                                  </div>
                                )}
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-slate-200 truncate">{sNode.label}</p>
                                  <span className="text-[9.5px] text-amber-400 font-mono block">
                                    {item.papel}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-400 hover:text-amber-300">➔</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions for Selected Node */}
            <div className="mt-4 border-t border-slate-800 pt-3">
              {selectedNode.type === 'suspect' ? (
                <button
                  type="button"
                  onClick={() => openSuspectDossier(selectedNode.id, selectedNode)}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition uppercase shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <FileDown className="w-4 h-4 stroke-[2.5]" /> Extrair Ficha do Infrator em PDF
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    handleCopyModusOperandi(
                      incidentBoNumber,
                      incidentTipificacao,
                      incidentModusOperandi,
                      incidentDescricaoFato
                    )
                  }
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-900/60 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition uppercase shadow-lg shadow-black/40 cursor-pointer"
                >
                  {copiedClipboard ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Modus Operandi Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Modus Operandi & Histórico</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* EDGE INSPECTOR VIEW */
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 mb-2 p-2 bg-slate-950 rounded-lg border border-slate-800">
              <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: selectedEdge.color }}></div>
              <h4 className="font-bold text-slate-100 text-sm">
                {selectedEdge.type === 'coautoria'
                  ? '⚡ Vínculo de Co-autoria em Crimes'
                  : selectedEdge.type === 'comparsa'
                  ? '🔗 Elo de Comparsaria / Parceria'
                  : 'Vínculo Delitivo'}
              </h4>
            </div>

            {/* Infratores Conectados */}
            {(() => {
              const nodeA = nodes.find((n) => n.id === selectedEdge.source);
              const nodeB = nodes.find((n) => n.id === selectedEdge.target);
              if (!nodeA || !nodeB) return null;

              return (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Investigados Conectados:
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <div
                      onClick={() => handleNodeClick(nodeA)}
                      className="flex-1 p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-700/80 cursor-pointer transition text-center"
                    >
                      <p className="text-xs font-bold text-amber-300 truncate">{nodeA.label}</p>
                      <span className="text-[9px] text-slate-400 block truncate">{nodeA.gang || 'Sem gangue'}</span>
                    </div>

                    <span className="text-xs font-bold text-slate-500">↔</span>

                    <div
                      onClick={() => handleNodeClick(nodeB)}
                      className="flex-1 p-2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-700/80 cursor-pointer transition text-center"
                    >
                      <p className="text-xs font-bold text-amber-300 truncate">{nodeB.label}</p>
                      <span className="text-[9px] text-slate-400 block truncate">{nodeB.gang || 'Sem gangue'}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Identificação do Vínculo:</span>
              <span className="text-slate-100 font-semibold text-xs mt-0.5 block">{selectedEdge.label}</span>
            </div>

            {selectedEdge.description && (
              <div>
                <span className="text-[10px] font-bold text-amber-400 block uppercase tracking-wider mb-1">
                  Relatório de Inteligência & B.O.s Compartilhados:
                </span>
                <div className="text-slate-200 text-xs bg-slate-950 p-3 rounded-lg border border-amber-900/40 leading-relaxed whitespace-pre-line font-sans max-h-64 overflow-y-auto">
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
