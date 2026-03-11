import React, { useState, useCallback } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
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
import { useAppContext } from '../context/AppContext';

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

// ── localStorage helpers ───────────────────────────────────────────────────────
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

// ── Item Sortavel ──────────────────────────────────────────────────────────────
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
    position: 'relative',
  };

  const catColor = CATEGORY_COLORS[post.category] || primaryColor;
  const typeGradient = post.type === 'Reels'
    ? 'linear-gradient(135deg, #ef444422, #f9731622, #ef444411)'
    : post.type === 'Carrossel'
      ? 'linear-gradient(135deg, #3b82f622, #6366f122, #3b82f611)'
      : `linear-gradient(135deg, ${primaryColor}18, ${primaryColor}30, ${primaryColor}12)`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div style={{
        aspectRatio: '1 / 1',
        borderRadius: '4px',
        background: typeGradient,
        border: `1px solid ${catColor}28`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        cursor: 'grab', userSelect: 'none',
        transition: 'box-shadow 0.2s, transform 0.15s',
      }}>
        {/* Overlay gradiente simulando foto */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(180deg, transparent 40%, ${isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.25)'} 100%)`,
          pointerEvents: 'none',
        }} />

        {/* Numeracao de posicao */}
        {showPosition && (
          <div style={{
            position: 'absolute', top: '3px', left: '3px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.5rem', fontWeight: 900, color: '#fff',
            zIndex: 3,
          }}>
            {index + 1}
          </div>
        )}

        {/* Type badge */}
        <div style={{
          position: 'absolute', top: '3px', right: '3px',
          background: post.type === 'Reels' ? '#ef4444' : post.type === 'Carrossel' ? '#3b82f6' : primaryColor,
          color: '#fff', fontSize: '0.4rem', fontWeight: 900,
          padding: '1.5px 4px', borderRadius: '3px', letterSpacing: '0.5px',
          zIndex: 3,
        }}>
          {post.type === 'Reels' ? '▶' : post.type === 'Carrossel' ? '◼◼' : '◼'} {post.type.toUpperCase()}
        </div>

        {/* Category dot */}
        <div style={{
          position: 'absolute', bottom: '22px', right: '4px',
          width: '7px', height: '7px', borderRadius: '50%',
          background: catColor, border: '1px solid rgba(255,255,255,0.3)',
          zIndex: 3,
        }} />

        {/* Emoji */}
        <div style={{ fontSize: '1.4rem', marginBottom: '0.15rem', zIndex: 2 }}>{post.emoji}</div>

        {/* Title bar (bottom overlay) */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '3px 5px', zIndex: 2,
          background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            fontSize: '0.48rem', fontWeight: 800, textAlign: 'center',
            color: '#fff', lineHeight: 1.2,
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {post.title}
          </div>
        </div>

        {/* Botao remover */}
        <div
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(post.id); }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '3px', left: showPosition ? '23px' : '3px',
            width: '14px', height: '14px', borderRadius: '50%',
            background: 'rgba(239,68,68,0.8)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.5rem', fontWeight: 900, cursor: 'pointer',
            zIndex: 4, opacity: 0, transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
        >
          X
        </div>

        {/* Drag handle indicator */}
        <div style={{ position: 'absolute', bottom: '14px', left: '4px', opacity: 0.2, fontSize: '0.45rem', color: '#fff', zIndex: 3 }}>⠿</div>
      </div>
    </div>
  );
};

