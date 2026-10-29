#!/usr/bin/env bash
# Reload the public nginx after app containers are recreated.
# Recreate changes container IPs; the current nginx-proxy family config uses a
# static `upstream` that caches those IPs until nginx reloads (risk of 502s).
# Prefer the standalone edge-nginx; otherwise reload today's nginx-proxy.
# Always exit 0 so a deploy never fails on this step.

set -u

container_running() {
  local name="$1"
  local state
  state="$(docker inspect --format '{{.State.Running}}' "$name" 2>/dev/null || true)"
  [ "$state" = "true" ]
}

reload_nginx() {
  local name="$1"
  echo "reloading public proxy ${name}"
  if docker exec "$name" nginx -s reload; then
    echo "reloaded ${name}"
  else
    echo "warning: ${name} reload failed; continuing"
  fi
}

if container_running edge-nginx; then
  reload_nginx edge-nginx
elif container_running nginx-proxy; then
  reload_nginx nginx-proxy
else
  echo "no public proxy container (edge-nginx or nginx-proxy) is running; continuing"
fi

exit 0
