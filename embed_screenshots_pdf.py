"""
embed_screenshots_pdf.py
Embeds the 4 pre-saved dashboard screenshots into Rizviz_ERP_Admin_Manual.pdf
at their correct sections, replacing the placeholder text areas.

Expected screenshot files in the same folder as the PDF:
  ss_dashboard.png  → Page 6  (Section 3 – Management Dashboard)
  ss_hr.png         → Page 9  (Section 4 – HR & Employees)
  ss_payroll.png    → Page 11 (Section 5 – Payroll Processing)  
  ss_assets.png     → Page 12 (Section 6 – Asset Register)
"""

import os
import sys
import shutil
import fitz   # PyMuPDF
from PIL import Image

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE = r"F:\Users\Qamer Hassan\RizvizERP"
PDF_IN  = os.path.join(BASE, "Rizviz_ERP_Admin_Manual.pdf")
PDF_OUT = os.path.join(BASE, "Rizviz_ERP_Admin_Manual.pdf")  # overwrite

# ── Pages to embed (0-indexed page number, screenshot file, figure label) ─────
EMBED_MAP = [
    {
        "pdf_page": 5,               # Page 6 – Section 3 Management Dashboard
        "img_file": "ss_dashboard.png",
        "label":    "Figure 2 – Management Dashboard – Interview Statistics and Enterprise KPI Cards",
        "clear_from_y": 130,         # y-pt where body content starts (below heading)
    },
    {
        "pdf_page": 8,               # Page 9 – Section 4 HR & Employees
        "img_file": "ss_hr.png",
        "label":    "Figure 6 – Employee Directory – Summary Cards and Data Table",
        "clear_from_y": 130,
    },
    {
        "pdf_page": 10,              # Page 11 – Section 5 Payroll Processing
        "img_file": "ss_payroll.png",
        "label":    "Figure 7 – Payroll Processing – Summary Cards, Period Selectors, and Payroll Table",
        "clear_from_y": 130,
    },
    {
        "pdf_page": 11,              # Page 12 – Section 6 Asset Register
        "img_file": "ss_assets.png",
        "label":    "Figure 9 – Asset Inventory Register – Stat Cards and Asset Table",
        "clear_from_y": 130,
    },
]

MARGIN_X      = 42   # left/right margin in pt
FOOTER_H      = 55   # height reserved for footer at bottom
LABEL_FONT_SZ = 9    # caption font size
LABEL_COLOR   = (0.25, 0.25, 0.55)   # dark-indigo (matches PDF corporate blue)


def embed_images(doc: fitz.Document):
    for entry in EMBED_MAP:
        img_path = os.path.join(BASE, entry["img_file"])

        if not os.path.exists(img_path):
            print(f"  [MISSING]  {img_path}  → skipping page {entry['pdf_page']+1}")
            continue

        page     = doc[entry["pdf_page"]]
        pw       = page.rect.width    # A4 = 595.28 pt
        ph       = page.rect.height   # A4 = 841.89 pt
        clear_y  = entry["clear_from_y"]

        # 1. White-out the body area (keep header & footer intact)
        body_rect = fitz.Rect(MARGIN_X - 4, clear_y - 4,
                               pw - MARGIN_X + 4, ph - FOOTER_H)
        page.draw_rect(body_rect, color=(1, 1, 1), fill=(1, 1, 1))

        # 2. Compute image rect (maintain aspect ratio, fill body area)
        caption_h = LABEL_FONT_SZ + 8   # space for caption below image
        avail_w   = pw - 2 * MARGIN_X
        avail_h   = ph - clear_y - FOOTER_H - caption_h - 8

        with Image.open(img_path) as im:
            src_w, src_h = im.size

        ratio = src_w / src_h
        img_w = avail_w
        img_h = img_w / ratio
        if img_h > avail_h:
            img_h = avail_h
            img_w = img_h * ratio

        # Centre horizontally
        x0 = (pw - img_w) / 2
        y0 = clear_y + 4
        img_rect = fitz.Rect(x0, y0, x0 + img_w, y0 + img_h)

        # 3. Draw a thin border around the image
        page.draw_rect(img_rect, color=(0.75, 0.75, 0.85), width=0.75)

        # 4. Insert the screenshot
        page.insert_image(img_rect, filename=img_path, keep_proportion=True)

        # 5. Insert italic caption below the image
        caption_y = y0 + img_h + 4
        caption_rect = fitz.Rect(MARGIN_X, caption_y, pw - MARGIN_X, caption_y + caption_h + 4)
        page.insert_textbox(
            caption_rect,
            entry["label"],
            fontsize=LABEL_FONT_SZ,
            fontname="helv",
            color=LABEL_COLOR,
            align=1,   # centred
        )

        print(f"  [OK]  Page {entry['pdf_page']+1}  ←  {entry['img_file']}")


def main():
    print(f"Opening: {PDF_IN}")
    if not os.path.exists(PDF_IN):
        sys.exit(f"ERROR: PDF not found at {PDF_IN}")

    doc = fitz.open(PDF_IN)
    print(f"Total pages: {len(doc)}")
    print()

    embed_images(doc)

    print()
    PDF_TMP = PDF_OUT + ".tmp"
    print(f"Saving: {PDF_TMP}")
    doc.save(PDF_TMP, garbage=4, deflate=True)
    doc.close()
    shutil.move(PDF_TMP, PDF_OUT)
    print(f"Done! -> {PDF_OUT}")


if __name__ == "__main__":
    main()
