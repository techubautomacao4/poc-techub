export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    name: string
                    email: string
                    password_hash: string // Note: In real Supabase Auth, we don't usually access this directly, but it's in the schema.
                    role_id: string | null
                    active: boolean | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    email: string
                    password_hash: string
                    role_id?: string | null
                    active?: boolean | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string
                    password_hash?: string
                    role_id?: string | null
                    active?: boolean | null
                    created_at?: string | null
                }
            }
            roles: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    created_at?: string | null
                }
            }
            analysts: {
                Row: {
                    id: string
                    name: string
                    email: string
                    active: boolean | null
                    user_id: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    email: string
                    active?: boolean | null
                    user_id?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string
                    active?: boolean | null
                    user_id?: string | null
                    created_at?: string | null
                }
            }
            pocs: {
                Row: {
                    id: string
                    poc_code: string
                    poc_type_id: string | null
                    client_name: string | null
                    commercial_owner: string | null
                    scheduled_date: string | null
                    duration_hours: number | null
                    assigned_analyst_id: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    poc_code: string
                    poc_type_id?: string | null
                    client_name?: string | null
                    commercial_owner?: string | null
                    scheduled_date?: string | null
                    duration_hours?: number | null
                    assigned_analyst_id?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    poc_code?: string
                    poc_type_id?: string | null
                    client_name?: string | null
                    commercial_owner?: string | null
                    scheduled_date?: string | null
                    duration_hours?: number | null
                    assigned_analyst_id?: string | null
                    created_at?: string | null
                }
            }
            poc_types: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                }
            }
            analyst_calendar: {
                Row: {
                    id: string
                    analyst_id: string | null
                    start_time: string
                    end_time: string
                    is_poc: boolean | null
                }
                Insert: {
                    id?: string
                    analyst_id?: string | null
                    start_time: string
                    end_time: string
                    is_poc?: boolean | null
                }
                Update: {
                    id?: string
                    analyst_id?: string | null
                    start_time?: string
                    end_time?: string
                    is_poc?: boolean | null
                }
            }
        }
    }
}
