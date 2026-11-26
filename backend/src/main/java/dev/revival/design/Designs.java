package dev.revival.design;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface Designs extends JpaRepository<Design, Long> {
    boolean existsByCode(String code);

    @Query("select d from Design d join fetch d.paint join fetch d.finish join fetch d.wheels where d.code = ?1")
    Optional<Design> find(String code);

    @Query(value = "select d from Design d join fetch d.paint join fetch d.finish join fetch d.wheels order by d.id desc", countQuery = "select count(d) from Design d")
    Page<Design> latest(Pageable page);
}
