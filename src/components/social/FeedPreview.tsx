import React, { useState, useCallback } from 'react';
import type { Division } from '../../constants/Themes';
import { DIVISIONS } from '../../constants/Themes';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppContext } from '../../context/AppContext';
import { Card } from '../../design-system';

interface FeedPreviewProps { division: Division; }

interface FeedPost {
  id: string;
  type: 'Reels' | 'Post' | 'Carrossel';
  title: string;
  category: string;
  color: string;
  emoji: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Evento: '#f59e0b', Autoridade: '#8b5cf6', Educacional: '#3b82f6',
  'Prova social': '#22c55e', Institucional: '#64748b', Alerta: '#ef4444',
  Dor: '#dc2626', CTA: '#f97316', Bastidores: '#06b6d4',
  Resultado: '#10b981', Projeto: '#6366f1', Inovação: '#ec4899',
  Case: '#a855f7',
};

const DIVISION_FEED: Record<Division, FeedPost[]> = {
  'connect-gray': [
    { id: 'cg1', type: 'Reels', title: 'Coffee Meet #12', category: 'Evento', color: '#9370DB', emoji: '☕' },
    { id: 'cg2', type: 'Post', title: 'Rede de síndicos', category: 'Autoridade', color: '#9370DB', emoji: '🏢' },
    { id: 'cg3', type: 'Carrossel', title: '5 erros do síndico', category: 'Educacional', color: '#9370DB', emoji: '📋' },
    { id: 'cg4', type: 'Reels', title: 'Depoimento parceiro', category: 'Prova social', color: '#9370DB', emoji: '⭐' },
    { id: 'cg5', type: 'Post', title: 'Nova parceria', category: 'Institucional', color: '#9370DB', emoji: '🤝' },
    { id: 'cg6', type: 'Reels', title: 'Alerta condominial', category: 'Alerta', color: '#9370DB', emoji: '⚠️' },
    { id: 'cg7', type: 'Post', title: 'Resultado Coffee Meet', category: 'Evento', color: '#9370DB', emoji: '📊' },
    { id: 'cg8', type: 'Carrossel', title: 'Checklist síndico', category: 'Educacional', color: '#9370DB', emoji: '✅' },
    { id: 'cg9', type: 'Reels', title: 'Fornecedor qualificado', category: 'Dor', color: '#9370DB', emoji: '🔧' },
  ],
  'gray-up': [
    { id: 'gu1', type: 'Reels', title: 'Modernização completa', category: 'Projeto', color: '#2563EB', emoji: '🛗' },
    { id: 'gu2', type: 'Post', title: 'Antes/Depois elevador', category: 'Resultado', color: '#2563EB', emoji: '✨' },
    { id: 'gu3', type: 'Carrossel', title: 'Tipos de modernização', category: 'Educacional', color: '#2563EB', emoji: '📐' },
    { id: 'gu4', type: 'Reels', title: 'Dia na obra', category: 'Bastidores', color: '#2563EB', emoji: '👷' },
    { id: 'gu5', type: 'Post', title: 'Projeto elétrico', category: 'Projeto', color: '#2563EB', emoji: '⚡' },
    { id: 'gu6', type: 'Reels', title: 'Elevador parado = $$$', category: 'Dor', color: '#2563EB', emoji: '🛑' },
    { id: 'gu7', type: 'Post', title: 'Equipe técnica', category: 'Institucional', color: '#2563EB', emoji: '👥' },
    { id: 'gu8', type: 'Carrossel', title: 'Manutenção preventiva', category: 'Educacional', color: '#2563EB', emoji: '🔍' },
    { id: 'gu9', type: 'Reels', title: 'Carregador veicular', category: 'Inovação', color: '#2563EB', emoji: '🔋' },
  ],
  'gray-up-flow': [
    { id: 'guf1', type: 'Reels', title: 'Empresa antes do Lean', category: 'Dor', color: '#10B981', emoji: '😰' },
    { id: 'guf2', type: 'Post', title: 'Resultado -30% desperdício', category: 'Case', color: '#10B981', emoji: '📉' },
    { id: 'guf3', type: 'Carrossel', title: '5S explicado', category: 'Educacional', color: '#10B981', emoji: '📚' },
    { id: 'guf4', type: 'Reels', title: 'Workshop em ação', category: 'Bastidores', color: '#10B981', emoji: '🎯' },
    { id: 'guf5', type: 'Post', title: 'Fluxograma otimizado', category: 'Resultado', color: '#10B981', emoji: '📊' },
    { id: 'guf6', type: 'Reels', title: 'Processos manuais = erro', category: 'Alerta', color: '#10B981', emoji: '⚠️' },
    { id: 'guf7', type: 'Post', title: 'KPIs do mês', category: 'Autoridade', color: '#10B981', emoji: '📈' },
    { id: 'guf8', type: 'Carrossel', title: 'Lean vs Tradicional', category: 'Educacional', color: '#10B981', emoji: '⚖️' },
    { id: 'guf9', type: 'Reels', title: 'Case transportadora', category: 'Case', color: '#10B981', emoji: '🚛' },
  ],
  'gray-art': [
    { id: 'ga1', type: 'Reels', title: 'Processo criativo', category: 'Bastidores', color: '#eab308', emoji: '🎨' },
    { id: 'ga2', type: 'Post', title: 'Logo do zero', category: 'Projeto', color: '#eab308', emoji: '✏️' },
    { id: 'ga3', type: 'Carrossel', title: '3 erros de branding', category: 'Educacional', color: '#eab308', emoji: '🚫' },
    { id: 'ga4', type: 'Reels', title: 'Antes/Depois rebranding', category: 'Resultado', color: '#eab308', emoji: '🔄' },
    { id: 'ga5', type: 'Post', title: 'Tendências 2026', category: 'Autoridade', color: '#eab308', emoji: '🔮' },
    { id: 'ga6', type: 'Reels', title: 'Bastidores da agência', category: 'Bastidores', color: '#eab308', emoji: '🎬' },
    { id: 'ga7', type: 'Post', title: 'Cliente satisfeito', category: 'Prova social', color: '#eab308', emoji: '⭐' },
    { id: 'ga8', type: 'Carrossel', title: 'Identidade visual', category: 'Educacional', color: '#eab308', emoji: '🎯' },
    { id: 'ga9', type: 'Reels', title: 'Paleta de cores', category: 'Educacional', color: '#eab308', emoji: '🌈' },
  ],
};

