/**
 * Placeholder de tipos Supabase — Sprint 0.
 * Regenerar con: `npm run db:types` (supabase gen types typescript) en cuanto el
 * proyecto esté linkeado. Mantiene la forma exacta que espera `@supabase/ssr`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          company_name: string | null;
          rfc_emisor: string;
          regimen_fiscal_id: string | null;
          cp_emisor: string | null;
          pac_provider: string;
          pac_api_key_secret_id: string | null;
          pac_api_secret_secret_id: string | null;
          whatsapp_business_account_id: string | null;
          whatsapp_phone_number_id: string | null;
          whatsapp_access_token_secret_id: string | null;
          wa_template_cfdi_listo: string;
          wa_template_error_validacion: string;
          plan_status: string;
          trial_ends_at: string;
          privacy_notice_accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          rfc_emisor: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      procesos: {
        Row: {
          id: string;
          user_id: string;
          original_filename: string | null;
          total_rows: number;
          valid_rows: number;
          error_rows: number;
          stamped_rows: number;
          failed_rows: number;
          status: string;
          error_summary: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["procesos"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["procesos"]["Row"]>;
        Relationships: [];
      };
      filas_proceso: {
        Row: {
          id: string;
          proceso_id: string;
          row_number: number;
          raw_data: Json;
          validated_data: Json | null;
          validation_errors: Json | null;
          status: string;
          idempotency_key: string;
          uuid_timbre: string | null;
          xml_url: string | null;
          pdf_url: string | null;
          sat_status: string | null;
          last_pac_response: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["filas_proceso"]["Row"]> & {
          proceso_id: string;
          row_number: number;
          raw_data: Json;
        };
        Update: Partial<Database["public"]["Tables"]["filas_proceso"]["Row"]>;
        Relationships: [];
      };
      sat_catalogos: {
        Row: {
          id: number;
          catalogo_type: string;
          version: string;
          code: string;
          description: string;
          parent_code: string | null;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["sat_catalogos"]["Row"], "id"> & {
          id?: number;
        };
        Update: Partial<Database["public"]["Tables"]["sat_catalogos"]["Row"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          email: string;
          source: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["leads"]["Row"]> & {
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      vault_create_secret: {
        Args: { secret: string; secret_name: string };
        Returns: string;
      };
      vault_read_secret: {
        Args: { secret_id: string };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
  };
}
