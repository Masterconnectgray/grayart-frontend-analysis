import React, { useState, useEffect, useCallback } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import { Card, Button } from '../design-system';
import { PlatformIcon } from '../constants/SocialIcons';
import {
  saveSocialCredential,
  listSocialCredentials,
  deleteSocialCredential,
} from '../services/FlowAPIService';
import { Plus, Trash2, Settings2, Check, X, User } from 'lucide-react';

interface InstagramIntegrationsProps { division: Division; }

type PlatformKey = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x';

interface SocialAccount {
  id: string;
  platform: PlatformKey;
  handle: string;
  name: string;
  addedAt: number;
}

const ALL_PLATFORMS: PlatformKey[] = ['instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'x'];

const PLATFORM_INFO: Record<PlatformKey, { label: string; color: string; placeholder: string }> = {
  instagram: { label: 'Instagram', color: '#E4405F', placeholder: '@usuario_instagram' },
  tiktok: { label: 'TikTok', color: '#010101', placeholder: '@usuario_tiktok' },
  youtube: { label: 'YouTube', color: '#FF0000', placeholder: 'Nome do Canal' },
  facebook: { label: 'Facebook', color: '#1877F2', placeholder: 'Nome da P\u00e1gina' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', placeholder: 'Nome ou empresa' },
  x: { label: 'X (Twitter)', color: '#000000', placeholder: '@usuario_x' },
};

const ACCOUNTS_KEY = 'grayart_social_accounts';

function loadAccounts(): SocialAccount[] {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]'); }
  catch { return []; }
}

function saveAccounts(accounts: SocialAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

const InstagramIntegrations: React.FC<InstagramIntegrationsProps> = ({ division }) => {
  const { addNotification } = useAppContext();
  const theme = DIVISIONS[division];

  const [accounts, setAccounts] = useState<SocialAccount[]>(loadAccounts);
  const [addingPlatform, setAddingPlatform] = useState<PlatformKey | null>(null);
  const [newHandle, setNewHandle] = useState('');
  const [newName, setNewName] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [credPlatform, setCredPlatform] = useState<PlatformKey>('instagram');
  const [credAppId, setCredAppId] = useState('');
  const [credAppSecret, setCredAppSecret] = useState('');
  const [savedCreds, setSavedCreds] = useState<{ platform: string; hasAppId: boolean; hasAppSecret: boolean }[]>([]);
  const [savingCred, setSavingCred] = useState(false);

  useEffect(() => {
    listSocialCredentials().then(setSavedCreds).catch(() => {});
  }, []);

  const addAccount = () => {
    if (!addingPlatform || !newHandle.trim()) return;
    const account: SocialAccount = {
      id: `${addingPlatform}-${Date.now()}`,
      platform: addingPlatform,
      handle: newHandle.trim(),
      name: newName.trim() || newHandle.trim(),
      addedAt: Date.now(),
    };
    const updated = [...accounts, account];
    setAccounts(updated);
    saveAccounts(updated);
    addNotification(`${PLATFORM_INFO[addingPlatform].label} "${newHandle.trim()}" adicionado!`, 'success');
    setNewHandle('');
    setNewName('');
    setAddingPlatform(null);
  };

  const removeAccount = (id: string) => {
    const updated = accounts.filter(a => a.id !== id);
    setAccounts(updated);
    saveAccounts(updated);
    addNotification('Conta removida.', 'info');
  };

  const handleSaveCredential = useCallback(async () => {
    if (!credAppId.trim()) { addNotification('Preencha o App ID.', 'error'); return; }
    setSavingCred(true);
    try {
      const ok = await saveSocialCredential(credPlatform, credAppId.trim(), credAppSecret.trim());
      if (ok) {
        addNotification(`Credenciais de ${PLATFORM_INFO[credPlatform].label} salvas.`, 'success');
        setCredAppId(''); setCredAppSecret('');
        setSavedCreds(await listSocialCredentials());
      }
    } catch { addNotification('Erro ao salvar.', 'error'); }
    finally { setSavingCred(false); }
  }, [credPlatform, credAppId, credAppSecret, addNotification]);

  const getAccountsByPlatform = (p: PlatformKey) => accounts.filter(a => a.platform === p);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: theme.colors.primary }}>Suas Redes</h2>
          <p className="text-xs opacity-50 mt-1 font-semibold">
            {accounts.length} conta{accounts.length !== 1 ? 's' : ''} conectada{accounts.length !== 1 ? 's' : ''}
            {' \u2022 '}Adicione quantas quiser por plataforma
          </p>
        </div>
        <button
          onClick={() => setShowAdmin(!showAdmin)}
          className={`w-10 h-10 rounded-xl flex justify-center items-center transition-all
            ${showAdmin ? 'bg-slate-700 text-white' : 'bg-white/5 opacity-50 hover:opacity-100'}`}
          title="Credenciais API"
        >
          <Settings2 size={18} />
        </button>
      </div>

      {!showAdmin && (
        <div className="flex flex-col gap-6">
          {ALL_PLATFORMS.map(platform => {
            const info = PLATFORM_INFO[platform];
            const platformAccounts = getAccountsByPlatform(platform);
            const isAdding = addingPlatform === platform;

            return (
              <Card key={platform}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: info.color }}>
                      <PlatformIcon platformId={platform} size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{info.label}</h3>
                      <span className="text-[10px] opacity-40 font-bold">
                        {platformAccounts.length} conta{platformAccounts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setAddingPlatform(isAdding ? null : platform); setNewHandle(''); setNewName(''); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={isAdding
                      ? { backgroundColor: '#ef444420', color: '#ef4444' }
                      : { backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}
                  >
                    {isAdding ? <><X className="w-3 h-3" /> Cancelar</> : <><Plus className="w-3 h-3" /> Adicionar</>}
                  </button>
                </div>

                {/* Add Form */}
                {isAdding && (
                  <div className="flex gap-2 mb-3 animate-in fade-in duration-200">
                    <input
                      value={newHandle}
                      onChange={e => setNewHandle(e.target.value)}
                      placeholder={info.placeholder}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-[var(--primary-color)]"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && addAccount()}
                    />
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Nome (opcional)"
                      className="w-32 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-[var(--primary-color)]"
                      onKeyDown={e => e.key === 'Enter' && addAccount()}
                    />
                    <button
                      onClick={addAccount}
                      disabled={!newHandle.trim()}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-black disabled:opacity-30 transition-all"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Account List */}
                {platformAccounts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {platformAccounts.map(acc => (
                      <div
                        key={acc.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 group transition-all hover:bg-white/8"
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: info.color }}>
                          {acc.handle[0]?.toUpperCase() || <User className="w-3 h-3" />}
                        </div>
                        <div className="leading-tight">
                          <div className="text-xs font-bold">{acc.handle}</div>
                          {acc.name !== acc.handle && (
                            <div className="text-[10px] opacity-40">{acc.name}</div>
                          )}
                        </div>
                        <button
                          onClick={() => removeAccount(acc.id)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] opacity-30 font-bold text-center py-2">
                    Nenhuma conta adicionada
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {showAdmin && (
        <div className="animate-in fade-in duration-300 max-w-xl">
          <Card>
            <h3 className="text-lg font-bold mb-1">Credenciais API (OAuth)</h3>
            <p className="text-xs opacity-40 mb-4">
              Configure App ID e Secret para conex\u00e3o real via OAuth. Opcional — as contas manuais funcionam para agendamento.
            </p>
            <div className="flex flex-col gap-3 mb-6">
              <select
                value={credPlatform}
                onChange={e => setCredPlatform(e.target.value as PlatformKey)}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold focus:outline-none focus:border-[var(--primary-color)]"
              >
                {ALL_PLATFORMS.map(p => (
                  <option key={p} value={p}>{PLATFORM_INFO[p].label}</option>
                ))}
              </select>
              <input
                value={credAppId}
                onChange={e => setCredAppId(e.target.value)}
                placeholder="App ID / Client ID"
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-sm font-mono focus:outline-none focus:border-[var(--primary-color)]"
              />
              <input
                type="password"
                value={credAppSecret}
                onChange={e => setCredAppSecret(e.target.value)}
                placeholder="App Secret / Client Secret"
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-sm font-mono focus:outline-none focus:border-[var(--primary-color)]"
              />
              <Button size="lg" fullWidth onClick={handleSaveCredential} loading={savingCred}>
                SALVAR CREDENCIAL
              </Button>
            </div>

            {savedCreds.length > 0 && (
              <div>
                <div className="text-[10px] font-bold opacity-30 uppercase tracking-widest mb-3">Credenciais Salvas</div>
                <div className="flex flex-col gap-2">
                  {savedCreds.map(cred => (
                    <div key={cred.platform} className="p-3 rounded-xl bg-white/5 flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <PlatformIcon platformId={cred.platform} size={24} />
                        <div>
                          <div className="font-bold text-sm">{PLATFORM_INFO[cred.platform as PlatformKey]?.label || cred.platform}</div>
                          <div className="text-[10px] text-emerald-500 font-bold">
                            {cred.hasAppId ? 'ID' : ''}{cred.hasAppId && cred.hasAppSecret ? ' \u00b7 ' : ''}{cred.hasAppSecret ? 'SECRET' : ''} OK
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => { deleteSocialCredential(cred.platform).then(() => listSocialCredentials().then(setSavedCreds)); }}
                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default InstagramIntegrations;
