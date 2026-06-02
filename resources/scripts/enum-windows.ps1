param(
  [int]$X = [int]::MinValue,
  [int]$Y = [int]::MinValue
)

Add-Type -AssemblyName System.Windows.Forms
try { Add-Type -AssemblyName UIAutomationClient -ErrorAction SilentlyContinue } catch {}

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class Win32WindowProbe {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT point);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hWnd, uint gaFlags);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll", SetLastError=true)] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out RECT pvAttribute, int cbAttribute);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern uint GetDpiForSystem();
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  public struct POINT { public int X; public int Y; }
}
"@

[void][Win32WindowProbe]::SetProcessDPIAware()

function Test-PointInWorkingArea([int]$PointX, [int]$PointY) {
  $point = New-Object System.Drawing.Point($PointX, $PointY)
  $screen = [System.Windows.Forms.Screen]::FromPoint($point)
  $area = $screen.WorkingArea
  return $PointX -ge $area.Left -and $PointX -lt $area.Right -and $PointY -ge $area.Top -and $PointY -lt $area.Bottom
}

function Test-PointInBottomTaskbarBand([int]$PointX, [int]$PointY) {
  $point = New-Object System.Drawing.Point($PointX, $PointY)
  $screen = [System.Windows.Forms.Screen]::FromPoint($point)
  $bounds = $screen.Bounds
  $bandHeight = 56
  $inPhysicalBand = $PointX -ge $bounds.Left -and $PointX -lt $bounds.Right -and $PointY -ge ($bounds.Bottom - $bandHeight) -and $PointY -lt $bounds.Bottom
  $dpiScale = [Math]::Max(1, [Win32WindowProbe]::GetDpiForSystem() / 96.0)
  $logicalLeft = [Math]::Round($bounds.Left / $dpiScale)
  $logicalRight = [Math]::Round($bounds.Right / $dpiScale)
  $logicalBottom = [Math]::Round($bounds.Bottom / $dpiScale)
  $logicalBandHeight = [Math]::Round($bandHeight / $dpiScale)
  $inLogicalBand = $PointX -ge $logicalLeft -and $PointX -lt $logicalRight -and $PointY -ge ($logicalBottom - $logicalBandHeight) -and $PointY -lt $logicalBottom
  return $inPhysicalBand -or $inLogicalBand
}

function Test-PointInShellBar([int]$PointX, [int]$PointY) {
  $script:hitShellBar = $false
  $callback = [Win32WindowProbe+EnumWindowsProc]{
    param([IntPtr]$Hwnd, [IntPtr]$LParam)
    $className = Get-WindowClass $Hwnd
    if (@('Shell_TrayWnd', 'Shell_SecondaryTrayWnd') -contains $className) {
      $rect = New-Object Win32WindowProbe+RECT
      [void][Win32WindowProbe]::GetWindowRect($Hwnd, [ref]$rect)
      if (Test-PointInRect $rect $PointX $PointY) {
        $script:hitShellBar = $true
        return $false
      }
    }
    return $true
  }
  [void][Win32WindowProbe]::EnumWindows($callback, [IntPtr]::Zero)
  return $script:hitShellBar
}

function Get-WindowClass([IntPtr]$Hwnd) {
  $builder = New-Object System.Text.StringBuilder 256
  [void][Win32WindowProbe]::GetClassName($Hwnd, $builder, $builder.Capacity)
  return $builder.ToString()
}

function Get-WindowBounds([IntPtr]$Hwnd) {
  $rect = New-Object Win32WindowProbe+RECT
  $hr = [Win32WindowProbe]::DwmGetWindowAttribute($Hwnd, 9, [ref]$rect, [Runtime.InteropServices.Marshal]::SizeOf([type][Win32WindowProbe+RECT]))
  if ($hr -ne 0 -or $rect.Right -le $rect.Left -or $rect.Bottom -le $rect.Top) {
    [void][Win32WindowProbe]::GetWindowRect($Hwnd, [ref]$rect)
  }
  return $rect
}

function Test-PointInRect($Rect, [int]$PointX, [int]$PointY) {
  return $PointX -ge $Rect.Left -and $PointX -lt $Rect.Right -and $PointY -ge $Rect.Top -and $PointY -lt $Rect.Bottom
}

function Test-CapturableTopLevelWindow([IntPtr]$Hwnd, [int]$PointX, [int]$PointY) {
  if ($Hwnd -eq [IntPtr]::Zero) { return $false }
  if (-not [Win32WindowProbe]::IsWindowVisible($Hwnd)) { return $false }
  if ([Win32WindowProbe]::IsIconic($Hwnd)) { return $false }
  $className = Get-WindowClass $Hwnd
  if (@('Progman', 'WorkerW', 'Shell_TrayWnd', 'Shell_SecondaryTrayWnd', 'Shell_TrayWndClass', 'DV2ControlHost', 'MsgrIMEWindowClass') -contains $className) { return $false }
  $bounds = Get-WindowBounds $Hwnd
  if (($bounds.Right - $bounds.Left) -lt 32 -or ($bounds.Bottom - $bounds.Top) -lt 32) { return $false }
  return Test-PointInRect $bounds $PointX $PointY
}

function Get-FriendlyAppName([string]$ProcessName) {
  switch -Regex ($ProcessName.ToLowerInvariant()) {
    '^chrome\.exe$' { return 'Google Chrome' }
    '^msedge\.exe$' { return 'Microsoft Edge' }
    '^firefox\.exe$' { return 'Mozilla Firefox' }
    '^brave\.exe$' { return 'Brave' }
    '^iexplore\.exe$' { return 'Internet Explorer' }
    '^code\.exe$' { return 'Visual Studio Code' }
    '^explorer\.exe$' { return 'File Explorer' }
    default { return $ProcessName -replace '\.exe$', '' }
  }
}

