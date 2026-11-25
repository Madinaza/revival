package dev.revival.catalog;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
public class OptionItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Enumerated(EnumType.STRING) @Column(updatable = false) private Kind kind;
    @Column(updatable = false) private String code;
    private String name;
    private int priceCents;
    private String color;
    private BigDecimal metalness, roughness, clearcoat;
    private boolean active = true;
    private int position;
    @Version private int version;

    protected OptionItem() {}

    OptionItem(Kind kind, String code) {
        this.kind = kind;
        this.code = code;
    }

    void update(String name, int priceCents, String color, BigDecimal metalness, BigDecimal roughness, BigDecimal clearcoat, boolean active, int position) {
        this.name = name;
        this.priceCents = priceCents;
        this.color = color;
        this.metalness = metalness;
        this.roughness = roughness;
        this.clearcoat = clearcoat;
        this.active = active;
        this.position = position;
    }

    public Long id() { return id; }
    public Kind kind() { return kind; }
    public String code() { return code; }
    public String name() { return name; }
    public int priceCents() { return priceCents; }
    public boolean active() { return active; }
    int version() { return version; }

    public View view() {
        return new View(id, kind, code, name, priceCents, color, metalness, roughness, clearcoat, active, position, version);
    }

    public record View(Long id, Kind kind, String code, String name, int priceCents, String color,
                       BigDecimal metalness, BigDecimal roughness, BigDecimal clearcoat, boolean active, int position, int version) {}
}
