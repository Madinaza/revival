package dev.revival.security;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
class AdminUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String username, passwordHash;
    private Instant createdAt;

    protected AdminUser() {}

    AdminUser(String username, String passwordHash, Instant createdAt) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.createdAt = createdAt;
    }

    String username() { return username; }
    String passwordHash() { return passwordHash; }
}
