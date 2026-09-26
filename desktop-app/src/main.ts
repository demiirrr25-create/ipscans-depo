import { invoke } from "@tauri-apps/api/core";

type Device = {
  ip: string;
  mac: string | null;
  vendor: string | null;
  hostname: string | null;
  open_ports: number[];
  snmp: { sysDescr: string | null; sysName: string | null; serialNumber: string | null } | null;
  onvif: { manufacturer: string | null; model: string | null; serialNumber: string | null } | null;
  upnp: { friendlyName: string | null; deviceType: string | null } | null;
  wmi: { computerName: string | null; osCaption: string | null; biosSerialNumber: string | null } | null;
  serial_number: string | null;
};

const subnetInput = document.querySelector<HTMLInputElement>("#subnet")!;
const scanBtn = document.querySelector<HTMLButtonElement>("#scanBtn")!;
const statusEl = document.querySelector<HTMLElement>("#status")!;
const rowsEl = document.querySelector<HTMLTableSectionElement>("#deviceRows")!;

function sourceBadges(device: Device): string {
  const badges: string[] = [];
  if (device.snmp) badges.push("SNMP");
  if (device.onvif) badges.push("ONVIF");
  if (device.upnp) badges.push("UPnP");
  if (device.wmi) badges.push("WMI");
  return badges.map((b) => `<span class="badge">${b}</span>`).join("") || "—";
}

function renderDevices(devices: Device[]) {
  rowsEl.innerHTML = devices
    .map(
      (d) => `
        <tr>
          <td><button class="ip-link" data-ip="${d.ip}">${d.ip}</button></td>
          <td>${d.mac ?? "—"}</td>
          <td>${d.vendor ?? "—"}</td>
          <td>${d.open_ports.length ? d.open_ports.join(", ") : "—"}</td>
          <td>${d.serial_number ?? "—"}</td>
          <td>${sourceBadges(d)}</td>
        </tr>`
    )
    .join("");

  // Clicking an IP opens it in the system's default web browser.
  rowsEl.querySelectorAll<HTMLButtonElement>(".ip-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      invoke("open_ip_in_browser", { ip: btn.dataset.ip });
    });
  });
}

async function runScan() {
  scanBtn.disabled = true;
  statusEl.textContent = "Taranıyor... (ICMP, ARP, SNMP, ONVIF, UPnP)";
  rowsEl.innerHTML = "";
  try {
    const devices = await invoke<Device[]>("scan_network", {
      subnetCidr: subnetInput.value.trim(),
    });
    renderDevices(devices);
    statusEl.textContent = `${devices.length} cihaz bulundu.`;
  } catch (err) {
    statusEl.textContent = `Hata: ${String(err)}`;
  } finally {
    scanBtn.disabled = false;
  }
}

scanBtn.addEventListener("click", runScan);
