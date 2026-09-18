#!/usr/bin/env bash
#
# rudystyle-dotfiles installer
# Restores a GNOME (Fedora) desktop setup: dconf settings, extensions,
# GTK theme, icons, cursors, fonts, dock, terminal and shell configs.
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$HOME/.rudystyle-dotfiles-backup-$(date +%Y%m%d-%H%M%S)"
MODE="copy"          # copy | link
INSTALL_PACKAGES=1
INSTALL_ASSETS=1

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: ./install.sh [options]

Options:
  --link            Symlink configs to this repo instead of copying them
  --no-packages     Skip installing system packages with dnf
  --no-assets       Skip installing themes, icons, cursors and fonts
  -h, --help        Show this help
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --link)        MODE="link" ;;
    --no-packages) INSTALL_PACKAGES=0 ;;
    --no-assets)   INSTALL_ASSETS=0 ;;
    -h|--help)     usage; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
  shift
done

backup() {
  local target="$1"
  if [ -L "$target" ]; then
    rm -f "$target"
  elif [ -e "$target" ]; then
    local dest="$BACKUP_DIR/${target#"$HOME"/}"
    mkdir -p "$(dirname "$dest")"
    cp -a "$target" "$dest"
  fi
}

# place <repo-relative-path> <home-relative-path> [subst]
place() {
  local src="$REPO_DIR/$1"
  local dest="$HOME/$2"
  local subst="${3:-}"
  [ -e "$src" ] || return 0
  mkdir -p "$(dirname "$dest")"
  backup "$dest"
  rm -rf "$dest"
  if [ "$MODE" = "link" ]; then
    ln -s "$src" "$dest"
  elif [ "$subst" = "subst" ]; then
    sed "s#/home/[^/]*/#$HOME/#g" "$src" > "$dest"
  else
    cp -a "$src" "$dest"
  fi
}

install_packages() {
  command -v dnf >/dev/null 2>&1 || { warn "dnf not found, skipping packages"; return; }
  log "Installing system packages (Fedora)"
  local pkgs=()
  while IFS= read -r line; do
    if [ -z "$line" ]; then continue; fi
    case "$line" in \#*) continue ;; esac
    pkgs+=("$line")
  done < "$REPO_DIR/gnome/packages.txt"
  sudo dnf install -y "${pkgs[@]}" || warn "some packages failed to install"
}

install_dconf() {
  command -v dconf >/dev/null 2>&1 || { warn "dconf not found, skipping"; return; }
  log "Restoring dconf settings"
  local tmp
  tmp="$(mktemp)"
  sed "s#/home/[^/]*/#$HOME/#g" "$REPO_DIR/gnome/dconf/gnome.dconf" > "$tmp"
  dconf load /org/gnome/ < "$tmp" || warn "dconf load reported an error"
  rm -f "$tmp"
  if [ -s "$REPO_DIR/gnome/dconf/blackbox.dconf" ]; then
    dconf load /com/raggesilver/ < "$REPO_DIR/gnome/dconf/blackbox.dconf" || true
  fi
}

