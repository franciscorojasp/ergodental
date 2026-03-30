// src/components/HelpCenter.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { generarAyudaPDF } from '../utils/reportes';

interface HelpTopic {
  id: string;
  titulo: string;
  contenido: () => React.ReactNode;
  puntos: string[]; // Resumen para PDF
  tags: string[];
}

const HELP_DATABASE: HelpTopic[] = [
  {
    id: 'general',
    titulo: 'Bienvenida a ErgoDental',
    tags: ['inicio', 'general', 'bienvenida'],
    puntos: [
      'ErgoDental es una plataforma ágil, integral y en la nube para la gestión clínica.',
      'Sedes: Puedes alternar entre distintas sucursales arriba a la izquierda. La data mostrada (Citas, Finanzas, Pacientes) corresponderá exclusivamente a la clínica en la que te encuentres.',
      'Vista Consolidada: Los perfiles administrativos pueden seleccionar "Consolidado Global" para ver métricas sumadas de todas las clínicas al mismo tiempo.',
      'Tasa BCV: Actualiza diariamente la tasa en Configuración. Así la app cotiza automáticamente todo lo que cobres en Bs.',
      'Seguridad: Todas las acciones quedan registradas en red, y los permisos varían según tu nivel (Administrador, Asistente, Odontólogo).'
    ],
    contenido: () => (
      <div className="help-content">
        <p><strong>ErgoDental</strong> es el ecosistema definitivo para el flujo de tu clínica. Hemos diseñado la interfaz para que sea predictiva y rápida de aprender.</p>
        <div className="info-box">
          <h5>🔑 Puntos clave de filosofía de uso:</h5>
          <ul>
            <li><strong>Todo ocurre en la nube:</strong> Si haces un cambio en una computadora, tus compañeros lo verán al instante.</li>
            <li><strong>Sedes Separadas pero unidas:</strong> El selector superior izquierdo dicta qué datos ves. Si estás en "Sede Sur", no verás pacientes anotados en "Sede Norte". Para ver el panorama completo, selecciona "Consolidado Global".</li>
            <li><strong>Tasa BCV:</strong> Ingresa el dólar de hoy apenas empiece el turno administrativo. ErgoDental convertirá automáticamente presupuestos y saldos pendientes.</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'configuracion',
    titulo: 'Configuración Inicial (Ajustes)',
    tags: ['configuracion', 'ajustes', 'sedes'],
    puntos: [
      'Datos Institucionales: Verifícalos para asegurar que los recibos y PDFs salgan a nombre de la clínica correcta.',
      'Gestión de Personal: Crea cuentas para tus odontólogos para poder calcular comisiones.',
      'Estructura de Precios: Configura la tasa de cambio aquí. Asegúrate que a nivel de servidor nadie la haya alterado.'
    ],
    contenido: () => (
      <div className="help-content">
        <p>El primer paso vital es revisar que el panel de Configuración tenga todo en orden:</p>
        <ol>
          <li><strong>Datos de Sede:</strong> Revisa tu Dirección, Teléfono, y RIF. Esto es lo que se incrustará en todos los PDFs (Recibos, Presupuestos) que le entregues a tus pacientes.</li>
          <li><strong>Mantenimiento de Personal:</strong> Antes de crear citas, debes tener en sistema a tus Doctores. Así podrás asignarlos como tratantes y luego, calcular su honorario.</li>
          <li><strong>Control de Tasa:</strong> En la sección Tasa BCV puedes forzar actualizar el valor manual. Esta tasa regirá conversiones visuales en el Área de Finanzas y Presupuestos.</li>
        </ol>
      </div>
    )
  },
  {
    id: 'historias',
    titulo: 'Historias Médicas e Ingreso Clínico',
    tags: ['pacientes', 'historias', 'odontograma'],
    puntos: [
      'Buscador Universal: Filtra por Cédula o Nombre. Es instantáneo.',
      'Radiografías y Archivos: Próximamente habilitado. Usa las Notas del Odontograma para documentar todo.',
      'Odontograma Interactivo: Cada pieza dental (11 al 48 infantil/adulto) puede alterarse seleccionando un estado (Caries, Implante, Corona, etc).',
      'Actualización en vivo: Cada guardado sella fecha y hora en tu registro local de la nube.'
    ],
    contenido: () => (
      <div className="help-content">
        <p>El corazón de tu clínica son tus pacientes. En el módulo de <strong>Pacientes</strong> tienes acceso al historial sin demoras.</p>
        <ul>
          <li><strong>Odontograma Interactivo:</strong> Es la herramienta más icónica. Entra a un paciente y haz click en el diente. Se desplegará un menú radial o de lista para seleccionar la afección o tratamiento. Al guardar, quedará reflejado en la Historia Clínica.</li>
          <li><strong>Datos Personales:</strong> Completa siempre Fecha de Nacimiento (para recordatorios), y Condiciones Sistémicas Críticas. Verás banderas de alerta si es alérgico o de riesgo.</li>
          <li><strong>Presupuestos:</strong> En la vista del paciente, puedes enlazar presupuestos directamente a lo que arrojó el odontograma.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'finanzas',
    titulo: 'Caja, Ingresos y Egresos',
    tags: ['finanzas', 'pagos', 'bolivares', 'dolares'],
    puntos: [
      'Sistema Multimoneda: Montos base en dólares (generalmente) y el sistema calculará equivalencias en Bolívares al momento.',
      'Generación de Recibos: Al registrar un pago a favor de un tratamiento, puedes exportarlo inmediatamente en PDF con el botón correspondiente.',
      'Honorarios (Comisiones): Al anotar quién fue el Doctor en una intervención y el "Tipo de Referencia", el Dashboard cruza la regla (ej. 70/30) y destina lo correspondiente a Honorarios por Pagar al Doctor.',
      'Egresos: No dediques la clínica solo a registrar ingresos. Anota compras de materiales, nómina, etc. Para ver ganancias Netas operativas.'
    ],
    contenido: () => (
      <div className="help-content">
        <p>El libro de control contable sin la complicación contable.</p>
        <ul>
          <li><strong>Dólares o Bolívares:</strong> Al reportar ingresos de pacientes, el sistema asume montos fijos en USD pero recibe pagos en Punto Venta (Bs). El campo <em>Cobro en Bs</em> te mostrará la conversión exacta automática.</li>
          <li><strong>Cálculo de Comisiones a Doctores:</strong> El éxito del sistema recae en los porcentajes pre-acordados. Al cobrarle a un paciente 100$, si el doctor está al 60%, verás 60$ acumulándose en la sección "Doctores".</li>
          <li><strong>Reportes Trimestrales:</strong> En Finanzas, filtra por mes o trimestre y genera un Reporte Financiero completo con un click para mostrárselo a gerencia o socios.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'documentos',
    titulo: 'Impresión y Envío de PDFs',
    tags: ['pdf', 'recibos', 'impresion'],
    puntos: [
      'Todo lo que haces, es Exportable: Presupuestos, Recibos de Pago, y Resumen Financiero.',
      'Documentos Únicos: Todo PDF exportado tiene un N° DOC-000XXX para trazabilidad legal y administrativa dentro de la empresa.',
      'Configuración: El PDF saldrá con la información real de la Sede desde donde lo mandas a hacer.'
    ],
    contenido: () => (
      <div className="help-content">
        <p>Mantén la elegancia con todos tus pacientes.</p>
        <ul>
          <li><strong>¿Qué puedes exportar?</strong> Puedes descargar en PDF el Odontograma (próximamente), los Recibos de pago cuando un paciente abona, y los Presupuestos con desglose de ítems.</li>
          <li><strong>Envío por WhatsApp:</strong> Aunque el botón actual descarga localmente el PDF, puedes compartir el archivo recién bajado directamente por WhatsApp en tu equipo o celular de la clínica, dando un toque muy moderno de atención al usuario.</li>
        </ul>
      </div>
    )
  }
];

export default function HelpCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTopic, setActiveTopic] = useState<HelpTopic | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Sugerir tema según la ruta actual
  useEffect(() => {
    const path = location.pathname.split('/')[1];
    const suggested = HELP_DATABASE.find(t => t.tags.includes(path)) || HELP_DATABASE[0];
    setActiveTopic(suggested);
  }, [location]);

  // Listener para apertura externa
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-help', handleOpen);
    return () => window.removeEventListener('open-help', handleOpen);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [isOpen]);

  const handleDownloadPDF = async () => {
    if (!activeTopic) return;
    setIsGenerating(true);
    try {
      await generarAyudaPDF({
        titulo: activeTopic.titulo,
        puntos: activeTopic.puntos
      }, user?.nombre);
    } catch (e) {
      alert('Hubo un error al generar la ayuda: ' + e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAllPDF = async () => {
    setIsGenerating(true);
    try {
      // Combinar todos los temas
      const puntosCombinados = HELP_DATABASE.map(
        t => `[${t.titulo.toUpperCase()}] ${t.puntos.join(' · ')}`
      );
      
      await generarAyudaPDF({
        titulo: 'Manual Completo de Usuario ErgoDental',
        puntos: puntosCombinados
      }, user?.nombre);
    } catch (e) {
      alert('Hubo un error al generar la ayuda total: ' + e);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredTopics = HELP_DATABASE.filter(t => 
    t.titulo.toLowerCase().includes(search.toLowerCase()) || 
    t.tags.some(tag => tag.includes(search.toLowerCase()))
  );

  return (
    <>
      {/* Botón Flotante */}
      <motion.button 
        className="help-fab"
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        title="Centro de Ayuda"
      >
        {isOpen ? '✕' : '?'}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="help-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
          >
            <div className="help-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>📖 Centro de Ayuda Asistida</h3>
                <button 
                  className="btn-help-close" 
                  onClick={() => setIsOpen(false)}
                  style={{ background:'none', border:'none', color:'#fff', opacity:0.6, fontSize:'1.4rem', cursor:'pointer' }}
                >✕</button>
              </div>
              <input 
                type="text" 
                placeholder="Busca por duda, ej: 'Pdf', 'Citas' o 'Dólares'..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="help-search"
              />
            </div>

            <div className="help-body">
              <div className={`help-sidebar-items ${activeTopic ? 'mobile-hide' : ''}`}>
                {filteredTopics.map(topic => (
                  <button 
                    key={topic.id}
                    type="button"
                    className={`help-nav-item ${activeTopic?.id === topic.id ? 'active' : ''}`}
                    onClick={() => setActiveTopic(topic)}
                  >
                    {topic.titulo}
                  </button>
                ))}
              </div>

              <div className={`help-main-content ${!activeTopic ? 'mobile-hide' : ''}`}>
                {activeTopic ? (
                  <div key={activeTopic.id} className="topic-container">
                    <button type="button" className="mobile-only help-back-btn" onClick={() => setActiveTopic(null)}>← Volver a la lista</button>
                    <h4>{activeTopic.titulo}</h4>
                    {activeTopic.contenido()}
                  </div>
                ) : (
                  <p className="no-results">Busca un término arriba para encontrar respuestas.</p>
                )}
              </div>
            </div>

            <div className="help-footer">
              <span>Módulo V2.1 - Sistema Guía Online</span>
              <div style={{ display:'flex', gap:'12px', alignItems:'center'}}>
                {activeTopic && (
                  <button type="button" className="btn-link" disabled={isGenerating} onClick={handleDownloadPDF}>
                    ↓ Tema Actual
                  </button>
                )}
                <button type="button" className="btn-link" disabled={isGenerating} onClick={handleDownloadAllPDF}>
                  ⬇️ Todo el Manual
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .help-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #00c6ff;
          color: white;
          border: none;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          cursor: pointer;
          font-size: 1.5rem;
          font-weight: bold;
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .help-panel {
          position: fixed;
          bottom: 90px;
          right: 24px;
          width: 600px;
          max-width: calc(100vw - 48px);
          height: 500px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
          z-index: 10001;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: white;
        }

        .help-header {
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.03);
        }

        .help-header h3 { margin: 0 0 12px 0; font-size: 1.1rem; }

        .help-search {
          width: 100%;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.2);
          color: white;
          font-size: 0.9rem;
        }

        .help-body {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .help-sidebar-items {
          width: 180px;
          border-right: 1px solid rgba(255,255,255,0.1);
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .help-nav-item {
          text-align: left;
          padding: 10px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 0.85rem;
          cursor: pointer;
          transition: 0.2s;
        }

        .help-nav-item:hover { background: rgba(255,255,255,0.05); color: white; }
        .help-nav-item.active { background: #00c6ff; color: white; }

        .help-back-btn {
          background: none;
          border: none;
          color: #00c6ff;
          padding: 0;
          margin-bottom: 12px;
          font-size: 0.85rem;
          cursor: pointer;
          display: none;
        }

        .help-main-content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          line-height: 1.6;
        }

        .help-main-content h4 { margin: 0 0 16px 0; color: #00c6ff; font-size: 1.25rem; }
        .info-box {
          background: rgba(0, 198, 255, 0.1);
          border-left: 4px solid #00c6ff;
          padding: 12px;
          margin: 12px 0;
          border-radius: 4px;
        }
        .info-box h5 { margin: 0 0 8px; color: #fff; font-size: 0.95rem; }
        
        .help-content ul, .help-content ol { padding-left: 20px; }
        .help-content li { margin-bottom: 8px; font-size: 0.9rem; color: #94a3b8; }
        .help-content li strong { color: white; display: inline-block; margin-bottom: 3px; }
        .help-content p { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; }

        .help-footer {
          padding: 12px 20px;
          border-top: 1px solid rgba(255,255,255,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: #64748b;
        }

        .btn-link {
          background: none;
          border: none;
          color: #00c6ff;
          cursor: pointer;
          font-size: 0.75rem;
          text-decoration: underline;
          opacity: 0.9;
          transition: 0.2s;
        }
        .btn-link:hover { opacity: 1; color: #fff; }
        .btn-link:disabled { opacity: 0.4; cursor: not-allowed; text-decoration: none; }

          @media (max-width: 768px) {
            .help-fab { display: none !important; }
            .mobile-hide { display: none !important; }
            .help-sidebar-items { width: 100%; border-right: none; }
            .help-panel { height: 450px; }
            .help-back-btn { display: block; }
          }
      `}</style>
    </>
  );
}
