import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: `Eres un extractor de datos de exámenes médicos chilenos. 
Analiza este PDF y devuelve SOLO un JSON válido sin backticks ni markdown con esta estructura exacta:
{
  "nombre": "nombre del examen",
  "tipo": "lab" o "inf",
  "fecha": "YYYY-MM-DD o null",
  "clinica": "nombre de la clínica o null",
  "medico": "nombre del médico o null",
  "categoria": "Neurología|Imagenología|ORL|Cardiología|Hematología|Infectología|Otro",
  "valor": "valor numérico como string o null",
  "unidad": "unidad de medida o null",
  "ref_min": número o null,
  "ref_max": número o null,
  "estado": "normal|alto|bajo|negativo|no reactivo|indeterminado o null",
  "hallazgos": "texto de hallazgos si es informe o null",
  "impresion": "texto de impresión/conclusión si es informe o null",
  "resultado": "normal|alterado|en control o null"
}`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content[0].text;
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});