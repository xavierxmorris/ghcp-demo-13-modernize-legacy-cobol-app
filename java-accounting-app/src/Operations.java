final class Operations {
    enum Outcome { OK, INSUFFICIENT_FUNDS, EXCEEDS_LIMIT }

    record Result(Outcome outcome, long balanceCents) {}

    private Operations() {}

    static Result credit(long balance, long amount) {
        requireInputs(balance, amount);
        long next = Math.addExact(balance, amount);
        // L-01: refuse overflow instead of reproducing COBOL's discarded digit.
        return next > Money.MAX_CENTS
            ? new Result(Outcome.EXCEEDS_LIMIT, balance)
            : new Result(Outcome.OK, next);
    }

    static Result debit(long balance, long amount) {
        requireInputs(balance, amount);
        return amount > balance
            ? new Result(Outcome.INSUFFICIENT_FUNDS, balance)
            : new Result(Outcome.OK, balance - amount);
    }

    private static void requireInputs(long balance, long amount) {
        Money.requireBalance(balance);
        if (amount <= 0 || amount > Money.MAX_CENTS) {
            throw new IllegalArgumentException("amount must be positive and within the account limit");
        }
    }
}
