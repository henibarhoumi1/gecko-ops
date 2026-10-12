/* sample data for boards: three boards for invented brands (Atlas Sneakers, Maison Jasmin, Nour Skin).
   V03: each board also carries media cards (example links only: a public YouTube id, Unsplash photos, placeholder post ids). */
(function (GK) {
  "use strict";
  GK.seedExtra = GK.seedExtra || [];
  GK.seedExtra.push(function (data, ctx) {
    var colls = data.colls, B = GK.boards;
    if (!B || !B.maker) return;
    var ideas = colls.ideas || [], projects = colls.projects || [], clients = colls.clients || [];
    function hasClient(id) { return clients.some(function (c) { return c.id === id; }); }
    function hasProject(id) { return projects.some(function (p) { return p.id === id; }); }
    // match an idea defensively: same client, best title match first
    function findIdea(clientId, re) {
      var mine = ideas.filter(function (i) { return i.clientId === clientId; });
      return (mine.filter(function (i) { return re.test(i.title || ""); })[0] || mine[0] || {}).id || "";
    }
    function stamp(n, hhmm) { return ctx.d(n) + "T" + hhmm; }

    // 1. Storyboard · Atlas Sneakers
    var q = B.maker(), i;
    q.text("Drop 03: built for Tunis streets", 0, -90, "slate", 760, 30);
    var frames = [
      ["Hook", "POV: your sneakers vs the cobbles of the medina. Close on the sole hitting stone. On screen: \"Sizing is not the problem.\""],
      ["Problem", "A slip on a wet step. Freeze frame. Voice: \"Half your returns are about grip.\""],
      ["Product", "Turn the shoe in hand, macro on the sole pattern. Voice: \"Rubber that holds.\""],
      ["Proof", "Walk the Kasbah stairs, then a market table. Three locations, one take each."],
      ["Result", "Three friends, three sizes, same pair. They run down the street."],
      ["Call to action", "Price on screen: under 200 DT. Voice: \"DM us your size.\""]
    ];
    for (i = 0; i < 6; i++) {
      q.frame(i + 1, frames[i][0], i * 220, 0);
      q.note(frames[i][1], i * 220, 340, i % 2 ? "bounce" : "gel", 180, 190);
    }
    q.link("Moodboard and refs", "https://example.com/atlas-drop-03-moodboard", 0, 570, "bounce");
    q.note("Shoot on location, natural light. Keep every shot under 3 seconds.", 260, 570, "chroma", 300, 90);
    q.text("References", 1340, -90, "slate", 360, 30);
    q.media("https://www.youtube.com/watch?v=dQw4w9WgXcQ", 1340, 0, { w: 360, text: "Pacing reference: cut on the beat", cap: "Cuts every 2 to 3 seconds", tags: ["pacing"], likes: ["mheni"] });
    q.media("https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80", 1340, 290, { w: 260, ratio: 1, text: "Hero colour: red on stone", tags: ["look"] });
    var boards = [{
      id: "bsb1", title: "Drop 03 storyboard", kind: "storyboard", clientId: hasClient("catl") ? "catl" : "", projectId: hasProject("patl") ? "patl" : "",
      ideaId: findIdea("catl", /street|cobble|grip|drop|sneaker/i), items: q.items, view: { x: 0, y: 0, z: 0 }, rev: 1, updated: stamp(-2, "16:20"), by: "mheni",
      log: [{ at: stamp(-6, "11:05"), who: "mheni", text: "created" }]
    }];

    // 2. Angle map · Maison Jasmin
    q = B.maker();
    var centre = q.note("Jasmine hammam jar\n39 DT", 0, 0, "chroma", 220, 130);
    var angles = [
      ["Smells like home", "Buyers mention their grandmother's jasmine.", "gel", 0, -270],
      ["Gift without thinking", "Eid gifting searches. Wrapped, ready, fits any budget.", "bounce", 360, 0],
      ["The hammam at home", "Steam, lid off, the whole bathroom changes.", "gel", 0, 270],
      ["Made 40 minutes away", "Small batch, local jasmine, the maker on camera.", "bounce", -340, 0]
    ];
    for (i = 0; i < 4; i++) {
      var a = q.note(angles[i][0] + "\n" + angles[i][1], angles[i][3], angles[i][4], angles[i][2], 220, 130);
      q.arrow(centre, a, "slate");
    }
    q.text("Eid launch: four angles to test", -340, -330, "slate", 560, 28);
    q.media("https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?w=1200&q=80", 640, -270, { w: 260, ratio: 0.8, text: "Steam and soft light", tags: ["look"] });
    q.media("https://www.instagram.com/reel/C0ExampleReel1/", 940, -270, { w: 220, text: "Reel format to copy (example link)", cap: "Unboxing in one take", tags: ["format"] });
    boards.push({
      id: "bang1", title: "Eid launch angle map", kind: "angles", clientId: hasClient("cjas") ? "cjas" : "", projectId: hasProject("pjas") ? "pjas" : "",
      ideaId: findIdea("cjas", /smell|home|eid|gift|jasmin/i), items: q.items, view: { x: 0, y: 0, z: 0 }, rev: 1, updated: stamp(-5, "10:40"), by: "mheni",
      log: [{ at: stamp(-9, "09:30"), who: "mheni", text: "created" }]
    });

    // 3. Shot list · Nour Skin, next shoot
    q = B.maker();
    var heads = ["Shot", "Where", "Gear", "Time"], wd = [310, 230, 270, 110], xs = [0, 320, 560, 840];
    for (i = 0; i < 4; i++) q.note(heads[i], xs[i], 0, "slate", wd[i], 52);
    var rows = [
      ["1. Hero: serum bottle on the sink, water drop", "Pharmacy, Lac 2", "Camera, 35mm, small softbox", "20 min"],
      ["2. Hands: texture on the back of the hand", "Pharmacy counter", "Camera, 85mm, reflector", "15 min"],
      ["3. Rania at the mirror, morning routine", "Her bathroom", "Camera, gimbal, window light", "30 min"],
      ["4. Before and after skin close-up", "Her bathroom", "Camera, 85mm, ring light", "25 min"],
      ["5. Pharmacist recommends it (talking head)", "Pharmacy, Lac 2", "Camera, lav mic, tripod", "25 min"],
      ["6. Packshot on marble, spin", "Studio table", "Camera, turntable, two lights", "20 min"]
    ];
    rows.forEach(function (r, j) { for (var k = 0; k < 4; k++) q.note(r[k], xs[k], 62 + j * 72, "bounce", wd[k], 64); });
    q.note("Bring: spare battery, white card, wipes, release form for the pharmacist.", 0, 62 + 6 * 72 + 20, "gel", 420, 76);
    q.media("https://www.pinterest.com/pin/123456789012345678/", 1170, 0, { w: 240, text: "Packshot light setup (example pin)", tags: ["light"] });
    q.media("https://www.youtube.com/shorts/dQw4w9WgXcQ", 1440, 0, { w: 220, text: "Short to match: morning routine", cap: "Mirror shot, phone in frame", tags: ["format"] });
    boards.push({
      id: "bshot1", title: "Month 2 shot list", kind: "shotlist", clientId: hasClient("cnour") ? "cnour" : "", projectId: hasProject("pnour2") ? "pnour2" : "",
      ideaId: findIdea("cnour", /routine|pharma|serum|month|skin/i), items: q.items, view: { x: 0, y: 0, z: 0 }, rev: 1, updated: stamp(-1, "18:05"), by: "mheni",
      log: [{ at: stamp(-3, "14:15"), who: "mheni", text: "created" }]
    });

    colls.boards = (colls.boards || []).concat(boards);
  });
})(window.GK);
