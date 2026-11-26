package dev.revival.common;

import java.security.SecureRandom;
import java.util.function.Predicate;

/** Short, unguessable codes without characters that are easy to confuse. */
public final class Codes {
    private static final String ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();

    private Codes() {}

    public static String unique(int length, Predicate<String> taken) {
        while (true) {
            var b = new StringBuilder(length);
            for (int i = 0; i < length; i++) b.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
            if (!taken.test(b.toString())) return b.toString();
        }
    }
}
