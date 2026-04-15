import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Search, Send, Square, CheckSquare, Clock, Users, AlertCircle, CheckCircle2, XCircle, MinusSquare } from 'lucide-react';
import { Card } from '../../design-system/Card';
import type { Division } from '../../constants/Themes';
import { bffFetch } from '../../services/BFFClient';

interface GroupInfo {
  id: string;
  subject: string;
  size: number;
  lastActivity?: string;
}

interface WhatsAppBroadcastProps {
  instanceName: string;
  division: Division;
  groups: GroupInfo[];
}

interface SendLog {
  timestamp: string;
  group: string;
  status: 'sent' | 'failed';
  error?: string;
}

const TEMPLATES = [
  { label: 'Selecionar template...', value: '' },
  { label: 'Aviso geral', value: 'Ola {grupo}! Informamos que {data} as {hora} teremos uma atualizacao importante. Fiquem atentos!' },
  { label: 'Convite evento', value: 'Ola pessoal do {grupo}! Estao todos convidados para nosso proximo evento. Confirmem presenca!' },
  { label: 'Lembrete', value: 'Lembrete para os {membros} membros do {grupo}: nao esquecam do compromisso de hoje, {data}.' },
  { label: 'Promocao', value: 'Exclusivo para {grupo}! Aproveitem nossa oferta especial valida ate {data}. Nao percam!' },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function replaceVariables(text: string, group: GroupInfo): string {
  const now = new Date();
  return text
    .replace(/\{grupo\}/g, group.subject)
    .replace(/\{membros\}/g, String(group.size))
    .replace(/\{data\}/g, now.toLocaleDateString('pt-BR'))
    .replace(/\{hora\}/g, formatTime(now));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const WhatsAppBroadcast: React.FC<WhatsAppBroadcastProps> = ({ instanceName, groups }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [interval, setIntervalVal] = useState(15);
  const [sendCount, setSendCount] = useState<number | 'all'>('all');
  const [scheduledTime, setScheduledTime] = useState('');
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [sent, setSent] = useState(0);
  const [errors, setErrors] = useState(0);
  const [total, setTotal] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(g => g.subject.toLowerCase().includes(q));
  }, [groups, search]);

  const toggleGroup = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(filtered.map(g => g.id)));
  }, [filtered]);

  const deselectAll = useCallback(() => setSelected(new Set()), []);

  const selectedGroups = useMemo(() => {
    const sel = groups.filter(g => selected.has(g.id));
    if (sendCount === 'all') return sel;
    return sel.slice(0, sendCount);
  }, [groups, selected, sendCount]);

  const totalReach = useMemo(() => selectedGroups.reduce((sum, g) => sum + g.size, 0), [selectedGroups]);

  const previewText = useMemo(() => {
    if (!message) return '';
    const sample: GroupInfo = selectedGroups[0] || { id: '', subject: 'Grupo Exemplo', size: 50 };
    return replaceVariables(message, sample);
  }, [message, selectedGroups]);

  const stopBroadcast = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  const startBroadcast = useCallback(async () => {
    if (!message.trim() || selectedGroups.length === 0) return;

    const doSend = async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setRunning(true);
      setLogs([]);
      setSent(0);
      setErrors(0);
      setTotal(selectedGroups.length);

      for (let i = 0; i < selectedGroups.length; i++) {
        if (controller.signal.aborted) break;
        const group = selectedGroups[i];
        const text = replaceVariables(message, group);
        const ts = formatTime(new Date());

        try {
          const res = await bffFetch(`/whatsapp/send-text/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({ number: group.id, text }),
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setSent(prev => prev + 1);
          setLogs(prev => [...prev, { timestamp: ts, group: group.subject, status: 'sent' }]);
        } catch (err: unknown) {
          if (controller.signal.aborted) break;
          const msg = err instanceof Error ? err.message : 'Erro desconhecido';
          setErrors(prev => prev + 1);
          setLogs(prev => [...prev, { timestamp: ts, group: group.subject, status: 'failed', error: msg }]);
        }

        if (i < selectedGroups.length - 1 && !controller.signal.aborted) {
          await sleep(interval * 1000);
        }
      }

      setRunning(false);
      abortRef.current = null;
    };

    if (scheduledTime) {
      const [h, m] = scheduledTime.split(':').map(Number);
      const now = new Date();
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const delay = target.getTime() - now.getTime();
      setTimeout(doSend, delay);
    } else {
      await doSend();
    }
  }, [message, selectedGroups, instanceName, interval, scheduledTime]);

  const progress = total > 0 ? ((sent + errors) / total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selecao de grupos */}
        <Card variant="elevated" title="Grupos" subtitle={`${selected.size} selecionados de ${groups.length}`}
          headerAction={
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-green-400 hover:text-green-300">Todos</button>
              <button onClick={deselectAll} className="text-xs text-red-400 hover:text-red-300">Nenhum</button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar grupo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {filtered.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">Nenhum grupo encontrado</p>
              )}
              {filtered.map(g => (
                <label key={g.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                  <button onClick={() => toggleGroup(g.id)} className="shrink-0">
                    {selected.has(g.id)
                      ? <CheckSquare className="w-5 h-5 text-green-400" />
                      : <MinusSquare className="w-5 h-5 text-slate-600" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{g.subject}</p>
                    <p className="text-xs text-slate-500">
                      <Users className="inline w-3 h-3 mr-1" />{g.size} membros
                      {g.lastActivity && <span className="ml-2">{g.lastActivity}</span>}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </Card>

        {/* Compositor de mensagem */}
        <Card variant="elevated" title="Mensagem" subtitle={`${message.length} caracteres`}>
          <div className="space-y-3">
            <select
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              onChange={e => { if (e.target.value) setMessage(e.target.value); }}
              defaultValue=""
            >
              {TEMPLATES.map((t, i) => (
                <option key={i} value={t.value} className="bg-[#1e1e1e]">{t.label}</option>
              ))}
            </select>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Digite sua mensagem... Use {grupo}, {membros}, {data}, {hora}"
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30 resize-none"
            />
            <p className="text-xs text-slate-500">
              Variaveis: <code className="text-green-400">{'{grupo}'}</code> <code className="text-green-400">{'{membros}'}</code> <code className="text-green-400">{'{data}'}</code> <code className="text-green-400">{'{hora}'}</code>
            </p>

            {/* Preview WhatsApp */}
            {previewText && (
              <div className="mt-2">
                <p className="text-xs text-slate-400 mb-2">Preview</p>
                <div className="bg-[#0b141a] rounded-xl p-4">
                  <div className="flex justify-end">
                    <div className="bg-[#005c4b] rounded-lg rounded-tr-none px-3 py-2 max-w-[85%] relative">
                      <p className="text-sm text-white whitespace-pre-wrap break-words">{previewText}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-white/60">{formatTime(new Date())}</span>
                        <svg viewBox="0 0 16 11" width="16" height="11" className="text-[#53bdeb]">
                          <path d="M11.07.66 5.97 5.76l-.28-.27a.4.4 0 0 0-.56 0l-5.57 5.57a.4.4 0 0 0 0 .56l.28.28a.4.4 0 0 0 .56 0L5.97 6.9l4.82 4.82a.4.4 0 0 0 .56 0l.28-.28a.4.4 0 0 0 0-.56L6.82 6.04l4.53-4.82a.4.4 0 0 0-.28-.56z" fill="currentColor" />
                          <path d="M15.07.66 9.97 5.76l-.28-.27a.4.4 0 0 0-.56 0L3.56 11.06a.4.4 0 0 0 0 .56l.28.28a.4.4 0 0 0 .56 0l5.57-5.57 4.82 4.82a.4.4 0 0 0 .56 0l.28-.28a.4.4 0 0 0 0-.56L10.82 6.04l4.53-4.82a.4.4 0 0 0-.28-.56z" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controles de automacao */}
        <Card variant="elevated" title="Automacao">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Quantidade</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={selected.size || 1}
                  value={sendCount === 'all' ? '' : sendCount}
                  placeholder="Todos"
                  onChange={e => {
                    const v = e.target.value;
                    setSendCount(v === '' ? 'all' : Math.max(1, parseInt(v) || 1));
                  }}
                  disabled={running}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/30"
                />
                <button
                  onClick={() => setSendCount('all')}
                  className={`text-xs px-3 py-2 rounded-lg border transition-colors ${sendCount === 'all' ? 'border-green-500/50 text-green-400 bg-green-500/10' : 'border-white/10 text-slate-400 hover:text-white'}`}
                >
                  Todos
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Intervalo: {interval}s</label>
              <input
                type="range"
                min={5}
                max={60}
                value={interval}
                onChange={e => setIntervalVal(Number(e.target.value))}
                disabled={running}
                className="w-full accent-green-500"
              />
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>5s</span><span>60s</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                <Clock className="inline w-3 h-3 mr-1" />Agendar (opcional)
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                disabled={running}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="pt-2 space-y-2">
              {!running ? (
                <button
                  onClick={startBroadcast}
                  disabled={!message.trim() || selected.size === 0}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-green-600 hover:bg-green-500 text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                >
                  <Send className="inline w-4 h-4 mr-2" />
                  INICIAR DISPARO ({selectedGroups.length} grupos)
                </button>
              ) : (
                <button
                  onClick={stopBroadcast}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-red-600 hover:bg-red-500 text-white active:scale-95 animate-pulse"
                >
                  <Square className="inline w-4 h-4 mr-2" />
                  PARAR IMEDIATAMENTE
                </button>
              )}
            </div>

            {total > 0 && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{sent + errors}/{total} processadas</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Status Dashboard */}
        <Card variant="elevated" title="Status" className="lg:col-span-2">
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Enviadas', value: sent, color: 'text-green-400', icon: CheckCircle2 },
                { label: 'Pendentes', value: Math.max(0, total - sent - errors), color: 'text-yellow-400', icon: Clock },
                { label: 'Erros', value: errors, color: 'text-red-400', icon: XCircle },
                { label: 'Alcance', value: totalReach, color: 'text-blue-400', icon: Users },
              ].map(s => (
                <div key={s.label} className="bg-white/5 rounded-lg p-3 text-center">
                  <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                  <p className={`text-lg font-bold ${s.color}`}>{s.value.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {logs.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-6">Nenhum envio ainda</p>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-white/[0.02]">
                  <span className="text-slate-600 w-12 shrink-0">{log.timestamp}</span>
                  {log.status === 'sent'
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    : <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  <span className="text-slate-300 truncate flex-1">{log.group}</span>
                  {log.error && <span className="text-red-400 truncate max-w-[120px]">{log.error}</span>}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WhatsAppBroadcast;
