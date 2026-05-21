import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { generarManualPDF } from '../utils/reportes';

interface HelpTopic {
  id: string;
  titulo: string;
  contenido: () => React.ReactNode;
  puntos: string[]; // Resumen para PDF usando sintaxis básica markdown (#, ##, *)
  tags: string[];
}

const HELP_DATABASE: HelpTopic[] = [
  {
    id: 'general',
    titulo: '1. Introducción y Acceso al Sistema',
    tags: ['inicio', 'general', 'bienvenida', 'erp'],
    puntos: [
      '# 1. Inicio de Sesión y Navegación Básica',
      'Bienvenido al Manual de Operaciones de ErgoDentalve. Esta guía paso a paso le enseñará cómo utilizar cada módulo de la aplicación correctamente.',
      '## 1.1. Cómo Iniciar Sesión',
      '* Paso 1: Ingrese su correo electrónico corporativo y su contraseña en la pantalla de inicio.',
      '* Paso 2: Presione el botón "Ingresar". Si olvidó su contraseña, contacte a su administrador de sistema.',
      '* Paso 3: Una vez dentro, observe el selector de "Sede" en la esquina superior izquierda. Asegúrese de seleccionar la clínica en la que se encuentra trabajando actualmente. Toda la información que ingrese se guardará en esa sede específica.',
      '## 1.2. El Menú de Navegación',
      '* En el panel izquierdo encontrará los botones para acceder a los distintos módulos (Pacientes, Agenda, Finanzas, etc.).',
      '* Paso 1: Haga clic en cualquier icono del menú para cambiar de módulo.',
      '* Paso 2: Si desea reducir la fatiga visual, busque el botón "Tema" (ícono de luna/sol) al final del menú izquierdo para activar el Modo Oscuro.',
      '* Paso 3: Al finalizar su turno, siempre haga clic en "Cerrar Sesión" en la esquina inferior izquierda para proteger los datos de la clínica.'
    ],
    contenido: () => (
      <div className="help-content">
        <p><strong>Guía de Inicio:</strong> Aprenda a navegar por el sistema y asegurar su sesión de trabajo.</p>
        <div className="info-box">
          <h5>🔑 Regla de Oro:</h5>
          <ul>
            <li>Verifique siempre que la <strong>Sede Activa</strong> en la esquina superior izquierda corresponda a su lugar físico de trabajo actual. Todos los registros que haga (pacientes, cobros) se asignarán a esa sede.</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'pacientes',
    titulo: '2. Gestión de Pacientes y Odontograma',
    tags: ['pacientes', 'historias', 'odontograma', 'citas'],
    puntos: [
      '# 2. Cómo Registrar y Atender a un Paciente',
      'Este proceso es crítico. Un error en el registro puede afectar el historial médico.',
      '## 2.1. Crear un Nuevo Paciente',
      '* Paso 1: Diríjase al módulo "Pacientes" en el menú izquierdo.',
      '* Paso 2: Haga clic en el botón azul "+ Nuevo Paciente" en la esquina superior derecha.',
      '* Paso 3: Llene obligatoriamente el número de Cédula, Nombre Completo, Fecha de Nacimiento y Teléfono. Sin estos datos no podrá guardar.',
      '* Paso 4: Haga clic en el botón verde "Guardar". El paciente aparecerá ahora en la lista principal.',
      '## 2.2. Llenar la Anamnesis (Historial Médico)',
      '* Paso 1: Busque al paciente en la lista y haga clic en su nombre para abrir su perfil.',
      '* Paso 2: Vaya a la pestaña "Anamnesis" o "Antecedentes".',
      '* Paso 3: Marque las casillas correspondientes si el paciente sufre de alergias, hipertensión, diabetes, etc.',
      '* Paso 4: Escriba detalles adicionales en el cuadro de texto y presione "Guardar Antecedentes".',
      '## 2.3. Cómo usar el Odontograma',
      '* Paso 1: Dentro del perfil del paciente, haga clic en la pestaña "Odontograma".',
      '* Paso 2: Verá una representación gráfica de los dientes. Haga clic izquierdo sobre el diente específico que desea diagnosticar o tratar.',
      '* Paso 3: Se abrirá un pequeño menú. Seleccione el estado (ej. "Caries", "Implante", "Endodoncia").',
      '* Paso 4: El diente cambiará de color según el estado seleccionado (ej. rojo para caries, azul para tratamientos realizados).',
      '* Paso 5: IMPORTANTE: Una vez termine de actualizar los dientes, DEBE hacer clic en el botón azul "Guardar Odontograma" en la parte inferior.'
    ],
    contenido: () => (
      <div className="help-content">
        <p>Tutorial paso a paso para el registro clínico. Siga las instrucciones cuidadosamente.</p>
        <ol>
          <li>Nunca cree un paciente sin antes buscar su Cédula en la barra de búsqueda superior para evitar duplicados.</li>
          <li>El odontograma debe guardarse manualmente presionando el botón de guardar.</li>
        </ol>
      </div>
    )
  },
  {
    id: 'agenda',
    titulo: '3. Manejo de la Agenda y Citas',
    tags: ['agenda', 'calendario', 'citas'],
    puntos: [
      '# 3. Cómo Agendar y Confirmar Citas',
      'La agenda visualiza el flujo de trabajo diario de los doctores.',
      '## 3.1. Crear una Cita Nueva',
      '* Paso 1: Vaya al módulo "Agenda" en el panel izquierdo.',
      '* Paso 2: Haga clic en el día y hora exactos en el calendario visual donde desea colocar la cita.',
      '* Paso 3: Se abrirá un formulario. En el buscador "Paciente", escriba el nombre o cédula del paciente y selecciónelo de la lista.',
      '* Paso 4: Seleccione al Odontólogo tratante en el menú desplegable.',
      '* Paso 5: Escriba el motivo de la consulta y haga clic en "Agendar".',
      '## 3.2. Cambiar el Estado de una Cita (Flujo de Recepción)',
      '* Paso 1: Cuando el paciente llegue a la clínica, haga clic sobre su cita en el calendario.',
      '* Paso 2: Cambie el "Estado" de "Programada" a "En Sala". El color de la cita cambiará para notificar al doctor.',
      '* Paso 3: Una vez el doctor termine de atenderlo, vuelva a abrir la cita y cambie el estado a "Atendida".',
      '* Paso 4: Si el paciente falta, cámbielo a "Cancelada".'
    ],
    contenido: () => (
      <div className="help-content">
        <p>Administración del calendario. Mantener los estados de las citas actualizados es vital para calcular tiempos de espera.</p>
      </div>
    )
  },
  {
    id: 'finanzas',
    titulo: '4. Cobros y Financiamiento',
    tags: ['finanzas', 'pagos', 'bolivares', 'dolares', 'facturacion'],
    puntos: [
      '# 4. Cómo Registrar Pagos y Egresos',
      'El módulo financiero calcula automáticamente la conversión entre Dólares y Bolívares usando la tasa BCV oficial del día.',
      '## 4.1. Registrar un Cobro a un Paciente',
      '* Paso 1: Diríjase al módulo "Finanzas" y seleccione la pestaña "Ingresos".',
      '* Paso 2: Haga clic en el botón verde "+ Nuevo Ingreso".',
      '* Paso 3: Busque y seleccione al Paciente que está pagando.',
      '* Paso 4: Ingrese el monto en Dólares (USD). Verá que el sistema calcula automáticamente el equivalente en Bolívares (Bs) en la casilla de al lado.',
      '* Paso 5: Seleccione el Método de Pago (Zelle, Pago Móvil, Punto de Venta, Efectivo, etc.).',
      '* Paso 6: Si el pago es por transferencia o punto, escriba obligatoriamente el Número de Referencia y el Banco.',
      '* Paso 7: Describa el tratamiento cobrado (ej. "Limpieza Dental Simple") y presione "Guardar".',
      '## 4.2. Cuentas por Cobrar (Créditos)',
      '* Paso 1: Si un paciente no paga el monto completo, vaya al módulo Finanzas > Pestaña "Créditos".',
      '* Paso 2: Agregue un nuevo crédito vinculando al paciente, ingresando el monto adeudado y fijando una fecha límite de pago.',
      '* Paso 3: Cuando el paciente regrese a abonar, busque su registro de crédito y seleccione "Registrar Abono".',
      '## 4.3. Cierre de Caja Diario',
      '* Paso 1: Al final del día, los administradores deben ir a Finanzas > "Cierre Diario".',
      '* Paso 2: Seleccione la fecha de hoy y presione "Generar Cierre PDF".',
      '* Paso 3: Imprima o guarde el PDF generado para cotejar los totales con los vouchers del punto de venta y transferencias bancarias recibidas.'
    ],
    contenido: () => (
      <div className="help-content">
        <p>Instrucciones detalladas de manejo de dinero. Los errores de digitación aquí afectan los reportes contables.</p>
        <ul>
          <li><strong>Tasa Automática:</strong> No intente calcular los bolívares manualmente. Solo escriba los dólares y deje que el sistema aplique la tasa BCV del día.</li>
          <li><strong>Referencias:</strong> Todo pago digital exige su número de confirmación.</li>
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
      await generarManualPDF({
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
      let puntosCombinados: string[] = ['# MANUAL DE USUARIO OFICIAL - ERGODENTALVE', 'Este documento contiene las especificaciones operativas y de procesos estandarizados para el uso del ERP.'];
      HELP_DATABASE.forEach(t => {
        puntosCombinados = [...puntosCombinados, ...t.puntos];
      });
      
      await generarManualPDF({
        titulo: 'Manual de Usuario Integral',
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
