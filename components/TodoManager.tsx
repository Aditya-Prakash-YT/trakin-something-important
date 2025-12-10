
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  AlertTriangle,
  LayoutGrid,
  List,
  Calendar,
  ArrowUpDown,
  Clock,
  Search,
  ListFilter,
  ArrowUp,
  ArrowDown,
  CheckSquare2
} from 'lucide-react';
import clsx from 'clsx';
import { playClick } from '../services/sound';

interface TodoManagerProps {
  lists: TodoList[];
  onAddList: (title: string, color: string) => void;
  onUpdateList: (listId: string, data: Partial<TodoList>) => void;
  onDeleteList: (listId: string) => void;
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

// --- Helpers ---

// Helper to safely get status from node, handling legacy 'completed' boolean data
const getNodeStatus = (node: any): 'todo' | 'in-progress' | 'done' => {
    if (node.status) return node.status;
    return node.completed ? 'done' : 'todo';
};

const toInputDate = (ts: number) => {
    const d = new Date(ts);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const fromInputDate = (str: string) => {
   const [y, m, d] = str.split('-').map(Number);
   return new Date(y, m - 1, d).getTime();
}

const getDueDateLabel = (ts: number) => {
    const d = new Date(ts);
    // Normalize to start of day
    d.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diff < 0) return { text: d.toLocaleDateString(undefined, {month:'short', day:'numeric'}), color: 'text-red-400', bg: 'bg-red-500/10' };
    if (diff === 0) return { text: 'Today', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    if (diff === 1) return { text: 'Tomorrow', color: 'text-indigo-400', bg: 'bg-indigo-500/10' };
    return { text: d.toLocaleDateString(undefined, {month:'short', day:'numeric'}), color: 'text-blue-400', bg: 'bg-blue-500/10' };
}

// Helper to flatten tree for preview
const getPreviewItems = (nodes: TodoNode[], limit = 4): { id: string, status: 'todo'|'in-progress'|'done', text: string, depth: number }[] => {
    let preview: { id: string, status: 'todo'|'in-progress'|'done', text: string, depth: number }[] = [];
    
    const traverse = (currentNodes: TodoNode[], depth: number) => {
        for (const node of currentNodes) {
            if (preview.length >= limit) return;
            preview.push({ id: node.id, status: getNodeStatus(node), text: node.text, depth });
            
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
  onToggle: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdatePriority: (id: string, priority: 'high' | 'medium' | 'low') => void;
  onUpdateDueDate: (id: string, date: number | undefined) => void;
  onAddSubItem: (parentId: string) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
}> = ({ node, depth, color, onToggle, onUpdateText, onUpdatePriority, onUpdateDueDate, onAddSubItem, onDelete, onToggleExpand }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const status = getNodeStatus(node);

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

  const dueDateInfo = node.dueDate ? getDueDateLabel(node.dueDate) : null;

  return (
    <div className="flex flex-col">
      <div 
        className={clsx(
          "group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 relative min-h-[44px]",
          status === 'done' && "opacity-60"
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

        {/* Status Toggle (Todo -> In Progress -> Done) */}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); playClick(1.5); }}
          className="shrink-0 transition-transform active:scale-90 group-active:scale-95"
          title={status === 'todo' ? "Start" : status === 'in-progress' ? "Complete" : "Reset"}
        >
          {status === 'done' ? (
             <CheckCircle2 
                size={20} 
                className="transition-colors duration-300 text-green-500"
                fill="currentColor"
                stroke="#111827" 
             />
          ) : status === 'in-progress' ? (
             <Clock 
                size={20}
                className="transition-colors duration-300 text-amber-500"
             />
          ) : (
             <Circle size={20} className="text-gray-600 transition-colors hover:text-gray-400" />
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
                status === 'done' ? "text-gray-500 line-through decoration-gray-700" : "text-gray-200"
              )}
            >
              {node.text}
            </span>
          )}
        </div>

        {/* Priority & Actions */}
        <div className="flex items-center gap-1">
             
             {/* Due Date Display/Edit */}
             <div className="relative flex items-center">
                <button
                    className={clsx(
                        "p-1.5 rounded transition flex items-center gap-1.5 relative z-0",
                        node.dueDate ? clsx(dueDateInfo?.color, dueDateInfo?.bg) : "text-gray-700 hover:text-gray-400 hover:bg-gray-800"
                    )}
                    title={node.dueDate ? "Change due date" : "Set due date"}
                >
                    <Calendar size={14} />
                    {dueDateInfo && <span className="text-[10px] font-bold">{dueDateInfo.text}</span>}
                </button>
                <input 
                    type="date"
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    value={node.dueDate ? toInputDate(node.dueDate) : ""}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (!val) onUpdateDueDate(node.id, undefined);
                        else onUpdateDueDate(node.id, fromInputDate(val));
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
             </div>

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
                onToggle={onToggle}
                onUpdateText={onUpdateText}
                onUpdatePriority={onUpdatePriority}
                onUpdateDueDate={onUpdateDueDate}
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
  onDeleteList
}) => {
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortMode, setSortMode] = useState<'updated' | 'alpha'>('updated');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Detail View Sort State
  const [sortTaskMode, setSortTaskMode] = useState<'default' | 'priority' | 'date-asc' | 'date-desc'>('default');
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // Create List State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0].hex);
  
