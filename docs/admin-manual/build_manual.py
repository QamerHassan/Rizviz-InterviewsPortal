#!/usr/bin/env python3
"""Generate Rizviz ERP Admin Manual — matches Rizviz_ERP_Online_Formatted.pdf layout."""

import os
import shutil
import subprocess

OUT = os.path.join(os.path.dirname(__file__), "Rizviz_ERP_Admin_Manual.html")
PDF_OUT = os.path.join(os.path.dirname(__file__), "Rizviz_ERP_Admin_Manual.pdf")
IMG = "images"

# ─── helpers ───

def note(text):
    return f'<div class="note"><strong>Note:</strong> {text}</div>'

def warn(text):
    return f'<div class="note warn"><strong>Important:</strong> {text}</div>'

def fig(num, caption, src, alt=None):
    return f'''<figure class="screenshot">
  <img src="{IMG}/{src}" alt="{alt or caption}" />
  <figcaption>Figure {num} — {caption}</figcaption>
</figure>'''

def tbl(headers, rows):
    h = "".join(f"<th>{x}</th>" for x in headers)
    b = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<table class="data"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table>'

def steps(items):
    return "<ol class=\"steps\">" + "".join(f"<li>{x}</li>" for x in items) + "</ol>"

def ul(items):
    return "<ul>" + "".join(f"<li>{x}</li>" for x in items) + "</ul>"

def p(t):
    return f"<p>{t}</p>"

def h2(t):
    return f"<h2>{t}</h2>"

def h3(t):
    return f"<h3>{t}</h3>"

def rizviz_logo():
    return """
<svg class="rizviz-logo" viewBox="0 0 350 85" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Rizviz International Impex logo">
  <g>
    <path d="M 10 10 L 56 10 C 72 10 82 20 82 34 C 82 45 72 53 58 53 L 44 53 L 74 80 L 56 80 L 29 53 L 29 80 L 10 80 Z" fill="#003B73"/>
    <path d="M 18 15 L 18 75" stroke="#00A3E0" stroke-width="1.2" opacity="0.8"/>
    <path d="M 23 15 L 23 50 M 23 58 L 23 75" stroke="#00A3E0" stroke-width="1.2" opacity="0.8"/>
    <circle cx="18" cy="25" r="2.5" fill="#00A3E0"/>
    <circle cx="18" cy="65" r="2.5" fill="#00A3E0"/>
    <circle cx="23" cy="45" r="2" fill="#00A3E0"/>
    <circle cx="23" cy="70" r="2" fill="#00A3E0"/>
    <path d="M 23 25 L 32 34" stroke="#00A3E0" stroke-width="1.2" opacity="0.7"/>
    <circle cx="32" cy="34" r="1.5" fill="#00A3E0"/>
    <path d="M 18 65 L 26 73" stroke="#00A3E0" stroke-width="1.2" opacity="0.7"/>
    <path d="M 33 40 C 33 34.5 37.5 30 43 30 C 45 30 47.5 31 49 32.5 C 51.5 29 55.5 27 60 27 C 67 27 72 32 72 39 C 73 39 74.5 39 75 40 C 78.5 42 81 45.5 81 50 C 81 55.5 76.5 60 71 60 L 59 60 L 59 74 C 59 75 58 76 57 76 L 53 76 C 52 76 51 75 51 74 L 51 60 L 39 60 C 35.5 60 33 57.5 33 54 Z" fill="#FFFFFF"/>
  </g>
  <text x="90" y="53" fill="#003B73" style="font-family: Arial, Helvetica, sans-serif; font-size:56px; font-weight:900; letter-spacing:1px;">IZVIZ</text>
  <text x="92" y="74" fill="#003B73" style="font-family: Arial, Helvetica, sans-serif; font-size:15.5px; font-weight:800; letter-spacing:2.5px;">INTERNATIONAL IMPEX</text>
</svg>"""

def topbar():
    return """<div class="topbar"><span>RIZVIZ INTERNATIONAL IMPEX</span><span>RIZVIZ INTERNATIONAL IMPEX</span></div>"""

# Each entry = one printed page body (header/footer added automatically)
PAGES = []

# ─── 1 INTRO ───
PAGES.append("""
<h2>1. Introduction to Rizviz ERP</h2>
<p>Rizviz ERP is a comprehensive Enterprise Resource Planning system developed exclusively for <strong>Rizviz International Impex</strong>.
It is designed to unify and streamline all core business processes across multiple companies and branches into a single, integrated platform.</p>
<p>This <strong>Administrator Manual</strong> is intended for users with the <strong>Admin</strong> role who manage the full Rizviz ERP environment —
including HR, payroll, assets, projects, recruitment, interviews, leads, reports, and security audit.</p>
<h3>Key Features</h3>""" + ul([
    "Multi-Company / Multi-Branch architecture",
    "Role-based access control for secure, permission-driven usage",
    "Centralized employee and HR management with live UAT database",
    "Real-time payroll and salary processing with payslip generation",
    "Asset inventory tracking — register, assign, and return",
    "Project resource management and team allocations",
    "Interview data synced from Interview Software.xlsx with change tracking",
    "Leads pipeline derived from interviews or added manually",
    "Corporate Reports Center — PDF and Excel export",
    "Security Audit Registry — login and payroll action logging",
]) + """
<h3>System Requirements</h3>""" + tbl(["Requirement", "Details"], [
    ["Browser", "Google Chrome recommended (version 90+)"],
    ["Frontend URL", "localhost:3000 (development) or production URL"],
    ["Backend API", "ASP.NET Core / Node.js API on port 5000"],
    ["Interview Excel", "Interview Software.xlsx in the RizvizERP project root"],
    ["Database", "SQL Server UAT / production as configured"],
    ["Credentials", "Valid Admin username and password"],
]) + """
<h3>Intended Audience</h3>
<p>This manual is intended for <strong>System Administrators</strong> and <strong>Admin-role users</strong> who require full access to all ERP modules and enterprise-wide data.</p>
""")

