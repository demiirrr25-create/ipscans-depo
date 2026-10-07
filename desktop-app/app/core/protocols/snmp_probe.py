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
OID_LLDP_REM_CHASSIS_SUBTYPE = "1.0.8802.1.1.2.1.4.1.1.4"
OID_LLDP_REM_CHASSIS_ID = "1.0.8802.1.1.2.1.4.1.1.5"


@dataclass
class SnmpResult:
    sys_descr: str | None
    sys_name: str | None
    serial_number: str | None
    lldp_neighbor_macs: tuple[str, ...] = ()


def verified_lldp_macs(subtypes: dict[str, str], identifiers: dict[str, bytes]) -> tuple[str, ...]:
    # LLDP subtype 4 is MAC. A six-byte identifier with another subtype
    # may be a local identifier; treating it as a MAC invents adjacency.
    neighbors = {
        mac for suffix, raw in identifiers.items()
        if subtypes.get(suffix) == "4" and len(raw) == 6
        if (mac := normalize_mac(raw.hex()))
    }
    return tuple(sorted(neighbors))


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
        subtypes: dict[str, str] = {}
        identifiers: dict[str, bytes] = {}
        if values[0] or values[1]:
            for oid, destination in ((OID_LLDP_REM_CHASSIS_SUBTYPE, subtypes),
                                     (OID_LLDP_REM_CHASSIS_ID, identifiers)):
                async for walk_error, walk_status, _, var_binds in snmp.walk_cmd(
                    engine, auth, transport, snmp.ContextData(),
                    snmp.ObjectType(snmp.ObjectIdentity(oid)),
                    maxRows=32, lexicographicMode=False,
                ):
                    if walk_error or walk_status:
                        break
                    for name, value in var_binds:
                        full_oid = name.prettyPrint()
                        if not full_oid.startswith(oid + "."):
                            continue
                        suffix = full_oid[len(oid) + 1:]
                        if destination is subtypes:
                            subtypes[suffix] = str(value)
                        else:
                            identifiers[suffix] = value.asOctets() if hasattr(value, "asOctets") else b""
        neighbors = verified_lldp_macs(subtypes, identifiers)
        if not any(values) and not neighbors:
            return None
        return SnmpResult(values[0], values[1], values[2], neighbors)
    finally:
        engine.close_dispatcher()


def query(ip: str, community: str, timeout: float = 0.8) -> SnmpResult | None:
    if not community:
        raise ValueError("An authorized SNMP community is required")
    try:
        async def bounded_query():
            return await asyncio.wait_for(_query(ip, community, timeout), timeout=4.0)
        return asyncio.run(bounded_query())
    except (OSError, TimeoutError, ValueError) as exc:
        _LOG.warning("SNMP query failed for %s: %s", ip, type(exc).__name__)
        return None
