/* sample data for clientmode: one published client page for Atlas Sneakers, token "demoatlas1" (open it at #cl-demoatlas1).
   The snapshot is hand-written in the same shape that portal_snapshot.js builds. No costs, profit, commission or team names. */
(function (GK) {
  "use strict";
  GK.seedExtra = GK.seedExtra || [];
  GK.seedExtra.push(function (data, ctx) {
    var d = ctx.d, y = ctx.today.slice(0, 4);
    var board = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 260" role="img" aria-label="Drop 03 storyboard">' +
      '<rect width="640" height="260" style="fill:var(--bounce)"/>' +
      '<g font-family="Archivo,Arial,sans-serif" font-size="14" style="fill:var(--slate)">' +
      '<rect x="20" y="30" width="180" height="200" style="fill:var(--gel)"/><text x="34" y="58" font-weight="700">1 · Bab Bhar</text><text x="34" y="84">Walk test starts.</text><text x="34" y="106">Shoes on the cobbles.</text>' +
      '<rect x="230" y="30" width="180" height="200" style="fill:var(--bounce);stroke:var(--slate)"/><text x="244" y="58" font-weight="700">2 · The box</text><text x="244" y="84">Guess the price.</text><text x="244" y="106">Reveal under 200 DT.</text>' +
      '<rect x="440" y="30" width="180" height="200" style="fill:var(--chroma)"/><text x="454" y="58" font-weight="700" style="fill:var(--bounce)">3 · Rain test</text><text x="454" y="84" style="fill:var(--bounce)">Water on the leather.</text><text x="454" y="106" style="fill:var(--bounce)">Still dry.</text>' +
      '<path d="M204 130h22M414 130h22" style="stroke:var(--slate);fill:none" stroke-width="2"/></g></svg>';
    var snap = {
      v: 2, lang: "en", title: "Drop 03 · campaign page",
      brand: { name: "Atlas Sneakers" }, contact: { name: "Sami" },
      company: { name: "GECKO", phone: "+216 26 191 555", email: "reachoutgecko@gmail.com", instagram: "@geckoagency_" },
      sections: { plan: true, scripts: true, files: true, timeline: true, invoices: true, boards: true },
      projects: [{
        id: "patl", name: "Drop 03", pack: "test", monthly: false, stage: "testing", stageIdx: 5, shootDate: d(-30),
        planApproved: true, planApprovedOn: d(-40), unlocked: true, progress: { done: 8, total: 8 },
        angles: [
          { name: "Built for Tunis streets", why: "Returns mention sizing on cobbles, so we prove the shoe on the street itself." },
          { name: "Under 200 DT", why: "Price is the first question in your DMs. We answer it in the first three seconds." }
        ],
        reels: [
          { id: "ra1", angle: "Built for Tunis streets", mode: "Direct", hooks: [{ text: "We walked 12 km in these", status: "approved" }, { text: "Cobbles don't care", status: "approved" }],
            script: "Bab Bhar at 8am. Close on the laces, then the first step.\nFollow the shoes across the medina. Cut on every corner.\nStop at the fountain. Hold the shoes to camera.\nEnd card: Atlas Drop 03, available now.",
            files: [{ code: "ATLAS_A1-R1-H1_D_9x16_v1", status: "approved", drive: "https://drive.google.com/drive/folders/atlas-drop-03", clientOk: true }, { code: "ATLAS_A1-R1-H2_D_9x16_v1", status: "approved", drive: "https://drive.google.com/drive/folders/atlas-drop-03", clientOk: true }] },
          { id: "ra2", angle: "Under 200 DT", mode: "Direct", hooks: [{ text: "Guess the price", status: "approved" }, { text: "Less than your last dinner out", status: "approved" }],
            script: "Hands hold the closed box. Text on screen: guess the price.\nLid off. The pair, slow turn.\nPrice card: under 200 DT.\nEnd card with the order link.",
            files: [{ code: "ATLAS_A2-R1-H1_D_9x16_v1", status: "approved", drive: "https://drive.google.com/drive/folders/atlas-drop-03", clientOk: true }, { code: "ATLAS_A2-R1-H2_D_9x16_v1", status: "approved", drive: "https://drive.google.com/drive/folders/atlas-drop-03", clientOk: true }] },
          { id: "ra3", angle: "Under 200 DT", mode: "Indirect", hooks: [{ text: "One pair, three looks", status: "approved" }, { text: "Your feed needs this", status: "approved" }],
            files: [{ code: "ATLAS_A2-R2-H1_I_9x16_v1", status: "approved", drive: "https://drive.google.com/drive/folders/atlas-drop-03", clientOk: true }, { code: "ATLAS_A2-R2-H2_I_9x16_v1", status: "approved", drive: "https://drive.google.com/drive/folders/atlas-drop-03", clientOk: true }] },
          { id: "ra4", angle: "Built for Tunis streets", mode: "Indirect", hooks: [{ text: "We poured water on them", status: "approved" }, { text: "Still dry", status: "approved" }],
            files: [{ code: "ATLAS_A1-R2-H1_I_9x16_v1", status: "approved", drive: "https://drive.google.com/drive/folders/atlas-drop-03", clientOk: true }, { code: "ATLAS_A1-R2-H2_I_9x16_v1", status: "approved", drive: "https://drive.google.com/drive/folders/atlas-drop-03", clientOk: true }] }
        ],
        carousels: [], ideas: [{ id: "idea-demo-1", title: "The unboxing in the rain", hook: "It's pouring. Open the box anyway.", concept: "Shows the shoe holding up while the unboxing feels real and a little funny.", script: "Doorstep, rain on the box.\nOpen it under the awning.\nFirst step into a puddle.\nCut to dry socks.", mode: "Indirect" }],
        needs: [{ kind: "results", project: "Drop 03", text: "Send us the ad numbers for Drop 03 (views, clicks, purchases), or give us access to Ads Manager." }],
        timeline: [
          { key: "kickoff", label: "Kick-off", date: "", done: true }, { key: "plan", label: "Plan approved", date: d(-40), done: true },
          { key: "upfront", label: "Deposit paid", date: d(-41), done: true }, { key: "shoot", label: "Shoot", date: d(-30), done: true },
          { key: "edit", label: "Editing", date: "", done: true }, { key: "balance", label: "Balance paid, files unlocked", date: d(-20), done: true },
          { key: "delivered", label: "Delivered", date: d(-18), done: true }, { key: "testing", label: "Ads testing", date: "", done: false },
          { key: "report", label: "Results report", date: "", done: false }
        ]
      }],
      invoices: [
        { no: "GK-" + y + "-006", label: "GRIP · Drop 03 · balance", project: "patl", kind: "balance", amount: 750, total: 751, status: "paid", issued: d(-24), due: d(-17), balance: 0 },
        { no: "GK-" + y + "-004", label: "GRIP · Drop 03 · deposit", project: "patl", kind: "deposit", amount: 750, total: 751, status: "paid", issued: d(-42), due: d(-35), balance: 0 }
      ],
      boards: [{ title: "Drop 03 storyboard", svg: board }]
    };
    data.colls.shares = (data.colls.shares || []).concat([{
      id: "demoatlas1", clientId: "catl", projectId: "patl", title: "Drop 03 · campaign page", enabled: true,
      sections: snap.sections, boardIds: [], snapshot: snap, publishedAt: d(-2) + "T10:30", publishedBy: "mheni", note: "", created: d(-2) + "T10:30", editedAt: ""
    }]);
    data.colls.feedback = (data.colls.feedback || []).concat([{
      id: "fb-demo-1", shareId: "demoatlas1", clientId: "catl", projectId: "patl", kind: "comment", target: "reel:ra2",
      text: "Love the price reveal. Can the box be the grey one?", who: "client", at: d(-1) + "T18:20"
    }]);
  });
})(window.GK);
