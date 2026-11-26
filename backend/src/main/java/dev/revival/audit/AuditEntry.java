package dev.revival.audit;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
class AuditEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Instant at;
    private String actor, action, subject, detail;

    protected AuditEntry() {}

    AuditEntry(Instant at, String actor, String action, String subject, String detail) {
        this.at = at;
        this.actor = actor;
        this.action = action;
        this.subject = subject;
        this.detail = detail.length() > 500 ? detail.substring(0, 500) : detail;
    }

    record View(Instant at, String actor, String action, String subject, String detail) {}

    View view() { return new View(at, actor, action, subject, detail); }
}
