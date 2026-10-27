pragma Singleton
import QtQuick

// IPScans.com design tokens (src/app/globals.css) mirrored 1:1 for the native Qt Quick UI.
// Primitive values live here; components only consume these semantic names.
QtObject {
    id: t

    // Driven from Main.qml (backend.isDarkTheme / OS reduced-motion preference)
    property bool dark: false
    property bool reduceMotion: false

    // ---------------------------------------------------------------- typography
    readonly property var _families: Qt.fontFamilies()
    readonly property bool hasFlex: _families.indexOf("Google Sans Flex") >= 0
    readonly property string sans: hasFlex ? "Google Sans Flex"
        : (_families.indexOf("Segoe UI Variable Display") >= 0 ? "Segoe UI Variable Display" : "Segoe UI")
    readonly property string mono: _families.indexOf("Google Sans Code") >= 0 ? "Google Sans Code"
        : (_families.indexOf("Cascadia Mono") >= 0 ? "Cascadia Mono" : "Consolas")

    // Display headings: weight 500, letter-spacing -0.045em (dark: -25 weight for halation)
    readonly property int wDisplay: dark ? 470 : 500
    readonly property int wMedium: dark ? 480 : 500
    readonly property int wBody: 400
    function tracking(px) { return -0.045 * px }
    function tight(px) { return -0.02 * px }

    // ---------------------------------------------------------------- colors
    readonly property color bg: dark ? "#10110E" : "#E7E2D6"
    readonly property color bgSubtle: dark ? "#161814" : "#DDD7C9"
    readonly property color bgMuted: dark ? "#1E211B" : "#D3CCBC"
    readonly property color surface: dark ? "#191B16" : "#F6F3EB"
    readonly property color surface2: dark ? "#1E211B" : "#EFEAE0"
    readonly property color glass: dark ? "#C70D0F14" : "#D1FFFFFF"
    readonly property color segActive: dark ? "#222838" : "#FFFFFF"

    readonly property color ink: dark ? "#F4F1E8" : "#16140F"
    readonly property color ink2: dark ? "#C9C3B6" : "#5C564C"
    readonly property color ink3: dark ? "#8D877B" : "#8A8376"
    readonly property color ink4: dark ? "#6E685C" : "#A39C90"

    readonly property color border: dark ? "#14FFFFFF" : "#140B0D12"
    readonly property color borderStrong: dark ? "#29FFFFFF" : "#240B0D12"

    readonly property color signal: dark ? "#C6F24E" : "#0C6B52"
    readonly property color signalSoft: dark ? "#24C6F24E" : "#1A0C6B52"

    readonly property color ok: dark ? "#22C55E" : "#12B76A"
    readonly property color warn: dark ? "#F59E0B" : "#F79009"
    readonly property color bad: dark ? "#EF4444" : "#F04438"
    readonly property color okSoft: dark ? "#2422C55E" : "#E8F8F0"
    readonly property color warnSoft: dark ? "#24F59E0B" : "#FEF4E6"
    readonly property color badSoft: dark ? "#24EF4444" : "#FEEDEC"

    // Brand gradient stops: linear-gradient(100deg, #2f6bff, #00c2ff 48%, #7a5cff)
    readonly property color brandA: "#0C6B52"
    readonly property color brandB: "#C6F24E"
    readonly property color brandC: "#16140F"

    // Primary ink pill (inverted in dark)
    readonly property color primaryBg: dark ? "#F4F1E8" : "#16140F"
    readonly property color primaryHover: dark ? "#FFFFFF" : "#2A261F"
    readonly property color primaryFg: dark ? "#12130F" : "#F6F3EB"

    readonly property color scrollThumb: dark ? "#2C3242" : "#D1D5DB"
    readonly property color scrim: dark ? "#99000000" : "#520B0D12"

    // ---------------------------------------------------------------- geometry & motion
    readonly property int rXs: 6
    readonly property int rSm: 10
    readonly property int rMd: 16
    readonly property int rLg: 24
    readonly property int rXl: 32

    // cubic-bezier(0.16, 1, 0.3, 1)
    readonly property var easeOut: [0.16, 1.0, 0.3, 1.0, 1.0, 1.0]
    readonly property int fast: reduceMotion ? 0 : 150
    readonly property int normal: reduceMotion ? 0 : 220

    // Topology accent remap (brand palette instead of neon)
    function nodeAccent(nodeType) {
        if (nodeType === "camera") return signal
        if (nodeType === "roi") return ok
        if (nodeType === "vlm") return brandC
        if (nodeType === "nvr") return dark ? "#A8B0C2" : "#777C86"
        if (nodeType === "vault") return warn
        if (nodeType === "bot") return brandB
        return signal
    }
}
