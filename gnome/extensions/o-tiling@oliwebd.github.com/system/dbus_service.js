import Gio from 'gi://Gio';
const IFACE = `<node>
  <interface name="org.gnome.shell.extensions.OTiling">
    <method name="FocusLeft"/>
    <method name="FocusRight"/>
    <method name="FocusUp"/>
    <method name="FocusDown"/>
    <method name="WindowFocus">
        <arg type="(uu)" direction="in" name="window"/>
    </method>
    <method name="WindowHighlight">
        <arg type="(uu)" direction="in" name="window"/>
    </method>
    <method name="WindowList">
        <arg type="a((uu)sss)" direction="out" name="args"/>
    </method>
    <method name="WindowQuit">
        <arg type="(uu)" direction="in" name="window"/>
    </method>
  </interface>
</node>`;

export class Service {
    dbus;
    id;
    FocusLeft = () => { };
    FocusRight = () => { };
    FocusUp = () => { };
    FocusDown = () => { };
    WindowFocus = () => { };
    WindowHighlight = () => { };
    WindowList = () => [];
    WindowQuit = () => { };
    constructor() {
        this.dbus = Gio.DBusExportedObject.wrapJSObject(IFACE, this);
        const onBusAcquired = (conn) => {
            this.dbus.export(conn, '/org/gnome/shell/extensions/OTiling');
        };
        function onNameAcquired() { }
        function onNameLost() { }
        this.id = Gio.bus_own_name(Gio.BusType.SESSION, 'org.gnome.shell.extensions.OTiling', Gio.BusNameOwnerFlags.NONE, onBusAcquired, onNameAcquired, onNameLost);
    }
    destroy() {
        if (this.id) {
            Gio.bus_unown_name(this.id);
            this.id = null;
        }
        if (this.dbus) {
            this.dbus.unexport();
            this.dbus = null;
        }
    }
}
