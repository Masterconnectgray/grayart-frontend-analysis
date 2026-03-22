
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import QRCode from 'qrcode';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import * as xlsx from 'xlsx';

const WhatsAppChat = lazy(() => import('./WhatsAppChat'));
const WhatsAppBroadcast = lazy(() => import('./WhatsAppBroadcast'));

interface WhatsAppConnectProps { division: Division; }

// ─── Tipos Evolution API ──────────────────────────────────────────────────────
type ConnectionStatus = 'idle' | 'creating' | 'waitingQR' | 'qrReady' | 'connecting' | 'open' | 'close' | 'error';

interface InstanceState {
  name: string;
  key: string;
  status: ConnectionStatus;
  qrCode: string | null;       // dataURL base64 gerado localmente
  qrRawData: string | null;    // dado bruto para regenerar o QR
  phoneNumber: string | null;
  connectedSince: string | null;
}

// ─── Hook para gerar QR Code localmente (sem serviço externo) ────────────────
function useQRCodeDataUrl(rawData: string | null): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!rawData) return;
    let cancelled = false;
    QRCode.toDataURL(rawData, {
      width: 220,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }).then(url => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setDataUrl(null); });
    return () => { cancelled = true; };
  }, [rawData]);
  return rawData ? dataUrl : null;
}

interface GroupConfig {
  name: string;
  members: number;
  type: string;
  lastMessage?: string;
  phone?: string;
  contactList?: { name: string; phone: string }[];
}

const DIVISION_GROUPS: Record<Division, GroupConfig[]> = {
  'connect-gray': [
    { name: 'Síndicos SP - Coffee Meet', members: 128, type: 'Networking', lastMessage: '08:42' },
    { name: 'Fornecedores Connect Gray', members: 85, type: 'Parceiros', lastMessage: '10:15' },
    { name: 'Arquitetos & Engenheiros', members: 42, type: 'Profissionais', lastMessage: 'Ontem' },
    { name: 'Connect Gray - Geral', members: 215, type: 'Comunidade', lastMessage: '11:30' },
  ],
  'gray-up': [
    { name: 'Clientes Elevadores', members: 67, type: 'Clientes', lastMessage: '09:00' },
    { name: 'Equipe Gray Up - Campo', members: 18, type: 'Equipe', lastMessage: '07:30' },
    { name: 'Síndicos - Manutenção', members: 95, type: 'Prospects', lastMessage: '10:50' },
    { name: 'Engenharia Elétrica', members: 34, type: 'Parceiros', lastMessage: 'Ontem' },
  ],
  'gray-up-flow': [
    { name: 'Leads Lean Manufacturing', members: 88, type: 'Leads', lastMessage: '08:15' },
    { name: 'Clientes Consultoria', members: 32, type: 'Clientes', lastMessage: '11:00' },
    { name: 'Gestores de Processos', members: 56, type: 'Comunidade', lastMessage: '09:45' },
  ],
  'gray-art': [
    { name: 'Clientes Gray ART', members: 210, type: 'Clientes', lastMessage: '10:00' },
    { name: 'Designers & Criativos', members: 145, type: 'Comunidade', lastMessage: '08:30' },
    { name: 'Portfolio Leads', members: 78, type: 'Leads', lastMessage: 'Ontem' },
    { name: 'Parceiros Marketing', members: 42, type: 'Parceiros', lastMessage: '11:20' },
  ],
};

const BROADCAST_TEMPLATES = [
  { label: 'Evento - Coffee Meet', text: '☕ Olá! O próximo Coffee Meet acontece na próxima semana.\n📍 Local: A confirmar\n📅 Data: A confirmar\n\nConfirme sua participação respondendo com SIM!' },
  { label: 'Dica da Semana', text: '💡 *Dica da Semana:*\n\nVocê sabia que manutenção preventiva custa em média 5x MENOS que corretiva?\n\n✅ Economize e planeje!\n\nEM: Connect Gray 🔗' },
  { label: 'Novo Conteúdo', text: '🎬 Novo vídeo publicado!\n\n👉 *Como reduzir custos no seu condomínio em 40%*\n\nAssista agora: link na bio do Instagram @connectgray\n\nComente sua dúvida!' },
  { label: 'Oferta Especial', text: '🎯 OFERTA EXCLUSIVA para membros da rede Connect Gray!\n\n📊 Diagnóstico gratuito de gestão predial\n⏰ Apenas esta semana\n\nResponda com *QUERO* para saber mais!' },
];