# ─── 2 LOGIN ───
PAGES.append("""
<h2>2. Login Module</h2>
<p>The Login Module is the entry point to Rizviz ERP. It ensures that only authorized users can access the platform by verifying identity through company selection, branch selection, username, and password.</p>
<p><strong>URL:</strong> <code>localhost:3000/login</code></p>""" + warn("All four fields on the login screen are mandatory. Leaving any field empty will prevent login.") + """
<h3>Login Screen Overview</h3>
<p>When you navigate to the ERP login URL, the Account Login screen is displayed:</p>
""" + fig(1, "Rizviz ERP Login Page (Account Login Form)", "login.png") + """
<p>Below the screenshot, the login page consists of:</p>""" + ul([
    "<strong>Header</strong> — \"Account Login\" title in bold dark blue",
    "<strong>Company dropdown</strong> — Select legal entity (e.g. Rizviz Int. Impex)",
    "<strong>Branch dropdown</strong> — Enabled after company selection (e.g. Lahore Tech Branch)",
    "<strong>Username field</strong> — Person icon; enter assigned username",
    "<strong>Password field</strong> — Lock icon; eye icon toggles visibility",
    "<strong>Sign In to Platform</strong> — Purple submit button",
    "<strong>Footer</strong> — \"© 2026 Rizviz Int. Impex. All rights reserved.\"",
]))

PAGES.append("""
<h3>Login Form — Field Reference</h3>""" + tbl(["Field Name", "Status", "Description"], [
    ["Company", "Required", "Legal entity (e.g. Rizviz Int. Impex)"],
    ["Branch", "Required", "Branch office assigned to the user"],
    ["Username", "Required", "Assigned ERP login name"],
    ["Password", "Required", "Secret password; masked with dots (●) by default"],
]) + """
<h3>Step-by-Step Login Instructions</h3>""" + steps([
    "Open the ERP URL in your browser: <code>localhost:3000/login</code>.",
    "Select <strong>Company</strong> — Rizviz Int. Impex.",
    "Select <strong>Branch</strong> — e.g. Lahore Tech Branch.",
    "Enter your <strong>Username</strong> and <strong>Password</strong>.",
    "Click <strong>Sign In to Platform</strong>.",
    "Admin users are redirected to the <strong>Management Dashboard</strong>.",
]) + """
<h3>Available Branches</h3>""" + ul([
    "Karachi Head Office",
    "Lahore Tech Branch",
    "Islamabad Executive Branch",
]) + note("Only select the branch to which you are officially assigned.")
)

PAGES.append("""
<h3>Password Field — Behavior</h3>
<p>The Password field masks characters by default. Click the eye icon to reveal plain text; click again to re-mask.</p>""" + note("Security Tip: Do not use show-password in public or shared areas.") + """
<h3>Sign In Button — Behavior</h3>""" + ul([
    "<strong>Success</strong> — Redirect to Management Dashboard (Admin).",
    "<strong>Empty field</strong> — System highlights missing field.",
    "<strong>Invalid credentials</strong> — Authentication error displayed.",
]) + """
<h3>Login — Troubleshooting</h3>""" + tbl(["Issue", "Resolution"], [
    ["Branch dropdown empty", "Select Company first."],
    ["Invalid username/password", "Verify credentials; check Caps Lock; contact IT."],
    ["Page not loading", "Clear cache; enable JavaScript; use Chrome."],
    ["Forgot password", "Contact system administrator — no self-service reset."],
]))

# ─── 3 DASHBOARD ───
PAGES.append("""
<h2>3. Management Dashboard</h2>
<p>After successful Admin login, the system navigates to the <strong>Management Dashboard</strong> — a real-time enterprise overview of interviews, headcount, payroll, assets, and onboarding.</p>
<p><strong>URL:</strong> <code>localhost:3000/dashboard</code></p>""" + note("Admin subtitle: \"All Data — Enterprise Overview — Welcome back, Rizviz Admin (Admin)\".") + """
<h3>Dashboard — Interview Statistics and KPI Cards (Light Mode)</h3>
""" + fig(2, "Management Dashboard — Full Dashboard View with Time Widgets", "dashboard-full-current.png") + """
<p>Below the screenshot, the dashboard shows the full Admin view with company and branch selectors, global time widgets, interview statistics, KPI cards, and the Departmental Breakdown chart area.</p>
<h3>Time Widgets</h3>""" + tbl(["Zone", "Time", "Description"], [
    ["CST", "2:17 PM", "Central Standard Time widget"],
    ["EST", "3:17 PM", "Eastern Standard Time widget"],
    ["PKT", "12:17 AM", "Pakistan Standard Time widget"],
    ["PK", "12:17 AM", "Pakistan local time widget"],
]) + """
<h3>Visible Dashboard Metrics</h3>""" + tbl(["Tile / Card", "Value", "Description"], [
    ["Total Interviews", "607", "All records; click to view unfiltered list"],
    ["Rejected", "191", "Candidates marked rejected"],
    ["Closed", "112", "Formally closed interviews"],
    ["Date Changed", "105", "Interview date was modified"],
    ["Dropped", "84", "Candidates who dropped out"],
    ["Rescheduled", "65", "Moved to new date/time"],
    ["Dead", "23", "Inactive / dead leads"],
    ["Converted", "21", "Successfully converted"],
    ["Total Headcount", "2", "Active: 2 | Inactive: 0"],
    ["Processed Payroll", "216,000", "Currency: PKR"],
    ["Tracked Assets", "3", "Assigned: 2 | Available: 1"],
    ["New Onboardings", "0", "Joined in current month"],
]) + note("Each interview tile includes \"Click to filter\" and opens the Interviews list with that status pre-applied. KPI cards open their related module links.")
)

