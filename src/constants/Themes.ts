export type Division = 'connect-gray' | 'gray-up' | 'gray-up-flow' | 'gray-art';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent?: string;
}

export interface DivisionConfig {
  name: string;
  tagline: string;
  colors: ThemeColors;
}

export const DIVISIONS: Record<Division, DivisionConfig> = {
  'connect-gray': {
    name: 'Connect Gray',
    tagline: 'Networking Condominial',
    colors: {
      primary: '#9370DB',
      secondary: '#FFFFFF',
      background: '#000000',
      text: '#FFFFFF',
    }
  },
  'gray-up': {
    name: 'Gray Up',
    tagline: 'Elevadores & Eletrica',
    colors: {
      primary: '#2563EB',
      secondary: '#FFFFFF',
      background: '#000000',
      text: '#FFFFFF',
    }
  },
  'gray-up-flow': {
    name: 'Gray UP Flow',
    tagline: 'Consultoria Lean',
    colors: {
      primary: '#10B981',
      secondary: '#FFFFFF',
      background: '#000000',
      text: '#FFFFFF',
    }
  },
  'gray-art': {
    name: 'Gray ART',
    tagline: 'Branding & Marketing',
    colors: {
      primary: '#9370DB',
      secondary: '#FFFF00',
      background: '#FFFFFF',
      text: '#000000',
    }
  }
};
