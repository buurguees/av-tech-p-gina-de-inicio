-- Add type column to product_categories table
-- This column was referenced in functions but missing from the table

ALTER TABLE internal.product_categories 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'product';

-- Update existing categories to have a default type
UPDATE internal.product_categories 
SET type = 'product' 
WHERE type IS NULL;

-- Add constraint to ensure type is either 'product' or 'service'
ALTER TABLE internal.product_categories
ADD CONSTRAINT check_type_value CHECK (type IN ('product', 'service'));

-- Add comment
COMMENT ON COLUMN internal.product_categories.type IS 'Type of category: product or service';