install_extensions() {
  log "Installing GNOME Shell extensions"
  local ext_dir="$HOME/.local/share/gnome-shell/extensions"
  mkdir -p "$ext_dir"
  local d
  for d in "$REPO_DIR"/gnome/extensions/*/; do
    [ -d "$d" ] || continue
    place "gnome/extensions/$(basename "$d")" ".local/share/gnome-shell/extensions/$(basename "$d")"
  done
  if command -v gext >/dev/null 2>&1 && [ -f "$REPO_DIR/gnome/extensions-remote.txt" ]; then
    while IFS= read -r uuid; do
      if [ -z "$uuid" ]; then continue; fi
      if [ -d "$ext_dir/$uuid" ]; then continue; fi
      gext install "$uuid" >/dev/null 2>&1 || warn "could not fetch $uuid (install it manually)"
    done < "$REPO_DIR/gnome/extensions-remote.txt"
  else
    warn "gext not found: install the extensions in gnome/extensions-remote.txt via Extension Manager"
  fi
}

enable_extensions() {
  command -v gnome-extensions >/dev/null 2>&1 || { warn "gnome-extensions not found"; return; }
  log "Enabling extensions"
  if [ -f "$REPO_DIR/gnome/extensions.list" ]; then
    while IFS= read -r uuid; do
      if [ -z "$uuid" ]; then continue; fi
      gnome-extensions enable "$uuid" >/dev/null 2>&1 || true
    done < "$REPO_DIR/gnome/extensions.list"
  fi
}

install_assets() {
  log "Installing themes, icons, cursors and fonts"

  if [ ! -d "$HOME/.themes/WhiteSur-Dark" ]; then
    git clone --depth=1 https://github.com/vinceliuice/WhiteSur-gtk-theme.git /tmp/whitesur-gtk
    /tmp/whitesur-gtk/install.sh -t all -c dark -c light -l
  else
    log "WhiteSur GTK theme already present, skipping"
  fi

  if [ ! -d "$HOME/.local/share/icons/WhiteSur" ]; then
    git clone --depth=1 https://github.com/vinceliuice/WhiteSur-icon-theme.git /tmp/whitesur-icons
    /tmp/whitesur-icons/install.sh -a
  else
    log "WhiteSur icons already present, skipping"
  fi

  if [ ! -d "$HOME/.local/share/icons/WhiteSur-cursors" ]; then
    git clone --depth=1 https://github.com/vinceliuice/WhiteSur-cursors.git /tmp/whitesur-cursors
    /tmp/whitesur-cursors/install.sh
  else
    log "WhiteSur cursors already present, skipping"
  fi

  if ! fc-list 2>/dev/null | grep -qi "JetBrainsMono Nerd"; then
    local fdir="$HOME/.local/share/fonts/JetBrainsMonoNerd"
    mkdir -p "$fdir"
    curl -L -o /tmp/JetBrainsMono.zip \
      https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.zip
    unzip -o /tmp/JetBrainsMono.zip -d "$fdir"
    fc-cache -f "$fdir"
  else
    log "JetBrainsMono Nerd Font already present, skipping"
  fi
}

install_wallpaper() {
  log "Installing wallpapers"
  mkdir -p "$HOME/.local/share/backgrounds"
  cp -a "$REPO_DIR"/wallpapers/. "$HOME/.local/share/backgrounds/" 2>/dev/null || true
}

install_configs() {
  log "Installing configuration files"
  place "config/gtk-3.0"      ".config/gtk-3.0"
  place "config/gtk-4.0"      ".config/gtk-4.0"
  place "config/plank"        ".config/plank"
  place "config/o-tiling"     ".config/o-tiling"
  place "config/ghostty"      ".config/ghostty"
  place "config/nautilus"     ".config/nautilus"
  place "config/autostart"    ".config/autostart"
  place "git/gitconfig"       ".gitconfig"
  place "shell/bashrc"        ".bashrc" subst
  place "shell/bash_profile"  ".bash_profile" subst
  place "shell/fish"          ".config/fish"
  local f
  for f in "$REPO_DIR"/config/environment.d/*; do
    if [ -f "$f" ]; then
      place "config/environment.d/$(basename "$f")" ".config/environment.d/$(basename "$f")" subst
    fi
  done
}

main() {
  command -v gsettings >/dev/null 2>&1 || die "This installer targets a GNOME desktop session."
  log "Repo:   $REPO_DIR"
  log "Mode:   $MODE"
  log "Backup: $BACKUP_DIR"

  if [ "$INSTALL_PACKAGES" = "1" ]; then install_packages; fi
  if [ "$INSTALL_ASSETS" = "1" ]; then install_assets; fi

  install_configs
  install_wallpaper
  install_dconf
  install_extensions
  enable_extensions

  log "Done."
  cat <<EOF

Next steps:
  1. Log out and log back in (or reboot) so GNOME Shell reloads the theme and extensions.
  2. Check GNOME Tweaks > Appearance, or run:
       gsettings set org.gnome.shell.extensions.user-theme name 'WhiteSur-Dark'
  3. Verify the wallpaper under Settings > Appearance.
  4. A backup of anything replaced is in:
       $BACKUP_DIR
EOF
}

main "$@"
