#!/usr/bin/env bash
#
# rudystyle-dotfiles uninstaller
# Removes the files installed by install.sh and restores the newest backup.
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }

TARGETS=(
  ".config/gtk-3.0"
  ".config/gtk-4.0"
  ".config/plank"
  ".config/o-tiling"
  ".config/ghostty"
  ".config/nautilus"
  ".config/environment.d"
  ".config/autostart"
  ".config/fish"
  ".gitconfig"
  ".bashrc"
  ".bash_profile"
)

log "Removing installed configuration files"
for rel in "${TARGETS[@]}"; do
  dest="$HOME/$rel"
  if [ -L "$dest" ]; then
    log "unlink $dest"
    rm -f "$dest"
  elif [ -e "$dest" ]; then
    log "remove $dest"
    rm -rf "$dest"
  fi
done

if [ -d "$REPO_DIR/gnome/extensions" ]; then
  for d in "$REPO_DIR"/gnome/extensions/*/; do
    [ -d "$d" ] || continue
    dest="$HOME/.local/share/gnome-shell/extensions/$(basename "$d")"
    if [ -e "$dest" ]; then
      log "remove extension $(basename "$d")"
      rm -rf "$dest"
    fi
  done
fi

BACKUP="$(ls -1d "$HOME"/.rudystyle-dotfiles-backup-* 2>/dev/null | sort | tail -n1 || true)"
if [ -n "${BACKUP:-}" ] && [ -d "$BACKUP" ]; then
  log "Restoring backup from $BACKUP"
  cp -a "$BACKUP"/. "$HOME"/
else
  warn "No backup found, skipping restore"
fi

warn "Wallpapers and the WhiteSur theme/icons/fonts are left in place."
warn "Remove unwanted GNOME extensions from Extension Manager."
log "Done. Log out and back in for changes to take effect."
