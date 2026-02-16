
-- Delete quote lines for test drafts (empty ones + Feb 13 failed attempts)
DELETE FROM quotes.quote_lines 
WHERE quote_id IN (
  '1e2ca31d-e6f2-45e0-b754-45b90d9f109f',
  '50b7e766-32f2-4b35-8ad7-682a8b57378b',
  'ba8f335a-799a-4653-8c81-6d06b0a103bb',
  'c8fe56bb-1ba2-43df-9fc2-d107e5ad9182',
  '552a9a4a-0aa6-49fa-abf7-6292bd8bb261',
  '98e0081a-5840-42db-a3f6-96d235b54891',
  '8f48b3f2-89ef-4848-9123-9d5fe21e8fc9',
  '03973c88-ae0b-45fb-998a-bb1485dc2f6f',
  '708c6a8c-ad5f-471a-bb1a-b2ee4fde7d7d'
);

-- Delete the test draft quotes
DELETE FROM quotes.quotes 
WHERE id IN (
  '1e2ca31d-e6f2-45e0-b754-45b90d9f109f',
  '50b7e766-32f2-4b35-8ad7-682a8b57378b',
  'ba8f335a-799a-4653-8c81-6d06b0a103bb',
  'c8fe56bb-1ba2-43df-9fc2-d107e5ad9182',
  '552a9a4a-0aa6-49fa-abf7-6292bd8bb261',
  '98e0081a-5840-42db-a3f6-96d235b54891',
  '8f48b3f2-89ef-4848-9123-9d5fe21e8fc9',
  '03973c88-ae0b-45fb-998a-bb1485dc2f6f',
  '708c6a8c-ad5f-471a-bb1a-b2ee4fde7d7d'
);
