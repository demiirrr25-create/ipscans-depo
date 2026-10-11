import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublicTarget} from '../src/lib/public-target.ts';
test('port targets reject private, special-use and IPv4-mapped IPv6 addresses',()=>{
 for(const ip of ['127.0.0.1','127.12.1.2','0.1.2.3','10.1.2.3','172.31.0.1','192.168.1.2','169.254.169.254','100.64.1.1','100.127.255.255','198.18.1.1','192.0.2.1','224.0.0.1','255.255.255.255','::','::1','::ffff:127.0.0.1','::ffff:7f00:1','fd00::1','fe80::1','ff02::1','2001:db8::1','2002:7f00:1::','not-an-ip','999.1.1.1']) assert.equal(isPublicTarget(ip),false,ip);
 for(const ip of ['1.1.1.1','8.8.8.8','172.32.0.1','2606:4700:4700::1111','2001:4860:4860::8888']) assert.equal(isPublicTarget(ip),true,ip);
});
