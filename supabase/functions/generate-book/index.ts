import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NAME_REGEX = /^[a-zA-Z\s\-']+$/;
const ALLOWED_MIMES = ["image/jpeg", "image/jpg", "image/png"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get webhook URL
    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL") || "https://wonderwrapslb.app.n8n.cloud/webhook-test/2b7a5bec-96be-4571-8c7c-aaec8d0934fc";
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate body
    const body = await req.json();
    const { generationId, childName, themeId, themeName, photoBase64, photoMime } = body;

    // Validate childName
    if (
      typeof childName !== "string" ||
      childName.trim().length < 2 ||
      childName.trim().length > 30 ||
      !NAME_REGEX.test(childName.trim())
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid child name. Must be 2-30 letters, spaces, hyphens or apostrophes." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate themeId dynamically from the database
    const { data: themeData, error: themeError } = await supabase
      .from('themes')
      .select('id, is_active')
      .eq('id', themeId)
      .single();

    if (themeError || !themeData) {
      console.error(`❌ [EDGE] Theme validation failed for ID ${themeId}:`, themeError?.message || 'Theme not found');
      return new Response(
        JSON.stringify({ error: "Invalid theme selected. This theme may have been removed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (themeData.is_active === false) {
      return new Response(
        JSON.stringify({ error: "This theme is currently disabled." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate photoMime
    if (typeof photoMime !== "string" || !ALLOWED_MIMES.includes(photoMime)) {
      return new Response(
        JSON.stringify({ error: "Invalid photo format. Use JPEG or PNG." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate photoBase64
    if (typeof photoBase64 !== "string" || photoBase64.length < 100 || photoBase64.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Invalid or too large photo. Max 5MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward validated data to n8n
    const validatedBody = {
      generationId,
      childName: childName.trim(),
      themeId,
      themeName: typeof themeName === "string" ? themeName.slice(0, 50) : "",
      photoBase64,
      photoMime,
    };

    console.log(`📡 [EDGE] Forwarding request to n8n...`);
    const startTime = Date.now();

    const n8nRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedBody),
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`📥 [EDGE] n8n responded after ${duration}s with status ${n8nRes.status}`);

    if (!n8nRes.ok) {
      const errorText = await n8nRes.text().catch(() => "Unknown n8n error");
      console.error(`❌ [EDGE] n8n error ${n8nRes.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ error: "The book generation service is currently busy.", details: errorText }),
        {
          status: n8nRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const triggerData = await n8nRes.json().catch(() => ({}));
    const executionId = triggerData.executionId || triggerData.id;

    return new Response(
      JSON.stringify({
        message: "Generation started successfully",
        executionId: executionId,
        status: "pending"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Book generation error:", err instanceof Error ? err.message : "Internal Error");
    return new Response(
      JSON.stringify({ error: "A magical error occurred during generation. Please try again later." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
