# نسخ احتياطي لابتوب المحل: يسحب كل نسخة ليلية ما عنده.
# التشغيل:  powershell -ExecutionPolicy Bypass -File backup.ps1
# أول مرة يسألك عن رابط النظام ورمز النسخ (BACKUP_TOKEN) ويحفظهم مشفّرين لحسابك فقط.

$ErrorActionPreference = 'Stop'
$Dir = Join-Path $env:USERPROFILE 'Documents\GoldBackups'
$Cfg = Join-Path $Dir 'config.xml'
New-Item -ItemType Directory -Force -Path $Dir | Out-Null

if (-not (Test-Path $Cfg)) {
  $url = Read-Host 'رابط النظام (مثل https://gold-system.xxx.workers.dev)'
  $tok = Read-Host 'رمز النسخ الاحتياطي' -AsSecureString
  @{ Url = $url.TrimEnd('/'); Token = ($tok | ConvertFrom-SecureString) } | Export-Clixml $Cfg
}
$c = Import-Clixml $Cfg
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR(($c.Token | ConvertTo-SecureString)))
$h = @{ Authorization = "Bearer $plain" }

$list = Invoke-RestMethod -Uri "$($c.Url)/api/backup" -Headers $h
$new = 0
foreach ($b in $list.backups) {
  $name = Split-Path $b.key -Leaf
  $out = Join-Path $Dir $name
  if (-not (Test-Path $out)) {
    Invoke-WebRequest -Uri "$($c.Url)/api/backup/$name" -Headers $h -OutFile $out
    $new++
  }
}
Write-Host "تم. نسخ جديدة: $new — المجلد: $Dir"
