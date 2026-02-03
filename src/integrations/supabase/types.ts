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
      scanned_documents: {
        Row: {
          assigned_to_id: string | null
          assigned_to_type: string | null
          created_at: string
          created_by: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to_id?: string | null
          assigned_to_type?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          file_path: string
          file_size?: number
          file_type?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to_id?: string | null
          assigned_to_type?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
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
      add_catalog_bundle_component: {
        Args: {
          p_bundle_product_id: string
          p_component_product_id: string
          p_quantity?: number
        }
        Returns: boolean
      }
      add_client_note: {
        Args: { p_client_id: string; p_content: string; p_note_type?: string }
        Returns: string
      }
      add_invoice_line: {
        Args: {
          p_concept: string
          p_description?: string
          p_discount_percent?: number
          p_invoice_id: string
          p_product_id?: string
          p_quantity?: number
          p_tax_id?: string
          p_tax_rate?: number
          p_unit_price?: number
        }
        Returns: string
      }
      add_location_note: {
        Args: {
          p_attachments?: string[]
          p_content: string
          p_location_id: string
          p_note_type?: string
        }
        Returns: string
      }
      add_pack_item: {
        Args: { p_pack_id: string; p_product_id: string; p_quantity?: number }
        Returns: string
      }
      add_project_expense: {
        Args: {
          p_amount: number
          p_category: string
          p_date: string
          p_description: string
          p_notes?: string
          p_project_id: string
        }
        Returns: string
      }
      add_purchase_invoice_line: {
        Args: {
          p_concept: string
          p_description?: string
          p_discount_percent?: number
          p_invoice_id: string
          p_product_id?: string
          p_quantity?: number
          p_tax_rate?: number
          p_unit_price?: number
          p_withholding_tax_rate?: number
        }
        Returns: string
      }
      add_purchase_order_line: {
        Args: {
          p_concept: string
          p_description?: string
          p_discount_percent?: number
          p_group_name?: string
          p_order_id: string
          p_quantity?: number
          p_tax_rate?: number
          p_unit?: string
          p_unit_price?: number
          p_withholding_rate?: number
        }
        Returns: string
      }
      add_quote_line:
        | {
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
        | {
            Args: {
              p_concept: string
              p_description?: string
              p_discount_percent?: number
              p_group_name?: string
              p_line_order?: number
              p_quantity?: number
              p_quote_id: string
              p_tax_rate?: number
              p_unit_price?: number
            }
            Returns: string
          }
      admin_update_payroll_settings: {
        Args: { p_patch: Json; p_reason: string }
        Returns: undefined
      }
      admin_update_report_settings: {
        Args: { p_patch: Json }
        Returns: undefined
      }
      admin_upsert_partner_payroll_profile: {
        Args: {
          p_base_salary?: number
          p_bonus_cap_override?: number
          p_bonus_enabled_override?: boolean
          p_irpf_rate?: number
          p_partner_id: string
        }
        Returns: Json
      }
      approve_purchase_invoice: {
        Args: { p_invoice_id: string }
        Returns: {
          invoice_number: string
          is_locked: boolean
        }[]
      }
      approve_purchase_order: { Args: { p_order_id: string }; Returns: boolean }
      assert_period_not_closed: { Args: { p_date: string }; Returns: boolean }
      assign_user_role: {
        Args: { p_assigned_by: string; p_role_name: string; p_user_id: string }
        Returns: boolean
      }
      assign_worker_type: {
        Args: {
          p_iban?: string
          p_tax_id?: string
          p_user_id: string
          p_worker_type: string
        }
        Returns: string
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
      auto_close_previous_month_if_tenth: {
        Args: never
        Returns: {
          action: string
          closed_month: number
          closed_year: number
        }[]
      }
      auto_save_quote_line: {
        Args: {
          p_concept: string
          p_description?: string
          p_discount_percent?: number
          p_group_name?: string
          p_line_id?: string
          p_line_order?: number
          p_quantity?: number
          p_quote_id: string
          p_tax_rate?: number
          p_unit_price?: number
        }
        Returns: Json
      }
      auto_save_quote_notes: {
        Args: { p_notes: string; p_quote_id: string }
        Returns: Json
      }
      calculate_corporate_tax: {
        Args: {
          p_force_recalculate?: boolean
          p_period_end?: string
          p_period_start?: string
          p_tax_rate?: number
        }
        Returns: string
      }
      calculate_partner_productivity_bonus: {
        Args: { p_month: number; p_partner_id: string; p_year: number }
        Returns: {
          base_amount: number
          bonus_cap_applied: number
          bonus_enabled: boolean
          bonus_percent_applied: number
          bonus_policy_version: number
          bonus_reference_month: number
          bonus_reference_net_profit: number
          bonus_reference_year: number
          gross_amount: number
          irpf_amount: number
          message: string
          net_amount: number
          productivity_bonus: number
        }[]
      }
      check_email_exists: { Args: { p_email: string }; Returns: boolean }
      check_month_closure_readiness: {
        Args: { p_month: number; p_year: number }
        Returns: {
          check_name: string
          message: string
          passed: boolean
        }[]
      }
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
      close_period: {
        Args: { p_closed_by?: string; p_month: number; p_year: number }
        Returns: string
      }
      confirm_purchase_invoice: {
        Args: { p_invoice_id: string }
        Returns: string
      }
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
      create_bank_balance_adjustment: {
        Args: {
          p_adjustment_date?: string
          p_bank_account_id: string
          p_bank_name: string
          p_new_balance: number
          p_notes?: string
        }
        Returns: {
          adjustment_amount: number
          entry_id: string
          entry_number: string
        }[]
      }
      create_bank_transfer: {
        Args: {
          p_amount: number
          p_notes?: string
          p_source_bank_id: string
          p_source_bank_name: string
          p_target_bank_id: string
          p_target_bank_name: string
          p_transfer_date?: string
        }
        Returns: {
          entry_id: string
          entry_number: string
        }[]
      }
      create_canvassing_location: {
        Args: {
          p_address?: string
          p_city?: string
          p_company_name: string
          p_country?: string
          p_latitude: number
          p_location_references?: string
          p_longitude: number
          p_postal_code?: string
          p_province?: string
          p_status: string
        }
        Returns: {
          location_id: string
        }[]
      }
      create_catalog_category: {
        Args: {
          p_description?: string
          p_domain: "PRODUCT" | "SERVICE"
          p_name: string
          p_parent_id?: string
          p_slug: string
          p_sort_order?: number
        }
        Returns: string
      }
      create_catalog_product:
        | {
            Args: {
              p_category_id?: string
              p_cost_price?: number
              p_description?: string
              p_discount_percent?: number
              p_min_stock_alert?: number
              p_name: string
              p_product_type: Database["public"]["Enums"]["product_type"]
              p_sale_price?: number
              p_sku: string
              p_tax_rate_id?: string
              p_track_stock?: boolean
              p_unit?: "ud" | "m2" | "ml" | "hora" | "jornada" | "mes" | "kg"
            }
            Returns: string
          }
        | {
            Args: {
              p_category_id?: string
              p_cost_price?: number
              p_description?: string
              p_discount_percent?: number
              p_min_stock_alert?: number
              p_name: string
              p_product_type: Database["public"]["Enums"]["product_type"]
              p_sale_price?: number
              p_sku: string
              p_supplier_id?: string
              p_tax_rate_id?: string
              p_track_stock?: boolean
              p_unit?: "ud" | "m2" | "ml" | "hora" | "jornada" | "mes" | "kg"
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
        Returns: {
          client_id: string
          client_number: string
        }[]
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
      create_invoice_with_number: {
        Args: {
          p_client_id: string
          p_due_date?: string
          p_issue_date?: string
          p_project_id?: string
          p_project_name?: string
          p_source_quote_id?: string
        }
        Returns: {
          invoice_id: string
          invoice_number: string
          preliminary_number: string
        }[]
      }
      create_irpf_settlement_entry: {
        Args: {
          p_period_end?: string
          p_period_start?: string
          p_settlement_date?: string
        }
        Returns: string
      }
      create_partner: {
        Args: {
          p_email?: string
          p_full_name: string
          p_phone?: string
          p_tax_id?: string
        }
        Returns: {
          partner_id: string
          partner_number: string
        }[]
      }
      create_partner_compensation_run: {
        Args: {
          p_gross_amount: number
          p_irpf_rate?: number
          p_notes?: string
          p_partner_id: string
          p_period_month: number
          p_period_year: number
        }
        Returns: string
      }
      create_partner_compensation_run_from_policy: {
        Args: { p_month: number; p_partner_id: string; p_year: number }
        Returns: string
      }
      create_payroll_payment:
        | {
            Args: {
              p_amount: number
              p_bank_reference?: string
              p_notes?: string
              p_partner_compensation_run_id?: string
              p_payment_date?: string
              p_payment_method?: string
              p_payroll_run_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_bank_reference?: string
              p_company_bank_account_id?: string
              p_notes?: string
              p_partner_compensation_run_id?: string
              p_payment_date?: string
              p_payment_method?: string
              p_payroll_run_id?: string
            }
            Returns: string
          }
      create_payroll_run: {
        Args: {
          p_employee_id: string
          p_gross_amount: number
          p_irpf_rate?: number
          p_notes?: string
          p_period_month: number
          p_period_year: number
        }
        Returns: string
      }
      create_product: {
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
          out_product_id: string
          out_product_number: string
        }[]
      }
      create_product_category: {
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
      create_purchase_invoice: {
        Args: {
          p_client_id?: string
          p_document_type?: string
          p_due_date?: string
          p_expense_category?: string
          p_file_name?: string
          p_file_path?: string
          p_invoice_number: string
          p_issue_date?: string
          p_notes?: string
          p_project_id?: string
          p_status?: string
          p_supplier_id?: string
          p_supplier_invoice_number?: string
          p_technician_id?: string
        }
        Returns: string
      }
      create_purchase_order: {
        Args: {
          p_expected_end_date?: string
          p_expected_start_date?: string
          p_internal_notes?: string
          p_issue_date?: string
          p_notes?: string
          p_project_id?: string
          p_supplier_id?: string
          p_technician_id?: string
        }
        Returns: string
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
          p_project_id?: string
          p_project_name?: string
          p_valid_until?: string
        }
        Returns: {
          quote_id: string
          quote_number: string
        }[]
      }
      create_supplier: {
        Args: {
          p_address?: string
          p_category?: string
          p_city?: string
          p_company_name: string
          p_contact_email?: string
          p_contact_phone?: string
          p_country?: string
          p_payment_terms?: string
          p_postal_code?: string
          p_province?: string
          p_tax_id?: string
        }
        Returns: {
          supplier_id: string
          supplier_number: string
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
      create_tax_payment: {
        Args: {
          p_amount: number
          p_bank_account_id: string
          p_bank_name: string
          p_notes?: string
          p_payment_date?: string
          p_period?: string
          p_tax_type: string
        }
        Returns: {
          entry_id: string
          entry_number: string
        }[]
      }
      create_technician:
        | {
            Args: {
              p_address?: string
              p_billing_email?: string
              p_city?: string
              p_company_name: string
              p_contact_email?: string
              p_contact_name?: string
              p_contact_phone?: string
              p_contact_phone_secondary?: string
              p_country?: string
              p_daily_rate?: number
              p_hourly_rate?: number
              p_iban?: string
              p_legal_name?: string
              p_notes?: string
              p_payment_terms?: string
              p_postal_code?: string
              p_province?: string
              p_specialties?: string[]
              p_tax_id?: string
              p_type?: string
            }
            Returns: {
              technician_id: string
              technician_number: string
            }[]
          }
        | {
            Args: {
              p_address?: string
              p_billing_email?: string
              p_city?: string
              p_company_name: string
              p_contact_email?: string
              p_contact_name?: string
              p_contact_phone?: string
              p_contact_phone_secondary?: string
              p_country?: string
              p_daily_rate?: number
              p_hourly_rate?: number
              p_iban?: string
              p_legal_name?: string
              p_notes?: string
              p_payment_terms?: string
              p_postal_code?: string
              p_province?: string
              p_specialties?: string[]
              p_tax_id?: string
              p_type?: string
              p_vat_rate?: number
              p_withholding_tax_rate?: number
            }
            Returns: string
          }
        | {
            Args: {
              p_address?: string
              p_billing_email?: string
              p_city?: string
              p_company_name: string
              p_contact_email?: string
              p_contact_name?: string
              p_contact_phone?: string
              p_contact_phone_secondary?: string
              p_country?: string
              p_daily_rate?: number
              p_hourly_rate?: number
              p_iban?: string
              p_legal_name?: string
              p_monthly_salary?: number
              p_notes?: string
              p_payment_terms?: string
              p_postal_code?: string
              p_province?: string
              p_specialties?: string[]
              p_tax_id?: string
              p_type?: string
              p_vat_rate?: number
              p_withholding_tax_rate?: number
            }
            Returns: {
              technician_id: string
              technician_number: string
            }[]
          }
      create_vat_settlement_entry: {
        Args: {
          p_period_end?: string
          p_period_start?: string
          p_settlement_date?: string
        }
        Returns: string
      }
      delete_authorized_user: { Args: { p_user_id: string }; Returns: string }
      delete_catalog_category: { Args: { p_id: string }; Returns: boolean }
      delete_catalog_product: { Args: { p_id: string }; Returns: boolean }
      delete_client: { Args: { p_client_id: string }; Returns: boolean }
      delete_invoice_line: { Args: { p_line_id: string }; Returns: boolean }
      delete_partner_compensation_run: {
        Args: { p_compensation_run_id: string }
        Returns: boolean
      }
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
      delete_purchase_invoice: {
        Args: { p_invoice_id: string }
        Returns: boolean
      }
      delete_purchase_invoice_line: {
        Args: { p_line_id: string }
        Returns: boolean
      }
      delete_purchase_order: { Args: { p_order_id: string }; Returns: boolean }
      delete_purchase_order_line: {
        Args: { p_line_id: string }
        Returns: boolean
      }
      delete_purchase_payment: {
        Args: { p_payment_id: string }
        Returns: boolean
      }
      delete_quote_line: { Args: { p_line_id: string }; Returns: boolean }
      delete_supplier: { Args: { p_supplier_id: string }; Returns: boolean }
      delete_tax: { Args: { p_tax_id: string }; Returns: boolean }
      delete_technician: { Args: { p_technician_id: string }; Returns: boolean }
      finance_add_invoice_line: {
        Args: {
          p_concept: string
          p_description?: string
          p_discount_percent?: number
          p_invoice_id: string
          p_product_id?: string
          p_quantity?: number
          p_tax_id?: string
          p_tax_rate?: number
          p_unit_price?: number
        }
        Returns: string
      }
      finance_cancel_invoice: {
        Args: { p_invoice_id: string; p_reason?: string }
        Returns: boolean
      }
      finance_create_invoice: {
        Args: {
          p_client_id: string
          p_due_date?: string
          p_project_id?: string
          p_project_name?: string
          p_source_quote_id?: string
        }
        Returns: {
          invoice_id: string
          preliminary_number: string
        }[]
      }
      finance_delete_invoice_line: {
        Args: { p_line_id: string }
        Returns: boolean
      }
      finance_delete_payment: {
        Args: { p_payment_id: string }
        Returns: boolean
      }
      finance_get_client_payments: {
        Args: { p_client_id: string }
        Returns: {
          amount: number
          invoice_id: string
          invoice_number: string
          payment_date: string
          payment_id: string
          payment_method: string
          project_id: string
          project_name: string
          total_invoice: number
        }[]
      }
      finance_get_invoice: {
        Args: { p_invoice_id: string }
        Returns: {
          client_id: string
          client_name: string
          created_at: string
          created_by: string
          created_by_name: string
          discount_amount: number
          due_date: string
          id: string
          internal_notes: string
          invoice_number: string
          is_locked: boolean
          issue_date: string
          notes: string
          paid_amount: number
          payment_terms: string
          pending_amount: number
          preliminary_number: string
          project_id: string
          project_name: string
          project_number: string
          source_quote_id: string
          source_quote_number: string
          status: string
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
        }[]
      }
      finance_get_invoice_lines: {
        Args: { p_invoice_id: string }
        Returns: {
          concept: string
          description: string
          discount_percent: number
          id: string
          line_order: number
          product_id: string
          quantity: number
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          unit: string
          unit_price: number
        }[]
      }
      finance_get_invoice_payments: {
        Args: { p_invoice_id: string }
        Returns: {
          amount: number
          bank_reference: string
          company_bank_account_id: string
          created_at: string
          id: string
          is_confirmed: boolean
          notes: string
          payment_date: string
          payment_method: string
          registered_by: string
          registered_by_name: string
        }[]
      }
      finance_get_period_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          invoice_count: number
          overdue_invoice_count: number
          paid_invoice_count: number
          partial_invoice_count: number
          period_end: string
          period_start: string
          total_invoiced: number
          total_paid: number
          total_pending: number
        }[]
      }
      finance_get_project_payments: {
        Args: { p_project_id: string }
        Returns: {
          amount: number
          client_id: string
          client_name: string
          invoice_id: string
          invoice_number: string
          payment_date: string
          payment_id: string
          payment_method: string
          total_invoice: number
        }[]
      }
      finance_get_tax_summary: {
        Args: { p_fiscal_quarter?: number; p_fiscal_year?: number }
        Returns: {
          fiscal_period: string
          tax_code: string
          tax_rate: number
          tax_type: string
          total_base: number
          total_tax: number
          transaction_count: number
        }[]
      }
      finance_issue_invoice: {
        Args: { p_invoice_id: string }
        Returns: {
          invoice_number: string
          issue_date: string
        }[]
      }
      finance_list_invoices: {
        Args: { p_search?: string; p_status?: string }
        Returns: {
          client_id: string
          client_name: string
          client_order_number: string
          created_at: string
          created_by: string
          created_by_name: string
          due_date: string
          id: string
          invoice_number: string
          is_locked: boolean
          issue_date: string
          paid_amount: number
          payment_bank_id: string
          payment_bank_name: string
          pending_amount: number
          preliminary_number: string
          project_id: string
          project_name: string
          project_number: string
          source_quote_id: string
          source_quote_number: string
          source_quote_order_number: string
          status: string
          subtotal: number
          tax_amount: number
          total: number
        }[]
      }
      finance_register_payment: {
        Args: {
          p_amount: number
          p_bank_reference?: string
          p_company_bank_account_id?: string
          p_invoice_id: string
          p_notes?: string
          p_payment_date: string
          p_payment_method: string
        }
        Returns: string
      }
      finance_update_invoice: {
        Args: {
          p_client_id?: string
          p_due_date?: string
          p_internal_notes?: string
          p_invoice_id: string
          p_notes?: string
          p_payment_terms?: string
          p_project_id?: string
          p_project_name?: string
          p_status?: string
        }
        Returns: boolean
      }
      finance_update_invoice_line: {
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
      finance_update_payment: {
        Args: {
          p_amount?: number
          p_bank_reference?: string
          p_company_bank_account_id?: string
          p_notes?: string
          p_payment_date?: string
          p_payment_id: string
          p_payment_method?: string
        }
        Returns: boolean
      }
      fix_purchase_payments_bank_to_caixabank: {
        Args: { p_caixabank_bank_id: string; p_revolut_bank_id: string }
        Returns: number
      }
      generate_internal_purchase_number:
        | {
            Args: {
              p_document_type?: string
              p_supplier_id?: string
              p_technician_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_document_type?: string
              p_supplier_id?: string
              p_technician_id?: string
            }
            Returns: string
          }
      generate_otp: {
        Args: { p_email: string; p_ip_address?: unknown; p_user_agent?: string }
        Returns: string
      }
      generate_partner_compensations_for_month: {
        Args: { p_mode?: string; p_month: number; p_year: number }
        Returns: Json
      }
      get_authorized_user_by_auth_id: {
        Args: { p_auth_user_id: string }
        Returns: {
          email: string
          id: string
          is_active: boolean
        }[]
      }
      get_balance_sheet: {
        Args: { p_as_of_date?: string }
        Returns: {
          account_code: string
          account_name: string
          account_type: string
          credit_balance: number
          debit_balance: number
          net_balance: number
        }[]
      }
      get_bank_account_code: {
        Args: { p_bank_account_id: string }
        Returns: string
      }
      get_canvassing_location: {
        Args: { p_location_id: string }
        Returns: {
          address: string
          appointment_date: string
          appointment_location: string
          appointment_time: string
          appointment_type: string
          approval_process: string
          assigned_to: string
          av_solutions_required: string[]
          best_contact_time: string
          business_floors: number
          business_hours: string
          business_size_sqm: number
          business_type: string
          callback_date: string
          callback_time: string
          city: string
          company_name: string
          competitors_contacted: string
          contact_email_primary: string
          contact_first_name: string
          contact_last_name: string
          contact_phone_primary: string
          contact_phone_secondary: string
          contact_position: string
          country: string
          created_at: string
          current_installation_problems: string
          current_provider: string
          documents: string[]
          economic_decision_maker_identified: boolean
          equipment_locations: string
          estimated_budget_range: string
          existing_equipment: string
          has_active_warranties: boolean
          has_current_av_installation: boolean
          has_maintenance_contract: boolean
          has_requested_competitor_quotes: boolean
          id: string
          installation_age_years: number
          interest_level: number
          is_decision_maker: boolean
          latitude: number
          lead_score: number
          lead_source: string
          local_access_info: string
          location_references: string
          longitude: number
          main_objections: string[]
          maintenance_contract_end_date: string
          maintenance_contract_provider: string
          maintenance_contract_value: number
          maintenance_frequency: string
          number_of_screens: number
          objections_other: string
          photos: string[]
          postal_code: string
          preferred_contact_method: string
          priority: string
          project_urgency: string
          proposed_maintenance_contract: boolean
          province: string
          purchase_phase: string
          reminder_enabled: boolean
          reminder_time_before: string
          secondary_contact_name: string
          secondary_contact_phone: string
          solution_details: string
          status: string
          status_history: Json
          tags: string[]
          team_id: string
          technical_service_type: string
          updated_at: string
          videos: string[]
          warranty_end_date: string
          years_in_operation: number
        }[]
      }
      get_catalog_product_detail: {
        Args: { p_product_id: string }
        Returns: {
          category_id: string
          category_name: string
          cost_price: number
          created_at: string
          description: string
          discount_percent: number
          has_low_stock_alert: boolean
          id: string
          is_active: boolean
          margin_amount: number
          margin_percentage: number
          min_stock_alert: number
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          sale_price: number
          sale_price_effective: number
          sku: string
          stock_quantity: number
          supplier_id: string
          supplier_name: string
          tax_rate: number
          tax_rate_id: string
          track_stock: boolean
          unit: "ud" | "m2" | "ml" | "hora" | "jornada" | "mes" | "kg"
          updated_at: string
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
          client_number: string
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
      get_client_balances: {
        Args: { p_as_of_date?: string }
        Returns: {
          client_id: string
          client_name: string
          client_number: string
          credit_balance: number
          debit_balance: number
          net_balance: number
        }[]
      }
      get_client_for_map: {
        Args: { p_client_id: string }
        Returns: {
          assigned_to: string
          assigned_to_name: string
          billing_address: string
          billing_city: string
          client_number: string
          company_name: string
          contact_email: string
          contact_phone: string
          created_at: string
          full_address: string
          id: string
          latitude: number
          lead_stage: string
          legal_name: string
          longitude: number
          notes: string
        }[]
      }
      get_company_contacts: {
        Args: never
        Returns: {
          business_hours: string
          contact_email: string
          contact_phone: string
          contact_phone_secondary: string
          google_maps_url: string
          id: string
          social_networks: Json
          whatsapp_number: string
        }[]
      }
      get_company_preferences: {
        Args: never
        Returns: {
          bank_accounts: Json
          default_currency: string
          id: string
          invoice_payment_days: number
          quote_validity_days: number
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
      get_corporate_tax_summary: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: {
          profit_before_tax: number
          provision_date: string
          provision_entry_id: string
          provision_entry_number: string
          tax_amount: number
          tax_rate: number
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
          theme_preference: string
          user_id: string
        }[]
      }
      get_dashboard_metrics: { Args: { p_period?: string }; Returns: Json }
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
          invoice_hash: string
          invoice_number: string
          issue_date: string
          notes: string
          project_id: string
          project_name: string
          project_number: string
          source_quote_id: string
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
      get_irpf_by_period: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: {
          compensation_count: number
          payroll_count: number
          period_month: number
          period_year: number
          total_irpf: number
        }[]
      }
      get_irpf_by_person: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: {
          document_count: number
          person_id: string
          person_name: string
          person_number: string
          person_type: string
          total_gross: number
          total_irpf: number
          total_net: number
        }[]
      }
      get_irpf_model_111_summary: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: {
          total_compensation_irpf: number
          total_documents: number
          total_employees: number
          total_irpf_accumulated: number
          total_partners: number
          total_payroll_irpf: number
        }[]
      }
      get_irpf_summary: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: number
      }
      get_journal_entry_lines: {
        Args: { p_entry_id: string }
        Returns: {
          account_code: string
          account_name: string
          credit_amount: number
          debit_amount: number
          description: string
          id: string
          line_order: number
          third_party_id: string
          third_party_name: string
          third_party_type: string
        }[]
      }
      get_lead_stats: {
        Args: { p_assigned_to?: string }
        Returns: {
          count: number
          lead_stage: string
        }[]
      }
      get_monthly_closure_report_dataset: {
        Args: { p_month: number; p_year: number }
        Returns: Json
      }
      get_next_factura_borr_number: { Args: never; Returns: string }
      get_next_invoice_number: { Args: never; Returns: string }
      get_next_pending_monthly_report: {
        Args: never
        Returns: {
          id: string
          month: number
          retry_count: number
          year: number
        }[]
      }
      get_next_provisional_purchase_number: {
        Args: { p_document_type?: string }
        Returns: string
      }
      get_next_ticket_number: { Args: never; Returns: string }
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
      get_payroll_settings: {
        Args: never
        Returns: {
          bonus_cap_amount: number
          bonus_enabled: boolean
          bonus_percent: number
          bonus_reference_mode: string
          bonus_requires_closed_period: boolean
          default_irpf_rate: number
          id: string
          min_profit_to_pay_bonus: number
          scope: string
          updated_at: string
          updated_by: string
          version: number
        }[]
      }
      get_period_profit_summary: {
        Args: { p_end: string; p_start: string }
        Returns: {
          corporate_tax_amount: number
          data_completeness: Json
          net_profit: number
          operating_expenses: number
          profit_before_tax: number
          total_revenue: number
        }[]
      }
      get_profit_loss: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: {
          account_code: string
          account_name: string
          account_type: string
          amount: number
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
      get_project_financial_stats: {
        Args: { p_project_id: string }
        Returns: {
          margin: number
          margin_percentage: number
          total_budget: number
          total_expenses: number
          total_invoiced: number
        }[]
      }
      get_project_history: {
        Args: { p_project_id: string }
        Returns: {
          action: string
          created_at: string
          description: string
          details: Json
          event_category: string
          event_type: string
          id: string
          resource_id: string
          resource_type: string
          severity: string
          user_email: string
          user_name: string
        }[]
      }
      get_projects_portfolio_summary: {
        Args: never
        Returns: {
          avg_project_ticket: number
          max_project_value: number
          min_project_value: number
          total_active_projects: number
          total_invoiced_ytd: number
          total_pipeline_value: number
        }[]
      }
      get_provider_purchase_invoices: {
        Args: { p_provider_id: string; p_provider_type: string }
        Returns: {
          client_name: string
          created_at: string
          document_type: string
          due_date: string
          file_name: string
          file_path: string
          id: string
          internal_purchase_number: string
          invoice_number: string
          issue_date: string
          paid_amount: number
          pending_amount: number
          project_id: string
          project_name: string
          project_number: string
          status: string
          subtotal: number
          supplier_invoice_number: string
          tax_amount: number
          total: number
          withholding_amount: number
        }[]
      }
      get_purchase_invoice: {
        Args: { p_invoice_id: string }
        Returns: {
          client_id: string
          created_at: string
          created_by: string
          created_by_name: string
          document_type: string
          due_date: string
          expense_category: string
          file_name: string
          file_path: string
          id: string
          internal_notes: string
          internal_purchase_number: string
          invoice_number: string
          is_locked: boolean
          issue_date: string
          notes: string
          paid_amount: number
          pending_amount: number
          project_id: string
          project_name: string
          project_number: string
          status: string
          supplier_id: string
          supplier_invoice_number: string
          supplier_name: string
          supplier_number: string
          supplier_tax_id: string
          tax_amount: number
          tax_base: number
          technician_id: string
          technician_name: string
          technician_number: string
          technician_tax_id: string
          total: number
          updated_at: string
        }[]
      }
      get_purchase_invoice_lines: {
        Args: { p_invoice_id: string }
        Returns: {
          concept: string
          description: string
          discount_percent: number
          id: string
          line_order: number
          product_id: string
          quantity: number
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          unit_price: number
          withholding_amount: number
          withholding_tax_rate: number
        }[]
      }
      get_purchase_invoice_payments: {
        Args: { p_invoice_id: string }
        Returns: {
          amount: number
          bank_reference: string
          company_bank_account_id: string
          created_at: string
          id: string
          notes: string
          payment_date: string
          payment_method: string
          registered_by: string
          registered_by_name: string
        }[]
      }
      get_purchase_order: {
        Args: { p_order_id: string }
        Returns: {
          actual_end_date: string
          actual_start_date: string
          approved_at: string
          approved_by: string
          approved_by_name: string
          created_at: string
          created_by: string
          created_by_name: string
          expected_end_date: string
          expected_start_date: string
          id: string
          internal_notes: string
          issue_date: string
          linked_purchase_invoice_id: string
          notes: string
          po_number: string
          project_id: string
          project_name: string
          project_number: string
          status: string
          subtotal: number
          supplier_id: string
          supplier_name: string
          supplier_tax_id: string
          tax_amount: number
          tax_rate: number
          technician_id: string
          technician_name: string
          total: number
          updated_at: string
          withholding_amount: number
          withholding_rate: number
        }[]
      }
      get_purchase_order_lines: {
        Args: { p_order_id: string }
        Returns: {
          concept: string
          description: string
          discount_percent: number
          group_name: string
          id: string
          line_order: number
          purchase_order_id: string
          quantity: number
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          unit: string
          unit_price: number
          withholding_amount: number
          withholding_rate: number
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
          project_id: string
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
          group_name: string
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
      get_report_settings: {
        Args: never
        Returns: {
          auto_send_on_close: boolean
          email_subject_template: string
          from_email: string
          id: string
          include_pdf_attachment: boolean
          language: string
          monthly_report_auto_send_enabled: boolean
          recipients_cc: string[]
          recipients_to: string[]
          scope: string
          signed_link_expiry_days: number
          template_version: string
          updated_at: string
          use_signed_link_instead_of_attachment: boolean
        }[]
      }
      get_sales_by_product_category: {
        Args: {
          p_period_end?: string
          p_period_start?: string
          p_status?: string
        }
        Returns: {
          category_code: string
          category_id: string
          category_name: string
          category_type: string
          invoice_count: number
          line_count: number
          total_amount: number
          total_subtotal: number
          total_tax: number
        }[]
      }
      get_supplier: {
        Args: { p_supplier_id: string }
        Returns: {
          city: string
          company_name: string
          contact_email: string
          contact_phone: string
          created_at: string
          id: string
          payment_terms: string
          province: string
          status: string
          supplier_number: string
          tax_id: string
        }[]
      }
      get_supplier_technician_balances: {
        Args: { p_as_of_date?: string }
        Returns: {
          account_code: string
          credit_balance: number
          debit_balance: number
          net_balance: number
          third_party_id: string
          third_party_name: string
          third_party_number: string
          third_party_type: string
        }[]
      }
      get_technician: {
        Args: { p_technician_id: string }
        Returns: {
          address: string
          billing_email: string
          city: string
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          contact_phone_secondary: string
          country: string
          created_at: string
          created_by: string
          created_by_name: string
          daily_rate: number
          hourly_rate: number
          iban: string
          id: string
          latitude: number
          legal_name: string
          longitude: number
          notes: string
          payment_terms: string
          postal_code: string
          province: string
          rating: number
          specialties: string[]
          status: string
          tax_id: string
          technician_number: string
          type: string
          updated_at: string
        }[]
      }
      get_technician_projects_count: {
        Args: { p_technician_id: string }
        Returns: number
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
      get_vat_summary: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: {
          vat_balance: number
          vat_paid: number
          vat_received: number
          vat_to_pay: number
        }[]
      }
      get_worker_detail: {
        Args: { p_user_id: string }
        Returns: {
          address: string
          city: string
          created_at: string
          department: string
          email: string
          full_name: string
          iban: string
          id: string
          irpf_rate: number
          is_active: boolean
          job_position: string
          last_login_at: string
          linked_employee_id: string
          linked_employee_number: string
          linked_partner_account_code: string
          linked_partner_id: string
          linked_partner_number: string
          phone: string
          postal_code: string
          province: string
          roles: string[]
          ss_regime: string
          tax_id: string
          worker_type: string
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
      is_period_closed: {
        Args: { p_month: number; p_year: number }
        Returns: boolean
      }
      link_po_to_purchase_invoice: {
        Args: { p_invoice_id: string; p_order_id: string }
        Returns: boolean
      }
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
      list_bank_account_movements: {
        Args: {
          p_account_code: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          credit_amount: number
          debit_amount: number
          description: string
          entry_date: string
          entry_number: string
          entry_type: string
          id: string
          reference_id: string
          reference_type: string
          running_balance: number
        }[]
      }
      list_bank_accounts_with_balances: {
        Args: { p_as_of_date?: string }
        Returns: {
          account_code: string
          balance: number
          bank_account_id: string
          bank_name: string
        }[]
      }
      list_cash_movements: {
        Args: {
          p_bank_account_code?: string
          p_end_date?: string
          p_limit?: number
          p_offset?: number
          p_start_date?: string
        }
        Returns: {
          amount: number
          bank_account_code: string
          bank_account_name: string
          bank_reference: string
          counterpart_account_code: string
          counterpart_account_name: string
          created_at: string
          description: string
          entry_date: string
          entry_id: string
          entry_number: string
          entry_type: string
          is_locked: boolean
          movement_id: string
          movement_type: string
          payment_method: string
          reference_id: string
          reference_type: string
          third_party_id: string
          third_party_name: string
          third_party_type: string
        }[]
      }
      list_catalog_bundle_components: {
        Args: { p_bundle_product_id: string }
        Returns: {
          component_product_id: string
          name: string
          quantity: number
          sku: string
          unit: "ud" | "m2" | "ml" | "hora" | "jornada" | "mes" | "kg"
        }[]
      }
      list_catalog_bundles: {
        Args: { p_search?: string }
        Returns: {
          category_id: string
          component_count: number
          description: string
          discount_percent: number
          id: string
          is_active: boolean
          name: string
          sale_price: number
          sale_price_effective: number
          sku: string
          tax_rate: number
        }[]
      }
      list_catalog_categories: {
        Args: {
          p_domain?: "PRODUCT" | "SERVICE"
          p_parent_id?: string
          p_search?: string
        }
        Returns: {
          description: string
          domain: "PRODUCT" | "SERVICE"
          id: string
          is_active: boolean
          name: string
          parent_id: string
          product_count: number
          slug: string
          sort_order: number
        }[]
      }
      list_catalog_products: {
        Args: {
          p_category_id?: string
          p_domain?: "PRODUCT" | "SERVICE"
          p_include_inactive?: boolean
          p_search?: string
        }
        Returns: {
          category_id: string
          category_name: string
          cost_price: number
          description: string
          discount_percent: number
          has_low_stock_alert: boolean
          id: string
          is_active: boolean
          margin_percentage: number
          min_stock_alert: number
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          sale_price: number
          sale_price_effective: number
          sku: string
          stock_quantity: number
          supplier_id: string
          supplier_name: string
          tax_rate: number
          track_stock: boolean
          unit: "ud" | "m2" | "ml" | "hora" | "jornada" | "mes" | "kg"
        }[]
      }
      list_catalog_products_search: {
        Args: {
          p_domain?: "PRODUCT" | "SERVICE"
          p_include_inactive?: boolean
          p_search?: string
        }
        Returns: {
          category_name: string
          description: string
          id: string
          is_low_stock: boolean
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          sale_price_effective: number
          sku: string
          stock_quantity: number
          tax_rate: number
          track_stock: boolean
          unit: "ud" | "m2" | "ml" | "hora" | "jornada" | "mes" | "kg"
        }[]
      }
      list_catalog_tax_rates: {
        Args: never
        Returns: {
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          rate: number
        }[]
      }
      list_chart_of_accounts: {
        Args: { p_account_type?: string; p_only_active?: boolean }
        Returns: {
          account_code: string
          account_name: string
          account_type: string
          description: string
          is_active: boolean
        }[]
      }
      list_client_notes: {
        Args: { p_client_id: string }
        Returns: {
          content: string
          created_at: string
          id: string
          new_assignee_name: string
          new_status: string
          note_type: string
          previous_assignee_name: string
          previous_status: string
          user_id: string
          user_name: string
        }[]
      }
      list_clients: {
        Args: { p_lead_stage?: string; p_search?: string }
        Returns: {
          assigned_to: string
          assigned_to_name: string
          client_number: string
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
      list_clients_for_map: {
        Args: { p_assigned_to?: string; p_lead_stages?: string[] }
        Returns: {
          assigned_to: string
          assigned_to_name: string
          client_number: string
          company_name: string
          contact_email: string
          contact_phone: string
          created_at: string
          full_address: string
          id: string
          latitude: number
          lead_stage: string
          legal_name: string
          longitude: number
          notes_count: number
        }[]
      }
      list_company_bank_accounts: {
        Args: never
        Returns: {
          accounting_code: string
          bank_name: string
          holder_name: string
          iban: string
          id: string
          is_active: boolean
          notes: string
        }[]
      }
      list_employees: {
        Args: { p_status?: string }
        Returns: {
          created_at: string
          email: string
          employee_number: string
          full_name: string
          id: string
          phone: string
          status: string
          tax_id: string
        }[]
      }
      list_invoices:
        | {
            Args: { p_search?: string }
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
              project_number: string
              status: string
              subtotal: number
              tax_amount: number
              total: number
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
      list_journal_entries: {
        Args: {
          p_end_date?: string
          p_entry_type?: string
          p_limit?: number
          p_offset?: number
          p_project_id?: string
          p_reference_type?: string
          p_search?: string
          p_start_date?: string
        }
        Returns: {
          created_at: string
          created_by_name: string
          description: string
          entry_date: string
          entry_number: string
          entry_type: string
          id: string
          is_locked: boolean
          project_id: string
          project_name: string
          reference_id: string
          reference_type: string
          total_credit: number
          total_debit: number
        }[]
      }
      list_location_notes: {
        Args: { p_location_id: string }
        Returns: {
          attachments: string[]
          content: string
          created_at: string
          created_by: string
          created_by_name: string
          edited_at: string
          edited_by: string
          edited_by_name: string
          id: string
          note_type: string
          updated_at: string
        }[]
      }
      list_partner_compensation_runs: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_partner_id?: string
          p_period_month?: number
          p_period_year?: number
          p_status?: string
        }
        Returns: {
          compensation_number: string
          created_at: string
          gross_amount: number
          id: string
          irpf_amount: number
          irpf_rate: number
          journal_entry_id: string
          journal_entry_number: string
          net_amount: number
          notes: string
          partner_id: string
          partner_name: string
          partner_number: string
          period_month: number
          period_year: number
          status: string
        }[]
      }
      list_partner_payroll_profiles: {
        Args: { p_status?: string }
        Returns: {
          base_salary: number
          bonus_cap_override: number
          bonus_enabled_override: boolean
          irpf_rate: number
          partner_id: string
          partner_name: string
          partner_number: string
          updated_at: string
        }[]
      }
      list_partners: {
        Args: { p_status?: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          partner_number: string
          phone: string
          status: string
          tax_id: string
        }[]
      }
      list_payroll_payments: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_offset?: number
          p_partner_compensation_run_id?: string
          p_payroll_run_id?: string
          p_start_date?: string
        }
        Returns: {
          amount: number
          bank_name: string
          bank_reference: string
          compensation_number: string
          created_at: string
          id: string
          journal_entry_id: string
          journal_entry_number: string
          partner_compensation_run_id: string
          payment_date: string
          payment_method: string
          payment_number: string
          payroll_number: string
          payroll_run_id: string
        }[]
      }
      list_payroll_runs: {
        Args: {
          p_employee_id?: string
          p_limit?: number
          p_offset?: number
          p_period_month?: number
          p_period_year?: number
          p_status?: string
        }
        Returns: {
          created_at: string
          employee_id: string
          employee_name: string
          employee_number: string
          gross_amount: number
          id: string
          irpf_amount: number
          irpf_rate: number
          journal_entry_id: string
          journal_entry_number: string
          net_amount: number
          payroll_number: string
          period_month: number
          period_year: number
          status: string
        }[]
      }
      list_periods_for_closure: {
        Args: { p_months_back?: number }
        Returns: {
          closed_at: string
          is_closed: boolean
          month: number
          period_end: string
          period_start: string
          year: number
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
      list_project_expenses: {
        Args: { p_project_id: string }
        Returns: {
          amount: number
          category: string
          created_at: string
          created_by: string
          date: string
          description: string
          id: string
          notes: string
          project_id: string
          updated_at: string
        }[]
      }
      list_project_purchase_orders: {
        Args: { p_project_id: string }
        Returns: {
          expected_end_date: string
          expected_start_date: string
          id: string
          issue_date: string
          linked_invoice_number: string
          linked_purchase_invoice_id: string
          po_number: string
          status: string
          subtotal: number
          supplier_name: string
          technician_name: string
          total: number
        }[]
      }
      list_project_quotes: {
        Args: { p_project_id: string }
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
      list_project_technicians: {
        Args: { p_project_id: string }
        Returns: {
          first_invoice_date: string
          invoice_count: number
          last_invoice_date: string
          technician_id: string
          technician_name: string
          technician_number: string
          technician_tax_id: string
          technician_type: string
          total_invoiced: number
        }[]
      }
      list_projects: {
        Args: { p_search?: string; p_status?: string }
        Returns: {
          assigned_to_name: string
          budget: number
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
      list_purchase_invoices: {
        Args: {
          p_document_type?: string
          p_page?: number
          p_page_size?: number
          p_project_id?: string
          p_search?: string
          p_status?: string
          p_supplier_id?: string
          p_technician_id?: string
        }
        Returns: {
          created_at: string
          document_type: string
          due_date: string
          file_path: string
          id: string
          internal_purchase_number: string
          invoice_number: string
          is_locked: boolean
          issue_date: string
          paid_amount: number
          pending_amount: number
          project_id: string
          project_name: string
          provider_id: string
          provider_name: string
          provider_tax_id: string
          provider_type: string
          retention_amount: number
          status: string
          subtotal: number
          tax_amount: number
          total: number
          total_count: number
        }[]
      }
      list_purchase_orders: {
        Args: {
          p_project_id?: string
          p_search?: string
          p_status?: string
          p_supplier_id?: string
          p_technician_id?: string
        }
        Returns: {
          client_name: string
          created_at: string
          expected_end_date: string
          expected_start_date: string
          id: string
          issue_date: string
          linked_invoice_number: string
          linked_purchase_invoice_id: string
          po_number: string
          project_id: string
          project_name: string
          project_number: string
          status: string
          subtotal: number
          supplier_id: string
          supplier_name: string
          technician_id: string
          technician_name: string
          total: number
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
          project_client_order_number: string
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
      list_roles: {
        Args: never
        Returns: {
          display_name: string
          id: string
          level: number
          name: string
        }[]
      }
      list_suppliers: {
        Args: {
          p_category?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          category: string
          city: string
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          legal_name: string
          payment_terms: string
          phone: string
          province: string
          status: string
          supplier_number: string
          tax_id: string
          total_count: number
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
      list_technicians: {
        Args: {
          p_search?: string
          p_specialty?: string
          p_status?: string
          p_type?: string
        }
        Returns: {
          city: string
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          daily_rate: number
          hourly_rate: number
          id: string
          legal_name: string
          province: string
          rating: number
          specialties: string[]
          status: string
          tax_id: string
          technician_number: string
          type: string
        }[]
      }
      list_technicians_for_map: {
        Args: { p_specialty?: string; p_status?: string; p_type?: string }
        Returns: {
          address: string
          city: string
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          id: string
          latitude: number
          longitude: number
          rating: number
          specialties: string[]
          status: string
          technician_number: string
          type: string
        }[]
      }
      list_user_canvassing_locations: {
        Args: { p_user_id?: string }
        Returns: {
          address: string
          appointment_date: string
          callback_date: string
          city: string
          company_name: string
          contact_email_primary: string
          contact_first_name: string
          contact_last_name: string
          contact_phone_primary: string
          created_at: string
          id: string
          latitude: number
          lead_score: number
          longitude: number
          postal_code: string
          priority: string
          province: string
          status: string
          updated_at: string
        }[]
      }
      list_workers: {
        Args: never
        Returns: {
          created_at: string
          department: string
          email: string
          full_name: string
          iban: string
          id: string
          irpf_rate: number
          is_active: boolean
          job_position: string
          last_login_at: string
          linked_employee_id: string
          linked_employee_number: string
          linked_partner_id: string
          linked_partner_number: string
          phone: string
          ss_regime: string
          tax_id: string
          worker_type: string
        }[]
      }
      mark_invitation_token_used: {
        Args: { p_token: string }
        Returns: undefined
      }
      open_period: {
        Args: { p_month: number; p_year: number }
        Returns: undefined
      }
      pay_partner_compensation_run: {
        Args: {
          p_amount: number
          p_bank_account_id: string
          p_bank_name: string
          p_compensation_run_id: string
          p_notes?: string
          p_payment_date?: string
          p_payment_method?: string
        }
        Returns: {
          entry_id: string
          entry_number: string
          payment_id: string
        }[]
      }
      post_partner_compensation_run: {
        Args: { p_compensation_run_id: string }
        Returns: {
          entry_id: string
          entry_number: string
        }[]
      }
      post_payroll_run: { Args: { p_payroll_run_id: string }; Returns: string }
      reassign_client: {
        Args: {
          p_client_id: string
          p_new_assignee_id: string
          p_note?: string
        }
        Returns: boolean
      }
      recalculate_partner_compensation_run: {
        Args: { p_run_id: string }
        Returns: undefined
      }
      recalculate_purchase_invoice: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      recalculate_quote_totals: {
        Args: { p_quote_id: string }
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
      register_purchase_invoice: {
        Args: { p_invoice_id: string }
        Returns: boolean
      }
      register_purchase_payment: {
        Args: {
          p_amount: number
          p_bank_reference?: string
          p_company_bank_account_id?: string
          p_invoice_id: string
          p_notes?: string
          p_payment_date?: string
          p_payment_method?: string
        }
        Returns: string
      }
      remove_catalog_bundle_component: {
        Args: { p_bundle_product_id: string; p_component_product_id: string }
        Returns: boolean
      }
      remove_pack_item: { Args: { p_item_id: string }; Returns: boolean }
      reorder_quote_line: {
        Args: { p_direction: string; p_line_id: string }
        Returns: boolean
      }
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
      update_canvassing_location: {
        Args: { p_data: Json; p_location_id: string }
        Returns: string
      }
      update_catalog_category: {
        Args: {
          p_description?: string
          p_id: string
          p_is_active?: boolean
          p_name?: string
          p_parent_id?: string
          p_slug?: string
          p_sort_order?: number
        }
        Returns: boolean
      }
      update_catalog_product:
        | {
            Args: {
              p_category_id?: string
              p_cost_price?: number
              p_description?: string
              p_discount_percent?: number
              p_id: string
              p_is_active?: boolean
              p_min_stock_alert?: number
              p_name?: string
              p_sale_price?: number
              p_sku?: string
              p_tax_rate_id?: string
              p_track_stock?: boolean
              p_unit?: "ud" | "m2" | "ml" | "hora" | "jornada" | "mes" | "kg"
            }
            Returns: boolean
          }
        | {
            Args: {
              p_category_id?: string
              p_clear_supplier?: boolean
              p_cost_price?: number
              p_description?: string
              p_discount_percent?: number
              p_id: string
              p_is_active?: boolean
              p_min_stock_alert?: number
              p_name?: string
              p_sale_price?: number
              p_sku?: string
              p_supplier_id?: string
              p_tax_rate_id?: string
              p_track_stock?: boolean
              p_unit?: "ud" | "m2" | "ml" | "hora" | "jornada" | "mes" | "kg"
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
          p_instagram_handle?: string
          p_lead_source?: string
          p_lead_stage?: string
          p_legal_name?: string
          p_linkedin_url?: string
          p_next_follow_up_date?: string
          p_notes?: string
          p_tax_id?: string
          p_tiktok_handle?: string
          p_urgency?: string
          p_website?: string
        }
        Returns: boolean
      }
      update_client_coordinates: {
        Args: {
          p_client_id: string
          p_full_address: string
          p_latitude: number
          p_longitude: number
        }
        Returns: boolean
      }
      update_client_status: {
        Args: { p_client_id: string; p_new_status: string; p_note?: string }
        Returns: boolean
      }
      update_invoice: {
        Args: {
          p_client_id?: string
          p_due_date?: string
          p_internal_notes?: string
          p_invoice_id: string
          p_issue_date?: string
          p_notes?: string
          p_payment_terms?: string
          p_project_id?: string
          p_project_name?: string
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
      update_own_user_info:
        | {
            Args: {
              p_full_name?: string
              p_job_position?: string
              p_phone?: string
              p_user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_full_name?: string
              p_job_position?: string
              p_phone?: string
              p_theme_preference?: string
              p_user_id: string
            }
            Returns: boolean
          }
      update_pack_item: {
        Args: { p_item_id: string; p_quantity: number }
        Returns: boolean
      }
      update_partner_compensation_run: {
        Args: {
          p_compensation_run_id: string
          p_gross_amount?: number
          p_irpf_rate?: number
          p_notes?: string
        }
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
      update_purchase_invoice:
        | {
            Args: {
              p_client_id?: string
              p_due_date?: string
              p_expense_category?: string
              p_internal_notes?: string
              p_invoice_id: string
              p_invoice_number?: string
              p_issue_date?: string
              p_notes?: string
              p_project_id?: string
              p_status?: string
              p_supplier_id?: string
              p_supplier_invoice_number?: string
              p_technician_id?: string
              p_withholding_amount?: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_due_date?: string
              p_expense_category?: string
              p_internal_notes?: string
              p_invoice_id: string
              p_issue_date?: string
              p_manual_beneficiary_name?: string
              p_notes?: string
              p_project_id?: string
              p_status?: string
              p_supplier_id?: string
              p_supplier_invoice_number?: string
              p_technician_id?: string
            }
            Returns: undefined
          }
      update_purchase_invoice_line: {
        Args: {
          p_concept?: string
          p_description?: string
          p_discount_percent?: number
          p_line_id: string
          p_quantity?: number
          p_tax_rate?: number
          p_unit_price?: number
          p_withholding_tax_rate?: number
        }
        Returns: undefined
      }
      update_purchase_order: {
        Args: {
          p_actual_end_date?: string
          p_actual_start_date?: string
          p_expected_end_date?: string
          p_expected_start_date?: string
          p_internal_notes?: string
          p_issue_date?: string
          p_linked_purchase_invoice_id?: string
          p_notes?: string
          p_order_id: string
          p_project_id?: string
          p_status?: string
          p_supplier_id?: string
          p_technician_id?: string
        }
        Returns: boolean
      }
      update_purchase_order_line: {
        Args: {
          p_concept?: string
          p_description?: string
          p_discount_percent?: number
          p_group_name?: string
          p_line_id: string
          p_quantity?: number
          p_tax_rate?: number
          p_unit?: string
          p_unit_price?: number
          p_withholding_rate?: number
        }
        Returns: boolean
      }
      update_quote: {
        Args: {
          p_client_id?: string
          p_notes?: string
          p_project_id?: string
          p_project_name?: string
          p_quote_id: string
          p_status?: string
          p_valid_until?: string
        }
        Returns: undefined
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
      update_quote_lines_order: {
        Args: { p_line_ids: string[]; p_quote_id: string }
        Returns: boolean
      }
      update_supplier: {
        Args: {
          p_address?: string
          p_city?: string
          p_company_name?: string
          p_contact_email?: string
          p_contact_phone?: string
          p_country?: string
          p_payment_terms?: string
          p_postal_code?: string
          p_province?: string
          p_status?: string
          p_supplier_id: string
          p_tax_id?: string
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
      update_technician:
        | {
            Args: {
              p_address?: string
              p_billing_email?: string
              p_city?: string
              p_company_name?: string
              p_contact_email?: string
              p_contact_name?: string
              p_contact_phone?: string
              p_contact_phone_secondary?: string
              p_country?: string
              p_daily_rate?: number
              p_hourly_rate?: number
              p_iban?: string
              p_latitude?: number
              p_legal_name?: string
              p_longitude?: number
              p_notes?: string
              p_payment_terms?: string
              p_postal_code?: string
              p_province?: string
              p_rating?: number
              p_specialties?: string[]
              p_status?: string
              p_tax_id?: string
              p_technician_id: string
              p_type?: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_address?: string
              p_billing_email?: string
              p_city?: string
              p_company_name?: string
              p_contact_email?: string
              p_contact_name?: string
              p_contact_phone?: string
              p_contact_phone_secondary?: string
              p_country?: string
              p_daily_rate?: number
              p_hourly_rate?: number
              p_iban?: string
              p_latitude?: number
              p_legal_name?: string
              p_longitude?: number
              p_notes?: string
              p_payment_terms?: string
              p_postal_code?: string
              p_province?: string
              p_rating?: number
              p_specialties?: string[]
              p_status?: string
              p_tax_id?: string
              p_technician_id: string
              p_type?: string
              p_vat_rate?: number
              p_withholding_tax_rate?: number
            }
            Returns: undefined
          }
      update_technician_coordinates: {
        Args: {
          p_full_address?: string
          p_latitude: number
          p_longitude: number
          p_technician_id: string
        }
        Returns: boolean
      }
      update_worker: {
        Args: {
          p_address?: string
          p_city?: string
          p_department?: string
          p_iban?: string
          p_irpf_rate?: number
          p_job_position?: string
          p_phone?: string
          p_postal_code?: string
          p_province?: string
          p_ss_regime?: string
          p_tax_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
      upsert_company_contacts: {
        Args: {
          p_business_hours?: string
          p_contact_email?: string
          p_contact_phone?: string
          p_contact_phone_secondary?: string
          p_google_maps_url?: string
          p_social_networks?: Json
          p_whatsapp_number?: string
        }
        Returns: string
      }
      upsert_company_preferences: {
        Args: {
          p_bank_accounts?: Json
          p_default_currency?: string
          p_invoice_payment_days?: number
          p_quote_validity_days?: number
        }
        Returns: string
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
      validate_month_consistency: {
        Args: { p_month: number; p_tolerance?: number; p_year: number }
        Returns: {
          check_code: string
          check_name: string
          detail: string
          meta: Json
          passed: boolean
          severity: string
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
      app_role: "admin" | "comercial" | "tecnico" | "manager"
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
      app_role: ["admin", "comercial", "tecnico", "manager"],
      product_type: ["product", "service"],
    },
  },
} as const
