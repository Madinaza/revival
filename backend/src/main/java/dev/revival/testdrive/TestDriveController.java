package dev.revival.testdrive;

import dev.revival.common.*;
import dev.revival.design.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
class TestDriveController {
    record Request(
        @NotBlank(message = "Enter your name.") @Size(max = 80, message = "Use at most 80 characters.") String name,
        @NotBlank(message = "Enter your email address.") @Email(message = "Enter an address like name@example.com.") @Size(max = 160, message = "Use at most 160 characters.") String email,
        @Size(max = 30, message = "Use at most 30 characters.") @Pattern(regexp = "[+0-9 ()./-]*", message = "Use digits, spaces and + only.") String phone,
        @NotNull(message = "Choose a date.") LocalDate preferredDate,
        @Size(max = 1000, message = "Use at most 1000 characters.") String message,
        String designCode,
        String website) {} // left empty by people; filled in by bots

    record Receipt(String reference) {}

    private final TestDrives drives;
    private final Designs designs;
    private final Clock clock;

    TestDriveController(TestDrives drives, Designs designs, Clock clock) {
        this.drives = drives;
        this.designs = designs;
        this.clock = clock;
    }

    @PostMapping("/api/test-drives")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    Receipt request(@Valid @RequestBody Request in) {
        var today = LocalDate.now(clock);
        // One day of slack: the visitor's calendar may be behind ours.
        if (in.preferredDate.isBefore(today.minusDays(1))) throw Problems.invalid("preferredDate", "Choose a date that has not passed.");
        if (in.preferredDate.isAfter(today.plusYears(1))) throw Problems.invalid("preferredDate", "Choose a date within the next year.");
        var reference = Codes.unique(6, drives::existsByReference);
        if (blank(in.website) != null) return new Receipt(reference);
        var code = blank(in.designCode);
        var design = code == null ? null : designs.find(code.toUpperCase(Locale.ROOT)).orElseThrow(() -> Problems.invalid("designCode", "This design was not found."));
        drives.save(new TestDrive(reference, in.name.strip(), in.email.strip(), blank(in.phone), in.preferredDate, blank(in.message), design, clock.instant()));
        return new Receipt(reference);
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
