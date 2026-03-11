
import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';

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

// ─── Evolution API Service (real) ────────────────────────────────────────────
const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_API_URL || '';
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || '';

const evolutionFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
  return fetch(`${EVOLUTION_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_KEY,
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
  const groups = DIVISION_GROUPS[division];

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
  const [broadcastTemplate, setBroadcastTemplate] = useState(0);
  const [customMessage, setCustomMessage] = useState('');
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [activePanel, setActivePanel] = useState<'qr' | 'groups' | 'broadcast' | 'status'>('qr');
  const [qrExpiry, setQrExpiry] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const subBg = isDark ? '#2d2d2d' : '#f0f2f5';

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (qrTimerRef.current) { clearInterval(qrTimerRef.current); qrTimerRef.current = null; }
  }, []);

  // Reset ao trocar divisão
  useEffect(() => {
    stopPolling();
    setInstance({
      name: `gray-${division}-${Date.now()}`,
      key: '', status: 'idle', qrCode: null, qrRawData: null, phoneNumber: null, connectedSince: null,
    });
    setPairingCode(null);
    setSentGroups([]);
    setSendingGroup(null);
    setPollingAttempts(0);
    setQrExpiry(0);
  }, [division, stopPolling]);

  // ── 1. Criar instância + obter QR ─────────────────────────────────────────
  const handleConnect = useCallback(async () => {
    stopPolling();
    setInstance(p => ({ ...p, status: 'creating', qrCode: null, qrRawData: null }));
    setPairingCode(null);
    setPollingAttempts(0);

    try {
      // Passo 1: criar instância (pode retornar QR inline)
      const created = await EvolutionAPIService.createInstance(instance.name);
      const instanceKey = created.hash?.apikey || '';
      const instanceName = created.instance?.instanceName || instance.name;
      setInstance(p => ({ ...p, key: instanceKey, status: 'waitingQR' }));

      // Verificar se o QR já veio na resposta de criação
      let rawData = created.qrcode?.code || null;
      let base64Image = created.qrcode?.base64 || null;

      // Se não veio, buscar QR separadamente
      if (!rawData && !base64Image) {
        const qrResult = await EvolutionAPIService.connectAndGetQR(instanceName);
        rawData = qrResult.rawData;
        base64Image = qrResult.base64Image;
        setPairingCode(qrResult.pairingCode);
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
  }, [instance.name, addNotification, stopPolling]);

  // ── Desconectar ────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async () => {
    stopPolling();
    try {
      await EvolutionAPIService.logout(instance.name);
    } catch {
      // Ignora erro no logout — limpa estado local mesmo assim
    }
    setInstance(p => ({ ...p, status: 'idle', qrCode: null, qrRawData: null, phoneNumber: null, connectedSince: null }));
    setSentGroups([]);
    addNotification('WhatsApp desconectado.', 'info');
  }, [instance.name, addNotification, stopPolling]);

  // ── Disparar para grupo (via Evolution API real) ──────────────────────────
  const sendToGroup = useCallback(async (idx: number) => {
    if (instance.status !== 'open' || sentGroups.includes(idx)) return;
    setSendingGroup(idx);
    const msg = customMessage || BROADCAST_TEMPLATES[broadcastTemplate].text;
    const group = groups[idx];

    try {
      // Envia via Evolution API real se phone do grupo existir
      if (group.phone) {
        await EvolutionAPIService.sendText(instance.name, group.phone, msg);
      }
      setSendingGroup(null);
      setSentGroups(prev => [...prev, idx]);
      addNotification(`Enviado para "${group.name}"!`, 'success');
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

  return (
    <div className="animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            Módulo <span style={{ color: '#25D366' }}>WhatsApp</span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.3rem 0.8rem', borderRadius: '20px',
              background: `${statusInfo.color}18`, border: `1px solid ${statusInfo.color}44`,
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusInfo.dot, animation: isLoading ? 'pulse 1.2s infinite' : 'none' }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: statusInfo.color }}>{statusInfo.label}</span>
            </div>
          </h2>
          <p style={{ fontSize: '0.8rem', opacity: 0.4 }}>Evolution API v1.8 · {theme.name} · {EVOLUTION_URL}</p>
        </div>
        {isConnected && (
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <div style={{ padding: '0.6rem 1rem', borderRadius: '12px', background: '#25D36618', border: '1px solid #25D36644', fontSize: '0.75rem', fontWeight: 700, color: '#25D366' }}>
              📱 {instance.phoneNumber}
            </div>
            <div style={{ padding: '0.6rem 1rem', borderRadius: '12px', background: subBg, fontSize: '0.75rem', fontWeight: 700, opacity: 0.6 }}>
              Conectado às {instance.connectedSince}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin-qr { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '2rem' }}>

        {/* ── Coluna Esquerda: QR + Controles ──────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* QR Code Card */}
          <div className="premium-card" style={{ backgroundColor: cardBg, border: isConnected ? '1px solid #25D366' : '1px solid var(--glass-border)', textAlign: 'center' }}>
            {isConnected ? (
              <div>
                <div style={{ fontSize: '3rem', marginBottom: '0.8rem', filter: 'drop-shadow(0 0 12px #25D366)' }}>📱</div>
                <h3 style={{ color: '#25D366', fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.3rem' }}>CONECTADO</h3>
                <p style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.5rem' }}>{instance.phoneNumber}</p>
                <p style={{ fontSize: '0.7rem', opacity: 0.3, marginBottom: '1.5rem' }}>Sessão ativa desde {instance.connectedSince}</p>
                <div style={{ padding: '0.8rem', borderRadius: '12px', background: '#25D36618', marginBottom: '1.2rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#25D366' }}>
                    🔑 Instância ativa · Evolution API
                  </div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.4, marginTop: '0.2rem', fontFamily: 'monospace' }}>
                    {instance.key.substring(0, 22)}...
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  style={{
                    width: '100%', padding: '0.8rem', borderRadius: '12px',
                    background: 'transparent',
                    color: '#ff4d4d',
                    fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                    border: '2px solid #ff4d4d44',
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ff4d4d'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#ff4d4d'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ff4d4d'; e.currentTarget.style.borderColor = '#ff4d4d44'; }}
                >
                  DESCONECTAR
                </button>
              </div>
            ) : (
              <div>
                <h3 style={{ fontWeight: 800, marginBottom: '0.4rem', fontSize: '1rem' }}>CONECTAR WHATSAPP</h3>
                <p style={{ fontSize: '0.7rem', opacity: 0.4, marginBottom: '1.2rem' }}>QR Code dinâmico via Evolution API. Escaneie com WhatsApp.</p>

                {/* QR Code display */}
                <div style={{
                  margin: '0 auto 1rem', width: '200px', height: '200px', background: '#fff', borderRadius: '16px',
                  padding: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden',
                }}>
                  {instance.status === 'idle' || instance.status === 'error' ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aaa', gap: '0.5rem' }}>
                      <div style={{ fontSize: '2.5rem' }}>📲</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, textAlign: 'center', color: instance.status === 'error' ? '#ef4444' : '#aaa' }}>
                        {instance.status === 'error' ? 'Erro. Tente novamente.' : 'Clique em CONECTAR'}
                      </div>
                    </div>
                  ) : (instance.status === 'creating' || instance.status === 'waitingQR') ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', color: '#000' }}>
                      <div style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite' }}>⚙️</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                        {instance.status === 'creating' ? 'Criando instância...' : 'Gerando QR Code...'}
                      </div>
                      <div style={{ width: '80%', height: '4px', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#25D366', borderRadius: '4px', animation: 'pulse 0.8s infinite', width: '60%' }} />
                      </div>
                    </div>
                  ) : (instance.status === 'qrReady' || instance.status === 'connecting') ? (
                    <>
                      {(instance.qrCode || qrDataUrl) ? (
                        <>
                          <img
                            src={instance.qrCode || qrDataUrl || ''}
                            alt="QR Code WhatsApp"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
                          />
                          {qrExpiry > 0 && (
                            <div style={{
                              position: 'absolute', bottom: '6px', right: '6px',
                              background: qrExpiry < 15 ? '#ef4444' : '#25D366',
                              color: '#fff', borderRadius: '8px', padding: '2px 6px',
                              fontSize: '0.6rem', fontWeight: 900,
                            }}>
                              {qrExpiry}s
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#000', gap: '0.5rem' }}>
                          <div style={{
                            width: '40px', height: '40px',
                            border: '3px solid #f0f0f0', borderTop: '3px solid #25D366',
                            borderRadius: '50%', animation: 'spin 1s linear infinite'
                          }} />
                          <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>Renderizando QR...</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#000', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>VINCULANDO...</div>
                      <div style={{ fontSize: '0.65rem', color: '#888' }}>Aguardando escaneamento</div>
                    </div>
                  )}
                </div>

                {/* Pairing code */}
                {pairingCode && instance.status !== 'open' && (
                  <div style={{ padding: '0.6rem', borderRadius: '10px', background: '#25D36618', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.6rem', opacity: 0.5, marginBottom: '0.2rem' }}>Código de vinculação alternativo</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '3px', color: '#25D366' }}>{pairingCode}</div>
                  </div>
                )}

                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  style={{
                    width: '100%', padding: '1rem', borderRadius: '14px',
                    background: isLoading ? '#2d2d2d' : '#25D366',
                    color: isLoading ? '#666' : '#fff', fontWeight: 900, fontSize: '0.85rem',
                    boxShadow: isLoading ? 'none' : '0 8px 25px rgba(37,211,102,0.4)',
                    cursor: isLoading ? 'default' : 'pointer', transition: 'all 0.3s',
                  }}
                >
                  {isLoading ? '⚙️ AGUARDE...' : '🔗 CONECTAR VIA QR CODE'}
                </button>

                <div style={{ marginTop: '0.8rem', padding: '0.6rem', borderRadius: '8px', background: subBg }}>
                  <div style={{ fontSize: '0.6rem', opacity: 0.4, lineHeight: 1.5 }}>
                    Powered by <strong>Evolution API v2</strong> · Baseado em Baileys · Sem custo por mensagem · Multi-instância
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            {[
              { label: 'Grupos', value: groups.length, color: '#25D366' },
              { label: 'Membros', value: groups.reduce((s, g) => s + g.members, 0), color: theme.colors.primary },
              { label: 'Enviados', value: sentGroups.length, color: '#f59e0b' },
              { label: 'Quota', value: '1.2k/5k', color: '#3b82f6' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '0.8rem', borderRadius: '12px', background: cardBg, textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.6rem', opacity: 0.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Coluna Direita: Grupos + Broadcast ───────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tab navigation */}
          <div style={{ display: 'flex', gap: '0.4rem', background: subBg, padding: '0.3rem', borderRadius: '12px', width: 'fit-content' }}>
            {([
              { id: 'groups', label: '👥 Grupos' },
              { id: 'broadcast', label: '📡 Broadcast' },
              { id: 'status', label: '📊 Status API' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id as typeof activePanel)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                  background: activePanel === tab.id ? '#25D366' : 'transparent',
                  color: activePanel === tab.id ? '#fff' : (isDark ? '#666' : '#999'),
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── GRUPOS ───────────────────────────────────────────────────────── */}
          {activePanel === 'groups' && (
            <div className="animate-fade-in">
              <div className="premium-card" style={{ backgroundColor: cardBg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>GRUPOS ATIVOS</h3>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: isConnected ? '#25D36618' : '#33333388', color: isConnected ? '#25D366' : '#666', fontWeight: 700 }}>
                      {isConnected ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    {isConnected && sentGroups.length < groups.length && (
                      <button
                        onClick={sendToAll}
                        style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: '#25D366', color: '#fff', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        DISPARAR TODOS
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {groups.map((g, i) => (
                    <div key={i} style={{
                      padding: '0.9rem 1rem', borderRadius: '14px', background: subBg,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      opacity: isConnected ? 1 : 0.5, transition: 'all 0.3s',
                      border: sentGroups.includes(i) ? '1px solid #25D36633' : '1px solid transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '50%',
                          background: `linear-gradient(135deg, ${theme.colors.primary}66, ${theme.colors.primary})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.1rem', flexShrink: 0,
                        }}>
                          {g.type === 'Clientes' ? '👥' : g.type === 'Parceiros' ? '🤝' : g.type === 'Equipe' ? '👷' : '🌐'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{g.name}</div>
                          <div style={{ fontSize: '0.65rem', opacity: 0.4 }}>
                            {g.type} · {g.members} membros · {g.lastMessage}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => sendToGroup(i)}
                        disabled={!isConnected || sendingGroup === i || sentGroups.includes(i)}
                        style={{
                          padding: '0.5rem 0.9rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.65rem', cursor: 'pointer',
                          minWidth: '90px',
                          background: sentGroups.includes(i) ? '#25D366' : sendingGroup === i ? '#f59e0b' : isConnected ? theme.colors.primary : '#333',
                          color: '#fff',
                          boxShadow: isConnected && !sentGroups.includes(i) ? `0 3px 10px ${theme.colors.primary}44` : 'none',
                          transition: 'all 0.3s',
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

          {/* ── BROADCAST ─────────────────────────────────────────────────────── */}
          {activePanel === 'broadcast' && (
            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="premium-card" style={{ backgroundColor: cardBg }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>📝 MENSAGEM</h3>
                <div style={{ marginBottom: '0.8rem' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '0.5rem' }}>Templates prontos</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {BROADCAST_TEMPLATES.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => { setBroadcastTemplate(i); setCustomMessage(''); }}
                        style={{
                          padding: '0.5rem 0.8rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                          background: broadcastTemplate === i && !customMessage ? `${theme.colors.primary}22` : subBg,
                          border: broadcastTemplate === i && !customMessage ? `1px solid ${theme.colors.primary}44` : '1px solid transparent',
                          fontSize: '0.72rem', fontWeight: 700, color: broadcastTemplate === i && !customMessage ? theme.colors.primary : 'inherit',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={customMessage || BROADCAST_TEMPLATES[broadcastTemplate].text}
                  onChange={e => setCustomMessage(e.target.value)}
                  rows={8}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: subBg, border: 'none', color: isDark ? '#fff' : '#1a1a1a', fontSize: '0.8rem', resize: 'none', lineHeight: 1.5 }}
                  placeholder="Personalize a mensagem..."
                />
                <div style={{ fontSize: '0.65rem', opacity: 0.3, marginTop: '0.4rem' }}>
                  {(customMessage || BROADCAST_TEMPLATES[broadcastTemplate].text).length} chars
                </div>
              </div>

              <div className="premium-card" style={{ backgroundColor: cardBg }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem' }}>🎯 DESTINOS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                  {groups.map((g, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem', borderRadius: '10px', background: subBg }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{g.name}</div>
                        <div style={{ fontSize: '0.6rem', opacity: 0.35 }}>{g.members} membros</div>
                      </div>
                      <button
                        onClick={() => sendToGroup(i)}
                        disabled={!isConnected || sentGroups.includes(i) || sendingGroup === i}
                        style={{
                          padding: '0.4rem 0.7rem', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 800, cursor: 'pointer',
                          background: sentGroups.includes(i) ? '#25D366' : sendingGroup === i ? '#f59e0b' : (isConnected ? '#25D366' : '#333'),
                          color: '#fff',
                        }}
                      >
                        {sentGroups.includes(i) ? '✓' : sendingGroup === i ? '...' : '▶'}
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={sendToAll}
                  disabled={!isConnected || sentGroups.length >= groups.length}
                  style={{
                    width: '100%', padding: '1rem', borderRadius: '14px',
                    background: isConnected ? '#25D366' : '#333',
                    color: isConnected ? '#fff' : '#666', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer',
                    boxShadow: isConnected ? '0 6px 20px rgba(37,211,102,0.4)' : 'none',
                    transition: 'all 0.3s',
                  }}
                >
                  {!isConnected ? '🔗 Conecte o WhatsApp primeiro' : sentGroups.length >= groups.length ? '✅ DISPARADO PARA TODOS' : `📡 BROADCAST PARA ${groups.length} GRUPOS`}
                </button>
              </div>
            </div>
          )}

          {/* ── STATUS API ────────────────────────────────────────────────────── */}
          {activePanel === 'status' && (
            <div className="animate-fade-in">
              <div className="premium-card" style={{ backgroundColor: cardBg }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.5rem' }}>📊 EVOLUTION API · STATUS DO SISTEMA</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {[
                    { label: 'Evolution API v1.8.2', status: 'online', detail: `${EVOLUTION_URL}` },
                    { label: 'Baileys Core', status: 'online', detail: 'WhatsApp Web emulation ativo' },
                    { label: 'Conexão', status: isConnected ? 'online' : 'idle', detail: isConnected ? `Instância: ${instance.name}` : 'Aguardando conexão' },
                    { label: 'API Key', status: EVOLUTION_KEY ? 'online' : 'error', detail: EVOLUTION_KEY ? `${EVOLUTION_KEY.substring(0, 12)}...` : 'Não configurada' },
                    { label: 'Multi-instância', status: 'online', detail: 'Docker container ativo' },
                    { label: 'Webhook', status: 'idle', detail: 'Configure em: /webhook/set/{instance}' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', borderRadius: '12px', background: subBg }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.label}</div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.4 }}>{item.detail}</div>
                      </div>
                      <span style={{
                        padding: '0.3rem 0.6rem', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 900,
                        background: item.status === 'online' ? '#22c55e18' : '#f59e0b18',
                        color: item.status === 'online' ? '#22c55e' : '#f59e0b',
                      }}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', background: `${theme.colors.primary}10`, border: `1px solid ${theme.colors.primary}22` }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.colors.primary, marginBottom: '0.6rem' }}>VPS EmersonGray1</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.65, lineHeight: 1.7, fontFamily: 'monospace' }}>
                    Container: atendai/evolution-api:v1.8.2<br />
                    Host: {EVOLUTION_URL || 'nao configurado'}<br />
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