  // Create Item State
  const [newItemText, setNewItemText] = useState("");
  const [newItemPriority, setNewItemPriority] = useState<'low'|'medium'|'high'>('low');
  const [newItemDueDate, setNewItemDueDate] = useState<string>("");

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const activeList = lists.find(l => l.id === activeListId);

  // Sorting Lists (Dashboard)
  const sortedLists = [...lists].sort((a, b) => {
      if (sortMode === 'alpha') return a.title.localeCompare(b.title);
      return b.updatedAt - a.updatedAt;
  });

  // Filtering Lists (Dashboard)
  const filteredLists = sortedLists.filter(list => 
    list.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sorting Items (Detail View)
  const visibleItems = useMemo(() => {
    if (!activeList) return [];
    
    // Recursive sort function
    const sortNodes = (nodes: TodoNode[]): TodoNode[] => {
        if (sortTaskMode === 'default') return nodes;
        
        const sorted = [...nodes].sort((a, b) => {
            if (sortTaskMode === 'priority') {
                const pMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
                const pa = pMap[a.priority || ''] || 0;
                const pb = pMap[b.priority || ''] || 0;
                if (pa !== pb) return pb - pa;
            }
            if (sortTaskMode === 'date-asc') {
                 if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
                 if (a.dueDate) return -1; // No date comes last in ASC? Or first? Usually last.
                 if (b.dueDate) return 1;
            }
            if (sortTaskMode === 'date-desc') {
                 if (a.dueDate && b.dueDate) return b.dueDate - a.dueDate;
                 if (a.dueDate) return 1; // No date comes last
                 if (b.dueDate) return -1;
            }
            return 0; // Stable
        });
        
        return sorted.map(node => ({
            ...node,
            children: sortNodes(node.children)
        }));
    };

    return sortNodes(activeList.items);
  }, [activeList, sortTaskMode]);

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
      status: 'todo',
      isExpanded: true,
      children: [],
      priority: newItemPriority,
      dueDate: newItemDueDate ? fromInputDate(newItemDueDate) : undefined
    };

