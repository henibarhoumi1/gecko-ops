import { t } from "./i18n";

/** What people read when something fails, in English and French. Checked top to bottom; the first match wins. */
const MESSAGES: [RegExp, string, string][] = [
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
    "Previews can be up to 200 MB. Export a lighter 1080p version and try again.",
    "Les aperçus font 200 Mo au maximum. Exportez une version 1080p plus légère et réessayez.",
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

export function friendlyError(error: unknown): string {
  const text =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : String(error);
  for (const [pattern, en, fr] of MESSAGES) if (pattern.test(text)) return t(en, fr);
  return t("Something went wrong. Try again.", "Un problème est survenu. Réessayez.");
}
