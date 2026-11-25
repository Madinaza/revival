package dev.revival.booking;

import dev.revival.common.Problems;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.time.*;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
class BookingController {
    /** Visitors learn whether a time is free, never why it is not. */
    record Free(Instant startsAt, LocalTime time, boolean free) {}
    record FreeDay(LocalDate date, List<Free> slots) {}
    record Availability(ZoneId zone, LocalDate first, LocalDate last, List<FreeDay> days) {}
    record Close(@NotNull Instant startsAt, @NotNull Boolean closed) {}
    record Hours(@NotNull @Min(1) @Max(7) Integer weekday, @NotNull LocalTime at, @NotNull Boolean open) {}
    record Week(ZoneId zone, List<Calendar.Day> days) {}

    private final Calendar calendar;

    BookingController(Calendar calendar) {
        this.calendar = calendar;
    }

    @GetMapping("/api/availability")
    Availability availability(@RequestParam(required = false) LocalDate from) {
        var first = calendar.today();
        var last = first.plus(Calendar.HORIZON);
        var start = from == null || from.isBefore(first) ? first : from.isAfter(last) ? last : from;
        int count = (int) Math.min(14, start.until(last, java.time.temporal.ChronoUnit.DAYS) + 1);
        var days = calendar.days(start, count).stream()
            .map(d -> new FreeDay(d.date(), d.slots().stream().filter(s -> !s.past()).map(s -> new Free(s.startsAt(), s.time(), s.free())).toList())).toList();
        return new Availability(calendar.zone(), first, last, days);
    }

    @GetMapping("/api/admin/calendar")
    Week week(@RequestParam(required = false) LocalDate from) {
        var start = from == null ? calendar.today() : from;
        if (Math.abs(start.until(calendar.today(), java.time.temporal.ChronoUnit.DAYS)) > 3650) throw Problems.of(HttpStatus.BAD_REQUEST, "That week is too far away.");
        return new Week(calendar.zone(), calendar.days(start.with(DayOfWeek.MONDAY), 7));
    }

    @PutMapping("/api/admin/calendar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void close(@Valid @RequestBody Close in, Principal who) {
        calendar.setClosed(in.startsAt, in.closed, who.getName());
    }

    @GetMapping("/api/admin/opening-times")
    List<OpeningTime.Key> opening() {
        return calendar.opening();
    }

    @PutMapping("/api/admin/opening-times")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void opening(@Valid @RequestBody Hours in) {
        if (in.at.getSecond() != 0 || in.at.getNano() != 0) throw Problems.invalid("at", "Use hours and minutes.");
        calendar.setOpening(in.weekday, in.at, in.open);
    }
}
