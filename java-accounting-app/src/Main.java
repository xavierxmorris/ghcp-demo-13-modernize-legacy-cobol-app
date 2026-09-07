import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public final class Main {
    private Main() {}

    public static void main(String[] args) {
        try (var input = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
            run(input, new AccountStore());
        } catch (IOException error) {
            System.err.println("Fatal: " + error.getMessage());
            System.exit(1);
        }
    }

    private static void run(BufferedReader input, AccountStore store) throws IOException {
        while (true) {
            System.out.println("1. View balance  2. Credit  3. Debit  4. Exit");
            String choice = input.readLine();
            // L-07: EOF is a normal exit, including EOF at the amount prompt.
            if (choice == null || choice.strip().equals("4")) {
                break;
            }
            choice = choice.strip();
            if (choice.equals("1")) {
                System.out.println("Current balance: " + Money.format(store.readBalance()));
            } else if (choice.equals("2") || choice.equals("3")) {
                System.out.println("Enter amount:");
                String raw = input.readLine();
                if (raw == null) {
                    break;
                }
                long amount;
                try {
                    amount = Money.parse(raw);
                } catch (Money.AmountException rejected) {
                    System.out.println("Rejected: " + rejected.getMessage() + ".");
                    continue;
                }
                long balance = store.readBalance();
                Operations.Result result = choice.equals("2")
                    ? Operations.credit(balance, amount)
                    : Operations.debit(balance, amount);
                switch (result.outcome()) {
                    case EXCEEDS_LIMIT -> System.out.println("Rejected: the credit exceeds the account limit.");
                    case INSUFFICIENT_FUNDS -> System.out.println("Insufficient funds for this debit.");
                    case OK -> {
                        store.writeBalance(result.balanceCents());
                        String verb = choice.equals("2") ? "credited" : "debited";
                        System.out.println("Amount " + verb + ". New balance: " + Money.format(result.balanceCents()));
                    }
                }
            } else {
                System.out.println("Invalid choice, please select 1-4.");
            }
        }
        System.out.println("Exiting the program. Goodbye!");
    }
}
