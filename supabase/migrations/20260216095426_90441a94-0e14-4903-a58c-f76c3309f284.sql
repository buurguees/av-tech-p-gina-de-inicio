-- Fix 1: Add 'PARTNER' to the third_party_type enum so payment triggers work for personal payments
ALTER TYPE accounting.third_party_type ADD VALUE IF NOT EXISTS 'PARTNER';

-- Fix 2: Ensure all APPROVED purchase invoices are locked (data fix)
UPDATE sales.purchase_invoices
SET is_locked = true
WHERE status = 'APPROVED' AND is_locked = false;
