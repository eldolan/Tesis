## Cursor Cloud specific instructions

This is a Flask-based agricultural IoT sensor monitoring dashboard ("Panel de Control"). It is a single monolithic Python application with an embedded SQLite database — no external services required for core functionality.

### Running the app

```
flask run --host=0.0.0.0 --port=5000 --debug
```

The SQLite database (`instance/adminpanel.db`) is auto-created on first run via `db.create_all()`.

### Environment variables

Create a `.env` file in the project root. The app loads it via `python-dotenv`.

- `OPENWEATHER_API_KEY` — required for the weather widget; without a valid key, the weather city selector will return an error but the rest of the dashboard works fine.
- `SENSOR_API_KEY` — required for the CSV upload endpoint (`POST /upload`). Defaults to `default-sensor-key-change-me`.

### Linting

No project-level linter config exists. Use `flake8 --max-line-length=120` for style checks. Pre-existing style warnings are present in the codebase.

### Key gotchas

- The `city.list.json` file (OpenWeatherMap city list, ~30 MB) must be in the working directory for the `/get_chilean_cities` endpoint to work. Always run Flask from the repo root.
- `psycopg2-binary` is in `requirements.txt` but the app uses SQLite by default — PostgreSQL is only for production.
- The `instance/` directory (SQLite DB) is gitignored; it is auto-created.
- `$HOME/.local/bin` must be on `PATH` for `flask` and `gunicorn` CLI commands (pip installs there in user mode).
- The frontend polls `/get_irrigation_data` and `/get_fertilizer_data` every 5 seconds via JavaScript, so the dev server stays active.

### Uploading test sensor data

```
curl -X POST http://localhost:5000/upload \
  -H "X-API-Key: default-sensor-key-change-me" \
  -F "file=@path/to/sensor_data.csv"
```

CSV must have 16 columns: `timestamp,Temp_20cm,Hum_20cm,Cond_20cm,PH_20cm,N_20cm,P_20cm,K_20cm,Temp_40cm,Hum_40cm,Cond_40cm,Temp_60cm,Hum_60cm,PH_60cm,Onboard_Temp,Onboard_Hum`.
