package dev.revival.booking;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ClosedTimes extends JpaRepository<ClosedTime, Instant> {
    List<ClosedTime> findByStartsAtBetween(Instant from, Instant to);
}
