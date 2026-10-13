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
    ["Frontend URL", "Local: <code>http://localhost:3000</code><br/>Production (Vercel): <code>https://rizviz-interviews-portal.vercel.app</code>"],
    ["Backend API", "Local: <code>http://localhost:5000</code><br/>Production (Railway): <code>https://rizviz-interviewsportal-production.up.railway.app</code>"],
    ["Interview Excel", "Local: <code>Interview Software.xlsx</code><br/>Production: <code>last_uploaded_excel.xlsx</code> (synced automatically via watcher/upload)"],
    ["Database", "SQL Server UAT or Production Database as configured on Railway"],
    ["Credentials", "Valid Admin credentials (e.g. Username: <code>Rizviz</code>, Password: <code>5121472</code>)"],
]) + """
<h3>Intended Audience</h3>
<p>This manual is intended for <strong>System Administrators</strong> and <strong>Admin-role users</strong> who require full access to all ERP modules and enterprise-wide data.</p>
""")

PAGES.append("""
<h2>2. Login Module</h2>
<p>The Login Module is the entry point to Rizviz ERP. It ensures that only authorized users can access the platform by verifying identity through company selection, branch selection, username, and password.</p>
<p><strong>URL:</strong> <code>localhost:3000/login</code> or <code>rizviz-interviews-portal.vercel.app/login</code></p>""" + warn("All four fields on the login screen are mandatory. Leaving any field empty will prevent login.") + """
<h3>Login Screen Overview</h3>
<p>When you navigate to the ERP login URL, the Account Login screen is displayed:</p>
""" + fig(1, "Rizviz ERP Login Page (Account Login Form)", "updatedlogin.png") + """
<p>Below the screenshot, the login page consists of:</p>""" + ul([
    "<strong>Header</strong> — \"Account Login\" title in bold dark blue",
    "<strong>Company dropdown</strong> — Select legal entity (e.g. Rizviz International Impex)",
    "<strong>Branch dropdown</strong> — Enabled after company selection (e.g. Lahore Tech Branch)",
    "<strong>Username field</strong> — Person icon; enter assigned username",
    "<strong>Password field</strong> — Lock icon; eye icon toggles visibility",
    "<strong>Sign In to Platform</strong> — Purple submit button",
    "<strong>Footer</strong> — \"© 2026 Rizviz Int. Impex. All rights reserved.\"",
])
)

