import { createContext, useContext, useState, type ReactNode } from 'react';

// Tipado para el contenido de la aplicación
interface AppContent {
  dashboard: string;
  pacientes: string;
  citas: string;
  agenda: string;
  finanzas: string;
  inventario: string;
  personal: string;
  configuracion: string;
  loading_session: string;
  loading_app: string;
  welcome: string;
  logout: string;
  language_label: string;
}

const contentMap: Record<'es' | 'en', AppContent> = {
  es: {
    dashboard: "Panel de Control",
    pacientes: "Pacientes",
    citas: "Registros de Citas",
    agenda: "Agenda Médica",
    finanzas: "Gestión Financiera",
    inventario: "Inventario de Insumos",
    personal: "Equipo de Trabajo",
    configuracion: "Configuración Clínica",
    loading_session: "Restaurando sesión segura...",
    loading_app: "Iniciando plataforma médica...",
    welcome: "Bienvenido a ErgoDental",
    logout: "Cerrar Sesión",
    language_label: "Idioma"
  },
  en: {
    dashboard: "Dashboard",
    pacientes: "Patients",
    citas: "Appointment Records",
    agenda: "Medical Schedule",
    finanzas: "Financial Management",
    inventario: "Supplies Inventory",
    personal: "Staff Members",
    configuracion: "Clinic Settings",
    loading_session: "Restoring secure session...",
    loading_app: "Starting medical platform...",
    welcome: "Welcome to ErgoDental",
    logout: "Log Out",
    language_label: "Language"
  }
};

interface ContentContextType {
  content: AppContent;
  language: 'es' | 'en';
  toggleLanguage: () => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<'es' | 'en'>(() => {
    const saved = localStorage.getItem('ergo_lang');
    return (saved as 'es' | 'en') || 'es';
  });

  const toggleLanguage = () => {
    const next = language === 'es' ? 'en' : 'es';
    setLanguage(next);
    localStorage.setItem('ergo_lang', next);
  };

  return (
    <ContentContext.Provider value={{ content: contentMap[language], language, toggleLanguage }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent debe usarse dentro de ContentProvider');
  return context;
};
