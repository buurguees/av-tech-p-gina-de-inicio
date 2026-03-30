# ORM Coverage Report — FKs Cross-Schema Críticas (Bloque A)

> Generado: 2026-03-26
> Proyecto: NEXO AV — takvthfatlcjsqgssnta

## Estado del ORM

**Este proyecto no utiliza ningún ORM.** Se verificaron y descartaron:

| ORM | Archivos buscados | Resultado |
|---|---|---|
| Prisma | `schema.prisma`, `prisma/` | NO EXISTE |
| Drizzle | `drizzle.config.*`, `drizzle/` | NO EXISTE |
| TypeORM | `ormconfig*`, decoradores `@Entity` | NO EXISTE |

### Cómo accede el frontend a los datos

- **166 archivos** usan `.rpc()` — patrón dominante
- **3 archivos** usan `.from()` directamente (solo tablas de schema `public`)
- `types.ts` tipifica exclusivamente schema `public` (2 tablas: `scanned_documents`, `user_roles`)
- Las tablas de negocio (`crm`, `sales`, `projects`, `accounting`, `catalog`, `quotes`, `internal`) se acceden **únicamente vía RPCs de PostgreSQL**
- Las relaciones FK no están tipadas en el cliente — viven exclusivamente en la BD

---

## Cobertura de las 19 FKs del Bloque A

| # | Tabla Origen | Columna FK | Constraint | Tabla Destino | ON DELETE | En types.ts | En RPCs |
|---|---|---|---|---|---|---|---|
| 1 | accounting.credit_installments | bank_account_id | credit_installments_bank_account_id_fkey | internal.company_bank_accounts | NO ACTION | NO | SI (list_bank_accounts_with_balances) |
| 2 | accounting.journal_entries | project_id | journal_entries_project_id_fkey | projects.projects | NO ACTION | NO | SI (list_journal_entries) |
| 3 | accounting.partner_compensation_runs | partner_id | partner_compensation_runs_partner_id_fkey | internal.partners | NO ACTION | NO | SI (partner_compensation_runs RPCs) |
| 4 | accounting.payroll_payments | company_bank_account_id | payroll_payments_company_bank_account_id_fkey | internal.company_bank_accounts | NO ACTION | NO | SI |
| 5 | accounting.payroll_payments | partner_compensation_run_id | payroll_payments_partner_compensation_run_id_fkey | internal.partner_compensation_runs | NO ACTION | NO | SI |
| 6 | accounting.payroll_runs | employee_id | payroll_runs_employee_id_fkey | internal.employees | NO ACTION | NO | SI |
| 7 | catalog.products | supplier_id | products_supplier_id_fkey | internal.suppliers | SET NULL | NO | SI (list_suppliers) |
| 8 | internal.partner_compensation_runs | journal_entry_id | partner_compensation_runs_journal_entry_id_fkey | accounting.journal_entries | NO ACTION | NO | SI |
| 9 | projects.projects | client_id | projects_client_id_fkey | crm.clients | NO ACTION | NO | SI (list_projects, list_clients) |
| 10 | projects.projects | quote_id | projects_quote_id_fkey | quotes.quotes | SET NULL | NO | SI |
| 11 | quotes.quotes | project_id | quotes_project_id_fkey | projects.projects | SET NULL | NO | SI (list_quotes) |
| 12 | sales.invoice_lines | product_id | invoice_lines_product_id_fkey | catalog.products | SET NULL | NO | SI (list_invoices) |
| 13 | sales.invoices | client_id | invoices_client_id_fkey | crm.clients | RESTRICT | NO | SI (list_invoices, finance_list_invoices) |
| 14 | sales.invoices | project_id | invoices_project_id_fkey | projects.projects | SET NULL | NO | SI |
| 15 | sales.invoices | source_quote_id | invoices_source_quote_id_fkey | quotes.quotes | SET NULL | NO | SI |
| 16 | sales.purchase_invoices | project_id | purchase_invoices_project_id_fkey | projects.projects | NO ACTION | NO | SI (list_purchase_invoices) |
| 17 | sales.purchase_invoices | supplier_id | purchase_invoices_supplier_id_fkey | internal.suppliers | NO ACTION | NO | SI |
| 18 | sales.purchase_orders | project_id | purchase_orders_project_id_fkey | projects.projects | SET NULL | NO | SI |
| 19 | sales.purchase_orders | supplier_id | purchase_orders_supplier_id_fkey | internal.suppliers | SET NULL | NO | SI |

**Resultado: 0 de 19 FKs cubiertas en types.ts. 19 de 19 cubiertas vía RPCs.**

La cobertura vía RPCs es implícita — las funciones de PostgreSQL hacen los JOINs internamente y devuelven datos combinados como `Json`. No hay validación de FK en el cliente.

---

## Schema Prisma de referencia (documental)

> Este schema NO está activo en el proyecto. Se genera como documentación de las relaciones
> y como referencia si se decidiera añadir un ORM en el futuro.
> Requeriría la preview feature `multiSchema` de Prisma.

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["accounting", "catalog", "crm", "internal", "projects", "quotes", "sales", "public"]
}

// === TABLAS HUB ===

model AuthorizedUser {
  id          String   @id @default(uuid()) @db.Uuid
  authUserId  String?  @unique @map("auth_user_id") @db.Uuid
  email       String
  fullName    String?  @map("full_name")

  // Relaciones inversas (solo las del Bloque A)
  catalogProducts        CatalogProduct[]
  projectsProjects       Project[]           @relation("ProjectsAssignedTo")
  projectsCreated        Project[]           @relation("ProjectsCreatedBy")
  salesInvoicesArchived  SalesInvoice[]

  @@map("authorized_users")
  @@schema("internal")
}

