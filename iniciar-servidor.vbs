Set sh = CreateObject("WScript.Shell")
root = Replace(WScript.ScriptFullName, WScript.ScriptName, "")
sh.CurrentDirectory = root
sh.Run "node.exe server.js", 0, False
