@echo off
chcp 65001 >nul
title Demo anim3d (fecha sozinha quando voce fechar a pagina)
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale em https://nodejs.org e rode de novo.
  pause
  exit /b 1
)

rem Ja esta rodando? So abre o navegador.
netstat -ano | findstr /r /c:":5180 .*LISTENING" >nul
if not errorlevel 1 (
  echo O servidor ja esta no ar. Abrindo o navegador...
  start "" "http://localhost:5180/"
  timeout /t 3 >nul
  exit /b 0
)

if not exist node_modules (
  echo Primeira vez: instalando dependencias, aguarde...
  call npm install
  if errorlevel 1 (
    echo Falha no npm install.
    pause
    exit /b 1
  )
)

echo.
echo   Galeria de exemplos : http://localhost:5180/
echo   Almoxarifado 3D     : http://localhost:5180/almoxarifado.html
echo.
echo   O servidor desliga sozinho 15 s depois que voce fechar todas as paginas da demo.
echo   Para parar na hora: feche esta janela ou aperte Ctrl+C.
echo.
set ANIM3D_FECHAR_SOZINHO=1
node scripts\garantir-dados.mjs
call npx vite --config demo/vite.config.ts --open "/"
if errorlevel 1 pause
