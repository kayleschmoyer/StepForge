param([Parameter(Mandatory=$true)][string]$Handle)

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32Capture {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, int flags);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out RECT pvAttribute, int cbAttribute);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@

[void][Win32Capture]::SetProcessDPIAware()

function Get-WindowBounds([IntPtr]$Hwnd) {
  $rect = New-Object Win32Capture+RECT
  $hr = [Win32Capture]::DwmGetWindowAttribute($Hwnd, 9, [ref]$rect, [Runtime.InteropServices.Marshal]::SizeOf([type][Win32Capture+RECT]))
  if ($hr -ne 0 -or $rect.Right -le $rect.Left -or $rect.Bottom -le $rect.Top) {
    [void][Win32Capture]::GetWindowRect($Hwnd, [ref]$rect)
  }
  return $rect
}

$hwnd = [IntPtr]([Int64]::Parse($Handle))
$rect = Get-WindowBounds $hwnd
$width = [Math]::Max(1, $rect.Right - $rect.Left)
$height = [Math]::Max(1, $rect.Bottom - $rect.Top)
$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$hdc = $graphics.GetHdc()
$printed = [Win32Capture]::PrintWindow($hwnd, $hdc, 2)
$graphics.ReleaseHdc($hdc)
if (-not $printed) {
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, (New-Object System.Drawing.Size $width, $height))
}
$stream = New-Object System.IO.MemoryStream
$bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

[pscustomobject]@{
  pngBase64 = [Convert]::ToBase64String($stream.ToArray())
  dpiScale = @{ x = 1; y = 1 }
  bounds = @{ x = $rect.Left; y = $rect.Top; width = $width; height = $height }
} | ConvertTo-Json -Compress