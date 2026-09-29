namespace IPCast.Shared;

/// <summary>
/// Resolves cross-platform locations for IPCast's persisted application data.
/// On Windows this is %APPDATA%\IPCast; on Linux/macOS (used for development/tests) it's the
/// platform's standard application-data folder plus "IPCast".
/// </summary>
public static class AppPaths
{
    public const string AppFolderName = "IPCast";

    /// <summary>
    /// Environment variable that, when set, overrides the resolved app-data directory.
    /// Only meant for running multiple independent "devices" side by side on one machine
    /// during development/testing - never required or read for normal end-user usage.
    /// </summary>
    public const string DataDirOverrideEnvVar = "IPCAST_DATA_DIR";

    public static string GetAppDataDirectory()
    {
        var overridePath = Environment.GetEnvironmentVariable(DataDirOverrideEnvVar);
        if (!string.IsNullOrWhiteSpace(overridePath))
        {
            return overridePath;
        }

        var basePath = Environment.GetFolderPath(
            Environment.SpecialFolder.ApplicationData,
            Environment.SpecialFolderOption.Create);

        return Path.Combine(basePath, AppFolderName);
    }
}
