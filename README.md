# rudystyle-dotfiles

My personal GNOME desktop setup on **Fedora Workstation 43** with **GNOME Shell 49**.
Everything needed to reproduce this look and feel on a fresh machine is collected here,
so switching devices does not mean starting from scratch.

![Overview](assets/overview.png)

## What this is

A backup-as-code of my desktop:

- **GNOME Shell** dconf settings (theme, fonts, workspaces, keybindings, Night Light, etc.)
- **GNOME Shell extensions** (user extensions are vendored, the rest are installed automatically)
- **WhiteSur** GTK theme, icon theme and cursors
- **JetBrainsMono Nerd Font**
- **Dash to Dock** + **Plank** dock configuration
- **GTK 3 / GTK 4** settings and CSS overrides
- **Ghostty** terminal theme ("Carbon Glass") and keybindings
- **Ptyxis** terminal profile (from dconf)
- **o-tiling**, **blur-my-shell**, **search-light** and other extension configs
- Wallpapers (the current one is set as the desktop background on install)
- Shell dotfiles: `.bashrc`, `.bash_profile`, fish completions
- `.gitconfig`

## Requirements

- Fedora Workstation (tested on 43) or another GNOME 49 based distro
- A Wayland or X11 GNOME session
- An internet connection (for themes, icons, cursors and fonts)

## Install

```bash
git clone git@github.com:ruddypp/rudystyle-dotfiles.git
cd rudystyle-dotfiles
./install.sh
```

Then **log out and log back in** so GNOME Shell reloads the theme and extensions.

### Options

| Flag            | Description                                             |
| --------------- | ------------------------------------------------------- |
| `--link`        | Symlink configs to this repo instead of copying them    |
| `--no-packages` | Skip `dnf` package installation                         |
| `--no-assets`   | Skip themes, icons, cursors and fonts                   |

The installer never deletes anything silently: existing files are copied to
`~/.rudystyle-dotfiles-backup-<timestamp>` first.

### Update

With `--link` the repo is the live source, so `git pull` alone updates everything.
With the default copy mode, re-run `./install.sh` after pulling.

## Layout

```
.
├── assets/                 # README images
├── config/                 # ~/.config subset
│   ├── autostart/
│   ├── environment.d/
│   ├── ghostty/
│   ├── gtk-3.0/
│   ├── gtk-4.0/
│   ├── nautilus/
│   ├── o-tiling/
│   └── plank/
├── gnome/
│   ├── dconf/              # dconf dumps (gnome.dconf, blackbox.dconf)
│   ├── extensions/         # user extensions (vendored)
│   ├── extensions.list     # extensions to enable after install
│   ├── extensions-remote.txt
│   └── packages.txt        # dnf packages
├── git/                    # .gitconfig
├── shell/                  # bash + fish config
├── wallpapers/             # background images
├── install.sh
└── uninstall.sh
```

## Highlights

- **Theme:** WhiteSur-Dark (GTK + Shell), WhiteSur icons, WhiteSur cursors (24px)
- **Fonts:** Adwaita Sans 11 for the UI, JetBrainsMono Nerd Font in terminals
- **Color scheme:** prefer-dark, blue accent, slight font hinting
- **Window buttons:** close / minimize / maximize on the **left**
- **Workspaces:** dynamic workspaces, switching with `Super+Page Up/Down` and `Ctrl+Alt+Left/Right`
- **Tiling:** `o-tiling` and `tiling-assistant` for keyboard-driven tiling
- **Terminal:** Ghostty `Carbon Glass` theme, 60% background opacity, `Ctrl+Shift+C/V` copy/paste, `Ctrl+N` new tab, `Alt+Tab` next tab

## Restoring GNOME on a machine where GNOME was removed

This repo is the fallback for a system running only Hyprland. The desktop
itself is not in Git — only the packages that rebuild it and the settings that
shape it. Restore in two passes, because dconf and extensions need a running
GNOME session:

```bash
# Pass 1 - from Hyprland or a TTY. Installs GNOME, GDM, apps, themes, fonts.
./install.sh

# Reboot, pick "GNOME" on the login screen, then:

# Pass 2 - from inside the GNOME session. Loads dconf and extensions.
./install.sh --no-packages --no-assets
```

`install.sh` detects a missing GNOME session and skips the steps that need one,
instead of refusing to run.

What is NOT covered, and has to be handled by hand:

- **GNOME Keyring contents.** Saved passwords live in `~/.local/share/keyrings`
  and never belong in a public repo. Do not delete that directory when removing
  GNOME — `gnome-keyring` is a dependency of apps beyond GNOME.
