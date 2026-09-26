"""SNMP v2c GET for sysDescr/sysName and, where published, a serial number.

Serial number OID location varies by vendor; ENTITY-MIB's
entPhysicalSerialNum (1.3.6.1.2.1.47.1.1.1.1.11) is the closest thing to a
standard and is what most managed switches/routers/NVRs publish.
"""
from __future__ import annotations

from dataclasses import dataclass

try:
    from pysnmp.hlapi import (
        CommunityData,
        ContextData,
        ObjectIdentity,
        ObjectType,
        SnmpEngine,
        UdpTransportTarget,
        getCmd,
    )

    _HAS_PYSNMP = True
except ImportError:
    _HAS_PYSNMP = False

OID_SYS_DESCR = "1.3.6.1.2.1.1.1.0"
OID_SYS_NAME = "1.3.6.1.2.1.1.5.0"
OID_ENT_SERIAL_1 = "1.3.6.1.2.1.47.1.1.1.1.11.1"


@dataclass
class SnmpResult:
    sys_descr: str | None
    sys_name: str | None
    serial_number: str | None


def _get(ip: str, community: str, oid: str, timeout: float) -> str | None:
    if not _HAS_PYSNMP:
        return None
    iterator = getCmd(
        SnmpEngine(),
        CommunityData(community, mpModel=1),  # mpModel=1 -> SNMPv2c
        UdpTransportTarget((ip, 161), timeout=timeout, retries=0),
        ContextData(),
        ObjectType(ObjectIdentity(oid)),
    )
    error_indication, error_status, _, var_binds = next(iterator)
    if error_indication or error_status or not var_binds:
        return None
    value = str(var_binds[0][1]).strip()
    return value or None


def query(ip: str, community: str = "public", timeout: float = 0.8) -> SnmpResult | None:
    sys_descr = _get(ip, community, OID_SYS_DESCR, timeout)
    sys_name = _get(ip, community, OID_SYS_NAME, timeout)
    serial_number = _get(ip, community, OID_ENT_SERIAL_1, timeout)

    if sys_descr is None and sys_name is None and serial_number is None:
        return None
    return SnmpResult(sys_descr=sys_descr, sys_name=sys_name, serial_number=serial_number)
