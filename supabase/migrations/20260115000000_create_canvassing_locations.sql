-- ============================================
-- NEXOAV - CANVASSING LOCATIONS TABLE
-- ============================================
-- Esta tabla almacena los puntos de Canvassing marcados por los comerciales
-- en el mapa. Cada punto está asociado únicamente al usuario que lo crea.

-- 1. CREAR TIPO ENUM PARA ESTADOS DE CANVASSING
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.canvassing_status AS ENUM (
    'CB',   -- Call Back (Llamar de nuevo)
    'CX',   -- Customer (Cliente cerrado)
    'GB',   -- Go Back (Volver más tarde)
    'NH',   -- Not Home (No disponible)
    'NI',   -- Not Interested (No interesado)
    'OTH',  -- Other (Otro)
    'DK',   -- Doors Knocked (Puerta tocada)
    'RNT',  -- Renter (Inquilino)
    'INT',  -- Interested (Interesado)
    'APP',  -- Appointment Set (Cita programada)
    'PRES', -- Presupuesto enviado
    'NEG'   -- Negotiation (En negociación)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. CREAR TIPO ENUM PARA PRIORIDAD
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.canvassing_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. CREAR TIPO ENUM PARA TIPO DE NEGOCIO
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.business_type AS ENUM (
    'RETAIL',           -- Retail/Comercio
    'RESTAURANT',       -- Restaurante/Bar/Cafetería
    'HOTEL',            -- Hotel/Alojamiento
    'OFFICE',           -- Oficinas corporativas
    'SHOPPING_MALL',    -- Centro comercial
    'GYM',              -- Gimnasio/Centro deportivo
    'CLINIC',           -- Clínica/Centro médico
    'DEALERSHIP',       -- Concesionario
    'SHOWROOM',         -- Showroom
    'WAREHOUSE',        -- Almacén/Nave industrial
    'EDUCATION',        -- Centro educativo
    'OTHER'             -- Otros
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3.1. CREAR TIPO ENUM PARA TIPO DE PROPIEDAD (mantener para compatibilidad)
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.property_type AS ENUM (
    'SINGLE_FAMILY',  -- Casa unifamiliar
    'APARTMENT',       -- Apartamento
    'DUPLEX',         -- Dúplex
    'COMMERCIAL'      -- Comercial
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. CREAR TIPO ENUM PARA ESTADO DE PROPIEDAD
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.property_status AS ENUM ('OWNER', 'RENTER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. CREAR TIPO ENUM PARA CONDICIÓN
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.condition_level AS ENUM ('GOOD', 'REGULAR', 'POOR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 6. CREAR TIPO ENUM PARA TIPO DE TEJADO
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.roof_type AS ENUM ('TILES', 'SLATE', 'METAL', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7. CREAR TIPO ENUM PARA MÉTODO DE CONTACTO
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.contact_method AS ENUM ('PHONE', 'EMAIL', 'SMS', 'WHATSAPP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 8. CREAR TIPO ENUM PARA HORARIO DE CONTACTO
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.contact_time AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 9. CREAR TIPO ENUM PARA URGENCIA
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.need_urgency AS ENUM ('IMMEDIATE', '1_3_MONTHS', '3_6_MONTHS', 'MORE_6_MONTHS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 10. CREAR TIPO ENUM PARA TIPO DE CITA
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.appointment_type AS ENUM (
    'FIRST_VISIT',        -- Primera visita comercial
    'TECHNICAL_VISIT',    -- Visita técnica / Mediciones
    'PROPOSAL',           -- Presentación de propuesta
    'DEMO',              -- Demostración de producto
    'SIGNING',           -- Firma de contrato
    'FOLLOW_UP',         -- Seguimiento
    'CLOSING',           -- Cierre
    'INSTALLATION'       -- Instalación
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 10.1. CREAR TIPO ENUM PARA TIPO DE SOLUCIÓN AUDIOVISUAL
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.av_solution_type AS ENUM (
    'DIGITAL_SIGNAGE',      -- Cartelería Digital / Digital Signage
    'LED_INTERIOR',         -- Pantallas LED interior
    'LED_EXTERIOR',         -- Pantallas LED exterior
    'VIDEOWALLS',           -- Videowalls
    'DIGITAL_TOTEMS',       -- Tótems digitales
    'DIGITAL_MENUS',        -- Menús digitales
    'SOUND_SYSTEM',         -- Sonorización
    'BACKGROUND_MUSIC',      -- Hilo musical
    'PUBLIC_ADDRESS',       -- Megafonía
    'PRO_AUDIO',            -- Sistema de audio profesional
    'AMBIENT_SOUND',        -- Sonido ambiental
    'CCTV',                 -- Videovigilancia / CCTV
    'SECURITY_CAMERAS',     -- Cámaras de seguridad
    'RECORDING_SYSTEM',     -- Sistema de grabación
    'ACCESS_CONTROL',       -- Control de accesos
    'VIDEOCONFERENCE',      -- Videoconferencia
    'MEETING_ROOMS',        -- Salas de reuniones
    'VC_EQUIPMENT',         -- Equipos de videoconferencia
    'PRO_LIGHTING',         -- Iluminación Profesional
    'LED_LIGHTING',         -- Iluminación LED
    'ARCH_LIGHTING',        -- Iluminación arquitectónica
    'LIGHTING_CONTROL',     -- Control de iluminación
    'PROJECTION',           -- Proyección
    'PROJECTORS',           -- Proyectores
    'PROJECTION_SCREENS',   -- Pantallas de proyección
    'AUTOMATION',           -- Integración y Automatización
    'COMMERCIAL_SMART',     -- Domótica comercial
    'CENTRAL_CONTROL',      -- Control centralizado
    'TECHNICAL_SERVICE',    -- Servicio Técnico Subcontratado
    'MAINTENANCE',          -- Mantenimiento
    'INSTALLATIONS',        -- Instalaciones
    'TECH_SUPPORT'         -- Soporte técnico
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 10.2. CREAR TIPO ENUM PARA FASE DEL PROCESO DE COMPRA
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.purchase_phase AS ENUM (
    'INITIAL_RESEARCH',        -- Investigación inicial
    'COMPARING_OPTIONS',       -- Comparando opciones
    'READY_TO_DECIDE',         -- Listo para decidir
    'NEEDS_APPROVAL'           -- Necesita aprobación interna
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 10.3. CREAR TIPO ENUM PARA TIPO DE SERVICIO TÉCNICO
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.technical_service_type AS ENUM (
    'NEW_INSTALLATION',        -- Instalación nueva
    'PREVENTIVE_MAINTENANCE',  -- Mantenimiento preventivo
    'REPAIR',                  -- Reparación
    'UPGRADE',                 -- Actualización/Upgrade
    'TECH_SUPPORT'            -- Soporte técnico
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 10.4. CREAR TIPO ENUM PARA FRECUENCIA DE MANTENIMIENTO
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.maintenance_frequency AS ENUM (
    'MONTHLY',       -- Mensual
    'QUARTERLY',     -- Trimestral
    'ANNUAL',        -- Anual
    'ON_DEMAND'      -- Bajo demanda
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 10.5. CREAR TIPO ENUM PARA TIPO DE NOTA
-- ============================================
DO $$ BEGIN
  CREATE TYPE crm.location_note_type AS ENUM (
    'VISIT',           -- Visita realizada
    'PHONE_CALL',      -- Llamada telefónica
    'EMAIL',           -- Email enviado
    'WHATSAPP',        -- WhatsApp
    'MEETING',         -- Reunión
    'FOLLOW_UP',      -- Seguimiento
    'INCIDENT',        -- Incidencia
    'INTERNAL'         -- Nota interna
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 11. ELIMINAR TABLA EXISTENTE SI EXISTE (LIMPIAR)
-- ============================================
-- Primero eliminamos las referencias existentes
ALTER TABLE IF EXISTS quotes.quotes DROP CONSTRAINT IF EXISTS quotes_location_id_fkey;
ALTER TABLE IF EXISTS quotes.quotes DROP CONSTRAINT IF EXISTS quotes_client_location_id_fkey;

-- Eliminamos la tabla antigua si existe
DROP TABLE IF EXISTS crm.location CASCADE;
DROP TABLE IF EXISTS crm.locations CASCADE;

-- 12. CREAR TABLA: crm.location (Canvassing)
-- ============================================
CREATE TABLE crm.location (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Usuario que creó el punto (OBLIGATORIO - solo este usuario puede verlo)
  created_by UUID NOT NULL REFERENCES internal.authorized_users(id) ON DELETE CASCADE,
  
  -- Estado del Lead (Pin seleccionado)
  status crm.canvassing_status NOT NULL,
  
  -- A. INFORMACIÓN DE UBICACIÓN
  address TEXT, -- Opcional (se completa con geocodificación)
  city TEXT, -- Opcional (se completa con geocodificación)
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'ES',
  latitude NUMERIC(10,8) NOT NULL, -- OBLIGATORIO
  longitude NUMERIC(11,8) NOT NULL, -- OBLIGATORIO
  location_references TEXT, -- "Local junto a farmacia", "Edificio de oficinas planta 3"
  
  -- B. INFORMACIÓN DEL NEGOCIO/EMPRESA
  company_name TEXT NOT NULL, -- Nombre del comercio/empresa (OBLIGATORIO)
  business_type crm.business_type, -- Tipo de negocio
  business_size_sqm NUMERIC(10,2), -- Tamaño del local (m²)
  business_floors INTEGER, -- Número de plantas/espacios
  business_hours TEXT, -- Horario comercial
  years_in_operation INTEGER, -- Años en funcionamiento
  
  -- C. INFORMACIÓN DE CONTACTO
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_position TEXT, -- Cargo (Gerente, Propietario, Responsable de compras, etc.)
  contact_phone_primary TEXT,
  contact_phone_secondary TEXT,
  contact_email_primary TEXT,
  preferred_contact_method crm.contact_method,
  best_contact_time crm.contact_time,
  is_decision_maker BOOLEAN DEFAULT false, -- ¿Es quien toma decisiones?
  secondary_contact_name TEXT, -- Contacto secundario (Nombre)
  secondary_contact_phone TEXT, -- Contacto secundario (Teléfono)
  
  -- D. ESTADO Y CLASIFICACIÓN DEL LEAD
  priority crm.canvassing_priority DEFAULT 'MEDIUM',
  lead_score INTEGER CHECK (lead_score >= 0 AND lead_score <= 100), -- 0-100
  lead_source TEXT, -- Canvassing, Referido, Web, Llamada entrante, LinkedIn, Evento
  campaign_id UUID, -- Campaña asociada
  assigned_to UUID REFERENCES internal.authorized_users(id), -- Comercial asignado
  team_id UUID, -- Equipo asignado
  
  -- E. NECESIDADES Y SOLUCIONES AUDIOVISUALES
  av_solutions_required crm.av_solution_type[], -- Tipo de Solución Requerida (Selección múltiple)
  solution_details TEXT, -- Detalles de la Necesidad
  number_of_screens INTEGER, -- Número de pantallas/equipos necesarios
  equipment_locations TEXT, -- Ubicaciones específicas (Escaparate, interior, sala de espera, etc.)
  estimated_budget_range TEXT, -- < 5.000€, 5.000€ - 15.000€, etc.
  project_urgency TEXT, -- Inmediata, Corto plazo, Medio plazo, Largo plazo, Sin fecha definida
  
  -- F. SITUACIÓN ACTUAL DEL CLIENTE
  has_current_av_installation BOOLEAN DEFAULT false, -- ¿Tiene instalación audiovisual actual?
  current_provider TEXT, -- Proveedor actual
  installation_age_years INTEGER, -- Antigüedad de la instalación (años)
  current_installation_problems TEXT, -- Problemas con la instalación actual
  has_maintenance_contract BOOLEAN DEFAULT false, -- Contrato de mantenimiento activo
  maintenance_contract_provider TEXT, -- Con quién tiene el contrato
  maintenance_contract_end_date DATE, -- Fecha de finalización de contrato
  has_requested_competitor_quotes BOOLEAN DEFAULT false, -- ¿Ha solicitado presupuestos a competencia?
  competitors_contacted TEXT, -- Competidores contactados (Nombres)
  
  -- G. INFORMACIÓN COMERCIAL
  interest_level INTEGER CHECK (interest_level >= 1 AND interest_level <= 10), -- 1-10
  purchase_phase crm.purchase_phase, -- Fase del proceso de compra
  main_objections TEXT[], -- Objeciones principales (Selección múltiple)
  objections_other TEXT, -- Otras objeciones (especificar)
  economic_decision_maker_identified BOOLEAN DEFAULT false, -- Decisor económico identificado
  approval_process TEXT, -- Inmediato/Requiere junta/Requiere presupuestos comparativos
  
  -- H. CITAS Y SEGUIMIENTOS
  appointment_date DATE,
  appointment_time TIME,
  appointment_type crm.appointment_type,
  appointment_location TEXT, -- En el local del cliente/En oficina/Online
  callback_date DATE,
  callback_time TIME,
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_time_before TEXT, -- 15 min/30 min/1 hora/1 día antes
  
  -- I. ARCHIVOS ADJUNTOS (URLs)
  photos TEXT[], -- Fotos del local, fachada, interior, espacios específicos, instalación actual
  videos TEXT[],
  documents TEXT[], -- Presupuestos enviados, Contratos, Planos/Mediciones, Fichas técnicas, Presentaciones comerciales, Documentos de identidad/CIF
  audio_recordings TEXT[],
  screenshots TEXT[],
  
  -- J. INFORMACIÓN TÉCNICA (Para Servicio Técnico Subcontratado)
  technical_service_type crm.technical_service_type,
  maintenance_frequency crm.maintenance_frequency,
  proposed_maintenance_contract BOOLEAN DEFAULT false, -- Contrato de mantenimiento propuesto
  maintenance_contract_value NUMERIC(10,2), -- Valor del contrato anual (€)
  existing_equipment TEXT, -- Equipamiento existente (Marcas y modelos)
  has_active_warranties BOOLEAN DEFAULT false, -- Garantías activas
  warranty_end_date DATE, -- Hasta cuándo
  local_access_info TEXT, -- Acceso al local (Horarios, restricciones, contacto para acceso)
  
  -- K. TAGS/ETIQUETAS
  tags TEXT[], -- Sistema de etiquetas personalizables para búsqueda rápida
  
  -- L. DATOS DE TRACKING AUTOMÁTICO
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  modified_by UUID REFERENCES internal.authorized_users(id),
  visit_count INTEGER DEFAULT 0, -- Número de visitas realizadas
  total_time_invested_minutes INTEGER DEFAULT 0, -- Tiempo total invertido
  days_since_first_contact INTEGER, -- Días desde primer contacto (Cálculo automático)
  days_in_current_status INTEGER, -- Días en estado actual (Cálculo automático)
  response_rate NUMERIC(5,2), -- Tasa de respuesta (Llamadas/emails contestados vs enviados)
  status_history JSONB, -- Historial de cambios de estado [{status, date, user, reason, previous_status}]
  
  -- Constraints
  CONSTRAINT check_coordinates CHECK (
    latitude IS NOT NULL AND longitude IS NOT NULL AND
    latitude >= -90 AND latitude <= 90 AND
    longitude >= -180 AND longitude <= 180
  ),
  CONSTRAINT check_email_format CHECK (
    contact_email_primary IS NULL OR 
    contact_email_primary ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
  ),
  CONSTRAINT check_business_size CHECK (
    business_size_sqm IS NULL OR business_size_sqm > 0
  ),
  CONSTRAINT check_years_in_operation CHECK (
    years_in_operation IS NULL OR years_in_operation >= 0
  ),
  CONSTRAINT check_business_floors CHECK (
    business_floors IS NULL OR business_floors > 0
  )
);

-- 13. CREAR ÍNDICES
-- ============================================
CREATE INDEX idx_location_created_by ON crm.location(created_by);
CREATE INDEX idx_location_status ON crm.location(status);
CREATE INDEX idx_location_city ON crm.location(city, province);
CREATE INDEX idx_location_coordinates ON crm.location(latitude, longitude);
CREATE INDEX idx_location_assigned_to ON crm.location(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_location_appointment_date ON crm.location(appointment_date) WHERE appointment_date IS NOT NULL;
CREATE INDEX idx_location_callback_date ON crm.location(callback_date) WHERE callback_date IS NOT NULL;
CREATE INDEX idx_location_created_at ON crm.location(created_at DESC);
CREATE INDEX idx_location_company_name ON crm.location(company_name);
CREATE INDEX idx_location_business_type ON crm.location(business_type);
CREATE INDEX idx_location_tags ON crm.location USING GIN(tags);
CREATE INDEX idx_location_av_solutions ON crm.location USING GIN(av_solutions_required);
CREATE INDEX idx_location_status_history ON crm.location USING GIN(status_history);

-- 13.1. CREAR TABLA: crm.location_notes (Sistema de Notas)
-- ============================================
CREATE TABLE crm.location_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES crm.location(id) ON DELETE CASCADE,
  note_type crm.location_note_type NOT NULL DEFAULT 'INTERNAL',
  content TEXT NOT NULL,
  attachments TEXT[], -- URLs de archivos adjuntos
  created_by UUID NOT NULL REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ, -- Fecha de última edición
  edited_by UUID REFERENCES internal.authorized_users(id) -- Usuario que editó
);

-- Índices para notas
CREATE INDEX idx_location_notes_location ON crm.location_notes(location_id, created_at DESC);
CREATE INDEX idx_location_notes_type ON crm.location_notes(note_type);
CREATE INDEX idx_location_notes_user ON crm.location_notes(created_by);

-- RLS para notas
ALTER TABLE crm.location_notes ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios solo ven notas de sus propias ubicaciones
CREATE POLICY location_notes_user_policy ON crm.location_notes
  FOR ALL
  USING (
    location_id IN (
      SELECT id FROM crm.location WHERE created_by = internal.get_authorized_user_id(auth.uid())
    )
    OR internal.is_admin()
    OR internal.is_manager()
  );

-- 14. TRIGGER PARA updated_at
-- ============================================
CREATE TRIGGER update_location_updated_at
  BEFORE UPDATE ON crm.location
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

-- 15. FUNCIÓN PARA ACTUALIZAR HISTORIAL DE ESTADOS
-- ============================================
CREATE OR REPLACE FUNCTION crm.update_location_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, internal
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_history JSONB;
BEGIN
  -- Solo actualizar si cambió el status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_user_id := internal.get_authorized_user_id(auth.uid());
    
    -- Obtener nombre del usuario
    SELECT full_name INTO v_user_name
    FROM internal.authorized_users
    WHERE id = v_user_id;
    
    -- Obtener historial existente o inicializar
    v_history := COALESCE(NEW.status_history, '[]'::JSONB);
    
    -- Añadir nueva entrada al historial con motivo (se actualizará desde la app si se proporciona)
    v_history := v_history || jsonb_build_array(
      jsonb_build_object(
        'status', NEW.status::TEXT,
        'previous_status', OLD.status::TEXT,
        'date', now()::TEXT,
        'user_id', v_user_id::TEXT,
        'user_name', COALESCE(v_user_name, 'Usuario desconocido'),
        'reason', NULL -- Se actualizará desde la aplicación si se proporciona
      )
    );
    
    NEW.status_history := v_history;
    NEW.modified_by := v_user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_location_status_history
  BEFORE UPDATE ON crm.location
  FOR EACH ROW
  EXECUTE FUNCTION crm.update_location_status_history();

-- 16. HABILITAR RLS
-- ============================================
ALTER TABLE crm.location ENABLE ROW LEVEL SECURITY;

-- 17. POLÍTICAS RLS - SOLO EL USUARIO QUE CREÓ PUEDE VER/MODIFICAR
-- ============================================
-- Los usuarios solo pueden ver sus propios puntos de Canvassing
CREATE POLICY "Users can view own canvassing locations"
  ON crm.location
  FOR SELECT
  TO authenticated
  USING (created_by = internal.get_authorized_user_id(auth.uid()));

-- Los usuarios pueden crear sus propios puntos
CREATE POLICY "Users can create own canvassing locations"
  ON crm.location
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = internal.get_authorized_user_id(auth.uid()));

-- Los usuarios pueden actualizar sus propios puntos
CREATE POLICY "Users can update own canvassing locations"
  ON crm.location
  FOR UPDATE
  TO authenticated
  USING (created_by = internal.get_authorized_user_id(auth.uid()))
  WITH CHECK (created_by = internal.get_authorized_user_id(auth.uid()));

-- Los usuarios pueden eliminar sus propios puntos
CREATE POLICY "Users can delete own canvassing locations"
  ON crm.location
  FOR DELETE
  TO authenticated
  USING (created_by = internal.get_authorized_user_id(auth.uid()));

-- Admin y Manager pueden ver todos los puntos (para supervisión)
CREATE POLICY "Admin and manager can view all canvassing locations"
  ON crm.location
  FOR SELECT
  TO authenticated
  USING (internal.is_admin() OR internal.is_manager());

-- 18. FUNCIÓN RPC PARA LISTAR PUNTOS DE CANVASSING DEL USUARIO
-- ============================================
-- Eliminar función existente si tiene un tipo de retorno diferente
DROP FUNCTION IF EXISTS public.list_user_canvassing_locations(UUID);

-- Función en schema public para acceso desde PostgREST
CREATE OR REPLACE FUNCTION public.list_user_canvassing_locations(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  company_name TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_phone_primary TEXT,
  contact_email_primary TEXT,
  priority TEXT,
  lead_score INTEGER,
  appointment_date DATE,
  callback_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, internal, public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Si no se proporciona user_id, usar el del usuario autenticado
  v_user_id := COALESCE(p_user_id, internal.get_authorized_user_id(auth.uid()));
  
  -- Verificar permisos: solo el propio usuario o admin/manager
  IF v_user_id != internal.get_authorized_user_id(auth.uid()) AND 
     NOT (internal.is_admin() OR internal.is_manager()) THEN
    RAISE EXCEPTION 'No tienes permiso para ver estos puntos de Canvassing';
  END IF;
  
  RETURN QUERY
  SELECT 
    l.id,
    l.status::TEXT,
    l.company_name,
    l.address,
    l.city,
    l.province,
    l.postal_code,
    l.latitude,
    l.longitude,
    l.contact_first_name,
    l.contact_last_name,
    l.contact_phone_primary,
    l.contact_email_primary,
    l.priority::TEXT,
    l.lead_score,
    l.appointment_date,
    l.callback_date,
    l.created_at,
    l.updated_at
  FROM crm.location l
  WHERE l.created_by = v_user_id
  ORDER BY l.created_at DESC;
END;
$$;

-- Dar permisos para llamar la función
GRANT EXECUTE ON FUNCTION public.list_user_canvassing_locations TO authenticated, anon;

-- 19. FUNCIÓN RPC PARA CREAR PUNTO DE CANVASSING
-- ============================================
-- Primero eliminamos todas las posibles firmas de la función existente
DROP FUNCTION IF EXISTS public.create_canvassing_location(
  TEXT,
  NUMERIC,
  NUMERIC,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
);

-- Nueva firma con 10 parámetros (con p_company_name en 4ta posición)
DROP FUNCTION IF EXISTS public.create_canvassing_location(
  TEXT,
  NUMERIC,
  NUMERIC,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
);

DROP FUNCTION IF EXISTS crm.create_canvassing_location(
  crm.canvassing_status,
  NUMERIC,
  NUMERIC,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
);

-- Eliminar también por nombre sin parámetros (elimina todas las sobrecargas)
DROP FUNCTION IF EXISTS public.create_canvassing_location CASCADE;

-- Función en schema public para acceso desde PostgREST
CREATE OR REPLACE FUNCTION public.create_canvassing_location(
  p_status TEXT, -- OBLIGATORIO
  p_latitude NUMERIC, -- OBLIGATORIO
  p_longitude NUMERIC, -- OBLIGATORIO
  p_company_name TEXT, -- OBLIGATORIO
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_province TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_country TEXT DEFAULT 'ES',
  p_location_references TEXT DEFAULT NULL
)
RETURNS TABLE (location_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, internal, public
AS $$
DECLARE
  v_location_id UUID;
  v_user_id UUID;
  v_status crm.canvassing_status;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Validar campos obligatorios
  IF p_status IS NULL OR p_status = '' THEN
    RAISE EXCEPTION 'El estado del lead (PIN) es obligatorio';
  END IF;
  
  IF p_latitude IS NULL OR p_longitude IS NULL THEN
    RAISE EXCEPTION 'Las coordenadas son obligatorias';
  END IF;
  
  IF p_company_name IS NULL OR p_company_name = '' OR p_company_name = 'Sin nombre' THEN
    RAISE EXCEPTION 'El nombre del comercio es obligatorio';
  END IF;
  
  -- Convertir TEXT a ENUM
  v_status := p_status::crm.canvassing_status;
  
  INSERT INTO crm.location (
    created_by, -- Autoasignado automáticamente
    status, -- OBLIGATORIO
    latitude, -- OBLIGATORIO
    longitude, -- OBLIGATORIO
    company_name, -- OBLIGATORIO
    address,
    city,
    province,
    postal_code,
    country,
    location_references
  ) VALUES (
    v_user_id,
    v_status,
    p_latitude,
    p_longitude,
    p_company_name,
    p_address,
    p_city,
    p_province,
    p_postal_code,
    p_country,
    p_location_references
  )
  RETURNING id INTO v_location_id;
  
  RETURN QUERY SELECT v_location_id;
END;
$$;

-- Dar permisos para llamar la función
GRANT EXECUTE ON FUNCTION public.create_canvassing_location TO authenticated, anon;

-- 20. FUNCIÓN RPC PARA OBTENER UN PUNTO DE CANVASSING
-- ============================================
-- Función en schema public para acceso desde PostgREST
DROP FUNCTION IF EXISTS public.get_canvassing_location(UUID);

CREATE OR REPLACE FUNCTION public.get_canvassing_location(p_location_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  -- A. Ubicación
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  location_references TEXT,
  -- B. Negocio
  company_name TEXT,
  business_type TEXT,
  business_size_sqm NUMERIC,
  business_floors INTEGER,
  business_hours TEXT,
  years_in_operation INTEGER,
  -- C. Contacto
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_position TEXT,
  contact_phone_primary TEXT,
  contact_phone_secondary TEXT,
  contact_email_primary TEXT,
  preferred_contact_method TEXT,
  best_contact_time TEXT,
  is_decision_maker BOOLEAN,
  secondary_contact_name TEXT,
  secondary_contact_phone TEXT,
  -- D. Estado
  priority TEXT,
  lead_score INTEGER,
  lead_source TEXT,
  assigned_to UUID,
  team_id UUID,
  -- E. Soluciones AV
  av_solutions_required TEXT[],
  solution_details TEXT,
  number_of_screens INTEGER,
  equipment_locations TEXT,
  estimated_budget_range TEXT,
  project_urgency TEXT,
  -- F. Situación Actual
  has_current_av_installation BOOLEAN,
  current_provider TEXT,
  installation_age_years INTEGER,
  current_installation_problems TEXT,
  has_maintenance_contract BOOLEAN,
  maintenance_contract_provider TEXT,
  maintenance_contract_end_date DATE,
  has_requested_competitor_quotes BOOLEAN,
  competitors_contacted TEXT,
  -- G. Comercial
  interest_level INTEGER,
  purchase_phase TEXT,
  main_objections TEXT[],
  objections_other TEXT,
  economic_decision_maker_identified BOOLEAN,
  approval_process TEXT,
  -- H. Citas
  appointment_date DATE,
  appointment_time TIME,
  appointment_type TEXT,
  appointment_location TEXT,
  callback_date DATE,
  callback_time TIME,
  reminder_enabled BOOLEAN,
  reminder_time_before TEXT,
  -- I. Archivos
  photos TEXT[],
  videos TEXT[],
  documents TEXT[],
  -- J. Técnico
  technical_service_type TEXT,
  maintenance_frequency TEXT,
  proposed_maintenance_contract BOOLEAN,
  maintenance_contract_value NUMERIC,
  existing_equipment TEXT,
  has_active_warranties BOOLEAN,
  warranty_end_date DATE,
  local_access_info TEXT,
  -- K. Tags
  tags TEXT[],
  -- Tracking
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  status_history JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, internal
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  -- Verificar permisos: solo el creador o admin/manager
  IF NOT EXISTS (
    SELECT 1 FROM crm.location loc
    WHERE loc.id = p_location_id 
    AND (loc.created_by = v_user_id OR internal.is_admin() OR internal.is_manager())
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para ver este punto de Canvassing';
  END IF;
  
  RETURN QUERY
  SELECT 
    l.id,
    l.status::TEXT,
    -- A. Ubicación
    l.address,
    l.city,
    l.province,
    l.postal_code,
    l.country,
    l.latitude,
    l.longitude,
    l.location_references,
    -- B. Negocio
    l.company_name,
    l.business_type::TEXT,
    l.business_size_sqm,
    l.business_floors,
    l.business_hours,
    l.years_in_operation,
    -- C. Contacto
    l.contact_first_name,
    l.contact_last_name,
    l.contact_position,
    l.contact_phone_primary,
    l.contact_phone_secondary,
    l.contact_email_primary,
    l.preferred_contact_method::TEXT,
    l.best_contact_time::TEXT,
    l.is_decision_maker,
    l.secondary_contact_name,
    l.secondary_contact_phone,
    -- D. Estado
    l.priority::TEXT,
    l.lead_score,
    l.lead_source,
    l.assigned_to,
    l.team_id,
    -- E. Soluciones AV
    l.av_solutions_required::TEXT[],
    l.solution_details,
    l.number_of_screens,
    l.equipment_locations,
    l.estimated_budget_range,
    l.project_urgency,
    -- F. Situación Actual
    l.has_current_av_installation,
    l.current_provider,
    l.installation_age_years,
    l.current_installation_problems,
    l.has_maintenance_contract,
    l.maintenance_contract_provider,
    l.maintenance_contract_end_date,
    l.has_requested_competitor_quotes,
    l.competitors_contacted,
    -- G. Comercial
    l.interest_level,
    l.purchase_phase::TEXT,
    l.main_objections::TEXT[],
    l.objections_other,
    l.economic_decision_maker_identified,
    l.approval_process,
    -- H. Citas
    l.appointment_date,
    l.appointment_time,
    l.appointment_type::TEXT,
    l.appointment_location,
    l.callback_date,
    l.callback_time,
    l.reminder_enabled,
    l.reminder_time_before,
    -- I. Archivos
    l.photos,
    l.videos,
    l.documents,
    -- J. Técnico
    l.technical_service_type::TEXT,
    l.maintenance_frequency::TEXT,
    l.proposed_maintenance_contract,
    l.maintenance_contract_value,
    l.existing_equipment,
    l.has_active_warranties,
    l.warranty_end_date,
    l.local_access_info,
    -- K. Tags
    l.tags,
    -- Tracking
    l.created_at,
    l.updated_at,
    l.status_history
  FROM crm.location l
  WHERE l.id = p_location_id;
END;
$$;

-- Dar permisos para llamar la función
GRANT EXECUTE ON FUNCTION public.get_canvassing_location TO authenticated, anon;

-- 21. FUNCIÓN RPC PARA ACTUALIZAR PUNTO DE CANVASSING
-- ============================================
-- Función en schema public para acceso desde PostgREST
DROP FUNCTION IF EXISTS crm.update_canvassing_location(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.update_canvassing_location(
  p_location_id UUID,
  p_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, internal, public
AS $$
DECLARE
  v_user_id UUID;
  v_update_data JSONB;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  -- Verificar permisos: solo el creador puede actualizar
  IF NOT EXISTS (
    SELECT 1 FROM crm.location 
    WHERE id = p_location_id AND created_by = v_user_id
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para actualizar este punto de Canvassing';
  END IF;
  
  -- Construir objeto de actualización excluyendo campos que no se deben actualizar
  v_update_data := p_data - 'id' - 'created_by' - 'created_at';
  v_update_data := v_update_data || jsonb_build_object('modified_by', v_user_id);
  
  -- Actualizar la tabla (solo campos que existen en v_update_data)
  UPDATE crm.location
  SET 
    -- A. Ubicación
    address = COALESCE(v_update_data->>'address', address),
    city = COALESCE(v_update_data->>'city', city),
    province = COALESCE((v_update_data->>'province')::TEXT, province),
    postal_code = COALESCE((v_update_data->>'postal_code')::TEXT, postal_code),
    country = COALESCE((v_update_data->>'country')::TEXT, country),
    location_references = COALESCE((v_update_data->>'location_references')::TEXT, location_references),
    -- B. Negocio
    company_name = COALESCE((v_update_data->>'company_name')::TEXT, company_name),
    business_type = COALESCE((v_update_data->>'business_type')::crm.business_type, business_type),
    business_size_sqm = COALESCE((v_update_data->>'business_size_sqm')::NUMERIC, business_size_sqm),
    business_floors = COALESCE((v_update_data->>'business_floors')::INTEGER, business_floors),
    business_hours = COALESCE((v_update_data->>'business_hours')::TEXT, business_hours),
    years_in_operation = COALESCE((v_update_data->>'years_in_operation')::INTEGER, years_in_operation),
    -- C. Contacto
    contact_first_name = COALESCE((v_update_data->>'contact_first_name')::TEXT, contact_first_name),
    contact_last_name = COALESCE((v_update_data->>'contact_last_name')::TEXT, contact_last_name),
    contact_position = COALESCE((v_update_data->>'contact_position')::TEXT, contact_position),
    contact_phone_primary = COALESCE((v_update_data->>'contact_phone_primary')::TEXT, contact_phone_primary),
    contact_phone_secondary = COALESCE((v_update_data->>'contact_phone_secondary')::TEXT, contact_phone_secondary),
    contact_email_primary = COALESCE((v_update_data->>'contact_email_primary')::TEXT, contact_email_primary),
    preferred_contact_method = COALESCE((v_update_data->>'preferred_contact_method')::crm.contact_method, preferred_contact_method),
    best_contact_time = COALESCE((v_update_data->>'best_contact_time')::crm.contact_time, best_contact_time),
    is_decision_maker = COALESCE((v_update_data->>'is_decision_maker')::BOOLEAN, is_decision_maker),
    secondary_contact_name = COALESCE((v_update_data->>'secondary_contact_name')::TEXT, secondary_contact_name),
    secondary_contact_phone = COALESCE((v_update_data->>'secondary_contact_phone')::TEXT, secondary_contact_phone),
    -- D. Estado
    status = COALESCE((v_update_data->>'status')::crm.canvassing_status, status),
    priority = COALESCE((v_update_data->>'priority')::crm.canvassing_priority, priority),
    lead_score = COALESCE((v_update_data->>'lead_score')::INTEGER, lead_score),
    lead_source = COALESCE((v_update_data->>'lead_source')::TEXT, lead_source),
    assigned_to = COALESCE((v_update_data->>'assigned_to')::UUID, assigned_to),
    team_id = COALESCE((v_update_data->>'team_id')::UUID, team_id),
    -- E. Soluciones AV
    av_solutions_required = COALESCE((v_update_data->>'av_solutions_required')::crm.av_solution_type[], av_solutions_required),
    solution_details = COALESCE((v_update_data->>'solution_details')::TEXT, solution_details),
    number_of_screens = COALESCE((v_update_data->>'number_of_screens')::INTEGER, number_of_screens),
    equipment_locations = COALESCE((v_update_data->>'equipment_locations')::TEXT, equipment_locations),
    estimated_budget_range = COALESCE((v_update_data->>'estimated_budget_range')::TEXT, estimated_budget_range),
    project_urgency = COALESCE((v_update_data->>'project_urgency')::TEXT, project_urgency),
    -- F. Situación Actual
    has_current_av_installation = COALESCE((v_update_data->>'has_current_av_installation')::BOOLEAN, has_current_av_installation),
    current_provider = COALESCE((v_update_data->>'current_provider')::TEXT, current_provider),
    installation_age_years = COALESCE((v_update_data->>'installation_age_years')::INTEGER, installation_age_years),
    current_installation_problems = COALESCE((v_update_data->>'current_installation_problems')::TEXT, current_installation_problems),
    has_maintenance_contract = COALESCE((v_update_data->>'has_maintenance_contract')::BOOLEAN, has_maintenance_contract),
    maintenance_contract_provider = COALESCE((v_update_data->>'maintenance_contract_provider')::TEXT, maintenance_contract_provider),
    maintenance_contract_end_date = COALESCE((v_update_data->>'maintenance_contract_end_date')::DATE, maintenance_contract_end_date),
    has_requested_competitor_quotes = COALESCE((v_update_data->>'has_requested_competitor_quotes')::BOOLEAN, has_requested_competitor_quotes),
    competitors_contacted = COALESCE((v_update_data->>'competitors_contacted')::TEXT, competitors_contacted),
    -- G. Comercial
    interest_level = COALESCE((v_update_data->>'interest_level')::INTEGER, interest_level),
    purchase_phase = COALESCE((v_update_data->>'purchase_phase')::crm.purchase_phase, purchase_phase),
    main_objections = COALESCE((v_update_data->>'main_objections')::TEXT[], main_objections),
    objections_other = COALESCE((v_update_data->>'objections_other')::TEXT, objections_other),
    economic_decision_maker_identified = COALESCE((v_update_data->>'economic_decision_maker_identified')::BOOLEAN, economic_decision_maker_identified),
    approval_process = COALESCE((v_update_data->>'approval_process')::TEXT, approval_process),
    -- H. Citas
    appointment_date = COALESCE((v_update_data->>'appointment_date')::DATE, appointment_date),
    appointment_time = COALESCE((v_update_data->>'appointment_time')::TIME, appointment_time),
    appointment_type = COALESCE((v_update_data->>'appointment_type')::crm.appointment_type, appointment_type),
    appointment_location = COALESCE((v_update_data->>'appointment_location')::TEXT, appointment_location),
    callback_date = COALESCE((v_update_data->>'callback_date')::DATE, callback_date),
    callback_time = COALESCE((v_update_data->>'callback_time')::TIME, callback_time),
    reminder_enabled = COALESCE((v_update_data->>'reminder_enabled')::BOOLEAN, reminder_enabled),
    reminder_time_before = COALESCE((v_update_data->>'reminder_time_before')::TEXT, reminder_time_before),
    -- I. Archivos
    photos = COALESCE((v_update_data->>'photos')::TEXT[], photos),
    videos = COALESCE((v_update_data->>'videos')::TEXT[], videos),
    documents = COALESCE((v_update_data->>'documents')::TEXT[], documents),
    -- J. Técnico
    technical_service_type = COALESCE((v_update_data->>'technical_service_type')::crm.technical_service_type, technical_service_type),
    maintenance_frequency = COALESCE((v_update_data->>'maintenance_frequency')::crm.maintenance_frequency, maintenance_frequency),
    proposed_maintenance_contract = COALESCE((v_update_data->>'proposed_maintenance_contract')::BOOLEAN, proposed_maintenance_contract),
    maintenance_contract_value = COALESCE((v_update_data->>'maintenance_contract_value')::NUMERIC, maintenance_contract_value),
    existing_equipment = COALESCE((v_update_data->>'existing_equipment')::TEXT, existing_equipment),
    has_active_warranties = COALESCE((v_update_data->>'has_active_warranties')::BOOLEAN, has_active_warranties),
    warranty_end_date = COALESCE((v_update_data->>'warranty_end_date')::DATE, warranty_end_date),
    local_access_info = COALESCE((v_update_data->>'local_access_info')::TEXT, local_access_info),
    -- K. Tags
    tags = COALESCE((v_update_data->>'tags')::TEXT[], tags)
  WHERE id = p_location_id;
  
  RETURN p_location_id;
END;
$$;

-- Dar permisos para llamar la función
GRANT EXECUTE ON FUNCTION public.update_canvassing_location TO authenticated, anon;

-- 22. FUNCIONES RPC PARA NOTAS DE LOCATION
-- ============================================
-- Función para listar notas de una ubicación
CREATE OR REPLACE FUNCTION public.list_location_notes(p_location_id UUID)
RETURNS TABLE (
  id UUID,
  note_type TEXT,
  content TEXT,
  attachments TEXT[],
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  edited_by UUID,
  edited_by_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, internal, public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  -- Verificar permisos: solo el creador de la ubicación o admin/manager
  IF NOT EXISTS (
    SELECT 1 FROM crm.location loc
    WHERE loc.id = p_location_id 
    AND (loc.created_by = v_user_id OR internal.is_admin() OR internal.is_manager())
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para ver las notas de esta ubicación';
  END IF;
  
  RETURN QUERY
  SELECT 
    ln.id,
    ln.note_type::TEXT,
    ln.content,
    ln.attachments,
    ln.created_by,
    au_created.full_name AS created_by_name,
    ln.created_at,
    ln.updated_at,
    ln.edited_at,
    ln.edited_by,
    au_edited.full_name AS edited_by_name
  FROM crm.location_notes ln
  LEFT JOIN internal.authorized_users au_created ON au_created.id = ln.created_by
  LEFT JOIN internal.authorized_users au_edited ON au_edited.id = ln.edited_by
  WHERE ln.location_id = p_location_id
  ORDER BY ln.created_at DESC;
END;
$$;

-- Función para añadir una nota a una ubicación
CREATE OR REPLACE FUNCTION public.add_location_note(
  p_location_id UUID,
  p_content TEXT,
  p_note_type TEXT DEFAULT 'INTERNAL',
  p_attachments TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, internal, public
AS $$
DECLARE
  v_note_id UUID;
  v_user_id UUID;
  v_note_type_enum crm.location_note_type;
BEGIN
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  -- Verificar permisos: solo el creador de la ubicación o admin/manager
  IF NOT EXISTS (
    SELECT 1 FROM crm.location loc
    WHERE loc.id = p_location_id 
    AND (loc.created_by = v_user_id OR internal.is_admin() OR internal.is_manager())
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para añadir notas a esta ubicación';
  END IF;
  
  -- Convertir TEXT a ENUM
  v_note_type_enum := p_note_type::crm.location_note_type;
  
  INSERT INTO crm.location_notes (
    location_id,
    note_type,
    content,
    attachments,
    created_by
  ) VALUES (
    p_location_id,
    v_note_type_enum,
    p_content,
    p_attachments,
    v_user_id
  )
  RETURNING id INTO v_note_id;
  
  RETURN v_note_id;
END;
$$;

-- Dar permisos para las funciones de notas
GRANT EXECUTE ON FUNCTION public.list_location_notes TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.add_location_note TO authenticated, anon;

-- 23. COMENTARIOS EN LA TABLA
-- ============================================
COMMENT ON TABLE crm.location IS 'Puntos de Canvassing marcados por comerciales en el mapa. Cada punto está asociado únicamente al usuario que lo crea.';
COMMENT ON COLUMN crm.location.created_by IS 'Usuario que creó el punto. Solo este usuario puede verlo (excepto admin/manager).';
COMMENT ON COLUMN crm.location.status IS 'Estado del lead según el pin seleccionado (CB, CX, GB, NH, NI, OTH, DK, RNT, INT, APP, PRES, NEG)';
COMMENT ON COLUMN crm.location.status_history IS 'Historial JSON de cambios de estado: [{"status": "CB", "previous_status": "NH", "date": "2024-01-15T10:00:00Z", "user_id": "uuid", "user_name": "Nombre", "reason": "Motivo"}]';
COMMENT ON TABLE crm.location_notes IS 'Sistema de notas para ubicaciones de Canvassing. Similar al sistema de notas de clientes.';
