Set sh = CreateObject("WScript.Shell")
sh.Run "powershell.exe -NoProfile -Command ""Get-NetTCPConnection -LocalPort 3847,3857,3867 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }""", 0, True
