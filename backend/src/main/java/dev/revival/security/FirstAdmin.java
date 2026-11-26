package dev.revival.security;

import java.time.Clock;
import java.util.Locale;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates the first account from the environment. There is no default password. */
@Component
class FirstAdmin implements ApplicationRunner {
    @ConfigurationProperties("revival.admin")
    record Settings(String username, String password) {}

    private final AdminUsers users;
    private final PasswordEncoder encoder;
    private final Settings settings;
    private final Clock clock;

    FirstAdmin(AdminUsers users, PasswordEncoder encoder, Settings settings, Clock clock) {
        this.users = users;
        this.encoder = encoder;
        this.settings = settings;
        this.clock = clock;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.count() > 0) return;
        var log = LoggerFactory.getLogger(FirstAdmin.class);
        if (settings.username == null || settings.username.isBlank()) {
            log.warn("No admin account exists. Set ADMIN_USERNAME and ADMIN_PASSWORD to create the first one.");
            return;
        }
        if (settings.password == null || settings.password.length() < 12) throw new IllegalStateException("ADMIN_PASSWORD needs at least 12 characters.");
        users.save(new AdminUser(settings.username.strip().toLowerCase(Locale.ROOT), encoder.encode(settings.password), clock.instant()));
        log.info("Created the first admin account.");
    }
}
