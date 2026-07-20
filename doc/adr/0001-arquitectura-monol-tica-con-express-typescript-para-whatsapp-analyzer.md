# ADR 1: Arquitectura monolítica con Express + TypeScript para WhatsApp Analyzer

**Status:** accepted

## Context

Se necesita una aplicacion web para analizar conversaciones de WhatsApp. Los datos se procesan en memoria, no requieren BD persistente. El usuario prefiere Node.js/TypeScript con interfaz web.

## Decision

Usar Express + TypeScript como monolito, sirviendo HTML estatico con Chart.js. Los datos se almacenan en Map en memoria con UUID como clave de sesion. El parser usa regex para soportar formatos de fecha en espanol e ingles.

## Alternatives

  - Python + Flask + Celery para procesamiento asyncrono
  - Next.js con API routes y base de datos SQLite
  - Electron + React para app de escritorio
