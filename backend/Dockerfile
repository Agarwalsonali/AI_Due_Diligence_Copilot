FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install torch with CPU-only version to reduce image size
RUN pip install --no-cache-dir --default-timeout=300 --retries=5 torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir --default-timeout=300 --retries=5 -r requirements.txt

COPY . .

# Pre-download the local embedding model at build time so container startup
# is fast and works without network access at runtime.
ENV HF_HOME=/app/models/hf
RUN python -c "from sentence_transformers import SentenceTransformer; m = SentenceTransformer('all-MiniLM-L6-v2'); print('dim:', m.get_sentence_embedding_dimension())"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]