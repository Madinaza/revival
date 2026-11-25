create table option_item (
  id          bigint generated always as identity primary key,
  kind        varchar(12)  not null check (kind in ('BASE', 'PAINT', 'FINISH', 'WHEELS')),
  code        varchar(40)  not null,
  name        varchar(60)  not null,
  price_cents integer      not null check (price_cents >= 0),
  color       varchar(7)   check (color ~ '^#[0-9a-f]{6}$'),
  metalness   numeric(3,2) check (metalness between 0 and 1),
  roughness   numeric(3,2) check (roughness between 0 and 1),
  clearcoat   numeric(3,2) check (clearcoat between 0 and 1),
  active      boolean      not null default true,
  position    integer      not null default 0,
  version     integer      not null default 0,
  unique (kind, code)
);
create table design (
  id          bigint generated always as identity primary key,
  code        varchar(12) not null unique,
  paint_id    bigint      not null references option_item,
  finish_id   bigint      not null references option_item,
  wheels_id   bigint      not null references option_item,
  headlights  boolean     not null,
  taillights  boolean     not null,
  total_cents integer     not null check (total_cents >= 0), -- price on the day it was saved
  created_at  timestamptz not null
);
create index design_created_idx on design (created_at desc);
create table test_drive_request (
  id             bigint generated always as identity primary key,
  reference      varchar(12)   not null unique,
  name           varchar(80)   not null,
  email          varchar(160)  not null,
  phone          varchar(30),
  preferred_date date          not null,
  message        varchar(1000),
  design_id      bigint references design,
  status         varchar(12)   not null check (status in ('NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
  staff_note     varchar(1000),
  version        integer       not null default 0,
  created_at     timestamptz   not null,
  updated_at     timestamptz   not null
);
create index test_drive_status_idx on test_drive_request (status, created_at desc);
create table admin_user (
  id            bigint generated always as identity primary key,
  username      varchar(60)  not null unique check (username = lower(username)),
  password_hash varchar(200) not null,
  created_at    timestamptz  not null
);
create table audit_entry (
  id     bigint generated always as identity primary key,
  at     timestamptz  not null,
  actor  varchar(60)  not null,
  action varchar(40)  not null,
  subject varchar(80) not null,
  detail varchar(500) not null
);
create index audit_at_idx on audit_entry (at desc);
