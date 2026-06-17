Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Window {
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

$chrome = Get-Process chrome -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  Select-Object -First 1

if (-not $chrome) {
  throw "Could not find a visible Chrome window."
}

[void][Win32Window]::ShowWindow($chrome.MainWindowHandle, 3)
[void][Win32Window]::SetForegroundWindow($chrome.MainWindowHandle)
Start-Sleep -Milliseconds 500
[System.Windows.Forms.SendKeys]::SendWait("^{2}")
Start-Sleep -Milliseconds 900

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)

# Capture the Chrome content area only: full ERP viewport, excluding browser chrome and taskbar.
$cropX = 0
$cropY = 109
$cropWidth = $bounds.Width
$cropHeight = [Math]::Min(907, $bounds.Height - $cropY - 1)
$crop = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropWidth, $cropHeight
$cropped = $bitmap.Clone($crop, $bitmap.PixelFormat)

$out = Join-Path (Get-Location) "docs\admin-manual\images\dashboard-full-current.png"
$cropped.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)

$cropped.Dispose()
$graphics.Dispose()
$bitmap.Dispose()

Write-Host "Saved $out"
