package dev.revival.testdrive;

import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface TestDrives extends JpaRepository<TestDrive, Long> {
    boolean existsByReference(String reference);
    long countByStatus(Status status);

    @Query("select t from TestDrive t left join fetch t.design where t.id = ?1")
    Optional<TestDrive> find(long id);

    @Query("select t from TestDrive t left join fetch t.design where t.reference = ?1")
    Optional<TestDrive> findByReference(String reference);

    @Query("select t.slotAt from TestDrive t where t.slotAt >= ?1 and t.slotAt < ?2 and t.status in (dev.revival.testdrive.Status.NEW, dev.revival.testdrive.Status.CONFIRMED)")
    Set<Instant> liveSlots(Instant from, Instant to);

    @Query("select t from TestDrive t where t.slotAt >= ?1 and t.slotAt < ?2 and t.status in (dev.revival.testdrive.Status.NEW, dev.revival.testdrive.Status.CONFIRMED)")
    List<TestDrive> live(Instant from, Instant to);

    @Query(value = """
        select t from TestDrive t left join fetch t.design
        where (:status is null or t.status = :status)
          and (:pattern is null or lower(t.name) like :pattern escape '!' or lower(t.email) like :pattern escape '!' or lower(t.reference) like :pattern escape '!')
        order by t.id desc""",
        countQuery = """
        select count(t) from TestDrive t
        where (:status is null or t.status = :status)
          and (:pattern is null or lower(t.name) like :pattern escape '!' or lower(t.email) like :pattern escape '!' or lower(t.reference) like :pattern escape '!')""")
    Page<TestDrive> search(Status status, String pattern, Pageable page);
}
