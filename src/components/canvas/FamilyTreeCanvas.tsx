import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  BackgroundVariant,
  NodeChange,
  applyNodeChanges,
  useReactFlow,
  ReactFlowProvider,
  Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { FamilyMember } from '../../types/family';
import { buildFlowElements, HighlightDirection } from '../../utils/treeLayout';
import { FamilyNode } from './FamilyNode';
import { SpouseEdge } from './SpouseEdge';
import { ParentChildBranchEdge } from './ParentChildBranchEdge';
import { CanvasControls } from './CanvasControls';
import { toPng } from 'html-to-image';
import { X } from 'lucide-react';

interface FamilyTreeCanvasProps {
  members: FamilyMember[];
  selectedMemberId: string | null;
  onSelectMember: (member: FamilyMember | null) => void;
  onOpenDetail: (member: FamilyMember) => void;
  onUpdateMemberPosition: (id: string, position: { x: number; y: number }) => void;
  onAddSpouse: (member: FamilyMember) => void;
  onAddChild: (member: FamilyMember) => void;
  onAddParent: (member: FamilyMember) => void;
  onAddSibling: (member: FamilyMember) => void;
  onEdit: (member: FamilyMember) => void;
  onDelete: (member: FamilyMember) => void;
  onAddMemberDirect: () => void;
  treeTitle: string;
  isMinimapVisible: boolean;
  onToggleMinimap: () => void;
  exportTrigger: number;
  onExportComplete: () => void;
  onToast?: (msg: string) => void;
}

const nodeTypes = {
  familyNode: FamilyNode as any,
};

const edgeTypes = {
  spouseEdge: SpouseEdge as any,
  parentChildBranchEdge: ParentChildBranchEdge as any,
};

