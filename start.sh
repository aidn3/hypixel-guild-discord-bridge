#! /bin/sh

while true; do
  # Delete any temporarily changes such as from package-lock.json
  # This will not delete logs or configurations
  # But might delete any custom plugins if they are not in in logs or config dir
  git reset --hard
  # Auto update the application after every restart
  git pull

  # Install all dependencies after any potential application update
  npm install
  # Update packages that need to be always up to date
  npm update skyhelper-networth

  # Start the application
  # An alternative way is to "npm start" the application
  node --import tsx/esm index.ts

  echo "Server crashed.  Respawning.." >&2
  sleep 10
done
