package dev.revival;

import static org.assertj.core.api.Assertions.assertThat;

import dev.revival.common.RateLimiter;
import java.time.*;
import org.junit.jupiter.api.Test;

class RateLimiterTest {
    static final class Hand extends Clock {
        Instant now = Instant.EPOCH;
        public Instant instant() { return now; }
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId z) { return this; }
    }

    @Test
    void opensAgainAfterTheWindowAndCountsClientsSeparately() {
        var clock = new Hand();
        var limiter = new RateLimiter(2, Duration.ofMinutes(1), clock);
        assertThat(limiter.allow("a")).isTrue();
        assertThat(limiter.allow("a")).isTrue();
        assertThat(limiter.allow("a")).isFalse();
        assertThat(limiter.allow("b")).isTrue();
        clock.now = clock.now.plusSeconds(60);
        assertThat(limiter.allow("a")).isTrue();
    }
}
