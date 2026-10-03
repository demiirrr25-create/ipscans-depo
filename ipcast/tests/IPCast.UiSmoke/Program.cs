using Avalonia;
using Avalonia.Headless;
using Avalonia.Threading;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Media.Imaging;
using IPCast.Client;
using IPCast.Client.ViewModels;
using IPCast.Client.Views;
using IPCast.Network;
using IPCast.Shared;

var output = Path.GetFullPath(args.FirstOrDefault() ?? "ui-smoke-output");
Directory.CreateDirectory(output);
Environment.SetEnvironmentVariable("IPCAST_DATA_DIR", Path.Combine(output, "profile"));
Environment.SetEnvironmentVariable("IPCAST_DISCOVERY_PORT", "0");
AppBuilder.Configure<App>().UseSkia().WithInterFont().UseHeadless(new AvaloniaHeadlessPlatformOptions { UseHeadlessDrawing = false }).SetupWithoutStarting();
var vm = new MainWindowViewModel { CheckUpdatesOnStartup = false };
vm.NetworkService.RelayServerAddress = null;
var window = new MainWindow { DataContext = vm, Width = 1180, Height = 780 };
window.Show(); Dispatcher.UIThread.RunJobs();
void Check(bool condition, string message) { if (!condition) throw new Exception(message); Console.WriteLine("PASS " + message); }
void Render(Window target, string name)
{
    Dispatcher.UIThread.RunJobs();
    using var frame = target.CaptureRenderedFrame(); Check(frame is not null, name + " rendered");
    frame!.Save(Path.Combine(output, name + ".png"), PngBitmapEncoderOptions.Default);
}
Render(window, "home-dark");
foreach (var (name,id,group,tags) in new[] { ("Office workstation","123456789","Work","design, windows"), ("Studio PC","234567891","Work","video"), ("Home laptop","345678912","Personal","laptop"), ("Support desk","456789123","Clients","support") })
{
    vm.NewFavoriteName = name; vm.NewFavoriteIdInput = id; vm.NewFavoriteGroup = group; vm.NewFavoriteTags = tags; vm.AddFavoriteCommand.Execute(null);
}
vm.Navigate(NavSection.MyDevices); Render(window, "address-book-dark");
vm.DeviceQuery = "design"; Check(vm.FilteredDevices.Count == 1 && vm.FilteredDevices[0].Name == "Office workstation", "tag search filters devices");
vm.DeviceQuery = ""; vm.SelectedDeviceGroup = "Work"; Check(vm.FilteredDevices.Count == 2, "group filters devices");
vm.DeviceSort = "ID"; Check(vm.FilteredDevices[0].DeviceId == "123456789", "ID sort is stable");
vm.SelectedDeviceGroup = "All groups"; vm.DeviceSort = "Name";
vm.Navigate(NavSection.Settings);
foreach (var category in vm.SettingsCategories)
{
    vm.SettingsCategory = category; Check(vm.HasVisibleSettings, category + " settings visible"); Render(window, "settings-" + category.ToLowerInvariant());
}
vm.SettingsQuery = "does-not-exist"; Check(!vm.HasVisibleSettings, "settings empty search state");
vm.SettingsQuery = "recording"; Check(vm.ShowRecordingSettings, "cross-category settings search"); vm.SettingsQuery = "";
vm.Theme = "Light"; vm.SettingsCategory = "General"; Render(window, "settings-light");
vm.Navigate(NavSection.MyDevices); Render(window, "address-book-light");
vm.Navigate(NavSection.Home); Render(window, "home-light");
window.Width = 880; window.Height = 560; Render(window, "home-small");
vm.Theme = "Dark";
var incoming = new IncomingConnectionWindow(new IncomingConnectionRequest(DeviceId.FromValidatedRaw("123456789"), PermissionProfiles.ForName("Full access")));
incoming.Show(); Render(incoming, "incoming");
incoming.FindControl<ComboBox>("ProfileSelector")!.SelectedItem = "Full access";
incoming.FindControl<ComboBox>("ProfileSelector")!.SelectedItem = "Screen sharing";
Check(incoming.FindControl<CheckBox>("TunnelCheck")!.IsChecked == false && incoming.FindControl<CheckBox>("RemoteRestartCheck")!.IsChecked == false, "profile switch clears advanced permissions");
incoming.Close();
var remote = new RemoteScreenWindow(); remote.Show(); Render(remote, "session-toolbar"); remote.Close();
window.Close(); Dispatcher.UIThread.RunJobs();
await vm.ShutdownAsync();
Console.WriteLine("All UI smoke checks passed.");
