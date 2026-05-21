-- =========================================================
-- ErgoDental – Supabase Schema Completo
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =========================================================

-- ─── 1. CLÍNICAS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinicas (
  id           TEXT PRIMARY KEY,
  nombre       TEXT NOT NULL,
  nombre_corto TEXT,
  razon_social TEXT,
  rif          TEXT,
  direccion    TEXT,
  telefonos    TEXT[],
  correos      TEXT[],
  instagram    TEXT,
  logo_url     TEXT
);

-- Insertar clínicas iniciales
INSERT INTO clinicas (id, nombre, nombre_corto, razon_social, rif, direccion) VALUES
  ('la-vina',  'Clínica Odontológica La Viña', 'La Viña',  'Inversiones La Viña C.A.',      'J-12345678-9', 'Av. Bolívar Norte, C.C. La Viña Plaza, Piso 2, Valencia'),
  ('alianza',  'Alianza Dental Care',           'Alianza',  'Servicios Alianza Dental S.A.',  'J-98765432-1', 'Urb. El Viñedo, Calle 139, Edif. Alianza, Valencia')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. PROFILES (vinculada a auth.users) ─────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                      UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre                  TEXT NOT NULL,
  email                   TEXT NOT NULL,
  rol                     TEXT NOT NULL CHECK (rol IN ('ADMIN','DOCTOR','ASISTENTE','RECEPCION')),
  activo                  BOOLEAN DEFAULT true,
  clinica_id              TEXT REFERENCES clinicas(id),
  permisos_multi_clinica  BOOLEAN DEFAULT false
);

-- ─── 3. PERSONAL ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personal (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id   TEXT REFERENCES clinicas(id),
  nombre       TEXT NOT NULL,
  apellido     TEXT NOT NULL,
  tipo         TEXT NOT NULL,
  especialidad TEXT,
  matricula    TEXT,
  turno        TEXT,
  telefono     TEXT,
  email        TEXT,
  activo       BOOLEAN DEFAULT true,
  foto         TEXT,
  last_updated BIGINT
);

-- ─── 4. PACIENTES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pacientes (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id        TEXT REFERENCES clinicas(id),
  nombre            TEXT NOT NULL,
  apellido          TEXT NOT NULL,
  cedula            TEXT,
  fecha_nacimiento  DATE,
  telefono          TEXT,
  email             TEXT,
  direccion         TEXT,
  fecha_registro    DATE DEFAULT CURRENT_DATE,
  tipo_referencia   TEXT,
  referidor_nombre  TEXT,
  referidor_contacto TEXT,
  alergias          BOOLEAN DEFAULT false,
  alergias_detalle  TEXT,
  last_updated      BIGINT
);

-- ─── 5. CITAS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citas (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id         TEXT REFERENCES clinicas(id),
  paciente_id        UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  paciente_nombre    TEXT,
  doctor_id          UUID REFERENCES personal(id) ON DELETE SET NULL,
  doctor_nombre      TEXT,
  fecha              DATE NOT NULL,
  hora               TEXT NOT NULL,
  motivo             TEXT,
  estado             TEXT DEFAULT 'Pendiente',
  tipo_atencion      TEXT,
  condicion          TEXT,
  estado_financiero  TEXT,
  tipo_referencia    TEXT,
  referidor_nombre   TEXT,
  referidor_contacto TEXT,
  last_updated       BIGINT
);

-- ─── 6. EVOLUCIONES CLÍNICAS ──────────────────────────────
CREATE TABLE IF NOT EXISTS evoluciones_clinicas (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id   TEXT REFERENCES clinicas(id),
  paciente_id  UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha        DATE DEFAULT CURRENT_DATE,
  doctor_nombre TEXT,
  procedimiento TEXT,
  notas        TEXT,
  materiales   TEXT
);

-- ─── 7. ODONTOGRAMAS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS odontogramas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE UNIQUE,
  datos       JSONB NOT NULL DEFAULT '[]',
  fecha       DATE DEFAULT CURRENT_DATE
);

-- ─── 8. INVENTARIO ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventario (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id   TEXT REFERENCES clinicas(id),
  nombre       TEXT NOT NULL,
  categoria    TEXT,
  stock        INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  unidad       TEXT,
  precio       NUMERIC(12,2)
);

-- ─── 9. PROVEEDORES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedores (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id TEXT REFERENCES clinicas(id),
  nombre     TEXT NOT NULL,
  tipo       TEXT,
  rif        TEXT,
  telefono   TEXT,
  email      TEXT,
  contacto   TEXT,
  direccion  TEXT,
  activo     BOOLEAN DEFAULT true
);

