# Email templates

Paste these into Supabase > Authentication > Emails > Templates, so sign-up and password emails look like Gecko instead of Supabase's default.

| Template in Supabase | Subject | File |
|---|---|---|
| Confirm signup | Confirm your Gecko account | `confirm-signup.html` |
| Reset password | Your Gecko password link | `reset-password.html` |

`{{ .ConfirmationURL }}` is filled in by Supabase. Emails only reach people outside the project team once custom SMTP is on (DEPLOY.md, step 1.4).
