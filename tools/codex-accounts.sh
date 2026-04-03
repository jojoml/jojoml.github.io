#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${HOME}/.local/bin"
TARGET_PATH="${INSTALL_DIR}/codex-accounts"
DOWNLOAD_URL="${CODEX_ACCOUNTS_DOWNLOAD_URL:-https://raw.githubusercontent.com/jojo23333/Codex-Account-Manager/main/codex-accounts}"
SHELL_CHOICE=""

note() { printf '[*] %s\n' "$*"; }
ok() { printf '[OK] %s\n' "$*"; }
die() { printf '[ERR] %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Install codex-accounts into ~/.local/bin.

Usage:
  curl -fsSL https://jojoml.github.io/tools/codex-accounts.sh | bash
  curl -fsSL https://jojoml.github.io/tools/codex-accounts.sh | bash -s -- --shell zsh
  curl -fsSL https://jojoml.github.io/tools/codex-accounts.sh | bash -s -- --shell bash

Options:
  --shell bash|zsh|both|none
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --shell)
        shift
        [[ $# -gt 0 ]] || die "--shell requires a value."
        SHELL_CHOICE="$1"
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "Unknown argument: $1"
        ;;
    esac
    shift
  done

  case "${SHELL_CHOICE:-}" in
    ""|bash|zsh|both|none) ;;
    *) die "Invalid shell choice: ${SHELL_CHOICE}" ;;
  esac
}

download_file() {
  local output_path="$1"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$DOWNLOAD_URL" -o "$output_path"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$output_path" "$DOWNLOAD_URL"
  else
    die "curl or wget is required to download codex-accounts."
  fi
}

detect_or_prompt_shell() {
  local answer current_shell

  [[ -n "${SHELL_CHOICE:-}" ]] && return 0

  if [[ -r /dev/tty && -w /dev/tty ]]; then
    cat >/dev/tty <<'EOF'
Add ~/.local/bin to your shell PATH:
  1) zsh   (~/.zshrc)
  2) bash  (~/.bashrc and ~/.bash_profile)
  3) both
  4) skip
EOF
    printf 'Selection [1]: ' >/dev/tty
    read -r answer </dev/tty || true

    case "${answer:-1}" in
      1) SHELL_CHOICE="zsh" ;;
      2) SHELL_CHOICE="bash" ;;
      3) SHELL_CHOICE="both" ;;
      4) SHELL_CHOICE="none" ;;
      *) die "Invalid selection: ${answer}" ;;
    esac
    return 0
  fi

  current_shell="${SHELL##*/}"
  case "$current_shell" in
    zsh) SHELL_CHOICE="zsh" ;;
    bash) SHELL_CHOICE="bash" ;;
    *) SHELL_CHOICE="none" ;;
  esac
}

append_path_block() {
  local rc_file="$1"

  touch "$rc_file"

  if grep -Fq '# >>> codex-accounts path >>>' "$rc_file"; then
    note "PATH block already present in ${rc_file}."
    return 0
  fi

  cat >>"$rc_file" <<'EOF'

# >>> codex-accounts path >>>
case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) export PATH="$HOME/.local/bin:$PATH" ;;
esac
# <<< codex-accounts path <<<
EOF

  ok "Updated ${rc_file}"
}

configure_shell_path() {
  case "$SHELL_CHOICE" in
    bash)
      append_path_block "${HOME}/.bashrc"
      append_path_block "${HOME}/.bash_profile"
      ;;
    zsh)
      append_path_block "${HOME}/.zshrc"
      ;;
    both)
      append_path_block "${HOME}/.zshrc"
      append_path_block "${HOME}/.bashrc"
      append_path_block "${HOME}/.bash_profile"
      ;;
    none)
      note "Skipped shell PATH updates."
      ;;
  esac
}

install_codex_accounts() {
  local temp_file

  mkdir -p "$INSTALL_DIR"
  temp_file="$(mktemp "${TMPDIR:-/tmp}/codex-accounts.XXXXXX")"
  trap 'rm -f "$temp_file"' EXIT

  note "Downloading codex-accounts..."
  download_file "$temp_file"

  if ! head -n 1 "$temp_file" | grep -Fq '#!/usr/bin/env bash'; then
    die "Downloaded file does not look like the codex-accounts script."
  fi

  chmod 755 "$temp_file"
  mv "$temp_file" "$TARGET_PATH"
  trap - EXIT

  ok "Installed ${TARGET_PATH}"
}

main() {
  parse_args "$@"
  install_codex_accounts
  detect_or_prompt_shell
  configure_shell_path

  note "Open a new shell or run:"
  printf '      export PATH="$HOME/.local/bin:$PATH"\n'
  note "Then run: codex-accounts help"
}

main "$@"
