package dev.revival.security;

import java.security.Principal;
import java.util.Collections;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class SessionController {
    /** Open to everyone: tells the admin page whether to show the sign-in form, and sets the CSRF cookie. */
    @GetMapping("/api/session")
    Map<String, String> session(Principal who) {
        return Collections.singletonMap("username", who == null ? null : who.getName());
    }
}
