import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function Desarrolladores() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
      <div className="page-header">
        <div>
          <h1>Centro de Soporte</h1>
          <p>Información técnica y contacto del desarrollador</p>
        </div>
      </div>

      <motion.div 
        className="glass" 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}
      >
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '20px', 
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          display: 'inline-block' 
        }}>
          <QRCodeSVG value={window.location.origin} size={200} level="H" />
        </div>

        <div style={{ maxWidth: 400 }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>ERGOEXPRESS, C.A.</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Soluciones de Software de Alto Rendimiento para Clínicas y Empresas.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', textAlign: 'left' }}>
            <div className="glass" style={{ padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Teléfono 1</div>
              <div style={{ fontWeight: 700 }}>+58 424 4736489</div>
            </div>
            <div className="glass" style={{ padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Teléfono 2</div>
              <div style={{ fontWeight: 700 }}>+58 412 4116804</div>
            </div>
            <div className="glass" style={{ padding: '16px', borderRadius: '12px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Instagram</div>
              <div style={{ fontWeight: 700 }}>@ergoexpress_ve</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Escanea el código con tu teléfono o tablet para acceder rápidamente al ecosistema digital de ErgoDental.
        </div>
      </motion.div>
    </div>
  );
}
