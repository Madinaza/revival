package dev.revival.booking;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
class ClosedTime {
    @Id private Instant startsAt;
    private String closedBy;

    protected ClosedTime() {}

    ClosedTime(Instant startsAt, String closedBy) {
        this.startsAt = startsAt;
        this.closedBy = closedBy;
    }

    Instant startsAt() { return startsAt; }
}
