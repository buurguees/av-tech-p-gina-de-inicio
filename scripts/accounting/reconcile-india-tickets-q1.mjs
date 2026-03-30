import fs from "fs";
import path from "path";
import process from "process";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const PROJECT_IDS = [
  "43baae81-4f55-4c1f-bd9c-a96e106e704f",
  "fbb248ee-2bdc-469c-bf14-75cafedc4553",
];

const REVOLUT_BANK_ACCOUNT_ID = "0ef9d917-0a1a-45cd-8b25-d40adca3d043";
const SESSION_STORAGE_KEY = "sb-takvthfatlcjsqgssnta-auth-token";
const DEFAULT_DRY_RUN_PATH = ".tmp/india-actions-dry-run.json";
const DEFAULT_Q1_PATH = ".tmp/Q1_copy.xlsx";

function parseArgs(argv) {
  const args = {
    apply: false,
    q1Path: DEFAULT_Q1_PATH,
    dryRunPath: DEFAULT_DRY_RUN_PATH,
    outputPath: ".tmp/india-q1-reconciliation-plan.json",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") {
      args.apply = true;
    } else if (arg === "--q1" && argv[i + 1]) {
      args.q1Path = argv[i + 1];
      i += 1;
    } else if (arg === "--dry-run" && argv[i + 1]) {
      args.dryRunPath = argv[i + 1];
      i += 1;
    } else if (arg === "--output" && argv[i + 1]) {
      args.outputPath = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function loadEnvFile(envPath) {
  const env = {};
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!raw || raw.trim().startsWith("#")) continue;
    const eq = raw.indexOf("=");
    if (eq === -1) continue;
    const key = raw.slice(0, eq).trim();
    let value = raw.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
    if (!process.env[key]) process.env[key] = value;
  }
  return env;
}

function excelDateToIso(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const utc = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    return utc.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, d, mo, y] = m;
      return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  return null;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeMerchant(value) {
  const text = normalizeText(value)
    .replace(/\bHELP UBER COM\b/g, "UBER")
    .replace(/\bTRIP\b/g, "")
    .replace(/\bPVT\b/g, "PRIVATE")
    .replace(/\bPVT LTD\b/g, "PRIVATE LIMITED")
    .replace(/\bLTD\b/g, "LIMITED")
    .replace(/\bPVT LIMITED\b/g, "PRIVATE LIMITED")
    .replace(/\bPRIVATE LIMITED\b/g, "")
    .replace(/\bINDIA\b/g, "")
    .replace(/\bSTORE\b/g, "")
    .replace(/\bRETAIL\b/g, "")
    .replace(/\bDIGITAL\b/g, "DIGITAL")
    .replace(/\bENTERPRISES\b/g, "ENTERPRISES")
    .replace(/\s+/g, " ")
    .trim();

  if (text.includes("UBER")) return "UBER";
  if (text.includes("STARBUCKS")) return "STARBUCKS";
  if (text.includes("IKEA")) return "IKEA";
  if (text.includes("RELIANCE")) return "RELIANCE";
  if (text.includes("CROMA")) return "CROMA";
  if (text.includes("CHILIS")) return "CHILIS";
  if (text.includes("DARYAGANJ")) return "DARYAGANJ";
  if (text.includes("FLORET")) return "FLORET";
  if (text.includes("VINAYAKA")) return "VINAYAKA";
  if (text.includes("SANDEEP")) return "SANDEEP";
  if (text.includes("JD COMPUTERS") || text.includes("J D COMPUTERS")) return "JD COMPUTERS";
  if (text.includes("SHREE BADOLLA")) return "SHREE BADOLLA";
  return text;
}

function merchantSimilarity(a, b) {
  const na = normalizeMerchant(a);
  const nb = normalizeMerchant(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 80;
  const setA = new Set(na.split(" ").filter(Boolean));
  const setB = new Set(nb.split(" ").filter(Boolean));
  let overlap = 0;
  for (const token of setA) {
    if (setB.has(token)) overlap += 1;
  }
  return overlap * 20;
}

function readChromeSupabaseSession() {
  const levelDbDir = path.join(
    process.env.LOCALAPPDATA || "",
    "Google",
    "Chrome",
    "User Data",
    "Default",
    "Local Storage",
    "leveldb",
  );

  const files = fs
    .readdirSync(levelDbDir)
    .filter((name) => /\.(ldb|log)$/i.test(name))
    .sort()
    .reverse();

  for (const name of files) {
    const fullPath = path.join(levelDbDir, name);
    let text;
    try {
      text = fs.readFileSync(fullPath).toString("latin1");
    } catch {
      continue;
    }
    const index = text.lastIndexOf(SESSION_STORAGE_KEY);
    if (index === -1) continue;
    const jsonStart = text.indexOf('{"access_token"', index);
    if (jsonStart === -1) continue;
    let depth = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === "{") depth += 1;
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }
    if (jsonEnd === -1) continue;
    try {
      return JSON.parse(text.slice(jsonStart, jsonEnd));
    } catch {
      continue;
    }
  }

  throw new Error("No se pudo extraer la sesion local de Supabase desde Chrome.");
}

