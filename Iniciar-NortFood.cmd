@echo off
setlocal
cd /d "%~dp0"
set "nortfoodNode="
where node >nul 2>nul
if not errorlevel 1 set "nortfoodNode=node"
if not defined nortfoodNode if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "nortfoodNode=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined nortfoodNode (
 echo Node.js nao encontrado. Instale a versao 24 LTS pelo site oficial do Node.js.
 pause
 exit /b 1
)
"%nortfoodNode%" scripts/start-local.cjs
if errorlevel 1 pause
endlocal
