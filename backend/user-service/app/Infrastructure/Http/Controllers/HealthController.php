<?php

declare(strict_types=1);

namespace App\Infrastructure\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Redis;

class HealthController extends BaseController
{
    public function system(): JsonResponse
    {
        // Every check runs inside ONE curl_multi batch — total time = slowest single probe.
        // TCP probes use CURLOPT_CONNECT_ONLY (no HTTP request, just open the socket).
        // HTTP probes get the full response and check status code.
        // Worker/consumer containers have no TCP port — checked via DNS resolution.

        $tcpTargets = [
            'user-app'       => ['user-svc',          80],
            'user-nginx'     => ['user-svc',          80],
            'template-app'   => ['template-svc',      80],
            'template-nginx' => ['template-svc',      80],
            'file-app'       => ['file-svc',           80],
            'file-nginx'     => ['file-svc',           80],
            'audit-app'      => ['audit-svc',          80],
            'audit-nginx'    => ['audit-svc',          80],
            'user-db'        => ['user-db-svc',      5432],
            'template-db'    => ['template-db-svc',  5432],
            'file-db'        => ['file-db-svc',       5432],
            'audit-db'       => ['audit-db-svc',      5432],
            'kong-db-node'   => ['kong-db-svc',       5432],
            'redis'          => ['redis-svc',         6379],
            'kafka'          => ['kafka-svc',         9092],
            'zookeeper'      => ['zookeeper-svc',     2181],
        ];

        $httpTargets = [
            'kong'       => 'http://kong-svc:8001/',
            'localstack' => 'http://localstack-svc:4566/_localstack/health',
            'grafana'    => 'http://grafana-svc.observability:3000/api/health',
            'prometheus' => 'http://prometheus-svc.observability:9090/-/healthy',
            'loki'       => 'http://loki-svc.observability:3100/ready',
            'tempo'      => 'http://tempo-svc.observability:3200/ready',
            'cadvisor'   => 'http://cadvisor-svc.observability:8080/healthz',
            'promtail'   => 'http://promtail-svc.observability:9080/ready',
        ];

        $dnsTargets = ['template-queue', 'file-queue', 'template-consumer', 'file-consumer', 'audit-consumer'];

        $services = $this->runAllParallel($tcpTargets, $httpTargets, $dnsTargets);

        $anyDown = collect($services)->contains(fn($s) => $s['status'] === 'down');
        $anyDeg  = collect($services)->contains(fn($s) => $s['status'] === 'degraded');

        return response()->json([
            'status'    => $anyDown || $anyDeg ? 'degraded' : 'healthy',
            'timestamp' => now()->toIso8601String(),
            'services'  => $services,
        ]);
    }

    // ─── Parallel runner ──────────────────────────────────────────────────────

    private function runAllParallel(array $tcpTargets, array $httpTargets, array $dnsTargets): array
    {
        $results = [];

        // ── 1. Launch all HTTP checks in parallel (curl_multi, non-blocking) ─
        $mh = curl_multi_init();
        $httpHandles = [];
        foreach ($httpTargets as $name => $url) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER    => true,
                CURLOPT_TIMEOUT_MS        => 2500,
                CURLOPT_CONNECTTIMEOUT_MS => 1000,
                CURLOPT_FOLLOWLOCATION    => false,
                CURLOPT_FAILONERROR       => false,
            ]);
            curl_multi_add_handle($mh, $ch);
            $httpHandles[$name] = $ch;
        }
        $running = null;
        curl_multi_exec($mh, $running); // kick off — don't block

        // ── 2. DNS checks for workers (no TCP port, fast) ─────────────────────
        foreach ($dnsTargets as $name) {
            $ip = gethostbyname($name);
            $results[$name] = ($ip !== $name)
                ? ['status' => 'healthy', 'latency_ms' => 0]
                : ['status' => 'down',    'latency_ms' => null, 'error' => 'DNS failed'];
        }

        // ── 3. Open ALL TCP connections simultaneously (async + stream_select) -
        //    Each socket is non-blocking so all SYN packets go out at once.
        //    stream_select waits for any subset to complete within the deadline.
        $pending  = [];  // int(resource) => ['name', 'sock', 'start']
        $deadline = hrtime(true) + 1_500_000_000; // 1.5 s total wall-clock

        foreach ($tcpTargets as $name => [$host, $port]) {
            $ip = gethostbyname($host);
            if ($ip === $host) {
                $results[$name] = ['status' => 'down', 'latency_ms' => null, 'error' => 'DNS failed'];
                continue;
            }
            $errno = 0; $errstr = '';
            $sock = @stream_socket_client(
                "tcp://{$ip}:{$port}", $errno, $errstr,
                0, // timeout=0 → returns immediately with async socket
                STREAM_CLIENT_ASYNC_CONNECT | STREAM_CLIENT_CONNECT
            );
            if ($sock === false) {
                $results[$name] = ['status' => 'down', 'latency_ms' => null, 'error' => $errstr ?: "refused ($errno)"];
            } else {
                stream_set_blocking($sock, false);
                $pending[(int)$sock] = ['name' => $name, 'sock' => $sock, 'start' => hrtime(true)];
            }
        }

        // Poll until all async connects finish or deadline passes
        while (!empty($pending) && ($rem = $deadline - hrtime(true)) > 0) {
            $write = $except = array_column($pending, 'sock');
            $null  = null;
            $uSec  = (int) min($rem / 1000, 50_000); // up to 50 ms per poll
            @stream_select($null, $write, $except, 0, $uSec);

            // Sockets that became writable = connect finished (success OR error)
            foreach (array_merge($write, $except) as $sock) {
                $key = (int) $sock;
                if (!isset($pending[$key])) continue;
                $info = $pending[$key];
                $ms   = (int) ((hrtime(true) - $info['start']) / 1e6);

                // Check actual connection result: get_name returns peer on success
                $peer = @stream_socket_get_name($sock, true);
                $results[$info['name']] = $peer !== false
                    ? ['status' => 'healthy', 'latency_ms' => $ms]
                    : ['status' => 'down',    'latency_ms' => null, 'error' => 'Connection refused'];

                fclose($sock);
                unset($pending[$key]);
            }
        }

        // Anything still pending has timed out
        foreach ($pending as $key => $info) {
            $results[$info['name']] = ['status' => 'down', 'latency_ms' => null, 'error' => 'Timeout'];
            @fclose($info['sock']);
        }

        // ── 4. Collect HTTP results (curl_multi has been running this whole time)
        do {
            curl_multi_exec($mh, $running);
            if ($running > 0) curl_multi_select($mh, 0.05);
        } while ($running > 0);

        foreach ($httpHandles as $name => $ch) {
            $err  = curl_error($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $ms   = (int) (curl_getinfo($ch, CURLINFO_TOTAL_TIME) * 1000);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);

            if ($err || $code === 0) {
                $results[$name] = ['status' => 'down',     'latency_ms' => null, 'error' => $err ?: 'Connection failed'];
            } elseif ($code >= 500) {
                $results[$name] = ['status' => 'down',     'latency_ms' => $ms,  'error' => "HTTP $code"];
            } elseif ($code >= 400) {
                $results[$name] = ['status' => 'degraded', 'latency_ms' => $ms,  'error' => "HTTP $code"];
            } else {
                $results[$name] = ['status' => 'healthy',  'latency_ms' => $ms];
            }
        }
        curl_multi_close($mh);

        return $results;
    }
}
