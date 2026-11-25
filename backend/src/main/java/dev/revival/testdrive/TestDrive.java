package dev.revival.testdrive;

import dev.revival.design.Design;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "test_drive_request")
class TestDrive {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String reference, name, email, phone;
    /** Only on requests made before booking existed. */
    private LocalDate preferredDate;
    private Instant slotAt;
    private String message;
    @ManyToOne(fetch = FetchType.LAZY) private Design design;
    @Enumerated(EnumType.STRING) private Status status = Status.NEW;
    private String staffNote;
    @Version private int version;
    private Instant createdAt, updatedAt;

    protected TestDrive() {}

    TestDrive(String reference, String name, String email, String phone, Instant slotAt, String message, Design design, Instant now) {
        this.reference = reference;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.slotAt = slotAt;
        this.message = message;
        this.design = design;
        this.createdAt = this.updatedAt = now;
    }

    String reference() { return reference; }
    Status status() { return status; }
    int version() { return version; }
    Instant slotAt() { return slotAt; }
    String email() { return email; }
    Design design() { return design; }

    void move(Instant slotAt, Instant now) {
        this.slotAt = slotAt;
        this.status = Status.NEW;
        this.updatedAt = now;
    }

    void cancel(Instant now) {
        this.status = Status.CANCELLED;
        this.updatedAt = now;
    }

    void handle(Status status, String staffNote, Instant now) {
        this.status = status;
        this.staffNote = staffNote;
        this.updatedAt = now;
    }

    record View(Long id, String reference, String name, String email, String phone, LocalDate preferredDate, Instant slotAt, String message, String designCode,
                Status status, String staffNote, int version, Instant createdAt, Instant updatedAt) {}

    View view() {
        return new View(id, reference, name, email, phone, preferredDate, slotAt, message, design == null ? null : design.code(), status, staffNote, version, createdAt, updatedAt);
    }
}
