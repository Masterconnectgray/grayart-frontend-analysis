import { useState, useEffect, useRef, useCallback } from 'react'
import { bffFetch } from '../services/BFFClient'
import type { Division } from '../constants/Themes'

interface WhatsAppChatProps {
  instanceName: string
  division: Division
}

interface Chat {
  id: string
  name: string
  remoteJid: string
  lastMessage?: string
  lastMessageTime?: number
  isGroup: boolean
  unreadCount?: number
}

interface Message {
  key: { id: string; fromMe: boolean; remoteJid: string }
  message?: { conversation?: string; extendedTextMessage?: { text?: string } }
  messageTimestamp: number
  pushName?: string
}

function formatTime(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Hoje'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function getMessageText(msg: Message): string {
  return msg.message?.conversation
    || msg.message?.extendedTextMessage?.text
    || ''
}

function Avatar({ name, isGroup, online }: { name: string; isGroup: boolean; online?: boolean }) {
  const letter = (name || '?')[0].toUpperCase()
  const bg = isGroup ? 'bg-emerald-700' : 'bg-zinc-600'
  return (
    <div className="relative flex-shrink-0">
      <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center text-white font-bold text-lg`}>
        {letter}
      </div>
      {(online || isGroup) && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] border-2 border-[#1a1a1a] rounded-full" />
      )}
    </div>
  )
}

export default function WhatsAppChat({ instanceName }: WhatsAppChatProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [filteredChats, setFilteredChats] = useState<Chat[]>([])
  const [search, setSearch] = useState('')
  const [activeJid, setActiveJid] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileShowChat, setMobileShowChat] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeChat = chats.find(c => c.remoteJid === activeJid)

  // Buscar lista de conversas
  const fetchChats = useCallback(async () => {
    try {
      setLoadingChats(true)
      setError(null)
      const res = await bffFetch(`/whatsapp/chats/${instanceName}`)
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const data = await res.json()
      const list: Chat[] = (Array.isArray(data) ? data : data?.chats || []).map((c: any) => ({
        id: c.id || c.remoteJid || c._id,
        name: c.name || c.pushName || c.remoteJid?.split('@')[0] || 'Desconhecido',
        remoteJid: c.remoteJid || c.id,
        lastMessage: c.lastMessage?.message?.conversation
          || c.lastMessage?.message?.extendedTextMessage?.text
          || c.lastMsgContent || '',
        lastMessageTime: c.lastMessage?.messageTimestamp || c.updatedAt || 0,
        isGroup: (c.remoteJid || c.id || '').includes('@g.us'),
        unreadCount: c.unreadCount || 0,
      }))
      list.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
      setChats(list)
      setFilteredChats(list)
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar conversas')
    } finally {
      setLoadingChats(false)
    }
  }, [instanceName])

  // Buscar mensagens de uma conversa
  const fetchMessages = useCallback(async (jid: string) => {
    try {
      setLoadingMessages(true)
      const res = await bffFetch(`/whatsapp/messages/${instanceName}?remoteJid=${jid}&count=50`)
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const data = await res.json()
      const msgs: Message[] = (Array.isArray(data) ? data : data?.messages || [])
        .sort((a: Message, b: Message) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0))
      setMessages(msgs)
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [instanceName])

  // Enviar mensagem
  const sendMessage = useCallback(async () => {
    if (!text.trim() || !activeJid || sending) return
    const msg = text.trim()
    setText('')
    setSending(true)
    try {
      const res = await bffFetch(`/whatsapp/send-text/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({ number: activeJid, text: msg }),
      })
      if (!res.ok) throw new Error('Falha ao enviar')
      // Adicionar mensagem local para feedback imediato
      const now = Math.floor(Date.now() / 1000)
      setMessages(prev => [...prev, {
        key: { id: `local-${now}`, fromMe: true, remoteJid: activeJid },
        message: { conversation: msg },
        messageTimestamp: now,
      }])
    } catch {
      setText(msg)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [text, activeJid, sending, instanceName])

  useEffect(() => { fetchChats() }, [fetchChats])

  // Filtrar conversas pelo campo de busca
  useEffect(() => {
    if (!search.trim()) {
      setFilteredChats(chats)
    } else {
      const q = search.toLowerCase()
      setFilteredChats(chats.filter(c => c.name.toLowerCase().includes(q)))
    }
  }, [search, chats])

  // Abrir conversa
  useEffect(() => {
    if (activeJid) {
      fetchMessages(activeJid)
    }
  }, [activeJid, fetchMessages])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openChat = (jid: string) => {
    setActiveJid(jid)
    setMobileShowChat(true)
  }

  const goBack = () => {
    setMobileShowChat(false)
    setActiveJid(null)
    setMessages([])
  }

  // Skeleton para carregamento
  const ChatSkeleton = () => (
    <div className="space-y-1 p-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )

  // Painel esquerdo: lista de conversas
  const leftPanel = (
    <div className={`w-full md:w-[380px] md:min-w-[320px] h-full flex flex-col border-r border-white/10 bg-[#1e1e1e] ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <h2 className="text-white font-semibold text-lg mb-2">Conversas</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar conversa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#25D366]/50 transition-colors"
          />
          <svg className="absolute right-3 top-2.5 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loadingChats ? <ChatSkeleton /> : error ? (
          <div className="p-6 text-center">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button onClick={fetchChats} className="text-[#25D366] text-sm hover:underline">
              Tentar novamente
            </button>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-6 text-center text-white/40 text-sm">
            {search ? 'Nenhuma conversa encontrada' : 'Sem conversas'}
          </div>
        ) : (
          filteredChats.map(chat => (
            <button
              key={chat.remoteJid}
              onClick={() => openChat(chat.remoteJid)}
              className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 transition-colors text-left ${activeJid === chat.remoteJid ? 'bg-white/10' : ''}`}
            >
              <Avatar name={chat.name} isGroup={chat.isGroup} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium truncate">{chat.name}</span>
                  {chat.lastMessageTime ? (
                    <span className="text-white/30 text-xs flex-shrink-0 ml-2">
                      {formatDate(chat.lastMessageTime)}
                    </span>
                  ) : null}
                </div>
                <p className="text-white/40 text-xs truncate mt-0.5">{chat.lastMessage || '\u00A0'}</p>
              </div>
              {(chat.unreadCount || 0) > 0 && (
                <span className="bg-[#25D366] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {chat.unreadCount}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )

  // Painel direito: chat ativo
  const rightPanel = (
    <div className={`flex-1 h-full flex flex-col bg-[#1a1a1a] ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
      {!activeChat ? (
        <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
          Selecione uma conversa para comecar
        </div>
      ) : (
        <>
          {/* Header do chat */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#1e1e1e]">
            <button onClick={goBack} className="md:hidden text-white/60 hover:text-white mr-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <Avatar name={activeChat.name} isGroup={activeChat.isGroup} online />
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-sm truncate">{activeChat.name}</h3>
              <p className="text-white/40 text-xs">
                {activeChat.isGroup ? 'Grupo' : activeChat.remoteJid.split('@')[0]}
              </p>
            </div>
            <button onClick={() => fetchMessages(activeJid!)} className="text-white/40 hover:text-white transition-colors" title="Atualizar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37,211,102,0.03) 0%, transparent 50%)' }}>
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-white/20 text-sm">
                Nenhuma mensagem
              </div>
            ) : (
              messages.map(msg => {
                const txt = getMessageText(msg)
                if (!txt) return null
                const fromMe = msg.key.fromMe
                return (
                  <div key={msg.key.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 mb-0.5 ${fromMe ? 'bg-[#25D366]/90 text-white rounded-br-none' : 'bg-white/10 text-white/90 rounded-bl-none'}`}>
                      {!fromMe && msg.pushName && activeChat.isGroup && (
                        <p className="text-[#25D366] text-xs font-medium mb-0.5">{msg.pushName}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{txt}</p>
                      <p className={`text-[10px] mt-1 text-right ${fromMe ? 'text-white/60' : 'text-white/30'}`}>
                        {formatTime(msg.messageTimestamp)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-white/10 bg-[#1e1e1e]">
            <form
              onSubmit={e => { e.preventDefault(); sendMessage() }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Digite uma mensagem..."
                disabled={sending}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-[#25D366]/50 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="bg-[#25D366] hover:bg-[#25D366]/80 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg p-2.5 transition-colors"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-xl overflow-hidden border border-white/10">
      {leftPanel}
      {rightPanel}
    </div>
  )
}
