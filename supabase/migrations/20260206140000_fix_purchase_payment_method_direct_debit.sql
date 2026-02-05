-- Migration: Add DIRECT_DEBIT to purchase_invoice_payments payment_method constraint
-- This was missing and causing error 400 when trying to register payments with Domiciliación

ALTER TABLE sales.purchase_invoice_payments DROP CONSTRAINT IF EXISTS purchase_invoice_payments_payment_method_check;

ALTER TABLE sales.purchase_invoice_payments ADD CONSTRAINT purchase_invoice_payments_payment_method_check 
  CHECK (payment_method = ANY (ARRAY['TRANSFER'::text, 'CASH'::text, 'CARD'::text, 'CHECK'::text, 'DIRECT_DEBIT'::text, 'OTHER'::text]));
