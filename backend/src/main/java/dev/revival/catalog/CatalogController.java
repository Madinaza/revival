package dev.revival.catalog;

import static java.util.stream.Collectors.groupingBy;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class CatalogController {
    private final OptionItems items;

    CatalogController(OptionItems items) {
        this.items = items;
    }

    @GetMapping("/api/catalog")
    Map<Kind, List<OptionItem.View>> catalog() {
        return items.ordered().stream().filter(OptionItem::active).map(OptionItem::view).collect(groupingBy(OptionItem.View::kind));
    }
}
