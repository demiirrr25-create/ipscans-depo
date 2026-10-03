import type { Locale } from "@/i18n/config";

type ProductCopy = {
  newTitle: string; securityTitle: string; faqTitle: string;
  connection: string; changes: string[]; security: string; limitations: string;
  faq: { question: string; answer: string }[];
};

export const ipcastProductCopy: Record<Locale, ProductCopy> = {
  tr: {
    newTitle: "Bu sürümde neler var?", securityTitle: "Erişim sizin kontrolünüzde", faqTitle: "Sık sorulan sorular",
    connection: "İki bilgisayarda da aynı IPCast sürümünü açın. Karşı cihazın 9 haneli kimliğini girin, ilk bağlantıda sertifika parmak izini doğrulayın ve istenen izinleri uzak cihazda onaylayın.",
    changes: ["Paylaşılan klasörlerle çift panelli dosya yöneticisi, doğrulanan ve sürdürülebilen aktarımlar.", "Çoklu monitör, uyarlanabilir görüntü kalitesi, tam ekran, sohbet ve geçici çizimler.", "Görünür AVI kaydı, ayrı izinle açılan sistem sesi ve ileri/ters TCP tünelleri.", "LAN keşfi, Wake-on-LAN, yeniden bağlanma denemeleri, tanılama ve doğrulanan güncellemeler."],
    security: "Oturum trafiği TLS ile şifrelenir. Gelen bağlantı görünürdür; ekran, klavye, pano, dosya, ses ve kayıt izinleri ayrı seçilir. Gözetimsiz erişim varsayılan kapalıdır. Etkinleştirildiğinde parola tek yönlü türetmeyle saklanır ve denemeler sınırlandırılır.",
    limitations: "EXE ve kurulum paketi kod imzası taşımaz. SHA-256 dosya bütünlüğünü doğrular. Güvenli masaüstü/UAC/Ctrl+Alt+Del, ekran karartma sürücüsü ve sanal yazıcı yönlendirmesi desteklenmez. İki fiziksel Windows 10/11 cihazında kabul testi yapılmamıştır.",
    faq: [
      { question: "Hangi Windows sürümlerini destekler?", answer: "Windows 10 ve Windows 11, 64 bit. Uygulama açık bir kullanıcı oturumunda çalışır; internet bağlantıları için her iki cihazın relay servisine erişebilmesi gerekir." },
      { question: "Dosyalarıma kim erişebilir?", answer: "Dosya aktarımına izin vermeniz ve dosya yöneticisinde bir klasörü açıkça paylaşmanız gerekir. Yalnızca bu klasör açılır. Paylaşımı durdurabilir veya oturumu kapatabilirsiniz." },
      { question: "Kayıt ve ses gizlice açılabilir mi?", answer: "Bu özellikler ayrı izin gerektirir. Kayıtta iki tarafta da REC görünür. Ses kapalı başlar; görüntüleyen kişi etkinleştirir. AVI kaydı ses içermez ve çözünürlük değişiminde veya 1,8 GB sınırında durur." },
      { question: "Bağlantı kesilirse ne olur?", answer: "En fazla üç yeniden bağlanma denemesi yapılır. Yeni oturum yeniden onay ister. Dosya aktarımı, aynı paylaşılan klasör ve kaynak dosya kullanılarak sürdürülebilir." }
    ]
  },
  en: {
    newTitle: "What's new", securityTitle: "You control access", faqTitle: "Frequently asked questions",
    connection: "Open the same IPCast version on both computers. Enter the remote 9-digit ID, verify the certificate fingerprint on first connection, and approve the requested permissions on the remote device.",
    changes: ["Dual-pane shared-folder file manager with verified, resumable transfers.", "Multiple monitors, adaptive image quality, fullscreen, chat and temporary viewer annotations.", "Visible AVI recording, separately permitted system audio and forward/reverse TCP tunnels.", "LAN discovery, Wake-on-LAN, reconnect attempts, diagnostics and verified update downloads."],
    security: "TLS encrypts session traffic. Incoming connections are visible; screen, keyboard, clipboard, files, audio and recording permissions are selected separately. Unattended access is off by default and uses password derivation and rate limiting when enabled.",
    limitations: "The executable and installer are unsigned. SHA-256 verifies file integrity. Secure desktop/UAC/Ctrl+Alt+Del, privacy-screen drivers and virtual printer redirection are unavailable. Acceptance testing on two physical Windows 10/11 devices was not performed.",
    faq: [
      { question: "Which Windows versions are supported?", answer: "Windows 10 and Windows 11, 64-bit. IPCast runs in a signed-in user session. Internet connections require access to the relay service from both computers." },
      { question: "Who can access my files?", answer: "You must permit file transfer and explicitly share a folder in Files. Access is confined to that folder. You can stop sharing or disconnect at any time." },
      { question: "Can recording or audio start secretly?", answer: "Both require separate permission. Recording displays REC on both devices. Audio starts off and the viewer enables it. AVI recording has no audio and stops at a resolution change or 1.8 GB." },
      { question: "What happens when a connection drops?", answer: "IPCast retries up to three times. A new session requires fresh approval. File transfers can resume with the same shared folder and unchanged source file." }
    ]
  },
  de: {
    newTitle: "Neu in dieser Version", securityTitle: "Sie bestimmen den Zugriff", faqTitle: "Häufige Fragen",
    connection: "Öffnen Sie dieselbe IPCast-Version auf beiden Geräten. Geben Sie die neunstellige Geräte-ID ein, vergleichen Sie beim ersten Kontakt den Zertifikat-Fingerabdruck und bestätigen Sie die Berechtigungen am entfernten Gerät.",
    changes: ["Dateimanager mit zwei Bereichen und überprüften, fortsetzbaren Übertragungen.", "Mehrere Monitore, adaptive Bildqualität, Vollbild, Chat und temporäre Anmerkungen.", "Sichtbare AVI-Aufnahme, separat freigegebener Systemton und TCP-Tunnel in beide Richtungen.", "LAN-Erkennung, Wake-on-LAN, erneute Verbindungsversuche, Diagnose und geprüfte Updates."],
    security: "TLS verschlüsselt den Sitzungsverkehr. Eingehende Verbindungen sind sichtbar; Berechtigungen werden einzeln gewählt. Unbeaufsichtigter Zugriff ist standardmäßig aus und nutzt bei Aktivierung Passwortableitung und begrenzte Anmeldeversuche.",
    limitations: "EXE und Installer sind nicht codesigniert. SHA-256 prüft die Dateiintegrität. Sicherer Desktop/UAC/Strg+Alt+Entf, Bildschirm-Abdunklung und virtuelle Druckerumleitung sind nicht verfügbar. Ein Abnahmetest auf zwei physischen Windows-10/11-Geräten wurde nicht durchgeführt.",
    faq: [
      { question: "Welche Systeme werden unterstützt?", answer: "Windows 10 und 11 mit 64 Bit, in einer angemeldeten Benutzersitzung. Für Internetverbindungen müssen beide Geräte den Relay-Dienst erreichen." },
      { question: "Welche Dateien sind zugänglich?", answer: "Nur ein ausdrücklich freigegebener Ordner. Dateiübertragung muss erlaubt sein; Sie können die Freigabe oder Sitzung beenden." },
      { question: "Wie funktionieren Aufnahme und Ton?", answer: "Beides erfordert eine eigene Berechtigung. REC wird auf beiden Geräten angezeigt. Ton ist zunächst aus. AVI enthält keinen Ton und endet bei Auflösungswechsel oder 1,8 GB." }
    ]
  },
  fr: {
    newTitle: "Nouveautés", securityTitle: "Vous contrôlez l'accès", faqTitle: "Questions fréquentes",
    connection: "Ouvrez la même version sur les deux ordinateurs. Saisissez l'identifiant à neuf chiffres, vérifiez l'empreinte du certificat lors de la première connexion et approuvez les autorisations sur l'appareil distant.",
    changes: ["Gestionnaire de fichiers à deux volets et transferts vérifiés pouvant reprendre.", "Plusieurs écrans, qualité adaptative, plein écran, chat et annotations temporaires.", "Enregistrement AVI visible, audio système sur autorisation et tunnels TCP dans les deux sens.", "Découverte LAN, Wake-on-LAN, reconnexion, diagnostics et téléchargements de mises à jour vérifiés."],
    security: "TLS chiffre les sessions. Les connexions entrantes sont visibles et les autorisations sont choisies séparément. L'accès sans surveillance est désactivé par défaut et utilise une dérivation du mot de passe avec limitation des tentatives.",
    limitations: "L'exécutable et l'installateur ne sont pas signés. SHA-256 vérifie l'intégrité du fichier. Bureau sécurisé/UAC/Ctrl+Alt+Suppr, masquage de l'écran et redirection d'imprimante virtuelle indisponibles. Aucun test d'acceptation sur deux appareils physiques Windows 10/11 n'a été effectué.",
    faq: [
      { question: "Quels systèmes sont compatibles ?", answer: "Windows 10 et 11, 64 bits, dans une session utilisateur ouverte. Les deux appareils doivent accéder au relais pour les connexions Internet." },
      { question: "Quels fichiers sont accessibles ?", answer: "Uniquement un dossier explicitement partagé, après autorisation du transfert. Le partage ou la session peuvent être arrêtés à tout moment." },
      { question: "Comment fonctionnent l'enregistrement et le son ?", answer: "Ils nécessitent des autorisations distinctes. REC s'affiche sur les deux appareils. Le son est initialement désactivé. L'AVI est muet et s'arrête au changement de résolution ou à 1,8 Go." }
    ]
  },
  es: {
    newTitle: "Novedades", securityTitle: "Tú controlas el acceso", faqTitle: "Preguntas frecuentes",
    connection: "Abre la misma versión en ambos equipos. Introduce el identificador de nueve dígitos, verifica la huella del certificado en la primera conexión y aprueba los permisos en el dispositivo remoto.",
    changes: ["Gestor de archivos con dos paneles y transferencias verificadas y reanudables.", "Varios monitores, calidad adaptable, pantalla completa, chat y anotaciones temporales.", "Grabación AVI visible, audio del sistema con permiso independiente y túneles TCP en ambas direcciones.", "Descubrimiento LAN, Wake-on-LAN, reconexión, diagnóstico y descargas de actualizaciones verificadas."],
    security: "TLS cifra las sesiones. Las conexiones entrantes son visibles y los permisos se eligen por separado. El acceso desatendido está desactivado por defecto y utiliza derivación de contraseña y límites de intentos.",
    limitations: "El ejecutable y el instalador no están firmados. SHA-256 verifica la integridad. No se admite escritorio seguro/UAC/Ctrl+Alt+Supr, ocultación de pantalla ni redirección de impresora virtual. No se realizaron pruebas de aceptación en dos dispositivos físicos Windows 10/11.",
    faq: [
      { question: "¿Qué sistemas son compatibles?", answer: "Windows 10 y 11 de 64 bits, con una sesión de usuario iniciada. Ambos equipos necesitan acceso al servicio relay para conexiones por Internet." },
      { question: "¿Qué archivos son accesibles?", answer: "Solo una carpeta compartida explícitamente, con permiso de transferencia. Puedes detener el uso compartido o desconectar en cualquier momento." },
      { question: "¿Cómo funcionan la grabación y el audio?", answer: "Requieren permisos separados. REC aparece en ambos equipos. El audio empieza desactivado. El AVI no tiene sonido y se detiene al cambiar la resolución o alcanzar 1,8 GB." }
    ]
  }
};
