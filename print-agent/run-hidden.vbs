Option Explicit

Dim shell, fso, base, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

base = fso.GetParentFolderName(WScript.ScriptFullName)

' Pequeno atraso para o Windows terminar rede e spooler apos o login.
WScript.Sleep 8000

command = "cmd.exe /c cd /d """ & base & """ && node launcher.js"
shell.Run command, 0, False
