import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe, Shield, Server, Database, MessageSquare,
  BarChart2, HardDrive, Cloud, Box, Layers, Lock,
  Eye, Activity, Zap, GitBranch, X, ChevronRight,
  CheckCircle2, Cpu, ArrowRight, Plus, ChevronsRight,
  ChevronsDown, RefreshCw, Workflow, AlertTriangle,
  WifiOff, Loader2, Bell, BellOff, Volume2,
  Play, Pause, SkipBack, SkipForward, RotateCcw,
} from 'lucide-react';
import LogoMark from '@/components/LogoMark';
import { useSystemHealth, type ServiceStatus, type SystemHealth } from '@/hooks/useSystemHealth';

// ─── Finnish flag palette ─────────────────────────────────────────────────────
// White #FFFFFF  |  Blue #003580  |  Navy #001f5c  |  Sky #dbeafe
//
// Layer color map (blue family, light-on-dark cards)
const C = {
  client:     { bg: 'bg-[#003580]',  border: 'border-[#0047b3]', ring: 'ring-[#0047b3]', dot: 'bg-[#003580]' },
  gateway:    { bg: 'bg-[#001f5c]',  border: 'border-[#003580]', ring: 'ring-[#003580]', dot: 'bg-[#001f5c]' },
  nginx:      { bg: 'bg-[#1d4ed8]',  border: 'border-[#3b82f6]', ring: 'ring-[#3b82f6]', dot: 'bg-[#1d4ed8]' },
  service:    { bg: 'bg-[#2563eb]',  border: 'border-[#60a5fa]', ring: 'ring-[#60a5fa]', dot: 'bg-[#2563eb]' },
  worker:     { bg: 'bg-[#0369a1]',  border: 'border-[#38bdf8]', ring: 'ring-[#38bdf8]', dot: 'bg-[#0369a1]' },
  zookeeper:  { bg: 'bg-[#075985]',  border: 'border-[#7dd3fc]', ring: 'ring-[#7dd3fc]', dot: 'bg-[#075985]' },
  kafka:      { bg: 'bg-[#0c4a6e]',  border: 'border-[#38bdf8]', ring: 'ring-[#38bdf8]', dot: 'bg-[#0c4a6e]' },
  database:   { bg: 'bg-[#1e3a8a]',  border: 'border-[#93c5fd]', ring: 'ring-[#93c5fd]', dot: 'bg-[#1e3a8a]' },
  storage:    { bg: 'bg-[#0284c7]',  border: 'border-[#7dd3fc]', ring: 'ring-[#7dd3fc]', dot: 'bg-[#0284c7]' },
  cache:      { bg: 'bg-[#b91c1c]',  border: 'border-[#fca5a5]', ring: 'ring-[#fca5a5]', dot: 'bg-[#b91c1c]' },
  observe:    { bg: 'bg-[#4338ca]',  border: 'border-[#a5b4fc]', ring: 'ring-[#a5b4fc]', dot: 'bg-[#4338ca]' },
};

// Hex values for SVG (mirrors C palette)
const KIND_HEX: Record<keyof typeof C, string> = {
  client:'#003580', gateway:'#001f5c', nginx:'#1d4ed8', service:'#2563eb',
  worker:'#0369a1', zookeeper:'#075985', kafka:'#0c4a6e', database:'#1e3a8a',
  storage:'#0284c7', cache:'#b91c1c', observe:'#4338ca',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Comp {
  id: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  image: string;
  ports?: string[];
  kind: keyof typeof C;
  description: string;
  tech: string[];
  responsibilities: string[];
  topics?: string[];
  config?: { env?: string[]; volumes?: string[]; network?: string };
}

// ─── All components ───────────────────────────────────────────────────────────
const ALL: Record<string, Comp> = {
  browser: {
    id: 'browser', label: 'Browser', sub: 'React SPA · :5173',
    icon: <Globe className="w-4 h-4" />, image: 'dynadoc-flow-frontend',
    ports: ['5173'], kind: 'client',
    description: 'The single-page application users interact with. Built with React 18 + TypeScript. All API calls go through Kong Gateway. Hot-reload dev server via Vite.',
    tech: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'shadcn/ui', 'TanStack Query', 'react-router-dom', 'i18next'],
    responsibilities: ['Template CRUD UI', 'Document generation requests', 'File list & download', 'Batch processing UI', 'User auth flows'],
  },
  kong: {
    id: 'kong', label: 'Kong Gateway', sub: ':8000 / :8001 admin',
    icon: <Shield className="w-4 h-4" />, image: 'kong:3.6',
    ports: ['8000', '8001', '8443', '8444'], kind: 'gateway',
    description: 'Central API gateway. All client traffic enters here. Handles JWT auth, rate limiting, and routes to downstream Nginx proxies. Admin API on :8001.',
    tech: ['Kong 3.6', 'JWT Plugin', 'Rate-Limiting Plugin', 'CORS Plugin'],
    responsibilities: ['RS256 JWT validation', 'Rate limiting per consumer', 'Request routing', 'CORS headers', 'API key management'],
  },
  'kong-db': {
    id: 'kong-db', label: 'kong-db', sub: 'PostgreSQL 15',
    icon: <Database className="w-4 h-4" />, image: 'postgres:15',
    ports: ['5432 (internal)'], kind: 'database',
    description: 'Kong stores its routes, services, plugins, and consumers in this dedicated PostgreSQL database. Not exposed externally.',
    tech: ['PostgreSQL 15'],
    responsibilities: ['Kong routes & services', 'Plugin configurations', 'Consumer credentials', 'Rate-limit counters'],
  },
  'user-nginx': {
    id: 'user-nginx', label: 'user-nginx', sub: 'Nginx · :8081→:80',
    icon: <Server className="w-4 h-4" />, image: 'nginx:alpine',
    ports: ['8081'], kind: 'nginx',
    description: 'Nginx reverse proxy for the User Service. Listens on :8081, forwards FastCGI to user-app:9000 (PHP-FPM). Handles static assets and gzip.',
    tech: ['Nginx Alpine', 'FastCGI pass'],
    responsibilities: ['Reverse-proxy to user-app:9000', 'Static asset serving', 'Gzip compression'],
  },
  'template-nginx': {
    id: 'template-nginx', label: 'template-nginx', sub: 'Nginx · :8082→:80',
    icon: <Server className="w-4 h-4" />, image: 'nginx:alpine',
    ports: ['8082'], kind: 'nginx',
    description: 'Nginx reverse proxy for Template Service. Listens on :8082, FastCGI to template-app:9000.',
    tech: ['Nginx Alpine', 'FastCGI pass'],
    responsibilities: ['Reverse-proxy to template-app:9000', 'Static asset serving'],
  },
  'file-nginx': {
    id: 'file-nginx', label: 'file-nginx', sub: 'Nginx · :8083→:80',
    icon: <Server className="w-4 h-4" />, image: 'nginx:alpine',
    ports: ['8083'], kind: 'nginx',
    description: 'Nginx reverse proxy for File Service. Listens on :8083, FastCGI to file-app:9000.',
    tech: ['Nginx Alpine', 'FastCGI pass'],
    responsibilities: ['Reverse-proxy to file-app:9000'],
  },
  'audit-nginx': {
    id: 'audit-nginx', label: 'audit-nginx', sub: 'Nginx · :8084→:80',
    icon: <Server className="w-4 h-4" />, image: 'nginx:alpine',
    ports: ['8084'], kind: 'nginx',
    description: 'Nginx reverse proxy for Audit Service. Listens on :8084, FastCGI to audit-app:9000.',
    tech: ['Nginx Alpine', 'FastCGI pass'],
    responsibilities: ['Reverse-proxy to audit-app:9000'],
  },
  'notification-nginx': {
    id: 'notification-nginx', label: 'notification-nginx', sub: 'Nginx sidecar · :80',
    icon: <Server className="w-4 h-4" />, image: 'nginx:alpine',
    ports: ['80'], kind: 'nginx',
    description: 'Nginx sidecar container for the Notification Service. Serves the Laravel public directory and proxies PHP requests via FastCGI to notification-app on port 9000.',
    tech: ['Nginx Alpine', 'FastCGI pass'],
    responsibilities: ['Reverse-proxy to notification-app:9000', 'Static asset serving'],
  },
  'user-app': {
    id: 'user-app', label: 'user-app', sub: 'Laravel 12 · PHP-FPM :9000',
    icon: <Lock className="w-4 h-4" />, image: 'dynadoc-flow-user-app',
    ports: ['9000 (FPM, internal)'], kind: 'service',
    description: 'User Service — handles all identity and auth operations. Issues RS256 JWTs. On login, publishes a `user.logged` event to Kafka. Password reset publishes a `notification.send` event so the Notification Service dispatches the reset email.',
    tech: ['PHP Laravel 12', 'PHP-FPM', 'PostgreSQL', 'JWT RS256', 'rdkafka', 'OpenTelemetry'],
    responsibilities: ['User registration & login', 'JWT issuance & rotation', 'Password reset flow', 'Profile management', 'Publishes user.logged to Kafka', 'Publishes notification.send for password reset emails'],
    topics: ['user.logged', 'notification.send'],
    config: { env: ['DB_HOST=user-db', 'DB_PORT=5432', 'REDIS_HOST=redis', 'KAFKA_BROKERS=kafka-svc:9092', 'JWT_ALGO=RS256', 'FRONTEND_URL=https://ddoc.fi'], volumes: ['./storage:/var/www/html/storage'], network: 'dynadoc-net' },
  },
  'template-app': {
    id: 'template-app', label: 'template-app', sub: 'Laravel 12 · PHP-FPM :9000',
    icon: <Layers className="w-4 h-4" />, image: 'dynadoc-flow-template-app',
    ports: ['9000 (FPM, internal)'], kind: 'service',
    description: 'Template Service — core domain service. Manages templates, sections, tags, and contexts. Publishes generation jobs to Kafka. Queue worker processes PDF asynchronously.',
    tech: ['PHP Laravel 12', 'PHP-FPM', 'PostgreSQL', 'rdkafka', 'OpenTelemetry'],
    responsibilities: ['Template CRUD', 'Section & tag management', 'Context management', 'Enqueue PDF generation jobs', 'Publishes template.requested to Kafka'],
    topics: ['template.requested', 'template.delivered'],
    config: { env: ['DB_HOST=template-db', 'DB_PORT=5432', 'KAFKA_BROKERS=kafka1:9092,kafka2:9093,kafka3:9094', 'QUEUE_CONNECTION=database'], volumes: ['./storage:/var/www/html/storage'], network: 'dynadoc-net' },
  },
  'file-app': {
    id: 'file-app', label: 'file-app', sub: 'Laravel 12 · PHP-FPM :9000',
    icon: <HardDrive className="w-4 h-4" />, image: 'dynadoc-flow-file-app',
    ports: ['9000 (FPM, internal)'], kind: 'service',
    description: 'File Service — manages generated file metadata and S3 storage. Generates presigned URLs for secure, time-limited download. Consumers listen to Kafka for file-ready events.',
    tech: ['PHP Laravel 12', 'PHP-FPM', 'PostgreSQL', 'AWS SDK / LocalStack', 'rdkafka', 'OpenTelemetry'],
    responsibilities: ['File metadata management', 'S3 upload & presigned URL generation', 'Batch file listing', 'File deletion'],
    config: { env: ['DB_HOST=file-db', 'AWS_ENDPOINT=http://localstack:4566', 'AWS_BUCKET=dynadoc-files', 'KAFKA_BROKERS=kafka1:9092,kafka2:9093,kafka3:9094'], volumes: ['./storage:/var/www/html/storage'], network: 'dynadoc-net' },
  },
  'audit-app': {
    id: 'audit-app', label: 'audit-app', sub: 'Laravel 12 · PHP-FPM :9000',
    icon: <Eye className="w-4 h-4" />, image: 'dynadoc-flow-audit-app',
    ports: ['9000 (FPM, internal)'], kind: 'service',
    description: 'Audit Service — compliance and logging. Consumes all system events from Kafka and persists them as an immutable audit trail. Provides query APIs for compliance reporting.',
    tech: ['PHP Laravel 12', 'PHP-FPM', 'PostgreSQL', 'rdkafka', 'OpenTelemetry'],
    responsibilities: ['Consume all Kafka events', 'Persist audit log records', 'Compliance reporting', 'Cross-service event correlation'],
    topics: ['audit.events'],
    config: { env: ['DB_HOST=audit-db', 'KAFKA_BROKERS=kafka-svc:9092', 'KAFKA_GROUP_ID=audit-consumer-group'], volumes: ['./storage:/var/www/html/storage'], network: 'dynadoc-net' },
  },
  'notification-app': {
    id: 'notification-app', label: 'notification-app', sub: 'Laravel 12 · PHP-FPM :9000',
    icon: <Bell className="w-4 h-4" />, image: 'dynadoc/notification-service',
    ports: ['9000 (FPM, internal)'], kind: 'service',
    description: 'Notification Service — unified multi-channel dispatch. Accepts requests via REST API (POST /api/notifications/send, JWT-protected) or from the notification.send Kafka topic. Routes to Email (OVH SMTP), SMS (Twilio), or Pusher based on the payload `channel` field.',
    tech: ['PHP Laravel 12', 'PHP-FPM', 'OVH SMTP (ssl0.ovh.net:465)', 'Twilio SDK', 'Pusher SDK', 'rdkafka'],
    responsibilities: ['Email dispatch via OVH SMTP (smtps)', 'SMS dispatch via Twilio', 'Pusher real-time push', 'Blade template rendering for emails', 'REST API for direct sends'],
    topics: ['notification.send'],
    config: { env: ['MAIL_HOST=ssl0.ovh.net', 'MAIL_PORT=465', 'MAIL_SCHEME=smtps', 'KAFKA_BROKERS=kafka-svc:9092', 'KAFKA_CONSUMER_GROUP_ID=notification-service'], network: 'dynadoc-net' },
  },
  'template-queue': {
    id: 'template-queue', label: 'template-queue', sub: 'Laravel Queue Worker',
    icon: <Workflow className="w-4 h-4" />, image: 'dynadoc-flow-template-queue',
    ports: [], kind: 'worker',
    description: 'Laravel queue worker that processes PDF generation jobs. Picks jobs from the database queue, renders templates with context data, and produces the output PDF.',
    tech: ['PHP Laravel 12', 'Laravel Queue', 'PDF Renderer'],
    responsibilities: ['Process template.requested jobs', 'Render PDF from template + context', 'Store result to file-service', 'Emit template.delivered event'],
  },
  'file-queue': {
    id: 'file-queue', label: 'file-queue', sub: 'Laravel Queue Worker',
    icon: <Workflow className="w-4 h-4" />, image: 'dynadoc-flow-file-queue',
    ports: [], kind: 'worker',
    description: 'Laravel queue worker for the File Service. Processes async file operations such as cleanup, batch archiving, and storage lifecycle management.',
    tech: ['PHP Laravel 12', 'Laravel Queue'],
    responsibilities: ['Async file lifecycle jobs', 'Batch archive operations', 'Storage cleanup tasks'],
  },
  'template-consumer': {
    id: 'template-consumer', label: 'template-consumer', sub: 'Kafka Consumer',
    icon: <RefreshCw className="w-4 h-4" />, image: 'dynadoc-flow-template-consumer',
    ports: [], kind: 'worker',
    description: 'Kafka consumer for the Template Service. Listens to `template.delivered` events and triggers downstream state updates (e.g. marking a generation as complete).',
    tech: ['PHP Laravel 12', 'rdkafka', 'Consumer Group'],
    responsibilities: ['Consume template.delivered events', 'Update generation status in DB', 'Trigger notifications'],
    topics: ['template.delivered'],
  },
  'file-consumer': {
    id: 'file-consumer', label: 'file-consumer', sub: 'Kafka Consumer',
    icon: <RefreshCw className="w-4 h-4" />, image: 'dynadoc-flow-file-consumer',
    ports: [], kind: 'worker',
    description: 'Kafka consumer for the File Service. Listens to `template.delivered` events and stores the generated PDF to S3-compatible storage, recording file metadata in file-db.',
    tech: ['PHP Laravel 12', 'rdkafka', 'Consumer Group', 'AWS SDK'],
    responsibilities: ['Consume template.delivered events', 'Upload PDF to LocalStack / S3', 'Save file metadata to file-db'],
    topics: ['template.delivered'],
  },
  'audit-consumer': {
    id: 'audit-consumer', label: 'audit-consumer', sub: 'Kafka Consumer',
    icon: <RefreshCw className="w-4 h-4" />, image: 'dynadoc-flow-audit-consumer',
    ports: [], kind: 'worker',
    description: 'Kafka consumer for the Audit Service. Consumes ALL system topics and writes each event to the audit log, providing a full, immutable cross-service event trail.',
    tech: ['PHP Laravel 12', 'rdkafka', 'Consumer Group'],
    responsibilities: ['Consume user.logged', 'Consume template.requested', 'Consume template.delivered', 'Persist audit_logs records'],
    topics: ['user.logged', 'template.requested', 'template.delivered'],
  },
  'notification-consumer': {
    id: 'notification-consumer', label: 'notification-consumer', sub: 'Kafka Consumer',
    icon: <RefreshCw className="w-4 h-4" />, image: 'dynadoc/notification-service',
    ports: [], kind: 'worker',
    description: 'Kafka consumer for the Notification Service. Listens to the `notification.send` topic and routes each message to the appropriate channel — email, SMS, or Pusher. Errors are caught and logged without blocking the consumer loop.',
    tech: ['PHP Laravel 12', 'rdkafka', 'Consumer Group: notification-service'],
    responsibilities: ['Consume notification.send events', 'Route to Email / SMS / Pusher channel', 'Blade template email rendering', 'Best-effort delivery with error logging'],
    topics: ['notification.send'],
  },
  zookeeper: {
    id: 'zookeeper', label: 'Zookeeper', sub: 'cp-zookeeper:7.6 · :2181',
    icon: <GitBranch className="w-4 h-4" />, image: 'confluentinc/cp-zookeeper:7.6.0',
    ports: ['2181'], kind: 'zookeeper',
    description: 'Apache ZooKeeper coordinates the Kafka cluster. Maintains broker metadata, leader election, and cluster membership. All 3 Kafka brokers register with ZooKeeper on startup.',
    tech: ['Confluent ZooKeeper 7.6', 'ZooKeeper 3.8'],
    responsibilities: ['Kafka broker registration', 'Controller election', 'Topic metadata storage', 'Consumer group coordination'],
  },
  kafka1: {
    id: 'kafka1', label: 'kafka1', sub: 'Broker ID 1 · :9092',
    icon: <MessageSquare className="w-4 h-4" />, image: 'confluentinc/cp-kafka:7.6.0',
    ports: ['9092'], kind: 'kafka',
    description: 'Kafka Broker 1. Participates in all 4 topics with replication factor 3 and min-ISR 2. Advertised listener: PLAINTEXT://kafka1:9092.',
    tech: ['Confluent Kafka 7.6', 'PLAINTEXT', 'RF=3', 'min-ISR=2'],
    responsibilities: ['Hosts partition leaders & followers', 'Replicates to kafka2 & kafka3', 'Serves producers and consumers'],
    topics: ['user.logged', 'template.requested', 'template.delivered', 'audit.events', 'notification.send'],
  },
  kafka2: {
    id: 'kafka2', label: 'kafka2', sub: 'Broker ID 2 · :9093',
    icon: <MessageSquare className="w-4 h-4" />, image: 'confluentinc/cp-kafka:7.6.0',
    ports: ['9093'], kind: 'kafka',
    description: 'Kafka Broker 2. Participates in all 4 topics with replication factor 3 and min-ISR 2. Advertised listener: PLAINTEXT://kafka2:9093.',
    tech: ['Confluent Kafka 7.6', 'PLAINTEXT', 'RF=3', 'min-ISR=2'],
    responsibilities: ['Hosts partition leaders & followers', 'Replicates to kafka1 & kafka3', 'Serves producers and consumers'],
    topics: ['user.logged', 'template.requested', 'template.delivered', 'audit.events', 'notification.send'],
  },
  kafka3: {
    id: 'kafka3', label: 'kafka3', sub: 'Broker ID 3 · :9094',
    icon: <MessageSquare className="w-4 h-4" />, image: 'confluentinc/cp-kafka:7.6.0',
    ports: ['9094'], kind: 'kafka',
    description: 'Kafka Broker 3. Participates in all 4 topics with replication factor 3 and min-ISR 2. Advertised listener: PLAINTEXT://kafka3:9094.',
    tech: ['Confluent Kafka 7.6', 'PLAINTEXT', 'RF=3', 'min-ISR=2'],
    responsibilities: ['Hosts partition leaders & followers', 'Replicates to kafka1 & kafka2', 'Serves producers and consumers'],
    topics: ['user.logged', 'template.requested', 'template.delivered', 'audit.events', 'notification.send'],
  },
  'user-db': {
    id: 'user-db', label: 'user-db', sub: 'PostgreSQL 15 · :5432',
    icon: <Database className="w-4 h-4" />, image: 'postgres:15',
    ports: ['5432'], kind: 'database',
    description: 'Dedicated PostgreSQL database for the User Service. Contains users, password hashes, JWT keys, and personal access tokens. Isolated — no other service touches this DB.',
    tech: ['PostgreSQL 15'],
    responsibilities: ['users table', 'personal_access_tokens table', 'cache & sessions tables', 'jobs queue table'],
  },
  'template-db': {
    id: 'template-db', label: 'template-db', sub: 'PostgreSQL 15 · :5433',
    icon: <Database className="w-4 h-4" />, image: 'postgres:15',
    ports: ['5433'], kind: 'database',
    description: 'Dedicated PostgreSQL database for the Template Service. Stores templates, sections, tags, contexts, and generation job records.',
    tech: ['PostgreSQL 15'],
    responsibilities: ['templates table', 'sections table', 'tags table', 'contexts table', 'jobs queue table'],
  },
  'file-db': {
    id: 'file-db', label: 'file-db', sub: 'PostgreSQL 15 · :5434',
    icon: <Database className="w-4 h-4" />, image: 'postgres:15',
    ports: ['5434'], kind: 'database',
    description: 'Dedicated PostgreSQL database for the File Service. Records file metadata — S3 path, size, MIME type, generation reference — for every generated document.',
    tech: ['PostgreSQL 15'],
    responsibilities: ['files table', 'S3 path & metadata', 'jobs queue table'],
  },
  'audit-db': {
    id: 'audit-db', label: 'audit-db', sub: 'PostgreSQL 15 · :5435',
    icon: <Database className="w-4 h-4" />, image: 'postgres:15',
    ports: ['5435'], kind: 'database',
    description: 'Dedicated PostgreSQL database for the Audit Service. Contains the audit_logs table (immutable event records), cache tables, and cache_locks.',
    tech: ['PostgreSQL 15'],
    responsibilities: ['audit_logs table', 'cache table', 'cache_locks table'],
  },
  'kong-db-node': {
    id: 'kong-db-node', label: 'kong-db', sub: 'PostgreSQL 15 · internal',
    icon: <Database className="w-4 h-4" />, image: 'postgres:15',
    ports: ['5432 (internal)'], kind: 'database',
    description: 'PostgreSQL database exclusively used by Kong Gateway. Stores Kong\'s declarative configuration — routes, services, plugins, upstreams, consumers.',
    tech: ['PostgreSQL 15'],
    responsibilities: ['Kong routes & services', 'Plugin configs', 'Consumer ACLs', 'Rate limit state'],
  },
  redis: {
    id: 'redis', label: 'redis', sub: 'Redis 7 Alpine · :6379',
    icon: <Zap className="w-4 h-4" />, image: 'redis:7-alpine',
    ports: ['6379'], kind: 'cache',
    description: 'Redis in-memory store used for session management and application caching across all Laravel services. Ultra-low latency key-value store.',
    tech: ['Redis 7 Alpine'],
    responsibilities: ['Laravel session storage', 'Application cache', 'Queue backend (optional)', 'Pub/sub (optional)'],
  },
  localstack: {
    id: 'localstack', label: 'LocalStack', sub: 'AWS S3 emulator · :4566',
    icon: <Cloud className="w-4 h-4" />, image: 'localstack/localstack:4.7.0',
    ports: ['4566-4583'], kind: 'storage',
    description: 'LocalStack emulates AWS S3 (and other AWS services) locally. In development, the File Service stores all generated PDFs here. In production, replaced by real AWS S3 with zero code change.',
    tech: ['LocalStack 4.7', 'AWS S3 API', 'Presigned URLs'],
    responsibilities: ['Generated PDF storage', 'Presigned URL generation', 'Bucket lifecycle management', 'Swap → AWS S3 in prod'],
  },
  grafana: {
    id: 'grafana', label: 'Grafana', sub: ':3000',
    icon: <BarChart2 className="w-4 h-4" />, image: 'grafana/grafana:10.4.2',
    ports: ['3000'], kind: 'observe',
    description: 'Grafana 10.4.2 — unified observability dashboards. Queries Prometheus for metrics, Loki for logs, and Tempo for traces. Single pane of glass for the entire system.',
    tech: ['Grafana 10.4.2'],
    responsibilities: ['Metric dashboards (Prometheus)', 'Log explorer (Loki)', 'Trace explorer (Tempo)', 'Alert rules & notifications'],
  },
  prometheus: {
    id: 'prometheus', label: 'Prometheus', sub: ':9090',
    icon: <Activity className="w-4 h-4" />, image: 'prom/prometheus:v2.51.2',
    ports: ['9090'], kind: 'observe',
    description: 'Prometheus v2.51.2 scrapes metrics from all services and cAdvisor. Stores time-series data and evaluates alerting rules. Grafana queries it via PromQL.',
    tech: ['Prometheus v2.51.2', 'PromQL'],
    responsibilities: ['Scrape service metrics', 'Scrape cAdvisor container metrics', 'Time-series storage', 'Alert rule evaluation'],
  },
  loki: {
    id: 'loki', label: 'Loki', sub: ':3100',
    icon: <Box className="w-4 h-4" />, image: 'grafana/loki:3.0.0',
    ports: ['3100'], kind: 'observe',
    description: 'Grafana Loki 3.0.0 — log aggregation system. Promtail ships logs from all containers to Loki. Grafana queries Loki using LogQL for log exploration.',
    tech: ['Loki 3.0.0', 'LogQL'],
    responsibilities: ['Centralized log storage', 'LogQL queries', 'Label-based log indexing', 'Log retention policies'],
  },
  tempo: {
    id: 'tempo', label: 'Tempo', sub: ':3200 / OTLP :4317-4318',
    icon: <ChevronsRight className="w-4 h-4" />, image: 'grafana/tempo:2.4.2',
    ports: ['3200', '4317', '4318'], kind: 'observe',
    description: 'Grafana Tempo 2.4.2 — distributed tracing backend. All Laravel services emit OpenTelemetry spans to Tempo via OTLP (:4317 gRPC / :4318 HTTP). Trace IDs are correlated with logs in Loki.',
    tech: ['Tempo 2.4.2', 'OTLP gRPC :4317', 'OTLP HTTP :4318', 'OpenTelemetry'],
    responsibilities: ['Receive OTLP trace spans', 'Distributed trace storage', 'Trace search & visualization', 'Tempo → Grafana integration'],
  },
  promtail: {
    id: 'promtail', label: 'Promtail', sub: 'Log shipper',
    icon: <ArrowRight className="w-4 h-4" />, image: 'grafana/promtail:3.0.0',
    ports: [], kind: 'observe',
    description: 'Grafana Promtail 3.0.0 — log collection agent. Tails container log files and Docker daemon logs, adds labels, and ships them to Loki.',
    tech: ['Promtail 3.0.0'],
    responsibilities: ['Tail container logs', 'Add Kubernetes/Docker labels', 'Push logs to Loki', 'Log parsing & relabeling'],
  },
  cadvisor: {
    id: 'cadvisor', label: 'cAdvisor', sub: 'Container metrics · :8080',
    icon: <Cpu className="w-4 h-4" />, image: 'gcr.io/cadvisor/cadvisor:v0.49.1',
    ports: ['8080'], kind: 'observe',
    description: 'Google cAdvisor v0.49.1 — container resource usage monitoring. Exports CPU, memory, network, and disk metrics for every Docker container. Prometheus scrapes cAdvisor on :8080.',
    tech: ['cAdvisor v0.49.1', 'Prometheus exporter'],
    responsibilities: ['Per-container CPU & memory', 'Network I/O metrics', 'Disk I/O metrics', 'Expose /metrics for Prometheus'],
  },
};

