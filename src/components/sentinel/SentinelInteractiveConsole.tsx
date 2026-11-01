export function SentinelInteractiveConsole({ isTr }: { isTr: boolean }) {
  return (
    <details className="ds-card p-6 sm:p-9">
      <summary className="cursor-pointer text-lg font-semibold">
        {isTr ? "Yerel olay incelemesi nasıl başlar?" : "How do I start a local incident review?"}
      </summary>
      <ol className="mt-4 list-inside list-decimal space-y-2 text-ink-2">
        <li>{isTr ? "Yetkili Windows bilgisayarında Sentinel’i açın." : "Open Sentinel on an authorized Windows computer."}</li>
        <li>{isTr ? "Olayla ilişkili cihazın IP adresini ve tarama bulgularını kontrol edin." : "Check the device IP and discovery evidence for the incident."}</li>
        <li>{isTr ? "Müdahale kararını yerel ağ yöneticisiyle doğrulayın." : "Confirm any response with the local network administrator."}</li>
      </ol>
    </details>
  );
}
