#!/bin/bash

env_directories=("." "./postgres" "./gbajs3" "./auth" "./admin")

echo "Do you want to reset all bootstrap actions?"
echo "This will permanently remove:"
echo "- all .env files"
echo "- all default directories (including database mount)"
echo "- default certificates"

read -r -p "(y/n) " REPLY

if [[ $REPLY == "y" || $REPLY == "Y" ]]; then
  # source the root env file for easy access to pre-defined paths
  if [ -f ./.env ]; then
    # shellcheck disable=SC1091 # root env should already exist
    source ./.env &&
      echo "root .env file sourced successfully."
  else
    echo "Error: no root env to remove default directories"
    exit 1
  fi

  for dir in "$ROM_PATH" "$SAVE_PATH" "$CERT_DIR" "$PG_DATA_LOCATION"; do
    if [ -d "$dir" ]; then
      rm -r "$dir" &&
        echo "Deleted directory $dir"
    else
      echo "Directory $dir does not exist."
    fi
  done

  # delete example env files
  for dir in "${env_directories[@]}"; do
    if [ -f "$dir/.env" ]; then
      rm "$dir/.env" &&
        echo "Deleted .env in $dir"
    else
      echo "Env file $dir/.env does not exist."
    fi
  done
else
  echo "Operation cancelled."
fi