    onUpdateList(activeList.id, {
      items: [newItem, ...activeList.items]
    });
    setNewItemText("");
    setNewItemPriority('low'); 
    setNewItemDueDate("");
  };

  const handleToggle = (id: string) => {
    if (!activeList) return;
    
    const newItems = updateNodeInTree(activeList.items, id, (node) => {
        const current = getNodeStatus(node);
        let next: 'todo' | 'in-progress' | 'done' = 'in-progress';
        
        if (current === 'todo') next = 'in-progress';
        else if (current === 'in-progress') next = 'done';
        else next = 'todo';

        // Clean up legacy completed prop if present
        const { completed, ...rest } = node as any;
        return { ...rest, status: next };
    });
    
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

  const handleUpdateDueDate = (id: string, date: number | undefined) => {
    if (!activeList) return;
    const newItems = updateNodeInTree(activeList.items, id, (node) => ({ ...node, dueDate: date }));
    onUpdateList(activeList.id, { items: newItems });
  };

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
      status: 'todo',
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
             <h2 className="text-xl font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">{activeList.title}</h2>
             <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeList.color }} />
          </div>
          
          <div className="flex items-center gap-1">
             <div className="relative">
                 <button 
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className={clsx(
                        "p-2 rounded-full transition relative",
                        showSortMenu ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800",
                        sortTaskMode !== 'default' && "text-indigo-400"
                    )}
                    title="Sort Tasks"
                 >
                    <ListFilter size={18} />
                    {sortTaskMode !== 'default' && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>}
                 </button>
                 
                 {showSortMenu && (
                     <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)}></div>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                             <button 
                                onClick={() => { setSortTaskMode('default'); setShowSortMenu(false); }}
                                className={clsx("w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-800", sortTaskMode === 'default' ? "text-indigo-400" : "text-gray-300")}
                             >
                                 <List size={14} /> Default
                             </button>
                             <button 
                                onClick={() => { setSortTaskMode('priority'); setShowSortMenu(false); }}
                                className={clsx("w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-800", sortTaskMode === 'priority' ? "text-indigo-400" : "text-gray-300")}
                             >
                                 <Flag size={14} /> Priority (High-Low)
                             </button>
                             <button 
                                onClick={() => { setSortTaskMode('date-asc'); setShowSortMenu(false); }}
                                className={clsx("w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-800", sortTaskMode === 'date-asc' ? "text-indigo-400" : "text-gray-300")}
                             >
                                 <ArrowUp size={14} /> Due Date (Earliest)
                             </button>
                             <button 
                                onClick={() => { setSortTaskMode('date-desc'); setShowSortMenu(false); }}
                                className={clsx("w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-800", sortTaskMode === 'date-desc' ? "text-indigo-400" : "text-gray-300")}
                             >
                                 <ArrowDown size={14} /> Due Date (Latest)
                             </button>
                        </div>
                     </>
                 )}
             </div>

             <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-400 hover:bg-red-900/20 rounded-full transition"
             >
                 <Trash2 size={18} />
             </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-32">
            {visibleItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-20 h-20 bg-gray-900/50 rounded-full flex items-center justify-center border border-gray-800">
                        <CheckCircle2 size={32} className="opacity-20" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-gray-300 font-medium">All caught up!</p>
                        <p className="text-xs text-gray-600">Add a new task below to get started.</p>
                    </div>
                </div>
            ) : (
                visibleItems.map(node => (
                    <TodoItem 
                        key={node.id} 
                        node={node} 
                        depth={0}
                        color={activeList.color}
                        onToggle={handleToggle}
                        onUpdateText={handleUpdateText}
                        onUpdatePriority={handleUpdatePriority}
                        onUpdateDueDate={handleUpdateDueDate}
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
                    "flex-1 bg-gray-900/90 backdrop-blur-md border rounded-xl flex items-center shadow-lg transition-colors p-1 relative z-20 border-gray-800 focus-within:border-indigo-500"
                )}>
                    {/* Priority Selector */}
                    <div className="flex items-center gap-1 pl-2 border-r border-gray-800 pr-2 mr-2">
                        {/* Due Date Input */}
                        <div className="relative group flex items-center justify-center p-1.5 rounded hover:bg-gray-800 transition">
                            <Calendar size={18} className={newItemDueDate ? "text-indigo-400" : "text-gray-600"} />
                            <input 
                                type="date" 
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                value={newItemDueDate}
                                onChange={(e) => setNewItemDueDate(e.target.value)}
                                title="Set due date"
                            />
                            {newItemDueDate && <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full border border-gray-900"></div>}
                        </div>

                        <div className="w-px h-4 bg-gray-800 mx-1"></div>

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
                        "h-[50px] w-[50px] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-600 text-white"
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
    <div className="px-4 md:px-6 mt-4 pb-24 h-full overflow-y-auto">
        
        <div className="flex flex-col gap-4 mb-6">
            {/* Search */}
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search lists..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                />
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-1 bg-gray-900/50 p-1 rounded-xl border border-gray-800/50">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={clsx("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300")}
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={clsx("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300")}
                    >
                        <List size={16} />
                    </button>
                </div>

                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar items-center">
                    <button 
                        onClick={() => setSortMode('updated')}
                        className={clsx("px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0", 
                            sortMode === 'updated' 
                                ? "bg-indigo-900/20 border-indigo-500/30 text-indigo-400" 
                                : "bg-gray-900/50 border-gray-800 text-gray-400 hover:bg-gray-900"
                        )}
                    >
                        <Calendar size={14} />
                        <span className="hidden sm:inline text-xs font-medium">Recent</span>
                    </button>
                    <button 
                        onClick={() => setSortMode('alpha')}
                        className={clsx("px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0", 
                            sortMode === 'alpha' 
                                ? "bg-indigo-900/20 border-indigo-500/30 text-indigo-400" 
                                : "bg-gray-900/50 border-gray-800 text-gray-400 hover:bg-gray-900"
                        )}
                    >
                        <ArrowUpDown size={14} />
                        <span className="hidden sm:inline text-xs font-medium">A-Z</span>
                    </button>
                </div>
            </div>
        </div>

        {lists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-500 px-6">
                <div className="relative mb-8 group cursor-pointer" onClick={() => setShowAddModal(true)}>
                    <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full group-hover:bg-emerald-500/30 transition-all duration-500"></div>
                    <div className="relative w-24 h-24 bg-gray-900 border border-gray-800 rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-500">
                        <CheckSquare2 size={40} className="text-gray-600 group-hover:text-emerald-400 transition-colors duration-500" />
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center border-4 border-gray-950">
                            <Plus size={20} className="text-white" />
                        </div>
                    </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3 text-center">No Task Lists</h3>
                <p className="text-gray-400 mb-8 max-w-sm text-center text-sm leading-relaxed">
                    Organize your tasks by creating focused lists for work, personal, or shopping.
                </p>
                
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="px-8 py-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:-translate-y-1 flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create New List
                </button>
            </div>
        ) : filteredLists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 animate-in fade-in">
                <p>No lists matching "{searchQuery}"</p>
                <button onClick={() => setSearchQuery("")} className="text-indigo-400 text-sm mt-2 hover:underline">Clear search</button>
            </div>
        ) : (
            <div className={clsx("grid gap-4", viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                {filteredLists.map(list => {
                     const total = list.items.length; // Approximate top-level count
                     const previewItems = getPreviewItems(list.items, 4);

                     // List View Render
                     if (viewMode === 'list') {
                         return (
                            <button 
                                key={list.id}
                                onClick={() => setActiveListId(list.id)}
                                className={clsx(
                                    "w-full bg-gray-900 transition-all p-4 rounded-xl border flex items-center justify-between shadow-sm group relative hover:border-gray-700 border-gray-800 hover:bg-gray-800"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div 
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-gray-950 shadow-sm"
                                        style={{ backgroundColor: list.color, color: 'rgba(0,0,0,0.8)' }} 
                                    >
                                        {list.title.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <span className="block text-gray-300 font-medium text-sm group-hover:text-white transition-colors">{list.title}</span>
                                        <span className="text-gray-500 text-[10px]">
                                            {new Date(list.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-gray-500 text-xs font-medium flex items-center gap-2">
                                    <span className={clsx("px-2 py-0.5 rounded text-[10px] bg-indigo-900/20 text-indigo-400")}>
                                        {total} items
                                    </span>
                                    <ChevronRight size={14} className="text-gray-600" />
                                </div>
                            </button>
                         )
                     }

                     // Grid View Render
                     return (
                        <button 
                            key={list.id}
                            onClick={() => setActiveListId(list.id)}
                            className={clsx(
                                "bg-gray-900 border border-gray-800 p-5 rounded-2xl flex flex-col items-start hover:bg-gray-800 transition-all group shadow-sm hover:shadow-md text-left relative overflow-hidden hover:border-gray-700"
                            )}
                        >
                             {/* Header: Icon + Time */}
                            <div className="flex justify-between items-start w-full mb-3 z-10">
                                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm" style={{ backgroundColor: list.color + '20', color: list.color }}>
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
                                            item.status === 'done'
                                                ? "bg-indigo-500 border-indigo-500" 
                                                : item.status === 'in-progress'
                                                    ? "bg-amber-500/20 border-amber-500/50"
                                                    : "border-gray-600 bg-transparent"
                                        )}>
                                            {item.status === 'done' && <Check size={8} className="text-white" />}
                                            {item.status === 'in-progress' && <div className="w-1 h-1 rounded-full bg-amber-500" />}
                                        </div>
                                        <span className={clsx(
                                            "text-[10px] truncate max-w-[80%]",
                                            item.status === 'done' ? "text-gray-600 line-through" : "text-gray-400"
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
                                style={{ backgroundColor: list.color }}
                            ></div>
                        </button>
                     )
                })}
                
                <button 
                    onClick={() => setShowAddModal(true)}
                    className={clsx(
                        "border border-dashed border-gray-800 rounded-2xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-900 hover:border-gray-600 transition group",
                        viewMode === 'grid' ? "flex-col p-5 gap-3 min-h-[180px]" : "flex-row p-4 gap-3 min-h-[80px]"
                    )}
                >
                    <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-indigo-900/20 group-hover:bg-indigo-600 group-hover:text-white")}>
                        <Plus size={20} />
                    </div>
                    <span className="font-medium text-sm">Create List</span>
                </button>
            </div>
        )}

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
                                    "w-full bg-gray-950 border rounded-xl p-3 text-white focus:outline-none mt-1 transition-colors border-gray-700 focus:border-indigo-500"
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
                                "flex-1 py-3 rounded-xl font-bold transition bg-indigo-600 text-white hover:bg-indigo-500"
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
