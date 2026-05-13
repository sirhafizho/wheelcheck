# WheelCheck Seed Data

This directory contains a compressed PostgreSQL seed dump of all accessibility places across **all 16 Malaysian states and federal territories** (~63,000 places).

## Restore seed data

After running the backend (which applies Flyway migrations and creates the schema):

```bash
# Decompress and load into your local DB
gunzip -c data/places-seed.sql.gz | docker exec -i <postgres-container> psql -U wheelcheck -d wheelcheck
```

Or if PostgreSQL is running locally:
```bash
gunzip -c data/places-seed.sql.gz | psql -U wheelcheck -d wheelcheck
```

## Data sources

| Source | Coverage |
|--------|----------|
| OpenStreetMap (Overpass API) | All states — wheelchair tags, POIs |
| data.gov.my (MOH Facilities) | All states — hospitals, clinics |

## Coverage

| State/Territory | ~Places |
|-----------------|---------|
| Malaysia (multi-state facilities) | 13,365 |
| Selangor | 7,634 |
| Sarawak | 7,357 |
| Johor | 5,976 |
| Pulau Pinang | 4,662 |
| Perak | 4,313 |
| Melaka | 2,250 |
| Sabah | 2,119 |
| Negeri Sembilan | 1,753 |
| W.P. Putrajaya | 1,145 |
| Kedah | 630 |
| Kelantan | 2,036 |
| Terengganu | 485 |
| W.P. Kuala Lumpur | 153 |
| W.P. Labuan | 127 |
| Perlis | 74 |
| Pahang | 1,730 |

## Refreshing data

As a self-hoster, you can re-import fresh data from OSM + data.gov.my at any time via the admin API:

```bash
# Import a single state
curl -X POST http://localhost:8080/api/aggregation/import/selangor \
  -H "Authorization: Bearer <admin-token>"

# Import all states at once (takes ~30 min)
curl -X POST http://localhost:8080/api/aggregation/import/malaysia \
  -H "Authorization: Bearer <admin-token>"
```

The import is idempotent — re-running it updates existing places with new OSM data and adds new ones.
