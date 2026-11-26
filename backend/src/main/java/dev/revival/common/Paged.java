package dev.revival.common;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

public record Paged<T>(List<T> items, int page, int size, long total) {
    private static final int SIZE = 20;

    public static Pageable request(int page) {
        return PageRequest.of(Math.clamp(page, 0, 10_000), SIZE);
    }

    public static <E, T> Paged<T> of(Page<E> page, Function<E, T> map) {
        return new Paged<>(page.map(map).getContent(), page.getNumber(), page.getSize(), page.getTotalElements());
    }
}
