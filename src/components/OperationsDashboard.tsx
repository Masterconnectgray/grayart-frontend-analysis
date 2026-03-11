import React, { useState } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';

interface OperationsDashboardProps {
  division: Division;
}

interface Task {
  id: number;
  title: string;
  responsible: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  priority: 'alta' | 'media' | 'baixa';
}

interface Process {
  id: number;
  name: string;
  progress: number;
  responsible: string;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'PENDENTE',
  em_andamento: 'EM ANDAMENTO',
  concluido: 'CONCLUÍDO',
};

const STATUS_COLORS: Record<string, string> = {
  pendente: '#f59e0b',
  em_andamento: '#3b82f6',
  concluido: '#22c55e',
};

const PRIORITY_COLORS: Record<string, string> = {
  alta: '#ef4444',
  media: '#f59e0b',
  baixa: '#22c55e',
};

const INITIAL_DATA: Record<Division, {
  processes: Process[];
  tasks: Task[];
  team: TeamMember[];
}> = {
  'connect-gray': {
    processes: [
      { id: 1, name: 'Organização Coffee Meet - Março', progress: 75, responsible: 'Edy' },
      { id: 2, name: 'Captação Síndicos Novos', progress: 40, responsible: 'Isadora' },
      { id: 3, name: 'Núcleo de Arquitetos', progress: 20, responsible: 'Emerson' },
    ],
    tasks: [
      { id: 1, title: 'Confirmar local próximo Coffee Meet', responsible: 'Edy', status: 'em_andamento', priority: 'alta' },
      { id: 2, title: 'Atualizar lista de fornecedores', responsible: 'Isadora', status: 'pendente', priority: 'media' },
      { id: 3, title: 'Criar material de divulgação evento', responsible: 'Edy', status: 'pendente', priority: 'alta' },
    ],
    team: [
      { id: 1, name: 'Emerson Gray', role: 'CEO / Estratégia' },
      { id: 2, name: 'Edy', role: 'Marketing / Coffee Meet' },
      { id: 3, name: 'Isadora', role: 'Apoio Administrativo' },
    ],
  },
  'gray-up': {
    processes: [
      { id: 1, name: 'Modernização Salvador Dalí', progress: 60, responsible: 'Júnior / Arcenal' },
      { id: 2, name: 'Projeto Otis - 2 elevadores', progress: 35, responsible: 'Edmilson' },
    ],
    tasks: [
      { id: 1, title: 'Solicitar peças modernização Salvador Dalí', responsible: 'André', status: 'em_andamento', priority: 'alta' },
      { id: 2, title: 'Vistoria técnica Otis - elevador 1', responsible: 'Edmilson', status: 'pendente', priority: 'alta' },
    ],
    team: [
      { id: 1, name: 'Emerson Gray', role: 'CEO / Gestor' },
      { id: 2, name: 'Gabriel', role: 'Engenheiro Eletricista' },
    ],
  },
  'gray-up-flow': {
    processes: [
      { id: 1, name: 'Implantação Lean - Transportadora ABC', progress: 65, responsible: 'Emerson' },
    ],
    tasks: [
      { id: 1, title: 'Entregar fluxograma Transportadora ABC', responsible: 'Emerson', status: 'em_andamento', priority: 'alta' },
    ],
    team: [
      { id: 1, name: 'Emerson Gray', role: 'Consultor / Implantação' },
    ],
  },
  'gray-art': {
    processes: [
      { id: 1, name: 'Rebranding - Cliente Alpha', progress: 70, responsible: 'Gray ART' },
      { id: 2, name: 'Social Media - Grupo Gray', progress: 45, responsible: 'Edy' },
    ],
    tasks: [
      { id: 1, title: 'Calendário editorial março - Grupo Gray', responsible: 'Edy', status: 'em_andamento', priority: 'alta' },
      { id: 2, title: 'Entregar manual de marca Alpha', responsible: 'Gray ART', status: 'pendente', priority: 'alta' },
    ],
    team: [
      { id: 1, name: 'Emerson Gray', role: 'Diretor Criativo' },
      { id: 2, name: 'Edy', role: 'Social Media / Marketing' },
    ],
  },
};

