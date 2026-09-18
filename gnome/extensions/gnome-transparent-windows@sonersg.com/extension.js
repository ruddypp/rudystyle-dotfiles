// import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class TransparentWindowsExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._onFocusChanged = this._onFocusChanged.bind(this);
    this._onSettingsChanged = this._onSettingsChanged.bind(this);

    this._focusChangedId = global.display.connect(
      'notify::focus-window',
      this._onFocusChanged
    );
    this._settingsChangedId = this._settings.connect(
      'changed',
      this._onSettingsChanged
    );

    this._onFocusChanged();
  }

  disable() {
    if (this._focusChangedId) {
      global.display.disconnect(this._focusChangedId);
      this._focusChangedId = null;
    }

    if (this._settingsChangedId) {
      this._settings.disconnect(this._settingsChangedId);
      this._settingsChangedId = null;
    }

    this._getAllWindows().forEach(window => {
      this._setWindowOpacity(window, 255);
    });

    this._settings = null;
  }

  _getAllWindows() {
    const windows = [];
    const workspaceManager = global.workspace_manager;

    if (!workspaceManager) {
      console.log('Workspace manager not available');
      return windows;
    }

    const numWorkspaces = workspaceManager.get_n_workspaces();

    for (let i = 0; i < numWorkspaces; i++) {
      const workspace = workspaceManager.get_workspace_by_index(i);
      if (workspace) {
        const workspaceWindows = global.display.get_tab_list(
          Meta.TabList.NORMAL_ALL,
          workspace
        );
        if (workspaceWindows) {
          windows.push(...workspaceWindows);
        }
      }
    }

    return windows;
  }

  _onSettingsChanged() {
    // Reapply transparency when settings change
    this._onFocusChanged();
  }

  _onFocusChanged() {
    const focusedWindow = global.display.get_focus_window();
    const windows = this._getAllWindows();

    /////////////////////////////////////////////////////////////////
    // Get active window opacity from settings
    const activeOpacityPercentage = this._settings.get_int(
      'active-window-opacity'
    );
    // Validate opacity percentage
    const activeClampedOpacity = Math.max(
      5,
      Math.min(100, activeOpacityPercentage)
    );
    // Convert percentage to 0-255 range
    const activeOpacity = Math.round((activeClampedOpacity / 100) * 255);
    /////////////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////
    // Get inactive window opacity from settings
    const inactiveOpacityPercentage = this._settings.get_int(
      'inactive-window-opacity'
    );
    // Validate opacity percentage
    const inactiveClampedOpacity = Math.max(
      5,
      Math.min(100, inactiveOpacityPercentage)
    );
    // Convert percentage to 0-255 range
    const inactiveOpacity = Math.round((inactiveClampedOpacity / 100) * 255);
    /////////////////////////////////////////////////////////////////

    for (const window of windows) {
      if (!window) continue;

      // if (window.get_title().toLowerCase().includes('soner-nixos')) {
      //   // treat as terminal
      //   this._setWindowOpacity(window, Math.round((66 / 100) * 255));
      // } else

      if (window === focusedWindow && (window.is_maximized() || window.is_fullscreen())) {
        this._setWindowOpacity(window, 255);
      } else if (window === focusedWindow) {
        this._setWindowOpacity(window, activeOpacity);
      } else {
        this._setWindowOpacity(window, inactiveOpacity);
      }
    }
  }

  _setWindowOpacity(window, targetOpacity) {
    if (!window) return;

    // Get animation speed from settings and validate
    // const animationSpeed = Math.max(
    //   50,
    //   Math.min(1000, this._settings.get_int('animation-speed'))
    // );

    const actor = window.get_compositor_private();
    if (!actor) return;

    // Remove any existing transitions to avoid conflicts
    // actor.remove_all_transitions();

    // Animate to the new opacity with a smooth fade
    // actor.ease({
    //   opacity: targetOpacity,
    //   duration: animationSpeed,
    //   mode: Clutter.AnimationMode.EASE_OUT_QUAD,
    // });

    // Set opacity directly without animation
    actor.opacity = targetOpacity;
  }
}
