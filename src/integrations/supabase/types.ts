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
      company_settings: {
        Row: {
          billing_email: string | null
          billing_phone: string | null
          commercial_name: string | null
          company_type: string | null
          country: string | null
          created_at: string
          fiscal_address: string
          fiscal_city: string
          fiscal_postal_code: string
          fiscal_province: string
          id: string
          legal_name: string
          logo_url: string | null
          tax_id: string
          updated_at: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          billing_email?: string | null
          billing_phone?: string | null
          commercial_name?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          fiscal_address: string
          fiscal_city: string
          fiscal_postal_code: string
          fiscal_province: string
          id?: string
          legal_name: string
          logo_url?: string | null
          tax_id: string
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          billing_email?: string | null
          billing_phone?: string | null
          commercial_name?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          fiscal_address?: string
          fiscal_city?: string
          fiscal_postal_code?: string
          fiscal_province?: string
          id?: string
          legal_name?: string
          logo_url?: string | null
          tax_id?: string
          updated_at?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
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
      add_invoice_line: {
        Args: {
          p_concept: string
          p_description?: string
          p_discount_percent?: number
          p_invoice_id: string
          p_quantity?: number
          p_tax_rate?: number
          p_unit_price?: number
        }
        Returns: string
      }
      add_pack_item: {
        Args: { p_pack_id: string; p_product_id: string; p_quantity?: number }
        Returns: string
      }
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
      audit_get_stats: {
        Args: { p_days?: number }
        Returns: {
          error_events: number
          events_by_category: Json
          events_by_type: Json
          security_events: number
          total_events: number
          warning_events: number
        }[]
      }
      audit_list_events: {
        Args: {
          p_event_category?: string
          p_event_type?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_severity?: string
        }
        Returns: {
          created_at: string
          details: Json
          event_category: string
          event_type: string
          id: string
          ip_address: unknown
          resource_id: string
          resource_type: string
          session_id: string
          severity: string
          total_count: number
          user_agent: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      check_email_exists: { Args: { p_email: string }; Returns: boolean }
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_identifier_type: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          remaining_attempts: number
          retry_after_seconds: number
        }[]
      }
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
      create_invitation_token: {
        Args: { p_expires_at: string; p_token: string; p_user_id: string }
        Returns: undefined
      }
      create_invoice_from_quote: {
        Args: { p_quote_id: string }
        Returns: {
          invoice_id: string
          invoice_number: string
        }[]
      }
      create_product:
        | {
            Args: {
              p_base_price?: number
              p_category_id: string
              p_cost_price?: number
              p_description?: string
              p_name?: string
              p_stock?: number
              p_subcategory_id?: string
              p_tax_rate?: number
              p_type?: Database["public"]["Enums"]["product_type"]
            }
            Returns: {
              product_id: string
              product_number: string
            }[]
          }
        | {
            Args: {
              p_base_price?: number
              p_category_id: string
              p_cost_price?: number
              p_default_tax_id?: string
              p_description?: string
              p_name?: string
              p_stock?: number
              p_subcategory_id?: string
              p_tax_rate?: number
              p_type?: Database["public"]["Enums"]["product_type"]
            }
            Returns: {
              product_id: string
              product_number: string
            }[]
          }
      create_product_category:
        | {
            Args: {
              p_code: string
              p_description?: string
              p_display_order?: number
              p_name: string
            }
            Returns: string
          }
        | {
            Args: {
              p_code: string
              p_description?: string
              p_display_order?: number
              p_name: string
              p_type?: string
            }
            Returns: string
          }
      create_product_pack: {
        Args: {
          p_description?: string
          p_discount_percent?: number
          p_name?: string
          p_tax_rate?: number
        }
        Returns: {
          pack_id: string
          pack_number: string
        }[]
      }
      create_product_subcategory: {
        Args: {
          p_category_id: string
          p_code: string
          p_description?: string
          p_display_order?: number
          p_name: string
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
      create_quote_with_number:
        | {
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
        | {
            Args: {
              p_client_id: string
              p_project_id?: string
              p_project_name?: string
              p_valid_until?: string
            }
            Returns: {
              quote_id: string
              quote_number: string
            }[]
          }
      create_tax: {
        Args: {
          p_code: string
          p_description?: string
          p_is_default?: boolean
          p_name: string
          p_rate: number
          p_tax_type: string
        }
        Returns: string
      }
      delete_authorized_user: { Args: { p_user_id: string }; Returns: string }
      delete_client: { Args: { p_client_id: string }; Returns: boolean }
      delete_invoice_line: { Args: { p_line_id: string }; Returns: boolean }
      delete_product: { Args: { p_product_id: string }; Returns: boolean }
      delete_product_category: {
        Args: { p_category_id: string }
        Returns: boolean
      }
      delete_product_pack: { Args: { p_pack_id: string }; Returns: boolean }
      delete_product_subcategory: {
        Args: { p_subcategory_id: string }
        Returns: boolean
      }
      delete_quote_line: { Args: { p_line_id: string }; Returns: boolean }
      delete_tax: { Args: { p_tax_id: string }; Returns: boolean }
      generate_otp: {
        Args: { p_email: string; p_ip_address?: unknown; p_user_agent?: string }
        Returns: string
      }
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
      get_company_settings: {
        Args: never
        Returns: {
          billing_email: string
          billing_phone: string
          commercial_name: string
          company_type: string
          country: string
          created_at: string
          fiscal_address: string
          fiscal_city: string
          fiscal_postal_code: string
          fiscal_province: string
          id: string
          legal_name: string
          logo_url: string
          tax_id: string
          updated_at: string
          vat_number: string
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
      get_invoice: {
        Args: { p_invoice_id: string }
        Returns: {
          client_id: string
          client_name: string
          created_at: string
          created_by: string
          created_by_name: string
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          notes: string
          project_id: string
          project_name: string
          source_quote_id: string
          source_quote_number: string
          status: string
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
        }[]
      }
      get_invoice_lines: {
        Args: { p_invoice_id: string }
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
      get_next_invoice_number: { Args: never; Returns: string }
      get_pack_items: {
        Args: { p_pack_id: string }
        Returns: {
          id: string
          product_id: string
          product_name: string
          product_number: string
          quantity: number
          subtotal: number
          unit_price: number
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
      get_user_auth_id_by_email: { Args: { p_email: string }; Returns: string }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
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
          invitation_days_remaining: number
          invitation_expires_at: string
          invitation_sent_at: string
          is_active: boolean
          job_position: string
          last_login_at: string
          phone: string
          roles: string[]
          setup_completed: boolean
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
      list_invoices: {
        Args: { p_search?: string; p_status?: string }
        Returns: {
          client_id: string
          client_name: string
          created_at: string
          created_by: string
          created_by_name: string
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          project_id: string
          project_name: string
          source_quote_id: string
          source_quote_number: string
          status: string
          subtotal: number
          tax_amount: number
          total: number
        }[]
      }
      list_product_categories: {
        Args: never
        Returns: {
          code: string
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          product_count: number
          subcategory_count: number
          updated_at: string
        }[]
      }
      list_product_packs: {
        Args: { p_search?: string }
        Returns: {
          base_price: number
          created_at: string
          description: string
          discount_percent: number
          final_price: number
          id: string
          is_active: boolean
          name: string
          pack_number: string
          price_with_tax: number
          product_count: number
          tax_rate: number
          updated_at: string
        }[]
      }
      list_product_subcategories: {
        Args: { p_category_id?: string }
        Returns: {
          category_code: string
          category_id: string
          category_name: string
          code: string
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          product_count: number
          updated_at: string
        }[]
      }
      list_products: {
        Args: {
          p_category_id?: string
          p_search?: string
          p_subcategory_id?: string
        }
        Returns: {
          base_price: number
          category_code: string
          category_id: string
          category_name: string
          cost_price: number
          created_at: string
          default_tax_id: string
          description: string
          id: string
          is_active: boolean
          name: string
          price_with_tax: number
          product_number: string
          stock: number
          subcategory_code: string
          subcategory_id: string
          subcategory_name: string
          tax_rate: number
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
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
      list_quotes:
        | {
            Args: { p_search?: string }
            Returns: {
              client_id: string
              client_name: string
              created_at: string
              created_by: string
              created_by_name: string
              id: string
              order_number: string
              project_id: string
              project_name: string
              project_number: string
              quote_number: string
              status: string
              subtotal: number
              tax_amount: number
              total: number
              valid_until: string
            }[]
          }
        | {
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
      list_taxes: {
        Args: { p_tax_type?: string }
        Returns: {
          code: string
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          rate: number
          tax_type: string
          updated_at: string
        }[]
      }
      mark_invitation_token_used: {
        Args: { p_token: string }
        Returns: undefined
      }
      record_login_attempt: {
        Args: {
          p_identifier: string
          p_identifier_type: string
          p_ip_address?: unknown
          p_success: boolean
          p_user_agent?: string
        }
        Returns: undefined
      }
      remove_pack_item: { Args: { p_item_id: string }; Returns: boolean }
      reset_rate_limit: {
        Args: { p_identifier: string; p_identifier_type: string }
        Returns: undefined
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
      update_invoice: {
        Args: {
          p_due_date?: string
          p_invoice_id: string
          p_issue_date?: string
          p_notes?: string
          p_status?: string
        }
        Returns: boolean
      }
      update_invoice_line: {
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
      update_own_user_info: {
        Args: {
          p_full_name?: string
          p_job_position?: string
          p_phone?: string
          p_user_id: string
        }
        Returns: boolean
      }
      update_pack_item: {
        Args: { p_item_id: string; p_quantity: number }
        Returns: boolean
      }
      update_product:
        | {
            Args: {
              p_base_price?: number
              p_cost_price?: number
              p_description?: string
              p_is_active?: boolean
              p_name?: string
              p_product_id: string
              p_tax_rate?: number
            }
            Returns: boolean
          }
        | {
            Args: {
              p_base_price?: number
              p_cost_price?: number
              p_description?: string
              p_is_active?: boolean
              p_name?: string
              p_product_id: string
              p_stock?: number
              p_tax_rate?: number
              p_type?: Database["public"]["Enums"]["product_type"]
            }
            Returns: boolean
          }
        | {
            Args: {
              p_base_price?: number
              p_cost_price?: number
              p_default_tax_id?: string
              p_description?: string
              p_is_active?: boolean
              p_name?: string
              p_product_id: string
              p_stock?: number
              p_tax_rate?: number
              p_type?: Database["public"]["Enums"]["product_type"]
            }
            Returns: boolean
          }
      update_product_category:
        | {
            Args: {
              p_category_id: string
              p_code?: string
              p_description?: string
              p_display_order?: number
              p_is_active?: boolean
              p_name?: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_category_id: string
              p_code?: string
              p_description?: string
              p_display_order?: number
              p_is_active?: boolean
              p_name?: string
              p_type?: string
            }
            Returns: boolean
          }
      update_product_pack: {
        Args: {
          p_description?: string
          p_discount_percent?: number
          p_is_active?: boolean
          p_name?: string
          p_pack_id: string
          p_tax_rate?: number
        }
        Returns: boolean
      }
      update_product_subcategory: {
        Args: {
          p_code?: string
          p_description?: string
          p_display_order?: number
          p_is_active?: boolean
          p_name?: string
          p_subcategory_id: string
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
      update_tax: {
        Args: {
          p_code?: string
          p_description?: string
          p_display_order?: number
          p_is_active?: boolean
          p_is_default?: boolean
          p_name?: string
          p_rate?: number
          p_tax_id: string
        }
        Returns: boolean
      }
      upsert_company_settings: {
        Args: {
          p_billing_email?: string
          p_billing_phone?: string
          p_commercial_name?: string
          p_company_type?: string
          p_country?: string
          p_fiscal_address?: string
          p_fiscal_city?: string
          p_fiscal_postal_code?: string
          p_fiscal_province?: string
          p_legal_name: string
          p_logo_url?: string
          p_tax_id: string
          p_vat_number?: string
          p_website?: string
        }
        Returns: string
      }
      validate_invitation_token: {
        Args: { p_email: string; p_token: string }
        Returns: {
          error_message: string
          is_valid: boolean
          user_id: string
        }[]
      }
      verify_otp: {
        Args: { p_code: string; p_email: string }
        Returns: {
          message: string
          remaining_attempts: number
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "comercial" | "tecnico"
      product_type: "product" | "service"
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
      product_type: ["product", "service"],
    },
  },
} as const
