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

  useEffect(() => {
    getCitas().then(data => setCitas(data.filter(c => c.clinicaId === clinica.id)));
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
      const matchDate = c.fecha === dateStr && c.hora.startsWith(hour.split(':')[0]);
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
      <div className="page-header">
        <div>
          <h1>Agenda Visual</h1>
          <p>Planificación semanal de citas — {clinica.nombreCorto}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select 
            className="input" 
            style={{ width: '200px', marginRight: '16px' }}
            value={doctorId}
            onChange={e => setDoctorId(e.target.value)}
          >
            <option value="Todos">Todos los Doctores</option>
            {personal.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={() => navWeek(-1)}>◀</button>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', minWidth: '180px', textAlign: 'center' }}>
             {weekDates[0].getDate()}/{weekDates[0].getMonth()+1} - {weekDates[6].getDate()}/{weekDates[6].getMonth()+1}
          </div>
          <button className="btn btn-ghost" onClick={() => navWeek(1)}>▶</button>
          <button className="btn btn-primary" onClick={() => setCurrentWeekStart(new Date())}>Hoy</button>
        </div>
      </div>

      <div className="glass" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border)' }}>
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

        <div style={{ maxHeight: '700px', overflowY: 'auto', position: 'relative' }}>
          {HOURS.map((hour) => (
            <div key={hour} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', minHeight: '80px', borderTop: '1px solid var(--border)' }}>
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
              
              {/* Slots de días */}
              {weekDates.map((date, dIdx) => {
                const dayCitas = getCitasByDayAndHour(date, hour);
                return (
                  <div key={dIdx} style={{ 
                    borderLeft: dIdx > 0 ? '1px solid var(--border)' : 'none', 
                    padding: '4px',
                    position: 'relative',
                    background: 'rgba(255,255,255,0.01)'
                  }}
                  onClick={() => {
                    setEditingCita(null); // Nueva cita
                    // Opcional: pasar fecha/hora seleccionada al modal
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
                          e.stopPropagation(); // Evitar disparar el onClick del slot
                          openEdit(c);
                        }}
                        style={{
                          background: c.estado === 'Confirmada' ? 'var(--success)' : (c.estado === 'Pendiente' ? 'var(--warning)' : (c.estado === 'Cancelada' ? 'var(--danger)' : 'var(--primary)')),
                          color: '#fff',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          marginBottom: '4px',
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.1)',
                          lineHeight: '1.2'
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>{c.pacienteNombre}</div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.9 }}>{c.doctorNombre}</div>
                        <div style={{ fontSize: '0.6rem', background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>
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
