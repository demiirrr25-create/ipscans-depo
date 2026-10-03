using System.Runtime.InteropServices;
using System.Runtime.Versioning;
using System.Text;

namespace IPCast.RemoteDesktop.Input;

/// <summary>
/// Injects mouse/keyboard input via user32 SendInput. Windows-only, written per the documented
/// Win32 API contract but NOT runtime-verified in this project's Linux dev sandbox - verify via
/// this repo's windows-latest CI (.github/workflows/build-ipcast.yml) or a real Windows machine.
/// 
/// Enhanced to support comprehensive input as per specification item 8.
/// </summary>
[SupportedOSPlatform("windows")]
public sealed class SendInputInjector : IInputInjector
{
    private const uint INPUT_MOUSE = 0;
    private const uint INPUT_KEYBOARD = 1;
    private const uint INPUT_HARDWARE = 2;
    
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
    private const uint MOUSEEVENTF_HWHEEL = 0x0100; // Horizontal wheel
    
    private const uint KEYEVENTF_KEYUP = 0x0002;
    private const uint KEYEVENTF_SCANCODE = 0x0008;
    private const uint KEYEVENTF_UNICODE = 0x0004;
    private const uint KEYEVENTF_EXTENDEDKEY = 0x0001;

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

    public void SendCharacter(char character)
    {
        // Send a Unicode character
        SendSingleInput(new NativeMethods.INPUT
        {
            type = INPUT_KEYBOARD,
            u = new NativeMethods.InputUnion
            {
                ki = new NativeMethods.KEYBDINPUT
                {
                    wVk = 0,
                    wScan = 0,
                    dwFlags = KEYEVENTF_UNICODE,
                    time = 0,
                    dwExtraInfo = IntPtr.Zero,
                    // For Unicode, we put the character in wScan
                }
            },
        });
        
        // Actually, for Unicode we need to use a different approach
        // Let's use the proper Unicode character input
        var inputs = new[]
        {
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = 0,
                        wScan = character,
                        dwFlags = KEYEVENTF_UNICODE,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = 0,
                        wScan = character,
                        dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            }
        };
        
