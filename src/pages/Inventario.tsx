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
    getInventario().then(data => setItems(data.filter(i => i.clinicaId === clinica.id))); 
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
    <div>
      <div className="page-header">
        <div>
          <h1>Inventario</h1>
          <p style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span className="badge badge-primary" style={{ fontSize:'0.7rem' }}>{clinica.nombreCorto}</span>
            {items.length} productos · {bajoStock > 0 ? `⚠️ ${bajoStock} con stock bajo` : '✅ Stock en regla'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nuevo Producto</button>
      </div>

      {bajoStock > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'var(--warning-dim)', border: '1px solid var(--warning)', borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--warning)', fontSize: '0.88rem' }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <span><strong>{bajoStock} producto(s)</strong> están por debajo del stock mínimo. Se recomienda reabastecer pronto.</span>
        </motion.div>
      )}

      {/* Filtros */}
      <div className="glass" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: '1 1 300px' }}>
          <span className="search-icon">🔍</span>
          <input className="input" placeholder="Buscar producto o categoría..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setFiltroAlerta(!filtroAlerta)}
          style={filtroAlerta ? { borderColor: 'var(--warning)', color: 'var(--warning)', background: 'var(--warning-dim)', flex: '1 1 auto' } : { flex: '1 1 auto' }}>
          ⚠️ Solo alertas
        </button>
      </div>

      {/* Tabla */}
      <motion.div className="glass" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th>Stock actual</th>
                <th>Stock mín.</th>
                <th>Precio ({moneda})</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item, i) => {
                const badge = stockBadge(item);
                return (
                  <motion.tr key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                    <td><span className="badge badge-muted">{item.categoria}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.unidad}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: stockColor(item), fontSize: '1rem' }}>{item.stock}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.stockMinimo}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{fmt(item.precio)}</td>
                    <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                  </motion.tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Sin resultados</td></tr>
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
