#!/usr/bin/env bash
# Reload each public nginx that is running after app containers are recreated.
# Recreate changes container IPs; the current nginx-proxy family config uses a
# static `upstream` that caches those IPs until nginx reloads (risk of 502s).
# During switch-over, edge-nginx may be running unpublished while nginx-proxy
# is still live, so reload every matching container independently.
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

reloaded=0
for name in nginx-proxy edge-nginx; do
  if container_running "$name"; then
    reload_nginx "$name"
    reloaded=1
  else
    echo "${name} is not running; skipping"
  fi
done

if [ "$reloaded" -eq 0 ]; then
  echo "no public proxy container (nginx-proxy or edge-nginx) is running; continuing"
fi

exit 0
