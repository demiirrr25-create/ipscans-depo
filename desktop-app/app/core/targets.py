"""Multi-subnet planning with explicit exclusions and a global host budget."""
import ipaddress
import re
from app.core.network_utils import InvalidTargetError, MAX_HOSTS, MAX_IPV6_HOSTS, parse_targets


def plan_targets(primary: str, additional: str = '', exclusions: str = '') -> list[str]:
    if len(additional) > 4096 or len(exclusions) > 4096:
        raise InvalidTargetError('Target plan text is limited to 4096 characters per field.')
    planned: dict[str, None] = {}
    for spec in [primary, *re.split(r'[,;\n]', additional)]:
        if not spec.strip():
            continue
        for ip in parse_targets(spec):
            planned[ip] = None
        if len(planned) > MAX_HOSTS:
            raise InvalidTargetError('The complete target plan exceeds 65,534 addresses.')
    for spec in re.split(r'[,;\n]', exclusions):
        if not spec.strip():
            continue
        # Broad exclusions such as 10.0.0.0/8 must not expand millions of hosts.
        if '/' in spec:
            try:
                network = ipaddress.ip_network(spec.strip(), strict=False)
            except ValueError as exc:
                raise InvalidTargetError('Invalid exclusion CIDR') from exc
            planned = {ip: None for ip in planned if ipaddress.ip_address(ip) not in network}
        else:
            for ip in parse_targets(spec):
                planned.pop(ip, None)
    if sum(':' in ip for ip in planned) > MAX_IPV6_HOSTS:
        raise InvalidTargetError('The complete plan is limited to 256 IPv6 addresses.')
    if not planned:
        raise InvalidTargetError('The target plan contains no addresses after exclusions.')
    return list(planned)
