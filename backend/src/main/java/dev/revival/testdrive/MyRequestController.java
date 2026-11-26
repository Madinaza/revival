package dev.revival.testdrive;

import dev.revival.audit.Audit;
import dev.revival.booking.Calendar;
import dev.revival.common.Problems;
import dev.revival.design.Design;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.Locale;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/** Reference and email together open a request. They travel in the body, so they never end up in a log or a history. */
@RestController
@RequestMapping("/api/my-request")
class MyRequestController {
    private static final Duration LAST_CHANGE = Duration.ofHours(12);

    record Key(@NotBlank(message = "Enter your reference.") @Size(max = 20) String reference, @NotBlank(message = "Enter your email address.") @Size(max = 160) String email) {}
    record Move(@NotNull @Valid Key key, @NotNull(message = "Choose a time.") Instant slotAt, @NotNull Integer version) {}
    record Cancel(@NotNull @Valid Key key, @NotNull Integer version) {}
    record View(String reference, String name, Status status, Instant slotAt, LocalDate preferredDate, boolean changeable, Design.View design, int version) {}

    private final TestDrives drives;
    private final Calendar calendar;
    private final Audit audit;
    private final Clock clock;

    MyRequestController(TestDrives drives, Calendar calendar, Audit audit, Clock clock) {
        this.drives = drives;
        this.calendar = calendar;
        this.audit = audit;
        this.clock = clock;
    }

    @PostMapping
    @Transactional(readOnly = true)
    View open(@Valid @RequestBody Key key) {
        return view(find(key));
    }

    @PostMapping("/move")
    @Transactional
    View move(@Valid @RequestBody Move in) {
        var drive = changeable(in.key, in.version);
        if (in.slotAt.equals(drive.slotAt())) return view(drive);
        calendar.claim(in.slotAt);
        var before = drive.slotAt();
        drive.move(in.slotAt, clock.instant());
        drives.saveAndFlush(drive);
        audit.record("request.moved", "request " + drive.reference(), local(before) + " -> " + local(in.slotAt));
        return view(drive);
    }

    @PostMapping("/cancel")
    @Transactional
    View cancel(@Valid @RequestBody Cancel in) {
        var drive = changeable(in.key, in.version);
        drive.cancel(clock.instant());
        drives.saveAndFlush(drive);
        audit.record("request.cancelled", "request " + drive.reference(), "cancelled by the visitor");
        return view(drive);
    }

    private TestDrive find(Key key) {
        return drives.findByReference(key.reference.strip().toUpperCase(Locale.ROOT)).filter(d -> d.email().equalsIgnoreCase(key.email.strip()))
            .orElseThrow(() -> Problems.notFound("A request with this reference and email"));
    }

    private TestDrive changeable(Key key, int version) {
        var drive = find(key);
        if (drive.version() != version) throw new ObjectOptimisticLockingFailureException(TestDrive.class, drive.reference());
        if (!open(drive)) throw Problems.conflict("This request can no longer be changed here.");
        return drive;
    }

    private boolean open(TestDrive d) {
        return d.status().live() && (d.slotAt() == null || clock.instant().plus(LAST_CHANGE).isBefore(d.slotAt()));
    }

    private String local(Instant at) {
        return at == null ? "no time" : LocalDateTime.ofInstant(at, calendar.zone()).toString().replace('T', ' ');
    }

    private View view(TestDrive d) {
        var v = d.view();
        return new View(v.reference(), v.name(), v.status(), v.slotAt(), v.preferredDate(), open(d), d.design() == null ? null : d.design().view(), v.version());
    }
}
