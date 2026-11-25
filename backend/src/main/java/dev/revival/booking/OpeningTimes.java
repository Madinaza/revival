package dev.revival.booking;

import org.springframework.data.jpa.repository.JpaRepository;

interface OpeningTimes extends JpaRepository<OpeningTime, OpeningTime.Key> {}
