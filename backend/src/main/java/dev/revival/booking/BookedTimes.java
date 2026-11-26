package dev.revival.booking;

import java.time.Instant;
import java.util.Set;

/** What the calendar needs to know about requests. Implemented by the test-drive package. */
public interface BookedTimes {
    Set<Instant> bookedBetween(Instant from, Instant to);
}
