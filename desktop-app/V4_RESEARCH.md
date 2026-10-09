# IPscans+ 4.0 engineering decisions

Research checked 9 October 2026. This is a desktop network-discovery release,
not a claim to outperform every scanner on every network.

| Primary source | Finding | v4 decision |
| --- | --- | --- |
| [Nmap host discovery](https://nmap.org/book/man-host-discovery.html) | ICMP alone misses some devices; TCP refusal can indicate a responding host. | Retain independent multicast providers and recognize TCP refusal as reachability, never as an open service. |
| [Nmap timing and performance](https://nmap.org/book/man-performance.html) | Timeout, concurrency, retries and the amount of requested information affect both speed and completeness. | Four explicit profiles with visible tradeoffs, optional port sets and bounded queues. No claim that maximum concurrency always wins. |
| [Microsoft IcmpSendEcho](https://learn.microsoft.com/en-us/windows/win32/api/icmpapi/nf-icmpapi-icmpsendecho) | Windows exposes native IPv4 echo requests with a timeout and reply status. | Use ctypes without a new ping.exe process per address. Validate status and reply address; always close the handle. IPv6 retains system ping. |
| [Microsoft ICMP_ECHO_REPLY](https://learn.microsoft.com/en-us/windows/win32/api/ipexport/ns-ipexport-icmp_echo_reply) | A returned reply has an independent Status, not just a reply count. | Reject unreachable replies and replies from the wrong address. Tests cover both, plus actual loopback. |
| [Python select](https://docs.python.org/3/library/select.html) | Sockets can be multiplexed rather than waited sequentially. | Shared per-batch deadline, Windows exceptional connect handling, 50 ms cancellation checks and at most 64 sockets per host. |
| [Angry IP Scanner](https://angryip.org/about/) | Accessible discovery, extensibility and export are useful alongside raw speed. | Keep one device table/map workflow; add fielded search and portable HTML reports. |
| [Masscan](https://github.com/robertdavidgraham/masscan) | High packet-rate scanning has different operating assumptions from device inventory. | Do not bundle an internet-scale raw-packet engine into a workstation discovery app or equate packet rate with inventory accuracy. |

## What changed from 3.0

- Native Windows IPv4 ICMP instead of a process launch per target.
- Five TCP discovery ports run concurrently within one budget; successful
  connections and refusals are distinguished from timeout/unreachable.
- Four profiles, 1–256 custom service ports, multiple subnets and exclusions.
  The global IPv4/IPv6 budgets also apply across ranges.
- Live measured counters, refreshed dark workspace, shared structured search.
- Script-free escaped HTML report, with partial scans clearly labelled.
- Keep the selected workspace after completion; stop recomputing all device
  summaries on every idle 100 ms tick. Report rendering runs off the GUI thread.

## Measurements and limits

`benchmarks/native_benchmark.py` compares 30 alternating ICMP calls to
127.0.0.1. On the development Windows 11 / Python 3.13.1 machine, median
v3 subprocess cost was 20.4081 ms and native v4 cost was 0.5061 ms (40.32×
lower call overhead). This is not a 40× LAN scan improvement. Windows CI
records its own independently reproducible results in the release assets.

The synthetic /24, /22 and /20 scheduler tests contact no network. Their
fixture error rates must be zero. The 10,000-row Qt benchmark measured a
36.18 ms maximum event-loop gap locally; this depends on hardware and load.
Native ICMP and TCP integration tests contact loopback only.

Real LAN accuracy, physical camera firmware compatibility and competitor
speed comparisons have not been measured. Network speed depends on target
density, packet loss, filtering and enabled enrichment. The Quick profile
can miss slow responders. The Sensitive profile reduces concurrency and
port coverage; it is not a guarantee for every industrial device.

Nmap remains an optional existing integration, not redistributed code.
No new passwords, cloud telemetry or external AI dependency is introduced.
The new v4 explanatory interface text is English/Turkish; other existing
locales use English for these additions. Existing discovery/localization
and authorized management continue to work as before.