PAGES.append("""
<h3>Login Form — Field Reference</h3>""" + tbl(["Field Name", "Status", "Description"], [
    ["Company", "Required", "Legal entity (e.g. Rizviz International Impex)"],
    ["Branch", "Required", "Branch office assigned to the user"],
    ["Username", "Required", "Assigned ERP login name"],
    ["Password", "Required", "Secret password; masked with dots (●) by default"],
]) + """
<h3>Step-by-Step Login Instructions</h3>""" + steps([
    "Open the ERP URL in your browser: <code>localhost:3000/login</code> or the production portal URL.",
    "Select <strong>Company</strong> — Rizviz International Impex.",
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

# ─── 2.1 WORKSPACE INITIALIZATION ───
PAGES.append("""
<h2>2.1 Workspace Initialization</h2>
<p>Upon successful login, if the platform does not yet contain active interview data or the system session requires onboarding, the administrator is presented with the <strong>Initialize Workspace</strong> screen. This interface forces data loading and schema checks to prepare the ERP system for use.</p>
<p><strong>URL:</strong> <code>localhost:3000/dashboard</code> (Uninitialized state) or <code>rizviz-interviews-portal.vercel.app/dashboard</code></p>
""" + fig(2, "Initialize Workspace Screen (Pending Excel Upload)", "AfterLogin.png") + """
<p>Below the screenshot, the initialization page consists of:</p>""" + ul([
    "<strong>Title Notice</strong> — \"Initialize Workspace\" message informing that no data will be loaded until the spreadsheet is uploaded.",
    "<strong>File Drag & Drop Box</strong> — Large container where users can click or drag their spreadsheet file to upload.",
    "<strong>Required Columns Checklist</strong> — Display of mandatory columns (<code>SR.NO</code> and <code>IntervieweeName</code>).",
    "<strong>Validation Indicators</strong> — Live green checklist showing sequence and candidate name correctness.",
    "<strong>Header</strong> — Displays the selected company (\"Rizviz International Impex\") and active administrator details (\"Rizviz Admin\").",
    "<strong>Navigation Sidebar</strong> — Links to Dashboard, Calendar, Interviews, AI Feedback, and Candidates modules.",
]) + """
<h3>Column Mapping Requirements</h3>""" + tbl(["Column", "Status", "Description / Purpose"], [
    ["SR.NO", "Required", "For sequence ordering of interview entries"],
    ["IntervieweeName", "Required", "Full name of the candidate/interviewee"],
]) + note("Make sure to save the spreadsheet as a .xlsx or .csv file and ensure all mandatory columns are filled before uploading.")
)

# ─── 3 DASHBOARD ───
PAGES.append("""
<h2>3. Management Dashboard</h2>
<p>Once the workspace is initialized by uploading the recruitment spreadsheet (or when logging in with an already-initialized session), the <strong>Management Dashboard</strong> opens automatically. It provides a real-time consolidated view of recruitment activity, lead generation, and interview pipelines.</p>
<p><strong>URL:</strong> <code>localhost:3000/dashboard</code> or <code>rizviz-interviews-portal.vercel.app/dashboard</code></p>
<h3>Dashboard — Live Recruitment Pipeline Overview</h3>
""" + fig(3, "Management Dashboard — Live Recruitment Pipeline Overview", "dashboard.png") + """
<p>Below the screenshot, the dashboard provides a high-level summary divided into key sections:</p>""" + ul([
    "<strong>Header</strong> — Displays selected company, the \"Upload Excel\" action button, notification icon, and logged-in administrator details.",
    "<strong>Top-Level Metrics</strong> — Summary cards for \"LEADS\" and \"INTERVIEWS\" showing total counts.",
    "<strong>Live Timezones</strong> — Real-time clock widgets showing CST, EST, PKT, and Pakistan Local time.",
    "<strong>Interview Status Cards</strong> — Visual counters for candidates by status, including \"PASSED\" and \"REJECTED\". Clicking a card filters the candidate list.",
]) + """
<h3>Main Dashboard Metrics</h3>""" + tbl(["Card / Widget", "Value", "Description"], [
    ["LEADS", "39", "Total leads compiled from synchronization"],
    ["INTERVIEWS", "40", "Total scheduled/recorded interviews"],
    ["PASSED", "39", "Candidates who successfully cleared the interviews"],
    ["REJECTED", "1", "Candidates marked as rejected"],
])
)

PAGES.append("""
<h3>Leads &amp; Interviews Analytics</h3>
<p>The bottom section of the dashboard displays detailed charts and visual trends based on the imported database:</p>""" + ul([
    "<strong>Status Comparison</strong> — Bar chart visualizing candidates across different stages (Converted, Rejected, Dropped, Closed, Dead).",
    "<strong>Monthly Trend</strong> — Line chart tracing Leads (blue/green) and Interviews (orange) volume growth from January through June.",
    "<strong>Total Volume Share</strong> — Donut chart highlighting the breakdown of the total 79 items (39 Leads and 40 Interviews) to show relative weight.",
]) + """
<h3>Dashboard — Dark Mode View</h3>
<p>Toggle between Light and Dark mode using the sidebar switch. Dark mode styles the entire interface with a sleek, dark color scheme to optimize visibility in low-light environments while preserving chart clarity.</p>
""" + note("Administrators can click any status card or chart data point to deep-dive into the filtered lists of candidates and interviews.")
)

# ─── 3.1 INTERVIEW CALENDAR ───
PAGES.append("""
<h2>3.1 Interview Calendar Module</h2>
<p>The Interview Calendar plots all interview events on a month-by-month grid, allowing administrators to visually track scheduled, completed, and upcoming interviews.</p>
<p><strong>URL:</strong> <code>localhost:3000/interviews/calendar</code> or <code>rizviz-interviews-portal.vercel.app/interviews/calendar</code></p>
<h3>Calendar View — Full Month Grid (Top Section)</h3>
""" + fig(4, "Interview Calendar — June 2026 Full Month Grid (Top)", "Calendar1.png") + """
<p>The main calendar view shows the full month of <strong>June 2026</strong> in a standard week grid (SUN–SAT). Key elements include:</p>""" + ul([
    "<strong>Back to Interviews</strong> — Link at top to return to the Interviews table.",
    "<strong>Month Navigation</strong> — &laquo; June 2026 &raquo; arrows to move between months.",
    "<strong>Busiest (Jun 2026)</strong> — Button that highlights the month with the highest interview volume.",
    "<strong>Today</strong> — Button to jump to the current date (highlighted with a blue circle, e.g. 23rd).",
    "<strong>Sync</strong> — Button to refresh calendar data from the database.",
    "<strong>Event Chips</strong> — Each chip shows the candidate initials, company name, and time (e.g. <em>HT &middot; 1st &middot; Occa... &middot; 12:00 PM</em>).",
]) + """
<h3>Calendar Color Coding — Gray vs Colored Events</h3>""" + tbl(["Event Chip Color", "Status", "Meaning"], [
    ["Gray (Disabled / Muted)", "Done / Happened", "Interviews that have already been conducted or completed appear in gray, indicating they are past events."],
    ["Colored (Purple / Blue / Green / Orange)", "Upcoming / Scheduled", "Interviews that are scheduled and will happen in the future appear in their respective status colors."],
]) + note("Gray chips = past interviews (already happened). Colored chips = future interviews (will happen). Use this to quickly distinguish upcoming work from completed interviews.")
)

PAGES.append("""
<h3>Calendar View — Bottom Section &amp; No Date on File</h3>
""" + fig(5, "Interview Calendar — Bottom Grid and Unscheduled Interviews", "Calendar2.png") + """
<p>The bottom portion of the calendar continues the monthly grid and includes a special <strong>\"No date on file\"</strong> section:</p>""" + ul([
    "<strong>Continued Grid</strong> — Weeks 2–5 of June showing events on dates 7–30.",
    "<strong>Colored event on Thu 11</strong> — A green-colored chip (<em>LS &middot; Land &middot; Polaris &middot; 12:00 PM</em>) indicates an upcoming scheduled interview.",
    "<strong>Gray events on Mon 15, Tue 16, Wed 17</strong> — Muted chips for companies like GIT, DXC, W3 Gl..., Execu..., Frago... indicate completed/past interviews.",
    "<strong>No date on file (28)</strong> — A footer section listing 28 interview records that have no Job Start / Interview / Close date assigned.",
    "<strong>Company Badges</strong> — Color-coded company initials (e.g. <em>NO DEMO, Trident Care, Eleven 09, Nelson Frank, Top Tech, Excusys, Inovalon, Denali, Abbott, TCS, 89 Solutions, RTX</em>, etc.) showing which candidates lack scheduling data.",
]) + note("Interviews listed under 'No date on file' need a Job Start Date, Interview Date, or Close Date to appear on the calendar grid. Update these in the Excel sheet or via the edit modal.")
)

PAGES.append("""
<h3>Calendar View — Event Detail Tooltip (Hover)</h3>
""" + fig(6, "Interview Calendar — Candidate Detail Tooltip on Hover", "Calendar3.png") + """
<p>Hovering over any event chip on the calendar reveals a detailed tooltip with the full interview record:</p>""" + tbl(["Field", "Example Value"], [
    ["Candidate", "Shaheer Mehmood"],
    ["Company", "State Of North"],
    ["Job Profile", "Shabbir Abbas Sayed Exe"],
    ["Status", "Passed"],
    ["Type", "Technical"],
    ["Date", "Jun 2, 2026 12:00 AM"],
    ["Job Hunter", "—"],
    ["EST", "12:00 PM"],
    ["PAK (PKT)", "9:00 PM"],
]) + """
<p>The tooltip provides instant access to candidate details without leaving the calendar view. It displays the candidate name, company, job profile, interview status, type, date, and timezone conversions (EST and PKT).</p>
""" + note("Click on an event chip to open the full interview record for editing or status updates.")
)

# ─── 9 INTERVIEWS ───
PAGES.append("""
<h2>4. All Interviews (Stack Wise)</h2>
<p>The Interviews Module displays all interview records synced from the uploaded Excel spreadsheet. Administrators can search, filter, edit, delete, and export interview data. The module is labeled <strong>"All Interviews (Stack Wise)"</strong> in the sidebar navigation.</p>
<p><strong>URL:</strong> <code>localhost:3000/interviews</code> or <code>rizviz-interviews-portal.vercel.app/interviews</code></p>
<h3>Interviews — KPI Cards, Filters, and Table Header</h3>
""" + fig(7, "All Interviews — KPI Cards, Search Filters, and Table (Top)", "Interviewsscreen1.png") + """
<p>The top section of the Interviews page provides a high-level summary and filtering capabilities:</p>""" + ul([
    "<strong>Stack Selector</strong> — Dropdown labeled \"All Stacks\" to filter by interview stack/category.",
    "<strong>View Toggle</strong> — Switch between <strong>Refresh</strong>, <strong>List</strong> (default), <strong>Grid</strong>, and <strong>Upload Excel</strong> views.",
    "<strong>KPI Summary Cards</strong>:",
]) + tbl(["Card", "Value", "Color", "Description"], [
    ["TOTAL INTERVIEWS", "40", "Blue", "Total interview records loaded from the Excel file"],
    ["PASSED", "39", "Green", "Candidates who successfully cleared the interview"],
    ["REJECTED", "1", "Red/Pink", "Candidates marked as rejected"],
]) + """
<h3>Search &amp; Filter Bar</h3>""" + tbl(["Filter", "Description"], [
    ["Search", "Free-text search by name, company, role, or job profile"],
    ["All Companies", "Dropdown to filter by specific company (e.g. Excusys, W3 Global, Fragoman, GIT, DXC, etc.)"],
    ["Any Outcome", "Filter by interview outcome status (Passed, Rejected)"],
    ["All Profiles", "Filter by interview type/profile (Technical, HR, Combined)"],
    ["Date Range (From / To)", "Filter interviews by date range with calendar date pickers"],
    ["Clear Dates", "Button to reset the date range filter"],
]) + """
<h3>Interview Table — Column Headers</h3>""" + tbl(["Column", "Description"], [
    ["SR. NO", "Unique serial number from the Excel sheet — primary sync match key"],
    ["INVOICE TO", "Entity or client interviewed for"],
    ["INTERVIEW DATE", "Scheduled or actual interview date"],
    ["STACK NAME", "Technical stack or category name"],
    ["INTERVIEWER", "Name of the person conducting the interview"],
    ["INTERVIEWEE", "Name of the candidate being interviewed"],
    ["JOB HUNTER", "Recruiter or job hunter who sourced the candidate"],
    ["COMPANY", "Target client/company name (e.g. Excusys, W3 Global, Fragoman, GIT)"],
    ["INTERVIEW TYPE", "Type of interview: Technical, HR, Combined, etc."],
    ["STATUS", "Color-coded badge: <strong>Passed</strong> (green) or <strong>Rejected</strong> (red)"],
    ["ACTION", "Row actions: History (clock icon), Edit (pencil icon), Delete (trash icon)"],
])
)

PAGES.append("""
<h3>Interviews Table — Data Rows (Middle Section)</h3>
""" + fig(8, "All Interviews — Table Data Rows with Status Badges", "Interviewsscreen2.png") + """
<p>The table lists all interview records with the following sample data visible:</p>""" + tbl(["SR. NO", "Interviewer", "Interviewee", "Company", "Status"], [
    ["6553", "Sukaina...", "Amna Jamil", "Excusys", "Passed"],
    ["6683", "Urooj Bak...", "Zunaira Bhatti", "W3 Global", "Passed"],
    ["6708", "Isra Gaza...", "Amna Jamil", "Fragoman", "Passed"],
    ["6681", "Feryal Na...", "Ammara Lia...", "GIT", "Passed"],
    ["6726", "Syed Hus...", "Abdul Razzaq", "DXC", "Passed"],
    ["6725", "Shabbir...", "Shaheer Me...", "State Of...", "Passed"],
    ["6499", "Syeda Fa...", "Sadaf Khurr...", "ITCON", "Passed"],
    ["6365", "Sarmad S...", "Hashir Tariq", "Occam's...", "Passed"],
    ["6380", "Anna Zaidi", "Laiba Saeed", "Polaris", "Passed"],
    ["6497", "Noor Jafr...", "Sadaf Khurr...", "Denali", "Passed"],
    ["6500", "Syed A. R...", "Fawaz Baig", "K2 firm/E...", "Passed"],
]) + """
<h3>Row Action Icons</h3>""" + tbl(["Icon", "Function"], [
    ["Clock (History)", "View the full change log for this interview record — shows all sync history, reschedules, cancellations, and data changes"],
    ["Pencil (Edit)", "Open the edit modal to modify interview details such as date, status, interviewer, company, and notes"],
    ["Trash (Delete)", "Delete the interview record permanently (requires confirmation)"],
]) + note("Each row displays a color-coded status badge. Green = Passed, Red = Rejected. All interview types shown are 'Technical' in this dataset.")
)

PAGES.append("""
<h3>Interviews Table — Bottom Section &amp; Pagination</h3>
""" + fig(9, "All Interviews — Bottom Rows, Rejected Status, and Pagination", "interviewsscreen3.png") + """
<p>The bottom section of the interviews table continues displaying records and includes the pagination controls:</p>""" + ul([
    "<strong>Continued Rows</strong> — Rows from SR 6380 through SR 6354, showing candidates from companies like Polaris, Denali, K2 firm, SAP, NO DEMO, Trident C..., Eleven 09, Nelson Fr..., Top Tech, Excusys, Inovalon, and Denali.",
    "<strong>Rejected Row (Highlighted)</strong> — SR 6035 for candidate Hammad Kh... at company <strong>NO DEMO</strong> shows a red <strong>Rejected</strong> badge, visually distinguished from the green Passed badges.",
    "<strong>Horizontal Scrollbar</strong> — Appears at the bottom to scroll through all table columns when the viewport is narrow.",
]) + """
<h3>Pagination Controls</h3>""" + tbl(["Element", "Description"], [
    ["Row Count", "Displays \"1-20 of 40 rows\" showing the current page range and total record count"],
    ["Page Navigation", "Previous (&lt;) and Next (&gt;) arrows to navigate between pages"],
    ["Page Numbers", "Clickable page indicators (1, 2) for direct page access"],
    ["Rows Per Page", "Dropdown to change display density: 20 / page (default), configurable to 10, 50, or 100"],
]) + note("The pagination shows 40 total rows across 2 pages. Adjust the rows per page selector to view more records at once.")
)

# ─── 10 EXCEL SYNC ───
PAGES.append("""
<h2>5. Excel Sync — Interview Data Synchronization</h2>
<p>All interview data in the system is sourced from an Excel spreadsheet. The platform supports two methods for syncing data: <strong>Manual Upload</strong> (via the Upload Excel button) and <strong>Automatic Watcher</strong> (file system monitoring in local development).</p>
<h3>Upload Excel — How It Works</h3>""" + steps([
    "Click the <strong>Upload Excel</strong> button (green button in the header bar or the toolbar).",
    "Select or drag your Excel file (<code>.xlsx</code> or <code>.csv</code>) into the upload area.",
    "The system validates the file for required columns: <code>SR.NO</code> and <code>IntervieweeName</code>.",
    "If validation passes, the data is parsed and compared with the existing database records.",
    "A <strong>Sync Summary</strong> modal appears showing: new rows added, changed rows updated, unchanged rows, and any failed rows.",
    "The interview table automatically refreshes with the latest data.",
]) + """
<h3>Refresh — Local File Sync</h3>""" + steps([
    "Open <strong>Interview Software.xlsx</strong> on your local machine.",
    "Make changes — edit dates, names, statuses, or add new rows.",
    "Save the file with <strong>Ctrl+S</strong>.",
    "In the Interviews module, click the <strong>Refresh</strong> button.",
    "The system reads the updated Excel file, compares it with the database, and syncs changes.",
    "Review the sync summary modal for details on what changed.",
]) + warn("Rows are matched by the <strong>SR.NO</strong> column. Do not change the SR number of existing records unless you intend to create a new entry. Changing SR numbers will cause duplicate records.") + """
<h3>Sync Summary — What Gets Compared</h3>""" + tbl(["Field", "Description"], [
    ["New Rows", "Records in Excel that don't exist in the database (matched by SR.NO)"],
    ["Changed Rows", "Records where one or more fields differ between Excel and database"],
    ["Unchanged Rows", "Records that are identical in both Excel and database"],
    ["Failed Rows", "Records that couldn't be synced due to validation errors or missing data"],
    ["Deleted Rows", "Records present in database but missing from the Excel file"],
]) + """
<h3>Excel File Requirements</h3>""" + tbl(["Requirement", "Details"], [
    ["File Format", "<code>.xlsx</code> (recommended) or <code>.csv</code>"],
    ["Required Columns", "<code>SR.NO</code> (sequence ordering) and <code>IntervieweeName</code> (candidate name)"],
    ["Column Mapping", "The system auto-maps columns by header name. Additional columns (Invoice To, Interview Date, Company, Status, etc.) are mapped automatically if present."],
    ["Max File Size", "Up to 10 MB recommended for optimal performance"],
]) + note("After every sync, the system stores the uploaded file as <code>last_uploaded_excel.xlsx</code> on the server. This ensures continuity even if the original file is moved or renamed.")
)

# ─── 12 AI FEEDBACK ───
PAGES.append("""
<h2>6. AI Feedback Module</h2>
<p>The AI Feedback Module captures, transcribes, and enhances candidate interview feedback using voice-to-text and AI text processing. It enables recruiters to input voice feedback (supporting bilingual Urdu/English speech), transcribe it automatically, and sync it immediately to the database and a Google Spreadsheet ledger.</p>
<p><strong>URL:</strong> <code>localhost:3000/interviews/feedback</code> or <code>rizviz-interviews-portal.vercel.app/interviews/feedback</code></p>
<h3>Interview Feedback — Data Table</h3>
""" + fig(10, "Interview Feedback — Dashboard Data Table", "Interviewfeedback.1png.png") + """
<p>The Interview Feedback dashboard displays all logged feedback entries synced from the Google Sheets ledger:</p>""" + ul([
    "<strong>Add Feedback Button</strong> — Purple button labeled <strong>\"+ Add Feedback\"</strong> opens the AI Feedback entry form modal.",
    "<strong>Filters &amp; Search</strong> — Filters by Interview Stack, Search input (candidate, interviewer, company), and Recommendations dropdown.",
    "<strong>Feedback Table</strong> — Displays key fields for each feedback entry: Sr, Date, Interviewee, Job Hunter, Company, Interview Type, Status, Invoice To, Job Profile, Job Start Date, and Actions.",
]) + """
<h3>Status Badge Color Logic</h3>""" + tbl(["Status", "Badge Color", "Meaning"], [
    ["Converted", "Green", "The candidate successfully cleared all rounds and was hired"],
    ["Date changed", "Grey / Muted", "The interview was rescheduled to a different date"],
    ["Cancelled", "Red", "The scheduled interview was cancelled"],
    ["Rejected", "Red", "The candidate did not pass the interview round"],
    ["Postponed / Dropped", "Orange", "The interview was deferred or candidate was dropped from the process"],
]) + """
<h3>Row Action Buttons</h3>""" + tbl(["Button", "Action / Function"], [
    ["View (Blue link)", "Opens a read-only details modal containing the transcribed text, strengths, weaknesses, and ratings"],
    ["Delete (Red link)", "Permanently deletes the feedback entry from both the database and the synced Google Spreadsheet"],
])
)

PAGES.append("""
<h3>Add Feedback Modal — Voice Input &amp; Interview Selector</h3>
""" + fig(11, "Add Feedback Modal — Interview Selector and Voice Recording Mode", "interviewfeedback2.png") + """
<p>Clicking <strong>\"+ Add Feedback\"</strong> opens a modal overlay allowing recruiters to record or type feedback:</p>""" + ul([
    "<strong>Select Your Interview (Sr. #)</strong> — Dropdown containing pending interviews loaded from the main database (e.g. <em>Sr 4467 — Ramisuns, Sr 4472 — M&amp;T, Sr 4556 — Tekysystem</em>, etc.).",
    "<strong>Voice / Text Tabs</strong> — Toggle input modes. <strong>Voice</strong> allows direct voice recording; <strong>Text</strong> allows typing notes.",
    "<strong>Voice Recording Button</strong> — A large blue microphone button to start and stop audio recording. It supports bilingual Urdu and English speech.",
])
)

PAGES.append("""
<h3>Add Feedback Modal — Automated Information Autofill</h3>
""" + fig(12, "Add Feedback Modal — Automated Data Autofill on Selection", "interviewfeedback3.png") + """
<p>Selecting an interview Sr. # automatically fills in all related record fields to ensure data accuracy and speed up processing:</p>""" + tbl(["Autofilled Field", "Source / Description"], [
    ["Interviewer", "Auto-populated name of the interviewer (e.g., Furqan Saeed)"],
    ["Interview Date", "Auto-populated date of the interview (e.g., 2026-01-28)"],
    ["Interview Type", "Auto-populated interview type (e.g., Technical, HR, Combined)"],
    ["Candidate (Interviewee)", "Auto-populated candidate name (e.g., Hashir Tariq)"],
    ["Company", "Auto-populated target client company (e.g., UC davis)"],
]) + """
<h3>Submitting Feedback</h3>""" + steps([
    "Select the interview Sr. # from the dropdown list.",
    "Record audio using the Voice tab (or type notes in the Text tab).",
    "Review autofilled candidate and interviewer details.",
    "Click <strong>Save Feedback</strong> to finalize.",
    "The system processes audio using AI, saves the record, and triggers synchronization.",
]) + note("Duplicate prevention: The system automatically hides already-logged interview Sr. #s from the dropdown to prevent duplicate feedback entries.")
)

PAGES.append("""
<h2>6.1 Google Sheets Synchronization</h2>
<p>The system integrates directly with a live Google Spreadsheet to maintain a collaborative and real-time backup ledger of all interview feedback. This allows team members without direct ERP access to view and analyze recruitment metrics in Google Workspace.</p>
<h3>Google Sheets Synchronization Ledger</h3>
""" + fig(13, "Interview Feedback Google Sheets Sync Ledger", "interviewfeedbackspreadsheet.png") + """
<p>The Google Sheet matches the ERP database columns precisely and is updated automatically:</p>""" + ul([
    "<strong>Real-time Sync Triggers</strong> — Adding or deleting a feedback record in the ERP immediately sends an API request to update the Google Sheet.",
    "<strong>Bidirectional Consistency</strong> — The row structure in the sheet aligns perfectly with the ERP table, showcasing columns for candidate profile, job hunter, client, status, job dates, and salary figures.",
    "<strong>Collaborative Sharing</strong> — The sheet can be shared securely with senior stakeholders who need real-time summaries of candidate evaluations.",
]) + """
<h3>Google Sheets Ledger Columns</h3>""" + tbl(["Column Name", "ERP Mapping", "Description"], [
    ["Sr.", "SR. NO", "Match key sequence number from Excel sheet"],
    ["Date", "INTERVIEW DATE", "Interview schedule date"],
    ["Interviewee", "CANDIDATE NAME", "Candidate name"],
    ["Job Hunter / Company", "RECRUITER / CLIENT", "Source recruiter and client company details"],
    ["Status", "OUTCOME STATUS", "Synced outcome (Converted, Cancelled, Date changed, etc.)"],
    ["Job Start Date", "START DATE", "Scheduled starting date of candidate"],
    ["JH Suggest / Due", "RECRUITER DETAILS", "Recruitment fee and candidate status tracking details"],
]) + note("Do not delete columns or rename headers in the Google Sheet. This will break the synchronization pipeline between the ERP and Google Workspace.")
)

PAGES.append("""
<h2>6.2 Candidates Directory Module</h2>
<p>The Candidates Directory Module provides an aggregated, candidate-centric view of all recruitment activities. Instead of browsing individual interviews, administrators can search for a specific candidate to see their entire history, including their total count of interviews, leads, companies applied to, and detailed outcome status.</p>
<p><strong>URL:</strong> <code>localhost:3000/candidates</code> or <code>rizviz-interviews-portal.vercel.app/candidates</code></p>
<h3>Candidates Directory Grid View</h3>
""" + fig(14, "Candidates Directory Grid View", "candidatespage.png") + """
<p>The main screen lists all candidates in a responsive card grid layout:</p>""" + ul([
    "<strong>Total Count</strong> — Labeled e.g. \"19 candidates found\" to show the size of the talent pool.",
    "<strong>Search Bar</strong> — Labeled \"Search by name, company, or role...\" for immediate real-time filtering.",
    "<strong>Candidate Cards</strong> — Individual summary cards showing the candidate's initials, name, ratio of interviews/leads, date added, and company tags.",
    "<strong>Outcome Flags</strong> — Rejections are flagged directly on the cards (e.g. \"x 1 Rejected\" on Hammad Khan Dev's card).",
]) + """
<h3>Candidate Card Components</h3>""" + tbl(["Component", "Description"], [
    ["Initials Badge", "Large circular badge (e.g. 'A' for Amna Jamil, 'Z' for Zunaira Bhatti) in category-specific colors."],
    ["Interviews / Leads Ratio", "Shows active participation (e.g., '6/6' indicating 6 interviews conducted for 6 matching leads)."],
    ["Company Badges", "Horizontal tags showing all clients the candidate has interacted with (e.g., Excusys, HCL, Trident Care)."],
    ["Added Date", "Timestamp displaying when the candidate was first introduced to the system (e.g., 'Added Jun 15, 2026')."],
])
)

PAGES.append("""
<h3>Candidate Profile Drawer</h3>
""" + fig(15, "Candidate Profile Drawer (Slide-out Panel)", "candidatespage2.png") + """
<p>Clicking on any candidate card slides out the Candidate Profile Drawer from the right side of the screen:</p>""" + ul([
    "<strong>Aggregated Statistics</strong> — Top cards displaying \"Total Interviews\" and \"Total Leads\" for the selected candidate.",
    "<strong>Interviews by Status</strong> — Chronological breakdown of interviews, grouped by their status (e.g. Scheduled, Completed, Rejected).",
    "<strong>Interactive Entries</strong> — Clicking any individual interview item in the list slides out a secondary details panel.",
])
)

PAGES.append("""
<h3>Interview Details &amp; Feedback Drawer</h3>
""" + fig(16, "Nested Interview Details &amp; Feedback Drawer", "candidatespage3.png") + """
<p>The nested drawer displays the complete metadata of the selected interview session:</p>""" + tbl(["Section", "Details Provided"], [
    ["Round Journey", "Step-by-step progress tracking with candidate status (e.g., Nicolas Javier - Passed)."],
    ["Opportunity Info", "Comprehensive record details: Company name, Job Profile, Candidate Name, Sourcing Job Hunter, Lead Status, and number of rounds."],
    ["This Interview", "Unique Sr # matching key and Job Profile name."],
    ["Feedback Panel", "Shows the AI-enhanced feedback, transcription text, candidate strengths, weaknesses, and ratings (or 'No feedback recorded' if empty)."],
]) + note("Use the Candidates Directory to get a unified timeline of a candidate's journey when they undergo multiple interview rounds with different clients.")
)


# ─── BUILD HTML ───
TOTAL = len(PAGES) + 1  # + cover

CSS = """
@page { size: A4; margin: 18mm 14mm 16mm; }
@page :first { margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 9.3pt; color: #4d4d4d; line-height: 1.3; }
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
.content-body { padding-top: 2mm; }
.section-block { margin-bottom: 10px; }
h2 { font-size: 13pt; font-weight: 800; color: #7c3aed; margin: 12px 0 4px; padding-bottom: 2px; border-bottom: 1px solid #e2e8f0; }
h3 { font-size: 10.2pt; font-weight: 700; color: #005a9c; margin: 8px 0 3px; }
p { margin: 0 0 4px; text-align: justify; }
ul, ol { margin: 0 0 4px; padding-left: 14px; }
li { margin-bottom: 1px; }
code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 8.8pt; }
.note { background: #eee9ff; border-left: 3px solid #7c3aed; padding: 3px 6px; margin: 4px 0; font-size: 8.8pt; color: #111827; page-break-inside: avoid; }
.note.warn { background: #fff3e6; border-left-color: #ee6427; }
figure.screenshot { margin: 4px 0 5px; text-align: center; page-break-inside: avoid; }
figure.screenshot img { max-width: 100%; max-height: 75mm; width: auto; height: auto; border: 1px solid #cbd5e1; border-radius: 3px; }
figcaption { font-size: 7.8pt; font-style: italic; color: #777; margin-top: 2px; }
table.data { width: 100%; border-collapse: collapse; font-size: 8pt; margin: 4px 0 5px; page-break-inside: avoid; }
table.data th, table.data td { border: 1px solid #cbd5e1; padding: 2px 4px; text-align: left; vertical-align: top; }
table.data th { background: #f1f5f9; font-weight: 700; color: #005a9c; }
ol.steps { counter-reset: step; list-style: none; padding: 0; }
ol.steps li { counter-increment: step; position: relative; padding-left: 20px; margin-bottom: 3px; }
ol.steps li::before { content: counter(step); position: absolute; left: 0; top: 0; width: 14px; height: 14px; background: #7C3AED; color: #fff; border-radius: 50%; font-size: 7.2pt; font-weight: 700; text-align: center; line-height: 14px; }
@media print { figure.screenshot, table.data, .note { page-break-inside: avoid; } }
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
  <div style="position:absolute;bottom:12mm;left:16mm;right:16mm;display:flex;justify-content:space-between;font-size:9pt;color:#005a9c;border-top:1px solid #73a3c8;padding-top:2px;">
    <span>© 2026 Rizviz. All rights reserved.</span><span>Page 1</span>
  </div>
</div>"""

body_content = "".join(f"<div class='section-block'>{body}</div>" for body in PAGES)

parts = [
    f"<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'/><title>Rizviz ERP \u2014 Administrator Manual</title><style>{CSS}</style></head><body><div class='manual'>",
    cover,
    f"<div class='content-body'>{body_content}</div>",
    "</div></body></html>"
]

with open(OUT, "w", encoding="utf-8") as f:
    f.write("".join(parts))

print(f"Generated HTML: {OUT}")

# ─── PRINT TO PDF via headless Chrome ───
chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
hdr = ('<div style="font-size:8pt;font-family:Calibri,sans-serif;width:100%;'
       'display:flex;justify-content:space-between;border-bottom:1px solid #ee6427;'
       'padding:0 14mm 3px;color:#ee6427;text-transform:uppercase;">'
       '<span style="font-weight:bold;">Rizviz International Impex</span>'
       '<span>Rizviz ERP \u2014 Administrator Manual</span></div>')
ftr = ('<div style="font-size:8pt;font-family:Calibri,sans-serif;width:100%;'
       'display:flex;justify-content:space-between;border-top:1px solid #cbd5e1;'
       'padding:3px 14mm 0;color:#555;">'
       '<span>\u00a9 2026 Rizviz. All rights reserved. | Confidential \u2014 For Internal Use Only</span>'
       '<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>')

res = subprocess.run([
    chrome, "--headless", "--disable-gpu", "--no-sandbox",
    f"--print-to-pdf={PDF_OUT}",
    "--display-header-footer",
    f"--header-template={hdr}",
    f"--footer-template={ftr}",
    OUT
], capture_output=True, text=True)

if res.returncode == 0 and os.path.exists(PDF_OUT):
    print(f"Generated PDF: {PDF_OUT} ({os.path.getsize(PDF_OUT):,} bytes)")
else:
    print("PDF generation failed:", res.stderr[:300])
