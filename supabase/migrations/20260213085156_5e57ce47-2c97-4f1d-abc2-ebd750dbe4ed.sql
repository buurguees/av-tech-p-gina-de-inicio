
-- Update existing PLANNED projects to NEGOTIATION
UPDATE projects.projects SET status = 'NEGOTIATION' WHERE status = 'PLANNED';

-- Consolidate old client lead stages to NEGOTIATION
UPDATE crm.clients 
SET lead_stage = 'NEGOTIATION' 
WHERE lead_stage IN ('NEW', 'CONTACTED', 'MEETING', 'PROPOSAL', 'PAUSED');