// ── Componente Principal ─────────────────────────────────────────────────────
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

  // Novo post form
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = posts.findIndex(p => p.id === active.id);
    const newIdx = posts.findIndex(p => p.id === over.id);
    const newPosts = arrayMove(posts, oldIdx, newIdx);
    setPosts(newPosts);
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
      const next = prev.filter(p => p.id !== id);
      setHasReordered(true);
      return next;
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

  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const subBg = isDark ? '#2d2d2d' : '#f0f2f5';

  // Stats por tipo
  const reelsCount = posts.filter(p => p.type === 'Reels').length;
  const postCount = posts.filter(p => p.type === 'Post').length;
  const carrosselCount = posts.filter(p => p.type === 'Carrossel').length;

  // Analise de sequencia (detectar tipos consecutivos)
  const sequenceWarnings: number[] = [];
  for (let i = 1; i < posts.length; i++) {
    if (posts[i].type === posts[i - 1].type) {
      sequenceWarnings.push(i);
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>

        {/* ── Grid Principal ──────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                Grid <span style={{ color: theme.colors.primary }}>Feed</span>
                <span style={{ marginLeft: '0.8rem', fontSize: '0.65rem', background: `${theme.colors.primary}22`, color: theme.colors.primary, padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 900 }}>
                  DRAG & DROP
                </span>
              </h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.4, marginTop: '0.2rem' }}>Arraste os posts para reordenar o planejamento visual do {theme.name}.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Toggle numeracao */}
              <button
                onClick={() => setShowPositions(v => !v)}
                style={{
                  padding: '0.5rem 0.8rem', borderRadius: '10px',
                  background: showPositions ? `${theme.colors.primary}22` : (isDark ? '#2d2d2d' : '#eee'),
                  color: showPositions ? theme.colors.primary : (isDark ? '#888' : '#666'),
                  fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer',
                  border: showPositions ? `1px solid ${theme.colors.primary}44` : '1px solid transparent',
                }}
              >
                #123
              </button>
              {/* Adicionar */}
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: '0.5rem 0.8rem', borderRadius: '10px',
                  background: `${theme.colors.primary}22`, color: theme.colors.primary,
                  fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer',
                  border: `1px solid ${theme.colors.primary}44`,
                }}
              >
                + ADICIONAR
              </button>
              {/* Resetar */}
              <button
                onClick={resetOrder}
                style={{
                  padding: '0.5rem 0.8rem', borderRadius: '10px',
                  background: isDark ? '#2d2d2d' : '#eee',
                  fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer',
                  color: isDark ? '#aaa' : '#666',
                }}
              >
                RESETAR
              </button>
              {/* Salvar */}
              {hasReordered && (
                <button
                  onClick={saveOrder}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '10px',
                    background: theme.colors.primary, color: isDark ? '#fff' : '#000',
                    fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer',
                    boxShadow: `0 2px 12px ${theme.colors.primary}44`,
                  }}
                >
                  SALVAR ORDEM
                </button>
              )}
            </div>
          </div>

          {/* ── Modal Adicionar Post ───────────────────────────────────────── */}
          {showAddModal && (
            <div style={{
              marginBottom: '1.5rem', padding: '1.2rem', borderRadius: '16px',
              background: cardBg, border: `1px solid ${theme.colors.primary}44`,
              boxShadow: `0 4px 20px ${theme.colors.primary}15`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>Adicionar Post ao Grid</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.5, color: isDark ? '#fff' : '#000' }}
                >
                  X
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.65rem', opacity: 0.5, display: 'block', marginBottom: '0.3rem' }}>TITULO</label>
                  <input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Ex: Nova campanha..."
                    maxLength={40}
                    style={{
                      width: '100%', padding: '0.6rem', borderRadius: '8px',
                      background: subBg, border: 'none', color: isDark ? '#fff' : '#000',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', opacity: 0.5, display: 'block', marginBottom: '0.3rem' }}>EMOJI</label>
                  <input
                    value={newEmoji}
                    onChange={e => setNewEmoji(e.target.value)}
                    maxLength={4}
                    style={{
                      width: '100%', padding: '0.6rem', borderRadius: '8px',
                      background: subBg, border: 'none', color: isDark ? '#fff' : '#000',
                      fontSize: '0.8rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', opacity: 0.5, display: 'block', marginBottom: '0.3rem' }}>TIPO</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as FeedPost['type'])}
                    style={{
                      width: '100%', padding: '0.6rem', borderRadius: '8px',
                      background: subBg, border: 'none', color: isDark ? '#fff' : '#000',
                      fontSize: '0.8rem',
                    }}
                  >
                    <option value="Post">Post</option>
                    <option value="Reels">Reels</option>
                    <option value="Carrossel">Carrossel</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', opacity: 0.5, display: 'block', marginBottom: '0.3rem' }}>CATEGORIA</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    style={{
                      width: '100%', padding: '0.6rem', borderRadius: '8px',
                      background: subBg, border: 'none', color: isDark ? '#fff' : '#000',
                      fontSize: '0.8rem',
                    }}
                  >
                    {Object.keys(CATEGORY_COLORS).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={addPost}
                style={{
                  marginTop: '1rem', width: '100%', padding: '0.7rem',
                  borderRadius: '10px', background: theme.colors.primary,
                  color: isDark ? '#fff' : '#000', fontWeight: 800,
                  fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                ADICIONAR AO GRID
              </button>
            </div>
          )}

          {/* ── Mockup do celular com o grid ─────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: '360px',
              background: isDark ? '#0d0d0d' : '#fff',
              borderRadius: '40px',
              border: `8px solid ${isDark ? '#2a2a2a' : '#ddd'}`,
              boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px ${isDark ? '#333' : '#ccc'}`,
              overflow: 'hidden',
            }}>
              {/* Notch */}
              <div style={{
                display: 'flex', justifyContent: 'center', paddingTop: '8px',
                background: isDark ? '#111' : '#f8f8f8',
              }}>
                <div style={{
                  width: '80px', height: '24px', borderRadius: '0 0 14px 14px',
                  background: isDark ? '#000' : '#1a1a1a',
                }} />
              </div>

              {/* Phone header */}
              <div style={{
                background: isDark ? '#111' : '#f8f8f8', padding: '0.6rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primary}88)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 900, color: '#fff',
                  border: `2px solid ${theme.colors.primary}`,
                  boxShadow: `0 0 8px ${theme.colors.primary}44`,
                }}>G</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: isDark ? '#fff' : '#000' }}>
                    {theme.name.toLowerCase().replace(/\s/g, '_')}
                  </div>
                  <div style={{ fontSize: '0.55rem', opacity: 0.4, color: isDark ? '#fff' : '#000' }}>
                    {posts.length} publicacoes
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.8rem', color: isDark ? '#fff' : '#000' }}>
                  <span style={{ fontSize: '1.1rem' }}>+</span>
                  <span style={{ fontSize: '1.1rem' }}>&#9776;</span>
                </div>
              </div>

              {/* Stats row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                padding: '0.7rem', gap: '0', textAlign: 'center',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              }}>
                {([['Posts', posts.length], ['Seguindo', '142'], ['Seguidores', '3.8k']] as const).map(([label, val], i) => (
                  <div key={i}>
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: isDark ? '#fff' : '#000' }}>{val}</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.4, color: isDark ? '#fff' : '#000' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Bio mini */}
              <div style={{
                padding: '0.5rem 1rem', fontSize: '0.6rem', opacity: 0.5,
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                color: isDark ? '#fff' : '#000',
              }}>
                {theme.tagline} | Grupo Gray
              </div>

              {/* Tab bar (Grid / Reels / Tagged) */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              }}>
                {['Grid', 'Reels', 'Tags'].map((tab, i) => (
                  <div key={tab} style={{
                    padding: '0.5rem', textAlign: 'center', fontSize: '0.6rem',
                    fontWeight: i === 0 ? 800 : 600,
                    opacity: i === 0 ? 1 : 0.3,
                    borderBottom: i === 0 ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
                    color: isDark ? '#fff' : '#000',
                  }}>
                    {tab === 'Grid' ? '▦' : tab === 'Reels' ? '▶' : '◉'} {tab}
                  </div>
                ))}
              </div>

              {/* DnD Grid */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={posts.map(p => p.id)} strategy={rectSortingStrategy}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', padding: '2px' }}>
                    {posts.map((post, idx) => (
                      <SortableItem
                        key={post.id}
                        post={post}
                        index={idx}
                        isDark={isDark}
                        primaryColor={theme.colors.primary}
                        isDragging={activeDragId === post.id}
                        onRemove={removePost}
                        showPosition={showPositions}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeDragPost && (
                    <div style={{
                      aspectRatio: '1/1', width: '100px', borderRadius: '6px',
                      background: `linear-gradient(135deg, ${theme.colors.primary}55, ${theme.colors.primary}aa)`,
                      border: `2px solid ${theme.colors.primary}`,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 15px 40px rgba(0,0,0,0.6), 0 0 20px ${theme.colors.primary}33`,
                      cursor: 'grabbing', transform: 'rotate(2deg) scale(1.08)',
                    }}>
                      <span style={{ fontSize: '1.6rem', marginBottom: '0.2rem' }}>{activeDragPost.emoji}</span>
                      <span style={{
                        fontSize: '0.5rem', fontWeight: 800, color: '#fff',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        textAlign: 'center', padding: '0 6px',
                      }}>
                        {activeDragPost.title}
                      </span>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        </div>

        {/* ── Painel lateral ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Instrucao */}
          <div style={{ padding: '1rem', borderRadius: '16px', background: `${theme.colors.primary}15`, border: `1px solid ${theme.colors.primary}33` }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.colors.primary, marginBottom: '0.5rem' }}>COMO USAR</div>
            <ul style={{ fontSize: '0.72rem', opacity: 0.7, lineHeight: 1.8, marginLeft: '1rem' }}>
              <li>Segure e arraste qualquer post</li>
              <li>Solte na posicao desejada</li>
              <li>O grid atualiza em tempo real</li>
              <li>Clique em "Salvar Ordem" para persistir</li>
              <li>Passe o mouse sobre um post para remover</li>
              <li>"+ Adicionar" para novos itens no grid</li>
            </ul>
          </div>

          {/* Alerta de sequencia */}
          {sequenceWarnings.length > 0 && (
            <div style={{
              padding: '0.8rem 1rem', borderRadius: '12px',
              background: '#f59e0b15', border: '1px solid #f59e0b33',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', marginBottom: '0.3rem' }}>
                ALERTA DE SEQUENCIA
              </div>
              <div style={{ fontSize: '0.68rem', opacity: 0.7, lineHeight: 1.5 }}>
                {sequenceWarnings.length} par(es) de tipos consecutivos detectados.
                Para melhor alcance, intercale os formatos.
              </div>
            </div>
          )}

          {/* Composicao do Grid */}
          <div className="premium-card" style={{ backgroundColor: cardBg }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', opacity: 0.7 }}>COMPOSICAO DO GRID</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {[
                { label: 'Reels', count: reelsCount, color: '#ef4444', pct: posts.length > 0 ? Math.round((reelsCount / posts.length) * 100) : 0 },
                { label: 'Carrossel', count: carrosselCount, color: '#3b82f6', pct: posts.length > 0 ? Math.round((carrosselCount / posts.length) * 100) : 0 },
                { label: 'Post Estatico', count: postCount, color: theme.colors.primary, pct: posts.length > 0 ? Math.round((postCount / posts.length) * 100) : 0 },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{item.label}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: item.color }}>{item.count} ({item.pct}%)</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: isDark ? '#333' : '#eee', overflow: 'hidden' }}>
                    <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.65rem', opacity: 0.4, textAlign: 'center' }}>
              {posts.length} itens no grid | {Math.ceil(posts.length / 3)} linha(s)
            </div>
          </div>

          {/* Legenda de Categorias */}
          <div className="premium-card" style={{ backgroundColor: cardBg }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', opacity: 0.7 }}>CATEGORIAS</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
                const countInGrid = posts.filter(p => p.category === cat).length;
                return (
                  <div key={cat} style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.25rem 0.5rem', borderRadius: '6px',
                    background: countInGrid > 0 ? `${color}20` : `${color}08`,
                    border: `1px solid ${countInGrid > 0 ? `${color}44` : `${color}18`}`,
                    opacity: countInGrid > 0 ? 1 : 0.4,
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color }}>{cat}</span>
                    {countInGrid > 0 && (
                      <span style={{ fontSize: '0.5rem', fontWeight: 900, color, marginLeft: '2px' }}>({countInGrid})</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dica de Algoritmo */}
          <div style={{ padding: '1rem', borderRadius: '16px', background: subBg }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, marginBottom: '0.5rem' }}>DICA DE ALGORITMO</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.65, lineHeight: 1.5 }}>
              Para maximo alcance, intercale Reels - Carrossel - Post. Nunca poste 2 conteudos do mesmo tipo consecutivamente.
              O layout ideal e 3x3 com variedade de formatos e categorias.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedPreview;
