@echo off
:delete_node_modules
rd /s /q node_modules
if exist node_modules (
  timeout /t 1 >nul
  goto :delete_node_modules
)

:delete_src
rd /s /q src
if exist src (
  timeout /t 1 >nul
  goto :delete_src
)

if exist package.json del /f /q package.json

move /y tmp\node_modules node_modules
move /y tmp\src src
move /y tmp\package.json package.json

start "" "..\..\±¾µØAI.exe"
exit