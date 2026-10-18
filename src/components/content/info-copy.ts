import type { Locale } from "@/i18n/config";

export type InfoCopy = {
  eyebrow: {
    about: string;
    support: string;
    contact: string;
  };
  titles: {
    about: string;
    support: string;
    contact: string;
  };
  subtitle: string;
  about: {
    storyTitle: string;
    storyP1: string;
    storyP2: string;
    limitsEyebrow: string;
    limitsTitle: string;
    limitsBody: string;
    exploreCta: string;
  };
  support: {
    installTitle: string;
    installSteps: [string, string, string];
    faqTitle: string;
  };
  contact: {
    issueTitle: string;
    issueP1: string;
    issueP2: string;
    issueCta: string;
    privacyTitle: string;
    privacyBody: string;
  };
};

export const infoCopy: Record<Locale, InfoCopy> = {
  en: {
    eyebrow: { about: "About", support: "Help & support", contact: "Contact" },
    titles: {
      about: "It starts with understanding.",
      support: "A clear next step.",
      contact: "Stay connected.",
    },
    subtitle: "IPScans — network tools, product documentation and support resources.",
    about: {
      storyTitle: "Visibility. Context. Control.",
      storyP1:
        "IPScans brings IP lookup, DNS, WHOIS, port checks and connection measurements together with desktop network tools. Understanding how a result was obtained matters as much as seeing the result.",
      storyP2:
        "IPscans+ runs on Windows for local network discovery. IPCast provides remote desktop connections with device identity and access approval. LPR Pro is an evaluation release for local plate recognition and record review. Each product documents its capabilities and limitations on its own page.",
      limitsEyebrow: "Desktop & Web",
      limitsTitle: "Know the limits of a result.",
      limitsBody:
        "A browser cannot directly scan your LAN. IP geolocation is not a precise street address. A speed test measures the current transfer between your browser and the test endpoint. Make decisions with that context.",
      exploreCta: "Explore products",
    },
    support: {
      installTitle: "Installation and downloads",
      installSteps: [
        "Select the appropriate file for your operating system on the product page.",
        "Your browser controls the save location; find the file in its downloads list.",
        "Compare the SHA-256 checksum with the product page when available, then follow the installation instructions.",
      ],
      faqTitle: "Frequently asked questions",
    },
    contact: {
      issueTitle: "Technical issue or product feedback",
      issueP1:
        "Use the Issues area of the existing GitHub repository. Include the product name, version, operating system, steps to reproduce and expected behavior.",
      issueP2:
        "Do not include passwords, access keys, private inventories or customer footage in public reports. Remove sensitive information from screenshots.",
      issueCta: "Open GitHub Issues",
      privacyTitle: "Privacy & legal questions",
      privacyBody: "Contact addresses listed in our privacy policy and terms of service:",
    },
  },
  tr: {
    eyebrow: { about: "Hakkımızda", support: "Yardım ve destek", contact: "İletişim" },
    titles: {
      about: "Ağı anlamakla başlar.",
      support: "Bir sonraki adım, net.",
      contact: "İletişimde kalalım.",
    },
    subtitle: "IPScans — ağ araçları, ürün bilgileri ve yardım kaynakları.",
    about: {
      storyTitle: "Görünürlük. Bağlam. Kontrol.",
      storyP1:
        "IPScans; IP sorgulama, DNS, WHOIS, port kontrolü ve bağlantı ölçümünü masaüstü ağ araçlarıyla bir araya getirir. Bir sorgunun sonucunu görmek kadar, o sonucun nasıl elde edildiğini anlamak da önemlidir.",
      storyP2:
        "IPscans+ yerel ağ keşfi için Windows üzerinde çalışır. IPCast cihaz kimliği ve erişim onayıyla uzak masaüstü bağlantısı sunar. LPR Pro, yerel plaka tanıma ve kayıt inceleme için bir değerlendirme sürümüdür. Her ürünün yetenekleri ve sınırlamaları kendi sayfasında açıklanır.",
      limitsEyebrow: "Masaüstü ve Web",
      limitsTitle: "Sonuçların sınırlarını bilin.",
      limitsBody:
        "Tarayıcı yerel ağı doğrudan tarayamaz. IP konumu kesin bir fiziksel adres değildir. Hız testi o anda tarayıcı ile test uç noktası arasındaki aktarımı ölçer. Ürün kararlarını bu bağlamla verin.",
      exploreCta: "Ürünleri keşfet",
    },
    support: {
      installTitle: "Kurulum ve indirme",
      installSteps: [
        "Ürün sayfasından işletim sisteminize uygun dosyayı seçin.",
        "Dosyanın kaydedileceği yeri tarayıcınız yönetir; indirmeler listesinden dosyayı bulun.",
        "Varsa SHA-256 değerini ürün sayfasındaki değerle karşılaştırın; ardından kurulum yönergelerini izleyin.",
      ],
      faqTitle: "Sık sorulan sorular",
    },
    contact: {
      issueTitle: "Teknik sorun veya ürün geri bildirimi",
      issueP1:
        "Mevcut GitHub deposundaki Issues alanını kullanabilirsiniz. Ürün adı, sürüm, işletim sistemi, sorunun tekrar adımları ve beklenen davranışı ekleyin.",
      issueP2:
        "Herkese açık kayıtlara parola, erişim anahtarı, özel IP envanteri veya müşteri görüntüsü eklemeyin. Hassas bilgileri ekran görüntülerinden kaldırın.",
      issueCta: "GitHub Issues alanını aç",
      privacyTitle: "Gizlilik ve yasal sorular",
      privacyBody: "Gizlilik politikası ve kullanım koşullarında belirtilen iletişim adresleri:",
    },
  },
  de: {
    eyebrow: { about: "Über uns", support: "Hilfe & Support", contact: "Kontakt" },
    titles: {
      about: "Es beginnt mit dem Verstehen.",
      support: "Ein klarer nächster Schritt.",
      contact: "In Verbindung bleiben.",
    },
    subtitle: "IPScans — Netzwerktools, Produktinformationen und Hilferessourcen.",
    about: {
      storyTitle: "Sichtbarkeit. Kontext. Kontrolle.",
      storyP1:
        "IPScans vereint IP-Abfrage, DNS, WHOIS, Portprüfung und Verbindungsmessung mit Desktop-Netzwerktools. Zu verstehen, wie ein Ergebnis zustande kam, ist ebenso wichtig wie das Ergebnis selbst.",
      storyP2:
        "IPscans+ läuft unter Windows zur Erkennung lokaler Netzwerke. IPCast bietet Fernzugriff mit Geräteidentität und Zugriffsfreigabe. LPR Pro dient der lokalen Kennzeichenerkennung und Protokollprüfung. Jedes Produkt dokumentiert seine Möglichkeiten und Grenzen auf einer eigenen Seite.",
      limitsEyebrow: "Desktop & Web",
      limitsTitle: "Die Grenzen eines Ergebnisses kennen.",
      limitsBody:
        "Ein Browser kann Ihr lokales Netzwerk nicht direkt scannen. IP-Geolokalisierung ist keine genaue Straßenadresse. Ein Geschwindigkeitstest misst die aktuelle Übertragung zwischen Browser und Test-Endpunkt. Treffen Sie Entscheidungen mit diesem Kontext.",
      exploreCta: "Produkte entdecken",
    },
    support: {
      installTitle: "Installation und Downloads",
      installSteps: [
        "Wählen Sie auf der Produktseite die passende Datei für Ihr Betriebssystem.",
        "Ihr Browser verwaltet den Speicherort; öffnen Sie die Datei über die Download-Liste.",
        "Vergleichen Sie nach Möglichkeit die SHA-256-Prüfsumme mit der Angabe auf der Produktseite und folgen Sie den Installationshinweisen.",
      ],
      faqTitle: "Häufig gestellte Fragen",
    },
    contact: {
      issueTitle: "Technisches Problem oder Produkt-Feedback",
      issueP1:
        "Nutzen Sie den Bereich „Issues“ im bestehenden GitHub-Repository. Geben Sie Produktname, Version, Betriebssystem, Schritte zur Reproduktion und das erwartete Verhalten an.",
      issueP2:
        "Fügen Sie in öffentlichen Meldungen keine Passwörter, Zugriffsschlüssel, privaten IP-Listen oder Kundenaufnahmen hinzu. Entfernen Sie sensible Daten aus Screenshots.",
      issueCta: "GitHub Issues öffnen",
      privacyTitle: "Datenschutz & rechtliche Fragen",
      privacyBody: "In unserer Datenschutzerklärung und den Nutzungsbedingungen genannte Kontaktadressen:",
    },
  },
  es: {
    eyebrow: { about: "Acerca de", support: "Ayuda y soporte", contact: "Contacto" },
    titles: {
      about: "Todo empieza por comprender.",
      support: "Un siguiente paso claro.",
      contact: "Mantengamos el contacto.",
    },
    subtitle: "IPScans — herramientas de red, información de productos y recursos de ayuda.",
    about: {
      storyTitle: "Visibilidad. Contexto. Control.",
      storyP1:
        "IPScans reúne consulta de IP, DNS, WHOIS, verificación de puertos y medición de conexión junto con herramientas de red de escritorio. Entender cómo se obtuvo un resultado importa tanto como ver el resultado.",
      storyP2:
        "IPscans+ se ejecuta en Windows para el descubrimiento de red local. IPCast ofrece escritorio remoto con identidad de dispositivo y aprobación de acceso. LPR Pro es una versión de evaluación para reconocimiento local de matrículas. Cada producto documenta sus capacidades y límites en su propia página.",
      limitsEyebrow: "Escritorio y Web",
      limitsTitle: "Conoce los límites de cada resultado.",
      limitsBody:
        "Un navegador no puede escanear directamente tu red LAN. La geolocalización IP no es una dirección postal exacta. Un test de velocidad mide la transferencia actual entre tu navegador y el servidor de prueba. Toma decisiones con ese contexto.",
      exploreCta: "Explorar productos",
    },
    support: {
      installTitle: "Instalación y descargas",
      installSteps: [
        "Selecciona el archivo adecuado para tu sistema operativo en la página del producto.",
        "Tu navegador gestiona la carpeta de destino; localiza el archivo en la lista de descargas.",
        "Compara la suma SHA-256 con la publicada en la página del producto cuando esté disponible y sigue las instrucciones de instalación.",
      ],
      faqTitle: "Preguntas frecuentes",
    },
    contact: {
      issueTitle: "Incidencia técnica o comentarios sobre productos",
      issueP1:
        "Utiliza la sección Issues del repositorio oficial de GitHub. Incluye el nombre del producto, la versión, el sistema operativo, los pasos para reproducir el problema y el comportamiento esperado.",
      issueP2:
        "No incluyas contraseñas, claves de acceso, inventarios privados de IP ni grabaciones de clientes en informes públicos. Elimina la información sensible de las capturas de pantalla.",
      issueCta: "Abrir GitHub Issues",
      privacyTitle: "Consultas de privacidad y legales",
      privacyBody: "Direcciones de contacto indicadas en nuestra política de privacidad y términos de servicio:",
    },
  },
  fr: {
    eyebrow: { about: "À propos", support: "Aide et support", contact: "Contact" },
    titles: {
      about: "Tout commence par comprendre.",
      support: "Une prochaine étape claire.",
      contact: "Restons en contact.",
    },
    subtitle: "IPScans — outils réseau, documentation produit et ressources d’aide.",
    about: {
      storyTitle: "Visibilité. Contexte. Contrôle.",
      storyP1:
        "IPScans réunit recherche IP, DNS, WHOIS, vérification de ports et mesure de connexion avec des outils réseau de bureau. Comprendre comment un résultat a été obtenu compte autant que le résultat lui-même.",
      storyP2:
        "IPscans+ fonctionne sous Windows pour la découverte du réseau local. IPCast offre des connexions à distance avec identité d’appareil et approbation d’accès. LPR Pro permet la lecture locale de plaques et l’examen des journaux. Chaque produit détaille ses capacités et ses limites sur sa propre page.",
      limitsEyebrow: "Bureau et Web",
      limitsTitle: "Connaître les limites d’un résultat.",
      limitsBody:
        "Un navigateur ne peut pas scanner directement votre réseau local. La géolocalisation IP n’est pas une adresse postale exacte. Un test de débit mesure le transfert instantané entre votre navigateur et le point de mesure. Prenez vos décisions avec ce contexte.",
      exploreCta: "Découvrir les produits",
    },
    support: {
      installTitle: "Installation et téléchargements",
      installSteps: [
        "Sélectionnez le fichier adapté à votre système d’exploitation sur la page du produit.",
        "Votre navigateur gère l’emplacement d’enregistrement ; retrouvez le fichier dans la liste des téléchargements.",
        "Comparez l’empreinte SHA-256 avec celle indiquée sur la page du produit lorsqu’elle est disponible, puis suivez les instructions d’installation.",
      ],
      faqTitle: "Questions fréquentes",
    },
    contact: {
      issueTitle: "Problème technique ou retour produit",
      issueP1:
        "Utilisez l’espace Issues du dépôt GitHub existant. Indiquez le nom du produit, la version, le système d’exploitation, les étapes pour reproduire le problème et le comportement attendu.",
      issueP2:
        "N’incluez jamais de mots de passe, clés d’accès, inventaires IP privés ou images clients dans des signalements publics. Masquez les informations sensibles sur vos captures d’écran.",
      issueCta: "Ouvrir GitHub Issues",
      privacyTitle: "Questions de confidentialité et mentions légales",
      privacyBody: "Adresses de contact mentionnées dans notre politique de confidentialité et nos conditions d’utilisation :",
    },
  },
  it: {
    eyebrow: { about: "Chi siamo", support: "Aiuto e supporto", contact: "Contatti" },
    titles: {
      about: "Tutto inizia dalla comprensione.",
      support: "Un passo successivo chiaro.",
      contact: "Restiamo in contatto.",
    },
    subtitle: "IPScans — strumenti di rete, informazioni sui prodotti e risorse di supporto.",
    about: {
      storyTitle: "Visibilità. Contesto. Controllo.",
      storyP1:
        "IPScans unisce ricerca IP, DNS, WHOIS, controllo porte e misurazione della connessione con strumenti di rete desktop. Capire come è stato ottenuto un risultato conta quanto il risultato stesso.",
      storyP2:
        "IPscans+ gira su Windows per il rilevamento della rete locale. IPCast offre connessioni desktop remoto con identità del dispositivo e approvazione dell’accesso. LPR Pro è una versione di valutazione per il riconoscimento targhe locale. Ogni prodotto documenta capacità e limiti nella propria pagina.",
      limitsEyebrow: "Desktop e Web",
      limitsTitle: "Conoscere i limiti di un risultato.",
      limitsBody:
        "Un browser non può scansionare direttamente la LAN. La geolocalizzazione IP non è un indirizzo civico preciso. Uno speed test misura il trasferimento istantaneo tra il browser e l’endpoint di test. Prendi decisioni tenendo conto di questo contesto.",
      exploreCta: "Esplora i prodotti",
    },
    support: {
      installTitle: "Installazione e download",
      installSteps: [
        "Seleziona il file appropriato per il tuo sistema operativo nella pagina del prodotto.",
        "Il browser gestisce la cartella di salvataggio; trova il file nell’elenco dei download.",
        "Confronta il checksum SHA-256 con quello indicato nella pagina del prodotto quando disponibile, quindi segui le istruzioni di installazione.",
      ],
      faqTitle: "Domande frequenti",
    },
    contact: {
      issueTitle: "Problema tecnico o feedback sul prodotto",
      issueP1:
        "Utilizza la sezione Issues del repository GitHub esistente. Includi nome del prodotto, versione, sistema operativo, passaggi per riprodurre il problema e comportamento previsto.",
      issueP2:
        "Non inserire password, chiavi di accesso, inventari IP privati o filmati dei clienti nelle segnalazioni pubbliche. Rimuovi i dati sensibili dagli screenshot.",
      issueCta: "Apri GitHub Issues",
      privacyTitle: "Domande su privacy e note legali",
      privacyBody: "Indirizzi di contatto indicati nella nostra informativa sulla privacy e nei termini di servizio:",
    },
  },
  pt: {
    eyebrow: { about: "Sobre nós", support: "Ajuda e suporte", contact: "Contacto" },
    titles: {
      about: "Começa por compreender.",
      support: "Um próximo passo claro.",
      contact: "Mantenha-se em contacto.",
    },
    subtitle: "IPScans — ferramentas de rede, informação de produtos e recursos de ajuda.",
    about: {
      storyTitle: "Visibilidade. Contexto. Controlo.",
      storyP1:
        "O IPScans reúne consulta de IP, DNS, WHOIS, verificação de portas e medição de ligação com ferramentas de rede para computador. Compreender como um resultado foi obtido é tão importante como ver o resultado.",
      storyP2:
        "O IPscans+ corre em Windows para descoberta de rede local. O IPCast fornece ligações de ambiente de trabalho remoto com identidade do dispositivo e aprovação de acesso. O LPR Pro é uma versão de avaliação para reconhecimento local de matrículas. Cada produto documenta as suas capacidades e limites na respetiva página.",
      limitsEyebrow: "Ambiente de trabalho e Web",
      limitsTitle: "Conheça os limites de um resultado.",
      limitsBody:
        "Um navegador não consegue analisar diretamente a sua rede local. A geolocalização IP não é uma morada física exata. Um teste de velocidade mede a transferência atual entre o navegador e o servidor de teste. Tome decisões com esse contexto.",
      exploreCta: "Explorar produtos",
    },
    support: {
      installTitle: "Instalação e transferências",
      installSteps: [
        "Selecione o ficheiro adequado para o seu sistema operativo na página do produto.",
        "O seu navegador controla a localização onde o ficheiro é guardado; encontre-o na lista de transferências.",
        "Compare a soma SHA-256 com a indicada na página do produto quando disponível e siga as instruções de instalação.",
      ],
      faqTitle: "Perguntas frequentes",
    },
    contact: {
      issueTitle: "Problema técnico ou comentários sobre produtos",
      issueP1:
        "Utilize a área Issues do repositório GitHub existente. Inclua o nome do produto, versão, sistema operativo, passos para reproduzir e comportamento esperado.",
      issueP2:
        "Não inclua palavras-passe, chaves de acesso, inventários privados de IP ou imagens de clientes em relatórios públicos. Remova informações sensíveis das capturas de ecrã.",
      issueCta: "Abrir GitHub Issues",
      privacyTitle: "Questões de privacidade e legais",
      privacyBody: "Endereços de contacto indicados na nossa política de privacidade e termos de serviço:",
    },
  },
  nl: {
    eyebrow: { about: "Over ons", support: "Hulp & ondersteuning", contact: "Contact" },
    titles: {
      about: "Het begint met begrijpen.",
      support: "Een duidelijke volgende stap.",
      contact: "Blijf in contact.",
    },
    subtitle: "IPScans — netwerktools, productinformatie en hulpbronnen.",
    about: {
      storyTitle: "Zichtbaarheid. Context. Controle.",
      storyP1:
        "IPScans brengt IP-lookup, DNS, WHOIS, poortcontrole en verbindingsmetingen samen met desktop-netwerktools. Begrijpen hoe een resultaat tot stand komt is net zo belangrijk als het resultaat zelf.",
      storyP2:
        "IPscans+ draait op Windows voor lokale netwerkontdekking. IPCast biedt extern bureaublad met apparaat-ID en toegangstoestemming. LPR Pro is een evaluatieversie voor lokale kentekenherkenning. Elk product beschrijft zijn mogelijkheden en beperkingen op een eigen pagina.",
      limitsEyebrow: "Desktop & Web",
      limitsTitle: "Ken de grenzen van een resultaat.",
      limitsBody:
        "Een browser kan je lokale netwerk niet rechtstreeks scannen. IP-geolocatie is geen exact woonadres. Een snelheidstest meet de huidige overdracht tussen je browser en het testpunt. Neem beslissingen met die context.",
      exploreCta: "Producten ontdekken",
    },
    support: {
      installTitle: "Installatie en downloads",
      installSteps: [
        "Kies op de productpagina het juiste bestand voor je besturingssysteem.",
        "Je browser bepaalt de opslaglocatie; zoek het bestand in de lijst met downloads.",
        "Vergelijk indien beschikbaar de SHA-256-controlewaarde met de productpagina en volg daarna de installatie-instructies.",
      ],
      faqTitle: "Veelgestelde vragen",
    },
    contact: {
      issueTitle: "Technisch probleem of productfeedback",
      issueP1:
        "Gebruik het onderdeel Issues van de bestaande GitHub-repository. Vermeld de productnaam, versie, het besturingssysteem, de stappen om het probleem te reproduceren en het verwachte gedrag.",
      issueP2:
        "Plaats geen wachtwoorden, toegangssleutels, privélijsten met IP-adressen of klantbeelden in openbare meldingen. Verwijder gevoelige gegevens uit schermafbeeldingen.",
      issueCta: "GitHub Issues openen",
      privacyTitle: "Vragen over privacy en voorwaarden",
      privacyBody: "Contactadressen vermeld in ons privacybeleid en onze gebruiksvoorwaarden:",
    },
  },
  pl: {
    eyebrow: { about: "O nas", support: "Pomoc i wsparcie", contact: "Kontakt" },
    titles: {
      about: "Zaczyna się od zrozumienia.",
      support: "Jasny kolejny krok.",
      contact: "Bądźmy w kontakcie.",
    },
    subtitle: "IPScans — narzędzia sieciowe, informacje o produktach i materiały pomocnicze.",
    about: {
      storyTitle: "Widoczność. Kontekst. Kontrola.",
      storyP1:
        "IPScans łączy wyszukiwanie IP, DNS, WHOIS, sprawdzanie portów i pomiary połączenia z desktopowymi narzędziami sieciowymi. Zrozumienie sposobu uzyskania wyniku jest równie ważne jak sam wynik.",
      storyP2:
        "IPscans+ działa w systemie Windows do wykrywania sieci lokalnej. IPCast zapewnia połączenia pulpitu zdalnego z identyfikacją urządzenia i zatwierdzaniem dostępu. LPR Pro służy do lokalnego rozpoznawania tablic rejestracyjnych. Każdy produkt opisuje swoje możliwości i ograniczenia na własnej stronie.",
      limitsEyebrow: "Desktop i Web",
      limitsTitle: "Poznaj granice wyniku.",
      limitsBody:
        "Przeglądarka nie może bezpośrednio przeskanować sieci LAN. Geolokalizacja IP nie jest dokładnym adresem pocztowym. Test prędkości mierzy bieżący transfer między przeglądarką a punktem testowym. Podejmuj decyzje z uwzględnieniem tego kontekstu.",
      exploreCta: "Poznaj produkty",
    },
    support: {
      installTitle: "Instalacja i pobieranie",
      installSteps: [
        "Wybierz odpowiedni plik dla swojego systemu operacyjnego na stronie produktu.",
        "Przeglądarka zarządza miejscem zapisu; znajdź plik na liście pobranych plików.",
        "Porównaj sumę kontrolną SHA-256 z wartością podaną na stronie produktu, a następnie postępuj zgodnie z instrukcją instalacji.",
      ],
      faqTitle: "Najczęstsze pytania",
    },
    contact: {
      issueTitle: "Problem techniczny lub opinia o produkcie",
      issueP1:
        "Skorzystaj z sekcji Issues w repozytorium GitHub. Podaj nazwę produktu, wersję, system operacyjny, kroki prowadzące do wystąpienia problemu oraz oczekiwane działanie.",
      issueP2:
        "Nie umieszczaj haseł, kluczy dostępu, prywatnych spisów adresów IP ani nagrań klientów w publicznych zgłoszeniach. Usuń poufne informacje ze zrzutów ekranu.",
      issueCta: "Otwórz GitHub Issues",
      privacyTitle: "Pytania dotyczące prywatności i kwestii prawnych",
      privacyBody: "Adresy kontaktowe wskazane w polityce prywatności i warunkach korzystania z usługi:",
    },
  },
  ru: {
    eyebrow: { about: "О нас", support: "Помощь и поддержка", contact: "Контакты" },
    titles: {
      about: "Всё начинается с понимания.",
      support: "Понятный следующий шаг.",
      contact: "Оставайтесь на связи.",
    },
    subtitle: "IPScans — сетевые инструменты, документация по продуктам и справочные материалы.",
    about: {
      storyTitle: "Видимость. Контекст. Контроль.",
      storyP1:
        "IPScans объединяет проверку IP, DNS, WHOIS, портов и измерение скорости соединения с настольными сетевыми инструментами. Понимать, как именно получен результат, не менее важно, чем видеть сам результат.",
      storyP2:
        "IPscans+ работает в Windows для обнаружения устройств в локальной сети. IPCast обеспечивает удалённый рабочий стол с идентификацией устройства и подтверждением доступа. LPR Pro предназначен для локального распознавания номерных знаков. Возможности и ограничения каждого продукта описаны на его странице.",
      limitsEyebrow: "ПК и веб",
      limitsTitle: "Знайте границы каждого результата.",
      limitsBody:
        "Браузер не может напрямую сканировать локальную сеть. Геолокация по IP не даёт точного почтового адреса. Тест скорости измеряет текущую передачу данных между браузером и тестовым узлом. Принимайте решения с учётом этого контекста.",
      exploreCta: "Смотреть продукты",
    },
    support: {
      installTitle: "Установка и загрузка",
      installSteps: [
        "Выберите подходящий файл для вашей операционной системы на странице продукта.",
        "Место сохранения файла определяет браузер; найдите скачанный файл в списке загрузок.",
        "При наличии сверьте контрольную сумму SHA-256 со значением на странице продукта и следуйте инструкциям по установке.",
      ],
      faqTitle: "Частые вопросы",
    },
    contact: {
      issueTitle: "Техническая проблема или отзыв о продукте",
      issueP1:
        "Используйте раздел Issues в репозитории GitHub. Укажите название продукта, версию, операционную систему, шаги для воспроизведения и ожидаемое поведение.",
      issueP2:
        "Не публикуйте пароли, ключи доступа, закрытые списки IP-адресов или видеозаписи клиентов в открытых обращениях. Удаляйте конфиденциальные данные со скриншотов.",
      issueCta: "Открыть GitHub Issues",
      privacyTitle: "Вопросы конфиденциальности и правовая информация",
      privacyBody: "Контактные адреса, указанные в политике конфиденциальности и условиях использования:",
    },
  },
  ar: {
    eyebrow: { about: "من نحن", support: "المساعدة والدعم", contact: "اتصل بنا" },
    titles: {
      about: "يبدأ الأمر بفهم الشبكة.",
      support: "خطوة تالية واضحة.",
      contact: "لنبْقَ على تواصل.",
    },
    subtitle: "IPScans — أدوات الشبكة ومعلومات المنتجات وموارد المساعدة.",
    about: {
      storyTitle: "رؤية. سياق. تحكّم.",
      storyP1:
        "تجمع IPScans بين فحص IP وDNS وWHOIS وفحص المنافذ وقياس الاتصال وأدوات الشبكة المكتبية. فهم كيفية الوصول إلى النتيجة لا يقل أهمية عن رؤية النتيجة نفسها.",
      storyP2:
        "يعمل IPscans+ على نظام Windows لاكتشاف الشبكة المحلية. ويوفر IPCast اتصال سطح مكتب بعيد مع هوية الجهاز والموافقة على الوصول. ويقدم LPR Pro إصدارًا تقييميًا للتعرف المحلي على اللوحات ومراجعة السجلات. يوضّح كل منتج إمكاناته وحدوده في صفحته الخاصة.",
      limitsEyebrow: "سطح المكتب والويب",
      limitsTitle: "اعرف حدود كل نتيجة.",
      limitsBody:
        "لا يستطيع المتصفح فحص شبكتك المحلية مباشرةً. الموقع الجغرافي لعنوان IP ليس عنوان شارع دقيقًا. يقيس اختبار السرعة النقل الحالي بين متصفحك ونقطة الاختبار. اتخذ قراراتك في ضوء هذا السياق.",
      exploreCta: "استكشف المنتجات",
    },
    support: {
      installTitle: "التثبيت والتنزيلات",
      installSteps: [
        "اختر الملف المناسب لنظام التشغيل لديك من صفحة المنتج.",
        "يتحكم متصفحك بمكان الحفظ؛ اعثر على الملف في قائمة التنزيلات.",
        "قارن قيمة التحقق SHA-256 بالقيمة المعروضة في صفحة المنتج عند توفرها، ثم اتبع إرشادات التثبيت.",
      ],
      faqTitle: "الأسئلة الشائعة",
    },
    contact: {
      issueTitle: "مشكلة تقنية أو ملاحظات حول المنتج",
      issueP1:
        "استخدم قسم Issues في مستودع GitHub الحالي. أضف اسم المنتج والإصدار ونظام التشغيل وخطوات تكرار المشكلة والسلوك المتوقع.",
      issueP2:
        "لا تُدرج كلمات مرور أو مفاتيح وصول أو قوائم IP خاصة أو لقطات عملاء في البلاغات العامة. أزل المعلومات الحساسة من لقطات الشاشة.",
      issueCta: "فتح GitHub Issues",
      privacyTitle: "أسئلة الخصوصية والشؤون القانونية",
      privacyBody: "عناوين التواصل المذكورة في سياسة الخصوصية وشروط الخدمة:",
    },
  },
  ja: {
    eyebrow: { about: "私たちについて", support: "ヘルプとサポート", contact: "お問い合わせ" },
    titles: {
      about: "すべては理解することから始まります。",
      support: "明確な次のステップ。",
      contact: "お問い合わせ先。",
    },
    subtitle: "IPScans — ネットワークツール、製品ドキュメント、サポート情報。",
    about: {
      storyTitle: "可視性。文脈。コントロール。",
      storyP1:
        "IPScans は IP 検索、DNS、WHOIS、ポート確認、接続測定とデスクトップ向けネットワークツールをひとつにまとめています。結果そのものだけでなく、その結果がどのように得られたかを理解することが重要です。",
      storyP2:
        "IPscans+ は Windows 上でローカルネットワーク探索を行います。IPCast はデバイス ID とアクセス承認によるリモートデスクトップ接続を提供します。LPR Pro はローカルでのナンバープレート認識と記録確認のための評価版です。各製品の機能と制限はそれぞれの製品ページに記載されています。",
      limitsEyebrow: "デスクトップ & ウェブ",
      limitsTitle: "測定結果の限界を知る。",
      limitsBody:
        "ブラウザから LAN を直接スキャンすることはできません。IP 位置情報は正確な住所ではありません。速度テストはブラウザとテスト拠点間のその時点の転送速度を測定します。この前提を踏まえて判断してください。",
      exploreCta: "製品を見る",
    },
    support: {
      installTitle: "インストールとダウンロード",
      installSteps: [
        "製品ページでお使いの OS に適したファイルを選択します。",
        "保存先はブラウザが管理します。ダウンロード一覧からファイルを確認してください。",
        "SHA-256 チェックサムが記載されている場合は製品ページの値と照合し、手順に従ってインストールしてください。",
      ],
      faqTitle: "よくある質問",
    },
    contact: {
      issueTitle: "技術的な問題や製品へのフィードバック",
      issueP1:
        "GitHub リポジトリの Issues をご利用ください。製品名、バージョン、OS、再現手順、期待される動作を記載してください。",
      issueP2:
        "公開レポートにはパスワード、アクセスキー、非公開 IP 一覧、顧客の映像を含めないでください。スクリーンショットから機密情報を除外してください。",
      issueCta: "GitHub Issues を開く",
      privacyTitle: "プライバシーおよび法務に関するお問い合わせ",
      privacyBody: "プライバシーポリシーおよび利用規約に記載されている連絡先アドレス：",
    },
  },
  ko: {
    eyebrow: { about: "소개", support: "도움말 및 지원", contact: "문의하기" },
    titles: {
      about: "네트워크를 이해하는 것에서 시작합니다.",
      support: "명확한 다음 단계.",
      contact: "언제든 소통하세요.",
    },
    subtitle: "IPScans — 네트워크 도구, 제품 정보 및 지원 리소스.",
    about: {
      storyTitle: "가시성. 맥락. 제어.",
      storyP1:
        "IPScans는 IP 조회, DNS, WHOIS, 포트 확인 및 연결 측정을 데스크톱 네트워크 도구와 하나로 결합합니다. 결과를 확인하는 것만큼 그 결과가 어떻게 도출되었는지 이해하는 것도 중요합니다.",
      storyP2:
        "IPscans+는 로컬 네트워크 탐색을 위해 Windows에서 실행됩니다. IPCast는 장치 ID와 접근 승인을 통한 원격 데스크톱 연결을 제공합니다. LPR Pro는 로컬 차량 번호판 인식 및 기록 검토를 위한 평가판입니다. 각 제품의 기능과 한계는 해당 제품 페이지에 안내되어 있습니다.",
      limitsEyebrow: "데스크톱 및 웹",
      limitsTitle: "결과의 한계를 이해하세요.",
      limitsBody:
        "브라우저는 로컬 LAN을 직접 스캔할 수 없습니다. IP 위치 정보는 정확한 도로명 주소가 아닙니다. 속도 테스트는 브라우저와 테스트 서버 간의 현재 전송 속도를 측정합니다. 이러한 맥락을 바탕으로 판단하세요.",
      exploreCta: "제품 살펴보기",
    },
    support: {
      installTitle: "설치 및 다운로드",
      installSteps: [
        "제품 페이지에서 운영 체제에 맞는 파일을 선택하세요.",
        "저장 위치는 브라우저에서 관리합니다. 다운로드 목록에서 파일을 찾으세요.",
        "제품 페이지에 SHA-256 체크섬이 제공되는 경우 값을 비교한 뒤 설치 안내를 따르세요.",
      ],
      faqTitle: "자주 묻는 질문",
    },
    contact: {
      issueTitle: "기술 문제 또는 제품 피드백",
      issueP1:
        "공식 GitHub 저장소의 Issues 영역을 이용해 주세요. 제품 이름, 버전, 운영 체제, 재현 단계 및 예상 동작을 함께 적어 주세요.",
      issueP2:
        "공개 보고서에는 비밀번호, 액세스 키, 내부 IP 목록 또는 고객 영상을 포함하지 마세요. 스크린샷에서 민감한 정보를 제거해 주세요.",
      issueCta: "GitHub Issues 열기",
      privacyTitle: "개인정보 및 법적 문의",
      privacyBody: "개인정보처리방침 및 서비스 약관에 안내된 연락처 이메일:",
    },
  },
  zh: {
    eyebrow: { about: "关于我们", support: "帮助与支持", contact: "联系我们" },
    titles: {
      about: "一切始于理解网络。",
      support: "清晰的下一步。",
      contact: "保持联系。",
    },
    subtitle: "IPScans — 网络工具、产品文档与支持资源。",
    about: {
      storyTitle: "可见性。上下文。掌控力。",
      storyP1:
        "IPScans 将 IP 查询、DNS、WHOIS、端口检测和连接测量与桌面网络工具结合在一起。理解结果的产生方式与看到结果本身同样重要。",
      storyP2:
        "IPscans+ 在 Windows 上运行以实现本地网络发现。IPCast 提供基于设备身份与访问审批的远程桌面连接。LPR Pro 是用于本地车牌识别与记录审查的评估版本。每款产品都在各自页面中说明了其功能与限制。",
      limitsEyebrow: "桌面与网页",
      limitsTitle: "了解测量结果的边界。",
      limitsBody:
        "浏览器无法直接扫描局域网。IP 地理位置并非精确的街道地址。测速工具测量的是浏览器与测试节点之间的当前传输速率。请结合这些背景做出判断。",
      exploreCta: "探索产品",
    },
    support: {
      installTitle: "安装与下载",
      installSteps: [
        "在产品页面选择适合您操作系统的文件。",
        "保存位置由浏览器控制，请在下载列表中找到该文件。",
        "如有提供，请将文件的 SHA-256 校验值与产品页面核对，然后按照说明完成安装。",
      ],
      faqTitle: "常见问题",
    },
    contact: {
      issueTitle: "技术问题或产品反馈",
      issueP1:
        "请使用现有 GitHub 仓库中的 Issues 区域。请附上产品名称、版本、操作系统、复现步骤以及预期行为。",
      issueP2:
        "请勿在公开报告中包含密码、访问密钥、内部 IP 清单或客户画面。上传截图前请抹去敏感信息。",
      issueCta: "打开 GitHub Issues",
      privacyTitle: "隐私与法律咨询",
      privacyBody: "我们的隐私政策与服务条款中列出的联系邮箱：",
    },
  },
};