- **Four stale extensions.** `enabled-extensions` in dconf still lists
  burn-my-windows, compiz-windows-effect, forge and tiling-assistant, but
  their files were already gone when this backup was taken. They restore as
  no-ops; reinstall them from extensions.gnome.org if you want them back.
- **Development tooling.** `gnome/packages.txt` rebuilds the desktop only, not
  Docker, Node, PHP, databases or editors.
- **COPR repositories.** `ghostty` comes from `scottames/ghostty`; the Hyprland
  packages come from `lionheartp/Hyprland`. Enable those before installing.

## The Hyprland room (`hypr/`)

GNOME and Hyprland are kept as separate "rooms" that share one home directory.
The split is enforced by `DCONF_PROFILE`, so each session reads and writes its
own dconf database:

```
GNOME     -> ~/.config/dconf/user
Hyprland  -> ~/.config/dconf/hypr   (via hypr/config/dconf-profile)
```

For that split to reach GTK applications, the environment has to be pushed into
the systemd user manager, otherwise `xdg-desktop-portal-gtk` — the component
that tells every GTK app which theme to use — reads GNOME's database instead:

```
exec-once = dbus-update-activation-environment --systemd DCONF_PROFILE ...
exec-once = systemctl --user restart xdg-desktop-portal-gtk.service
```

Verify the wall is standing with:

```bash
gdbus call --session --dest org.freedesktop.portal.Desktop \
  --object-path /org/freedesktop/portal/desktop \
  --method org.freedesktop.portal.Settings.ReadOne \
  org.gnome.desktop.interface icon-theme
```

Run inside Hyprland it must answer with the Hyprland room's icon theme, not
GNOME's.

**Never run both sessions at once** (fast user switching, a second VT). They
share a single systemd user manager, so `DCONF_PROFILE` leaks across and the
two rooms contaminate each other.

Things that cannot be split, no matter the configuration:

| Shared | Why |
|---|---|
| `~/.config/gtk-4.0/gtk.css` | The only route libadwaita accepts; it ignores `gtk-theme` |
| Flatpak overrides | `flatpak override --user` has no concept of a session |
| `~/.config/ghostty/config` | One file, both sessions |
| `~/.icons/default/index.theme` | X11/XWayland cursor default |

### Traps worth remembering

- **`dconf load` is all-or-nothing.** The dump must not contain keys that a
  system database locks, or the whole load is refused with "attempted to
  modify one or more non-writable keys" and nothing is applied. authselect
  locks `/org/gnome/login-screen/enable-{smartcard,fingerprint}-authentication`,
  so that section is deliberately excluded from `gnome/dconf/gnome.dconf`.
- **A second desktop writes into GNOME's dconf.** KDE's GTK Application Style
  page sets `gtk-theme`, `icon-theme`, `cursor-theme`, `color-scheme`, the
  three font keys and the sound theme under `org.gnome.desktop.*` - the same
  keys GNOME reads. Restoring this backup fixes the keys it recorded, but a
  key GNOME never set explicitly is absent from the dump and therefore cannot
  be undone by loading it; reset those with `gsettings reset`.


- **GNOME Settings writes into whichever room launched it.** Opening the
  Appearance panel from Hyprland rewrites — and can erase — that room's
  `gtk-theme`, `icon-theme` and `font-name`. Use `nwg-look` there instead.
- **Hyprland 0.53 rewrote the rule syntax.** `layerrule = blur, waybar` is
  silently rejected; the current form is
  `layerrule = blur on, ignore_alpha 0.2, match:namespace waybar`.
  `hyprctl reload` answers `ok` either way — always check `hyprctl configerrors`.
- **`pkill` matches a 15-character process name.** `pkill nwg-dock-hyprland`
  never matches anything. Use `pkill -f`.

## Uninstall

```bash
./uninstall.sh
```

This removes the installed files, restores the newest backup, and leaves the
GNOME extensions for you to remove from Extension Manager if you want.

## Credits

Third-party assets installed by `install.sh`:

- [WhiteSur GTK Theme](https://github.com/vinceliuice/WhiteSur-gtk-theme) by vinceliuice
- [WhiteSur Icon Theme](https://github.com/vinceliuice/WhiteSur-icon-theme) by vinceliuice
- [WhiteSur Cursors](https://github.com/vinceliuice/WhiteSur-cursors) by vinceliuice
- [JetBrainsMono Nerd Font](https://github.com/ryanoasis/nerd-fonts) by ryanoasis

Wallpaper credit goes to the original artist. It is included here for personal use only.

## License

MIT for the configuration and scripts. Third-party themes, icons and fonts keep
their own licenses.
