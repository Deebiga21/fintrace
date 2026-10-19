# Build stage
FROM rust:1.80-alpine as builder

RUN apk add --no-cache musl-dev sqlite-dev

WORKDIR /app
COPY Cargo.toml ./
COPY src ./src
COPY migrations ./migrations

RUN cargo build --release

# Runtime stage
FROM alpine:3.20

RUN apk add --no-cache libgcc sqlite-libs

WORKDIR /app
COPY --from=builder /app/target/release/fintrace-backend /app/fintrace-backend
COPY --from=builder /app/migrations /app/migrations

ENV HOST=0.0.0.0
ENV PORT=8000
EXPOSE 8000

CMD ["/app/fintrace-backend"]
