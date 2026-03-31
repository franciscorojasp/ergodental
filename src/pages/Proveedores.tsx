// src/pages/Proveedores.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProveedores, createProveedor, type Proveedor } from '../api';
import { useClinica } from '../contexts/ClinicaContext';

const TIPOS: Proveedor['tipo'][] = ['Clínica','Casa Médica','Farmacia','Botica','Laboratorio','Otro'];

const TIPO_ICON: Record<Proveedor['tipo'], string> = {
  'Clínica':'🏥','Casa Médica':'🏨','Farmacia':'💊','Botica':'🧪','Laboratorio':'🔬','Otro':'🏢',
};
const TIPO_BADGE: Record<Proveedor['tipo'], string> = {
  'Clínica':'badge-doctor','Casa Médica':'badge-admin','Farmacia':'badge-success',
  'Botica':'badge-asistente','Laboratorio':'badge-recepcion','Otro':'badge-muted',
};

export default function Proveedores() {
  const { clinica } = useClinica();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [modal, setModal] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isMobile] = useState(window.innerWidth < 768);
  const [form, setForm] = useState<Omit<Proveedor,'id'>>({
    clinicaId: clinica.id,
    nombre:'', tipo:'Farmacia', rif:'', telefono:'', email:'', contacto:'', direccion:'', activo:true,
  });

  useEffect(() => { 
    getProveedores().then(data => setProveedores(data.filter(p => clinica.id === 'consolidado' || p.clinicaId === clinica.id))); 
  }, [clinica.id]);

  const tipos = ['Todos', ...TIPOS];
  const filtrado = proveedores.filter(p => {
    const matchBusqueda = `${p.nombre} ${p.contacto} ${p.rif}`.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === 'Todos' || p.tipo === filtroTipo;
    return matchBusqueda && matchTipo;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const nuevo = await createProveedor(form);
      setProveedores(prev => [nuevo, ...prev]);
      setModal(false);
      setForm({ clinicaId: clinica.id, nombre:'', tipo:'Farmacia', rif:'', telefono:'', email:'', contacto:'', direccion:'', activo:true });
    } finally { setSaving(false); }
  };

  const detalle = proveedores.find(p => p.id === detalleId);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header condensed">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className="is-mobile-inline">Proveedores</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '-4px' }}>Gestión de aliados comerciales y suministros</p>
        </div>
        <div className="action-grid">
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Nuevo Proveedor</button>
        </div>
      </div>

      <div className="filter-glass" style={{ marginBottom: '24px' }}>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="input" placeholder="Buscar por nombre, RIF o contacto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '-8px', paddingLeft: '8px' }}>
          Tipo de Proveedor
        </div>
        <div className="filter-grid" style={{ background: 'rgba(255,255,255,0.02)', padding: '4px' }}>
          {tipos.map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} 
              className={`btn btn-sm ${filtroTipo === t ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '10px', minWidth: '110px' }}>
              {t !== 'Todos' ? <span style={{ marginRight: '6px' }}>{TIPO_ICON[t as Proveedor['tipo']]}</span> : ''} {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <motion.div className="glass overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="table-wrap">
          <table className="table-fixed">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Proveedor</th>
                <th className="hide-mobile" style={{ width: '22%' }}>Información Legal</th>
                <th className="hide-mobile" style={{ width: '22%' }}>Contacto Principal</th>
                <th style={{ width: '16%' }}>Teléfono</th>
                <th className="text-center" style={{ width: '10%' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrado.map((p, i) => (
                <motion.tr 
                  key={p.id} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: i * 0.02 }}
                  style={{ cursor: 'pointer' }} 
                  onClick={() => setDetalleId(p.id)}
                >
                  <td className="col-expand" data-main="true">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: '14px', 
                        background: 'linear-gradient(135deg, var(--accent), var(--primary))',
                        border: '1px solid var(--border-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}>
                        {TIPO_ICON[p.tipo]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.3px' }}>{p.nombre}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {p.tipo.toUpperCase()} <span style={{ opacity: 0.5, margin: '0 4px' }}>•</span> Registrado
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hide-mobile">
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.rif || 'N/A'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RIF Comercial</div>
                  </td>
                  <td className="hide-mobile">
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.contacto || 'Sin contacto'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.email || 'Sin correo'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.telefono || '—'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Móvil / Red</div>
                  </td>
                  <td className="text-center">
                    <span className={`badge ${p.activo ? 'badge-success' : 'badge-muted'}`} style={{ padding: '4px 12px', minWidth: '90px', justifyContent: 'center' }}>
                      {p.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {filtrado.length === 0 && (
                <tr><td colSpan={5} className="table-empty">Sin proveedores para este filtro</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal detalle */}
      <AnimatePresence>
        {detalle && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e => e.target===e.currentTarget && setDetalleId(null)}>
            <motion.div className="modal" 
              initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            >
              <div className="modal-handle" />
              <div className="modal-header">
                <h3>{TIPO_ICON[detalle.tipo]} {detalle.nombre}</h3>
                <button className="btn-close" onClick={()=>setDetalleId(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ display:'flex', gap:'10px', marginBottom:'8px', flexWrap:'wrap' }}>
                  <span className={`badge ${TIPO_BADGE[detalle.tipo]}`}>{detalle.tipo}</span>
                  <span className={`badge ${detalle.activo?'badge-success':'badge-muted'}`}>{detalle.activo?'Activo':'Inactivo'}</span>
                </div>
                {[
                  ['📋 RIF', detalle.rif],
                  ['👤 Contacto', detalle.contacto],
                  ['📞 Teléfono', detalle.telefono],
                  ['✉️ Email', detalle.email],
                  ['📍 Dirección', detalle.direccion],
                ].map(([label, value]) => (
                  <div key={label as string} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'2px' }}>{label}</div>
                    <div style={{ fontSize:'0.9rem', fontWeight:500 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={()=>setDetalleId(null)}>Cerrar</button>
                <a className="btn btn-primary" href={`mailto:${detalle.email}`}>✉️ Enviar email</a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal nuevo proveedor */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&setModal(false)}>
            <motion.div className="modal" 
              initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 40 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            >
              <div className="modal-handle" />
              <div className="modal-header">
                <h3>🏢 Nuevo Proveedor</h3>
                <button className="btn-close" onClick={()=>setModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Nombre *</label>
                      <input className="input" required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} />
                    </div>
                    <div className="input-group">
                      <label>Tipo *</label>
                      <select className="input" value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value as Proveedor['tipo']}))}>
                        {TIPOS.map(t=><option key={t} value={t}>{TIPO_ICON[t]} {t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>RIF</label>
                      <input className="input" placeholder="J-12345678-0" value={form.rif} onChange={e=>setForm(f=>({...f,rif:e.target.value}))} />
                    </div>
                    <div className="input-group">
                      <label>Persona de contacto</label>
                      <input className="input" value={form.contacto} onChange={e=>setForm(f=>({...f,contacto:e.target.value}))} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Teléfono</label>
                      <input className="input" placeholder="0212-1234567" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} />
                    </div>
                    <div className="input-group">
                      <label>Email</label>
                      <input className="input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Dirección</label>
                    <input className="input" value={form.direccion} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))} />
                  </div>
                  <div className="input-group" style={{ flexDirection:'row', alignItems:'center', gap:'10px' }}>
                    <input type="checkbox" id="pActivo" checked={form.activo} onChange={e=>setForm(f=>({...f,activo:e.target.checked}))} style={{ width:16, height:16 }} />
                    <label htmlFor="pActivo" style={{ textTransform:'none', letterSpacing:0, fontSize:'0.9rem', color:'var(--text-primary)' }}>Proveedor activo</label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Guardando...':'Guardar'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
