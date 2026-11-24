/* UNIdea Tonara – DEMO cliccabile (CONLER STUDIO).
   Vanilla JS, funziona da file:// (nessun server, nessun servizio esterno).
   Stato salvato in localStorage; "Reset demo" ripristina i dati di prova. */
(function () {
  "use strict";
  var KEY = "unidea_demo_db_v1", SKEY = "unidea_demo_session_v1";
  var db, session;
  var ROLES = { visitatore: "Visitatore", socio: "Socio", docente: "Docente", moderatore: "Moderatore", admin: "Admin" };
  var MM = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  var GG = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  var IMGS = ["img/docenti.jpg", "img/diventa-socio.jpg", "img/chi-siamo.jpg", "img/insegna-con-noi.jpg", "img/hero-imparare-insieme.jpg", "img/statuto-valori.jpg", "img/sostienici.jpg"];
  var CATS = ["Informatica", "Lingue", "Cultura e territorio", "Artigianato", "Benessere"];
  var DOC_CATS = ["Bilanci / rendiconti", "Verbali assemblee soci", "Verbali consiglio direttivo", "Statuto e regolamenti"];

  /* ---------- utilità ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function isoD(d) { var z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
  function parseD(s) { var p = String(s).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function today() { return isoD(new Date()); }
  function addDaysIso(s, n) { var d = parseD(s); d.setDate(d.getDate() + n); return isoD(d); }
  function fmt(s) { if (!s) return "—"; var d = parseD(s); return d.getDate() + " " + MM[d.getMonth()] + " " + d.getFullYear(); }
  function fmtDay(s) { var d = parseD(s); return GG[d.getDay()] + " " + d.getDate() + " " + MM[d.getMonth()]; }
  function fmtTs(ts) { var d = new Date(ts); return d.getDate() + " " + MM[d.getMonth()].slice(0, 3) + " " + d.getFullYear() + ", " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function euro(n) { return "€ " + Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function nid(p) { db.seq = (db.seq || 100) + 1; return p + db.seq; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function user(id) { return byId(db.users, id); }
  function course(id) { return byId(db.courses, id); }
  function fullName(u) { return u ? u.nome + " " + u.cognome : "—"; }
  function me() { return session.userId ? user(session.userId) : null; }
  function role() { return session.role; }
  function isStaff() { return ["moderatore", "admin"].indexOf(role()) >= 0; }

  /* ---------- stato ---------- */
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); localStorage.setItem(SKEY, JSON.stringify(session)); }
    catch (e) { toast("Memoria del browser piena: usa Reset demo o carica foto più piccole."); }
  }
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { db = null; }
    if (!db || db.v !== 1) db = window.UNIDEA_SEED();
    try { session = JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { session = null; }
    if (!session) session = { role: "visitatore", userId: null };
    if (!db.emailOggi || db.emailOggi.data !== today()) db.emailOggi = { data: today(), n: 0 };
    var now = Date.now();
    db.enr.forEach(function (e) { if (e.stato === "offerta" && e.scade && new Date(e.scade).getTime() < now) { e.stato = "rifiutato"; e.nota = "offerta scaduta"; } });
    syncSession(); save();
  }
  function syncSession() {
    if (!session.userId) { session.role = "visitatore"; return; }
    var u = me();
    if (!u || u.stato === "in attesa" || u.stato === "cessato") { session = { role: "visitatore", userId: null }; return; }
    session.role = u.ruolo;
  }
  function log(azione) {
    var u = me();
    db.log.unshift({ ts: new Date().toISOString(), utente: u ? fullName(u) : "Visitatore", ruolo: role(), azione: azione });
  }
  function sendEmails(n) {
    var lim = Number(db.settings.emailLimite) || 100;
    var free = Math.max(0, lim - db.emailOggi.n);
    var sent = Math.min(free, n);
    db.emailOggi.n += sent;
    if (sent < n) toast("Limite di " + lim + " email al giorno raggiunto (Resend gratuito): " + sent + " inviate ora, " + (n - sent) + " partirebbero domani. (simulato)");
    return sent;
  }
  function pickUserForRole(r) {
    var u = db.users.filter(function (x) { return x.persona === r && x.ruolo === r && x.stato !== "in attesa" && x.stato !== "cessato"; })[0];
    if (!u) u = db.users.filter(function (x) { return x.ruolo === r && (x.stato === "attivo" || x.stato === "scaduto"); })[0];
    return u || null;
  }
  function setRole(r) {
    if (r === "visitatore") { session = { role: "visitatore", userId: null }; }
    else {
      var u = pickUserForRole(r);
      if (!u) { toast("Nessun utente ha il ruolo " + ROLES[r] + " in questo momento (l'Admin può assegnarlo)."); return false; }
      session = { role: r, userId: u.id };
    }
    save(); return true;
  }

  /* ---------- corsi ---------- */
  function lessons(c) {
    var out = [], s = parseD(c.inizio);
    for (var i = 0; i < Number(c.lezioni); i++) { var d = new Date(s); d.setDate(d.getDate() + 7 * i); out.push({ i: i, date: isoD(d), annullata: (c.annullate || []).indexOf(i) >= 0 }); }
    return out;
  }
  function cEnr(cid, stato) { return db.enr.filter(function (e) { return e.corsoId === cid && (!stato || e.stato === stato); }); }
  function cStats(c) {
    var conf = cEnr(c.id, "confermato").length, off = cEnr(c.id, "offerta").length;
    var att = cEnr(c.id, "attesa").sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
    return { conf: conf, off: off, att: att, liberi: Math.max(0, Number(c.posti) - conf - off) };
  }
  function myEnr(cid) { var u = me(); if (!u) return null; return db.enr.filter(function (e) { return e.corsoId === cid && e.socioId === u.id && ["confermato", "attesa", "offerta"].indexOf(e.stato) >= 0; })[0] || null; }
  function waitPos(e) { var st = cStats(course(e.corsoId)); for (var i = 0; i < st.att.length; i++) if (st.att[i].id === e.id) return i + 1; return 0; }
  function presPct(cid, uid) {
    var c = course(cid), ls = lessons(c).filter(function (l) { return !l.annullata && l.date <= today(); });
    if (!ls.length) return null;
    var p = db.pres[cid] || {}, n = 0;
    ls.forEach(function (l) { if ((p[l.i] || []).indexOf(uid) >= 0) n++; });
    return Math.round(100 * n / ls.length);
  }
  function courseEnded(c) { var ls = lessons(c); return ls.length && ls[ls.length - 1].date < today(); }
  function publicCourses() { return db.courses.filter(function (c) { return c.stato === "pubblicato"; }); }
  function quotaOk(u) { return u && u.stato === "attivo" && u.quotaScadenza >= today(); }
  function nextScadenza() { var t = parseD(today()); var y = t.getMonth() >= 8 ? t.getFullYear() + 1 : t.getFullYear(); return y + "-09-30"; }

  /* ---------- UI helpers ---------- */
  function toast(msg) {
    var r = $("#toast-root"); while (r.children.length >= 2) r.removeChild(r.firstChild); var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; r.appendChild(t);
    setTimeout(function () { t.classList.add("out"); }, 3800); setTimeout(function () { t.remove(); }, 4300);
  }
  var modalCb = {};
  function modal(title, body, actions) {
    modalCb = {};
    var btns = (actions || [{ label: "Chiudi" }]).map(function (a, i) { modalCb[i] = a.onClick; return '<button type="button" class="btn ' + (a.primary ? "btn--dark" : "btn--line") + '" data-modal-btn="' + i + '"' + (a.disabled ? " disabled" : "") + ">" + esc(a.label) + "</button>"; }).join("");
    $("#modal-root").innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-t"><div class="modal__box"><h2 id="modal-t">' + esc(title) + '</h2><div class="modal__body">' + body + '</div><div class="modal__actions">' + btns + "</div></div></div>";
    var first = $("#modal-root input, #modal-root [data-modal-btn]"); if (first) first.focus();
  }
  function closeModal() { $("#modal-root").innerHTML = ""; modalCb = {}; }
  function confirmTyped(title, text, onOk) {
    modal(title, '<p>' + text + '</p><p class="small muted">Doppia conferma: scrivi <b>CONFERMA</b> per procedere. L\'azione viene salvata nel registro.</p><label class="fld"><span>Conferma</span><input id="typed-confirm" autocomplete="off" placeholder="CONFERMA"></label>',
      [{ label: "Annulla" }, { label: "Conferma", primary: true, disabled: true, onClick: function () { onOk(); } }]);
    var inp = $("#typed-confirm"), b = $('[data-modal-btn="1"]');
    inp.addEventListener("input", function () { b.disabled = inp.value.trim().toUpperCase() !== "CONFERMA"; });
  }
  function download(name, content, mime) {
    var blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function badge(t, kind) { return '<span class="badge badge--' + (kind || "grey") + '">' + esc(t) + "</span>"; }
  function urgent() { return db.urgent && db.urgent.attivo && db.urgent.testo ? '<div class="urgent"><div class="wrap"><b>Avviso</b> ' + esc(db.urgent.testo) + "</div></div>" : ""; }
  function phead(label, title, lead, img) {
    return '<section class="phead' + (img ? " phead--img" : "") + '"' + (img ? ' style="background-image:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.7)),url(\'' + img + '\')"' : "") + '><div class="wrap"><p class="eyebrow">' + esc(label) + "</p><h1>" + title + "</h1>" + (lead ? '<p class="lead">' + lead + "</p>" : "") + "</div></section>" + urgent();
  }
  function sec(inner, cls) { return '<section class="block ' + (cls || "") + '"><div class="wrap">' + inner + "</div></section>"; }
  function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (String(sel) === String(v) ? " selected" : "") + ">" + esc(label) + "</option>"; }
  function qrSvg(text) {
    var q = qrcode(0, "M"); q.addData(text); q.make();
    var n = q.getModuleCount(), m = 4, d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + (c + m) + " " + (r + m) + "h1v1h-1z";
    return '<svg class="qr" viewBox="0 0 ' + (n + 2 * m) + " " + (n + 2 * m) + '" shape-rendering="crispEdges" role="img" aria-label="Codice QR della tessera"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  function courseCard(c) {
    var st = cStats(c), doc = user(c.docenteId);
    var free = st.liberi > 0 && !st.att.length;
    var posti = free ? st.liberi + " posti liberi" : "Completo · lista d'attesa";
    return '<a class="ccard" href="#/corso/' + c.id + '"><img src="' + esc(c.img) + '" alt=""><div class="ccard__b"><span class="ccard__cat">' + esc(c.categoria) + " · " + esc(c.livello || "Per tutti") + "</span><h3>" + esc(c.titolo) + '</h3><span class="meta">' + esc(c.giorno) + " " + esc(c.ora) + " · " + c.lezioni + " lezioni · dal " + fmt(c.inizio) + '</span><span class="meta">Docente: ' + esc(fullName(doc)) + '</span><span class="ccard__f">' + badge(posti, free ? "ok" : "warn") + " " + badge(Number(c.costo) ? euro(c.costo) : "Gratuito per i soci", "grey") + "</span></div></a>";
  }

  /* =========================================================
     PAGINE PUBBLICHE
     ========================================================= */
  var P = {};
  function newsItem(n) { return '<a class="nitem" href="#/news/' + n.id + '"><span class="meta">' + fmt(n.data) + "</span><h3>" + esc(n.titolo) + "</h3><p>" + esc(n.testo.slice(0, 140)) + (n.testo.length > 140 ? "…" : "") + "</p></a>"; }
  function pubNews() { return db.news.filter(function (n) { return n.stato === "pubblicata"; }).sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : (a.id < b.id ? 1 : -1); }); }
  P.home = function () {
    var cs = publicCourses().slice(0, 3).map(courseCard).join("");
    var soci = db.users.filter(function (u) { return u.stato === "attivo"; }).length;
    return '<section class="hero"><div class="wrap"><p class="eyebrow">UNIdea Tonara APS</p><h1>Università Intergenerazionale di Tonara</h1><p class="lead">Corsi, incontri e laboratori per tutte le età, nel cuore della Barbagia. Si impara insieme, dai nonni ai nipoti.</p><div class="btns"><a class="btn btn--light" href="#/corsi">Scopri i corsi</a><a class="btn btn--ghost" href="#/diventa-socio">Diventa socio</a></div></div></section>' + urgent() +
      sec('<div class="cols-2"><div><p class="label">Chi siamo</p><h2>Un\'associazione che mette in contatto generazioni diverse.</h2></div><div class="muted"><p>UNIdea nasce a Tonara per offrire occasioni di formazione continua, cultura e socialità. I corsi sono tenuti da docenti volontari e professionisti del territorio.</p><p><a class="btn btn--line" href="#/chi-siamo">La nostra storia</a></p></div></div>') +
      sec('<div class="row-between"><div><p class="label">Corsi in evidenza</p><h2>Iscrizioni aperte.</h2></div><a class="btn btn--line" href="#/corsi">Tutti i corsi</a></div><div class="cgrid">' + cs + "</div>") +
      sec('<div class="row-between"><div><p class="label">News</p><h2>Ultime notizie.</h2></div><a class="btn btn--line" href="#/news">Tutte le news</a></div><div class="nlist" id="home-news">' + pubNews().slice(0, 3).map(newsItem).join("") + "</div>") +
      sec('<p class="label">In numeri</p><h2>Una comunità che cresce.</h2><div class="stats"><div class="stat"><b>' + publicCourses().length + '</b>corsi attivi</div><div class="stat"><b>' + soci + '</b>soci</div><div class="stat"><b>' + db.users.filter(function (u) { return u.ruolo === "docente"; }).length + '</b>docenti</div><div class="stat"><b>3</b>generazioni</div></div>') +
      sec('<div class="cols-2"><div><p class="label">Sostienici</p><h2>Dona il tuo 5×1000 a UNIdea.</h2></div><div class="muted"><p>Nella dichiarazione dei redditi firma nel riquadro degli Enti del Terzo Settore e scrivi il codice fiscale <strong class="ink">93070870915</strong>.</p><p><a class="btn btn--dark" href="#/sostienici">Fai una donazione</a></p></div></div>');
  };
  P["chi-siamo"] = function () {
    var dir = [["Presidente", "Daniela Sau"], ["Vicepresidente", "Nome Cognome (demo)"], ["Segretaria", "Nome Cognome (demo)"], ["Tesoriere", "Nome Cognome (demo)"], ["Consigliere", "Nome Cognome (demo)"]];
    return phead("Associazione", "Chi siamo", "La nostra storia, le finalità e l'organizzazione attuale.", "img/chi-siamo.jpg") +
      sec('<div class="cols-2"><div><p class="label">La nostra storia</p><h2>Nata a Tonara per imparare insieme.</h2></div><div class="muted"><p>Testo di prova. UNIdea Tonara nasce dall\'idea di un gruppo di cittadini che volevano un luogo dove le generazioni si incontrano: i più grandi insegnano mestieri e memoria, i più giovani lingue e tecnologia.</p><p>Testo di prova. Ogni anno proponiamo corsi, laboratori, conferenze e uscite sul territorio.</p></div></div>') +
      sec('<div class="cols-2"><div><p class="label">Finalità</p><h2>Perché esistiamo.</h2></div><ul class="ticks"><li>Formazione permanente per tutte le età</li><li>Scambio di saperi tra generazioni</li><li>Valorizzazione della cultura e dell\'artigianato di Tonara</li><li>Inclusione sociale e contrasto alla solitudine</li></ul></div>') +
      sec('<p class="label">Organizzazione attuale</p><h2>Consiglio direttivo.</h2><div class="people">' + dir.map(function (d) { return '<div class="person"><span class="avatar" aria-hidden="true">' + esc(d[1][0]) + "</span><b>" + esc(d[1]) + '</b><span class="meta">' + esc(d[0]) + "</span></div>"; }).join("") + '</div><p class="note-proto">Demo: a parte la presidente, i nomi sono segnaposto.</p>');
  };
  P.statuto = function () {
    return phead("Associazione", "Statuto e valori", "Statuto, regolamento e carta dei valori.", "img/statuto-valori.jpg") +
      sec('<div class="doclist">' + [["Statuto UNIdea Tonara APS", "PDF · approvato dall'assemblea"], ["Regolamento interno", "PDF"], ["Carta dei valori", "PDF"]].map(function (d) { return '<div class="docrow"><div><b>' + esc(d[0]) + '</b><span class="meta">' + esc(d[1]) + '</span></div><button class="btn btn--line" data-act="fake-file" data-name="' + esc(d[0]) + '">Scarica PDF</button></div>'; }).join("") + "</div>") +
      sec('<p class="label">I nostri valori</p><h2>Quello in cui crediamo.</h2><div class="vals">' + [["Rispetto", "Ogni età ha qualcosa da insegnare."], ["Apertura", "Corsi aperti a tutti i soci, senza distinzioni."], ["Territorio", "Custodiamo la cultura di Tonara e della Barbagia."], ["Volontariato", "Mettiamo a disposizione tempo e competenze."]].map(function (v) { return '<div class="val"><b>' + v[0] + "</b><p>" + v[1] + "</p></div>"; }).join("") + "</div>");
  };
  P.docenti = function () {
    var ds = db.users.filter(function (u) { return u.ruolo === "docente"; });
    return phead("Associazione", "Docenti", "Le persone che portano i corsi in aula.", "img/docenti.jpg") +
      sec('<div class="people people--big">' + ds.map(function (d) {
        var cs = db.courses.filter(function (c) { return c.docenteId === d.id && c.stato === "pubblicato"; });
        return '<div class="person"><span class="avatar" aria-hidden="true">' + esc(d.nome[0] + d.cognome[0]) + "</span><b>" + esc(fullName(d)) + '</b><p class="muted">' + esc(d.bio || "Docente volontario.") + '</p><span class="meta">' + (cs.length ? "Corsi: " + cs.map(function (c) { return '<a href="#/corso/' + c.id + '">' + esc(c.titolo) + "</a>"; }).join(", ") : "Nessun corso attivo") + "</span></div>";
      }).join("") + "</div>");
  };
  P.insegna = function () {
    return phead("Associazione", "Insegna con noi", "Hai una passione o un mestiere da condividere? Proponi un corso.", "img/insegna-con-noi.jpg") +
      sec('<div class="cols-2 cols-2--top"><div><p class="label">Proponi un corso</p><h2>Ti rispondiamo entro due settimane.</h2><p class="muted">La proposta arriva al Moderatore, che la valuta con il direttivo.</p></div><form class="form" data-form="proposta"><label class="fld"><span>Nome e cognome</span><input name="nome" required></label><label class="fld"><span>Email</span><input name="email" type="email" required></label><label class="fld"><span>Titolo del corso</span><input name="titolo" required></label><label class="fld"><span>Descrivi la tua idea</span><textarea name="testo" rows="4" required></textarea></label><label class="chk"><input type="checkbox" required> Ho letto l\'<a href="#/privacy">informativa privacy</a>.</label><button class="btn btn--dark btn--big">Invia la proposta</button></form></div>');
  };
  P.corsi = function () {
    var giorni = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    return phead("Corsi", "Tutti i corsi", "Scegli un corso e iscriviti dall'Area soci. Se è pieno entri in lista d'attesa.") +
      sec('<form class="filters" data-form="noop" id="filters"><label class="fld"><span>Cerca</span><input data-filter="q" placeholder="Es. inglese, telefono…"></label><label class="fld"><span>Argomento</span><select data-filter="cat"><option value="">Tutti</option>' + CATS.map(function (c) { return opt(c, c); }).join("") + '</select></label><label class="fld"><span>Giorno</span><select data-filter="day"><option value="">Tutti</option>' + giorni.map(function (g) { return opt(g, g); }).join("") + '</select></label><label class="chk"><input type="checkbox" data-filter="free"> Solo con posti liberi</label><label class="chk"><input type="checkbox" data-filter="gratis"> Solo gratuiti</label></form><p class="meta" id="count"></p><div class="cgrid" id="course-list"></div>');
  };
  function applyFilters() {
    var box = $("#course-list"); if (!box) return;
    var f = {}; $$("[data-filter]").forEach(function (el) { f[el.dataset.filter] = el.type === "checkbox" ? el.checked : el.value.trim().toLowerCase(); });
    var list = publicCourses().filter(function (c) {
      var st = cStats(c);
      if (f.q && (c.titolo + " " + c.descr + " " + c.categoria).toLowerCase().indexOf(f.q) < 0) return false;
      if (f.cat && c.categoria.toLowerCase() !== f.cat) return false;
      if (f.day && c.giorno.toLowerCase() !== f.day) return false;
      if (f.free && !(st.liberi > 0 && !st.att.length)) return false;
      if (f.gratis && Number(c.costo) > 0) return false;
      return true;
    });
    box.innerHTML = list.length ? list.map(courseCard).join("") : '<p class="empty">Nessun corso con questi filtri.</p>';
    $("#count").textContent = list.length + (list.length === 1 ? " corso" : " corsi");
  }
  P.corso = function (id) {
    var c = course(id);
    if (!c || (c.stato !== "pubblicato" && !isStaff())) return P.notfound();
    var st = cStats(c), doc = user(c.docenteId), e = myEnr(c.id), u = me(), free = st.liberi > 0 && !st.att.length;
    var action;
    if (!u) action = '<button class="btn btn--dark btn--big" data-act="enroll" data-id="' + c.id + '">Iscriviti</button><p class="meta">Per iscriverti entra nell\'Area soci.</p>';
    else if (e && e.stato === "confermato") action = '<p class="state ok">Sei iscritto a questo corso.</p>' + (Number(c.costo) ? "" : '<button class="btn btn--line" data-act="unenroll" data-id="' + e.id + '">Annulla iscrizione</button>');
    else if (e && e.stato === "attesa") action = '<p class="state warn">Sei in lista d\'attesa: posizione ' + waitPos(e) + ".</p>";
    else if (e && e.stato === "offerta") action = '<p class="state ok">Si è liberato un posto per te! Rispondi entro il ' + fmtTs(e.scade) + '.</p><div class="btns"><button class="btn btn--dark btn--big" data-act="offer-accept" data-id="' + e.id + '">Accetta il posto</button><button class="btn btn--line" data-act="offer-decline" data-id="' + e.id + '">Rifiuta</button></div>';
    else if (!quotaOk(u)) action = '<p class="state warn">La tua quota non è attiva.</p><a class="btn btn--dark btn--big" href="#/area/quota">Rinnova la quota</a>';
    else if (free) action = '<button class="btn btn--dark btn--big" data-act="enroll" data-id="' + c.id + '">Iscriviti' + (Number(c.costo) ? " · " + euro(c.costo) : "") + "</button>";
    else action = '<button class="btn btn--dark btn--big" data-act="enroll" data-id="' + c.id + '">Mettimi in lista d\'attesa</button><p class="meta">' + st.att.length + " persone già in lista.</p>";
    var ls = lessons(c);
    return phead(c.categoria, esc(c.titolo), esc(c.descr), c.img) +
      sec('<div class="cols-2 cols-2--top"><div><dl class="facts"><dt>Quando</dt><dd>' + esc(c.giorno) + " alle " + esc(c.ora) + ", dal " + fmt(c.inizio) + "</dd><dt>Dove</dt><dd>" + esc(c.luogo) + "</dd><dt>Docente</dt><dd>" + esc(fullName(doc)) + "</dd><dt>Lezioni</dt><dd>" + c.lezioni + "</dd><dt>Livello</dt><dd>" + esc(c.livello || "Per tutti") + "</dd><dt>Posti</dt><dd>" + c.posti + " in totale · " + (free ? st.liberi + " liberi" : "completo") + (st.att.length ? " · " + st.att.length + " in lista d'attesa" : "") + "</dd><dt>Costo</dt><dd>" + (Number(c.costo) ? euro(c.costo) + " (materiali compresi)" : "Gratuito per i soci") + '</dd></dl></div><div class="enroll-box" id="enroll-box">' + (c.stato !== "pubblicato" ? '<p class="state warn">Anteprima: corso non pubblicato (' + esc(c.stato) + ").</p>" : "") + action + '<p class="small muted">Leggi il <a href="#/regolamento-corsi">regolamento corsi</a>.</p></div></div>') +
      sec('<p class="label">Calendario lezioni</p><ol class="lessons">' + ls.map(function (l) { return '<li class="' + (l.annullata ? "is-cancel" : l.date < today() ? "is-past" : "") + '"><b>Lezione ' + (l.i + 1) + "</b> " + fmtDay(l.date) + " · " + esc(c.ora) + (l.annullata ? " " + badge("Annullata", "warn") : "") + "</li>"; }).join("") + "</ol>");
  };
  P.calendario = function () {
    var items = [], from = today(), to = addDaysIso(from, 56);
    publicCourses().forEach(function (c) { lessons(c).forEach(function (l) { if (l.date >= from && l.date <= to) items.push({ c: c, l: l }); }); });
    items.sort(function (a, b) { return a.l.date < b.l.date ? -1 : a.l.date > b.l.date ? 1 : a.c.ora < b.c.ora ? -1 : 1; });
    var html = "", cur = "";
    items.forEach(function (it) {
      if (it.l.date !== cur) { if (cur) html += "</ul></div>"; cur = it.l.date; html += '<div class="calday"><h3>' + fmtDay(cur) + "</h3><ul>"; }
      html += '<li class="' + (it.l.annullata ? "is-cancel" : "") + '"><span class="t">' + esc(it.c.ora) + '</span><a href="#/corso/' + it.c.id + '">' + esc(it.c.titolo) + '</a><span class="meta">' + esc(it.c.luogo) + "</span>" + (it.l.annullata ? badge("Annullata", "warn") : "") + "</li>";
    });
    if (cur) html += "</ul></div>";
    return phead("Corsi", "Calendario", "Tutte le lezioni delle prossime 8 settimane. Si aggiorna da solo quando un corso cambia.") + sec('<div class="cal">' + (html || '<p class="empty">Nessuna lezione in programma.</p>') + "</div>");
  };
  P["regolamento-corsi"] = function () {
    return phead("Corsi", "Regolamento corsi", "Le regole per partecipare, in parole semplici.") +
      sec('<ol class="rules"><li><b>Chi può partecipare.</b> I soci con la quota dell\'anno in corso.</li><li><b>Iscrizione.</b> Online dall\'Area soci o in segreteria. I posti si assegnano in ordine di iscrizione.</li><li><b>Lista d\'attesa.</b> Se si libera un posto ti scriviamo: hai ' + esc(db.settings.offertaOre) + ' ore per accettarlo.</li><li><b>Presenze e attestato.</b> Con almeno il ' + esc(db.settings.soglia) + '% delle presenze ricevi l\'attestato nell\'Area soci.</li><li><b>Corsi a pagamento.</b> Il rimborso è possibile fino a 7 giorni prima della prima lezione.</li><li><b>Foto.</b> Durante i corsi possiamo scattare foto solo a chi ha dato il consenso.</li></ol><p class="note-proto">Testo di prova da sostituire con il regolamento approvato.</p>');
  };
  P["diventa-socio"] = function () {
    var s = db.settings;
    return phead("Partecipa", "Diventa socio", "Compila il modulo, paga la quota e, dopo l'approvazione, ricevi la tessera digitale.", "img/diventa-socio.jpg") +
      sec('<div class="cols-2 cols-2--top"><div><p class="label">Quota associativa</p><h2 id="quota-h">' + euro(s.quota) + ' all\'anno.</h2><p class="muted">Vale ' + esc(s.durata) + '. Comprende la tessera, l\'assicurazione e tutti i corsi gratuiti.</p><ol class="steps"><li>Compili il modulo</li><li>Paghi la quota con carta (Stripe)</li><li>Il direttivo approva l\'adesione</li><li>Ricevi la tessera QR via email</li></ol></div><form class="form" data-form="adesione" id="form-adesione"><div class="grid2"><label class="fld"><span>Nome</span><input name="nome" required></label><label class="fld"><span>Cognome</span><input name="cognome" required></label></div><label class="fld"><span>Email</span><input name="email" type="email" required></label><label class="fld"><span>Telefono</span><input name="tel" required></label><div class="grid2"><label class="fld"><span>Codice fiscale</span><input name="cf" required minlength="16" maxlength="16"></label><label class="fld"><span>Data di nascita</span><input name="nascita" type="date" required></label></div><label class="fld"><span>Indirizzo</span><input name="indirizzo" required></label><label class="chk"><input type="checkbox" name="statuto" required> Ho letto e accetto lo <a href="#/statuto">statuto</a> (obbligatorio).</label><label class="chk"><input type="checkbox" name="privacy" required> Ho letto l\'<a href="#/privacy">informativa privacy</a> (obbligatorio).</label><label class="chk"><input type="checkbox" name="consImg"> Acconsento all\'uso della mia immagine in foto e video (facoltativo).</label><label class="chk"><input type="checkbox" name="consNews"> Voglio ricevere la newsletter (facoltativo).</label><button class="btn btn--dark btn--big">Continua al pagamento · ' + euro(s.quota) + '</button><p class="small muted">Demo: il pagamento è simulato, nessun addebito.</p></form></div>');
  };
  P.sostienici = function () {
    var u = me();
    return phead("Partecipa", "Sostienici", "Una donazione o il tuo 5×1000 aiutano a tenere gratuiti i corsi.", "img/sostienici.jpg") +
      sec('<div class="cols-2 cols-2--top"><div><p class="label">Donazione</p><h2>Fai una donazione.</h2><p class="muted">Riceverai la ricevuta per la detrazione (art. 83 del Codice del Terzo Settore).</p></div><form class="form" data-form="donazione"><div class="amounts">' + [10, 25, 50, 100].map(function (a, i) { return '<label class="amt"><input type="radio" name="importo" value="' + a + '"' + (i === 1 ? " checked" : "") + "><span>€ " + a + "</span></label>"; }).join("") + '</div><label class="fld"><span>Altro importo (€)</span><input name="altro" type="number" min="1" step="1"></label><label class="fld"><span>Nome e cognome</span><input name="nome" required value="' + esc(u ? fullName(u) : "") + '"></label><label class="fld"><span>Email per la ricevuta</span><input name="email" type="email" required value="' + esc(u ? u.email : "") + '"></label><label class="chk"><input type="checkbox" required> Ho letto l\'<a href="#/privacy">informativa privacy</a>.</label><button class="btn btn--dark btn--big">Dona ora</button><p class="small muted">Demo: pagamento simulato, nessun addebito.</p></form></div>') +
      sec('<div class="cols-2"><div><p class="label">5×1000</p><h2>Firma per UNIdea.</h2></div><div><p class="muted">Nella dichiarazione dei redditi (730, Redditi PF o CU) firma nel riquadro <b class="ink">«Sostegno degli enti del Terzo settore iscritti nel RUNTS»</b> e scrivi il nostro codice fiscale:</p><p class="cfbig">93070870915 <button class="btn btn--line" data-act="copy-cf">Copia</button></p><p class="muted small">Non costa nulla: è una parte delle imposte che lo Stato destina a chi scegli tu.</p></div></div>');
  };
  P.news = function (id) {
    if (id) {
      var n = byId(db.news, id);
      if (!n || (n.stato !== "pubblicata" && !isStaff())) return P.notfound();
      return phead("News · " + fmt(n.data), esc(n.titolo)) + sec('<div class="prose"><p>' + esc(n.testo).replace(/\n/g, "<br>") + '</p><p class="meta">Pubblicato da ' + esc(n.autore) + '</p><p><a class="btn btn--line" href="#/news">← Tutte le news</a></p></div>');
    }
    return phead("Scopri", "News", "Notizie, eventi e comunicazioni dell'associazione.") + sec('<div class="nlist" id="news-list">' + (pubNews().map(newsItem).join("") || '<p class="empty">Nessuna news.</p>') + "</div>");
  };
  P.archivio = function () {
    var gs = db.gallery.filter(function (g) { return g.stato === "pubblicata"; });
    return phead("Scopri", "Archivio foto e video", "I momenti dei corsi e degli eventi. Pubblichiamo solo foto di chi ha dato il consenso.") +
      sec('<p class="label">Foto</p><div class="gal" id="gallery">' + gs.map(function (g) { var c = course(g.corsoId); return '<figure><img src="' + esc(g.src) + '" alt="' + esc(g.titolo) + '"><figcaption>' + esc(g.titolo) + (c ? ' · <span class="meta">' + esc(c.titolo) + "</span>" : "") + "</figcaption></figure>"; }).join("") + "</div>") +
      sec('<p class="label">Video</p><div class="vids">' + db.videos.map(function (v) { return '<div class="vid"><div class="vid__ph"><p>Il video di YouTube si carica solo dopo il consenso ai cookie (modalità senza cookie).</p><button class="btn btn--light" data-act="video">Accetta e guarda</button></div><b>' + esc(v.titolo) + '</b><span class="meta">' + esc(v.durata) + "</span></div>"; }).join("") + "</div>");
  };
  P.faq = function () {
    return phead("Scopri", "Domande frequenti", "Le risposte alle domande che ci fate più spesso.") + sec('<div class="faq">' + db.faq.map(function (f) { return "<details><summary>" + esc(f.q) + "</summary><p>" + esc(f.a) + "</p></details>"; }).join("") + "</div>");
  };
  P.trasparenza = function () {
    var groups = DOC_CATS.map(function (cat) {
      var ds = db.docs.filter(function (d) { return d.categoria === cat; });
      return '<div class="tgroup"><h3>' + esc(cat) + "</h3>" + (ds.length ? ds.map(function (d) { return '<div class="docrow"><div><b>' + esc(d.titolo) + '</b><span class="meta">' + esc(d.file) + " · pubblicato il " + fmt(d.data) + '</span></div><button class="btn btn--line" data-act="fake-file" data-name="' + esc(d.titolo) + '">Scarica</button></div>'; }).join("") : '<p class="empty">Nessun documento.</p>') + "</div>";
    }).join("");
    return phead("Scopri", "Trasparenza", "Bilanci, verbali e contributi pubblici ricevuti (L. 124/2017).") + sec('<div id="docs">' + groups + "</div>") +
      sec('<p class="label">Contributi pubblici ricevuti</p><div class="tbl"><table><thead><tr><th>Ente</th><th>Causale</th><th>Data</th><th>Importo</th></tr></thead><tbody>' + db.contributi.map(function (c) { return "<tr><td>" + esc(c.ente) + "</td><td>" + esc(c.causale) + "</td><td>" + fmt(c.data) + "</td><td>" + euro(c.importo) + "</td></tr>"; }).join("") + "</tbody></table></div>");
  };
  P.contatti = function () {
    var s = db.settings, u = me();
    return phead("Contatti", "Scrivici o passa a trovarci", "Ti rispondiamo il prima possibile.") +
      sec('<div class="cols-2 cols-2--top"><div><p class="label">Dove siamo e orari</p><p class="big" id="sede">' + esc(s.sede) + '</p><p class="muted">Segreteria: ' + esc(s.orari) + '</p><p class="muted">Email: info@unideatonara.it (esempio)<br>Telefono / WhatsApp: +39 000 000 0000 (esempio)<br>PEC: unideatonara@pec.it</p><div class="map" role="img" aria-label="Mappa segnaposto"><span>Mappa (si carica dopo il consenso)</span></div></div><form class="form" data-form="contatto"><label class="fld"><span>Nome e cognome</span><input name="nome" required value="' + esc(u ? fullName(u) : "") + '"></label><label class="fld"><span>Email</span><input name="email" type="email" required value="' + esc(u ? u.email : "") + '"></label><label class="fld"><span>Oggetto</span><input name="oggetto" required></label><label class="fld"><span>Messaggio</span><textarea name="testo" rows="5" required></textarea></label><label class="chk"><input type="checkbox" required> Ho letto l\'<a href="#/privacy">informativa privacy</a>.</label><button class="btn btn--dark btn--big">Invia messaggio</button></form></div>');
  };
  function legal(title, lead) { return phead("Legale", title, lead) + sec('<div class="prose"><p class="note-proto">Pagina segnaposto della demo. Il testo definitivo va redatto o verificato da un consulente privacy/legale.</p><h3>Titolare</h3><p>UNIdea Tonara APS – Università Intergenerazionale, Via Vittorio Emanuele 2, 08039 Tonara (NU), C.F. 93070870915, PEC unideatonara@pec.it.</p><h3>Contenuti previsti</h3><p>Finalità e basi giuridiche, tempi di conservazione, destinatari (Supabase UE, Resend, Stripe, Hostinger), diritti dell\'interessato e come esercitarli.</p></div>'); }
  P.privacy = function () { return legal("Privacy policy", "Come trattiamo i dati di soci, docenti e visitatori."); };
  P.cookie = function () { return legal("Cookie policy", "Usiamo solo cookie tecnici; YouTube e mappe solo dopo il consenso."); };
  P.termini = function () { return legal("Termini e condizioni", "Regole d'uso del sito, pagamenti e rimborsi."); };
  P.accessibilita = function () { return legal("Dichiarazione di accessibilità", "Il sito segue le linee guida WCAG 2.1 AA."); };
  P["mappa-sito"] = function () {
    var L = [["Associazione", [["chi-siamo", "Chi siamo"], ["statuto", "Statuto e valori"], ["docenti", "Docenti"], ["insegna", "Insegna con noi"]]], ["Corsi", [["corsi", "Tutti i corsi"], ["calendario", "Calendario"], ["regolamento-corsi", "Regolamento corsi"]]], ["Partecipa", [["diventa-socio", "Diventa socio"], ["sostienici", "Sostienici"]]], ["Scopri", [["news", "News"], ["archivio", "Archivio foto e video"], ["faq", "FAQ"], ["trasparenza", "Trasparenza"]]], ["Altro", [["contatti", "Contatti"], ["area", "Area soci"], ["privacy", "Privacy policy"], ["cookie", "Cookie policy"], ["termini", "Termini e condizioni"], ["accessibilita", "Accessibilità"]]]];
    return phead("Sito", "Mappa del sito", "") + sec('<div class="smap">' + L.map(function (g) { return "<div><h3>" + g[0] + "</h3><ul>" + g[1].map(function (l) { return '<li><a href="#/' + l[0] + '">' + l[1] + "</a></li>"; }).join("") + "</ul></div>"; }).join("") + "</div>");
  };
  P.notfound = function () { return phead("Errore 404", "Pagina non trovata", "Forse il link è cambiato.") + sec('<a class="btn btn--dark" href="#/">Torna alla home</a>'); };

  /* =========================================================
     AREA SOCI + PANNELLI
     ========================================================= */
  var ALL = ["socio", "docente", "moderatore", "admin"], MA = ["moderatore", "admin"];
  var SECTIONS = [
    { id: "profilo", label: "Profilo", g: "Area soci", r: ALL },
    { id: "tessera", label: "Tessera QR", g: "Area soci", r: ALL },
    { id: "corsi", label: "I miei corsi", g: "Area soci", r: ALL },
    { id: "attestati", label: "Attestati", g: "Area soci", r: ALL },
    { id: "materiali", label: "Materiali", g: "Area soci", r: ALL },
    { id: "calendario", label: "Calendario", g: "Area soci", r: ALL },
    { id: "quota", label: "Quota e donazioni", g: "Area soci", r: ALL },
    { id: "ricevute", label: "Ricevute", g: "Area soci", r: ALL },
    { id: "consensi", label: "Consensi", g: "Area soci", r: ALL },
    { id: "doc-corsi", label: "Corsi e iscritti", g: "Docente", r: ["docente"] },
    { id: "doc-presenze", label: "Presenze", g: "Docente", r: ["docente"] },
    { id: "doc-materiali", label: "Carica materiali", g: "Docente", r: ["docente"] },
    { id: "doc-avvisi", label: "Avvisi agli iscritti", g: "Docente", r: ["docente"] },
    { id: "doc-foto", label: "Proponi foto", g: "Docente", r: ["docente"] },
    { id: "cruscotto", label: "Cruscotto", g: "Gestione", r: MA },
    { id: "g-corsi", label: "Corsi e calendario", g: "Gestione", r: MA },
    { id: "g-iscrizioni", label: "Iscrizioni", g: "Gestione", r: MA },
    { id: "g-attesa", label: "Liste d'attesa", g: "Gestione", r: MA },
    { id: "g-contenuti", label: "News, FAQ e avvisi", g: "Gestione", r: MA },
    { id: "g-galleria", label: "Galleria", g: "Gestione", r: MA },
    { id: "g-messaggi", label: "Messaggi e proposte", g: "Gestione", r: MA },
    { id: "g-newsletter", label: "Newsletter", g: "Gestione", r: MA },
    { id: "g-iscritti", label: "Iscritti (dati operativi)", g: "Gestione", r: ["moderatore"] },
    { id: "a-soci", label: "Soci e adesioni", g: "Amministrazione", r: ["admin"] },
    { id: "a-pagamenti", label: "Quote e pagamenti", g: "Amministrazione", r: ["admin"] },
    { id: "a-donazioni", label: "Donazioni e ricevute", g: "Amministrazione", r: ["admin"] },
    { id: "a-trasparenza", label: "Trasparenza", g: "Amministrazione", r: ["admin"] },
    { id: "a-utenti", label: "Utenti e ruoli", g: "Amministrazione", r: ["admin"] },
    { id: "a-impostazioni", label: "Impostazioni", g: "Amministrazione", r: ["admin"] },
    { id: "a-export", label: "Export libro soci", g: "Amministrazione", r: ["admin"] },
    { id: "a-registro", label: "Registro azioni", g: "Amministrazione", r: ["admin"] }
  ];
  function allowed(id) { var s = SECTIONS.filter(function (x) { return x.id === id; })[0]; return s && s.r.indexOf(role()) >= 0 ? s : null; }
  function defaultSection() { return { socio: "profilo", docente: "doc-corsi", moderatore: "cruscotto", admin: "cruscotto" }[role()]; }
  function loginPage() {
    return phead("Area soci", "Accedi all'Area soci", "Niente password: inserisci la tua email e ricevi un link di accesso.") +
      sec('<div class="cols-2 cols-2--top"><form class="form" data-form="magic"><label class="fld"><span>La tua email</span><input type="email" name="email" required placeholder="nome@esempio.it"></label><button class="btn btn--dark btn--big">Ricevi il link di accesso</button><p class="small muted">Il link vale 1 ora e si usa una volta sola.</p></form><div class="demo-login"><p class="label">Solo nella demo</p><h2>Entra con un profilo di prova.</h2><div class="demo-login__btns">' +
        [["socio", "Entra come Socio", "Maria Pirisi"], ["docente", "Entra come Docente", "Giovanni Loi"], ["moderatore", "Entra come Moderatore", "Anna Sedda"], ["admin", "Entra come Admin", "Lucia Demuro"]].map(function (b) { return '<button class="btn btn--big btn--dark" data-act="login-as" data-role="' + b[0] + '">' + b[1] + "<small>" + b[2] + "</small></button>"; }).join("") + "</div></div></div>");
  }
  function countBadge(id) {
    var n = 0, u = me();
    if (id === "g-galleria") n = db.gallery.filter(function (g) { return g.stato === "in revisione"; }).length;
    if (id === "g-messaggi") n = db.messages.filter(function (m) { return m.stato === "nuovo"; }).length + db.proposte.filter(function (p) { return p.stato === "nuova"; }).length;
    if (id === "a-soci") n = db.users.filter(function (x) { return x.stato === "in attesa"; }).length;
    if (id === "corsi") n = db.enr.filter(function (e) { return u && e.socioId === u.id && e.stato === "offerta"; }).length;
    return n ? ' <span class="cnt">' + n + "</span>" : "";
  }
  function renderArea(parts) {
    if (role() === "visitatore") return loginPage();
    var sid = parts[0] || defaultSection(), s = allowed(sid), u = me();
    var groups = [], nav = "", selOpts = "";
    SECTIONS.forEach(function (x) { if (x.r.indexOf(role()) >= 0 && groups.indexOf(x.g) < 0) groups.push(x.g); });
    groups.forEach(function (g) {
      var gl = g === "Gestione" && role() === "admin" ? "Gestione contenuti" : g;
      nav += '<p class="pside__g">' + esc(gl) + "</p><ul>";
      selOpts += '<optgroup label="' + esc(gl) + '">';
      SECTIONS.forEach(function (x) { if (x.g !== g || x.r.indexOf(role()) < 0) return; nav += '<li><a href="#/area/' + x.id + '"' + (x.id === sid ? ' aria-current="page"' : "") + ">" + esc(x.label) + countBadge(x.id) + "</a></li>"; selOpts += opt(x.id, x.label, sid); });
      nav += "</ul>"; selOpts += "</optgroup>";
    });
    var content;
    if (!s) content = '<div class="denied"><h2>Non hai accesso a questa sezione</h2><p class="muted">Il ruolo ' + esc(ROLES[role()]) + " non la vede: ogni ruolo vede solo quello che gli serve.</p></div>";
    else { try { content = A[sid](parts.slice(1)); } catch (err) { console.error(err); content = "<p>Errore nella sezione.</p>"; } }
    return '<section class="phead phead--sm"><div class="wrap"><p class="eyebrow">Area soci · ' + esc(ROLES[role()]) + "</p><h1>Ciao, " + esc(u.nome) + '</h1><p class="lead">' + badge(ROLES[role()], "light") + " Tessera " + esc(u.tessera || "—") + "</p></div></section>" + urgent() +
      '<div class="wrap panel"><aside class="pside"><label class="pselect fld"><span>Vai a</span><select data-goto>' + selOpts + '</select></label><nav aria-label="Menu area riservata">' + nav + '</nav><button class="btn btn--line" data-act="logout">Esci</button></aside><div class="pmain" id="pmain">' + (s ? '<h2 class="ptitle">' + esc(s.label) + "</h2>" : "") + content + "</div></div>";
  }
  function tbl(head, rows, cls, id) { return '<div class="tbl ' + (cls || "") + '"' + (id ? ' id="' + id + '"' : "") + "><table><thead><tr>" + head.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr></thead><tbody>" + (rows.length ? rows.join("") : '<tr><td colspan="' + head.length + '" class="empty">Nessun elemento.</td></tr>') + "</tbody></table></div>"; }
  function tr(cells) { return "<tr>" + cells.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }
  function card(title, inner, cls) { return '<div class="pcard ' + (cls || "") + '">' + (title ? "<h3>" + title + "</h3>" : "") + inner + "</div>"; }
  function note(t) { return '<p class="pnote">' + t + "</p>"; }

  var A = {};
  /* ----- SOCIO ----- */
  A.profilo = function () {
    var u = me();
    return card("I tuoi dati", '<form class="form" data-form="profilo"><div class="grid2"><label class="fld"><span>Nome</span><input value="' + esc(u.nome) + '" disabled></label><label class="fld"><span>Cognome</span><input value="' + esc(u.cognome) + '" disabled></label></div><label class="fld"><span>Email</span><input name="email" type="email" value="' + esc(u.email) + '" required></label><label class="fld"><span>Telefono</span><input name="tel" value="' + esc(u.tel) + '"></label><label class="fld"><span>Lingua preferita</span><select name="lingua">' + opt("IT", "Italiano", u.lingua) + opt("EN", "English", u.lingua) + '</select></label><button class="btn btn--dark btn--big">Salva modifiche</button></form>') +
      card("La tua iscrizione", '<dl class="facts"><dt>Stato</dt><dd>' + (quotaOk(u) ? badge("Quota attiva", "ok") : badge("Quota scaduta", "warn")) + "</dd><dt>Livello</dt><dd>" + esc(u.livello) + "</dd><dt>Socio dal</dt><dd>" + fmt(u.adesione) + "</dd><dt>Ruolo sul sito</dt><dd>" + esc(ROLES[u.ruolo]) + "</dd></dl>") +
      card("I tuoi dati personali", '<div class="btns"><button class="btn btn--line" data-act="my-data">Scarica i miei dati</button><button class="btn btn--line" data-act="delete-request">Chiedi la cancellazione dell\'account</button></div>');
  };
  A.tessera = function () {
    var u = me(), ok = quotaOk(u);
    var txt = "UNIDEA-TONARA|" + u.tessera + "|" + u.nome + " " + u.cognome + "|SCAD " + u.quotaScadenza;
    return '<div class="tessera' + (ok ? "" : " is-off") + '" id="tessera"><div class="tessera__top"><span class="logo-t">UNIdea<span>Tonara</span></span><span>Tessera socio</span></div><div class="tessera__body"><div><p class="tessera__name">' + esc(fullName(u)) + "</p><p>N. " + esc(u.tessera) + "</p><p>Livello: " + esc(u.livello) + "</p><p>Valida fino al " + fmt(u.quotaScadenza) + "</p><p>" + (ok ? badge("Valida", "ok") : badge("Scaduta", "warn")) + '</p></div><div class="tessera__qr">' + qrSvg(txt) + "</div></div></div>" + note("Mostra il QR al docente a inizio lezione per segnare la presenza. Puoi anche stamparla.") + '<button class="btn btn--line" data-act="print">Stampa la tessera</button>';
  };
  A.corsi = function () {
    var u = me();
    var es = db.enr.filter(function (e) { return e.socioId === u.id && ["confermato", "attesa", "offerta"].indexOf(e.stato) >= 0; });
    var out = es.map(function (e) {
      var c = course(e.corsoId); if (!c || c.stato === "archiviato" || c.stato === "eliminato") return "";
      var st, act = "";
      if (e.stato === "confermato") { st = badge(courseEnded(c) ? "Concluso" : "Iscritto", "ok"); if (!Number(c.costo) && !courseEnded(c)) act = '<button class="btn btn--line" data-act="unenroll" data-id="' + e.id + '">Annulla iscrizione</button>'; }
      else if (e.stato === "attesa") st = badge("Lista d'attesa · posizione " + waitPos(e), "warn");
      else { st = badge("Posto offerto! Rispondi entro il " + fmtTs(e.scade), "ok"); act = '<button class="btn btn--dark btn--big" data-act="offer-accept" data-id="' + e.id + '">Accetta il posto' + (Number(c.costo) ? " · " + euro(c.costo) : "") + '</button><button class="btn btn--line" data-act="offer-decline" data-id="' + e.id + '">Rifiuta</button>'; }
      var avv = e.stato === "confermato" ? db.avvisi.filter(function (a) { return a.corsoId === c.id; }).slice(0, 3) : [];
      var pct = e.stato === "confermato" ? presPct(c.id, u.id) : null;
      return '<div class="pcard mycourse" data-course="' + c.id + '"><div class="row-between"><div><h3><a href="#/corso/' + c.id + '">' + esc(c.titolo) + '</a></h3><p class="meta">' + esc(c.giorno) + " " + esc(c.ora) + " · " + esc(c.luogo) + "</p></div><div>" + st + "</div></div>" + (pct != null ? '<p class="meta">Presenze: ' + pct + "% (attestato dal " + db.settings.soglia + '%)</p><div class="bar"><span style="width:' + pct + '%"></span></div>' : "") + (avv.length ? '<div class="avvisi">' + avv.map(function (a) { return "<p><b>Avviso del " + fmt(a.data) + "</b> (" + esc(a.da) + "): " + esc(a.testo) + "</p>"; }).join("") + "</div>" : "") + (act ? '<div class="btns">' + act + "</div>" : "") + "</div>";
    }).join("");
    return (out || '<p class="empty">Non sei iscritto a nessun corso.</p>') + '<p><a class="btn btn--dark" href="#/corsi">Cerca un corso</a></p>';
  };
  function myAttestati(u) {
    return db.enr.filter(function (e) { return e.socioId === u.id && e.stato === "confermato"; }).map(function (e) { return course(e.corsoId); }).filter(function (c) { return c && courseEnded(c) && presPct(c.id, u.id) >= Number(db.settings.soglia); });
  }
  A.attestati = function () {
    var u = me(), cs = myAttestati(u);
    return note("Gli attestati si generano da soli a fine corso se hai almeno il " + esc(db.settings.soglia) + "% delle presenze.") + (cs.length ? cs.map(function (c) { return card(esc(c.titolo), '<p class="meta">Concluso · presenze ' + presPct(c.id, u.id) + '%</p><button class="btn btn--dark" data-act="attestato" data-id="' + c.id + '">Scarica attestato</button>'); }).join("") : '<p class="empty">Nessun attestato per ora.</p>');
  };
  A.materiali = function () {
    var u = me(), ids = db.enr.filter(function (e) { return e.socioId === u.id && e.stato === "confermato"; }).map(function (e) { return e.corsoId; });
    var ms = db.materiali.filter(function (m) { return ids.indexOf(m.corsoId) >= 0; });
    return note("Qui trovi le dispense dei corsi a cui sei iscritto.") + tbl(["File", "Corso", "Data", ""], ms.map(function (m) { return tr([esc(m.nome), esc(course(m.corsoId).titolo), fmt(m.data), '<button class="btn btn--line btn--sm" data-act="fake-file" data-name="' + esc(m.nome) + '">Scarica</button>']); }), "mat-socio");
  };
  function myLessons(u) {
    var items = [];
    db.enr.filter(function (e) { return e.socioId === u.id && e.stato === "confermato"; }).forEach(function (e) { var c = course(e.corsoId); if (!c || c.stato !== "pubblicato") return; lessons(c).forEach(function (l) { if (l.date >= today()) items.push({ c: c, l: l }); }); });
    return items.sort(function (a, b) { return a.l.date < b.l.date ? -1 : 1; });
  }
  A.calendario = function () {
    var it = myLessons(me());
    return '<div class="btns"><button class="btn btn--dark btn--big" data-act="ics">Aggiungi al calendario del telefono (.ics)</button></div>' + tbl(["Data", "Ora", "Corso", "Luogo"], it.slice(0, 20).map(function (x) { return tr([fmtDay(x.l.date) + (x.l.annullata ? " " + badge("Annullata", "warn") : ""), esc(x.c.ora), esc(x.c.titolo), esc(x.c.luogo)]); }));
  };
  A.quota = function () {
    var u = me(), ok = quotaOk(u);
    var pays = db.payments.filter(function (p) { return p.socioId === u.id; });
    return card("Quota associativa", '<p class="big">' + (ok ? badge("Attiva", "ok") + " fino al " + fmt(u.quotaScadenza) : badge("Scaduta", "warn") + " il " + fmt(u.quotaScadenza)) + "</p>" + (ok ? '<p class="muted">Il rinnovo si apre a settembre.</p>' : '<button class="btn btn--dark btn--big" data-act="renew">Rinnova la quota · ' + euro(db.settings.quota) + "</button>")) +
      card("Sostieni l'associazione", '<p class="muted">Fai una donazione: ritrovi la ricevuta qui nell\'Area soci.</p><a class="btn btn--line" href="#/sostienici">Fai una donazione</a>') +
      card("I tuoi pagamenti", tbl(["Data", "Cosa", "Importo", "Stato"], pays.map(function (p) { return tr([fmt(p.data), esc(p.tipo), euro(p.importo), esc(p.stato)]); })));
  };
  A.ricevute = function () {
    var u = me();
    var rows = db.payments.filter(function (p) { return p.socioId === u.id; }).map(function (p) { return tr([fmt(p.data), esc(p.tipo), euro(p.importo), '<button class="btn btn--line btn--sm" data-act="receipt-pay" data-id="' + p.id + '">Scarica</button>']); })
      .concat(db.donations.filter(function (d) { return d.socioId === u.id; }).map(function (d) { return tr([fmt(d.data), "Donazione" + (d.ricevuta ? " · " + esc(d.ricevuta) : ""), euro(d.importo), d.ricevuta ? '<button class="btn btn--line btn--sm" data-act="receipt-don" data-id="' + d.id + '">Scarica</button>' : '<span class="meta">in preparazione</span>']); }));
    return tbl(["Data", "Descrizione", "Importo", "Ricevuta"], rows);
  };
  A.consensi = function () {
    var u = me();
    return '<form class="form" data-form="consensi">' + card("Consensi", '<label class="switch"><input type="checkbox" name="consImg"' + (u.consImg ? " checked" : "") + '><span><b>Foto e video</b><br><span class="muted">Possiamo pubblicare foto in cui compari.</span></span></label><label class="switch"><input type="checkbox" name="consNews"' + (u.consNews ? " checked" : "") + '><span><b>Newsletter</b><br><span class="muted">Una email al mese con corsi ed eventi.</span></span></label><p class="meta">Ultima modifica: ' + fmt(u.consData) + " · informativa " + esc(u.consVer) + '</p><button class="btn btn--dark btn--big">Salva consensi</button>') + "</form>" + note("Puoi revocare un consenso quando vuoi. Se revochi le foto, il Moderatore riceve una segnalazione e toglie le immagini in cui compari.");
  };

  /* ----- DOCENTE ----- */
  function myTeach() { var u = me(); return db.courses.filter(function (c) { return c.docenteId === u.id && ["archiviato", "eliminato"].indexOf(c.stato) < 0; }); }
  function courseSelect(list, sel, path) { return '<label class="fld"><span>Corso</span><select data-goto>' + list.map(function (c) { return opt(path + c.id, c.titolo + (c.stato !== "pubblicato" ? " (" + c.stato + ")" : ""), path + sel); }).join("") + "</select></label>"; }
  A["doc-corsi"] = function () {
    var cs = myTeach();
    return note("Vedi solo i tuoi corsi. Per cambiare date, iscrizioni o lista d'attesa scrivi al Moderatore.") + (cs.map(function (c, k) {
      var st = cStats(c);
      var iscr = cEnr(c.id, "confermato").map(function (e) { var s = user(e.socioId); var p = presPct(c.id, s.id); return tr([esc(fullName(s)), esc(s.email), esc(s.tel), s.consImg ? "Sì" : badge("No", "warn"), p == null ? "—" : p + "%"]); });
      return '<div class="pcard"><div class="row-between"><div><h3>' + esc(c.titolo) + '</h3><p class="meta">' + esc(c.giorno) + " " + esc(c.ora) + " · " + esc(c.luogo) + " · " + st.conf + "/" + c.posti + " iscritti</p></div>" + badge(c.stato, c.stato === "pubblicato" ? "ok" : "grey") + "</div><details" + (k === 0 ? " open" : "") + "><summary>Iscritti (" + st.conf + ")</summary>" + tbl(["Nome", "Email", "Telefono", "Consenso foto", "Presenze"], iscr) + "</details><details><summary>Lista d'attesa (" + st.att.length + ")</summary>" + (st.att.length ? "<ol>" + st.att.map(function (e) { return "<li>" + esc(fullName(user(e.socioId))) + "</li>"; }).join("") + "</ol>" : '<p class="empty">Nessuno in lista.</p>') + '<p class="meta">Solo visualizzazione.</p></details></div>';
    }).join("") || '<p class="empty">Nessun corso assegnato.</p>');
  };
  A["doc-presenze"] = function (p) {
    var cs = myTeach().filter(function (c) { return c.stato === "pubblicato" || c.stato === "concluso"; });
    if (!cs.length) return '<p class="empty">Nessun corso.</p>';
    var c = cs.filter(function (x) { return x.id === p[0]; })[0] || cs[0];
    var ls = lessons(c).filter(function (l) { return l.date <= today() && !l.annullata; });
    if (!ls.length) return courseSelect(cs, c.id, "#/area/doc-presenze/") + '<p class="empty">Nessuna lezione ancora svolta.</p>';
    var L = ls.filter(function (l) { return String(l.i) === String(p[1]); })[0] || ls[ls.length - 1];
    var lock = addDaysIso(L.date, 7) < today();
    var pres = (db.pres[c.id] || {})[L.i] || [];
    var rows = cEnr(c.id, "confermato").map(function (e) { var s = user(e.socioId); return '<label class="presrow"><input type="checkbox" name="p" value="' + s.id + '"' + (pres.indexOf(s.id) >= 0 ? " checked" : "") + (lock ? " disabled" : "") + "><span>" + esc(fullName(s)) + "</span></label>"; }).join("");
    return '<div class="grid2">' + courseSelect(cs, c.id, "#/area/doc-presenze/") + '<label class="fld"><span>Lezione</span><select data-goto>' + ls.map(function (l) { return opt("#/area/doc-presenze/" + c.id + "/" + l.i, "Lezione " + (l.i + 1) + " – " + fmtDay(l.date), "#/area/doc-presenze/" + c.id + "/" + L.i); }).join("") + "</select></label></div>" +
      (lock ? note("Questa lezione è di più di 7 giorni fa: la correzione la fa il Moderatore o l'Admin.") : note("Spunta chi è presente. Nel sito vero puoi anche scansionare il QR della tessera.")) +
      '<form class="form" data-form="presenze" data-c="' + c.id + '" data-l="' + L.i + '"><div class="presgrid">' + rows + '</div><p class="meta" id="pres-count">' + pres.length + " presenti</p>" + (lock ? "" : '<div class="btns"><button type="button" class="btn btn--line" data-act="all-present">Tutti presenti</button><button class="btn btn--dark btn--big">Salva presenze</button></div>') + "</form>";
  };
  A["doc-materiali"] = function (p) {
    var cs = myTeach(); if (!cs.length) return '<p class="empty">Nessun corso.</p>';
    var c = cs.filter(function (x) { return x.id === p[0]; })[0] || cs[0];
    var ms = db.materiali.filter(function (m) { return m.corsoId === c.id; });
    return courseSelect(cs, c.id, "#/area/doc-materiali/") + card("Carica un file", '<form class="form" data-form="materiale" data-c="' + c.id + '"><label class="fld"><span>File (PDF, dispense)</span><input type="file" name="file" required></label><button class="btn btn--dark btn--big">Carica</button><p class="small muted">Demo: si salva solo il nome del file. Lo vedono solo gli iscritti confermati.</p></form>') +
      tbl(["File", "Data", ""], ms.map(function (m) { return tr([esc(m.nome), fmt(m.data), '<button class="btn btn--line btn--sm" data-act="del-materiale" data-id="' + m.id + '">Togli</button>']); }), "mat-doc");
  };
  A["doc-avvisi"] = function () {
    var cs = myTeach().filter(function (c) { return c.stato === "pubblicato"; });
    var mine = db.avvisi.filter(function (a) { return cs.some(function (c) { return c.id === a.corsoId; }); });
    return card("Scrivi agli iscritti", '<form class="form" data-form="avviso"><label class="fld"><span>Corso</span><select name="corsoId">' + cs.map(function (c) { return opt(c.id, c.titolo + " (" + cStats(c).conf + " iscritti)"); }).join("") + '</select></label><label class="fld"><span>Messaggio</span><textarea name="testo" rows="4" required placeholder="Es. Domani portate il quaderno."></textarea></label><button class="btn btn--dark btn--big">Invia avviso</button><p class="small muted">Arriva via email (simulata) e nell\'Area soci degli iscritti. Email inviate oggi: ' + db.emailOggi.n + "/" + db.settings.emailLimite + " (limite Resend gratuito).</p></form>") +
      tbl(["Data", "Corso", "Testo", "Destinatari"], mine.map(function (a) { return tr([fmt(a.data), esc(course(a.corsoId).titolo), esc(a.testo), a.destinatari]); }));
  };
  A["doc-foto"] = function () {
    var cs = myTeach(), u = me();
    var mine = db.gallery.filter(function (g) { return g.da === fullName(u); });
    return card("Proponi una foto per la galleria", '<form class="form" data-form="foto-docente"><label class="fld"><span>Corso</span><select name="corsoId">' + cs.map(function (c) { return opt(c.id, c.titolo); }).join("") + '</select></label><label class="fld"><span>Titolo</span><input name="titolo" required placeholder="Es. Lezione all\'aperto"></label><label class="fld"><span>Foto dal tuo dispositivo</span><input type="file" name="file" accept="image/*"></label><label class="fld"><span>…oppure una foto di esempio</span><select name="sample"><option value="">—</option>' + IMGS.map(function (s, i) { return opt(s, "Foto di esempio " + (i + 1)); }).join("") + '</select></label><button class="btn btn--dark btn--big">Invia in revisione</button><p class="small muted">Va online solo dopo l\'approvazione del Moderatore. Controlla che le persone abbiano dato il consenso.</p></form>') +
      '<div class="gal gal--sm" id="my-photos">' + mine.map(function (g) { return '<figure><img src="' + esc(g.src) + '" alt=""><figcaption>' + esc(g.titolo) + "<br>" + badge(g.stato, g.stato === "pubblicata" ? "ok" : g.stato === "rifiutata" ? "warn" : "grey") + "</figcaption></figure>"; }).join("") + "</div>";
  };

  /* ----- MODERATORE / ADMIN ----- */
  A.cruscotto = function () {
    var adm = role() === "admin";
    var next = []; publicCourses().forEach(function (c) { lessons(c).forEach(function (l) { if (l.date >= today() && !l.annullata) next.push({ c: c, l: l }); }); });
    next.sort(function (a, b) { return a.l.date < b.l.date ? -1 : 1; });
    var full = publicCourses().filter(function (c) { return cStats(c).liberi === 0; }).length;
    var att = db.enr.filter(function (e) { return e.stato === "attesa"; }).length;
    var off = db.enr.filter(function (e) { return e.stato === "offerta"; }).length;
    var msg = db.messages.filter(function (m) { return m.stato === "nuovo"; }).length + db.proposte.filter(function (p) { return p.stato === "nuova"; }).length;
    var foto = db.gallery.filter(function (g) { return g.stato === "in revisione"; }).length;
    var tiles = [["Corsi pieni", full, "g-corsi"], ["In lista d'attesa", att, "g-attesa"], ["Posti offerti in attesa di risposta", off, "g-attesa"], ["Messaggi e proposte nuovi", msg, "g-messaggi"], ["Foto da approvare", foto, "g-galleria"], ["Email inviate oggi (limite " + db.settings.emailLimite + ")", db.emailOggi.n, "g-newsletter"]];
    if (adm) {
      var d30 = addDaysIso(today(), -30);
      tiles = [["Soci attivi", db.users.filter(function (u) { return u.stato === "attivo"; }).length, "a-soci"], ["Adesioni da approvare", db.users.filter(function (u) { return u.stato === "in attesa"; }).length, "a-soci"], ["Incassi ultimi 30 giorni", euro(db.payments.filter(function (p) { return p.data >= d30 && p.stato === "Pagato"; }).reduce(function (s, p) { return s + Number(p.importo); }, 0)), "a-pagamenti"], ["Donazioni senza ricevuta", db.donations.filter(function (d) { return !d.ricevuta; }).length, "a-donazioni"]].concat(tiles);
    }
    return '<div class="tiles">' + tiles.map(function (t) { return '<a class="tile" href="#/area/' + t[2] + '"><b>' + t[1] + "</b><span>" + t[0] + "</span></a>"; }).join("") + "</div>" + card("Prossime lezioni", tbl(["Data", "Ora", "Corso", "Iscritti"], next.slice(0, 6).map(function (x) { return tr([fmtDay(x.l.date), esc(x.c.ora), esc(x.c.titolo), cStats(x.c).conf + "/" + x.c.posti]); }))) + card("Iscrizioni per corso", tbl(["Corso", "Iscritti", "Lista d'attesa"], publicCourses().map(function (c) { var s = cStats(c); return tr([esc(c.titolo), s.conf + "/" + c.posti, s.att.length]); })));
  };
  A["g-corsi"] = function (p) {
    if (p[0]) return courseForm(p[0] === "nuovo" ? null : course(p[0]));
    return '<div class="btns"><a class="btn btn--dark btn--big" href="#/area/g-corsi/nuovo">+ Nuovo corso</a><a class="btn btn--line" href="#/calendario">Vedi il calendario pubblico</a></div>' +
      tbl(["Corso", "Docente", "Quando", "Iscritti", "Stato", ""], db.courses.filter(function (c) { return c.stato !== "eliminato"; }).map(function (c) { return tr(["<b>" + esc(c.titolo) + "</b>", esc(fullName(user(c.docenteId))), esc(c.giorno) + " " + esc(c.ora) + '<br><span class="meta">dal ' + fmt(c.inizio) + "</span>", cStats(c).conf + "/" + c.posti, badge(c.stato, c.stato === "pubblicato" ? "ok" : "grey"), '<a class="btn btn--line btn--sm" href="#/area/g-corsi/' + c.id + '">Modifica</a>']); }), "courses-admin");
  };
  function courseForm(c) {
    var isNew = !c; c = c || { titolo: "", categoria: CATS[0], docenteId: "", ora: "17:00", luogo: "Aula 1 – Sede UNIdea", lezioni: 8, posti: 15, inizio: addDaysIso(today(), 14), costo: 0, img: IMGS[0], stato: "pubblicato", livello: "Per tutti", descr: "" };
    var docs = db.users.filter(function (u) { return u.ruolo === "docente"; });
    var form = '<form class="form" data-form="corso" data-id="' + (isNew ? "" : c.id) + '"><label class="fld"><span>Titolo</span><input name="titolo" required value="' + esc(c.titolo) + '"></label><div class="grid2"><label class="fld"><span>Argomento</span><select name="categoria">' + CATS.map(function (x) { return opt(x, x, c.categoria); }).join("") + '</select></label><label class="fld"><span>Docente</span><select name="docenteId" required>' + docs.map(function (d) { return opt(d.id, fullName(d), c.docenteId); }).join("") + '</select></label></div><div class="grid2"><label class="fld"><span>Prima lezione</span><input type="date" name="inizio" required value="' + esc(c.inizio) + '"></label><label class="fld"><span>Ora</span><input type="time" name="ora" required value="' + esc(c.ora) + '"></label></div><label class="fld"><span>Luogo</span><input name="luogo" required value="' + esc(c.luogo) + '"></label><div class="grid3"><label class="fld"><span>Lezioni</span><input type="number" min="1" max="40" name="lezioni" required value="' + esc(c.lezioni) + '"></label><label class="fld"><span>Posti</span><input type="number" min="1" name="posti" required value="' + esc(c.posti) + '"></label><label class="fld"><span>Costo € (0 = gratuito)</span><input type="number" min="0" name="costo" value="' + esc(c.costo) + '"></label></div><div class="grid2"><label class="fld"><span>Livello</span><select name="livello">' + ["Per tutti", "Principianti", "Intermedio"].map(function (x) { return opt(x, x, c.livello); }).join("") + '</select></label><label class="fld"><span>Immagine</span><select name="img">' + IMGS.map(function (x, i) { return opt(x, "Foto " + (i + 1) + " – " + x.replace("img/", ""), c.img); }).join("") + '</select></label></div><label class="fld"><span>Descrizione</span><textarea name="descr" rows="4" required>' + esc(c.descr) + '</textarea></label><label class="fld"><span>Stato</span><select name="stato">' + opt("pubblicato", "Pubblicato (visibile sul sito)", c.stato) + opt("bozza", "Bozza (non visibile)", c.stato) + opt("archiviato", "Archiviato", c.stato) + (c.stato === "concluso" ? opt("concluso", "Concluso", c.stato) : "") + '</select></label><div class="btns"><button class="btn btn--dark btn--big">' + (isNew ? "Crea corso" : "Salva modifiche") + '</button><a class="btn btn--line" href="#/area/g-corsi">Annulla</a>' + (isNew ? "" : '<a class="btn btn--line" href="#/corso/' + c.id + '">Vedi sul sito</a>') + "</div></form>";
    var les = isNew ? "" : card("Lezioni", note("Annullando una lezione gli iscritti ricevono un avviso automatico e il calendario si aggiorna.") + tbl(["Lezione", "Data", "", ""], lessons(c).map(function (l) { return tr(["Lezione " + (l.i + 1), fmtDay(l.date), l.annullata ? badge("Annullata", "warn") : "", l.date < today() ? "" : '<button class="btn btn--line btn--sm" data-act="toggle-lesson" data-id="' + c.id + '" data-i="' + l.i + '">' + (l.annullata ? "Ripristina" : "Annulla lezione") + "</button>"]); })));
    var del = !isNew && role() === "admin" ? card("Solo Admin", '<button class="btn btn--danger" data-act="del-course" data-id="' + c.id + '">Elimina definitivamente</button>') : "";
    return '<p><a href="#/area/g-corsi">← Tutti i corsi</a></p>' + card(isNew ? "Nuovo corso" : "Modifica corso", form) + les + del;
  }
  A["g-iscrizioni"] = function (p) {
    var cs = publicCourses(); if (!cs.length) return '<p class="empty">Nessun corso pubblicato.</p>';
    var c = cs.filter(function (x) { return x.id === p[0]; })[0] || cs[0], adm = role() === "admin";
    var st = cStats(c);
    var rows = cEnr(c.id, "confermato").map(function (e) {
      var s = user(e.socioId), act;
      if (!Number(c.costo)) act = '<button class="btn btn--line btn--sm" data-act="unenroll" data-id="' + e.id + '">Annulla iscrizione</button>';
      else act = adm ? '<button class="btn btn--line btn--sm" data-act="refund-enroll" data-id="' + e.id + '">Annulla e rimborsa</button>' : '<span class="meta">A pagamento: chiedi all\'Admin</span>';
      return tr([esc(fullName(s)), esc(s.email), esc(s.tel), quotaOk(s) ? badge("attiva", "ok") : badge("scaduta", "warn"), s.consImg ? "Sì" : badge("No", "warn"), act]);
    });
    var avail = db.users.filter(function (u) { return u.stato === "attivo" && !db.enr.some(function (e) { return e.corsoId === c.id && e.socioId === u.id && ["confermato", "attesa", "offerta"].indexOf(e.stato) >= 0; }); });
    return courseSelect(cs, c.id, "#/area/g-iscrizioni/") + '<p class="meta">' + st.conf + "/" + c.posti + " iscritti · " + st.liberi + " posti liberi · " + st.att.length + " in lista d'attesa</p>" +
      (Number(c.costo) && !adm ? note("Questo corso è a pagamento: iscrizioni manuali e rimborsi li gestisce l'Admin.") : card("Iscrivi a mano un socio", '<form class="form form--inline" data-form="iscrivi" data-c="' + c.id + '"><label class="fld"><span>Socio</span><select name="socioId">' + avail.map(function (u) { return opt(u.id, fullName(u) + " · " + u.tessera); }).join("") + '</select></label><button class="btn btn--dark"' + (st.liberi > 0 ? "" : " disabled") + ">Iscrivi</button></form>" + (st.liberi > 0 ? "" : '<p class="meta">Corso pieno: usa la lista d\'attesa.</p>'))) +
      tbl(["Nome", "Email", "Telefono", "Quota", "Consenso foto", ""], rows, "iscr-tbl");
  };
  A["g-attesa"] = function () {
    var out = publicCourses().map(function (c) {
      var st = cStats(c), offs = cEnr(c.id, "offerta");
      if (!st.att.length && !offs.length) return "";
      return '<div class="pcard waitcard" data-course="' + c.id + '"><div class="row-between"><h3>' + esc(c.titolo) + "</h3>" + badge(st.liberi + " posti liberi", st.liberi ? "ok" : "grey") + "</div>" +
        (offs.length ? "<p><b>Posti offerti</b></p>" + offs.map(function (e) { return '<p class="meta">' + esc(fullName(user(e.socioId))) + " · risponde entro il " + fmtTs(e.scade) + "</p>"; }).join("") : "") +
        tbl(["#", "Nome", "In lista dal", ""], st.att.map(function (e, i) { return tr([i + 1, esc(fullName(user(e.socioId))), fmt(String(e.data).slice(0, 10)), (i === 0 ? '<button class="btn btn--dark btn--sm" data-act="offer" data-id="' + e.id + '"' + (st.liberi > 0 ? "" : " disabled") + ">Offri posto</button> " : "") + '<button class="btn btn--line btn--sm" data-act="wait-refuse" data-id="' + e.id + '">Segna rifiuto</button>']); })) + "</div>";
    }).join("");
    return note("Offri il posto al primo della lista: riceve un'email e ha " + esc(db.settings.offertaOre) + " ore per accettare dall'Area soci.") + (out || '<p class="empty">Nessuno in lista d\'attesa.</p>');
  };
  A["g-contenuti"] = function (p) {
    var tab = p[0] || "news", adm = role() === "admin";
    var tabs = '<div class="tabs">' + [["news", "News"], ["faq", "FAQ"], ["avviso", "Avviso in evidenza"]].map(function (t) { return '<a href="#/area/g-contenuti/' + t[0] + '"' + (tab === t[0] || (tab.indexOf("news-") === 0 && t[0] === "news") ? ' aria-current="page"' : "") + ">" + t[1] + "</a>"; }).join("") + "</div>";
    if (tab === "news" || tab.indexOf("news-") === 0) {
      var edit = tab === "news-nuova" ? {} : tab.indexOf("news-") === 0 ? byId(db.news, tab.slice(5)) : null;
      if (edit) return tabs + card(edit.id ? "Modifica news" : "Nuova news", '<form class="form" data-form="news" data-id="' + (edit.id || "") + '"><label class="fld"><span>Titolo</span><input name="titolo" required value="' + esc(edit.titolo || "") + '"></label><label class="fld"><span>Testo</span><textarea name="testo" rows="6" required>' + esc(edit.testo || "") + '</textarea></label><label class="fld"><span>Stato</span><select name="stato">' + opt("pubblicata", "Pubblica subito", edit.stato) + opt("bozza", "Salva come bozza", edit.stato) + '</select></label><div class="btns"><button class="btn btn--dark btn--big">Salva</button><a class="btn btn--line" href="#/area/g-contenuti/news">Annulla</a></div></form>');
      var ns = db.news.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; });
      return tabs + '<div class="btns"><a class="btn btn--dark btn--big" href="#/area/g-contenuti/news-nuova">+ Nuova news</a>' + (adm && db.news.some(function (n) { return n.stato === "cestino"; }) ? '<button class="btn btn--danger" data-act="empty-trash">Svuota cestino</button>' : "") + "</div>" +
        tbl(["Titolo", "Data", "Stato", ""], ns.map(function (n) {
          var acts = '<a class="btn btn--line btn--sm" href="#/area/g-contenuti/news-' + n.id + '">Modifica</a> ';
          if (n.stato === "cestino") acts += '<button class="btn btn--line btn--sm" data-act="news-state" data-id="' + n.id + '" data-s="bozza">Recupera</button>';
          else acts += '<button class="btn btn--line btn--sm" data-act="news-state" data-id="' + n.id + '" data-s="' + (n.stato === "pubblicata" ? "bozza" : "pubblicata") + '">' + (n.stato === "pubblicata" ? "Nascondi" : "Pubblica") + '</button> <button class="btn btn--line btn--sm" data-act="news-state" data-id="' + n.id + '" data-s="cestino">Cestino</button>';
          return tr([esc(n.titolo), fmt(n.data), badge(n.stato, n.stato === "pubblicata" ? "ok" : n.stato === "cestino" ? "warn" : "grey"), acts]);
        }), "news-admin") + note(adm ? "Come Admin puoi svuotare il cestino (eliminazione definitiva)." : "Quello che sposti nel cestino resta recuperabile per 30 giorni. Solo l'Admin elimina definitivamente.");
    }
    if (tab === "faq") return tabs + db.faq.map(function (f) { return '<form class="form pcard" data-form="faq" data-id="' + f.id + '"><label class="fld"><span>Domanda</span><input name="q" value="' + esc(f.q) + '" required></label><label class="fld"><span>Risposta</span><textarea name="a" rows="2" required>' + esc(f.a) + '</textarea></label><div class="btns"><button class="btn btn--dark btn--sm">Salva</button><button type="button" class="btn btn--line btn--sm" data-act="del-faq" data-id="' + f.id + '">Togli</button></div></form>'; }).join("") + card("Nuova domanda", '<form class="form" data-form="faq" data-id=""><label class="fld"><span>Domanda</span><input name="q" required></label><label class="fld"><span>Risposta</span><textarea name="a" rows="2" required></textarea></label><button class="btn btn--dark">Aggiungi</button></form>');
    return tabs + card("Avviso in evidenza", '<form class="form" data-form="urgent"><label class="fld"><span>Testo (es. lezione annullata, cambio aula)</span><textarea name="testo" rows="2">' + esc(db.urgent.testo) + '</textarea></label><label class="switch"><input type="checkbox" name="attivo"' + (db.urgent.attivo ? " checked" : "") + '><span><b>Mostra sul sito</b> in cima a ogni pagina</span></label><button class="btn btn--dark btn--big">Salva avviso</button></form>');
  };
  A["g-galleria"] = function () {
    var pend = db.gallery.filter(function (g) { return g.stato === "in revisione"; }), pub = db.gallery.filter(function (g) { return g.stato === "pubblicata"; });
    return card("Foto proposte dai docenti (" + pend.length + ")", pend.length ? '<div class="gal gal--sm">' + pend.map(function (g) { return '<figure class="pending" data-g="' + g.id + '"><img src="' + esc(g.src) + '" alt=""><figcaption><b>' + esc(g.titolo) + '</b><br><span class="meta">da ' + esc(g.da) + (course(g.corsoId) ? " · " + esc(course(g.corsoId).titolo) : "") + '</span><div class="btns"><button class="btn btn--dark btn--sm" data-act="photo-ok" data-id="' + g.id + '">Approva</button><button class="btn btn--line btn--sm" data-act="photo-no" data-id="' + g.id + '">Rifiuta</button></div></figcaption></figure>'; }).join("") + "</div>" + note("Prima di approvare controlla che le persone nella foto abbiano il consenso immagini (lo vedi in Iscrizioni).") : '<p class="empty">Nessuna foto da approvare.</p>') +
      card("Carica una foto", '<form class="form" data-form="foto-mod"><label class="fld"><span>Titolo</span><input name="titolo" required></label><label class="fld"><span>Foto</span><input type="file" name="file" accept="image/*"></label><label class="fld"><span>…oppure una foto di esempio</span><select name="sample"><option value="">—</option>' + IMGS.map(function (s, i) { return opt(s, "Foto di esempio " + (i + 1)); }).join("") + '</select></label><button class="btn btn--dark">Pubblica</button></form>') +
      card("Pubblicate (" + pub.length + ")", '<div class="gal gal--sm">' + pub.map(function (g) { return '<figure><img src="' + esc(g.src) + '" alt=""><figcaption>' + esc(g.titolo) + '<br><button class="btn btn--line btn--sm" data-act="photo-remove" data-id="' + g.id + '">Rimuovi (consenso revocato)</button></figcaption></figure>'; }).join("") + "</div>");
  };
  A["g-messaggi"] = function () {
    var ms = db.messages.filter(function (m) { return m.stato !== "archiviato"; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
    return card("Messaggi dal modulo Contatti e segnalazioni", ms.map(function (m) {
      return '<div class="msg" data-m="' + m.id + '"><div class="row-between"><b>' + esc(m.oggetto) + "</b>" + badge(m.stato, m.stato === "nuovo" ? "warn" : "ok") + '</div><p class="meta">' + esc(m.nome) + " · " + esc(m.email) + " · " + fmt(m.data) + "</p><p>" + esc(m.testo) + "</p>" + (m.risposta ? '<p class="reply"><b>Risposta:</b> ' + esc(m.risposta) + "</p>" : '<form class="form" data-form="reply" data-id="' + m.id + '"><label class="fld"><span>Risposta</span><textarea name="r" rows="2" required></textarea></label><div class="btns"><button class="btn btn--dark btn--sm">Rispondi (email simulata)</button><button type="button" class="btn btn--line btn--sm" data-act="msg-archive" data-id="' + m.id + '">Archivia</button></div></form>') + "</div>";
    }).join("") || '<p class="empty">Nessun messaggio.</p>') +
      card("Proposte da «Insegna con noi»", tbl(["Proposta", "Da", "Stato"], db.proposte.map(function (p) { return tr(["<b>" + esc(p.titolo) + '</b><br><span class="meta">' + esc(p.testo) + "</span>", esc(p.nome) + '<br><span class="meta">' + esc(p.email) + "</span>", '<select aria-label="Stato proposta" data-act-change="proposta-state" data-id="' + p.id + '">' + ["nuova", "in valutazione", "accettata", "non accettata"].map(function (s) { return opt(s, s, p.stato); }).join("") + "</select>"]); })));
  };
  function nlCount() { return db.users.filter(function (u) { return u.consNews && u.stato === "attivo"; }).length + (db.nlIscritti || []).length; }
  A["g-newsletter"] = function () {
    var adm = role() === "admin";
    return note("Destinatari con consenso newsletter: <b>" + nlCount() + "</b>. " + (adm ? "Tu puoi inviare le bozze preparate dal Moderatore." : "Prepari la bozza: la rivede e la invia l'Admin.")) +
      card("Nuova bozza", '<form class="form" data-form="newsletter-draft"><label class="fld"><span>Oggetto</span><input name="oggetto" required></label><label class="fld"><span>Testo</span><textarea name="testo" rows="5" required></textarea></label><button class="btn btn--dark btn--big">Salva bozza</button></form>') +
      tbl(["Oggetto", "Autore", "Stato", ""], db.newsletter.map(function (x) { return tr([esc(x.oggetto), esc(x.autore), badge(x.stato, x.stato === "inviata" ? "ok" : "grey"), adm && x.stato === "bozza" ? '<button class="btn btn--dark btn--sm" data-act="nl-send" data-id="' + x.id + '">Invia</button>' : x.stato === "bozza" ? '<span class="meta">In attesa dell\'Admin</span>' : '<span class="meta">' + esc(x.inviataA || "") + "</span>"]); }), "nl-table");
  };
  A["g-iscritti"] = function () {
    var us = db.users.filter(function (u) { return ["in attesa", "cessato"].indexOf(u.stato) < 0; });
    return note("Dati operativi: senza codice fiscale, data di nascita, indirizzo e importi.") + '<label class="fld"><span>Cerca</span><input data-search="#iscritti-tbl" placeholder="Nome o email"></label>' +
      tbl(["Nome", "Email", "Telefono", "Livello", "Quota", "Consenso foto"], us.map(function (u) { return tr([esc(fullName(u)), esc(u.email), esc(u.tel), esc(u.livello), quotaOk(u) ? badge("attiva", "ok") : badge("scaduta", "warn"), u.consImg ? "Sì" : badge("No", "warn")]); }), "", "iscritti-tbl");
  };
  /* ----- ADMIN ----- */
  A["a-soci"] = function (p) {
    if (p[0]) return socioForm(user(p[0]));
    var pend = db.users.filter(function (u) { return u.stato === "in attesa"; });
    var all = db.users.filter(function (u) { return u.stato !== "in attesa"; });
    return card("Adesioni da approvare (" + pend.length + ")", pend.length ? tbl(["Nome", "Email", "Codice fiscale", "Richiesta", ""], pend.map(function (u) { return tr([esc(fullName(u)), esc(u.email), esc(u.cf), fmt(u.adesione), '<button class="btn btn--dark btn--sm" data-act="approve" data-id="' + u.id + '">Approva</button> <button class="btn btn--line btn--sm" data-act="reject" data-id="' + u.id + '">Rifiuta</button>']); }), "pending-tbl") + note("Approvando si attiva il socio, si genera la tessera QR e parte l'email di benvenuto.") : '<p class="empty">Nessuna adesione in attesa.</p>') +
      '<label class="fld"><span>Cerca socio</span><input data-search="#soci-tbl" placeholder="Nome, email, CF, tessera"></label>' +
      tbl(["Tessera", "Nome", "Codice fiscale", "Nascita", "Contatti", "Stato", ""], all.map(function (u) { return tr([esc(u.tessera), esc(fullName(u)) + (u.ruolo !== "socio" ? "<br>" + badge(ROLES[u.ruolo], "grey") : ""), esc(u.cf), fmt(u.nascita), esc(u.email) + "<br>" + esc(u.tel), badge(u.stato, u.stato === "attivo" ? "ok" : "warn"), '<a class="btn btn--line btn--sm" href="#/area/a-soci/' + u.id + '">Scheda</a>']); }), "", "soci-tbl");
  };
  function socioForm(u) {
    if (!u) return '<p class="empty">Socio non trovato.</p>';
    var f = [["nome", "Nome"], ["cognome", "Cognome"], ["email", "Email"], ["tel", "Telefono"], ["cf", "Codice fiscale"], ["nascita", "Data di nascita", "date"], ["indirizzo", "Indirizzo"], ["quotaScadenza", "Scadenza quota", "date"]];
    return '<p><a href="#/area/a-soci">← Tutti i soci</a></p>' + card("Scheda di " + esc(fullName(u)), '<form class="form" data-form="socio" data-id="' + u.id + '"><div class="grid2">' + f.map(function (x) { return '<label class="fld"><span>' + x[1] + '</span><input name="' + x[0] + '" type="' + (x[2] || "text") + '" value="' + esc(u[x[0]]) + '"></label>'; }).join("") + '</div><label class="fld"><span>Livello (correzione manuale)</span><select name="livello">' + ["Base", "Attivo", "Sostenitore"].map(function (l) { return opt(l, l, u.livello); }).join("") + '</select></label><p class="meta">Consenso foto: ' + (u.consImg ? "sì" : "no") + " · newsletter: " + (u.consNews ? "sì" : "no") + " · informativa " + esc(u.consVer) + " del " + fmt(u.consData) + '</p><button class="btn btn--dark btn--big">Salva</button></form>') +
      card("Tessera e stato", "<p>Stato: " + badge(u.stato, u.stato === "attivo" ? "ok" : "warn") + '</p><div class="btns">' + (u.stato === "sospeso" ? '<button class="btn btn--line" data-act="socio-state" data-id="' + u.id + '" data-s="attivo">Riattiva tessera</button>' : '<button class="btn btn--line" data-act="socio-state" data-id="' + u.id + '" data-s="sospeso">Sospendi tessera</button>') + '<button class="btn btn--danger" data-act="socio-cessa" data-id="' + u.id + '">Registra cessazione</button></div>');
  }
  A["a-pagamenti"] = function () {
    var tot = db.payments.filter(function (p) { return p.stato === "Pagato"; }).reduce(function (s, p) { return s + Number(p.importo); }, 0);
    return note("Sola lettura: i pagamenti arrivano da Stripe tramite webhook e non si modificano a mano. (Simulato: nessun collegamento reale.)") + '<div class="tiles"><div class="tile"><b>' + euro(tot) + '</b><span>Totale incassato</span></div><div class="tile"><b>' + db.payments.length + "</b><span>Movimenti</span></div></div>" +
      tbl(["Data", "Socio", "Descrizione", "Importo", "Stato", "ID Stripe"], db.payments.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; }).map(function (p) { return tr([fmt(p.data), esc(fullName(user(p.socioId))), esc(p.tipo), euro(p.importo), badge(p.stato, p.stato === "Pagato" ? "ok" : "warn"), "<code>" + esc(p.stripe) + "</code>"]); }), "pay-tbl");
  };
  A["a-donazioni"] = function () {
    return note("Le ricevute per le erogazioni liberali (art. 83 CTS) si emettono qui; il donatore socio le trova nella sua Area soci.") +
      tbl(["Data", "Donatore", "Importo", "Metodo", "Ricevuta"], db.donations.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; }).map(function (d) { return tr([fmt(d.data), esc(d.nome) + '<br><span class="meta">' + esc(d.email) + "</span>", euro(d.importo), esc(d.metodo), d.ricevuta ? esc(d.ricevuta) + ' <button class="btn btn--line btn--sm" data-act="receipt-don" data-id="' + d.id + '">Scarica</button>' : '<button class="btn btn--dark btn--sm" data-act="emit-receipt" data-id="' + d.id + '">Emetti ricevuta</button>']); }), "don-tbl") +
      card("5×1000", '<p class="muted">Codice fiscale da comunicare: <b class="ink">93070870915</b>. Gli importi del 5×1000 arrivano dal Ministero e si pubblicano in Trasparenza.</p>');
  };
  A["a-trasparenza"] = function () {
    return card("Carica un documento", '<form class="form" data-form="doc"><label class="fld"><span>Sezione</span><select name="categoria">' + DOC_CATS.map(function (c) { return opt(c, c); }).join("") + '</select></label><label class="fld"><span>Titolo</span><input name="titolo" required placeholder="Es. Rendiconto 2025"></label><label class="fld"><span>File PDF</span><input type="file" name="file" accept=".pdf,application/pdf"></label><button class="btn btn--dark btn--big">Pubblica in Trasparenza</button><p class="small muted">Demo: si salva solo il nome del file.</p></form>') +
      tbl(["Documento", "Sezione", "Data", ""], db.docs.map(function (d) { return tr([esc(d.titolo) + '<br><span class="meta">' + esc(d.file) + "</span>", esc(d.categoria), fmt(d.data), '<button class="btn btn--line btn--sm" data-act="del-doc" data-id="' + d.id + '">Elimina</button>']); }), "docs-tbl") +
      card("Contributi pubblici ricevuti", '<form class="form grid2" data-form="contributo"><label class="fld"><span>Ente</span><input name="ente" required></label><label class="fld"><span>Importo €</span><input name="importo" type="number" min="1" required></label><label class="fld"><span>Data</span><input name="data" type="date" required value="' + today() + '"></label><label class="fld"><span>Causale</span><input name="causale" required></label><button class="btn btn--dark">Aggiungi</button></form>' + tbl(["Ente", "Importo", "Data"], db.contributi.map(function (c) { return tr([esc(c.ente), euro(c.importo), fmt(c.data)]); })));
  };
  A["a-utenti"] = function () {
    var o = { admin: 0, moderatore: 1, docente: 2, socio: 3 };
    var us = db.users.filter(function (u) { return ["in attesa", "cessato"].indexOf(u.stato) < 0; }).sort(function (a, b) { return o[a.ruolo] - o[b.ruolo]; });
    return note("Ogni persona ha un solo ruolo. Il cambio richiede la doppia conferma. Non si può togliere il ruolo all'ultimo Admin.") + '<label class="fld"><span>Cerca</span><input data-search="#utenti-tbl" placeholder="Nome o email"></label>' +
      tbl(["Nome", "Email", "Ruolo attuale", "Nuovo ruolo"], us.map(function (u) { return tr([esc(fullName(u)), esc(u.email), badge(ROLES[u.ruolo], u.ruolo === "socio" ? "grey" : "ok"), '<div class="form--inline"><select aria-label="Nuovo ruolo per ' + esc(fullName(u)) + '" data-role-for="' + u.id + '">' + ["socio", "docente", "moderatore", "admin"].map(function (r) { return opt(r, ROLES[r], u.ruolo); }).join("") + '</select><button class="btn btn--dark btn--sm" data-act="change-role" data-id="' + u.id + '">Cambia</button></div>']); }), "", "utenti-tbl");
  };
  A["a-impostazioni"] = function () {
    var s = db.settings;
    var f = [["quota", "Quota associativa (€)", "number"], ["durata", "Validità della quota"], ["soglia", "Soglia presenze per l'attestato (%)", "number"], ["offertaOre", "Ore per accettare un posto offerto", "number"], ["sede", "Sede"], ["orari", "Orari segreteria"], ["mittente", "Mittente email"], ["emailLimite", "Limite email al giorno (Resend gratuito: 100)", "number"]];
    return '<form class="form" data-form="settings">' + card("Impostazioni dell'associazione", f.map(function (x) { return '<label class="fld"><span>' + x[1] + '</span><input name="' + x[0] + '" type="' + (x[2] || "text") + '" value="' + esc(s[x[0]]) + '" required></label>'; }).join("") + '<button class="btn btn--dark btn--big">Salva impostazioni</button>') + "</form>" + note("Le modifiche si vedono subito sul sito: es. la quota in «Diventa socio», la sede in «Contatti».");
  };
  A["a-export"] = function () {
    return card("Libro soci", '<p class="muted">Tutti i soci con dati anagrafici, stato, quota e consensi. File CSV apribile con Excel.</p><button class="btn btn--dark btn--big" data-act="export" data-what="soci">Scarica libro soci (CSV)</button>') +
      card("Altri elenchi", '<div class="btns"><button class="btn btn--line" data-act="export" data-what="iscrizioni">Iscrizioni ai corsi (CSV)</button><button class="btn btn--line" data-act="export" data-what="pagamenti">Pagamenti (CSV)</button><button class="btn btn--line" data-act="export" data-what="donazioni">Donazioni (CSV)</button></div>') + note("Ogni esportazione richiede la doppia conferma e viene salvata nel registro azioni.");
  };
  function logTable(r, q) {
    q = (q || "").toLowerCase();
    return tbl(["Quando", "Chi", "Ruolo", "Azione"], db.log.filter(function (l) { return (!r || l.ruolo === r) && (!q || (l.azione + l.utente).toLowerCase().indexOf(q) >= 0); }).slice(0, 200).map(function (l) { return tr([fmtTs(l.ts), esc(l.utente), esc(ROLES[l.ruolo] || l.ruolo), esc(l.azione)]); }), "log-tbl");
  }
  A["a-registro"] = function () {
    return note("Sola lettura per tutti, Admin compreso. Qui compare ogni azione fatta nella demo.") + '<div class="grid2"><label class="fld"><span>Ruolo</span><select data-logfilter="ruolo"><option value="">Tutti</option>' + ALL.concat(["visitatore"]).map(function (r) { return opt(r, ROLES[r]); }).join("") + '</select></label><label class="fld"><span>Cerca</span><input data-logfilter="q" placeholder="Es. news, ruolo, export"></label></div><div id="log-box">' + logTable("", "") + "</div>";
  };

  /* =========================================================
     ROUTER
     ========================================================= */
  function parseHash() { return location.hash.replace(/^#\/?/, "").split("/").filter(function (x) { return x !== ""; }).map(decodeURIComponent); }
  var lastPath = null;
  function render() {
    syncSession();
    var parts = parseHash(), page = parts[0] || "home", html;
    if (page === "area") html = renderArea(parts.slice(1));
    else if (page === "corso") html = P.corso(parts[1]);
    else if (page === "news") html = P.news(parts[1]);
    else if (P[page] && page !== "notfound") html = P[page]();
    else html = P.notfound();
    $("#app").innerHTML = html;
    document.body.setAttribute("data-page", page);
    if (page === "corsi") applyFilters();
    if (location.hash !== lastPath) { window.scrollTo(0, 0); lastPath = location.hash; }
    updateChrome();
    var titles = { home: "Home", area: "Area soci" };
    document.title = "DEMO · " + (titles[page] || page.replace(/-/g, " ")) + " – UNIdea Tonara APS";
  }
  function rerender() { var y = window.scrollY; render(); window.scrollTo(0, y); }
  function go(h) { if (location.hash === h) rerender(); else location.hash = h; }
  function updateChrome() {
    var u = me();
    $("#demo-who").innerHTML = "Ruolo attivo: <b>" + esc(ROLES[role()]) + "</b>" + (u ? " · " + esc(fullName(u)) : "");
    $$("[data-role-btn]").forEach(function (b) { var on = b.getAttribute("data-role-btn") === role(); b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    var lbl = $("#cta-label"); if (lbl) lbl.innerHTML = "Area soci" + (u ? '<span class="cta-x"> · ' + esc(role() === "socio" ? u.nome : "Gestione") + "</span>" : "");
    var header = $(".navigation-01-header"), nav = $(".navigation-01");
    if (header && header.classList.contains("is-mobile-nav-open")) { header.classList.remove("is-mobile-nav-open"); document.documentElement.style.overflow = ""; var t = $(".nav-menu-toggle"); if (t) t.setAttribute("aria-expanded", "false"); }
    if (nav) { try { nav.dispatchEvent(new Event("pointerleave")); } catch (e) { /* ignore */ } }
  }

  /* =========================================================
     AZIONI
     ========================================================= */
  function fileToDataUrl(file, cb) {
    var r = new FileReader();
    r.onload = function () { var im = new Image(); im.onload = function () { var s = Math.min(1, 900 / Math.max(im.width, im.height)); var cv = document.createElement("canvas"); cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s); cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height); cb(cv.toDataURL("image/jpeg", 0.72)); }; im.onerror = function () { cb(null); }; im.src = r.result; };
    r.onerror = function () { cb(null); }; r.readAsDataURL(file);
  }
  function stripeId(p) { return (p || "pi") + "_demo_" + Date.now().toString(36); }
  function payModal(importo, desc, ok) {
    modal("Pagamento simulato", "<p>" + esc(desc) + '</p><p class="big">' + esc(importo) + '</p><div class="fakecard"><span>Carta di prova</span><b>4242 4242 4242 4242</b><span>12/30 · 123</span></div><p class="small muted">Demo: nel sito vero qui si apre la pagina sicura di Stripe. Nessun addebito.</p>', [{ label: "Annulla" }, { label: "Paga " + importo, primary: true, onClick: ok }]);
  }
  function doEnroll(c) {
    var u = me(), st = cStats(c), conf = st.liberi > 0 && !st.att.length;
    function finish() {
      db.enr.push({ id: nid("e"), corsoId: c.id, socioId: u.id, stato: conf ? "confermato" : "attesa", data: today() + "T" + new Date().toTimeString().slice(0, 8) });
      sendEmails(1);
      log((conf ? "Iscrizione al corso \"" : "Entrata in lista d'attesa per \"") + c.titolo + "\"");
      save(); rerender(); toast(conf ? "Iscrizione confermata! Ti abbiamo mandato un'email (simulata)." : "Sei in lista d'attesa. Ti avvisiamo se si libera un posto.");
    }
    if (conf && Number(c.costo)) payModal(euro(c.costo), "Corso: " + c.titolo, function () { db.payments.push({ id: nid("pay"), stripe: stripeId(), socioId: u.id, tipo: "Corso: " + c.titolo, importo: Number(c.costo), data: today(), stato: "Pagato" }); finish(); });
    else finish();
  }
  function csv(rows) { return "\ufeff" + rows.map(function (r) { return r.map(function (v) { v = String(v == null ? "" : v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(";"); }).join("\r\n") + "\r\n"; }
  function docHtml(title, rows) { return '<!doctype html><meta charset="utf-8"><title>' + esc(title) + '</title><body style="font-family:Arial,sans-serif;max-width:640px;margin:40px auto;color:#000"><p style="letter-spacing:.14em;font-size:12px;color:#636363">DEMO – DOCUMENTO DI PROVA SENZA VALORE</p><h1 style="font-weight:400">' + esc(title) + "</h1><p><b>UNIdea Tonara APS</b> – Università Intergenerazionale<br>Via Vittorio Emanuele 2, 08039 Tonara (NU) · C.F. 93070870915 · RUNTS 182212</p><table style=\"border-collapse:collapse;width:100%\">" + rows.map(function (r) { return '<tr><td style="border-bottom:1px solid #ddd;padding:8px;color:#636363">' + esc(r[0]) + '</td><td style="border-bottom:1px solid #ddd;padding:8px">' + esc(r[1]) + "</td></tr>"; }).join("") + "</table></body>"; }
  function lastAdmin(u) { return u.ruolo === "admin" && db.users.filter(function (x) { return x.ruolo === "admin" && x.stato !== "cessato"; }).length <= 1; }

  var ACT = {};
  ACT["reset-demo"] = function () { modal("Reset demo", "<p>Tutti i dati di prova tornano come all'inizio e torni Visitatore. Vuoi continuare?</p>", [{ label: "Annulla" }, { label: "Sì, reset", primary: true, onClick: function () { localStorage.removeItem(KEY); localStorage.removeItem(SKEY); db = window.UNIDEA_SEED(); session = { role: "visitatore", userId: null }; save(); go("#/"); toast("Demo ripristinata."); } }]); };
  ACT["login-as"] = function (el) { var r = el.getAttribute("data-role"); if (setRole(r)) { log("Accesso all'area riservata (demo)"); save(); go("#/area"); toast("Sei entrato come " + ROLES[r] + "."); } };
  ACT.logout = function () { setRole("visitatore"); go("#/"); toast("Sei uscito."); };
  ACT["lang-it"] = function () { toast("Sei già sulla versione italiana."); };
  ACT["lang-en"] = function () { toast("La versione inglese è prevista nel sito: in demo solo italiano."); };
  ACT.ext = function () { toast("Link esterno: nella demo non si apre nessun servizio esterno."); };
  ACT["cookie-prefs"] = function () { modal("Preferenze cookie", '<label class="switch"><input type="checkbox" checked disabled><span><b>Tecnici</b> – sempre attivi</span></label><label class="switch"><input type="checkbox"><span><b>Contenuti esterni</b> – video YouTube e mappe</span></label>', [{ label: "Rifiuta" }, { label: "Salva", primary: true, onClick: function () { toast("Preferenze salvate (demo)."); } }]); };
  ACT["fake-file"] = function (el) { toast("Demo: «" + el.getAttribute("data-name") + "» è un documento segnaposto."); };
  ACT.video = function () { toast("Demo: nessun video esterno viene caricato."); };
  ACT["copy-cf"] = function () { var done = function () { toast("Codice fiscale copiato: 93070870915"); }; try { navigator.clipboard.writeText("93070870915").then(done, done); } catch (e) { done(); } };
  ACT.print = function () { window.print(); };
  ACT.enroll = function (el) {
    var c = course(el.getAttribute("data-id"));
    if (!me()) { modal("Entra nell'Area soci", "<p>Per iscriverti a un corso devi essere socio ed entrare nell'Area soci.</p>", [{ label: "Chiudi" }, { label: "Vai all'Area soci", primary: true, onClick: function () { go("#/area"); } }]); return; }
    doEnroll(c);
  };
  ACT.unenroll = function (el) {
    var e = byId(db.enr, el.getAttribute("data-id")), c = course(e.corsoId), s = user(e.socioId);
    modal("Annullare l'iscrizione?", "<p>" + esc(fullName(s)) + " – " + esc(c.titolo) + '</p><p class="muted">Il posto si libera per la lista d\'attesa.</p>', [{ label: "No" }, { label: "Sì, annulla", primary: true, onClick: function () { e.stato = "annullato"; log("Annullata iscrizione di " + fullName(s) + " a \"" + c.titolo + "\""); save(); rerender(); toast("Iscrizione annullata."); } }]);
  };
  ACT["refund-enroll"] = function (el) {
    var e = byId(db.enr, el.getAttribute("data-id")), c = course(e.corsoId), s = user(e.socioId);
    confirmTyped("Annulla e rimborsa", "Annulli l'iscrizione di " + esc(fullName(s)) + " a «" + esc(c.titolo) + "» e avvii il rimborso di " + euro(c.costo) + " su Stripe (simulato).", function () {
      e.stato = "annullato"; db.payments.push({ id: nid("pay"), stripe: stripeId("re"), socioId: s.id, tipo: "Rimborso corso: " + c.titolo, importo: -Number(c.costo), data: today(), stato: "Rimborsato" });
      log("Rimborso e annullamento iscrizione di " + fullName(s) + " a \"" + c.titolo + "\""); save(); rerender(); toast("Rimborso avviato (simulato).");
    });
  };
  ACT["offer-accept"] = function (el) {
    var e = byId(db.enr, el.getAttribute("data-id")), c = course(e.corsoId);
    function ok() { e.stato = "confermato"; log("Accettato il posto offerto per \"" + c.titolo + "\""); save(); rerender(); toast("Perfetto, sei iscritto!"); }
    if (Number(c.costo)) payModal(euro(c.costo), "Corso: " + c.titolo, function () { db.payments.push({ id: nid("pay"), stripe: stripeId(), socioId: e.socioId, tipo: "Corso: " + c.titolo, importo: Number(c.costo), data: today(), stato: "Pagato" }); ok(); });
    else ok();
  };
  ACT["offer-decline"] = function (el) { var e = byId(db.enr, el.getAttribute("data-id")); e.stato = "rifiutato"; log("Rifiutato il posto offerto per \"" + course(e.corsoId).titolo + "\""); save(); rerender(); toast("Posto rifiutato."); };
  ACT.offer = function (el) {
    var e = byId(db.enr, el.getAttribute("data-id")), s = user(e.socioId), c = course(e.corsoId), ore = Number(db.settings.offertaOre) || 48;
    e.stato = "offerta"; e.scade = new Date(Date.now() + ore * 3600e3).toISOString(); sendEmails(1);
    log("Offerto posto a " + fullName(s) + " per \"" + c.titolo + "\" (" + ore + " ore per rispondere)"); save(); rerender(); toast("Posto offerto a " + fullName(s) + ". Email inviata (simulata).");
  };
  ACT["wait-refuse"] = function (el) { var e = byId(db.enr, el.getAttribute("data-id")), s = user(e.socioId); e.stato = "rifiutato"; log("Segnato rifiuto in lista d'attesa: " + fullName(s) + " (\"" + course(e.corsoId).titolo + "\")"); save(); rerender(); toast("Rifiuto registrato."); };
  ACT.renew = function () {
    var u = me(); payModal(euro(db.settings.quota), "Rinnovo quota associativa", function () { db.payments.push({ id: nid("pay"), stripe: stripeId(), socioId: u.id, tipo: "Quota associativa", importo: Number(db.settings.quota), data: today(), stato: "Pagato" }); u.quotaScadenza = nextScadenza(); u.stato = "attivo"; log("Rinnovata la quota associativa"); save(); rerender(); toast("Quota rinnovata fino al " + fmt(u.quotaScadenza) + "."); });
  };
  ACT["my-data"] = function () { var u = me(); download("i_miei_dati_UNIdea.json", JSON.stringify({ socio: u, iscrizioni: db.enr.filter(function (e) { return e.socioId === u.id; }), pagamenti: db.payments.filter(function (p) { return p.socioId === u.id; }) }, null, 2), "application/json"); log("Scaricati i propri dati (GDPR)"); save(); };
  ACT["delete-request"] = function () { var u = me(); modal("Cancellazione account", "<p>La richiesta arriva all'Admin, che ti ricontatta. Continuare?</p>", [{ label: "Annulla" }, { label: "Invia richiesta", primary: true, onClick: function () { db.messages.unshift({ id: nid("ms"), nome: fullName(u), email: u.email, oggetto: "Richiesta cancellazione account (GDPR)", testo: "Il socio chiede la cancellazione dell'account.", data: today(), stato: "nuovo", risposta: "" }); log("Richiesta cancellazione account"); save(); toast("Richiesta inviata."); } }]); };
  ACT.attestato = function (el) { var c = course(el.getAttribute("data-id")), u = me(); download("attestato_" + c.id + ".html", docHtml("Attestato di partecipazione", [["Si attesta che", fullName(u)], ["ha frequentato il corso", c.titolo], ["Docente", fullName(user(c.docenteId))], ["Presenze", presPct(c.id, u.id) + "%"], ["Data", fmt(today())]]), "text/html"); log("Scaricato attestato \"" + c.titolo + "\""); save(); };
  ACT.ics = function () {
    var it = myLessons(me()).filter(function (x) { return !x.l.annullata; });
    var s = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//UNIdea Tonara DEMO//IT\r\n" + it.map(function (x) { var d = x.l.date.replace(/-/g, ""), t = x.c.ora.replace(":", "") + "00", h = String(Number(x.c.ora.slice(0, 2)) + 1).padStart(2, "0") + x.c.ora.slice(3, 5) + "00"; return "BEGIN:VEVENT\r\nUID:" + x.c.id + "-" + x.l.i + "@unidea-demo\r\nDTSTAMP:" + d + "T000000\r\nDTSTART:" + d + "T" + t + "\r\nDTEND:" + d + "T" + h + "\r\nSUMMARY:" + x.c.titolo + "\r\nLOCATION:" + x.c.luogo.replace(/,/g, "\\,") + "\r\nEND:VEVENT\r\n"; }).join("") + "END:VCALENDAR\r\n";
    download("UNIdea_lezioni.ics", s, "text/calendar"); toast("File calendario scaricato.");
  };
  ACT["receipt-pay"] = function (el) { var p = byId(db.payments, el.getAttribute("data-id")); download("ricevuta_" + p.id + ".html", docHtml("Ricevuta di pagamento", [["Socio", fullName(user(p.socioId))], ["Descrizione", p.tipo], ["Importo", euro(p.importo)], ["Data", fmt(p.data)], ["Riferimento Stripe", p.stripe]]), "text/html"); };
  ACT["receipt-don"] = function (el) { var d = byId(db.donations, el.getAttribute("data-id")); download("ricevuta_" + d.ricevuta + ".html", docHtml("Ricevuta per erogazione liberale n. " + d.ricevuta, [["Donatore", d.nome], ["Importo", euro(d.importo)], ["Data", fmt(d.data)], ["Metodo", d.metodo], ["Note", "Erogazione liberale ai sensi dell'art. 83 D.Lgs. 117/2017"]]), "text/html"); };
  ACT["all-present"] = function () { $$(".presgrid input").forEach(function (c) { c.checked = true; }); var pc = $("#pres-count"); if (pc) pc.textContent = $$(".presgrid input:checked").length + " presenti"; };
  ACT["del-materiale"] = function (el) { var m = byId(db.materiali, el.getAttribute("data-id")); db.materiali = db.materiali.filter(function (x) { return x !== m; }); log("Tolto materiale \"" + m.nome + "\""); save(); rerender(); toast("File tolto."); };
  ACT["toggle-lesson"] = function (el) {
    var c = course(el.getAttribute("data-id")), i = Number(el.getAttribute("data-i")); c.annullate = c.annullate || [];
    var k = c.annullate.indexOf(i), d = fmtDay(lessons(c)[i].date);
    if (k >= 0) c.annullate.splice(k, 1); else c.annullate.push(i);
    var n = cStats(c).conf; sendEmails(n);
    db.avvisi.unshift({ id: nid("a"), corsoId: c.id, da: "Segreteria", testo: k >= 0 ? "La lezione di " + d + " si terrà regolarmente." : "La lezione di " + d + " è annullata.", data: today(), destinatari: n });
    log((k >= 0 ? "Ripristinata" : "Annullata") + " la lezione di " + d + " di \"" + c.titolo + "\" (avviso a " + n + " iscritti)"); save(); rerender(); toast("Fatto. Avviso inviato a " + n + " iscritti (simulato).");
  };
  ACT["del-course"] = function (el) { var c = course(el.getAttribute("data-id")); confirmTyped("Eliminare il corso?", "«" + esc(c.titolo) + "» sparisce dal sito e dal pannello. Azione definitiva.", function () { c.stato = "eliminato"; log("Eliminato definitivamente il corso \"" + c.titolo + "\""); save(); go("#/area/g-corsi"); toast("Corso eliminato."); }); };
  ACT["news-state"] = function (el) { var n = byId(db.news, el.getAttribute("data-id")); n.stato = el.getAttribute("data-s"); log({ pubblicata: "Pubblicata", bozza: "Nascosta (bozza)", cestino: "Spostata nel cestino" }[n.stato] + " la news \"" + n.titolo + "\""); save(); rerender(); };
  ACT["empty-trash"] = function () { confirmTyped("Svuotare il cestino?", "Le news nel cestino vengono eliminate definitivamente.", function () { var k = db.news.filter(function (n) { return n.stato === "cestino"; }).length; db.news = db.news.filter(function (n) { return n.stato !== "cestino"; }); log("Svuotato il cestino news (" + k + " eliminate definitivamente)"); save(); rerender(); }); };
  ACT["del-faq"] = function (el) { var f = byId(db.faq, el.getAttribute("data-id")); db.faq = db.faq.filter(function (x) { return x !== f; }); log("Tolta FAQ \"" + f.q + "\""); save(); rerender(); };
  ACT["photo-ok"] = function (el) { var g = byId(db.gallery, el.getAttribute("data-id")); g.stato = "pubblicata"; log("Approvata foto \"" + g.titolo + "\" proposta da " + g.da); save(); rerender(); toast("Foto approvata: ora è nell'archivio pubblico."); };
  ACT["photo-no"] = function (el) { var g = byId(db.gallery, el.getAttribute("data-id")); g.stato = "rifiutata"; log("Rifiutata foto \"" + g.titolo + "\" proposta da " + g.da); save(); rerender(); toast("Foto rifiutata."); };
  ACT["photo-remove"] = function (el) { var g = byId(db.gallery, el.getAttribute("data-id")); g.stato = "rimossa"; log("Rimossa dalla galleria la foto \"" + g.titolo + "\""); save(); rerender(); toast("Foto rimossa dal sito."); };
  ACT["msg-archive"] = function (el) { var m = byId(db.messages, el.getAttribute("data-id")); m.stato = "archiviato"; log("Archiviato messaggio \"" + m.oggetto + "\""); save(); rerender(); };
  ACT["nl-send"] = function (el) {
    var x = byId(db.newsletter, el.getAttribute("data-id")), n = nlCount();
    confirmTyped("Inviare la newsletter?", "«" + esc(x.oggetto) + "» a " + n + " persone con consenso newsletter.", function () { var s = sendEmails(n); x.stato = "inviata"; x.inviataA = n + " destinatari · " + fmt(today()); log("Inviata newsletter \"" + x.oggetto + "\" a " + n + " destinatari"); save(); rerender(); toast("Newsletter inviata (simulata): " + s + " email partite oggi."); });
  };
  ACT.approve = function (el) {
    var u = user(el.getAttribute("data-id")), y = parseD(today()).getFullYear();
    var num = db.users.filter(function (x) { return x.tessera; }).length + 1;
    u.stato = "attivo"; u.tessera = "T-" + y + "-" + String(num).padStart(4, "0"); u.quotaScadenza = nextScadenza(); sendEmails(1);
    log("Approvata adesione di " + fullName(u) + " (tessera " + u.tessera + ")"); save(); rerender(); toast(fullName(u) + " è socio. Tessera " + u.tessera + " inviata (simulato).");
  };
  ACT.reject = function (el) { var u = user(el.getAttribute("data-id")); modal("Rifiutare l'adesione?", "<p>" + esc(fullName(u)) + "</p>", [{ label: "No" }, { label: "Rifiuta", primary: true, onClick: function () { u.stato = "cessato"; log("Rifiutata adesione di " + fullName(u)); save(); rerender(); } }]); };
  ACT["socio-state"] = function (el) { var u = user(el.getAttribute("data-id")); if (lastAdmin(u)) { toast("Non puoi: è l'ultimo Admin."); return; } u.stato = el.getAttribute("data-s"); log((u.stato === "sospeso" ? "Sospesa" : "Riattivata") + " la tessera di " + fullName(u)); save(); rerender(); };
  ACT["socio-cessa"] = function (el) {
    var u = user(el.getAttribute("data-id"));
    if (lastAdmin(u)) { toast("Non puoi: è l'ultimo Admin."); return; }
    confirmTyped("Registrare la cessazione?", esc(fullName(u)) + " non sarà più socio. I dati restano nel libro soci.", function () { u.stato = "cessato"; log("Registrata cessazione di " + fullName(u)); save(); go("#/area/a-soci"); });
  };
  ACT["emit-receipt"] = function (el) { var d = byId(db.donations, el.getAttribute("data-id")), y = parseD(today()).getFullYear(); var n = db.donations.filter(function (x) { return x.ricevuta; }).length + 1; d.ricevuta = "R-" + y + "-" + String(n).padStart(3, "0"); sendEmails(1); log("Emessa ricevuta " + d.ricevuta + " per donazione di " + d.nome); save(); rerender(); toast("Ricevuta " + d.ricevuta + " emessa e inviata (simulato)."); };
  ACT["del-doc"] = function (el) { var d = byId(db.docs, el.getAttribute("data-id")); confirmTyped("Eliminare il documento?", "«" + esc(d.titolo) + "» sparisce dalla pagina Trasparenza.", function () { db.docs = db.docs.filter(function (x) { return x !== d; }); log("Eliminato documento di trasparenza \"" + d.titolo + "\""); save(); rerender(); }); };
  ACT["change-role"] = function (el) {
    var u = user(el.getAttribute("data-id")), nr = $('[data-role-for="' + u.id + '"]').value;
    if (nr === u.ruolo) { toast("Il ruolo è già " + ROLES[nr] + "."); return; }
    if (lastAdmin(u)) { toast("Non puoi togliere il ruolo all'ultimo Admin."); return; }
    confirmTyped("Cambiare ruolo?", esc(fullName(u)) + ": da <b>" + ROLES[u.ruolo] + "</b> a <b>" + ROLES[nr] + "</b>.", function () {
      var old = u.ruolo; u.ruolo = nr; log("Cambiato ruolo di " + fullName(u) + " da " + ROLES[old] + " a " + ROLES[nr]); save();
      if (u.id === session.userId) { syncSession(); save(); go("#/area"); } else rerender();
      toast("Ruolo aggiornato: " + fullName(u) + " ora è " + ROLES[nr] + ".");
    });
  };
  ACT.export = function (el) {
    var w = el.getAttribute("data-what"), d = today(), rows, name;
    if (w === "soci") { name = "libro_soci_UNIdea_" + d + ".csv"; rows = [["N. tessera", "Cognome", "Nome", "Codice fiscale", "Data di nascita", "Indirizzo", "Email", "Telefono", "Data adesione", "Stato", "Livello", "Ruolo", "Scadenza quota", "Consenso immagini", "Consenso newsletter"]].concat(db.users.filter(function (u) { return u.stato !== "in attesa"; }).map(function (u) { return [u.tessera, u.cognome, u.nome, u.cf, u.nascita, u.indirizzo, u.email, u.tel, u.adesione, u.stato, u.livello, ROLES[u.ruolo], u.quotaScadenza, u.consImg ? "sì" : "no", u.consNews ? "sì" : "no"]; })); }
    else if (w === "iscrizioni") { name = "iscrizioni_corsi_" + d + ".csv"; rows = [["Corso", "Socio", "Email", "Stato", "Data"]].concat(db.enr.map(function (e) { var c = course(e.corsoId), s = user(e.socioId); return [c ? c.titolo : "", fullName(s), s ? s.email : "", e.stato, String(e.data).slice(0, 10)]; })); }
    else if (w === "pagamenti") { name = "pagamenti_" + d + ".csv"; rows = [["Data", "Socio", "Descrizione", "Importo", "Stato", "ID Stripe"]].concat(db.payments.map(function (p) { return [p.data, fullName(user(p.socioId)), p.tipo, String(p.importo).replace(".", ","), p.stato, p.stripe]; })); }
    else { name = "donazioni_" + d + ".csv"; rows = [["Data", "Donatore", "Email", "Importo", "Ricevuta"]].concat(db.donations.map(function (x) { return [x.data, x.nome, x.email, x.importo, x.ricevuta]; })); }
    confirmTyped("Esportare i dati?", "Il file <b>" + esc(name) + "</b> contiene dati personali: conservalo con cura.", function () { download(name, csv(rows), "text/csv;charset=utf-8"); log("Export " + name + " (" + (rows.length - 1) + " righe)"); save(); rerender(); toast("File scaricato: " + name); });
  };

  /* ---------- form ---------- */
  var FORM = {};
  FORM.noop = function () { };
  FORM.magic = function () { toast("Demo: nessuna email viene inviata. Usa i pulsanti «Entra come…»."); };
  FORM.newsletter = function (f, d) { db.nlIscritti = db.nlIscritti || []; db.nlIscritti.push({ email: d.email, data: today() }); log("Iscrizione newsletter dal footer: " + d.email); save(); f.reset(); toast("Grazie! Ti abbiamo scritto per confermare l'iscrizione (simulato)."); };
  FORM.proposta = function (f, d) { db.proposte.unshift({ id: nid("p"), nome: d.nome, email: d.email, titolo: d.titolo, testo: d.testo, data: today(), stato: "nuova" }); log("Nuova proposta di corso: \"" + d.titolo + "\""); save(); f.outerHTML = '<div class="pcard ok-box"><h3>Grazie, proposta inviata!</h3><p class="muted">La vede il Moderatore in «Messaggi e proposte».</p></div>'; };
  FORM.contatto = function (f, d) { db.messages.unshift({ id: nid("ms"), nome: d.nome, email: d.email, oggetto: d.oggetto, testo: d.testo, data: today(), stato: "nuovo", risposta: "" }); log("Nuovo messaggio dal modulo contatti: \"" + d.oggetto + "\""); save(); f.outerHTML = '<div class="pcard ok-box"><h3>Messaggio inviato!</h3><p class="muted">Ti rispondiamo presto. (Lo vede il Moderatore in «Messaggi e proposte».)</p></div>'; };
  FORM.adesione = function (f, d) {
    payModal(euro(db.settings.quota), "Quota associativa – " + d.nome + " " + d.cognome, function () {
      var id = nid("u");
      db.users.push({ id: id, nome: d.nome, cognome: d.cognome, email: d.email, tel: d.tel, cf: String(d.cf).toUpperCase(), nascita: d.nascita, indirizzo: d.indirizzo, livello: "Base", stato: "in attesa", tessera: "", quotaScadenza: nextScadenza(), consImg: !!d.consImg, consNews: !!d.consNews, consVer: "v1.0", consData: today(), ruolo: "socio", adesione: today(), lingua: "IT", bio: "" });
      db.payments.push({ id: nid("pay"), stripe: stripeId(), socioId: id, tipo: "Quota associativa", importo: Number(db.settings.quota), data: today(), stato: "Pagato" });
      log("Nuova domanda di adesione: " + d.nome + " " + d.cognome); save();
      var box = $("#form-adesione"); if (box) box.outerHTML = '<div class="pcard ok-box" id="adesione-ok"><h3>Domanda inviata, grazie!</h3><p class="muted">Pagamento ricevuto (simulato). Quando il direttivo approva l\'adesione ricevi la tessera via email. (In demo: entra come Admin → Soci e adesioni.)</p></div>';
    });
  };
  FORM.donazione = function (f, d) {
    var imp = Number(d.altro) || Number(d.importo) || 0; if (imp <= 0) { toast("Scegli un importo."); return; }
    payModal(euro(imp), "Donazione a UNIdea Tonara APS", function () {
      db.donations.unshift({ id: nid("d"), nome: d.nome, socioId: me() ? me().id : "", email: d.email, importo: imp, data: today(), ricevuta: "", metodo: "Carta (Stripe)" });
      log("Nuova donazione di " + euro(imp) + " da " + d.nome); save();
      f.outerHTML = '<div class="pcard ok-box"><h3>Grazie di cuore!</h3><p class="muted">Donazione di ' + euro(imp) + " ricevuta (simulata). La ricevuta arriva dopo l'emissione da parte dell'Admin.</p></div>";
    });
  };
  FORM.profilo = function (f, d) { var u = me(); u.email = d.email; u.tel = d.tel; u.lingua = d.lingua; log("Aggiornati i propri dati di contatto"); save(); rerender(); toast("Dati salvati."); };
  FORM.consensi = function (f, d) {
    var u = me(), was = u.consImg; u.consImg = !!d.consImg; u.consNews = !!d.consNews; u.consData = today();
    if (was && !u.consImg) db.messages.unshift({ id: nid("ms"), nome: fullName(u), email: u.email, oggetto: "Revoca consenso immagini", testo: "Il socio ha revocato il consenso: togliere le foto in cui compare.", data: today(), stato: "nuovo", risposta: "" });
    log("Aggiornati i consensi (foto: " + (u.consImg ? "sì" : "no") + ", newsletter: " + (u.consNews ? "sì" : "no") + ")"); save(); rerender(); toast("Consensi salvati.");
  };
  FORM.presenze = function (f) {
    var cid = f.getAttribute("data-c"), li = Number(f.getAttribute("data-l")), ids = $$('input[name="p"]:checked', f).map(function (i) { return i.value; });
    db.pres[cid] = db.pres[cid] || {}; db.pres[cid][li] = ids;
    log("Registrate presenze lezione " + (li + 1) + " di \"" + course(cid).titolo + "\" (" + ids.length + " presenti)"); save(); rerender(); toast("Presenze salvate: " + ids.length + " presenti.");
  };
  FORM.materiale = function (f) {
    var file = f.querySelector('input[type="file"]').files[0]; if (!file) return;
    var cid = f.getAttribute("data-c");
    db.materiali.unshift({ id: nid("mt"), corsoId: cid, nome: file.name, kb: Math.round(file.size / 1024), data: today() });
    log("Caricato materiale \"" + file.name + "\" per \"" + course(cid).titolo + "\""); save(); rerender(); toast("File caricato: lo vedono gli iscritti.");
  };
  FORM.avviso = function (f, d) {
    var c = course(d.corsoId), n = cStats(c).conf; sendEmails(n);
    db.avvisi.unshift({ id: nid("a"), corsoId: c.id, da: fullName(me()), testo: d.testo, data: today(), destinatari: n });
    log("Inviato avviso agli iscritti di \"" + c.titolo + "\" (" + n + " destinatari)"); save(); rerender(); toast("Avviso inviato a " + n + " iscritti (simulato).");
  };
  function photoSubmit(f, d, stato, okMsg) {
    var fi = f.querySelector('input[type="file"]'), file = fi && fi.files[0];
    function add(src) {
      if (!src) { toast("Scegli una foto (dal dispositivo o di esempio)."); return; }
      db.gallery.unshift({ id: nid("g"), titolo: d.titolo, corsoId: d.corsoId || "", src: src, stato: stato, da: fullName(me()), data: today() });
      log((stato === "in revisione" ? "Proposta foto \"" : "Pubblicata foto \"") + d.titolo + "\"" + (stato === "in revisione" ? " (in revisione)" : "")); save(); rerender(); toast(okMsg);
    }
    if (file) fileToDataUrl(file, add); else add(d.sample);
  }
  FORM["foto-docente"] = function (f, d) { photoSubmit(f, d, "in revisione", "Foto inviata: la vedrà il Moderatore."); };
  FORM["foto-mod"] = function (f, d) { photoSubmit(f, d, "pubblicata", "Foto pubblicata nell'archivio."); };
  FORM.corso = function (f, d) {
    var id = f.getAttribute("data-id"), c = id ? course(id) : null, isNew = !c;
    if (isNew) { c = { id: nid("c"), annullate: [] }; db.courses.push(c); }
    ["titolo", "categoria", "docenteId", "inizio", "ora", "luogo", "livello", "img", "descr", "stato"].forEach(function (k) { c[k] = d[k]; });
    c.lezioni = Number(d.lezioni); c.posti = Number(d.posti); c.costo = Number(d.costo) || 0; c.giorno = GG[parseD(c.inizio).getDay()];
    log((isNew ? "Creato corso \"" : "Modificato corso \"") + c.titolo + "\" (" + c.stato + ")"); save(); go("#/area/g-corsi"); toast(isNew ? "Corso creato" + (c.stato === "pubblicato" ? ": è già visibile sul sito." : " come bozza.") : "Modifiche salvate.");
  };
  FORM.iscrivi = function (f, d) {
    var c = course(f.getAttribute("data-c")), s = user(d.socioId); if (!s) return;
    if (cStats(c).liberi <= 0) { toast("Corso pieno."); return; }
    db.enr.push({ id: nid("e"), corsoId: c.id, socioId: s.id, stato: "confermato", data: today() }); sendEmails(1);
    log("Iscritto a mano " + fullName(s) + " a \"" + c.titolo + "\""); save(); rerender(); toast(fullName(s) + " iscritto.");
  };
  FORM.news = function (f, d) {
    var id = f.getAttribute("data-id"), n = id ? byId(db.news, id) : null, isNew = !n;
    if (isNew) { n = { id: nid("n"), data: today(), autore: fullName(me()) }; db.news.push(n); }
    n.titolo = d.titolo; n.testo = d.testo; n.stato = d.stato;
    log((isNew ? "Creata" : "Modificata") + " news \"" + n.titolo + "\" (" + n.stato + ")"); save(); go("#/area/g-contenuti/news"); toast(n.stato === "pubblicata" ? "News pubblicata: è già sul sito." : "Bozza salvata.");
  };
  FORM.faq = function (f, d) { var id = f.getAttribute("data-id"), x = id ? byId(db.faq, id) : null; if (!x) { x = { id: nid("f") }; db.faq.push(x); } x.q = d.q; x.a = d.a; log("Salvata FAQ \"" + x.q + "\""); save(); rerender(); toast("FAQ salvata."); };
  FORM.urgent = function (f, d) { db.urgent = { testo: d.testo, attivo: !!d.attivo }; log("Avviso in evidenza " + (db.urgent.attivo ? "attivato" : "disattivato")); save(); rerender(); toast("Avviso salvato."); };
  FORM.reply = function (f, d) { var m = byId(db.messages, f.getAttribute("data-id")); m.risposta = d.r; m.stato = "risposto"; sendEmails(1); log("Risposto al messaggio \"" + m.oggetto + "\""); save(); rerender(); toast("Risposta inviata (simulata)."); };
  FORM["newsletter-draft"] = function (f, d) { db.newsletter.unshift({ id: nid("nl"), oggetto: d.oggetto, testo: d.testo, stato: "bozza", autore: fullName(me()), data: today() }); log("Salvata bozza newsletter \"" + d.oggetto + "\""); save(); rerender(); toast("Bozza salvata: la invia l'Admin."); };
  FORM.socio = function (f, d) { var u = user(f.getAttribute("data-id")); Object.keys(d).forEach(function (k) { u[k] = d[k]; }); if (u.stato === "scaduto" && u.quotaScadenza >= today()) u.stato = "attivo"; log("Modificata la scheda di " + fullName(u)); save(); rerender(); toast("Scheda salvata."); };
  FORM.doc = function (f, d) { var fi = f.querySelector('input[type="file"]'), file = fi && fi.files[0]; db.docs.unshift({ id: nid("doc"), categoria: d.categoria, titolo: d.titolo, file: file ? file.name : d.titolo.toLowerCase().replace(/[^a-z0-9]+/g, "_") + ".pdf", data: today() }); log("Pubblicato in Trasparenza \"" + d.titolo + "\""); save(); rerender(); toast("Documento pubblicato in Trasparenza."); };
  FORM.contributo = function (f, d) { db.contributi.unshift({ id: nid("cp"), ente: d.ente, importo: Number(d.importo), data: d.data, causale: d.causale }); log("Aggiunto contributo pubblico da " + d.ente); save(); rerender(); toast("Contributo aggiunto."); };
  FORM.settings = function (f, d) { ["quota", "soglia", "offertaOre", "emailLimite"].forEach(function (k) { d[k] = Number(d[k]); }); Object.assign(db.settings, d); log("Modificate le impostazioni (quota " + euro(d.quota) + ", soglia " + d.soglia + "%)"); save(); rerender(); toast("Impostazioni salvate."); };

  /* ---------- eventi ---------- */
  document.addEventListener("click", function (ev) {
    var rb = ev.target.closest("[data-role-btn]");
    if (rb) {
      var r = rb.getAttribute("data-role-btn");
      if (setRole(r)) {
        if (r !== "visitatore") { log("Accesso all'area riservata (demo)"); save(); go("#/area"); }
        else if (/^#\/area/.test(location.hash)) go("#/"); else rerender();
        toast("Ora sei: " + ROLES[r] + ".");
      }
      return;
    }
    var mb = ev.target.closest("[data-modal-btn]");
    if (mb) { var cb = modalCb[mb.getAttribute("data-modal-btn")]; closeModal(); if (cb) cb(); return; }
    if (ev.target.classList && ev.target.classList.contains("modal")) { closeModal(); return; }
    var a = ev.target.closest("[data-act]");
    if (a && ACT[a.getAttribute("data-act")]) { ev.preventDefault(); ACT[a.getAttribute("data-act")](a, ev); }
  });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && $("#modal-root").innerHTML) closeModal(); });
  document.addEventListener("submit", function (ev) {
    var f = ev.target.closest("form[data-form]"); if (!f) return;
    ev.preventDefault();
    var d = {};
    $$("input,select,textarea", f).forEach(function (el) {
      if (!el.name || el.type === "file") return;
      if (el.type === "checkbox") { if (el.name !== "p") d[el.name] = el.checked; }
      else if (el.type === "radio") { if (el.checked) d[el.name] = el.value; }
      else d[el.name] = el.value;
    });
    var fn = FORM[f.getAttribute("data-form")]; if (fn) fn(f, d);
  });
  function updateLog() { var b = $("#log-box"); if (b) b.innerHTML = logTable($('[data-logfilter="ruolo"]').value, $('[data-logfilter="q"]').value); }
  document.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.matches("[data-goto]")) { var v = t.value; go(v.charAt(0) === "#" ? v : "#/area/" + v); }
    else if (t.matches('[data-act-change="proposta-state"]')) { var p = byId(db.proposte, t.getAttribute("data-id")); p.stato = t.value; log("Proposta \"" + p.titolo + "\": " + p.stato); save(); toast("Stato aggiornato."); }
    else if (t.matches("[data-filter]")) applyFilters();
    else if (t.matches("[data-logfilter]")) updateLog();
    else if (t.matches(".presgrid input")) { var pc = $("#pres-count"); if (pc) pc.textContent = $$(".presgrid input:checked").length + " presenti"; }
  });
  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t.matches("[data-filter]")) applyFilters();
    else if (t.matches("[data-logfilter]")) updateLog();
    else if (t.matches("[data-search]")) { var q = t.value.toLowerCase(); $$(t.getAttribute("data-search") + " tbody tr").forEach(function (r) { r.style.display = r.textContent.toLowerCase().indexOf(q) >= 0 ? "" : "none"; }); }
  });
  window.addEventListener("hashchange", render);
  window.addEventListener("storage", function (e) { if (e.key === KEY || e.key === SKEY) { load(); rerender(); } });

  load();
  render();
})();
