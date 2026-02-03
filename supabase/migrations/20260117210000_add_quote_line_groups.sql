-- Add group_name column to quote_lines table for organizing lines into groups
-- Migration: Add quote line grouping support

-- Add group_name column to allow optional grouping of quote lines
ALTER TABLE quotes.quote_lines 
ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Create index for efficient querying by quote_id and group
CREATE INDEX IF NOT EXISTS idx_quote_lines_group 
ON quotes.quote_lines(quote_id, group_name) 
WHERE group_name IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN quotes.quote_lines.group_name IS 'Optional group name for organizing quote lines into logical sections (e.g., "Audio Equipment", "Lighting")';
