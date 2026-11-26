package dev.revival.audit;

import dev.revival.common.Paged;
import org.springframework.web.bind.annotation.*;

@RestController
class AuditController {
    private final AuditEntries entries;

    AuditController(AuditEntries entries) {
        this.entries = entries;
    }

    @GetMapping("/api/admin/audit")
    Paged<AuditEntry.View> audit(@RequestParam(defaultValue = "0") int page) {
        return Paged.of(entries.latest(Paged.request(page)), AuditEntry::view);
    }
}
