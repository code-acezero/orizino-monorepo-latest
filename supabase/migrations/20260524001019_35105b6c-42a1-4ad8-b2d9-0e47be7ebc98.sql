
INSERT INTO public.email_templates (name, category, subject, html, is_system) VALUES
(
  'Orizino — Aurora Welcome',
  'welcome',
  'Welcome to Orizino, {{first_name}} ✨',
  $HTML$<!doctype html>
<html><body style="margin:0;background:#0b0b14;font-family:'Helvetica Neue',Arial,sans-serif;color:#f5f5f7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b14">
  <tr><td align="center" style="padding:48px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:linear-gradient(135deg,#7c3aed 0%,#ec4899 50%,#f59e0b 100%);border-radius:24px;overflow:hidden">
      <tr><td style="padding:56px 40px 40px;text-align:center">
        <div style="display:inline-block;padding:8px 16px;border:1px solid rgba(255,255,255,.35);border-radius:999px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#fff;margin-bottom:24px">Orizino&nbsp;Co.</div>
        <h1 style="margin:0 0 16px;font-size:44px;line-height:1.05;font-weight:800;color:#fff;letter-spacing:-.02em">Welcome aboard,<br/>{{first_name}}.</h1>
        <p style="margin:0;font-size:17px;line-height:1.6;color:rgba(255,255,255,.92);max-width:440px;margin-left:auto;margin-right:auto">A new horizon just opened. We're thrilled to have you in the Orizino circle — where ideas glow, ship fast, and feel alive.</p>
      </td></tr>
      <tr><td style="padding:0 40px 48px;text-align:center">
        <a href="{{cta_url}}" style="display:inline-block;background:#0b0b14;color:#fff;text-decoration:none;padding:16px 36px;border-radius:999px;font-weight:600;font-size:15px;letter-spacing:.02em">Start exploring →</a>
      </td></tr>
    </table>
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin-top:24px;background:#11111d;border-radius:20px">
      <tr><td style="padding:32px 40px">
        <h3 style="margin:0 0 16px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#a78bfa">Your first 3 moves</h3>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:10px 0;color:#e5e7eb;font-size:15px">①&nbsp;&nbsp;Complete your profile</td></tr>
          <tr><td style="padding:10px 0;color:#e5e7eb;font-size:15px">②&nbsp;&nbsp;Browse the curated collection</td></tr>
          <tr><td style="padding:10px 0;color:#e5e7eb;font-size:15px">③&nbsp;&nbsp;Claim your welcome perk inside</td></tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:24px 0 0;color:#6b7280;font-size:12px">Orizino Co. · Crafted with intent</p>
  </td></tr>
</table></body></html>$HTML$,
  false
),
(
  'Orizino — Editorial Welcome',
  'welcome',
  'A quiet hello from Orizino',
  $HTML$<!doctype html>
<html><body style="margin:0;background:#f5f3ee;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:64px 16px">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#faf8f3;border:1px solid #e8e3d8">
      <tr><td style="padding:48px 56px 16px">
        <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#8b6f47">Orizino&nbsp;·&nbsp;Co.</div>
        <hr style="border:none;border-top:1px solid #d6cfbe;margin:24px 0"/>
      </td></tr>
      <tr><td style="padding:0 56px 8px">
        <h1 style="margin:0;font-size:48px;line-height:1.1;font-weight:400;font-style:italic;letter-spacing:-.01em">Hello, {{first_name}}.</h1>
        <p style="margin:24px 0 0;font-size:18px;line-height:1.7;color:#3a3a3a">Welcome to Orizino — a small studio with a wide horizon. We make things slowly, with care, and we're glad you found us.</p>
        <p style="margin:18px 0 0;font-size:18px;line-height:1.7;color:#3a3a3a">Expect occasional letters: new arrivals, quiet stories, and the things we're working on behind the scenes. Nothing loud. Just signal.</p>
      </td></tr>
      <tr><td style="padding:40px 56px 8px">
        <a href="{{cta_url}}" style="font-family:Arial,sans-serif;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#1a1a1a;text-decoration:none;border-bottom:1px solid #1a1a1a;padding-bottom:4px">Step inside the studio</a>
      </td></tr>
      <tr><td style="padding:48px 56px 48px">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#8a8475;line-height:1.6">— The Orizino team<br/>Crafted in good company.</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>$HTML$,
  false
),
(
  'Orizino — Confetti Welcome',
  'welcome',
  'You''re in 🎉 Welcome to Orizino!',
  $HTML$<!doctype html>
<html><body style="margin:0;background:#fff7ed;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:40px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px">
      <tr><td style="background:#fb923c;border-radius:28px 28px 0 0;padding:56px 32px;text-align:center">
        <div style="font-size:64px;line-height:1">🎉</div>
        <h1 style="margin:16px 0 8px;font-size:38px;font-weight:800;color:#fff;letter-spacing:-.02em">You made it, {{first_name}}!</h1>
        <p style="margin:0;font-size:17px;color:#fff8ef;line-height:1.5">Welcome to the Orizino family — pull up a chair, grab a cookie 🍪, the good stuff starts now.</p>
      </td></tr>
      <tr><td style="background:#fff;padding:40px 32px;border-radius:0 0 28px 28px;text-align:center;box-shadow:0 12px 40px -16px rgba(251,146,60,.35)">
        <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6">Here's a little welcome treat to kick things off:</p>
        <div style="display:inline-block;background:#fff7ed;border:2px dashed #fb923c;border-radius:16px;padding:20px 28px;margin-bottom:28px">
          <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#9a3412;margin-bottom:6px">Your code</div>
          <div style="font-size:28px;font-weight:800;color:#9a3412;letter-spacing:.08em">WELCOME15</div>
          <div style="font-size:12px;color:#b45309;margin-top:6px">15% off your first order</div>
        </div>
        <div>
          <a href="{{cta_url}}" style="display:inline-block;background:#1f2937;color:#fff;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:600;font-size:15px">Shop the collection</a>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:36px">
          <tr>
            <td style="text-align:center;padding:0 8px"><div style="font-size:28px">🚚</div><div style="font-size:12px;color:#6b7280;margin-top:6px">Fast shipping</div></td>
            <td style="text-align:center;padding:0 8px"><div style="font-size:28px">↩️</div><div style="font-size:12px;color:#6b7280;margin-top:6px">Easy returns</div></td>
            <td style="text-align:center;padding:0 8px"><div style="font-size:28px">💬</div><div style="font-size:12px;color:#6b7280;margin-top:6px">Real humans</div></td>
          </tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">Orizino Co. · Made to make you smile</p>
  </td></tr>
</table></body></html>$HTML$,
  false
);
