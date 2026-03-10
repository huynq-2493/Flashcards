import cron from 'node-cron';
import nodemailer from 'nodemailer';
import prisma from '../prisma.js';

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

async function sendEmailReminder(email: string, dueCount: number) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'Flashcards <noreply@example.com>',
    to: email,
    subject: `📚 You have ${dueCount} cards due for review`,
    text: `You have ${dueCount} card${dueCount > 1 ? 's' : ''} due for review today. Open the app to study!`,
    html: `<p>You have <strong>${dueCount}</strong> card${dueCount > 1 ? 's' : ''} due for review today.</p><p><a href="${process.env.APP_URL ?? 'http://localhost:5173'}">Study now →</a></p>`,
  });
}

async function sendWebPushReminder(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  dueCount: number,
) {
  // Only send if VAPID keys are configured
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;

  const webpush = await import('web-push');
  webpush.default.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    publicKey,
    privateKey,
  );

  await webpush.default.sendNotification(
    subscription,
    JSON.stringify({
      title: 'Flashcards Reminder',
      body: `You have ${dueCount} cards due for review!`,
    }),
  );
}

async function processReminders() {
  const now = new Date();
  const currentHHMM = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

  // Get users with reminders enabled at the current time who haven't been notified today
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const users = await prisma.userSettings.findMany({
    where: {
      reminderEnabled: true,
      reminderTime: currentHHMM,
      OR: [
        { lastReminderSentAt: null },
        { lastReminderSentAt: { lt: todayStart } },
      ],
    },
    include: { user: { select: { id: true, email: true } } },
  });

  for (const settings of users) {
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    const dueCount = await prisma.cardProgress.count({
      where: {
        userId: settings.userId,
        dueDate: { lte: today },
        state: { notIn: ['new'] },
      },
    });

    if (dueCount === 0) continue;

    try {
      if (settings.reminderChannel === 'push' && settings.webPushSubscription) {
        await sendWebPushReminder(
          settings.webPushSubscription as { endpoint: string; keys: { p256dh: string; auth: string } },
          dueCount,
        );
      } else {
        await sendEmailReminder(settings.user.email, dueCount);
      }

      await prisma.userSettings.update({
        where: { userId: settings.userId },
        data: { lastReminderSentAt: now },
      });
    } catch (err) {
      console.error(`[ReminderJob] Failed to send reminder to ${settings.user.email}:`, err);
    }
  }
}

export function startReminderJob() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await processReminders();
    } catch (err) {
      console.error('[ReminderJob] Error processing reminders:', err);
    }
  });
  console.info('[ReminderJob] Reminder job started — runs every minute');
}
