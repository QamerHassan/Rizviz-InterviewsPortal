"""
capture_and_embed.py
- Uses win32 + PIL to open each ERP page in the default browser, capture a screenshot
- Embeds the screenshots into Rizviz_ERP_Admin_Manual.pdf at the right pages
"""

import subprocess
import time
import os
import fitz  # PyMuPDF
from PIL import ImageGrab, Image
import win32gui
import win32con
import ctypes

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL   = "http://localhost:3000"
OUT_DIR    = r"F:\Users\Qamer Hassan\RizvizERP"
PDF_IN     = os.path.join(OUT_DIR, "Rizviz_ERP_Admin_Manual.pdf")
PDF_OUT    = os.path.join(OUT_DIR, "Rizviz_ERP_Admin_Manual.pdf")   # overwrite in-place

PAGES = [
    {"url": f"{BASE_URL}/dashboard",  "file": "ss_dashboard.png"},
    {"url": f"{BASE_URL}/employees",  "file": "ss_hr.png"},
    {"url": f"{BASE_URL}/payroll",    "file": "ss_payroll.png"},
    {"url": f"{BASE_URL}/inventory",  "file": "ss_assets.png"},
]

# ── Mappings: which PDF page (0-indexed) gets which screenshot ─────────────────
# Page 6 (idx 5)  → Dashboard  (Figure 2 area)
# Page 9 (idx 8)  → HR/Employees (Figure 6 area)
# Page 11 (idx 10) → Payroll (Figure 7 area)
# Page 12 (idx 11) → Asset Register (Figure 9 area)
EMBED_MAP = [
    {"pdf_page": 5,  "img_file": "ss_dashboard.png",  "label": "Management Dashboard"},
    {"pdf_page": 8,  "img_file": "ss_hr.png",         "label": "HR & Employees"},
    {"pdf_page": 10, "img_file": "ss_payroll.png",     "label": "Payroll Processing"},
    {"pdf_page": 11, "img_file": "ss_assets.png",      "label": "Asset Register"},
]

# ── Step 1: Open browser + capture ────────────────────────────────────────────
def maximize_browser_window():
    """Try to find and maximise the foreground browser window."""
    time.sleep(0.5)
    hwnd = win32gui.GetForegroundWindow()
    if hwnd:
        win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)
        time.sleep(0.8)

def capture_page(url: str, out_path: str, wait_sec: int = 6):
    print(f"  Opening: {url}")
    # Open in default browser
    os.startfile(url)
    time.sleep(wait_sec)
    maximize_browser_window()
    time.sleep(1)

    # Full virtual screen dimensions (handles multi-monitor)
    SM_XVIRTUALSCREEN = 76
    SM_YVIRTUALSCREEN = 77
    SM_CXVIRTUALSCREEN = 78
    SM_CYVIRTUALSCREEN = 79
    x  = ctypes.windll.user32.GetSystemMetrics(SM_XVIRTUALSCREEN)
    y  = ctypes.windll.user32.GetSystemMetrics(SM_YVIRTUALSCREEN)
    cx = ctypes.windll.user32.GetSystemMetrics(SM_CXVIRTUALSCREEN)
    cy = ctypes.windll.user32.GetSystemMetrics(SM_CYVIRTUALSCREEN)

    img = ImageGrab.grab(bbox=(x, y, x + cx, y + cy), all_screens=True)
    img.save(out_path)
    print(f"  Saved  : {out_path}  ({img.size[0]}x{img.size[1]})")
    return out_path

def capture_all():
    print("=== Step 1: Capturing screenshots ===")
    for p in PAGES:
        out = os.path.join(OUT_DIR, p["file"])
        if os.path.exists(out):
            print(f"  Already exists, skipping: {out}")
            continue
        capture_page(p["url"], out)
    print()

# ── Step 2: Embed into PDF ─────────────────────────────────────────────────────
def embed_images():
    print("=== Step 2: Embedding screenshots into PDF ===")
    doc = fitz.open(PDF_IN)

    for entry in EMBED_MAP:
        img_path = os.path.join(OUT_DIR, entry["img_file"])
        if not os.path.exists(img_path):
            print(f"  [SKIP] Missing: {img_path}")
            continue

        page_idx = entry["pdf_page"]
        page = doc[page_idx]
        pw = page.rect.width   # typically 595 pt (A4)
        ph = page.rect.height  # typically 842 pt

        # Margins
        MARGIN_X = 42   # ~1.5 cm
        MARGIN_TOP = 120  # below header
        MARGIN_BOTTOM = 60  # above footer

        img_w = pw - 2 * MARGIN_X
        img_h = ph - MARGIN_TOP - MARGIN_BOTTOM

        # Keep aspect ratio
        with Image.open(img_path) as im:
            src_w, src_h = im.size
        ratio = src_w / src_h
        if img_w / img_h > ratio:
            img_w = img_h * ratio
        else:
            img_h = img_w / ratio

        # Centre horizontally
        x0 = (pw - img_w) / 2
        y0 = MARGIN_TOP
        rect = fitz.Rect(x0, y0, x0 + img_w, y0 + img_h)

        # Clear existing content on this page (redact the body area)
        # We draw a white rectangle over the body first to replace text
        body_rect = fitz.Rect(MARGIN_X - 5, MARGIN_TOP - 10, pw - MARGIN_X + 5, ph - MARGIN_BOTTOM)
        page.draw_rect(body_rect, color=(1, 1, 1), fill=(1, 1, 1))

        # Insert screenshot
        page.insert_image(rect, filename=img_path)

        print(f"  [OK]  Page {page_idx+1} ← {entry['img_file']}  rect={rect}")

    doc.save(PDF_OUT, garbage=4, deflate=True)
    doc.close()
    print(f"\n=== Done! Saved to: {PDF_OUT} ===")

if __name__ == "__main__":
    capture_all()
    embed_images()
