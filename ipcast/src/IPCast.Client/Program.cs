using Avalonia;

namespace IPCast.Client;

internal static class Program
{
    // Avalonia requires a single-threaded apartment entry point and the app builder must not
    // use any Avalonia types before AppMain runs, so the initialization stays split like this.
    [STAThread]
    public static void Main(string[] args) => BuildAvaloniaApp()
        .StartWithClassicDesktopLifetime(args);

    public static AppBuilder BuildAvaloniaApp() =>
        AppBuilder.Configure<App>()
            .UsePlatformDetect()
            .WithInterFont()
            .LogToTrace();
}