function Get-PageTitle([string]$WindowTitle, [string]$AppName) {
  if ([string]::IsNullOrWhiteSpace($WindowTitle)) { return '' }
  $title = $WindowTitle.Trim()
  $suffixes = @(' - Google Chrome', ' - Microsoft Edge', ' — Mozilla Firefox', ' - Mozilla Firefox', ' - Brave')
  foreach ($suffix in $suffixes) {
    if ($title.EndsWith($suffix, [StringComparison]::OrdinalIgnoreCase)) {
      return $title.Substring(0, $title.Length - $suffix.Length).Trim()
    }
  }
  if ($AppName -and $title.EndsWith(" - $AppName", [StringComparison]::OrdinalIgnoreCase)) {
    return $title.Substring(0, $title.Length - ($AppName.Length + 3)).Trim()
  }
  return $title
}

function Test-BrowserProcess([string]$ProcessName) {
  return @('chrome.exe', 'msedge.exe', 'firefox.exe', 'brave.exe') -contains $ProcessName.ToLowerInvariant()
}

function Test-LooksLikeUrl([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
  $candidate = $Value.Trim()
  return $candidate -match '^(https?://|file://|[a-z0-9.-]+\.[a-z]{2,})(/|$)'
}

function Get-UrlHost([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  $candidate = $Value.Trim()
  if ($candidate -notmatch '^[a-z]+://') { $candidate = "https://$candidate" }
  try { return ([Uri]$candidate).Host } catch { return '' }
}

function Get-BrowserUrl([IntPtr]$Hwnd, [string]$ProcessName) {
  if (-not (Test-BrowserProcess $ProcessName)) { return '' }
  try {
    $root = [System.Windows.Automation.AutomationElement]::FromHandle($Hwnd)
    if ($null -eq $root) { return '' }
    $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
    $edits = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
    foreach ($edit in $edits) {
      $valuePattern = $null
      if ($edit.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern)) {
        $value = $valuePattern.Current.Value
        if (Test-LooksLikeUrl $value) { return $value.Trim() }
      }
      $name = $edit.Current.Name
      if (Test-LooksLikeUrl $name) { return $name.Trim() }
    }
  } catch {}
  return ''
}

function Find-TopWindowAtPoint([int]$PointX, [int]$PointY) {
  $point = New-Object Win32WindowProbe+POINT
  $point.X = $PointX
  $point.Y = $PointY
  $direct = [Win32WindowProbe]::WindowFromPoint($point)
  if ($direct -ne [IntPtr]::Zero) {
    $root = [Win32WindowProbe]::GetAncestor($direct, 2)
    if ($root -ne [IntPtr]::Zero -and (Test-CapturableTopLevelWindow $root $PointX $PointY)) {
      return $root
    }
    if (Test-CapturableTopLevelWindow $direct $PointX $PointY) {
      return $direct
    }
  }

  $script:foundHandle = [IntPtr]::Zero
  $callback = [Win32WindowProbe+EnumWindowsProc]{
    param([IntPtr]$Hwnd, [IntPtr]$LParam)
    if (Test-CapturableTopLevelWindow $Hwnd $PointX $PointY) {
      $script:foundHandle = $Hwnd
      return $false
    }
    return $true
  }
  [void][Win32WindowProbe]::EnumWindows($callback, [IntPtr]::Zero)
  return $script:foundHandle
}

$handle = [IntPtr]::Zero
if ($X -ne [int]::MinValue -and $Y -ne [int]::MinValue) {
  if ((Test-PointInShellBar $X $Y) -or (Test-PointInBottomTaskbarBand $X $Y) -or -not (Test-PointInWorkingArea $X $Y)) {
    [pscustomobject]@{
      handle = ''
      title = ''
      processName = ''
      processId = 0
      className = ''
      bounds = $null
      ignored = $true
    } | ConvertTo-Json -Compress
    exit 0
  }
  $handle = Find-TopWindowAtPoint $X $Y
  if ($handle -eq [IntPtr]::Zero) {
    [pscustomobject]@{
      handle = ''
      title = ''
      processName = ''
      processId = 0
      className = ''
      bounds = $null
      ignored = $true
    } | ConvertTo-Json -Compress
    exit 0
  }
}
if ($handle -eq [IntPtr]::Zero) {
  $handle = [Win32WindowProbe]::GetForegroundWindow()
}
$processId = 0
[void][Win32WindowProbe]::GetWindowThreadProcessId($handle, [ref]$processId)
$titleBuilder = New-Object System.Text.StringBuilder 1024
[void][Win32WindowProbe]::GetWindowText($handle, $titleBuilder, $titleBuilder.Capacity)
$rect = Get-WindowBounds $handle
$className = Get-WindowClass $handle
$processName = ''
try { $processName = (Get-Process -Id $processId -ErrorAction Stop).ProcessName + '.exe' } catch {}
$appName = Get-FriendlyAppName $processName
$browserUrl = Get-BrowserUrl $handle $processName
$browserHost = Get-UrlHost $browserUrl
$pageTitle = Get-PageTitle $titleBuilder.ToString() $appName

[pscustomobject]@{
  handle = ([Int64]$handle).ToString()
  title = $titleBuilder.ToString()
  processName = $processName
  processId = [int]$processId
  className = $className
  appName = $appName
  browserUrl = $browserUrl
  browserHost = $browserHost
  pageTitle = $pageTitle
  bounds = @{ x = $rect.Left; y = $rect.Top; width = ($rect.Right - $rect.Left); height = ($rect.Bottom - $rect.Top) }
} | ConvertTo-Json -Compress