import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { generarManualPDF } from '../utils/reportes';

const MANUAL_TECNICO_PUNTOS = [
  '# MANUAL TÉCNICO, ESPECIFICACIONES Y CÓDIGO FUENTE (TLP:RED)',
  'Este documento detalla a bajo nivel las estructuras de datos (DDL), las interfaces de TypeScript, las funciones críticas y la arquitectura algorítmica de ErgoDentalve V2.1. Diseñado para auditorías de código y soporte Nivel 3.',
  
  '## 1. ESQUEMA DE BASE DE DATOS (POSTGRESQL DDL)',
  'A continuación, se define la estructura estricta de las tablas principales y sus restricciones en Supabase:',
  '* Tabla `usuarios`: CREATE TABLE usuarios ( id UUID PRIMARY KEY REFERENCES auth.users, email TEXT UNIQUE, rol TEXT CHECK(rol IN (\'Administrador\', \'Odontólogo\', \'Asistente\', \'Superadmin\')), clinica_id UUID REFERENCES clinicas(id), activo BOOLEAN DEFAULT true );',
  '* Tabla `pacientes`: CREATE TABLE pacientes ( id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), cedula TEXT, nombre_completo TEXT NOT NULL, fecha_nacimiento DATE, telefono TEXT, clinica_id UUID REFERENCES clinicas(id), antecedentes JSONB DEFAULT \'{}\'::jsonb, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() );',
  '* Tabla `citas`: CREATE TABLE citas ( id UUID PRIMARY KEY, paciente_id UUID REFERENCES pacientes(id), odontologo_id UUID REFERENCES usuarios(id), clinica_id UUID, fecha TIMESTAMP, motivo TEXT, estado TEXT CHECK(estado IN (\'Programada\', \'En Sala\', \'Atendida\', \'Cancelada\')), color TEXT, nota_medica TEXT );',
  '* Tabla `historias_clinicas`: CREATE TABLE historias_clinicas ( id UUID PRIMARY KEY, paciente_id UUID REFERENCES pacientes(id), clinica_id UUID, odontograma JSONB DEFAULT \'[]\'::jsonb, patologias JSONB DEFAULT \'[]\'::jsonb, plan_tratamiento TEXT, created_at TIMESTAMP DEFAULT NOW() );',
  '* Tabla `finanzas_ingresos`: CREATE TABLE finanzas_ingresos ( id UUID PRIMARY KEY, paciente_id UUID REFERENCES pacientes(id), monto_usd DECIMAL(10,2), monto_bs DECIMAL(15,2), metodo_pago TEXT, ref_bancaria TEXT, descripcion TEXT, fecha TIMESTAMP DEFAULT NOW(), clinica_id UUID REFERENCES clinicas(id) );',
  
  '## 2. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)',
  'El aislamiento de los datos por clínica (Tenant) se garantiza mediante políticas inyectadas a nivel del motor PostgreSQL:',
  '* Aislamiento Estándar (Ej. pacientes): CREATE POLICY "tenant_isolation_select" ON public.pacientes FOR SELECT USING ( clinica_id IN (SELECT clinica_id FROM usuarios WHERE id = auth.uid()) );',
  '* Override Superadmin: Las vistas agregadas puentean el RLS si el token JWT contiene el claim respectivo: USING ( (auth.jwt() ->> \'rol\'::text) = \'Superadmin\' );',
  
  '## 3. INTERFACES DE TYPESCRIPT (ENTIDADES EN MEMORIA)',
  'El tipado estricto asegura la integridad en el Frontend. Las definiciones en src/api.ts son:',
  '* interface Paciente { id: string; cedula: string; nombre_completo: string; fecha_nacimiento: string; telefono: string; clinica_id: string; antecedentes: any; created_at?: string; }',
  '* interface Cita { id: string; paciente_id: string; odontologo_id: string; clinica_id: string; fecha: string; motivo: string; estado: \'Programada\' | \'En Sala\' | \'Atendida\' | \'Cancelada\'; color?: string; nota_medica?: string; created_at?: string; }',
  '* interface Pago { id: string; clinica_id: string; paciente_id: string; monto_usd: number; monto_bs: number; metodo_pago: string; ref_bancaria: string; descripcion: string; fecha: string; created_at?: string; }',
  
  '## 4. MOTOR FINANCIERO Y ALGORITMOS CORE',
  'El núcleo del cálculo de honorarios y conversión de divisas reside en las siguientes funciones del cliente:',
  '* Partición de Comisiones (api.ts): export const TABLA_REFERENCIAS = { "Referencia Interna (70/30)": { clinica: 70, odontologo: 30, referidor_foraneo: 0 }, "Referencia Foránea (50/40/10)": { clinica: 50, odontologo: 40, referidor_foraneo: 10 } };',
  '* Función Cálculo (Finanzas.tsx): const distribucion = TABLA_REFERENCIAS[tipo_referencia]; const honorario_odontologo = monto_usd * (distribucion.odontologo / 100); const ganancia_clinica = monto_usd * (distribucion.clinica / 100);',
  '* Obtención de Tasa BCV (MonedaContext.tsx): const response = await fetch(\'https://ve.dolarapi.com/v1/dolares/oficial\'); const data = await response.json(); setTasaDolar(data.promedio);',
  
  '## 5. ESTADO GLOBAL (REACT CONTEXT API)',
  'La gestión de estado distribuido evita re-renderizados masivos en el árbol de componentes (src/contexts/):',
  '* AuthContext: Mantiene el estado de la sesión activa (`session: Session | null`) y extrae el rol de la base de datos tras verificar la firma del JWT en Supabase.',
  '* ClinicaContext: Persiste la sede seleccionada. Función core: `const [clinicaActiva, setClinicaActiva] = useState(localStorage.getItem(\'clinicaActiva\'))`. Filtra globalmente los queries.',
  '* MonedaContext: Mantiene la paridad cambiaria en RAM (`tasaDolar`). Llama a `cargarTasa()` en el evento de montaje inicial `useEffect(() => { cargarTasa(); }, [])`.',
  
  '## 6. EXPORTACIÓN PDF Y REPORTING (utils/reportes.ts)',
  'Motor de renderizado Zero-Cost Server usando jsPDF + autotable. Permite inyección de metadatos corporativos en el cliente:',
  '* Función Base: export async function generarReportePDF(topic: { titulo: string, subtitulo?: string, columnas: string[], filas: any[][] }, usuario?: string) { ... }',
  '* Algoritmo de Flujo: 1) Ejecuta `getGlobalCorrelativo()` para ID único. 2) Dibuja membrete con `addHeader()`. 3) Inyecta tabla con `autoTable(doc, { head: [columnas], body: filas })`. 4) Guarda archivo localmente `doc.save(\'Reporte.pdf\')`.',
  '* Algoritmo Manual PDF: Parsea arrays de strings en el cliente. Intercepta sintaxis Markdown (`# `, `## `, `* `) asignando recursivamente `setFontSize()` y calculando saltos de página dinámicos al superar Y=260.',
  
  '## 7. PIPELINE DE INTEGRACIÓN (CI/CD) Y CONFIGURACIONES VITE',
  'Reglas de empaquetado para despliegue en la nube (vite.config.ts / tsconfig.json):',
  '* Compilación Estricta: Se exige la aprobación de "npx tsc -b" (sin errores TypeScript) antes de ejecutar "vite build" para generar el empaquetado final.',
  '* PWA Manifest: Integrado mediante "vite-plugin-pwa" registrando Service Workers asíncronos con estrategia "Network First" para llamadas a Supabase y "Cache First" para assets estáticos (logo, tipografías).'
];