-- ─── 10. PAGOS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id        TEXT REFERENCES clinicas(id),
  paciente_id       UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  paciente_nombre   TEXT,
  cita_id           UUID REFERENCES citas(id) ON DELETE SET NULL,
  concepto          TEXT,
  monto             NUMERIC(12,2),
  monto_bs          NUMERIC(18,2),
  tasa_cambio       NUMERIC(12,2),
  metodo_pago       TEXT,
  tipo_pago         TEXT,
  dias_credito      INTEGER,
  fecha_vencimiento DATE,
  fecha             DATE DEFAULT CURRENT_DATE,
  estado            TEXT DEFAULT 'Pagado',
  notas             TEXT,
  moneda            TEXT,
  referencia        TEXT,
  tipo_referencia   TEXT,
  referidor_nombre  TEXT,
  doctor_id         UUID,
  doctor_nombre     TEXT,
  banco_emisor      TEXT,
  numero_referencia TEXT,
  telefono_origen   TEXT,
  comprobante       TEXT,
  last_updated      BIGINT
);

-- ─── 11. EGRESOS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS egresos (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id       TEXT REFERENCES clinicas(id),
  concepto         TEXT NOT NULL,
  categoria        TEXT,
  monto            NUMERIC(12,2),
  monto_bs         NUMERIC(18,2),
  tasa_cambio      NUMERIC(12,2),
  metodo_pago      TEXT,
  proveedor_id     UUID,
  proveedor_nombre TEXT,
  fecha            DATE DEFAULT CURRENT_DATE,
  notas            TEXT,
  last_updated     BIGINT
);

-- ─── 12. PRESUPUESTOS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS presupuestos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id      TEXT REFERENCES clinicas(id),
  paciente_id     UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  paciente_nombre TEXT,
  items           JSONB DEFAULT '[]',
  total           NUMERIC(12,2),
  estado          TEXT DEFAULT 'Borrador',
  fecha           DATE DEFAULT CURRENT_DATE,
  notas           TEXT
);

-- ─── 13. RECIBOS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recibos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  presupuesto_id  UUID REFERENCES presupuestos(id) ON DELETE SET NULL,
  paciente_id     UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  paciente_nombre TEXT,
  clinica_id      TEXT REFERENCES clinicas(id),
  monto           NUMERIC(12,2),
  metodo_pago     TEXT,
  fecha           DATE DEFAULT CURRENT_DATE,
  nro_recibo      TEXT
);

-- ─── 14. LABORATORIOS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS laboratorios (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id             TEXT REFERENCES clinicas(id),
  paciente_id            UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  paciente_nombre        TEXT,
  trabajo                TEXT,
  laboratorio_nombre     TEXT,
  fecha_envio            DATE,
  fecha_entrega_prevista DATE,
  estado                 TEXT DEFAULT 'Enviado',
  costo                  NUMERIC(12,2)
);

-- ─── 15. TASA BCV ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasa_bcv (
  id      SERIAL PRIMARY KEY,
  monto   NUMERIC(12,2) NOT NULL,
  fecha   DATE DEFAULT CURRENT_DATE,
  usuario TEXT
);

-- ─── 16. AUDITORÍA ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario     TEXT,
  accion      TEXT,
  detalle     TEXT,
  documento_id TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 17. CORRELATIVO GLOBAL ───────────────────────────────
CREATE TABLE IF NOT EXISTS correlativo_global (
  id    INTEGER DEFAULT 1 PRIMARY KEY CHECK (id = 1),
  valor INTEGER DEFAULT 0
);
INSERT INTO correlativo_global (id, valor) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Función atómica para correlativo (thread-safe)
CREATE OR REPLACE FUNCTION next_correlativo()
RETURNS TEXT AS $$
DECLARE v INTEGER;
BEGIN
  UPDATE correlativo_global SET valor = valor + 1 WHERE id = 1 RETURNING valor INTO v;
  RETURN 'DOC-' || LPAD(v::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────
-- Habilitar RLS en todas las tablas de usuario
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE evoluciones_clinicas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE odontogramas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario            ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE egresos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recibos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE laboratorios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasa_bcv              ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlativo_global    ENABLE ROW LEVEL SECURITY;

-- Políticas: usuario autenticado puede operar todo
-- (Se puede restringir por clinica_id en el futuro)
CREATE POLICY "auth_all_profiles"             ON profiles             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_personal"             ON personal             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pacientes"            ON pacientes            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_citas"                ON citas                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_evoluciones"          ON evoluciones_clinicas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_odontogramas"         ON odontogramas         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_inventario"           ON inventario           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_proveedores"          ON proveedores          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pagos"                ON pagos                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_egresos"              ON egresos              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_presupuestos"         ON presupuestos         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_recibos"              ON recibos              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_laboratorios"         ON laboratorios         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_tasa_bcv"             ON tasa_bcv             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_auditoria"            ON auditoria_logs       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_correlativo"          ON correlativo_global   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── TRIGGER: crear profile automático al registrar usuario ──
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nombre, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'ASISTENTE')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
