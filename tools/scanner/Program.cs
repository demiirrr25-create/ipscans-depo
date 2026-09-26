using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace IpscansScanner
{
    internal static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }

    // ---- Theme (matches ipscans.com: pure black bg, white text, minimal) ----
    internal static class Theme
    {
        public static readonly Color Bg = Color.Black;
        public static readonly Color Hairline = Color.FromArgb(38, 38, 38);
        public static readonly Color Text = Color.White;
        public static readonly Color Muted = Color.FromArgb(150, 150, 150);
        public static readonly Color Faint = Color.FromArgb(90, 90, 90);

        public static GraphicsPath Round(Rectangle r, int radius)
        {
            var path = new GraphicsPath();
            int d = radius * 2;
            path.AddArc(r.X, r.Y, d, d, 180, 90);
            path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    // ---- Rounded, flat primary button (white bg / black text) ----
    internal sealed class RoundButton : Button
    {
        private bool _hover;
        public int Radius = 12;
        public Color Fill = Color.White;
        public Color FillHover = Color.FromArgb(228, 228, 228);
        public Color FillDisabled = Color.FromArgb(60, 60, 60);
        public Color TextColor = Color.Black;

        public RoundButton()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer | ControlStyles.SupportsTransparentBackColor, true);
            FlatStyle = FlatStyle.Flat;
            FlatAppearance.BorderSize = 0;
            BackColor = Theme.Bg;
            Cursor = Cursors.Hand;
            Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
        }

        protected override void OnMouseEnter(EventArgs e) { _hover = true; Invalidate(); base.OnMouseEnter(e); }
        protected override void OnMouseLeave(EventArgs e) { _hover = false; Invalidate(); base.OnMouseLeave(e); }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
            g.Clear(Parent != null ? Parent.BackColor : Theme.Bg);
            var r = new Rectangle(0, 0, Width - 1, Height - 1);
            using (var path = Theme.Round(r, Radius))
            {
                Color fill = !Enabled ? FillDisabled : (_hover ? FillHover : Fill);
                using (var b = new SolidBrush(fill)) g.FillPath(b, path);
            }
            TextRenderer.DrawText(g, Text, Font, r,
                Enabled ? TextColor : Color.FromArgb(160, 160, 160),
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        }
    }

    // ---- Thin monochrome progress bar ----
    internal sealed class ThinProgress : Control
    {
        private double _p;
        public double Progress
        {
            get { return _p; }
            set { _p = Math.Max(0, Math.Min(1, value)); Invalidate(); }
        }

        public ThinProgress()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer, true);
            Height = 6;
            BackColor = Theme.Bg;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(BackColor);
            var track = new Rectangle(0, (Height - 6) / 2, Width - 1, 6);
            using (var p = Theme.Round(track, 3))
            using (var b = new SolidBrush(Theme.Hairline)) g.FillPath(b, p);
            int w = (int)((Width - 1) * _p);
            if (w > 6)
            {
                var fill = new Rectangle(0, (Height - 6) / 2, w, 6);
                using (var p = Theme.Round(fill, 3))
                using (var b = new SolidBrush(Color.White)) g.FillPath(b, p);
            }
        }
    }

    internal sealed class BufferedGrid : DataGridView
    {
        public BufferedGrid() { DoubleBuffered = true; }
    }

    internal sealed class MainForm : Form
    {
        private static readonly int[] Ports =
            { 21, 22, 23, 25, 53, 80, 110, 139, 143, 443, 445, 3306, 3389, 5432, 8080 };

        private readonly RoundButton _scanBtn;
        private readonly ThinProgress _progress;
        private readonly Label _status;
        private readonly Label _info;
        private readonly BufferedGrid _grid;
        private volatile bool _scanning;
        private string _baseIp;

        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int val, int size);

        public MainForm()
        {
            Text = "ipscans — Network Scanner";
            BackColor = Theme.Bg;
            ForeColor = Theme.Text;
            Font = new Font("Segoe UI", 9.5f);
            ClientSize = new Size(940, 660);
            MinimumSize = new Size(760, 520);
            StartPosition = FormStartPosition.CenterScreen;
            DoubleBuffered = true;

            var header = new HeaderPanel { Dock = DockStyle.Top, Height = 84 };
            var body = new Panel { Dock = DockStyle.Fill, BackColor = Theme.Bg, Padding = new Padding(28, 16, 28, 12) };

            var topBar = new Panel { Dock = DockStyle.Top, Height = 64, BackColor = Theme.Bg };
            _info = new Label
            {
                AutoSize = false,
                Dock = DockStyle.Fill,
                ForeColor = Theme.Muted,
                Font = new Font("Segoe UI", 9.5f),
                TextAlign = ContentAlignment.MiddleLeft,
                Text = "Yerel ağ tespit ediliyor…"
            };
            var btnHost = new Panel { Dock = DockStyle.Right, Width = 200, BackColor = Theme.Bg, Padding = new Padding(0, 9, 0, 9) };
            _scanBtn = new RoundButton { Text = "Taramayı Başlat", Dock = DockStyle.Fill };
            _scanBtn.Click += (s, e) => StartScan();
            btnHost.Controls.Add(_scanBtn);
            topBar.Controls.Add(_info);
            topBar.Controls.Add(btnHost);

            var progArea = new Panel { Dock = DockStyle.Top, Height = 40, BackColor = Theme.Bg, Padding = new Padding(0, 6, 0, 6) };
            _status = new Label { Dock = DockStyle.Bottom, Height = 18, ForeColor = Theme.Faint, Font = new Font("Segoe UI", 8.5f), Text = "" };
            _progress = new ThinProgress { Dock = DockStyle.Top, Height = 8 };
            progArea.Controls.Add(_status);
            progArea.Controls.Add(_progress);

            _grid = BuildGrid();
            var gridHost = new Panel { Dock = DockStyle.Fill, BackColor = Theme.Bg, Padding = new Padding(0, 8, 0, 0) };
            gridHost.Controls.Add(_grid);

            body.Controls.Add(gridHost);
            body.Controls.Add(progArea);
            body.Controls.Add(topBar);

            var footer = new Label
            {
                Dock = DockStyle.Bottom,
                Height = 34,
                ForeColor = Theme.Faint,
                Font = new Font("Segoe UI", 8.5f),
                TextAlign = ContentAlignment.MiddleCenter,
                Text = "ipscans.com  •  Yalnızca sahibi olduğun ağlarda kullan"
            };

            Controls.Add(body);
            Controls.Add(footer);
            Controls.Add(header);

            Load += (s, e) => { ApplyDarkTitleBar(); DetectNetwork(); };
        }

        private BufferedGrid BuildGrid()
        {
            var g = new BufferedGrid
            {
                Dock = DockStyle.Fill,
                BackgroundColor = Theme.Bg,
                BorderStyle = BorderStyle.None,
                EnableHeadersVisualStyles = false,
                RowHeadersVisible = false,
                AllowUserToAddRows = false,
                AllowUserToDeleteRows = false,
                AllowUserToResizeRows = false,
                ReadOnly = true,
                SelectionMode = DataGridViewSelectionMode.FullRowSelect,
                MultiSelect = false,
                GridColor = Theme.Hairline,
                CellBorderStyle = DataGridViewCellBorderStyle.SingleHorizontal,
                ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.DisableResizing,
                ColumnHeadersHeight = 38,
                AllowUserToResizeColumns = false
            };
            g.RowTemplate.Height = 34;
            g.DefaultCellStyle.BackColor = Theme.Bg;
            g.DefaultCellStyle.ForeColor = Theme.Text;
            g.DefaultCellStyle.SelectionBackColor = Color.FromArgb(22, 22, 22);
            g.DefaultCellStyle.SelectionForeColor = Theme.Text;
            g.DefaultCellStyle.Padding = new Padding(6, 0, 6, 0);
            g.DefaultCellStyle.Font = new Font("Segoe UI", 9.5f);
            g.ColumnHeadersDefaultCellStyle.BackColor = Theme.Bg;
            g.ColumnHeadersDefaultCellStyle.ForeColor = Theme.Faint;
            g.ColumnHeadersDefaultCellStyle.SelectionBackColor = Theme.Bg;
            g.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 8.5f, FontStyle.Bold);
            g.ColumnHeadersDefaultCellStyle.Padding = new Padding(6, 0, 6, 0);

            var ip = new DataGridViewTextBoxColumn { HeaderText = "IP ADRESİ" };
            var mac = new DataGridViewTextBoxColumn { HeaderText = "MAC" };
            var host = new DataGridViewTextBoxColumn { HeaderText = "CİHAZ ADI" };
            var ports = new DataGridViewTextBoxColumn { HeaderText = "AÇIK PORTLAR" };
            ip.FillWeight = 22; mac.FillWeight = 24; host.FillWeight = 28; ports.FillWeight = 26;
            ip.DefaultCellStyle.Font = new Font("Consolas", 10f);
            mac.DefaultCellStyle.Font = new Font("Consolas", 9.5f);
            mac.DefaultCellStyle.ForeColor = Theme.Muted;
            ports.DefaultCellStyle.Font = new Font("Consolas", 9.5f);
            foreach (var c in new DataGridViewColumn[] { ip, mac, host, ports })
            {
                c.AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill;
                c.SortMode = DataGridViewColumnSortMode.NotSortable;
                c.Resizable = DataGridViewTriState.False;
            }
            g.Columns.AddRange(ip, mac, host, ports);
            return g;
        }

        private void ApplyDarkTitleBar()
        {
            try
            {
                int on = 1;
                if (DwmSetWindowAttribute(Handle, 20, ref on, 4) != 0)
                    DwmSetWindowAttribute(Handle, 19, ref on, 4);
            }
            catch { }
        }

        private void DetectNetwork()
        {
            string ip = LocalIp();
            if (string.IsNullOrEmpty(ip))
            {
                _info.Text = "Yerel ağ tespit edilemedi.";
                _scanBtn.Enabled = false;
                return;
            }
            int idx = ip.LastIndexOf('.');
            _baseIp = idx > 0 ? ip.Substring(0, idx + 1) : null;
            _info.Text = "Yerel IP:  " + ip + "      •      Ağ:  " + _baseIp + "0/24";
        }

        private void StartScan()
        {
            if (_scanning || string.IsNullOrEmpty(_baseIp)) return;
            _scanning = true;
            _scanBtn.Enabled = false;
            _scanBtn.Text = "Taranıyor…";
            _grid.Rows.Clear();
            _progress.Progress = 0;
            _status.Text = "Canlı cihazlar aranıyor…";
            new Thread(RunScan) { IsBackground = true }.Start();
        }

        private void RunScan()
        {
            var sw = Stopwatch.StartNew();
            try
            {
                var live = new ConcurrentBag<string>();
                int done = 0;
                Parallel.For(1, 255, new ParallelOptions { MaxDegreeOfParallelism = 64 }, i =>
                {
                    string ip = _baseIp + i;
                    try
                    {
                        using (var ping = new Ping())
                        {
                            var reply = ping.Send(ip, 600);
                            if (reply != null && reply.Status == IPStatus.Success) live.Add(ip);
                        }
                    }
                    catch { }
                    int d = Interlocked.Increment(ref done);
                    if (d % 8 == 0) UI(() => _progress.Progress = d / 254.0 * 0.5);
                });

                var hosts = live.OrderBy(ip => int.Parse(ip.Split('.').Last())).ToList();
                var arp = LoadArpTable();
                UI(() => _status.Text = hosts.Count + " canlı cihaz bulundu — portlar taranıyor…");

                for (int i = 0; i < hosts.Count; i++)
                {
                    string ip = hosts[i];
                    string host = ResolveHost(ip);
                    string mac = arp.ContainsKey(ip) ? arp[ip] : "—";
                    string open = ScanPorts(ip);
                    double frac = 0.5 + (hosts.Count == 0 ? 0.5 : (i + 1.0) / hosts.Count * 0.5);
                    UI(() =>
                    {
                        _grid.Rows.Add(ip, mac, host, open);
                        _progress.Progress = frac;
                    });
                }

                sw.Stop();
                int count = hosts.Count;
                UI(() =>
                {
                    _progress.Progress = 1;
                    _status.Text = count + " cihaz  •  " + sw.Elapsed.TotalSeconds.ToString("0.0") + " sn'de tamamlandı";
                });
            }
            catch (Exception ex)
            {
                UI(() => _status.Text = "Hata: " + ex.Message);
            }
            finally
            {
                UI(() =>
                {
                    _scanning = false;
                    _scanBtn.Enabled = true;
                    _scanBtn.Text = "Yeniden Tara";
                });
            }
        }

        private void UI(Action a)
        {
            if (!IsHandleCreated) return;
            try { BeginInvoke(a); } catch { }
        }

        private static string ScanPorts(string ip)
        {
            var open = new List<int>();
            Parallel.ForEach(Ports, new ParallelOptions { MaxDegreeOfParallelism = 16 }, port =>
            {
                try
                {
                    using (var client = new TcpClient())
                    {
                        var connect = client.BeginConnect(ip, port, null, null);
                        if (connect.AsyncWaitHandle.WaitOne(500) && client.Connected)
                        {
                            client.EndConnect(connect);
                            lock (open) open.Add(port);
                        }
                    }
                }
                catch { }
            });
            open.Sort();
            return open.Count == 0 ? "—" : string.Join(", ", open);
        }

        private static string LocalIp()
        {
            try
            {
                foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (ni.OperationalStatus != OperationalStatus.Up) continue;
                    if (ni.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                    foreach (var ua in ni.GetIPProperties().UnicastAddresses)
                    {
                        if (ua.Address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ua.Address))
                        {
                            string s = ua.Address.ToString();
                            if (!s.StartsWith("169.254")) return s;
                        }
                    }
                }
            }
            catch { }
            return null;
        }

        private static string ResolveHost(string ip)
        {
            try
            {
                var entry = Dns.GetHostEntry(ip);
                return string.IsNullOrEmpty(entry.HostName) ? "—" : entry.HostName.Split('.')[0];
            }
            catch { return "—"; }
        }

        private static Dictionary<string, string> LoadArpTable()
        {
            var map = new Dictionary<string, string>();
            try
            {
                var psi = new ProcessStartInfo("arp", "-a")
                {
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (var p = Process.Start(psi))
                {
                    string output = p.StandardOutput.ReadToEnd();
                    p.WaitForExit();
                    foreach (var line in output.Split('\n'))
                    {
                        var parts = line.Trim().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 2 && parts[0].Count(c => c == '.') == 3 && parts[1].Contains("-"))
                            map[parts[0]] = parts[1].ToUpper();
                    }
                }
            }
            catch { }
            return map;
        }
    }

    // ---- Header with ipscans logo + titles (custom painted) ----
    internal sealed class HeaderPanel : Panel
    {
        public HeaderPanel()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint |
                     ControlStyles.OptimizedDoubleBuffer, true);
            BackColor = Theme.Bg;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
            g.Clear(Theme.Bg);

            int pad = 28;
            var logo = new Rectangle(pad, (Height - 38) / 2, 38, 38);
            using (var p = Theme.Round(logo, 10))
            using (var b = new SolidBrush(Color.White)) g.FillPath(b, p);
            using (var f = new Font("Segoe UI", 12f, FontStyle.Bold))
                TextRenderer.DrawText(g, "ip", f, logo, Color.Black,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);

            int tx = logo.Right + 12;
            using (var f = new Font("Segoe UI", 15f, FontStyle.Bold))
                TextRenderer.DrawText(g, "ipscans", f, new Point(tx, (Height / 2) - 22), Theme.Text);
            using (var f = new Font("Segoe UI", 9f))
                TextRenderer.DrawText(g, "Ağ Tarayıcı  ·  Network Scanner", f, new Point(tx + 1, (Height / 2) + 3), Theme.Muted);

            using (var pen = new Pen(Theme.Hairline))
                g.DrawLine(pen, 0, Height - 1, Width, Height - 1);
        }
    }
}
