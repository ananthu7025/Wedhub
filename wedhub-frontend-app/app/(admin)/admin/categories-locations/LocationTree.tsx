"use client";

import { useState } from "react";
import { createAdminLocation, listAdminLocationsClient, updateAdminLocation } from "@/lib/api/admin-client";
import type { Location, LocationType } from "@/lib/api/vendors.types";

/**
 * Country → state → city → area tree, built from on-demand cascading
 * fetches (no bulk tree endpoint exists — GET /locations only returns one
 * level at a time, filtered by type+parentId, confirmed via research).
 * Each node's children are fetched lazily when expanded.
 */

const CHILD_TYPE: Record<LocationType, LocationType | null> = {
  COUNTRY: "STATE",
  STATE: "CITY",
  CITY: "AREA",
  AREA: null,
};

interface TreeNode extends Location {
  children: TreeNode[] | null; // null = not yet fetched
  expanded: boolean;
}

function toNode(location: Location): TreeNode {
  return { ...location, children: null, expanded: false };
}

export function LocationTree({ initialCountries }: { initialCountries: Location[] }) {
  const [nodes, setNodes] = useState<TreeNode[]>(initialCountries.map(toNode));
  const [error, setError] = useState<string | null>(null);
  const [addingUnderId, setAddingUnderId] = useState<string | "root" | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  function updateNodeTree(list: TreeNode[], id: string, updater: (n: TreeNode) => TreeNode): TreeNode[] {
    return list.map((n) => {
      if (n.id === id) return updater(n);
      if (n.children) return { ...n, children: updateNodeTree(n.children, id, updater) };
      return n;
    });
  }

  async function toggleExpand(node: TreeNode) {
    if (!node.expanded && node.children === null) {
      const childType = CHILD_TYPE[node.type];
      if (childType) {
        const result = await listAdminLocationsClient(childType, node.id);
        const children: TreeNode[] = result.success ? result.data.map(toNode) : [];
        setNodes((prev) => updateNodeTree(prev, node.id, (n) => ({ ...n, children, expanded: true })));
        return;
      }
    }
    setNodes((prev) => updateNodeTree(prev, node.id, (n) => ({ ...n, expanded: !n.expanded })));
  }

  async function handleToggleActive(node: TreeNode) {
    setError(null);
    const result = await updateAdminLocation(node.id, { isActive: !node.isActive });
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setNodes((prev) => updateNodeTree(prev, node.id, (n) => ({ ...n, isActive: result.data.isActive })));
  }

  async function handleAdd(parentId: string | null, type: LocationType) {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    const result = await createAdminLocation({ type, name: newName.trim(), parentId: parentId ?? undefined });
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    if (parentId === null) {
      setNodes((prev) => [...prev, toNode(result.data)]);
    } else {
      setNodes((prev) => updateNodeTree(prev, parentId, (n) => ({ ...n, children: [...(n.children ?? []), toNode(result.data)], expanded: true })));
    }
    setNewName("");
    setAddingUnderId(null);
  }

  return (
    <div>
      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      <div className="mb-4 flex items-center gap-2">
        {addingUnderId === "root" ? (
          <>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New country name…"
              autoFocus
              className="w-full max-w-[280px] rounded-md border border-border px-3 py-2 text-sm"
            />
            <button
              onClick={() => handleAdd(null, "COUNTRY")}
              disabled={saving || !newName.trim()}
              className="rounded-md bg-brand-primary px-3 py-2 text-[13px] font-bold text-white disabled:opacity-60"
            >
              Save
            </button>
            <button
              onClick={() => {
                setAddingUnderId(null);
                setNewName("");
              }}
              className="rounded-md border border-border bg-white px-3 py-2 text-[13px] font-bold text-text-dark"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setAddingUnderId("root")}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white"
          >
            + Add country
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white p-2">
        {nodes.length === 0 ? (
          <p className="p-4 text-sm text-text-grey">No locations yet.</p>
        ) : (
          nodes.map((node) => (
            <LocationNodeRow
              key={node.id}
              node={node}
              depth={0}
              addingUnderId={addingUnderId}
              newName={newName}
              saving={saving}
              onToggleExpand={toggleExpand}
              onToggleActive={handleToggleActive}
              onStartAdd={(id) => {
                setAddingUnderId(id);
                setNewName("");
              }}
              onCancelAdd={() => {
                setAddingUnderId(null);
                setNewName("");
              }}
              onNameChange={setNewName}
              onSaveAdd={handleAdd}
            />
          ))
        )}
      </div>
    </div>
  );
}

function LocationNodeRow({
  node,
  depth,
  addingUnderId,
  newName,
  saving,
  onToggleExpand,
  onToggleActive,
  onStartAdd,
  onCancelAdd,
  onNameChange,
  onSaveAdd,
}: {
  node: TreeNode;
  depth: number;
  addingUnderId: string | "root" | null;
  newName: string;
  saving: boolean;
  onToggleExpand: (node: TreeNode) => void;
  onToggleActive: (node: TreeNode) => void;
  onStartAdd: (id: string) => void;
  onCancelAdd: () => void;
  onNameChange: (value: string) => void;
  onSaveAdd: (parentId: string | null, type: LocationType) => void;
}) {
  const childType = CHILD_TYPE[node.type];

  return (
    <div>
      <div
        className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-surface-input ${!node.isActive ? "opacity-60" : ""}`}
        style={{ paddingLeft: `${12 + depth * 24}px` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {childType && (
            <button onClick={() => onToggleExpand(node)} className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-text-grey">
              {node.expanded ? "▾" : "▸"}
            </button>
          )}
          <span className="truncate text-[13px] font-semibold">{node.name}</span>
          {!node.isActive && <span className="flex-shrink-0 text-xs text-text-grey">(disabled)</span>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {childType && (
            <button onClick={() => onStartAdd(node.id)} className="text-xs font-bold text-brand-primary">
              + Add {childType.toLowerCase()}
            </button>
          )}
          <label className="relative inline-flex h-[20px] w-9 cursor-pointer items-center">
            <input type="checkbox" checked={node.isActive} onChange={() => onToggleActive(node)} className="peer sr-only" />
            <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-brand-primary" />
            <span className="absolute left-[2px] h-3.5 w-3.5 rounded-full bg-white transition-transform peer-checked:translate-x-[16px]" />
          </label>
        </div>
      </div>

      {addingUnderId === node.id && childType && (
        <div className="flex items-center gap-2 py-1.5" style={{ paddingLeft: `${12 + (depth + 1) * 24}px` }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={`New ${childType.toLowerCase()} name…`}
            autoFocus
            className="w-full max-w-[240px] rounded-md border border-border px-2.5 py-1.5 text-[13px]"
          />
          <button
            onClick={() => onSaveAdd(node.id, childType)}
            disabled={saving || !newName.trim()}
            className="rounded-md bg-brand-primary px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            Save
          </button>
          <button onClick={onCancelAdd} className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-bold text-text-dark">
            Cancel
          </button>
        </div>
      )}

      {node.expanded &&
        node.children?.map((child) => (
          <LocationNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            addingUnderId={addingUnderId}
            newName={newName}
            saving={saving}
            onToggleExpand={onToggleExpand}
            onToggleActive={onToggleActive}
            onStartAdd={onStartAdd}
            onCancelAdd={onCancelAdd}
            onNameChange={onNameChange}
            onSaveAdd={onSaveAdd}
          />
        ))}
    </div>
  );
}
