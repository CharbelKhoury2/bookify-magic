import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Update this with your actual production domain for high security
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_THEME_IDS = [
  "cosmic_journey",
  "zoo_explorer",
  "dragon_quest",
  "princess_story",
  "champion_spirit",
  "tooth_fairy",
];

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
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get webhook URL from server-side secret, with hardcoded fallback for deployment without CLI
    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL") || "https://wonderwrapslb.app.n8n.cloud/webhook-test/2b7a5bec-96be-4571-8c7c-aaec8d0934fc";
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate body
    const body = await req.json();

    const { childName, themeId, themeName, photoBase64, photoMime } = body;

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

    // Validate themeId
    if (typeof themeId !== "string" || !ALLOWED_THEME_IDS.includes(themeId)) {
      return new Response(
        JSON.stringify({ error: "Invalid theme selected." }),
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

    // Validate photoBase64 exists and isn't too large (~7.5MB base64 ≈ 5MB file)
    if (typeof photoBase64 !== "string" || photoBase64.length < 100 || photoBase64.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Invalid or too large photo. Max 5MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward validated data to n8n
    const validatedBody = {
      childName: childName.trim(),
      themeId,
      themeName: typeof themeName === "string" ? themeName.slice(0, 50) : "",
      photoBase64,
      photoMime,
    };

    const n8nRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedBody),
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
    // Sanitize error logging as per security scan (Info)
    // Detailed error is logged to internal console but not returned to client
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
