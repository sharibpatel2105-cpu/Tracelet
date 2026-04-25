# CircleSafe Public Deployment

CircleSafe now has a small server-side API, server-side login, and a shared state store so parent and child devices can coordinate over the internet.

## Demo logins

- Parent: `parent` / `parent123`
- Child: `child` / `child123`

For a public deployment, set stronger passwords with these environment variables:

- `CIRCLESAFE_PARENT_PASSWORD`
- `CIRCLESAFE_CHILD_PASSWORD`

## Deploy on Render

1. Create a GitHub repository with these files.
2. Push this folder to GitHub.
3. In Render, create a new Web Service from that repository.
4. Render should detect `render.yaml`; if not, use:
   - Build command: leave blank
   - Start command: `python server.py`
5. Add environment variables for the two passwords above.
6. Open the public HTTPS Render URL on both devices.

## How to use across phone and laptop

1. Open the public HTTPS app URL on the child's phone.
2. Log in as `child`.
3. Tap `Share my location` and allow location permission.
4. Open the same public HTTPS app URL on the parent's laptop or phone.
5. Log in as `parent`.
6. The parent map refreshes automatically with the child's latest shared location.

## Notes

This is still a prototype. The included file-based data store is okay for a first private test, but a production app should use a real database such as Postgres, Firebase, or Supabase, plus account recovery, audit logs, and notification delivery.
