using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Accounting;

internal sealed partial class AccountStore
{
    private const long OpeningBalanceCents = 100_000;
    private readonly string file = Path.GetFullPath(
        Environment.GetEnvironmentVariable("ACCOUNT_STORE") ?? "build/dotnet-account.cents");
    private string ParentDirectory => Path.GetDirectoryName(file)
        ?? throw new InvalidOperationException("The account store must have a parent directory.");

    [GeneratedRegex(@"\A(?:0|[1-9][0-9]{0,7})\n?\z", RegexOptions.CultureInvariant)]
    private static partial Regex StoredCentsPattern();

    internal long ReadBalance()
    {
        string text;
        try
        {
            using var input = File.OpenRead(file);
            // Read one byte beyond the eight-digit, optional-LF contract without BOM sniffing.
            Span<byte> bytes = stackalloc byte[10];
            var count = input.ReadAtLeast(bytes, bytes.Length, throwOnEndOfStream: false);
            if (count > 9)
            {
                throw new InvalidDataException("Account store exceeds the 9-byte UTF-8 contract.");
            }
            text = new UTF8Encoding(false, true).GetString(bytes[..count]);
        }
        catch (FileNotFoundException)
        {
            return OpeningBalanceCents;
        }
        catch (DirectoryNotFoundException)
        {
            // A file blocking an ancestor path is not a missing, new account.
            Directory.CreateDirectory(ParentDirectory);
            return OpeningBalanceCents;
        }
        // L-09: only an absent store is new; corruption must never reset the account.
        if (!StoredCentsPattern().IsMatch(text))
        {
            throw new InvalidDataException("Account store must contain integer cents between 0 and 99999999.");
        }
        return long.Parse(text.TrimEnd('\n'), CultureInfo.InvariantCulture);
    }

    internal void WriteBalance(long cents)
    {
        Money.RequireBalance(cents);
        var directory = ParentDirectory;
        Directory.CreateDirectory(directory);
        var temporary = Path.Combine(directory, $".account-{Guid.NewGuid():N}.tmp");
        try
        {
            File.WriteAllText(temporary, cents.ToString(CultureInfo.InvariantCulture) + "\n",
                new UTF8Encoding(false, true));
            File.Move(temporary, file, overwrite: true);
        }
        finally
        {
            File.Delete(temporary);
        }
    }
}
