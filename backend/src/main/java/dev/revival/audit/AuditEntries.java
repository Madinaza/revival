package dev.revival.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface AuditEntries extends JpaRepository<AuditEntry, Long> {
    @Query("select a from AuditEntry a order by a.id desc")
    Page<AuditEntry> latest(Pageable page);
}
