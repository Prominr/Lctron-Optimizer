import React from 'react';
import { Network } from 'lucide-react';
import TweakCard from '../components/TweakCard';
import PageHeader from '../components/PageHeader';
import './TweakPage.css';

const COLOR = '#3080e0';

const smbTweaks = [
  { id: 'net-smb-non-best-effort', title: 'Enable Non-Best Effort', description: 'Enables non-best-effort delivery for SMB traffic to improve reliability of network file transfers.' },
  { id: 'net-smb-v2v3', title: 'Enable SMBv2 and SMBv3', description: 'Enables the newer, faster and more secure SMB protocols for network file sharing.' },
  { id: 'net-smb-live-migration', title: 'Improve Live Migration', description: 'Improves SMB live migration performance for better network resource handling.' },
  { id: 'net-smb-congruent-ops', title: 'Increase Congruent Network Operations', description: 'Increases the number of congruent network operations for faster SMB transfers.' },
  { id: 'net-smb-max-outstanding', title: 'Increase Maximum Outstanding Network Requests', description: 'Raises the cap on outstanding SMB network requests to improve throughput.' },
  { id: 'net-smb-irp-stack', title: 'Increase IRP Stack Size', description: 'Increases the IRP stack size for better SMB I/O request handling.' },
  { id: 'net-smb-max-incoming', title: 'Increase Maximum Incoming Network Requests', description: 'Raises the limit on simultaneous incoming SMB network requests.' },
  { id: 'net-smb-pipe-data', title: 'Increase Pipe Data Size', description: 'Increases the pipe data buffer size for larger SMB data transfers.' },
  { id: 'net-smb-request-buffer', title: 'Increase Request Buffer Size', description: 'Increases the SMB request buffer size for improved large file transfer performance.' },
  { id: 'net-smb-prealloc', title: 'Preallocate Connection Objects', description: 'Preallocates SMB connection objects to reduce latency on new connections.' },
];

const tcpipTweaks = [
  { id: 'net-tcp-decrease-wait', title: 'Decrease Wait-Time State', description: 'Reduces the TCP TIME_WAIT state duration to free up ports faster.' },
  { id: 'net-tcp-disable-bufferlist', title: 'Disable Bufferlist Tracking', description: 'Disables TCP buffer list tracking to reduce overhead.' },
  { id: 'net-tcp-disable-nagle', title: "Disable Nagle's Algorithm", description: 'Disables Nagle\'s algorithm to send small packets immediately, reducing latency.' },
  { id: 'net-tcp-disable-non-sack-rto', title: 'Disable Non-Sack RTO', description: 'Disables the non-selective ACK retransmit timeout for better connection handling.' },
  { id: 'net-tcp-disable-task-offload', title: 'Disable Task Offload', description: 'Disables TCP/IP task offloading for more predictable network performance.' },
  { id: 'net-tcp-disable-timestamps', title: 'Disable TCP Timestamps', description: 'Disables TCP timestamps to reduce per-packet overhead.' },
  { id: 'net-tcp-disable-window-heuristics', title: 'Disable Window Scaling Heuristics', description: 'Disables automatic window scaling heuristics for more consistent TCP behavior.' },
  { id: 'net-tcp-direct-cache', title: 'Enable Direct Cache Access', description: 'Enables DCA to allow the NIC to place data directly in CPU cache, reducing latency.' },
  { id: 'net-tcp-throttling-index', title: 'Enable Network Throttling Index', description: 'Enables the network throttling index for better multimedia and gaming traffic prioritization.' },
  { id: 'net-tcp-path-mtu', title: 'Enable Path MTU and Black Hole Detection', description: 'Enables path MTU discovery and black hole detection for more reliable connections.' },
  { id: 'net-tcp-rss', title: 'Enable RSS', description: 'Enables Receive Side Scaling to distribute network processing across CPU cores.' },
  { id: 'net-tcp-chimney', title: 'Enable TCP Chimney Offload', description: 'Offloads TCP processing to the NIC for reduced CPU usage on high-throughput connections.' },
  { id: 'net-tcp-selective-acks', title: 'Enable TCP Selective Acks', description: 'Enables selective acknowledgements so only missing packets are retransmitted.' },
  { id: 'net-tcp-weak-host', title: 'Enable Weak-Host Transmission', description: 'Allows packets to be sent/received on any interface.', warning: 'Breaks WireGuard protocol causing issues with some VPNs' },
  { id: 'net-tcp-http-autotuning', title: 'Enable Win HTTP Autotuning', description: 'Enables WinHTTP autotuning for improved HTTP download throughput.' },
  { id: 'net-tcp-retransmit-timeout', title: 'Increase TCP Retransmission Timeout', description: 'Increases the TCP retransmission timeout for more reliable connections on lossy networks.' },
  { id: 'net-tcp-lower-timeout', title: 'Lower TCP Connection Timeout', description: 'Reduces TCP connection timeout for faster failure detection on dead connections.' },
  { id: 'net-tcp-congestion-provider', title: 'Optimize Network Congestion Provider', description: 'Sets the CTCP congestion provider for better bandwidth utilization.' },
  { id: 'net-tcp-ttl', title: 'Reduce Time-to-Live', description: 'Reduces the default IP TTL to drop packets that loop in the network faster.' },
  { id: 'net-tcp-remove-limit', title: 'Remove TCP Connection Limit', description: 'Removes the half-open TCP connection limit for faster connection establishment.' },
  { id: 'net-tcp-dynamic-port', title: 'Set Dynamic Port Range to Max', description: 'Expands the dynamic port range to the maximum to reduce port exhaustion.' },
];

