package dev.revival.catalog;

import dev.revival.audit.Audit;
import dev.revival.common.Problems;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/options")
class CatalogAdminController {
    record Edit(
        @NotBlank(message = "Enter a name.") @Size(max = 60, message = "Use at most 60 characters.") String name,
        @NotNull(message = "Enter a price.") @Min(value = 0, message = "A price cannot be negative.") @Max(value = 100_000_000, message = "That price is too high.") Integer priceCents,
        @Pattern(regexp = "#[0-9a-f]{6}", message = "Use a colour like #0d0e11.") String color,
        @DecimalMin("0") @DecimalMax("1") BigDecimal metalness, @DecimalMin("0") @DecimalMax("1") BigDecimal roughness, @DecimalMin("0") @DecimalMax("1") BigDecimal clearcoat,
        @NotNull Boolean active, @NotNull @Min(0) @Max(1000) Integer position, @NotNull Integer version) {}

    record Create(@NotNull Kind kind, @NotBlank(message = "Enter a code.") @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*", message = "Use lower-case letters, digits and dashes.") @Size(max = 40) String code, @NotNull @Valid Edit values) {}

    private final OptionItems items;
    private final Audit audit;

    CatalogAdminController(OptionItems items, Audit audit) {
        this.items = items;
        this.audit = audit;
    }

    @GetMapping
    List<OptionItem.View> all() {
        return items.ordered().stream().map(OptionItem::view).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    OptionItem.View create(@Valid @RequestBody Create in) {
        if (in.kind == Kind.BASE) throw Problems.invalid("kind", "There is one base car.");
        // The realtime view knows how to draw two finishes, so only paints and wheels can be added.
        if (in.kind == Kind.FINISH) throw Problems.invalid("kind", "Finishes are fixed.");
        if (items.find(in.kind, in.code).isPresent()) throw Problems.invalid("code", "This code is already in use.");
        requireMaterial(in.kind, in.values);
        var item = new OptionItem(in.kind, in.code);
        apply(item, in.values);
        items.saveAndFlush(item);
        audit.record("option.created", in.kind + " " + in.code, describe(item));
        return item.view();
    }

    @PutMapping("/{id}")
    @Transactional
    OptionItem.View update(@PathVariable long id, @Valid @RequestBody Edit in) {
        var kind = items.findById(id).map(OptionItem::kind).orElseThrow(() -> Problems.notFound("This option"));
        var siblings = items.lockKind(kind);
        var item = siblings.stream().filter(o -> o.id() == id).findFirst().orElseThrow(() -> Problems.notFound("This option"));
        if (item.version() != in.version) throw new ObjectOptimisticLockingFailureException(OptionItem.class, id);
        if (!in.active && siblings.stream().noneMatch(o -> o.id() != id && o.active())) throw Problems.conflict("At least one option of each kind has to stay available.");
        requireMaterial(kind, in);
        var before = describe(item);
        apply(item, in);
        items.saveAndFlush(item);
        audit.record("option.changed", kind + " " + item.code(), before + " -> " + describe(item));
        return item.view();
    }

    private static void requireMaterial(Kind kind, Edit in) {
        if ((kind == Kind.PAINT || kind == Kind.WHEELS) && in.color == null) throw Problems.invalid("color", "Choose a colour.");
        if ((kind == Kind.PAINT || kind == Kind.WHEELS) && in.roughness == null) throw Problems.invalid("roughness", "Enter a value between 0 and 1.");
        if (kind == Kind.PAINT && in.metalness == null) throw Problems.invalid("metalness", "Enter a value between 0 and 1.");
        if (kind == Kind.PAINT && in.clearcoat == null) throw Problems.invalid("clearcoat", "Enter a value between 0 and 1.");
    }

    private static void apply(OptionItem o, Edit in) {
        o.update(in.name.strip(), in.priceCents, in.color, in.metalness, in.roughness, in.clearcoat, in.active, in.position);
    }

    private static String describe(OptionItem o) {
        return "%s, %.2f EUR, %s".formatted(o.name(), o.priceCents() / 100.0, o.active() ? "available" : "hidden");
    }
}
