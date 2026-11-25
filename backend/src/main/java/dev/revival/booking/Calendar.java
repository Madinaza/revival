package dev.revival.booking;

import dev.revival.audit.Audit;
import dev.revival.common.Problems;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class Calendar {
    @ConfigurationProperties("revival.booking")
    record Settings(ZoneId zone) {}

    public record Slot(Instant startsAt, LocalTime time, boolean open, boolean booked, boolean past) {
        public boolean free() { return open && !booked && !past; }
    }
    public record Day(LocalDate date, List<Slot> slots) {}

    static final Duration NOTICE = Duration.ofHours(2);
    static final Period HORIZON = Period.ofDays(60);

    private final OpeningTimes opening;
    private final ClosedTimes closed;
    private final BookedTimes booked;
    private final JdbcClient jdbc;
    private final Audit audit;
    private final Clock clock;
    private final ZoneId zone;

    Calendar(OpeningTimes opening, ClosedTimes closed, BookedTimes booked, JdbcClient jdbc, Audit audit, Clock clock, Settings settings) {
        this.opening = opening;
        this.closed = closed;
        this.booked = booked;
        this.jdbc = jdbc;
        this.audit = audit;
        this.clock = clock;
        this.zone = settings.zone;
    }

    public ZoneId zone() { return zone; }

    public LocalDate today() { return LocalDate.ofInstant(clock.instant(), zone); }

    public List<Day> days(LocalDate from, int count) {
        var start = from.atStartOfDay(zone).toInstant();
        var end = from.plusDays(count).atStartOfDay(zone).toInstant();
        var shut = closed.findByStartsAtBetween(start, end).stream().map(ClosedTime::startsAt).collect(Collectors.toSet());
        var taken = booked.bookedBetween(start, end);
        var soonest = clock.instant().plus(NOTICE);
        var times = opening.findAll().stream().map(OpeningTime::key).collect(Collectors.groupingBy(OpeningTime.Key::weekday));
        var days = new ArrayList<Day>();
        for (var date = from; date.isBefore(from.plusDays(count)); date = date.plusDays(1)) {
            var day = date;
            // By instant: booked times stay on the calendar after the opening hours change, and a repeated hour in autumn counts once.
            var slots = new TreeMap<Instant, Slot>();
            for (var key : times.getOrDefault((short) day.getDayOfWeek().getValue(), List.of())) {
                var at = day.atTime(key.at()).atZone(zone).toInstant();
                slots.put(at, new Slot(at, LocalTime.ofInstant(at, zone), !shut.contains(at), taken.contains(at), at.isBefore(soonest)));
            }
            for (var at : taken) if (LocalDate.ofInstant(at, zone).equals(day)) slots.putIfAbsent(at, new Slot(at, LocalTime.ofInstant(at, zone), false, true, at.isBefore(soonest)));
            days.add(new Day(day, List.copyOf(slots.values())));
        }
        return days;
    }

    /** Call inside the transaction that books. Holds the time until that transaction ends, so a second visitor waits and then sees it taken. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void claim(Instant at) {
        lock(at);
        var date = LocalDate.ofInstant(at, zone);
        boolean free = !date.isAfter(today().plus(HORIZON)) && days(date, 1).getFirst().slots().stream().anyMatch(s -> s.startsAt().equals(at) && s.free());
        if (!free) throw Problems.invalid("slotAt", "This time is no longer free. Choose another one.");
    }

    @Transactional
    public void setClosed(Instant at, boolean close, String by) {
        lock(at);
        var date = LocalDate.ofInstant(at, zone);
        var slot = days(date, 1).getFirst().slots().stream().filter(s -> s.startsAt().equals(at)).findFirst().orElseThrow(() -> Problems.notFound("This time"));
        if (slot.booked()) throw Problems.conflict("This time is booked. Handle the request first.");
        if (close == !slot.open()) return;
        if (close) closed.save(new ClosedTime(at, by)); else closed.deleteById(at);
        audit.record(close ? "time.closed" : "time.opened", "time " + date + " " + slot.time(), close ? "closed for bookings" : "open for bookings");
    }

    @Transactional
    public void setOpening(int weekday, LocalTime at, boolean open) {
        var key = new OpeningTime.Key((short) weekday, at);
        if (opening.existsById(key) == open) return;
        if (open) opening.save(new OpeningTime(key)); else opening.deleteById(key);
        audit.record("hours.changed", "hours " + DayOfWeek.of(weekday) + " " + at, open ? "opened every week" : "closed every week");
    }

    List<OpeningTime.Key> opening() {
        return opening.findAll().stream().map(OpeningTime::key).sorted(Comparator.comparing(OpeningTime.Key::weekday).thenComparing(OpeningTime.Key::at)).toList();
    }

    private void lock(Instant at) {
        jdbc.sql("select pg_advisory_xact_lock(?)").param(at.getEpochSecond()).query((rs, n) -> 1).single();
    }
}
