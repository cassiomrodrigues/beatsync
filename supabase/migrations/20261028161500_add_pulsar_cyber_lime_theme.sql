-- Allow new theme 'pulsar_cyber_lime' (Pulsar Cyber Lime) in public.user_settings.theme_id

begin;

alter table public.user_settings
  drop constraint if exists user_settings_theme_id_check;

alter table public.user_settings
  add constraint user_settings_theme_id_check
  check (
    theme_id = any (
      array[
        'oled_zero'::text,
        'pulsar_cyber_lime'::text,
        'light_day'::text,
        'oled_amber'::text,
        'dark_studio'::text,
        'high_contrast'::text
      ]
    )
  );

commit;