// ─── Layer definition ─────────────────────────────────────────────────────────
interface Layer {
  id: string;
  label: string;
  labelColor: string;
  components: string[];
  scalable?: 'horizontal' | 'vertical' | 'both';
  scaleHint?: string;
  grouped?: boolean;
  groupLabel?: string;
  subgroups?: { label: string; ids: string[]; note?: string }[];
}

const LAYERS: Layer[] = [
  {
    id: 'client',
    label: 'Client Layer',
    labelColor: 'bg-[#003580]',
    components: ['browser'],
  },
  {
    id: 'gateway',
    label: 'API Gateway',
    labelColor: 'bg-[#001f5c]',
    components: ['kong', 'kong-db-node'],
    scaleHint: 'Kong scales horizontally behind a load balancer',
  },
  {
    id: 'proxy',
    label: 'Nginx Reverse Proxies',
    labelColor: 'bg-[#1d4ed8]',
    components: ['user-nginx', 'template-nginx', 'file-nginx', 'audit-nginx', 'notification-nginx'],
    scalable: 'horizontal',
    scaleHint: 'Add nginx instances per service for load balancing',
  },
  {
    id: 'services',
    label: 'Microservices  (PHP-FPM :9000)',
    labelColor: 'bg-[#2563eb]',
    components: ['user-app', 'template-app', 'file-app', 'audit-app', 'notification-app'],
    scalable: 'horizontal',
    scaleHint: 'Each service can scale horizontally — run multiple PHP-FPM containers per service',
  },
  {
    id: 'workers',
    label: 'Queue Workers & Kafka Consumers',
    labelColor: 'bg-[#0369a1]',
    components: [],
    scalable: 'horizontal',
    scaleHint: 'Workers and consumers scale horizontally — run more instances to increase throughput',
    subgroups: [
      { label: 'Queue Workers', ids: ['template-queue', 'file-queue'], note: 'Process Laravel jobs' },
      { label: 'Kafka Consumers', ids: ['template-consumer', 'file-consumer', 'audit-consumer', 'notification-consumer'], note: 'Consume Kafka topics' },
    ],
  },
  {
    id: 'kafka',
    label: 'Kafka Cluster',
    labelColor: 'bg-[#0c4a6e]',
    components: [],
    scalable: 'horizontal',
    scaleHint: 'Add more Kafka brokers horizontally to increase throughput and fault tolerance. Update replication settings accordingly.',
    subgroups: [
      { label: 'Coordinator', ids: ['zookeeper'] },
      { label: 'Brokers  (RF=3, min-ISR=2)', ids: ['kafka1', 'kafka2', 'kafka3'] },
    ],
  },
  {
    id: 'data',
    label: 'Data Layer',
    labelColor: 'bg-[#1e3a8a]',
    components: [],
    scalable: 'vertical',
    scaleHint: 'Each PostgreSQL DB scales vertically (bigger instance) or with read replicas. LocalStack → AWS S3 in production.',
    subgroups: [
      { label: 'Service Databases  (PostgreSQL 15)', ids: ['user-db', 'template-db', 'file-db', 'audit-db', 'kong-db-node'], note: 'DB per service — fully isolated' },
      { label: 'Other Data Stores', ids: ['redis', 'localstack'] },
    ],
  },
  {
    id: 'observability',
    label: 'Observability Stack',
    labelColor: 'bg-[#4338ca]',
    components: ['grafana', 'prometheus', 'loki', 'tempo', 'promtail', 'cadvisor'],
    scalable: 'both',
    scaleHint: 'Observability stack scales horizontally (clustered Loki/Tempo) or vertically. Additional exporters can be added per service.',
  },
];

