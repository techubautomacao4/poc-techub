import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SchedulingRequest {
    pocId: string;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { pocId } = await req.json() as SchedulingRequest;

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Fetch POC Details
        const { data: poc, error: pocError } = await supabaseClient
            .from("pocs")
            .select("*, poc_type:poc_types(name, duration_hours)")
            .eq("id", pocId)
            .single();

        if (pocError || !poc) throw new Error("POC not found");

        // 2. Update POC Status to WAITING_APPROVAL
        // In the future flow, an admin will review this and then trigger the actual invite.
        const { error: updateError } = await supabaseClient
            .from("pocs")
            .update({
                status: "WAITING_APPROVAL",
                // We could also do the round-robin assignment here, 
                // but if it requires approval, maybe the admin chooses the analyst?
                // The user said: "invite sent only after acceptance".
            })
            .eq("id", pocId);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true, message: "POC sent for approval" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
