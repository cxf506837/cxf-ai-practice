'use strict';

document.querySelectorAll('[data-copy-email]').forEach(button => {
  button.addEventListener('click', async () => {
    const status = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copyEmail);
      if (status) status.textContent = '邮箱已复制，可以粘贴到邮件应用。';
    } catch {
      if (status) status.textContent = '复制未完成，请手动选择上方邮箱，或点击发送邮件。';
    }
  });
});

async function connectPublicEntries() {
  const entries = document.querySelectorAll('[data-public-link]');
  if (!entries.length) return;
  try {
    const response = await fetch('/public-links.json', { cache: 'no-store' });
    if (!response.ok) return;
    const links = await response.json();
    entries.forEach(entry => {
      const value = links[entry.dataset.publicLink];
      if (typeof value !== 'string' || !value.trim()) return;
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) return;
      const anchor = document.createElement('a'); anchor.href = url.href; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; anchor.className = entry.className; anchor.textContent = entry.dataset.readyLabel; entry.replaceWith(anchor);
    });
  } catch { /* Pending labels remain readable when public links are unavailable. */ }
}
void connectPublicEntries();
