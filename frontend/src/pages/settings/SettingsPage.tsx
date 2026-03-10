import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/services/settings';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { getApiError } from '@/lib/api';
import type { UserSettings } from '@/types/api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;


export default function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<UserSettings>>({});
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.getSettings(),
  });

  useEffect(() => {
    if (settings) setForm(settings);
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: () =>
      settingsService.updateSettings({
        dailyNewCardsLimit: form.dailyNewCardsLimit,
        timezone: form.timezone,
        reminderEnabled: form.reminderEnabled,
        reminderTime: form.reminderTime,
        emailNotifications: form.emailNotifications,
        pushNotifications: form.pushNotifications,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast('success', 'Settings saved');
    },
    onError: (err) => toast('error', getApiError(err)),
  });

  const subscribePush = async () => {
    if (!VAPID_PUBLIC_KEY) {
      toast('error', 'Push notifications are not configured (missing VAPID key)');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY,
      });
      await settingsService.subscribePush(sub.toJSON() as PushSubscriptionJSON);
      setPushSubscribed(true);
      toast('success', 'Push notifications enabled!');
    } catch (err) {
      toast('error', getApiError(err));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate();
        }}
        className="space-y-6"
      >
        {/* Study preferences */}
        <section className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Study Preferences</h2>

          <Input
            label="Daily new cards limit"
            type="number"
            min={0}
            max={200}
            value={form.dailyNewCardsLimit ?? 20}
            onChange={(e) => setForm((f) => ({ ...f, dailyNewCardsLimit: +e.target.value }))}
            hint="Maximum new cards to introduce per day"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Timezone</label>
            <select
              value={form.timezone ?? 'UTC'}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Intl.supportedValuesOf('timeZone').map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Reminders */}
        <section className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Reminders</h2>

          <ToggleSetting
            label="Enable daily reminders"
            description="Get notified when you have cards due for review"
            checked={form.reminderEnabled ?? false}
            onChange={(v) => setForm((f) => ({ ...f, reminderEnabled: v }))}
          />

          {form.reminderEnabled && (
            <Input
              label="Reminder time"
              type="time"
              value={form.reminderTime ?? '09:00'}
              onChange={(e) => setForm((f) => ({ ...f, reminderTime: e.target.value }))}
            />
          )}

          <ToggleSetting
            label="Email notifications"
            description="Receive daily reminder emails"
            checked={form.emailNotifications ?? false}
            onChange={(v) => setForm((f) => ({ ...f, emailNotifications: v }))}
          />

          <ToggleSetting
            label="Push notifications"
            description="Browser push notifications for reminders"
            checked={form.pushNotifications ?? false}
            onChange={(v) => setForm((f) => ({ ...f, pushNotifications: v }))}
          />

          {form.pushNotifications && pushSupported && !pushSubscribed && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={subscribePush}
            >
              Enable browser push
            </Button>
          )}

          {pushSubscribed && (
            <p className="text-xs text-green-600">✓ Browser push notifications enabled</p>
          )}
        </section>

        <div className="flex justify-end">
          <Button type="submit" loading={updateMutation.isPending}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
          checked ? 'bg-indigo-600' : 'bg-gray-200',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  );
}
