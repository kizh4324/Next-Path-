# Build context is the REPO ROOT, not ./backend — the seed catalogue lives at
# data/seed/ outside the backend tree and has to be baked into the image. Relying on a
# bind mount worked under docker-compose and silently produced an empty catalogue
# everywhere else.
#
#   docker build -f backend/Dockerfile -t nextpath-api .

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    SEED_ROOT=/app/data/seed

WORKDIR /app

# Build deps for asyncpg/cryptography wheels that lack a manylinux build.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY backend/ ./

# The built catalogue (~8k lines of JSON). The raw Dataset/ sources are NOT copied —
# they are only needed by the build_*_seed.py scripts at authoring time.
COPY data/seed/ ./data/seed/

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