// ─── Kafka topics ─────────────────────────────────────────────────────────────
const TOPICS = [
  {
    name: 'user.logged', partitions: 3, rf: 3,
    color: 'bg-emerald-100 border-emerald-400 text-emerald-800',
    dotColor: 'bg-emerald-500',
    producers: ['user-app'],
    consumers: ['audit-consumer'],
    description: 'Fired after every successful login. Carries user ID, IP, and timestamp.',
  },
  {
    name: 'template.requested', partitions: 3, rf: 3,
    color: 'bg-orange-100 border-orange-400 text-orange-800',
    dotColor: 'bg-orange-500',
    producers: ['template-queue'],
    consumers: ['template-consumer', 'audit-consumer'],
    description: 'Published when a queue worker picks up a PDF generation job.',
  },
  {
    name: 'template.delivered', partitions: 3, rf: 3,
    color: 'bg-blue-100 border-blue-400 text-blue-800',
    dotColor: 'bg-blue-500',
    producers: ['template-consumer'],
    consumers: ['file-consumer', 'audit-consumer'],
    description: 'Signals that PDF rendering is complete. Triggers S3 upload and status update.',
  },
  {
    name: 'audit.events', partitions: 3, rf: 3,
    color: 'bg-purple-100 border-purple-400 text-purple-800',
    dotColor: 'bg-purple-500',
    producers: ['audit-consumer'],
    consumers: ['audit-db'],
    description: 'Aggregated audit stream. All system events are persisted here for compliance.',
  },
  {
    name: 'notification.send', partitions: 3, rf: 1,
    color: 'bg-pink-100 border-pink-400 text-pink-800',
    dotColor: 'bg-pink-500',
    producers: ['user-app'],
    consumers: ['notification-consumer'],
    description: 'Outbound notification requests. Producers publish channel, recipient, template, and data. The notification-consumer routes each message to email, SMS, or Pusher.',
  },
];

// ─── Data flows ───────────────────────────────────────────────────────────────
interface FlowStepDef { id: string; label: string }
interface FlowDef { label: string; color: string; steps: FlowStepDef[] }

const FLOWS: Record<string, FlowDef> = {
  auth: {
    label: 'Auth Flow', color: '#003580',
    steps: [
      { id: 'browser',        label: 'User submits credentials' },
      { id: 'kong',           label: 'Kong validates & routes' },
      { id: 'user-nginx',     label: 'Nginx → PHP-FPM' },
      { id: 'user-app',       label: 'Laravel validates user' },
      { id: 'user-db',        label: 'User record looked up' },
      { id: 'redis',          label: 'Session cached in Redis' },
      { id: 'kafka1',         label: 'user.logged published' },
      { id: 'audit-consumer', label: 'Event consumed' },
      { id: 'audit-db',       label: 'Audit trail persisted' },
    ],
  },
  generation: {
    label: 'PDF Generation', color: '#0369a1',
    steps: [
      { id: 'browser',        label: 'User triggers generation' },
      { id: 'kong',           label: 'Kong routes to template' },
      { id: 'template-nginx', label: 'Nginx → PHP-FPM' },
      { id: 'template-app',   label: 'Job enqueued in DB' },
      { id: 'template-db',    label: 'Job stored in queue' },
      { id: 'template-queue', label: 'Worker picks up job' },
      { id: 'kafka1',         label: 'template.requested published' },
      { id: 'file-consumer',  label: 'Uploads PDF to S3' },
      { id: 'localstack',     label: 'PDF stored in S3' },
      { id: 'audit-consumer', label: 'Audit event recorded' },
    ],
  },
  download: {
    label: 'File Download', color: '#1d4ed8',
    steps: [
      { id: 'browser',    label: 'User requests file list' },
      { id: 'kong',       label: 'Kong routes to file service' },
      { id: 'file-nginx', label: 'Nginx → PHP-FPM' },
      { id: 'file-app',   label: 'Presigned URL generated' },
      { id: 'file-db',    label: 'File metadata retrieved' },
      { id: 'localstack', label: 'URL issued from S3' },
      { id: 'browser',    label: 'PDF downloaded from S3' },
    ],
  },
  passwordReset: {
    label: 'Password Reset', color: '#db2777',
    steps: [
      { id: 'browser',               label: 'User submits email' },
      { id: 'kong',                  label: 'Kong routes (public endpoint)' },
      { id: 'user-nginx',            label: 'Nginx → PHP-FPM' },
      { id: 'user-app',              label: 'Token generated & stored' },
      { id: 'user-db',               label: 'Token saved in password_reset_tokens' },
      { id: 'kafka1',                label: 'notification.send published' },
      { id: 'notification-consumer', label: 'Consumer picks up event' },
      { id: 'notification-app',      label: 'Email dispatched via OVH SMTP' },
    ],
  },
  observability: {
    label: 'Observability', color: '#4338ca',
    steps: [
      { id: 'user-app',   label: 'Service emits OTel spans' },
      { id: 'tempo',      label: 'Tempo stores traces' },
      { id: 'promtail',   label: 'Promtail ships logs' },
      { id: 'loki',       label: 'Loki indexes logs' },
      { id: 'cadvisor',   label: 'cAdvisor exports metrics' },
      { id: 'prometheus', label: 'Prometheus scrapes metrics' },
      { id: 'grafana',    label: 'Grafana unifies signals' },
    ],
  },
};

// ─── Login request trace steps ───────────────────────────────────────────────
interface TraceStepDef {
  nodeId: string;
  kind: 'http' | 'fastcgi' | 'db' | 'kafka' | 'cache' | 'worker' | 'storage';
  phase: 'sync' | 'async';
  title: string;
  summary: string;
  protocol: string;
  detail: string;
  payload?: string;
  timing: string;
}

const AUTH_TRACE: TraceStepDef[] = [
  {
    nodeId: 'browser', kind: 'http', phase: 'sync',
    title: 'Credentials sent',
    summary: 'You click Sign In. The browser packages your email and password as JSON and sends it securely over HTTPS.',
    protocol: 'HTTPS · POST /api/auth/login',
    detail: 'The React SPA serialises credentials to JSON and POSTs to Kong Gateway via Axios. The server response will set an httpOnly JWT cookie that the browser sends on every future request.',
    payload: '{\n  "email": "tharanga@example.com",\n  "password": "••••••••"\n}',
    timing: '0 ms',
  },
  {
    nodeId: 'kong', kind: 'http', phase: 'sync',
    title: 'Gateway receives & routes',
    summary: 'Kong is the front door to every service. It sees this is a public login route — no token to check yet — and forwards the request to the User Service.',
    protocol: 'HTTP · Kong → user-nginx :8081',
    detail: '/api/auth/login is a public route, so Kong\'s JWT plugin is bypassed. Kong applies CORS headers, rate-limiting, and routes to the user-nginx upstream.',
    timing: '~1 ms',
  },
  {
    nodeId: 'user-nginx', kind: 'fastcgi', phase: 'sync',
    title: 'Nginx bridges to PHP',
    summary: 'Nginx receives the HTTP request and hands it off to the PHP application using FastCGI — a fast binary protocol for talking to PHP-FPM worker processes.',
    protocol: 'FastCGI · Nginx :8081 → PHP-FPM :9000',
    detail: 'The Nginx reverse proxy passes the request to the PHP-FPM worker pool using FastCGI. This avoids spawning a new PHP process per request — workers are pre-started and reused.',
    timing: '~0.5 ms',
  },
  {
    nodeId: 'user-app', kind: 'fastcgi', phase: 'sync',
    title: 'Laravel checks your password',
    summary: 'The User Service looks up your account, compares your password to its stored hash, and builds a signed identity token (JWT) if everything checks out.',
    protocol: 'PHP-FPM · Laravel 12 · StoreAuthHandler',
    detail: 'AuthController → StoreAuthHandler. Queries user-db via UserRepository. Verifies the password using Hash::check() (Bcrypt). On success, JwtService generates an RS256-signed JWT with userId, name, email, organizationId, and role claims.',
    timing: '~5 ms',
  },
  {
    nodeId: 'user-db', kind: 'db', phase: 'sync',
    title: 'Your account is looked up',
    summary: 'PostgreSQL finds your user record by email. No plain-text passwords are ever stored — only a Bcrypt hash that cannot be reversed.',
    protocol: 'PostgreSQL · user-db :5432',
    detail: 'A parameterised query prevents SQL injection. The Bcrypt hash comparison is done in constant-time to prevent timing attacks. A match returns the full user record; mismatch throws a 401.',
    payload: 'SELECT *\nFROM   users\nWHERE  email = $1\nLIMIT  1',
    timing: '~2 ms',
  },
  {
    nodeId: 'redis', kind: 'cache', phase: 'sync',
    title: 'Session stored & cookie set',
    summary: 'Your authenticated session is saved in Redis for lightning-fast future lookups. The JWT is attached to the response as a secure, httpOnly cookie — the browser stores it automatically.',
    protocol: 'Redis TCP · :6379',
    detail: 'Laravel writes the session to Redis (sub-millisecond read/write). The response carries Set-Cookie: token=<jwt>; HttpOnly; SameSite=Strict. At this point HTTP 200 OK is on its way back to your browser.',
    timing: '~1 ms',
  },
  {
    nodeId: 'kafka1', kind: 'kafka', phase: 'async',
    title: 'Login event published to Kafka',
    summary: 'A "user logged in" event is broadcast to Kafka so other services can react. This happens after the HTTP response is already on its way — you don\'t wait for it.',
    protocol: 'rdkafka · acks=all · topic: user.logged · RF=3',
    detail: 'event(new UserLoggedIn) triggers PublishUserLoginToKafka. Produced with acks=all + idempotence=true for guaranteed delivery. Key = userId for partition affinity. Replicated to all 3 brokers (min-ISR=2). Fire-and-forget relative to the HTTP response.',
    payload: '// topic: user.logged  key: <userId>\n{\n  "id":    "550e8400-e29b-41d4-a716-446655440000",\n  "name":  "Tharanga",\n  "email": "tharanga@example.com",\n  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."\n}',
    timing: 'async · ~5 ms',
  },
  {
    nodeId: 'audit-consumer', kind: 'worker', phase: 'async',
    title: 'Consumer picks up the event',
    summary: 'A dedicated background process (the audit consumer) is always listening. It picks up the login event from Kafka and prepares to write a permanent record.',
    protocol: 'Kafka Consumer Group · user.logged',
    detail: 'The audit-consumer container runs kafka:consume-user-logged. It subscribes to user.logged, polls for new messages, and commits its offset after successful processing — guaranteeing at-least-once delivery.',
    timing: 'async · ms–s after publish',
  },
  {
    nodeId: 'audit-db', kind: 'db', phase: 'async',
    title: 'Permanent audit record written',
    summary: 'The login event is saved forever in the audit database — an immutable, append-only log used for compliance reporting and security investigations.',
    protocol: 'PostgreSQL · audit-db :5435',
    detail: 'The audit_logs table is append-only by convention — no updates or deletes. This creates a tamper-evident trail. Indexes on user_id + occurred_at make compliance queries fast.',
    payload: "INSERT INTO audit_logs\n  (user_id, user_name, organization_id,\n   action, service, status_code,\n   event_type, occurred_at)\nVALUES\n  ($1, $2, $3,\n   'POST /api/auth/login',\n   'user-service', 200,\n   'user_login', NOW())",
    timing: '~3 ms',
  },
];

const PDF_TRACE: TraceStepDef[] = [
  {
    nodeId: 'browser', kind: 'http', phase: 'sync',
    title: 'Generate request sent',
    summary: 'You click Generate Document. The browser sends the template ID and your data variables (names, dates, amounts) to the server.',
    protocol: 'HTTPS · POST /api/templates/{id}/generate',
    detail: 'The React SPA POSTs context_data — key-value pairs that will be injected into the template. The RS256 JWT cookie is attached automatically. This is a protected route.',
    payload: '{\n  "template_id": "tpl-uuid",\n  "context_data": {\n    "recipient_name": "Tharanga",\n    "contract_date":  "2026-04-23",\n    "amount":         "€ 12,500"\n  }\n}',
    timing: '0 ms',
  },
  {
    nodeId: 'kong', kind: 'http', phase: 'sync',
    title: 'Gateway validates your token',
    summary: 'Unlike login, this is a protected endpoint. Kong verifies your JWT is valid and hasn\'t expired before allowing the request through.',
    protocol: 'HTTP · Kong JWT plugin → template-nginx :8082',
    detail: 'Kong\'s JWT plugin verifies the RS256 signature against the public key and checks exp claim. Invalid or missing token → 401. On success, routes to template-nginx upstream.',
    timing: '~2 ms',
  },
  {
    nodeId: 'template-nginx', kind: 'fastcgi', phase: 'sync',
    title: 'Nginx bridges to PHP',
    summary: 'The Nginx reverse proxy passes the request to the Template Service\'s PHP-FPM worker pool using the FastCGI protocol.',
    protocol: 'FastCGI · template-nginx :8082 → PHP-FPM :9000',
    detail: 'Nginx on :8082 hands off via FastCGI to the template-app PHP-FPM pool on port 9000.',
    timing: '~0.5 ms',
  },
  {
    nodeId: 'template-app', kind: 'http', phase: 'sync',
    title: 'Job queued — HTTP 202 returned immediately',
    summary: 'The Template Service queues the PDF generation job and responds right away with "202 Accepted". Your browser is free — the actual rendering happens entirely in the background.',
    protocol: 'PHP-FPM · Laravel 12 · GenerateDocumentHandler',
    detail: 'The handler validates the request, resolves the template, dispatches a GenerateDocument job to Laravel Queue (backed by template-db), and returns HTTP 202. From here everything is asynchronous.',
    timing: '~4 ms · HTTP 202 returned',
  },
  {
    nodeId: 'template-db', kind: 'db', phase: 'async',
    title: 'Job saved in the queue table',
    summary: 'The generation job is stored as a row in PostgreSQL\'s jobs table. It will wait there until a queue worker picks it up — even surviving a server restart.',
    protocol: 'PostgreSQL · template-db :5433 · jobs table',
    detail: 'Laravel Queue serialises the job to JSON and inserts it with available_at = NOW(). Database-backed queues are durable — jobs survive crashes and can be retried with backoff on failure.',
    payload: "INSERT INTO jobs\n  (queue, payload, attempts,\n   available_at, created_at)\nVALUES (\n  'default',\n  '{\"uuid\":\"...\",\"job\":\"GenerateDocument\",...}',\n  0, NOW(), NOW()\n)",
    timing: '~2 ms',
  },
  {
    nodeId: 'template-queue', kind: 'worker', phase: 'async',
    title: 'Worker renders the PDF',
    summary: 'A dedicated background worker process picks up the job, merges your data variables into the template, and renders the final PDF document.',
    protocol: 'Laravel Queue Worker · php artisan queue:work',
    detail: 'template-queue polls the jobs table, acquires a lock on the row, deserialises the job, fetches the template and context_data, runs the PDF engine, and produces the binary output.',
    timing: '~800 ms (rendering)',
  },
  {
    nodeId: 'kafka1', kind: 'kafka', phase: 'async',
    title: 'First Kafka hop — template.requested',
    summary: 'After picking up the job, the worker broadcasts a "template requested" event to Kafka. Two independent services will react to this message.',
    protocol: 'rdkafka · acks=all · topic: template.requested · RF=3',
    detail: 'template-queue publishes to template.requested. Two consumer groups subscribe: template-consumer (updates generation status) and audit-consumer (logs the event). Replicated across all 3 brokers.',
    payload: '// topic: template.requested  key: <templateId>\n{\n  "template_id":   "tpl-uuid",\n  "generation_id": "gen-uuid",\n  "user_id":       "550e8400-...",\n  "context_data":  { "recipient_name": "Tharanga", ... },\n  "requested_at":  "2026-04-23T09:15:00Z"\n}',
    timing: 'async · ~5 ms',
  },
  {
    nodeId: 'template-consumer', kind: 'worker', phase: 'async',
    title: 'Second Kafka hop — template.delivered',
    summary: 'The template consumer processes the first event, updates the generation status, then broadcasts a second event announcing the PDF is ready.',
    protocol: 'Kafka Consumer → producer · topic: template.delivered',
    detail: 'template-consumer consumes template.requested, marks the generation as "rendering" in template-db, and publishes template.delivered with file metadata. This is hop 2 in the Kafka chain — file-consumer and audit-consumer both subscribe.',
    payload: '// topic: template.delivered  key: <generationId>\n{\n  "generation_id":  "gen-uuid",\n  "template_id":    "tpl-uuid",\n  "user_id":        "550e8400-...",\n  "file_name":      "contract-2026-04-23.pdf",\n  "file_size_bytes": 84320,\n  "delivered_at":   "2026-04-23T09:15:01Z"\n}',
    timing: 'async · ~10 ms',
  },
  {
    nodeId: 'file-consumer', kind: 'worker', phase: 'async',
    title: 'PDF uploaded to cloud storage',
    summary: 'The file consumer receives the "PDF ready" event, uploads the document to S3, and saves the file metadata so it can be downloaded later.',
    protocol: 'Kafka Consumer · topic: template.delivered → S3 upload',
    detail: 'file-consumer consumes template.delivered, streams the PDF binary to LocalStack S3 (AWS S3 in production), and writes a record to file-db with the S3 path, file size, and MIME type.',
    timing: 'async · ~200 ms (upload)',
  },
  {
    nodeId: 'localstack', kind: 'storage', phase: 'async',
    title: 'File lands in S3',
    summary: 'The PDF is stored in the cloud-compatible bucket. A time-limited download link (presigned URL) can now be generated whenever the user requests the file.',
    protocol: 'AWS S3 API · LocalStack :4566 · bucket: dynadoc-files',
    detail: 'PUT to s3://dynadoc-files/orgs/<orgId>/gen-uuid/filename.pdf. LocalStack emulates S3 locally — zero code change when switching to AWS S3 in production. Presigned URLs expire after a configurable TTL.',
    payload: 'PUT s3://dynadoc-files/\n    orgs/<orgId>/gen-uuid/\n    contract-2026-04-23.pdf\n\nResponse:\n  HTTP 200 OK\n  ETag: "d41d8cd98f00b204e980..."',
    timing: '~150 ms',
  },
  {
    nodeId: 'audit-db', kind: 'db', phase: 'async',
    title: 'Full lifecycle recorded in audit log',
    summary: 'Two permanent audit records are written — one for "generation requested" and one for "PDF delivered". The complete end-to-end journey is now captured for compliance.',
    protocol: 'PostgreSQL · audit-db :5435 · audit_logs table',
    detail: 'audit-consumer consumed both template.requested and template.delivered, inserting two append-only records into audit_logs. The full lifecycle — from user click to S3 storage — is now traceable.',
    payload: "-- Record 1: generation requested\nINSERT INTO audit_logs\n  (event_type, action, service,\n   status_code, occurred_at)\nVALUES\n  ('template_requested',\n   'POST /api/templates/{id}/generate',\n   'template-service', 202, NOW());\n\n-- Record 2: PDF delivered\nINSERT INTO audit_logs\n  (event_type, action, service,\n   status_code, occurred_at)\nVALUES\n  ('template_delivered',\n   'KAFKA template.delivered',\n   'file-service', 200, NOW())",
    timing: 'async · ~3 ms',
  },
];

