package dev.revival.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

public interface OptionItems extends JpaRepository<OptionItem, Long> {
    @Query("select o from OptionItem o order by o.kind, o.position, o.id")
    List<OptionItem> ordered();

    @Query("select o from OptionItem o where o.kind = ?1 and o.code = ?2")
    Optional<OptionItem> find(Kind kind, String code);

    /** Locked, so that two people cannot switch off the last two options of a kind at once. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from OptionItem o where o.kind = ?1 order by o.id")
    List<OptionItem> lockKind(Kind kind);
}
