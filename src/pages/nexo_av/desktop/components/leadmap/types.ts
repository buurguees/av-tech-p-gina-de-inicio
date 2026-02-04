/** Tipos usados por componentes del mapa (CanvassingMapSidebar, etc.) */

export interface CanvassingLocation {
  id: string;
  status: string;
  company_name: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_phone_primary: string | null;
  contact_email_primary: string | null;
  priority: string | null;
  lead_score: number | null;
  appointment_date: string | null;
  callback_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanvassingStats {
  status: string;
  count: number;
}
