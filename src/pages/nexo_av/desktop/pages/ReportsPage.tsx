import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";
import {
  FolderOpen,
  Folder,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  File,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  HardDrive,
  Receipt,
  ShoppingCart,
  DollarSign,
  Users,
  BarChart3,
  Shield,
  Calendar,
  X,
  Table,
  BookOpen,
  FolderPlus,
  Upload,
  Package,
  Wrench,
  Image,
  type LucideIcon,
} from "lucide-react";
import "../styles/components/pages/file-explorer.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface MinioFile {
  id: string;
  key: string;
  original_name: string;
  document_type: string | null;
  document_date: string | null;
  size_bytes: number | null;
  mime_type: string;
  auto_generated: boolean | null;
  checksum: string | null;
  created_at: string;
  fiscal_month: number | null;
  fiscal_year: number | null;
  fiscal_quarter: number | null;
  custom_folder_id: string | null;
}

interface FiscalPath {
  type: "fiscal";
  year: number;
  quarter: number;
  section: string;
}

interface CustomPath {
  type: "custom";
  folderId: string;
  folderName: string;
  breadcrumb: { id: string; name: string }[];
}

interface CatalogPath {
  type: "catalog";
  productId: string;
  productSku: string;
  breadcrumb: { id: string; name: string }[];
}

type SelectedPath = FiscalPath | CustomPath | CatalogPath;

interface CustomFolder {
  id: string;
  name: string;
  parent_id: string | null;
  minio_prefix: string;
  created_by: string;
  created_at: string;
}

interface CatCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  domain: string;
  sort_order: number;
}

interface CatProduct {
  id: string;
  sku: string;
  name: string;
  product_type: string;
  category_id: string | null;
}

interface TreeSection { type: string; count: number; }
interface TreeQuarter { quarter: number; sections: TreeSection[]; totalFiles: number; }
interface TreeYear { year: number; quarters: TreeQuarter[]; totalFiles: number; }

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const FILE_FIELDS = "id, key, original_name, document_type, document_date, size_bytes, mime_type, auto_generated, checksum, created_at, fiscal_month, fiscal_year, fiscal_quarter, custom_folder_id";

const SECTION_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  ventas:        { label: "Ventas",             icon: Receipt },
  compras:       { label: "Facturas de Compra", icon: ShoppingCart },
  tickets:       { label: "Tickets / Gastos",   icon: DollarSign },
  presupuestos:  { label: "Presupuestos",       icon: FileText },
  nominas:       { label: "Nóminas",            icon: Users },
  resumenes:     { label: "Resúmenes",          icon: BarChart3 },
  modelos:       { label: "Modelos AEAT",       icon: Shield },
  informes:      { label: "Informes",           icon: FileText },
};

const getSectionLabel = (t: string) => SECTION_CONFIG[t]?.label ?? t;
const getSectionIcon  = (t: string) => SECTION_CONFIG[t]?.icon ?? FileText;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmtSize(b: number | null): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fileIcon(m: string) {
  if (m.includes("pdf"))         return { Icon: FileText,        cls: "fe-file-name__icon--pdf" };
  if (m.includes("spreadsheet") || m.includes("excel"))
                                  return { Icon: FileSpreadsheet, cls: "fe-file-name__icon--excel" };
  if (m.includes("image"))       return { Icon: Image,           cls: "fe-file-name__icon--image" };
  return                                 { Icon: File,            cls: "fe-file-name__icon--other" };
}

function typeBadge(m: string) {
  if (m.includes("pdf"))         return { label: "PDF",  cls: "fe-type-badge--pdf" };
  if (m.includes("spreadsheet") || m.includes("excel"))
                                  return { label: "XLSX", cls: "fe-type-badge--xlsx" };
  if (m.includes("image"))       return { label: "IMG",  cls: "fe-type-badge--img" };
  return                                 { label: m.split("/").pop() ?? "—", cls: "fe-type-badge--other" };
}

function buildTree(rows: Pick<MinioFile, "fiscal_year" | "fiscal_quarter" | "document_type">[]): TreeYear[] {
  const m = new Map<number, Map<number, Map<string, number>>>();
  for (const r of rows) {
    if (!r.fiscal_year || !r.fiscal_quarter || !r.document_type) continue;
    if (!m.has(r.fiscal_year)) m.set(r.fiscal_year, new Map());
    const y = m.get(r.fiscal_year)!;
    if (!y.has(r.fiscal_quarter)) y.set(r.fiscal_quarter, new Map());
    const q = y.get(r.fiscal_quarter)!;
    q.set(r.document_type, (q.get(r.document_type) ?? 0) + 1);
  }
  const tree: TreeYear[] = [];
  for (const [year, ym] of m) {
    const quarters: TreeQuarter[] = [];
    let yt = 0;
    for (const [quarter, qm] of ym) {
      const sections: TreeSection[] = [];
      let qt = 0;
      for (const [type, count] of qm) { sections.push({ type, count }); qt += count; }
      sections.sort((a, b) => a.type.localeCompare(b.type));
      quarters.push({ quarter, sections, totalFiles: qt });
      yt += qt;
    }
    quarters.sort((a, b) => a.quarter - b.quarter);
    tree.push({ year, quarters, totalFiles: yt });
  }
  tree.sort((a, b) => b.year - a.year);
  return tree;
}

function buildFolderBreadcrumb(folderId: string, folders: CustomFolder[]): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = [];
  let current = folders.find(f => f.id === folderId);
  while (current) {
    result.unshift({ id: current.id, name: current.name });
    current = current.parent_id ? folders.find(f => f.id === current!.parent_id) : undefined;
  }
  return result;
}

