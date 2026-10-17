using Avalonia;
using Avalonia.Media;
using Avalonia.Styling;

namespace IPCast.Client;

public static class MonochromeTheme
{
    public static void Apply(string theme)
    {
        if (Application.Current is not { } app) return;
        app.RequestedThemeVariant = theme switch { "Light" => ThemeVariant.Light, "System" => ThemeVariant.Default, _ => ThemeVariant.Dark };
        ApplyResources(app);
    }
    public static void ApplyResources(Application app)
    {
        var light = app.ActualThemeVariant == ThemeVariant.Light;
        var colors = new Dictionary<string, (string Dark, string Light)>
        {
            ["AppBackgroundBrush"] = ("#000000", "#FFFFFF"), ["SidebarBrush"] = ("#06070A", "#F2F2F2"),
            ["CardBrush"] = ("#0D0E12", "#FFFFFF"), ["CardBrushElevated"] = ("#13151C", "#F8F8F8"),
            ["CardBorderBrush"] = ("#222530", "#DDDDDD"), ["CardBorderHoverBrush"] = ("#44495C", "#999999"),
            ["ControlFillBrush"] = ("#090A0D", "#FFFFFF"), ["SubtleFillBrush"] = ("#151720", "#EEEEEE"),
            ["TextPrimaryBrush"] = ("#FFFFFF", "#161616"), ["TextSecondaryBrush"] = ("#9AA0A6", "#555555"),
            ["TextMutedBrush"] = ("#6F7480", "#666666"), ["AccentBrush"] = ("#FFFFFF", "#111111"),
            ["AccentBrushHover"] = ("#E6EAF0", "#333333"), ["AccentPressedBrush"] = ("#CFD5DF", "#444444"),
            ["OnAccentBrush"] = ("#000000", "#FFFFFF"), ["DangerBrush"] = ("#FFFFFF", "#111111"),
            ["DangerHoverBrush"] = ("#E6EAF0", "#444444"), ["DangerFillBrush"] = ("#1F222C", "#EEEEEE"),
            ["SidebarItemSelectedBrush"] = ("#20232D", "#DDDDDD"), ["StatusOnlineBrush"] = ("#FFFFFF", "#111111"),
            ["StatusBusyBrush"] = ("#9AA0A6", "#555555")
        };
        foreach (var (key, value) in colors) app.Resources[key] = new SolidColorBrush(Color.Parse(light ? value.Light : value.Dark));
        foreach (var key in new[] { "SystemAccentColor", "SystemAccentColorLight1", "SystemAccentColorLight2", "SystemAccentColorLight3", "SystemAccentColorDark1", "SystemAccentColorDark2", "SystemAccentColorDark3" })
            app.Resources[key] = Color.Parse(light ? "#FF222222" : "#FFFFFFFF");
    }
}
