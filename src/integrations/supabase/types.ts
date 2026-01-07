export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_quote_line: {
        Args: {
          p_concept: string
          p_description?: string
          p_discount_percent?: number
          p_quantity?: number
          p_quote_id: string
          p_tax_rate?: number
          p_unit_price?: number
        }
        Returns: string
      }
      assign_user_role: {
        Args: { p_assigned_by: string; p_role_name: string; p_user_id: string }
        Returns: boolean
      }
      check_email_exists: { Args: { p_email: string }; Returns: boolean }
      clear_user_roles: { Args: { p_user_id: string }; Returns: undefined }
      create_authorized_user: {
        Args: {
          p_auth_user_id: string
          p_department: string
          p_email: string
          p_full_name: string
          p_job_position: string
          p_phone: string
        }
        Returns: string
      }
      create_client: {
        Args: {
          p_assigned_to?: string
          p_company_name: string
          p_contact_email: string
          p_contact_phone: string
          p_created_by?: string
          p_industry_sector?: string
          p_lead_source?: string
          p_lead_stage?: string
          p_legal_name?: string
          p_notes?: string
          p_tax_id?: string
        }
        Returns: string
      }
      create_project: {
        Args: {
          p_client_id: string
          p_client_order_number?: string
          p_local_name?: string
          p_notes?: string
          p_project_address?: string
          p_project_city?: string
          p_status?: string
        }
        Returns: {
          project_id: string
          project_name: string
          project_number: string
        }[]
      }
      create_quote: {
        Args: {
          p_client_id: string
          p_created_by?: string
          p_project_name?: string
        }
        Returns: string
      }
      create_quote_with_number: {
        Args: {
          p_client_id: string
          p_project_name?: string
          p_valid_until?: string
        }
        Returns: {
          quote_id: string
          quote_number: string
        }[]
      }
      delete_authorized_user: { Args: { p_user_id: string }; Returns: string }
      delete_client: { Args: { p_client_id: string }; Returns: boolean }
      delete_quote_line: { Args: { p_line_id: string }; Returns: boolean }
      get_authorized_user_by_auth_id: {
        Args: { p_auth_user_id: string }
        Returns: {
          email: string
          id: string
          is_active: boolean
        }[]
      }
      get_client: {
        Args: { p_client_id: string }
        Returns: {
          approximate_budget: number
          assigned_to: string
          billing_address: string
          billing_city: string
          billing_country: string
          billing_postal_code: string
          billing_province: string
          company_name: string
          contact_email: string
          contact_phone: string
          created_at: string
          estimated_close_date: string
          id: string
          industry_sector: string
          instagram_handle: string
          lead_source: string
          lead_stage: string
          legal_name: string
          linkedin_url: string
          lost_reason: string
          next_follow_up_date: string
          notes: string
          number_of_locations: number
          target_objectives: string[]
          tax_id: string
          tiktok_handle: string
          updated_at: string
          urgency: string
          website: string
        }[]
      }
      get_current_user_info: {
        Args: never
        Returns: {
          department: "COMMERCIAL" | "TECHNICAL" | "ADMIN" | "DIRECTION"
          email: string
          full_name: string
          job_position: string
          phone: string
          roles: string[]
          user_id: string
        }[]
      }
      get_project: {
        Args: { p_project_id: string }
        Returns: {
          client_id: string
          client_name: string
          client_order_number: string
          created_at: string
          created_by: string
          created_by_name: string
          id: string
          local_name: string
          notes: string
          project_address: string
          project_city: string
          project_name: string
          project_number: string
          quote_id: string
          status: string
          updated_at: string
        }[]
      }
      get_quote: {
        Args: { p_quote_id: string }
        Returns: {
          client_id: string
          client_name: string
          created_at: string
          created_by: string
          created_by_name: string
          id: string
          notes: string
          order_number: string
          project_name: string
          quote_number: string
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
          valid_until: string
        }[]
      }
      get_quote_lines: {
        Args: { p_quote_id: string }
        Returns: {
          concept: string
          description: string
          discount_percent: number
          id: string
          line_order: number
          quantity: number
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          unit_price: number
        }[]
      }
      get_user_auth_id: { Args: { p_user_id: string }; Returns: string }
      get_user_roles_by_user_id: {
        Args: { p_user_id: string }
        Returns: {
          role_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_contact_message: {
        Args: {
          _email: string
          _empresa: string
          _ip_address?: unknown
          _mensaje: string
          _nombre: string
          _telefono: string
          _tipo_espacio: string
          _tipo_solicitud: string
          _user_agent?: string
        }
        Returns: string
      }
      is_allowed_domain: { Args: { _email: string }; Returns: boolean }
      is_email_authorized: { Args: { p_email: string }; Returns: boolean }
      list_assignable_users: {
        Args: never
        Returns: {
          department: string
          email: string
          full_name: string
          id: string
        }[]
      }
      list_authorized_users: {
        Args: never
        Returns: {
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          job_position: string
          last_login_at: string
          phone: string
          roles: string[]
        }[]
      }
      list_clients: {
        Args: { p_lead_stage?: string; p_search?: string }
        Returns: {
          assigned_to: string
          assigned_to_name: string
          company_name: string
          contact_email: string
          contact_phone: string
          created_at: string
          id: string
          industry_sector: string
          lead_source: string
          lead_stage: string
          legal_name: string
          next_follow_up_date: string
          notes: string
          tax_id: string
          urgency: string
        }[]
      }
      list_projects: {
        Args: { p_search?: string; p_status?: string }
        Returns: {
          client_id: string
          client_name: string
          client_order_number: string
          created_at: string
          created_by: string
          created_by_name: string
          id: string
          local_name: string
          project_address: string
          project_city: string
          project_name: string
          project_number: string
          status: string
        }[]
      }
      list_quotes: {
        Args: { p_search?: string; p_status?: string }
        Returns: {
          client_id: string
          client_name: string
          created_at: string
          created_by: string
          created_by_name: string
          id: string
          order_number: string
          project_name: string
          quote_number: string
          status: string
          subtotal: number
          tax_amount: number
          total: number
          valid_until: string
        }[]
      }
      list_roles: {
        Args: never
        Returns: {
          display_name: string
          id: string
          level: number
          name: string
        }[]
      }
      toggle_user_status: {
        Args: { p_is_active: boolean; p_user_id: string }
        Returns: boolean
      }
      update_authorized_user: {
        Args: {
          p_department: string
          p_full_name: string
          p_is_active: boolean
          p_job_position: string
          p_phone: string
          p_user_id: string
        }
        Returns: boolean
      }
      update_client: {
        Args: {
          p_assigned_to?: string
          p_billing_address?: string
          p_billing_city?: string
          p_billing_country?: string
          p_billing_postal_code?: string
          p_billing_province?: string
          p_client_id: string
          p_company_name?: string
          p_contact_email?: string
          p_contact_phone?: string
          p_created_at?: string
          p_industry_sector?: string
          p_lead_source?: string
          p_lead_stage?: string
          p_legal_name?: string
          p_next_follow_up_date?: string
          p_notes?: string
          p_tax_id?: string
          p_urgency?: string
          p_website?: string
        }
        Returns: boolean
      }
      update_own_user_info: {
        Args: {
          p_full_name?: string
          p_job_position?: string
          p_phone?: string
          p_user_id: string
        }
        Returns: boolean
      }
      update_project: {
        Args: {
          p_client_order_number?: string
          p_local_name?: string
          p_notes?: string
          p_project_address?: string
          p_project_city?: string
          p_project_id: string
          p_status?: string
        }
        Returns: boolean
      }
      update_quote: {
        Args: {
          p_client_id?: string
          p_notes?: string
          p_project_name?: string
          p_quote_id: string
          p_status?: string
          p_valid_until?: string
        }
        Returns: boolean
      }
      update_quote_line: {
        Args: {
          p_concept?: string
          p_description?: string
          p_discount_percent?: number
          p_line_id: string
          p_quantity?: number
          p_tax_rate?: number
          p_unit_price?: number
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "comercial" | "tecnico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "comercial", "tecnico"],
    },
  },
} as const