export default function ManualTecnico() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generarManualPDF({
        titulo: 'Manual Técnico - Arquitectura y Especificaciones',
        puntos: MANUAL_TECNICO_PUNTOS
      }, user?.nombre);
    } catch (e) {
      alert('Error generando PDF técnico: ' + e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '20px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-primary)' }}>🛠️ Manual Técnico y Especificaciones</h1>
        <p style={{ color: 'var(--danger)', fontWeight: 'bold', marginTop: '10px' }}>
          DOCUMENTO CONFIDENCIAL - VISIBLE SOLO PARA ADMINISTRADORES
        </p>
      </div>

      <div className="card" style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>ErgoDentalve V2.1 ERP</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Especificaciones de Ingeniería</p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleDownload} 
            disabled={isGenerating}
            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
          >
            {isGenerating ? 'Generando PDF...' : '⬇️ Descargar Manual PDF'}
          </button>
        </div>

        <div className="technical-content" style={{ color: 'var(--text-primary)', lineHeight: 1.8 }}>
          {MANUAL_TECNICO_PUNTOS.map((punto, idx) => {
            if (punto.startsWith('# ')) {
              return <h3 key={idx} style={{ color: 'var(--primary)', marginTop: '30px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>{punto.replace('# ', '')}</h3>;
            } else if (punto.startsWith('## ')) {
              return <h4 key={idx} style={{ color: 'var(--accent)', marginTop: '20px' }}>{punto.replace('## ', '')}</h4>;
            } else if (punto.startsWith('* ')) {
              return <li key={idx} style={{ marginLeft: '20px', color: 'var(--text-secondary)' }}>{punto.replace('* ', '')}</li>;
            } else {
              return <p key={idx} style={{ color: 'var(--text-secondary)' }}>{punto}</p>;
            }
          })}
        </div>
      </div>
    </div>
  );
}