PAGES.append("""
<h3>Dashboard — Enterprise KPI Cards</h3>
""" + fig(3, "Management Dashboard — Headcount, Payroll, Assets, and Department Chart", "dashboard-kpi.png") + """
<p>Below the screenshot, the four enterprise KPI cards display:</p>""" + tbl(["Card", "Value", "Subtext"], [
    ["Total Headcount", "2", "Active: 2 | Inactive: 0"],
    ["Processed Payroll", "216,000", "Currency: PKR"],
    ["Tracked Assets", "3", "Assigned: 2 | Available: 1"],
    ["New Onboardings", "0", "Joined in current month"],
]) + """
<p>The <strong>Departmental Breakdown</strong> bar chart below shows headcount and monthly budget per department (e.g. Technology: 2 employees).</p>
""")

PAGES.append("""
<h3>Dashboard — Charts (Asset &amp; Payroll Trends)</h3>
""" + fig(4, "Management Dashboard — Asset Distribution and Payroll Expenditure Trend", "dashboard-charts.png") + """
<p>Below the screenshot:</p>""" + ul([
    "<strong>Asset Distribution</strong> — Donut chart: Laptop (2), SIM (1)",
    "<strong>Monthly Payroll Expenditure Trend</strong> — Line chart Jan–May showing steady increase to ~PKR 216,000",
]) + """
<h3>Dashboard — Dark Mode View</h3>
""" + fig(5, "Management Dashboard in Dark Mode — Full Enterprise Overview", "dashboard-dark.png") + """
<p>Below the screenshot, Dark Mode applies a deep navy background across the dashboard while preserving all KPI cards, interview tiles, and chart readability. Toggle via the sidebar <strong>Light Mode / Dark Mode</strong> switch.</p>
""")

# ─── 4 HR ───
PAGES.append("""
<h2>4. HR &amp; Employees Module</h2>
<p>The Employee Directory manages staff records from the live UAT HRMS database. Admins can add, edit, delete, search, filter, and export employees.</p>
<p><strong>URL:</strong> <code>localhost:3000/employees</code></p>
""" + fig(6, "Employee Directory — Summary Cards and Data Table", "employees.png") + """
<p>Below the screenshot:</p>""" + ul([
    "<strong>Title</strong> — \"Employee Directory (2 from UAT database)\"",
    "<strong>Add Employee</strong> — Purple button (top right)",
    "<strong>Export</strong> — Download directory as Excel",
    "<strong>Summary Cards</strong> — Total (2), Active (2), Suspended/Leave (0), Terminated (0); click to filter",
    "<strong>Search</strong> — \"Search Name, Code, CNIC…\"",
    "<strong>Filters</strong> — Branch and Status dropdowns",
    "<strong>Table</strong> — Emp Code, Full Name, CNIC, Department, Designation, Status, Edit/Delete actions",
]) + """
<h3>Employee Table — Sample Data</h3>""" + tbl(["Emp Code", "Name", "Department", "Designation", "Status"], [
    ["EMP-001", "Qamer Hassan", "Technology", "Senior Software Engineer", "Active"],
    ["EMP-002", "Fatima Ali", "Technology", "Software Engineer", "Active"],
])
)

# ─── 5 PAYROLL ───
PAGES.append("""
<h2>5. Payroll Process Module</h2>
<p>The Payroll Process module executes monthly payroll runs, computes income tax and loan deductions, and generates printable staff payslips. Admin access only.</p>
<p><strong>URL:</strong> <code>localhost:3000/payroll</code></p>
<h3>Page Layout</h3>""" + ul([
    "<strong>Title</strong> — \"Payroll Processing\" — \"Execute monthly runs, compute income taxes, and generate staff payslips.\"",
    "<strong>Month / Year</strong> selectors for payroll period",
    "<strong>Summary Cards</strong> — Total Net Payout (PKR), Processed Staff, Total Tax Withheld",
    "<strong>Process Payroll</strong> button — finalizes the monthly run",
    "<strong>Payroll Table</strong> with Payslip print action per row",
]) + """
<h3>Payroll Table Columns</h3>""" + tbl(["Column", "Description"], [
    ["Emp Code", "Employee identifier"],
    ["Name", "Employee full name"],
    ["Basic Salary (PKR)", "Base monthly salary"],
    ["Allowances", "Additional earnings"],
    ["Tax Deduction", "Income tax withheld (red)"],
    ["Loans Paid", "Loan repayment deduction"],
    ["Net Salary (PKR)", "Final disbursed amount (purple bold)"],
    ["Action", "Payslip button — opens printable payslip"],
]) + warn("Payroll processing is irreversible for the selected period. Verify figures before confirming.") + """
<h3>Processing Payroll — Steps</h3>""" + steps([
    "Select Month and Year.",
    "Review calculated figures in the table.",
    "Click <strong>Process Payroll</strong>.",
    "Action is logged in Security Audit Registry.",
])
)

