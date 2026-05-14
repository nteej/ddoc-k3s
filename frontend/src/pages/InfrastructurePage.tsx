import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Server, Shield, Globe, Database, Box, GitBranch,
  Package, Cloud, Lock, Layers, CheckCircle2, ArrowRight,
  ChevronRight, RotateCcw, Terminal, Cpu, HardDrive,
  Activity, Key, Zap, Play, Pause, AlertTriangle,
  Code2, RefreshCw, Upload, DownloadCloud, Settings,
  Eye, Network, Workflow,
} from 'lucide-react';
import LogoMark from '@/components/LogoMark';

// ─── Palette (Finnish blue family) ───────────────────────────────────────────
const B = {
  hero:   'bg-[#001f5c]',
  dark:   'bg-[#003580]',
  mid:    'bg-[#1d4ed8]',
  light:  'bg-[#dbeafe]',
  border: 'border-[#003580]/20',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface PipelineStep {
  id: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  parallel?: boolean;
  note?: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const NAMESPACES = [
  {
    name: 'dynadoc',
    color: 'border-[#2563eb] bg-[#eff6ff]',
    labelColor: 'bg-[#2563eb] text-white',
    groups: [
      {
        label: 'App Services',
        items: [
          { name: 'user-app', image: 'user-service', runtime: 'PHP-FPM', replicas: 1 },
          { name: 'template-app', image: 'template-service', runtime: 'PHP-FPM', replicas: 1 },
          { name: 'file-app', image: 'file-service', runtime: 'PHP-FPM', replicas: 1 },
          { name: 'audit-app', image: 'audit-service', runtime: 'PHP-FPM', replicas: 1 },
          { name: 'notification-app', image: 'notification-service', runtime: 'PHP-FPM', replicas: 1 },
          { name: 'api-key-app', image: 'api-key-service', runtime: 'Go', replicas: 1 },
          { name: 'webhook-app', image: 'webhook-service', runtime: 'Go', replicas: 1 },
          { name: 'frontend', image: 'frontend', runtime: 'Nginx', replicas: 1 },
          { name: 'kong', image: 'kong:3.6', runtime: 'Kong', replicas: 1 },
        ],
      },
      {
        label: 'Workers',
        items: [
          { name: 'template-consumer', image: 'template-service', runtime: 'PHP', replicas: 1 },
          { name: 'template-queue', image: 'template-service', runtime: 'PHP', replicas: 1 },
          { name: 'file-consumer', image: 'file-service', runtime: 'PHP', replicas: 1 },
          { name: 'file-queue', image: 'file-service', runtime: 'PHP', replicas: 1 },
          { name: 'audit-consumer', image: 'audit-service', runtime: 'PHP', replicas: 1 },
          { name: 'notification-consumer', image: 'notification-service', runtime: 'PHP', replicas: 1 },
        ],
      },
      {
        label: 'Stateful Sets',
        items: [
          { name: 'user-db', image: 'postgres:15', runtime: 'PostgreSQL', replicas: 1 },
          { name: 'template-db', image: 'postgres:15', runtime: 'PostgreSQL', replicas: 1 },
          { name: 'file-db', image: 'postgres:15', runtime: 'PostgreSQL', replicas: 1 },
          { name: 'audit-db', image: 'postgres:15', runtime: 'PostgreSQL', replicas: 1 },
          { name: 'api-key-db', image: 'postgres:15', runtime: 'PostgreSQL', replicas: 1 },
          { name: 'webhook-db', image: 'postgres:15', runtime: 'PostgreSQL', replicas: 1 },
          { name: 'kong-db', image: 'postgres:15', runtime: 'PostgreSQL', replicas: 1 },
          { name: 'kafka', image: 'cp-kafka:7.6', runtime: 'Kafka', replicas: 3 },
          { name: 'redis', image: 'redis:7-alpine', runtime: 'Redis', replicas: 1 },
          { name: 'zookeeper', image: 'cp-zookeeper:7.6', runtime: 'ZooKeeper', replicas: 1 },
          { name: 'localstack', image: 'localstack:4.7', runtime: 'AWS S3', replicas: 1 },
        ],
      },
    ],
  },
  {
    name: 'observability',
    color: 'border-[#4338ca] bg-[#f5f3ff]',
    labelColor: 'bg-[#4338ca] text-white',
    groups: [
      {
        label: 'Observability Stack',
        items: [
          { name: 'grafana', image: 'grafana:10.4.2', runtime: 'Grafana', replicas: 1 },
          { name: 'prometheus', image: 'prometheus:v2.51.2', runtime: 'Prometheus', replicas: 1 },
          { name: 'loki', image: 'loki:3.0.0', runtime: 'Loki', replicas: 1 },
          { name: 'tempo', image: 'tempo:2.4.2', runtime: 'Tempo', replicas: 1 },
          { name: 'alertmanager', image: 'alertmanager:v0.27.0', runtime: 'AlertManager', replicas: 1 },
        ],
      },
      {
        label: 'DaemonSets',
        items: [
          { name: 'promtail', image: 'promtail:3.0.0', runtime: 'DaemonSet', replicas: 1 },
          { name: 'cadvisor', image: 'cadvisor:v0.49.1', runtime: 'DaemonSet', replicas: 1 },
          { name: 'node-exporter', image: 'node-exporter:v1.7.0', runtime: 'DaemonSet', replicas: 1 },
        ],
      },
      {
        label: 'Cluster Metrics',
        items: [
          { name: 'kube-state-metrics', image: 'kube-state-metrics:v2.12.0', runtime: 'Deployment', replicas: 1 },
        ],
      },
    ],
  },
  {
    name: 'kube-system',
    color: 'border-[#0369a1] bg-[#f0f9ff]',
    labelColor: 'bg-[#0369a1] text-white',
    groups: [
      {
        label: 'k3s Built-in',
        items: [
          { name: 'traefik', image: 'traefik:v3', runtime: 'Ingress', replicas: 1 },
          { name: 'metrics-server', image: 'metrics-server', runtime: 'Deployment', replicas: 1 },
          { name: 'local-path-provisioner', image: 'local-path-provisioner', runtime: 'Deployment', replicas: 1 },
          { name: 'coredns', image: 'coredns', runtime: 'Deployment', replicas: 1 },
        ],
      },
    ],
  },
];

const DOMAINS = [
  { host: 'ddoc.fi', routes: ['/ → frontend-svc:80', '/api → kong-svc:8000'], cert: 'Let\'s Encrypt', tls: true },
  { host: 'www.ddoc.fi', routes: ['/ → 301 → ddoc.fi'], cert: 'Let\'s Encrypt', tls: true },
  { host: 'api.ddoc.fi', routes: ['/ → kong-svc:8000'], cert: 'Let\'s Encrypt', tls: true },
  { host: 'grafana.ddoc.fi', routes: ['/ → grafana-svc:3000 (observability ns)'], cert: 'Let\'s Encrypt', tls: true },
];

const IMAGES = [
  { name: 'user-service',         runtime: 'PHP 8.4 / Laravel 12', size: '~180 MB' },
  { name: 'template-service',     runtime: 'PHP 8.4 / Laravel 12', size: '~180 MB' },
  { name: 'file-service',         runtime: 'PHP 8.4 / Laravel 12', size: '~180 MB' },
  { name: 'audit-service',        runtime: 'PHP 8.4 / Laravel 12', size: '~180 MB' },
  { name: 'notification-service', runtime: 'PHP 8.4 / Laravel 12', size: '~180 MB' },
  { name: 'api-key-service',      runtime: 'Go 1.22 (scratch)',     size: '~20 MB'  },
  { name: 'webhook-service',      runtime: 'Go 1.22 (scratch)',     size: '~20 MB'  },
  { name: 'frontend',             runtime: 'Nginx Alpine (SPA)',    size: '~50 MB'  },
];

const DEPLOY_STEPS = [
  { step: 1, label: 'Namespaces',             detail: 'dynadoc, observability',                               icon: <Layers className="w-4 h-4" /> },
  { step: 2, label: 'ConfigMaps & Secrets',   detail: 'Kafka config, Kong routes, Nginx configs, SSO secrets', icon: <Settings className="w-4 h-4" /> },
  { step: 3, label: 'Databases & Redis',       detail: '7× PostgreSQL StatefulSets + Redis',                   icon: <Database className="w-4 h-4" /> },
  { step: 4, label: 'Zookeeper → Kafka',       detail: 'Zookeeper → Kafka brokers → kafka-init Job (topics)',  icon: <GitBranch className="w-4 h-4" /> },
  { step: 5, label: 'App Services',           detail: 'user, template, file, audit, api-key, webhook, notification', icon: <Box className="w-4 h-4" /> },
  { step: 6, label: 'Workers',               detail: 'Queue workers + Kafka consumers',                       icon: <Workflow className="w-4 h-4" /> },
  { step: 7, label: 'Kong → Routes',          detail: 'Kong deployment → kong-init Job (routes, JWT, plugins)', icon: <Shield className="w-4 h-4" /> },
  { step: 8, label: 'Frontend & Storage',     detail: 'React SPA + LocalStack + Swagger UI',                   icon: <Globe className="w-4 h-4" /> },
  { step: 9, label: 'Traefik TLS & Ingress',  detail: 'IngressRoutes, middleware, Let\'s Encrypt certs',        icon: <Lock className="w-4 h-4" /> },
  { step: 10, label: 'Observability',         detail: 'Prometheus, Loki, Tempo, Grafana, exporters',           icon: <Activity className="w-4 h-4" /> },
];

const MAKECMDS = [
  { cmd: 'make validate',              desc: 'Render kustomize overlay + dry-run apply',         group: 'IaC' },
  { cmd: 'make diff',                  desc: 'Show live cluster diff vs desired state',           group: 'IaC' },
  { cmd: 'make apply',                 desc: 'Idempotent full apply (production overlay)',        group: 'IaC' },
  { cmd: 'make overlay-tag TAG=v1.9.0', desc: 'Pin image tags in production overlay',             group: 'IaC' },
  { cmd: 'make deploy',                desc: 'Full ordered initial deploy (10 steps)',            group: 'Deploy' },
  { cmd: 'make rollout-user',          desc: 'Rolling update user-service pods',                  group: 'Deploy' },
  { cmd: 'make rollout-frontend',      desc: 'Rolling update frontend deployment',                group: 'Deploy' },
  { cmd: 'make rollback-user',         desc: 'Undo last user-service rollout',                    group: 'Rollback' },
  { cmd: 'make rollback-template',     desc: 'Undo template-service + workers rollout',           group: 'Rollback' },
  { cmd: 'make migrate-user',          desc: 'Run artisan migrate inside running user-app pod',   group: 'Ops' },
  { cmd: 'make logs-user',             desc: 'Tail user-service PHP-FPM logs',                    group: 'Ops' },
  { cmd: 'make status',                desc: 'Show all pod status (dynadoc + observability)',     group: 'Ops' },
  { cmd: 'make init-secrets',          desc: 'Bootstrap k8s secrets from env (run once)',         group: 'Ops' },
  { cmd: 'make push-service SVC=user-service', desc: 'Build & push a single service image',      group: 'Images' },
  { cmd: 'make push',                  desc: 'Build & push all images to GHCR',                  group: 'Images' },
];

// ─── CI/CD Pipeline ───────────────────────────────────────────────────────────

const CI_STAGES: { trigger: string; color: string; jobs: { name: string; detail: string; parallel?: boolean }[] }[] = [
  {
    trigger: 'CI  ·  on: pull_request → master',
    color: 'border-[#0369a1] bg-[#f0f9ff]',
    jobs: [
      { name: 'test-user-service',     detail: 'PHP 8.4 + Postgres test DB + artisan test',  parallel: true },
      { name: 'test-template-service', detail: 'PHP 8.4 + Postgres test DB + artisan test',  parallel: true },
      { name: 'test-file-service',     detail: 'PHP 8.4 + Postgres test DB + artisan test',  parallel: true },
      { name: 'test-audit-service',    detail: 'PHP 8.4 + Postgres test DB + artisan test',  parallel: true },
      { name: 'lint-frontend',         detail: 'Node 22 · npm ci · eslint · vite build',     parallel: true },
    ],
  },
  {
    trigger: 'Release  ·  on: workflow_dispatch (version input)',
    color: 'border-[#7c3aed] bg-[#faf5ff]',
    jobs: [
      { name: 'generate-changelog',  detail: 'python3 generate_changelog.py → CHANGELOG.md' },
      { name: 'commit-changelog',    detail: 'git commit CHANGELOG.md' },
      { name: 'tag-and-push',        detail: 'git tag vX.Y.Z + push tag to master' },
      { name: 'create-gh-release',   detail: 'softprops/action-gh-release → publishes GitHub Release' },
    ],
  },
  {
    trigger: 'CD  ·  on: release published  |  workflow_dispatch (tag + service)',
    color: 'border-[#003580] bg-[#eff6ff]',
    jobs: [
      { name: 'resolve-tag',          detail: 'Resolve image tag from release / input / SHA' },
      { name: 'validate-overlay',     detail: 'kubectl kustomize overlays/production > /dev/null', parallel: true },
      { name: 'build-user',           detail: 'docker build + push user-service → GHCR',     parallel: true },
      { name: 'build-template',       detail: 'docker build + push template-service → GHCR', parallel: true },
      { name: 'build-file',           detail: 'docker build + push file-service → GHCR',     parallel: true },
      { name: 'build-audit',          detail: 'docker build + push audit-service → GHCR',    parallel: true },
      { name: 'build-api-key',        detail: 'docker build + push api-key-service → GHCR',  parallel: true },
      { name: 'build-webhook',        detail: 'docker build + push webhook-service → GHCR',  parallel: true },
      { name: 'build-notification',   detail: 'docker build + push notification-service → GHCR', parallel: true },
      { name: 'build-frontend',       detail: 'docker build + push frontend → GHCR',         parallel: true },
      { name: 'deploy',               detail: 'SSH → VPS → kubectl set image + rollout status per service' },
    ],
  },
];

const GROUPS = ['All', 'IaC', 'Deploy', 'Rollback', 'Ops', 'Images'];

// ─── Component ───────────────────────────────────────────────────────────────
const InfrastructurePage: React.FC = () => {
  const [cmdGroup, setCmdGroup] = useState('All');
  const [openNs, setOpenNs] = useState<string | null>('dynadoc');

  const filteredCmds = cmdGroup === 'All' ? MAKECMDS : MAKECMDS.filter(c => c.group === cmdGroup);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#001f5c] border-b border-white/10 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-bold text-white text-base">DDoc</span>
            <span className="ml-2 text-white/30">/</span>
            <span className="ml-2 text-white/70 text-sm">Infrastructure</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/architecture" className="text-white/60 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
              Architecture
            </Link>
            <Link to="/" className="text-white/60 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
              Home
            </Link>
            <Link to="/login" className="ml-2 bg-white text-[#001f5c] font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#001f5c] via-[#003580] to-[#1d4ed8] pt-28 pb-16 px-4 text-white">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-sm px-4 py-1.5 rounded-full mb-6">
            <Server className="w-3.5 h-3.5" />
            Production · k3s · VPS · ddoc.fi
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Production Infrastructure
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto leading-relaxed">
            A single-node k3s cluster on a VPS. Kustomize-managed Kubernetes manifests,
            automated CI/CD via GitHub Actions, and TLS termination via Traefik + Let's Encrypt.
          </p>

          {/* stat pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              { n: 'k3s v1.35',         i: <Server className="w-3.5 h-3.5" /> },
              { n: '3 Namespaces',      i: <Layers className="w-3.5 h-3.5" /> },
              { n: '8 GHCR Images',     i: <Package className="w-3.5 h-3.5" /> },
              { n: '4 TLS Domains',     i: <Lock className="w-3.5 h-3.5" /> },
              { n: 'Kustomize IaC',     i: <GitBranch className="w-3.5 h-3.5" /> },
              { n: 'GitHub Actions CD', i: <RefreshCw className="w-3.5 h-3.5" /> },
            ].map(b => (
              <span key={b.n} className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-sm px-3 py-1.5 rounded-full">
                {b.i}{b.n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── VPS Node Overview ──────────────────────────────────────────────── */}
      <section className="border-b border-[#003580]/10 bg-[#f8faff] px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-[#001f5c] mb-6 flex items-center gap-2">
            <Server className="w-5 h-5 text-[#003580]" /> VPS Node
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Globe className="w-5 h-5" />, label: 'Host', value: 'ddoc.fi', sub: 'Single VPS node' },
              { icon: <Cpu className="w-5 h-5" />, label: 'Orchestrator', value: 'k3s v1.35', sub: 'Lightweight Kubernetes' },
              { icon: <Package className="w-5 h-5" />, label: 'Registry', value: 'GHCR', sub: 'ghcr.io/nteej/dynadoc' },
              { icon: <HardDrive className="w-5 h-5" />, label: 'Storage', value: 'local-path', sub: 'k3s built-in provisioner' },
            ].map(c => (
              <div key={c.label} className="bg-white border border-[#003580]/15 rounded-2xl p-5 flex items-start gap-3">
                <div className="p-2 bg-[#003580]/8 rounded-xl text-[#003580] shrink-0">{c.icon}</div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">{c.label}</div>
                  <div className="font-bold text-[#001f5c] text-sm">{c.value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Network Traffic Flow ───────────────────────────────────────────── */}
      <section className="border-b border-[#003580]/10 px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-[#001f5c] mb-2 flex items-center gap-2">
            <Network className="w-5 h-5 text-[#003580]" /> Network Traffic Flow
          </h2>
          <p className="text-sm text-gray-500 mb-8">How an HTTPS request travels from the internet to a service</p>

          {/* flow row */}
          <div className="flex flex-wrap items-center gap-0">
            {[
              { label: 'Internet', sub: 'Client browser', color: 'bg-[#003580]', icon: <Globe className="w-4 h-4" /> },
              { label: 'Traefik', sub: ':443 · TLS termination\nLet\'s Encrypt · k3s built-in', color: 'bg-[#1d4ed8]', icon: <Shield className="w-4 h-4" /> },
              { label: 'Kong', sub: ':8000 · JWT validation\nRate limiting · CORS', color: 'bg-[#0369a1]', icon: <Key className="w-4 h-4" /> },
              { label: 'Nginx', sub: ':808x · FastCGI\nReverse proxy', color: 'bg-[#0284c7]', icon: <Server className="w-4 h-4" /> },
              { label: 'PHP-FPM / Go', sub: ':9000 / :8080\nApp logic', color: 'bg-[#2563eb]', icon: <Code2 className="w-4 h-4" /> },
            ].map((node, i, arr) => (
              <React.Fragment key={node.label}>
                <div className="flex flex-col items-center min-w-[130px]">
                  <div className={`w-full rounded-xl p-3 text-white text-center ${node.color}`}>
                    <div className="flex justify-center mb-1">{node.icon}</div>
                    <div className="font-bold text-sm">{node.label}</div>
                    <div className="text-[10px] text-white/70 mt-0.5 whitespace-pre-line leading-tight">{node.sub}</div>
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex items-center px-1 shrink-0">
                    <div className="w-6 h-px bg-[#003580]/30" />
                    <ChevronRight className="w-3 h-3 text-[#003580]/50 -ml-1" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Domain routing table */}
          <div className="mt-8 grid sm:grid-cols-2 gap-3">
            {DOMAINS.map(d => (
              <div key={d.host} className="border border-[#003580]/15 rounded-xl p-4 bg-[#f8faff]">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-3.5 h-3.5 text-green-500" />
                  <span className="font-mono font-bold text-[#001f5c] text-sm">{d.host}</span>
                  <span className="ml-auto text-[10px] bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">{d.cert}</span>
                </div>
                <ul className="space-y-0.5">
                  {d.routes.map(r => (
                    <li key={r} className="text-xs text-gray-500 font-mono flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-[#003580]/40 shrink-0" />{r}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kubernetes Namespaces ──────────────────────────────────────────── */}
      <section className="border-b border-[#003580]/10 bg-[#f8faff] px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-[#001f5c] mb-2 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#003580]" /> Kubernetes Namespaces
          </h2>
          <p className="text-sm text-gray-500 mb-6">Click a namespace to expand its workloads</p>

          <div className="space-y-3">
            {NAMESPACES.map(ns => {
              const isOpen = openNs === ns.name;
              const totalPods = ns.groups.reduce((a, g) => a + g.items.length, 0);
              return (
                <div key={ns.name} className={`border-2 rounded-2xl overflow-hidden ${ns.color}`}>
                  <button
                    onClick={() => setOpenNs(isOpen ? null : ns.name)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-black/5 transition-colors"
                  >
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${ns.labelColor}`}>
                      {ns.name}
                    </span>
                    <span className="text-sm text-gray-500">{totalPods} workloads · {ns.groups.length} groups</span>
                    <ChevronRight className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 space-y-4">
                      {ns.groups.map(grp => (
                        <div key={grp.label}>
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{grp.label}</div>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {grp.items.map(item => (
                              <div key={item.name} className="bg-white border border-[#003580]/10 rounded-xl px-3 py-2.5 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-mono text-xs font-bold text-[#001f5c] truncate">{item.name}</div>
                                  <div className="text-[10px] text-gray-400 truncate">{item.image} · {item.runtime}</div>
                                </div>
                                {item.replicas > 1 && (
                                  <span className="ml-auto text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono shrink-0">×{item.replicas}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Container Registry ────────────────────────────────────────────── */}
      <section className="border-b border-[#003580]/10 px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-[#001f5c] mb-2 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#003580]" /> Container Registry
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            All images pushed to <span className="font-mono text-[#003580]">ghcr.io/nteej/dynadoc/&lt;service&gt;</span> — tagged with version + <code className="text-xs bg-gray-100 px-1 rounded">latest</code>
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {IMAGES.map(img => (
              <div key={img.name} className="border border-[#003580]/15 rounded-xl p-4 bg-[#f8faff]">
                <div className="flex items-center gap-2 mb-2">
                  <Box className="w-4 h-4 text-[#003580]" />
                  <span className="font-mono text-xs font-bold text-[#001f5c]">{img.name}</span>
                </div>
                <div className="text-xs text-gray-500">{img.runtime}</div>
                <div className="text-[10px] text-gray-400 mt-1">~{img.size}</div>
                <div className="mt-2 flex gap-1 flex-wrap">
                  <span className="text-[10px] bg-[#003580] text-white px-2 py-0.5 rounded font-mono">:vX.Y.Z</span>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-mono">:latest</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kustomize IaC ────────────────────────────────────────────────── */}
      <section className="border-b border-[#003580]/10 bg-[#f8faff] px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-[#001f5c] mb-2 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#003580]" /> Infrastructure as Code — Kustomize
          </h2>
          <p className="text-sm text-gray-500 mb-8">Base manifests + production overlay. No Helm, no sed on every file.</p>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Base */}
            <div className="border-2 border-[#0369a1] rounded-2xl bg-[#f0f9ff] p-5">
              <div className="text-xs font-bold text-[#0369a1] uppercase tracking-widest mb-3">k8s/  (Base)</div>
              <div className="font-mono text-xs text-gray-600 space-y-1">
                {['namespaces/', 'configmaps/', 'infra/', 'apps/', 'frontend/', 'observability/'].map(d => (
                  <div key={d} className="flex items-center gap-1.5">
                    <span className="text-[#0369a1]">├─</span>{d}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-gray-400 leading-relaxed">
                All raw Kubernetes manifests. Uses <code className="bg-white px-1 rounded">REGISTRY/dynadoc/&lt;svc&gt;</code> as image placeholder. No environment-specific values.
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex flex-col items-center justify-center gap-2">
              <div className="w-0.5 h-8 bg-[#003580]/20" />
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">image substitution</div>
                <div className="w-8 h-8 rounded-full bg-[#003580] text-white flex items-center justify-center mx-auto">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div className="text-xs text-gray-400 mt-1 font-mono">kustomize build</div>
              </div>
              <div className="w-0.5 h-8 bg-[#003580]/20" />
            </div>

            {/* Overlay */}
            <div className="border-2 border-[#7c3aed] rounded-2xl bg-[#faf5ff] p-5">
              <div className="text-xs font-bold text-[#7c3aed] uppercase tracking-widest mb-3">overlays/production/  (Overlay)</div>
              <div className="font-mono text-[10px] text-gray-600 bg-white rounded-xl p-3 leading-relaxed overflow-x-auto">
                <div className="text-gray-400">images:</div>
                <div>&nbsp; - name: REGISTRY/dynadoc/user-service</div>
                <div>&nbsp;&nbsp;&nbsp; newName: ghcr.io/nteej/dynadoc/user-service</div>
                <div className="text-[#7c3aed] font-bold">&nbsp;&nbsp;&nbsp; newTag: v1.8.0</div>
                <div className="text-gray-400 mt-1">&nbsp; # … 7 more images</div>
              </div>
              <div className="mt-4 text-xs text-gray-400 leading-relaxed">
                Only the overlay changes per release. Tags pinned by CD pipeline via <code className="bg-white px-1 rounded">make overlay-tag</code>. Committed as GitOps record.
              </div>
            </div>
          </div>

          {/* IaC flow */}
          <div className="mt-6 flex flex-wrap items-center gap-0 justify-center">
            {[
              { label: 'git push', color: 'bg-gray-700' },
              { label: 'CI validates overlay', color: 'bg-[#0369a1]' },
              { label: 'CD pins tag', color: 'bg-[#003580]' },
              { label: 'kubectl apply', color: 'bg-[#2563eb]' },
              { label: 'k8s cluster', color: 'bg-[#1d4ed8]' },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <span className={`text-xs text-white font-semibold px-3 py-1.5 rounded-full ${s.color}`}>{s.label}</span>
                {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-gray-400 mx-1" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── CI/CD Pipelines ────────────────────────────────────────────────── */}
      <section className="border-b border-[#003580]/10 px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-[#001f5c] mb-2 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#003580]" /> CI / CD Pipelines
          </h2>
          <p className="text-sm text-gray-500 mb-8">Three GitHub Actions workflows — test, release, and deploy</p>

          <div className="space-y-6">
            {CI_STAGES.map((stage, si) => (
              <div key={si} className={`border-2 rounded-2xl overflow-hidden ${stage.color}`}>
                <div className="px-5 py-3 border-b border-black/5">
                  <span className="text-xs font-mono font-bold text-gray-600">{stage.trigger}</span>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    {stage.jobs.map((job, ji) => (
                      <div
                        key={ji}
                        className="bg-white border border-[#003580]/15 rounded-xl px-3 py-2 flex items-start gap-2 min-w-[200px] flex-1"
                      >
                        {job.parallel ? (
                          <Play className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-[#003580] mt-0.5 shrink-0" />
                        )}
                        <div>
                          <div className="font-mono text-xs font-bold text-[#001f5c]">{job.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{job.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
                    <Play className="w-3 h-3 text-green-500" /><span>runs in parallel</span>
                    <ChevronRight className="w-3 h-3 text-[#003580] ml-3" /><span>sequential</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Full Deploy Order ────────────────────────────────────────────── */}
      <section className="border-b border-[#003580]/10 bg-[#f8faff] px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-[#001f5c] mb-2 flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#003580]" /> Full Deploy Order
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-xs">make deploy</code> applies resources in this dependency order — safe for a fresh cluster
          </p>

          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[#003580]/10" />
            <div className="space-y-3">
              {DEPLOY_STEPS.map((s, i) => (
                <div key={s.step} className="relative pl-14 flex items-start gap-4">
                  <div className="absolute left-3 top-2 w-5 h-5 rounded-full bg-[#003580] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {s.step}
                  </div>
                  <div className="bg-white border border-[#003580]/15 rounded-xl px-4 py-3 flex items-start gap-3 w-full">
                    <div className="text-[#003580] mt-0.5 shrink-0">{s.icon}</div>
                    <div>
                      <div className="font-bold text-[#001f5c] text-sm">{s.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Secrets Management ───────────────────────────────────────────── */}
      <section className="border-b border-[#003580]/10 px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-[#001f5c] mb-2 flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#003580]" /> Secrets Management
          </h2>
          <p className="text-sm text-gray-500 mb-6">Secrets are never committed to git. Two separate paths — bootstrap and runtime.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border border-[#003580]/15 rounded-2xl p-5 bg-[#f8faff]">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-4 h-4 text-[#003580]" />
                <span className="font-bold text-[#001f5c] text-sm">Bootstrap (one-time)</span>
              </div>
              <div className="text-xs text-gray-500 space-y-1.5 leading-relaxed">
                <p><code className="bg-white px-1 rounded">make init-secrets</code> reads from <code className="bg-white px-1 rounded">.env.prod</code> and creates Kubernetes Secrets via <code className="bg-white px-1 rounded">kubectl create secret</code>.</p>
                <p>Run once on VPS setup or when rotating credentials.</p>
              </div>
              <div className="mt-4 font-mono text-[10px] bg-white rounded-lg p-3 text-gray-600 space-y-0.5">
                <div>user-db-secret</div>
                <div>user-app-secret  <span className="text-gray-300"># APP_KEY, JWT keys</span></div>
                <div>sso-secrets      <span className="text-gray-300"># Google/GitHub OAuth</span></div>
                <div>ghcr-pull-secret <span className="text-gray-300"># GHCR token</span></div>
                <div>klarna-secrets   <span className="text-gray-300"># Klarna API keys</span></div>
              </div>
            </div>

            <div className="border border-[#003580]/15 rounded-2xl p-5 bg-[#f8faff]">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-[#003580]" />
                <span className="font-bold text-[#001f5c] text-sm">Runtime (GitHub Actions)</span>
              </div>
              <div className="text-xs text-gray-500 space-y-1.5 leading-relaxed">
                <p>CD pipeline reads from GitHub environment secrets. Used only during build and SSH deploy — never logged or stored in image layers.</p>
              </div>
              <div className="mt-4 font-mono text-[10px] bg-white rounded-lg p-3 text-gray-600 space-y-0.5">
                <div>VPS_HOST      <span className="text-gray-300"># SSH target</span></div>
                <div>VPS_USER      <span className="text-gray-300"># SSH username</span></div>
                <div>VPS_SSH_KEY   <span className="text-gray-300"># Private key</span></div>
                <div>GHCR_TOKEN    <span className="text-gray-300"># Pull secret for VPS</span></div>
                <div>GITHUB_TOKEN  <span className="text-gray-300"># Auto: push images</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Operations Quick Reference ───────────────────────────────────── */}
      <section className="border-b border-[#003580]/10 bg-[#f8faff] px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-[#001f5c] mb-2 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#003580]" /> Operations Quick Reference
          </h2>
          <p className="text-sm text-gray-500 mb-5">All operational tasks are exposed via <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-xs">make &lt;target&gt;</code></p>

          {/* Group filter */}
          <div className="flex flex-wrap gap-2 mb-5">
            {GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setCmdGroup(g)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${cmdGroup === g ? 'bg-[#003580] text-white' : 'bg-white border border-[#003580]/20 text-gray-600 hover:border-[#003580]/50'}`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="bg-[#001f5c] rounded-2xl overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="ml-2 text-white/40 text-xs font-mono">Makefile</span>
            </div>
            <div className="divide-y divide-white/5">
              {filteredCmds.map(c => (
                <div key={c.cmd} className="flex items-start gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="font-mono text-sm text-[#93c5fd] shrink-0 pt-0.5">{`$ ${c.cmd}`}</div>
                  <div className="text-xs text-white/50 pt-1">{c.desc}</div>
                  <span className="ml-auto text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded shrink-0">{c.group}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Rollback Strategy ────────────────────────────────────────────── */}
      <section className="border-b border-[#003580]/10 px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-[#001f5c] mb-6 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-[#003580]" /> Rollback Strategy
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Instant rollback', desc: 'Each deployment keeps a revision history. kubectl rollout undo reverts in seconds — k8s manages the old ReplicaSet.', badge: 'seconds', color: 'border-green-200 bg-green-50' },
              { title: 'Per-service isolation', desc: 'Services are independent deployments. Rolling back user-service has zero impact on template-service or file-service.', badge: 'isolated', color: 'border-blue-200 bg-blue-50' },
              { title: 'make rollback-<svc>', desc: 'Convenience Makefile targets wrap kubectl rollout undo for each service — including workers and consumers.', badge: 'ergonomic', color: 'border-purple-200 bg-purple-50' },
              { title: 'Worker rollback', desc: 'template-consumer, file-consumer, audit-consumer, and notification-consumer are separate rollback targets from their parent service.', badge: 'granular', color: 'border-orange-200 bg-orange-50' },
              { title: 'Database migrations', desc: 'Migrations run via make migrate-<svc>. Forward-only by convention. Rollbacks that require schema changes are handled via new migrations.', badge: 'forward-only', color: 'border-yellow-200 bg-yellow-50' },
              { title: 'GitOps overlay record', desc: 'The CD pipeline commits the pinned image tag to overlays/production/kustomization.yaml — providing an auditable history of every deploy.', badge: 'auditable', color: 'border-teal-200 bg-teal-50' },
            ].map(c => (
              <div key={c.title} className={`border-2 rounded-2xl p-5 ${c.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#001f5c] text-sm">{c.title}</span>
                  <span className="text-[10px] bg-[#003580] text-white px-2 py-0.5 rounded-full font-semibold">{c.badge}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#003580] text-white py-16 px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Explore the full system architecture</h2>
        <p className="text-blue-200 mb-8 max-w-xl mx-auto">
          See every microservice, data flow, and Kafka topic in the interactive diagram.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/architecture" className="inline-flex items-center gap-2 bg-white text-[#003580] font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
            Architecture diagram <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3 rounded-xl hover:bg-white/10 transition-colors">
            Back to home
          </Link>
        </div>
      </section>

    </div>
  );
};

export default InfrastructurePage;
