package dev.revival.report;

import dev.revival.booking.Calendar;
import java.time.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;

/** Numbers for the front desk, counted by the database. */
@RestController
@RequestMapping("/api/admin")
class ReportController {
    record Week(LocalDate monday, long requests, long designs) {}
    record Share(String kind, String name, String color, long designs) {}
    record Report(List<Week> weeks, List<Share> options, Integer averageTotalCents) {}

    private final JdbcClient jdbc;
    private final Calendar calendar;

    ReportController(JdbcClient jdbc, Calendar calendar) {
        this.jdbc = jdbc;
        this.calendar = calendar;
    }

    @GetMapping("/report")
    Report report() {
        var zone = calendar.zone().getId();
        var monday = calendar.today().with(DayOfWeek.MONDAY);
        var weeks = jdbc.sql("""
            with week as (select generate_series(:first::date, :last::date, interval '7 days')::date as monday)
            select monday,
              (select count(*) from test_drive_request t where date_trunc('week', t.created_at at time zone :zone)::date = monday) requests,
              (select count(*) from design d where date_trunc('week', d.created_at at time zone :zone)::date = monday) designs
            from week order by monday""")
            .param("first", monday.minusWeeks(11)).param("last", monday).param("zone", zone)
            .query((rs, n) -> new Week(rs.getObject(1, LocalDate.class), rs.getLong(2), rs.getLong(3))).list();
        var options = jdbc.sql("""
            select o.kind, o.name, o.color, count(d.id) n from option_item o
            left join design d on o.id in (d.paint_id, d.finish_id, d.wheels_id)
            where o.kind <> 'BASE' group by o.id order by o.kind, n desc, o.position""")
            .query((rs, n) -> new Share(rs.getString(1), rs.getString(2), rs.getString(3), rs.getLong(4))).list();
        var average = jdbc.sql("select round(avg(total_cents))::integer from design").query((rs, n) -> rs.getObject(1, Integer.class)).list().getFirst();
        return new Report(weeks, options, average);
    }

    @GetMapping(value = "/test-drives.csv", produces = "text/csv")
    ResponseEntity<String> csv() {
        var out = new StringBuilder("reference,status,name,email,phone,drive,design,message,staff note,received\r\n");
        jdbc.sql("""
            select t.reference, t.status, t.name, t.email, t.phone,
              coalesce(to_char(t.slot_at at time zone :zone, 'YYYY-MM-DD HH24:MI'), t.preferred_date::text), d.code, t.message, t.staff_note,
              to_char(t.created_at at time zone :zone, 'YYYY-MM-DD HH24:MI')
            from test_drive_request t left join design d on d.id = t.design_id order by t.id desc""").param("zone", calendar.zone().getId())
            .query(rs -> {
                for (int i = 1; i <= 10; i++) out.append(i == 1 ? "" : ",").append(cell(rs.getString(i)));
                out.append("\r\n");
            });
        return ResponseEntity.ok().contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"test-drives-" + calendar.today() + ".csv\"").body("﻿" + out);
    }

    /** Quoted, and with a leading apostrophe where a spreadsheet would otherwise run the text as a formula. */
    static String cell(String s) {
        if (s == null) return "";
        var safe = !s.isEmpty() && "=+-@\t\r".indexOf(s.charAt(0)) >= 0 ? "'" + s : s;
        return '"' + safe.replace("\"", "\"\"") + '"';
    }
}
