import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Update this with your actual production domain for high security
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// Validate photoBase64 exists and isn't too large (~7.5MB base64 ≈ 5MB file)
if (typeof photoBase64 !== "string" || photoBase64.length < 100 || photoBase64.length > 10 * 1024 * 1024) {
  return new Response(
    JSON.stringify({ error: "Invalid or too large photo. Max 5MB." }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Forward validated data to n8n
const validatedBody = {
  generationId, // Forward the unique ID
  childName: childName.trim(),
  themeId,
  themeName: typeof themeName === "string" ? themeName.slice(0, 50) : "",
  photoBase64,
  photoMime,
};

const startTime = Date.now();
console.log(`📡 [EDGE] Forwarding request to n8n...`);

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

// IMMEDIATELY return the executionId to the browser
// This prevents the browser from waiting (and timing out)
const triggerData = await n8nRes.json().catch(() => ({}));
const executionId = triggerData.executionId || triggerData.id;

console.log(`✅ [EDGE] Workflow started. Execution ID: ${executionId}`);

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
