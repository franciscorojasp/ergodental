import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getInventario, createItemInventario, type ItemInventario } from '../api';
import { useMoneda } from '../contexts/MonedaContext';
import { useClinica } from '../contexts/ClinicaContext';

export default function Inventario() {
  const { clinica } = useClinica();
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState(false);
  const { fmt, moneda } = useMoneda();

  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ 
    clinicaId: clinica.id, nombre: '', categoria: 'Materiales', unidad: 'Unidad', 
    stock: 0, stockMinimo: 5, precio: 0 
  });

  useEffect(() => { 
    getInventario().then(data => setItems(data.filter(i => clinica.id === 'consolidado' || i.clinicaId === clinica.id))); 
  }, [clinica.id]);

  const filtrados = items.filter(i => {
    const matchBusqueda = `${i.nombre} ${i.categoria}`.toLowerCase().includes(busqueda.toLowerCase());
    const matchAlerta = !filtroAlerta || i.stock <= i.stockMinimo;
    return matchBusqueda && matchAlerta;
  });

  const bajoStock = items.filter(i => i.stock <= i.stockMinimo).length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const nuevo = await createItemInventario(form);
      setItems(prev => [nuevo, ...prev]);
      setModal(false);
      setForm({ clinicaId: clinica.id, nombre: '', categoria: 'Materiales', unidad: 'Unidad', stock: 0, stockMinimo: 5, precio: 0 });
    } finally {
      setSaving(false);
    }
  };

  const stockColor = (item: ItemInventario) => {
    if (item.stock === 0) return 'var(--danger)';
    if (item.stock <= item.stockMinimo) return 'var(--warning)';
    return 'var(--success)';
  };

  const stockBadge = (item: ItemInventario) => {
    if (item.stock === 0) return { label: 'Sin stock', cls: 'badge-danger' };
    if (item.stock <= item.stockMinimo) return { label: 'Stock bajo', cls: 'badge-warning' };
    return { label: 'OK', cls: 'badge-success' };
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header condensed">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className="is-mobile-inline">Inventario & Stock</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '-4px' }}>Control de suministros y materiales clínicos</p>
        </div>
        <div className="action-grid">
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Nuevo Producto</button>
        </div>
      </div>

      {bajoStock > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ 
            background: 'rgba(239, 68, 68, 0.05)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: '16px', padding: '12px 20px', marginBottom: '24px', 
            display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--danger)', 
            fontSize: '0.82rem', fontWeight: 600,
            backdropFilter: 'blur(10px)'
          }}>
          <span style={{ fontSize: '1.2rem' }}>🚨</span>
          <span><strong>Alerta de Reabastecimiento:</strong> Hay {bajoStock} artículos con stock crítico. Se recomienda generar orden de compra.</span>
        </motion.div>
      )}

      <div className="filter-glass" style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', padding: '12px' }}>
        <div className="search-wrap" style={{ flex: 1, margin: 0 }}>
          <span className="search-icon">🔍</span>
          <input className="input" placeholder="Buscar por nombre o categoría..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <button className={`btn ${filtroAlerta ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFiltroAlerta(!filtroAlerta)}
          style={{ borderRadius: '12px', minWidth:'140px', fontWeight: 700 }}>
          {filtroAlerta ? 'Ver Todo' : '⚠️ Ver Alertas'}
        </button>
      </div>

      <motion.div className="glass overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="table-wrap">
          <table className="table-fixed">
            <thead>
              <tr>
                <th className="col-expand">Producto y Categoría</th>
                <th className="hide-mobile" style={{ width: '140px' }}>Unidad</th>
                <th style={{ width: '180px' }}>Stock Actual</th>
                <th className="hide-mobile" style={{ width: '140px' }}>Mínimo</th>
                <th style={{ width: '160px' }}>Precio ({moneda})</th>
                <th className="text-center" style={{ width: '120px' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item, i) => {
                const badge = stockBadge(item);
                return (
                  <motion.tr 
                    key={item.id} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: i * 0.02 }}
                  >
                    <td className="col-expand" data-main="true">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                          width: 44, height: 44, borderRadius: '14px', 
                          background: 'linear-gradient(135deg, var(--primary-dim), rgba(255,255,255,0.05))',
                          border: '1px solid var(--border-light)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}>
                          📦
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.02rem', letterSpacing: '-0.3px' }}>{item.nombre}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 700 }}>{item.categoria.toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hide-mobile">
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.unidad}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontWeight: 800, color: stockColor(item), fontSize: '1.2rem' }}>{item.stock}</div>
                        <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${Math.min(100, (item.stock / (item.stockMinimo * 2)) * 100)}%`, 
                            height: '100%', 
                            background: stockColor(item),
                            boxShadow: `0 0 10px ${stockColor(item)}80`
                          }} />
                        </div>
                      </div>
                    </td>
                    <td className="hide-mobile" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{item.stockMinimo} units</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{fmt(item.precio)}</div>
                    </td>
                    <td className="text-center">
                      <span className={`badge ${badge.cls}`} style={{ padding: '4px 12px', minWidth: '90px', justifyContent: 'center' }}>
                        {badge.label.toUpperCase()}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className="table-empty">Sin artículos registrados en inventario</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal Nuevo Producto */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={e=>e.target===e.currentTarget&&setModal(false)}>
            <motion.div className="modal" initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} style={{maxWidth:500}}>
              <div className="modal-header">
                <h3>📦 Nuevo Producto</h3>
                <button className="btn-close" onClick={()=>setModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="input-group">
                    <label>Nombre del Producto *</label>
                    <input className="input" required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} />
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Categoría</label>
                      <select className="input" value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
                        <option>Materiales</option>
                        <option>Instrumental</option>
                        <option>Equipos</option>
                        <option>Limpieza</option>
                        <option>Otros</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Unidad de Medida</label>
                      <input className="input" placeholder="Ej: Unidad, Caja, Frasco" value={form.unidad} onChange={e=>setForm(f=>({...f,unidad:e.target.value}))} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Stock Inicial</label>
                      <input type="number" className="input" value={form.stock} onChange={e=>setForm(f=>({...f,stock:parseInt(e.target.value)||0}))} />
                    </div>
                    <div className="input-group">
                      <label>Stock Mínimo</label>
                      <input type="number" className="input" value={form.stockMinimo} onChange={e=>setForm(f=>({...f,stockMinimo:parseInt(e.target.value)||0}))} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Precio Unitario (USD)</label>
                    <input type="number" step="0.01" className="input" value={form.precio} onChange={e=>setForm(f=>({...f,precio:parseFloat(e.target.value)||0}))} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Guardando...':'Guardar Producto'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
