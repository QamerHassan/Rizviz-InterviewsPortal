/*
  RUN IN SSMS on Accounting_System_UAT
  
  Updates Rizviz_Users FullName values to ensure PowerBuilder logins
  display properly in the Rizviz ERP UI.

  The 'admin' user in PowerBuilder is Syed Musa - update accordingly.
  Add any other PowerBuilder usernames below as needed.

  After running this, also re-run create-rizviz-interviews-bridge-view.sql
  to refresh the dbo.Rizviz_Interviews_Live view.
*/

USE AccountingSystem;
-- If running on UAT instead, uncomment:
-- USE Accounting_System_UAT;
GO

-- Update the 'admin' PowerBuilder login to show 'Syed Musa'
UPDATE dbo.Rizviz_Users
SET FullName = 'Syed Musa'
WHERE LOWER(Username) = 'admin';

-- If Syed Musa has a different username in PowerBuilder, add it here:
-- UPDATE dbo.Rizviz_Users SET FullName = 'Syed Musa' WHERE LOWER(Username) = 'syed_musa';
-- UPDATE dbo.Rizviz_Users SET FullName = 'Syed Musa' WHERE LOWER(Username) = 'syedmusa';

-- Verify the update
SELECT Id, Username, FullName, RoleName, IsActive 
FROM dbo.Rizviz_Users
ORDER BY Username;
GO

PRINT 'User display names updated successfully.';
PRINT 'Now refresh the Rizviz_Interviews_Live view by running create-rizviz-interviews-bridge-view.sql';
GO
