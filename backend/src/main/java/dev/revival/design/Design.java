package dev.revival.design;

import dev.revival.catalog.OptionItem;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class Design {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String code;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private OptionItem paint;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private OptionItem finish;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private OptionItem wheels;
    private boolean headlights, taillights;
    private int totalCents;
    /** Empty on designs saved before single prices were kept. */
    private Integer baseCents, paintCents, finishCents, wheelsCents;
    private Instant createdAt;

    protected Design() {}

    Design(String code, OptionItem paint, OptionItem finish, OptionItem wheels, boolean headlights, boolean taillights, int baseCents, Instant createdAt) {
        this.code = code;
        this.paint = paint;
        this.finish = finish;
        this.wheels = wheels;
        this.headlights = headlights;
        this.taillights = taillights;
        this.baseCents = baseCents;
        this.paintCents = paint.priceCents();
        this.finishCents = finish.priceCents();
        this.wheelsCents = wheels.priceCents();
        this.totalCents = Math.addExact(Math.addExact(baseCents, paintCents), Math.addExact(finishCents, wheelsCents));
        this.createdAt = createdAt;
    }

    public String code() { return code; }

    public record View(String code, OptionItem.View paint, OptionItem.View finish, OptionItem.View wheels, boolean headlights, boolean taillights, int totalCents, Prices prices, Instant createdAt) {}
    public record Prices(int base, int paint, int finish, int wheels) {}

    public View view() {
        return new View(code, paint.view(), finish.view(), wheels.view(), headlights, taillights, totalCents,
            baseCents == null ? null : new Prices(baseCents, paintCents, finishCents, wheelsCents), createdAt);
    }
}
