import { t } from "./i18n";

/** What people read when something fails, in English and French. Checked top to bottom; the first match wins. */
const MESSAGES: [RegExp, string, string][] = [
  [
    /preview_read_only/,
    "This is a preview: nothing is saved here.",
    "C'est un aperçu : rien n'est enregistré ici.",
  ],
  [
    /taxes_unchecked/,
    "No invoice goes out until the accountant has checked the tax lines.",
    "Aucune facture ne part avant que le comptable ait vérifié les lignes de taxes.",
  ],
  [
    /invoice_settings_missing|invalid_invoice_settings/,
    "Check Gecko's invoice details: the legal name, how to pay and the tax lines.",
    "Vérifiez les coordonnées de Gecko : raison sociale, règlement et lignes de taxes.",
  ],
  [
    /invoice_needs_price/,
    "Set the price in Overview first.",
    "Indiquez d'abord le prix dans l'aperçu.",
  ],
  [
    /invoice_exists/,
    "This client already has that invoice. Cancel it first to make a new one.",
    "Ce client a déjà cette facture. Annulez-la d'abord pour en refaire une.",
  ],
  [
    /invoice_locked/,
    "A sent invoice can't be changed. Cancel it and make a new one.",
    "Une facture envoyée ne se modifie plus. Annulez-la et refaites-en une.",
  ],
  [
    /invoice_cost_taken/,
    "That cost is already on another invoice.",
    "Ce coût figure déjà sur une autre facture.",
  ],
  [
    /invoice_negative/,
    "An invoice can't total below zero.",
    "Une facture ne peut pas être négative.",
  ],
  [
    /invoice_empty/,
    "This invoice has nothing to bill yet.",
    "Cette facture ne contient rien à facturer.",
  ],
  [
    /invoice_needs_client_name/,
    "Add who the invoice is billed to.",
    "Indiquez à qui la facture est adressée.",
  ],
  [/invoice_needs_reason/, "Say why it's cancelled.", "Indiquez pourquoi elle est annulée."],
  [
    /invoice_paid/,
    "It's marked paid. Mark it unpaid first if that was a mistake.",
    "Elle est marquée réglée. Marquez-la non réglée d'abord si c'était une erreur.",
  ],
  [
    /invoice_not_sent|invoice_not_paid/,
    "Refresh the page: this invoice has changed.",
    "Rechargez la page : cette facture a changé.",
  ],
  [/invalid_payment/, "Check the payment date.", "Vérifiez la date du paiement."],
  [
    /invalid_invoice/,
    "Check the lines and dates on the invoice.",
    "Vérifiez les lignes et les dates de la facture.",
  ],
  [/too_many_invoices/, "This client has too many invoices.", "Ce client a trop de factures."],
  [
    /money_only/,
    "Invoices are for the owner and finance people.",
    "Les factures sont réservées au responsable et aux finances.",
  ],
  [/founder_only/, "Only the founder can change this.", "Seul le fondateur peut modifier ceci."],
  [
    /invoice_not_found/,
    "That invoice isn't there anymore. Refresh the page.",
    "Cette facture n'est plus là. Rechargez la page.",
  ],
  [
    /invalid login credentials/i,
    "That email and password don't match.",
    "Cet e-mail et ce mot de passe ne correspondent pas.",
  ],
  [
    /email not confirmed/i,
    "Confirm your email first. Check your inbox for the link.",
    "Confirmez d'abord votre e-mail. Le lien est dans votre boîte de réception.",
  ],
  [
    /user already registered/i,
    "This email already has an account. Sign in instead.",
    "Cet e-mail a déjà un compte. Connectez-vous plutôt.",
  ],
  [
    /password should be at least/i,
    "Use a password of at least 8 characters.",
    "Choisissez un mot de passe d'au moins 8 caractères.",
  ],
  [
    /should be different from the old password/i,
    "Pick a password you haven't used here before.",
    "Choisissez un mot de passe que vous n'avez pas encore utilisé ici.",
  ],
  [
    /for security purposes|email rate limit/i,
    "Too many emails just now. Wait a minute and try again.",
    "Trop d'e-mails d'un coup. Attendez une minute et réessayez.",
  ],
  [
    /error sending|smtp|sending (confirmation|magic link|recovery) email/i,
    "We couldn't send the email just now. Use a password instead, or message Gecko.",
    "L'e-mail n'a pas pu partir. Utilisez un mot de passe, ou écrivez à Gecko.",
  ],
  [
    /invalid api key/i,
    "The app's Supabase key is wrong. Check the anon key in Cloudflare.",
    "La clé Supabase de l'app est fausse. Vérifiez la clé anon dans Cloudflare.",
  ],
  [
    /workspace_exists/,
    "Gecko is already set up. Ask the founder for an invite link.",
    "Gecko est déjà installé. Demandez un lien d'invitation au fondateur.",
  ],
  [
    /invalid_invite/,
    "This invite link is wrong, used or expired, or was sent to a different email.",
    "Ce lien d'invitation est faux, déjà utilisé ou expiré, ou il a été envoyé à un autre e-mail.",
  ],
  [
    /signups not allowed for otp|otp_disabled/i,
    "There's no Gecko login for that email yet. Use your invite link.",
    "Cet e-mail n'a pas encore d'accès Gecko. Utilisez votre lien d'invitation.",
  ],
  [
    /verified_email_required/,
    "Confirm your email first, then try again.",
    "Confirmez d'abord votre e-mail, puis réessayez.",
  ],
  [
    /concept_changed/,
    "This concept changed while you were reading it. The new version is shown now; have a look and decide again.",
    "Cette idée a changé pendant votre lecture. La nouvelle version est affichée : relisez-la et décidez à nouveau.",
  ],
  [
    /script_changed/,
    "Gecko updated this script while you were reading it. The new version is shown now; have a look and decide again.",
    "Gecko a modifié ce script pendant votre lecture. La nouvelle version est affichée : relisez-la et décidez à nouveau.",
  ],
  [
    /founder_only/,
    "Only the founder can approve for a client.",
    "Seul le fondateur peut valider pour un client.",
  ],
  [
    /cut_changed/,
    "This video changed while you were looking at it. The new version is shown now; check it and decide again.",
    "Cette vidéo a changé pendant que vous la regardiez. La nouvelle version est affichée : vérifiez-la et décidez à nouveau.",
  ],
  [
    /hook_required/,
    "Pick the hook you like first, then approve.",
    "Choisissez d'abord l'accroche qui vous plaît, puis validez.",
  ],
  [
    /invalid_script/,
    "That concept belongs to another client. Pick one of this client's concepts.",
    "Cette idée appartient à un autre client. Choisissez une idée de ce client.",
  ],
  [
    /invalid_item/,
    "Check the link starts with https:// and the note isn't empty.",
    "Vérifiez que le lien commence par https:// et que la note n'est pas vide.",
  ],
  [
    /invalid_card/,
    "That card couldn't be saved. Refresh the board and try again.",
    "Cette carte n'a pas pu être enregistrée. Rechargez le tableau et réessayez.",
  ],
  [
    /logo_type/,
    "Use a PNG, JPG or WebP logo. Export SVG or PDF logos as PNG first.",
    "Utilisez un logo PNG, JPG ou WebP. Exportez d'abord un SVG ou un PDF en PNG.",
  ],
  [
    /logo_too_big/,
    "That logo is too detailed to store. Try a simpler PNG export.",
    "Ce logo est trop lourd à enregistrer. Essayez un export PNG plus simple.",
  ],
  [/image_type/, "Use a JPG, PNG, WebP or GIF image.", "Utilisez une image JPG, PNG, WebP ou GIF."],
  [
    /image_too_big/,
    "That image is over 5 MB even after shrinking it. Try a smaller one.",
    "Cette image dépasse 5 Mo même réduite. Essayez-en une plus légère.",
  ],
  [
    /board_full/,
    "This board holds 500 cards. Make a board inside it for the rest.",
    "Ce tableau contient déjà 500 cartes. Créez un tableau à l'intérieur pour la suite.",
  ],
  [
    /too_many_boards/,
    "This client has 200 boards already. Delete one you don't use.",
    "Ce client a déjà 200 tableaux. Supprimez-en un qui ne sert plus.",
  ],
  [
    /board_not_found/,
    "This board was deleted or moved. Go back to the main board.",
    "Ce tableau a été supprimé ou déplacé. Revenez au tableau principal.",
  ],
  [
    /invalid_notes/,
    "The brand notes can be up to 8,000 characters.",
    "Les notes de marque font 8 000 caractères au maximum.",
  ],
  [
    /PGRST20[25]|could not find the (table|function)|does not exist/i,
    "The database is missing an update. Run the newest file from supabase/migrations in the Supabase SQL Editor, then refresh.",
    "Il manque une mise à jour à la base de données. Prévenez Gecko.",
  ],
  [
    /client_only/,
    "Only the client can approve or ask for changes.",
    "Seul le client peut valider ou demander des changements.",
  ],
  [
    /video_changed/,
    "Gecko uploaded a new cut while you were watching. The new version is shown now; watch it and decide again.",
    "Gecko a mis en ligne un nouveau montage pendant que vous regardiez. La nouvelle version est affichée : regardez-la et décidez à nouveau.",
  ],
  [
    /invalid_video/,
    "That concept belongs to another client. Pick one of this client's concepts.",
    "Cette idée appartient à un autre client. Choisissez une idée de ce client.",
  ],
  [
    /locked/,
    "The final file unlocks once the balance is paid.",
    "Le fichier final se débloque une fois le solde payé.",
  ],
  [
    /link_expired/,
    "This download link has expired. Press Download again.",
    "Ce lien de téléchargement a expiré. Appuyez à nouveau sur Télécharger.",
  ],
  [/no_preview/, "There's no cut to watch yet.", "Il n'y a pas encore de montage à regarder."],
  [
    /preview_too_big/,
    "Previews can be up to 50 MB. Export at 720p with a lower bitrate and try again.",
    "Les aperçus font 50 Mo au maximum. Exportez en 720p avec un débit plus bas et réessayez.",
  ],
  [
    /bad_upload|bad_part/,
    "The upload didn't go through. Try again.",
    "L'envoi n'a pas abouti. Réessayez.",
  ],
  [
    /missing_stream_token|missing_link_secret|missing_watermark|missing_finals_bucket/,
    "Video storage isn't set up yet. Gecko needs to finish the Cloudflare setup.",
    "Le stockage vidéo n'est pas encore prêt côté Gecko.",
  ],
  [
    /stream_error|server_error|no_api/,
    "The video service didn't answer. Try again in a minute.",
    "Le service vidéo ne répond pas. Réessayez dans une minute.",
  ],
  [/sign_in/, "Your session ended. Sign in again.", "Votre session a expiré. Reconnectez-vous."],
  [
    /preview_type|mime type/i,
    "Upload an MP4, MOV or WebM file.",
    "Envoyez un fichier MP4, MOV ou WebM.",
  ],
  [
    /exceeded the maximum allowed size|payload too large/i,
    "That file is over 50 MB. Export at 720p with a lower bitrate.",
    "Ce fichier dépasse 50 Mo. Exportez en 720p avec un débit plus bas.",
  ],
  [
    /cut_needs_preview/,
    "Upload a preview first. Nothing goes to the client without one.",
    "Ajoutez d'abord un aperçu. Rien ne part chez le client sans lui.",
  ],
  [
    /cut_seen/,
    "The client has already left notes on this cut, so it stays with them.",
    "Le client a déjà laissé des notes sur ce montage, il reste chez lui.",
  ],
  [
    /cut_changed/,
    "A newer version just arrived. The page has been refreshed: watch it, then decide.",
    "Une nouvelle version vient d'arriver. La page a été actualisée : regardez-la, puis décidez.",
  ],
  [
    /cut_not_approved/,
    "The client approves the cut before the final file goes on the shelf.",
    "Le client valide le montage avant que le fichier final soit livré.",
  ],
  [
    /cut_delivered/,
    "This cut is delivered. Clear its final link before uploading a new version.",
    "Ce montage est livré. Retirez le lien final avant d'envoyer une nouvelle version.",
  ],
  [
    /invalid_link/,
    "Paste the full link, starting with https://.",
    "Collez le lien complet, qui commence par https://.",
  ],
  [
    /invalid_cut/,
    "Give the cut a title of up to 160 characters.",
    "Donnez au montage un titre de 160 caractères maximum.",
  ],
  [
    /viewer_read_only/,
    "You can read this but not add to it. Ask your owner if you need to.",
    "Vous pouvez consulter, mais pas ajouter. Demandez à votre responsable si besoin.",
  ],
  [
    /invalid_numbers/,
    "Check the numbers: whole figures or decimals, nothing below zero, and a percentage up to 100.",
    "Vérifiez les chiffres : des nombres positifs, et un pourcentage jusqu'à 100.",
  ],
  [
    /invalid_post/,
    "Check the name, the link (https) and the day it went live.",
    "Vérifiez le nom, le lien (https) et le jour de mise en ligne.",
  ],
  [/post_not_found/, "That video isn't here any more.", "Cette vidéo n'est plus là."],
  [
    /too_many_posts|too_many_items/,
    "That's the limit for this client.",
    "C'est la limite pour ce client.",
  ],
  [
    /read_published/,
    "That read is published and can't change.",
    "Ce bilan est publié et ne change plus.",
  ],
  [
    /read_empty/,
    "Write at least one thing we learned first.",
    "Écrivez d'abord au moins un enseignement.",
  ],
  [
    /read_not_found|invalid_read/,
    "Check the read: each line has a length limit.",
    "Vérifiez le bilan : chaque ligne a une longueur maximale.",
  ],
  [/item_not_found/, "That clip isn't here any more.", "Ce plan n'est plus là."],
  [
    /cut_not_found/,
    "That cut is gone. The page has been refreshed.",
    "Ce montage n'existe plus. La page a été actualisée.",
  ],
  [/too_many_cuts/, "This client has 300 cuts already.", "Ce client a déjà 300 montages."],
  [
    /invalid_note/,
    "That message couldn't be sent. Check it isn't empty and try again.",
    "Ce message n'a pas pu partir. Vérifiez qu'il n'est pas vide et réessayez.",
  ],
  [
    /invalid_idea/,
    "Give the idea a title, and keep it under 10,000 characters.",
    "Donnez un titre à l'idée, en moins de 10 000 caractères.",
  ],
  [
    /too_many_ideas/,
    "That's 200 ideas already. Remove some before adding more.",
    "Il y a déjà 200 idées. Retirez-en avant d'en ajouter.",
  ],
  [
    /feedback_rate_limited/,
    "That's a lot of messages in an hour. Try again a little later.",
    "Beaucoup de messages en une heure. Réessayez un peu plus tard.",
  ],
  [
    /violates check constraint/,
    "Something in this form is too long or not valid. Check it and try again.",
    "Un champ est trop long ou invalide. Vérifiez et réessayez.",
  ],
  [
    /spend_approver_only/,
    "Only your owner, an approver or finance can say yes to a cost. You can still comment.",
    "Seuls votre responsable, un valideur ou les finances peuvent accepter une dépense. Vous pouvez commenter.",
  ],
  [
    /over_budget_owner/,
    "This goes over the budget, so your owner or finance needs to approve it.",
    "Cela dépasse le budget : votre responsable ou les finances doivent le valider.",
  ],
  [
    /over_budget/,
    "This goes over the budget. Approve it over budget, or pass.",
    "Cela dépasse le budget. Validez-le hors budget, ou passez.",
  ],
  [
    /not_waiting/,
    "This was already decided. The page has been refreshed.",
    "C'était déjà décidé. La page a été actualisée.",
  ],
  [
    /not_approved_yet/,
    "The client needs to approve this before it can be booked.",
    "Le client doit d'abord valider avant la réservation.",
  ],
  [
    /trash_not_found/,
    "That was already put back, or it's no longer in the trash.",
    "C'est déjà restauré, ou ce n'est plus dans la corbeille.",
  ],
  [
    /restore_failed/,
    "It couldn't be put back: something with the same place already exists.",
    "Impossible de le restaurer : un élément occupe déjà sa place.",
  ],
  [
    /link_expired/,
    "This link has ended. Ask Gecko for a new one.",
    "Ce lien a expiré. Demandez-en un nouveau à Gecko.",
  ],
  [/link_not_found/, "That link is already closed.", "Ce lien est déjà fermé."],
  [/name_required/, "Write your name to accept.", "Écrivez votre nom pour accepter."],
  [
    /proposal_not_found/,
    "That proposal isn't there any more, or it was already accepted.",
    "Cette proposition n'existe plus, ou elle a déjà été acceptée.",
  ],
  [
    /invalid_proposal/,
    "Something in the proposal can't be saved.",
    "Un élément de la proposition ne peut pas être enregistré.",
  ],
  [
    /task_not_found/,
    "That task isn't yours to change, or it's gone.",
    "Cette tâche n'est pas modifiable par vous, ou elle n'existe plus.",
  ],
  [
    /invalid_task/,
    "A task needs a title, and a due date if any.",
    "Une tâche a besoin d'un titre, et d'une date valide s'il y en a une.",
  ],
  [
    /task_not_allowed/,
    "Viewers can read tasks but not change them.",
    "Les lecteurs voient les tâches mais ne peuvent pas les modifier.",
  ],
  [/invalid_link/, "Say who the link is for.", "Indiquez pour qui est le lien."],
  [
    /member_not_found/,
    "That person isn't on the team any more.",
    "Cette personne n'est plus dans l'équipe.",
  ],
  [/invalid_project/, "Give the project a name.", "Donnez un nom au projet."],
  [
    /project_not_found/,
    "That project isn't this client's. The page has been refreshed.",
    "Ce projet n'est pas celui de ce client. La page a été actualisée.",
  ],
  [
    /shoot_tick_not_allowed/,
    "Only your owner and approvers tick reels on set. You can still write in the log.",
    "Seuls votre responsable et les valideurs cochent les vidéos sur le plateau. Vous pouvez écrire dans le journal.",
  ],
  [
    /shoot_day_not_found/,
    "That shoot day is gone. The page has been refreshed.",
    "Ce tournage n'existe plus. La page a été actualisée.",
  ],
  [
    /invalid_shoot_day/,
    "Check the date and the times, and that the map link starts with https://.",
    "Vérifiez la date et les heures, et que le lien du plan commence par https://.",
  ],
  [
    /reel_shot/,
    "A reel already shot stays on its day. Mark it as needing a pick-up instead.",
    "Une vidéo déjà tournée reste sur son jour. Marquez-la plutôt à retourner.",
  ],
  [
    /invalid_reels/,
    "Pick each script once, 60 at most.",
    "Choisissez chaque script une seule fois, 60 au plus.",
  ],
  [
    /reel_not_found/,
    "That reel isn't on the day any more. The page has been refreshed.",
    "Cette vidéo n'est plus sur ce jour. La page a été actualisée.",
  ],
  [
    /script_not_found/,
    "That script is gone. The page has been refreshed.",
    "Ce script n'existe plus. La page a été actualisée.",
  ],
  [/invalid_reel/, "That change couldn't be saved.", "Ce changement n'a pas pu être enregistré."],
  [
    /person_not_found/,
    "That person isn't on the day any more.",
    "Cette personne n'est plus sur ce jour.",
  ],
  [/invalid_person/, "Give a name and a valid time.", "Indiquez un nom et une heure valide."],
  [
    /option_committed/,
    "Approved costs stay on record. Change the cost instead, and it goes back to the client.",
    "Les dépenses validées restent au dossier. Modifiez plutôt le coût : il repart chez le client.",
  ],
  [
    /option_not_found/,
    "That option is gone. The page has been refreshed.",
    "Cette option n'existe plus. La page a été actualisée.",
  ],
  [
    /invalid_option/,
    "Give it a name, and check the link starts with https://.",
    "Donnez-lui un nom, et vérifiez que le lien commence par https://.",
  ],
  [/invalid_budget/, "Enter the budget as a number of dinars.", "Indiquez le budget en dinars."],
  [
    /writer_only/,
    "Only your owner or approver can write scripts here.",
    "Seuls votre responsable ou votre validateur peuvent écrire des scripts ici.",
  ],
  [
    /gecko_approves/,
    "Gecko reads and approves the scripts you write. Edit it instead if something changed.",
    "Gecko relit et valide les scripts que vous écrivez. Modifiez-le si quelque chose a changé.",
  ],
  [
    /script_locked/,
    "This script is approved or with Gecko now, so it can't be edited.",
    "Ce script est validé ou chez Gecko, il ne peut plus être modifié.",
  ],
  [
    /invalid_board/,
    "Give the board a name of up to 80 characters.",
    "Donnez au tableau un nom de 80 caractères maximum.",
  ],
  [
    /whiteboard_limit/,
    "This client has 20 whiteboards. Rename or clear one you don't use.",
    "Ce client a déjà 20 tableaux blancs. Renommez ou videz-en un qui ne sert plus.",
  ],
  [
    /board_too_big/,
    "This board is full. Start a new board for the next ideas.",
    "Ce tableau est plein. Ouvrez un nouveau tableau pour la suite.",
  ],
  [
    /approver_only/,
    "Only your owner or an approver can approve or ask for changes. You can still comment.",
    "Seuls votre responsable ou un valideur peuvent valider ou demander des changements. Vous pouvez commenter.",
  ],
  [
    /owner_only/,
    "Only the owner of this space can do that.",
    "Seul le responsable de cet espace peut faire ça.",
  ],
  [
    /team_full/,
    "This space holds 5 people. Remove someone before inviting a new person.",
    "Cet espace accueille 5 personnes. Retirez quelqu'un avant d'en inviter une nouvelle.",
  ],
  [
    /already_on_team/,
    "That person is already in this space.",
    "Cette personne fait déjà partie de cet espace.",
  ],
  [
    /last_owner/,
    "Make someone else owner first. The space always needs one.",
    "Nommez d'abord un autre responsable. L'espace en a toujours besoin d'un.",
  ],
  [
    /cannot_remove_self/,
    "You can't remove yourself. Ask Gecko if you want to leave.",
    "Vous ne pouvez pas vous retirer vous-même. Demandez à Gecko si vous voulez partir.",
  ],
  [/invalid_role/, "Pick one of the roles in the list.", "Choisissez un des rôles de la liste."],
  [
    /cover_type/,
    "Use a JPG, PNG or WebP image for the cover.",
    "Utilisez une image JPG, PNG ou WebP pour la couverture.",
  ],
  [
    /cover_too_big/,
    "That cover is too heavy to store, even shrunk. Try another still.",
    "Cette couverture est trop lourde, même réduite. Essayez une autre image.",
  ],
  [
    /member_not_found/,
    "That person isn't on the team anymore. Refresh the page.",
    "Cette personne ne fait plus partie de l'équipe. Rechargez la page.",
  ],
  [
    /invalid_assignee/,
    "Only editors can be given clients.",
    "Seuls les monteurs peuvent recevoir des clients.",
  ],
  [/forbidden/, "You don't have access to do that.", "Vous n'avez pas accès à cette action."],
  [
    /http_404|not_found/,
    "That video isn't there anymore. Refresh the page.",
    "Cette vidéo n'est plus là. Rechargez la page.",
  ],
  [
    /failed to fetch|network/i,
    "Can't reach the server. Check your connection.",
    "Impossible de joindre le serveur. Vérifiez votre connexion.",
  ],
];

let unknownErrorListener: ((error: unknown) => void) | null = null;

/** Called with every error that has no friendly message, so it can be reported (main.tsx). */
export function onUnknownError(listener: (error: unknown) => void): void {
  unknownErrorListener = listener;
}

export function friendlyError(error: unknown): string {
  const text =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : String(error);
  for (const [pattern, en, fr] of MESSAGES) if (pattern.test(text)) return t(en, fr);
  unknownErrorListener?.(error);
  return t("Something went wrong. Try again.", "Un problème est survenu. Réessayez.");
}
