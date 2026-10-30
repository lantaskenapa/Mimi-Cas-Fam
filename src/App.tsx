/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FamilyMember, FamilyTreeDataset } from './types/family';
import {
  loadSavedTreeData,
  saveTreeData,
  exportTreeToJSON,
  parseImportedJSON,
  DEFAULT_DATASET,
} from './utils/storage';
import { autoArrangeTree } from './utils/treeLayout';
import { TopNavigation } from './components/navigation/TopNavigation';
import { FamilyTreeCanvas } from './components/canvas/FamilyTreeCanvas';
import { SideDetailPanel } from './components/panel/SideDetailPanel';
import { MemberModal } from './components/modal/MemberModal';
import { DeleteConfirmModal } from './components/modal/DeleteConfirmModal';
import { SupabaseModal } from './components/modal/SupabaseModal';
import { loadSupabaseConfig, saveTreeToCloud, loadTreeFromCloud } from './utils/supabase';
import { Check, AlertCircle } from 'lucide-react';

export default function App() {
  const [dataset, setDataset] = useState<FamilyTreeDataset>(() =>
    loadSavedTreeData()
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [relationContext, setRelationContext] = useState<{
    type: 'spouse' | 'child' | 'parent' | 'sibling';
    targetMember: FamilyMember;
  } | null>(null);

  // Export states
  const [exportTrigger, setExportTrigger] = useState(0);
  const [isExportingImage, setIsExportingImage] = useState(false);

  // Toast notification & cloud sync status
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Auto-connect and sync from Supabase Cloud on initial startup
  useEffect(() => {
    const config = loadSupabaseConfig();
    if (config.url && config.anonKey) {
      setCloudSyncStatus('syncing');
      loadTreeFromCloud('default-family-tree', config)
        .then((res) => {
          if (res.success && res.dataset && Array.isArray(res.dataset.members) && res.dataset.members.length > 0) {
            setDataset(res.dataset);
            saveTreeData(res.dataset);
            setCloudSyncStatus('synced');
          } else {
            // First time sync to cloud
            saveTreeToCloud('default-family-tree', dataset, config)
              .then(() => setCloudSyncStatus('synced'))
              .catch(() => setCloudSyncStatus('error'));
          }
        })
        .catch(() => setCloudSyncStatus('error'));
    }
  }, []);

  // Persist to localStorage whenever dataset changes, and auto-sync to Supabase
  useEffect(() => {
    saveTreeData(dataset);
    const config = loadSupabaseConfig();
    if (config.autoSync && config.url && config.anonKey) {
      setCloudSyncStatus('syncing');
      saveTreeToCloud('default-family-tree', dataset, config)
        .then((res) => {
          if (res.success) {
            setCloudSyncStatus('synced');
          } else {
            setCloudSyncStatus('error');
          }
        })
        .catch(() => setCloudSyncStatus('error'));
    }
  }, [dataset]);

  const selectedMember = dataset.members.find((m) => m.id === selectedMemberId) || null;

  // Title Update
  const handleUpdateTitle = (title: string) => {
    setDataset((prev) => ({
      ...prev,
      meta: { ...prev.meta, title },
    }));
    showToast('Nama silsilah diperbarui');
  };

  // Node position update from canvas dragging
  const handleUpdateMemberPosition = useCallback(
    (id: string, position: { x: number; y: number }) => {
      setDataset((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.id === id ? { ...m, position } : m
        ),
      }));
    },
    []
  );

  // Auto arrange tree
  const handleAutoArrange = () => {
    if (dataset.members.length === 0) return;
    const arranged = autoArrangeTree(dataset.members);
    setDataset((prev) => ({
      ...prev,
      members: arranged,
    }));
    showToast('Pohon keluarga berhasil dirapikan otomatis');
  };

  // Open modal for direct new member
  const handleAddNewMember = () => {
    setModalMode('create');
    setRelationContext(null);
    setIsModalOpen(true);
  };

  // Open modal for spouse
  const handleAddSpouse = (targetMember: FamilyMember) => {
    setModalMode('create');
    setRelationContext({ type: 'spouse', targetMember });
    setIsModalOpen(true);
  };

  // Open modal for child
  const handleAddChild = (targetMember: FamilyMember) => {
    setModalMode('create');
    setRelationContext({ type: 'child', targetMember });
    setIsModalOpen(true);
  };

  // Open modal for parent
  const handleAddParent = (targetMember: FamilyMember) => {
    setModalMode('create');
    setRelationContext({ type: 'parent', targetMember });
    setIsModalOpen(true);
  };

  // Open modal for sibling
  const handleAddSibling = (targetMember: FamilyMember) => {
    setModalMode('create');
    setRelationContext({ type: 'sibling', targetMember });
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleEditMember = (member: FamilyMember) => {
    setSelectedMemberId(member.id);
    setModalMode('edit');
    setRelationContext(null);
    setIsModalOpen(true);
  };

  // Delete member: opens custom in-app confirmation modal
  const handleDeleteMember = (member: FamilyMember) => {
    setMemberToDelete(member);
  };

  const performDeleteMember = (member: FamilyMember) => {
    setDataset((prev) => {
      const remaining = prev.members
        .filter((m) => m.id !== member.id)
        .map((m) => ({
          ...m,
          spouseIds: m.spouseIds.filter((id) => id !== member.id),
          parentIds: m.parentIds.filter((id) => id !== member.id),
          childrenIds: m.childrenIds.filter((id) => id !== member.id),
        }));

      // Automatically re-arrange remaining members so layout stays balanced without holes
      const arranged = autoArrangeTree(remaining);

      return {
        ...prev,
        members: arranged,
      };
    });

    if (selectedMemberId === member.id) {
      setSelectedMemberId(null);
      setIsSidePanelOpen(false);
    }
    showToast(`"${member.fullName}" berhasil dihapus dari silsilah`);
  };

  // Save member from Modal (create or edit)
  const handleSaveMember = (formData: Partial<FamilyMember>) => {
    if (modalMode === 'edit' && selectedMember) {
      // Update existing
      setDataset((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.id === selectedMember.id
            ? ({
                ...m,
                ...formData,
              } as FamilyMember)
            : m
        ),
      }));
      showToast('Profil berhasil diperbarui');
    } else {
      // Create new member
      const newId = `member-${Date.now()}`;
      let targetX = 300;
      let targetY = 300;

      // Determine initial placement relative to relation context
      if (relationContext) {
        const target = relationContext.targetMember;
        if (relationContext.type === 'spouse') {
          targetX = target.position.x + 214;
          targetY = target.position.y;
        } else if (relationContext.type === 'child') {
          targetX = target.position.x;
          targetY = target.position.y + 280;
        } else if (relationContext.type === 'parent') {
          targetX = target.position.x;
          targetY = Math.max(40, target.position.y - 280);
        } else if (relationContext.type === 'sibling') {
          targetX = target.position.x + 198;
          targetY = target.position.y;
        }
      } else if (dataset.members.length > 0) {
        const last = dataset.members[dataset.members.length - 1];
        targetX = last.position.x + 100;
        targetY = last.position.y + 100;
      }

      const newMember: FamilyMember = {
        id: newId,
        fullName: formData.fullName || 'Tanpa Nama',
        gender: formData.gender || 'male',
        birthYear: formData.birthYear || '',
        deathYear: formData.deathYear || '',
        isDeceased: formData.isDeceased || false,
        birthPlace: formData.birthPlace || '',
        relationRole: formData.relationRole || '',
        occupation: formData.occupation || '',
        notes: formData.notes || '',
        photoUrl: formData.photoUrl || '',
        spouseIds: formData.spouseIds || [],
        parentIds: formData.parentIds || [],
        childrenIds: formData.childrenIds || [],
        position: { x: targetX, y: targetY },
      };

      setDataset((prev) => {
        let updatedMembers = [...prev.members, newMember];

        // Bi-directional linking
        if (relationContext) {
          const targetId = relationContext.targetMember.id;

          if (relationContext.type === 'spouse') {
            const targetChildren = relationContext.targetMember.childrenIds || [];
            updatedMembers = updatedMembers.map((m) => {
              if (m.id === targetId) {
                return { ...m, spouseIds: Array.from(new Set([...m.spouseIds, newId])) };
              }
              if (targetChildren.includes(m.id)) {
                return { ...m, parentIds: Array.from(new Set([...m.parentIds, newId])) };
              }
              return m;
            });
            const newMemIdx = updatedMembers.findIndex((m) => m.id === newId);
            if (newMemIdx !== -1) {
              updatedMembers[newMemIdx] = {
                ...updatedMembers[newMemIdx],
                spouseIds: Array.from(new Set([...updatedMembers[newMemIdx].spouseIds, targetId])),
                childrenIds: Array.from(new Set([...updatedMembers[newMemIdx].childrenIds, ...targetChildren])),
              };
            }
          } else if (relationContext.type === 'child') {
            const parentIdsToLink = Array.from(
              new Set([
                targetId,
                ...(relationContext.targetMember.spouseIds || []),
                ...newMember.parentIds,
              ])
            );
            updatedMembers = updatedMembers.map((m) =>
              parentIdsToLink.includes(m.id)
                ? { ...m, childrenIds: Array.from(new Set([...m.childrenIds, newId])) }
                : m
            );
            const newMemIdx = updatedMembers.findIndex((m) => m.id === newId);
            if (newMemIdx !== -1) {
              updatedMembers[newMemIdx] = {
                ...updatedMembers[newMemIdx],
                parentIds: parentIdsToLink,
              };
            }
          } else if (relationContext.type === 'parent') {
            const existingParentIds = relationContext.targetMember.parentIds || [];
            updatedMembers = updatedMembers.map((m) => {
              if (m.id === targetId) {
                return { ...m, parentIds: Array.from(new Set([...m.parentIds, newId])) };
              }
              // If target already has an existing parent, link existing parent & new parent as spouses!
              if (existingParentIds.includes(m.id)) {
                return {
                  ...m,
                  spouseIds: Array.from(new Set([...m.spouseIds, newId])),
                  childrenIds: Array.from(new Set([...m.childrenIds, targetId])),
                };
              }
              return m;
            });

            // Ensure new parent has target in childrenIds and existing parents in spouseIds
            const newMemIdx = updatedMembers.findIndex((m) => m.id === newId);
            if (newMemIdx !== -1) {
              updatedMembers[newMemIdx] = {
                ...updatedMembers[newMemIdx],
                childrenIds: Array.from(new Set([...updatedMembers[newMemIdx].childrenIds, targetId])),
                spouseIds: Array.from(new Set([...updatedMembers[newMemIdx].spouseIds, ...existingParentIds])),
              };
            }
          } else if (relationContext.type === 'sibling') {
            const sharedParents = newMember.parentIds;
            updatedMembers = updatedMembers.map((m) =>
              sharedParents.includes(m.id)
                ? { ...m, childrenIds: Array.from(new Set([...m.childrenIds, newId])) }
                : m
            );
          }
        }

        // Automatically arrange tree cleanly so cards never stack or overlap
        const arrangedMembers = autoArrangeTree(updatedMembers);

        return {
          ...prev,
          members: arrangedMembers,
        };
      });

      setSelectedMemberId(newId);
      showToast(`${newMember.fullName} berhasil ditambahkan dan ditata rapi`);
    }
  };

  // Export handlers
  const handleExportPNG = () => {
    setIsExportingImage(true);
    setExportTrigger((prev) => prev + 1);
  };

  const handleExportJSON = () => {
    exportTreeToJSON(dataset);
    showToast('Data pohon berhasil diekspor (JSON)');
  };

  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const imported = parseImportedJSON(text);
        setDataset(imported);
        setSelectedMemberId(null);
        showToast('Data pohon keluarga berhasil diimpor!');
      } catch (err: any) {
        showToast(err.message || 'Gagal membaca berkas JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetSample = () => {
    setDataset(DEFAULT_DATASET);
    setSelectedMemberId(null);
    setIsSidePanelOpen(false);
    showToast('Silsilah contoh 3-generasi berhasil dimuat ulang');
  };

  const handleClearTree = () => {
    setDataset({
      meta: {
        title: 'Pohon Keluarga Baru',
        lastModified: new Date().toISOString(),
      },
      members: [],
    });
    setSelectedMemberId(null);
    setIsSidePanelOpen(false);
    showToast('Pohon keluarga telah dikosongkan');
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-neutral-50 text-neutral-900">
      {/* Top Navigation */}
      <TopNavigation
        treeTitle={dataset.meta.title}
        onUpdateTitle={handleUpdateTitle}
        members={dataset.members}
        onSelectMember={(m) => setSelectedMemberId(m.id)}
        onAddNewMember={handleAddNewMember}
        onExportPNG={handleExportPNG}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        isExportingImage={isExportingImage}
        cloudSyncStatus={cloudSyncStatus}
      />

      {/* Main Canvas Area */}
      <main className="flex-1 relative w-full h-[calc(100vh-3.5rem)] overflow-hidden">
        <FamilyTreeCanvas
          members={dataset.members}
          selectedMemberId={selectedMemberId}
          onSelectMember={(m) => {
            setSelectedMemberId(m ? m.id : null);
            if (!m) setIsSidePanelOpen(false);
          }}
          onOpenDetail={(m) => {
            setSelectedMemberId(m.id);
            setIsSidePanelOpen(true);
          }}
          onUpdateMemberPosition={handleUpdateMemberPosition}
          onAddSpouse={handleAddSpouse}
          onAddChild={handleAddChild}
          onAddParent={handleAddParent}
          onAddSibling={handleAddSibling}
          onEdit={handleEditMember}
          onDelete={handleDeleteMember}
          onAddMemberDirect={handleAddNewMember}
          treeTitle={dataset.meta.title}
          exportTrigger={exportTrigger}
          onExportComplete={() => setIsExportingImage(false)}
          onToast={showToast}
        />

        {/* Side Detail Panel */}
        <SideDetailPanel
          member={selectedMember}
          allMembers={dataset.members}
          isOpen={Boolean(selectedMember && isSidePanelOpen)}
          onClose={() => setIsSidePanelOpen(false)}
          onEdit={handleEditMember}
          onDelete={handleDeleteMember}
          onSelectMember={(m) => {
            setSelectedMemberId(m.id);
            setIsSidePanelOpen(true);
          }}
          onAddSpouse={handleAddSpouse}
          onAddChild={handleAddChild}
          onAddParent={handleAddParent}
          onAddSibling={handleAddSibling}
        />
      </main>

      {/* Add / Edit Member Modal */}
      <MemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMember}
        initialData={modalMode === 'edit' ? selectedMember : null}
        mode={modalMode}
        relationContext={relationContext}
        allMembers={dataset.members}
      />

      {/* Delete Confirmation In-App Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(memberToDelete)}
        member={memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={performDeleteMember}
      />

      {/* Supabase Cloud Connection Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        dataset={dataset}
        onDatasetLoaded={(loadedData) => {
          setDataset(loadedData);
          setSelectedMemberId(null);
        }}
        onToast={showToast}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
