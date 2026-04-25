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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      egresados: {
        Row: {
          anio_egreso: number | null
          carrera: string | null
          created_at: string
          cv_url: string | null
          estado: Database["public"]["Enums"]["estado_validacion"]
          experiencia: string | null
          habilidades: string[] | null
          id: string
          matricula: string | null
          motivo_rechazo: string | null
          ubicacion: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anio_egreso?: number | null
          carrera?: string | null
          created_at?: string
          cv_url?: string | null
          estado?: Database["public"]["Enums"]["estado_validacion"]
          experiencia?: string | null
          habilidades?: string[] | null
          id?: string
          matricula?: string | null
          motivo_rechazo?: string | null
          ubicacion?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anio_egreso?: number | null
          carrera?: string | null
          created_at?: string
          cv_url?: string | null
          estado?: Database["public"]["Enums"]["estado_validacion"]
          experiencia?: string | null
          habilidades?: string[] | null
          id?: string
          matricula?: string | null
          motivo_rechazo?: string | null
          ubicacion?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          created_at: string
          descripcion: string | null
          direccion: string | null
          estado: Database["public"]["Enums"]["estado_validacion"]
          giro: string | null
          id: string
          logo_url: string | null
          motivo_rechazo: string | null
          razon_social: string
          responsable: string | null
          rfc: string
          sitio_web: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_validacion"]
          giro?: string | null
          id?: string
          logo_url?: string | null
          motivo_rechazo?: string | null
          razon_social: string
          responsable?: string | null
          rfc: string
          sitio_web?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_validacion"]
          giro?: string | null
          id?: string
          logo_url?: string | null
          motivo_rechazo?: string | null
          razon_social?: string
          responsable?: string | null
          rfc?: string
          sitio_web?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      eventos_seguimiento: {
        Row: {
          created_at: string
          descripcion: string | null
          empresa_id: string
          fecha: string
          hora: string | null
          id: string
          postulacion_id: string | null
          tipo: Database["public"]["Enums"]["tipo_evento"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          empresa_id: string
          fecha: string
          hora?: string | null
          id?: string
          postulacion_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          empresa_id?: string
          fecha?: string
          hora?: string | null
          id?: string
          postulacion_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_seguimiento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_seguimiento_postulacion_id_fkey"
            columns: ["postulacion_id"]
            isOneToOne: false
            referencedRelation: "postulaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      postulaciones: {
        Row: {
          created_at: string
          egresado_id: string
          estado: Database["public"]["Enums"]["estado_postulacion"]
          id: string
          mensaje: string | null
          notas_empresa: string | null
          updated_at: string
          vacante_id: string
        }
        Insert: {
          created_at?: string
          egresado_id: string
          estado?: Database["public"]["Enums"]["estado_postulacion"]
          id?: string
          mensaje?: string | null
          notas_empresa?: string | null
          updated_at?: string
          vacante_id: string
        }
        Update: {
          created_at?: string
          egresado_id?: string
          estado?: Database["public"]["Enums"]["estado_postulacion"]
          id?: string
          mensaje?: string | null
          notas_empresa?: string | null
          updated_at?: string
          vacante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "postulaciones_egresado_id_fkey"
            columns: ["egresado_id"]
            isOneToOne: false
            referencedRelation: "egresados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulaciones_vacante_id_fkey"
            columns: ["vacante_id"]
            isOneToOne: false
            referencedRelation: "vacantes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          created_at: string
          id: string
          nombre: string
          telefono: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          nombre: string
          telefono?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
          user_id?: string
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
      vacantes: {
        Row: {
          area: string | null
          carrera_solicitada: string | null
          created_at: string
          descripcion: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_vacante"]
          fecha_cierre: string | null
          id: string
          puesto: string
          requisitos: string | null
          salario_max: number | null
          salario_min: number | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          carrera_solicitada?: string | null
          created_at?: string
          descripcion: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_vacante"]
          fecha_cierre?: string | null
          id?: string
          puesto: string
          requisitos?: string | null
          salario_max?: number | null
          salario_min?: number | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          carrera_solicitada?: string | null
          created_at?: string
          descripcion?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_vacante"]
          fecha_cierre?: string | null
          id?: string
          puesto?: string
          requisitos?: string | null
          salario_max?: number | null
          salario_min?: number | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacantes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_egresado_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_empresa_id_for_user: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "egresado" | "empresa" | "admin" | "super_admin"
      estado_postulacion:
        | "pendiente"
        | "en_revision"
        | "entrevista"
        | "contratado"
        | "rechazado"
      estado_vacante: "activa" | "cerrada"
      estado_validacion: "pendiente" | "aprobado" | "rechazado"
      tipo_contrato:
        | "tiempo_completo"
        | "medio_tiempo"
        | "por_proyecto"
        | "practicas"
      tipo_evento: "contacto" | "entrevista" | "contratacion" | "otro"
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
      app_role: ["egresado", "empresa", "admin", "super_admin"],
      estado_postulacion: [
        "pendiente",
        "en_revision",
        "entrevista",
        "contratado",
        "rechazado",
      ],
      estado_vacante: ["activa", "cerrada"],
      estado_validacion: ["pendiente", "aprobado", "rechazado"],
      tipo_contrato: [
        "tiempo_completo",
        "medio_tiempo",
        "por_proyecto",
        "practicas",
      ],
      tipo_evento: ["contacto", "entrevista", "contratacion", "otro"],
    },
  },
} as const
