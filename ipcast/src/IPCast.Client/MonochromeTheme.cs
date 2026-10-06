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
            ["AppBackgroundBrush"] = ("#111111", "#FFFFFF"), ["SidebarBrush"] = ("#181818", "#F2F2F2"),
            ["CardBrush"] = ("#181818", "#FFFFFF"), ["CardBrushElevated"] = ("#222222", "#F8F8F8"),
            ["CardBorderBrush"] = ("#383838", "#DDDDDD"), ["CardBorderHoverBrush"] = ("#606060", "#999999"),
            ["ControlFillBrush"] = ("#222222", "#FFFFFF"), ["SubtleFillBrush"] = ("#292929", "#EEEEEE"),
            ["TextPrimaryBrush"] = ("#F5F5F5", "#161616"), ["TextSecondaryBrush"] = ("#B8B8B8", "#555555"),
            ["TextMutedBrush"] = ("#999999", "#666666"), ["AccentBrush"] = ("#FFFFFF", "#111111"),
            ["AccentBrushHover"] = ("#DDDDDD", "#333333"), ["AccentPressedBrush"] = ("#BBBBBB", "#444444"),
            ["OnAccentBrush"] = ("#111111", "#FFFFFF"), ["DangerBrush"] = ("#FFFFFF", "#111111"),
            ["DangerHoverBrush"] = ("#DDDDDD", "#444444"), ["DangerFillBrush"] = ("#292929", "#EEEEEE"),
            ["SidebarItemSelectedBrush"] = ("#333333", "#DDDDDD"), ["StatusOnlineBrush"] = ("#FFFFFF", "#111111"),
            ["StatusBusyBrush"] = ("#AAAAAA", "#555555")
        };
        foreach (var (key, value) in colors) app.Resources[key] = new SolidColorBrush(Color.Parse(light ? value.Light : value.Dark));
        foreach (var key in new[] { "SystemAccentColor", "SystemAccentColorLight1", "SystemAccentColorLight2", "SystemAccentColorLight3", "SystemAccentColorDark1", "SystemAccentColorDark2", "SystemAccentColorDark3" })
            app.Resources[key] = Color.Parse(light ? "#FF222222" : "#FFCCCCCC");
    }
}
