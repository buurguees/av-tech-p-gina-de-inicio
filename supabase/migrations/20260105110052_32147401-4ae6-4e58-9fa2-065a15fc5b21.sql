
-- ============================================
-- NEXOAV DATABASE - FASE 2: CRM
-- ============================================

-- 1. TABLA: crm.lead_sources (catálogo maestro)
-- ============================================
CREATE TABLE crm.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  cost_per_lead NUMERIC(10,2),
  conversion_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA: crm.clients (tabla principal)
-- ============================================
CREATE TABLE crm.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Campos mínimos (alta rápida - obligatorios)
  company_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  
  -- Campos adicionales (alta completa - opcionales)
  tax_id TEXT UNIQUE,
  legal_name TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_province TEXT,
  billing_postal_code TEXT,
  billing_country TEXT DEFAULT 'ES',
  website TEXT,
  instagram_handle TEXT,
  tiktok_handle TEXT,
  linkedin_url TEXT,
  number_of_locations INTEGER DEFAULT 1,
  industry_sector crm.industry_sector,
  approximate_budget NUMERIC(10,2),
  urgency crm.urgency_level,
  target_objectives TEXT[],
  
  -- Campos de gestión comercial
  lead_stage crm.lead_stage NOT NULL DEFAULT 'NEW',
  lead_source crm.lead_source,
  profile_completeness_score INTEGER DEFAULT 30,
  assigned_to UUID REFERENCES internal.authorized_users(id),
  next_follow_up_date DATE,
  estimated_close_date DATE,
  lost_reason TEXT,
  notes TEXT,
  
  -- Campos de control
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES internal.authorized_users(id),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT check_email_format CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT check_profile_score CHECK (profile_completeness_score >= 0 AND profile_completeness_score <= 100),
  CONSTRAINT check_locations CHECK (number_of_locations >= 1),
  CONSTRAINT check_budget CHECK (approximate_budget IS NULL OR approximate_budget >= 0)
);

-- Índices para clients
CREATE INDEX idx_clients_pipeline ON crm.clients(lead_stage, assigned_to, next_follow_up_date);
CREATE INDEX idx_clients_assigned ON crm.clients(assigned_to, lead_stage);
CREATE INDEX idx_clients_stage ON crm.clients(lead_stage, updated_at DESC);
CREATE INDEX idx_clients_tax_id ON crm.clients(tax_id) WHERE tax_id IS NOT NULL;
CREATE INDEX idx_clients_deleted ON crm.clients(deleted_at) WHERE deleted_at IS NULL;

-- 3. TABLA: crm.contacts
-- ============================================
CREATE TABLE crm.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  job_title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  contact_type crm.contact_type,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_contact_method CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Índices para contacts
CREATE INDEX idx_contacts_client ON crm.contacts(client_id);
CREATE INDEX idx_contacts_primary ON crm.contacts(client_id) WHERE is_primary = true;

-- 4. TABLA: crm.locations
-- ============================================
CREATE TABLE crm.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'ES',
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  is_headquarters BOOLEAN DEFAULT false,
  contact_person_onsite TEXT,
  access_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL) OR 
    (latitude IS NOT NULL AND longitude IS NOT NULL)
  )
);

-- Índices para locations
CREATE INDEX idx_locations_client ON crm.locations(client_id);
CREATE INDEX idx_locations_city ON crm.locations(city, country);

-- 5. TABLA: crm.interactions
-- ============================================
CREATE TABLE crm.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,
  interaction_type crm.interaction_type NOT NULL,
  interaction_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  subject TEXT,
  notes TEXT,
  outcome crm.interaction_outcome,
  next_action TEXT,
  created_by UUID NOT NULL REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT check_duration CHECK (duration_minutes IS NULL OR (duration_minutes >= 0 AND duration_minutes <= 480))
);

