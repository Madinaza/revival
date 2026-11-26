package dev.revival.booking;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalTime;

@Entity
class OpeningTime {
    @Embeddable
    record Key(short weekday, LocalTime at) implements Serializable {}

    @EmbeddedId private Key key;

    protected OpeningTime() {}

    OpeningTime(Key key) {
        this.key = key;
    }

    Key key() { return key; }
}
