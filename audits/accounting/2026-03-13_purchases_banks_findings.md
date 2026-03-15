# Findings - compras, aplazados y bancos

## P0

- `ACC-BANK-001`: los saldos bancarios contables no cuadran con los saldos reales reportados por el usuario.
  - Teorico `2026-03-13`: Sabadell `8.801,20`, CaixaBank `2.178,23`, Revolut `-1.293,38`
  - Real reportado: Sabadell `3.477,46`, CaixaBank `2.121,39`, Revolut `215,74`
  - Delta total: `+3.871,46 EUR`
  - Estado tras ejecucion `2026-03-13`: regularizado en vivo mediante la migracion `20260313173000_align_bank_balances_to_real_20260313.sql` y el asiento `AS-2026-3577`. Los saldos en NEXO quedan alineados provisionalmente con los reales, pendiente de conciliacion fina y de subir tickets faltantes de Revolut desde `2026-03-04`.

## P1

- `ACC-CREDIT-001`: existe un aplazamiento material en `C-26-000029` (`1.841,85 EUR` pendientes hasta `2027-02-04`) sin ninguna `credit_operation` ni `credit_installment` registrada.
- `ACC-PURCHASE-STATE-001`: el modulo de compras sigue exponiendo estados raw legacy (`PAID`, `PARTIAL`, `DRAFT`) en lugar de separar `doc_status` y `payment_status`.

## P2

- `ACC-PAYABLES-001`: el pasivo aprobado pendiente existe pero esta controlado y no presenta vencidos a `2026-03-13` (`2.826,33 EUR`, `0 EUR` vencidos).
- `ACC-REVOLUT-001`: Revolut tiene al menos una compra registrada (`Holafly 131,04 EUR`) pese a que la nota operativa del banco lo reserva para nominas/socios; revisar politica real de uso.
