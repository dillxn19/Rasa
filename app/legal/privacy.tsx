import React from 'react';
import { LegalScreen } from '@/components/legal/LegalScreen';

// NOTE: Draft copy for launch — have it reviewed by counsel before release.
// Written to satisfy Malaysia's PDPA 2010 + Apple/Google store requirements.
export default function PrivacyScreen() {
  return (
    <LegalScreen
      title="Privacy Policy"
      updated="July 2026"
      sections={[
        {
          heading: 'Who we are',
          body: 'Rasa is a social food discovery app for Malaysia. This policy explains what personal data we collect, how we use it, and your rights under the Personal Data Protection Act 2010 (PDPA).',
        },
        {
          heading: 'What we collect',
          body: 'Account details (name, username, email, and a photo if you add one); content you create (reviews, ratings, photos, lists, comments); usage and device information; and — only with your permission — your approximate location to show nearby restaurants. We never collect payment card details.',
        },
        {
          heading: 'How we use your data',
          body: 'To run the app: show your reviews to people who follow you, power search and recommendations, award coins and badges, and keep the community safe. We use aggregated, de-identified data to improve Rasa. We do not sell your personal data.',
        },
        {
          heading: 'Who can see your content',
          body: 'Reviews and profile details you post are visible to other Rasa users. You control what you share. Location is used only to find places near you and is not shown on your public profile.',
        },
        {
          heading: 'Sharing with third parties',
          body: 'We use trusted providers to operate the app — Supabase (hosting and database), Algolia (search), and Google Places (restaurant data). They process data on our behalf under their own security commitments. We may disclose data where required by Malaysian law.',
        },
        {
          heading: 'Data retention & deletion',
          body: 'We keep your data while your account is active. You can permanently delete your account at any time from Profile → Settings → Delete Account. This erases your profile, reviews, photos and associated data. Some records may be retained briefly where the law requires.',
        },
        {
          heading: 'Your rights',
          body: 'Under the PDPA you may access, correct, or withdraw consent to the processing of your personal data. Contact us to exercise these rights.',
        },
        {
          heading: 'Children',
          body: 'Rasa is not intended for anyone under 13. We do not knowingly collect data from children under 13.',
        },
        {
          heading: 'Changes',
          body: 'We may update this policy. Material changes will be notified in the app. Continuing to use Rasa after an update means you accept the revised policy.',
        },
      ]}
    />
  );
}
