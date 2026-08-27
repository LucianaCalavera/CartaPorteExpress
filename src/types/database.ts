export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      filas_proceso: {
        Row: {
          created_at: string | null;
          id: string;
          idempotency_key: string | null;
          last_pac_response: Json | null;
          pdf_url: string | null;
          proceso_id: string;
          raw_data: Json;
          row_number: number;
          sat_status: string | null;
          status: string | null;
          updated_at: string | null;
          uuid_timbre: string | null;
          validated_data: Json | null;
          validation_errors: Json | null;
          xml_url: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          last_pac_response?: Json | null;
          pdf_url?: string | null;
          proceso_id: string;
          raw_data: Json;
          row_number: number;
          sat_status?: string | null;
          status?: string | null;
          updated_at?: string | null;
          uuid_timbre?: string | null;
          validated_data?: Json | null;
          validation_errors?: Json | null;
          xml_url?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          last_pac_response?: Json | null;
          pdf_url?: string | null;
          proceso_id?: string;
          raw_data?: Json;
          row_number?: number;
          sat_status?: string | null;
          status?: string | null;
          updated_at?: string | null;
          uuid_timbre?: string | null;
          validated_data?: Json | null;
          validation_errors?: Json | null;
          xml_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "filas_proceso_proceso_id_fkey";
            columns: ["proceso_id"];
            isOneToOne: false;
            referencedRelation: "procesos";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          source: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          source?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          source?: string | null;
        };
        Relationships: [];
      };
      procesos: {
        Row: {
          created_at: string | null;
          error_rows: number | null;
          error_summary: Json | null;
          failed_rows: number | null;
          id: string;
          original_filename: string | null;
          stamped_rows: number | null;
          status: string | null;
          total_rows: number | null;
          updated_at: string | null;
          user_id: string;
          valid_rows: number | null;
        };
        Insert: {
          created_at?: string | null;
          error_rows?: number | null;
          error_summary?: Json | null;
          failed_rows?: number | null;
          id?: string;
          original_filename?: string | null;
          stamped_rows?: number | null;
          status?: string | null;
          total_rows?: number | null;
          updated_at?: string | null;
          user_id: string;
          valid_rows?: number | null;
        };
        Update: {
          created_at?: string | null;
          error_rows?: number | null;
          error_summary?: Json | null;
          failed_rows?: number | null;
          id?: string;
          original_filename?: string | null;
          stamped_rows?: number | null;
          status?: string | null;
          total_rows?: number | null;
          updated_at?: string | null;
          user_id?: string;
          valid_rows?: number | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          company_name: string | null;
          cp_emisor: string | null;
          created_at: string | null;
          full_name: string | null;
          id: string;
          pac_api_key_secret_id: string | null;
          pac_api_secret_secret_id: string | null;
          pac_provider: string | null;
          plan_status: string | null;
          privacy_notice_accepted_at: string | null;
          regimen_fiscal_id: string | null;
          rfc_emisor: string;
          trial_ends_at: string | null;
          updated_at: string | null;
          wa_template_cfdi_listo: string | null;
          wa_template_error_validacion: string | null;
          whatsapp_access_token_secret_id: string | null;
          whatsapp_business_account_id: string | null;
          whatsapp_phone_number_id: string | null;
        };
        Insert: {
          company_name?: string | null;
          cp_emisor?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          id: string;
          pac_api_key_secret_id?: string | null;
          pac_api_secret_secret_id?: string | null;
          pac_provider?: string | null;
          plan_status?: string | null;
          privacy_notice_accepted_at?: string | null;
          regimen_fiscal_id?: string | null;
          rfc_emisor: string;
          trial_ends_at?: string | null;
          updated_at?: string | null;
          wa_template_cfdi_listo?: string | null;
          wa_template_error_validacion?: string | null;
          whatsapp_access_token_secret_id?: string | null;
          whatsapp_business_account_id?: string | null;
          whatsapp_phone_number_id?: string | null;
        };
        Update: {
          company_name?: string | null;
          cp_emisor?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          id?: string;
          pac_api_key_secret_id?: string | null;
          pac_api_secret_secret_id?: string | null;
          pac_provider?: string | null;
          plan_status?: string | null;
          privacy_notice_accepted_at?: string | null;
          regimen_fiscal_id?: string | null;
          rfc_emisor?: string;
          trial_ends_at?: string | null;
          updated_at?: string | null;
          wa_template_cfdi_listo?: string | null;
          wa_template_error_validacion?: string | null;
          whatsapp_access_token_secret_id?: string | null;
          whatsapp_business_account_id?: string | null;
          whatsapp_phone_number_id?: string | null;
        };
        Relationships: [];
      };
      sat_catalogos: {
        Row: {
          attributes: Json;
          catalogo_type: string;
          code: string;
          description: string;
          id: number;
          parent_code: string | null;
          search_vector: unknown;
          valid_from: string;
          valid_to: string | null;
          version: string;
        };
        Insert: {
          attributes?: Json;
          catalogo_type: string;
          code: string;
          description: string;
          id?: number;
          parent_code?: string | null;
          search_vector?: unknown;
          valid_from: string;
          valid_to?: string | null;
          version: string;
        };
        Update: {
          attributes?: Json;
          catalogo_type?: string;
          code?: string;
          description?: string;
          id?: number;
          parent_code?: string | null;
          search_vector?: unknown;
          valid_from?: string;
          valid_to?: string | null;
          version?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      vault_create_secret: {
        Args: { secret: string; secret_name: string };
        Returns: string;
      };
      vault_read_secret: { Args: { secret_id: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
