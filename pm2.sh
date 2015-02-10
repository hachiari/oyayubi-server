#!/bin/bash

read -d '' config <<_EOF_
[{
  "name"       : "oyayubi-server",
  "script"     : "./app.js",
  "error_file" : "./logs/err.log",
  "out_file"   : "./logs/out.log",
  "pid_file"   : "./logs/melo.pid",
  "port"       : 2222,
  "env"        : {
    "GRACEFUL_TIMEOUT": "6000",
    "NODE_ENV": "production"
  }
}]
_EOF_

echo $config | pm2 start -
