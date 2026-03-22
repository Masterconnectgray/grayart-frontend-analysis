import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Division } from '../constants/Themes';

export type Tab = 'marketing' | 'operations';
export type MarketingView = 'create' | 'media' | 'video' | 'photo' | 'connect' | 'publish' | 'monitor';

interface Notification {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface GeneratedCopy {
    hook: string;
    body: string;
    cta: string;
    tags: string[];
    platform: string;
    fullText: string;
}

interface AppContextType {
    activeDivision: Division;
    setActiveDivision: (division: Division) => void;
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    marketingView: MarketingView;
    setMarketingView: (view: MarketingView) => void;
    notifications: Notification[];
    addNotification: (message: string, type?: Notification['type']) => void;
    removeNotification: (id: number) => void;
    // Stats
    stats: {
        videosCreated: number;
        tasksCompleted: number;
        postsPublished: number;
    };
    incrementVideos: () => void;
    incrementTasks: () => void;
    incrementPosts: () => void;
    // ✅ NOVO: Copy gerada pelo ReelsGenerator para o AIVideoLab
    generatedCopy: GeneratedCopy | null;
    setGeneratedCopy: (copy: GeneratedCopy | null) => void;
    sendCopyToVideoLab: (copy: GeneratedCopy) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeDivision, setActiveDivision] = useState<Division>(() => {
        return (localStorage.getItem('activeDivision') as Division) || 'connect-gray';
    });
    const [activeTab, setActiveTab] = useState<Tab>(() => {
        return (localStorage.getItem('activeTab') as Tab) || 'marketing';
    });
    const [marketingView, setMarketingView] = useState<MarketingView>(() => {
        return (localStorage.getItem('marketingView') as MarketingView) || 'create';
    });

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [stats, setStats] = useState({
        videosCreated: Number(localStorage.getItem('stats_videos')) || 0,
        tasksCompleted: Number(localStorage.getItem('stats_tasks')) || 0,
        postsPublished: Number(localStorage.getItem('stats_posts')) || 0,
    });

    // ✅ NOVO: Estado global para copy gerada
    const [generatedCopy, setGeneratedCopy] = useState<GeneratedCopy | null>(null);

    useEffect(() => {
        localStorage.setItem('activeDivision', activeDivision);
        localStorage.setItem('activeTab', activeTab);
        localStorage.setItem('marketingView', marketingView);
    }, [activeDivision, activeTab, marketingView]);

    useEffect(() => {
        localStorage.setItem('stats_videos', stats.videosCreated.toString());
        localStorage.setItem('stats_tasks', stats.tasksCompleted.toString());
        localStorage.setItem('stats_posts', stats.postsPublished.toString());
    }, [stats]);

    const notifIdRef = useRef(0);

    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const addNotification = useCallback((message: string, type: Notification['type'] = 'success') => {
        const id = ++notifIdRef.current;
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeNotification(id), 4000);
    }, [removeNotification]);

    const incrementVideos = () => setStats(s => ({ ...s, videosCreated: s.videosCreated + 1 }));
    const incrementTasks = () => setStats(s => ({ ...s, tasksCompleted: s.tasksCompleted + 1 }));
    const incrementPosts = () => setStats(s => ({ ...s, postsPublished: s.postsPublished + 1 }));

    // ✅ NOVO: Envia a copy para o Vídeo Lab e navega automaticamente
    const sendCopyToVideoLab = useCallback((copy: GeneratedCopy) => {
        setGeneratedCopy(copy);
        setActiveTab('marketing');
        setMarketingView('video');
    }, []);

    return (
        <AppContext.Provider value={{
            activeDivision, setActiveDivision,
            activeTab, setActiveTab,
            marketingView, setMarketingView,
            notifications, addNotification, removeNotification,
            stats, incrementVideos, incrementTasks, incrementPosts,
            generatedCopy, setGeneratedCopy, sendCopyToVideoLab,
        }}>
            {children}
        </AppContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
