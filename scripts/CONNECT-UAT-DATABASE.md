# Connect Rizviz ERP to Accounting_System_UAT

## You do NOT need to "attach" the database

If SSMS Object Explorer shows **Accounting_System_UAT** with tables (`dbo.Company`, `hrms.entity`, …), the database is **already attached**. Attaching is only for loose `.mdf` files.

## What was wrong

| SSMS (your data) | Rizviz API (before) |
|------------------|---------------------|
| `dbo.Company` | `Companies` (new empty table) |
| `dbo.Company_branches` | `Branches` |
| `hrms.entity` | `Employees` |

The app was looking for **different table names**, not your UAT tables.

## Steps (do in order)

### 1. Copy your SSMS server name into the API

Your SSMS server (already configured in appsettings):

```json
"DefaultConnection": "Server=DESKTOP-3GFGTIJ\\SQLEXPRESS;Database=Accounting_System_UAT;User Id=sa;Password=2915;TrustServerCertificate=True;MultipleActiveResultSets=true;Encrypt=False"
```

### 2. Run SQL scripts in SSMS (on Accounting_System_UAT)

Open and execute **in this order**:

1. `scripts/discover-uat-schema.sql` — shows real column names  
2. Edit `scripts/create-rizviz-bridge-views.sql` if column names differ, then run it  
3. `scripts/create-rizviz-interviews-bridge-view.sql` — live interviews from `mkt.interview_*`  
4. `scripts/create-rizviz-projects-bridge-view.sql` — live projects from `mkt.Projects`  
5. `scripts/create-rizviz-app-tables.sql` — login + optional local app tables  

### 3. Restart the API

```powershell
cd "F:\Users\Qamer Hassan\RizvizERP\RizvizERP.API"
dotnet run
```

### 4. Test in browser

- `http://localhost:5000/api/setup/companies` — should list companies from **dbo.Company**  
- Login: `admin` / `admin123` (from Rizviz_Users table)

## Settings already enabled

- `UseExistingUatSchema: true` — read UAT companies/branches/employees  
- `UseBridgeViews: true` — use `Rizviz_*` views over your tables  
- `FallbackToInMemoryOnSqlFailure: false` — no fake demo data when SQL is down  

## If bridge views fail to create

Column names in your DB may differ. Run `discover-uat-schema.sql`, fix column names in `create-rizviz-bridge-views.sql`, run again.
