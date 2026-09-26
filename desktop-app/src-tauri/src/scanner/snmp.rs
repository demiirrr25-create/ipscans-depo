use std::net::Ipv4Addr;
use std::time::Duration;

use snmp2::{AsyncSession, Oid};

use super::types::SnmpInfo;

// Standard MIB-II objects, present on almost every managed switch, router,
// printer and NVR. Serial number location varies wildly by vendor — most
// enterprise gear publishes it under ENTITY-MIB entPhysicalSerialNum.
const OID_SYS_DESCR: &[u32] = &[1, 3, 6, 1, 2, 1, 1, 1, 0];
const OID_SYS_NAME: &[u32] = &[1, 3, 6, 1, 2, 1, 1, 5, 0];
const OID_ENT_PHYSICAL_SERIAL_NUM_1: &[u32] = &[1, 3, 6, 1, 2, 1, 47, 1, 1, 1, 1, 11, 1];

pub async fn query(ip: Ipv4Addr, community: &str) -> Option<SnmpInfo> {
    let addr = format!("{ip}:161");
    let mut session =
        AsyncSession::new_v2c(&addr, community.as_bytes(), 0).await.ok()?;

    let sys_descr = get_string(&mut session, OID_SYS_DESCR).await;
    let sys_name = get_string(&mut session, OID_SYS_NAME).await;
    let serial_number = get_string(&mut session, OID_ENT_PHYSICAL_SERIAL_NUM_1).await;

    if sys_descr.is_none() && sys_name.is_none() && serial_number.is_none() {
        return None;
    }

    Some(SnmpInfo {
        sys_descr,
        sys_name,
        serial_number,
    })
}

async fn get_string(session: &mut AsyncSession, oid: &[u32]) -> Option<String> {
    let oid = Oid::from(oid).ok()?;
    let response = tokio::time::timeout(Duration::from_millis(800), session.get(&oid))
        .await
        .ok()?
        .ok()?;
    let (_, value) = response.varbinds.into_iter().next()?;
    Some(format!("{value}").trim_matches('"').to_string())
}
