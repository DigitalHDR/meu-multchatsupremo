Set sh = CreateObject("WScript.Shell")
root = Replace(WScript.ScriptFullName, WScript.ScriptName, "")
sh.CurrentDirectory = root
sh.Run "pythonw.exe """ & root & "multichat_app.py""", 1, False
