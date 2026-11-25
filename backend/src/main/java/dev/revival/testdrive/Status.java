package dev.revival.testdrive;

public enum Status {
    NEW, CONFIRMED, COMPLETED, CANCELLED;

    /** A live request holds its time. Keep in step with the unique index in V3. */
    boolean live() {
        return this == NEW || this == CONFIRMED;
    }

    boolean canBecome(Status next) {
        return this == next || switch (this) {
            case NEW -> next == CONFIRMED || next == CANCELLED;
            case CONFIRMED -> next == COMPLETED || next == CANCELLED;
            case CANCELLED -> next == NEW;
            case COMPLETED -> false;
        };
    }
}
