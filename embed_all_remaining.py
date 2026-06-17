import fitz
import os
import shutil

BASE = r'F:\Users\Qamer Hassan\RizvizERP'
PDF_IN  = os.path.join(BASE, 'Rizviz_ERP_Admin_Manual_Updated.pdf')
if not os.path.exists(PDF_IN):
    # Fallback to the original if the updated one is missing
    PDF_IN = os.path.join(BASE, 'Rizviz_ERP_Admin_Manual.pdf')
    
PDF_OUT = os.path.join(BASE, 'Rizviz_ERP_Admin_Manual_Final.pdf')

doc = fitz.open(PDF_IN)
print('Opened PDF:', PDF_IN)

EMBED_MAP = [
    # 0-indexed page numbers
    {'pdf_page': 13, 'img_file': 'ss_projects.png',    'label': 'Figure 11 \u2013 Project Resource Allocations', 'clear_from_y': 130},
    {'pdf_page': 14, 'img_file': 'ss_recruitment.png', 'label': 'Figure 12 \u2013 Recruitment \u2013 Internal Openings', 'clear_from_y': 130},
    {'pdf_page': 15, 'img_file': 'ss_interviews.png',  'label': 'Figure 13 \u2013 Interviews Module \u2013 Main Dashboard', 'clear_from_y': 130},
    {'pdf_page': 19, 'img_file': 'ss_calendar.png',    'label': 'Figure 18 \u2013 Interview Calendar', 'clear_from_y': 130},
    {'pdf_page': 20, 'img_file': 'ss_feedback.png',    'label': 'Figure 19 \u2013 AI Feedback Module', 'clear_from_y': 130},
    {'pdf_page': 21, 'img_file': 'ss_leads.png',       'label': 'Figure 22 \u2013 Leads Management', 'clear_from_y': 130},
    {'pdf_page': 24, 'img_file': 'ss_reports.png',     'label': 'Figure 27 \u2013 Reports Center', 'clear_from_y': 130},
    {'pdf_page': 25, 'img_file': 'ss_audit.png',       'label': 'Figure 28 \u2013 Security Audit Registry', 'clear_from_y': 130},
]

MARGIN_X = 42
FOOTER_H = 55
LABEL_FONT_SZ = 9
LABEL_COLOR = (0.25, 0.25, 0.55)

for entry in EMBED_MAP:
    img_path = os.path.join(BASE, entry['img_file'])
    if not os.path.exists(img_path):
        print(f"Skipping {img_path}, not found.")
        continue
        
    page = doc[entry['pdf_page']]
    pw = page.rect.width
    ph = page.rect.height
    clear_y = entry['clear_from_y']
    
    body_rect = fitz.Rect(MARGIN_X - 4, clear_y - 4, pw - MARGIN_X + 4, ph - FOOTER_H)
    page.draw_rect(body_rect, color=(1, 1, 1), fill=(1, 1, 1))
    
    import PIL.Image as Image
    with Image.open(img_path) as im:
        src_w, src_h = im.size
    
    avail_w = pw - 2 * MARGIN_X
    avail_h = ph - clear_y - FOOTER_H - (LABEL_FONT_SZ + 8) - 8
    
    ratio = src_w / src_h
    img_w = avail_w
    img_h = img_w / ratio
    if img_h > avail_h:
        img_h = avail_h
        img_w = img_h * ratio
        
    x0 = (pw - img_w) / 2
    y0 = clear_y + 4
    img_rect = fitz.Rect(x0, y0, x0 + img_w, y0 + img_h)
    
    page.draw_rect(img_rect, color=(0.75, 0.75, 0.85), width=0.75)
    page.insert_image(img_rect, filename=img_path, keep_proportion=True)
    
    caption_y = y0 + img_h + 4
    caption_rect = fitz.Rect(MARGIN_X, caption_y, pw - MARGIN_X, caption_y + LABEL_FONT_SZ + 8 + 4)
    page.insert_textbox(caption_rect, entry['label'], fontsize=LABEL_FONT_SZ, fontname='helv', color=LABEL_COLOR, align=1)
    
    print(f"Embedded {img_path} on page {entry['pdf_page']+1}")

try:
    doc.save(PDF_OUT, garbage=4, deflate=True)
    print(f'Saved to {PDF_OUT}')
    
    doc.close()
    
    # Try to copy back to Rizviz_ERP_Admin_Manual_Updated.pdf
    try:
        shutil.copy2(PDF_OUT, PDF_IN)
        print(f'Successfully replaced {PDF_IN}')
    except Exception as e:
        print(f'Could not replace {PDF_IN} (likely open in another program).')
except Exception as e:
    print(f'Save failed: {e}')
