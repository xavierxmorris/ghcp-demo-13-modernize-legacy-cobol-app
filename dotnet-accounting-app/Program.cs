using System.Text;

namespace Accounting;

internal static class Program
{
    private static int Main()
    {
        try
        {
            Run(new AccountStore());
            return 0;
        }
        catch (Exception error) when (error is IOException or InvalidDataException
            or UnauthorizedAccessException or DecoderFallbackException)
        {
            Console.Error.WriteLine($"Fatal: {error.Message}");
            return 1;
        }
    }

    private static void Run(AccountStore store)
    {
        while (true)
        {
            Console.WriteLine("1. View balance  2. Credit  3. Debit  4. Exit");
            var choice = Console.ReadLine()?.Trim();
            // L-07: EOF is a normal exit, including EOF at the amount prompt.
            if (choice is null or "4")
            {
                break;
            }
            if (choice == "1")
            {
                Console.WriteLine($"Current balance: {Money.Format(store.ReadBalance())}");
            }
            else if (choice is "2" or "3")
            {
                Console.WriteLine("Enter amount:");
                var raw = Console.ReadLine();
                if (raw is null)
                {
                    break;
                }
                long amount;
                try
                {
                    amount = Money.Parse(raw);
                }
                catch (AmountException rejected)
                {
                    Console.WriteLine($"Rejected: {rejected.Message}.");
                    continue;
                }
                var balance = store.ReadBalance();
                var result = choice == "2"
                    ? Operations.Credit(balance, amount)
                    : Operations.Debit(balance, amount);
                switch (result.Outcome)
                {
                    case Outcome.ExceedsLimit:
                        Console.WriteLine("Rejected: the credit exceeds the account limit.");
                        break;
                    case Outcome.InsufficientFunds:
                        Console.WriteLine("Insufficient funds for this debit.");
                        break;
                    case Outcome.Ok:
                        store.WriteBalance(result.BalanceCents);
                        var verb = choice == "2" ? "credited" : "debited";
                        Console.WriteLine($"Amount {verb}. New balance: {Money.Format(result.BalanceCents)}");
                        break;
                }
            }
            else
            {
                Console.WriteLine("Invalid choice, please select 1-4.");
            }
        }
        Console.WriteLine("Exiting the program. Goodbye!");
    }
}