function buildCatalogBreadcrumb(productId: string, products: CatProduct[], categories: CatCategory[], domain: string): { id: string; name: string }[] {
  const crumbs: { id: string; name: string }[] = [];
  crumbs.push({ id: `domain-${domain}`, name: domain === "PRODUCT" ? "Productos" : "Servicios" });
  const prod = products.find(p => p.id === productId);
  if (!prod) return crumbs;
  const catChain: CatCategory[] = [];
  let cat = categories.find(c => c.id === prod.category_id);
  while (cat) {
    catChain.unshift(cat);
    cat = cat.parent_id ? categories.find(c => c.id === cat!.parent_id) : undefined;
  }
  for (const c of catChain) crumbs.push({ id: c.id, name: c.name });
  crumbs.push({ id: prod.id, name: `${prod.sku} - ${prod.name}` });
  return crumbs;
}

function slugify(name: string): string {
  return name
    .trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .substring(0, 50);
}

/* ------------------------------------------------------------------ */
/* Excel Generator                                                     */
/* ------------------------------------------------------------------ */

async function generateQuarterExcel(year: number, quarter: number) {
  const { data, error } = await supabase.rpc("get_fiscal_quarter_data", {
    p_year: year,
    p_quarter: quarter,
  });
  if (error || !data) throw new Error(error?.message ?? "Sin datos");

  const d = data as {
    ventas: Array<Record<string, unknown>>;
    compras: Array<Record<string, unknown>>;
    totales: Record<string, number>;
  };
  const t = d.totales;

  const wb = XLSX.utils.book_new();

  const resumenData = [
    ["RESUMEN FISCAL — T" + quarter + " " + year],
    [],
    ["Concepto", "Base Imponible", "IVA", "Retención", "Total"],
    ["Ventas (emitidas)", t.ventas_subtotal, t.ventas_iva, 0, t.ventas_total],
    ["Facturas de compra", t.compras_subtotal, t.compras_iva, t.compras_retencion, t.compras_total],
    ["Tickets / Gastos", t.tickets_subtotal, t.tickets_iva, 0, t.tickets_total],
    [],
    ["LIQUIDACIÓN IVA"],
    ["IVA Repercutido (ventas)", t.iva_repercutido],
    ["IVA Soportado (compras + tickets)", t.iva_soportado],
    ["IVA a declarar (Mod. 303)", t.iva_a_declarar],
    [],
    ["Retenciones IRPF (Mod. 111)", t.compras_retencion],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  wsResumen["!cols"] = [{ wch: 32 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  const ventasHeader = ["Nº Factura", "Fecha", "Cliente", "NIF Cliente", "Base Imponible", "IVA", "Total", "Cobrado", "Pendiente", "Estado"];
  const ventasRows = (d.ventas ?? []).map((v: Record<string, unknown>) => [
    v.invoice_number, fmtDate(v.issue_date as string), v.client_name, v.client_nif ?? "",
    v.subtotal, v.tax_amount, v.total, v.paid_amount, v.pending_amount, v.status,
  ]);
  const wsVentas = XLSX.utils.aoa_to_sheet([ventasHeader, ...ventasRows]);
  wsVentas["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas");

  const comprasHeader = ["Nº Interno", "Nº Proveedor", "Fecha", "Proveedor", "NIF", "Tipo", "Base Imponible", "IVA", "Retención", "Total", "Pagado", "Pendiente", "Categoría"];
  const facturas = (d.compras ?? []).filter((c: Record<string, unknown>) => c.document_type === "INVOICE");
  const tickets  = (d.compras ?? []).filter((c: Record<string, unknown>) => c.document_type === "EXPENSE");

  const mapCompra = (c: Record<string, unknown>) => [
    c.internal_purchase_number ?? c.invoice_number,
    c.supplier_invoice_number ?? "",
    fmtDate(c.issue_date as string),
    c.supplier_name,
    c.supplier_nif ?? "",
    c.document_type === "EXPENSE" ? "Ticket" : "Factura",
    c.subtotal, c.tax_amount,
    ((c.withholding_amount as number) ?? 0) + ((c.retention_amount as number) ?? 0),
    c.total, c.paid_amount, c.pending_amount,
    c.expense_category ?? "",
  ];

  const comprasData = [
    comprasHeader,
    ...facturas.map(mapCompra),
    [],
    ["--- TICKETS / GASTOS ---"],
    comprasHeader,
    ...tickets.map(mapCompra),
  ];
  const wsCompras = XLSX.utils.aoa_to_sheet(comprasData);
  wsCompras["!cols"] = [{ wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 26 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsCompras, "Compras y Tickets");

  XLSX.writeFile(wb, `Resumen_Fiscal_T${quarter}_${year}.xlsx`);
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

const ReportsPage = () => {
  const { userId } = useParams<{ userId: string }>();

  /* ---- State ---- */
  const [tree, setTree] = useState<TreeYear[]>([]);
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [customFileCounts, setCustomFileCounts] = useState<Record<string, number>>({});
  const [catCategories, setCatCategories] = useState<CatCategory[]>([]);
  const [catProducts, setCatProducts] = useState<CatProduct[]>([]);
  const [catImageCounts, setCatImageCounts] = useState<Record<string, number>>({});
  const [files, setFiles] = useState<MinioFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<SelectedPath | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<MinioFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalSize, setTotalSize] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [excelLoading, setExcelLoading] = useState(false);

  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- Data fetching ---- */

  const loadTree = useCallback(async () => {
    setTreeLoading(true);
    try {
      const [fiscalRes, folderRes, cfCountRes, catalogRes] = await Promise.all([
        supabase
          .from("minio_files")
          .select("fiscal_year, fiscal_quarter, document_type, size_bytes")
          .is("deleted_at", null)
          .is("custom_folder_id", null)
          .not("fiscal_year", "is", null),
        supabase
          .from("minio_custom_folders")
          .select("*")
          .order("name"),
        supabase
          .from("minio_files")
          .select("custom_folder_id")
          .not("custom_folder_id", "is", null)
          .is("deleted_at", null),
        (supabase.rpc as any)("get_catalog_explorer_tree"),
      ]);

      if (fiscalRes.data) {
        setTree(buildTree(fiscalRes.data as MinioFile[]));
        setTotalFiles(fiscalRes.data.length);
        setTotalSize(fiscalRes.data.reduce((s, f) => s + ((f as MinioFile).size_bytes ?? 0), 0));
      }

      setCustomFolders((folderRes.data as CustomFolder[]) ?? []);

      const counts: Record<string, number> = {};
      for (const row of (cfCountRes.data ?? []) as { custom_folder_id: string }[]) {
        counts[row.custom_folder_id] = (counts[row.custom_folder_id] ?? 0) + 1;
      }
      setCustomFileCounts(counts);

      if (catalogRes.data) {
        const cd = catalogRes.data as { categories: CatCategory[]; products: CatProduct[]; image_counts: Record<string, number> };
        setCatCategories(cd.categories ?? []);
        setCatProducts(cd.products ?? []);
        setCatImageCounts(cd.image_counts ?? {});
      }
    } finally { setTreeLoading(false); }
  }, []);

  const loadFiles = useCallback(async (p: SelectedPath) => {
    setFilesLoading(true);
    setFiles([]);
    try {
      if (p.type === "fiscal") {
        const sortByName = p.section === "ventas" || p.section === "presupuestos";
        const { data } = await supabase
          .from("minio_files")
          .select(FILE_FIELDS)
          .eq("fiscal_year", p.year).eq("fiscal_quarter", p.quarter).eq("document_type", p.section)
          .is("deleted_at", null).is("custom_folder_id", null)
          .order(sortByName ? "original_name" : "document_date", { ascending: true });
        setFiles((data as MinioFile[]) ?? []);
      } else if (p.type === "custom") {
        const { data } = await supabase
          .from("minio_files")
          .select(FILE_FIELDS)
          .eq("custom_folder_id", p.folderId)
          .is("deleted_at", null)
          .order("original_name", { ascending: true });
        setFiles((data as MinioFile[]) ?? []);
      } else if (p.type === "catalog") {
        const { data } = await supabase
          .from("minio_files")
          .select(FILE_FIELDS)
          .eq("source_table", "catalog.products")
          .eq("source_id", p.productId)
          .is("deleted_at", null)
          .order("original_name", { ascending: true });
        setFiles((data as MinioFile[]) ?? []);
      }
    } finally { setFilesLoading(false); }
  }, []);

  const getPresignedUrl = useCallback(async (key: string): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/minio-proxy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "" },
          body: JSON.stringify({ action: "get_presigned_url_by_key", storage_key: key }),
        }
      );
      const r = await res.json();
      return (res.ok && r.ok) ? r.url : null;
    } catch { return null; }
  }, []);

  /* ---- Preview ---- */

  const openPreview = useCallback(async (file: MinioFile) => {
    setSelectedFile(file);
    setPreviewUrl(null);
    setPreviewLoading(true);
    const url = await getPresignedUrl(file.key);
    setPreviewUrl(url);
    setPreviewLoading(false);
  }, [getPresignedUrl]);

  const closePreview = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
  }, []);

  /* ---- Download ---- */

  const handleDownload = useCallback(async (file: MinioFile) => {
    const url = await getPresignedUrl(file.key);
    if (url) { const a = document.createElement("a"); a.href = url; a.download = file.original_name; a.click(); }
  }, [getPresignedUrl]);

  /* ---- Excel ---- */

  const handleExcel = useCallback(async () => {
    if (!selectedPath || selectedPath.type !== "fiscal") return;
    setExcelLoading(true);
    try {
      await generateQuarterExcel(selectedPath.year, selectedPath.quarter);
    } catch (err) {
      console.error("Error generando Excel:", err);
    } finally { setExcelLoading(false); }
  }, [selectedPath]);

  /* ---- Navigation ---- */

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const selectFolder = useCallback((p: SelectedPath) => {
    setSelectedPath(p); setSelectedFile(null); setPreviewUrl(null); setSearchQuery("");
  }, []);

  const handleRefresh = useCallback(() => {
    loadTree();
    if (selectedPath) loadFiles(selectedPath);
  }, [loadTree, loadFiles, selectedPath]);

  /* ---- Folder creation ---- */

  const createFolder = useCallback(async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    setCreatingFolder(true);
    try {
      const slug = slugify(trimmed);
      if (!slug) return;

      let parentId: string | null = null;
      let prefix = `custom/${slug}/`;

      if (selectedPath?.type === "custom") {
        const parentFolder = customFolders.find(f => f.id === selectedPath.folderId);
        if (parentFolder) {
          parentId = parentFolder.id;
          prefix = `${parentFolder.minio_prefix}${slug}/`;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("minio_custom_folders").insert({
        name: trimmed,
        parent_id: parentId,
        minio_prefix: prefix,
        created_by: user.id,
      });

      if (!error) {
        setShowNewFolderDialog(false);
        setNewFolderName("");
        await loadTree();
      } else {
        console.error("Error creating folder:", error);
      }
    } finally { setCreatingFolder(false); }
  }, [newFolderName, selectedPath, customFolders, loadTree]);

  /* ---- File upload ---- */

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPath) return;
    if (selectedPath.type !== "custom" && selectedPath.type !== "catalog") return;

    setUploading(true);
    setUploadProgress(0);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/minio-proxy`;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      };

      let action: string;
      let payload: Record<string, unknown>;

      if (selectedPath.type === "custom") {
        action = "upload_to_custom_folder";
        payload = { folder_id: selectedPath.folderId, filename: file.name, mime_type: file.type || "application/octet-stream", size_bytes: file.size };
      } else {
        action = "upload_to_catalog_product";
        payload = { product_id: selectedPath.productId, filename: file.name, mime_type: file.type || "application/octet-stream", size_bytes: file.size };
      }

      const uploadRes = await fetch(proxyUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ action, ...payload }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.ok) throw new Error(uploadData.error || "Error al obtener URL de subida");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload HTTP ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Error de red al subir"));
        xhr.open("PUT", uploadData.url);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      await fetch(proxyUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "confirm_custom_upload", file_id: uploadData.file_id }),
      });

      loadFiles(selectedPath);
      loadTree();
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [selectedPath, loadFiles, loadTree]);

  /* ---- Effects ---- */

  useEffect(() => { loadTree(); }, [loadTree]);

  useEffect(() => {
    if (!selectedPath) return;
    loadFiles(selectedPath);
    setExpandedNodes(prev => {
      const n = new Set(prev);
      if (selectedPath.type === "fiscal") {
        n.add("contabilidad");
        n.add(`y-${selectedPath.year}`);
        n.add(`q-${selectedPath.year}-${selectedPath.quarter}`);
      } else if (selectedPath.type === "custom") {
        for (const item of selectedPath.breadcrumb) {
          n.add(`cf-${item.id}`);
        }
      } else if (selectedPath.type === "catalog") {
        n.add("catalog-root");
        for (const item of selectedPath.breadcrumb) {
          n.add(`cat-${item.id}`);
        }
      }
      return n;
    });
  }, [selectedPath, loadFiles]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(f => f.original_name.toLowerCase().includes(q) || f.key.toLowerCase().includes(q));
  }, [files, searchQuery]);

  const isCustomFolder = selectedPath?.type === "custom";
  const isCatalogProduct = selectedPath?.type === "catalog";
  const canUpload = isCustomFolder || isCatalogProduct;
  const totalFiscalFiles = tree.reduce((s, y) => s + y.totalFiles, 0);
  const totalCatalogImages = Object.values(catImageCounts).reduce((s, c) => s + c, 0);
  const rootCustomFolders = customFolders.filter(f => !f.parent_id);

  /* ---- Render ---- */
  return (
    <div className="file-explorer">
      <input ref={fileInputRef} type="file" className="fe-hidden-input" onChange={handleFileUpload}
        accept={isCatalogProduct ? "image/jpeg,image/png,image/webp,application/pdf" : undefined} />

      {/* ═══ Header ═══ */}
      <div className="file-explorer__header">
        <div className="file-explorer__title-area">
          <div className="file-explorer__title-icon"><FolderOpen /></div>
          <div className="file-explorer__title-text">
            <h1>Documentación</h1>
            <p>Archivo fiscal y catálogo — Explorador de documentos</p>
          </div>
        </div>
        <div className="file-explorer__toolbar">
          {selectedPath?.type === "fiscal" && (
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleExcel} disabled={excelLoading}
              title={`Descargar Excel resumen T${selectedPath.quarter} ${selectedPath.year}`}>
              {excelLoading ? <Loader2 className="h-3.5 w-3.5 fe-spin" /> : <Table className="h-3.5 w-3.5" />}
              Excel T{selectedPath.quarter}
            </Button>
          )}
          {canUpload && (
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
              onClick={() => fileInputRef.current?.click()} disabled={uploading}
              title={isCatalogProduct ? "Subir imagen al producto" : "Subir archivo a esta carpeta"}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 fe-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? `${uploadProgress}%` : isCatalogProduct ? "Subir imagen" : "Subir archivo"}
            </Button>
          )}
          {!isCatalogProduct && (
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
              onClick={() => { setShowNewFolderDialog(true); setNewFolderName(""); }}
              title={isCustomFolder ? "Crear subcarpeta" : "Crear carpeta"}>
              <FolderPlus className="h-3.5 w-3.5" />
              Nueva carpeta
            </Button>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input placeholder="Buscar archivos..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="file-explorer__search pl-8" />
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRefresh} title="Actualizar">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {uploading && (
        <div className="fe-upload-bar">
          <div className="fe-upload-bar__fill" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {/* ═══ Body ═══ */}
      <div className="file-explorer__body">
        <aside className="file-explorer__sidebar">
          {treeLoading ? (
            <div className="file-explorer__loading"><Loader2 className="fe-spin" /><span style={{ fontSize: ".75rem" }}>Cargando...</span></div>
          ) : (
            <>
              {/* Contabilidad */}
              <ContabilidadNode tree={tree} totalFiles={totalFiscalFiles} expanded={expandedNodes} selectedPath={selectedPath} onToggle={toggleNode} onSelect={selectFolder} />

              {/* Catálogo */}
              <CatalogRootNode
                categories={catCategories}
                products={catProducts}
                imageCounts={catImageCounts}
                totalImages={totalCatalogImages}
                expanded={expandedNodes}
                selectedPath={selectedPath}
                onToggle={toggleNode}
                onSelect={(prodId, prodSku) => selectFolder({
                  type: "catalog",
                  productId: prodId,
                  productSku: prodSku,
                  breadcrumb: buildCatalogBreadcrumb(prodId, catProducts, catCategories, catProducts.find(p => p.id === prodId)?.product_type ?? "PRODUCT"),
                })}
              />

              {/* Custom folders */}
              {rootCustomFolders.map(f => (
                <CustomFolderNode key={f.id} folder={f} allFolders={customFolders} fileCounts={customFileCounts} expanded={expandedNodes} selectedPath={selectedPath} onToggle={toggleNode}
                  onSelect={(fId, fName) => selectFolder({ type: "custom", folderId: fId, folderName: fName, breadcrumb: buildFolderBreadcrumb(fId, customFolders) })}
                />
              ))}

              {tree.length === 0 && rootCustomFolders.length === 0 && catProducts.length === 0 && (
                <div className="file-explorer__empty" style={{ padding: "1rem" }}>
                  <Folder style={{ width: "2rem", height: "2rem" }} />
                  <p style={{ fontSize: ".75rem" }}>Sin documentos</p>
                </div>
              )}
            </>
          )}
        </aside>

        <div className="file-explorer__content">
          <ExplorerBreadcrumb path={selectedPath} onReset={() => { setSelectedPath(null); setFiles([]); closePreview(); }} />

          <div className="file-explorer__main-split">
            <div className={`file-explorer__file-area ${selectedFile ? "file-explorer__file-area--with-preview" : ""}`}>
              {!selectedPath ? (
                <div className="file-explorer__empty"><FolderOpen /><p>Selecciona una carpeta del panel izquierdo para ver los documentos</p></div>
              ) : filesLoading ? (
                <div className="file-explorer__loading"><Loader2 className="fe-spin" /><span style={{ fontSize: ".8125rem" }}>Cargando documentos...</span></div>
              ) : filteredFiles.length === 0 ? (
                <div className="file-explorer__empty">
                  {isCatalogProduct ? <Image /> : <FileText />}
                  <p>{searchQuery ? "No se encontraron archivos" : isCatalogProduct ? "Sin imágenes — usa \"Subir imagen\" para añadir fotos del producto" : isCustomFolder ? "Carpeta vacía — usa \"Subir archivo\" para añadir documentos" : "Carpeta vacía"}</p>
                </div>
              ) : (
                <table className="fe-table">
                  <thead><tr>
                    <th style={{ width: "50%" }}>Nombre</th>
                    <th style={{ width: "14%" }}>Fecha</th>
                    <th style={{ width: "10%", textAlign: "right" }}>Tamaño</th>
                    <th style={{ width: "8%" }}>Tipo</th>
                    <th style={{ width: "18%", textAlign: "right" }}>Acciones</th>
                  </tr></thead>
                  <tbody>
                    {filteredFiles.map(f => (
                      <FileRow key={f.id} file={f} isSelected={selectedFile?.id === f.id} onSelect={openPreview} onDownload={handleDownload} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {selectedFile && (
              <div className="fe-preview-panel">
                <div className="fe-preview-panel__header">
                  <span className="fe-preview-panel__title" title={selectedFile.original_name}>
                    <FileText className="h-3.5 w-3.5" style={{ flexShrink: 0 }} />
                    {selectedFile.original_name}
                  </span>
                  <div className="fe-preview-panel__actions">
                    {previewUrl && (
                      <>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(previewUrl, "_blank")} title="Abrir en nueva pestaña">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(selectedFile)} title="Descargar">
                          <Download className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={closePreview} title="Cerrar vista previa">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="fe-preview-panel__meta">
                  <span>{fmtDate(selectedFile.document_date ?? selectedFile.created_at)}</span>
                  <span>{fmtSize(selectedFile.size_bytes)}</span>
                  <span className={`fe-type-badge ${typeBadge(selectedFile.mime_type).cls}`}>{typeBadge(selectedFile.mime_type).label}</span>
                </div>
                <div className="fe-preview-panel__body">
                  {previewLoading ? (
                    <div className="fe-preview-panel__loading"><Loader2 className="h-6 w-6 fe-spin text-muted-foreground" /></div>
                  ) : previewUrl ? (
                    <iframe src={previewUrl} className="fe-preview-panel__iframe" title="Vista previa" />
                  ) : (
                    <div className="fe-preview-panel__loading">
                      <p className="text-xs text-muted-foreground">No se pudo cargar</p>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openPreview(selectedFile)}>
                        <RefreshCw className="h-3 w-3 mr-1" />Reintentar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="file-explorer__statusbar">
            <div className="file-explorer__statusbar-left">
              {selectedPath ? (
                <>
                  <span className="file-explorer__statusbar-item"><FileText />{filteredFiles.length} archivo{filteredFiles.length !== 1 ? "s" : ""}{searchQuery && ` (de ${files.length})`}</span>
                  <span className="file-explorer__statusbar-item"><HardDrive />{fmtSize(filteredFiles.reduce((s, f) => s + (f.size_bytes ?? 0), 0))}</span>
                </>
              ) : (
                <span className="file-explorer__statusbar-item"><HardDrive />{totalFiles} documentos en archivo · {catProducts.length} productos en catálogo</span>
              )}
            </div>
            <span className="file-explorer__statusbar-item"><HardDrive />Total: {fmtSize(totalSize)}</span>
          </div>
        </div>
      </div>

      {/* ═══ New Folder Dialog ═══ */}
      {showNewFolderDialog && (
        <div className="fe-dialog-overlay" onClick={() => { setShowNewFolderDialog(false); setNewFolderName(""); }}>
          <div className="fe-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="fe-dialog__title">
              <FolderPlus className="h-4 w-4" />
              {isCustomFolder ? "Nueva subcarpeta" : "Nueva carpeta"}
            </h3>
            {isCustomFolder && selectedPath?.type === "custom" && (
              <p className="fe-dialog__subtitle">Dentro de: {selectedPath.folderName}</p>
            )}
            <Input placeholder="Nombre de la carpeta" value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newFolderName.trim()) createFolder(); }}
              autoFocus className="fe-dialog__input" />
            <div className="fe-dialog__actions">
              <Button variant="outline" size="sm" onClick={() => { setShowNewFolderDialog(false); setNewFolderName(""); }}>Cancelar</Button>
              <Button size="sm" onClick={createFolder} disabled={!newFolderName.trim() || creatingFolder}>
                {creatingFolder ? <Loader2 className="h-3.5 w-3.5 fe-spin mr-1" /> : null}
                Crear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Sub-components: Contabilidad                                        */
/* ------------------------------------------------------------------ */

function ContabilidadNode({ tree, totalFiles, expanded, selectedPath, onToggle, onSelect }: {
  tree: TreeYear[]; totalFiles: number; expanded: Set<string>; selectedPath: SelectedPath | null;
  onToggle: (id: string) => void; onSelect: (p: SelectedPath) => void;
}) {
  const open = expanded.has("contabilidad");
  return (
    <div className="fe-tree-node">
      <button className="fe-tree-node__header" onClick={() => onToggle("contabilidad")}>
        <ChevronRight className={`fe-tree-node__chevron ${open ? "fe-tree-node__chevron--open" : ""}`} />
        <BookOpen className="fe-tree-node__icon fe-tree-node__icon--contabilidad" />
        <span className="fe-tree-node__label fe-tree-node__label--root">Contabilidad</span>
        <span className="fe-tree-node__count">{totalFiles}</span>
      </button>
      {open && (
        <div className="fe-tree-node__children">
          {tree.map(yn => <YearNode key={yn.year} node={yn} expanded={expanded} selectedPath={selectedPath} onToggle={onToggle} onSelect={onSelect} />)}
        </div>
      )}
    </div>
  );
}

function YearNode({ node, expanded, selectedPath, onToggle, onSelect }: {
  node: TreeYear; expanded: Set<string>; selectedPath: SelectedPath | null;
  onToggle: (id: string) => void; onSelect: (p: SelectedPath) => void;
}) {
  const id = `y-${node.year}`;
  const open = expanded.has(id);
  return (
    <div className="fe-tree-node">
      <button className="fe-tree-node__header" onClick={() => onToggle(id)}>
        <ChevronRight className={`fe-tree-node__chevron ${open ? "fe-tree-node__chevron--open" : ""}`} />
        <Calendar className="fe-tree-node__icon fe-tree-node__icon--year" />
        <span className="fe-tree-node__label">{node.year}</span>
        <span className="fe-tree-node__count">{node.totalFiles}</span>
      </button>
      {open && <div className="fe-tree-node__children">
        {node.quarters.map(q => <QuarterNode key={q.quarter} year={node.year} node={q} expanded={expanded} selectedPath={selectedPath} onToggle={onToggle} onSelect={onSelect} />)}
      </div>}
    </div>
  );
}

function QuarterNode({ year, node, expanded, selectedPath, onToggle, onSelect }: {
  year: number; node: TreeQuarter; expanded: Set<string>; selectedPath: SelectedPath | null;
  onToggle: (id: string) => void; onSelect: (p: SelectedPath) => void;
}) {
  const id = `q-${year}-${node.quarter}`;
  const open = expanded.has(id);
  return (
    <div className="fe-tree-node">
      <button className="fe-tree-node__header" onClick={() => onToggle(id)}>
        <ChevronRight className={`fe-tree-node__chevron ${open ? "fe-tree-node__chevron--open" : ""}`} />
        <Folder className="fe-tree-node__icon fe-tree-node__icon--quarter" />
        <span className="fe-tree-node__label">T{node.quarter}</span>
        <span className="fe-tree-node__count">{node.totalFiles}</span>
      </button>
      {open && <div className="fe-tree-node__children">
        {node.sections.map(s => {
          const active = selectedPath?.type === "fiscal" && selectedPath.year === year && selectedPath.quarter === node.quarter && selectedPath.section === s.type;
          const SIcon = getSectionIcon(s.type);
          return (
            <button key={s.type} className={`fe-tree-node__header ${active ? "fe-tree-node__header--active" : ""}`}
              onClick={() => onSelect({ type: "fiscal", year, quarter: node.quarter, section: s.type })}>
              <span style={{ width: "1rem", flexShrink: 0 }} />
              <SIcon className={`fe-tree-node__icon fe-tree-node__icon--${s.type}`} />
              <span className="fe-tree-node__label">{getSectionLabel(s.type)}</span>
              <span className="fe-tree-node__count">{s.count}</span>
            </button>
          );
        })}
      </div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components: Catálogo                                            */
/* ------------------------------------------------------------------ */

function CatalogRootNode({ categories, products, imageCounts, totalImages, expanded, selectedPath, onToggle, onSelect }: {
  categories: CatCategory[]; products: CatProduct[]; imageCounts: Record<string, number>; totalImages: number;
  expanded: Set<string>; selectedPath: SelectedPath | null;
  onToggle: (id: string) => void; onSelect: (productId: string, productSku: string) => void;
}) {
  const open = expanded.has("catalog-root");
  const domains = ["PRODUCT", "SERVICE"] as const;

  return (
    <div className="fe-tree-node">
      <button className="fe-tree-node__header" onClick={() => onToggle("catalog-root")}>
        <ChevronRight className={`fe-tree-node__chevron ${open ? "fe-tree-node__chevron--open" : ""}`} />
        <Package className="fe-tree-node__icon fe-tree-node__icon--catalog" />
        <span className="fe-tree-node__label fe-tree-node__label--root">Catálogo</span>
        {totalImages > 0 && <span className="fe-tree-node__count">{totalImages}</span>}
      </button>
      {open && (
        <div className="fe-tree-node__children">
          {domains.map(d => {
            const domainCats = categories.filter(c => c.domain === d && !c.parent_id);
            const domainProducts = products.filter(p => p.product_type === d);
            if (domainCats.length === 0 && domainProducts.length === 0) return null;
            return (
              <CatalogDomainNode key={d} domain={d} rootCategories={domainCats}
                allCategories={categories} products={domainProducts} imageCounts={imageCounts}
                expanded={expanded} selectedPath={selectedPath} onToggle={onToggle} onSelect={onSelect} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CatalogDomainNode({ domain, rootCategories, allCategories, products, imageCounts, expanded, selectedPath, onToggle, onSelect }: {
  domain: string; rootCategories: CatCategory[]; allCategories: CatCategory[];
  products: CatProduct[]; imageCounts: Record<string, number>;
  expanded: Set<string>; selectedPath: SelectedPath | null;
  onToggle: (id: string) => void; onSelect: (productId: string, productSku: string) => void;
}) {
  const id = `cat-domain-${domain}`;
  const open = expanded.has(id);
  const DIcon = domain === "PRODUCT" ? Package : Wrench;
  const label = domain === "PRODUCT" ? "Productos" : "Servicios";
  const domainImgCount = products.reduce((s, p) => s + (imageCounts[p.id] ?? 0), 0);

  return (
    <div className="fe-tree-node">
      <button className="fe-tree-node__header" onClick={() => onToggle(id)}>
        <ChevronRight className={`fe-tree-node__chevron ${open ? "fe-tree-node__chevron--open" : ""}`} />
        <DIcon className={`fe-tree-node__icon fe-tree-node__icon--domain-${domain.toLowerCase()}`} />
        <span className="fe-tree-node__label">{label}</span>
        {domainImgCount > 0 && <span className="fe-tree-node__count">{domainImgCount}</span>}
      </button>
      {open && (
        <div className="fe-tree-node__children">
          {rootCategories.map(c => (
            <CatalogCategoryNode key={c.id} category={c} allCategories={allCategories}
              products={products} imageCounts={imageCounts} expanded={expanded}
              selectedPath={selectedPath} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogCategoryNode({ category, allCategories, products, imageCounts, expanded, selectedPath, onToggle, onSelect }: {
  category: CatCategory; allCategories: CatCategory[];
  products: CatProduct[]; imageCounts: Record<string, number>;
  expanded: Set<string>; selectedPath: SelectedPath | null;
  onToggle: (id: string) => void; onSelect: (productId: string, productSku: string) => void;
}) {
  const id = `cat-${category.id}`;
  const open = expanded.has(id);
  const childCats = allCategories.filter(c => c.parent_id === category.id);
  const directProducts = products.filter(p => p.category_id === category.id);
  const hasChildren = childCats.length > 0 || directProducts.length > 0;

  const countImgsRecursive = (catId: string): number => {
    const prods = products.filter(p => p.category_id === catId);
    let count = prods.reduce((s, p) => s + (imageCounts[p.id] ?? 0), 0);
    const children = allCategories.filter(c => c.parent_id === catId);
    for (const ch of children) count += countImgsRecursive(ch.id);
    return count;
  };
  const totalImgs = countImgsRecursive(category.id);

  return (
    <div className="fe-tree-node">
      <button className="fe-tree-node__header" onClick={() => hasChildren && onToggle(id)}>
        {hasChildren ? (
          <ChevronRight className={`fe-tree-node__chevron ${open ? "fe-tree-node__chevron--open" : ""}`} />
        ) : (
          <span style={{ width: "1rem", flexShrink: 0 }} />
        )}
        <Folder className="fe-tree-node__icon fe-tree-node__icon--cat-folder" />
        <span className="fe-tree-node__label">{category.name}</span>
        {totalImgs > 0 && <span className="fe-tree-node__count">{totalImgs}</span>}
      </button>
      {open && hasChildren && (
        <div className="fe-tree-node__children">
          {childCats.map(cc => (
            <CatalogCategoryNode key={cc.id} category={cc} allCategories={allCategories}
              products={products} imageCounts={imageCounts} expanded={expanded}
              selectedPath={selectedPath} onToggle={onToggle} onSelect={onSelect} />
          ))}
          {directProducts.map(p => (
            <CatalogProductNode key={p.id} product={p} imageCount={imageCounts[p.id] ?? 0}
              selectedPath={selectedPath} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogProductNode({ product, imageCount, selectedPath, onSelect }: {
  product: CatProduct; imageCount: number; selectedPath: SelectedPath | null;
  onSelect: (productId: string, productSku: string) => void;
}) {
  const isActive = selectedPath?.type === "catalog" && selectedPath.productId === product.id;
  const PIcon = product.product_type === "SERVICE" ? Wrench : Package;

  return (
    <button
      className={`fe-tree-node__header ${isActive ? "fe-tree-node__header--active" : ""}`}
      onClick={() => onSelect(product.id, product.sku)}
    >
      <span style={{ width: "1rem", flexShrink: 0 }} />
      <PIcon className={`fe-tree-node__icon fe-tree-node__icon--product ${isActive ? "fe-tree-node__icon--product-active" : ""}`} />
      <span className="fe-tree-node__label" title={`${product.sku} - ${product.name}`}>
        {product.sku}
      </span>
      {imageCount > 0 && <span className="fe-tree-node__count">{imageCount}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components: Custom Folders                                      */
/* ------------------------------------------------------------------ */

function CustomFolderNode({ folder, allFolders, fileCounts, expanded, selectedPath, onToggle, onSelect }: {
  folder: CustomFolder; allFolders: CustomFolder[]; fileCounts: Record<string, number>;
  expanded: Set<string>; selectedPath: SelectedPath | null;
  onToggle: (id: string) => void; onSelect: (folderId: string, folderName: string) => void;
}) {
  const id = `cf-${folder.id}`;
  const open = expanded.has(id);
  const children = allFolders.filter(f => f.parent_id === folder.id);
  const isActive = selectedPath?.type === "custom" && selectedPath.folderId === folder.id;
  const count = fileCounts[folder.id] ?? 0;
  const childCount = children.reduce((s, c) => s + (fileCounts[c.id] ?? 0), 0);
  const totalCount = count + childCount;

  return (
    <div className="fe-tree-node">
      <button className={`fe-tree-node__header ${isActive ? "fe-tree-node__header--active" : ""}`}
        onClick={() => { if (children.length > 0) onToggle(id); onSelect(folder.id, folder.name); }}>
        {children.length > 0 ? (
          <ChevronRight className={`fe-tree-node__chevron ${open ? "fe-tree-node__chevron--open" : ""}`} />
        ) : (
          <span style={{ width: "1rem", flexShrink: 0 }} />
        )}
        <Folder className={`fe-tree-node__icon fe-tree-node__icon--custom ${isActive ? "fe-tree-node__icon--custom-active" : ""}`} />
        <span className="fe-tree-node__label">{folder.name}</span>
        {totalCount > 0 && <span className="fe-tree-node__count">{totalCount}</span>}
      </button>
      {open && children.length > 0 && (
        <div className="fe-tree-node__children">
          {children.map(child => (
            <CustomFolderNode key={child.id} folder={child} allFolders={allFolders} fileCounts={fileCounts}
              expanded={expanded} selectedPath={selectedPath} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components: Breadcrumb & File Row                               */
/* ------------------------------------------------------------------ */

function ExplorerBreadcrumb({ path, onReset }: { path: SelectedPath | null; onReset: () => void; }) {
  return (
    <div className="file-explorer__breadcrumb">
      <span className={`file-explorer__breadcrumb-item ${!path ? "file-explorer__breadcrumb-item--current" : ""}`}
        onClick={path ? onReset : undefined}>Documentación</span>
      {path?.type === "fiscal" && (
        <>
          <ChevronRight className="file-explorer__breadcrumb-sep" />
          <span className="file-explorer__breadcrumb-item">Contabilidad</span>
          <ChevronRight className="file-explorer__breadcrumb-sep" />
          <span className="file-explorer__breadcrumb-item">{path.year}</span>
          <ChevronRight className="file-explorer__breadcrumb-sep" />
          <span className="file-explorer__breadcrumb-item">T{path.quarter}</span>
          <ChevronRight className="file-explorer__breadcrumb-sep" />
          <span className="file-explorer__breadcrumb-item file-explorer__breadcrumb-item--current">{getSectionLabel(path.section)}</span>
        </>
      )}
      {path?.type === "custom" && path.breadcrumb.map((item, i) => (
        <Fragment key={item.id}>
          <ChevronRight className="file-explorer__breadcrumb-sep" />
          <span className={`file-explorer__breadcrumb-item ${i === path.breadcrumb.length - 1 ? "file-explorer__breadcrumb-item--current" : ""}`}>{item.name}</span>
        </Fragment>
      ))}
      {path?.type === "catalog" && (
        <>
          <ChevronRight className="file-explorer__breadcrumb-sep" />
          <span className="file-explorer__breadcrumb-item">Catálogo</span>
          {path.breadcrumb.map((item, i) => (
            <Fragment key={item.id}>
              <ChevronRight className="file-explorer__breadcrumb-sep" />
              <span className={`file-explorer__breadcrumb-item ${i === path.breadcrumb.length - 1 ? "file-explorer__breadcrumb-item--current" : ""}`}>{item.name}</span>
            </Fragment>
          ))}
        </>
      )}
    </div>
  );
}

function FileRow({ file, isSelected, onSelect, onDownload }: {
  file: MinioFile; isSelected: boolean; onSelect: (f: MinioFile) => void; onDownload: (f: MinioFile) => void;
}) {
  const { Icon, cls } = fileIcon(file.mime_type);
  const { label, cls: bCls } = typeBadge(file.mime_type);
  return (
    <tr className={isSelected ? "fe-table__row--selected" : ""} onClick={() => onSelect(file)}>
      <td>
        <div className="fe-file-name">
          <Icon className={`fe-file-name__icon ${cls}`} />
          <span className="fe-file-name__text" title={file.original_name}>{file.original_name}</span>
        </div>
      </td>
      <td><span className="fe-date">{fmtDate(file.document_date ?? file.created_at)}</span></td>
      <td><span className="fe-size">{fmtSize(file.size_bytes)}</span></td>
      <td><span className={`fe-type-badge ${bCls}`}>{label}</span></td>
      <td>
        <div className="fe-actions" style={{ justifyContent: "flex-end" }}>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onDownload(file); }} title="Descargar">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default ReportsPage;
