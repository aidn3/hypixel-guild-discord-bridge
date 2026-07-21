@echo off

:: configuration
set APPLICATION_LINK=https://github.com/aidn3/hypixel-guild-discord-bridge.git
set GIT_BRANCH=master
set WORKDIR=%cd%\hypixel-bridge
set NODEJS_VERSION=22.21.0
set NODE_ENV=production


:: paths and constants
set git_downloaded=%WORKDIR%\git-downloaded.txt
set git_zip=%WORKDIR%\git.zip
set git_dir=%WORKDIR%\git
set git_path=%git_dir%\cmd\git.exe
set PATH=%git_dir%\cmd;%PATH%

set nodejs_downloaded=%WORKDIR%\nodejs-downloaded.txt
set nodejs_zip=%WORKDIR%\nodejs.zip
set nodejs_dir=%WORKDIR%\nodejs

set application_downloaded=%WORKDIR%\application-downloaded.txt
set application_dir=%WORKDIR%\application

:: links and variants
set gitx64=https://github.com/git-for-windows/git/releases/download/v2.51.1.windows.1/MinGit-2.51.1-64-bit.zip
set gitx32=https://github.com/git-for-windows/git/releases/download/v2.51.1.windows.1/MinGit-2.51.1-32-bit.zip
set gitarm64=https://github.com/git-for-windows/git/releases/download/v2.51.1.windows.1/MinGit-2.51.1-arm64.zip

set nodejsx64=https://nodejs.org/dist/v%NODEJS_VERSION%/node-v%NODEJS_VERSION%-win-x64.zip
set nodejsx32=https://nodejs.org/dist/v%NODEJS_VERSION%/node-v%NODEJS_VERSION%-win-x86.zip
set nodejsarm64=https://nodejs.org/dist/v%NODEJS_VERSION%/node-v%NODEJS_VERSION%-win-arm64.zip


IF %PROCESSOR_ARCHITECTURE% == AMD64 (
  set giturl=%gitx64%
  set nodejsurl=%nodejsx64%
  set nodejspath=%nodejs_dir%\node-v%NODEJS_VERSION%-win-x64

) ELSE IF %PROCESSOR_ARCHITECTURE% == x86 (
  set giturl=%gitx32%
  set nodejsurl=%nodejsx32%
  set nodejspath=%nodejs_dir%\node-v%NODEJS_VERSION%-win-x86

) ELSE IF %PROCESSOR_ARCHITECTURE% == ARM64 (
  set giturl=%gitarm64%
  set nodejsurl=%nodejsarm64%
  set nodejspath=%nodejs_dir%\node-v%NODEJS_VERSION%-win-arm64

) ELSE (
  echo Unknown Operating system architecture: %PROCESSOR_ARCHITECTURE%
  goto end
)

:: set nodejs path AFTER arch processor. Why? cmd buggy and does not allow to change PATH inside that logic
set PATH=%nodejspath%;%PATH%

IF NOT EXIST "%WORKDIR%" (
  echo Creating new working directory at: %WORKDIR%
  mkdir "%WORKDIR%"
)


IF NOT EXIST "%git_downloaded%" call :install_git
IF NOT EXIST "%nodejs_downloaded%" call :install_nodejs
IF EXIST "%application_downloaded%" goto :skip_installing_application

call :install_application
IF ERRORLEVEL 1 goto end

:skip_installing_application

echo Switching to application mode:
cd "%application_dir%"

:restart_loop

echo Git checking out %GIT_BRANCH%
git --git-dir=%application_dir%\.git reset --hard
git --git-dir=%application_dir%\.git checkout %GIT_BRANCH%


echo Checking for any updates
git --git-dir=%application_dir%/.git pull --no-stat

echo Downloading libraries...
cmd /C %nodejspath%/npm.cmd install --loglevel error --fund=false --audit=false
IF %ERRORLEVEL% NEQ 0 (
  echo Failed installing libraries.
  goto end
)

echo Updating essential libraries...
cmd /C %nodejspath%/npm.cmd install --loglevel error --fund=false --audit=false skyhelper-networth
IF %ERRORLEVEL% NEQ 0 (
  echo Failed updating libraries.
  goto end
)

IF NOT EXIST %application_dir%/config.yaml call :setup_application

echo Starting the application...

cmd /C %nodejspath%/npm.cmd start
IF %ERRORLEVEL% NEQ 0 (
  echo Application exited with the code %ERRORLEVEL%
  echo Application restarting in 10 seconds...
  sleep 10
  goto restart_loop
)

goto end


:install_git
  if EXIST "%git_dir%" (
    rmdir /s /q "%git_dir%"
  )
  if EXIST "%git_zip%" (
    del "%git_zip%"
  )

  echo Downloading git...
  curl.exe --silent --progress-bar --show-error --fail --location %giturl% -o "%git_zip%"
  IF NOT errorlevel 0 (
    echo Failed downloading git.
    goto end
  )

  echo Extracting git...
  mkdir "%git_dir%"
  tar -xf "%git_zip%" -C "%git_dir%"
  IF NOT errorlevel 0 (
    echo Failed extracting git.
    goto end
  )


  ::testing git to confirm
  IF NOT EXIST "%git_path%" (goto failed_installing_git)
  git version
  IF %ERRORLEVEL% NEQ 0 (
    goto failed_installing_git
  ) ELSE IF NOT errorlevel 0 (
    goto failed_installing_git
  )

  echo 1 > "%git_downloaded%"
  goto :eof

:install_nodejs
  if EXIST "%nodejs_dir%" (
    rmdir /s /q "%nodejs_dir%"
  )
  if EXIST "%nodejs_zip%" (
    del "%nodejs_zip%"
  )

  echo Downloading Node.JS...
  curl.exe --silent --progress-bar --show-error --fail --location %nodejsurl% -o "%nodejs_zip%"
  IF NOT errorlevel 0 (
    echo Failed downloading Node.JS.
    goto end
  )

  echo Extracting Node.JS...
  mkdir "%nodejs_dir%"
  tar -xf "%nodejs_zip%" -C "%nodejs_dir%"
  IF NOT errorlevel 0 (
    echo Failed extracting Node.JS.
    goto end
  )

  ::testing nodejs to confirm
  IF NOT EXIST "%nodejspath%/node.exe" (goto failed_installing_nodejs)
  node --version

  IF %ERRORLEVEL% NEQ 0 (
    goto failed_installing_nodejs
  ) ELSE IF NOT errorlevel 0 (
    goto failed_installing_nodejs
  )

  echo 1 > "%nodejs_downloaded%"
  goto :eof

:install_application
  if EXIST "%application_dir%" (
    rmdir /s /q "%application_dir%"
  )

  echo Downloading the application...
  git clone "%APPLICATION_LINK%" "%application_dir%" --quiet

  IF %ERRORLEVEL% NEQ 0 (
    goto failed_installing_application
  ) ELSE IF NOT errorlevel 0 (
    goto failed_installing_application
  )

  echo 1 > "%application_downloaded%"
  goto :eof

:setup_application
  echo Running initial setup guide...
  cmd /C %nodejspath%/npm.cmd run setup

  IF %ERRORLEVEL% NEQ 0 (
    goto failed_setup_application
  )

  goto :eof


:failed_installing_git
  echo Failed to confirm git is properly installed.
  goto end

:failed_installing_nodejs
  echo Failed to confirm Node.JS is properly installed.
  goto end

:failed_installing_application
  echo Failed to confirm the application is properly installed.
  goto end

:failed_setup_application
  echo Failed to setup application configurations.
  goto end


:end
  pause
  exit