const OperationsDashboard: React.FC<OperationsDashboardProps> = ({ division }) => {
  const { addNotification, stats } = useAppContext();
  const theme = DIVISIONS[division];
  const isDark = division !== 'gray-art';

  const [activeSection, setActiveSection] = useState<'processos' | 'tarefas' | 'equipe'>('processos');
  const [data, setData] = useState(INITIAL_DATA);


  // Indicators based on stats for gray-art, or fixed for others
  const metrics = division === 'gray-art' ? [
    { label: 'Vídeos Criados', value: stats.videosCreated.toString(), trend: '+' + stats.videosCreated },
    { label: 'Posts Publicados', value: stats.postsPublished.toString(), trend: '+' + stats.postsPublished },
    { label: 'Tarefas Ativas', value: data[division].tasks.filter(t => t.status !== 'concluido').length.toString(), trend: '0' },
    { label: 'Membros Equipe', value: data[division].team.length.toString(), trend: '+1' },
  ] : [
    { label: 'Projetos/Processos', value: data[division].processes.length.toString(), trend: '+1' },
    { label: 'Tarefas Pendentes', value: data[division].tasks.filter(t => t.status !== 'concluido').length.toString(), trend: '-2' },
    { label: 'Eficiência', value: '88%', trend: '+2%' },
    { label: 'Equipe', value: data[division].team.length.toString(), trend: '0' },
  ];

  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const cardText = isDark ? '#fff' : '#1a1a1a';
  const subBg = isDark ? '#2d2d2d' : '#f0f2f5';

  const cycleStatus = (taskId: number) => {
    setData(prev => ({
      ...prev,
      [division]: {
        ...prev[division],
        tasks: prev[division].tasks.map(t => {
          if (t.id !== taskId) return t;
          const order: Task['status'][] = ['pendente', 'em_andamento', 'concluido'];
          const idx = order.indexOf(t.status);
          return { ...t, status: order[(idx + 1) % 3] };
        }),
      },
    }));
  };

  const deleteItem = (type: 'processes' | 'tasks' | 'team', id: number) => {
    setData(prev => ({
      ...prev,
      [division]: {
        ...prev[division],
        [type]: (prev[division][type] as { id: number }[]).filter(item => item.id !== id),
      },
    }));
    addNotification("Item removido com sucesso.", 'info');
  };

  const addItem = (type: 'processes' | 'tasks' | 'team') => {
    const id = Date.now();
    setData(prev => {
      const divData = prev[division];
      const updated = { ...divData };
      if (type === 'tasks') {
        updated.tasks = [...divData.tasks, { id, title: 'Nova Tarefa', responsible: 'Emerson', status: 'pendente' as const, priority: 'media' as const }];
      } else if (type === 'processes') {
        updated.processes = [...divData.processes, { id, name: 'Novo Processo', progress: 0, responsible: 'Emerson' }];
      } else if (type === 'team') {
        updated.team = [...divData.team, { id, name: 'Novo Membro', role: 'Colaborador' }];
      }
      return { ...prev, [division]: updated };
    });
    addNotification("Novo item adicionado. Clique para editar.", 'success');
  };

  return (
    <div className="animate-fade-in">
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {metrics.map((m, i) => (
          <div key={i} className="premium-card" style={{ backgroundColor: cardBg, color: cardText, borderBottom: `4px solid ${theme.colors.primary}` }}>
            <h4 style={{ opacity: 0.4, fontSize: '0.65rem', marginBottom: '0.5rem', fontWeight: 800, letterSpacing: '0.05em' }}>{m.label.toUpperCase()}</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>{m.value}</span>
              <span style={{
                color: m.trend.startsWith('+') ? '#22c55e' : m.trend.startsWith('-') ? '#ef4444' : (isDark ? '#666' : '#999'),
                fontSize: '0.8rem', fontWeight: 800,
              }}>{m.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Section Tabs & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: subBg, padding: '0.3rem', borderRadius: '12px' }}>
          {(['processos', 'tarefas', 'equipe'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              style={{
                padding: '0.6rem 1.2rem', borderRadius: '10px',
                backgroundColor: activeSection === tab ? theme.colors.primary : 'transparent',
                color: activeSection === tab ? (isDark ? '#fff' : '#000') : (isDark ? '#666' : '#999'),
                fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.3s'
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => addItem(activeSection === 'processos' ? 'processes' : activeSection === 'tarefas' ? 'tasks' : 'team')}
          style={{
            padding: '0.6rem 1.5rem', borderRadius: '12px', background: theme.colors.primary,
            color: isDark ? '#fff' : '#000', fontWeight: 800, fontSize: '0.8rem',
            cursor: 'pointer', boxShadow: `0 4px 15px ${theme.colors.primary}44`
          }}
        >
          + ADICIONAR {activeSection.slice(0, -1).toUpperCase()}
        </button>
      </div>

      <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText, minHeight: '400px' }}>
        {activeSection === 'processos' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', color: theme.colors.primary }}>PROCESSOS ATIVOS</h3>
            {data[division].processes.map(proc => (
              <div key={proc.id} style={{ padding: '1.2rem', borderRadius: '16px', background: subBg, position: 'relative' }}>
                <button onClick={() => deleteItem('processes', proc.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', color: '#ef4444', fontSize: '1rem', cursor: 'pointer', border: 'none' }}>×</button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <div contentEditable suppressContentEditableWarning={true} onBlur={(e) => {
                    const newName = (e.target as HTMLElement).innerText;
                    setData(prev => ({
                      ...prev,
                      [division]: {
                        ...prev[division],
                        processes: prev[division].processes.map(p => p.id === proc.id ? { ...p, name: newName } : p),
                      },
                    }));
                  }} style={{ fontWeight: 800, fontSize: '1rem', outline: 'none' }}>{proc.name}</div>
                  <span style={{ fontWeight: 900, color: theme.colors.primary }}>{proc.progress}%</span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: isDark ? '#333' : '#e0e0e0', overflow: 'hidden', cursor: 'pointer' }} onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const pct = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)));
                  setData(prev => ({
                    ...prev,
                    [division]: {
                      ...prev[division],
                      processes: prev[division].processes.map(p => p.id === proc.id ? { ...p, progress: pct } : p),
                    },
                  }));
                }}>
                  <div style={{ width: `${proc.progress}%`, height: '100%', background: theme.colors.primary, transition: 'width 0.3s' }} />
                </div>
                <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', opacity: 0.5, fontWeight: 700 }}>Responsável: {proc.responsible}</div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'tarefas' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', color: theme.colors.primary }}>PENDÊNCIAS OPERACIONAIS</h3>
            {data[division].tasks.map(task => (
              <div key={task.id} style={{ padding: '1rem', borderRadius: '16px', background: subBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: task.status === 'concluido' ? 0.4 : 1 }}>
                <div style={{ flex: 1 }}>
                  <div contentEditable suppressContentEditableWarning={true} onBlur={(e) => {
                    const newTitle = (e.target as HTMLElement).innerText;
                    setData(prev => ({
                      ...prev,
                      [division]: {
                        ...prev[division],
                        tasks: prev[division].tasks.map(t => t.id === task.id ? { ...t, title: newTitle } : t),
                      },
                    }));
                  }} style={{ fontWeight: 700, fontSize: '0.9rem', outline: 'none', textDecoration: task.status === 'concluido' ? 'line-through' : 'none' }}>{task.title}</div>
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginTop: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.5 }}>{task.responsible}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: PRIORITY_COLORS[task.priority], background: `${PRIORITY_COLORS[task.priority]}15`, padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{task.priority.toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => cycleStatus(task.id)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: `${STATUS_COLORS[task.status]}15`, color: STATUS_COLORS[task.status], fontWeight: 800, fontSize: '0.7rem', border: `1px solid ${STATUS_COLORS[task.status]}33`, cursor: 'pointer' }}>
                    {STATUS_LABELS[task.status]}
                  </button>
                  <button onClick={() => deleteItem('tasks', task.id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'equipe' && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.2rem', color: theme.colors.primary }}>COLABORADORES</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {data[division].team.map(member => (
                <div key={member.id} style={{ padding: '1.2rem', borderRadius: '20px', background: subBg, display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
                  <button onClick={() => deleteItem('team', member.id)} style={{ position: 'absolute', top: '10px', right: '10px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>×</button>
                  <div style={{ width: '45px', height: '45px', borderRadius: '13px', background: theme.colors.primary, color: isDark ? '#000' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem' }}>
                    {member.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div contentEditable suppressContentEditableWarning={true} onBlur={(e) => {
                      const newName = (e.target as HTMLElement).innerText;
                      setData(prev => ({
                        ...prev,
                        [division]: {
                          ...prev[division],
                          team: prev[division].team.map(m => m.id === member.id ? { ...m, name: newName } : m),
                        },
                      }));
                    }} style={{ fontWeight: 800, fontSize: '0.9rem', outline: 'none' }}>{member.name}</div>
                    <div contentEditable suppressContentEditableWarning={true} onBlur={(e) => {
                      const newRole = (e.target as HTMLElement).innerText;
                      setData(prev => ({
                        ...prev,
                        [division]: {
                          ...prev[division],
                          team: prev[division].team.map(m => m.id === member.id ? { ...m, role: newRole } : m),
                        },
                      }));
                    }} style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 700, outline: 'none' }}>{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationsDashboard;
