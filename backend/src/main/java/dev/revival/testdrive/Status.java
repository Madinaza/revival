package dev.revival.testdrive;

public enum Status {
    NEW, CONFIRMED, COMPLETED, CANCELLED;

    boolean canBecome(Status next) {
        return this == next || switch (this) {
            case NEW -> next == CONFIRMED || next == CANCELLED;
            case CONFIRMED -> next == COMPLETED || next == CANCELLED;
            case CANCELLED -> next == NEW;
            case COMPLETED -> false;
        };
    }
}
