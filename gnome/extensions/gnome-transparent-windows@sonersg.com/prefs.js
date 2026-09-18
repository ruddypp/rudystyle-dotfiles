import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {
  ExtensionPreferences,
  gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class TransparentWindowsPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup({
      title: _(''),
      description: _(''),
    });
    group.add(this.buildPrefsWidget());
    page.add(group);
    window.add(page);
  }

  buildPrefsWidget() {
    let settings = this.getSettings();
    let box = new Gtk.Box({
      halign: Gtk.Align.CENTER,
      orientation: Gtk.Orientation.VERTICAL,
      'margin-top': 20,
      'margin-bottom': 20,
      'margin-start': 20,
      'margin-end': 20,
      spacing: 22,
    });

    // Add opacity slider (5% to 100%)
    box.append(
      this.buildActiveSlider(
        settings,
        'active-window-opacity',
        [5, 100, 1, 5],
        _('Active window opacity percentage:')
      )
    );
    // Add opacity slider (5% to 100%)
    box.append(
      this.buildInactiveSlider(
        settings,
        'inactive-window-opacity',
        [5, 100, 1, 5],
        _('Inactive window opacity percentage:')
      )
    );
    // Add info text
    box.append(
      new Gtk.Label({
        label:
          'The first opening of every window is fully opaque, it is the default behavior of the extension, **transparency is activated when focus changes between windows.** Also, fullscreen is always fully opaque.',
        halign: Gtk.Align.START,
        hexpand: true,
        wrap: true,
        xalign: 0,
      })
    );

    return box;
  }

  buildActiveSlider(settings, key, values, labeltext) {
    let [lower, upper, step, page] = values;
    let vbox = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 10,
    });

    let hbox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 10,
    });

    let label = new Gtk.Label({
      label: labeltext,
      halign: Gtk.Align.START,
      hexpand: true,
      wrap: true,
      xalign: 0,
    });

    // Get initial value
    let initialValue = settings.get_int(key);

    let valueLabel = new Gtk.Label({
      label: `${initialValue}%`,
      halign: Gtk.Align.END,
      width_chars: 5,
    });

    hbox.append(label);
    hbox.append(valueLabel);

    let adjustment = new Gtk.Adjustment({
      lower: lower,
      upper: upper,
      step_increment: step,
      page_increment: page,
      value: initialValue,
    });

    let scale = new Gtk.Scale({
      orientation: Gtk.Orientation.HORIZONTAL,
      adjustment: adjustment,
      digits: 0,
      hexpand: true,
      draw_value: false,
    });

    // Add tooltip for accessibility
    scale.set_tooltip_text(
      _(
        'Adjust the transparency level from 5% (very transparent) to 100% (fully opaque)'
      )
    );

    // Update settings when scale changes
    scale.connect('value-changed', () => {
      let value = Math.round(scale.get_value());
      settings.set_int(key, value);
      valueLabel.set_text(`${value}%`);
    });

    // Update scale when settings change externally
    settings.connect(`changed::${key}`, () => {
      let value = settings.get_int(key);
      scale.set_value(value);
      valueLabel.set_text(`${value}%`);
    });

    vbox.append(hbox);
    vbox.append(scale);

    return vbox;
  }

  buildInactiveSlider(settings, key, values, labeltext) {
    let [lower, upper, step, page] = values;
    let vbox = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 10,
    });

    let hbox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 10,
    });

    let label = new Gtk.Label({
      label: labeltext,
      halign: Gtk.Align.START,
      hexpand: true,
      wrap: true,
      xalign: 0,
    });

    // Get initial value
    let initialValue = settings.get_int(key);

    let valueLabel = new Gtk.Label({
      label: `${initialValue}%`,
      halign: Gtk.Align.END,
      width_chars: 5,
    });

    hbox.append(label);
    hbox.append(valueLabel);

    let adjustment = new Gtk.Adjustment({
      lower: lower,
      upper: upper,
      step_increment: step,
      page_increment: page,
      value: initialValue,
    });

    let scale = new Gtk.Scale({
      orientation: Gtk.Orientation.HORIZONTAL,
      adjustment: adjustment,
      digits: 0,
      hexpand: true,
      draw_value: false,
    });

    // Add tooltip for accessibility
    scale.set_tooltip_text(
      _(
        'Adjust the transparency level from 5% (very transparent) to 100% (fully opaque)'
      )
    );

    // Update settings when scale changes
    scale.connect('value-changed', () => {
      let value = Math.round(scale.get_value());
      settings.set_int(key, value);
      valueLabel.set_text(`${value}%`);
    });

    // Update scale when settings change externally
    settings.connect(`changed::${key}`, () => {
      let value = settings.get_int(key);
      scale.set_value(value);
      valueLabel.set_text(`${value}%`);
    });

    vbox.append(hbox);
    vbox.append(scale);

    return vbox;
  }
}
