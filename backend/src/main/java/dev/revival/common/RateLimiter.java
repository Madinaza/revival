package dev.revival.common;

import java.time.Clock;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/** Fixed-window counter held in memory. Enough for one instance; several would need a shared store. */
public final class RateLimiter {
    private static final int MAX_KEYS = 10_000;
    private record Window(long startedAt, int count) {}

    private final int limit;
    private final long windowMillis;
    private final Clock clock;
    private final Map<String, Window> windows = new LinkedHashMap<>(256, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Window> eldest) {
            return size() > MAX_KEYS;
        }
    };

    public RateLimiter(int limit, Duration window, Clock clock) {
        this.limit = limit;
        this.windowMillis = window.toMillis();
        this.clock = clock;
    }

    public synchronized boolean allow(String key) {
        long now = clock.millis();
        var w = windows.get(key);
        if (w == null || now - w.startedAt >= windowMillis) w = new Window(now, 0);
        windows.put(key, new Window(w.startedAt, w.count + 1));
        return w.count < limit;
    }

    public synchronized void reset(String key) {
        windows.remove(key);
    }
}
