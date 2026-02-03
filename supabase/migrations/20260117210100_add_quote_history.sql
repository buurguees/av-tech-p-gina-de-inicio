-- Create history tracking table for quote changes
-- Migration: Add quote history tracking

-- Create quote_history table to track all changes made to quotes
CREATE TABLE IF NOT EXISTS quotes.quote_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES quotes.quotes(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES internal.authorized_users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying by quote and chronological order
CREATE INDEX IF NOT EXISTS idx_quote_history_quote 
ON quotes.quote_history(quote_id, changed_at DESC);

-- Create index for querying by user
CREATE INDEX IF NOT EXISTS idx_quote_history_user 
ON quotes.quote_history(changed_by, changed_at DESC);

-- Add comments for documentation
COMMENT ON TABLE quotes.quote_history IS 'Tracks all changes made to quotes for audit trail and history display';
COMMENT ON COLUMN quotes.quote_history.field_name IS 'Name of the field that was changed (e.g., "status", "notes", "client_id")';
COMMENT ON COLUMN quotes.quote_history.old_value IS 'Previous value before change (stored as text)';
COMMENT ON COLUMN quotes.quote_history.new_value IS 'New value after change (stored as text)';

-- Enable RLS
ALTER TABLE quotes.quote_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quote_history
DROP POLICY IF EXISTS "Users can view quote history" ON quotes.quote_history;
CREATE POLICY "Users can view quote history"
  ON quotes.quote_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert history" ON quotes.quote_history;
CREATE POLICY "System can insert history"
  ON quotes.quote_history FOR INSERT
  WITH CHECK (true); -- Allow system to insert history records

-- Create function to automatically log quote changes
CREATE OR REPLACE FUNCTION quotes.log_quote_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO quotes.quote_history (quote_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'status', OLD.status::text, NEW.status::text, NEW.created_by);
  END IF;
  
  -- Log notes changes
  IF OLD.notes IS DISTINCT FROM NEW.notes THEN
    INSERT INTO quotes.quote_history (quote_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'notes', OLD.notes, NEW.notes, NEW.created_by);
  END IF;
  
  -- Log client changes
  IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
    INSERT INTO quotes.quote_history (quote_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'client_id', OLD.client_id::text, NEW.client_id::text, NEW.created_by);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log changes
DROP TRIGGER IF EXISTS quote_change_logger ON quotes.quotes;
CREATE TRIGGER quote_change_logger
  AFTER UPDATE ON quotes.quotes
  FOR EACH ROW
  EXECUTE FUNCTION quotes.log_quote_change();