PAGES.append("""
<h3>Payroll Processing Screen</h3>
""" + fig(7, "Payroll Processing — Summary Cards, Period Selectors, and Payroll Table", "07-interviews-no-changes.png") + """
<p>Below the screenshot, the payroll screen shows:</p>""" + ul([
    "<strong>Total Net Payout</strong> card showing PKR 216,000",
    "<strong>Processed Staff</strong> card showing 2 employees",
    "<strong>Total Tax Withheld</strong> card showing PKR 24,000",
    "<strong>Year</strong> and <strong>Month</strong> selectors set to 2026 and June",
    "<strong>Process Payroll Run</strong> button for finalizing the selected period",
    "<strong>Payroll table</strong> with employee salary, allowances, deductions, net salary, and Payslip action",
]) + """
<h3>Employee Payslip Print View</h3>
""" + fig(8, "Employee Payslip Print View — Earnings, Deductions, and Net Disbursed Salary", "08-calendar.png") + """
<p>Below the screenshot, the payslip modal includes:</p>""" + ul([
    "Employee code, employee name, designation, department, payslip month, payment mode, bank name, and account number",
    "Earnings table with Basic Salary and Allowances",
    "Deductions table with Income Tax and Loan Repayment",
    "<strong>Net Disbursed Salary</strong> highlighted in green",
    "Employee Signature and Authorized Representative signature lines",
    "<strong>Close</strong> and <strong>Print Payslip</strong> actions",
])
)

# ─── 6 ASSETS ───
PAGES.append("""
<h2>6. Asset Register Module</h2>
<p>The Asset Inventory Register tracks company assets, assigns them to employees, and processes returns. Data loads from UAT <code>inventory.assets</code>.</p>
<p><strong>URL:</strong> <code>localhost:3000/inventory</code></p>
""" + fig(9, "Asset Inventory Register — Stat Cards and Asset Table", "09-calendar-month.png") + """
<p>Below the screenshot:</p>""" + ul([
    "<strong>Stat Cards</strong> — Total Tracked (3), Assigned (2), Available (1), Maintenance (0)",
    "<strong>+ Register Asset</strong> — Purple button to add new asset",
    "<strong>Info Banner</strong> — \"Asset data is loaded from UAT (inventory.assets)…\"",
    "<strong>Table columns</strong> — Asset Code, Name, Category, Serial, Purchase Value, Status, Assigned To, Actions",
]) + """
<h3>Asset Table — Sample Data</h3>""" + tbl(["Code", "Name", "Value", "Status", "Assigned To", "Action"], [
    ["AST-LPT-001", "Dell Latitude 5420", "PKR 180,000", "ASSIGNED", "Qamer Hassan", "Return"],
    ["AST-LPT-002", "MacBook Pro M2", "PKR 350,000", "AVAILABLE", "Available", "Assign"],
    ["AST-SIM-001", "Jazz Super Card SIM", "PKR 1,000", "ASSIGNED", "Qamer Hassan", "Return"],
])
)

PAGES.append("""
<h3>Register New Hardware Asset — Modal</h3>
""" + fig(10, "Register New Hardware Asset Modal Form", "assets-modal.png") + """
<p>Below the screenshot, the registration form contains:</p>""" + tbl(["Field", "Required", "Description"], [
    ["Asset Name", "Yes", "e.g. Dell Latitude 5420"],
    ["Category", "Yes", "Dropdown: Laptop, SIM, etc."],
    ["Serial Number", "Yes", "SN / Asset Tag"],
    ["Purchase Value (PKR)", "Yes", "Asset cost"],
    ["Remarks", "No", "Condition or warranty details"],
]) + """
<p>Click <strong>Register</strong> to save or <strong>Cancel</strong> to dismiss.</p>
<h3>Assign / Return Workflow</h3>""" + steps([
    "For AVAILABLE assets, click <strong>Assign</strong> — select employee, date, condition.",
    "For ASSIGNED assets, click <strong>Return</strong> — record return condition.",
    "Status updates automatically in the table and stat cards.",
])
)

# ─── 7 PROJECTS ───
PAGES.append("""
<h2>7. Project Allocations Module</h2>
<p>Project Resource Management tracks client projects, budgets, timelines, and staff allocations. Data from <code>mkt.projects</code> and <code>project_stakeholders</code>.</p>
<p><strong>URL:</strong> <code>localhost:3000/projects</code></p>
""" + fig(11, "Project Resource Management — Project Cards View", "projects.png") + """
<p>Below the screenshot:</p>""" + ul([
    "<strong>Stat Cards</strong> — Total Projects (2), Active Initiatives (2), Resource Allocations (3)",
    "<strong>Info Banner</strong> — \"Connected to live UAT. Team members come from project_stakeholders…\"",
    "<strong>Search</strong> — \"Search project, client, code…\"",
    "<strong>View Toggle</strong> — Cards (active) / Table",
    "<strong>+ Create Project</strong> — Opens new project form modal",
]) + """
<h3>Project Card — Sample (PRJ-001)</h3>""" + tbl(["Field", "Value"], [
    ["Status", "IN PROGRESS (blue tag)"],
    ["Code / Client", "PRJ-001 — Rizviz Int. Impex"],
    ["Description", "Migrate legacy PowerBuilder desktop ERP to React + ASP.NET Core"],
    ["Budget", "5,000,000 PKR"],
    ["Timeline", "01/02/2026 — 31/12/2026"],
    ["Team", "Qamer Hassan, Fatima Ali (2 members)"],
    ["Action", "Assign Resource button"],
])
)

