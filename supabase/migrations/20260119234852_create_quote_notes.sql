-- Create quote_notes table for storing saved notes with timestamps
CREATE TABLE IF NOT EXISTS quotes.quote_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes.quotes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES internal.authorized_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT quote_notes_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Create index for faster lookups
CREATE INDEX idx_quote_notes_quote_id ON quotes.quote_notes(quote_id, created_at DESC);

-- Enable RLS
ALTER TABLE quotes.quote_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view quote notes for quotes they have access to"
  ON quotes.quote_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes.quotes q
      WHERE q.id = quote_notes.quote_id
      AND (
        q.created_by = internal.get_authorized_user_id(auth.uid())
        OR EXISTS (
          SELECT 1 FROM internal.authorized_users au
          WHERE au.id = internal.get_authorized_user_id(auth.uid())
          AND (au.roles @> ARRAY['admin']::text[] OR au.roles @> ARRAY['manager']::text[])
        )
      )
    )
  );

CREATE POLICY "Users can create quote notes for quotes they have access to"
  ON quotes.quote_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes.quotes q
      WHERE q.id = quote_notes.quote_id
      AND (
        q.created_by = internal.get_authorized_user_id(auth.uid())
        OR EXISTS (
          SELECT 1 FROM internal.authorized_users au
          WHERE au.id = internal.get_authorized_user_id(auth.uid())
          AND (au.roles @> ARRAY['admin']::text[] OR au.roles @> ARRAY['manager']::text[])
        )
      )
    )
    AND created_by = internal.get_authorized_user_id(auth.uid())
  );

-- Function to get quote notes
CREATE OR REPLACE FUNCTION public.get_quote_notes(p_quote_id UUID)
RETURNS TABLE (
  id UUID,
  content TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qn.id,
    qn.content,
    qn.created_by,
    COALESCE(au.full_name, au.email, 'Usuario') as created_by_name,
    qn.created_at
  FROM quotes.quote_notes qn
  LEFT JOIN internal.authorized_users au ON au.id = qn.created_by
  WHERE qn.quote_id = p_quote_id
  ORDER BY qn.created_at DESC;
END;
$$;

-- Function to create quote note
CREATE OR REPLACE FUNCTION public.create_quote_note(
  p_quote_id UUID,
  p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the authorized user ID
  v_user_id := internal.get_authorized_user_id(auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authorized';
  END IF;

  -- Validate content
  IF length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Note content cannot be empty';
  END IF;

  -- Insert note
  INSERT INTO quotes.quote_notes (quote_id, content, created_by)
  VALUES (p_quote_id, trim(p_content), v_user_id)
  RETURNING id INTO v_note_id;

  RETURN v_note_id;
END;
$$;