const STORAGE_KEY = 'grayart_feed_layout';

function loadLayout(division: Division): FeedPost[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, FeedPost[]>;
    return all[division] || null;
  } catch { return null; }
}

function saveLayout(division: Division, posts: FeedPost[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) as Record<string, FeedPost[]> : {};
    all[division] = posts;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* silently fail */ }
}

function clearLayout(division: Division) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, FeedPost[]>;
    delete all[division];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* silently fail */ }
}

interface SortableItemProps {
  post: FeedPost;
  index: number;
  isDark: boolean;
  primaryColor: string;
  isDragging?: boolean;
  onRemove: (id: string) => void;
  showPosition: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ post, index, isDark, primaryColor, isDragging = false, onRemove, showPosition }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({ id: post.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isSorting ? transition : undefined,
    opacity: isDragging ? 0.25 : 1,
  };

  const catColor = CATEGORY_COLORS[post.category] || primaryColor;
  const typeGradient = post.type === 'Reels'
    ? 'linear-gradient(135deg, #ef444422, #f9731622, #ef444411)'
    : post.type === 'Carrossel'
      ? 'linear-gradient(135deg, #3b82f622, #6366f122, #3b82f611)'
      : `linear-gradient(135deg, ${primaryColor}18, ${primaryColor}30, ${primaryColor}12)`;

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="relative group/item aspect-square rounded overflow-hidden cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-lg" style={{ background: typeGradient, border: `1px solid ${catColor}28`, ...style }}>
      <div className={`absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-[rgba(0,0,0,0.6)] ${isDark ? '' : 'opacity-40'}`} />

      {showPosition && (
        <div className="absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-black/65 backdrop-blur-sm flex items-center justify-center text-[0.5rem] font-black text-white z-10">
          {index + 1}
        </div>
      )}

      <div className="absolute top-[3px] right-[3px] text-white text-[0.4rem] font-black px-1 py-[1.5px] rounded-[3px] tracking-wider z-10" style={{ backgroundColor: post.type === 'Reels' ? '#ef4444' : post.type === 'Carrossel' ? '#3b82f6' : primaryColor }}>
        {post.type === 'Reels' ? '▶' : post.type === 'Carrossel' ? '◼◼' : '◼'} {post.type.toUpperCase()}
      </div>

      <div className="absolute bottom-[22px] right-[4px] w-[7px] h-[7px] rounded-full border border-white/30 z-10" style={{ backgroundColor: catColor }} />

      <div className="absolute inset-0 flex items-center justify-center z-[5]">
        <div className="text-[1.4rem] pb-2">{post.emoji}</div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 p-1 z-[5] backdrop-blur-[2px] ${isDark ? 'bg-black/50' : 'bg-black/20'}`}>
        <div className="text-[0.48rem] font-black text-center text-white leading-[1.2] drop-shadow-md truncate">
          {post.title}
        </div>
      </div>

      <div
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(post.id); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-[3px] w-[14px] h-[14px] rounded-full bg-red-500/80 text-white flex items-center justify-center text-[0.5rem] font-black cursor-pointer z-20 opacity-0 group-hover/item:opacity-100 transition-opacity hover:!bg-red-500"
        style={{ left: showPosition ? '23px' : '3px' }}
      >
        X
      </div>

      <div className="absolute bottom-[14px] left-[4px] opacity-20 text-[0.45rem] text-white z-10">⠿</div>
    </div>
  );
};

const FeedPreview: React.FC<FeedPreviewProps> = ({ division }) => {
  const { addNotification } = useAppContext();
  const isDark = division !== 'gray-art';
  const theme = DIVISIONS[division];

  const [posts, setPosts] = useState<FeedPost[]>(() => {
    const saved = loadLayout(division);
    return saved && saved.length > 0 ? saved : DIVISION_FEED[division];
  });
  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
  const [hasReordered, setHasReordered] = useState(false);
  const [showPositions, setShowPositions] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<FeedPost['type']>('Post');
  const [newCategory, setNewCategory] = useState('Educacional');
  const [newEmoji, setNewEmoji] = useState('📝');

  React.useEffect(() => {
    const saved = loadLayout(division);
    setPosts(saved && saved.length > 0 ? saved : DIVISION_FEED[division]);
    setHasReordered(false);
  }, [division]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => setActiveDragId(event.active.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = posts.findIndex(p => p.id === active.id);
    const newIdx = posts.findIndex(p => p.id === over.id);
    setPosts(arrayMove(posts, oldIdx, newIdx));
    setHasReordered(true);
  };

  const resetOrder = useCallback(() => {
    setPosts(DIVISION_FEED[division]);
    clearLayout(division);
    setHasReordered(false);
    addNotification('Feed restaurado para a ordem original.', 'info');
  }, [division, addNotification]);

  const saveOrder = useCallback(() => {
    saveLayout(division, posts);
    addNotification('Ordem do feed salva com sucesso!', 'success');
    setHasReordered(false);
  }, [division, posts, addNotification]);

  const removePost = useCallback((id: string) => {
    setPosts(prev => {
      if (prev.length <= 3) {
        addNotification('O grid precisa de pelo menos 3 itens.', 'error');
        return prev;
      }
      setHasReordered(true);
      return prev.filter(p => p.id !== id);
    });
  }, [addNotification]);

  const addPost = useCallback(() => {
    if (!newTitle.trim()) {
      addNotification('Digite um titulo para o post.', 'error');
      return;
    }
    if (posts.length >= 12) {
      addNotification('Maximo de 12 itens no grid.', 'error');
      return;
    }
    const newPost: FeedPost = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: newType,
      title: newTitle.trim(),
      category: newCategory,
      color: theme.colors.primary,
      emoji: newEmoji,
    };
    setPosts(prev => [...prev, newPost]);
    setHasReordered(true);
    setNewTitle('');
    setShowAddModal(false);
    addNotification(`"${newPost.title}" adicionado ao grid.`, 'success');
  }, [newTitle, newType, newCategory, newEmoji, posts.length, theme.colors.primary, addNotification]);

  const activeDragPost = activeDragId ? posts.find(p => p.id === activeDragId) : null;

  const reelsCount = posts.filter(p => p.type === 'Reels').length;
  const postCount = posts.filter(p => p.type === 'Post').length;
  const carrosselCount = posts.filter(p => p.type === 'Carrossel').length;

  const sequenceWarnings: number[] = [];
  for (let i = 1; i < posts.length; i++) {
    if (posts[i].type === posts[i - 1].type) sequenceWarnings.push(i);
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <div>
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-black">
                Grid <span className="text-[var(--primary-color)]">Feed</span>
                <span className="ml-3 text-[10px] bg-[var(--primary-color)]/20 text-[var(--primary-color)] px-2 py-1 rounded-md font-black tracking-widest uppercase align-middle relative -top-1">
                  DRAG & DROP
                </span>
              </h2>
              <p className="text-xs opacity-50 mt-1 font-bold">Arraste os posts para reordenar o planejamento visual do {theme.name}.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowPositions(v => !v)}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-colors ${showPositions ? 'bg-[var(--primary-color)]/20 text-[var(--primary-color)] border border-[var(--primary-color)]/40' : 'bg-[var(--sub-bg)] text-slate-400 border border-transparent hover:text-white'}`}
              >
                #123
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-[var(--primary-color)]/20 text-[var(--primary-color)] text-xs font-black border border-[var(--primary-color)]/40 hover:bg-[var(--primary-color)] hover:text-[var(--card-bg)] transition-colors"
              >
                + ADICIONAR
              </button>
              <button
                onClick={resetOrder}
                className="px-4 py-2 rounded-xl bg-[var(--sub-bg)] text-slate-400 text-xs font-black hover:text-[var(--card-text)] transition-colors"
              >
                RESETAR
              </button>
              {hasReordered && (
                <button
                  onClick={saveOrder}
                  className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-[var(--card-bg)] text-xs font-black shadow-lg shadow-[var(--primary-color)]/30 animate-in zoom-in-95 hover:scale-105 transition-transform"
                >
                  SALVAR ORDEM
                </button>
              )}
            </div>
          </div>

          {showAddModal && (
            <Card className="mb-6 !p-5 border border-[var(--primary-color)]/40 shadow-lg shadow-[var(--primary-color)]/10 animate-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black">Adicionar Post ao Grid</h3>
                <button onClick={() => setShowAddModal(false)} className="opacity-50 hover:opacity-100 font-bold p-1">X</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] opacity-50 font-black tracking-widest uppercase block mb-1">Título</label>
                  <input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Ex: Nova campanha..."
                    maxLength={40}
                    className="w-full p-2.5 rounded-lg bg-[var(--sub-bg)] border-none text-sm font-bold focus:ring-2 ring-[var(--primary-color)] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] opacity-50 font-black tracking-widest uppercase block mb-1">Emoji</label>
                  <input
                    value={newEmoji}
                    onChange={e => setNewEmoji(e.target.value)}
                    maxLength={4}
                    className="w-full p-2.5 rounded-lg bg-[var(--sub-bg)] border-none text-sm font-bold focus:ring-2 ring-[var(--primary-color)] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] opacity-50 font-black tracking-widest uppercase block mb-1">Tipo</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as FeedPost['type'])}
                    className="w-full p-2.5 rounded-lg bg-[var(--sub-bg)] border-none text-sm font-bold focus:ring-2 ring-[var(--primary-color)] outline-none"
                  >
                    <option value="Post">Post</option>
                    <option value="Reels">Reels</option>
                    <option value="Carrossel">Carrossel</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] opacity-50 font-black tracking-widest uppercase block mb-1">Categoria</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-[var(--sub-bg)] border-none text-sm font-bold focus:ring-2 ring-[var(--primary-color)] outline-none"
                  >
                    {Object.keys(CATEGORY_COLORS).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={addPost}
                className="mt-4 w-full p-3 rounded-xl bg-[var(--primary-color)] text-[var(--card-bg)] font-black text-sm hover:brightness-110 transition-all shadow-md shadow-[var(--primary-color)]/20"
              >
                ADICIONAR AO GRID
              </button>
            </Card>
          )}

          <div className="flex justify-center">
            <div className={`w-[360px] rounded-[40px] overflow-hidden border-8 shadow-2xl relative ${isDark ? 'bg-[#0d0d0d] border-[#2a2a2a] shadow-black/50' : 'bg-white border-gray-200 shadow-gray-400'}`}>
              <div className={`flex justify-center pt-2 ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`}>
                <div className={`w-20 h-6 rounded-b-[14px] ${isDark ? 'bg-black' : 'bg-[#1a1a1a]'}`} />
              </div>

              <div className={`p-3 sm:px-4 sm:py-3 flex items-center gap-3 border-b ${isDark ? 'bg-[#111] border-white/5' : 'bg-gray-50 border-black/5'}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm border-2 shadow-sm" style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primary}88)`, borderColor: theme.colors.primary, boxShadow: `0 0 8px ${theme.colors.primary}44` }}>
                  G
                </div>
                <div>
                  <div className="font-black text-sm">{theme.name.toLowerCase().replace(/\s/g, '_')}</div>
                  <div className="text-[10px] font-bold opacity-50">{posts.length} publicações</div>
                </div>
                <div className="ml-auto flex gap-3 text-lg font-bold">
                  <span>+</span>
                  <span>☰</span>
                </div>
              </div>

              <div className={`grid grid-cols-3 p-3 text-center border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                {[
                  { label: 'Posts', val: posts.length },
                  { label: 'Seguindo', val: '142' },
                  { label: 'Seguidores', val: '3.8k' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="font-black text-base">{item.val}</div>
                    <div className="text-[10px] opacity-60 font-bold">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className={`px-4 py-2 text-[10px] font-bold opacity-60 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                {theme.tagline} | Grupo Gray
              </div>

              <div className={`grid grid-cols-3 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                {['Grid', 'Reels', 'Tags'].map((tab, i) => (
                  <div key={tab} className={`p-2 text-center text-[10px] font-bold border-b-2 ${i === 0 ? 'opacity-100' : 'opacity-30 border-transparent'}`} style={{ borderBottomColor: i === 0 ? theme.colors.primary : 'transparent' }}>
                    {tab === 'Grid' ? '▦' : tab === 'Reels' ? '▶' : '◉'} {tab}
                  </div>
                ))}
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={posts.map(p => p.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 gap-[2px] p-[2px] bg-black/10">
                    {posts.map((post, idx) => (
                      <SortableItem
                        key={post.id} post={post} index={idx} isDark={isDark} primaryColor={theme.colors.primary}
                        isDragging={activeDragId === post.id} onRemove={removePost} showPosition={showPositions}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeDragPost && (
                    <div className="aspect-square w-[100px] rounded-md flex flex-col items-center justify-center border-2 border-dashed shadow-2xl rotate-3 scale-110" style={{ background: `linear-gradient(135deg, ${theme.colors.primary}55, ${theme.colors.primary}aa)`, borderColor: theme.colors.primary }}>
                      <span className="text-2xl mb-1">{activeDragPost.emoji}</span>
                      <span className="text-[10px] font-black text-white text-center px-1 truncate w-full drop-shadow-md">{activeDragPost.title}</span>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="!p-4 bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/30">
            <div className="text-xs font-black tracking-widest text-[var(--primary-color)] mb-2 uppercase">Como Usar</div>
            <ul className="text-[11px] opacity-70 font-bold space-y-1.5 list-disc pl-4">
              <li>Segure e arraste qualquer post</li>
              <li>Solte na posição desejada</li>
              <li>O grid atualiza em tempo real</li>
              <li>Clique em "Salvar Ordem" para persistir</li>
              <li>Passe o mouse sobre um post para remover</li>
              <li>"+ Adicionar" para novos itens no grid</li>
            </ul>
          </Card>

          {sequenceWarnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 animate-in fade-in slide-in-from-top-2">
              <div className="text-xs font-black mb-1 uppercase tracking-widest">Alerta de Sequência</div>
              <div className="text-[11px] font-medium opacity-80 leading-relaxed">
                {sequenceWarnings.length} par(es) de tipos consecutivos detectados. Para melhor alcance, intercale os formatos.
              </div>
            </div>
          )}

          <Card>
            <h3 className="text-xs font-black tracking-widest uppercase opacity-70 mb-4">Composição do Grid</h3>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Reels', count: reelsCount, color: '#ef4444', pct: posts.length > 0 ? Math.round((reelsCount / posts.length) * 100) : 0 },
                { label: 'Carrossel', count: carrosselCount, color: '#3b82f6', pct: posts.length > 0 ? Math.round((carrosselCount / posts.length) * 100) : 0 },
                { label: 'Post Estático', count: postCount, color: theme.colors.primary, pct: posts.length > 0 ? Math.round((postCount / posts.length) * 100) : 0 },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[11px] font-black" style={{ color: item.color }}>{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--sub-bg)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-[10px] font-bold opacity-50 text-center uppercase tracking-widest">
              {posts.length} itens no grid | {Math.ceil(posts.length / 3)} linha(s)
            </div>
          </Card>

          <Card>
            <h3 className="text-xs font-black tracking-widest uppercase opacity-70 mb-4">Categorias</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
                const countInGrid = posts.filter(p => p.category === cat).length;
                return (
                  <div key={cat} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[10px] font-black transition-all ${countInGrid > 0 ? 'opacity-100' : 'opacity-40'}`} style={{ backgroundColor: countInGrid > 0 ? `${color}20` : `${color}08`, borderColor: countInGrid > 0 ? `${color}44` : `${color}18`, color }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="uppercase">{cat}</span>
                    {countInGrid > 0 && <span className="opacity-80 ml-0.5">({countInGrid})</span>}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="bg-[var(--sub-bg)] !border-none">
            <div className="text-xs font-black tracking-widest uppercase opacity-50 mb-2">Dica de Algoritmo</div>
            <div className="text-[11px] font-medium opacity-70 leading-relaxed">
              Para máximo alcance, intercale Reels - Carrossel - Post. Nunca poste 2 conteúdos do mesmo tipo consecutivamente. O layout ideal é 3x3 com variedade de formatos e categorias.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FeedPreview;
