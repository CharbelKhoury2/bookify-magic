import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get webhook URL from server-side secret
    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Forward the request body to n8n
    const body = await req.json();

    // Log the generation to book_generations using service role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const userId = data.claims.sub as string;
    await serviceClient.from("book_generations").insert({
      user_id: userId,
      child_name: body.childName || "Unknown",
      theme_id: body.themeId || "unknown",
      theme_name: body.themeName || "Unknown",
      status: "pending",
    });

    const n8nRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!n8nRes.ok) {
      const text = await n8nRes.text().catch(() => "");
      console.error(`n8n error ${n8nRes.status}: ${text}`);
      return new Response(
        JSON.stringify({ error: "Book generation service error" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await n8nRes.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