# ─── 8 RECRUITMENT ───
PAGES.append("""
<h2>8. Recruitment — Interviews Portal</h2>
<p>The Interviews Portal manages job openings, candidate pipelines, and interview schedules using the internal recruitment database (separate from Excel-synced Interviews).</p>
<p><strong>URL:</strong> <code>localhost:3000/recruitment</code></p>
""" + fig(12, "Interviews Portal — KPI Cards and Active Job Postings Tab", "recruitment.png") + """
<p>Below the screenshot:</p>""" + ul([
    "<strong>Title</strong> — \"Interviews Portal\" — \"Manage job openings, screen candidates, and capture interview feedback.\"",
    "<strong>KPI Cards</strong> — Total Interviews, Candidates (38), Open Postings (0), Converted/Hired (0)",
    "<strong>Tabs</strong> — Recruitment Pipelines | Interview Schedule | Active Job Postings",
    "<strong>+ Create Job Posting</strong> — Purple button",
    "<strong>Job Table</strong> — Job Title, Department, Vacancies, Status, Posted",
]) + """
<h3>Creating a Job Posting</h3>""" + steps([
    "Navigate to Recruitment → Active Job Postings tab.",
    "Click <strong>+ Create Job Posting</strong>.",
    "Enter job title, department, vacancy count, description.",
    "Save — posting appears in the table.",
])
)

# ─── 9 INTERVIEWS ───
PAGES.append("""
<h2>9. Interviews Module</h2>
<p>The Interviews Module aggregates all records from <strong>Interview Software.xlsx</strong> via live sync. Admins see all records with search, filter, edit, delete, and export.</p>
<p><strong>URL:</strong> <code>localhost:3000/interviews</code></p>""" + note("Admin view label: \"All interviews — admin view\".") + """
<h3>Interviews — Statistics Tiles and Toolbar</h3>
""" + fig(13, "Interviews Module — KPI Cards, Toolbar, and Filter Bar", "14-reports.png") + """
<p>Below the screenshot, the toolbar buttons are:</p>""" + tbl(["Button", "Function"], [
    ["Export", "Download current filtered data"],
    ["Upload Excel", "Manually upload Excel file"],
    ["Recent 90 days", "Toggle date window filter"],
    ["Refresh", "Sync from local Interview Software.xlsx"],
    ["+ Add Row", "Manually add interview record"],
]) + """
<p>Top-right shows <strong>Last synced</strong> and <strong>File saved at</strong> timestamps.</p>
""")

PAGES.append("""
<h3>Interviews — Sync Info Banner and Table</h3>
""" + fig(14, "Interviews Table with Excel Sync Banner", "interviews-banner.png") + """
<p>Below the screenshot, the blue banner states:</p>
<p><em>\"Real data from Interview Software.xlsx — save in Excel (Ctrl+S), then Refresh. Changed rows show in the sync summary (Reschedule, Cancel, Data change, etc.).\"</em></p>
<h3>Interviews Table — List View</h3>
""" + fig(15, "Interviews Table — Status Badges and Row Actions", "15-interviews-kpi.png") + """
<p>Below the screenshot, key columns include:</p>""" + tbl(["Column", "Description"], [
    ["SR", "Unique serial number — primary Excel sync match key"],
    ["INV. TO", "Entity interviewed for (e.g. Silmun)"],
    ["DATE", "Scheduled interview date"],
    ["INTERVIEWER / INTERVIEWEE", "Recruiter and candidate names"],
    ["COMPANY", "Target client company"],
    ["INTERVIEW TYPE", "Technical, HR, Combined, etc."],
    ["STATUS", "Color-coded: rejected, closed, dropped, converted, date changed"],
    ["ACTIONS", "History (clock), Edit (pencil), Delete (trash)"],
]) + """
<h3>Pagination</h3>
<p>Footer shows \"1–20 of 599 rows\" with page navigation and 20/page selector.</p>
""")

# ─── 10 EXCEL SYNC ───
PAGES.append("""
<h2>10. Excel Sync — Interview Data Synchronization</h2>
<p>Interview data syncs with <strong>Interview Software.xlsx</strong>. Save in Excel (Ctrl+S), then click Refresh in the ERP.</p>
<h3>Sync Workflow</h3>""" + steps([
    "Open Interview Software.xlsx.",
    "Edit dates, names, statuses, or add rows.",
    "Save with Ctrl+S.",
    "In Interviews module, click Refresh.",
    "Review sync summary modal.",
]) + warn("Rows match by Sr number. Do not change Sr unless creating new records.") + """
<h3>Excel Sync Summary Modal</h3>
""" + fig(16, "Excel Sync Summary Modal — Sync Complete with Statistics", "sync-summary.png") + """
<p>Below the screenshot, the modal displays:</p>""" + tbl(["Field", "Example"], [
    ["Synced at", "Jun 11, 2026 7:43 PM"],
    ["File read", "F:\\...\\Interview Software.xlsx"],
    ["File saved at", "Jun 5, 2026 9:01 PM"],
    ["Total rows", "607"],
    ["New / Changed / Unchanged / Failed", "0 / 0 / 607 / 0"],
])
)

PAGES.append("""
<h3>Sync Summary — Full Page Context</h3>
""" + fig(17, "Interviews Page with Updated Excel Rows Highlighted", "interviews-grid.png") + """
<p>Below the screenshot, a green banner at the top confirms: <em>\"Sync complete (merged with Excel): 0 new, 0 changed, 607 unchanged, 0 deleted, 0 failed.\"</em></p>
<h3>No Changes Detected</h3>
""" + fig(18, "Excel Sync Summary — No Field Changes Detected", "sync-summary.png") + """
<p>Below the screenshot:</p>""" + ul([
    "Green banner confirms that sync completed successfully",
    "Excel sync summary modal shows total rows, new rows, changed rows, unchanged rows, and failed rows",
    "\"No field changes detected\" note explains that the Excel file matches the database",
    "Close button dismisses the modal after review",
]) + """
<p>Use the <strong>History</strong> (clock) icon on any row to view its full change log (Reschedule, Cancel, Data change).</p>
""")

