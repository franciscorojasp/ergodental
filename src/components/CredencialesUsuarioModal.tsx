// src/components/CredencialesUsuarioModal.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { type Usuario, CLINICAS, resetUserPassword, getPersonal } from '../api';
import { ROL_LABEL } from '../permissions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  usuario: Usuario | null;
  initialPassword?: string;
  onPasswordUpdated?: (usuarioId: string, nuevaClave: string) => void;
}

export default function CredencialesUsuarioModal({
  isOpen,
  onClose,
  usuario,
  initialPassword = '',
  onPasswordUpdated
}: Props) {
  const [password, setPassword] = useState(initialPassword);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [incluirAuthEnQR, setIncluirAuthEnQR] = useState(true);
  const [telefono, setTelefono] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'success' | 'error'; mensaje: string } | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const carnetRef = useRef<HTMLDivElement | null>(null);

  // Inicializar teléfono y password al abrir o cambiar usuario
  useEffect(() => {
    if (usuario) {
      setPassword(initialPassword || '');
      setFeedback(null);
      setCopiado(null);

      // Buscar teléfono en tabla de personal si existe
      getPersonal()
        .then((lista) => {
          const match = lista.find(
            p => (p.email && p.email.toLowerCase() === usuario.email.toLowerCase()) ||
                 (p.nombre && usuario.nombre && p.nombre.toLowerCase().includes(usuario.nombre.toLowerCase()))
          );
          if (match && match.telefono) {
            setTelefono(match.telefono);
          } else {
            setTelefono('');
          }
        })
        .catch(() => setTelefono(''));
    }
  }, [usuario, initialPassword]);

  if (!isOpen || !usuario) return null;

  const clinicaAsignada = CLINICAS.find(c => c.id === usuario.clinicaId);
  const nombreSede = clinicaAsignada ? clinicaAsignada.nombre : 'Consolidado Global';

  // Construcción de la URL base limpia
  const baseUrl = `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}/`;
  
  // URL codificada en el código QR
  const qrUrl = incluirAuthEnQR && password
    ? `${baseUrl}#/login?user=${encodeURIComponent(usuario.email)}&pwd=${encodeURIComponent(password)}&role=${encodeURIComponent(usuario.rol)}&qr=1`
    : `${baseUrl}#/login?user=${encodeURIComponent(usuario.email)}&role=${encodeURIComponent(usuario.rol)}&qr=1`;

  const notificar = (mensaje: string, tipo: 'success' | 'error' = 'success') => {
    setFeedback({ tipo, mensaje });
    setTimeout(() => setFeedback(null), 3500);
  };

  const copiarAlPortapapeles = (texto: string, clave: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(clave);
    notificar('Copiado al portapapeles.');
    setTimeout(() => setCopiado(null), 2000);
  };

  const generarPasswordTemporal = () => {
    const numeros = Math.floor(1000 + Math.random() * 9000);
    const simbolos = '!@#$%';
    const simb = simbolos[Math.floor(Math.random() * simbolos.length)];
    const nueva = `Ergo${numeros}${simb}`;
    setPassword(nueva);
    notificar('Nueva clave temporal generada. Guarda en el sistema si deseas aplicarla.', 'success');
  };

  const handleGuardarNuevaClave = async () => {
    if (!password || password.length < 6) {
      notificar('La contraseña debe tener mínimo 6 caracteres.', 'error');
      return;
    }
    setGuardando(true);
    try {
      await resetUserPassword(usuario.id, password);
      if (onPasswordUpdated) onPasswordUpdated(usuario.id, password);
      notificar('¡Contraseña actualizada en la base de datos con éxito!', 'success');
    } catch (err: any) {
      notificar(err.message || 'Error al actualizar contraseña.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  // Mensaje oficial formateado para WhatsApp
  const mensajeWhatsApp = `🦷 *ERGODENTALVE · ACCESO AL SISTEMA CLÍNICO* 🦷

Estimado/a *${usuario.nombre || 'Usuario'}*,

A continuación se detallan tus credenciales oficiales para ingresar a la plataforma de gestión clínica ErgoDentalVE:

🌐 *Dirección de la Aplicación:*
${baseUrl}

👤 *Usuario / Correo:* ${usuario.email}
🔑 *Contraseña:* ${password ? password : '(Usa tu contraseña habitual)'}
🩺 *Rol Clínico:* ${ROL_LABEL[usuario.rol]}
🏥 *Sede Asignada:* ${nombreSede}

📲 *Acceso Rápido desde Cámara o Móvil:*
Escanea el código QR de tu credencial o ingresa directamente con este enlace:
${qrUrl}

🔒 *Seguridad:* Conserva estas credenciales en un lugar seguro. Si tienes inconvenientes para ingresar, contacta a la administración clínica.`;

  const enviarPorWhatsApp = () => {
    const telLimpio = telefono.replace(/[^0-9]/g, '');
    const url = telLimpio
      ? `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensajeWhatsApp)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensajeWhatsApp)}`;
    window.open(url, '_blank');
  };

  const enviarPorCorreo = () => {
    const asunto = `Tus Credenciales de Acceso - ErgoDentalVE (${usuario.nombre})`;
    const mailto = `mailto:${encodeURIComponent(usuario.email)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensajeWhatsApp)}`;
    window.location.href = mailto;
  };

  const descargarQR = () => {
    try {
      const svg = document.getElementById('qr-credencial-svg');
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = 400;
        canvas.height = 400;
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 20, 20, 360, 360);
          const a = document.createElement('a');
          a.download = `QR_Acceso_${(usuario.nombre || usuario.email).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
          a.href = canvas.toDataURL('image/png');
          a.click();
          notificar('Imagen QR descargada con éxito.');
        }
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      console.error('Error al descargar QR:', e);
      notificar('No se pudo generar la descarga del QR.', 'error');
    }
  };

  const imprimirCarnet = () => {
    const ventana = window.open('', '_blank', 'width=750,height=900');
    if (!ventana) {
      alert('Por favor habilita las ventanas emergentes para imprimir la credencial.');
      return;
    }

    const svgElement = document.getElementById('qr-credencial-svg');
    const svgHtml = svgElement ? svgElement.outerHTML : '';

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credencial de Acceso - ${usuario.nombre} - ErgoDentalVE</title>
          <meta charset="utf-8" />
          <style>
            @page { size: portrait; margin: 15mm; }
            body {
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 20px;
              background: #f8fafc;
            }
            .card {
              max-width: 520px;
              margin: 0 auto;
              background: #fff;
              border-radius: 20px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.08);
              overflow: hidden;
              border: 1px solid #e2e8f0;
            }
            .card-header {
              background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
              color: #fff;
              padding: 24px;
              text-align: center;
            }
            .card-header h1 {
              margin: 0;
              font-size: 22px;
              letter-spacing: 1px;
              font-weight: 900;
            }
            .card-header p {
              margin: 4px 0 0;
              font-size: 12px;
              opacity: 0.9;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .card-body {
              padding: 28px;
              text-align: center;
            }
            .qr-box {
              display: inline-block;
              padding: 14px;
              background: #fff;
              border: 2px dashed #cbd5e1;
              border-radius: 16px;
              margin-bottom: 20px;
            }
            .user-info {
              text-align: left;
              background: #f1f5f9;
              padding: 16px 20px;
              border-radius: 14px;
              margin-bottom: 20px;
              font-size: 13px;
              line-height: 1.6;
            }
            .user-info strong {
              color: #0f172a;
              display: inline-block;
              width: 140px;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 12px;
              background: #e0f2fe;
              color: #0369a1;
            }
            .instructions {
              font-size: 11px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
              padding-top: 14px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-header">
              <h1>ERGODENTALVE</h1>
              <p>Credencial Oficial de Acceso Clínico</p>
            </div>
            <div class="card-body">
              <div class="qr-box">
                ${svgHtml}
              </div>
              <div class="user-info">
                <div><strong>Usuario:</strong> ${usuario.nombre}</div>
                <div><strong>Correo Electrónico:</strong> ${usuario.email}</div>
                <div><strong>Contraseña Temporal:</strong> ${password || '(Asignada por el usuario)'}</div>
                <div><strong>Rol Clínico:</strong> <span class="badge">${ROL_LABEL[usuario.rol]}</span></div>
                <div><strong>Sede Asignada:</strong> ${nombreSede}</div>
                <div><strong>Dirección Web:</strong> ${baseUrl}</div>
              </div>
              <div class="instructions">
                Escanea el código QR con la cámara de tu teléfono inteligente para iniciar sesión automáticamente o ingresa desde cualquier navegador moderno en la dirección indicada.
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          zIndex: 10000,
          background: 'rgba(5, 8, 20, 0.88)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          overflowY: 'auto'
        }}
      >
        <motion.div
          className="modal"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          style={{
            maxWidth: '820px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '24px',
            background: 'var(--bg-surface, #0f172a)',
            border: '1px solid var(--border-light, rgba(255,255,255,0.1))',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
            overflow: 'hidden'
          }}
        >
          {/* HEADER DEL MODAL */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(0, 198, 255, 0.08), transparent)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, var(--primary, #00c6ff), var(--accent, #0072ff))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                boxShadow: '0 8px 20px rgba(0, 198, 255, 0.3)'
              }}>
                🪪
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                    Credencial y Acceso QR
                  </h2>
                  <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '8px' }}>
                    {ROL_LABEL[usuario.rol]}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                  {usuario.nombre} · <span style={{ color: 'var(--primary, #00c6ff)' }}>{usuario.email}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ fontSize: '1.2rem', padding: '6px 12px', borderRadius: '10px' }}
            >
              ✕
            </button>
          </div>

          {/* CUERPO DEL MODAL */}
          <div style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '24px'
          }}>
            
            {/* COLUMNA IZQUIERDA: CARNET DIGITAL Y QR */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid var(--border-light, rgba(255, 255, 255, 0.08))',
              position: 'relative'
            }} ref={carnetRef}>
              
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.72rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  ESCANEAR PARA ENTRAR
                </span>
                <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700, marginTop: '2px' }}>
                  Acceso Instantáneo al Sistema
                </div>
              </div>

              {/* CONTENEDOR DEL CÓDIGO QR */}
              <div style={{
                background: '#ffffff',
                padding: '16px',
                borderRadius: '20px',
                boxShadow: '0 12px 35px rgba(0,0,0,0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                border: '2px solid rgba(0, 198, 255, 0.4)'
              }}>
                <QRCodeSVG
                  id="qr-credencial-svg"
                  value={qrUrl}
                  size={190}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: '/logo.png',
                    x: undefined,
                    y: undefined,
                    height: 38,
                    width: 38,
                    excavate: true,
                  }}
                />
              </div>

              {/* TOGGLE: INCLUIR CREDENCIALES EN QR */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                color: 'var(--text-secondary, #cbd5e1)',
                cursor: 'pointer',
                marginBottom: '14px',
                background: 'rgba(0,0,0,0.2)',
                padding: '8px 12px',
                borderRadius: '10px',
                width: '100%',
                justifyContent: 'center'
              }}>
                <input
                  type="checkbox"
                  checked={incluirAuthEnQR}
                  onChange={e => setIncluirAuthEnQR(e.target.checked)}
                />
                <span>Auto-ingreso instantáneo con 1 escaneo</span>
              </label>

              {/* BOTONES QR: DESCARGAR E IMPRIMIR */}
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={descargarQR}
                  style={{ flex: 1, fontSize: '0.78rem', borderRadius: '10px', padding: '8px 10px', justifyContent: 'center' }}
                >
                  ⬇️ Descargar QR
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={imprimirCarnet}
                  style={{ flex: 1, fontSize: '0.78rem', borderRadius: '10px', padding: '8px 10px', justifyContent: 'center' }}
                >
                  🖨️ Imprimir Carnet
                </button>
              </div>

              <p style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted, #94a3b8)',
                textAlign: 'center',
                margin: '12px 0 0',
                lineHeight: 1.4
              }}>
                📱 Compatible con la cámara de cualquier teléfono Android, iOS o HarmonyOS.
              </p>
            </div>

            {/* COLUMNA DERECHA: DATOS DE ACCESO Y ACCIONES DE ENVÍO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* FEEDBACK ALERT */}
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: feedback.tipo === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: feedback.tipo === 'success' ? '#10b981' : '#ef4444',
                    border: `1px solid ${feedback.tipo === 'success' ? '#10b981' : '#ef4444'}`
                  }}
                >
                  {feedback.tipo === 'success' ? '✅' : '⚠️'} {feedback.mensaje}
                </motion.div>
              )}

              {/* 1. DIRECCIÓN DE LA APLICACIÓN */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    🌐 Dirección de la Aplicación
                  </label>
                  <button
                    type="button"
                    onClick={() => copiarAlPortapapeles(baseUrl, 'url')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    {copiado === 'url' ? '¡Copiado!' : '📋 Copiar'}
                  </button>
                </div>
                <div style={{ fontSize: '0.86rem', color: '#fff', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {baseUrl}
                </div>
              </div>

              {/* 2. USUARIO / CORREO */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    👤 Usuario / Correo
                  </label>
                  <button
                    type="button"
                    onClick={() => copiarAlPortapapeles(usuario.email, 'user')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    {copiado === 'user' ? '¡Copiado!' : '📋 Copiar'}
                  </button>
                </div>
                <div style={{ fontSize: '0.92rem', color: '#fff', fontWeight: 700 }}>
                  {usuario.email}
                </div>
              </div>

              {/* 3. CONTRASEÑA */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    🔑 Contraseña
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={generarPasswordTemporal}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                      title="Generar nueva clave segura tipo Ergo1234!"
                    >
                      🎲 Generar
                    </button>
                    {password && (
                      <button
                        type="button"
                        onClick={() => copiarAlPortapapeles(password, 'pass')}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                      >
                        {copiado === 'pass' ? '¡Copiado!' : '📋 Copiar'}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      className="input"
                      type={mostrarPassword ? 'text' : 'password'}
                      placeholder="Escribe o genera la contraseña"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        fontSize: '0.88rem',
                        padding: '8px 36px 8px 12px',
                        fontFamily: mostrarPassword ? 'inherit' : 'monospace',
                        borderRadius: '10px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {mostrarPassword ? '👁️' : '🔒'}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={handleGuardarNuevaClave}
                    disabled={guardando || !password}
                    style={{
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      padding: '8px 10px',
                      whiteSpace: 'nowrap',
                      border: '1px solid var(--border-light)'
                    }}
                    title="Actualizar esta contraseña en la base de datos de usuarios"
                  >
                    {guardando ? 'Guardando...' : '💾 Guardar Clave'}
                  </button>
                </div>
              </div>

              {/* 4. ROL Y SEDE CLÍNICA */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                background: 'rgba(255,255,255,0.02)',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border-light)'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                    🩺 Rol Asignado
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                    {ROL_LABEL[usuario.rol]}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>
                    🏥 Sede Asignada
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>
                    {nombreSede}
                  </div>
                </div>
              </div>

              {/* 5. TELÉFONO DE WHATSAPP PARA ENVÍO */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  📲 Número de WhatsApp del Destinatario
                </label>
                <input
                  className="input"
                  type="tel"
                  placeholder="Ej. +584121234567 o 04121234567"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  style={{ width: '100%', fontSize: '0.88rem', padding: '8px 12px', borderRadius: '10px' }}
                />
              </div>

              {/* BOTONES PRINCIPALES DE ENVÍO */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={enviarPorWhatsApp}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)'
                  }}
                >
                  📲 Enviar WhatsApp
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={enviarPorCorreo}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.86rem'
                  }}
                >
                  ✉️ Enviar Correo
                </button>
              </div>

              {/* COPIAR TODA LA FICHA */}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => copiarAlPortapapeles(mensajeWhatsApp, 'todo')}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)'
                }}
              >
                {copiado === 'todo' ? '✅ ¡Ficha completa copiada al portapapeles!' : '📋 Copiar toda la ficha de credenciales en texto'}
              </button>

            </div>

          </div>

          {/* FOOTER */}
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-light, rgba(255,255,255,0.08))',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              style={{ borderRadius: '10px', padding: '8px 18px', fontSize: '0.85rem' }}
            >
              Cerrar
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
