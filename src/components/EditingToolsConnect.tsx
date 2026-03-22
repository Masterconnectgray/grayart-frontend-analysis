import React, { useState } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import { Card } from '../design-system';
import { Check, ExternalLink, LogIn, LogOut } from 'lucide-react';

interface EditingToolsConnectProps {
  division: Division;
}

// ─── Logos reais dos apps (PNG em /logos/) ───────────────────────────────────

const basePath = import.meta.env.DEV ? '' : '/grayart';

const CapCutLogo: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <img src={`${basePath}/logos/capcut_symbol.png`} alt="CapCut" width={size} height={size} className="rounded-xl object-contain" />
);

const InShotLogo: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <img src={`${basePath}/logos/inshot_logo.png`} alt="InShot" width={size} height={size} className="rounded-xl object-contain" />
);

const CanvaLogo: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <img src={`${basePath}/logos/canva_icon_c.png`} alt="Canva" width={size} height={size} className="rounded-xl object-contain" />
);

const STORAGE_KEY = 'grayart_editing_tools';

function loadConnections(): Record<string, { connected: boolean; email: string }> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveConnections(data: Record<string, { connected: boolean; email: string }>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

interface ToolDef {
  id: string;
  name: string;
  logo: React.ReactNode;
  color: string;
  description: string;
  loginUrl: string;
}

const EditingToolsConnect: React.FC<EditingToolsConnectProps> = ({ division }) => {
  const { addNotification } = useAppContext();
  const theme = DIVISIONS[division];
  const [connections, setConnections] = useState(loadConnections);
  const [loginModal, setLoginModal] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');

  const tools: ToolDef[] = [
    {
      id: 'capcut',
      name: 'CapCut Pro',
      logo: <CapCutLogo size={40} />,
      color: '#000000',
      description: 'Editor de video profissional. Legendas automaticas, efeitos, transicoes.',
      loginUrl: 'https://www.capcut.com',
    },
    {
      id: 'inshot',
      name: 'InShot Pro',
      logo: <InShotLogo size={40} />,
      color: '#FF2D55',
      description: 'Edicao rapida no celular. Corte, musica, filtros, texto.',
      loginUrl: 'https://inshot.com',
    },
    {
      id: 'canva',
      name: 'Canva Pro',
      logo: <CanvaLogo size={40} />,
      color: '#00C4CC',
      description: 'Design, templates de Reels, videos com texto animado, carrosseis.',
      loginUrl: 'https://www.canva.com',
    },
  ];

  const handleConnect = (toolId: string) => {
    setLoginModal(toolId);
    setEmailInput(connections[toolId]?.email || '');
  };

  const handleSaveLogin = () => {
    if (!loginModal || !emailInput.trim()) return;
    const updated = { ...connections, [loginModal]: { connected: true, email: emailInput.trim() } };
    setConnections(updated);
    saveConnections(updated);
    const tool = tools.find(t => t.id === loginModal);
    addNotification(`${tool?.name} conectado com sucesso!`, 'success');
    setLoginModal(null);
    setEmailInput('');
  };

  const handleDisconnect = (toolId: string) => {
    const updated = { ...connections };
    delete updated[toolId];
    setConnections(updated);
    saveConnections(updated);
    const tool = tools.find(t => t.id === toolId);
    addNotification(`${tool?.name} desconectado.`, 'info');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-2">
        <h3 className="text-lg font-extrabold" style={{ color: theme.colors.primary }}>
          Ferramentas de Edicao
        </h3>
        <p className="text-xs opacity-50 mt-1">
          Conecte suas contas para enviar videos editados direto para o GrayArt.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tools.map(tool => {
          const isConnected = !!connections[tool.id]?.connected;
          return (
            <Card key={tool.id}>
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <div className="rounded-2xl overflow-hidden">
                  {tool.logo}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{tool.name}</h4>
                  <p className="text-[11px] opacity-40 mt-1 leading-relaxed">{tool.description}</p>
                </div>

                {isConnected ? (
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-500 text-xs font-bold">
                      <Check className="w-3.5 h-3.5" />
                      Conectado
                    </div>
                    <p className="text-[10px] opacity-40 truncate">{connections[tool.id]?.email}</p>
                    <div className="flex gap-2 justify-center">
                      <a
                        href={tool.loginUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Abrir
                      </a>
                      <button
                        onClick={() => handleDisconnect(tool.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-all"
                      >
                        <LogOut className="w-3 h-3" />
                        Sair
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(tool.id)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black transition-all hover:brightness-110"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    <LogIn className="w-4 h-4" />
                    Conectar
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Login Modal */}
      {loginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setLoginModal(null)}>
          <div
            className="bg-[#1e1e1e] rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              {tools.find(t => t.id === loginModal)?.logo}
              <div>
                <h3 className="font-bold text-lg">
                  Conectar {tools.find(t => t.id === loginModal)?.name}
                </h3>
                <p className="text-xs opacity-70">
                  Informe o e-mail da sua conta.
                </p>
              </div>
            </div>
            <input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-sm font-medium focus:outline-none focus:border-[var(--primary-color)] transition-colors placeholder:text-white/30"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSaveLogin()}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setLoginModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveLogin}
                disabled={!emailInput.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-40 transition-all hover:brightness-110"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Conectar
              </button>
            </div>
            <a
              href={tools.find(t => t.id === loginModal)?.loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 mt-3 text-[11px] font-bold opacity-60 hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir {tools.find(t => t.id === loginModal)?.name} no navegador
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditingToolsConnect;