model CrmClient {
  id   String @id @default(uuid()) @db.Uuid
  name String

  // FK entrantes del Bloque A
  projects       Project[]
  salesInvoices  SalesInvoice[]
  purchaseInvoices PurchaseInvoice[]

  @@map("clients")
  @@schema("crm")
}

model Project {
  id          String  @id @default(uuid()) @db.Uuid
  projectName String  @map("project_name")

  // FK salientes del Bloque A
  clientId String? @map("client_id") @db.Uuid
  client   CrmClient? @relation(fields: [clientId], references: [id])

  quoteId String? @map("quote_id") @db.Uuid
  quote   Quote?  @relation("ProjectQuote", fields: [quoteId], references: [id])

  // FK entrantes del Bloque A
  quotes          Quote[]          @relation("QuoteProject")
  journalEntries  JournalEntry[]
  salesInvoices   SalesInvoice[]
  purchaseInvoices PurchaseInvoice[]
  purchaseOrders  PurchaseOrder[]

  @@map("projects")
  @@schema("projects")
}

model Quote {
  id          String @id @default(uuid()) @db.Uuid
  quoteNumber String @map("quote_number")

  projectId String? @map("project_id") @db.Uuid
  project   Project? @relation("QuoteProject", fields: [projectId], references: [id])

  // FK entrantes del Bloque A
  projectsReferencing Project[]      @relation("ProjectQuote")
  salesInvoices       SalesInvoice[]

  @@map("quotes")
  @@schema("quotes")
}

model CatalogProduct {
  id String @id @default(uuid()) @db.Uuid

  supplierId String?  @map("supplier_id") @db.Uuid
  supplier   Supplier? @relation(fields: [supplierId], references: [id])

  createdById String? @map("created_by") @db.Uuid
  createdBy   AuthorizedUser? @relation(fields: [createdById], references: [id])

  // FK entrantes del Bloque A
  invoiceLines InvoiceLine[]

  @@map("products")
  @@schema("catalog")
}

model Supplier {
  id String @id @default(uuid()) @db.Uuid

  // FK entrantes del Bloque A
  catalogProducts  CatalogProduct[]
  purchaseInvoices PurchaseInvoice[]
  purchaseOrders   PurchaseOrder[]

  @@map("suppliers")
  @@schema("internal")
}

model JournalEntry {
  id String @id @default(uuid()) @db.Uuid

  projectId String? @map("project_id") @db.Uuid
  project   Project? @relation(fields: [projectId], references: [id])

  // FK entrantes del Bloque A
  partnerCompensationRuns PartnerCompensationRun[]

  @@map("journal_entries")
  @@schema("accounting")
}

model PartnerCompensationRun {
  id String @id @default(uuid()) @db.Uuid

  journalEntryId String? @map("journal_entry_id") @db.Uuid
  journalEntry   JournalEntry? @relation(fields: [journalEntryId], references: [id])

  // FK entrantes del Bloque A
  payrollPayments PayrollPayment[]

  @@map("partner_compensation_runs")
  @@schema("internal")
}

model SalesInvoice {
  id String @id @default(uuid()) @db.Uuid

  clientId String  @map("client_id") @db.Uuid
  client   CrmClient @relation(fields: [clientId], references: [id]) // RESTRICT

  projectId String? @map("project_id") @db.Uuid
  project   Project? @relation(fields: [projectId], references: [id])

  sourceQuoteId String? @map("source_quote_id") @db.Uuid
  sourceQuote   Quote?  @relation(fields: [sourceQuoteId], references: [id])

  // FK entrantes del Bloque A
  invoiceLines InvoiceLine[]

  @@map("invoices")
  @@schema("sales")
}

model InvoiceLine {
  id String @id @default(uuid()) @db.Uuid

  productId String? @map("product_id") @db.Uuid
  product   CatalogProduct? @relation(fields: [productId], references: [id])

  @@map("invoice_lines")
  @@schema("sales")
}

model PurchaseInvoice {
  id String @id @default(uuid()) @db.Uuid

  projectId  String? @map("project_id") @db.Uuid
  project    Project? @relation(fields: [projectId], references: [id])

  supplierId String? @map("supplier_id") @db.Uuid
  supplier   Supplier? @relation(fields: [supplierId], references: [id])

  clientId String? @map("client_id") @db.Uuid
  client   CrmClient? @relation(fields: [clientId], references: [id])

  @@map("purchase_invoices")
  @@schema("sales")
}

model PurchaseOrder {
  id String @id @default(uuid()) @db.Uuid

  projectId  String? @map("project_id") @db.Uuid
  project    Project? @relation(fields: [projectId], references: [id])

  supplierId String? @map("supplier_id") @db.Uuid
  supplier   Supplier? @relation(fields: [supplierId], references: [id])

  @@map("purchase_orders")
  @@schema("sales")
}

model PayrollPayment {
  id String @id @default(uuid()) @db.Uuid

  partnerCompensationRunId String? @map("partner_compensation_run_id") @db.Uuid
  partnerCompensationRun   PartnerCompensationRun? @relation(fields: [partnerCompensationRunId], references: [id])

  @@map("payroll_payments")
  @@schema("accounting")
}
```
