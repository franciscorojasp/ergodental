import { createContext, useContext, useState, useEffect } from 'react';
import { CLINICAS, type Clinica, updateClinica as apiUpdateClinica } from '../api';
import { useAuth } from './AuthContext';

interface ClinicaCtx {
  clinica: Clinica;
  clinicas: Clinica[];
  setClinica: (c: Clinica) => void;
  cambiarClinica: (id: string) => void;
  crearClinica: (c: Omit<Clinica, 'id'>) => void;
  updateClinica: (c: Clinica) => Promise<void>;
  necesitaSeleccion: boolean;
  finalizarSeleccion: () => void;
}

const STORAGE_KEY = 'ergo_clinica_activa';

const ClinicaContext = createContext<ClinicaCtx | null>(null);

export function ClinicaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [clinicas, setClinicas] = useState<Clinica[]>(CLINICAS);
  
  const [clinica, setClinicaState] = useState<Clinica>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const found = CLINICAS.find(c => c.id === saved);
      if (found) return found;
    }
    return CLINICAS[0];
  });

  const [necesitaSeleccion, setNecesitaSeleccion] = useState(() => !localStorage.getItem(STORAGE_KEY));

  // Lógica de permisos y auto-selección
  useEffect(() => {
    if (!user) return;
    const esAutorizado = user.rol === 'ADMIN' || user.rol === 'DOCTOR' || user.permisosMultiClinica === true;
    
    // Si NO es autorizado y tiene una clínica asignada, forzar esa clínica
    if (!esAutorizado && user.clinicaId) {
      const assigned = CLINICAS.find(c => c.id === user.clinicaId);
      if (assigned && assigned.id !== clinica.id) {
        setClinicaState(assigned);
        localStorage.setItem(STORAGE_KEY, assigned.id);
      }
      setNecesitaSeleccion(false);
    }
  }, [user, clinica.id]);

  const setClinica = (c: Clinica) => {
    setClinicaState(c);
    localStorage.setItem(STORAGE_KEY, c.id);
  };

  const cambiarClinica = (id: string) => {
    const found = clinicas.find(c => c.id === id);
    if (found) setClinica(found);
  };

  const crearClinica = (c: Omit<Clinica, 'id'>) => {
    const id = `cl-${Date.now()}`;
    const nueva = { ...c, id };
    setClinicas(prev => [...prev, nueva]);
  };

  const updateClinica = async (c: Clinica) => {
    await apiUpdateClinica(c);
    setClinicas(prev => prev.map(cl => (cl.id === c.id ? c : cl)));
    if (clinica.id === c.id) {
      setClinicaState(c);
    }
  };

  const finalizarSeleccion = () => {
    setNecesitaSeleccion(false);
  };

  return (
    <ClinicaContext.Provider value={{ clinica, clinicas, setClinica, cambiarClinica, crearClinica, updateClinica, necesitaSeleccion, finalizarSeleccion }}>
      {children}
    </ClinicaContext.Provider>
  );
}

export function useClinica() {
  const ctx = useContext(ClinicaContext);
  if (!ctx) throw new Error('useClinica must be inside ClinicaProvider');
  return ctx;
}
