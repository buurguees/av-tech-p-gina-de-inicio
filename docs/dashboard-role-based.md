# Dashboard Role-Based (NEXO AV)

## Arquitectura

El Dashboard utiliza **una única ruta** (`/dashboard`) que renderiza widgets dinámicos según el rol del usuario autenticado.

### Detección de rol
```
get_current_user_info() → roles[] → prioridad: admin > manager > comercial > tecnico
```

### Componentes por rol

| Rol | Desktop | Mobile |
|-----|---------|--------|
| admin | `AdminDashboard.tsx` | `MobileAdminDashboard` (inline) |
| manager | `ManagerDashboard.tsx` | `MobileManagerDashboard` (inline) |
| comercial | `CommercialDashboard.tsx` | `MobileCommercialDashboard` (inline) |
| tecnico | `TechnicianDashboard.tsx` | `MobileTechnicianDashboard` (inline) |

### RPCs backend (1 llamada por dashboard)

| RPC | Rol | Params |
|-----|-----|--------|
| `dashboard_get_admin_overview` | admin | `p_period: 'quarter'\|'year'` |
| `dashboard_get_manager_overview` | manager | `p_days_ahead: int` |
| `dashboard_get_commercial_overview` | comercial | `p_user_id: uuid` |
| `dashboard_get_technician_overview` | tecnico | `p_user_id: uuid` |

## Contenido por rol

### 🔴 Admin
- KPIs financieros (facturado, pendiente cobro, pagos pendientes, margen bruto)
- Riesgo de cobro (overdue, vencen 7d, top 5 deudores)
- Pagos próximos 7 días (compras, financiación, nóminas, compensaciones)
- Operativa (sites p/ facturar, proyectos en curso, presupuestos grandes)

### 🔵 Manager
- KPIs operativos (sites hoy, próx. 7 días, en curso, p/ facturar)
- Agenda de intervenciones con filtros y CTAs contextuales
- Info financiera por site (presupuesto vinculado)

### 🟣 Comercial
- KPIs comerciales (presupuestado, en negociación, conversión, facturado)
- Pipeline de presupuestos con alertas de inactividad
- Sites listos para facturar

### 🟢 Técnico
- KPIs personales (mis sites hoy, 7 días, en curso)
- Visitas abiertas (alertas)
- Mi agenda personal (dirección, contacto, botón registrar visita)
- Sin datos financieros

## Archivos

```
src/pages/nexo_av/desktop/components/dashboard/
├── DashboardView.tsx          # Router por rol
├── roles/
│   ├── AdminDashboard.tsx
│   ├── ManagerDashboard.tsx
│   ├── CommercialDashboard.tsx
│   └── TechnicianDashboard.tsx

src/pages/nexo_av/mobile/pages/
└── MobileDashboard.tsx        # Contiene los 4 dashboards mobile inline
```
