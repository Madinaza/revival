package dev.revival.testdrive;

import dev.revival.audit.Audit;
import dev.revival.common.*;
import dev.revival.design.Designs;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Clock;
import java.util.*;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
class TestDriveAdminController {
    record Handle(@NotNull Status status, @Size(max = 1000, message = "Use at most 1000 characters.") String staffNote, @NotNull Integer version) {}
    record Summary(Map<Status, Long> requests, long designs) {}

    private final TestDrives drives;
    private final Designs designs;
    private final Audit audit;
    private final Clock clock;

    TestDriveAdminController(TestDrives drives, Designs designs, Audit audit, Clock clock) {
        this.drives = drives;
        this.designs = designs;
        this.audit = audit;
        this.clock = clock;
    }

    @GetMapping("/summary")
    Summary summary() {
        var counts = new EnumMap<Status, Long>(Status.class);
        for (var s : Status.values()) counts.put(s, drives.countByStatus(s));
        return new Summary(counts, designs.count());
    }

    @GetMapping("/test-drives")
    @Transactional(readOnly = true)
    Paged<TestDrive.View> search(@RequestParam(required = false) Status status, @RequestParam(required = false) String q, @RequestParam(defaultValue = "0") int page) {
        var pattern = q == null || q.isBlank() ? null : "%" + q.strip().toLowerCase(Locale.ROOT).replaceAll("([!%_])", "!$1") + "%";
        return Paged.of(drives.search(status, pattern, Paged.request(page)), TestDrive::view);
    }

    @PatchMapping("/test-drives/{id}")
    @Transactional
    TestDrive.View handle(@PathVariable long id, @Valid @RequestBody Handle in) {
        var drive = drives.find(id).orElseThrow(() -> Problems.notFound("This request"));
        if (drive.version() != in.version) throw new ObjectOptimisticLockingFailureException(TestDrive.class, id);
        var before = drive.status();
        if (!before.canBecome(in.status)) throw Problems.conflict("A %s request cannot become %s.".formatted(before.name().toLowerCase(Locale.ROOT), in.status.name().toLowerCase(Locale.ROOT)));
        drive.handle(in.status, in.staffNote == null || in.staffNote.isBlank() ? null : in.staffNote.strip(), clock.instant());
        drives.saveAndFlush(drive);
        audit.record("request.handled", "request " + drive.reference(), before == in.status ? "note edited" : before + " -> " + in.status);
        return drive.view();
    }
}
