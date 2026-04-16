# Zona Tracker

App wellness single-file HTML, hostata su GitHub Pages.

## File principale

`zona-tracker.html` — tutta l'app è in questo unico file (HTML + CSS + JS).

## URL pubblico

https://ignaziof321621.github.io/benessere-forma/zona-tracker.html

## Repository

https://github.com/IgnazioF321621/benessere-forma

## Stack tecnico

- HTML/CSS/JavaScript puro
- Nessun framework, nessun build step
- Un solo file da modificare: `zona-tracker.html`

## Servizi esterni

| Servizio | URL | Scopo |
|---|---|---|
| Cloudflare Worker | `zona-ai.ignaziof23.workers.dev` | Proxy verso Groq API (llama-3.3-70b-versatile) |
| Supabase | `https://qxiyeiahpoiliwpqslpr.supabase.co` | Database |

## Deploy

Per pubblicare le modifiche:

```bash
git add zona-tracker.html
git commit -m "Descrizione della modifica"
git push origin main
```

GitHub Pages si aggiorna automaticamente dopo il push (di solito in 1-2 minuti).

## Note

- Non serve compilare niente, non serve installare niente.
- L'unico file da toccare normalmente è `zona-tracker.html`.
- Il branch di lavoro è `main`.
