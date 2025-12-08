import React, { useState, useEffect, useRef } from 'react';
import { TodoList, TodoNode } from '../types';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Circle, 
  CheckCircle2, 
  ArrowLeft,
  Check,
  Flag,
  AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { playClick } from '../services/sound';

interface TodoManagerProps {
  lists: TodoList[];
  onAddList: (title: string, color: string) => void;
  onUpdateList: (listId: string, data: Partial<TodoList>) => void;
  onDeleteList: (listId: string) => void;
  isMonochrome?: boolean;
}

const COLORS = [
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#f97316', name: 'Orange' },
];

const PRIORITIES = {
  high: { color: 'text-red-500', fill: 'currentColor', label: 'High' },
  medium: { color: 'text-yellow-500', fill: 'currentColor', label: 'Medium' },
  low: { color: 'text-blue-500', fill: 'transparent', label: 'Low' } // Blue or Gray
};

// Helper to flatten tree for preview
const getPreviewItems = (nodes: TodoNode[], limit = 4): { id: string, completed: boolean, text: string, depth: number }[] => {
    let preview: { id: string, completed: boolean, text: string, depth: number }[] = [];
    
    const traverse = (currentNodes: TodoNode[], depth: number) => {
        for (const node of currentNodes) {
            if (preview.length >= limit) return;
            preview.push({ id: node.id, completed: node.completed, text: node.text, depth });
            
            // Only dive deeper if we haven't hit the limit
            if (preview.length < limit && node.children && node.children.length > 0) {
                traverse(node.children, depth + 1);
            }
        }
    }
    
    traverse(nodes, 0);
    return preview;
}

