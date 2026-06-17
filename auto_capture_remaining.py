"""
auto_capture_remaining.py
Opens remaining ERP URLs in the default browser and captures full-screen screenshots.
"""

import os, time, ctypes, sys
import win32gui, win32con
from PIL import ImageGrab

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE     = r"F:\Users\Qamer Hassan\RizvizERP"
BASE_URL = "http://localhost:3000"

PAGES = [
    ("projects",    f"{BASE_URL}/projects"),
    ("recruitment", f"{BASE_URL}/recruitment"),
    ("interviews",  f"{BASE_URL}/interviews"),
    ("calendar",    f"{BASE_URL}/interviews/calendar"),
    ("feedback",    f"{BASE_URL}/interviews/feedback"),
    ("leads",       f"{BASE_URL}/leads"),
    ("reports",     f"{BASE_URL}/reports"),
    ("audit",       f"{BASE_URL}/audit-logs"),
]

def get_virtual_screen():
    SM_XVIRTUALSCREEN  = 76
    SM_YVIRTUALSCREEN  = 77
    SM_CXVIRTUALSCREEN = 78
    SM_CYVIRTUALSCREEN = 79
    x  = ctypes.windll.user32.GetSystemMetrics(SM_XVIRTUALSCREEN)
    y  = ctypes.windll.user32.GetSystemMetrics(SM_YVIRTUALSCREEN)
    cx = ctypes.windll.user32.GetSystemMetrics(SM_CXVIRTUALSCREEN)
    cy = ctypes.windll.user32.GetSystemMetrics(SM_CYVIRTUALSCREEN)
    return (x, y, x + cx, y + cy)

def maximize_foreground(retries=6, delay=0.5):
    for _ in range(retries):
        time.sleep(delay)
        hwnd = win32gui.GetForegroundWindow()
        if hwnd:
            win32gui.ShowWindow(hwnd, win32con.SW_MAXIMIZE)
            return

for name, url in PAGES:
    out = os.path.join(BASE, f"ss_{name}.png")
    if os.path.exists(out):
        print(f"[SKIP] Already exists: ss_{name}.png")
        continue
    print(f"Capturing {name}: {url}")
    os.startfile(url)
    time.sleep(8)
    maximize_foreground()
    time.sleep(1.5)
    bbox = get_virtual_screen()
    img = ImageGrab.grab(bbox=bbox, all_screens=True)
    img.save(out)
    print(f"  Saved: ss_{name}.png  ({img.width}x{img.height})")
    time.sleep(1)

print("All remaining screenshots done!")
