package dev.revival.design;

import dev.revival.catalog.*;
import dev.revival.common.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Clock;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
class DesignController {
    record Save(@NotNull(message = "Choose a paint.") String paint, @NotNull(message = "Choose a finish.") String finish, @NotNull(message = "Choose wheels.") String wheels, @NotNull Boolean headlights, @NotNull Boolean taillights) {}

    private final Designs designs;
    private final OptionItems items;
    private final Clock clock;

    DesignController(Designs designs, OptionItems items, Clock clock) {
        this.designs = designs;
        this.items = items;
        this.clock = clock;
    }

    @PostMapping("/api/designs")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    Design.View save(@Valid @RequestBody Save in) {
        var paint = pick(Kind.PAINT, "paint", in.paint);
        var finish = pick(Kind.FINISH, "finish", in.finish);
        var wheels = pick(Kind.WHEELS, "wheels", in.wheels);
        int base = items.find(Kind.BASE, "coupe").map(OptionItem::priceCents).orElseThrow();
        return designs.save(new Design(Codes.unique(8, designs::existsByCode), paint, finish, wheels, in.headlights, in.taillights, base, clock.instant())).view();
    }

    @GetMapping("/api/designs/{code}")
    @Transactional(readOnly = true)
    Design.View get(@PathVariable String code) {
        return designs.find(code.toUpperCase(Locale.ROOT)).map(Design::view).orElseThrow(() -> Problems.notFound("This design"));
    }

    @GetMapping("/api/admin/designs")
    @Transactional(readOnly = true)
    Paged<Design.View> latest(@RequestParam(defaultValue = "0") int page) {
        return Paged.of(designs.latest(Paged.request(page)), Design::view);
    }

    private OptionItem pick(Kind kind, String field, String code) {
        return items.find(kind, code).filter(OptionItem::active).orElseThrow(() -> Problems.invalid(field, "This option is no longer available."));
    }
}