// Recursive component for a single todo node
const TodoItem: React.FC<{
  node: TodoNode;
  depth: number;
  color: string;
  isMonochrome: boolean;
  onToggle: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdatePriority: (id: string, priority: 'high' | 'medium' | 'low') => void;
  onAddSubItem: (parentId: string) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
}> = ({ node, depth, color, isMonochrome, onToggle, onUpdateText, onUpdatePriority, onAddSubItem, onDelete, onToggleExpand }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editText.trim() !== node.text) {
      onUpdateText(node.id, editText);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
  };

  const cyclePriority = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !node.priority || node.priority === 'low' ? 'medium' : node.priority === 'medium' ? 'high' : 'low';
    onUpdatePriority(node.id, next);
  };

  return (
    <div className="flex flex-col">
      <div 
        className={clsx(
          "group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 relative min-h-[44px]",
          node.completed && "opacity-60"
        )}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {/* Connector Line */}
        {depth > 0 && (
          <div className="absolute left-0 top-0 bottom-0 border-l border-gray-800" style={{ left: `${(depth * 24) - 10}px` }}>
            <div className="absolute top-1/2 w-3 border-t border-gray-800 -translate-y-1/2"></div>
          </div>
        )}

        {/* Expand/Collapse */}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleExpand(node.id); }}
          className={clsx(
            "p-0.5 rounded hover:bg-gray-700 transition-colors shrink-0 w-5 h-5 flex items-center justify-center",
            node.children.length === 0 ? "invisible" : "visible"
          )}
        >
          {node.isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
        </button>

        {/* Checkbox */}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); playClick(1.5); }}
          className="shrink-0 transition-transform active:scale-90 group-active:scale-95"
        >
          {node.completed ? (
             <CheckCircle2 
                size={20} 
                className={clsx("transition-colors duration-300", isMonochrome ? "text-white" : "text-green-500")} 
                fill={isMonochrome ? "black" : "currentColor"} 
                stroke={isMonochrome ? "currentColor" : "#111827"} 
             />
          ) : (
             <Circle size={20} className={clsx("text-gray-600 transition-colors", isMonochrome ? "hover:text-white" : "hover:text-gray-400")} />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 mx-1">
          {isEditing ? (
            <input 
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="w-full bg-gray-900 text-white px-2 py-1 rounded border border-indigo-500/50 focus:outline-none text-sm"
            />
          ) : (
            <span 
              onClick={() => setIsEditing(true)}
              className={clsx(
                "text-sm block truncate cursor-text select-none transition-all duration-300", 
                node.completed ? "text-gray-500 line-through decoration-gray-700" : "text-gray-200"
              )}
            >
              {node.text}
            </span>
          )}
        </div>

        {/* Priority & Actions */}
        <div className="flex items-center gap-1">
             {/* Priority Toggle */}
             <button
                onClick={cyclePriority}
                className={clsx(
                    "p-1.5 rounded transition opacity-0 group-hover:opacity-100 focus:opacity-100",
                    node.priority ? "opacity-100" : "text-gray-600 hover:text-gray-400"
                )}
                title="Priority"
             >
                <Flag 
                    size={14} 
                    className={clsx(
                        node.priority === 'high' ? 'text-red-500 fill-red-500' :
                        node.priority === 'medium' ? 'text-yellow-500 fill-yellow-500' :
                        node.priority === 'low' ? 'text-blue-500' : 
                        'text-gray-600'
                    )} 
                />
             </button>

            {/* Hover Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={(e) => { e.stopPropagation(); onAddSubItem(node.id); }}
                    className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition"
                    title="Add sub-task"
                >
                    <Plus size={14} />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition"
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
      </div>

      {/* Children Container with Height Transition */}
      <div 
        className={clsx(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          node.isExpanded && node.children.length > 0 ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col pt-1">
            {node.children.map(child => (
              <TodoItem 
                key={child.id} 
                node={child} 
                depth={depth + 1}
                color={color}
                isMonochrome={isMonochrome}
                onToggle={onToggle}
                onUpdateText={onUpdateText}
                onUpdatePriority={onUpdatePriority}
                onAddSubItem={onAddSubItem}
                onDelete={onDelete}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TodoManager: React.FC<TodoManagerProps> = ({ 
  lists, 
  onAddList, 
  onUpdateList, 
  onDeleteList, 
  isMonochrome = false 
}) => {
  const [activeListId, setActiveListId] = useState<string | null>(null);
  
  // Create List State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0].hex);
  
  // Create Item State
  const [newItemText, setNewItemText] = useState("");
  const [newItemPriority, setNewItemPriority] = useState<'low'|'medium'|'high'>('low');

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const activeList = lists.find(l => l.id === activeListId);

  // --- Recursive Helpers ---

  // Helper to deep clone and modify the tree
  const updateNodeInTree = (nodes: TodoNode[], targetId: string, transform: (node: TodoNode) => TodoNode): TodoNode[] => {
    return nodes.map(node => {
      if (node.id === targetId) {
        return transform(node);
      }
      if (node.children.length > 0) {
        return { ...node, children: updateNodeInTree(node.children, targetId, transform) };
      }
      return node;
    });
  };

  const deleteNodeInTree = (nodes: TodoNode[], targetId: string): TodoNode[] => {
    return nodes.filter(node => node.id !== targetId).map(node => ({
      ...node,
      children: deleteNodeInTree(node.children, targetId)
    }));
  };

  const addChildToNode = (nodes: TodoNode[], targetId: string, newChild: TodoNode): TodoNode[] => {
    return nodes.map(node => {
      if (node.id === targetId) {
        return { ...node, isExpanded: true, children: [...node.children, newChild] };
      }
      if (node.children.length > 0) {
        return { ...node, children: addChildToNode(node.children, targetId, newChild) };
      }
      return node;
    });
  };

  // --- Handlers ---

  const handleCreateList = () => {
    if (!newTitle.trim()) return;
    onAddList(newTitle, newColor);
    setNewTitle("");
    setNewColor(COLORS[0].hex);
    setShowAddModal(false);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !activeList) return;

    const newItem: TodoNode = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      text: newItemText,
      completed: false,
      isExpanded: true,
      children: [],
      priority: newItemPriority
    };

    onUpdateList(activeList.id, {
      items: [newItem, ...activeList.items]
    });
    setNewItemText("");
    setNewItemPriority('low'); // Reset to default
  };

  const handleToggle = (id: string) => {
    if (!activeList) return;
    const newItems = updateNodeInTree(activeList.items, id, (node) => ({ ...node, completed: !node.completed }));
    onUpdateList(activeList.id, { items: newItems });
  };

  const handleUpdateText = (id: string, text: string) => {
    if (!activeList) return;
    const newItems = updateNodeInTree(activeList.items, id, (node) => ({ ...node, text }));
    onUpdateList(activeList.id, { items: newItems });
  };

  const handleUpdatePriority = (id: string, priority: 'high' | 'medium' | 'low') => {
    if (!activeList) return;
    const newItems = updateNodeInTree(activeList.items, id, (node) => ({ ...node, priority }));
    onUpdateList(activeList.id, { items: newItems });
  }

  const handleToggleExpand = (id: string) => {
    if (!activeList) return;
    const newItems = updateNodeInTree(activeList.items, id, (node) => ({ ...node, isExpanded: !node.isExpanded }));
    onUpdateList(activeList.id, { items: newItems });
  };

  const handleDeleteItem = (id: string) => {
    if (!activeList) return;
    const newItems = deleteNodeInTree(activeList.items, id);
    onUpdateList(activeList.id, { items: newItems });
  };

  const handleAddSubItem = (parentId: string) => {
    if (!activeList) return;
    const newItem: TodoNode = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      text: "New sub-task",
      completed: false,
      isExpanded: true,
      children: [],
      priority: 'low'
    };
    const newItems = addChildToNode(activeList.items, parentId, newItem);
    onUpdateList(activeList.id, { items: newItems });
  };

  const handleDeleteListConfirmed = () => {
      if(activeListId) {
          onDeleteList(activeListId);
          setActiveListId(null);
          setShowDeleteConfirm(false);
      }
  }

  // --- Render ---

  if (activeList) {
    // Detail View
    return (
      <div className="h-full flex flex-col bg-gray-950 relative">
        {/* Header */}
        <div className="sticky top-0 bg-gray-950/80 backdrop-blur-md z-10 border-b border-gray-900 p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex justify-between items-center">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setActiveListId(null)}
                className="p-2 -ml-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"
             >
                <ArrowLeft size={20} />
             </button>
             <h2 className="text-xl font-bold text-white truncate max-w-[200px]">{activeList.title}</h2>
             <span className="w-3 h-3 rounded-full" style={{ backgroundColor: isMonochrome ? '#fff' : activeList.color }} />
          </div>
          <button 
             onClick={() => setShowDeleteConfirm(true)}
             className="p-2 text-red-400 hover:bg-red-900/20 rounded-full transition"
          >
              <Trash2 size={18} />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-32">
            {activeList.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                    <CheckCircle2 size={48} className="opacity-20" />
                    <p>No tasks yet. Add one below!</p>
                </div>
            ) : (
                activeList.items.map(node => (
                    <TodoItem 
                        key={node.id} 
                        node={node} 
                        depth={0}
                        color={activeList.color}
                        isMonochrome={isMonochrome}
                        onToggle={handleToggle}
                        onUpdateText={handleUpdateText}
                        onUpdatePriority={handleUpdatePriority}
                        onAddSubItem={handleAddSubItem}
                        onDelete={handleDeleteItem}
                        onToggleExpand={handleToggleExpand}
                    />
                ))
            )}
        </div>

        {/* Input Bar */}
        <div className="fixed bottom-[88px] left-0 right-0 p-4 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none">
            <form onSubmit={handleAddItem} className="pointer-events-auto flex gap-2 max-w-lg mx-auto items-end">
                <div className={clsx(
                    "flex-1 bg-gray-900/90 backdrop-blur-md border rounded-xl flex items-center shadow-lg transition-colors p-1 relative z-20",
                    isMonochrome ? "border-gray-700 focus-within:border-white" : "border-gray-800 focus-within:border-indigo-500"
                )}>
                    {/* Priority Selector */}
                    <div className="flex items-center gap-1 pl-2 border-r border-gray-800 pr-2 mr-2">
                        <button 
                            type="button"
                            onClick={() => setNewItemPriority('high')}
                            className={clsx("p-1.5 rounded transition", newItemPriority === 'high' ? "bg-red-500/20 text-red-500" : "text-gray-600 hover:text-gray-400")}
                            title="High Priority"
                        >
                            <Flag size={14} className="fill-current" />
                        </button>
                        <button 
                            type="button"
                            onClick={() => setNewItemPriority('medium')}
                            className={clsx("p-1.5 rounded transition", newItemPriority === 'medium' ? "bg-yellow-500/20 text-yellow-500" : "text-gray-600 hover:text-gray-400")}
                            title="Medium Priority"
                        >
                            <Flag size={14} className="fill-current" />
                        </button>
                        <button 
                            type="button"
                            onClick={() => setNewItemPriority('low')}
                            className={clsx("p-1.5 rounded transition", newItemPriority === 'low' ? "bg-blue-500/20 text-blue-500" : "text-gray-600 hover:text-gray-400")}
                            title="Low Priority"
                        >
                            <Flag size={14} />
                        </button>
                    </div>

                    <input 
                        type="text" 
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        placeholder="Add a task..."
                        className="bg-transparent flex-1 text-white placeholder-gray-500 focus:outline-none h-10 text-sm"
                    />
                </div>
                
                <button 
                    type="submit"
                    disabled={!newItemText.trim()}
                    className={clsx(
                        "h-[50px] w-[50px] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed",
                        isMonochrome ? "bg-white text-black" : "bg-indigo-600 text-white"
                    )}
                >
                    <Plus size={24} />
                </button>
            </form>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
            <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gray-900 border border-red-900/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                    <div className="flex items-center gap-3 mb-4 text-red-500">
                        <AlertTriangle size={24} />
                        <h3 className="text-xl font-bold">Delete List?</h3>
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-6">
                        Are you sure you want to delete <span className="text-white font-bold">"{activeList.title}"</span>? This action cannot be undone.
                    </p>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 py-3 text-gray-400 font-medium hover:text-white transition-colors bg-gray-800 rounded-xl"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleDeleteListConfirmed}
                            className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="p-6 pb-24 h-full overflow-y-auto">
        <h2 className={clsx("text-2xl font-bold mb-6", isMonochrome ? "text-white" : "text-white")}>Lists</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {lists.map(list => {
                 const total = list.items.length; // Approximate top-level count
                 const previewItems = getPreviewItems(list.items, 4);

                 return (
                    <button 
                        key={list.id}
                        onClick={() => setActiveListId(list.id)}
                        className={clsx(
                            "bg-gray-900 border border-gray-800 p-5 rounded-2xl flex flex-col items-start hover:bg-gray-800 transition-all group shadow-sm hover:shadow-md text-left relative overflow-hidden",
                            isMonochrome ? "hover:border-white" : "hover:border-gray-700"
                        )}
                    >
                         {/* Header: Icon + Time */}
                        <div className="flex justify-between items-start w-full mb-3 z-10">
                            <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm" style={{ backgroundColor: isMonochrome ? '#fff' : list.color + '20', color: isMonochrome ? '#000' : list.color }}>
                                {list.title.charAt(0)}
                            </span>
                            <span className="text-xs text-gray-500 font-mono bg-gray-950/50 px-2 py-1 rounded flex items-center gap-1">
                                {new Date(list.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                        
                        {/* Title & Count */}
                        <h3 className="text-lg font-bold text-gray-200 group-hover:text-white transition-colors mb-1">{list.title}</h3>
                        <p className="text-xs text-gray-500 mb-4">{total} items</p>

                         {/* Preview Section */}
                        <div className="w-full space-y-1.5 z-10">
                            {previewItems.map(item => (
                                <div key={item.id} className="flex items-center gap-2" style={{ paddingLeft: item.depth * 12 }}>
                                    <div className={clsx(
                                        "w-3 h-3 rounded flex items-center justify-center border",
                                        item.completed 
                                            ? (isMonochrome ? "bg-white border-white" : "bg-indigo-500 border-indigo-500") 
                                            : "border-gray-600 bg-transparent"
                                    )}>
                                        {item.completed && <Check size={8} className={isMonochrome ? "text-black" : "text-white"} />}
                                    </div>
                                    <span className={clsx(
                                        "text-[10px] truncate max-w-[80%]",
                                        item.completed ? "text-gray-600 line-through" : "text-gray-400"
                                    )}>
                                        {item.text}
                                    </span>
                                </div>
                            ))}
                            {list.items.length === 0 && (
                                <span className="text-[10px] text-gray-700 italic">Empty list</span>
                            )}
                            {list.items.length > 4 && (
                                <div className="text-[10px] text-gray-600 pl-1">...</div>
                            )}
                        </div>
                        
                        {/* Subtle Glow */}
                        <div 
                            className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                            style={{ backgroundColor: isMonochrome ? '#fff' : list.color }}
                        ></div>
                    </button>
                 )
            })}
            
            <button 
                onClick={() => setShowAddModal(true)}
                className="border border-dashed border-gray-800 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-white hover:bg-gray-900 hover:border-gray-600 transition min-h-[180px]"
            >
                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", isMonochrome ? "bg-white/10" : "bg-indigo-900/20")}>
                    <Plus size={20} />
                </div>
                <span className="font-medium text-sm">Create List</span>
            </button>
        </div>

        {/* Add List Modal */}
        {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
                <div className="bg-gray-900 w-full max-w-sm p-6 rounded-2xl border border-gray-800 shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-6">New List</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Title</label>
                            <input 
                                autoFocus
                                type="text" 
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className={clsx(
                                    "w-full bg-gray-950 border rounded-xl p-3 text-white focus:outline-none mt-1 transition-colors",
                                    isMonochrome ? "border-gray-700 focus:border-white" : "border-gray-700 focus:border-indigo-500"
                                )}
                                placeholder="Groceries..."
                            />
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Color</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {COLORS.map(c => (
                                    <button 
                                        key={c.hex}
                                        onClick={() => setNewColor(c.hex)}
                                        className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                                            newColor === c.hex && "ring-2 ring-white ring-offset-2 ring-offset-gray-900"
                                        )}
                                        style={{ backgroundColor: c.hex }}
                                    >
                                        {newColor === c.hex && <Check size={14} className="text-white drop-shadow" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-gray-400 font-medium hover:text-white">Cancel</button>
                        <button 
                            onClick={handleCreateList}
                            className={clsx(
                                "flex-1 py-3 rounded-xl font-bold transition",
                                isMonochrome ? "bg-white text-black" : "bg-indigo-600 text-white hover:bg-indigo-500"
                            )}
                        >
                            Create
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};