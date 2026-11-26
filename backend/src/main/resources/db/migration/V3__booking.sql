-- Availability = weekly opening times, minus closed times, minus live requests.
create table opening_time (
  weekday smallint not null check (weekday between 1 and 7), -- ISO: Monday is 1
  at      time     not null,
  primary key (weekday, at)
);
create table closed_time (
  starts_at timestamptz primary key,
  closed_by varchar(60) not null
);
insert into opening_time (weekday, at)
select d, t from generate_series(2, 6) d, unnest(array['10:00', '11:30', '14:00', '15:30']::time[]) t;

-- Requests made before booking existed named a day only, and keep it.
alter table test_drive_request add column slot_at timestamptz;
alter table test_drive_request alter column preferred_date drop not null;
alter table test_drive_request add constraint test_drive_has_a_date check (slot_at is not null or preferred_date is not null);
-- The database itself refuses to give one time to two people.
create unique index test_drive_one_per_slot on test_drive_request (slot_at) where status in ('NEW', 'CONFIRMED');
