import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useClinica } from '../contexts/ClinicaContext';
import { getCitas, getPersonal, type Cita, type Personal } from '../api';
import CitaModal from '../components/CitaModal';

const HOURS = Array.from({ length: 13 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`); // 07:00 a 19:00
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Agenda() {
  const { clinica } = useClinica();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [doctorId, setDoctorId] = useState<string>('Todos');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1); // lunes
    return new Date(d.setDate(diff));
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCita, setEditingCita] = useState<Cita | null>(null);
  
  // Estado para responsive
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedDayIdx, setSelectedDayIdx] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); // 0 = Lunes

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    getCitas().then(data => setCitas(data.filter(c => clinica.id === 'consolidado' || c.clinicaId === clinica.id)));
    getPersonal().then(data => setPersonal(data.filter(p => p.clinicaId === clinica.id && p.tipo === 'Odontólogo')));
  }, [clinica.id]);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getCitasByDayAndHour = (date: Date, hour: string) => {
    const dateStr = date.toLocaleDateString('en-CA');
    return citas.filter(c => {
      const cleanFecha = String(c.fecha || '').split('T')[0];
      const matchDate = cleanFecha === dateStr && String(c.hora || '').startsWith(hour.split(':')[0]);
      const matchDoc = doctorId === 'Todos' || c.doctorId === doctorId;
      return matchDate && matchDoc;
    });
  };

  const navWeek = (offset: number) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + (offset * 7));
    setCurrentWeekStart(d);
  };

  const handleCitaSaved = (saved: Cita) => {
    setCitas(prev => {
      const exists = prev.find(c => c.id === saved.id);
      if (exists) return prev.map(c => c.id === saved.id ? saved : c);
      return [...prev, saved];
    });
  };

  const openEdit = (c: Cita) => {
    setEditingCita(c);
    setModalOpen(true);
  };

  return (
    <div className="agenda-container" style={{ animation: 'fadeIn 0.5s ease' }}>
      <div className="page-header condensed">
        <h1 className="is-mobile-inline">Agenda</h1>
        <div className="action-grid mobile-scroll">
          <select 
            className="input input-sm" 
            style={{ width: isMobile ? '160px' : '220px' }}
            value={doctorId}
            onChange={e => setDoctorId(e.target.value)}
          >
            <option value="Todos">Doctores (Todos)</option>
            {personal.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
          </select>
          <div className="filter-grid" style={{ 
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            padding: '2px 4px',
            margin: 0
          }}>
            <button className="btn btn-ghost btn-sm" style={{ padding:0, width:32 }} onClick={() => navWeek(-1)}>◀</button>
            <div style={{ fontWeight: 800, fontSize: '0.75rem', minWidth: '60px', textAlign: 'center' }}>
              {isMobile ? weekDates[selectedDayIdx].toLocaleDateString('es-VE', { day: 'numeric', month: 'short' }) : `${weekDates[0].getDate()}/${weekDates[0].getMonth()+1} - ${weekDates[6].getDate()}/${weekDates[6].getMonth()+1}`}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ padding:0, width:32 }} onClick={() => navWeek(1)}>▶</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setCurrentWeekStart(new Date()); setSelectedDayIdx(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); }}>Hoy</button>
        </div>
      </div>

      {isMobile && (
        <div className="filter-grid mobile-scroll" style={{ padding:'4px 8px', marginBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
          {DAYS.map((d, i) => (
            <button key={d} onClick={() => setSelectedDayIdx(i)} 
              className={`btn btn-sm ${selectedDayIdx === i ? 'btn-primary' : 'btn-ghost'}`} 
              style={{ flex: 1, padding: '6px 0', minWidth: '42px', fontSize:'0.7rem', borderRadius:'6px' }}>
              {d.substring(0, 3)}
            </button>
          ))}
        </div>
      )}

      <div className="glass" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border)' }}>
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ borderRight: '1px solid var(--border)', padding: '12px' }}></div>
            {weekDates.map((date, i) => (
              <div key={i} style={{ 
                padding: '12px', 
                textAlign: 'center', 
                borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                background: date.toDateString() === new Date().toDateString() ? 'var(--primary-dim)' : 'transparent'
              }}>
                <div style={{ fontSize: '0.7rem', color: date.toDateString() === new Date().toDateString() ? 'var(--primary)' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>{DAYS[i]}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: date.toDateString() === new Date().toDateString() ? 'var(--primary)' : 'inherit' }}>{date.getDate()}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ maxHeight: '700px', overflowY: 'auto', position: 'relative' }}>
          {HOURS.map((hour) => (
            <div key={hour} style={{ display: 'grid', gridTemplateColumns: isMobile ? '70px 1fr' : '80px repeat(7, 1fr)', minHeight: isMobile ? '60px' : '80px', borderTop: '1px solid var(--border)' }}>
              {/* Hora */}
              <div style={{ 
                padding: '8px', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                color: 'var(--text-muted)', 
                textAlign: 'right', 
                borderRight: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.01)'
              }}>
                {hour}
              </div>
              
              {/* Slots de días (Mobile: Solo el seleccionado) */}
              {weekDates.map((date, dIdx) => {
                if (isMobile && dIdx !== selectedDayIdx) return null;
                const dayCitas = getCitasByDayAndHour(date, hour);
                return (
                  <div key={dIdx} style={{ 
                    borderLeft: dIdx > 0 && !isMobile ? '1px solid var(--border)' : 'none', 
                    padding: '4px',
                    position: 'relative',
                    background: 'rgba(255,255,255,0.01)'
                  }}
                  onClick={() => {
                    setEditingCita(null);
                    setModalOpen(true);
                  }}
                  >
                    {dayCitas.map(c => (
                      <motion.div 
                        key={c.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(c);
                        }}
                        style={{
                          background: c.estado === 'Confirmada' ? 'var(--success)' : (c.estado === 'Pendiente' ? 'var(--warning)' : (c.estado === 'Cancelada' ? 'var(--danger)' : 'var(--primary)')),
                          color: '#fff',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          marginBottom: '6px',
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.1)',
                          lineHeight: '1.3',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>{c.pacienteNombre}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>{c.doctorNombre}</div>
                        <div style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>
                          {c.hora}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <CitaModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSaved={handleCitaSaved}
        editingCita={editingCita}
      />

      <style>{`
        .agenda-container {
          padding-bottom: 40px;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
