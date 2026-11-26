package dev.revival.security;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface AdminUsers extends JpaRepository<AdminUser, Long> {
    Optional<AdminUser> findByUsername(String username);
}
