package dev.revival.testdrive;

import dev.revival.booking.BookedTimes;
import java.time.Instant;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
class SlotsTaken implements BookedTimes {
    private final TestDrives drives;

    SlotsTaken(TestDrives drives) {
        this.drives = drives;
    }

    @Override
    public Set<Instant> bookedBetween(Instant from, Instant to) {
        return drives.liveSlots(from, to);
    }
}