# ─── 11 CALENDAR ───
PAGES.append("""
<h2>11. Interview Calendar Module</h2>
<p>The Calendar provides a visual month-by-month overview plotting interviews by job start, interview, or close date.</p>
<p><strong>URL:</strong> <code>localhost:3000/interviews/calendar</code></p>
""" + fig(19, "Interview Calendar — April 2026 Month Grid", "calendar-month.png") + """
<p>Below the screenshot:</p>""" + ul([
    "<strong>Data summary</strong> — \"607 rows loaded. 676 on the calendar. 596 events on 23 days (77%).\"",
    "<strong>Controls</strong> — ‹ April 2026 ›, Busiest month, Today, Sync &amp; refresh",
    "<strong>Back to Interviews</strong> link at top",
]) + """
<h3>Event Chips — Day Cell Detail</h3>
""" + fig(20, "Interview Calendar — Event Chips and Day Cells", "calendar-month.png") + """
<p>Below the screenshot, the calendar day cells show:</p>""" + tbl(["Element", "Description"], [
    ["Date cell", "Each box represents one day in the selected month"],
    ["Event chip", "Candidate/interview entries displayed inside the relevant date"],
    ["Color markers", "Status or category color cues used to distinguish interview records"],
    ["+N more", "Shown when a day has more interview events than can fit in the visible cell"],
    ["Navigation", "Month controls and sync/refresh actions above the grid"],
])
)

# ─── 12 AI FEEDBACK ───
PAGES.append("""
<h2>12. AI Feedback Module</h2>
<p>The AI Feedback Module captures, transcribes, and enhances interview feedback using Whisper AI (voice) and Llama-3 (text enhancement). Records sync to database and Google Sheets.</p>
<p><strong>URL:</strong> <code>localhost:3000/interviews/feedback</code></p>
<h3>Interview Feedback — Data Table</h3>
""" + fig(21, "Interview Feedback — Table with Status Badges and Actions", "17-leads-list.png") + """
<p>Below the screenshot, the page contains:</p>""" + ul([
    "<strong>Title</strong> — \"Interview Feedback\" — \"Capture, transcribe, and enhance interview feedback with AI.\"",
    "<strong>+ Add Feedback</strong> — Opens AI feedback entry modal",
    "<strong>Search</strong> — \"Search candidate, interviewer, company…\"",
    "<strong>Filter</strong> — All Recommendations dropdown",
    "<strong>Columns</strong> — Sr, Date, Interviewee, Job Hunter, Company, Type, Status, Inv. To, Interview For, Job Start Date, Actions",
    "<strong>Actions</strong> — View (blue) and Delete (red) per row",
]) + """
<h3>Status Badge Colors</h3>""" + tbl(["Status", "Color"], [
    ["Date changed", "Grey"], ["Rejected", "Red"], ["Postponed", "Orange"],
    ["Cancelled", "Red"], ["Converted", "Green"], ["Dropped", "Orange"],
]) + """
<h3>Adding Feedback — Steps</h3>""" + steps([
    "Click <strong>+ Add Feedback</strong>.",
    "Select interview session (Sr number).",
    "Use Voice tab (record) or Text tab (type notes).",
    "Click <strong>Process with AI</strong> for transcription/enhancement.",
    "Set Recommendation, rating, strengths, weaknesses.",
    "Click <strong>Save Feedback</strong>.",
]) + note("Duplicate prevention: system blocks multiple feedback entries for the same Sr number.")
)

# ─── 13 LEADS ───
PAGES.append("""
<h2>13. Leads Management Module</h2>
<p>Leads are derived from Excel interview sync or added manually. Each lead tracks a candidate–company pair with outcome status.</p>
<p><strong>URL:</strong> <code>localhost:3000/leads</code></p>
""" + fig(22, "Leads Management — Statistics Tiles and Filter Controls", "leads-view.png") + """
<p>Below the screenshot:</p>""" + tbl(["Tile", "Count"], [
    ["Total Leads", "487"], ["Converted", "16"], ["Rejected", "175"],
    ["Dropped", "78"], ["Closed", "0"], ["Dead Leads", "12"],
]) + """
<p>Filters: Search bar, Outcome dropdown, Profiles dropdown, Companies dropdown. Buttons: Refresh, + Create Lead.</p>
""")

PAGES.append("""
<h3>Leads Grid Table</h3>
""" + fig(23, "Leads Grid Table — Status Badges and Action Icons", "19-leads-detail-modal.png") + """
<p>Below the screenshot, columns include:</p>""" + tbl(["Column", "Description"], [
    ["Interviewee / Profile", "Candidate name"],
    ["Company", "Target client company"],
    ["Status", "Rejected (red), Completed (green), Postponed (orange), etc."],
    ["Rounds", "Interview round count (blue badge)"],
    ["Last Activity", "Most recent event date"],
    ["Interviews", "View interviews link"],
    ["Actions", "View (eye) and Edit (pencil)"],
]) + """
<p>Pagination: \"Total 487 leads\" — 15 / page.</p>
<h3>Lead Details Modal</h3>
""" + fig(24, "Lead Details Modal — Company, Status, and Notes", "leads-dark-detail.png") + """
<p>Below the screenshot:</p>""" + ul([
    "Company name as modal title (e.g. DXC) with status badge (Rejected)",
    "\"Auto Derived (2 Interview Rounds)\" source badge",
    "Interviewee, Last Activity, Converted Outcome (Yes/No)",
    "Lead Notes section",
    "<strong>View raw Interviews</strong> purple button",
])
)

