"""Standalone, script-free HTML reports. Device strings are always escaped."""
from datetime import datetime, timezone
from html import escape


def render_report(devices, *, target='', profile='', completed=True, metrics=None):
    def e(value):
        return escape(str(value if value is not None else '—'), quote=True)
    rows = []
    for d in devices:
        values = (d.ip, d.hostname or d.upnp_friendly_name, d.mac, d.vendor,
            d.device_type, ', '.join(map(str, d.open_ports)), ', '.join(d.sources),
            d.classification_confidence, d.classification_evidence, d.reachability)
        rows.append('<tr>' + ''.join(f'<td>{e(v)}</td>' for v in values) + '</tr>')
    measured = ''
    if metrics:
        measured = (f"<p>Elapsed: {e(round(metrics.get('elapsed_seconds', 0), 2))} s · "
                    f"Probed: {e(metrics.get('probed', 0))} · "
                    f"Enriched: {e(metrics.get('enriched', 0))}</p>")
    return f'''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'">
<title>IPscans+ 4.0 · Network report</title><style>
body{{font:14px system-ui,sans-serif;margin:40px;color:#172033;background:#f5f7fa}}
header,main{{background:white;padding:28px;border:1px solid #dce3eb;border-radius:16px;margin:16px 0}}
h1{{font-size:34px;letter-spacing:-1px}}small{{color:#52637b}}.badge{{color:#007f68;font-weight:700}}
main{{overflow:auto}}table{{border-collapse:collapse;width:100%;text-align:left}}
th,td{{padding:12px;border-bottom:1px solid #e3e9ef;vertical-align:top;overflow-wrap:anywhere}}
th{{font-size:11px;text-transform:uppercase;color:#52637b}}footer{{color:#52637b}}
@media print{{body{{margin:0;background:white}}header,main{{border:0;padding:0}}table{{font-size:9px}}}}
</style><header><span class="badge">IPscans+ / 4.0</span><h1>Network discovery report</h1>
<p>{len(devices)} displayed devices · {e('Completed' if completed else 'Partial / in progress')} scan</p>
<small>{e(datetime.now(timezone.utc).isoformat())} · Target: {e(target)} · Profile: {e(profile)}</small>
{measured}</header><main><table><thead><tr>'''+''.join(f'<th>{label}</th>' for label in
        ('IP address','Name','MAC','Vendor','Device type','Open TCP ports','Sources','Confidence','Evidence','Reachability'))+f'''
</tr></thead><tbody>{''.join(rows)}</tbody></table></main><footer>
Observations reflect this scan only. No response is not proof of offline status.
An open port is not a confirmed vulnerability. Device classification requires supporting evidence.
Print this report from your browser to save a PDF.</footer></html>'''
