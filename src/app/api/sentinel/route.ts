// Public status only. Incident response belongs on the operator's desktop.
export function GET() {
  return Response.json({
    execution: "desktop-only",
    catalog: "/desktop/en.html#sentinel",
  });
}
