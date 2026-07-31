#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-.env.production.vps}"

if [[ ! -f "$env_file" ]]; then
  echo "Không tìm thấy file môi trường: $env_file" >&2
  exit 1
fi

sed -i 's/\r$//' "$env_file"

upsert_env() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" "$env_file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$env_file"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$env_file"
  fi
}

read_env() {
  local key="$1"
  sed -n "s/^${key}=//p" "$env_file" | tail -n 1
}

ensure_secret() {
  local key="$1"
  local minimum_length="$2"
  local current

  current="$(read_env "$key")"
  if [[ ${#current} -lt $minimum_length ]] || [[ "$current" =~ ^(change_me|replace_me|replace_with_) ]]; then
    upsert_env "$key" "$(openssl rand -hex 32)"
    echo "Đã tạo/rotate $key (không ghi giá trị ra log)."
  else
    echo "Giữ nguyên $key vì đã đạt độ dài yêu cầu."
  fi
}

upsert_env DEPLOYMENT_PROFILE thesis-demo
upsert_env PAYMENT_ALLOW_UNVERIFIED_WEBHOOKS false
upsert_env PAYMENT_SIMULATION_ENABLED true
upsert_env PAYMENT_REFUND_SIMULATION_ENABLED true
upsert_env PAYMENT_SIMULATION_ALLOW_PRODUCTION true
upsert_env NEXT_PUBLIC_ENABLE_PAYMENT_SIMULATION true
upsert_env DISABLE_EMAIL_VERIFICATION true
upsert_env QDRANT_URL http://qdrant:6333

ensure_secret JWT_SECRET 32
ensure_secret JWT_REFRESH_SECRET 32
ensure_secret INTERNAL_SERVICE_SECRET 32
ensure_secret GATEWAY_SERVICE_SECRET 32
ensure_secret PAYMENT_WEBHOOK_SHARED_SECRET 32

echo "Đã chuẩn bị profile thesis-demo trong $env_file."