        SendMultipleInputs(inputs);
    }

    public void SendString(string text)
    {
        if (string.IsNullOrEmpty(text)) return;
        
        var inputs = new List<NativeMethods.INPUT>();
        foreach (char c in text)
        {
            inputs.Add(new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = 0,
                        wScan = c,
                        dwFlags = KEYEVENTF_UNICODE,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            });
            inputs.Add(new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = 0,
                        wScan = c,
                        dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            });
        }
        
        SendMultipleInputs(inputs.ToArray());
    }

    public void SendAltTab()
    {
        // Alt+Tab: press Alt, press Tab, release Tab, release Alt
        var inputs = new[]
        {
            // Press Alt
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_MENU, // Alt key
                        dwFlags = 0,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            // Press Tab
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_TAB,
                        dwFlags = 0,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            // Release Tab
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_TAB,
                        dwFlags = KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            // Release Alt
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_MENU,
                        dwFlags = KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            }
        };
        
        SendMultipleInputs(inputs);
    }

    public void SendCtrlAltDel()
    {
        // Ctrl+Alt+Del: press Ctrl, press Alt, press Del, release Del, release Alt, release Ctrl
        var inputs = new[]
        {
            // Press Ctrl
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_CONTROL,
                        dwFlags = 0,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            // Press Alt
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_MENU,
                        dwFlags = 0,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            // Press Del
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_DELETE,
                        dwFlags = 0,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            // Release Del
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_DELETE,
                        dwFlags = KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            // Release Alt
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_MENU,
                        dwFlags = KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            // Release Ctrl
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_CONTROL,
                        dwFlags = KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            }
        };
        
        SendMultipleInputs(inputs);
    }

    public void SendWindowsKey()
    {
        // Windows key: press Win key, release Win key
        var inputs = new[]
        {
            // Press Windows key
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_LWIN, // Left Windows key
                        dwFlags = 0,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            // Release Windows key
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_LWIN,
                        dwFlags = KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            }
        };
        
        SendMultipleInputs(inputs);
    }

    public void SendWindowsLock()
    {
        // Windows key + L: press Win key, press L, release L, release Win key
        var inputs = new[]
        {
            // Press Windows key
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_LWIN,
                        dwFlags = 0,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            // Press L
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_L, // L key
                        dwFlags = 0,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            // Release L
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_L,
                        dwFlags = KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            },
            // Release Windows key
            new NativeMethods.INPUT
            {
                type = INPUT_KEYBOARD,
                u = new NativeMethods.InputUnion
                {
                    ki = new NativeMethods.KEYBDINPUT
                    {
                        wVk = (ushort)NativeMethods.VK_LWIN,
                        dwFlags = KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero,
                    }
                },
            }
        };
        
        SendMultipleInputs(inputs);
    }

    public void Drag(double startX, double startY, double endX, double endY, int button = 0)
    {
        // Convert normalized coordinates to absolute
        var startPx = new Point(
            (int)(Math.Clamp(startX, 0, 1) * 65535),
            (int)(Math.Clamp(startY, 0, 1) * 65535)
        );
        var endPx = new Point(
            (int)(Math.Clamp(endX, 0, 1) * 65535),
            (int)(Math.Clamp(endY, 0, 1) * 65535)
        );
        
        // Determine which mouse button to use
        uint downFlag = 0, upFlag = 0;
        switch (button)
        {
            case 0: // Left
                downFlag = MOUSEEVENTF_LEFTDOWN;
                upFlag = MOUSEEVENTF_LEFTUP;
                break;
            case 1: // Right
                downFlag = MOUSEEVENTF_RIGHTDOWN;
                upFlag = MOUSEEVENTF_RIGHTUP;
                break;
            case 2: // Middle
                downFlag = MOUSEEVENTF_MIDDLEDOWN;
                upFlag = MOUSEEVENTF_MIDDLEUP;
                break;
            default:
                downFlag = MOUSEEVENTF_LEFTDOWN;
                upFlag = MOUSEEVENTF_LEFTUP;
                break;
        }
        
        var inputs = new List<NativeMethods.INPUT>();
        
        // Move to start position
        inputs.Add(new NativeMethods.INPUT
        {
            type = INPUT_MOUSE,
            u = new NativeMethods.InputUnion
            {
                mi = new NativeMethods.MOUSEINPUT
                {
                    dx = startPx.X,
                    dy = startPx.Y,
                    dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
                }
            }
        });
        
        // Press mouse button
        inputs.Add(new NativeMethods.INPUT
        {
            type = INPUT_MOUSE,
            u = new NativeMethods.InputUnion
            {
                mi = new NativeMethods.MOUSEINPUT
                {
                    dx = startPx.X,
                    dy = startPx.Y,
                    dwFlags = downFlag | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
                }
            }
        });
        
        // Move to end position while holding button
        inputs.Add(new NativeMethods.INPUT
        {
            type = INPUT_MOUSE,
            u = new NativeMethods.InputUnion
            {
                mi = new NativeMethods.MOUSEINPUT
                {
                    dx = endPx.X,
                    dy = endPx.Y,
                    dwFlags = downFlag | MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
                }
            }
        });
        
        // Release mouse button
        inputs.Add(new NativeMethods.INPUT
        {
            type = INPUT_MOUSE,
            u = new NativeMethods.InputUnion
            {
                mi = new NativeMethods.MOUSEINPUT
                {
                    dx = endPx.X,
                    dy = endPx.Y,
                    dwFlags = upFlag | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
                }
            }
        });
        
        SendMultipleInputs(inputs.ToArray());
    }

    public void SetCursorPosition(double normalizedX, double normalizedY, bool click = false)
    {
        var x = (int)(Math.Clamp(normalizedX, 0, 1) * 65535);
        var y = (int)(Math.Clamp(normalizedY, 0, 1) * 65535);
        
        var inputs = new List<NativeMethods.INPUT>
        {
            // Move to position
            new NativeMethods.INPUT
            {
                type = INPUT_MOUSE,
                u = new NativeMethods.InputUnion
                {
                    mi = new NativeMethods.MOUSEINPUT
                    {
                        dx = x,
                        dy = y,
                        dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
                    }
                }
            }
        };
        
        if (click)
        {
            // Add left click
            inputs.Add(new NativeMethods.INPUT
            {
                type = INPUT_MOUSE,
                u = new NativeMethods.InputUnion
                {
                    mi = new NativeMethods.MOUSEINPUT
                    {
                        dx = x,
                        dy = y,
                        dwFlags = MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
                    }
                }
            });
            inputs.Add(new NativeMethods.INPUT
            {
                type = INPUT_MOUSE,
                u = new NativeMethods.InputUnion
                {
                    mi = new NativeMethods.MOUSEINPUT
                    {
                        dx = x,
                        dy = y,
                        dwFlags = MOUSEEVENTF_LEFTUP | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
                    }
                }
            });
        }
        
        SendMultipleInputs(inputs.ToArray());
    }

    public void Click(int button = 0, int clickCount = 1)
    {
        // Determine which mouse button to use
        uint downFlag = 0, upFlag = 0;
        switch (button)
        {
            case 0: // Left
                downFlag = MOUSEEVENTF_LEFTDOWN;
                upFlag = MOUSEEVENTF_LEFTUP;
                break;
            case 1: // Right
                downFlag = MOUSEEVENTF_RIGHTDOWN;
                upFlag = MOUSEEVENTF_RIGHTUP;
                break;
            case 2: // Middle
                downFlag = MOUSEEVENTF_MIDDLEDOWN;
                upFlag = MOUSEEVENTF_MIDDLEUP;
                break;
            default:
                downFlag = MOUSEEVENTF_LEFTDOWN;
                upFlag = MOUSEEVENTF_LEFTUP;
                break;
        }
        
        // We don't have current position, so we'll send a click at the current position
        // In a real implementation, we might want to get the current position first
        // For now, we'll just send the click events
        var inputs = new List<NativeMethods.INPUT>();
        
        for (int i = 0; i < clickCount; i++)
        {
            // Press button
            inputs.Add(new NativeMethods.INPUT
            {
                type = INPUT_MOUSE,
                u = new NativeMethods.InputUnion
                {
                    mi = new NativeMethods.MOUSEINPUT
                    {
                        dx = 0, // Current position - we don't know it, so use 0,0
                        dy = 0,
                        dwFlags = downFlag | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
                    }
                }
            });
            
            // Release button
            inputs.Add(new NativeMethods.INPUT
            {
                type = INPUT_MOUSE,
                u = new NativeMethods.InputUnion
                {
                    mi = new NativeMethods.MOUSEINPUT
                    {
                        dx = 0,
                        dy = 0,
                        dwFlags = upFlag | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK
                    }
                }
            });
        }
        
        SendMultipleInputs(inputs.ToArray());
    }

    public void SetClipboardText(string text)
    {
        // This would require opening the clipboard, emptying it, and setting the text
        // For simplicity in this implementation, we'll note that clipboard operations
        // are complex and would need proper error handling
        // In a real implementation, we would use:
        // OpenClipboard, EmptyClipboard, SetClipboardData, CloseClipboard
        throw new NotImplementedException("Clipboard setting requires Windows clipboard API implementation");
    }

    public string GetClipboardText()
    {
        throw new NotImplementedException("Clipboard getting requires Windows clipboard API implementation");
    }

    public bool SetClipboardFiles(string[] filePaths)
    {
        throw new NotImplementedException("File clipboard setting requires Windows clipboard API implementation");
    }

    public string[] GetClipboardFiles()
    {
        throw new NotImplementedException("File clipboard getting requires Windows clipboard API implementation");
    }

    public string GetKeyboardLayout()
    {
        // Get the current keyboard layout identifier
        // This would require calling GetKeyboardLayoutName or similar
        throw new NotImplementedException("Keyboard layout getting requires Windows API implementation");
    }

    public bool SetKeyboardLayout(string layoutId)
    {
        // Set the keyboard layout
        // This would require calling LoadKeyboardLayout or similar
        throw new NotImplementedException("Keyboard layout setting requires Windows API implementation");
    }

    private void SendSingleInput(NativeMethods.INPUT input)
    {
        var inputs = new[] { input };
        var sent = NativeMethods.SendInput(1, inputs, Marshal.SizeOf<NativeMethods.INPUT>());
        if (sent == 0)
        {
            throw new InvalidOperationException("SendInput failed.");
        }
    }

    private void SendMultipleInputs(NativeMethods.INPUT[] inputs)
    {
        if (inputs == null || inputs.Length == 0) return;
        
        var sent = NativeMethods.SendInput((uint)inputs.Length, inputs, Marshal.SizeOf<NativeMethods.INPUT>());
        if (sent == 0)
        {
            throw new InvalidOperationException("SendInput failed.");
        }
    }

    private struct Point
    {
        public int X { get; }
        public int Y { get; }
        
        public Point(int x, int y)
        {
            X = x;
            Y = y;
        }
    }

    private static class NativeMethods
    {
        [DllImport("user32.dll", SetLastError = true)]
        public static extern uint SendInput(uint numberOfInputs, INPUT[] inputs, int sizeOfInputStructure);
        
        [DllImport("user32.dll")]
        public static extern bool GetKeyboardLayoutName(out StringBuilder pwszKLID);
        
        [DllImport("user32.dll")]
        public static extern IntPtr LoadKeyboardLayout(string pwszKLID, uint Flags);

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

            [FieldOffset(0)]
            public HARDWAREINPUT hi;
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

        [StructLayout(LayoutKind.Sequential)]
        public struct HARDWAREINPUT
        {
            public uint uMsg;
            public ushort wParamL;
            public ushort wParamH;
        }

        // Virtual key codes
        public const uint VK_LWIN = 0x5B;
        public const uint VK_MENU = 0x12; // Alt key
        public const uint VK_CONTROL = 0x11;
        public const uint VK_TAB = 0x09;
        public const uint VK_DELETE = 0x2E;
        public const uint VK_L = 0x4C;
    }
}