const udpTweaks = [
  { id: 'net-udp-disable-offloads', title: 'Disable UDP Offloads', description: 'Disables UDP segmentation and checksum offloading for more predictable UDP latency.' },
  { id: 'net-udp-fast-datagram', title: 'Enable Fast Datagram Sending for UDP Traffic', description: 'Enables fast datagram sending to reduce UDP send latency for gaming traffic.' },
];

const securityTweaks = [
  { id: 'net-sec-disable-llmr', title: 'Disable LLMR', description: 'Disables Link-Local Multicast Name Resolution to prevent network name spoofing.' },
  { id: 'net-sec-disable-mpp', title: 'Disable MPP', description: 'Disables Microsoft Peer-to-Peer Networking services to reduce background traffic.' },
  { id: 'net-sec-disable-netbios', title: 'Disable NetBIOS', description: 'Disables the legacy NetBIOS over TCP/IP protocol to reduce network attack surface.' },
];

const dnsTweaks = [
  { id: 'net-dns-over-https', title: 'Enable DNS over HTTPS', description: 'Routes all DNS queries over HTTPS for improved privacy and security.' },
  { id: 'net-dns-optimize', title: 'Optimize DNS', description: "Sets Cloudflare (1.1.1.1) and Google (8.8.8.8) as DNS servers and flushes the DNS cache for faster resolution." },
];

function TweakSection({ label, tweaks, tweakStates, onToggle, incompatibleTweaks }) {
  return (
    <div className="tweak-section">
      <div className="tweak-section-label">{label}</div>
      <div className="tweak-section-cards">
        {tweaks.map((t) => (
          <TweakCard
            key={t.id}
            {...t}
            enabled={tweakStates[t.id]?.enabled}
            loading={tweakStates[t.id]?.loading}
            onToggle={onToggle}
            iconColor={COLOR}
            incompatible={incompatibleTweaks?.has(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function NetworkTweaksPage({ tweakStates, onToggle, incompatibleTweaks }) {
  return (
    <div className="tweak-page">
      <PageHeader icon={Network} title="Network Tweaks" subtitle="TCP/IP, SMB, UDP, DNS and security network optimizations" iconColor={COLOR} />
      <div className="tweak-grid">
        <TweakSection label="TCP / IP" tweaks={tcpipTweaks} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
        <TweakSection label="SMB" tweaks={smbTweaks} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
        <TweakSection label="UDP" tweaks={udpTweaks} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
        <TweakSection label="Security" tweaks={securityTweaks} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
        <TweakSection label="DNS" tweaks={dnsTweaks} tweakStates={tweakStates} onToggle={onToggle} incompatibleTweaks={incompatibleTweaks} />
      </div>
    </div>
  );
}
