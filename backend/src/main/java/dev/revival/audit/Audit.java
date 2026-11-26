package dev.revival.audit;

import java.time.Clock;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Written in the same transaction as the change it describes, so neither can exist without the other. */
@Component
public class Audit {
    private final AuditEntries entries;
    private final Clock clock;

    Audit(AuditEntries entries, Clock clock) {
        this.entries = entries;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(String action, String subject, String detail) {
        var who = SecurityContextHolder.getContext().getAuthentication();
        entries.save(new AuditEntry(clock.instant(), who == null ? "system" : who instanceof AnonymousAuthenticationToken ? "visitor" : who.getName(), action, subject, detail));
    }
}
