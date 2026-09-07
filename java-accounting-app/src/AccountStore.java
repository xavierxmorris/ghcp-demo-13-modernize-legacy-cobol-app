import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.regex.Pattern;

final class AccountStore {
    private static final long OPENING_BALANCE_CENTS = 100_000;
    private static final Pattern STORED_CENTS = Pattern.compile("(?:0|[1-9][0-9]{0,7})\\n?");
    private final Path file;

    AccountStore() {
        String configured = System.getenv("ACCOUNT_STORE");
        file = Path.of(configured == null ? "build/java-account.cents" : configured).toAbsolutePath();
    }

    long readBalance() throws IOException {
        String text;
        try {
            text = Files.readString(file, StandardCharsets.UTF_8);
        } catch (NoSuchFileException missing) {
            return OPENING_BALANCE_CENTS;
        }
        // L-09: only an absent store is new; corruption must never reset the account.
        if (!STORED_CENTS.matcher(text).matches()) {
            throw new IOException("account store must contain integer cents between 0 and 99999999");
        }
        return Long.parseLong(text.strip());
    }

    void writeBalance(long cents) throws IOException {
        Money.requireBalance(cents);
        Files.createDirectories(file.getParent());
        Path temporary = Files.createTempFile(file.getParent(), ".account-", ".tmp");
        try {
            Files.writeString(temporary, cents + "\n", StandardCharsets.UTF_8);
            Files.move(temporary, file, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } finally {
            Files.deleteIfExists(temporary);
        }
    }
}
