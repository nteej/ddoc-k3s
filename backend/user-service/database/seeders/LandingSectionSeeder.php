<?php

namespace Database\Seeders;

use App\Models\LandingSection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class LandingSectionSeeder extends Seeder
{
    public function run(): void
    {
        if (LandingSection::count() > 0) {
            $this->command->info('Landing sections already seeded, skipping.');
            return;
        }

        $sections = [
            // 0 — Hero
            [
                'id'            => Str::uuid(),
                'type'          => 'hero',
                'sort_order'    => 0,
                'is_active'     => true,
                'heading_en'    => 'Generate Documents at Scale',
                'heading_fi'    => 'Luo asiakirjoja tehokkaasti',
                'heading_sv'    => 'Generera dokument i stor skala',
                'subheading_en' => 'Create reusable templates with dynamic fields. Preview documents live as you type, then generate professional PDFs — instantly, in bulk, or via API.',
                'subheading_fi' => 'Rakenna uudelleenkäytettäviä mallipohjia dynaamisilla kentillä. Esikatsele asiakirjoja reaaliajassa kirjoittaessasi ja luo PDF-tiedostoja — yksittäin, eränä tai API:n kautta.',
                'subheading_sv' => 'Skapa återanvändbara mallar med dynamiska fält. Förhandsgranska dokument live medan du skriver och generera professionella PDF-filer — direkt, i batch eller via API.',
                'items_en'      => null,
                'items_fi'      => null,
                'items_sv'      => null,
                'config'        => [
                    'ctaStart' => '/signup',
                    'ctaSignIn' => '/login',
                    'badge'    => 'v2.0.0 is live · Enterprise SSO · Live preview · API keys',
                ],
            ],

            // 1 — Wizard
            [
                'id'            => Str::uuid(),
                'type'          => 'wizard',
                'sort_order'    => 1,
                'is_active'     => true,
                'heading_en'    => 'Create Your Social Media Post',
                'heading_fi'    => 'Luo sosiaalisen median julkaisusi',
                'heading_sv'    => 'Skapa ditt inlägg för sociala medier',
                'subheading_en' => 'Pick a template, customise it, and download.',
                'subheading_fi' => 'Valitse mallipohja, muokkaa sitä ja lataa.',
                'subheading_sv' => 'Välj en mall, anpassa den och ladda ner.',
                'items_en'      => null,
                'items_fi'      => null,
                'items_sv'      => null,
                'config'        => null,
            ],

            // 2 — Features
            [
                'id'            => Str::uuid(),
                'type'          => 'features',
                'sort_order'    => 2,
                'is_active'     => true,
                'heading_en'    => 'Everything you need',
                'heading_fi'    => 'Kaikki mitä tarvitset',
                'heading_sv'    => 'Allt du behöver',
                'subheading_en' => 'A complete platform for document automation — from template creation to live preview, bulk generation, and email delivery.',
                'subheading_fi' => 'Täydellinen alusta asiakirja-automaatioon — mallipohjien luomisesta reaaliaikaiseen esikatseluun, massatuotantoon ja sähköpostitoimitukseen.',
                'subheading_sv' => 'En komplett plattform för dokumentautomation — från mallskapande till liveförhandsgranskning, massvis generering och e-postleverans.',
                'items_en'      => [
                    ['title' => 'Template Builder',    'description' => 'Build rich document templates with a WYSIWYG editor. Add sections, reorder them with drag-and-drop, and reuse sections across multiple templates.'],
                    ['title' => 'Dynamic Fields',      'description' => 'Define typed fields (text, number, date, select, email, long text) and embed them as placeholders. Configure and fill them all from the Generate page.'],
                    ['title' => 'Async PDF Generation','description' => "Queue documents for async PDF generation. Get notified when they're ready and download them directly from the app — no waiting around."],
                    ['title' => 'Batch Processing',    'description' => 'Upload an Excel spreadsheet and generate one PDF per row across any number of templates — in a single operation.'],
                    ['title' => 'REST API',             'description' => 'Integrate document generation into your own workflows via a clean REST API. Full documentation is built into the app.'],
                    ['title' => 'Multi-language UI',   'description' => 'The interface is available in English, Finnish and Swedish. Language preference is saved automatically.'],
                    ['title' => 'Live PDF Preview',    'description' => 'See the document update in real time as you fill in each field. Unfilled placeholders are highlighted so nothing gets missed before generating.'],
                    ['title' => 'API Key Access',      'description' => 'Generate and manage API keys for programmatic document generation. Integrate DDoc into any workflow without session-based authentication.'],
                    ['title' => 'Email Delivery',      'description' => 'Send generated PDFs directly from the app to any email address. Powered by Kafka for reliable async delivery.'],
                ],
                'items_fi'      => [
                    ['title' => 'Mallipohjan luonti',      'description' => 'Rakenna monipuolisia mallipohjia WYSIWYG-editorilla. Lisää osioita, järjestä ne uudelleen vetämällä ja käytä niitä uudelleen eri mallipohjissa.'],
                    ['title' => 'Dynaamiset kentät',       'description' => 'Määrittele kirjoitetut kentät (teksti, numero, päivämäärä, valinta, sähköposti, pitkä teksti) paikkamerkeiksi. Konfiguroi ja täytä kaikki Luo-sivulta.'],
                    ['title' => 'Asynkroninen PDF-luonti', 'description' => 'Jonota asiakirjat asynkroniseen PDF-luontiin. Saat ilmoituksen kun ne ovat valmiita ja voit ladata ne suoraan sovelluksesta.'],
                    ['title' => 'Eräkäsittely',            'description' => 'Lataa Excel-taulukko ja luo yksi PDF per rivi mille tahansa mallipohjalle — yhdellä operaatiolla.'],
                    ['title' => 'REST API',                'description' => 'Integroi asiakirjojen luonti omiin työnkulkuihisi selkeän REST API:n kautta. Täydellinen dokumentaatio on sisäänrakennettuna sovellukseen.'],
                    ['title' => 'Monikielinen käyttöliittymä', 'description' => 'Käyttöliittymä on saatavilla englanniksi, suomeksi ja ruotsiksi. Kielivalinta tallennetaan automaattisesti.'],
                    ['title' => 'Reaaliaikainen esikatselu', 'description' => 'Näe asiakirjan päivittyvän reaaliajassa kun täytät kenttiä. Täyttämättömät paikkamerkit korostetaan, jotta mikään ei jää puuttumaan.'],
                    ['title' => 'API-avainpääsy',          'description' => 'Luo ja hallitse API-avaimia ohjelmalliseen asiakirjojen luontiin. Integroi DDoc mihin tahansa työnkulkuun ilman istuntopohjaista autentikointia.'],
                    ['title' => 'Sähköpostitoimitus',      'description' => 'Lähetä luodut PDF-tiedostot suoraan sovelluksesta mihin tahansa sähköpostiosoitteeseen. Powered by Kafka luotettavaan asynkroniseen toimitukseen.'],
                ],
                'items_sv'      => [
                    ['title' => 'Mallbyggare',             'description' => 'Bygg innehållsrika dokumentmallar med en WYSIWYG-redigerare. Lägg till avsnitt, ordna om dem med dra-och-släpp och återanvänd avsnitt i flera mallar.'],
                    ['title' => 'Dynamiska fält',          'description' => 'Definiera typade fält (text, nummer, datum, välj, e-post, lång text) och bädda in dem som platshållare. Konfigurera och fyll i allt från genereringssidan.'],
                    ['title' => 'Asynkron PDF-generering', 'description' => 'Köa dokument för asynkron PDF-generering. Få notis när de är klara och ladda ner dem direkt från appen — utan att vänta.'],
                    ['title' => 'Batchbearbetning',        'description' => 'Ladda upp ett Excel-kalkylblad och generera en PDF per rad för valfritt antal mallar — i en enda operation.'],
                    ['title' => 'REST API',                'description' => 'Integrera dokumentgenerering i dina egna arbetsflöden via ett välstrukturerat REST API. Fullständig dokumentation är inbyggd i appen.'],
                    ['title' => 'Flerspråkigt gränssnitt', 'description' => 'Gränssnittet finns på engelska, finska och svenska. Språkinställningen sparas automatiskt.'],
                    ['title' => 'Live PDF-förhandsgranskning', 'description' => 'Se dokumentet uppdateras i realtid när du fyller i varje fält. Ofyllda platshållare markeras så att inget missas innan generering.'],
                    ['title' => 'API-nyckelåtkomst',       'description' => 'Generera och hantera API-nycklar för programmatisk dokumentgenerering. Integrera DDoc i vilket arbetsflöde som helst utan sessionsbaserad autentisering.'],
                    ['title' => 'E-postleverans',          'description' => 'Skicka genererade PDF-filer direkt från appen till valfri e-postadress. Powered by Kafka för pålitlig asynkron leverans.'],
                ],
                'config'        => null,
            ],

            // 3 — How it works
            [
                'id'            => Str::uuid(),
                'type'          => 'how_it_works',
                'sort_order'    => 3,
                'is_active'     => true,
                'heading_en'    => 'How it works',
                'heading_fi'    => 'Näin se toimii',
                'heading_sv'    => 'Så här fungerar det',
                'subheading_en' => 'From template to finished document in three simple steps.',
                'subheading_fi' => 'Mallipohjasta valmiiseen asiakirjaan kolmessa yksinkertaisessa vaiheessa.',
                'subheading_sv' => 'Från mall till färdigt dokument i tre enkla steg.',
                'items_en'      => [
                    ['title' => 'Build a Template',   'description' => 'Create a template, add sections with your HTML content, and insert dynamic placeholders like #CLIENT_NAME# or #CONTRACT_DATE#.'],
                    ['title' => 'Configure Fields',   'description' => 'Open the Generate page and go to the Fields tab. Register your tags with types and contexts — they instantly appear as typed form fields with a live preview alongside.'],
                    ['title' => 'Generate & Share',   'description' => 'Fill in the field values, preview the result live, then click Generate. Documents are queued and processed asynchronously — download them or send directly via email.'],
                ],
                'items_fi'      => [
                    ['title' => 'Luo mallipohja',    'description' => 'Luo mallipohja, lisää osioita HTML-sisällöllä ja aseta dynaamiset paikkamerkit kuten #ASIAKKAAN_NIMI# tai #SOPIMUSPÄIVÄ#.'],
                    ['title' => 'Konfiguroi kentät', 'description' => 'Avaa Luo-sivu ja siirry Kentät-välilehdelle. Rekisteröi tunnisteet tyyppeineen ja konteksteineen — ne näkyvät heti tyypitettyinä kenttinä reaaliaikaisen esikatselun rinnalla.'],
                    ['title' => 'Luo ja jaa',        'description' => 'Täytä kenttien arvot, esikatsele tulosta reaaliajassa ja napsauta Luo. Asiakirjat jonottuvat ja käsitellään asynkronisesti — lataa ne tai lähetä suoraan sähköpostilla.'],
                ],
                'items_sv'      => [
                    ['title' => 'Bygg en mall',      'description' => 'Skapa en mall, lägg till avsnitt med ditt HTML-innehåll och infoga dynamiska platshållare som #KLIENT_NAMN# eller #AVTALSDATUM#.'],
                    ['title' => 'Konfigurera fält',  'description' => 'Öppna genereringssidan och gå till fliken Fält. Registrera dina taggar med typer och kontexter — de visas omedelbart som typade formulärfält med liveförhandsgranskning bredvid.'],
                    ['title' => 'Generera & dela',   'description' => 'Fyll i fältvärdena, förhandsgranska resultatet live och klicka på Generera. Dokument köas och bearbetas asynkront — ladda ner dem eller skicka direkt via e-post.'],
                ],
                'config'        => null,
            ],

            // 4 — CTA Banner
            [
                'id'            => Str::uuid(),
                'type'          => 'cta_banner',
                'sort_order'    => 4,
                'is_active'     => true,
                'heading_en'    => 'Ready to automate your documents?',
                'heading_fi'    => 'Valmis automatisoimaan asiakirjasi?',
                'heading_sv'    => 'Redo att automatisera dina dokument?',
                'subheading_en' => 'Create your account and start generating professional PDFs today.',
                'subheading_fi' => 'Luo tilisi ja aloita ammattimaisten PDF-tiedostojen luominen tänään.',
                'subheading_sv' => 'Skapa ditt konto och börja generera professionella PDF-filer idag.',
                'items_en'      => null,
                'items_fi'      => null,
                'items_sv'      => null,
                'config'        => [
                    'buttonText' => 'Create Free Account',
                    'buttonUrl'  => '/signup',
                ],
            ],
        ];

        foreach ($sections as $data) {
            LandingSection::create($data);
        }

        $this->command->info('Landing sections seeded successfully.');
    }
}
