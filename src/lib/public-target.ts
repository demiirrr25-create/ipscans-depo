import { BlockList, isIP } from 'node:net';

// Public port checks must never reach local, shared, documentation or multicast targets.
const blocked = new BlockList();
for (const [address,prefix] of [
  ['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],
  ['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],
  ['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],
  ['224.0.0.0',4],['240.0.0.0',4],
] as const) blocked.addSubnet(address,prefix,'ipv4');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::',3,'ipv6');
for (const [address,prefix] of [['2001::',32],['2001:db8::',32],['2002::',16]] as const) blocked.addSubnet(address,prefix,'ipv6');

export function isPublicTarget(address:string):boolean {
  const family=isIP(address);
  if (!family || address.includes('%')) return false;
  if (family===4) return !blocked.check(address,'ipv4');
  // Mapped IPv4 is intentionally rejected: DNS should return the actual IPv4 address.
  return globalV6.check(address,'ipv6') && !blocked.check(address,'ipv6');
}
