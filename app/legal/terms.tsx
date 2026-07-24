import React from 'react';
import { LegalScreen } from '@/components/legal/LegalScreen';

// NOTE: Draft copy for launch — have it reviewed by counsel before release.
export default function TermsScreen() {
  return (
    <LegalScreen
      title="Terms of Service"
      updated="July 2026"
      sections={[
        {
          heading: 'Accepting these terms',
          body: 'By creating an account or using Rasa, you agree to these Terms. If you do not agree, please do not use the app.',
        },
        {
          heading: 'Your account',
          body: 'You must be at least 13 years old. Keep your login secure and provide accurate information. You are responsible for activity on your account.',
        },
        {
          heading: 'Your content',
          body: 'You own the reviews, photos and other content you post. By posting, you grant Rasa a licence to display and distribute that content within the app to operate the service. Only post content you have the right to share.',
        },
        {
          heading: 'Community rules',
          body: 'Be honest and respectful. Do not post spam, fake reviews, harassment, hate speech, illegal, or sexually explicit content, or impersonate others. We may remove content and suspend accounts that break these rules.',
        },
        {
          heading: 'Reporting & blocking',
          body: 'You can report any review, comment or user, and block users you do not want to interact with. We review reports and act on violations, typically within 24 hours. There is zero tolerance for objectionable content and abusive users.',
        },
        {
          heading: 'Coins, badges & rewards',
          body: 'Rasa Coins, badges and referral rewards have no cash value, cannot be exchanged for money, and may be adjusted or reset to protect against abuse.',
        },
        {
          heading: 'Restaurant information',
          body: 'Restaurant details come from users and third-party sources and may be incomplete or out of date. Always confirm details (halal status, hours, prices) directly with the venue.',
        },
        {
          heading: 'Termination',
          body: 'You may delete your account at any time. We may suspend or terminate accounts that violate these Terms or the law.',
        },
        {
          heading: 'Disclaimer & liability',
          body: 'Rasa is provided "as is". To the extent permitted by Malaysian law, we are not liable for indirect or consequential loss arising from your use of the app.',
        },
        {
          heading: 'Governing law',
          body: 'These Terms are governed by the laws of Malaysia.',
        },
      ]}
    />
  );
}