const CanvasInner: React.FC<FamilyTreeCanvasProps> = ({
  members,
  selectedMemberId,
  onSelectMember,
  onOpenDetail,
  onUpdateMemberPosition,
  onAddSpouse,
  onAddChild,
  onAddParent,
  onAddSibling,
  onEdit,
  onDelete,
  onAddMemberDirect,
  treeTitle,
  isMinimapVisible,
  onToggleMinimap,
  exportTrigger,
  onExportComplete,
  onToast,
}) => {
  const { zoomIn, zoomOut, fitView, setViewport, getViewport } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDraggingNode, setIsDraggingNode] = useState<boolean>(false);
  const [highlightDirection, setHighlightDirection] = useState<HighlightDirection>('ancestors');

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId),
    [members, selectedMemberId]
  );

  // Smart default direction based on whether selected member has parents or children
  useEffect(() => {
    if (!selectedMemberId) return;
    const member = members.find((m) => m.id === selectedMemberId);
    if (!member) return;
    if ((!member.parentIds || member.parentIds.length === 0) && member.childrenIds && member.childrenIds.length > 0) {
      setHighlightDirection('descendants');
    } else if (member.parentIds && member.parentIds.length > 0 && (!member.childrenIds || member.childrenIds.length === 0)) {
      setHighlightDirection('ancestors');
    }
  }, [selectedMemberId, members]);

  // Generate nodes and edges with callbacks and relationship highlight direction
  const { nodes: initialNodes, edges } = useMemo(() => {
    return buildFlowElements(
      members,
      selectedMemberId,
      {
        onSelect: (m) => onSelectMember(m),
        onOpenDetail,
        onAddSpouse,
        onAddChild,
        onAddParent,
        onAddSibling,
        onEdit,
        onDelete,
      },
      isDraggingNode,
      highlightDirection
    );
  }, [
    members,
    selectedMemberId,
    onSelectMember,
    onOpenDetail,
    onAddSpouse,
    onAddChild,
    onAddParent,
    onAddSibling,
    onEdit,
    onDelete,
    isDraggingNode,
    highlightDirection,
  ]);

  // Local nodes state ensures 60fps/120fps smooth hardware dragging on touch/mobile
  const [nodes, setNodes] = useState<any[]>(initialNodes);

  // Sync internal nodes when initialNodes changes from props (only when not actively dragging)
  useEffect(() => {
    if (!isDraggingNode) {
      setNodes(initialNodes);
    }
  }, [initialNodes, isDraggingNode]);

  const onNodeDragStart = useCallback(() => {
    setIsDraggingNode(true);
  }, []);

  // Update local node positions instantly without serializing localStorage on every pointer event
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  const onNodeDragStop = useCallback(
    (_event: any, node: any) => {
      setIsDraggingNode(false);
      if (!node || !node.id || !node.position) return;

      const CARD_W = 150;
      const CARD_H = 160;
      const MIN_GAP = 24;

      // Automatic card collision separation to maintain >= 20px safe distance
      let adjustedX = node.position.x;
      let adjustedY = node.position.y;

      for (const m of members) {
        if (m.id === node.id) continue;
        const dx = adjustedX - m.position.x;
        const dy = adjustedY - m.position.y;

        const overlapX = CARD_W + MIN_GAP - Math.abs(dx);
        const overlapY = CARD_H + MIN_GAP - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            adjustedX += dx >= 0 ? overlapX : -overlapX;
          } else {
            adjustedY += dy >= 0 ? overlapY : -overlapY;
          }
        }
      }

      const finalPos = {
        x: Math.round(adjustedX),
        y: Math.round(adjustedY),
      };

      setNodes((nds) =>
        nds.map((n) => (n.id === node.id ? { ...n, position: finalPos } : n))
      );

      // Commit to parent dataset upon drag finish
      onUpdateMemberPosition(node.id, finalPos);
    },
    [members, onUpdateMemberPosition]
  );

  const handlePaneClick = useCallback(() => {
    onSelectMember(null);
  }, [onSelectMember]);

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 250 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 250 });
  }, [zoomOut]);

  const handleResetZoom = useCallback(() => {
    setViewport({ x: 100, y: 80, zoom: 1 }, { duration: 300 });
  }, [setViewport]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 400 });
  }, [fitView]);

  const onViewportChange = useCallback((viewport: Viewport) => {
    setZoomLevel(viewport.zoom);
  }, []);

  // Handle Export to PNG
  useEffect(() => {
    if (exportTrigger === 0) return;

    const performExport = async () => {
      try {
        if (!reactFlowWrapper.current) return;
        const viewportElement = reactFlowWrapper.current.querySelector(
          '.react-flow__viewport'
        ) as HTMLElement;

        if (!viewportElement) {
          onToast?.('Tidak dapat memproses ekspor canvas.');
          onExportComplete();
          return;
        }

        // Fit view temporarily or capture
        const dataUrl = await toPng(viewportElement, {
          backgroundColor: '#fafafa',
          quality: 0.95,
          pixelRatio: 2,
        });

        const link = document.createElement('a');
        const cleanTitle = (treeTitle || 'pohon-keluarga')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-');
        link.download = `${cleanTitle}-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = dataUrl;
        link.click();
        onToast?.('Gambar pohon keluarga berhasil diekspor!');
      } catch (err) {
        console.error('Failed to export PNG:', err);
        onToast?.('Gagal mengekspor gambar. Silakan coba kembali.');
      } finally {
        onExportComplete();
      }
    };

    performExport();
  }, [exportTrigger, treeTitle, onExportComplete, onToast]);

  // Initial fit view on mount handled cleanly via fitViewOptions on ReactFlow
  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative bg-neutral-50 touch-none select-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={handlePaneClick}
        onViewportChange={onViewportChange}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2.5}
        panOnDrag={true}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        preventScrolling={true}
        zoomOnPinch={true}
        zoomOnScroll={true}
        zoomOnDoubleClick={false}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
        className="touch-none select-none"
      >
        {/* Subtle ultra-thin grid background as requested */}
        <Background
          variant={BackgroundVariant.Lines}
          gap={28}
          size={0.5}
          color="rgba(0, 0, 0, 0.035)"
        />

        {/* Minimap toggle */}
        {isMinimapVisible && (
          <MiniMap
            zoomable
            pannable
            nodeColor="#d4d4d4"
            maskColor="rgba(245, 245, 245, 0.7)"
            className="!bottom-20 !right-6 !bg-white !border !border-neutral-200 !rounded-xl !shadow-md overflow-hidden"
          />
        )}
      </ReactFlow>

      {/* Floating Relationship Highlight Controller */}
      {selectedMember && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-neutral-200/90 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-neutral-700 animate-in fade-in slide-in-from-top-3 duration-200 select-none max-w-[94vw]">
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-neutral-900 max-w-[90px] sm:max-w-[130px] truncate" title={selectedMember.fullName}>
              {selectedMember.fullName}
            </span>
          </div>

          <div className="h-4 w-px bg-neutral-200 shrink-0" />

          {/* Direction Segmented Toggle Buttons */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl text-xs font-medium shrink-0">
            <button
              onClick={() => setHighlightDirection('ancestors')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-xs ${
                highlightDirection === 'ancestors'
                  ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              title="Tampilkan silsilah ke atas (Orang tua, kakek, nenek...)"
            >
              <span>⬆️</span>
              <span className="hidden sm:inline">Leluhur</span>
              <span className="sm:hidden">Atas</span>
            </button>
            <button
              onClick={() => setHighlightDirection('descendants')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-xs ${
                highlightDirection === 'descendants'
                  ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
              title="Tampilkan garis keturunan ke bawah (Anak, cucu...)"
            >
              <span>⬇️</span>
              <span className="hidden sm:inline">Keturunan</span>
              <span className="sm:hidden">Bawah</span>
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-200 shrink-0" />

          {/* Clear highlight button */}
          <button
            onClick={() => onSelectMember(null)}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors shrink-0"
            title="Hapus highlight (atau klik area kosong kanvas)"
            aria-label="Tutup highlight"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Canvas Controls */}
      <CanvasControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onResetZoom={handleResetZoom}
        isMinimapVisible={isMinimapVisible}
        onToggleMinimap={onToggleMinimap}
        zoomLevel={zoomLevel}
      />

      {/* Empty State Banner if no members */}
      {members.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 backdrop-blur-xs border border-neutral-200 rounded-2xl p-8 max-w-sm text-center shadow-lg pointer-events-auto">
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              Pohon Keluarga Masih Kosong
            </h3>
            <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
              Mulai membuat silsilah dengan menambahkan anggota keluarga pertama Anda.
            </p>
            <button
              onClick={onAddMemberDirect}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors"
            >
              + Tambah Anggota Pertama
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const FamilyTreeCanvas: React.FC<FamilyTreeCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
};