PAGES.append("""
<h3>Leads Table — Pagination and Row Actions</h3>
""" + fig(25, "Leads Table — Pagination, Status Badges, and Actions", "19-leads-detail-modal.png") + """
<p>Below the screenshot, the table controls include:</p>""" + tbl(["Element", "Description"], [
    ["Pagination", "Total 487 leads with page controls at the bottom"],
    ["Rows per page", "15 / page selector at the lower right"],
    ["Status badges", "Rejected, Dropped, Dead, Completed, and Date changed"],
    ["View interviews", "Link icon opens source interview records for the lead"],
    ["Actions", "Eye icon opens Lead Details; pencil icon opens edit mode when available"],
]) + """
<h3>Lead Details Modal Overlay</h3>
""" + fig(26, "Lead Details Modal — Overlay View", "leads-dark-detail.png") + """
<p>Below the screenshot, the background table is dimmed while the modal remains active. The modal includes the company, status, interviewee/profile, last activity date, converted outcome, lead notes, Close, and View raw Interviews actions.</p>
""")

# ─── 14 REPORTS ───
PAGES.append("""
<h2>14. Reports Center Module</h2>
<p>Generate comprehensive registers for corporate audits and exports in PDF or Excel.</p>
<p><strong>URL:</strong> <code>localhost:3000/reports</code></p>
""" + fig(27, "Corporate Reports Center — Settings and Live Preview", "20-interviews-table.png") + """
<p>Below the screenshot:</p>
<h3>Report Settings (Left Panel)</h3>""" + ul([
    "<strong>Report Type</strong> — HR Employee Directory, Payroll Register, Asset Inventory",
    "<strong>Branch</strong> and <strong>Status</strong> filter dropdowns",
    "<strong>Print / Save PDF</strong> — Purple button",
    "<strong>Export to Excel</strong> — White button",
]) + """
<h3>Live Preview Grid (Right Panel)</h3>""" + tbl(["Code", "Name", "CNIC", "Status", "Basic Salary"], [
    ["EMP-001", "Qamer Hassan", "35201-1234567-9", "Active", "150,000"],
    ["EMP-002", "Fatima Ali", "35202-7654321-0", "Active", "90,000"],
]) + """
<h3>Generating a Report</h3>""" + steps([
    "Select Report Type.", "Optionally filter Branch/Status.",
    "Review Live Preview.", "Click Print/Save PDF or Export to Excel.",
])
)

# ─── 15 AUDIT ───
PAGES.append("""
<h2>15. Security Audit Registry</h2>
<p>Monitors user logins, credential changes, and payroll processing. Admin access only.</p>
<p><strong>URL:</strong> <code>localhost:3000/audit-logs</code></p>
""" + fig(28, "Security Audit Registry — Login and Payroll Action Log", "audit-logs.png") + """
<p>Below the screenshot:</p>""" + tbl(["Column", "Description"], [
    ["Log ID", "Unique identifier (#1, #2…)"],
    ["Username", "User who performed the action"],
    ["Action Triggered", "e.g. User Login, Processed Payroll for 2026-06"],
    ["Module", "Auth (purple), HR (orange), Payroll (magenta)"],
    ["IP Address", "Client IP (::1 for localhost)"],
    ["Timestamp (UTC)", "Date and time of action"],
]) + """
<h3>Sample Entries</h3>""" + tbl(["ID", "User", "Action", "Module"], [
    ["#2", "Rizviz Admin", "Processed Payroll for 2026-06", "Payroll"],
    ["#1", "Rizviz", "User Login", "Auth"],
])
)

# ─── 16 ROLES ───
PAGES.append("""
<h2>16. Admin Roles &amp; Permissions</h2>""" + tbl(["Role", "Access Level"], [
    ["Admin", "Full access to all modules, all data, Excel sync, audit logs"],
    ["HR", "Employee forms, reports; limited admin functions"],
    ["Manager", "Branch-level data, reports"],
    ["Interviewee / Job Hunter", "Dashboard and own interviews only"],
]) + """
<h3>Data Scope Labels</h3>""" + ul([
    "<strong>All Data — Enterprise Overview</strong> — Admin",
    "<strong>Branch Data — Team Overview</strong> — Manager",
    "<strong>Your interviews — [Name]</strong> — Interview portal users",
]) + """
<h2>17. Troubleshooting</h2>""" + tbl(["Issue", "Resolution"], [
    ["No Changes Detected on Refresh", "Save Excel with Ctrl+S before Refresh"],
    ["Dashboard vs Table count mismatch", "Disable Recent 90 days filter"],
    ["Calendar events > interview rows", "Each row can have multiple calendar dates"],
    ["Cannot access module", "Verify role permissions with Admin"],
    ["Asset data not loading", "Check UAT database connection; refresh page"],
]) + """
<h2>18. Contact &amp; Support</h2>""" + tbl(["", ""], [
    ["Support Team", "IT Department — Rizviz International Impex"],
    ["Email", "support@rizviz.com"],
    ["Office Hours", "Monday – Friday, 9:00 AM to 6:00 PM (PKT)"],
]) + """
<p style="margin-top:20px;text-align:center;font-size:10pt;color:#64748b;">
© 2026 Rizviz International Impex. All rights reserved. | Confidential — For Internal Use Only</p>
""")

# ─── BUILD HTML ───
TOTAL = len(PAGES) + 1  # + cover