function createAuthedClient(env, session) {
  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    },
  );
  return supabase;
}

async function ensureFreshSession(env, session) {
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!publishableKey) throw new Error("Falta VITE_SUPABASE_PUBLISHABLE_KEY/VITE_SUPABASE_ANON_KEY en .env");

  const supabase = createClient(env.VITE_SUPABASE_URL, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const now = Math.floor(Date.now() / 1000);
  if ((session.expires_at || 0) > now + 300) return session;

  const { data, error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (error || !data.session) {
    throw new Error(`No se pudo refrescar la sesion de Supabase: ${error?.message || "sin sesion"}`);
  }

  return {
    ...session,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  };
}

function readRevolutRows(q1Path) {
  const workbook = XLSX.readFile(q1Path);
  const sheet = workbook.Sheets["Revolut Business"];
  if (!sheet) throw new Error(`No existe la hoja 'Revolut Business' en ${q1Path}`);

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const headerRow = rawRows.find(
    (row) => row["CONCILIACIÓN BANCARIA — REVOLUT BUSINESS"] === "Fecha" && row.__EMPTY === "Descripción",
  );
  const headerIndex = rawRows.indexOf(headerRow);
  const dataRows = rawRows.slice(headerIndex + 1);

  return dataRows
    .map((row) => ({
      date: excelDateToIso(row["CONCILIACIÓN BANCARIA — REVOLUT BUSINESS"]),
      description: row.__EMPTY,
      reference: row.__EMPTY_1,
      cardHolder: row.__EMPTY_2,
      card: row.__EMPTY_3,
      currency: row.__EMPTY_4,
      amountOriginal: row.__EMPTY_5 == null ? null : Number(row.__EMPTY_5),
      amountEur: row.__EMPTY_6 == null ? null : round2(Math.abs(Number(row.__EMPTY_6))),
      balanceEur: row.__EMPTY_7 == null ? null : Number(row.__EMPTY_7),
      type: row.__EMPTY_8,
      linkedDoc: row.__EMPTY_9,
      reconciled: row.__EMPTY_10,
      matched: false,
    }))
    .filter((row) => row.date && row.currency === "INR" && row.amountOriginal != null && row.amountEur != null);
}

function readDryRunGroups(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8")).filter((group) => !group.skip && group.currency === "INR");
}

async function listAllExpenses(supabase) {
  const all = [];
  for (const projectId of PROJECT_IDS) {
    const { data, error } = await supabase.rpc("list_purchase_invoices", {
      p_project_id: projectId,
      p_document_type: "EXPENSE",
      p_page: 1,
      p_page_size: 500,
    });
    if (error) throw error;
    all.push(...(data || []));
  }
  return all;
}

async function getInvoiceLines(supabase, invoiceId) {
  const { data, error } = await supabase.rpc("get_purchase_invoice_lines", { p_invoice_id: invoiceId });
  if (error) throw error;
  return data || [];
}

async function getInvoicePayments(supabase, invoiceId) {
  const { data, error } = await supabase.rpc("get_purchase_invoice_payments", { p_invoice_id: invoiceId });
  if (error) throw error;
  return data || [];
}

function chooseBankMatch(group, revolutRows) {
  const docDate = group.docDate || group.keep?.issue_date || null;
  const merchant = group.merchant || group.keep?.provider_name || group.keep?.manual_beneficiary_name || "";
  const targetInr = group.docTotalInr == null ? null : round2(group.docTotalInr);
  if (targetInr == null) return null;

  const candidates = revolutRows
    .filter((row) => !row.matched && round2(row.amountOriginal) === targetInr)
    .map((row) => {
      const dateDistance =
        docDate && row.date
          ? Math.abs((new Date(row.date).getTime() - new Date(docDate).getTime()) / (24 * 3600 * 1000))
          : 99;
      const merchantScore = merchantSimilarity(merchant, row.description || row.linkedDoc || "");
      let score = 0;
      if (dateDistance === 0) score += 100;
      else if (dateDistance <= 1) score += 80;
      else if (dateDistance <= 2) score += 60;
      else if (dateDistance <= 4) score += 20;
      score += merchantScore;
      return { row, score, dateDistance, merchantScore };
    })
    .sort((a, b) => b.score - a.score || a.dateDistance - b.dateDistance);

  if (candidates.length === 0) return null;
  if (candidates[0].score < 60) return null;
  return candidates[0];
}

function slugConcept(text) {
  const merchant = normalizeMerchant(text);
  if (!merchant) return "GASTO";
  return merchant.slice(0, 60);
}

function buildPlan(groups, liveInvoices, revolutRows) {
  const liveById = new Map(liveInvoices.map((row) => [row.id, row]));
  const plan = [];

  for (const group of groups) {
    const bankMatch = chooseBankMatch(group, revolutRows);
    if (bankMatch) bankMatch.row.matched = true;

    const keep = group.keep ? liveById.get(group.keep.id) || group.keep : null;
    const deleteItems = (group.delete || []).map((item) => liveById.get(item.id) || item);
    const matchedEur = bankMatch?.row?.amountEur ?? null;
    const expectedEur = group.expectedEur == null ? null : round2(group.expectedEur);
    const finalEur = matchedEur ?? expectedEur;
    const currentTotal = keep?.total == null ? null : round2(keep.total);
    const deltaVsCurrent = currentTotal == null || finalEur == null ? null : round2(finalEur - currentTotal);
    const merchant = group.merchant || keep?.provider_name || keep?.manual_beneficiary_name || "GASTO";
    const concept = slugConcept(merchant);
    const expenseCategory =
      normalizeMerchant(merchant) === "UBER" ? "TRANSPORT" : keep?.expense_category || null;

    plan.push({
      filePath: group.filePath,
      docDate: group.docDate || keep?.issue_date || null,
      merchant,
      concept,
      expenseCategory,
      docTotalInr: group.docTotalInr,
      expectedEur,
      matchedEur,
      finalEur,
      currentTotal,
      deltaVsCurrent,
      keep,
      deleteItems,
      hasLockedCanonical: Boolean(group.hasLockedCanonical),
      process: Boolean(group.process),
      bankMatch: bankMatch
        ? {
            date: bankMatch.row.date,
            description: bankMatch.row.description,
            reference: bankMatch.row.reference,
            amountOriginal: bankMatch.row.amountOriginal,
            amountEur: bankMatch.row.amountEur,
            card: bankMatch.row.card,
            cardHolder: bankMatch.row.cardHolder,
            type: bankMatch.row.type,
            score: bankMatch.score,
          }
        : null,
    });
  }

  return plan;
}

function summarizePlan(plan) {
  const stats = {
    totalGroups: plan.length,
    processableGroups: 0,
    lockedCanonicalGroups: 0,
    groupsWithBankMatch: 0,
    groupsUsingEcbFallback: 0,
    duplicateInvoicesToDelete: 0,
    payableLockedGroups: 0,
    payableEditableGroups: 0,
    blockedMismatchGroups: 0,
  };

  for (const item of plan) {
    if (item.process) stats.processableGroups += 1;
    if (item.hasLockedCanonical) stats.lockedCanonicalGroups += 1;
    if (item.bankMatch) stats.groupsWithBankMatch += 1;
    else if (item.finalEur != null) stats.groupsUsingEcbFallback += 1;
    stats.duplicateInvoicesToDelete += item.deleteItems.length;
    if (!item.keep || Number(item.keep.pending_amount || 0) <= 0) continue;
    if (item.keep.is_locked) {
      if (item.deltaVsCurrent == null || Math.abs(item.deltaVsCurrent) <= 0.01) stats.payableLockedGroups += 1;
      else stats.blockedMismatchGroups += 1;
    } else {
      stats.payableEditableGroups += 1;
    }
  }

  return stats;
}

async function mutateDeleteInvoice(supabase, invoiceId, currentStatus) {
  if (currentStatus !== "DRAFT" && currentStatus !== "PENDING") {
    const { error: statusError } = await supabase.rpc("update_purchase_invoice", {
      p_invoice_id: invoiceId,
      p_status: "DRAFT",
    });
    if (statusError) throw statusError;
  }

  const { error } = await supabase.rpc("delete_purchase_invoice", { p_invoice_id: invoiceId });
  if (error) throw error;
}

async function mutateKeepInvoice(supabase, item) {
  if (!item.keep || !item.process) return { status: "skipped" };
  if (Number(item.keep.pending_amount || 0) <= 0) return { status: "already_paid" };
  if (item.finalEur == null) return { status: "missing_amount" };

  const safeDelta = item.deltaVsCurrent == null || Math.abs(item.deltaVsCurrent) <= 0.01;
  if (item.keep.is_locked && !safeDelta) {
    return { status: "locked_mismatch", amount: item.currentTotal, bankAmount: item.finalEur };
  }

  const amount = item.keep.is_locked ? round2(item.keep.total) : round2(item.finalEur);
  const paymentDate = item.bankMatch?.date || item.docDate || item.keep.issue_date;
  const paymentNote = item.bankMatch
    ? `Conciliado con Revolut Business Q1. ${item.bankMatch.description || ""}${safeDelta && item.deltaVsCurrent ? ` Delta redondeo ${item.deltaVsCurrent.toFixed(2)} EUR.` : ""}`.trim()
    : `Sin match bancario exacto; importe EUR por fallback ECB.`;

  let approveData = null;
  if (!item.keep.is_locked) {
    const { error: updateError } = await supabase.rpc("update_purchase_invoice", {
      p_invoice_id: item.keep.id,
      p_status: "PENDING_VALIDATION",
      p_expense_category: item.expenseCategory,
      p_manual_beneficiary_name: item.merchant,
      p_internal_notes: paymentNote,
    });
    if (updateError) throw updateError;

    const { error: linesError } = await supabase.rpc("replace_purchase_invoice_lines", {
      p_invoice_id: item.keep.id,
      p_lines: [
        {
          concept: item.concept,
          description: item.docTotalInr ? `${item.docTotalInr} INR` : item.merchant,
          quantity: 1,
          unit_price: amount,
          tax_rate: 0,
          discount_percent: 0,
          withholding_tax_rate: 0,
        },
      ],
    });
    if (linesError) throw linesError;

    const approveResult = await supabase.rpc("approve_purchase_invoice", {
      p_invoice_id: item.keep.id,
    });
    if (approveResult.error) throw approveResult.error;
    approveData = approveResult.data;
  }

  const paymentResult = await supabase.rpc("register_purchase_payment", {
    p_invoice_id: item.keep.id,
    p_amount: amount,
    p_payment_date: paymentDate,
    p_payment_method: "CARD",
    p_company_bank_account_id: REVOLUT_BANK_ACCOUNT_ID,
    p_bank_reference: item.bankMatch?.reference || null,
    p_notes: paymentNote,
  });
  if (paymentResult.error) throw paymentResult.error;

  return {
    status: "updated",
    approvedNumber: Array.isArray(approveData) ? approveData[0]?.invoice_number : null,
    paymentId: paymentResult.data,
    amount,
    paymentDate,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnvFile(path.join(process.cwd(), ".env"));
  const rawSession = readChromeSupabaseSession();
  const session = await ensureFreshSession(env, rawSession);
  const supabase = createAuthedClient(env, session);

  const { data: userInfo, error: userError } = await supabase.rpc("get_current_user_info");
  if (userError) throw userError;
  if (!Array.isArray(userInfo) || userInfo.length === 0) {
    throw new Error("No hay un usuario autenticado valido para operar en Supabase.");
  }

  const dryRunGroups = readDryRunGroups(args.dryRunPath);
  const revolutRows = readRevolutRows(args.q1Path);
  const liveInvoices = await listAllExpenses(supabase);
  const plan = buildPlan(dryRunGroups, liveInvoices, revolutRows);
  const stats = summarizePlan(plan);

  const output = {
    generatedAt: new Date().toISOString(),
    user: {
      id: userInfo[0].user_id,
      email: userInfo[0].email,
      full_name: userInfo[0].full_name,
    },
    stats,
    plan,
  };

  fs.writeFileSync(args.outputPath, JSON.stringify(output, null, 2));

  if (!args.apply) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const actions = [];
  for (const item of plan) {
    for (const duplicate of item.deleteItems) {
      actions.push({ type: "delete", invoiceId: duplicate.id, filePath: item.filePath, invoiceNumber: duplicate.invoice_number });
    }
    if (item.process) {
      actions.push({ type: "keep", invoiceId: item.keep?.id, filePath: item.filePath, invoiceNumber: item.keep?.invoice_number });
    }
  }

  const results = [];
  for (const item of plan) {
    for (const duplicate of item.deleteItems) {
      try {
        await mutateDeleteInvoice(supabase, duplicate.id, duplicate.status);
        results.push({
          type: "delete",
          invoiceId: duplicate.id,
          invoiceNumber: duplicate.invoice_number,
          status: "ok",
        });
      } catch (error) {
        results.push({
          type: "delete",
          invoiceId: duplicate.id,
          invoiceNumber: duplicate.invoice_number,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!item.process) continue;

    try {
      const result = await mutateKeepInvoice(supabase, item);
      results.push({
        type: "keep",
        invoiceId: item.keep?.id,
        invoiceNumber: item.keep?.invoice_number,
        status: result.status,
        approvedNumber: result.approvedNumber || null,
        paymentId: result.paymentId || null,
        amount: result.amount || null,
        paymentDate: result.paymentDate || null,
      });
    } catch (error) {
      results.push({
        type: "keep",
        invoiceId: item.keep?.id,
        invoiceNumber: item.keep?.invoice_number,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const finalOutput = {
    ...output,
    results,
  };

  fs.writeFileSync(args.outputPath, JSON.stringify(finalOutput, null, 2));
  console.log(JSON.stringify(finalOutput, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
