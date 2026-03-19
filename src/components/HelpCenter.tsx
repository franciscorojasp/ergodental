// src/components/HelpCenter.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface HelpTopic {
  id: string;
  titulo: string;
  contenido: React.ReactNode;
  tags: string[];
}

const HELP_DATABASE: HelpTopic[] = [
  {
    id: 'general',
    titulo: 'Bienvenida a ErgoDental',
    tags: ['inicio', 'general', 'bienvenida'],
    contenido: (
      <div className="help-content">
        <p><strong>ergodental</strong> es una plataforma integral para la gestión de clínicas odontológicas multi-sede.</p>
        <ul>
          <li><strong>Sedes:</strong> Cambia de sede desde el menú lateral superior. Cada sede tiene sus propios pacientes y finanzas.</li>
          <li><strong>Tasa BCV:</strong> Debe ingresarse al inicio del día. Si ya fue ingresada por otro colega, el sistema te lo notificará.</li>
          <li><strong>Sincronización:</strong> Los datos se guardan en tiempo real en Google Sheets.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'configuracion',
    titulo: 'Configuración Inicial',
    tags: ['configuracion', 'ajustes', 'sedes'],
    contenido: (
      <div className="help-content">
        <p>Pasos sugeridos para nuevos usuarios administradores:</p>
        <ol>
          <li><strong>Datos de la Clínica:</strong> Verifica RIF, dirección y teléfonos en el apartado de Configuración.</li>
          <li><strong>Personal:</strong> Registra a tus doctores y asistentes asignando sus respectivos roles.</li>
          <li><strong>Inventario:</strong> Carga tus insumos iniciales y define niveles de alerta (Stock Mínimo).</li>
        </ol>
      </div>
    )
  },
  {
    id: 'dashboard',
    titulo: 'Panel de Control (Dashboard)',
    tags: ['dashboard', 'resumen', 'estadisticas'],
    contenido: (
      <div className="help-content">
        <p>Tu centro de mando diario.</p>
        <ul>
          <li><strong>Citas de Hoy:</strong> Listado cronológico de pacientes esperados.</li>
          <li><strong>Ingresos Mensuales:</strong> Resumen de recaudación en la moneda activa.</li>
          <li><strong>Botonera Rápida:</strong> Accesos directos para tareas frecuentes como registrar un nuevo paciente.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'citas',
    titulo: 'Agenda y Notificaciones',
    tags: ['citas', 'agenda', 'whatsapp'],
    contenido: (
      <div className="help-content">
        <p>Gestiona citas y reduce el ausentismo con recordatorios automáticos.</p>
        <ul>
          <li><strong>Creación:</strong> Vincula pacientes existentes. Si es nuevo, regístralo primero en "Pacientes".</li>
          <li><strong>WhatsApp:</strong> Al guardar, se genera un enlace <code>wa.me</code> con un mensaje personalizado.</li>
          <li><strong>Auditoría de Citas:</strong> Revisa el estado (Pendiente, Confirmada, Completada) para mantener el orden.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'pacientes',
    titulo: 'Historias Médicas',
    tags: ['pacientes', 'historias', 'odontograma'],
    contenido: (
      <div className="help-content">
        <p>El núcleo de la atención clínica.</p>
        <ul>
          <li><strong>Buscador:</strong> Localiza pacientes por Cédula o Nombre.</li>
          <li><strong>Odontograma Interactivo:</strong> Haz clic en cada pieza para marcar caries, implantes o coronas.</li>
          <li><strong>Historial de Visitas:</strong> Revisa citas pasadas y tratamientos realizados.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'finanzas',
    titulo: 'Caja y Transacciones',
    tags: ['finanzas', 'pagos', 'bolivares', 'dolares'],
    contenido: (
      <div className="help-content">
        <p>Control exacto del flujo de caja multi-moneda.</p>
        <ul>
          <li><strong>Registrar Pago:</strong> Introduce el monto y el sistema calculará el equivalente en Bs según la tasa activa.</li>
          <li><strong>Método de Pago:</strong> Soporta Pago Móvil (banco/referencia), Zelle, Efectivo y más.</li>
          <li><strong>Egresos:</strong> No olvides registrar pagos a proveedores o nómina para tener un balance neto real.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'inventario',
    titulo: 'Control de Inventario',
    tags: ['inventario', 'insumos', 'stock'],
    contenido: (
      <div className="help-content">
        <p>Evita quedarte sin materiales críticos.</p>
        <ul>
          <li><strong>Stock Mínimo:</strong> Aparecerá una alerta visual si el inventario cae por debajo de este límite.</li>
          <li><strong>Proveedores:</strong> Vincula tus compras a proveedores específicos para histórico de costos.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'faq',
    titulo: 'Preguntas Frecuentes',
    tags: ['faq', 'dudas', 'errores'],
    contenido: (
      <div className="help-content">
        <p><strong>¿Cómo cambio la tasa si me equivoqué?</strong> Solo un Administrador puede actualizar la tasa desde "Configuración" o el Dashboard.</p>
        <p><strong>¿Puedo usar la app sin internet?</strong> No, se requiere conexión para sincronizar los datos con Google Sheets.</p>
        <p><strong>¿Por qué no veo a todos los pacientes?</strong> Asegúrate de que estás en la Sede correcta. Los pacientes se filtran por clínica por defecto.</p>
      </div>
    )
  }
];

export default function HelpCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTopic, setActiveTopic] = useState<HelpTopic | null>(null);
  const location = useLocation();

  // Sugerir tema según la ruta actual
  useEffect(() => {
    const path = location.pathname.split('/')[1];
    const suggested = HELP_DATABASE.find(t => t.tags.includes(path)) || HELP_DATABASE[0];
    setActiveTopic(suggested);
  }, [location]);

  const filteredTopics = HELP_DATABASE.filter(t => 
    t.titulo.toLowerCase().includes(search.toLowerCase()) || 
    t.tags.some(tag => tag.includes(search.toLowerCase()))
  );

  return (
    <>
      {/* Botón Flotante */}
      <motion.button 
        className="help-fab"
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
              <h3>📖 Centro de Ayuda</h3>
              <input 
                type="text" 
                placeholder="¿En qué podemos ayudarte?" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="help-search"
              />
            </div>

            <div className="help-body">
              <div className="help-sidebar-items">
                {filteredTopics.map(topic => (
                  <button 
                    key={topic.id}
                    className={`help-nav-item ${activeTopic?.id === topic.id ? 'active' : ''}`}
                    onClick={() => setActiveTopic(topic)}
                  >
                    {topic.titulo}
                  </button>
                ))}
              </div>

              <div className="help-main-content">
                {activeTopic ? (
                  <>
                    <h4>{activeTopic.titulo}</h4>
                    {activeTopic.contenido}
                  </>
                ) : (
                  <p className="no-results">No se encontraron temas de ayuda.</p>
                )}
              </div>
            </div>

            <div className="help-footer">
              <span>Versión 2.0.4 - ErgoDental</span>
              <button className="btn-link" onClick={() => window.print()}>Imprimir Guía</button>
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

        .help-main-content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          line-height: 1.6;
        }

        .help-main-content h4 { margin: 0 0 16px 0; color: #00c6ff; }
        .help-content ul { padding-left: 20px; }
        .help-content li { margin-bottom: 8px; font-size: 0.9rem; color: #94a3b8; }
        .help-content li strong { color: white; }

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
        }

        @media (max-width: 600px) {
          .help-sidebar-items { display: none; }
          .help-panel { height: 400px; }
        }
      `}</style>
    </>
  );
}
