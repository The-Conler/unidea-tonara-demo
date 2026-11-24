/* UNIdea Tonara – DEMO. Dati FINTI generati al primo avvio (o dopo "Reset demo").
   Nessuna persona reale: nomi, codici fiscali, email e telefoni sono inventati. */
window.UNIDEA_SEED = function () {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  function iso(d) { var z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
  function addDays(n) { var d = new Date(today); d.setDate(d.getDate() + n); return d; }
  // prossimo giorno della settimana (1=lun..5=ven) partendo da "today + offset"
  function weekday(offset, wd) { var d = addDays(offset); while (d.getDay() !== wd) d.setDate(d.getDate() + 1); return iso(d); }
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }

  var nomiF = ["Maria", "Giovanna", "Antonia", "Rita", "Paola", "Franca", "Graziella", "Lucia", "Sara", "Elisa", "Giulia", "Martina", "Rosa", "Teresa", "Caterina"];
  var nomiM = ["Giovanni", "Antonio", "Salvatore", "Francesco", "Giuseppe", "Mario", "Pietro", "Luca", "Marco", "Andrea", "Paolo", "Efisio", "Gavino", "Matteo"];
  var cognomi = ["Pirisi", "Loi", "Sedda", "Demuro", "Mura", "Floris", "Pinna", "Melis", "Porcu", "Sanna", "Piras", "Serra", "Cocco", "Carta", "Fadda", "Deiana", "Ladu", "Murgia", "Usai", "Contu", "Mameli", "Atzeni", "Cabras", "Zedda", "Puddu", "Orrù", "Lai", "Satta", "Medda", "Tola"];
  var L = "ABCDEFGHLMNPRSTVZ";
  function fakeCF() { var s = ""; for (var i = 0; i < 6; i++) s += pick(L.split("")); s += String(40 + Math.floor(rnd() * 60)); s += pick("ABCDEHLMPRST".split("")); s += String(10 + Math.floor(rnd() * 60)); s += "X" + String(100 + Math.floor(rnd() * 899)) + pick(L.split("")); return s; }

  var year = today.getMonth() >= 8 ? today.getFullYear() + 1 : today.getFullYear();
  var scadAttiva = year + "-09-30", scadScaduta = (year - 1) + "-09-30";
  var users = [];
  function addUser(o) {
    var n = users.length + 1;
    var u = Object.assign({
      id: "u" + n, tessera: "T-" + (year - 1) + "-" + String(n).padStart(4, "0"),
      email: (o.nome + "." + o.cognome).toLowerCase().replace(/[^a-z.]/g, "") + "@esempio.demo",
      tel: "+39 3" + String(40 + Math.floor(rnd() * 59)) + " " + String(1000000 + Math.floor(rnd() * 8999999)),
      cf: fakeCF(), nascita: (1938 + Math.floor(rnd() * 70)) + "-" + String(1 + Math.floor(rnd() * 12)).padStart(2, "0") + "-" + String(1 + Math.floor(rnd() * 27)).padStart(2, "0"),
      indirizzo: "Via Demo " + (1 + Math.floor(rnd() * 80)) + ", 08039 Tonara (NU)",
      livello: pick(["Base", "Base", "Attivo", "Attivo", "Sostenitore"]), stato: "attivo", quotaScadenza: scadAttiva,
      consImg: rnd() > 0.2, consNews: rnd() > 0.35, consVer: "v1.0", consData: iso(addDays(-200 + Math.floor(rnd() * 120))),
      ruolo: "socio", adesione: iso(addDays(-700 + Math.floor(rnd() * 600))), lingua: "IT", bio: ""
    }, o);
    users.push(u); return u;
  }
  // Personaggi della demo (uno per ruolo)
  addUser({ nome: "Maria", cognome: "Pirisi", nascita: "1952-04-11", livello: "Attivo", consImg: true, consNews: true, persona: "socio" });
  addUser({ nome: "Giovanni", cognome: "Loi", ruolo: "docente", nascita: "1961-02-03", persona: "docente", bio: "Ex insegnante di lettere, appassionato di storia locale e di tecnologia." });
  addUser({ nome: "Anna", cognome: "Sedda", ruolo: "moderatore", nascita: "1979-07-22", persona: "moderatore" });
  addUser({ nome: "Lucia", cognome: "Demuro", ruolo: "admin", nascita: "1968-10-15", persona: "admin" });
  addUser({ nome: "Sara", cognome: "Floris", ruolo: "docente", nascita: "1990-05-09", bio: "Insegnante di inglese, ha vissuto a Londra e Dublino." });
  addUser({ nome: "Efisio", cognome: "Porcu", ruolo: "docente", nascita: "1949-12-01", bio: "Artigiano tessitore, custode delle tecniche tradizionali di Tonara." });
  addUser({ nome: "Giulia", cognome: "Melis", ruolo: "docente", nascita: "1985-03-18", bio: "Istruttrice di ginnastica dolce e camminata." });
  for (var i = 0; i < 38; i++) {
    var f = rnd() > 0.45; addUser({ nome: f ? pick(nomiF) : pick(nomiM), cognome: pick(cognomi) });
  }
  // alcuni scaduti e due adesioni in attesa
  [9, 14, 21, 30, 37].forEach(function (k) { users[k].quotaScadenza = scadScaduta; users[k].stato = "scaduto"; });
  addUser({ nome: "Teresa", cognome: "Mameli", stato: "in attesa", tessera: "", adesione: iso(addDays(-2)), livello: "Base" });
  addUser({ nome: "Paolo", cognome: "Usai", stato: "in attesa", tessera: "", adesione: iso(addDays(-1)), livello: "Base" });

  var img = ["img/docenti.jpg", "img/diventa-socio.jpg", "img/chi-siamo.jpg", "img/insegna-con-noi.jpg", "img/hero-imparare-insieme.jpg", "img/statuto-valori.jpg", "img/sostienici.jpg"];
  var courses = [
    { id: "c1", titolo: "Smartphone senza paura", categoria: "Informatica", docenteId: "u2", giorno: "Giovedì", ora: "10:00", luogo: "Aula 2 – Sede UNIdea", lezioni: 8, posti: 15, inizio: weekday(-22, 4), costo: 0, img: img[1], stato: "pubblicato", livello: "Principianti", descr: "Impariamo a usare il telefono con calma: chiamate, WhatsApp, foto, videochiamate con i nipoti e come difendersi dalle truffe." },
    { id: "c2", titolo: "Inglese per viaggiare", categoria: "Lingue", docenteId: "u5", giorno: "Martedì", ora: "17:00", luogo: "Aula 1 – Sede UNIdea", lezioni: 12, posti: 12, inizio: weekday(-15, 2), costo: 0, img: img[0], stato: "pubblicato", livello: "Principianti", descr: "Le frasi che servono davvero in aeroporto, in albergo e al ristorante. Lezioni pratiche, con giochi di ruolo." },
    { id: "c3", titolo: "Storia della Barbagia", categoria: "Cultura e territorio", docenteId: "u2", giorno: "Venerdì", ora: "18:00", luogo: "Sala consiliare – Comune di Tonara", lezioni: 10, posti: 30, inizio: weekday(5, 5), costo: 0, img: img[2], stato: "pubblicato", livello: "Per tutti", descr: "Dai nuraghi ai giorni nostri: la storia di Tonara e dei paesi della Barbagia raccontata con documenti, foto d'epoca e testimonianze." },
    { id: "c4", titolo: "Laboratorio di tessitura", categoria: "Artigianato", docenteId: "u6", giorno: "Mercoledì", ora: "15:30", luogo: "Laboratorio – Via Demo 4", lezioni: 6, posti: 8, inizio: weekday(-8, 3), costo: 30, img: img[3], stato: "pubblicato", livello: "Per tutti", descr: "Al telaio con nonni e nipoti: le tecniche tradizionali della tessitura di Tonara. Il costo comprende i materiali." },
    { id: "c5", titolo: "Ginnastica dolce e camminata", categoria: "Benessere", docenteId: "u7", giorno: "Lunedì", ora: "09:30", luogo: "Palestra comunale", lezioni: 10, posti: 20, inizio: weekday(12, 1), costo: 0, img: img[4], stato: "pubblicato", livello: "Per tutti", descr: "Movimento leggero, respirazione e passeggiate nei sentieri intorno al paese, al ritmo di ciascuno." },
    { id: "c6", titolo: "Cucina tradizionale: il torrone", categoria: "Cultura e territorio", docenteId: "u6", giorno: "Sabato", ora: "10:00", luogo: "Cucina della Pro Loco", lezioni: 3, posti: 10, inizio: weekday(30, 6), costo: 15, img: img[6], stato: "bozza", livello: "Per tutti", descr: "Bozza – in preparazione: la ricetta del torrone di Tonara spiegata dai maestri torronai." },
    { id: "c0", titolo: "Smartphone senza paura (primavera)", categoria: "Informatica", docenteId: "u2", giorno: "Giovedì", ora: "10:00", luogo: "Aula 2 – Sede UNIdea", lezioni: 8, posti: 15, inizio: weekday(-230, 4), costo: 0, img: img[1], stato: "concluso", livello: "Principianti", descr: "Edizione conclusa." }
  ];
  courses.forEach(function (c) { c.annullate = []; });
  courses[0].annullate = [];

  var enr = [], eid = 1;
  function enroll(cid, uid, stato, extra) { enr.push(Object.assign({ id: "e" + (eid++), corsoId: cid, socioId: uid, stato: stato || "confermato", data: iso(addDays(-30)) }, extra || {})); }
  var pool = users.filter(function (u) { return u.ruolo === "socio" && u.stato === "attivo" && u.id !== "u1"; });
  function some(n, start) { return pool.slice(start, start + n).map(function (u) { return u.id; }); }
  enroll("c1", "u1"); some(12, 0).forEach(function (id) { enroll("c1", id); });
  some(11, 8).forEach(function (id) { enroll("c2", id); });          // 11/12 confermati: 1 posto liberato
  enroll("c2", "u1", "attesa", { data: iso(addDays(-6)) });          // Maria 1ª in lista d'attesa
  enroll("c2", pool[25].id, "attesa", { data: iso(addDays(-4)) });
  enroll("c3", "u1"); some(14, 5).forEach(function (id) { enroll("c3", id); });
  some(8, 18).forEach(function (id) { enroll("c4", id); });           // pieno
  enroll("c4", pool[2].id, "attesa", { data: iso(addDays(-3)) });
  some(9, 12).forEach(function (id) { enroll("c5", id); });
  enroll("c0", "u1"); some(10, 3).forEach(function (id) { enroll("c0", id); });

  // presenze: {corsoId: {lezioneIdx: [socioId,...]}}
  var pres = { c0: {}, c1: {}, c2: {}, c4: {} };
  function lessonsPast(c) { var n = 0; for (var k = 0; k < c.lezioni; k++) { var d = new Date(c.inizio); d.setDate(d.getDate() + 7 * k); if (d < today) n++; } return n; }
  ["c0", "c1", "c2", "c4"].forEach(function (cid) {
    var c = courses.filter(function (x) { return x.id === cid; })[0];
    var iscr = enr.filter(function (e) { return e.corsoId === cid && e.stato === "confermato"; }).map(function (e) { return e.socioId; });
    for (var k = 0; k < lessonsPast(c); k++) pres[cid][k] = iscr.filter(function (id, j) { return (id === "u1" && !(cid === "c0" && k === 3)) || ((j + k) % 5 !== 0); });
  });

  var news = [
    { id: "n1", titolo: "Aperte le iscrizioni all'anno " + (year - 1) + "/" + String(year).slice(2), testo: "Da oggi ci si può iscrivere ai nuovi corsi dall'Area soci o in segreteria, il martedì e il giovedì mattina. I posti sono limitati: chi non trova posto entra in lista d'attesa e viene avvisato via email.", data: iso(addDays(-20)), stato: "pubblicata", autore: "Anna Sedda" },
    { id: "n2", titolo: "Grazie a chi ha partecipato alla festa d'autunno", testo: "Oltre cento persone in piazza tra musica, castagne e il laboratorio di tessitura per i più piccoli. Le foto sono nell'archivio.", data: iso(addDays(-9)), stato: "pubblicata", autore: "Anna Sedda" },
    { id: "n3", titolo: "Nuovo corso: Storia della Barbagia", testo: "Il professor Giovanni Loi ci accompagna in dieci incontri alla scoperta della storia del nostro territorio. Si parte venerdì in sala consiliare.", data: iso(addDays(-3)), stato: "pubblicata", autore: "Lucia Demuro" },
    { id: "n4", titolo: "Bozza – Assemblea dei soci di dicembre", testo: "Testo in preparazione.", data: iso(addDays(0)), stato: "bozza", autore: "Anna Sedda" }
  ];
  var faq = [
    { id: "f1", q: "Chi può iscriversi ai corsi?", a: "Tutti i soci con la quota dell'anno in corso, di qualsiasi età. I minori si iscrivono con il consenso di un genitore." },
    { id: "f2", q: "Quanto costa diventare socio?", a: "La quota annuale è indicata nella pagina Diventa socio. Vale dal 1° ottobre al 30 settembre e dà accesso a tutti i corsi gratuiti." },
    { id: "f3", q: "Non sono pratico di computer: come mi iscrivo?", a: "Puoi passare in segreteria: ti iscriviamo noi. Online basta l'email: ricevi un link e sei dentro, senza password." },
    { id: "f4", q: "Cos'è la lista d'attesa?", a: "Se un corso è pieno entri in lista. Quando si libera un posto ti scriviamo e hai 48 ore per accettarlo." },
    { id: "f5", q: "Come ricevo l'attestato?", a: "Se frequenti almeno il 70% delle lezioni l'attestato compare nella tua Area soci, pronto da scaricare." }
  ];
  var gallery = [
    { id: "g1", titolo: "Festa d'autunno in piazza", corsoId: "", src: img[6], stato: "pubblicata", da: "Anna Sedda", data: iso(addDays(-9)) },
    { id: "g2", titolo: "Prima lezione di tessitura", corsoId: "c4", src: img[3], stato: "pubblicata", da: "Anna Sedda", data: iso(addDays(-7)) },
    { id: "g3", titolo: "In aula con lo smartphone", corsoId: "c1", src: img[1], stato: "pubblicata", da: "Anna Sedda", data: iso(addDays(-14)) },
    { id: "g4", titolo: "Incontro tra generazioni", corsoId: "", src: img[2], stato: "pubblicata", da: "Lucia Demuro", data: iso(addDays(-40)) },
    { id: "g5", titolo: "Lezione sulla storia locale", corsoId: "c1", src: img[0], stato: "in revisione", da: "Giovanni Loi", data: iso(addDays(-1)) }
  ];
  var videos = [{ id: "v1", titolo: "Festa d'autunno – il video", durata: "3:12" }, { id: "v2", titolo: "Presentazione dei corsi " + (year - 1) + "/" + String(year).slice(2), durata: "5:40" }];
  var materiali = [
    { id: "mt1", corsoId: "c1", nome: "Dispensa 1 – Le prime impostazioni.pdf", kb: 820, data: iso(addDays(-21)) },
    { id: "mt2", corsoId: "c1", nome: "Dispensa 2 – WhatsApp passo passo.pdf", kb: 1240, data: iso(addDays(-14)) },
    { id: "mt3", corsoId: "c3", nome: "Programma degli incontri.pdf", kb: 210, data: iso(addDays(-2)) }
  ];
  var messages = [
    { id: "ms1", nome: "Rosa Carta", email: "rosa.carta@esempio.demo", oggetto: "Iscrizione per mia madre", testo: "Buongiorno, mia madre vorrebbe iscriversi al corso di smartphone ma non ha l'email. Come possiamo fare?", data: iso(addDays(-1)), stato: "nuovo", risposta: "" },
    { id: "ms2", nome: "Marco Serra", email: "marco.serra@esempio.demo", oggetto: "Orari segreteria", testo: "La segreteria è aperta anche il sabato?", data: iso(addDays(-4)), stato: "risposto", risposta: "No, solo martedì e giovedì 9:30–12:30. Grazie!" }
  ];
  var proposte = [{ id: "p1", nome: "Caterina Atzeni", email: "caterina.atzeni@esempio.demo", titolo: "Fotografia con il telefono", testo: "Vorrei proporre 6 incontri su come fare belle foto con lo smartphone.", data: iso(addDays(-5)), stato: "nuova" }];
  var payments = [], pid = 1;
  users.forEach(function (u) {
    if (u.stato === "attivo") payments.push({ id: "pay" + pid, stripe: "pi_demo_" + (100000 + pid * 7919).toString(36), socioId: u.id, tipo: "Quota associativa", importo: 25, data: iso(addDays(-60 + (pid % 50))), stato: "Pagato" }), pid++;
  });
  enr.filter(function (e) { return e.corsoId === "c4" && e.stato === "confermato"; }).forEach(function (e) {
    payments.push({ id: "pay" + pid, stripe: "pi_demo_" + (100000 + pid * 7919).toString(36), socioId: e.socioId, tipo: "Corso: Laboratorio di tessitura", importo: 30, data: iso(addDays(-12)), stato: "Pagato" }); pid++;
  });
  payments.push({ id: "pay" + pid, stripe: "pi_demo_rimb1", socioId: pool[30].id, tipo: "Corso: Laboratorio di tessitura", importo: 30, data: iso(addDays(-10)), stato: "Rimborsato" });
  var donations = [
    { id: "d1", nome: "Maria Pirisi", socioId: "u1", email: "maria.pirisi@esempio.demo", importo: 20, data: iso(addDays(-40)), ricevuta: "R-" + (year - 1) + "-001", metodo: "Carta (Stripe)" },
    { id: "d2", nome: "Bar Centrale Tonara (demo)", socioId: "", email: "bar@esempio.demo", importo: 150, data: iso(addDays(-25)), ricevuta: "", metodo: "Carta (Stripe)" },
    { id: "d3", nome: "Antonio Murgia", socioId: "", email: "antonio.murgia@esempio.demo", importo: 50, data: iso(addDays(-6)), ricevuta: "", metodo: "Carta (Stripe)" }
  ];
  var docs = [
    { id: "doc1", categoria: "Bilanci / rendiconti", titolo: "Rendiconto per cassa " + (year - 2), file: "rendiconto_" + (year - 2) + ".pdf", data: iso(addDays(-200)) },
    { id: "doc2", categoria: "Verbali assemblee soci", titolo: "Verbale assemblea ordinaria – aprile " + (year - 1), file: "verbale_assemblea.pdf", data: iso(addDays(-210)) },
    { id: "doc3", categoria: "Verbali consiglio direttivo", titolo: "Verbale del direttivo – settembre " + (year - 1), file: "verbale_direttivo.pdf", data: iso(addDays(-70)) }
  ];
  var contributi = [{ id: "cp1", ente: "Comune di Tonara (demo)", importo: 1500, data: iso(addDays(-150)), causale: "Contributo attività culturali" }];
  var avvisi = [
    { id: "a1", corsoId: "c1", da: "Giovanni Loi", testo: "Ricordate di portare il telefono carico e il caricabatterie.", data: iso(addDays(-8)), destinatari: 13 }
  ];
  var newsletter = [{ id: "nl1", oggetto: "I corsi di dicembre", testo: "Bozza: le novità del mese, il torrone e l'assemblea dei soci.", stato: "bozza", autore: "Anna Sedda", data: iso(addDays(-1)) }];
  var urgent = { attivo: true, testo: "Giovedì la lezione di Smartphone si tiene in Aula 1 invece che in Aula 2." };
  var settings = { quota: 25, durata: "1° ottobre – 30 settembre", soglia: 70, offertaOre: 48, sede: "Via Vittorio Emanuele 2, 08039 Tonara (NU)", orari: "Martedì e giovedì 9:30–12:30", mittente: "noreply@unideatonara.it (esempio)", emailLimite: 100 };
  var log = [
    { ts: new Date(today.getTime() - 86400000 * 2 + 36e6).toISOString(), utente: "Anna Sedda", ruolo: "moderatore", azione: "Pubblicata news \"Grazie a chi ha partecipato alla festa d'autunno\"" },
    { ts: new Date(today.getTime() - 86400000 + 40e6).toISOString(), utente: "Giovanni Loi", ruolo: "docente", azione: "Proposta foto \"Lezione sulla storia locale\" (in revisione)" }
  ];
  return { v: 1, created: iso(today), users: users, courses: courses, enr: enr, pres: pres, news: news, faq: faq, gallery: gallery, videos: videos, materiali: materiali, messages: messages, proposte: proposte, payments: payments, donations: donations, docs: docs, contributi: contributi, avvisi: avvisi, newsletter: newsletter, urgent: urgent, settings: settings, log: log, emailOggi: { data: iso(today), n: 13 }, nlIscritti: [], seq: 100 };
};
