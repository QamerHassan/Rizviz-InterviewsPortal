import fitz
import os

BASE = r'F:\Users\Qamer Hassan\RizvizERP'
PDF_IN  = os.path.join(BASE, 'Rizviz_ERP_Admin_Manual.pdf')
PDF_OUT = os.path.join(BASE, 'Rizviz_ERP_Admin_Manual_Updated.pdf')

doc = fitz.open(PDF_IN)
print('Opened PDF.')

EMBED_MAP = [
    {'pdf_page': 5,  'img_file': 'ss_dashboard.png', 'label': 'Figure 2 \u2013 Management Dashboard \u2013 Interview Statistics and Enterprise KPI Cards', 'clear_from_y': 130},
    {'pdf_page': 8,  'img_file': 'ss_hr.png',        'label': 'Figure 6 \u2013 Employee Directory \u2013 Summary Cards and Data Table', 'clear_from_y': 130},
    {'pdf_page': 10, 'img_file': 'ss_payroll.png',   'label': 'Figure 7 \u2013 Payroll Processing \u2013 Summary Cards, Period Selectors, and Payroll Table', 'clear_from_y': 130},
    {'pdf_page': 11, 'img_file': 'ss_assets.png',    'label': 'Figure 9 \u2013 Asset Inventory Register \u2013 Stat Cards and Asset Table', 'clear_from_y': 130},
]

MARGIN_X = 42
FOOTER_H = 55
LABEL_FONT_SZ = 9
LABEL_COLOR = (0.25, 0.25, 0.55)

for entry in EMBED_MAP:
    img_path = os.path.join(BASE, entry['img_file'])
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
    try:
        import shutil
        shutil.copy2(PDF_OUT, PDF_IN)
        print('Successfully replaced original PDF.')
        os.remove(PDF_OUT)
    except Exception as e:
        print(f'Could not replace original (likely open in another program). You can find the updated PDF at: {PDF_OUT}')
except Exception as e:
    print(f'Save failed: {e}')
