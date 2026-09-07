namespace Accounting;

internal enum Outcome { Ok, InsufficientFunds, ExceedsLimit }

internal readonly record struct OperationResult(Outcome Outcome, long BalanceCents);

internal static class Operations
{
    internal static OperationResult Credit(long balance, long amount)
    {
        RequireInputs(balance, amount);
        var next = checked(balance + amount);
        // L-01: refuse overflow instead of reproducing COBOL's discarded digit.
        return next > Money.MaxCents
            ? new(Outcome.ExceedsLimit, balance)
            : new(Outcome.Ok, next);
    }

    internal static OperationResult Debit(long balance, long amount)
    {
        RequireInputs(balance, amount);
        return amount > balance
            ? new(Outcome.InsufficientFunds, balance)
            : new(Outcome.Ok, balance - amount);
    }

    private static void RequireInputs(long balance, long amount)
    {
        Money.RequireBalance(balance);
        if (amount <= 0 || amount > Money.MaxCents)
        {
            throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be positive and within the account limit.");
        }
    }
}
