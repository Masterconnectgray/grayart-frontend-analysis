import { useMemo } from 'react';

interface WhatsAppPreviewProps {
  message: string;
  contactName?: string;
  groupName?: string;
  className?: string;
}

const MAX_CHARS = 4096;

function WhatsAppPreview({ message, contactName, groupName, className = '' }: WhatsAppPreviewProps) {
  const now = useMemo(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, []);

  const lines = message.split('\n').length;
  const chars = message.length;
  const tooLong = chars > MAX_CHARS;
  const displayName = groupName || contactName || 'Contato';

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Phone frame */}
      <div
        className="rounded-[2rem] overflow-hidden border-[3px] border-black shadow-2xl"
        style={{ width: 320, background: '#000' }}
      >
        {/* Notch */}
        <div className="flex justify-center" style={{ background: '#1F2C34' }}>
          <div className="w-28 h-5 bg-black rounded-b-2xl" />
        </div>

        {/* WhatsApp header */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: '#1F2C34' }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: '#00A884' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-white text-sm font-medium truncate">{displayName}</span>
        </div>

        {/* Chat area */}
        <div
          className="px-3 py-4 overflow-y-auto"
          style={{
            background: '#0B141A',
            backgroundImage:
              'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.02) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.015) 1px, transparent 1px)',
            backgroundSize: '40px 40px, 60px 60px',
            minHeight: 200,
            maxHeight: 360,
          }}
        >
          {message ? (
            <div className="flex justify-end">
              <div
                className="relative max-w-[85%] rounded-lg px-2.5 pt-1.5 pb-4"
                style={{ background: '#005C4B' }}
              >
                {/* Tail */}
                <div
                  className="absolute -right-1.5 top-0 w-3 h-3"
                  style={{
                    background: '#005C4B',
                    clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                  }}
                />
                <p className="text-white text-sm whitespace-pre-wrap break-words leading-[1.35]">
                  {message}
                </p>
                {/* Time + checks */}
                <span className="absolute bottom-1 right-2 flex items-center gap-1">
                  <span style={{ color: '#ffffff80', fontSize: 11 }}>{now}</span>
                  <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                    <path
                      d="M11.07 0.73L4.53 7.27L1.97 4.71L0.55 6.12L4.53 10.1L12.48 2.15L11.07 0.73Z"
                      fill="#53BDEB"
                    />
                    <path
                      d="M14.07 0.73L7.53 7.27L6.83 6.57L5.42 7.98L7.53 10.1L15.48 2.15L14.07 0.73Z"
                      fill="#53BDEB"
                    />
                  </svg>
                </span>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 text-xs italic mt-16">
              Nenhuma mensagem para visualizar
            </p>
          )}
        </div>

        {/* Input bar */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: '#1F2C34' }}
        >
          <div className="flex-1 rounded-full px-3 py-1.5 text-xs text-gray-500" style={{ background: '#2A3942' }}>
            Mensagem
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#00A884' }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 1.74.45 3.38 1.24 4.8L2 22l5.2-1.24A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
            </svg>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex justify-center py-1.5" style={{ background: '#000' }}>
          <div className="w-24 h-1 bg-gray-600 rounded-full" />
        </div>
      </div>

      {/* Info below */}
      <div className="text-center text-sm">
        <span className={tooLong ? 'text-red-400 font-semibold' : 'text-gray-400'}>
          {chars} caracteres — {lines} {lines === 1 ? 'linha' : 'linhas'}
        </span>
        {tooLong && (
          <p className="text-red-400 text-xs mt-1">
            Limite excedido! Maximo de {MAX_CHARS} caracteres.
          </p>
        )}
      </div>
    </div>
  );
}

export default WhatsAppPreview;
