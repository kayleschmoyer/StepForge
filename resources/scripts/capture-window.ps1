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

function Test-RemoteSession {
  $sessionName = [Environment]::GetEnvironmentVariable('SESSIONNAME')
  $clientName = [Environment]::GetEnvironmentVariable('CLIENTNAME')
  return (($sessionName -like 'RDP-*') -or ($clientName -and $clientName -ne 'Console'))
}

function Get-WindowBounds([IntPtr]$Hwnd) {
  $rect = New-Object Win32Capture+RECT
  $hr = [Win32Capture]::DwmGetWindowAttribute($Hwnd, 9, [ref]$rect, [Runtime.InteropServices.Marshal]::SizeOf([type][Win32Capture+RECT]))
  if ($hr -ne 0 -or $rect.Right -le $rect.Left -or $rect.Bottom -le $rect.Top) {
    [void][Win32Capture]::GetWindowRect($Hwnd, [ref]$rect)
  }
  return $rect
}

function Test-BitmapLikelyBlank([System.Drawing.Bitmap]$Bitmap) {
  $sampleStepX = [Math]::Max(1, [Math]::Floor($Bitmap.Width / 24))
  $sampleStepY = [Math]::Max(1, [Math]::Floor($Bitmap.Height / 24))
  $samples = 0
  $nearBlack = 0
  for ($x = 0; $x -lt $Bitmap.Width; $x += $sampleStepX) {
    for ($y = 0; $y -lt $Bitmap.Height; $y += $sampleStepY) {
      $pixel = $Bitmap.GetPixel($x, $y)
      $samples++
      if ($pixel.A -lt 8 -or ($pixel.R -lt 8 -and $pixel.G -lt 8 -and $pixel.B -lt 8)) { $nearBlack++ }
    }
  }
  return $samples -gt 0 -and (($nearBlack / $samples) -gt 0.985)
}

function Copy-VisibleRegion([System.Drawing.Bitmap]$Bitmap, $Rect, [int]$Width, [int]$Height) {
  $graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
  try {
    $graphics.CopyFromScreen($Rect.Left, $Rect.Top, 0, 0, (New-Object System.Drawing.Size $Width, $Height))
  }
  finally {
    $graphics.Dispose()
  }
}

$hwnd = [IntPtr]([Int64]::Parse($Handle))
$rect = Get-WindowBounds $hwnd
$width = [Math]::Max(1, $rect.Right - $rect.Left)
$height = [Math]::Max(1, $rect.Bottom - $rect.Top)
$bitmap = New-Object System.Drawing.Bitmap $width, $height

$captureMethod = 'print-window'
if (Test-RemoteSession) {
  Copy-VisibleRegion $bitmap $rect $width $height
  $captureMethod = 'visible-region-remote'
} else {
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $hdc = $graphics.GetHdc()
  try {
    $printed = [Win32Capture]::PrintWindow($hwnd, $hdc, 2)
  }
  finally {
    $graphics.ReleaseHdc($hdc)
    $graphics.Dispose()
  }
  if (-not $printed) {
    Copy-VisibleRegion $bitmap $rect $width $height
    $captureMethod = 'visible-region-print-failed'
  } elseif (Test-BitmapLikelyBlank $bitmap) {
    Copy-VisibleRegion $bitmap $rect $width $height
    $captureMethod = 'visible-region-blank-fallback'
  }
}

$stream = New-Object System.IO.MemoryStream
$bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

[pscustomobject]@{
  pngBase64 = [Convert]::ToBase64String($stream.ToArray())
  dpiScale = @{ x = 1; y = 1 }
  bounds = @{ x = $rect.Left; y = $rect.Top; width = $width; height = $height }
  captureMethod = $captureMethod
} | ConvertTo-Json -Compress