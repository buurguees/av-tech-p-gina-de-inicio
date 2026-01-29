import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const BACKOFF_MINUTES = [5, 30, 120]; // 5m, 30m, 2h

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: pending } = await supabase
      .schema("accounting")
      .from("monthly_reports")
      .select("id, year, month, retry_count")
      .in("status", ["PENDING", "FAILED"])
      .lte("run_after", new Date().toISOString())
      .order("updated_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!pending) {
      return new Response(JSON.stringify({ processed: 0, message: "No pending reports" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    await supabase
      .schema("accounting")
      .from("monthly_reports")
      .update({ status: "GENERATING", updated_at: new Date().toISOString() })
      .eq("id", pending.id);

    try {
      const { data: dataset, error: datasetError } = await supabase.rpc("get_monthly_closure_report_dataset", {
        p_year: pending.year,
        p_month: pending.month,
      });

      if (datasetError || !dataset) {
        throw new Error(datasetError?.message || "Failed to fetch dataset");
      }

      const doc = new jsPDF();
      const company = dataset.company || {};
      const period = dataset.period || {};
      const profit = dataset.profit_summary?.[0] || {};

      doc.setFontSize(22);
      doc.text(company.legal_name || "Empresa", 20, 25);
      doc.setFontSize(12);
      doc.text(`Informe de cierre - ${period.month}/${period.year}`, 20, 35);
      doc.text(`Período cerrado y bloqueado: Sí`, 20, 45);
      doc.text(`Generado: ${new Date().toLocaleString("es-ES")}`, 20, 55);

      doc.setFontSize(14);
      doc.text("Resumen ejecutivo", 20, 70);
      doc.setFontSize(10);
      doc.text(`Ingresos: ${Number(profit.total_revenue || 0).toFixed(2)} €`, 20, 80);
      doc.text(`Gastos operativos: ${Number(profit.operating_expenses || 0).toFixed(2)} €`, 20, 88);
      doc.text(`BAI: ${Number(profit.profit_before_tax || 0).toFixed(2)} €`, 20, 96);
      doc.text(`IS: ${Number(profit.corporate_tax_amount || 0).toFixed(2)} €`, 20, 104);
      doc.text(`Resultado neto: ${Number(profit.net_profit || 0).toFixed(2)} €`, 20, 112);

      const pdfBuffer = doc.output("arraybuffer");
      const storagePath = `monthly/${pending.year}-${String(pending.month).padStart(2, "0")}/closure-report_v1.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const settings = await supabase.rpc("get_report_settings").then((r) => r.data?.[0] || {});

      await supabase
        .schema("accounting")
        .from("monthly_reports")
        .update({
          status: "READY",
          storage_path: storagePath,
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pending.id);

      if (settings.monthly_report_auto_send_enabled && settings.recipients_to?.length > 0) {
        await supabase
          .schema("accounting")
          .from("monthly_reports")
          .update({ status: "EMAIL_SENDING", updated_at: new Date().toISOString() })
          .eq("id", pending.id);

        const { data: signedUrl } = await supabase.storage
          .from("reports")
          .createSignedUrl(storagePath, (settings.signed_link_expiry_days || 30) * 24 * 60 * 60);

        const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
        const monthName = monthNames[(pending.month || 1) - 1];
        const subject = (settings.email_subject_template || "Informe cierre contable – {Mes} {Año}")
          .replace("{Mes}", monthName)
          .replace("{Año}", String(pending.year));

        const Resend = (await import("https://esm.sh/resend@2.0.0")).Resend;
        const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

        const html = `
          <h2>Informe de cierre contable - ${monthName} ${pending.year}</h2>
          <p>Ingresos: ${Number(profit.total_revenue || 0).toFixed(2)} €</p>
          <p>Gastos operativos: ${Number(profit.operating_expenses || 0).toFixed(2)} €</p>
          <p>Resultado neto: ${Number(profit.net_profit || 0).toFixed(2)} €</p>
          <p><a href="${signedUrl?.signedUrl || "#"}">Descargar informe PDF</a></p>
        `;

        const { error: emailError } = await resend.emails.send({
          from: settings.from_email || "AV TECH Web <onboarding@resend.dev>",
          to: settings.recipients_to,
          cc: settings.recipients_cc,
          subject,
          html,
        });

        if (emailError) {
          const retryIdx = Math.min(pending.retry_count || 0, BACKOFF_MINUTES.length - 1);
          const runAfter = new Date();
          runAfter.setMinutes(runAfter.getMinutes() + BACKOFF_MINUTES[retryIdx]);

          await supabase
            .schema("accounting")
            .from("monthly_reports")
            .update({
              status: "FAILED",
              error_message: emailError.message,
              retry_count: (pending.retry_count || 0) + 1,
              run_after: runAfter.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", pending.id);
        } else {
          await supabase
            .schema("accounting")
            .from("monthly_reports")
            .update({
              status: "SENT",
              sent_at: new Date().toISOString(),
              sent_to: settings.recipients_to,
              sent_cc: settings.recipients_cc,
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", pending.id);
        }
      }
    } catch (err) {
      const retryIdx = Math.min(pending.retry_count || 0, BACKOFF_MINUTES.length - 1);
      const runAfter = new Date();
      runAfter.setMinutes(runAfter.getMinutes() + BACKOFF_MINUTES[retryIdx]);

      await supabase
        .schema("accounting")
        .from("monthly_reports")
        .update({
          status: "FAILED",
          error_message: String(err?.message || err),
          retry_count: (pending.retry_count || 0) + 1,
          run_after: runAfter.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pending.id);

      throw err;
    }

    return new Response(JSON.stringify({ processed: 1, report_id: pending.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("monthly-report-worker error:", error);
    return new Response(
      JSON.stringify({ error: String(error?.message || error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
