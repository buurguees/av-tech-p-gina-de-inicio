# ERD Cross-Schema — NEXO AV (Bloque A Crítico)

> Generado: 2026-03-26
> Solo FKs de negocio críticas (Bloque A: 19 relaciones)
> Bloque C (31 FKs de auditoría created_by/assigned_to a authorized_users) omitido por claridad

## Diagrama

```mermaid
graph LR
    %% ============================================================
    %% TABLAS HUB
    %% ============================================================
    AU["🔑 internal.authorized_users<br/><i>HUB · ~40 FK entrantes</i>"]
    CLI["🏢 crm.clients<br/><i>HUB · 6 FK entrantes</i>"]
    PRJ["📁 projects.projects<br/><i>HUB · 12 FK entrantes</i>"]
    PRD["📦 catalog.products<br/><i>HUB · 10 FK entrantes</i>"]

    %% ============================================================
    %% SCHEMA: internal
    %% ============================================================
    subgraph internal["schema: internal"]
        AU
        SUP["internal.suppliers"]
        EMP["internal.employees"]
        BNK["internal.company_bank_accounts"]
        PAR["internal.partners"]
        PCR["internal.partner_compensation_runs"]
    end

    %% ============================================================
    %% SCHEMA: crm
    %% ============================================================
    subgraph crm["schema: crm"]
        CLI
        LOC["crm.location<br/><i>86 cols · prospección</i>"]
    end

    %% ============================================================
    %% SCHEMA: projects
    %% ============================================================
    subgraph projects["schema: projects"]
        PRJ
    end

    %% ============================================================
    %% SCHEMA: quotes
    %% ============================================================
    subgraph quotes["schema: quotes"]
        QUO["quotes.quotes"]
    end

    %% ============================================================
    %% SCHEMA: catalog
    %% ============================================================
    subgraph catalog["schema: catalog"]
        PRD
    end

    %% ============================================================
    %% SCHEMA: accounting
    %% ============================================================
    subgraph accounting["schema: accounting"]
        JRN["accounting.journal_entries"]
        PCN["accounting.partner_compensation_runs"]
        PYR["accounting.payroll_runs"]
        PYP["accounting.payroll_payments"]
        CRI["accounting.credit_installments"]
    end

    %% ============================================================
    %% SCHEMA: sales
    %% ============================================================
    subgraph sales["schema: sales"]
        INV["sales.invoices"]
        IVL["sales.invoice_lines"]
        PUI["sales.purchase_invoices"]
        PUO["sales.purchase_orders"]
    end

    %% ============================================================
    %% RELACIONES — BLOQUE A (19 FKs críticas)
    %% ============================================================

    %% accounting → internal
    CRI -->|"bank_account_id<br/>NO ACTION"| BNK
    PCN -->|"partner_id<br/>NO ACTION"| PAR
    PYR -->|"employee_id<br/>NO ACTION"| EMP
    PYP -->|"company_bank_account_id<br/>NO ACTION"| BNK
    PYP -->|"partner_compensation_run_id<br/>NO ACTION"| PCR

    %% accounting → projects
    JRN -->|"project_id<br/>NO ACTION"| PRJ

    %% internal → accounting (inversa)
    PCR -->|"journal_entry_id<br/>NO ACTION"| JRN

    %% catalog → internal
    PRD -->|"supplier_id<br/>SET NULL"| SUP

    %% projects → crm
    PRJ -->|"client_id<br/>NO ACTION"| CLI

    %% projects → quotes
    PRJ -->|"quote_id<br/>SET NULL"| QUO

    %% quotes → projects
    QUO -->|"project_id<br/>SET NULL"| PRJ

    %% sales.invoices → crm / projects / quotes
    INV -->|"client_id<br/>⛔ RESTRICT"| CLI
    INV -->|"project_id<br/>SET NULL"| PRJ
    INV -->|"source_quote_id<br/>SET NULL"| QUO

    %% sales.invoice_lines → catalog
    IVL -->|"product_id<br/>SET NULL"| PRD

    %% sales.purchase_invoices → projects / internal
    PUI -->|"project_id<br/>NO ACTION"| PRJ
    PUI -->|"supplier_id<br/>NO ACTION"| SUP

    %% sales.purchase_orders → projects / internal
    PUO -->|"project_id<br/>SET NULL"| PRJ
    PUO -->|"supplier_id<br/>SET NULL"| SUP

    %% ============================================================
    %% ESTILOS
    %% ============================================================
    style AU fill:#fef3c7,stroke:#d97706,color:#000
    style CLI fill:#fef3c7,stroke:#d97706,color:#000
    style PRJ fill:#fef3c7,stroke:#d97706,color:#000
    style PRD fill:#fef3c7,stroke:#d97706,color:#000
    style LOC fill:#fee2e2,stroke:#dc2626,color:#000
```

## Leyenda

| Estilo | Significado |
|---|---|
| Nodo amarillo | Tabla hub (muchas FK entrantes) |
| Nodo rojo | Tabla con riesgo corregido (crm.location — era CASCADE, ahora SET NULL) |
| Flecha `⛔ RESTRICT` | No se puede borrar el registro padre si hay hijos |
| Flecha `SET NULL` | El hijo sobrevive con columna FK = NULL |
| Flecha `NO ACTION` | Validación diferida o sin acción especial |
| Flecha `CASCADE` | El hijo se borra si se borra el padre (NO usada en Bloque A) |

## Tablas hub — conteo de FK entrantes

| Tabla | Schema | FK Entrantes (total cross-schema) | Protección recomendada |
|---|---|---|---|
| authorized_users | internal | ~40 | Nunca borrar; usar `is_active = false` |
| projects | projects | ~12 | CASCADE solo para hijos directos dentro del mismo schema |
| products | catalog | ~10 | SET NULL en invoice_lines; NO ACTION en compras |
| clients | crm | ~6 | RESTRICT en sales.invoices; NO ACTION en proyectos |

## Notas

- `crm.location` no aparece en el Bloque A (no tiene FKs salientes hacia tablas hub del Bloque A)
  pero se incluye en el diagrama como referencia al riesgo corregido.
- Las 31 FKs del Bloque C (`created_by`, `assigned_to` → `authorized_users`) están omitidas.
  Añadirlas convertiría `authorized_users` en el nodo central de prácticamente toda la BD.
- `public.product_companion_rules` tiene ON DELETE CASCADE hacia `catalog.products` — correcto
  (las reglas de acompañante son hijos directos del producto).
