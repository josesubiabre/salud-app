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
    const { type, nombre, dosis, medicamentos } = await req.json();

    let prompt = "";
    if (type === "explain") {
      prompt = `Eres un asistente médico informativo. El usuario toma el medicamento "${nombre}"${dosis ? ' a dosis de ' + dosis : ''}. Responde SOLO en JSON con este formato exacto, sin texto adicional ni backticks:
{"descripcion":"descripción simple en 1-2 oraciones de qué es este medicamento","uso":"para qué se usa principalmente en 1 oración","efectos":"los 3-4 efectos secundarios más comunes separados por coma"}`;
    } else if (type === "interactions") {
      const lista = (medicamentos || []).map((m: string) => `- ${m}`).join("\n");
      prompt = `Eres un asistente médico informativo. El paciente toma los siguientes medicamentos:\n${lista}\n\nAnaliza posibles interacciones entre ellos. Responde SOLO en JSON con este formato exacto, sin texto adicional ni backticks:\n{"interacciones":[{"medicamentos":"nombre1 + nombre2","severidad":"leve|moderada|grave","descripcion":"descripción breve de la interacción"}],"sin_interacciones":true|false}\n\nSi no hay interacciones conocidas relevantes, devuelve interacciones como array vacío y sin_interacciones como true.`;
    } else {
      throw new Error("Tipo de solicitud no válido");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content[0].text;
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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
