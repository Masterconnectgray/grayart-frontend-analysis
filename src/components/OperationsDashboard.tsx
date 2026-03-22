import React, { useState } from 'react';
import type { Division } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import { Card } from '../design-system';
import { Plus, Trash2, CheckCircle2, Clock, Circle } from 'lucide-react';

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

const STATUS_COLORS: Record<string, { bg: string, text: string, border: string, icon: React.ReactNode }> = {
  pendente: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30', icon: <Circle size={14} /> },
  em_andamento: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30', icon: <Clock size={14} /> },
  concluido: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30', icon: <CheckCircle2 size={14} /> },
};

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-red-500/15 text-red-500',
  media: 'bg-amber-500/15 text-amber-500',
  baixa: 'bg-emerald-500/15 text-emerald-500',
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
    <div className="animate-in fade-in duration-300">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((m, i) => (
          <Card key={i} className="border-b-4 border-[var(--primary-color)] !p-5">
            <h4 className="opacity-40 text-[10px] uppercase font-black tracking-widest mb-2">{m.label}</h4>
            <div className="flex justify-between items-end">
              <span className="text-3xl font-black">{m.value}</span>
              <span className={`text-sm font-black ${m.trend.startsWith('+') ? 'text-emerald-500' : m.trend.startsWith('-') ? 'text-red-500' : 'text-slate-400'}`}>
                {m.trend}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Section Tabs & Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex gap-2 p-1.5 rounded-xl bg-[var(--sub-bg)] overflow-x-auto max-w-full">
          {(['processos', 'tarefas', 'equipe'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all duration-300
                ${activeSection === tab ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-md' : 'text-slate-400 hover:text-[var(--card-text)]'}`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => addItem(activeSection === 'processos' ? 'processes' : activeSection === 'tarefas' ? 'tasks' : 'team')}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--primary-color)] text-[var(--card-bg)] font-black text-sm shadow-lg shadow-[var(--primary-color)]/30 hover:scale-[1.02] transition-transform"
        >
          <Plus size={16} strokeWidth={3} />
          <span>ADICIONAR {activeSection.slice(0, -1).toUpperCase()}</span>
        </button>
      </div>

      <Card className="min-h-[400px]">
        {activeSection === 'processos' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col gap-4">
            <h3 className="text-lg font-black text-[var(--primary-color)] mb-2">PROCESSOS ATIVOS</h3>
            {data[division].processes.map(proc => (
              <div key={proc.id} className="p-5 rounded-2xl bg-[var(--sub-bg)] relative group border border-transparent hover:border-[var(--primary-color)]/30 transition-colors">
                <button
                  onClick={() => deleteItem('processes', proc.id)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  title="Remover"
                >
                  <Trash2 size={16} />
                </button>
                <div className="flex justify-between items-center mb-4 pr-8">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newName = (e.target as HTMLElement).innerText;
                      setData(prev => ({
                        ...prev, [division]: { ...prev[division], processes: prev[division].processes.map(p => p.id === proc.id ? { ...p, name: newName } : p) },
                      }));
                    }}
                    className="font-black text-base md:text-lg focus:outline-none focus:ring-2 ring-[var(--primary-color)] rounded px-1 -ml-1 border-b border-transparent focus:border-[var(--primary-color)]/50"
                  >
                    {proc.name}
                  </div>
                  <span className="font-black text-[var(--primary-color)] text-lg">{proc.progress}%</span>
                </div>
                <div
                  className="h-2.5 rounded-full bg-slate-200 dark:bg-[#333] overflow-hidden cursor-pointer group/bar"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const pct = Math.max(0, Math.min(100, Math.round((x / rect.width) * 100)));
                    setData(prev => ({
                      ...prev, [division]: { ...prev[division], processes: prev[division].processes.map(p => p.id === proc.id ? { ...p, progress: pct } : p) },
                    }));
                  }}
                >
                  <div className="h-full bg-[var(--primary-color)] transition-all duration-300 group-hover/bar:brightness-110" style={{ width: `${proc.progress}%` }} />
                </div>
                <div className="mt-3 text-xs opacity-50 font-bold">Responsável: <span className="text-[var(--primary-color)]">{proc.responsible}</span></div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'tarefas' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col gap-3">
            <h3 className="text-lg font-black text-[var(--primary-color)] mb-2">PENDÊNCIAS OPERACIONAIS</h3>
            {data[division].tasks.map(task => {
              const status = STATUS_COLORS[task.status];
              return (
                <div key={task.id} className={`p-4 rounded-xl bg-[var(--sub-bg)] flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all duration-300 group ${task.status === 'concluido' ? 'opacity-50 hover:opacity-100 grayscale hover:grayscale-0' : ''}`}>
                  <div className="flex-1">
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newTitle = (e.target as HTMLElement).innerText;
                        setData(prev => ({
                          ...prev, [division]: { ...prev[division], tasks: prev[division].tasks.map(t => t.id === task.id ? { ...t, title: newTitle } : t) },
                        }));
                      }}
                      className={`font-bold text-sm md:text-base mb-2 focus:outline-none focus:ring-2 ring-[var(--primary-color)] rounded px-1 -ml-1 py-0.5 ${task.status === 'concluido' ? 'line-through' : ''}`}
                    >
                      {task.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-black opacity-60">
                        👨‍💻 {task.responsible}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cycleStatus(task.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border transition-colors ${status.bg} ${status.text} ${status.border} hover:brightness-110`}
                    >
                      {status.icon}
                      {STATUS_LABELS[task.status]}
                    </button>
                    <button
                      onClick={() => deleteItem('tasks', task.id)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeSection === 'equipe' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-lg font-black text-[var(--primary-color)] mb-4">COLABORADORES</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data[division].team.map(member => (
                <div key={member.id} className="p-4 rounded-2xl bg-[var(--sub-bg)] flex items-center gap-4 relative group hover:-translate-y-1 transition-transform">
                  <button
                    onClick={() => deleteItem('team', member.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="w-12 h-12 rounded-xl bg-[var(--primary-color)] text-[var(--card-bg)] flex items-center justify-center font-black text-xl shadow-lg shadow-[var(--primary-color)]/20">
                    {member.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 pr-6">
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newName = (e.target as HTMLElement).innerText;
                        setData(prev => ({
                          ...prev, [division]: { ...prev[division], team: prev[division].team.map(m => m.id === member.id ? { ...m, name: newName } : m) },
                        }));
                      }}
                      className="font-black text-sm mb-0.5 focus:outline-none focus:ring-2 ring-[var(--primary-color)] rounded px-1 -ml-1 border-b border-transparent focus:border-[var(--primary-color)]/50"
                    >
                      {member.name}
                    </div>
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newRole = (e.target as HTMLElement).innerText;
                        setData(prev => ({
                          ...prev, [division]: { ...prev[division], team: prev[division].team.map(m => m.id === member.id ? { ...m, role: newRole } : m) },
                        }));
                      }}
                      className="text-xs font-bold opacity-60 focus:outline-none focus:ring-2 ring-slate-400 rounded px-1 -ml-1"
                    >
                      {member.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OperationsDashboard;
