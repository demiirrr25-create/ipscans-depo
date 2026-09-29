namespace IPCast.Shared;

/// <summary>
/// A validated 9-digit IPCast device identifier (e.g. "847293615", displayed as "847 293 615").
/// </summary>
public readonly struct DeviceId : IEquatable<DeviceId>
{
    public const int DigitCount = 9;

    private readonly string _digits;

    private DeviceId(string digits)
    {
        _digits = digits;
    }

    /// <summary>Raw 9-digit form, e.g. "847293615".</summary>
    public string Raw => _digits;

    /// <summary>Grouped-by-3 display form, e.g. "847 293 615".</summary>
    public string Formatted => $"{_digits[..3]} {_digits[3..6]} {_digits[6..9]}";

    public static bool TryParse(string? input, out DeviceId deviceId)
    {
        deviceId = default;
        if (string.IsNullOrWhiteSpace(input))
        {
            return false;
        }

        Span<char> digits = stackalloc char[DigitCount];
        var count = 0;
        foreach (var c in input)
        {
            if (char.IsWhiteSpace(c) || c == '-')
            {
                continue;
            }

            if (!char.IsAsciiDigit(c) || count == DigitCount)
            {
                return false;
            }

            digits[count++] = c;
        }

        if (count != DigitCount)
        {
            return false;
        }

        // First digit can't be 0, otherwise the value wouldn't round-trip as a 9-digit number.
        if (digits[0] == '0')
        {
            return false;
        }

        deviceId = new DeviceId(new string(digits));
        return true;
    }

    /// <summary>Creates a DeviceId from a value already known to be a valid 9-digit number (e.g. from generation or storage).</summary>
    public static DeviceId FromValidatedRaw(string rawDigits)
    {
        if (!TryParse(rawDigits, out var deviceId))
        {
            throw new ArgumentException($"'{rawDigits}' is not a valid {DigitCount}-digit device id.", nameof(rawDigits));
        }

        return deviceId;
    }

    public bool Equals(DeviceId other) => _digits == other._digits;

    public override bool Equals(object? obj) => obj is DeviceId other && Equals(other);

    public override int GetHashCode() => _digits?.GetHashCode() ?? 0;

    public override string ToString() => Formatted;

    public static bool operator ==(DeviceId left, DeviceId right) => left.Equals(right);

    public static bool operator !=(DeviceId left, DeviceId right) => !left.Equals(right);
}
