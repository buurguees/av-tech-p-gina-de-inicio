#!/usr/bin/env npx tsx
/**
 * Script para enviar el informe PyG del mes actual por email.
 * Uso: npx tsx scripts/send-pyg-report-email.ts
 *
 * Requisitos:
 * - CRON_SECRET en Supabase Edge Functions (o vacío para desarrollo)
 * - RESEND_API_KEY configurado en Supabase
 * - Período cerrado en Contabilidad
 */

const SUPABASE_URL = "https://takvthfatlcjsqgssnta.supabase.co";
const CRON_SECRET = process.env.CRON_SECRET || "";

async function main() {
  const url = `${SUPABASE_URL}/functions/v1/monthly-report-worker`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (CRON_SECRET) {
    headers["Authorization"] = `Bearer ${CRON_SECRET}`;
  }

  console.log("Enviando solicitud al worker de informes...");
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: "{}",
  });

  const data = await res.json().catch(() => ({}));
  console.log("Respuesta:", JSON.stringify(data, null, 2));

  if (res.ok && data.processed === 1) {
    console.log("\n✅ Informe generado y enviado a alex.burgues@avtechesdeveniments.com");
  } else if (data.message === "No pending reports") {
    console.log("\n⚠️ No hay informes pendientes. Cierra el período en Contabilidad primero.");
  } else {
    console.log("\n❌ Error:", data.error || data.message || res.statusText);
  }
}

main().catch(console.error);
