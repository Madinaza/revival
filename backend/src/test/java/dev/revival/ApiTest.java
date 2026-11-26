package dev.revival;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.jayway.jsonpath.JsonPath;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Runs the whole application against a real PostgreSQL. */
@Testcontainers
@SpringBootTest(properties = {"revival.admin.username=Curator", "revival.admin.password=test-only-password"})
class ApiTest {
    @Container @ServiceConnection static final PostgreSQLContainer DB = new PostgreSQLContainer("postgres:18-alpine");
    static final AtomicInteger CLIENT = new AtomicInteger();

    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate jdbc;
    MockMvc mvc;
    String ip;
    int next;
    static final ZoneId ZONE = ZoneId.of("Europe/Berlin");

    @BeforeEach
    void setUp() {
        ip = "10.0.0." + CLIENT.incrementAndGet(); // each test is its own visitor to the rate limiter
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        jdbc.update("delete from test_drive_request");
        jdbc.update("delete from design");
        jdbc.update("delete from audit_entry");
        jdbc.update("delete from closed_time");
        jdbc.update("update option_item set active = true");
    }

    MockHttpServletRequestBuilder from(MockHttpServletRequestBuilder r) {
        return r.with(req -> { req.setRemoteAddr(ip); return req; });
    }

    ResultActions send(MockHttpServletRequestBuilder r, String json) throws Exception {
        return mvc.perform(from(r).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    ResultActions asAdmin(MockHttpServletRequestBuilder r, String json) throws Exception {
        return send(r.with(user("curator").roles("ADMIN")).with(csrf()), json);
    }

    ResultActions readAsAdmin(String url) throws Exception {
        return mvc.perform(get(url).with(user("curator").roles("ADMIN")));
    }

    static String at(ResultActions r, String path) throws Exception {
        return JsonPath.read(r.andReturn().getResponse().getContentAsString(), path).toString();
    }

    String saveDesign() throws Exception {
        return at(send(post("/api/designs"), """
            {"paint":"oxblood","finish":"satin","wheels":"brass","headlights":true,"taillights":false}""").andExpect(status().isCreated()), "$.code");
    }

    /** The nth opening from next week on, as the API writes it. */
    static String slot(int n) {
        var out = new ArrayList<Instant>();
        for (var d = LocalDate.now(ZONE).plusDays(7); out.size() <= n; d = d.plusDays(1))
            if (d.getDayOfWeek().getValue() >= 2 && d.getDayOfWeek().getValue() <= 6)
                for (var t : List.of("10:00", "11:30", "14:00", "15:30")) out.add(d.atTime(LocalTime.parse(t)).atZone(ZONE).toInstant());
        return out.get(n).toString();
    }

    String drive(String extra) {
        return """
            {"name":"Ada Test","email":"ada@example.com","slotAt":"%s"%s}""".formatted(slot(next++), extra);
    }

    String optionId(String kind, String code) {
        return jdbc.queryForObject("select id from option_item where kind = ? and code = ?", Long.class, kind, code).toString();
    }

    int version(String table, String id) {
        return jdbc.queryForObject("select version from " + table + " where id = ?", Integer.class, Long.valueOf(id));
    }

    String edit(String name, int price, boolean active, int version) {
        return """
            {"name":"%s","priceCents":%d,"color":"#cfc4ac","metalness":0,"roughness":0.4,"clearcoat":1,"active":%b,"position":1,"version":%d}""".formatted(name, price, active, version);
    }

    @Nested
    class Visitors {
        @Test
        void seeOnlyAvailableOptions() throws Exception {
            jdbc.update("update option_item set active = false where code = 'ivory'");
            mvc.perform(get("/api/catalog")).andExpect(status().isOk())
                .andExpect(jsonPath("$.PAINT[*].code", contains("obsidian", "oxblood", "bare-steel", "aged-brass")))
                .andExpect(jsonPath("$.WHEELS", hasSize(3)));
        }

        @Test
        void saveADesignAndOpenItAgain() throws Exception {
            var code = saveDesign();
            assertThat(code).matches("[2-9A-Z]{8}");
            mvc.perform(get("/api/designs/" + code.toLowerCase())).andExpect(status().isOk())
                .andExpect(jsonPath("$.paint.code").value("oxblood")).andExpect(jsonPath("$.taillights").value(false))
                .andExpect(jsonPath("$.totalCents").value(14850000 + 240000 + 310000 + 145000));
        }

        @Test
        void keepTheirPriceAndPaintAfterTheCatalogueChanges() throws Exception {
            var code = saveDesign();
            jdbc.update("update option_item set active = false, price_cents = 999 where code = 'oxblood'");
            mvc.perform(get("/api/designs/" + code)).andExpect(jsonPath("$.paint.color").value("#3a0508")).andExpect(jsonPath("$.prices.paint").value(240000)).andExpect(jsonPath("$.prices.base").value(14850000)).andExpect(jsonPath("$.totalCents").value(15545000));
            jdbc.update("update option_item set price_cents = 240000 where code = 'oxblood'");
        }

        @Test
        void cannotSaveAHiddenOrUnknownOption() throws Exception {
            jdbc.update("update option_item set active = false where code = 'oxblood'");
            send(post("/api/designs"), """
                {"paint":"oxblood","finish":"satin","wheels":"brass","headlights":true,"taillights":true}""").andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.paint").exists());
            send(post("/api/designs"), """
                {"paint":"ivory","finish":"matte","wheels":"brass","headlights":true,"taillights":true}""").andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.finish").exists());
            mvc.perform(get("/api/designs/NOTHERE2")).andExpect(status().isNotFound());
        }

        @Test
        void requestATestDriveForADesign() throws Exception {
            var code = saveDesign();
            var ref = at(send(post("/api/test-drives"), drive(",\"designCode\":\"%s\",\"phone\":\" \"".formatted(code))).andExpect(status().isCreated()), "$.reference");
            readAsAdmin("/api/admin/test-drives").andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.items[0].reference").value(ref))
                .andExpect(jsonPath("$.items[0].designCode").value(code)).andExpect(jsonPath("$.items[0].phone").value(nullValue())).andExpect(jsonPath("$.items[0].status").value("NEW"));
        }

        @Test
        void areToldWhichFieldsAreWrong() throws Exception {
            send(post("/api/test-drives"), """
                {"name":" ","email":"nope","phone":"call me"}""").andExpect(status().isBadRequest()).andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.fields.name").exists()).andExpect(jsonPath("$.fields.email").exists()).andExpect(jsonPath("$.fields.phone").exists()).andExpect(jsonPath("$.fields.slotAt").exists());
            send(post("/api/test-drives"), drive("").replaceAll("\\d{4}-\\d\\d-\\d\\d", "2020-01-01")).andExpect(jsonPath("$.fields.slotAt").exists());
            send(post("/api/test-drives"), drive(",\"designCode\":\"NOTHERE2\"")).andExpect(jsonPath("$.fields.designCode").exists());
            send(post("/api/test-drives"), "{broken").andExpect(status().isBadRequest());
        }

        @Test
        void thatAreBotsGetAReceiptButStoreNothing() throws Exception {
            send(post("/api/test-drives"), drive(",\"website\":\"http://spam.example\"")).andExpect(status().isCreated());
            assertThat(jdbc.queryForObject("select count(*) from test_drive_request", Integer.class)).isZero();
        }

        @Test
        void areSlowedDownAfterTwentySubmissions() throws Exception {
            for (int i = 0; i < 20; i++) send(post("/api/test-drives"), drive("")).andExpect(status().isCreated());
            send(post("/api/test-drives"), drive("")).andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After", "600"));
        }

        @Test
        void cannotReachAnythingElse() throws Exception {
            for (var url : new String[] {"/api/admin/summary", "/api/admin/test-drives", "/api/admin/designs", "/api/admin/options", "/api/admin/audit", "/api/admin/calendar", "/api/admin/opening-times", "/api/admin/bookings?from=2026-01-01T00:00:00Z", "/actuator/env"})
                mvc.perform(get(url)).andExpect(status().isUnauthorized());
            send(put("/api/admin/options/1").with(csrf()), "{}").andExpect(status().isUnauthorized());
        }
    }

    @Nested
    class SignIn {
        ResultActions login(String user, String password) throws Exception {
            return mvc.perform(from(post("/api/login")).with(csrf()).param("username", user).param("password", password));
        }

        @Test
        void opensASessionAndSignOutClosesIt() throws Exception {
            var session = (MockHttpSession) login("CURATOR", "test-only-password").andExpect(status().isNoContent()).andReturn().getRequest().getSession(false);
            mvc.perform(get("/api/session").session(session)).andExpect(jsonPath("$.username").value("curator"));
            mvc.perform(get("/api/admin/summary").session(session)).andExpect(status().isOk());
            mvc.perform(post("/api/logout").session(session).with(csrf())).andExpect(status().isNoContent());
            assertThat(session.isInvalid()).isTrue();
            mvc.perform(get("/api/session")).andExpect(jsonPath("$.username").value(nullValue()));
        }

        @Test
        void refusesWrongCredentialsWithoutSayingWhichPartWasWrong() throws Exception {
            login("curator", "wrong").andExpect(status().isUnauthorized()).andExpect(content().string(""));
            login("nobody", "wrong").andExpect(status().isUnauthorized()).andExpect(content().string(""));
        }

        @Test
        void isSlowedDownAfterTenFailures() throws Exception {
            for (int i = 0; i < 10; i++) login("curator", "wrong").andExpect(status().isUnauthorized());
            login("curator", "test-only-password").andExpect(status().isTooManyRequests());
        }

        @Test
        void neverStoresThePasswordItself() {
            assertThat(jdbc.queryForObject("select password_hash from admin_user", String.class)).startsWith("{bcrypt}");
        }

        @Test
        void isProtectedFromForgedRequests() throws Exception {
            mvc.perform(from(post("/api/login")).param("username", "curator").param("password", "test-only-password")).andExpect(status().isForbidden());
            send(patch("/api/admin/test-drives/1").with(user("curator").roles("ADMIN")), "{}").andExpect(status().isForbidden());
        }
    }

    @Nested
    class Staff {
        String request(String name) throws Exception {
            send(post("/api/test-drives"), drive("").replace("Ada Test", name)).andExpect(status().isCreated());
            return jdbc.queryForObject("select max(id) from test_drive_request", Long.class).toString();
        }

        ResultActions handle(String id, String status, int version) throws Exception {
            return asAdmin(patch("/api/admin/test-drives/" + id), """
                {"status":"%s","staffNote":"called","version":%d}""".formatted(status, version));
        }

        @Test
        void confirmARequestAndLeaveATrace() throws Exception {
            var id = request("Ada");
            handle(id, "CONFIRMED", 0).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CONFIRMED")).andExpect(jsonPath("$.version").value(1));
            readAsAdmin("/api/admin/audit").andExpect(jsonPath("$.items[0].actor").value("curator")).andExpect(jsonPath("$.items[0].detail").value("NEW -> CONFIRMED"));
            readAsAdmin("/api/admin/summary").andExpect(jsonPath("$.requests.CONFIRMED").value(1)).andExpect(jsonPath("$.requests.NEW").value(0));
        }

        @Test
        void cannotOverwriteEachOther() throws Exception {
            var id = request("Ada");
            handle(id, "CONFIRMED", 0).andExpect(status().isOk());
            handle(id, "CANCELLED", 0).andExpect(status().isConflict());
            assertThat(jdbc.queryForObject("select status from test_drive_request", String.class)).isEqualTo("CONFIRMED");
        }

        @Test
        void cannotSkipOrUndoSteps() throws Exception {
            var id = request("Ada");
            handle(id, "COMPLETED", 0).andExpect(status().isConflict());
            handle(id, "CONFIRMED", 0);
            handle(id, "COMPLETED", 1).andExpect(status().isOk());
            handle(id, "NEW", 2).andExpect(status().isConflict());
            handle("999999", "NEW", 0).andExpect(status().isNotFound());
        }

        @Test
        void searchLiterallyAndFilterByStatus() throws Exception {
            request("Ada 100%");
            request("Grace");
            mvc.perform(get("/api/admin/test-drives").param("q", "100%").with(user("curator").roles("ADMIN"))).andExpect(jsonPath("$.total").value(1));
            readAsAdmin("/api/admin/test-drives?q=GRACE").andExpect(jsonPath("$.items[0].name").value("Grace"));
            readAsAdmin("/api/admin/test-drives?q=_").andExpect(jsonPath("$.total").value(0));
            readAsAdmin("/api/admin/test-drives?status=CONFIRMED").andExpect(jsonPath("$.total").value(0));
            readAsAdmin("/api/admin/test-drives?page=-5").andExpect(jsonPath("$.total").value(2));
            readAsAdmin("/api/admin/test-drives?status=BOGUS").andExpect(status().isBadRequest());
        }

        @Test
        void changeAPriceAndSeeItInTheCatalogue() throws Exception {
            var id = optionId("PAINT", "ivory");
            asAdmin(put("/api/admin/options/" + id), edit("Ivory", 200000, true, version("option_item", id))).andExpect(status().isOk());
            mvc.perform(get("/api/catalog")).andExpect(jsonPath("$.PAINT[?(@.code=='ivory')].priceCents", contains(200000)));
            readAsAdmin("/api/admin/audit").andExpect(jsonPath("$.items[0].detail", containsString("2000.00 EUR")));
            asAdmin(put("/api/admin/options/" + id), edit("Ivory", 1, true, 0)).andExpect(status().isConflict());
        }

        @Test
        void readTheReport() throws Exception {
            saveDesign();
            saveDesign();
            request("Ada");
            readAsAdmin("/api/admin/report").andExpect(jsonPath("$.weeks", hasSize(12))).andExpect(jsonPath("$.weeks[11].designs").value(2)).andExpect(jsonPath("$.weeks[11].requests").value(1))
                .andExpect(jsonPath("$.weeks[10].requests").value(0)).andExpect(jsonPath("$.options[?(@.name=='Oxblood')].designs", contains(2))).andExpect(jsonPath("$.options[?(@.name=='Ivory')].designs", contains(0)))
                .andExpect(jsonPath("$.averageTotalCents").value(15545000));
            jdbc.update("delete from design");
            readAsAdmin("/api/admin/report").andExpect(jsonPath("$.averageTotalCents").value(nullValue()));
        }

        @Test
        void exportRequestsWithoutLettingFormulasRun() throws Exception {
            send(post("/api/test-drives"), drive(",\"message\":\"say \\\"hi\\\", ok\"").replace("Ada Test", "=HYPERLINK(1)")).andExpect(status().isCreated());
            var csv = readAsAdmin("/api/admin/test-drives.csv").andExpect(status().isOk()).andExpect(header().string("Content-Disposition", startsWith("attachment"))).andReturn().getResponse().getContentAsString();
            assertThat(csv).contains("\"'=HYPERLINK(1)\"", "\"say \"\"hi\"\", ok\"");
            assertThat(csv.lines()).hasSize(2);
            mvc.perform(get("/api/admin/test-drives.csv")).andExpect(status().isUnauthorized());
        }

        @Test
        void addAPaintOnce() throws Exception {
            var json = """
                {"kind":"PAINT","code":"night-green","values":%s}""".formatted(edit("Night green", 100, true, 0));
            asAdmin(post("/api/admin/options"), json).andExpect(status().isCreated()).andExpect(jsonPath("$.code").value("night-green"));
            asAdmin(post("/api/admin/options"), json).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.code").exists());
            jdbc.update("delete from option_item where code = 'night-green'");
        }

        @Test
        void areToldWhichOptionFieldsAreWrong() throws Exception {
            asAdmin(post("/api/admin/options"), """
                {"kind":"PAINT","code":"Bad Code","values":{"name":"","priceCents":-1,"color":"red","active":true,"position":0,"version":0}}""").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.code").exists()).andExpect(jsonPath("$.fields['values.name']").exists()).andExpect(jsonPath("$.fields['values.priceCents']").exists()).andExpect(jsonPath("$.fields['values.color']").exists());
        }

        @Test
        void cannotHideTheLastOption() throws Exception {
            jdbc.update("update option_item set active = false where kind = 'WHEELS' and code <> 'brass'");
            var id = optionId("WHEELS", "brass");
            asAdmin(put("/api/admin/options/" + id), edit("Brass", 1, false, version("option_item", id))).andExpect(status().isConflict());
        }
    }

    @Nested
    class Booking {
        String book(String at) throws Exception {
            return at(send(post("/api/test-drives"), body(at)).andExpect(status().isCreated()), "$.reference");
        }

        String body(String at) {
            return """
                {"name":"Ada","email":"Ada@Example.com","slotAt":"%s"}""".formatted(at);
        }

        String key(String ref) {
            return """
                {"reference":"%s","email":"ada@example.COM "}""".formatted(ref.toLowerCase());
        }

        ResultActions availability(String at) throws Exception {
            return mvc.perform(get("/api/availability").param("from", LocalDate.ofInstant(Instant.parse(at), ZONE).toString())).andExpect(status().isOk());
        }

        ResultActions expectFree(String at, boolean free) throws Exception {
            return availability(at).andExpect(jsonPath("$.days[0].slots[?(@.startsAt=='%s')].free".formatted(at), contains(free)));
        }

        ResultActions move(String ref, String at, int version) throws Exception {
            return send(post("/api/my-request/move"), """
                {"key":%s,"slotAt":"%s","version":%d}""".formatted(key(ref), at, version));
        }

        @Test
        void takesATimeOffTheCalendarAndCancellingGivesItBack() throws Exception {
            var at = slot(0);
            expectFree(at, true);
            var ref = book(at);
            expectFree(at, false);
            send(post("/api/test-drives"), body(at)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.slotAt").exists());
            send(post("/api/my-request/cancel"), "{\"key\":%s,\"version\":0}".formatted(key(ref))).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
            expectFree(at, true);
            book(at);
        }

        @Test
        void givesOneTimeToOnlyOneOfManyAtOnce() throws Exception {
            var at = slot(1);
            var json = body(at);
            var start = new CountDownLatch(1);
            try (var pool = Executors.newFixedThreadPool(12)) {
                var tries = new ArrayList<Future<Integer>>();
                for (int i = 0; i < 12; i++) tries.add(pool.submit(() -> { start.await(); return send(post("/api/test-drives"), json).andReturn().getResponse().getStatus(); }));
                start.countDown();
                var got = new ArrayList<Integer>();
                for (var t : tries) got.add(t.get());
                assertThat(got).containsOnly(201, 400).containsOnlyOnce(201);
            }
            assertThat(jdbc.queryForObject("select count(*) from test_drive_request", Integer.class)).isOne();
        }

        @Test
        void refusesTimesThatAreNotOffered() throws Exception {
            var t = Instant.parse(slot(0));
            for (var bad : List.of(t.plusSeconds(60), t.minus(Duration.ofDays(30)), t.plus(Duration.ofDays(364)), t.plus(Duration.ofHours(9))))
                send(post("/api/test-drives"), body(bad.toString())).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.slotAt").exists());
        }

        @Test
        void opensOnlyWithBothReferenceAndEmail() throws Exception {
            var ref = book(slot(0));
            send(post("/api/my-request"), key(ref)).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Ada")).andExpect(jsonPath("$.changeable").value(true)).andExpect(jsonPath("$.staffNote").doesNotExist());
            var wrongMail = at(send(post("/api/my-request"), key(ref).replace("ada@", "eve@")).andExpect(status().isNotFound()), "$.detail");
            var wrongRef = at(send(post("/api/my-request"), key("AAAAAA")).andExpect(status().isNotFound()), "$.detail");
            assertThat(wrongMail).isEqualTo(wrongRef);
            send(post("/api/my-request"), "{}").andExpect(jsonPath("$.fields.reference").exists()).andExpect(jsonPath("$.fields.email").exists());
        }

        @Test
        void guessingReferencesIsSlowedDown() throws Exception {
            for (int i = 0; i < 20; i++) send(post("/api/my-request"), key("AAAAAA")).andExpect(status().isNotFound());
            send(post("/api/my-request/cancel"), "{}").andExpect(status().isTooManyRequests());
        }

        @Test
        void movingFreesTheOldTimeAndAsksForConfirmationAgain() throws Exception {
            var ref = book(slot(0));
            jdbc.update("update test_drive_request set status = 'CONFIRMED'");
            move(ref, slot(2), 0).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("NEW")).andExpect(jsonPath("$.slotAt").value(slot(2)));
            expectFree(slot(0), true);
            expectFree(slot(2), false);
            move(ref, slot(3), 0).andExpect(status().isConflict());
            readAsAdmin("/api/admin/audit").andExpect(jsonPath("$.items[0].actor").value("visitor")).andExpect(jsonPath("$.items[0].action").value("request.moved"));
        }

        @Test
        void cannotBeChangedShortlyBeforeOrAfterwards() throws Exception {
            var ref = book(slot(0));
            jdbc.update("update test_drive_request set slot_at = now() + interval '3 hours'");
            send(post("/api/my-request"), key(ref)).andExpect(jsonPath("$.changeable").value(false));
            move(ref, slot(2), 0).andExpect(status().isConflict());
            jdbc.update("update test_drive_request set slot_at = now() + interval '9 days', status = 'COMPLETED'");
            send(post("/api/my-request/cancel"), "{\"key\":%s,\"version\":0}".formatted(key(ref))).andExpect(status().isConflict());
        }

        @Test
        void aMoveToATakenTimeChangesNothing() throws Exception {
            var ref = book(slot(0));
            book(slot(1));
            move(ref, slot(1), 0).andExpect(status().isBadRequest());
            expectFree(slot(0), false);
        }

        @Test
        void staffCloseAndReopenTimes() throws Exception {
            var at = slot(0);
            var json = "{\"startsAt\":\"%s\",\"closed\":%b}";
            asAdmin(put("/api/admin/calendar"), json.formatted(at, true)).andExpect(status().isNoContent());
            expectFree(at, false);
            send(post("/api/test-drives"), body(at)).andExpect(status().isBadRequest());
            asAdmin(put("/api/admin/calendar"), json.formatted(at, false)).andExpect(status().isNoContent());
            book(at);
            asAdmin(put("/api/admin/calendar"), json.formatted(at, true)).andExpect(status().isConflict());
            readAsAdmin("/api/admin/bookings?from=" + at).andExpect(jsonPath("$[0].name").value("Ada"));
        }

        @Test
        void aBookedTimeStaysOnTheCalendarWhenTheHoursChange() throws Exception {
            var at = slot(0);
            book(at);
            var local = Instant.parse(at).atZone(ZONE);
            var json = "{\"weekday\":%d,\"at\":\"%s\",\"open\":%b}";
            asAdmin(put("/api/admin/opening-times"), json.formatted(local.getDayOfWeek().getValue(), local.toLocalTime(), false)).andExpect(status().isNoContent());
            try {
                readAsAdmin("/api/admin/calendar?from=" + local.toLocalDate()).andExpect(jsonPath("$.days[*].slots[?(@.startsAt=='%s')].booked".formatted(at), contains(true)));
                send(post("/api/test-drives"), body(local.plusWeeks(1).toInstant().toString())).andExpect(status().isBadRequest());
            } finally {
                asAdmin(put("/api/admin/opening-times"), json.formatted(local.getDayOfWeek().getValue(), local.toLocalTime(), true));
            }
            asAdmin(put("/api/admin/opening-times"), json.formatted(8, "10:00", true)).andExpect(status().isBadRequest());
        }

        @Test
        void reopeningACancelledRequestNeedsItsTimeBack() throws Exception {
            var at = slot(0);
            book(at);
            var id = jdbc.queryForObject("select id from test_drive_request", Long.class);
            jdbc.update("update test_drive_request set status = 'CANCELLED'");
            book(at);
            asAdmin(patch("/api/admin/test-drives/" + id), "{\"status\":\"NEW\",\"version\":0}").andExpect(status().isBadRequest());
        }

        @Test
        void theDatabaseItselfRefusesTwoForOneTime() throws Exception {
            book(slot(0));
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update("insert into test_drive_request (reference, name, email, slot_at, status, created_at, updated_at) select 'TWICE2', name, email, slot_at, 'NEW', now(), now() from test_drive_request"))
                .isInstanceOf(org.springframework.dao.DuplicateKeyException.class);
        }
    }
}