// ─── File Download trace steps ───────────────────────────────────────────────
const DOWNLOAD_TRACE: TraceStepDef[] = [
  {
    nodeId: 'browser', kind: 'http', phase: 'sync',
    title: 'File list requested',
    summary: 'You open the Files page. The browser asks the File Service for the list of generated documents available to your account.',
    protocol: 'HTTPS · GET /api/files',
    detail: 'The React SPA sends a GET with the RS256 JWT cookie attached. The request goes to Kong, which validates the token before routing to the File Service.',
    timing: '0 ms',
  },
  {
    nodeId: 'kong', kind: 'http', phase: 'sync',
    title: 'Gateway validates JWT',
    summary: 'Kong\'s JWT plugin verifies the RS256 signature and checks the expiry. A valid token lets the request through to the File Service.',
    protocol: 'HTTP · Kong JWT plugin → file-nginx :8083',
    detail: 'The RS256 public key is loaded from Kong\'s consumer credential store. Invalid or expired tokens are rejected with HTTP 401 before they ever reach the service.',
    timing: '~2 ms',
  },
  {
    nodeId: 'file-nginx', kind: 'fastcgi', phase: 'sync',
    title: 'Nginx passes to PHP-FPM',
    summary: 'The Nginx reverse proxy forwards the request to the File Service\'s PHP-FPM worker using FastCGI.',
    protocol: 'FastCGI · file-nginx :8083 → PHP-FPM :9000',
    detail: 'Nginx on :8083 hands off the request via FastCGI pass to the file-app PHP-FPM pool on port 9000.',
    timing: '~0.5 ms',
  },
  {
    nodeId: 'file-app', kind: 'http', phase: 'sync',
    title: 'Presigned URL generated',
    summary: 'The File Service looks up your file record, calls the S3 SDK to generate a time-limited presigned URL, and returns it in the response.',
    protocol: 'PHP-FPM · Laravel 12 · FileController',
    detail: 'The controller resolves the authenticated user from the JWT sub claim, queries file-db for their files, and for each file calls $s3->createPresignedRequest() with a short TTL (e.g. 60 s). The signed URL is returned directly — no redirect, no proxy.',
    payload: '{\n  "files": [\n    {\n      "id": "file-uuid",\n      "name": "contract-2026-04-23.pdf",\n      "size_bytes": 84320,\n      "download_url": "https://s3.../presigned?X-Amz-Signature=..."\n    }\n  ]\n}',
    timing: '~10 ms',
  },
  {
    nodeId: 'file-db', kind: 'db', phase: 'sync',
    title: 'File metadata retrieved',
    summary: 'PostgreSQL returns the S3 path, file name, size, and MIME type for every file belonging to this user.',
    protocol: 'PostgreSQL · file-db :5434 · files table',
    detail: 'A single SELECT with a WHERE user_id = ? filter retrieves all file rows. The S3 key from this row is then used to generate the presigned URL.',
    payload: 'SELECT id, file_name, s3_key,\n       file_size, mime_type, created_at\nFROM   files\nWHERE  user_id = $1\nORDER  BY created_at DESC;',
    timing: '~2 ms',
  },
  {
    nodeId: 'localstack', kind: 'storage', phase: 'sync',
    title: 'Presigned URL issued by S3',
    summary: 'The AWS SDK signs the S3 object URL with a time-limited HMAC signature. After the TTL expires the URL stops working automatically.',
    protocol: 'AWS S3 SDK · HMAC-SHA256 presigned GET',
    detail: 'The SDK computes a Signature Version 4 presigned URL: it signs the bucket + object key + expiry timestamp using the AWS secret key. No actual network call is made here — the signature is computed in-process.',
    payload: 'GET s3://dynadoc-files/orgs/<orgId>/\n    gen-uuid/contract-2026-04-23.pdf\n    ?X-Amz-Algorithm=AWS4-HMAC-SHA256\n    &X-Amz-Expires=60\n    &X-Amz-Signature=...',
    timing: '~1 ms (in-process)',
  },
  {
    nodeId: 'browser', kind: 'http', phase: 'sync',
    title: 'PDF downloaded directly from S3',
    summary: 'The browser follows the presigned URL directly to S3. The file streams from cloud storage to the user — without going through any application server.',
    protocol: 'HTTPS · GET presigned S3 URL (direct)',
    detail: 'The browser GETs the presigned URL. S3 validates the HMAC signature and streams the PDF binary back. The application server is completely out of the download path — zero load on PHP-FPM for the actual file transfer.',
    timing: '~200 ms (streaming)',
  },
];

// ─── Password Reset trace steps ───────────────────────────────────────────────
const RESET_TRACE: TraceStepDef[] = [
  {
    nodeId: 'browser', kind: 'http', phase: 'sync',
    title: 'Reset request submitted',
    summary: 'The user enters their email on the Forgot Password page and submits the form. The browser sends the address to the User Service.',
    protocol: 'HTTPS · POST /api/auth/forgot-password',
    detail: 'This is a public endpoint — no JWT required. The SPA POSTs the email address. The response is always HTTP 200 regardless of whether the email exists, to prevent user enumeration.',
    payload: '{\n  "email": "tharanga@example.com"\n}',
    timing: '0 ms',
  },
  {
    nodeId: 'kong', kind: 'http', phase: 'sync',
    title: 'Kong routes the public endpoint',
    summary: 'Kong recognises this as a public route — the JWT plugin is skipped. The request is forwarded directly to the User Service.',
    protocol: 'HTTP · Kong (no JWT) → user-nginx :8081',
    detail: 'The forgot-password route is declared in Kong with no JWT plugin attached. Kong applies CORS and rate-limiting (e.g. 5 req/min per IP) to prevent brute-force abuse, then routes to user-nginx.',
    timing: '~1 ms',
  },
  {
    nodeId: 'user-nginx', kind: 'fastcgi', phase: 'sync',
    title: 'Nginx passes to PHP-FPM',
    summary: 'The Nginx reverse proxy hands the request to the User Service\'s PHP-FPM pool via FastCGI.',
    protocol: 'FastCGI · user-nginx :8081 → PHP-FPM :9000',
    timing: '~0.5 ms',
    detail: 'Nginx on :8081 forwards via fastcgi_pass to the user-app PHP-FPM pool on port 9000.',
  },
  {
    nodeId: 'user-app', kind: 'http', phase: 'sync',
    title: 'Token generated & HTTP 200 returned',
    summary: 'Laravel generates a cryptographically secure reset token, stores its hash, and immediately returns HTTP 200 — the email is dispatched asynchronously via Kafka.',
    protocol: 'PHP-FPM · Laravel 12 · ForgotPasswordHandler',
    detail: 'The handler calls Password::createToken($user) to generate a 64-character random token, stores its SHA-256 hash in password_reset_tokens, then publishes a notification.send event to Kafka. HTTP 200 is returned before the email is sent.',
    payload: '// Response (always 200, email or not)\n{\n  "message": "If that email is registered,\n              a reset link is on its way."\n}',
    timing: '~5 ms · HTTP 200 returned',
  },
  {
    nodeId: 'user-db', kind: 'db', phase: 'sync',
    title: 'Token hash stored',
    summary: 'The SHA-256 hash of the reset token is saved with the user\'s email and a timestamp. The plain-text token is never stored.',
    protocol: 'PostgreSQL · user-db :5432 · password_reset_tokens',
    detail: 'Only the hash is persisted — if the DB is breached, raw tokens cannot be used. The token expires after 60 minutes (configurable via RESET_TOKEN_TTL). Old tokens for the same email are replaced.',
    payload: "INSERT INTO password_reset_tokens\n  (email, token, created_at)\nVALUES\n  ('tharanga@example.com',\n   sha256('random-64-char-token'),\n   NOW())\nON CONFLICT (email) DO UPDATE\n  SET token = excluded.token,\n      created_at = excluded.created_at;",
    timing: '~2 ms',
  },
  {
    nodeId: 'kafka1', kind: 'kafka', phase: 'async',
    title: 'notification.send published',
    summary: 'The User Service publishes the reset link to the notification.send Kafka topic. From here the email dispatch is fully asynchronous.',
    protocol: 'rdkafka · acks=all · topic: notification.send · RF=1',
    detail: 'The payload carries channel=email, the recipient address, template=password-reset, and data.reset_url. If Kafka is unavailable, a direct Mail::send fallback fires inline to guarantee delivery.',
    payload: '// topic: notification.send  key: tharanga@example.com\n{\n  "channel":  "email",\n  "to":       "tharanga@example.com",\n  "template": "password-reset",\n  "subject":  "Reset your DynaDoc password",\n  "data": {\n    "reset_url": "https://ddoc.fi/reset?token=...&email=..."\n  }\n}',
    timing: 'async · ~5 ms',
  },
  {
    nodeId: 'notification-consumer', kind: 'worker', phase: 'async',
    title: 'Notification consumer picks up event',
    summary: 'The Notification Service\'s Kafka consumer dequeues the message and hands it to the SendNotificationHandler.',
    protocol: 'Kafka Consumer · consumer group: notification-service',
    detail: 'NotificationSendConsumer subscribes to notification.send. It deserialises the payload and calls SendNotificationHandler::handle(). The consumer loop continues running — a single failure is caught and logged without stopping the loop.',
    timing: 'async · ~10 ms',
  },
  {
    nodeId: 'notification-app', kind: 'http', phase: 'async',
    title: 'Reset email dispatched via OVH SMTP',
    summary: 'The Notification Service renders the password-reset Blade template and sends the email over SMTPS to OVH\'s mail relay.',
    protocol: 'SMTPS · ssl0.ovh.net :465 · TemplateMail',
    detail: 'EmailChannel resolves the emails.password-reset Blade view, passes reset_url into it, and calls Mail::to($to)->send(new TemplateMail(...)). Laravel\'s SMTP mailer opens an implicit TLS connection on port 465 and delivers the message.',
    payload: 'From:    admin@ddoc.fi (DynaDoc)\nTo:      tharanga@example.com\nSubject: Reset your DynaDoc password\n\n[Blade-rendered HTML]\n  Hi Tharanga,\n  Click the button below to reset\n  your password. Link expires in 60 min.',
    timing: 'async · ~300 ms (SMTP round-trip)',
  },
];

// ─── Step kind metadata ───────────────────────────────────────────────────────
const KIND_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  http:    { label: 'HTTP',     color: '#2563eb', bg: '#dbeafe', icon: <Globe          className="w-5 h-5" /> },
  fastcgi: { label: 'FastCGI',  color: '#7c3aed', bg: '#ede9fe', icon: <Server         className="w-5 h-5" /> },
  db:      { label: 'Database', color: '#1d4ed8', bg: '#e0e7ff', icon: <Database       className="w-5 h-5" /> },
  kafka:   { label: 'Kafka',    color: '#d97706', bg: '#fef3c7', icon: <MessageSquare  className="w-5 h-5" /> },
  cache:   { label: 'Cache',    color: '#dc2626', bg: '#fee2e2', icon: <Zap            className="w-5 h-5" /> },
  worker:  { label: 'Worker',   color: '#0369a1', bg: '#e0f2fe', icon: <Cpu            className="w-5 h-5" /> },
  storage: { label: 'Storage',  color: '#0891b2', bg: '#cffafe', icon: <Cloud          className="w-5 h-5" /> },
};

// ─── Dependency graph layout ──────────────────────────────────────────────────
const NW = 84, NH = 26; // node width / height in SVG units

const GPOS: Record<string, { x: number; y: number }> = {
  browser:             { x: 30,  y: 250 },
  kong:                { x: 175, y: 180 },
  'kong-db-node':      { x: 175, y: 340 },
  'user-nginx':        { x: 330, y: 40  },
  'template-nginx':    { x: 330, y: 150 },
  'file-nginx':        { x: 330, y: 265 },
  'audit-nginx':       { x: 330, y: 380 },
  'user-app':          { x: 490, y: 40  },
  'template-app':      { x: 490, y: 150 },
  'file-app':          { x: 490, y: 265 },
  'audit-app':         { x: 490, y: 380 },
  'template-queue':    { x: 645, y: 50  },
  'file-queue':        { x: 645, y: 120 },
  zookeeper:           { x: 645, y: 200 },
  kafka1:              { x: 645, y: 255 },
  kafka2:              { x: 645, y: 295 },
  kafka3:              { x: 645, y: 335 },
  'template-consumer':    { x: 645, y: 400 },
  'file-consumer':        { x: 645, y: 448 },
  'audit-consumer':       { x: 645, y: 496 },
  'notification-consumer':{ x: 645, y: 544 },
  'user-db':              { x: 810, y: 20  },
  'template-db':          { x: 810, y: 110 },
  'file-db':              { x: 810, y: 200 },
  'audit-db':             { x: 810, y: 295 },
  redis:                  { x: 810, y: 375 },
  localstack:             { x: 810, y: 445 },
  'notification-nginx':   { x: 330, y: 490 },
  'notification-app':     { x: 490, y: 490 },
  grafana:                { x: 120, y: 645 },
  prometheus:             { x: 260, y: 645 },
  loki:                   { x: 400, y: 645 },
  tempo:                  { x: 540, y: 645 },
  promtail:               { x: 680, y: 645 },
  cadvisor:               { x: 810, y: 695 },
};

// [from, to, style?]  style: 'otlp' = dashed purple, default = solid gray
const GEDGES: [string, string, string?][] = [
  ['browser', 'kong'],
  ['kong', 'kong-db-node'],
  ['kong', 'user-nginx'],
  ['kong', 'template-nginx'],
  ['kong', 'file-nginx'],
  ['kong', 'audit-nginx'],
  ['user-nginx',     'user-app'],
  ['template-nginx', 'template-app'],
  ['file-nginx',     'file-app'],
  ['audit-nginx',    'audit-app'],
  ['user-app',    'user-db'],
  ['user-app',    'redis'],
  ['user-app',    'kafka1'],
  ['template-app','template-db'],
  ['template-app','template-queue'],
  ['template-queue','kafka1'],
  ['file-app',    'file-db'],
  ['file-app',    'localstack'],
  ['audit-app',   'audit-db'],
  ['audit-app',   'kafka1'],
  ['zookeeper',   'kafka1'],
  ['zookeeper',   'kafka2'],
  ['zookeeper',   'kafka3'],
  ['kong',   'notification-nginx'],
  ['notification-nginx', 'notification-app'],
  ['kafka1', 'template-consumer'],
  ['kafka1', 'file-consumer'],
  ['kafka1', 'audit-consumer'],
  ['kafka1', 'notification-consumer'],
  ['file-consumer',  'localstack'],
  ['audit-consumer', 'audit-db'],
  ['template-app', 'tempo',      'otlp'],
  ['user-app',     'tempo',      'otlp'],
  ['promtail',     'loki'],
  ['cadvisor',     'prometheus'],
  ['grafana',      'prometheus'],
  ['grafana',      'loki'],
  ['grafana',      'tempo'],
];

