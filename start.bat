@echo off
:loop
REM Delete any temporarily changes such as from package-lock.json
REM This will not delete logs or configurations
REM But might delete any custom plugins if they are not in in logs or config dir
git reset --hard
REM Auto update the application after every restart
git pull

REM Install all dependencies after any potential application update
call npm install
REM Update packages that need to be always up to date
call npm update skyhelper-networth

REM Start the application
REM An alternative way is to "npm start" the application
node --import tsx/esm index.ts

echo Server crashed. Respawning.. 1>&2
timeout /t 10 /nobreak >nul
goto loop