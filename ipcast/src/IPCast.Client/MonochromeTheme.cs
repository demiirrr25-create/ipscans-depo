using Avalonia;
using Avalonia.Media;
using Avalonia.Platform;
using Avalonia.Styling;
using Microsoft.Win32;

namespace IPCast.Client;

public static class MonochromeTheme
{
    public static string CurrentTheme { get; private set; } = "Dark";

    public static bool DetectSystemLightTheme(Application? app = null)
    {
        if (OperatingSystem.IsWindows())
        {
            try
            {
                using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
                if (key?.GetValue("AppsUseLightTheme") is int regVal)
                {
                    return regVal != 0;
                }
            }
            catch
            {
                // Fall back to Avalonia PlatformSettings
            }
        }

        var targetApp = app ?? Application.Current;
        if (targetApp?.PlatformSettings?.GetColorValues() is { } colorValues)
        {
            return colorValues.ThemeVariant == PlatformThemeVariant.Light;
        }

        return targetApp?.ActualThemeVariant == ThemeVariant.Light;
    }

    public static bool IsLightTheme(string? theme = null)
    {
        var mode = string.IsNullOrWhiteSpace(theme) ? CurrentTheme : theme.Trim();
        if (string.Equals(mode, "Light", StringComparison.OrdinalIgnoreCase))
            return true;
        if (string.Equals(mode, "Dark", StringComparison.OrdinalIgnoreCase))
            return false;
        return DetectSystemLightTheme(Application.Current);
    }

    public static void Apply(string theme)
    {
        CurrentTheme = string.IsNullOrWhiteSpace(theme) ? "Dark" : theme.Trim();
        if (Application.Current is not { } app) return;

        var isLight = IsLightTheme(CurrentTheme);
        app.RequestedThemeVariant = isLight ? ThemeVariant.Light : ThemeVariant.Dark;
        ApplyResources(app, isLight);
    }

    public static void ApplyResources(Application app)
    {
        var isLight = string.Equals(CurrentTheme, "System", StringComparison.OrdinalIgnoreCase)
            ? DetectSystemLightTheme(app)
            : app.RequestedThemeVariant == ThemeVariant.Light || IsLightTheme(CurrentTheme);
        ApplyResources(app, isLight);
    }

    public static void ApplyResources(Application app, bool light)
    {
        var colors = new Dictionary<string, (string Dark, string Light)>
        {
            // IPScans v2 Canonical Tokens
            ["ObsidianBrush"] = ("#07080B", "#FFFFFF"),
            ["Surface0Brush"] = ("#101218", "#F7F8FA"),
            ["Surface1Brush"] = ("#101218", "#FFFFFF"),
            ["Surface2Brush"] = ("#181B23", "#F1F3F5"),
            ["GlassSurfaceBrush"] = ("#CC0D0F14", "#CCFFFFFF"),
            ["GlassBorderBrush"] = ("#17FFFFFF", "#140B0D12"),
            ["SubtleBorderBrush"] = ("#17FFFFFF", "#140B0D12"),
            ["HoverBorderBrush"] = ("#29FFFFFF", "#290B0D12"),
            ["TextPrimaryBrush"] = ("#F5F7FA", "#0B0D12"),
            ["TextSecondaryBrush"] = ("#B6BDCC", "#464A53"),
            ["TextMutedBrush"] = ("#919BAD", "#616773"),
            ["AccentBrush"] = ("#4C82FF", "#2F6BFF"),
            ["AccentHoverBrush"] = ("#6B99FF", "#1F54E0"),
            ["AccentSubtleBrush"] = ("#244C82FF", "#1A2F6BFF"),
            ["AccentTextBrush"] = ("#FFFFFF", "#FFFFFF"),
            ["PrimaryBtnBgBrush"] = ("#4C82FF", "#2F6BFF"),
            ["PrimaryBtnFgBrush"] = ("#FFFFFF", "#FFFFFF"),
            ["SuccessBrush"] = ("#22C55E", "#0F9D58"),
            ["WarningBrush"] = ("#F59E0B", "#D97706"),
            ["DangerBrush"] = ("#EF4444", "#DC2626"),

            // Semantic aliases mapped to IPScans v2 palette
            ["AppBackgroundBrush"] = ("#07080B", "#FFFFFF"),
            ["SidebarBrush"] = ("#101218", "#F7F8FA"),
            ["CardBrush"] = ("#101218", "#FFFFFF"),
            ["CardBrushElevated"] = ("#181B23", "#F7F8FA"),
            ["CardBorderBrush"] = ("#17FFFFFF", "#140B0D12"),
            ["CardBorderHoverBrush"] = ("#29FFFFFF", "#290B0D12"),
            ["ControlFillBrush"] = ("#181B23", "#F1F3F5"),
            ["SubtleFillBrush"] = ("#181B23", "#F1F3F5"),
            ["AccentBrushHover"] = ("#6B99FF", "#1F54E0"),
            ["AccentPressedBrush"] = ("#2F6BFF", "#1D4ED8"),
            ["OnAccentBrush"] = ("#FFFFFF", "#FFFFFF"),
            ["DangerHoverBrush"] = ("#F87171", "#B91C1C"),
            ["DangerFillBrush"] = ("#24EF4444", "#1ADC2626"),
            ["SidebarItemSelectedBrush"] = ("#244C82FF", "#1A2F6BFF"),
            ["StatusOnlineBrush"] = ("#22C55E", "#0F9D58"),
            ["StatusBusyBrush"] = ("#F59E0B", "#D97706"),
        };

        foreach (var (key, value) in colors)
        {
            app.Resources[key] = new SolidColorBrush(Color.Parse(light ? value.Light : value.Dark));
        }

        var accentHex = light ? "#FF2F6BFF" : "#FF4C82FF";
        foreach (var key in new[]
        {
            "SystemAccentColor",
            "SystemAccentColorLight1",
            "SystemAccentColorLight2",
            "SystemAccentColorLight3",
            "SystemAccentColorDark1",
            "SystemAccentColorDark2",
            "SystemAccentColorDark3"
        })
        {
            app.Resources[key] = Color.Parse(accentHex);
        }
    }
}
