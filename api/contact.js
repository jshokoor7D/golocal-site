// api/contact.js  — receives the demo form and emails it via Resend
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const b = req.body || {};
    if (b.company) { res.status(200).json({ ok: true }); return; } // honeypot: silently accept bots
    const clean = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
    const name = clean(b.name, 120);
    const email = clean(b.email, 200);
    const organization = clean(b.organization, 160);
    const role = clean(b.role, 120);
    const message = clean(b.message, 4000);
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !okEmail || !message) {
      res.status(400).json({ error: 'Please add your name, a valid email, and a short note.' });
      return;
    }
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'The form is not fully set up yet. Please email info@golocal.org.' }); return; }
    const safe = (s) => s.replace(/[\r\n]+/g, ' '); // block header injection in subject
    const subject = `New demo request - ${safe(name)}${organization ? ' (' + safe(organization) + ')' : ''}`;
    const text = [
      `Name: ${name}`,
      `Email: ${email}`,
      organization ? `Organization: ${organization}` : null,
      role ? `Role: ${role}` : null,
      '',
      message
    ].filter((v) => v !== null).join('\n');
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'GoLocal <noreply@golocal.org>',
        to: ['info@golocal.org'],
        reply_to: email,
        subject,
        text
      })
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('Resend error', r.status, t);
      res.status(502).json({ error: 'Could not send right now. Please email info@golocal.org directly.' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong. Please email info@golocal.org directly.' });
  }
};
