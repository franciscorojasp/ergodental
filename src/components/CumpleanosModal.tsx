// src/components/CumpleanosModal.tsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinica } from '../contexts/ClinicaContext';
import { useResponsive } from '../hooks/useResponsive';
import { getPacientes, type Paciente } from '../api';

interface CumpleanosModalProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteInicial?: Paciente | null;
}

function cleanWhatsAppPhone(phone: any): string {
  let cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.startsWith('04')) cleaned = '58' + cleaned.substring(1);
  else if (cleaned.startsWith('4') && cleaned.length === 10) cleaned = '58' + cleaned;
  return cleaned;
}

function parseFechaNacimiento(val: string): { dia: number; mes: number; ano: number } | null {
  if (!val) return null;
  const clean = String(val).split('T')[0];
  const parts = clean.split(/[/-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return { ano: parseInt(parts[0], 10), mes: parseInt(parts[1], 10) - 1, dia: parseInt(parts[2], 10) };
    } else if (parts[2].length === 4) {
      return { ano: parseInt(parts[2], 10), mes: parseInt(parts[1], 10) - 1, dia: parseInt(parts[0], 10) };
    }
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return { ano: d.getFullYear(), mes: d.getMonth(), dia: d.getDate() };
}

function diasParaCumple(info: { dia: number; mes: number }): number {
  const hoy = new Date();
  const hoyAno = hoy.getFullYear();
  let proximo = new Date(hoyAno, info.mes, info.dia);
  const hoySinHora = new Date(hoyAno, hoy.getMonth(), hoy.getDate());
  if (proximo < hoySinHora) {
    proximo = new Date(hoyAno + 1, info.mes, info.dia);
  }
  const diffTime = proximo.getTime() - hoySinHora.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

type PlantillaTipo = 'calida' | 'cortesia' | 'formal';

export default function CumpleanosModal({ isOpen, onClose, pacienteInicial }: CumpleanosModalProps) {
  const { clinica, clinicas } = useClinica();
  const { isMobile } = useResponsive();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [tabFiltro, setTabFiltro] = useState<'hoy' | 'semana' | 'mes' | 'todos'>('hoy');
  const [busqueda, setBusqueda] = useState('');
  const [tipoPlantilla, setTipoPlantilla] = useState<PlantillaTipo>('calida');
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('no-scroll');
      getPacientes().then(data => {
        const filtrados = data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id);
        setPacientes(filtrados);
      });
      if (pacienteInicial) {
        setPacienteSeleccionado(pacienteInicial);
      }
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [isOpen, clinica.id, pacienteInicial]);

  // Pacientes con fecha de nacimiento analizada
  const pacientesConCumple = useMemo(() => {
    return pacientes
      .map(p => {
        const info = parseFechaNacimiento(p.fechaNacimiento);
        if (!info) return null;
        const dias = diasParaCumple(info);
        const hoy = new Date();
        const esHoy = dias === 0;
        const esEsteMes = info.mes === hoy.getMonth();
        const edadCumple = hoy.getFullYear() - info.ano;
        return {
          paciente: p,
          info,
          dias,
          esHoy,
          esEsteMes,
          edadCumple,
        };
      })
      .filter(Boolean) as {
        paciente: Paciente;
        info: { dia: number; mes: number; ano: number };
        dias: number;
        esHoy: boolean;
        esEsteMes: boolean;
        edadCumple: number;
      }[];
  }, [pacientes]);

  const cumpleanerosHoy = useMemo(() => pacientesConCumple.filter(item => item.esHoy), [pacientesConCumple]);
  const cumpleanerosSemana = useMemo(() => pacientesConCumple.filter(item => item.dias <= 7).sort((a, b) => a.dias - b.dias), [pacientesConCumple]);
  const cumpleanerosMes = useMemo(() => pacientesConCumple.filter(item => item.esEsteMes).sort((a, b) => a.info.dia - b.info.dia), [pacientesConCumple]);

  // Lista según tab seleccionado
  const listaMostrada = useMemo(() => {
    let base = pacientesConCumple;
    if (tabFiltro === 'hoy') base = cumpleanerosHoy;
    else if (tabFiltro === 'semana') base = cumpleanerosSemana;
    else if (tabFiltro === 'mes') base = cumpleanerosMes;

    if (!busqueda) return base;
    const term = busqueda.toLowerCase();
    return base.filter(item => 
      `${item.paciente.nombre} ${item.paciente.apellido} ${item.paciente.cedula}`.toLowerCase().includes(term)
    );
  }, [pacientesConCumple, tabFiltro, cumpleanerosHoy, cumpleanerosSemana, cumpleanerosMes, busqueda]);

  // Auto-seleccionar primer cumpleañero si no hay ninguno seleccionado
  useEffect(() => {
    if (!pacienteSeleccionado && listaMostrada.length > 0) {
      setPacienteSeleccionado(listaMostrada[0].paciente);
    }
  }, [listaMostrada, pacienteSeleccionado]);

  // Obtener la clínica a la que pertenece el paciente para personalizar firma
  const clinicaPaciente = useMemo(() => {
    if (!pacienteSeleccionado) return clinica;
    const found = clinicas.find(c => c.id === pacienteSeleccionado.clinicaId);
    return found || clinica;
  }, [pacienteSeleccionado, clinica, clinicas]);

  // Generador de mensajes personalizados
  const buildMensajePorDefecto = (pac: Paciente, tipo: PlantillaTipo): string => {
    const nombre = pac.nombre || 'Paciente';
    const nombreClinica = clinicaPaciente.nombre || 'ErgoDental';
    const sedeInfo = clinicaPaciente.direccion ? `\n📍 Sede: ${clinicaPaciente.direccion}` : '';

    if (tipo === 'calida') {
      return `🦷 *¡FELIZ CUMPLEAÑOS TE DESEA ${nombreClinica.toUpperCase()}!* 🎂🎉\n\n` +
        `Estimado(a) *${nombre}*,\n\n` +
        `En este día tan especial, todo nuestro equipo médico y humano queremos hacerte llegar nuestras más sinceras y alegres felicitaciones en tu cumpleaños. 🥳🎈\n\n` +
        `Deseamos para ti un año extraordinario lleno de sonrisas, salud, prosperidad y grandes momentos junto a tus seres queridos. ¡Gracias por confiar el cuidado de tu salud bucal en nosotros! ✨\n\n` +
        `¡Que disfrutes tu día al máximo! 🥂🍰\n\n` +
        `Con todo nuestro cariño,\n` +
        `*${nombreClinica}*${sedeInfo}`;
    }

    if (tipo === 'cortesia') {
      return `🎉 *¡CELEBRAMOS TU CUMPLEAÑOS EN ${nombreClinica.toUpperCase()}!* 🎂🦷\n\n` +
        `¡Hola *${nombre}*! En nombre de todos los doctores y especialistas de *${nombreClinica}*, queremos desearte un muy Feliz Cumpleaños. 🎈🎁\n\n` +
        `Para consentirte en tu mes especial, queremos obsequiarte un *Chequeo Dental Integral de Cortesía y un 15% de descuento* en tu próxima sesión de limpieza profiláctica profunda ultrasónica. 🌟\n\n` +
        `Responde a este mensaje para agendar tu cita y disfrutar de tu cortesía.\n\n` +
        `¡Esperamos verte pronto para seguir cuidando tu sonrisa!\n\n` +
        `Atentamente,\n` +
        `*El equipo de ${nombreClinica}*${sedeInfo}`;
    }

    // Formal
    return `🦷 *FELICITACIÓN DE CUMPLEAÑOS - ${nombreClinica.toUpperCase()}* 🎂\n\n` +
      `Estimado(a) paciente *${nombre}*,\n\n` +
      `Reciba un cordial y atento saludo de parte del equipo directivo y profesional de *${nombreClinica}*.\n\n` +
      `Nos complace enormemente expresarle nuestras más distinguidas felicitaciones con motivo de la celebración de su cumpleaños. Le deseamos bienestar, salud integral y continuos éxitos.\n\n` +
      `Quedamos a su entera disposición para cualquier requerimiento de su salud bucal.\n\n` +
      `Atentamente,\n` +
      `*Dirección Médica - ${nombreClinica}*${sedeInfo}`;
  };

  // Actualizar el texto del mensaje cuando cambia paciente o tipo de plantilla
  useEffect(() => {
    if (pacienteSeleccionado) {
      setMensajePersonalizado(buildMensajePorDefecto(pacienteSeleccionado, tipoPlantilla));
    }
  }, [pacienteSeleccionado, tipoPlantilla, clinicaPaciente]);

  if (!isOpen) return null;

  const handleEnviarWhatsApp = () => {
    if (!pacienteSeleccionado) return;
    const tel = cleanWhatsAppPhone(pacienteSeleccionado.telefono);
    if (!tel) {
      alert(`⚠️ El paciente ${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido} no tiene un teléfono válido registrado.`);
      return;
    }
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensajePersonalizado)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleEnviarEmail = () => {
    if (!pacienteSeleccionado || !pacienteSeleccionado.email) {
      alert(`⚠️ El paciente no tiene un correo electrónico registrado.`);
      return;
    }
    const asunto = `¡Feliz Cumpleaños ${pacienteSeleccionado.nombre}! 🎉 - ${clinicaPaciente.nombre}`;
    const mailto = `mailto:${pacienteSeleccionado.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensajePersonalizado)}`;
    window.open(mailto, '_blank');
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(mensajePersonalizado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={e => e.target === e.currentTarget && onClose()}
        style={{ zIndex: 10500 }}
      >
        <motion.div
          className="modal"
          initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 30 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          style={{ maxWidth: 860, width: '95%' }}
        >
          <div className="modal-handle" />
          
          {/* Header */}
          <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)'
              }}>
                🎂
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Felicitaciones de Cumpleaños</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Envío de saludos personalizados por WhatsApp y Correo
                </p>
              </div>
            </div>
            <button className="btn-close" onClick={onClose} type="button">✕</button>
          </div>

          <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '78vh', overflowY: 'auto' }}>
            {/* Tabs de Filtro de Cumpleañeros */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setTabFiltro('hoy')}
                className={`btn btn-sm ${tabFiltro === 'hoy' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '10px', fontWeight: 700, gap: '6px' }}
              >
                <span>🎉 Hoy</span>
                <span className="badge" style={{ background: tabFiltro === 'hoy' ? '#fff' : 'var(--primary-dim)', color: tabFiltro === 'hoy' ? 'var(--primary)' : 'inherit', padding: '2px 6px', fontSize: '0.7rem' }}>
                  {cumpleanerosHoy.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTabFiltro('semana')}
                className={`btn btn-sm ${tabFiltro === 'semana' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '10px', fontWeight: 700, gap: '6px' }}
              >
                <span>📅 Próximos 7 Días</span>
                <span className="badge" style={{ background: tabFiltro === 'semana' ? '#fff' : 'var(--primary-dim)', color: tabFiltro === 'semana' ? 'var(--primary)' : 'inherit', padding: '2px 6px', fontSize: '0.7rem' }}>
                  {cumpleanerosSemana.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTabFiltro('mes')}
                className={`btn btn-sm ${tabFiltro === 'mes' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '10px', fontWeight: 700, gap: '6px' }}
              >
                <span>🗓️ Este Mes ({NOMBRES_MESES[new Date().getMonth()]})</span>
                <span className="badge" style={{ background: tabFiltro === 'mes' ? '#fff' : 'var(--primary-dim)', color: tabFiltro === 'mes' ? 'var(--primary)' : 'inherit', padding: '2px 6px', fontSize: '0.7rem' }}>
                  {cumpleanerosMes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTabFiltro('todos')}
                className={`btn btn-sm ${tabFiltro === 'todos' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '10px', fontWeight: 700 }}
              >
                👥 Todos los Pacientes ({pacientesConCumple.length})
              </button>
            </div>

            {/* Layout en 2 columnas (o 1 en móvil): Selector de Paciente & Redactor */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', gap: '20px' }}>
              
              {/* Columna Izquierda: Lista de Cumpleañeros */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Buscar paciente..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  style={{ fontSize: '0.82rem', padding: '8px 12px' }}
                />

                <div style={{
                  maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px',
                  background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border)'
                }}>
                  {listaMostrada.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🎈</div>
                      No hay cumpleañeros registrados en este período.
                    </div>
                  ) : (
                    listaMostrada.map(({ paciente: p, info, dias, esHoy, edadCumple }) => {
                      const isSelected = pacienteSeleccionado?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setPacienteSeleccionado(p)}
                          style={{
                            padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                            background: isSelected ? 'var(--primary-dim)' : 'rgba(255,255,255,0.02)',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                            transition: '0.2s', display: 'flex', flexDirection: 'column', gap: '4px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                              {p.nombre} {p.apellido}
                            </div>
                            {esHoy ? (
                              <span className="badge" style={{ background: '#f59e0b', color: '#000', fontWeight: 900, fontSize: '0.65rem' }}>
                                ¡HOY! 🎉
                              </span>
                            ) : dias <= 7 ? (
                              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontSize: '0.65rem' }}>
                                En {dias} días
                              </span>
                            ) : null}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <span>📅 {info.dia} de {NOMBRES_MESES[info.mes]}</span>
                            <span>{edadCumple > 0 ? `Cumple ${edadCumple} años` : ''}</span>
                          </div>

                          <div style={{ fontSize: '0.7rem', color: p.telefono ? '#25D366' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>📱</span>
                            <span>{p.telefono || 'Sin teléfono'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Columna Derecha: Redactor y Personalizador del Mensaje */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {pacienteSeleccionado ? (
                  <>
                    {/* Ficha rápida del cumpleañero */}
                    <div style={{
                      padding: '12px 16px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(236, 72, 153, 0.08))',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 900, fontSize: '1rem'
                        }}>
                          {pacienteSeleccionado.nombre?.charAt(0)}{pacienteSeleccionado.apellido?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>
                            {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            C.I: {pacienteSeleccionado.cedula || 'N/A'} · Sede: {clinicaPaciente.nombreCorto || clinicaPaciente.nombre}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setTipoPlantilla('calida')}
                          className={`btn btn-sm ${tipoPlantilla === 'calida' ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                        >
                          💖 Afectuoso
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoPlantilla('cortesia')}
                          className={`btn btn-sm ${tipoPlantilla === 'cortesia' ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                        >
                          🎁 Con Regalo
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipoPlantilla('formal')}
                          className={`btn btn-sm ${tipoPlantilla === 'formal' ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                        >
                          👔 Formal
                        </button>
                      </div>
                    </div>

                    {/* Editor de Mensaje */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Mensaje Personalizado (puedes editarlo libremente):
                        </label>
                        <button
                          type="button"
                          onClick={handleCopiar}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                        >
                          {copiado ? '✅ ¡Copiado!' : '📋 Copiar'}
                        </button>
                      </div>
                      <textarea
                        className="input"
                        rows={isMobile ? 8 : 10}
                        value={mensajePersonalizado}
                        onChange={e => setMensajePersonalizado(e.target.value)}
                        style={{ width: '100%', fontSize: '0.85rem', lineHeight: 1.5, fontFamily: 'inherit' }}
                      />
                    </div>

                    {/* Botones de Envío */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={handleEnviarWhatsApp}
                        className="btn"
                        style={{
                          flex: 1, minWidth: '220px', height: '44px',
                          background: '#25D366', color: '#000', fontWeight: 900,
                          borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)'
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>📲</span>
                        <span>Enviar Felicitación por WhatsApp</span>
                      </button>

                      {pacienteSeleccionado.email && (
                        <button
                          type="button"
                          onClick={handleEnviarEmail}
                          className="btn btn-ghost"
                          style={{
                            height: '44px', minWidth: '160px',
                            border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 700,
                            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                          }}
                        >
                          <span>✉️</span>
                          <span>Enviar por Correo</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👈</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>Selecciona un paciente para personalizar su mensaje</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              🦷 ErgoDentalVE · Fidelización de Pacientes
            </span>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
