-- Fix for relation "crm.locations" does not exist error
-- This error occurs because crm.locations was dropped but this function still referenced it.

CREATE OR REPLACE FUNCTION crm.calculate_profile_score(p_client_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm
AS $$
DECLARE
  v_score INTEGER := 30; -- Base score
  v_client crm.clients%ROWTYPE;
  v_has_contact BOOLEAN;
BEGIN
  SELECT * INTO v_client FROM crm.clients WHERE id = p_client_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- +10 for tax_id
  IF v_client.tax_id IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  
  -- +10 for billing_address complete
  IF v_client.billing_address IS NOT NULL AND v_client.billing_city IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  
  -- +5 for website
  IF v_client.website IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;
  
  -- +5 for social media
  IF v_client.instagram_handle IS NOT NULL OR v_client.tiktok_handle IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;
  
  -- +10 for industry_sector
  IF v_client.industry_sector IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  
  -- +5 for number_of_locations > 1
  IF v_client.number_of_locations > 1 THEN
    v_score := v_score + 5;
  END IF;
  
  -- +10 for approximate_budget
  IF v_client.approximate_budget IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  
  -- +10 for extra contact
  SELECT EXISTS(SELECT 1 FROM crm.contacts WHERE client_id = p_client_id) INTO v_has_contact;
  IF v_has_contact THEN
    v_score := v_score + 10;
  END IF;
  
  -- Removed reference to crm.locations table as it was dropped.
  -- This fixes the "relation crm.locations does not exist" error.
  
  RETURN LEAST(v_score, 100);
END;
$$;
