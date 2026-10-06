"""Explicitly authorized SNMPv2c metadata and LLDP neighbor evidence."""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from pysnmp.hlapi import asyncio as snmp

from app.core.network_utils import normalize_mac

_LOG = logging.getLogger(__name__)
OID_SYS_DESCR = "1.3.6.1.2.1.1.1.0"
OID_SYS_NAME = "1.3.6.1.2.1.1.5.0"
OID_ENT_SERIAL_1 = "1.3.6.1.2.1.47.1.1.1.1.11.1"
OID_LLDP_REM_CHASSIS_ID = "1.0.8802.1.1.2.1.4.1.1.5"


@dataclass
class SnmpResult:
    sys_descr: str | None
    sys_name: str | None
    serial_number: str | None
    lldp_neighbor_macs: tuple[str, ...] = ()


async def _query(ip: str, community: str, timeout: float) -> SnmpResult | None:
    engine = snmp.SnmpEngine()
    try:
        transport = await snmp.UdpTransportTarget.create((ip, 161), timeout=timeout, retries=0)
        auth = snmp.CommunityData(community, mpModel=1)
        response = await snmp.get_cmd(
            engine, auth, transport, snmp.ContextData(),
            *(snmp.ObjectType(snmp.ObjectIdentity(oid)) for oid in
              (OID_SYS_DESCR, OID_SYS_NAME, OID_ENT_SERIAL_1)),
        )
        error, status, _, binds = response
        if error or status or not binds:
            return None
        values = [str(value).strip() for _, value in binds]
        values = [None if value.startswith(("No Such", "noSuch")) or value == "" else value
                  for value in values]
        neighbors: set[str] = set()
        if values[0] or values[1]:
            async for walk_error, walk_status, _, var_binds in snmp.walk_cmd(
                engine, auth, transport, snmp.ContextData(),
                snmp.ObjectType(snmp.ObjectIdentity(OID_LLDP_REM_CHASSIS_ID)),
                maxRows=32, lexicographicMode=False,
            ):
                if walk_error or walk_status:
                    break
                for _, value in var_binds:
                    raw = value.asOctets() if hasattr(value, "asOctets") else b""
                    if len(raw) == 6:
                        mac = normalize_mac(raw.hex())
                        if mac:
                            neighbors.add(mac)
        if not any(values) and not neighbors:
            return None
        return SnmpResult(values[0], values[1], values[2], tuple(sorted(neighbors)))
    finally:
        engine.close_dispatcher()


def query(ip: str, community: str, timeout: float = 0.8) -> SnmpResult | None:
    if not community:
        raise ValueError("An authorized SNMP community is required")
    try:
        return asyncio.run(_query(ip, community, timeout))
    except (OSError, TimeoutError, ValueError) as exc:
        _LOG.warning("SNMP query failed for %s: %s", ip, type(exc).__name__)
        return None
