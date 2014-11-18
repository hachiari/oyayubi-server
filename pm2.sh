#!/bin/bash

read -d '' config <<_EOF_
[{
  "name"       : "oyayubi-server",
  "instances"  : "8",
  "script"     : "./app.js",
  "error_file" : "./logs/err.log",
  "out_file"   : "./logs/out.log",
  "pid_file"   : "./logs/melo.pid",
  "exec_mode"  : "cluster_mode",
  "port"       : 2222,
  "env"        : {
    "GRACEFUL_TIMEOUT": "6000",
    "NODE_ENV": "production"
  }
}]
_EOF_

echo $config | pm2 start -
