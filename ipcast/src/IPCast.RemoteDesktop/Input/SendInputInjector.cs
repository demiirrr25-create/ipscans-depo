using System.Runtime.InteropServices;
using System.Runtime.Versioning;

namespace IPCast.RemoteDesktop.Input;

/// <summary>
/// Injects mouse/keyboard input via user32 SendInput. Windows-only, written per the documented
/// Win32 API contract but NOT runtime-verified in this project's Linux dev sandbox - verify via
/// this repo's windows-latest CI (.github/workflows/build-ipcast.yml) or a real Windows machine.
/// </summary>
[SupportedOSPlatform("windows")]
public sealed class SendInputInjector : IInputInjector
{
    private const uint INPUT_MOUSE = 0;
    private const uint INPUT_KEYBOARD = 1;
    private const uint MOUSEEVENTF_MOVE = 0x0001;
    private const uint MOUSEEVENTF_ABSOLUTE = 0x8000;
    private const uint MOUSEEVENTF_VIRTUALDESK = 0x4000;
    private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    private const uint MOUSEEVENTF_LEFTUP = 0x0004;
    private const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    private const uint MOUSEEVENTF_RIGHTUP = 0x0010;
    private const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
    private const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
    private const uint MOUSEEVENTF_WHEEL = 0x0800;
    private const uint KEYEVENTF_KEYUP = 0x0002;

    public SendInputInjector()
    {
        if (!OperatingSystem.IsWindows())
        {
            throw new PlatformNotSupportedException($"{nameof(SendInputInjector)} requires Windows.");
        }
    }

    public void MoveMouse(double normalizedX, double normalizedY)
    {
        // SendInput's MOUSEEVENTF_ABSOLUTE coordinate space is always 0-65535 across the whole screen.
        var x = (int)(Math.Clamp(normalizedX, 0, 1) * 65535);
        var y = (int)(Math.Clamp(normalizedY, 0, 1) * 65535);

        SendSingleInput(new NativeMethods.INPUT
        {
            type = INPUT_MOUSE,
            u = new NativeMethods.InputUnion
            {
                mi = new NativeMethods.MOUSEINPUT { dx = x, dy = y, dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK },
            },
        });
    }

    public void MouseButton(int button, bool isDown)
    {
        var flag = (button, isDown) switch
        {
            (0, true) => MOUSEEVENTF_LEFTDOWN,
            (0, false) => MOUSEEVENTF_LEFTUP,
            (1, true) => MOUSEEVENTF_RIGHTDOWN,
            (1, false) => MOUSEEVENTF_RIGHTUP,
            (2, true) => MOUSEEVENTF_MIDDLEDOWN,
            (2, false) => MOUSEEVENTF_MIDDLEUP,
            _ => 0u,
        };

        if (flag == 0)
        {
            return;
        }

        SendSingleInput(new NativeMethods.INPUT
        {
            type = INPUT_MOUSE,
            u = new NativeMethods.InputUnion { mi = new NativeMethods.MOUSEINPUT { dwFlags = flag } },
        });
    }

    public void MouseWheel(int delta) =>
        SendSingleInput(new NativeMethods.INPUT
        {
            type = INPUT_MOUSE,
            u = new NativeMethods.InputUnion { mi = new NativeMethods.MOUSEINPUT { dwFlags = MOUSEEVENTF_WHEEL, mouseData = unchecked((uint)delta) } },
        });

    public void KeyEvent(int virtualKeyCode, bool isDown) =>
        SendSingleInput(new NativeMethods.INPUT
        {
            type = INPUT_KEYBOARD,
            u = new NativeMethods.InputUnion
            {
                ki = new NativeMethods.KEYBDINPUT { wVk = (ushort)virtualKeyCode, dwFlags = isDown ? 0u : KEYEVENTF_KEYUP },
            },
        });

    private static void SendSingleInput(NativeMethods.INPUT input)
    {
        var inputs = new[] { input };
        var sent = NativeMethods.SendInput(1, inputs, Marshal.SizeOf<NativeMethods.INPUT>());
        if (sent == 0)
        {
            throw new InvalidOperationException("SendInput failed.");
        }
    }

    private static class NativeMethods
    {
        [DllImport("user32.dll", SetLastError = true)]
        public static extern uint SendInput(uint numberOfInputs, INPUT[] inputs, int sizeOfInputStructure);

        [StructLayout(LayoutKind.Sequential)]
        public struct INPUT
        {
            public uint type;
            public InputUnion u;
        }

        [StructLayout(LayoutKind.Explicit)]
        public struct InputUnion
        {
            [FieldOffset(0)]
            public MOUSEINPUT mi;

            [FieldOffset(0)]
            public KEYBDINPUT ki;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct MOUSEINPUT
        {
            public int dx;
            public int dy;
            public uint mouseData;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct KEYBDINPUT
        {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }
    }
}
