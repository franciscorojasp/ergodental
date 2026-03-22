import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinica } from '../contexts/ClinicaContext';
import { useAuth } from '../contexts/AuthContext';
import { type Clinica } from '../api';

export default function ConfiguracionClinica() {
  const { user } = useAuth();
  const { clinica, clinicas, crearClinica, updateClinica } = useClinica();
  const [editando, setEditando] = useState(false);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulario para edición de la clínica actual
  const [perfil, setPerfil] = useState<Clinica>(clinica);

  // Formulario para nueva sede
  const [nueva, setNueva] = useState({
    nombre: '', nombreCorto: '', razonSocial: '', rif: '',
    direccion: '', telefonos: [''], correos: [''], instagram: '', logoUrl: ''
  });

  const handleCrear = () => {
    if (!nueva.nombre || !nueva.nombreCorto) return alert('Nombre y Nombre Corto son obligatorios');
    crearClinica(nueva);
    setMostrarNuevo(false);
    setNueva({
      nombre: '', nombreCorto: '', razonSocial: '', rif: '',
      direccion: '', telefonos: [''], correos: [''], instagram: '', logoUrl: ''
    });
  };

  const handleSave = async () => {
    if (editando) {
      setSaving(true);
      try {
        await updateClinica(perfil);
        setEditando(false);
      } catch (err) {
        alert('Error al guardar los cambios');
      } finally {
        setSaving(false);
      }
    } else {
      setPerfil(clinica);
      setEditando(true);
    }
  };

  const esAdmin = user?.rol === 'ADMIN';

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>Configuración de Sedes</h1>
          <p>Gestiona la identidad y datos de contacto de las sedes.</p>
        </div>
        <div className="action-grid">
          {esAdmin && (
            <button onClick={() => setMostrarNuevo(true)} className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }}>+ Nueva Sede</button>
          )}
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ justifyContent: 'center' }}>
            {saving ? '...' : (editando ? '💾 Guardar' : '✏️ Editar')}
          </button>
        </div>
      </div>

      {/* Lista de Sedes (Selector rápido) */}
      <div className="filter-grid" style={{ marginBottom: '30px' }}>
        {clinicas.map(c => (
          <button key={c.id} className="btn btn-ghost btn-sm"
            style={clinica.id === c.id ? { borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--primary-dim)', justifyContent: 'center' } : { justifyContent: 'center' }}>
            {c.nombreCorto}
          </button>
        ))}
      </div>

      <div className="grid-responsive" style={{ gap: '30px', alignItems: 'start' }}>
        {/* Columna Izquierda: Logo e Identidad */}
        <section className="glass-card" style={{ padding: '30px', textAlign: 'center' }}>
          <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 24px' }}>
            <img 
              src={clinica.logoUrl || 'https://placehold.co/200x200/444/fff?text=Logo'} 
              alt="Logo Clínica" 
              style={{ width: '100%', height: '100%', borderRadius: '24px', objectFit: 'cover', border: '4px solid rgba(255,255,255,0.1)' }} 
            />
            {editando && (
              <label style={{
                position: 'absolute', bottom: '-10px', right: '-10px',
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,198,255,0.4)', fontSize: '1.2rem'
              }}>
                📷
                <input type="file" style={{ display: 'none' }} />
              </label>
            )}
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>{clinica.nombreCorto}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Sede ID: {clinica.id}</p>
          
          <div style={{ textAlign: 'left', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '4px' }}>RIF</label>
              {editando ? (
                <input type="text" value={perfil.rif || ''} onChange={e => setPerfil({...perfil, rif: e.target.value})} className="input-field" style={{ fontSize: '0.95rem' }} />
              ) : (
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{clinica.rif || 'No registrado'}</div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '4px' }}>Instagram</label>
              {editando ? (
                <input type="text" value={perfil.instagram || ''} onChange={e => setPerfil({...perfil, instagram: e.target.value})} className="input-field" style={{ fontSize: '0.95rem' }} />
              ) : (
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#E1306C' }}>{clinica.instagram || '@sin_cuenta'}</div>
              )}
            </div>
          </div>
        </section>

        {/* Columna Derecha: Detalle Completo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <section className="glass-card" style={{ padding: '30px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ opacity: 0.6 }}>🏢</span> Información Legal
            </h4>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Nombre / Razón Social</label>
              {editando ? (
                <input type="text" value={perfil.razonSocial || ''} onChange={e => setPerfil({...perfil, razonSocial: e.target.value})} className="input-field" style={{ fontSize: '1.1rem', fontWeight: 600 }} />
              ) : (
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{clinica.razonSocial || clinica.nombre}</div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Dirección Física</label>
              {editando ? (
                <textarea value={perfil.direccion || ''} onChange={e => setPerfil({...perfil, direccion: e.target.value})} className="input-field" style={{ minHeight: '80px' }} />
              ) : (
                <div style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>{clinica.direccion || 'Sin dirección registrada'}</div>
              )}
            </div>
          </section>

          <section className="glass-card" style={{ padding: '30px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ opacity: 0.6 }}>📞</span> Contacto y Comunicación
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Teléfonos</label>
                {editando ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {clinica.telefonos?.map((tel, i) => (
                      <input key={i} type="text" defaultValue={tel} className="input-field" style={{ fontSize: '0.9rem' }} />
                    ))}
                    <button className="btn-secondary" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>+ Añadir</button>
                  </div>
                ) : (
                  <>
                    {clinica.telefonos?.map((tel, i) => (
                      <div key={i} style={{ marginBottom: '4px', fontWeight: 600 }}>{tel}</div>
                    )) || <div style={{ color: 'var(--text-muted)' }}>Ninguno</div>}
                  </>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Correos Electrónicos</label>
                {editando ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {clinica.correos?.map((mail, i) => (
                      <input key={i} type="text" defaultValue={mail} className="input-field" style={{ fontSize: '0.9rem' }} />
                    ))}
                    <button className="btn-secondary" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>+ Añadir</button>
                  </div>
                ) : (
                  <>
                    {clinica.correos?.map((mail, i) => (
                      <div key={i} style={{ marginBottom: '4px', fontWeight: 600, fontSize: '0.9rem' }}>{mail}</div>
                    )) || <div style={{ color: 'var(--text-muted)' }}>Ninguno</div>}
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modal Nueva Sede */}
      <AnimatePresence>
        {mostrarNuevo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 11000,
              background: 'rgba(5, 8, 20, 0.9)',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{    scale: 0.95, opacity: 0, y: 20 }}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '24px', padding: '30px',
                width: '100%', maxWidth: '600px',
                maxHeight: '90vh', overflowY: 'auto'
              }}
            >
              <h2 style={{ marginBottom: '24px', fontWeight: 900 }}>Nueva Sede</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre Oficial</label>
                  <input type="text" className="input-field" placeholder="Ej: Clínica Dental Norte" 
                    value={nueva.nombre} onChange={e => setNueva({...nueva, nombre: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nombre Corto (Sidebar)</label>
                  <input type="text" className="input-field" placeholder="Ej: Norte"
                    value={nueva.nombreCorto} onChange={e => setNueva({...nueva, nombreCorto: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Razón Social</label>
                  <input type="text" className="input-field" placeholder="Ej: Dental Norte C.A."
                    value={nueva.razonSocial} onChange={e => setNueva({...nueva, razonSocial: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RIF</label>
                  <input type="text" className="input-field" placeholder="J-00000000-0"
                    value={nueva.rif} onChange={e => setNueva({...nueva, rif: e.target.value})} />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dirección Completa</label>
                <textarea className="input-field" style={{ minHeight: '60px' }}
                  value={nueva.direccion} onChange={e => setNueva({...nueva, direccion: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '30px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Instagram</label>
                  <input type="text" className="input-field" placeholder="@mi_clinica"
                    value={nueva.instagram} onChange={e => setNueva({...nueva, instagram: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logo (URL)</label>
                  <input type="text" className="input-field" placeholder="https://..."
                    value={nueva.logoUrl} onChange={e => setNueva({...nueva, logoUrl: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setMostrarNuevo(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleCrear}>Registrar Sede</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
