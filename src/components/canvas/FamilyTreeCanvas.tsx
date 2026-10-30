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
import { buildFlowElements } from '../../utils/treeLayout';
import { FamilyNode } from './FamilyNode';
import { SpouseEdge } from './SpouseEdge';
import { ParentChildBranchEdge } from './ParentChildBranchEdge';
import { CanvasControls } from './CanvasControls';
import { toPng } from 'html-to-image';

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

  const onNodeDragStart = useCallback(() => {
    setIsDraggingNode(true);
  }, []);

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
      let hadCollision = false;

      for (const m of members) {
        if (m.id === node.id) continue;
        const dx = adjustedX - m.position.x;
        const dy = adjustedY - m.position.y;

        const overlapX = CARD_W + MIN_GAP - Math.abs(dx);
        const overlapY = CARD_H + MIN_GAP - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          hadCollision = true;
          if (overlapX < overlapY) {
            adjustedX += dx >= 0 ? overlapX : -overlapX;
          } else {
            adjustedY += dy >= 0 ? overlapY : -overlapY;
          }
        }
      }

      if (hadCollision) {
        onUpdateMemberPosition(node.id, {
          x: Math.round(adjustedX),
          y: Math.round(adjustedY),
        });
      }
    },
    [members, onUpdateMemberPosition]
  );

  // Generate nodes and edges with callbacks
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
      isDraggingNode
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
  ]);

  // Node position drag handler
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.id) {
          onUpdateMemberPosition(change.id, change.position);
        }
      });
    },
    [onUpdateMemberPosition]
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
    <div ref={reactFlowWrapper} className="w-full h-full relative bg-neutral-50">
      <ReactFlow
        nodes={initialNodes}
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
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
        className="touch-none"
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
