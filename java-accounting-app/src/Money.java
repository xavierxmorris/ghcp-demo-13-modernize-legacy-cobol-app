import java.util.Locale;
import java.util.regex.Pattern;

final class Money {
    static final long MAX_CENTS = 99_999_999;
    private static final Pattern AMOUNT = Pattern.compile("[0-9]{1,6}(?:\\.[0-9]{1,2})?");

    private Money() {}

    static long parse(String raw) {
        String text = raw.strip();
        if (!AMOUNT.matcher(text).matches()) {
            throw new AmountException("use an unsigned amount with at most 6 digits and 2 decimal places");
        }
        String[] parts = text.split("\\.", -1);
        String fraction = parts.length == 2 ? (parts[1] + "0").substring(0, 2) : "00";
        long cents = Long.parseLong(parts[0]) * 100 + Long.parseLong(fraction);
        if (cents == 0) {
            throw new AmountException("the amount must be greater than zero");
        }
        return cents;
    }

    static String format(long cents) {
        requireBalance(cents);
        return String.format(Locale.ROOT, "%d.%02d", cents / 100, cents % 100);
    }

    static void requireBalance(long cents) {
        if (cents < 0 || cents > MAX_CENTS) {
            throw new IllegalArgumentException("balance is outside the PIC 9(6)V99 range");
        }
    }

    static final class AmountException extends IllegalArgumentException {
        private static final long serialVersionUID = 1L;

        AmountException(String message) {
            super(message);
        }
    }
}
