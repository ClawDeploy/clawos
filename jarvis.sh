#!/bin/bash
PC_AGENT="http://100.110.248.107:3001"

case "$1" in
  status)    curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d '{"command":"status"}' ;;
  shutdown)  curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d '{"command":"shutdown"}' ;;
  restart)   curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d '{"command":"restart"}' ;;
  lock)      curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d '{"command":"lock"}' ;;
  chrome)    curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d '{"command":"open-chrome"}' ;;
  desktop)   curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d '{"command":"list-desktop"}' ;;
  downloads) curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d '{"command":"list-downloads"}' ;;
  processes) curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d '{"command":"processes"}' ;;
  kill)      curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d "{\"command\":\"kill-process\",\"args\":\"$2\"}" ;;
  open)      curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d "{\"command\":\"open-app\",\"args\":\"$2\"}" ;;
  url)       curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d "{\"command\":\"open-url\",\"args\":\"$2\"}" ;;
  run)       curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d "{\"command\":\"run\",\"args\":\"$2\"}" ;;
  volume)    curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d "{\"command\":\"volume-$2\"}" ;;
  ping)      curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d "{\"command\":\"ping\",\"args\":\"$2\"}" ;;
  read)      curl -s -X POST $PC_AGENT/command -H "Content-Type: application/json" -d "{\"command\":\"read-file\",\"args\":\"$2\"}" ;;
  *)         echo "❌ Bilinmeyen komut. Listesi: status, shutdown, restart, lock, chrome, desktop, downloads, processes, kill, open, url, run, volume, ping, read" ;;
esac
