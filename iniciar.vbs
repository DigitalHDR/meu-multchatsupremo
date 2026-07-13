Set sh = CreateObject("WScript.Shell")
root = Replace(WScript.ScriptFullName, WScript.ScriptName, "")
sh.CurrentDirectory = root

sh.Run "powershell.exe -NoProfile -Command ""Get-NetTCPConnection -LocalPort 3847,3857,3867 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }""", 0, True

sh.Run "node.exe server.js", 0, False

WScript.Sleep 800

guiDir = root & "gui\"
sh.Run "pythonw.exe """ & guiDir & "multichat_app.py""", 1, False