// ─── Health status helpers ────────────────────────────────────────────────────

function statusColor(s: ServiceStatus): string {
  if (s === 'healthy')  return 'bg-green-500';
  if (s === 'degraded') return 'bg-yellow-400';
  if (s === 'down')     return 'bg-red-500';
  return 'bg-gray-400'; // loading
}

function statusLabel(s: ServiceStatus): string {
  if (s === 'healthy')  return 'Healthy';
  if (s === 'degraded') return 'Degraded';
  if (s === 'down')     return 'Down';
  return 'Checking…';
}

// ─── Latest release hook ─────────────────────────────────────────────────────
const RELEASE_LS_KEY = 'dynadoc_last_seen_release';

interface ReleaseInfo { tag: string; name: string; publishedAt: string; url: string }

function useLatestRelease(): ReleaseInfo | null {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    const fetchRelease = () =>
      fetch('https://api.github.com/repos/nteej/ddoc-k3s/releases/latest', {
        headers: { Accept: 'application/vnd.github+json' },
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.tag_name) {
            setRelease({ tag: d.tag_name, name: d.name || d.tag_name, publishedAt: d.published_at, url: d.html_url });
          }
        })
        .catch(() => {});

    fetchRelease();
    const id = window.setInterval(fetchRelease, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return release;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const FLOW_CSS = `
  @keyframes flowDash{from{stroke-dashoffset:10}to{stroke-dashoffset:0}}
  @keyframes slideIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(110%);opacity:0}}
  @keyframes stepIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes tracerPulse{0%,100%{opacity:1}50%{opacity:0.55}}
`;

const AnimatedArrow: React.FC<{ color: string }> = ({ color }) => (
  <svg width="20" height="10" viewBox="0 0 20 10" className="shrink-0">
    <line x1="0" y1="5" x2="13" y2="5" stroke={color} strokeWidth="1.5" strokeDasharray="3 2"
      style={{ animation: 'flowDash 0.6s linear infinite' }} />
    <path d="M12 2 L19 5 L12 8" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const FlowPath: React.FC<{ flow: FlowDef }> = ({ flow }) => (
  <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50/80">
    <div className="flex items-start gap-1 min-w-max px-4 py-3">
      {flow.steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-0.5 w-[72px]">
            <div className="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow"
              style={{ backgroundColor: flow.color }}>
              {i + 1}
            </div>
            <span className="text-[10px] text-gray-700 font-semibold text-center leading-tight">
              {ALL[step.id]?.label ?? step.id}
            </span>
            <span className="text-[9px] text-gray-400 text-center leading-tight">{step.label}</span>
          </div>
          {i < flow.steps.length - 1 && (
            <div className="mt-2.5"><AnimatedArrow color={flow.color} /></div>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

const Sparkline: React.FC<{ data: number[]; light?: boolean }> = ({ data, light }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const W = 44, H = 14;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 2) - 1}`).join(' ');
  return (
    <svg width={W} height={H}>
      <polyline points={pts} fill="none"
        stroke={light ? 'rgba(255,255,255,0.6)' : 'rgba(0,53,128,0.4)'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const PulsingDot: React.FC<{ status?: ServiceStatus }> = ({ status = 'loading' }) => {
  const color = statusColor(status);
  const shouldPing = status === 'healthy' || status === 'loading';
  return (
    <span className="relative flex h-2.5 w-2.5">
      {shouldPing && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  );
};

const ScaleTag: React.FC<{ axis: 'horizontal' | 'vertical' | 'both'; hint: string }> = ({ axis, hint }) => (
  <div className="group relative">
    <div className={`
      flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-dashed cursor-help
      text-[#003580] border-[#003580]/40 bg-[#003580]/5
      hover:bg-[#003580]/10 hover:border-[#003580]/70 transition-all text-xs font-medium
    `}>
      {axis === 'horizontal' && <ChevronsRight className="w-3.5 h-3.5" />}
      {axis === 'vertical' && <ChevronsDown className="w-3.5 h-3.5" />}
      {axis === 'both' && <Plus className="w-3.5 h-3.5" />}
      <span>Scale {axis === 'both' ? 'H & V' : axis}</span>
    </div>
    {/* Tooltip */}
    <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 hidden group-hover:block">
      <div className="bg-[#001f5c] text-white text-xs rounded-xl p-3 shadow-xl leading-relaxed">
        {hint}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#001f5c] rotate-45" />
      </div>
    </div>
  </div>
);

const ScalePlaceholder: React.FC<{ axis: 'horizontal' | 'vertical' | 'both'; label?: string }> = ({ axis, label }) => (
  <div className={`
    flex flex-col items-center justify-center gap-1
    border-2 border-dashed border-[#003580]/30 rounded-xl
    bg-[#003580]/3 hover:bg-[#003580]/8 hover:border-[#003580]/50
    transition-all cursor-default min-w-[90px] min-h-[72px] px-3
  `}>
    <Plus className="w-4 h-4 text-[#003580]/40" />
    <span className="text-[10px] text-[#003580]/50 font-medium text-center leading-tight">
      {label ?? (axis === 'horizontal' ? 'Add instance' : 'Add replica')}
    </span>
  </div>
);

const CompCard: React.FC<{
  comp: Comp;
  status: ServiceStatus;
  latency?: number | null;
  error?: string;
  selected: boolean;
  onClick: () => void;
  flowStep?: number;
  flowColor?: string;
  sparkData?: number[];
}> = ({ comp, status, latency, error, selected, onClick, flowStep, flowColor, sparkData }) => {
  const style = C[comp.kind];
  const isDown = status === 'down';
  const isFlowActive = flowStep != null;

  return (
    <button
      onClick={onClick}
      title={error ? `${statusLabel(status)}: ${error}` : statusLabel(status)}
      className={`
        relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 cursor-pointer
        transition-all duration-200 min-w-[90px] group text-left
        ${isDown ? 'border-red-400' : isFlowActive && !selected ? 'border-transparent' : style.border}
        ${selected
          ? `${isDown ? 'bg-red-700' : style.bg} shadow-lg scale-105 ring-2 ${isDown ? 'ring-red-400' : style.ring} ring-offset-2 ring-offset-white`
          : isDown
            ? 'bg-red-50 hover:bg-red-100'
            : `bg-white hover:${style.bg} hover:scale-[1.03] hover:shadow-md`
        }
      `}
      style={isFlowActive && !selected && !isDown
        ? { boxShadow: `0 0 0 2px ${flowColor}, 0 4px 14px ${flowColor}50` }
        : undefined}
    >
      {/* Flow step badge */}
      {isFlowActive && (
        <div className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center z-10 shadow border-2 border-white"
          style={{ backgroundColor: flowColor }}>
          {flowStep}
        </div>
      )}

      {/* Status indicator top-right */}
      <div className="absolute top-1.5 right-1.5">
        <PulsingDot status={status} />
      </div>

      <div className={`
        p-1.5 rounded-lg transition-all duration-200
        ${selected
          ? 'bg-white/20'
          : isDown
            ? 'bg-red-200'
            : `${style.bg} group-hover:bg-white/20`}
      `}>
        <span className={selected || (!isDown) ? 'text-white' : 'text-red-600'}>{comp.icon}</span>
      </div>

      <div className="text-center">
        <div className={`font-semibold text-[11px] leading-tight transition-colors
          ${selected ? 'text-white' : isDown ? 'text-red-700' : 'text-[#001f5c] group-hover:text-white'}`}>
          {comp.label}
        </div>
        {comp.sub && (
          <div className={`text-[9px] mt-0.5 leading-tight transition-colors
            ${selected ? 'text-white/70' : isDown ? 'text-red-400' : 'text-gray-400 group-hover:text-white/70'}`}>
            {comp.sub.split(' · ')[1] ?? comp.sub}
          </div>
        )}
      </div>

      {/* Sparkline */}
      {sparkData && sparkData.length >= 2 && status === 'healthy' && (
        <Sparkline data={sparkData} light={selected} />
      )}

      {/* Latency badge */}
      {latency != null && status === 'healthy' && (
        <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full transition-colors
          ${selected ? 'bg-white/20 text-white/70' : 'bg-gray-100 text-gray-400 group-hover:bg-white/20 group-hover:text-white/70'}`}>
          {latency}ms
        </div>
      )}
      {status === 'down' && (
        <div className="text-[9px] font-medium text-red-500 flex items-center gap-0.5">
          <WifiOff className="w-2.5 h-2.5" /> Down
        </div>
      )}
      {status === 'loading' && (
        <Loader2 className="w-2.5 h-2.5 text-gray-400 animate-spin" />
      )}
    </button>
  );
};

// Arrow between layers
const LayerArrow: React.FC<{ flowColor?: string }> = ({ flowColor }) => (
  <div className="flex justify-center my-1">
    <svg width="10" height="22" viewBox="0 0 10 22">
      <line x1="5" y1="0" x2="5" y2="15"
        stroke={flowColor ?? '#d1d5db'} strokeWidth="2"
        strokeDasharray={flowColor ? '3 2' : undefined}
        style={flowColor ? { animation: 'flowDash 0.6s linear infinite' } : undefined}
      />
      <path d="M0 15 L5 22 L10 15" fill={flowColor ?? '#d1d5db'} />
    </svg>
  </div>
);

// ─── Alert toast ──────────────────────────────────────────────────────────────
interface Toast { id: string; service: string; to: ServiceStatus; time: Date }

const AlertToastStack: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 items-end pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium
          ${t.to === 'down' ? 'bg-red-600 border-red-700 text-white' : t.to === 'degraded' ? 'bg-yellow-500 border-yellow-600 text-white' : 'bg-green-600 border-green-700 text-white'}`}
        style={{ animation: 'slideIn 0.3s ease forwards', minWidth: 240 }}
      >
        {t.to === 'down'    && <AlertTriangle className="w-4 h-4 shrink-0" />}
        {t.to === 'healthy' && <CheckCircle2  className="w-4 h-4 shrink-0" />}
        {t.to === 'degraded'&& <AlertTriangle className="w-4 h-4 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{ALL[t.service]?.label ?? t.service}</div>
          <div className="text-[11px] opacity-80">
            {t.to === 'down' ? 'Service unreachable' : t.to === 'degraded' ? 'Service degraded' : 'Service recovered'}
            {' '}· {t.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
        <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100 transition-opacity shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ))}
  </div>
);

// ─── Kafka topic card ─────────────────────────────────────────────────────────
const KafkaTopicCard: React.FC<{ topic: typeof TOPICS[0] }> = ({ topic }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all cursor-pointer select-none ${topic.color}`}
      onClick={() => setOpen(p => !p)}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${topic.dotColor}`} />
        <span className="text-[11px] font-mono font-semibold">{topic.name}</span>
        <span className="text-[10px] opacity-60 ml-auto">{topic.partitions}p · RF{topic.rf}</span>
        <ChevronRight className={`w-3 h-3 opacity-60 transition-transform ${open ? 'rotate-90' : ''}`} />
      </div>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-current/20 bg-white/60 space-y-2 text-[11px]">
          <p className="text-gray-600 leading-relaxed">{topic.description}</p>
          <div className="flex gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Producers</div>
              {topic.producers.map(p => (
                <div key={p} className="flex items-center gap-1 text-gray-700 font-mono">
                  <ArrowRight className="w-2.5 h-2.5 text-gray-400" />{ALL[p]?.label ?? p}
                </div>
              ))}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Consumers</div>
              {topic.consumers.map(c => (
                <div key={c} className="flex items-center gap-1 text-gray-700 font-mono">
                  <ArrowRight className="w-2.5 h-2.5 text-gray-400" />{ALL[c]?.label ?? c}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            {Array.from({ length: topic.partitions }, (_, i) => (
              <div key={i} className="flex-1 rounded-lg bg-white/80 border border-current/20 px-2 py-1 text-center">
                <div className="text-[10px] text-gray-400">P{i}</div>
                <div className="text-[9px] text-gray-500 font-mono">kafka{(i % 3) + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Dependency graph view ────────────────────────────────────────────────────
const GraphView: React.FC<{
  getStatus: (id: string) => ServiceStatus;
  onNodeClick: (id: string) => void;
  selected: Comp | null;
  flowStepMap: Record<string, number>;
  activeFlowColor?: string;
}> = ({ getStatus, onNodeClick, selected, flowStepMap, activeFlowColor }) => {
  const statusDot = (s: ServiceStatus) =>
    s === 'healthy' ? '#22c55e' : s === 'down' ? '#ef4444' : s === 'degraded' ? '#eab308' : '#9ca3af';

  return (
    <div className="w-full overflow-x-auto rounded-2xl border-2 border-gray-200 bg-[#f8faff]">
      <svg viewBox="0 0 940 745" style={{ minWidth: 680, width: '100%' }} fontFamily="system-ui, sans-serif">
        <defs>
          <marker id="arr" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
            <path d="M0,0 L6,2.5 L0,5 Z" fill="#94a3b8" />
          </marker>
          <marker id="arr-flow" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
            <path d="M0,0 L6,2.5 L0,5 Z" fill="#003580" />
          </marker>
          <marker id="arr-otlp" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
            <path d="M0,0 L6,2.5 L0,5 Z" fill="#4338ca" />
          </marker>
        </defs>

        {/* layer background bands */}
        {[
          { x: 20,  w: 110, label: 'Client',     color: '#003580' },
          { x: 160, w: 110, label: 'Gateway',     color: '#001f5c' },
          { x: 315, w: 110, label: 'Nginx',       color: '#1d4ed8' },
          { x: 475, w: 110, label: 'Services',    color: '#2563eb' },
          { x: 630, w: 110, label: 'Workers / Kafka', color: '#0369a1' },
          { x: 795, w: 110, label: 'Data',        color: '#1e3a8a' },
        ].map(b => (
          <g key={b.label}>
            <rect x={b.x} y={8} width={b.w} height={710} rx={10} fill={b.color} opacity={0.06} />
            <text x={b.x + b.w / 2} y={22} textAnchor="middle" fontSize={8} fill={b.color} fontWeight="700" letterSpacing="0.08em" opacity={0.7}>
              {b.label.toUpperCase()}
            </text>
          </g>
        ))}

        {/* Observability band */}
        <rect x={20} y={630} width={900} height={108} rx={10} fill="#4338ca" opacity={0.05} />
        <text x={460} y={645} textAnchor="middle" fontSize={8} fill="#4338ca" fontWeight="700" letterSpacing="0.08em" opacity={0.7}>
          OBSERVABILITY
        </text>

        {/* edges */}
        {GEDGES.map(([from, to, style]) => {
          const a = GPOS[from], b = GPOS[to];
          if (!a || !b) return null;
          const x1 = a.x + NW, y1 = a.y + NH / 2;
          const x2 = b.x,      y2 = b.y + NH / 2;
          const cx = (x1 + x2) / 2;
          const inFlow = activeFlowColor && (flowStepMap[from] != null || flowStepMap[to] != null);
          const isOtlp = style === 'otlp';
          return (
            <path
              key={`${from}→${to}`}
              d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
              fill="none"
              stroke={inFlow ? activeFlowColor! : isOtlp ? '#4338ca' : '#cbd5e1'}
              strokeWidth={inFlow ? 2 : 1}
              strokeDasharray={isOtlp ? '4 3' : inFlow ? '5 3' : undefined}
              markerEnd={inFlow ? 'url(#arr-flow)' : isOtlp ? 'url(#arr-otlp)' : 'url(#arr)'}
              opacity={activeFlowColor && !inFlow ? 0.15 : 0.8}
              style={inFlow ? { animation: 'flowDash 0.6s linear infinite' } : undefined}
            />
          );
        })}

        {/* nodes */}
        {Object.entries(GPOS).map(([id, pos]) => {
          const comp = ALL[id];
          if (!comp) return null;
          const status = getStatus(id);
          const isSelected = selected?.id === id;
          const stepNum = flowStepMap[id];
          const hex = KIND_HEX[comp.kind];
          const dim = activeFlowColor && stepNum == null && !isSelected;
          return (
            <g key={id} onClick={() => onNodeClick(id)} style={{ cursor: 'pointer' }} opacity={dim ? 0.35 : 1}>
              {/* selection / flow ring */}
              {(isSelected || stepNum != null) && (
                <rect x={pos.x - 3} y={pos.y - 3} width={NW + 6} height={NH + 6} rx={9}
                  fill="none" stroke={isSelected ? hex : activeFlowColor!} strokeWidth={2} />
              )}
              {/* card */}
              <rect x={pos.x} y={pos.y} width={NW} height={NH} rx={6}
                fill={isSelected ? hex : '#ffffff'}
                stroke={isSelected ? hex : '#e2e8f0'} strokeWidth={1} />
              {/* kind color strip */}
              <rect x={pos.x} y={pos.y} width={4} height={NH} rx={3} fill={hex} />
              {/* label */}
              <text x={pos.x + 10} y={pos.y + NH / 2 + 3.5} fontSize={9} fill={isSelected ? '#fff' : '#1e293b'} fontWeight={isSelected ? 700 : 500}>
                {(ALL[id]?.label ?? id).length > 12 ? (ALL[id]?.label ?? id).slice(0, 11) + '…' : (ALL[id]?.label ?? id)}
              </text>
              {/* status dot */}
              <circle cx={pos.x + NW - 8} cy={pos.y + NH / 2} r={4} fill={statusDot(status)} />
              {status === 'healthy' && <circle cx={pos.x + NW - 8} cy={pos.y + NH / 2} r={4} fill={statusDot(status)} opacity={0.4}>
                <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
              </circle>}
              {/* flow step badge */}
              {stepNum != null && (
                <>
                  <circle cx={pos.x + 3} cy={pos.y + 3} r={7} fill={activeFlowColor} />
                  <text x={pos.x + 3} y={pos.y + 7} fontSize={7} textAnchor="middle" fill="white" fontWeight="bold">{stepNum}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─── Skeleton card ────────────────────────────────────────────────────────────
const CompCardSkeleton: React.FC = () => (
  <div className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 border-gray-100 min-w-[90px] bg-white animate-pulse">
    <div className="w-7 h-7 rounded-lg bg-gray-100" />
    <div className="h-2.5 w-14 rounded-full bg-gray-100" />
    <div className="h-2 w-10 rounded-full bg-gray-100" />
  </div>
);

// ─── Incident log ─────────────────────────────────────────────────────────────
interface IncidentEvent {
  key: string;
  service: string;
  from: ServiceStatus;
  to: ServiceStatus;
  time: Date;
}

const IncidentLog: React.FC<{ events: IncidentEvent[] }> = ({ events }) => {
  const [open, setOpen] = useState(true);
  if (events.length === 0) return null;
  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#001f5c] hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#003580]" />
          Incident Timeline
          <span className="text-[10px] bg-[#003580] text-white px-1.5 py-0.5 rounded-full font-bold leading-none">
            {events.length}
          </span>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
          {events.map(evt => (
            <div key={evt.key} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-[10px] text-gray-400 font-mono w-[54px] shrink-0">
                {evt.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor(evt.to)}`} />
              <span className="text-xs font-semibold text-[#001f5c] truncate">
                {ALL[evt.service]?.label ?? evt.service}
              </span>
              <span className="text-[11px] text-gray-400 shrink-0">
                {evt.from} → <span className={evt.to === 'down' ? 'text-red-500 font-semibold' : evt.to === 'healthy' ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold'}>{evt.to}</span>
              </span>
              {evt.to === 'down'    && <AlertTriangle  className="w-3.5 h-3.5 text-red-400 ml-auto shrink-0" />}
              {evt.to === 'healthy' && <CheckCircle2   className="w-3.5 h-3.5 text-green-500 ml-auto shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Message Tracer panel ─────────────────────────────────────────────────────
const MessageTracerPanel: React.FC<{
  title: string;
  subtitle: string;
  completionNote: string;
  color: string;
  steps: TraceStepDef[];
  currentStep: number | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStepTo: (i: number) => void;
  onNext: () => void;
  onPrev: () => void;
}> = ({ title, subtitle, completionNote, color, steps, currentStep, isPlaying, onPlay, onPause, onReset, onStepTo, onNext, onPrev }) => {
  const step    = currentStep != null && currentStep < steps.length ? steps[currentStep] : null;
  const nextStep = currentStep != null && currentStep + 1 < steps.length ? steps[currentStep + 1] : null;
  const isDone  = currentStep != null && currentStep >= steps.length;
  const progress = currentStep != null ? currentStep / steps.length : 0;
  const km = step ? KIND_META[step.kind] : null;

  // Index where async phase begins
  const asyncStart = steps.findIndex((s, i) => s.phase === 'async' && (i === 0 || steps[i - 1].phase === 'sync'));

  return (
    <div className="rounded-2xl border-2 bg-white overflow-hidden shadow-md mb-4" style={{ borderColor: `${color}35` }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-3" style={{ backgroundColor: color }}>
        <div className="flex items-center gap-3 text-white min-w-0">
          <div className="p-2 bg-white/15 rounded-xl shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight">{title}</div>
            <div className="text-[10px] text-white/55 leading-tight mt-0.5 font-mono">{subtitle}</div>
          </div>
          {isPlaying && (
            <span className="shrink-0 hidden sm:flex text-[10px] bg-white/15 px-2.5 py-1 rounded-full items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation: 'tracerPulse 1s ease infinite' }} />
              Running
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button disabled={currentStep === null || currentStep === 0} onClick={onPrev} title="Previous"
            className="p-1.5 rounded-lg text-white/65 hover:bg-white/20 disabled:opacity-25 transition-colors">
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          {isPlaying ? (
            <button onClick={onPause} className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors">
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={onPlay}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white font-bold text-xs shadow hover:shadow-md transition-all"
              style={{ color }}>
              <Play className="w-3 h-3" />
              {currentStep === null ? 'Trace' : isDone ? 'Replay' : 'Resume'}
            </button>
          )}
          <button disabled={currentStep === null || isDone} onClick={onNext} title="Next"
            className="p-1.5 rounded-lg text-white/65 hover:bg-white/20 disabled:opacity-25 transition-colors">
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          {currentStep !== null && (
            <button onClick={onReset} title="Reset"
              className="p-1.5 rounded-lg text-white/35 hover:text-white/65 hover:bg-white/20 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      <div className="h-1.5 bg-gray-100">
        <div className="h-full transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progress * 100}%`, backgroundColor: color }} />
      </div>

      {/* ── Step track ─────────────────────────────────────────────────────── */}
      <div className="bg-[#f8faff] border-b border-gray-100">
        <div className="overflow-x-auto">
          <div className="flex items-start min-w-max px-5 py-4 gap-0">
            {steps.map((s, i) => {
              const past   = currentStep !== null && i < currentStep;
              const active = currentStep === i;
              const future = currentStep === null || i > currentStep;
              const km_s   = KIND_META[s.kind];
              const isAsyncBoundaryBefore = i === asyncStart && i > 0;

              return (
                <React.Fragment key={i}>
                  {/* Async boundary marker */}
                  {isAsyncBoundaryBefore && (
                    <div className="flex flex-col items-center self-stretch mx-2 shrink-0">
                      <div className="flex-1 border-l-2 border-dashed border-amber-300" />
                      <div className="text-[8px] font-bold text-amber-500 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded whitespace-nowrap my-0.5">
                        async
                      </div>
                      <div className="flex-1 border-l-2 border-dashed border-amber-300" />
                    </div>
                  )}

                  <button
                    onClick={() => onStepTo(i)}
                    className={`flex flex-col items-center gap-1.5 min-w-[62px] px-1 rounded-xl py-1 transition-all
                      hover:bg-white hover:shadow-sm ${future && currentStep !== null ? 'opacity-30' : ''}`}
                  >
                    {/* Step circle */}
                    <div
                      className={`w-8 h-8 rounded-full text-[10px] font-bold flex items-center justify-center border-2 transition-all duration-200
                        ${active ? 'scale-110' : ''}`}
                      style={
                        active
                          ? { backgroundColor: color, borderColor: color, color: '#fff', boxShadow: `0 0 0 4px ${color}28` }
                          : past
                            ? { backgroundColor: `${color}18`, borderColor: `${color}45`, color }
                            : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#9ca3af' }
                      }
                    >
                      {past ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>

                    {/* Kind dot */}
                    <div className="w-2 h-2 rounded-full transition-all"
                      style={{ backgroundColor: km_s?.color ?? '#9ca3af', opacity: future && currentStep !== null ? 0.3 : 1 }} />

                    {/* Label */}
                    <span className="text-[9px] leading-tight text-center max-w-[58px] font-semibold"
                      style={
                        active ? { color } :
                        past   ? { color: `${color}85` } :
                        { color: '#9ca3af' }
                      }>
                      {ALL[s.nodeId]?.label ?? s.nodeId}
                    </span>
                  </button>

                  {/* Connector */}
                  {i < steps.length - 1 && !isAsyncBoundaryBefore && (
                    <div className="flex items-center mt-4 mx-0.5 shrink-0">
                      <div className="w-3 h-px transition-colors"
                        style={{ backgroundColor: past ? `${color}55` : '#d1d5db' }} />
                      <ArrowRight className="w-3 h-3 -ml-0.5"
                        style={{ color: past ? `${color}55` : '#d1d5db' }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Phase legend */}
        {asyncStart > 0 && (
          <div className="flex items-center gap-6 px-5 pb-2.5 text-[9px] font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5" style={{ color }}>
              <div className="w-3 h-px border-t-2" style={{ borderColor: color }} />
              Sync — user waits
            </span>
            <span className="flex items-center gap-1.5 text-amber-500">
              <div className="w-3 h-px border-t-2 border-dashed border-amber-400" />
              Async — happens in background
            </span>
          </div>
        )}
      </div>

      {/* ── Step detail ────────────────────────────────────────────────────── */}
      {step && km ? (
        <div key={currentStep} style={{ animation: 'stepIn 0.22s ease forwards' }}>
          {/* Phase callout for async steps */}
          {step.phase === 'async' && (
            <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
              <span className="font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-[10px]">ASYNC</span>
              The HTTP response was already returned to the browser. This step runs in the background.
            </div>
          )}

          <div className={`p-5 grid gap-5 ${step.payload ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Left: step info */}
            <div className="space-y-4">
              {/* Component header */}
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-2xl p-2.5 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: km.bg, color: km.color }}>
                  {km.icon}
                </div>
                <div>
                  <div className="text-base font-extrabold text-[#001f5c]">
                    {ALL[step.nodeId]?.label ?? step.nodeId}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: km.bg, color: km.color }}>
                      {km.label}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-full">
                      {step.timing}
                    </span>
                    <span className="text-[10px] text-gray-300">
                      step {(currentStep ?? 0) + 1} / {steps.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary — plain English */}
              <p className="text-[#1e293b] text-sm leading-relaxed font-medium">
                {step.summary}
              </p>

              {/* Technical detail */}
              <div className="border-l-2 pl-3 space-y-1" style={{ borderColor: `${km.color}50` }}>
                <div className="text-[9px] uppercase tracking-widest font-bold text-gray-400">Technical detail</div>
                <p className="text-xs text-gray-500 leading-relaxed">{step.detail}</p>
              </div>

              {/* Protocol */}
              <code className="inline-block text-[10px] font-mono bg-gray-50 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl">
                {step.protocol}
              </code>
            </div>

            {/* Right: payload / query */}
            {step.payload && (
              <div className="flex flex-col gap-2">
                <div className="text-[9px] uppercase tracking-widest font-bold text-gray-400">
                  {step.kind === 'db' ? 'Query' : step.kind === 'kafka' ? 'Kafka Message' : step.kind === 'storage' ? 'Storage Operation' : 'Payload'}
                </div>
                <pre className="flex-1 bg-[#0d1117] text-emerald-400 text-[10px] font-mono rounded-xl px-4 py-3 overflow-auto max-h-52 leading-relaxed whitespace-pre">
                  {step.payload}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : isDone ? (
        <div className="p-5 flex items-start gap-4 bg-green-50 border-t border-green-100">
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="font-bold text-green-800 text-sm mb-0.5">Trace complete</div>
            <p className="text-green-700 text-xs leading-relaxed">{completionNote}</p>
          </div>
        </div>
      ) : (
        <div className="py-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: `${color}12` }}>
            <Play className="w-5 h-5 ml-0.5" style={{ color }} />
          </div>
          <p className="text-sm text-gray-500">
            Press <strong style={{ color }}>Trace</strong> to walk through the flow step by step
          </p>
          <p className="text-[11px] text-gray-400">or click any step node above to jump straight to it</p>
        </div>
      )}

      {/* ── Next up footer ─────────────────────────────────────────────────── */}
      {step && nextStep && (() => {
        const nkm = KIND_META[nextStep.kind];
        return (
          <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-2.5 flex items-center gap-2.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Next up</span>
            <ArrowRight className="w-3 h-3 text-gray-300" />
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ backgroundColor: color }}>
              {(currentStep ?? 0) + 2}
            </div>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: nkm?.color ?? '#9ca3af' }} />
            <span className="text-xs font-semibold text-[#001f5c] shrink-0">{ALL[nextStep.nodeId]?.label ?? nextStep.nodeId}</span>
            <span className="text-xs text-gray-400 truncate hidden sm:block">— {nextStep.summary}</span>
          </div>
        );
      })()}
    </div>
  );
};

// ─── Detail Panel ─────────────────────────────────────────────────────────────
const DetailPanel: React.FC<{ comp: Comp; onClose: () => void; health?: SystemHealth; lastChecked: string | null }> = ({ comp, onClose, health, lastChecked }) => {
  const style = C[comp.kind];
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] z-50 flex flex-col bg-white border-l-2 border-[#003580]/20 shadow-2xl">
      {/* Header */}
      <div className={`${style.bg} p-5`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">{comp.icon}</div>
            <div>
              <h3 className="text-white font-bold text-base">{comp.label}</h3>
              {comp.sub && <p className="text-white/70 text-xs mt-0.5">{comp.sub}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-white/40 font-mono hidden sm:block">← → ESC</span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {comp.ports && comp.ports.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {comp.ports.map(p => (
              <span key={p} className="text-[10px] font-mono bg-black/25 text-white/85 px-2 py-0.5 rounded-full">{p}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {/* Docker image */}
        <div className="px-5 py-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Docker Image</div>
          <code className="text-xs text-[#003580] font-mono bg-[#003580]/5 px-2 py-1 rounded-lg inline-block">{comp.image}</code>
        </div>

        {/* Description */}
        <div className="px-5 py-4">
          <p className="text-gray-600 text-sm leading-relaxed">{comp.description}</p>
        </div>

        {/* Responsibilities */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#003580]" />
            <h4 className="text-[#001f5c] font-semibold text-sm">Responsibilities</h4>
          </div>
          <ul className="space-y-1.5">
            {comp.responsibilities.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-500 text-sm">
                <ChevronRight className="w-3 h-3 text-[#003580]/40 mt-0.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* Kafka topics */}
        {comp.topics && comp.topics.length > 0 && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-3">
              <MessageSquare className="w-3.5 h-3.5 text-[#003580]" />
              <h4 className="text-[#001f5c] font-semibold text-sm">Kafka Topics</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {comp.topics.map(t => (
                <span key={t} className="text-xs font-mono bg-[#003580]/8 border border-[#003580]/20 text-[#003580] px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tech */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Cpu className="w-3.5 h-3.5 text-[#003580]" />
            <h4 className="text-[#001f5c] font-semibold text-sm">Technology</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {comp.tech.map((t, i) => (
              <span key={i} className="text-xs bg-gray-100 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full font-mono">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Config inspector */}
        {comp.config && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Volume2 className="w-3.5 h-3.5 text-[#003580]" />
              <h4 className="text-[#001f5c] font-semibold text-sm">Container Config</h4>
            </div>
            {comp.config.network && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold w-16 shrink-0">Network</span>
                <code className="text-[11px] font-mono text-[#003580] bg-[#003580]/5 px-2 py-0.5 rounded">{comp.config.network}</code>
              </div>
            )}
            {comp.config.volumes && comp.config.volumes.length > 0 && (
              <div className="mb-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block mb-1">Volumes</span>
                {comp.config.volumes.map((v, i) => (
                  <code key={i} className="block text-[11px] font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded mb-0.5">{v}</code>
                ))}
              </div>
            )}
            {comp.config.env && comp.config.env.length > 0 && (
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold block mb-1">Environment</span>
                <div className="bg-gray-950 rounded-xl px-3 py-2 space-y-0.5 max-h-36 overflow-y-auto">
                  {comp.config.env.map((e, i) => {
                    const [k, ...rest] = e.split('=');
                    return (
                      <div key={i} className="flex gap-1.5 text-[11px] font-mono">
                        <span className="text-purple-400">{k}</span>
                        <span className="text-gray-500">=</span>
                        <span className="text-green-400 truncate">{rest.join('=')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live status footer */}
      {(() => {
        const svc = health?.services[comp.id];
        const st: ServiceStatus = svc?.status as ServiceStatus ?? 'loading';
        return (
          <div className={`p-4 border-t flex items-center justify-between
            ${st === 'down' ? 'bg-red-50 border-red-100' : st === 'degraded' ? 'bg-yellow-50 border-yellow-100' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <PulsingDot status={st} />
              <span className={`text-xs font-medium
                ${st === 'down' ? 'text-red-600' : st === 'degraded' ? 'text-yellow-700' : 'text-gray-500'}`}>
                {statusLabel(st)}
              </span>
              {svc?.latency_ms != null && st === 'healthy' && (
                <span className="text-xs text-gray-400 font-mono">{svc.latency_ms}ms</span>
              )}
            </div>
            {svc?.error && (
              <span className="text-xs text-red-500 font-mono truncate max-w-[200px]" title={svc.error}>
                {svc.error}
              </span>
            )}
            {lastChecked && <span className="text-[10px] text-gray-300">updated {lastChecked}</span>}
          </div>
        );
      })()}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const ArchitecturePage: React.FC = () => {
  const [selected, setSelected] = useState<Comp | null>(null);
  const [activeFlow, setActiveFlow] = useState<string | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<Record<string, number[]>>({});
  const [incidents, setIncidents] = useState<IncidentEvent[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const release = useLatestRelease();
  const [releaseUnread, setReleaseUnread] = useState(0);
  const [diagramView, setDiagramView] = useState<'layer' | 'graph'>('layer');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [liveStep, setLiveStep] = useState<number | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [pdfStep, setPdfStep] = useState<number | null>(null);
  const [isPdfPlaying, setIsPdfPlaying] = useState(false);
  const [downloadStep, setDownloadStep] = useState<number | null>(null);
  const [isDownloadPlaying, setIsDownloadPlaying] = useState(false);
  const [resetStep, setResetStep] = useState<number | null>(null);
  const [isResetPlaying, setIsResetPlaying] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pdfPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const downloadPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStatuses = useRef<Record<string, ServiceStatus>>({});
  const { data: health, isLoading, dataUpdatedAt } = useSystemHealth(10_000);

  // Track latency sparkline history
  useEffect(() => {
    if (!health) return;
    setLatencyHistory(prev => {
      const next = { ...prev };
      Object.entries(health.services).forEach(([id, svc]) => {
        if (svc.latency_ms != null) {
          next[id] = [...(prev[id] ?? []), svc.latency_ms].slice(-12);
        }
      });
      return next;
    });
  }, [health]);

  // Detect service status changes → incident timeline + toasts + browser notifications
  useEffect(() => {
    if (!health) return;
    const newEvents: IncidentEvent[] = [];
    const newToasts: Toast[] = [];
    Object.entries(health.services).forEach(([id, svc]) => {
      const prev = prevStatuses.current[id];
      const curr = svc.status as ServiceStatus;
      if (prev && prev !== curr) {
        const evt: IncidentEvent = { key: `${id}-${Date.now()}`, service: id, from: prev, to: curr, time: new Date() };
        newEvents.push(evt);
        // Only toast on meaningful transitions
        if (curr === 'down' || curr === 'degraded' || (prev === 'down' && curr === 'healthy')) {
          const toastId = `toast-${id}-${Date.now()}`;
          newToasts.push({ id: toastId, service: id, to: curr, time: evt.time });
          // Browser notification
          if (notifEnabled && Notification.permission === 'granted') {
            new Notification(`DynaDoc — ${ALL[id]?.label ?? id} ${curr}`, {
              body: curr === 'down' ? 'Service is unreachable' : curr === 'degraded' ? 'Service is degraded' : 'Service has recovered',
              icon: '/favicon.ico',
            });
          }
          // Auto-dismiss toast after 6s
          setTimeout(() => setToasts(p => p.filter(t => t.id !== toastId)), 6000);
        }
      }
      prevStatuses.current[id] = curr;
    });
    if (newEvents.length > 0) setIncidents(prev => [...newEvents, ...prev].slice(0, 50));
    if (newToasts.length > 0) setToasts(prev => [...newToasts, ...prev].slice(0, 5));
  }, [health, notifEnabled]);

  // Track unseen releases
  useEffect(() => {
    if (!release) return;
    const lastSeen = localStorage.getItem(RELEASE_LS_KEY);
    if (lastSeen !== release.tag) setReleaseUnread(1);
  }, [release]);

  const dismissReleaseNotif = () => {
    if (release) localStorage.setItem(RELEASE_LS_KEY, release.tag);
    setReleaseUnread(0);
  };

  const toggleNotifications = async () => {
    dismissReleaseNotif();
    if (!notifEnabled) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') setNotifEnabled(true);
    } else {
      setNotifEnabled(false);
    }
  };

  // Ctrl+scroll zoom on diagram canvas
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      setZoom(z => Math.min(2, Math.max(0.35, z * factor)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Keyboard navigation
  const allServiceIds = useMemo(() => Object.keys(ALL), []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelected(null); return; }
      if (!selected) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = allServiceIds.indexOf(selected.id);
        setSelected(ALL[allServiceIds[(idx + 1) % allServiceIds.length]]);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = allServiceIds.indexOf(selected.id);
        setSelected(ALL[allServiceIds[(idx - 1 + allServiceIds.length) % allServiceIds.length]]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, allServiceIds]);

  // Pause tracers when their flow is deselected
  useEffect(() => { if (activeFlow !== 'auth')          setIsAutoPlaying(false);    }, [activeFlow]);
  useEffect(() => { if (activeFlow !== 'generation')    setIsPdfPlaying(false);     }, [activeFlow]);
  useEffect(() => { if (activeFlow !== 'download')      setIsDownloadPlaying(false);}, [activeFlow]);
  useEffect(() => { if (activeFlow !== 'passwordReset') setIsResetPlaying(false);   }, [activeFlow]);

  // Auto-advance tracer
  useEffect(() => {
    if (!isAutoPlaying) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }
    autoPlayRef.current = setInterval(() => {
      setLiveStep(prev => {
        const next = (prev ?? -1) + 1;
        if (next >= AUTH_TRACE.length) {
          setIsAutoPlaying(false);
          return AUTH_TRACE.length;
        }
        return next;
      });
    }, 1900);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [isAutoPlaying]);

  const handleTracerPlay = useCallback(() => {
    setIsPdfPlaying(false); setPdfStep(null);
    setIsDownloadPlaying(false); setDownloadStep(null);
    setIsResetPlaying(false); setResetStep(null);
    if (liveStep === null || liveStep >= AUTH_TRACE.length) setLiveStep(0);
    setIsAutoPlaying(true);
  }, [liveStep]);

  const handleTracerPause  = useCallback(() => setIsAutoPlaying(false), []);
  const handleTracerReset  = useCallback(() => { setIsAutoPlaying(false); setLiveStep(null); }, []);
  const handleTracerNext   = useCallback(() => {
    setIsAutoPlaying(false);
    setLiveStep(prev => Math.min((prev ?? -1) + 1, AUTH_TRACE.length));
  }, []);
  const handleTracerPrev   = useCallback(() => {
    setIsAutoPlaying(false);
    setLiveStep(prev => Math.max((prev ?? 1) - 1, 0));
  }, []);
  const handleTracerStepTo = useCallback((i: number) => { setIsAutoPlaying(false); setLiveStep(i); }, []);

  // Auto-advance PDF tracer
  useEffect(() => {
    if (!isPdfPlaying) {
      if (pdfPlayRef.current) clearInterval(pdfPlayRef.current);
      return;
    }
    pdfPlayRef.current = setInterval(() => {
      setPdfStep(prev => {
        const next = (prev ?? -1) + 1;
        if (next >= PDF_TRACE.length) {
          setIsPdfPlaying(false);
          return PDF_TRACE.length;
        }
        return next;
      });
    }, 1900);
    return () => { if (pdfPlayRef.current) clearInterval(pdfPlayRef.current); };
  }, [isPdfPlaying]);

  const handlePdfPlay = useCallback(() => {
    setIsAutoPlaying(false); setLiveStep(null);
    setIsDownloadPlaying(false); setDownloadStep(null);
    setIsResetPlaying(false); setResetStep(null);
    if (pdfStep === null || pdfStep >= PDF_TRACE.length) setPdfStep(0);
    setIsPdfPlaying(true);
  }, [pdfStep]);

  const handlePdfPause  = useCallback(() => setIsPdfPlaying(false), []);
  const handlePdfReset  = useCallback(() => { setIsPdfPlaying(false); setPdfStep(null); }, []);
  const handlePdfNext   = useCallback(() => {
    setIsPdfPlaying(false);
    setPdfStep(prev => Math.min((prev ?? -1) + 1, PDF_TRACE.length));
  }, []);
  const handlePdfPrev   = useCallback(() => {
    setIsPdfPlaying(false);
    setPdfStep(prev => Math.max((prev ?? 1) - 1, 0));
  }, []);
  const handlePdfStepTo = useCallback((i: number) => { setIsPdfPlaying(false); setPdfStep(i); }, []);

  // Auto-advance Download tracer
  useEffect(() => {
    if (!isDownloadPlaying) {
      if (downloadPlayRef.current) clearInterval(downloadPlayRef.current);
      return;
    }
    downloadPlayRef.current = setInterval(() => {
      setDownloadStep(prev => {
        const next = (prev ?? -1) + 1;
        if (next >= DOWNLOAD_TRACE.length) { setIsDownloadPlaying(false); return DOWNLOAD_TRACE.length; }
        return next;
      });
    }, 1900);
    return () => { if (downloadPlayRef.current) clearInterval(downloadPlayRef.current); };
  }, [isDownloadPlaying]);

  const handleDownloadPlay = useCallback(() => {
    setIsAutoPlaying(false); setLiveStep(null);
    setIsPdfPlaying(false);  setPdfStep(null);
    setIsResetPlaying(false); setResetStep(null);
    if (downloadStep === null || downloadStep >= DOWNLOAD_TRACE.length) setDownloadStep(0);
    setIsDownloadPlaying(true);
  }, [downloadStep]);
  const handleDownloadPause  = useCallback(() => setIsDownloadPlaying(false), []);
  const handleDownloadReset  = useCallback(() => { setIsDownloadPlaying(false); setDownloadStep(null); }, []);
  const handleDownloadNext   = useCallback(() => { setIsDownloadPlaying(false); setDownloadStep(prev => Math.min((prev ?? -1) + 1, DOWNLOAD_TRACE.length)); }, []);
  const handleDownloadPrev   = useCallback(() => { setIsDownloadPlaying(false); setDownloadStep(prev => Math.max((prev ?? 1) - 1, 0)); }, []);
  const handleDownloadStepTo = useCallback((i: number) => { setIsDownloadPlaying(false); setDownloadStep(i); }, []);

  // Auto-advance Password Reset tracer
  useEffect(() => {
    if (!isResetPlaying) {
      if (resetPlayRef.current) clearInterval(resetPlayRef.current);
      return;
    }
    resetPlayRef.current = setInterval(() => {
      setResetStep(prev => {
        const next = (prev ?? -1) + 1;
        if (next >= RESET_TRACE.length) { setIsResetPlaying(false); return RESET_TRACE.length; }
        return next;
      });
    }, 1900);
    return () => { if (resetPlayRef.current) clearInterval(resetPlayRef.current); };
  }, [isResetPlaying]);

  const handleResetPlay = useCallback(() => {
    setIsAutoPlaying(false); setLiveStep(null);
    setIsPdfPlaying(false);  setPdfStep(null);
    setIsDownloadPlaying(false); setDownloadStep(null);
    if (resetStep === null || resetStep >= RESET_TRACE.length) setResetStep(0);
    setIsResetPlaying(true);
  }, [resetStep]);
  const handleResetPause  = useCallback(() => setIsResetPlaying(false), []);
  const handleResetReset  = useCallback(() => { setIsResetPlaying(false); setResetStep(null); }, []);
  const handleResetNext   = useCallback(() => { setIsResetPlaying(false); setResetStep(prev => Math.min((prev ?? -1) + 1, RESET_TRACE.length)); }, []);
  const handleResetPrev   = useCallback(() => { setIsResetPlaying(false); setResetStep(prev => Math.max((prev ?? 1) - 1, 0)); }, []);
  const handleResetStepTo = useCallback((i: number) => { setIsResetPlaying(false); setResetStep(i); }, []);

  const flowStepMap = useMemo((): Record<string, number> => {
    if (!activeFlow) return {};
    const map: Record<string, number> = {};
    FLOWS[activeFlow].steps.forEach((s, i) => {
      if (!(s.id in map)) map[s.id] = i + 1;
    });
    return map;
  }, [activeFlow]);

  const activeFlowColor = activeFlow ? FLOWS[activeFlow].color : undefined;

  // Tracers take precedence over static flow trace in the diagram
  const liveTracerStepMap = useMemo((): Record<string, number> => {
    if (liveStep === null || liveStep >= AUTH_TRACE.length) return {};
    return { [AUTH_TRACE[liveStep].nodeId]: liveStep + 1 };
  }, [liveStep]);

  const pdfTracerStepMap = useMemo((): Record<string, number> => {
    if (pdfStep === null || pdfStep >= PDF_TRACE.length) return {};
    return { [PDF_TRACE[pdfStep].nodeId]: pdfStep + 1 };
  }, [pdfStep]);

  const downloadTracerStepMap = useMemo((): Record<string, number> => {
    if (downloadStep === null || downloadStep >= DOWNLOAD_TRACE.length) return {};
    return { [DOWNLOAD_TRACE[downloadStep].nodeId]: downloadStep + 1 };
  }, [downloadStep]);

  const resetTracerStepMap = useMemo((): Record<string, number> => {
    if (resetStep === null || resetStep >= RESET_TRACE.length) return {};
    return { [RESET_TRACE[resetStep].nodeId]: resetStep + 1 };
  }, [resetStep]);

  const effectiveFlowStepMap = resetStep !== null ? resetTracerStepMap
    : downloadStep !== null ? downloadTracerStepMap
    : pdfStep !== null ? pdfTracerStepMap
    : liveStep !== null ? liveTracerStepMap
    : flowStepMap;
  const effectiveFlowColor = resetStep !== null ? '#db2777'
    : downloadStep !== null ? '#1d4ed8'
    : pdfStep !== null ? '#0369a1'
    : liveStep !== null ? '#003580'
    : activeFlowColor;

  const getStatus = useCallback((id: string): ServiceStatus => {
    if (isLoading && !health) return 'loading';
    return (health?.services[id]?.status as ServiceStatus) ?? 'loading';
  }, [health, isLoading]);

  const handleClick = useCallback((id: string) => {
    const comp = ALL[id];
    if (!comp) return;
    setSelected(prev => prev?.id === id ? null : comp);
  }, []);

  const renderComponents = (ids: string[]) => ids.map(id => {
    const comp = ALL[id];
    if (!comp) return null;
    if (isLoading && !health) return <CompCardSkeleton key={id} />;
    const svc = health?.services[id];
    return (
      <CompCard
        key={id}
        comp={comp}
        status={getStatus(id)}
        latency={svc?.latency_ms}
        error={svc?.error}
        selected={selected?.id === id}
        onClick={() => handleClick(id)}
        flowStep={effectiveFlowStepMap[id]}
        flowColor={effectiveFlowColor}
        sparkData={latencyHistory[id]}
      />
    );
  });

  const downCount  = health ? Object.values(health.services).filter(s => s.status === 'down').length : 0;
  const totalCount = health ? Object.keys(health.services).length : 0;
  const lastChecked = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  return (
    <div className="min-h-screen bg-white text-[#001f5c]">
      <style>{FLOW_CSS}</style>
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white border-b-2 border-[#003580]/15 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-bold text-[#003580] text-base">DDoc</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-2 text-xs font-medium">
              {isLoading && !health ? (
                <><Loader2 className="w-3 h-3 animate-spin text-gray-400" /><span className="text-gray-400">Checking services…</span></>
              ) : downCount > 0 ? (
                <><AlertTriangle className="w-3.5 h-3.5 text-red-500" /><span className="text-red-600">{downCount} service{downCount > 1 ? 's' : ''} down</span></>
              ) : (
                <><PulsingDot status="healthy" /><span className="text-gray-500">All {totalCount} services operational</span></>
              )}
              {lastChecked && <span className="text-gray-300">· {lastChecked}</span>}
              {release && (
                <a
                  href={release.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Released: ${new Date(release.publishedAt).toLocaleDateString()}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#003580]/8 border border-[#003580]/20 text-[#003580] font-semibold hover:bg-[#003580]/15 transition-colors"
                >
                  <GitBranch className="w-3 h-3" />
                  {release.tag}
                </a>
              )}
            </span>
            <button
              onClick={toggleNotifications}
              title={releaseUnread > 0 ? `New release: ${release?.tag}` : notifEnabled ? 'Disable alert notifications' : 'Enable alert notifications'}
              className={`relative p-1.5 rounded-lg border transition-colors ${notifEnabled ? 'border-[#003580] bg-[#003580] text-white' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}
            >
              {notifEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {releaseUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none ring-2 ring-white">
                  {releaseUnread}
                </span>
              )}
            </button>
            <Link to="/login" className="text-sm text-[#003580] hover:text-white hover:bg-[#003580] px-3 py-1.5 rounded-lg border border-[#003580] transition-colors font-medium">
              Sign in →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#003580] text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Server className="w-3.5 h-3.5" />
            System Architecture — DynaDoc Flow
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            Every Component. Every Connection.
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto leading-relaxed">
            A cloud-native microservices platform for dynamic document generation.
            Click any component to explore its role, image, ports, and responsibilities.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              { n: Object.keys(ALL).length + ' Components', i: <Box className="w-3.5 h-3.5" /> },
              { n: '4 Microservices', i: <Layers className="w-3.5 h-3.5" /> },
              { n: '3 Kafka Brokers', i: <MessageSquare className="w-3.5 h-3.5" /> },
              { n: '4 Isolated DBs', i: <Database className="w-3.5 h-3.5" /> },
              { n: 'Full Observability', i: <Eye className="w-3.5 h-3.5" /> },
            ].map(b => (
              <span key={b.n} className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-sm px-3 py-1.5 rounded-full">
                {b.i}{b.n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kafka Topics legend ─────────────────────────────────────────────── */}
      <div className="bg-[#001f5c]/5 border-b border-[#003580]/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mr-1">Kafka Topics</span>
          {TOPICS.map(t => (
            <span key={t.name} className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${t.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${t.dotColor}`} />
              {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* ── Overall health banner ─────────────────────────────────────────── */}
      {health && downCount > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>{downCount} service{downCount > 1 ? 's' : ''} unreachable:</strong>{' '}
              {Object.entries(health.services).filter(([,v]) => v.status === 'down').map(([k]) => k).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* ── Scale legend ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 py-2">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-4 text-xs text-gray-400">
          <span className="font-semibold uppercase tracking-widest">Legend</span>
          <span className="flex items-center gap-1">
            <ChevronsRight className="w-3.5 h-3.5 text-[#003580]" />
            Horizontal scale
          </span>
          <span className="flex items-center gap-1">
            <ChevronsDown className="w-3.5 h-3.5 text-[#003580]" />
            Vertical scale
          </span>
          <span className="flex items-center gap-1">
            <Plus className="w-3.5 h-3.5 text-[#003580]" />
            H + V scale
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-8 h-px border-t-2 border-dashed border-[#003580]/40" />
            Expandable slot
          </span>
          <span className="flex items-center gap-1.5">
            <PulsingDot />
            Live container
          </span>
        </div>
      </div>

      {/* ── Diagram toolbar ────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pt-5 pb-2 space-y-3">
        {/* View toggle + flow selector row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-semibold">
            {(['layer', 'graph'] as const).map(v => (
              <button key={v} onClick={() => setDiagramView(v)}
                className={`px-3 py-1.5 transition-colors capitalize ${diagramView === v ? 'bg-[#003580] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                {v === 'layer' ? '⊞ Layer' : '⬡ Graph'}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 overflow-hidden text-xs">
            <button onClick={() => setZoom(z => Math.min(2, z * 1.2))} className="px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-600 font-bold">+</button>
            <span className="px-2 text-gray-500 font-mono tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.max(0.35, z / 1.2))} className="px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-600 font-bold">−</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-500">↺</button>
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Flow selector */}
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Trace:</span>
          {Object.entries(FLOWS).map(([key, flow]) => (
            <button key={key}
              onClick={() => setActiveFlow(prev => prev === key ? null : key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all
                ${activeFlow === key ? 'text-white border-transparent shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}
              style={activeFlow === key ? { backgroundColor: flow.color } : undefined}
            >
              {flow.label}
              {activeFlow === key && <X className="w-3 h-3" />}
            </button>
          ))}
        </div>

        {/* Flow path strip — only for flows without a dedicated tracer */}
        {activeFlow && !['auth', 'generation', 'download', 'passwordReset'].includes(activeFlow) && (
          <FlowPath flow={FLOWS[activeFlow]} />
        )}

        {/* Auth tracer — visible only when Auth Flow button is active */}
        {activeFlow === 'auth' && (
          <MessageTracerPanel
            title="Login Request — Live Message Tracer"
            subtitle="POST /api/auth/login → Kong → user-app → Kafka → audit-db"
            completionNote={`The login request travelled through ${AUTH_TRACE.length} components. The HTTP 200 was returned at step 6 — Kafka audit logging completes asynchronously.`}
            color="#003580"
            steps={AUTH_TRACE}
            currentStep={liveStep}
            isPlaying={isAutoPlaying}
            onPlay={handleTracerPlay}
            onPause={handleTracerPause}
            onReset={handleTracerReset}
            onStepTo={handleTracerStepTo}
            onNext={handleTracerNext}
            onPrev={handleTracerPrev}
          />
        )}

        {/* PDF generation tracer — visible only when PDF Generation button is active */}
        {activeFlow === 'generation' && (
          <MessageTracerPanel
            title="PDF Generation — Live Message Tracer"
            subtitle="POST /api/templates/{id}/generate → Queue → Kafka (×2) → S3 → audit-db"
            completionNote={`The generation request travelled through ${PDF_TRACE.length} components across two Kafka hops. The HTTP 202 was returned at step 4 — all rendering and storage is fully async.`}
            color="#0369a1"
            steps={PDF_TRACE}
            currentStep={pdfStep}
            isPlaying={isPdfPlaying}
            onPlay={handlePdfPlay}
            onPause={handlePdfPause}
            onReset={handlePdfReset}
            onStepTo={handlePdfStepTo}
            onNext={handlePdfNext}
            onPrev={handlePdfPrev}
          />
        )}

        {/* File download tracer */}
        {activeFlow === 'download' && (
          <MessageTracerPanel
            title="File Download — Live Message Tracer"
            subtitle="GET /api/files → Kong → file-app → S3 presigned URL → browser"
            completionNote={`The download flow travels through ${DOWNLOAD_TRACE.length} components. The PDF streams directly from S3 to the browser — PHP-FPM handles only the presigned URL generation, not the file transfer itself.`}
            color="#1d4ed8"
            steps={DOWNLOAD_TRACE}
            currentStep={downloadStep}
            isPlaying={isDownloadPlaying}
            onPlay={handleDownloadPlay}
            onPause={handleDownloadPause}
            onReset={handleDownloadReset}
            onStepTo={handleDownloadStepTo}
            onNext={handleDownloadNext}
            onPrev={handleDownloadPrev}
          />
        )}

        {/* Password reset tracer */}
        {activeFlow === 'passwordReset' && (
          <MessageTracerPanel
            title="Password Reset — Live Message Tracer"
            subtitle="POST /api/auth/forgot-password → user-app → Kafka → notification-consumer → OVH SMTP"
            completionNote={`The reset flow spans ${RESET_TRACE.length} components across a Kafka hop. HTTP 200 is returned at step 4 — email delivery is fully async via the Notification Service.`}
            color="#db2777"
            steps={RESET_TRACE}
            currentStep={resetStep}
            isPlaying={isResetPlaying}
            onPlay={handleResetPlay}
            onPause={handleResetPause}
            onReset={handleResetReset}
            onStepTo={handleResetStepTo}
            onNext={handleResetNext}
            onPrev={handleResetPrev}
          />
        )}
      </div>

      {/* ── Diagram ─────────────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className={`max-w-5xl mx-auto px-4 select-none ${diagramView === 'graph' ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onMouseDown={e => {
          if (diagramView !== 'graph' || e.button !== 0 || (e.target as HTMLElement).closest('button,a')) return;
          setIsPanning(true);
          lastMouse.current = { x: e.clientX, y: e.clientY };
        }}
        onMouseMove={e => {
          if (!isPanning) return;
          setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
        }}
        onMouseUp={() => setIsPanning(false)}
        onMouseLeave={() => setIsPanning(false)}
      >
        <div style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'top center',
          transition: isPanning ? 'none' : 'transform 0.15s ease',
        }}>

        {/* Graph view */}
        {diagramView === 'graph' && (
          <div className="py-4">
            <GraphView
              getStatus={getStatus}
              onNodeClick={handleClick}
              selected={selected}
              flowStepMap={effectiveFlowStepMap}
              activeFlowColor={effectiveFlowColor}
            />
            <p className="text-center text-[11px] text-gray-400 mt-2">Drag to pan · Ctrl+scroll to zoom · click node for details</p>
          </div>
        )}

      <main className={`py-8 space-y-0 ${diagramView === 'graph' ? 'hidden' : ''}`}>
        {LAYERS.map((layer, li) => (
          <div key={layer.id}>
            {/* Layer block */}
            <div className="relative">
              {/* Layer header */}
              <div className={`${layer.labelColor} rounded-t-2xl px-4 py-2 flex items-center justify-between`}>
                <span className="text-white font-semibold text-xs uppercase tracking-widest">{layer.label}</span>
                {layer.scalable && layer.scaleHint && (
                  <ScaleTag axis={layer.scalable} hint={layer.scaleHint} />
                )}
              </div>

              {/* Layer body */}
              <div className="border-2 border-t-0 border-gray-200 rounded-b-2xl bg-[#f8faff] p-4">
                {/* Subgroups */}
                {layer.subgroups ? (
                  <div className="flex flex-wrap gap-4">
                    {layer.subgroups.map(sg => (
                      <div key={sg.label} className="flex-1 min-w-[200px]">
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
                          {sg.label}
                          {sg.note && <span className="normal-case text-gray-300">— {sg.note}</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {renderComponents(sg.ids)}
                          {/* Scalable slot for Kafka brokers */}
                          {layer.id === 'kafka' && sg.label.startsWith('Brokers') && (
                            <ScalePlaceholder axis="horizontal" label="Add broker" />
                          )}
                          {/* Scalable slot for workers */}
                          {layer.id === 'workers' && (
                            <ScalePlaceholder axis="horizontal" label="Add instance" />
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Kafka topics inline — expandable */}
                    {layer.id === 'kafka' && (
                      <div className="w-full mt-3 pt-3 border-t border-gray-200">
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-2">
                          Topics · partitions=3 · RF=3 · min-ISR=2 · click to inspect
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {TOPICS.map(t => <KafkaTopicCard key={t.name} topic={t} />)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {renderComponents(layer.components)}
                    {layer.scalable === 'horizontal' && (
                      <ScalePlaceholder axis="horizontal" />
                    )}
                    {layer.scalable === 'vertical' && (
                      <ScalePlaceholder axis="vertical" />
                    )}
                  </div>
                )}
                {/* Data layer vertical scale note */}
                {layer.id === 'data' && (
                  <div className="mt-3 pt-3 border-t border-dashed border-[#003580]/20 flex items-center gap-2">
                    <ChevronsDown className="w-3.5 h-3.5 text-[#003580]/50" />
                    <span className="text-xs text-[#003580]/60">
                      Each PostgreSQL instance can scale vertically or add read replicas.
                      LocalStack swaps to AWS S3 in production with zero code change.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Inter-layer arrow (skip after last) */}
            {li < LAYERS.length - 1 && <LayerArrow flowColor={effectiveFlowColor} />}
          </div>
        ))}

        {/* Incident timeline */}
        <IncidentLog events={incidents} />

        {/* Observability fans out from all services — note */}

        <div className="mt-4 p-4 rounded-2xl border-2 border-dashed border-[#4338ca]/30 bg-[#4338ca]/3">
          <div className="flex items-start gap-2">
            <Eye className="w-4 h-4 text-[#4338ca] mt-0.5 shrink-0" />
            <p className="text-sm text-[#4338ca]/80 leading-relaxed">
              <strong className="text-[#4338ca]">Observability is cross-cutting.</strong> Every Laravel service emits OTel spans to Tempo
              via OTLP (:4317). Promtail ships container logs to Loki. Prometheus scrapes
              service metrics + cAdvisor container stats. All unified in Grafana dashboards.
            </p>
          </div>
        </div>
      </main>
        </div>{/* end zoom transform div */}
      </div>{/* end canvas ref div */}

      {/* ── Architecture principles ─────────────────────────────────────────── */}
      <section className="bg-[#f0f5ff] border-t border-[#003580]/10 px-4 py-14">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[#003580] text-center mb-2">Architecture Principles</h2>
          <p className="text-center text-gray-500 text-sm mb-8">The design decisions behind every component choice</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <GitBranch />, title: 'Database-per-Service', desc: 'Each microservice owns an isolated PostgreSQL DB. Zero cross-DB queries — services communicate only via API or Kafka events.', badge: 'Isolation' },
              { icon: <MessageSquare />, title: 'Event-Driven Async', desc: 'PDF generation is fully async via Kafka (RF=3, min-ISR=2). A slow render never blocks user-facing APIs.', badge: 'Resilience' },
              { icon: <Shield />, title: 'Gateway-First Security', desc: 'Kong validates every RS256 JWT before traffic reaches services. Rate limiting and CORS handled centrally.', badge: 'Security' },
              { icon: <ChevronsRight />, title: 'Horizontal Scalability', desc: 'Services, Nginx proxies, Kafka brokers, and workers all scale horizontally by adding more instances without architecture changes.', badge: 'Scalability' },
              { icon: <Eye />, title: 'Full Observability', desc: 'OTel auto-instrumentation in every Laravel service. Traces, metrics, and logs flow into Grafana — every request is visible end-to-end.', badge: 'Visibility' },
              { icon: <Cloud />, title: 'Cloud-Portable Storage', desc: 'LocalStack in dev, AWS S3 in production — same AWS SDK. Zero code change between environments.', badge: 'Portability' },
            ].map(p => (
              <div key={p.title} className="bg-white border border-[#003580]/15 rounded-2xl p-5 hover:border-[#003580]/40 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-[#003580]/8 rounded-xl text-[#003580]">{p.icon}</div>
                  <span className="text-[10px] bg-[#003580] text-white px-2 py-0.5 rounded-full font-semibold">{p.badge}</span>
                </div>
                <h3 className="text-[#001f5c] font-bold mb-1.5">{p.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="bg-[#003580] text-white py-16 px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Ready to generate documents at scale?</h2>
        <p className="text-blue-200 mb-8 max-w-xl mx-auto">Built on this battle-tested architecture — reliable, observable, and cloud-native.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-[#003580] font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3 rounded-xl hover:bg-white/10 transition-colors">
            Back to home
          </Link>
        </div>
      </section>

      {/* ── Alert toasts ──────────────────────────────────────────────────────── */}
      <AlertToastStack toasts={toasts} onDismiss={id => setToasts(p => p.filter(t => t.id !== id))} />

      {/* ── Detail panel overlay ─────────────────────────────────────────────── */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <DetailPanel comp={selected} onClose={() => setSelected(null)} health={health} lastChecked={lastChecked} />
        </>
      )}
    </div>
  );
};

export default ArchitecturePage;