// ─── WhatsApp via BFF (seguro) ────────────────────────────────────────────
import { bffFetch } from '../services/BFFClient';

const evolutionFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
  return bffFetch(`/whatsapp${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // apikey enviada pelo BFF
      ...options.headers,
    },
  });
};

const EvolutionAPIService = {
  async createInstance(instanceName: string): Promise<{
    instance: { instanceName: string; status: string };
    hash: { apikey: string };
    qrcode?: { code?: string; base64?: string };
  }> {
    const resp = await evolutionFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({ instanceName, qrcode: true }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || `HTTP ${resp.status}`);
    }
    return resp.json();
  },

  async connectAndGetQR(instanceName: string): Promise<{
    rawData: string | null;
    base64Image: string | null;
    pairingCode: string | null;
  }> {
    const resp = await evolutionFetch(`/instance/connect/${instanceName}`, { method: 'GET' });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return {
      rawData: data?.code || data?.qrcode?.code || null,
      base64Image: data?.base64 || data?.qrcode?.base64 || null,
      pairingCode: data?.pairingCode || null,
    };
  },

  async getConnectionState(instanceName: string): Promise<{
    instance: { state: 'open' | 'close' | 'connecting' };
  }> {
    const resp = await evolutionFetch(`/instance/connectionState/${instanceName}`, { method: 'GET' });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || `HTTP ${resp.status}`);
    }
    return resp.json();
  },

  async logout(instanceName: string): Promise<void> {
    const resp = await evolutionFetch(`/instance/logout/${instanceName}`, { method: 'DELETE' });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || `HTTP ${resp.status}`);
    }
  },

  async sendText(instanceName: string, phone: string, text: string): Promise<void> {
    const resp = await evolutionFetch(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ number: phone, textMessage: { text } }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || `HTTP ${resp.status}`);
    }
  },

  async fetchInstances(): Promise<Array<{ instance: { instanceName: string; status: string } }>> {
    const resp = await evolutionFetch('/instance/fetchInstances', { method: 'GET' });
    if (!resp.ok) return [];
    return resp.json();
  },
};

// ─── Componente Principal ─────────────────────────────────────────────────────
const WhatsAppConnect: React.FC<WhatsAppConnectProps> = ({ division }) => {
  const { addNotification } = useAppContext();
  const isDark = division !== 'gray-art';
  const theme = DIVISIONS[division];
  const initialGroups = DIVISION_GROUPS[division] || [];

  const [customGroups, setCustomGroups] = useState<GroupConfig[]>([]);
  const groups = [...initialGroups, ...customGroups];

  const [instance, setInstance] = useState<InstanceState>({
    name: `gray-${division}-${Date.now()}`,
    key: '',
    status: 'idle',
    qrCode: null,
    qrRawData: null,
    phoneNumber: null,
    connectedSince: null,
  });

  // Hook que converte rawData → dataURL via qrcode lib (100% client-side)
  const qrDataUrl = useQRCodeDataUrl(instance.qrRawData);

  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [sendingGroup, setSendingGroup] = useState<number | null>(null);
  const [sentGroups, setSentGroups] = useState<number[]>([]);
  const [broadcastTemplate] = useState(0);
  const [customMessage] = useState('');
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [activePanel, setActivePanel] = useState<'qr' | 'chat' | 'groups' | 'broadcast' | 'status'>('qr');
  const [qrExpiry, setQrExpiry] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const subBg = isDark ? '#2d2d2d' : '#f0f2f5';

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (qrTimerRef.current) { clearInterval(qrTimerRef.current); qrTimerRef.current = null; }
  }, []);

  // Ao montar ou trocar divisão: verificar se já tem instância conectada
  useEffect(() => {
    stopPolling();
    setPairingCode(null);
    setSentGroups([]);
    setSendingGroup(null);
    setPollingAttempts(0);
    setQrExpiry(0);

    // Verificar instância existente na Evolution API
    const checkExisting = async () => {
      try {
        const existing = await EvolutionAPIService.fetchInstances();
        const divPrefix = `gray-${division}`;
        const found = existing.find(e => e.instance?.instanceName?.startsWith(divPrefix));

        if (found) {
          const instanceName = found.instance.instanceName;
          try {
            const state = await EvolutionAPIService.getConnectionState(instanceName);
            if (state.instance?.state === 'open') {
              // Já está conectado — restaurar estado
              const savedTime = localStorage.getItem(`grayart_wa_connected_${division}`);
              setInstance({
                name: instanceName,
                key: '',
                status: 'open',
                qrCode: null,
                qrRawData: null,
                phoneNumber: null,
                connectedSince: savedTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              });
              return;
            }
          } catch {
            // Instância existe mas não responde — tratar como desconectada
          }
        }
      } catch {
        // Sem acesso à API — manter idle
      }

      // Nenhuma instância conectada encontrada
      setInstance({
        name: `gray-${division}-${Date.now()}`,
        key: '', status: 'idle', qrCode: null, qrRawData: null, phoneNumber: null, connectedSince: null,
      });
    };

    checkExisting();
  }, [division, stopPolling]);

  // ── 1. Criar instância + obter QR ─────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    stopPolling();
    setInstance(p => ({ ...p, status: 'creating', qrCode: null, qrRawData: null }));
    setPairingCode(null);
    setPollingAttempts(0);

    try {
      // Passo 0: verificar se já existe instância desta divisão
      let instanceName = instance.name;
      let instanceKey = '';
      let rawData: string | null = null;
      let base64Image: string | null = null;

      const existing = await EvolutionAPIService.fetchInstances();
      const divPrefix = `gray-${division}`;
      const found = existing.find(e => e.instance?.instanceName?.startsWith(divPrefix));

      if (found && found.instance.status !== 'close') {
        // Reusar instância existente que não está fechada
        instanceName = found.instance.instanceName;
        setInstance(p => ({ ...p, name: instanceName, status: 'waitingQR' }));

        try {
          const qrResult = await EvolutionAPIService.connectAndGetQR(instanceName);
          rawData = qrResult.rawData;
          base64Image = qrResult.base64Image;
          setPairingCode(qrResult.pairingCode);
        } catch {
          // Se falhar, deletar e criar nova
          try { await EvolutionAPIService.logout(instanceName); } catch {}
        }
      }

      if (!rawData && !base64Image) {
        // Passo 1: criar instância nova (com nome único)
        instanceName = `gray-${division}-${Date.now()}`;
        setInstance(p => ({ ...p, name: instanceName }));
        const created = await EvolutionAPIService.createInstance(instanceName);
        instanceKey = created.hash?.apikey || '';
        instanceName = created.instance?.instanceName || instance.name;
        setInstance(p => ({ ...p, key: instanceKey, status: 'waitingQR' }));

        rawData = created.qrcode?.code || null;
        base64Image = created.qrcode?.base64 || null;

        if (!rawData && !base64Image) {
          const qrResult = await EvolutionAPIService.connectAndGetQR(instanceName);
          rawData = qrResult.rawData;
          base64Image = qrResult.base64Image;
          setPairingCode(qrResult.pairingCode);
        }
      }

      // Usar base64 direto da API se disponível, senão usar rawData para gerar localmente
      if (base64Image) {
        setInstance(p => ({ ...p, status: 'qrReady', qrCode: base64Image, qrRawData: null }));
      } else if (rawData) {
        setInstance(p => ({ ...p, status: 'qrReady', qrCode: null, qrRawData: rawData }));
      } else {
        throw new Error('Nenhum QR Code retornado pela API');
      }

      // QR expira em 60s
      let seconds = 60;
      setQrExpiry(seconds);
      qrTimerRef.current = setInterval(() => {
        seconds -= 1;
        setQrExpiry(seconds);
        if (seconds <= 0) {
          clearInterval(qrTimerRef.current!);
          addNotification('QR Code expirou. Gere um novo.', 'info');
          setInstance(p => ({ ...p, status: 'idle', qrCode: null, qrRawData: null }));
        }
      }, 1000);

      // Passo 2: iniciar polling de status (a cada 3s)
      setInstance(p => ({ ...p, status: 'connecting' }));
      let attempts = 0;
      pollingRef.current = setInterval(async () => {
        attempts++;
        setPollingAttempts(attempts);
        try {
          const state = await EvolutionAPIService.getConnectionState(instanceName);
          if (state.instance?.state === 'open') {
            stopPolling();
            const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            localStorage.setItem(`grayart_wa_connected_${division}`, now);
            setInstance(p => ({ ...p, status: 'open', connectedSince: now }));
            addNotification('WhatsApp conectado com sucesso!', 'success');
          } else if (attempts >= 40) {
            stopPolling();
            setInstance(p => ({ ...p, status: 'error', qrCode: null, qrRawData: null }));
            addNotification('Tempo esgotado. Tente novamente.', 'error');
          }
        } catch {
          // Erro no polling — continua tentando até timeout
        }
      }, 3000);

    } catch (err) {
      setInstance(p => ({ ...p, status: 'error' }));
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      addNotification(`Erro ao conectar: ${msg}`, 'error');
    }
  }, [instance.name, division, addNotification, stopPolling]);

  // ── Desconectar ────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async () => {
    stopPolling();
    try {
      await EvolutionAPIService.logout(instance.name);
    } catch {
      // Ignora erro no logout — limpa estado local mesmo assim
    }
    localStorage.removeItem(`grayart_wa_connected_${division}`);
    setInstance(p => ({ ...p, status: 'idle', qrCode: null, qrRawData: null, phoneNumber: null, connectedSince: null }));
    setSentGroups([]);
    addNotification('WhatsApp desconectado.', 'info');
  }, [instance.name, division, addNotification, stopPolling]);

  // ── Disparar para grupo (via Evolution API real) ──────────────────────────
  const sendToGroup = useCallback(async (idx: number) => {
    if (instance.status !== 'open' || sentGroups.includes(idx)) return;
    setSendingGroup(idx);
    const msg = customMessage || BROADCAST_TEMPLATES[broadcastTemplate].text;
    const group = groups[idx];

    try {
      if (group.contactList) {
        let sentCount = 0;
        for (const contact of group.contactList) {
          if (!contact.phone) continue;
          const cleanPhone = contact.phone.replace(/\D/g, '');
          const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
          
          const personalizedMsg = msg.replace(/\{nome\}/gi, contact.name || 'Cliente');
          await EvolutionAPIService.sendText(instance.name, finalPhone, personalizedMsg);
          sentCount++;
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        addNotification(`Enviado para ${sentCount} contatos da lista "${group.name}"!`, 'success');
      } else if (group.phone) {
        await EvolutionAPIService.sendText(instance.name, group.phone, msg);
        addNotification(`Enviado para "${group.name}"!`, 'success');
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        addNotification(`Simulação de envio para "${group.name}" concluída!`, 'success');
      }
      setSendingGroup(null);
      setSentGroups(prev => [...prev, idx]);
    } catch (err) {
      setSendingGroup(null);
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      addNotification(`Erro ao enviar para "${group.name}": ${errMsg}`, 'error');
    }
  }, [instance.status, instance.name, sentGroups, customMessage, broadcastTemplate, groups, addNotification]);

  const sendToAll = useCallback(() => {
    if (instance.status !== 'open') return;
    groups.forEach((_, i) => {
      if (!sentGroups.includes(i)) {
        setTimeout(() => sendToGroup(i), i * 1500);
      }
    });
  }, [instance.status, groups, sentGroups, sendToGroup]);

  // ─── Status label & color ─────────────────────────────────────────────────
  const STATUS_MAP: Record<ConnectionStatus, { label: string; color: string; dot: string }> = {
    idle: { label: 'Desconectado', color: '#666', dot: '#555' },
    creating: { label: 'Criando instância...', color: '#f59e0b', dot: '#f59e0b' },
    waitingQR: { label: 'Gerando QR Code...', color: '#f59e0b', dot: '#f59e0b' },
    qrReady: { label: 'Aguardando escaneamento', color: '#3b82f6', dot: '#3b82f6' },
    connecting: { label: `Aguardando conexão... (${pollingAttempts})`, color: '#f59e0b', dot: '#f59e0b' },
    open: { label: 'Conectado', color: '#25D366', dot: '#25D366' },
    close: { label: 'Sessão encerrada', color: '#ef4444', dot: '#ef4444' },
    error: { label: 'Erro de conexão', color: '#ef4444', dot: '#ef4444' },
  };
  const statusInfo = STATUS_MAP[instance.status];

  const isConnected = instance.status === 'open';
  const isLoading = ['creating', 'waitingQR', 'connecting'].includes(instance.status);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws) as any[];

        const contacts: {name: string, phone: string}[] = [];
        data.forEach(row => {
          const keys = Object.keys(row);
          const nameKey = keys.find(k => k.toLowerCase().includes('nome') || k.toLowerCase().includes('name'));
          const phoneKey = keys.find(k => k.toLowerCase().includes('telefone') || k.toLowerCase().includes('celular') || k.toLowerCase().includes('phone') || k.toLowerCase().includes('contato') || k.toLowerCase().includes('numero'));

          const name = nameKey ? String(row[nameKey]) : 'Cliente';
          const phone = phoneKey ? String(row[phoneKey]).replace(/\D/g, '') : '';

          if (phone && phone.length >= 8) {
            contacts.push({ name, phone });
          }
        });

        if (contacts.length > 0) {
          setCustomGroups(prev => [...prev, {
            name: `Importação - ${file.name.substring(0, 15)}`,
            members: contacts.length,
            type: 'Lista Excel',
            lastMessage: 'Recém importado',
            contactList: contacts
          }]);
          addNotification(`${contacts.length} contatos importados com sucesso!`, 'success');
        } else {
          addNotification('Nenhum telefone válido encontrado na planilha. Verifique os títulos das colunas.', 'error');
        }
      } catch (err) {
        addNotification('Erro ao processar o arquivo Excel.', 'error');
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div className="animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold flex items-center gap-3">
            Módulo <span className="text-[#25D366]">WhatsApp</span>
            <div 
              className="flex items-center gap-2 px-3 py-1 rounded-full"
              style={{ background: `${statusInfo.color}18`, border: `1px solid ${statusInfo.color}44` }}
            >
              <div 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ background: statusInfo.dot, animation: isLoading ? 'pulse 1.2s infinite' : 'none' }} 
              />
              <span className="text-[10px] font-extrabold" style={{ color: statusInfo.color }}>{statusInfo.label}</span>
            </div>
          </h2>
          <p className="text-xs opacity-40">Evolution API v1.8 · {theme.name} · BFF Proxy</p>
        </div>
        {isConnected && (
          <div className="flex gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-[#25D36618] border border-[#25D36644] text-xs font-bold text-[#25D366]">
              📱 {instance.phoneNumber}
            </div>
            <div className="px-4 py-2.5 rounded-xl text-xs font-bold opacity-60" style={{ background: subBg }}>
              Conectado às {instance.connectedSince}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin-qr { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

      <div className="grid grid-cols-[340px_1fr] gap-8">

        {/* ── Coluna Esquerda: QR + Controles ──────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* QR Code Card */}
          <div className="premium-card text-center" style={{ backgroundColor: cardBg, border: isConnected ? '1px solid #25D366' : '1px solid var(--glass-border)' }}>
            {isConnected ? (
              <div>
                <div className="text-5xl mb-3 drop-shadow-[0_0_12px_rgba(37,211,102,1)]">📱</div>
                <h3 className="text-[#25D366] font-black text-lg mb-1">CONECTADO</h3>
                <p className="text-xs opacity-50 mb-2">{instance.phoneNumber}</p>
                <p className="text-[11px] opacity-30 mb-6">Sessão ativa desde {instance.connectedSince}</p>
                <div className="p-3 rounded-xl bg-[#25D36618] mb-5">
                  <div className="text-[11px] font-bold text-[#25D366]">
                    🔑 Instância ativa · Evolution API
                  </div>
                  <div className="text-[10px] opacity-40 mt-1 font-mono">
                    {instance.key.substring(0, 22)}...
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="w-full p-3 rounded-xl bg-transparent text-[#ff4d4d] font-extrabold text-xs cursor-pointer border-2 border-[#ff4d4d44] transition-all duration-300 hover:bg-[#ff4d4d] hover:text-white hover:border-[#ff4d4d]"
                >
                  DESCONECTAR
                </button>
              </div>
            ) : (
              <div>
                <h3 className="font-extrabold mb-1 text-base">CONECTAR WHATSAPP</h3>
                <p className="text-[11px] opacity-40 mb-5">QR Code dinâmico via Evolution API. Escaneie com WhatsApp.</p>

                {/* QR Code display */}
                <div className="mx-auto mb-4 w-[200px] h-[200px] bg-white rounded-2xl p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.2)] relative overflow-hidden">
                  {instance.status === 'idle' || instance.status === 'error' ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2" style={{ color: '#aaa' }}>
                      <div className="text-4xl">📲</div>
                      <div className="text-[10px] font-bold text-center" style={{ color: instance.status === 'error' ? '#ef4444' : '#aaa' }}>
                        {instance.status === 'error' ? 'Erro. Tente novamente.' : 'Clique em CONECTAR'}
                      </div>
                    </div>
                  ) : (instance.status === 'creating' || instance.status === 'waitingQR') ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-black">
                      <div className="text-2xl animate-spin">⚙️</div>
                      <div className="text-[11px] font-extrabold">
                        {instance.status === 'creating' ? 'Criando instância...' : 'Gerando QR Code...'}
                      </div>
                      <div className="w-4/5 h-1 bg-gray-200 rounded-sm overflow-hidden">
                        <div className="h-full bg-[#25D366] rounded-sm w-3/5 animate-pulse" />
                      </div>
                    </div>
                  ) : (instance.status === 'qrReady' || instance.status === 'connecting') ? (
                    <>
                      {(instance.qrCode || qrDataUrl) ? (
                        <>
                          <img
                            src={instance.qrCode || qrDataUrl || ''}
                            alt="QR Code WhatsApp"
                            className="w-full h-full object-contain rounded-lg"
                          />
                          {qrExpiry > 0 && (
                            <div 
                              className="absolute bottom-1.5 right-1.5 text-white rounded-lg px-1.5 py-0.5 text-[10px] font-black"
                              style={{ background: qrExpiry < 15 ? '#ef4444' : '#25D366' }}
                            >
                              {qrExpiry}s
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-2 text-black">
                          <div className="w-10 h-10 border-4 border-[#f0f0f0] border-t-[#25D366] rounded-full animate-spin" />
                          <div className="text-[11px] font-semibold">Renderizando QR...</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-black">
                      <div className="text-xs font-bold">VINCULANDO...</div>
                      <div className="text-[10px] text-gray-500">Aguardando escaneamento</div>
                    </div>
                  )}
                </div>

                {/* Pairing code */}
                {pairingCode && instance.status !== 'open' && (
                  <div className="p-2.5 rounded-xl bg-[#25D36618] mb-4">
                    <div className="text-[10px] opacity-50 mb-1">Código de vinculação alternativo</div>
                    <div className="font-mono font-black text-lg tracking-[3px] text-[#25D366]">{pairingCode}</div>
                  </div>
                )}

                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className={`w-full p-4 rounded-xl font-black text-sm transition-all duration-300 ${
                    isLoading 
                      ? 'bg-[#2d2d2d] text-[#666] cursor-default' 
                      : 'bg-[#25D366] text-white cursor-pointer hover:shadow-[0_8px_25px_rgba(37,211,102,0.4)]'
                  }`}
                >
                  {isLoading ? '⚙️ AGUARDE...' : '🔗 CONECTAR VIA QR CODE'}
                </button>

                <div className="mt-3 p-2.5 rounded-lg" style={{ background: subBg }}>
                  <div style={{ fontSize: '0.6rem', opacity: 0.4, lineHeight: 1.5 }}>
                    Powered by <strong>Evolution API v2</strong> · Baseado em Baileys · Sem custo por mensagem · Multi-instância
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Grupos', value: groups.length, color: '#25D366' },
              { label: 'Membros', value: groups.reduce((s, g) => s + g.members, 0), color: theme.colors.primary },
              { label: 'Enviados', value: sentGroups.length, color: '#f59e0b' },
              { label: 'Quota', value: '1.2k/5k', color: '#3b82f6' },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-xl text-center" style={{ background: cardBg }}>
                <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] opacity-40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Coluna Direita: Grupos + Broadcast ───────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* Tab navigation */}
          <div className="flex gap-1.5 p-1 rounded-xl w-fit" style={{ background: subBg }}>
            {([
              { id: 'chat', label: 'Conversas' },
              { id: 'groups', label: 'Grupos' },
              { id: 'broadcast', label: 'Broadcast' },
              { id: 'status', label: 'Status API' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id as typeof activePanel)}
                className={`px-4 py-2 rounded-lg font-bold text-xs cursor-pointer transition-all duration-200 ${
                  activePanel === tab.id 
                    ? 'bg-[#25D366] text-white' 
                    : isDark ? 'text-[#666] hover:text-[#999]' : 'text-[#999] hover:text-[#666]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── CHAT (WhatsApp Web) ──────────────────────────────────────────── */}
          {activePanel === 'chat' && isConnected && (
            <Suspense fallback={<div className="text-center py-8 text-sm opacity-40">Carregando conversas...</div>}>
              <WhatsAppChat instanceName={instance.name} division={division} />
            </Suspense>
          )}
          {activePanel === 'chat' && !isConnected && (
            <div className="premium-card text-center py-12" style={{ backgroundColor: cardBg }}>
              <p className="text-sm opacity-40">Conecte o WhatsApp primeiro para ver as conversas.</p>
            </div>
          )}

          {/* ── GRUPOS ───────────────────────────────────────────────────────── */}
          {activePanel === 'groups' && (
            <div className="animate-fade-in">
              <div className="premium-card" style={{ backgroundColor: cardBg }}>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-base font-extrabold">GRUPOS ATIVOS</h3>
                  <div className="flex items-center gap-2.5">
                    <label 
                      className="text-[10px] px-2.5 py-1.5 rounded-md bg-blue-500/15 text-blue-500 font-extrabold cursor-pointer transition-all duration-200 border border-blue-500/30 hover:bg-blue-500/25"
                    >
                      📁 IMPORTAR .XLSX
                      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <span 
                      className="text-[10px] px-2.5 py-1.5 rounded-md font-bold"
                      style={{ background: isConnected ? '#25D36618' : '#33333388', color: isConnected ? '#25D366' : '#666' }}
                    >
                      {isConnected ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    {isConnected && sentGroups.length < groups.length && (
                      <button
                        onClick={sendToAll}
                        className="px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-[10px] font-extrabold cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        DISPARAR TODOS
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {groups.map((g, i) => (
                    <div 
                      key={i} 
                      className={`p-3.5 rounded-2xl flex justify-between items-center transition-all duration-300 ${
                        isConnected ? 'opacity-100' : 'opacity-50'
                      }`}
                      style={{ 
                        background: subBg, 
                        border: sentGroups.includes(i) ? '1px solid #25D36633' : '1px solid transparent' 
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                          style={{ background: `linear-gradient(135deg, ${theme.colors.primary}66, ${theme.colors.primary})` }}
                        >
                          {g.type === 'Lista Excel' ? '📊' : g.type === 'Clientes' ? '👥' : g.type === 'Parceiros' ? '🤝' : g.type === 'Equipe' ? '👷' : '🌐'}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{g.name}</div>
                          <div className="text-[10px] opacity-40 mt-0.5">
                            {g.type} · {g.members} membros · {g.lastMessage}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => sendToGroup(i)}
                        disabled={!isConnected || sendingGroup === i || sentGroups.includes(i)}
                        className={`px-3.5 py-2 rounded-xl font-extrabold text-[10px] cursor-pointer min-w-[90px] transition-all duration-300 text-white ${
                          sentGroups.includes(i) ? 'bg-[#25D366]' : sendingGroup === i ? 'bg-amber-500' : isConnected ? '' : 'bg-[#333]'
                        }`}
                        style={{
                          backgroundColor: (!sentGroups.includes(i) && sendingGroup !== i && isConnected) ? theme.colors.primary : undefined,
                          boxShadow: isConnected && !sentGroups.includes(i) ? `0 3px 10px ${theme.colors.primary}44` : 'none'
                        }}
                      >
                        {sentGroups.includes(i) ? '✅ ENVIADO' : sendingGroup === i ? '⏳...' : '📤 DISPARAR'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BROADCAST (novo componente com automacao) ──────────────────── */}
          {activePanel === 'broadcast' && isConnected && (
            <Suspense fallback={<div className="text-center py-8 text-sm opacity-40">Carregando broadcast...</div>}>
              <WhatsAppBroadcast
                instanceName={instance.name}
                division={division}
                groups={groups.map((g, i) => ({
                  id: g.phone || `group-${i}`,
                  subject: g.name,
                  size: g.members,
                  lastActivity: g.lastMessage,
                }))}
              />
            </Suspense>
          )}
          {activePanel === 'broadcast' && !isConnected && (
            <div className="premium-card text-center py-12" style={{ backgroundColor: cardBg }}>
              <p className="text-sm opacity-40">Conecte o WhatsApp primeiro para usar o broadcast.</p>
            </div>
          )}

          {/* ── STATUS API ────────────────────────────────────────────────────── */}
          {activePanel === 'status' && (
            <div className="animate-fade-in">
              <div className="premium-card" style={{ backgroundColor: cardBg }}>
                <h3 className="text-[0.9rem] font-extrabold mb-6">📊 EVOLUTION API · STATUS DO SISTEMA</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Evolution API v1.8.2', status: 'online', detail: `$BFF Proxy` },
                    { label: 'Baileys Core', status: 'online', detail: 'WhatsApp Web emulation ativo' },
                    { label: 'Conexão', status: isConnected ? 'online' : 'idle', detail: isConnected ? `Instância: ${instance.name}` : 'Aguardando conexão' },
                    { label: 'API Key', status: 'online', detail: 'Protegida via BFF' },
                    { label: 'Multi-instância', status: 'online', detail: 'Docker container ativo' },
                    { label: 'Webhook', status: 'idle', detail: 'Configure em: /webhook/set/{instance}' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-3 rounded-xl" style={{ background: subBg }}>
                      <div>
                        <div className="font-bold text-xs">{item.label}</div>
                        <div className="text-[10px] opacity-40">{item.detail}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                        item.status === 'online' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>

                <div 
                  className="mt-6 p-4 rounded-xl" 
                  style={{ background: `${theme.colors.primary}10`, border: `1px solid ${theme.colors.primary}22` }}
                >
                  <div className="text-xs font-extrabold mb-2" style={{ color: theme.colors.primary }}>VPS EmersonGray1</div>
                  <div className="text-[11px] opacity-65 leading-relaxed font-mono">
                    Container: atendai/evolution-api:v1.8.2<br />
                    Host: Proxy BFF (seguro)<br />
                    Status: Docker ativo
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConnect;
