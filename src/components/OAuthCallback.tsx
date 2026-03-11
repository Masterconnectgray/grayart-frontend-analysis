/**
 * OAuthCallback.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Página de callback OAuth. As plataformas sociais redirecionam para:
 *   https://www.flowgray.com.br/grayart/oauth/callback?code=XXX&state=YYY
 *
 * Esta página:
 * 1. Captura `code` e `state` da URL
 * 2. Envia via postMessage para a janela pai (que abriu o popup)
 * 3. Fecha o popup
 *
 * CONFIGURAÇÃO NO VITE (vite.config.ts):
 * Adicione a rota /oauth/callback apontando para este componente.
 */

import React, { useEffect } from 'react';

const OAuthCallback: React.FC = () => {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');
        const errorDescription = params.get('error_description');

        if (error) {
            window.opener?.postMessage(
                { type: 'oauth_callback', error: errorDescription || error },
                window.location.origin
            );
        } else if (code) {
            window.opener?.postMessage(
                { type: 'oauth_callback', code, state },
                window.location.origin
            );
        }

        // Fecha o popup após 1s (para dar tempo de processar)
        setTimeout(() => window.close(), 800);
    }, []);

    const params = new URLSearchParams(window.location.search);
    const hasError = params.has('error');

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a0a',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            gap: '1rem',
        }}>
            <div style={{ fontSize: '3rem' }}>{hasError ? '❌' : '✅'}</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                {hasError ? 'Autorização negada' : 'Autorizando...'}
            </h2>
            <p style={{ fontSize: '0.8rem', opacity: 0.5, margin: 0 }}>
                {hasError ? params.get('error_description') || 'Tente novamente.' : 'Fechando esta janela automaticamente...'}
            </p>
        </div>
    );
};

export default OAuthCallback;