-- Índices para interactions
CREATE INDEX idx_interactions_client ON crm.interactions(client_id, interaction_date DESC);
CREATE INDEX idx_interactions_date ON crm.interactions(interaction_date DESC);
CREATE INDEX idx_interactions_user ON crm.interactions(created_by, interaction_date DESC);
CREATE INDEX idx_interactions_follow_up ON crm.interactions(outcome) WHERE outcome = 'FOLLOW_UP_NEEDED';

-- 6. FUNCIÓN: Calcular profile_completeness_score
-- ============================================
CREATE OR REPLACE FUNCTION crm.calculate_profile_score(p_client_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm
AS $$
DECLARE
  v_score INTEGER := 30; -- Base por alta rápida
  v_client crm.clients%ROWTYPE;
  v_has_contact BOOLEAN;
  v_has_location BOOLEAN;
BEGIN
  SELECT * INTO v_client FROM crm.clients WHERE id = p_client_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- +10 por tax_id
  IF v_client.tax_id IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  
  -- +10 por billing_address completo
  IF v_client.billing_address IS NOT NULL AND v_client.billing_city IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  
  -- +5 por website
  IF v_client.website IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;
  
  -- +5 por redes sociales
  IF v_client.instagram_handle IS NOT NULL OR v_client.tiktok_handle IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;
  
  -- +10 por industry_sector
  IF v_client.industry_sector IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  
  -- +5 por number_of_locations > 1
  IF v_client.number_of_locations > 1 THEN
    v_score := v_score + 5;
  END IF;
  
  -- +10 por approximate_budget
  IF v_client.approximate_budget IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  
  -- +10 por contacto adicional
  SELECT EXISTS(SELECT 1 FROM crm.contacts WHERE client_id = p_client_id) INTO v_has_contact;
  IF v_has_contact THEN
    v_score := v_score + 10;
  END IF;
  
  -- +15 por ubicación
  SELECT EXISTS(SELECT 1 FROM crm.locations WHERE client_id = p_client_id) INTO v_has_location;
  IF v_has_location THEN
    v_score := v_score + 5; -- Ajustado para no superar 100
  END IF;
  
  RETURN LEAST(v_score, 100);
END;
$$;

-- 7. TRIGGER: Actualizar profile_completeness_score automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION crm.update_client_profile_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm
AS $$
BEGIN
  NEW.profile_completeness_score := crm.calculate_profile_score(NEW.id);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_client_profile_score
  BEFORE UPDATE ON crm.clients
  FOR EACH ROW
  EXECUTE FUNCTION crm.update_client_profile_score();

-- Trigger para updated_at en otras tablas
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON crm.contacts
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON crm.locations
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

CREATE TRIGGER update_interactions_updated_at
  BEFORE UPDATE ON crm.interactions
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

CREATE TRIGGER update_lead_sources_updated_at
  BEFORE UPDATE ON crm.lead_sources
  FOR EACH ROW
  EXECUTE FUNCTION internal.update_updated_at_column();

-- 8. HABILITAR RLS
-- ============================================
ALTER TABLE crm.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.interactions ENABLE ROW LEVEL SECURITY;

-- 9. FUNCIÓN AUXILIAR: Verificar acceso a cliente
-- ============================================
CREATE OR REPLACE FUNCTION crm.can_access_client(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = crm, internal
AS $$
  SELECT 
    internal.is_admin() OR 
    internal.is_manager() OR 
    internal.is_readonly() OR
    (internal.is_sales() AND EXISTS (
      SELECT 1 FROM crm.clients 
      WHERE id = p_client_id 
      AND assigned_to = internal.get_authorized_user_id(auth.uid())
    ))
$$;

-- 10. POLÍTICAS RLS PARA crm.lead_sources
-- ============================================
CREATE POLICY "Authenticated can view lead sources"
  ON crm.lead_sources
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage lead sources"
  ON crm.lead_sources
  FOR ALL
  USING (internal.is_admin())
  WITH CHECK (internal.is_admin());

-- 11. POLÍTICAS RLS PARA crm.clients
-- ============================================

-- Admin, manager y readonly pueden ver todos
CREATE POLICY "Admin manager readonly can view all clients"
  ON crm.clients
  FOR SELECT
  USING (
    internal.is_admin() OR 
    internal.is_manager() OR 
    internal.is_readonly()
  );

-- Sales solo ve los asignados a él
CREATE POLICY "Sales can view assigned clients"
  ON crm.clients
  FOR SELECT
  USING (
    internal.is_sales() AND 
    assigned_to = internal.get_authorized_user_id(auth.uid())
  );

-- Admin y manager pueden crear
CREATE POLICY "Admin manager sales can create clients"
  ON crm.clients
  FOR INSERT
  WITH CHECK (
    internal.is_admin() OR 
    internal.is_manager() OR 
    internal.is_sales()
  );

-- Admin y manager pueden editar todos
CREATE POLICY "Admin manager can update all clients"
  ON crm.clients
  FOR UPDATE
  USING (internal.is_admin() OR internal.is_manager())
  WITH CHECK (internal.is_admin() OR internal.is_manager());

-- Sales puede editar sus asignados
CREATE POLICY "Sales can update assigned clients"
  ON crm.clients
  FOR UPDATE
  USING (
    internal.is_sales() AND 
    assigned_to = internal.get_authorized_user_id(auth.uid())
  )
  WITH CHECK (
    internal.is_sales() AND 
    assigned_to = internal.get_authorized_user_id(auth.uid())
  );

-- Solo admin puede eliminar (soft delete)
CREATE POLICY "Admin can delete clients"
  ON crm.clients
  FOR DELETE
  USING (internal.is_admin());

-- 12. POLÍTICAS RLS PARA crm.contacts (heredan de clients)
-- ============================================
CREATE POLICY "Users can view contacts of accessible clients"
  ON crm.contacts
  FOR SELECT
  USING (crm.can_access_client(client_id));

CREATE POLICY "Users can manage contacts of accessible clients"
  ON crm.contacts
  FOR ALL
  USING (crm.can_access_client(client_id))
  WITH CHECK (crm.can_access_client(client_id));

-- 13. POLÍTICAS RLS PARA crm.locations (heredan de clients)
-- ============================================
CREATE POLICY "Users can view locations of accessible clients"
  ON crm.locations
  FOR SELECT
  USING (crm.can_access_client(client_id));

CREATE POLICY "Users can manage locations of accessible clients"
  ON crm.locations
  FOR ALL
  USING (crm.can_access_client(client_id))
  WITH CHECK (crm.can_access_client(client_id));

-- 14. POLÍTICAS RLS PARA crm.interactions (heredan de clients)
-- ============================================
CREATE POLICY "Users can view interactions of accessible clients"
  ON crm.interactions
  FOR SELECT
  USING (crm.can_access_client(client_id));

CREATE POLICY "Users can manage interactions of accessible clients"
  ON crm.interactions
  FOR ALL
  USING (crm.can_access_client(client_id))
  WITH CHECK (crm.can_access_client(client_id));

-- 15. INSERTAR DATOS INICIALES (SEED) - Lead Sources
-- ============================================
INSERT INTO crm.lead_sources (code, display_name, description, is_active) VALUES
  ('WEBSITE', 'Sitio Web', 'Formulario de contacto web', true),
  ('INSTAGRAM', 'Instagram', 'Mensajes directos o comentarios', true),
  ('REFERRAL', 'Recomendación', 'Cliente o contacto existente', true),
  ('OUTBOUND', 'Prospección Activa', 'Llamadas en frío o emails comerciales', true),
  ('TRADE_SHOW', 'Feria/Evento', 'Contactos en ferias del sector', true),
  ('PARTNER', 'Partner/Colaborador', 'Arquitectos, interioristas, agencias', true),
  ('LINKEDIN', 'LinkedIn', 'Mensajes o InMail', true),
  ('OTHER', 'Otro', 'Origen no clasificado', true);
