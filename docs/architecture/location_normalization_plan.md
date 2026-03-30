# Plan de normalización de crm.location — NEXO AV

> Generado: 2026-03-26
> Proyecto: NEXO AV — takvthfatlcjsqgssnta

---

## Situación actual

`crm.location` tiene **87 columnas** y **0 filas** en producción.

- Es la entidad principal de prospección comercial (mapa de leads)
- Con 0 filas, la normalización puede hacerse sin migración de datos
- Riesgo de impacto en código existente: moderado (queries frontend, RPCs)

---

## Agrupación de columnas

### Grupo A — Base (20 cols) → permanece en `crm.location`

Datos de identidad, ubicación geográfica y negocio. Son el núcleo de la entidad.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| created_by | uuid | FK → authorized_users |
| modified_by | uuid | FK → authorized_users |
| status | USER-DEFINED | Estado del lead |
| address | text | |
| city | text | |
| province | text | |
| postal_code | text | |
| country | text | |
| latitude | numeric | |
| longitude | numeric | |
| location_references | text | Referencia adicional de ubicación |
| company_name | text | Nombre del negocio |
| business_type | USER-DEFINED | Tipo de negocio |
| business_size_sqm | numeric | Metros cuadrados |
| business_floors | integer | Plantas |
| business_hours | text | Horario |
| years_in_operation | integer | Antigüedad del negocio |

### Grupo B — Contacto (11 cols) → nueva tabla `crm.location_contact`

Datos del contacto y comunicación. Separables porque un negocio puede tener múltiples contactos.

| Columna | Tipo |
|---|---|
| location_id | uuid PK/FK |
| contact_first_name | text |
| contact_last_name | text |
| contact_position | text |
| contact_phone_primary | text |
| contact_phone_secondary | text |
| contact_email_primary | text |
| preferred_contact_method | USER-DEFINED |
| best_contact_time | USER-DEFINED |
| is_decision_maker | boolean |
| secondary_contact_name | text |
| secondary_contact_phone | text |

### Grupo C — Perfil comercial (24 cols) → nueva tabla `crm.location_commercial_profile`

Datos de scoring, presupuesto, fase de compra y competencia.

| Columna | Tipo |
|---|---|
| location_id | uuid PK/FK |
| priority | USER-DEFINED |
| lead_score | integer |
| lead_source | USER-DEFINED (enum) |
| campaign_id | uuid |
| assigned_to | uuid |
| team_id | uuid |
| av_solutions_required | ARRAY |
| solution_details | text |
| number_of_screens | integer |
| equipment_locations | text |
| estimated_budget_range | text |
| project_urgency | text |
| interest_level | integer |
| purchase_phase | USER-DEFINED |
| main_objections | ARRAY |
| objections_other | text |
| economic_decision_maker_identified | boolean |
| approval_process | text |
| has_requested_competitor_quotes | boolean |
| competitors_contacted | text |
| has_current_av_installation | boolean |
| current_provider | text |
| installation_age_years | integer |
| current_installation_problems | text |
| updated_at | timestamptz |

### Grupo D — Citas y multimedia (13 cols) → nueva tabla `crm.location_visit_data`

Datos de citas, recordatorios y archivos adjuntos de la visita comercial.

| Columna | Tipo |
|---|---|
| location_id | uuid PK/FK |
| appointment_date | date |
| appointment_time | time |
| appointment_type | USER-DEFINED |
| appointment_location | text |
| callback_date | date |
| callback_time | time |
| reminder_enabled | boolean |
| reminder_time_before | text |
| photos | ARRAY |
| videos | ARRAY |
| documents | ARRAY |
| audio_recordings | ARRAY |
| screenshots | ARRAY |
| updated_at | timestamptz |

### Grupo E — Técnico y mantenimiento (11 cols) → nueva tabla `crm.location_technical_data`

Datos de instalación AV existente, mantenimiento y garantías.

| Columna | Tipo |
|---|---|
| location_id | uuid PK/FK |
| technical_service_type | USER-DEFINED |
| maintenance_frequency | USER-DEFINED |
| proposed_maintenance_contract | boolean |
| maintenance_contract_value | numeric |
| has_maintenance_contract | boolean |
| maintenance_contract_provider | text |
| maintenance_contract_end_date | date |
| existing_equipment | text |
| has_active_warranties | boolean |
| warranty_end_date | date |
| local_access_info | text |
| updated_at | timestamptz |

### Grupo F — Métricas y analytics (7 cols) → nueva tabla `crm.location_analytics`

Contadores calculados y seguimiento temporal. Candidatos a vistas materializadas en el futuro.

| Columna | Tipo | Notas |
|---|---|---|
| location_id | uuid PK/FK | |
| tags | ARRAY | También podría ir en base |
| visit_count | integer | Calculable con COUNT |
| total_time_invested_minutes | integer | |
| days_since_first_contact | integer | Calculable con DATEDIFF |
| days_in_current_status | integer | Calculable |
| response_rate | numeric | |
| status_history | jsonb | Log de cambios de estado |
| updated_at | timestamptz | |

---

## Resumen del diseño normalizado

| Tabla | Cols actuales | Cols tras norm. | Filas hoy |
|---|---|---|---|
| `crm.location` (base) | 87 | 20 | 0 |
| `crm.location_contact` (nueva) | — | 12 | 0 |
| `crm.location_commercial_profile` (nueva) | — | 26 | 0 |
| `crm.location_visit_data` (nueva) | — | 15 | 0 |
| `crm.location_technical_data` (nueva) | — | 13 | 0 |
| `crm.location_analytics` (nueva) | — | 9 | 0 |

---

## Impacto en el codebase

```bash
grep -r "crm.location\|from('location')\|from.*location" src/ --include="*.ts" --include="*.tsx"
```

Buscar especialmente:
- RPCs que hagan `SELECT * FROM crm.location` (devolverían menos columnas)
- Queries que accedan a columnas de scoring/contacto directamente sobre la tabla base
- Formularios de creación de leads (necesitarían hacer INSERT en múltiples tablas)

---

## Evaluación de riesgo

| Factor | Valor |
|---|---|
| Filas a migrar | **0** — riesgo de migración de datos = nulo |
| RPCs afectadas | A verificar (grep) |
| Frontend afectado | A verificar (grep) |
| Tiempo de ventana | Sin datos → sin downtime necesario |
| Reversibilidad | Alta — con 0 filas es fácil deshacer |

---

## Recomendación de ejecución

**Dado que crm.location tiene 0 filas, la normalización es de bajo riesgo.**

Orden recomendado:
1. Verificar uso en frontend/RPCs (grep)
2. Crear tablas nuevas (DDL) — ver `location_commercial_profile.sql` como prueba de concepto
3. Modificar RPCs para insertar/leer de múltiples tablas
4. Actualizar frontend
5. Migrar columnas de `crm.location` a las nuevas tablas (DROP COLUMN de las movidas)

Con 0 filas, los pasos 2 y 5 son los únicos con riesgo de DDL. El resto es lógica de aplicación.