CSS = """
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 9.3pt; color: #4d4d4d; line-height: 1.26; }
.manual { width: 210mm; margin: 0 auto; background: #fff; }
.cover-page { width: 210mm; height: 297mm; page-break-after: always; position: relative; padding: 12mm 16mm 14mm; }
.topbar { display: grid; grid-template-columns: 1fr 1fr; height: 14mm; background: #ee6427; color: #fff; border-bottom: 1.7mm solid #087495; font-size: 8.5pt; line-height: 12.2mm; text-transform: uppercase; }
.topbar span { padding-left: 8px; border-right: 1px solid rgba(255,255,255,.18); }
.topbar span + span { font-weight: 700; padding-left: 12px; }
.cover-rule { border-top: 1px solid #a78bfa; margin: 13mm 0 0; }
.cover-logo-wrap { text-align: center; margin-top: 27mm; }
.rizviz-logo { width: 98mm; height: auto; }
.logo-underline { width: 112mm; margin: 4mm auto 0; border-top: 1px solid #d0d0d0; }
.cover-title-rule { border-top: 1px solid #a78bfa; border-bottom: 1px solid #c4b5fd; padding: 4mm 0 2mm; margin-top: 40mm; }
.cover-page h1 { font-size: 22pt; font-weight: 800; margin: 0; color: #0b2d66; }
.cover-meta { font-size: 11pt; color: #595959; line-height: 1.75; margin-top: 9mm; }
.cover-meta em { color: #777; font-size: 10pt; }
.page { width: 210mm; height: 297mm; page-break-after: always; padding: 12mm 16mm 11mm; display: flex; flex-direction: column; overflow: hidden; }
.page-header { display: grid; grid-template-columns: 1fr 1fr; height: 14mm; margin-bottom: 8mm; background: #ee6427; color: #fff; border-bottom: 1.7mm solid #087495; font-size: 8.5pt; line-height: 12.2mm; text-transform: uppercase; }
.page-header span { padding-left: 8px; border-right: 1px solid rgba(255,255,255,.18); }
.page-header span + span { font-weight: 700; padding-left: 12px; }
.page-body { flex: 1; }
.page-body::before { content: ""; display: block; border-top: 1px solid #a78bfa; margin-bottom: 4mm; }
.page-footer { display: flex; justify-content: space-between; font-size: 9pt; color: #005a9c; border-top: 1px solid #73a3c8; padding-top: 2px; margin-top: 9mm; }
h2 { font-size: 14pt; font-weight: 800; color: #7c3aed; margin: 0 0 6px; padding-bottom: 2px; }
h3 { font-size: 10.6pt; font-weight: 700; color: #005a9c; margin: 9px 0 4px; }
p { margin: 0 0 5px; text-align: justify; }
ul, ol { margin: 0 0 5px; padding-left: 16px; }
li { margin-bottom: 1.5px; }
code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 8.8pt; }
.note { background: #eee9ff; border-left: 3px solid #7c3aed; padding: 5px 8px; margin: 5px 0; font-size: 9pt; color: #111827; }
.note.warn { background: #fff3e6; border-left-color: #ee6427; }
figure.screenshot { margin: 5px 0 6px; text-align: center; }
figure.screenshot img { max-width: 100%; max-height: 72mm; width: auto; height: auto; border: 1px solid #cbd5e1; border-radius: 3px; }
figcaption { font-size: 7.8pt; font-style: italic; color: #777; margin-top: 3px; }
table.data { width: 100%; border-collapse: collapse; font-size: 8.2pt; margin: 5px 0 7px; }
table.data th, table.data td { border: 1px solid #cbd5e1; padding: 3px 5px; text-align: left; vertical-align: top; }
table.data th { background: #f1f5f9; font-weight: 700; color: #005a9c; }
ol.steps { counter-reset: step; list-style: none; padding: 0; }
ol.steps li { counter-increment: step; position: relative; padding-left: 22px; margin-bottom: 4px; }
ol.steps li::before { content: counter(step); position: absolute; left: 0; top: 0; width: 15px; height: 15px; background: #7C3AED; color: #fff; border-radius: 50%; font-size: 7.5pt; font-weight: 700; text-align: center; line-height: 15px; }
@media print { .page { page-break-after: always; } figure.screenshot { break-inside: avoid; } }
"""

cover = f"""
<div class="cover-page">
  {topbar()}
  <div class="cover-rule"></div>
  <div class="cover-logo-wrap">
    {rizviz_logo()}
    <div class="logo-underline"></div>
  </div>
  <div class="cover-title-rule">
    <h1>Rizviz ERP — Administrator Manual</h1>
  </div>
  <p class="cover-meta">Prepared by: Rizviz International Impex<br/><em>Version 1.0 &nbsp; | &nbsp; June 2026</em><br/>Confidential — Internal Use Only</p>
  <div class="page-footer" style="position:absolute;bottom:12mm;left:16mm;right:16mm;border:none;">
    <span>© 2026 Rizviz. All rights reserved.</span><span>Page 1 of {TOTAL}</span>
  </div>
</div>"""

parts = [f"<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'/><title>Rizviz ERP — Administrator Manual</title><style>{CSS}</style></head><body><div class='manual'>", cover]

for i, body in enumerate(PAGES, start=2):
    parts.append(f"""
<div class="page">
  <div class="page-header"><span>RIZVIZ INTERNATIONAL IMPEX</span><span>RIZVIZ INTERNATIONAL IMPEX</span></div>
  <div class="page-body">{body}</div>
  <div class="page-footer"><span>© 2026 Rizviz. All rights reserved.</span><span>Page {i} of {TOTAL}</span></div>
</div>""")

parts.append("</div></body></html>")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("".join(parts))

print(f"Generated {OUT} — {TOTAL} pages, {len([x for x in PAGES if 'fig(' in x or 'screenshot' in x])} pages with figures")
