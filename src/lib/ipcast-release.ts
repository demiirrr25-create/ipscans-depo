import type { Locale } from "@/i18n/config";

export const ipcastRelease = {
  version: "1.0.1",
  platform: "Windows 10/11 · x64",
  executable: "IPCast.exe",
  published: false,
  fileSize: null as string | null,
  sha256: null as string | null,
};

export const ipcastCopy: Record<Locale, {
  title: string;
  subtitle: string;
  badge: string;
  download: string;
  explore: string;
  featuresTitle: string;
  features: string[];
  securityNote: string;
  platformLabel: string;
  versionLabel: string;
  fileLabel: string;
  sizeLabel: string;
  checksumLabel: string;
  pending: string;
  downloadTitle: string;
  downloadSubtitle: string;
  availability: string;
}> = {
  tr: {
    title: "IPCast",
    subtitle: "Yerel ağlar için uzak masaüstü ve kullanıcı onaylı destek.",
    badge: "Windows 10/11 · 64 bit",
    download: "Windows için IPCast'i İndir",
    explore: "Uygulamaları Keşfet",
    featuresTitle: "Yerel ağda doğrudan destek",
    features: [
      "Dokuz haneli IPCast ID ile aynı yerel ağdaki cihazları keşfet.",
      "Ekran görüntüsünü aktar; fare ve klavye girdisini yalnızca karşı tarafın verdiği izinlerle ilet.",
      "Gelen isteklerde kullanıcı onayı ve ayrı oturum izinleri.",
      "İzin verilen oturumlarda TLS aktarımı, metin panosu eşitleme, favoriler ve bağlantı geçmişi.",
      "İsteğe bağlı gözetimsiz erişim: parola PBKDF2 ile hash'lenir ve denemeler sınırlandırılır.",
    ],
    securityNote: "Sertifika pinning henüz yoktur; TLS pasif dinlemeyi önler, ancak aktif aradaki adam saldırılarını dışlamaz. İnternet üzerinden relay bağlantısı henüz sunulmuyor.",
    platformLabel: "Platform",
    versionLabel: "Sürüm",
    fileLabel: "Dosya",
    sizeLabel: "Dosya boyutu",
    checksumLabel: "SHA-256",
    pending: "Windows smoke testi bekleniyor",
    downloadTitle: "IPCast indirmesi",
    downloadSubtitle: "Güncel Windows sürüm bilgileri.",
    availability: "İndirme, gerçek Windows makinesinde açılış ve bağlantı akışı doğrulandıktan sonra yayımlanacak. Bu sayfada eski veya farklı bir ürünün EXE dosyası sunulmaz.",
  },
  en: {
    title: "IPCast",
    subtitle: "Remote desktop and user-approved support for local networks.",
    badge: "Windows 10/11 · 64-bit",
    download: "Download IPCast for Windows",
    explore: "Explore Applications",
    featuresTitle: "Direct support on your local network",
    features: [
      "Discover devices on the same local network using a nine-digit IPCast ID.",
      "Stream the screen and forward mouse and keyboard input only with the peer's granted permissions.",
      "User approval and separate session permissions for incoming requests.",
      "TLS transport, text clipboard sync, favorites and connection history in permitted sessions.",
      "Optional unattended access: passwords are PBKDF2-hashed and attempts are rate-limited.",
    ],
    securityNote: "Certificate pinning is not implemented yet. TLS protects against passive eavesdropping but does not rule out active man-in-the-middle attacks. Internet relay connections are not available yet.",
    platformLabel: "Platform",
    versionLabel: "Version",
    fileLabel: "File",
    sizeLabel: "File size",
    checksumLabel: "SHA-256",
    pending: "Awaiting Windows smoke tests",
    downloadTitle: "IPCast download",
    downloadSubtitle: "Current Windows release details.",
    availability: "The download will be published after startup and connection flows are verified on a real Windows machine. This page will not serve an older or unrelated EXE.",
  },
  de: {
    title: "IPCast",
    subtitle: "Remotedesktop und nutzerbestätigter Support für lokale Netzwerke.",
    badge: "Windows 10/11 · 64-Bit",
    download: "IPCast für Windows herunterladen",
    explore: "Anwendungen entdecken",
    featuresTitle: "Direkter Support im lokalen Netzwerk",
    features: [
      "Geräte im selben lokalen Netzwerk über eine neunstellige IPCast-ID finden.",
      "Bildschirm übertragen und Maus- sowie Tastatureingaben nur mit erteilten Berechtigungen weiterleiten.",
      "Nutzerbestätigung und separate Sitzungsberechtigungen für eingehende Anfragen.",
      "TLS-Transport, Text-Zwischenablage, Favoriten und Verbindungsverlauf in erlaubten Sitzungen.",
      "Optionaler unbeaufsichtigter Zugriff: Passwörter werden mit PBKDF2 gehasht und Versuche begrenzt.",
    ],
    securityNote: "Zertifikat-Pinning ist noch nicht implementiert. TLS schützt vor passivem Mithören, schließt aktive Man-in-the-Middle-Angriffe aber nicht aus. Internet-Relay-Verbindungen sind noch nicht verfügbar.",
    platformLabel: "Plattform",
    versionLabel: "Version",
    fileLabel: "Datei",
    sizeLabel: "Dateigröße",
    checksumLabel: "SHA-256",
    pending: "Windows-Smoke-Tests stehen aus",
    downloadTitle: "IPCast-Download",
    downloadSubtitle: "Aktuelle Informationen zur Windows-Version.",
    availability: "Der Download wird veröffentlicht, sobald Start- und Verbindungsabläufe auf einem echten Windows-Gerät geprüft wurden. Diese Seite bietet keine ältere oder andere EXE-Datei an.",
  },
  fr: {
    title: "IPCast",
    subtitle: "Bureau à distance et assistance approuvée sur les réseaux locaux.",
    badge: "Windows 10/11 · 64 bits",
    download: "Télécharger IPCast pour Windows",
    explore: "Découvrir les applications",
    featuresTitle: "Assistance directe sur le réseau local",
    features: [
      "Repérez les appareils du même réseau local avec un identifiant IPCast à neuf chiffres.",
      "Diffusez l’écran et transmettez souris et clavier uniquement avec les autorisations accordées.",
      "Validation par l’utilisateur et autorisations séparées pour les demandes entrantes.",
      "Transport TLS, synchronisation du presse-papiers texte, favoris et historique dans les sessions autorisées.",
      "Accès sans surveillance facultatif : mots de passe hachés avec PBKDF2 et tentatives limitées.",
    ],
    securityNote: "L’épinglage de certificat n’est pas encore implémenté. TLS protège contre l’écoute passive, sans exclure les attaques actives de l’intermédiaire. Le relais Internet n’est pas encore disponible.",
    platformLabel: "Plateforme",
    versionLabel: "Version",
    fileLabel: "Fichier",
    sizeLabel: "Taille du fichier",
    checksumLabel: "SHA-256",
    pending: "Tests Windows en attente",
    downloadTitle: "Téléchargement IPCast",
    downloadSubtitle: "Informations sur la version Windows actuelle.",
    availability: "Le téléchargement sera publié après vérification du démarrage et des connexions sur un vrai appareil Windows. Cette page ne distribuera pas un ancien EXE ou un autre produit.",
  },
  es: {
    title: "IPCast",
    subtitle: "Escritorio remoto y soporte aprobado por el usuario para redes locales.",
    badge: "Windows 10/11 · 64 bits",
    download: "Descargar IPCast para Windows",
    explore: "Explorar aplicaciones",
    featuresTitle: "Soporte directo en tu red local",
    features: [
      "Encuentra dispositivos de la misma red local con un ID IPCast de nueve dígitos.",
      "Comparte la pantalla y envía entradas de ratón y teclado solo con los permisos concedidos.",
      "Aprobación del usuario y permisos separados para las solicitudes entrantes.",
      "Transporte TLS, sincronización del portapapeles de texto, favoritos e historial en sesiones autorizadas.",
      "Acceso desatendido opcional: contraseñas con hash PBKDF2 y límite de intentos.",
    ],
    securityNote: "Aún no se implementa la fijación de certificados. TLS protege frente a la escucha pasiva, pero no descarta ataques activos de intermediario. El relay por Internet todavía no está disponible.",
    platformLabel: "Plataforma",
    versionLabel: "Versión",
    fileLabel: "Archivo",
    sizeLabel: "Tamaño del archivo",
    checksumLabel: "SHA-256",
    pending: "Pruebas de Windows pendientes",
    downloadTitle: "Descarga de IPCast",
    downloadSubtitle: "Detalles de la versión actual para Windows.",
    availability: "La descarga se publicará después de verificar el inicio y la conexión en un equipo Windows real. Esta página no ofrecerá un EXE antiguo ni de otro producto.",
  },
};