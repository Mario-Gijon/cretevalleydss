FROM python:3.12-slim-bookworm

WORKDIR /usr/src/app

COPY ./ModelForge/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./ModelForge .

ENV MODEL_FORGE_PORT=7100

EXPOSE 7100

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7100"]