using System.Globalization;
using System.Text.RegularExpressions;

namespace Accounting;

internal static partial class Money
{
    internal const long MaxCents = 99_999_999;

    [GeneratedRegex(@"\A[0-9]{1,6}(?:\.[0-9]{1,2})?\z", RegexOptions.CultureInvariant)]
    private static partial Regex AmountPattern();

    internal static long Parse(string raw)
    {
        var text = raw.Trim();
        if (!AmountPattern().IsMatch(text))
        {
            throw new AmountException("use an unsigned amount with at most 6 digits and 2 decimal places");
        }
        var parts = text.Split('.');
        var fraction = parts.Length == 2 ? parts[1].PadRight(2, '0') : "00";
        var cents = long.Parse(parts[0], CultureInfo.InvariantCulture) * 100
            + long.Parse(fraction, CultureInfo.InvariantCulture);
        if (cents == 0)
        {
            throw new AmountException("the amount must be greater than zero");
        }
        return cents;
    }

    internal static string Format(long cents)
    {
        RequireBalance(cents);
        return (cents / 100).ToString(CultureInfo.InvariantCulture) + "."
            + (cents % 100).ToString("D2", CultureInfo.InvariantCulture);
    }

    internal static void RequireBalance(long cents)
    {
        if (cents < 0 || cents > MaxCents)
        {
            throw new ArgumentOutOfRangeException(nameof(cents), "Balance is outside the PIC 9(6)V99 range.");
        }
    }
}

internal sealed class AmountException(string message) : Exception(message);
